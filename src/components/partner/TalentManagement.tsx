import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { locationService, Country, State, District, Pincode, Location } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Pencil, Calendar, MapPin, Activity } from "lucide-react";

interface Profile {
  id: string;
  username: string | null;
  [key: string]: any;
}

const countryCodes = [
  { code: "+91", label: "India (+91)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+971", label: "UAE (+971)" }
];

const days = Array.from({length: 31}, (_, i) => String(i + 1).padStart(2, '0'));
const months = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0'));
const years = Array.from({length: 100}, (_, i) => String(new Date().getFullYear() - i));

export function TalentManagement({ profile }: { profile: Profile }) {
  const { toast } = useToast();
  
  const [talents, setTalents] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  
  // Location States
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Modal States
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    fullName: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    gender: "",
    mobileCountryCode: "+91",
    mobileNumber: "",
    whatsappSame: false,
    whatsappNumber: "",
    sportId: "",
    level: "",
    goal: "",
    countryId: "",
    stateId: "",
    districtId: "",
    pincodeId: "",
    locationId: ""
  });

  const [ageCategory, setAgeCategory] = useState("");

  useEffect(() => {
    fetchTalents();
    fetchSports();
    locationService.getCountries().then(setCountries);
  }, []);

  // Cascade Locations
  useEffect(() => {
    if (formData.countryId) locationService.getStatesByCountry(formData.countryId).then(setStates);
    else setStates([]);
  }, [formData.countryId]);

  useEffect(() => {
    if (formData.stateId) locationService.getDistrictsByState(formData.stateId).then(setDistricts);
    else setDistricts([]);
  }, [formData.stateId]);

  useEffect(() => {
    if (formData.districtId) locationService.getPincodesByDistrict(formData.districtId).then(setPincodes);
    else setPincodes([]);
  }, [formData.districtId]);

  useEffect(() => {
    if (formData.pincodeId) locationService.getLocationsByPincode(formData.pincodeId).then(setLocations);
    else setLocations([]);
  }, [formData.pincodeId]);

  // Calculate Age Category
  useEffect(() => {
    if (formData.dobDay && formData.dobMonth && formData.dobYear) {
      const dob = new Date(Number(formData.dobYear), Number(formData.dobMonth) - 1, Number(formData.dobDay));
      const ageDifMs = Date.now() - dob.getTime();
      const ageDate = new Date(ageDifMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      
      let category = "";
      if (age <= 14) category = "U-14";
      else if (age >= 15 && age <= 30) category = `U-${age}`;
      else if (age >= 31 && age <= 35) category = "31-35";
      else if (age >= 36 && age <= 40) category = "36-40";
      else category = "Above 40";
      
      setAgeCategory(category);
    } else {
      setAgeCategory("");
    }
  }, [formData.dobDay, formData.dobMonth, formData.dobYear]);

  const fetchSports = async () => {
    const { data } = await (supabase as any).from('sports_activities').select('*').eq('is_active', true).order('name');
    console.log('sports data:', data);
    if (data) setSports(data);
  };

  const fetchTalents = async () => {
    const { data } = await (supabase as any)
      .from('talent_registrations')
      .select('*')
      .eq('submitted_by_profile_id', profile.id)
      .order('registered_at', { ascending: false });

    if (data && data.length > 0) {
      const locIds = [...new Set(data.map((d: any) => d.location_id).filter(Boolean))];
      const sportIds = [...new Set(data.map((d: any) => d.sport_activity_id).filter(Boolean))];

      let locMap: any = {};
      if (locIds.length) {
        const { data: locs } = await supabase.from('locations').select('id, name').in('id', locIds as string[]);
        locMap = locs?.reduce((acc: any, l: any) => ({...acc, [l.id]: l.name}), {}) || {};
      }

      let sportMap: any = {};
      if (sportIds.length) {
        const { data: sps } = await (supabase as any).from('sports_activities').select('id, name').in('id', sportIds);
        sportMap = sps?.reduce((acc: any, s: any) => ({...acc, [s.id]: s.name}), {}) || {};
      }

      const enriched = data.map((d: any) => ({
        ...d,
        sport_name: sportMap[d.sport_activity_id] || 'Unknown',
        location_name: locMap[d.location_id] || 'Unknown'
      }));
      setTalents(enriched);
    } else {
      setTalents([]);
    }
  };

  const handleOpenModal = (talent?: any) => {
    if (talent) {
      setEditId(talent.id);
      const [y, m, d] = (talent.date_of_birth || "--").split('-');
      
      setFormData({
        fullName: talent.full_name || "",
        dobDay: d || "",
        dobMonth: m || "",
        dobYear: y || "",
        gender: talent.gender || "",
        mobileCountryCode: talent.mobile_country_code || "+91",
        mobileNumber: talent.mobile_number || "",
        whatsappSame: talent.whatsapp_number === talent.mobile_number,
        whatsappNumber: talent.whatsapp_number || "",
        sportId: talent.sport_activity_id || "",
        level: talent.level || "",
        goal: talent.goal || "",
        countryId: talent.country_id || "",
        stateId: talent.state_id || "",
        districtId: talent.district_id || "",
        pincodeId: talent.pincode_id || "",
        locationId: talent.location_id || ""
      });
    } else {
      setEditId(null);
      setFormData({
        fullName: "", dobDay: "", dobMonth: "", dobYear: "", gender: "",
        mobileCountryCode: "+91", mobileNumber: "", whatsappSame: false, whatsappNumber: "",
        sportId: "", level: "", goal: "",
        countryId: "", stateId: "", districtId: "", pincodeId: "", locationId: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        full_name: formData.fullName,
        date_of_birth: `${formData.dobYear}-${formData.dobMonth}-${formData.dobDay}`,
        age_category: ageCategory,
        gender: formData.gender,
        mobile_country_code: formData.mobileCountryCode,
        mobile_number: formData.mobileNumber,
        whatsapp_number: formData.whatsappSame ? formData.mobileNumber : formData.whatsappNumber,
        sport_activity_id: formData.sportId,
        level: formData.level,
        goal: formData.goal,
        country_id: formData.countryId,
        state_id: formData.stateId,
        district_id: formData.districtId,
        pincode_id: formData.pincodeId,
        location_id: formData.locationId,
        submitted_by_profile_id: profile.id,
        submitted_by_username: profile.username
      };

      if (editId) {
        const { error } = await (supabase as any).from('talent_registrations').update(payload).eq('id', editId);
        if (error) throw error;
        toast({ title: "Success", description: "Talent updated successfully." });
      } else {
        const { error } = await (supabase as any).from('talent_registrations').insert([{
          ...payload,
          registered_at: new Date().toISOString()
        }]);
        if (error) throw error;
        toast({ title: "Success", description: "Talent registered successfully." });
      }
      
      setIsModalOpen(false);
      fetchTalents();
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("mobile")) {
        toast({ title: "Registration Failed", description: "This mobile number already exists.", variant: "destructive" });
      } else if (msg.includes("whatsapp")) {
        toast({ title: "Registration Failed", description: "This WhatsApp number already exists.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 mt-10">
      <Card className="w-full border-emerald-300/80 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-background shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Talent Management</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Register new players and manage your existing talent network directory.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsHubOpen(true)} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold h-11 px-8 rounded-xl shrink-0">
            Manage Talent
            <Plus className="h-5 w-5 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Talent Management Hub Dialog */}
      <Dialog open={isHubOpen} onOpenChange={setIsHubOpen}>
        <DialogContent className="max-w-2xl p-6 sm:p-8 rounded-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl text-emerald-700 dark:text-emerald-500">Talent Management Hub</DialogTitle>
            <DialogDescription>
              Choose an action to manage your talent network.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card 
              className="cursor-pointer border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 hover:shadow-md transition-all group"
              onClick={() => { setIsHubOpen(false); handleOpenModal(); }}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Register New Talent</h4>
                  <p className="text-sm text-muted-foreground mt-1">Add a new player or athlete to your network.</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer border-blue-200 dark:border-blue-800 hover:border-blue-500 hover:shadow-md transition-all group"
              onClick={() => { setIsHubOpen(false); setIsDirectoryOpen(true); }}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">View All Registered Talent</h4>
                  <p className="text-sm text-muted-foreground mt-1">Browse, edit, and manage your directory.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Directory Table Dialog */}
      <Dialog open={isDirectoryOpen} onOpenChange={setIsDirectoryOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl flex items-center gap-2 text-foreground">
              <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
              My Talent / Player Directory
            </DialogTitle>
            <DialogDescription>
              View and manage all the talents you have registered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="shadow-sm border-border/60 overflow-hidden bg-card">
              {talents.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-medium">
                  No talents registered yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Sport</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Registered Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {talents.map((t) => (
                        <TableRow key={t.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                          <TableCell className="font-semibold">{t.full_name}</TableCell>
                          <TableCell>{t.sport_name}</TableCell>
                          <TableCell>
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2 py-1 rounded-md font-medium">
                              {t.level || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {t.location_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(t.registered_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(t)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800">
                              <Pencil className="h-4 w-4 mr-1.5" />
                              Edit
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
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl text-emerald-700 dark:text-emerald-500">
              {editId ? "Edit Talent" : "Register New Talent"}
            </DialogTitle>
            <DialogDescription>
              Fill out the details below to add a new talent to your directory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8 py-4">
            
            {/* Personal Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Personal Details</h4>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="h-11 rounded-xl" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <div className="flex gap-2">
                    <Select required value={formData.dobDay} onValueChange={v => setFormData({...formData, dobDay: v})}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="DD" /></SelectTrigger>
                      <SelectContent className="max-h-[200px]"><SelectItem value=" ">DD</SelectItem>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select required value={formData.dobMonth} onValueChange={v => setFormData({...formData, dobMonth: v})}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="MM" /></SelectTrigger>
                      <SelectContent className="max-h-[200px]"><SelectItem value=" ">MM</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select required value={formData.dobYear} onValueChange={v => setFormData({...formData, dobYear: v})}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="YYYY" /></SelectTrigger>
                      <SelectContent className="max-h-[200px]"><SelectItem value=" ">YYYY</SelectItem>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Age Category</Label>
                  <Input disabled value={ageCategory} className="h-11 rounded-xl bg-muted font-bold text-emerald-600" placeholder="Auto-calculated" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select required value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.mobileCountryCode} onValueChange={v => setFormData({...formData, mobileCountryCode: v})}>
                      <SelectTrigger className="w-[120px] h-11 rounded-xl shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input required type="tel" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className="h-11 rounded-xl flex-1" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between h-[20px] mb-2">
                    <Label>WhatsApp Number</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="wa-same" 
                        checked={formData.whatsappSame} 
                        onCheckedChange={(c) => {
                          setFormData(prev => ({...prev, whatsappSame: !!c, whatsappNumber: c ? prev.mobileNumber : prev.whatsappNumber}))
                        }} 
                      />
                      <label htmlFor="wa-same" className="text-xs text-muted-foreground cursor-pointer">Same as Mobile</label>
                    </div>
                  </div>
                  <Input disabled={formData.whatsappSame} type="tel" value={formData.whatsappSame ? formData.mobileNumber : formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Sport Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Sport Profile</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sport / Activity *</Label>
                  <Select required value={formData.sportId ? String(formData.sportId) : ""} onValueChange={v => setFormData({...formData, sportId: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Sport" /></SelectTrigger>
                    <SelectContent>
                      {sports.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name || "Unknown Sport"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level *</Label>
                  <Select required value={formData.level} onValueChange={v => setFormData({...formData, level: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Goal *</Label>
                  <Select required value={formData.goal} onValueChange={v => setFormData({...formData, goal: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Goal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Hobby">Hobby</SelectItem>
                      <SelectItem value="Timepass">Timepass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Location</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select required value={formData.countryId ? String(formData.countryId) : ""} onValueChange={v => setFormData({...formData, countryId: v, stateId: "", districtId: "", pincodeId: "", locationId: ""})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select required disabled={!formData.countryId} value={formData.stateId ? String(formData.stateId) : ""} onValueChange={v => setFormData({...formData, stateId: v, districtId: "", pincodeId: "", locationId: ""})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent>
                      {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Select required disabled={!formData.stateId} value={formData.districtId ? String(formData.districtId) : ""} onValueChange={v => setFormData({...formData, districtId: v, pincodeId: "", locationId: ""})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select District" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PIN Code *</Label>
                  <Select required disabled={!formData.districtId} value={formData.pincodeId ? String(formData.pincodeId) : ""} onValueChange={v => setFormData({...formData, pincodeId: v, locationId: ""})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select PIN" /></SelectTrigger>
                    <SelectContent>
                      {pincodes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Location / Area *</Label>
                  <Select required disabled={!formData.pincodeId} value={formData.locationId ? String(formData.locationId) : ""} onValueChange={v => setFormData({...formData, locationId: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select Location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? "Saving..." : (editId ? "Save Changes" : "Register Talent")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}