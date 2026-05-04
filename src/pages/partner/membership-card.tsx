import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Printer, ArrowLeft } from "lucide-react";

type Profile = Tables<"profiles">;
type PartnerDetails = {
  full_name: string | null;
  mobile_number: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  country_id?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  pincode_id?: string | null;
  location_id?: string | null;
  countries?: { name: string } | { name: string }[] | null;
  states?: { name: string } | { name: string }[] | null;
  districts?: { name: string } | { name: string }[] | null;
  pincodes?: { code: string } | { code: string }[] | null;
  locations?: { name: string } | { name: string }[] | null;
};

type TerritoryAssignment = Tables<"territory_assignments">;
type ExtendedAssignment = TerritoryAssignment & {
  states?: { name: string } | { name: string }[] | null;
  districts?: { name: string } | { name: string }[] | null;
  pincodes?: { code: string } | { code: string }[] | null;
  locations?: { name: string } | { name: string }[] | null;
};

export default function MembershipCardPage(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [upline, setUpline] = useState<Profile | null>(null);
  const [uplineFullName, setUplineFullName] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<ExtendedAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeData, setTimeData] = useState({ display: "", suffix: "" });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const year = now.getFullYear();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const display = `${day} ${month} ${year} | ${time}`;

      const yyyy = year;
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const suffix = `${yyyy}${mm}${dd}-${hh}${min}`;

      setTimeData({ display, suffix });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const user = await authService.getCurrentUser();

      if (!user) {
        router.replace("/partner/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        setLoadError("Unable to load your profile. Please try again.");
        setLoading(false);
        return;
      }

      const typedProfile = data as Profile;

      if (typedProfile.role === "admin") {
        router.replace("/admin");
        return;
      }

      setProfile(typedProfile);

      if (typedProfile.upline_profile_id) {
        const { data: uplineData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", typedProfile.upline_profile_id)
          .maybeSingle();
        
        if (isMounted && uplineData) {
          setUpline(uplineData as Profile);
          
          const { data: uplinePd } = await (supabase as any)
            .from("partner_details")
            .select("full_name")
            .eq("profile_id", typedProfile.upline_profile_id)
            .maybeSingle();
            
          if (isMounted && uplinePd) {
            setUplineFullName(uplinePd?.full_name || null);
          }
        }
      }

      const { data: pdData, error: pdError } = await (supabase as any)
        .from("partner_details")
        .select(`
          *,
          countries(name),
          states(name),
          districts(name),
          pincodes(code),
          locations(name)
        `)
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (!pdError && pdData) {
        const resolvedPd = { ...pdData } as any;
        const checkJoined = (data: any, key: 'name' | 'code' = 'name') => {
          if (!data) return null;
          if (Array.isArray(data)) return data[0]?.[key] || null;
          return data[key] || null;
        };

        if (resolvedPd.country_id && !checkJoined(resolvedPd.countries, 'name')) {
          const { data: cData } = await supabase.from('countries').select('name').eq('id', resolvedPd.country_id).maybeSingle();
          if (cData) resolvedPd.countries = { name: cData.name };
        }
        if (resolvedPd.state_id && !checkJoined(resolvedPd.states, 'name')) {
          const { data: sData } = await supabase.from('states').select('name').eq('id', resolvedPd.state_id).maybeSingle();
          if (sData) resolvedPd.states = { name: sData.name };
        }
        if (resolvedPd.district_id && !checkJoined(resolvedPd.districts, 'name')) {
          const { data: dData } = await supabase.from('districts').select('name').eq('id', resolvedPd.district_id).maybeSingle();
          if (dData) resolvedPd.districts = { name: dData.name };
        }
        if (resolvedPd.pincode_id && !checkJoined(resolvedPd.pincodes, 'code')) {
          const { data: pData } = await supabase.from('pincodes').select('code').eq('id', resolvedPd.pincode_id).maybeSingle();
          if (pData) resolvedPd.pincodes = { code: pData.code };
        }
        if (resolvedPd.location_id && !checkJoined(resolvedPd.locations, 'name')) {
          const { data: lData } = await supabase.from('locations').select('name').eq('id', resolvedPd.location_id).maybeSingle();
          if (lData) resolvedPd.locations = { name: lData.name };
        }

        setPartnerDetails(resolvedPd as PartnerDetails);
      }

      const { data: assignmentData, error: assignmentError } = await (supabase as any)
        .from("territory_assignments")
        .select(`
          id,
          profile_id,
          country_id,
          state_id,
          district_id,
          pincode_id,
          location_id,
          states(name),
          districts(name),
          pincodes(code),
          locations(name)
        `)
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (assignmentError) {
        console.error("Error fetching territory assignment:", assignmentError);
      }
        
      const resolvedAssignment = assignmentData ? { ...assignmentData } : null;

      if (isMounted && resolvedAssignment) {
        const checkJoined = (data: any, key: 'name' | 'code' = 'name') => {
          if (!data) return null;
          if (Array.isArray(data)) return data[0]?.[key] || null;
          return data[key] || null;
        };

        if (resolvedAssignment.location_id && !checkJoined(resolvedAssignment.locations, 'name')) {
          const { data: loc } = await supabase.from('locations').select('name').eq('id', resolvedAssignment.location_id).maybeSingle();
          if (loc) resolvedAssignment.locations = { name: loc.name };
        }
        if (resolvedAssignment.pincode_id && !checkJoined(resolvedAssignment.pincodes, 'code')) {
          const { data: pin } = await supabase.from('pincodes').select('code').eq('id', resolvedAssignment.pincode_id).maybeSingle();
          if (pin) resolvedAssignment.pincodes = { code: pin.code };
        }
        if (resolvedAssignment.district_id && !checkJoined(resolvedAssignment.districts, 'name')) {
          const { data: dist } = await supabase.from('districts').select('name').eq('id', resolvedAssignment.district_id).maybeSingle();
          if (dist) resolvedAssignment.districts = { name: dist.name };
        }
        if (resolvedAssignment.state_id && !checkJoined(resolvedAssignment.states, 'name')) {
          const { data: st } = await supabase.from('states').select('name').eq('id', resolvedAssignment.state_id).maybeSingle();
          if (st) resolvedAssignment.states = { name: st.name };
        }

        setActiveAssignment(resolvedAssignment as ExtendedAssignment);
      }

      setLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <>
        <SEO title="Membership Card" description="SAG Network Membership Card" />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
          <p className="text-sm text-destructive" role="alert">
            {loadError ?? "Unable to load your profile."}
          </p>
        </main>
      </>
    );
  }

  const getJoinedValue = (data: any, key: 'name' | 'code' = 'name') => {
    if (!data) return null;
    if (Array.isArray(data)) return data[0]?.[key] || null;
    return data[key] || null;
  };

  let derivedRole = "Network Partner";
  if (activeAssignment) {
    if (activeAssignment.location_id) {
      const val = getJoinedValue(activeAssignment.locations);
      derivedRole = val ? `Area / Location Head: ${val}` : "Area / Location Head";
    } else if (activeAssignment.pincode_id) {
      const val = getJoinedValue(activeAssignment.pincodes, 'code');
      derivedRole = val ? `PIN Code Head: ${val}` : "PIN Code Head";
    } else if (activeAssignment.district_id) {
      const val = getJoinedValue(activeAssignment.districts);
      derivedRole = val ? `District Head: ${val}` : "District Head";
    } else if (activeAssignment.state_id) {
      const val = getJoinedValue(activeAssignment.states);
      derivedRole = val ? `State Head: ${val}` : "State Head";
    }
  }

  const userIdToUse = profile?.username || "UNKNOWN";
  const verificationId = `SAG-${userIdToUse}-${timeData.suffix}`;

  return (
    <>
      <SEO title="Membership Card" description="SAG Network Membership Card" />
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 15mm;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          #printable-identity-card-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            visibility: visible !important;
          }
          #printable-identity-card, #printable-identity-card * {
            visibility: visible;
          }
          #printable-identity-card {
            width: 100% !important;
            max-width: 850px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 2px solid #ea580c !important;
            border-radius: 12px !important;
            background: white !important;
            color: black !important;
            page-break-inside: avoid;
          }
          .print-hidden {
            display: none !important;
          }
          .print-text-black { color: #000000 !important; }
          .print-text-gray { color: #6b7280 !important; }
          .print-border-gray { border-color: #e5e7eb !important; }
          .print-watermark { opacity: 0.06 !important; color: #000000 !important; }
        }
      `}} />
      <main className="min-h-screen bg-background text-foreground px-4 pt-6 pb-12">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          
          <div className="print-hidden flex items-center justify-between">
            <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-orange-600 dark:hover:text-orange-500">
              <Link href="/partner" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <section id="printable-identity-card-wrapper" className="w-full flex justify-center">
            <Card id="printable-identity-card" className="w-full border-2 border-orange-300/80 dark:border-orange-800/80 bg-white dark:bg-card shadow-lg relative overflow-hidden print-text-black mx-auto">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none px-4">
                <span className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-widest text-slate-900/[0.05] dark:text-white/[0.04] print-watermark -rotate-12 whitespace-nowrap">
                  SPORTS ADDICTION GROUP
                </span>
              </div>

              <CardHeader className="pb-3 pt-4 md:pt-5 border-b border-border/40 print-border-gray relative z-10 flex flex-col items-center justify-center gap-2 md:gap-3">
                <div className="w-full relative flex flex-col sm:flex-row items-center justify-center">
                  <CardTitle className="text-base md:text-lg lg:text-xl font-black text-orange-600 dark:text-orange-500 tracking-widest uppercase text-center z-10">
                    SAG NETWORK MEMBERSHIP CARD
                  </CardTitle>
                  <div className="sm:absolute sm:right-0 mt-2 sm:mt-0 flex flex-col items-center sm:items-end z-10">
                    <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground print-text-gray uppercase tracking-widest leading-tight">Date of Joining</span>
                    <span className="text-[11px] md:text-xs font-extrabold text-foreground print-text-black leading-tight">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 sm:gap-0">
                  <p className="text-[10px] md:text-xs font-mono font-bold text-muted-foreground print-text-gray uppercase tracking-wider text-center sm:text-left">
                    Generated On: {timeData.display || "Loading..."}
                  </p>
                  <Button 
                    onClick={() => window.print()}
                    variant="outline" 
                    size="sm" 
                    className="h-8 print-hidden bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 font-semibold shadow-sm w-full sm:w-auto"
                  >
                    <Printer className="h-3.5 w-3.5 mr-2" />
                    Print Identity
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 md:p-6 relative z-10 space-y-4 md:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Full Name</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {partnerDetails?.full_name || profile.full_name || profile.username}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">User ID</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black font-mono">
                      {profile.username}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Mobile Number</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {partnerDetails?.mobile_number || "N/A"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">WhatsApp Number</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {partnerDetails?.whatsapp_number || "N/A"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Email Address</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {partnerDetails?.email || "N/A"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Your Designation In SAG</p>
                    <p className="text-sm sm:text-base font-extrabold text-orange-700 dark:text-orange-400 print-text-black">
                      {derivedRole}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Upline Full Name</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {uplineFullName || (profile.upline_profile_id ? "Loading..." : "SAG Root")}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Upline User ID</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black font-mono">
                      {upline?.username || (profile.upline_profile_id ? "..." : "SAG-ADMIN")}
                    </p>
                  </div>
                </div>

                <div className="pt-3 md:pt-4 border-t border-border/40 print-border-gray">
                  <p className="text-[10px] md:text-xs font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-3 print-text-black">
                    Registered Location Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-4">
                    <div className="space-y-3 md:space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Country</p>
                        <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                          {getJoinedValue(partnerDetails?.countries) || "Not Assigned"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">State</p>
                        <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                          {getJoinedValue(partnerDetails?.states) || "Not Assigned"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Location / Area</p>
                        <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                          {getJoinedValue(partnerDetails?.locations) || "Not Assigned"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">District</p>
                        <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                          {getJoinedValue(partnerDetails?.districts) || "Not Assigned"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">PIN Code</p>
                        <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black font-mono">
                          {getJoinedValue(partnerDetails?.pincodes, 'code') || "Not Assigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 md:pt-4 border-t border-border/40 print-border-gray flex flex-col gap-1.5">
                  <p className="text-[10px] md:text-xs font-mono font-bold text-slate-700 dark:text-slate-300 print-text-black">
                    Verification ID: {verificationId}
                  </p>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground print-text-gray italic leading-relaxed">
                    <p>This SAG Network Membership Card is system-generated. Valid as per generated date and time shown above.</p>
                    <p>For official verification, match details with SAG Network records.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}