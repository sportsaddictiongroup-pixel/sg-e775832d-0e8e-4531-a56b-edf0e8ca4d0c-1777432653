import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Phone, Map as MapIcon, Shield, Save, X, Edit } from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  role: string;
  upline_profile_id: string | null;
  created_at: string;
}

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

export default function PartnerDetailsPage() {
  const router = useRouter();
  const { profileId } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [detailsMissing, setDetailsMissing] = useState(false);

  // View Mode Location Names
  const [locationMaps, setLocationMaps] = useState({
    countries: {} as Record<string, string>,
    states: {} as Record<string, string>,
    districts: {} as Record<string, string>,
    pincodes: {} as Record<string, string>,
    locations: {} as Record<string, string>,
  });

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PartnerDetails>>({});

  // Edit Mode Dropdown Options
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
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (!prof || prof.role !== "admin") {
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

  // 2. Fetch Partner Data
  const fetchData = async () => {
    if (!authChecked || !profileId) return;
    setLoading(true);
    try {
      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, role, upline_profile_id, created_at")
        .eq("id", profileId as string)
        .single();

      if (profErr || !profData || profData.role !== "partner") {
        toast({ title: "Error", description: "Partner not found or invalid role", variant: "destructive" });
        router.push("/admin/partner-directory");
        return;
      }
      setProfile(profData);

      const { data: detailsData, error: detailsErr } = await (supabase as any)
        .from("partner_details")
        .select("profile_id, full_name, mobile_number, whatsapp_number, email, country_id, state_id, district_id, pincode_id, location_id")
        .eq("profile_id", profileId as string)
        .maybeSingle();

      if (detailsErr) throw detailsErr;

      if (!detailsData) {
        setDetailsMissing(true);
      } else {
        console.log("refetched partner_details row:", detailsData);
        setPartnerDetails(detailsData);
        setFormData(detailsData);
        await fetchLocationNames(detailsData);
      }
    } catch (err: any) {
      console.error("Failed to fetch partner data:", err);
      toast({ title: "Error", description: err.message || "Failed to load details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authChecked, profileId]);

  // 3. Fetch location names for View Mode
  const fetchLocationNames = async (details: PartnerDetails) => {
    const maps = { countries: {}, states: {}, districts: {}, pincodes: {}, locations: {} } as any;

    const fetchSingle = async (table: string, id: string, mapObj: any, field = 'name') => {
      if (!id) return;
      const { data } = await (supabase as any).from(table).select(`id, ${field}`).eq('id', id).maybeSingle();
      if (data) mapObj[id] = data[field];
    };

    await Promise.all([
      fetchSingle('countries', details.country_id, maps.countries),
      fetchSingle('states', details.state_id, maps.states),
      fetchSingle('districts', details.district_id, maps.districts),
      fetchSingle('pincodes', details.pincode_id, maps.pincodes, 'code'),
      fetchSingle('locations', details.location_id, maps.locations)
    ]);

    setLocationMaps(maps);
  };

  // 4. Edit Mode Master Data Fetching
  useEffect(() => {
    if (!isEditing) return;
    const fetchCountries = async () => {
      const { data } = await supabase.from("countries").select("id, name").order("name");
      if (data) setCountries(data);
    };
    fetchCountries();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && formData.country_id) {
      supabase.from("states").select("id, name").eq("country_id", formData.country_id).order("name").then(({ data }) => setStates(data || []));
    } else {
      setStates([]);
    }
  }, [isEditing, formData.country_id]);

  useEffect(() => {
    if (isEditing && formData.state_id) {
      supabase.from("districts").select("id, name").eq("state_id", formData.state_id).order("name").then(({ data }) => setDistricts(data || []));
    } else {
      setDistricts([]);
    }
  }, [isEditing, formData.state_id]);

  useEffect(() => {
    if (isEditing && formData.district_id) {
      supabase.from("pincodes").select("id, code").eq("district_id", formData.district_id).order("code").then(({ data }) => setPincodes(data || []));
    } else {
      setPincodes([]);
    }
  }, [isEditing, formData.district_id]);

  useEffect(() => {
    if (isEditing && formData.pincode_id) {
      supabase.from("locations").select("id, name").eq("pincode_id", formData.pincode_id).order("name").then(({ data }) => setLocations(data || []));
    } else {
      setLocations([]);
    }
  }, [isEditing, formData.pincode_id]);

  // Handle Input Changes
  const handleInputChange = (field: keyof PartnerDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (level: string, value: string) => {
    if (level === "country_id") {
      setFormData(prev => ({ ...prev, country_id: value, state_id: "", district_id: "", pincode_id: "", location_id: "" }));
    } else if (level === "state_id") {
      setFormData(prev => ({ ...prev, state_id: value, district_id: "", pincode_id: "", location_id: "" }));
    } else if (level === "district_id") {
      setFormData(prev => ({ ...prev, district_id: value, pincode_id: "", location_id: "" }));
    } else if (level === "pincode_id") {
      setFormData(prev => ({ ...prev, pincode_id: value, location_id: "" }));
    } else if (level === "location_id") {
      setFormData(prev => ({ ...prev, location_id: value }));
    }
  };

  // 5. Save Changes
  const handleSave = async () => {
    if (!profileId || !formData) return;
    setSaving(true);
    try {
      const payload = {
        full_name: formData.full_name || null,
        mobile_number: formData.mobile_number || null,
        whatsapp_number: formData.whatsapp_number || null,
        email: formData.email || null,
        country_id: formData.country_id || null,
        state_id: formData.state_id || null,
        district_id: formData.district_id || null,
        pincode_id: formData.pincode_id || null,
        location_id: formData.location_id || null
      };

      console.log("route profileId:", profileId);
      console.log("update payload:", payload);

      const { data: updatedRow, error } = await (supabase as any)
        .from("partner_details")
        .update(payload)
        .eq("profile_id", profileId)
        .select()
        .single();

      console.log("update result:", updatedRow);
      console.log("update error:", error);

      if (error) {
        // If error is PGRST116, row was not found
        if (error.code === 'PGRST116') {
          toast({ title: "Error", description: "Partner details row not found. Cannot update.", variant: "destructive" });
          return;
        }
        throw error;
      }

      if (!updatedRow) {
        toast({ title: "Error", description: "Partner details row not found. Cannot update.", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Partner details updated successfully." });
      
      // Refresh view
      await fetchData();
      setIsEditing(false);
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Error", description: err.message || "Failed to save details", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderAddressField = (id: string | undefined | null, map: Record<string, string>) => {
    if (!id) return "Not provided";
    return map[id] || "Name not found";
  };

  if (!authChecked) return null;

  return (
    <>
      <Head>
        <title>Partner Details | Admin | SAG Network</title>
      </Head>

      <main className="min-h-screen bg-background text-foreground pb-12">
        <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/admin/partner-directory">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold font-heading flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {isEditing ? "Edit Partner Details" : "Partner Details"}
              </h1>
            </div>
            {!loading && !detailsMissing && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setFormData(partnerDetails || {}); }}>
                      <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : detailsMissing ? (
            <Card className="border-dashed shadow-none bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground">Partner details not found</h3>
                <p className="text-sm text-muted-foreground mt-1">Please contact admin or check the database record.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              
              {/* Basic Details */}
              <Card className="shadow-sm border-muted">
                <div className="p-4 sm:p-6 border-b border-border/50 bg-muted/10">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <User className="h-4 w-4" /> Basic Details
                  </h4>
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Full Name</span>
                      {isEditing ? (
                        <Input value={formData.full_name || ""} onChange={(e) => handleInputChange("full_name", e.target.value)} placeholder="Full Name" />
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{partnerDetails?.full_name || "Not available"}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">User ID / Username</span>
                      <span className="text-sm font-mono text-muted-foreground break-words whitespace-normal bg-muted/30 w-fit px-2 py-1 rounded">{profile?.username || "N/A"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details */}
              <Card className="shadow-sm border-muted">
                <div className="p-4 sm:p-6 border-b border-border/50 bg-muted/10">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Contact Details
                  </h4>
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mobile Number</span>
                      {isEditing ? (
                        <Input value={formData.mobile_number || ""} onChange={(e) => handleInputChange("mobile_number", e.target.value)} placeholder="Mobile Number" />
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{partnerDetails?.mobile_number || "Not available"}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">WhatsApp Number</span>
                      {isEditing ? (
                        <Input value={formData.whatsapp_number || ""} onChange={(e) => handleInputChange("whatsapp_number", e.target.value)} placeholder="WhatsApp Number" />
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{partnerDetails?.whatsapp_number || "Not available"}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email Address</span>
                      {isEditing ? (
                        <Input type="email" value={formData.email || ""} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="Email Address" />
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{partnerDetails?.email || "Not available"}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Details */}
              <Card className="shadow-sm border-muted">
                <div className="p-4 sm:p-6 border-b border-border/50 bg-muted/10">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <MapIcon className="h-4 w-4" /> Address Details
                  </h4>
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Country</span>
                      {isEditing ? (
                        <Select value={formData.country_id || ""} onValueChange={(v) => handleLocationChange("country_id", v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select Country" /></SelectTrigger>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{renderAddressField(partnerDetails?.country_id, locationMaps.countries)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">State</span>
                      {isEditing ? (
                        <Select disabled={!formData.country_id} value={formData.state_id || ""} onValueChange={(v) => handleLocationChange("state_id", v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select State" /></SelectTrigger>
                          <SelectContent>
                            {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{renderAddressField(partnerDetails?.state_id, locationMaps.states)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">District</span>
                      {isEditing ? (
                        <Select disabled={!formData.state_id} value={formData.district_id || ""} onValueChange={(v) => handleLocationChange("district_id", v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select District" /></SelectTrigger>
                          <SelectContent>
                            {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{renderAddressField(partnerDetails?.district_id, locationMaps.districts)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">PIN Code</span>
                      {isEditing ? (
                        <Select disabled={!formData.district_id} value={formData.pincode_id || ""} onValueChange={(v) => handleLocationChange("pincode_id", v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select PIN Code" /></SelectTrigger>
                          <SelectContent>
                            {pincodes.map(p => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{renderAddressField(partnerDetails?.pincode_id, locationMaps.pincodes)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Location / Area</span>
                      {isEditing ? (
                        <Select disabled={!formData.pincode_id} value={formData.location_id || ""} onValueChange={(v) => handleLocationChange("location_id", v)}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="Select Location" /></SelectTrigger>
                          <SelectContent>
                            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-medium text-foreground break-words whitespace-normal">{renderAddressField(partnerDetails?.location_id, locationMaps.locations)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Details (Read Only) */}
              {!isEditing && (
                <div className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl border border-border/50">
                  <Shield className="h-3 w-3 inline-block mr-1 mb-0.5" />
                  Account created on {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}