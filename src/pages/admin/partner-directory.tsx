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
import { ArrowLeft, Search, Eye, Users, MapPin, ChevronLeft, ChevronRight, User, Phone, Map as MapIcon, Shield, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [filteredPartners, setFilteredPartners] = useState<PartnerData[]>([]);
  const [displayedPartners, setDisplayedPartners] = useState<PartnerData[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const handleViewPartner = (partner: PartnerData) => {
    router.push(`/admin/partner-directory/${partner.id}`);
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
          const { data } = await (supabase as any).from(table).select(`id, ${field}`).in('id', chunk);
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
    setFilteredPartners(filtered);

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

  const handleExportCSV = () => {
    if (filteredPartners.length === 0) return;

    const headers = [
      "Full Name",
      "User ID",
      "Mobile Number",
      "WhatsApp Number",
      "Email",
      "Country",
      "State",
      "District",
      "PIN Code",
      "Location / Area",
      "Upline User ID / Username"
    ];

    const escapeCSV = (str: string | undefined | null) => {
      if (!str) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = filteredPartners.map(p => {
      const details = p.partner_details;
      
      const upline = allPartners.find(u => u.id === p.upline_profile_id);
      const uplineStr = upline ? upline.username : (p.upline_profile_id || "Not Available");

      return [
        escapeCSV(details?.full_name),
        escapeCSV(p.username),
        escapeCSV(details?.mobile_number),
        escapeCSV(details?.whatsapp_number),
        escapeCSV(details?.email),
        escapeCSV(details?.country_id ? locationMaps.countries[details.country_id] : ""),
        escapeCSV(details?.state_id ? locationMaps.states[details.state_id] : ""),
        escapeCSV(details?.district_id ? locationMaps.districts[details.district_id] : ""),
        escapeCSV(details?.pincode_id ? locationMaps.pincodes[details.pincode_id] : ""),
        escapeCSV(details?.location_id ? locationMaps.locations[details.location_id] : ""),
        escapeCSV(uplineStr)
      ].join(",");
    });

    const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const date = new Date().toISOString().split("T")[0];
    link.download = `partners_export_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!authChecked) return null;

  return (
    <>
      <Head>
        <title>Partner Directory | Admin | SAG Network</title>
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-background dark:via-background/95 dark:to-background text-foreground pb-12">
        {/* Header */}
        <header className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <Link href="/admin">
                  <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold font-heading flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                Partner Directory
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge className="font-mono shadow-sm hidden sm:inline-flex bg-blue-100 hover:bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50 font-bold px-3 py-1 rounded-full transition-all">
                {totalCount} Total
              </Badge>
              <Button 
                onClick={handleExportCSV} 
                variant="outline" 
                size="sm" 
                className="h-8 shadow-sm text-xs font-bold bg-white dark:bg-card border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-all rounded-full px-4"
                disabled={filteredPartners.length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6 relative z-10">
          
          {/* Search & Filters */}
          <Card className="shadow-md border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-card/60 backdrop-blur-xl rounded-2xl overflow-visible">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name, user ID, mobile, or email..." 
                    className="pl-9 h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl shadow-inner focus-visible:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground font-medium">Loading partners...</p>
            </div>
          ) : displayedPartners.length === 0 ? (
            <Card className="shadow-sm border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-card/50 rounded-2xl">
              <CardContent className="py-20 text-center flex flex-col items-center justify-center">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-muted-foreground font-medium">No partners found matching the filters.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Table for larger screens */}
              <Card className="hidden md:block shadow-md border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Partner</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Contact</TableHead>
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Role & Location</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedPartners.map((p) => (
                        <TableRow key={p.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold">
                                  {p.partner_details?.full_name?.substring(0, 2).toUpperCase() || p.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{p.partner_details?.full_name || "Unknown"}</p>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded mt-1">{p.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                <Phone className="h-3 w-3 mr-1.5 text-slate-400" />
                                {p.partner_details?.mobile_number || "No mobile"}
                              </div>
                              {p.partner_details?.email && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {p.partner_details.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm font-semibold">
                                <Shield className="h-3 w-3 mr-1 text-blue-500" />
                                {p.role === 'admin' ? 'Admin' : 'Partner'}
                              </Badge>
                              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                                <MapIcon className="h-3 w-3 mr-1 text-emerald-500" />
                                <span className="truncate max-w-[200px]" title={renderAddressField(p.partner_details?.location_id, locationMaps.locations)}>
                                  {renderAddressField(p.partner_details?.location_id, locationMaps.locations)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild className="hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 font-medium">
                              <Link href={`/admin/partner-directory/${p.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Mobile view cards */}
              <div className="md:hidden space-y-4">
                {displayedPartners.map((p) => (
                  <Card key={p.id} className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/90 dark:bg-card/90 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200">
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-sm">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-bold text-lg">
                              {p.partner_details?.full_name?.substring(0, 2).toUpperCase() || p.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{p.partner_details?.full_name || "Unknown"}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block px-1.5 py-0.5 rounded mt-0.5">{p.username}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 shadow-sm">
                          {p.role === 'admin' ? 'Admin' : 'Partner'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact</p>
                          <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                            <Phone className="h-3 w-3 mr-1 text-slate-400" />
                            {p.partner_details?.mobile_number || "N/A"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Location</p>
                          <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                            <MapPin className="h-3 w-3 mr-1 text-emerald-500 shrink-0" />
                            <span className="truncate">{renderAddressField(p.partner_details?.location_id, locationMaps.locations)}</span>
                          </div>
                        </div>
                      </div>

                      <Button variant="secondary" className="w-full mt-2 font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50" asChild>
                        <Link href={`/admin/partner-directory/${p.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Profile
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 pb-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Showing <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredPartners.length)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{filteredPartners.length}</span> results
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center px-3 text-sm font-bold bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                      {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}