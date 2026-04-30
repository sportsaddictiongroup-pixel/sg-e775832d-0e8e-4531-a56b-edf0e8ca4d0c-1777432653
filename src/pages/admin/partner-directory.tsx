import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { useRouter } from "next/router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Search, Eye, Users, MapPin, ChevronLeft, ChevronRight, User, Phone, Map as MapIcon, Shield } from "lucide-react";

interface PartnerDetails {
  profile_id: string;
  full_name: string;
  mobile_number: string;
  whatsapp_number: string;
  email: string;
  country_id: string;
  state_id: string;
  district_id: string;
  pincode_id: string;
  location_id: string;
}

interface PartnerData {
  id: string;
  username: string;
  role: string;
  upline_profile_id: string | null;
  created_at: string;
  partner_details: PartnerDetails | null;
}

export default function PartnerDirectory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Data storage
  const [allPartners, setAllPartners] = useState<PartnerData[]>([]);
  const [displayedPartners, setDisplayedPartners] = useState<PartnerData[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal State
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewPartner = (partner: PartnerData) => {
    setSelectedPartner(partner);
    setIsModalOpen(true);
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    country_id: "all",
    state_id: "all",
    district_id: "all",
    pincode_id: "all",
    location_id: "all",
  });

  // Location Master Data for Dropdowns
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Lookup maps for exact location names (Address Details)
  const [locationMaps, setLocationMaps] = useState({
    countries: {} as Record<string, string>,
    states: {} as Record<string, string>,
    districts: {} as Record<string, string>,
    pincodes: {} as Record<string, string>,
    locations: {} as Record<string, string>,
  });

  // 1. Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (!profile || profile.role !== "admin") {
          router.replace("/partner/login");
          return;
        }
        setAuthChecked(true);
      } catch (err) {
        console.error("Auth error", err);
        router.replace("/admin/login");
      }
    };
    checkAuth();
  }, [router]);

  // 2. Fetch Initial Filter Data (Countries)
  useEffect(() => {
    if (!authChecked) return;
    const fetchCountries = async () => {
      const { data } = await supabase.from("countries").select("id, name").order("name");
      if (data) setCountries(data);
    };
    fetchCountries();
  }, [authChecked]);

  // Handle cascaded filter fetching
  useEffect(() => {
    if (filters.country_id !== "all") {
      supabase.from("states").select("id, name").eq("country_id", filters.country_id).order("name").then(({ data }) => setStates(data || []));
    } else {
      setStates([]);
    }
  }, [filters.country_id]);

  useEffect(() => {
    if (filters.state_id !== "all") {
      supabase.from("districts").select("id, name").eq("state_id", filters.state_id).order("name").then(({ data }) => setDistricts(data || []));
    } else {
      setDistricts([]);
    }
  }, [filters.state_id]);

  useEffect(() => {
    if (filters.district_id !== "all") {
      supabase.from("pincodes").select("id, code").eq("district_id", filters.district_id).order("code").then(({ data }) => setPincodes(data || []));
    } else {
      setPincodes([]);
    }
  }, [filters.district_id]);

  useEffect(() => {
    if (filters.pincode_id !== "all") {
      supabase.from("locations").select("id, name").eq("pincode_id", filters.pincode_id).order("name").then(({ data }) => setLocations(data || []));
    } else {
      setLocations([]);
    }
  }, [filters.pincode_id]);

  // 3. Fetch All Partners Data (Two queries, merged in frontend)
  useEffect(() => {
    if (!authChecked) return;
    
    const fetchAllPartners = async () => {
      setLoading(true);
      try {
        // Query 1: Fetch Profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, role, upline_profile_id, created_at")
          .eq("role", "partner");

        if (profilesError) throw profilesError;
        
        if (!profilesData || profilesData.length === 0) {
          setAllPartners([]);
          setLoading(false);
          return;
        }

        // Chunk IDs safely for Query 2
        const profileIds = profilesData.map(p => p.id);
        const chunkSize = 150;
        let allDetails: PartnerDetails[] = [];

        // Query 2: Fetch Partner Details iteratively
        for (let i = 0; i < profileIds.length; i += chunkSize) {
          const chunk = profileIds.slice(i, i + chunkSize);
          const { data: detailsData, error: detailsError } = await (supabase as any)
            .from("partner_details")
            .select("profile_id, full_name, mobile_number, whatsapp_number, email, country_id, state_id, district_id, pincode_id, location_id")
            .in("profile_id", chunk);

          if (detailsError) throw detailsError;
          if (detailsData) {
            allDetails = [...allDetails, ...(detailsData as any as PartnerDetails[])];
          }
        }

        // Merge Frontend
        const mergedData: PartnerData[] = profilesData.map((profile) => {
          const details = allDetails.find(d => d.profile_id === profile.id);
          return {
            id: profile.id,
            username: profile.username,
            role: profile.role,
            upline_profile_id: profile.upline_profile_id,
            created_at: profile.created_at,
            partner_details: details || null
          };
        });

        // Sort globally by newest
        mergedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllPartners(mergedData);

      } catch (err) {
        console.error("Failed to fetch partners:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPartners();
  }, [authChecked]);

  // 3.5 Fetch exact location names for the Address maps
  useEffect(() => {
    if (allPartners.length === 0) return;

    const fetchLocationNames = async () => {
      const cIds = [...new Set(allPartners.map(p => p.partner_details?.country_id).filter(Boolean))] as string[];
      const sIds = [...new Set(allPartners.map(p => p.partner_details?.state_id).filter(Boolean))] as string[];
      const dIds = [...new Set(allPartners.map(p => p.partner_details?.district_id).filter(Boolean))] as string[];
      const pIds = [...new Set(allPartners.map(p => p.partner_details?.pincode_id).filter(Boolean))] as string[];
      const lIds = [...new Set(allPartners.map(p => p.partner_details?.location_id).filter(Boolean))] as string[];

      const maps = {
        countries: { ...locationMaps.countries },
        states: { ...locationMaps.states },
        districts: { ...locationMaps.districts },
        pincodes: { ...locationMaps.pincodes },
        locations: { ...locationMaps.locations },
      };

      const fetchMissing = async (table: string, ids: string[], mapObj: Record<string, string>, field = 'name') => {
        const missingIds = ids.filter(id => !mapObj[id]);
        if (missingIds.length === 0) return;
        
        for (let i = 0; i < missingIds.length; i += 200) {
          const chunk = missingIds.slice(i, i + 200);
          const { data } = await supabase.from(table).select(`id, ${field}`).in('id', chunk);
          if (data) {
            data.forEach((d: any) => { mapObj[d.id] = d[field]; });
          }
        }
      };

      await Promise.all([
        fetchMissing('countries', cIds, maps.countries),
        fetchMissing('states', sIds, maps.states),
        fetchMissing('districts', dIds, maps.districts),
        fetchMissing('pincodes', pIds, maps.pincodes, 'code'),
        fetchMissing('locations', lIds, maps.locations)
      ]);

      setLocationMaps(maps);
    };

    fetchLocationNames();
  }, [allPartners]);

  // 4. Frontend Filter & Pagination Engine
  useEffect(() => {
    let filtered = [...allPartners];

    // Search Logic
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.username && p.username.toLowerCase().includes(query)) ||
        (p.partner_details?.full_name && p.partner_details.full_name.toLowerCase().includes(query)) ||
        (p.partner_details?.mobile_number && p.partner_details.mobile_number.includes(query))
      );
    }

    // Filter Logic
    if (filters.country_id !== "all") {
      filtered = filtered.filter(p => p.partner_details?.country_id === filters.country_id);
    }
    if (filters.state_id !== "all") {
      filtered = filtered.filter(p => p.partner_details?.state_id === filters.state_id);
    }
    if (filters.district_id !== "all") {
      filtered = filtered.filter(p => p.partner_details?.district_id === filters.district_id);
    }
    if (filters.pincode_id !== "all") {
      filtered = filtered.filter(p => p.partner_details?.pincode_id === filters.pincode_id);
    }
    if (filters.location_id !== "all") {
      filtered = filtered.filter(p => p.partner_details?.location_id === filters.location_id);
    }

    setTotalCount(filtered.length);

    // Apply Pagination
    const startIdx = (page - 1) * PAGE_SIZE;
    const paginated = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    
    setDisplayedPartners(paginated);
  }, [allPartners, searchQuery, filters, page]);

  // Helpers
  const extractFullName = (p: PartnerData) => p.partner_details?.full_name || "Details not added";
  const extractMobile = (p: PartnerData) => p.partner_details?.mobile_number || "N/A";
  const extractEmail = (p: PartnerData) => p.partner_details?.email || "No Email";
  
  const getTerritoryCount = (p: PartnerData) => {
    if (!p.partner_details) return 0;
    return [
      p.partner_details.country_id,
      p.partner_details.state_id,
      p.partner_details.district_id,
      p.partner_details.pincode_id,
      p.partner_details.location_id
    ].filter(Boolean).length;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset pagination on filter change
  };

  const renderAddressField = (id: string | undefined | null, map: Record<string, string>) => {
    if (!id) return "Not provided";
    return map[id] || "Name not found";
  };

  if (!authChecked) return null;

  return (
    <>
      <Head>
        <title>Partner Directory | Admin | SAG Network</title>
      </Head>

      <main className="min-h-screen bg-background text-foreground pb-12">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/admin">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold font-heading flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Partner Directory
              </h1>
            </div>
            <Badge variant="secondary" className="font-mono shadow-sm">
              {totalCount} Total
            </Badge>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
          
          {/* Search & Filters */}
          <Card className="shadow-sm border-muted">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search by Username, Full Name, or Mobile Number..." 
                  className="pl-10 h-11 bg-muted/20"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
                <Select value={filters.country_id} onValueChange={(val) => handleFilterChange("country_id", val)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.state_id} onValueChange={(val) => handleFilterChange("state_id", val)} disabled={filters.country_id === "all"}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.district_id} onValueChange={(val) => handleFilterChange("district_id", val)} disabled={filters.state_id === "all"}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="District" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.pincode_id} onValueChange={(val) => handleFilterChange("pincode_id", val)} disabled={filters.district_id === "all"}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Pincode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pincodes</SelectItem>
                    {pincodes.map(p => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.location_id} onValueChange={(val) => handleFilterChange("location_id", val)} disabled={filters.pincode_id === "all"}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Location" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content Area */}
          <div className="w-full relative min-h-[400px]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : null}

            {displayedPartners.length === 0 && !loading ? (
              <Card className="border-dashed shadow-none bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-foreground">No Partners Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or location filters.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table View (Hidden on mobile) */}
                <Card className="hidden md:block shadow-sm border-muted overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Full Name</TableHead>
                        <TableHead className="font-bold">User ID</TableHead>
                        <TableHead className="font-bold">Contact Info</TableHead>
                        <TableHead className="font-bold">Territories</TableHead>
                        <TableHead className="text-right font-bold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPartners.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/10">
                          <TableCell className="font-medium text-foreground">
                            {extractFullName(p)}
                            {!p.partner_details && <div className="text-xs text-amber-600 mt-1 font-medium">Pending setup</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-background">{p.username || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{extractMobile(p)}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{extractEmail(p)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{getTerritoryCount(p)} Levels Set</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary font-semibold" onClick={() => handleViewPartner(p)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Mobile Card View (Hidden on desktop) */}
                <div className="md:hidden flex flex-col gap-4">
                  {displayedPartners.map((p) => (
                    <Card key={p.id} className="shadow-sm border-muted">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-foreground truncate">
                              {extractFullName(p)}
                            </h3>
                            <Badge variant="outline" className="font-mono mt-1 text-xs">{p.username || "N/A"}</Badge>
                            {!p.partner_details && <div className="text-xs text-amber-600 mt-1 font-medium">Pending setup</div>}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/20 p-3 rounded-lg border border-border/50">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mobile</span>
                            <span className="font-medium truncate">{extractMobile(p)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</span>
                            <span className="font-medium truncate">{extractEmail(p)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2 border-t pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <MapPin className="h-3.5 w-3.5" />
                            {getTerritoryCount(p)} Levels Set
                          </div>
                          <Button size="sm" variant="secondary" className="h-8 rounded-full px-4" onClick={() => handleViewPartner(p)}>
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    Showing {totalCount === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} partners
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1 || totalCount === 0}
                      onClick={() => setPage(p => p - 1)}
                      className="shadow-sm"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-sm font-bold w-10 text-center">{page}</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page * PAGE_SIZE >= totalCount || totalCount === 0}
                      onClick={() => setPage(p => p + 1)}
                      className="shadow-sm"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* View Partner Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
            <DialogHeader className="p-6 border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
              <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Partner Details
              </DialogTitle>
              <DialogDescription className="sr-only">Detailed read-only view of the selected partner.</DialogDescription>
            </DialogHeader>
            {selectedPartner && (
              <div className="p-6 flex flex-col gap-8 bg-background">
                {/* Basic Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2 border-b pb-2 border-border/50">
                    <User className="h-4 w-4" /> Basic Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Full Name</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">{selectedPartner.partner_details?.full_name || "Not available"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">User ID / Username</span>
                      <span className="text-sm font-mono text-foreground break-words whitespace-normal bg-muted/30 w-fit px-1.5 rounded">{selectedPartner.username || "Not available"}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2 border-b pb-2 border-border/50">
                    <Phone className="h-4 w-4" /> Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mobile Number</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">{selectedPartner.partner_details?.mobile_number || "Not available"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">WhatsApp Number</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">{selectedPartner.partner_details?.whatsapp_number || "Not available"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email Address</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">{selectedPartner.partner_details?.email || "Not available"}</span>
                    </div>
                  </div>
                </div>

                {/* Address Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2 border-b pb-2 border-border/50">
                    <MapIcon className="h-4 w-4" /> Address Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Country</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {renderAddressField(selectedPartner.partner_details?.country_id, locationMaps.countries)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">State</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {renderAddressField(selectedPartner.partner_details?.state_id, locationMaps.states)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">District</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {renderAddressField(selectedPartner.partner_details?.district_id, locationMaps.districts)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PIN Code</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {renderAddressField(selectedPartner.partner_details?.pincode_id, locationMaps.pincodes)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:col-span-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Location / Area</span>
                      <span className="text-sm font-medium text-foreground break-words whitespace-normal">
                        {renderAddressField(selectedPartner.partner_details?.location_id, locationMaps.locations)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-6 border-t bg-muted/10 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
              <Button disabled variant="secondary" className="w-full sm:w-auto opacity-70">
                Edit Partner Details - Coming Next
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}