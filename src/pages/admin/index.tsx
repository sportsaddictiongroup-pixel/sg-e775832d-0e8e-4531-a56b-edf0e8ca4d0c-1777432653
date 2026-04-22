import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { UserPlus, MapPin, Map as MapIcon, Network, ArrowRight, LayoutDashboard, LogOut } from "lucide-react";

type Profile = Tables<"profiles">;

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

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
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEO title="Admin Dashboard" description="Admin overview" />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
          <p className="text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-md" role="alert">
            {error}
          </p>
        </main>
      </>
    );
  }

  const features = [
    {
      title: "Create Partner",
      description: "Onboard a new partner and securely assign their role, upline, and territory.",
      href: "/admin/partners/create",
      icon: UserPlus,
      cardWrapper: "border-blue-300/70 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 hover:shadow-xl hover:shadow-blue-500/10",
      iconWrapper: "bg-blue-600 dark:bg-blue-500 text-white shadow-sm shadow-blue-600/20",
      buttonClass: "bg-blue-100 hover:bg-blue-600 text-blue-800 hover:text-white border-transparent dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white",
      buttonText: "Create Partner",
    },
    {
      title: "Location Management",
      description: "Maintain the hierarchical master data for countries, states, districts, and PINs.",
      href: "/admin/locations",
      icon: MapPin,
      cardWrapper: "border-emerald-300/70 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 hover:shadow-xl hover:shadow-emerald-500/10",
      iconWrapper: "bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20",
      buttonClass: "bg-emerald-100 hover:bg-emerald-600 text-emerald-800 hover:text-white border-transparent dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white",
      buttonText: "Manage Locations",
    },
    {
      title: "Territory Management",
      description: "Monitor assignment statuses, view vacancies, and manage partner positioning.",
      href: "/admin/territory-management",
      icon: MapIcon,
      cardWrapper: "border-purple-300/70 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-500 bg-purple-50/40 hover:bg-purple-50/80 dark:bg-purple-950/20 dark:hover:bg-purple-900/30 hover:shadow-xl hover:shadow-purple-500/10",
      iconWrapper: "bg-purple-600 dark:bg-purple-500 text-white shadow-sm shadow-purple-600/20",
      buttonClass: "bg-purple-100 hover:bg-purple-600 text-purple-800 hover:text-white border-transparent dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-600 dark:hover:text-white",
      buttonText: "Manage Territories",
    },
    {
      title: "Network Tree",
      description: "Navigate the 5-level MLM generation hierarchy and explore scalable downlines.",
      href: "/admin/network-tree",
      icon: Network,
      cardWrapper: "border-amber-300/70 dark:border-amber-800 hover:border-amber-500 dark:hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 hover:shadow-xl hover:shadow-amber-500/10",
      iconWrapper: "bg-amber-500 dark:bg-amber-600 text-white shadow-sm shadow-amber-500/20",
      buttonClass: "bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border-transparent dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white",
      buttonText: "Explore Network",
    },
  ];

  return (
    <>
      <SEO title="Admin Dashboard" description="Admin overview" />
      <main className="min-h-screen bg-background text-foreground px-4 py-8 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          {/* HEADER SECTION */}
          <header className="relative overflow-hidden rounded-2xl bg-muted/30 border border-muted p-8 md:p-10">
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin Portal
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Centralized command center for managing master locations, tracking territory assignments, monitoring the partner network, and securely onboarding new members.
                </p>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                className="shrink-0 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors border-muted-foreground/20 font-bold rounded-xl z-20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
            {/* Decorative background element */}
            <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none hidden md:block">
              <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M45.7,-76.4C58.9,-69.3,69.1,-55.3,77.7,-40.8C86.3,-26.3,93.2,-11.3,92.5,3.3C91.8,17.9,83.4,32.1,73.1,43.6C62.8,55.1,50.6,63.9,37.3,70.5C24,77.1,9.6,81.5,-4.6,83.2C-18.8,84.9,-32.8,83.9,-44.6,76.9C-56.4,69.9,-66,56.9,-73.9,42.7C-81.8,28.5,-88.1,13.1,-87.3,-1.9C-86.5,-16.9,-78.7,-31.5,-69.1,-43.3C-59.5,-55.1,-48.1,-64.1,-35.1,-71.4C-22.1,-78.7,-7.5,-84.3,4.2,-81.7C15.9,-79.1,32.5,-83.5,45.7,-76.4Z" transform="translate(100 100)" />
              </svg>
            </div>
          </header>

          {/* FEATURES GRID */}
          <section className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={idx} 
                  className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 group flex flex-col p-4 sm:p-5 border-2 ${feature.cardWrapper}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${feature.iconWrapper}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-heading font-bold text-foreground tracking-tight">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    {feature.description}
                  </p>
                  <Link href={feature.href} className="mt-auto block">
                    <Button 
                      variant="outline" 
                      className={`w-full justify-between h-9 font-semibold transition-colors ${feature.buttonClass}`}
                    >
                      {feature.buttonText}
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}