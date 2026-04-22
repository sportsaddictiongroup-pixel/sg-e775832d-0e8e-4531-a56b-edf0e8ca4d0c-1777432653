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
type TerritoryAssignment = Tables<"territory_assignments">;

type ExtendedTerritoryAssignment = TerritoryAssignment & {
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
  const [upline, setUpline] = useState<Profile | null>(null);
  const [assignment, setAssignment] = useState<ExtendedTerritoryAssignment | null>(null);
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
        }
      }

      const { data: assignments, error: assignmentError } = await supabase
        .from("territory_assignments")
        .select(`
          *,
          countries(name),
          states(name),
          districts(name),
          pincodes(code),
          locations(name)
        `)
        .eq("profile_id", user.id);

      if (!isMounted) {
        return;
      }

      if (!assignmentError && Array.isArray(assignments) && assignments.length > 0) {
        setAssignment(assignments[0] as ExtendedTerritoryAssignment);
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

  const hasAssignment = !!assignment;

  return (
    <>
      <SEO title="Partner Dashboard" description="Partner overview" />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Partner Portal
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">
              Welcome{profile.full_name ? `, ${profile.full_name}` : ""}.
            </h1>
            <p className="text-sm text-muted-foreground">
              View your role, assigned territory, and manage your credentials.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {/* BLOCK 1: BASIC DETAILS */}
            <Card className="border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                <CardTitle className="text-sm font-bold flex items-center text-foreground">
                  <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-md mr-2 text-blue-700 dark:text-blue-400">
                    <User className="h-4 w-4" />
                  </div>
                  Basic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Full Name</p>
                  <p className="font-medium text-foreground">{profile.full_name || "Not available"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Username</p>
                  <p className="font-medium text-foreground">{profile.username || "Not available"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Mobile</p>
                  <p className="font-medium text-foreground">{profile.mobile_number || "Not available"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Role</p>
                  <p className="font-medium text-foreground">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {formatRoleLabel(profile.role)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* BLOCK 2: ADDRESS DETAILS */}
            <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                <CardTitle className="text-sm font-bold flex items-center text-foreground">
                  <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-md mr-2 text-emerald-700 dark:text-emerald-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  Address Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                {hasAssignment ? (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Country</p>
                      <p className="font-medium text-foreground">{assignment?.countries?.name || "Not assigned"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">State</p>
                      <p className="font-medium text-foreground">{assignment?.states?.name || "Not assigned"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">District</p>
                      <p className="font-medium text-foreground">{assignment?.districts?.name || "Not assigned"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">PIN Code</p>
                        <p className="font-medium text-foreground">{assignment?.pincodes?.code || "Not assigned"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Area</p>
                        <p className="font-medium text-foreground truncate" title={assignment?.locations?.name || "Not assigned"}>
                          {assignment?.locations?.name || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mb-2 opacity-20" />
                    <p className="font-medium">No Territory Assigned</p>
                    <p className="text-xs mt-1">Your admin has not assigned a territory.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOCK 3: UPLINE DETAILS */}
            <Card className="border-purple-200/60 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                <CardTitle className="text-sm font-bold flex items-center text-foreground">
                  <div className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-md mr-2 text-purple-700 dark:text-purple-400">
                    <Network className="h-4 w-4" />
                  </div>
                  Upline Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                {upline ? (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Upline Name</p>
                      <p className="font-medium text-foreground">{upline.full_name || upline.username}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Upline Username</p>
                      <p className="font-medium text-foreground">{upline.username}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Upline Role</p>
                      <p className="font-medium text-foreground text-xs opacity-80">{formatRoleLabel(upline.role)}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <Network className="h-8 w-8 mb-2 opacity-20" />
                    <p className="font-medium">No Upline Linked</p>
                    <p className="text-xs mt-1">You are attached directly to root/admin.</p>
                  </div>
                )}
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