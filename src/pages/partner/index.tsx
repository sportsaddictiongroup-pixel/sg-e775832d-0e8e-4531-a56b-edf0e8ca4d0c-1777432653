import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { User, MapPin, Network, Key, LogOut, ChevronRight, Printer } from "lucide-react";

type Profile = Tables<"profiles">;
type PartnerDetails = {
  full_name: string | null;
  mobile_number: string | null;
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
  _countryName?: string | null;
};

type TerritoryAssignment = Tables<"territory_assignments">;
type ExtendedAssignment = TerritoryAssignment & {
  states?: { name: string } | { name: string }[] | null;
  districts?: { name: string } | { name: string }[] | null;
  pincodes?: { code: string } | { code: string }[] | null;
  locations?: { name: string } | { name: string }[] | null;
};

const formatRoleLabel = (role: string | null | undefined) => {
  if (!role) {
    return "Not set";
  }

  switch (role) {
    case "investor":
      return "Investor";
    case "state_head":
      return "State Head";
    case "district_head":
      return "District Head";
    case "pincode_head":
      return "PIN Code Head";
    case "pincode_partner":
      return "PIN Code Partner";
    case "admin":
      return "Admin";
    default:
      return role;
  }
};

export default function PartnerDashboard(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [upline, setUpline] = useState<Profile | null>(null);
  const [uplineFullName, setUplineFullName] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<ExtendedAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [timeData, setTimeData] = useState({ display: "", suffix: "" });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: 24 April 2026 | 10:45 PM
      const day = now.getDate();
      const month = now.toLocaleDateString('en-US', { month: 'long' });
      const year = now.getFullYear();
      const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const display = `${day} ${month} ${year} | ${time}`;

      // Format: YYYYMMDD-HHMM
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

      if (!isMounted) {
        return;
      }

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

      // Fetch upline details if exists
      if (typedProfile.upline_profile_id) {
        const { data: uplineData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", typedProfile.upline_profile_id)
          .maybeSingle();
        
        if (isMounted && uplineData) {
          setUpline(uplineData as Profile);
          
          // Also fetch upline's full name from partner_details
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

      // Fetch partner residential details (address, name, mobile)
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

      if (!isMounted) {
        return;
      }

      if (!pdError && pdData) {
        const resolvedPd = { ...pdData } as any;
        const checkJoined = (data: any, key: 'name' | 'code' = 'name') => {
          if (!data) return null;
          if (Array.isArray(data)) return data[0]?.[key] || null;
          return data[key] || null;
        };

        // SECONDARY FALLBACK QUERIES for other location levels
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

      // Fetch the active territory assignment to derive the operational role badge
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

      console.log("Partner assignmentData", assignmentData);
        
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

        // SECONDARY FALLBACK QUERIES: Manually fetch name if relational join returned null
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

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password and confirm password must match.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await authService.changePassword(newPassword);
      if (error) {
        setPasswordError(error.message);
        return;
      }

      setPasswordSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError(
        "Unable to change password right now. Please try again.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      router.replace("/partner/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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
        <SEO title="Partner Dashboard" description="Partner overview" />
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

  // Derive the operational role from the active territory assignment
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
      <SEO title="Partner Dashboard" description="Partner overview" />
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
      <main className="min-h-screen bg-background text-foreground px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-5xl space-y-8 md:space-y-10">
          
          {/* WELCOME AREA & TOP ACTIONS */}
          <header className="relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm p-6 md:p-8 lg:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Partner Portal
              </p>
              <div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  Welcome
                </h1>
                <h2 className="font-heading text-xl md:text-2xl font-medium text-blue-600 dark:text-blue-400 mt-1.5">
                  {partnerDetails?.full_name || profile.full_name || profile.username}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground pt-2 max-w-xl">
                View your role, assigned territory, and manage your credentials.
              </p>
            </div>

            {/* PREMIUM TOP-RIGHT ACTIONS */}
            <div className="relative z-10 md:ml-auto flex items-center flex-wrap gap-3 mt-2 md:mt-0">
              <Button 
                variant="outline"
                className="bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20 dark:hover:bg-red-900/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 font-semibold shadow-sm transition-all"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          <section id="printable-identity-card-wrapper" className="w-full flex justify-center">
            <Card id="printable-identity-card" className="w-full max-w-4xl border-2 border-orange-300/80 dark:border-orange-800/80 bg-white dark:bg-card shadow-lg relative overflow-hidden print-text-black mx-auto">
              {/* Security Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none px-4">
                <span className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-widest text-slate-900/[0.05] dark:text-white/[0.04] print-watermark -rotate-12 whitespace-nowrap">
                  SPORTS ADDICTION GROUP
                </span>
              </div>

              <CardHeader className="pb-3 pt-4 md:pt-5 border-b border-border/40 print-border-gray relative z-10 flex flex-col items-center justify-center gap-2 md:gap-3">
                <div className="w-full text-center">
                  <CardTitle className="text-base md:text-lg lg:text-xl font-black text-orange-600 dark:text-orange-500 tracking-widest uppercase w-full justify-center flex text-center">
                    SAG NETWORK MEMBERSHIP CARD
                  </CardTitle>
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
                {/* 2-Column Identity Grid */}
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
                    <p className="text-[10px] md:text-xs font-bold text-muted-foreground print-text-gray uppercase tracking-wider">Registered Mobile Number</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground print-text-black">
                      {partnerDetails?.mobile_number || "N/A"}
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

                {/* Location Details Section */}
                <div className="pt-3 md:pt-4 border-t border-border/40 print-border-gray">
                  <p className="text-[10px] md:text-xs font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-3 print-text-black">
                    Registered Location Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 md:gap-y-4">
                    {/* LEFT COLUMN */}
                    <div className="space-y-3 md:space-y-4">
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
                    
                    {/* RIGHT COLUMN */}
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

                {/* Verification ID */}
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

          {/* MY NETWORK TREE ENTRY BANNER */}
          <section>
            <Card className="w-full border-blue-300/80 dark:border-blue-800/80 bg-gradient-to-br from-blue-50/40 to-white dark:from-blue-950/20 dark:to-background shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-blue-600" />
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                    <Network className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">My Network Tree</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Explore your personal downline, view partner levels, and track your organizational hierarchy.
                    </p>
                  </div>
                </div>
                <Button asChild className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold h-11 px-8 rounded-xl shrink-0">
                  <Link href="/partner/network-tree">
                    View My Network
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
            <Card className="shadow-sm border-border/60 border-l-4 border-l-orange-500 bg-orange-50/10 dark:bg-orange-950/10 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-bold text-orange-700 dark:text-orange-400">
                  <div className="bg-orange-100 dark:bg-orange-900/50 p-1.5 rounded-md mr-3 shadow-sm">
                    <Key className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                  </div>
                  Change Password
                </CardTitle>
                <CardDescription className="pt-1">
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordError && (
                  <p className="mb-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md font-medium" role="alert">
                    {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p className="mb-4 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md font-medium border border-emerald-200 dark:border-emerald-900/50" role="status">
                    {passwordSuccess}
                  </p>
                )}
                <form
                  className="space-y-5"
                  onSubmit={handleChangePassword}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      placeholder="Enter a strong password"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Re-enter the new password"
                      className="bg-background"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-orange-200/60 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-950/10 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-300 dark:bg-orange-700/50" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-orange-800 dark:text-orange-400">
                  Need Help?
                </CardTitle>
                <CardDescription className="pt-1 text-orange-700/80 dark:text-orange-400/70 text-[13px]">
                  Contact your admin if your role or territory looks incorrect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-[13px] flex-1 flex flex-col text-orange-900/80 dark:text-orange-200/70">
                <p className="leading-relaxed">
                  If you see an unexpected role or no territory assignment here,
                  please reach out to your admin so they can review your
                  profile.
                </p>
                <div className="bg-orange-100/50 dark:bg-orange-900/20 p-3.5 rounded-lg border border-orange-200/50 dark:border-orange-800/30 mt-auto">
                  <p className="text-[12px] leading-relaxed">
                    <strong className="text-orange-800 dark:text-orange-400">Note:</strong> You can also sign out and sign back in if you recently changed
                    your credentials or if your assignment was just updated.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}