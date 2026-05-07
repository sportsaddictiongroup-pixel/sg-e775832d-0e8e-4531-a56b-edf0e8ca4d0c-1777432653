import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Download, Eye, Calendar, Activity, MapPin, FilterX, Users } from "lucide-react";

export default function TalentReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<any[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<any[]>([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    country: "all",
    state: "all",
    district: "all",
    pincode: "all",
    location: "all",
    gender: "all",
    ageCategory: "all",
    sport: "all",
    submittedBy: "all"
  });

  const [filterOptions, setFilterOptions] = useState<any>({
    countries: [], states: [], districts: [], pincodes: [], locations: [], 
    genders: [], ageCategories: [], sports: [], submittedBys: []
  });

  const [selectedTalentDetail, setSelectedTalentDetail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!profile || profile.role !== "admin") {
        router.replace("/partner/login");
        return;
      }
      
      if (!isMounted) return;
      await fetchTalents();
    };
    init();
    return () => { isMounted = false; };
  }, [router]);

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("talent_registrations")
        .select("*")
        .order("registered_at", { ascending: false });

      if (error) throw error;
      
      const { data: countries } = await supabase.from('countries').select('id, name');
      const { data: states } = await supabase.from('states').select('id, name');
      const { data: districts } = await supabase.from('districts').select('id, name');
      const { data: pincodes } = await supabase.from('pincodes').select('id, code');
      const { data: locations } = await supabase.from('locations').select('id, name');
      const { data: sports } = await (supabase as any).from('sports_activities').select('id, name');

      const countryMap = countries?.reduce((acc: any, c: any) => ({...acc, [c.id]: c.name}), {}) || {};
      const stateMap = states?.reduce((acc: any, s: any) => ({...acc, [s.id]: s.name}), {}) || {};
      const distMap = districts?.reduce((acc: any, d: any) => ({...acc, [d.id]: d.name}), {}) || {};
      const pinMap = pincodes?.reduce((acc: any, p: any) => ({...acc, [p.id]: p.code}), {}) || {};
      const locMap = locations?.reduce((acc: any, l: any) => ({...acc, [l.id]: l.name}), {}) || {};
      const sportMap = sports?.reduce((acc: any, s: any) => ({...acc, [s.id]: s.name}), {}) || {};

      const enriched = (data || []).map((d: any) => ({
        ...d,
        country_name: countryMap[d.country_id] || 'Unknown',
        state_name: stateMap[d.state_id] || 'Unknown',
        district_name: distMap[d.district_id] || 'Unknown',
        pincode_code: pinMap[d.pincode_id] || 'Unknown',
        location_name: locMap[d.location_id] || 'Unknown',
        sport_name: sportMap[d.sport_activity_id] || 'Unknown'
      }));

      setTalents(enriched);
      setFilteredTalents(enriched);

      setFilterOptions({
        countries: [...new Set(enriched.map(t => t.country_name))].filter(Boolean).sort(),
        states: [...new Set(enriched.map(t => t.state_name))].filter(Boolean).sort(),
        districts: [...new Set(enriched.map(t => t.district_name))].filter(Boolean).sort(),
        pincodes: [...new Set(enriched.map(t => t.pincode_code))].filter(Boolean).sort(),
        locations: [...new Set(enriched.map(t => t.location_name))].filter(Boolean).sort(),
        genders: [...new Set(enriched.map(t => t.gender))].filter(Boolean).sort(),
        ageCategories: [...new Set(enriched.map(t => t.age_category))].filter(Boolean).sort(),
        sports: [...new Set(enriched.map(t => t.sport_name))].filter(Boolean).sort(),
        submittedBys: [...new Set(enriched.map(t => t.submitted_by_username))].filter(Boolean).sort(),
      });

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = talents;

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.full_name?.toLowerCase().includes(lowerQ) ||
        t.mobile_number?.includes(lowerQ) ||
        t.whatsapp_number?.includes(lowerQ)
      );
    }

    if (filters.country !== "all") result = result.filter(t => t.country_name === filters.country);
    if (filters.state !== "all") result = result.filter(t => t.state_name === filters.state);
    if (filters.district !== "all") result = result.filter(t => t.district_name === filters.district);
    if (filters.pincode !== "all") result = result.filter(t => t.pincode_code === filters.pincode);
    if (filters.location !== "all") result = result.filter(t => t.location_name === filters.location);
    if (filters.gender !== "all") result = result.filter(t => t.gender === filters.gender);
    if (filters.ageCategory !== "all") result = result.filter(t => t.age_category === filters.ageCategory);
    if (filters.sport !== "all") result = result.filter(t => t.sport_name === filters.sport);
    if (filters.submittedBy !== "all") result = result.filter(t => t.submitted_by_username === filters.submittedBy);

    setFilteredTalents(result);
  }, [searchQuery, filters, talents]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      country: "all", state: "all", district: "all", pincode: "all", location: "all",
      gender: "all", ageCategory: "all", sport: "all", submittedBy: "all"
    });
  };

  const downloadCSV = () => {
    if (filteredTalents.length === 0) return;
    const headers = [
      "Registration Date", "Full Name", "Gender", "Mobile Number", "WhatsApp Number",
      "Sport / Activity", "Level", "Goal", "Age Category", 
      "Country", "State", "District", "PIN Code", "Location / Area", "Submitted By Username"
    ];
    
    const rows = filteredTalents.map(t => [
      new Date(t.registered_at).toLocaleDateString(),
      t.full_name,
      t.gender || 'Other',
      `${t.mobile_country_code} ${t.mobile_number}`,
      `${t.whatsapp_country_code} ${t.whatsapp_number}`,
      t.sport_name,
      t.level || 'N/A',
      t.goal || 'N/A',
      t.age_category,
      t.country_name,
      t.state_name,
      t.district_name,
      t.pincode_code,
      t.location_name,
      t.submitted_by_username || 'System'
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `talent_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-7xl flex justify-center items-center h-64">
          <p className="text-muted-foreground animate-pulse font-medium">Loading reports...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <SEO title="Registered Talent Reports" description="Admin talent reports and CSV exports" />
      <main className="min-h-screen bg-slate-50 dark:bg-background text-foreground px-4 py-8 pb-20">
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
          
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Registered Talent Reports</h1>
              <p className="text-sm text-slate-500 font-medium">View and export all talent registrations across the network.</p>
            </div>
          </div>

          {/* Top Actions & Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl font-bold border border-teal-100 dark:border-teal-800/50 flex items-center gap-2">
                <Users className="h-4 w-4" />
                {filteredTalents.length} Talents Found
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search name or mobile..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <Button onClick={downloadCSV} disabled={filteredTalents.length === 0} className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm shrink-0">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters Grid */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FilterX className="h-4 w-4 text-slate-400" /> Filters
                </h3>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8 text-slate-500 hover:text-slate-800">
                  Clear Filters
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
                {Object.entries({
                  country: { label: "Country", options: filterOptions.countries },
                  state: { label: "State", options: filterOptions.states },
                  district: { label: "District", options: filterOptions.districts },
                  pincode: { label: "PIN Code", options: filterOptions.pincodes },
                  location: { label: "Location / Area", options: filterOptions.locations },
                  sport: { label: "Sport / Activity", options: filterOptions.sports },
                  ageCategory: { label: "Age Category", options: filterOptions.ageCategories },
                  gender: { label: "Gender", options: filterOptions.genders },
                  submittedBy: { label: "Submitted By", options: filterOptions.submittedBys },
                }).map(([key, config]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{config.label}</label>
                    <Select value={(filters as any)[key]} onValueChange={v => setFilters({...filters, [key]: v})}>
                      <SelectTrigger className="h-9 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {config.label}s</SelectItem>
                        {config.options.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            {filteredTalents.length === 0 ? (
              <div className="py-20 text-center text-slate-500 font-medium flex flex-col items-center">
                <Search className="h-10 w-10 text-slate-300 mb-3" />
                No talents match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Reg. Date</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Name</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Gender</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Mobile Number</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Sport / Activity</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Country</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4">Submitted By</TableHead>
                      <TableHead className="font-bold text-slate-600 dark:text-slate-400 py-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTalents.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 w-fit px-2 py-1 rounded">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.registered_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 font-bold text-slate-800 dark:text-slate-200">
                          {t.full_name}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            t.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                            t.gender === 'Female' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' :
                            'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {t.gender || 'Other'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {t.mobile_country_code} {t.mobile_number}
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          <span className="px-2 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                            {t.sport_name}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-slate-500 font-medium">
                          {t.country_name}
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                            {t.submitted_by_username || "System"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSelectedTalentDetail(t); setIsDetailOpen(true); }} 
                            className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 h-8 w-8 p-0 rounded-full"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 sm:p-8 text-white">
            {selectedTalentDetail && (
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{selectedTalentDetail.full_name}</h2>
                <p className="text-teal-100 font-medium mt-1">Admin Talent Details & Information</p>
              </div>
            )}
          </div>
          
          <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-950">
            {selectedTalentDetail && (
              <div className="space-y-8">
                
                {/* Core Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Registration Date</span>
                    <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-teal-500" />
                      {new Date(selectedTalentDetail.registered_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Gender</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.gender || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">DOB / Age Category</span>
                    <span className="font-semibold text-foreground text-sm">
                      {new Date(selectedTalentDetail.date_of_birth).toLocaleDateString()} 
                      <span className="text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded ml-2 text-xs">
                        {selectedTalentDetail.age_category}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Mobile Number</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.mobile_country_code} {selectedTalentDetail.mobile_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">WhatsApp Number</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.whatsapp_country_code} {selectedTalentDetail.whatsapp_number}</span>
                  </div>
                </div>

                {/* Sport Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Sport / Activity</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400 text-sm">
                      {selectedTalentDetail.sport_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Level</span>
                    <span className="font-semibold text-foreground text-sm uppercase tracking-wider">{selectedTalentDetail.level || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Goal</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.goal || "N/A"}</span>
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Country</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.country_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">State</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.state_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">District</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.district_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">PIN Code</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.pincode_code}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Location / Area</span>
                    <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {selectedTalentDetail.location_name}
                    </span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>Submitted by: <strong className="text-slate-700 dark:text-slate-300">{selectedTalentDetail.submitted_by_username || "System"}</strong></span>
                  </div>
                  <span>ID: <span className="font-mono">TR-{String(selectedTalentDetail.id).padStart(6, '0')}</span></span>
                </div>
                
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}