import { useEffect, useState } from "react";
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
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const user = await authService.getCurrentUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError || !data) {
        setError("Unable to load your profile. Please try again.");
        setLoading(false);
        return;
      }

      const typedProfile = data as Profile;

      if (typedProfile.role !== "admin") {
        await authService.signOut();
        router.replace("/partner/login");
        return;
      }

      setProfile(typedProfile);
      setLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <SEO title="Admin Dashboard" description="Admin overview" />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEO title="Admin Dashboard" description="Admin overview" />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO title="Admin Dashboard" description="Admin overview" />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Admin Portal
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage locations, partners, and territory assignments from a
              single, consistent console.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Create Partner</CardTitle>
                <CardDescription>
                  Onboard a new partner and assign their role, upline, and
                  territory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/partners/create">
                  <Button className="w-full">Go to Create Partner</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Management</CardTitle>
                <CardDescription>
                  Maintain the country, state, district, PIN, and location
                  hierarchy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/locations">
                  <Button variant="outline" className="w-full">
                    Manage Locations
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Territory Management</CardTitle>
                <CardDescription>
                  See which positions are assigned or vacant across the
                  hierarchy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/territory-management">
                  <Button variant="outline" className="w-full">
                    Open Territory Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}