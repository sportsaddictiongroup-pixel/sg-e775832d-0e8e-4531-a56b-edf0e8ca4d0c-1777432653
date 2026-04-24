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
import { User, MapPin, Network, Key } from "lucide-react";

type Profile = Tables<"profiles">;
type PartnerDetails = {
  full_name: string | null;
  mobile_number: string | null;
  countries?: { name: string } | null;
  states?: { name: string } | null;
  districts?: { name: string } | null;
  pincodes?: { code: string } | null;
  locations?: { name: string } | null;
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
        setPartnerDetails(pdData as PartnerDetails);
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
        .order("id", { ascending: false })
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

  if (loading) {
    return (
      <>
        <SEO title="Partner Dashboard" description="Partner overview" />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm text-muted-foreground">
            Loading your dashboard...
          </p>
        </main>
      </>
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
  let derivedRole = "No Role Defined";
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

  return (
    <>
      <SEO title="Partner Dashboard" description="Partner overview" />
      <main className="min-h-screen bg-background text-foreground px-4 py-8 md:py-12">
        <div className="mx-auto w-full max-w-5xl space-y-8 md:space-y-10">
          
          {/* WELCOME AREA (NOW A UNIFIED HEADER BLOCK) */}
          <header className="relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm p-6 md:p-8 lg:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Partner Portal
              </p>
              <div className="space-y-1">
                <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  Welcome
                </h1>
                <h2 className="font-heading text-2xl md:text-3xl font-medium text-blue-600 dark:text-blue-400">
                  {partnerDetails?.full_name || profile.full_name || profile.username}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground pt-1 max-w-xl">
                View your role, assigned territory, and manage your credentials.
              </p>
            </div>

            {/* PREMIUM ROLE BADGE */}
            <div className="relative z-10 shrink-0 mt-2 md:mt-0">
              <div className="inline-flex items-center px-5 py-3 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-950/40 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500 mr-3 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse" />
                <span className="text-sm font-extrabold text-orange-700 dark:text-orange-400 uppercase tracking-widest">
                  {derivedRole}
                </span>
              </div>
            </div>
          </header>

          <section>
            <Card className="w-full border-orange-300/80 dark:border-orange-800/80 bg-gradient-to-br from-orange-50/40 to-white dark:from-orange-950/20 dark:to-background shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-orange-600" />
              
              <CardHeader className="pb-4 pt-6 md:pt-8 border-b border-border/40 bg-background/50 backdrop-blur-sm px-6 md:px-10">
                <CardTitle className="text-sm md:text-base font-bold flex items-center text-foreground tracking-widest uppercase">
                  <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-lg mr-3 text-orange-700 dark:text-orange-400 shadow-sm">
                    <User className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  SAG NETWORK IDENTITY
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  {/* Personal Info */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Full Name
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {partnerDetails?.full_name || "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        User ID / Username
                      </p>
                      <p className="text-base font-mono font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-md inline-block border border-orange-100 dark:border-orange-900/30">
                        {profile.username || "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Registered Mobile Number
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {partnerDetails?.mobile_number || "Not available"}
                      </p>
                    </div>
                  </div>

                  {/* Upline Info */}
                  <div className="space-y-6 md:border-l-2 md:border-orange-100 dark:md:border-orange-900/30 md:pl-12">
                    {upline ? (
                      <>
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Network className="h-3.5 w-3.5" /> Upline Full Name
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            {uplineFullName || upline.full_name || upline.username}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Upline User ID
                          </p>
                          <p className="text-base font-mono font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 rounded-md inline-block border border-orange-100 dark:border-orange-900/30">
                            {upline.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-start justify-center h-full text-muted-foreground bg-muted/30 p-6 rounded-2xl border border-muted/50">
                        <Network className="h-8 w-8 mb-4 opacity-30" />
                        <p className="text-base font-bold text-foreground">No upline linked</p>
                        <p className="text-xs mt-1.5 leading-relaxed max-w-[200px]">You are attached directly to root/admin.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
            <Card className="shadow-sm border-border/60 bg-card/50 hover:bg-card hover:shadow-md transition-all">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <div className="bg-muted p-1.5 rounded-md mr-3">
                    <Key className="h-4 w-4 text-foreground" />
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

            <Card className="shadow-sm border-border/60 bg-card/50 hover:bg-card hover:shadow-md transition-all flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Need Help?</CardTitle>
                <CardDescription className="pt-1">
                  Contact your admin if your role or territory looks incorrect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm flex-1 flex flex-col">
                <p className="text-muted-foreground leading-relaxed">
                  If you see an unexpected role or no territory assignment here,
                  please reach out to your admin so they can review your
                  profile.
                </p>
                <div className="bg-muted/40 p-4 rounded-xl border border-muted/50 mt-auto">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Note:</strong> You can also sign out and sign back in if you recently changed
                    your credentials or if your assignment was just updated.
                  </p>
                </div>
                <Button variant="outline" asChild className="w-full sm:w-auto mt-4">
                  <Link href="/partner/login">Back to Login</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}