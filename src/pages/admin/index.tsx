import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { UserPlus, MapPin, Map as MapIcon, Network, ArrowRight, LayoutDashboard, LogOut, Key, Users, Activity } from "lucide-react";

type Profile = Tables<"profiles">;

export default function AdminDashboard(): JSX.Element {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password Change State
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const handlePasswordChange = async () => {
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("All fields are required.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }

    setPwdLoading(true);
    try {
      // 1. Get current secure session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPwdError("Session error. Please log in again.");
        setPwdLoading(false);
        return;
      }

      // 2. Verify current password securely by attempting a silent re-auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd
      });

      if (signInError) {
        setPwdError("Incorrect current password.");
        setPwdLoading(false);
        return;
      }

      // 3. Update to the new password permanently
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPwd
      });

      if (updateError) {
        setPwdError(updateError.message);
      } else {
        setPwdSuccess("Password updated successfully.");
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        setTimeout(() => {
          setIsPwdOpen(false);
          setPwdSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setPwdError("An unexpected error occurred.");
    } finally {
      setPwdLoading(false);
    }
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
    {
      title: "Partner Directory",
      description: "View, search and manage partner information.",
      href: "/admin/partner-directory",
      icon: Users,
      cardWrapper: "border-indigo-300/70 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 hover:shadow-xl hover:shadow-indigo-500/10",
      iconWrapper: "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20",
      buttonClass: "bg-indigo-100 hover:bg-indigo-600 text-indigo-800 hover:text-white border-transparent dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white",
      buttonText: "Open Directory",
    },
    {
      title: "Sports & Activities",
      description: "Manage master list of sports, activities, and their specific skills.",
      href: "/admin/sports-activities",
      icon: Activity,
      cardWrapper: "border-pink-300/70 dark:border-pink-800 hover:border-pink-500 dark:hover:border-pink-500 bg-pink-50/40 hover:bg-pink-50/80 dark:bg-pink-950/20 dark:hover:bg-pink-900/30 hover:shadow-xl hover:shadow-pink-500/10",
      iconWrapper: "bg-pink-500 dark:bg-pink-600 text-white shadow-sm shadow-pink-500/20",
      buttonClass: "bg-pink-100 hover:bg-pink-500 text-pink-900 hover:text-white border-transparent dark:bg-pink-900/50 dark:text-pink-300 dark:hover:bg-pink-600 dark:hover:text-white",
      buttonText: "Manage Activities",
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

              <div className="flex flex-col sm:flex-row gap-3 shrink-0 z-20">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setPwdError(null);
                    setPwdSuccess(null);
                    setCurrentPwd("");
                    setNewPwd("");
                    setConfirmPwd("");
                    setIsPwdOpen(true);
                  }}
                  className="bg-background/80 backdrop-blur-sm shadow-sm hover:bg-muted font-bold rounded-xl"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="bg-background/80 backdrop-blur-sm shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors border-muted-foreground/20 font-bold rounded-xl"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
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

      {/* Change Password Dialog */}
      <Dialog open={isPwdOpen} onOpenChange={setIsPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Admin Password</DialogTitle>
            <DialogDescription>
              Update your administrative login password. This change takes effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pwdError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md font-medium">
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md font-medium border border-emerald-200 dark:border-emerald-900/50">
                {pwdSuccess}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-pwd">Current Password</Label>
              <Input
                id="current-pwd"
                type="password"
                placeholder="Enter current password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                disabled={pwdLoading || !!pwdSuccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pwd">New Password</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Enter new password (min 8 chars)"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                disabled={pwdLoading || !!pwdSuccess}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd">Confirm New Password</Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="Confirm new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                disabled={pwdLoading || !!pwdSuccess}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPwdOpen(false)} disabled={pwdLoading}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} disabled={pwdLoading || !!pwdSuccess}>
              {pwdLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}