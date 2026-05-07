import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
import { Plus, Users, Pencil, Calendar, MapPin, Activity, Eye } from "lucide-react";

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

export function TalentManagement({ profile, mode = "hub" }: { profile: Profile; mode?: "hub" | "directory" | "register" }) {
  const router = useRouter();
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTalentDetail, setSelectedTalentDetail] = useState<any>(null);
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
      const stateIds = [...new Set(data.map((d: any) => d.state_id).filter(Boolean))];
      const distIds = [...new Set(data.map((d: any) => d.district_id).filter(Boolean))];
      const pinIds = [...new Set(data.map((d: any) => d.pincode_id).filter(Boolean))];

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

      let stateMap: any = {};
      if (stateIds.length) {
        const { data: sts } = await supabase.from('states').select('id, name').in('id', stateIds as string[]);
        stateMap = sts?.reduce((acc: any, s: any) => ({...acc, [s.id]: s.name}), {}) || {};
      }

      let distMap: any = {};
      if (distIds.length) {
        const { data: dts } = await supabase.from('districts').select('id, name').in('id', distIds as string[]);
        distMap = dts?.reduce((acc: any, d: any) => ({...acc, [d.id]: d.name}), {}) || {};
      }

      let pinMap: any = {};
      if (pinIds.length) {
        const { data: pns } = await supabase.from('pincodes').select('id, code').in('id', pinIds as string[]);
        pinMap = pns?.reduce((acc: any, p: any) => ({...acc, [p.id]: p.code}), {}) || {};
      }

      const enriched = data.map((d: any) => ({
        ...d,
        sport_name: sportMap[d.sport_activity_id] || 'Unknown',
        location_name: locMap[d.location_id] || 'Unknown',
        state_name: stateMap[d.state_id] || 'Unknown',
        district_name: distMap[d.district_id] || 'Unknown',
        pincode_code: pinMap[d.pincode_id] || 'Unknown'
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
      const finalWaNumber = formData.whatsappSame ? formData.mobileNumber : formData.whatsappNumber;
      const finalWaCode = formData.whatsappSame ? formData.mobileCountryCode : formData.mobileCountryCode;

      // 1. Check for Mobile Duplicate against existing rows (Country Code + Number)
      let mQuery = (supabase as any).from('talent_registrations')
        .select('id')
        .eq('mobile_country_code', formData.mobileCountryCode)
        .eq('mobile_number', formData.mobileNumber);
      if (editId) mQuery = mQuery.neq('id', editId);
      const { data: existingMobile } = await mQuery.limit(1);
      const mobileExists = existingMobile && existingMobile.length > 0;

      // 2. Check for WhatsApp Duplicate against existing rows (Country Code + Number)
      let whatsappExists = false;
      if (finalWaNumber) {
        let wQuery = (supabase as any).from('talent_registrations')
          .select('id')
          .eq('whatsapp_country_code', finalWaCode)
          .eq('whatsapp_number', finalWaNumber);
        if (editId) wQuery = wQuery.neq('id', editId);
        const { data: existingWa } = await wQuery.limit(1);
        whatsappExists = existingWa && existingWa.length > 0;
      }

      // Check Combined or Individual Duplicate states
      if (mobileExists && whatsappExists) {
        toast({ title: "Registration Failed", description: "Mobile number and WhatsApp number already exist.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      } else if (mobileExists) {
        toast({ title: "Registration Failed", description: "Mobile number already exists.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      } else if (whatsappExists) {
        toast({ title: "Registration Failed", description: "WhatsApp number already exists.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        full_name: formData.fullName,
        date_of_birth: `${formData.dobYear}-${formData.dobMonth}-${formData.dobDay}`,
        age_category: ageCategory,
        gender: formData.gender,
        mobile_country_code: formData.mobileCountryCode,
        mobile_number: formData.mobileNumber,
        whatsapp_country_code: formData.whatsappSame ? formData.mobileCountryCode : formData.mobileCountryCode,
        whatsapp_number: finalWaNumber,
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
      
      if (mode === "register") {
        router.push("/partner/talent-directory");
      }
    } catch (error: any) {
      let errorMsg = error.message || "An unexpected error occurred.";
      
      // Sanitize raw database unique constraint violations
      if (error.code === '23505' || errorMsg.includes('unique constraint') || errorMsg.includes('duplicate key')) {
        if (errorMsg.includes('whatsapp')) {
          errorMsg = "WhatsApp number already exists.";
        } else if (errorMsg.includes('mobile')) {
          errorMsg = "Mobile number already exists.";
        } else {
          errorMsg = "Mobile number and WhatsApp number already exist.";
        }
      }

      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const talentForm = (
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

      <div className="pt-6 flex justify-end gap-3 border-t border-border/50 mt-8">
        <Button type="button" variant="outline" onClick={() => {
          if (mode === "register") router.push('/partner');
          else setIsModalOpen(false);
        }} className="rounded-xl font-bold">Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-8">
          {isSubmitting ? "Saving..." : (editId ? "Save Changes" : "Register Talent")}
        </Button>
      </div>
    </form>
  );

  return (
    <div className={mode === "hub" ? "space-y-8 mt-10" : "space-y-6"}>
      {mode === "hub" && (
        <>
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
                  onClick={() => { setIsHubOpen(false); router.push('/partner/register-talent'); }}
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
                  onClick={() => { setIsHubOpen(false); router.push('/partner/talent-directory'); }}
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
        </>
      )}

      {mode === "directory" && (
        <Card className="shadow-sm border-border/60 overflow-hidden bg-card rounded-2xl">
          {talents.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground font-medium">
              No talents registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Registration Date</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Name</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Gender</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Registered Mobile Number</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Sport / Activity</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3">Country</TableHead>
                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 px-4 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {talents.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm transition-all group border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold bg-slate-100 dark:bg-slate-800 w-fit px-2.5 py-1.5 rounded-md">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(t.registered_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold text-foreground">
                        {t.full_name}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          t.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                          t.gender === 'Female' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' :
                          'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {t.gender || 'Other'}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {t.mobile_country_code} {t.mobile_number}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                            {t.sport_name}
                          </span>
                          {t.level && (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 uppercase tracking-wider">
                              {t.level}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-slate-500">
                        {countries.find(c => String(c.id) === String(t.country_id))?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setSelectedTalentDetail(t); setIsDetailOpen(true); }} 
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors h-8 w-8 p-0 rounded-full"
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
      )}

      {/* View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 text-white">
            {selectedTalentDetail && (
              <div className="flex flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{selectedTalentDetail.full_name}</h2>
                  <p className="text-emerald-100 font-medium mt-1">Talent Details & Information</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => { setIsDetailOpen(false); handleOpenModal(selectedTalentDetail); }}
                  className="bg-white/10 hover:bg-white/20 text-white border-0 shadow-none shrink-0 rounded-xl"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Detail
                </Button>
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
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      {new Date(selectedTalentDetail.registered_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Full Name</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.full_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Gender</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border w-fit block ${
                      selectedTalentDetail.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                      selectedTalentDetail.gender === 'Female' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800' :
                      'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}>
                      {selectedTalentDetail.gender || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">DOB / Age Category</span>
                    <span className="font-semibold text-foreground text-sm">
                      {new Date(selectedTalentDetail.date_of_birth).toLocaleDateString()} 
                      <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded ml-2 text-xs">
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
                    <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                      {selectedTalentDetail.sport_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Level</span>
                    <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 uppercase tracking-wider">
                      {selectedTalentDetail.level || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Goal</span>
                    <span className="font-semibold text-foreground text-sm">{selectedTalentDetail.goal || "N/A"}</span>
                  </div>
                </div>

                {/* Location Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-widest font-bold mb-1.5">Country</span>
                    <span className="font-semibold text-foreground text-sm">{countries.find(c => String(c.id) === String(selectedTalentDetail.country_id))?.name || "Unknown"}</span>
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

      {mode === "directory" && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl text-emerald-700 dark:text-emerald-500">
                Edit Talent
              </DialogTitle>
              <DialogDescription>
                Update the details for this talent.
              </DialogDescription>
            </DialogHeader>
            {talentForm}
          </DialogContent>
        </Dialog>
      )}

      {mode === "register" && (
        <Card className="shadow-sm border-border/60 bg-card rounded-3xl overflow-hidden mt-2">
          <CardContent className="p-6 sm:p-8">
            {talentForm}
          </CardContent>
        </Card>
      )}
    </div>
  );
}