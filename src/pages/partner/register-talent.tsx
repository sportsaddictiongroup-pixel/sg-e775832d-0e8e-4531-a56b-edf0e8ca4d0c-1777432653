import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { TalentManagement } from "@/components/partner/TalentManagement";

export default function RegisterTalentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          router.replace("/partner/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (isMounted) {
          setProfile(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        if (isMounted) router.replace("/partner/login");
      }
    };

    init();
    return () => { isMounted = false; };
  }, [router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <SEO title="Register Talent" description="Register a new talent in your network." />
      <main className="min-h-screen bg-background text-foreground px-4 pt-8 pb-8 md:py-8 overflow-x-hidden">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-4" asChild>
                <Link href="/partner">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="font-heading text-3xl md:text-4xl font-black flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-md border border-emerald-400/30">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground">
                  Register New Talent
                </span>
              </h1>
              <p className="text-base text-muted-foreground mt-2 max-w-2xl font-medium">
                Fill out the details below to add a new talent to your directory.
              </p>
            </div>
          </div>

          {profile && <TalentManagement profile={profile} mode="register" />}
        </div>
      </main>
    </>
  );
}