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

type Profile = Tables<"profiles">;
type TerritoryAssignment = Tables<"territory_assignments">;

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
  const [assignment, setAssignment] = useState<TerritoryAssignment | null>(null);
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

      const { data: assignments, error: assignmentError } = await supabase
        .from("territory_assignments")
        .select("*")
        .eq("profile_id", user.id);

      if (!isMounted) {
        return;
      }

      if (!assignmentError && Array.isArray(assignments) && assignments.length > 0) {
        setAssignment(assignments[0] as TerritoryAssignment);
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
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">
              Welcome{profile.full_name ? `, ${profile.full_name}` : ""}.
            </h1>
            <p className="text-sm text-muted-foreground">
              View your role, assigned territory, and manage your credentials.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
                <CardDescription>
                  Basic details about your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">
                    {profile.full_name || profile.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium">{profile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mobile</span>
                  <span className="font-medium">{profile.mobile_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">
                    {formatRoleLabel(profile.role)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Upline</span>
                  <span className="font-medium">
                    {profile.upline_profile_id
                      ? "Configured"
                      : "Admin (default)"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Territory Summary</CardTitle>
                <CardDescription>
                  High-level view of your current assignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {hasAssignment ? "Assigned" : "Not assigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-medium">
                    {assignment
                      ? formatRoleLabel(assignment.role)
                      : formatRoleLabel(profile.role)}
                  </span>
                </div>
                {!hasAssignment && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Your admin will assign a specific territory to this account.
                  </p>
                )}
                {hasAssignment && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Detailed territory drilldown will appear here as the system
                    evolves.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
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