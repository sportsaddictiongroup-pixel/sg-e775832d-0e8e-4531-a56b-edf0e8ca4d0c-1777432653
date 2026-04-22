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
type PartnerDetails = Tables<"partner_details"> & {
  countries?: { name: string } | null;
  states?: { name: string } | null;
  districts?: { name: string } | null;
  pincodes?: { code: string } | null;
  locations?: { name: string } | null;
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

      // Fetch partner residential details (address, name, mobile)
      const { data: pdData, error: pdError } = await supabase
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
          const { data: uplinePd } = await supabase
            .from("partner_details")
            .select("full_name")
            .eq("profile_id", typedProfile.upline_profile_id)
            .maybeSingle();
            
          if (isMounted && uplinePd) {
            setUplineFullName(uplinePd.full_name);
          }
        }
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

  const hasAddress = !!partnerDetails && (
    !!partnerDetails.countries?.name || 
    !!partnerDetails.states?.name || 
    !!partnerDetails.districts?.name || 
    !!partnerDetails.pincodes?.code || 
    !!partnerDetails.locations?.name
  );

  return (
    <>
      <SEO title="Partner Dashboard" description="Partner overview" />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Partner Portal
            </p>
            <div className="space-y-1">
              <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                Welcome
              </h1>
              <h2 className="font-heading text-2xl md:text-3xl font-normal text-blue-600 dark:text-blue-400">
                {partnerDetails?.full_name || profile.full_name || profile.username}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              View your role, assigned territory, and manage your credentials.
            </p>
          </header>

          <section>
            <Card className="max-w-2xl border-orange-300 dark:border-orange-800 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-background shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-400 to-orange-600" />
              
              <CardHeader className="pb-3 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                <CardTitle className="text-sm font-bold flex items-center text-foreground tracking-widest uppercase">
                  <div className="bg-orange-100 dark:bg-orange-900/50 p-1.5 rounded-md mr-3 text-orange-700 dark:text-orange-400">
                    <User className="h-4 w-4" />
                  </div>
                  SAG NETWORK IDENTITY
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                        Full Name
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {partnerDetails?.full_name || "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                        User ID / Username
                      </p>
                      <p className="text-sm font-mono font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded inline-block">
                        {profile.username || "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                        Registered Mobile Number
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {partnerDetails?.mobile_number || "Not available"}
                      </p>
                    </div>
                  </div>

                  {/* Upline Info */}
                  <div className="space-y-4 sm:border-l sm:border-border/50 sm:pl-6">
                    {upline ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <Network className="h-3 w-3" /> Upline Full Name
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {uplineFullName || upline.full_name || upline.username}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                            Upline User ID
                          </p>
                          <p className="text-sm font-mono font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded inline-block">
                            {upline.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-start justify-center h-full text-muted-foreground bg-muted/10 p-4 rounded-xl border border-muted/50">
                        <Network className="h-5 w-5 mb-2 opacity-40" />
                        <p className="text-sm font-semibold text-foreground">No upline linked</p>
                        <p className="text-[10px] mt-1">You are attached directly to root/admin.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordError && (
                  <p className="mb-3 text-sm text-destructive" role="alert">
                    {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p className="mb-3 text-sm text-emerald-600" role="status">
                    {passwordSuccess}
                  </p>
                )}
                <form
                  className="space-y-4"
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
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Contact your admin if your role or territory looks incorrect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  If you see an unexpected role or no territory assignment here,
                  please reach out to your admin so they can review your
                  profile.
                </p>
                <p className="text-xs text-muted-foreground">
                  You can also sign out and sign back in if you recently changed
                  your credentials.
                </p>
                <Button variant="outline" asChild className="mt-2">
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