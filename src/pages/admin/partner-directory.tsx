import { useEffect, useState } from "react";
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
import { ArrowLeft, Search, Eye, Users, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

interface PartnerData {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name: string;
  mobile_number: string;
  partner_details?: any;
  territory_assignments?: any[];
}

export default function PartnerDirectory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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

  // 3. Fetch Partners Data
  useEffect(() => {
    if (!authChecked) return;
    
    const fetchPartners = async () => {
      setLoading(true);
      try {
        // If a location filter is applied, we must use an inner join to filter the parent correctly
        const hasLocationFilter = 
          filters.country_id !== "all" || 
          filters.state_id !== "all" || 
          filters.district_id !== "all" || 
          filters.pincode_id !== "all" || 
          filters.location_id !== "all";

        const selectQuery = `
          id, username, email, role, full_name, mobile_number,
          partner_details (full_name, mobile_number),
          territory_assignments${hasLocationFilter ? '!inner' : ''} (
            country_id, state_id, district_id, pincode_id, location_id
          )
        `;

        let query = supabase
          .from("profiles")
          .select(selectQuery, { count: "exact" })
          .eq("role", "partner");

        if (searchQuery.trim()) {
          query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`);
        }

        if (filters.country_id !== "all") query = query.eq("territory_assignments.country_id", filters.country_id);
        if (filters.state_id !== "all") query = query.eq("territory_assignments.state_id", filters.state_id);
        if (filters.district_id !== "all") query = query.eq("territory_assignments.district_id", filters.district_id);
        if (filters.pincode_id !== "all") query = query.eq("territory_assignments.pincode_id", filters.pincode_id);
        if (filters.location_id !== "all") query = query.eq("territory_assignments.location_id", filters.location_id);

        const { data, count, error } = await query
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching partners:", error);
          return;
        }

        setPartners(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error("Failed to fetch partners:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [authChecked, page, searchQuery, filters]);

  // Safe data extraction helpers
  const extractFullName = (p: PartnerData) => {
    const pd = Array.isArray(p.partner_details) ? p.partner_details[0] : p.partner_details;
    return pd?.full_name || p.full_name || "Unknown";
  };

  const extractMobile = (p: PartnerData) => {
    const pd = Array.isArray(p.partner_details) ? p.partner_details[0] : p.partner_details;
    return pd?.mobile_number || p.mobile_number || "N/A";
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset pagination on filter change
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

            {partners.length === 0 && !loading ? (
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
                      {partners.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/10">
                          <TableCell className="font-medium text-foreground">{extractFullName(p)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-background">{p.username || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{extractMobile(p)}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.email || "No Email"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{p.territory_assignments?.length || 0} Assigned</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary font-semibold" onClick={() => alert("Placeholder: View Partner Profile")}>
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
                  {partners.map((p) => (
                    <Card key={p.id} className="shadow-sm border-muted">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-foreground truncate">{extractFullName(p)}</h3>
                            <Badge variant="outline" className="font-mono mt-1 text-xs">{p.username || "N/A"}</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/20 p-3 rounded-lg border border-border/50">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mobile</span>
                            <span className="font-medium truncate">{extractMobile(p)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</span>
                            <span className="font-medium truncate">{p.email || "N/A"}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2 border-t pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <MapPin className="h-3.5 w-3.5" />
                            {p.territory_assignments?.length || 0} Territories
                          </div>
                          <Button size="sm" variant="secondary" className="h-8 rounded-full px-4" onClick={() => alert("Placeholder: View Partner Profile")}>
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
                    Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} partners
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="shadow-sm"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-sm font-bold w-10 text-center">{page}</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page * PAGE_SIZE >= totalCount}
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
      </main>
    </>
  );
}