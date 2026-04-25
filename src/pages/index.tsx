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
import { Trophy, Activity, Dumbbell, Target, Medal, Users, Shield } from "lucide-react";

export default function Home(): JSX.Element {
  return (
    <>
      <SEO
        title="Portal Selection | Admin & Partner"
        description="Access the Admin or Partner portal for territory-based partner management."
      />
      <main className="relative min-h-screen bg-background text-foreground flex items-center justify-center px-4 overflow-hidden">
        
        {/* Colorful Sports Energy Orbs (CSS Gradients) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-[15%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none" />

        {/* Subtle Dot Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] opacity-30 pointer-events-none" />

        {/* Sports Icons Watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none text-slate-900/[0.03] dark:text-white/[0.03]">
          <Trophy className="absolute w-[25vw] h-[25vw] top-[5%] left-[5%] -rotate-12" />
          <Activity className="absolute w-[20vw] h-[20vw] top-[40%] right-[8%] rotate-12" />
          <Dumbbell className="absolute w-[18vw] h-[18vw] bottom-[10%] left-[12%] -rotate-45" />
          <Target className="absolute w-[30vw] h-[30vw] -bottom-[5%] -right-[5%] rotate-45" />
          <Medal className="absolute w-[15vw] h-[15vw] top-[15%] right-[40%] rotate-6" />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-4xl space-y-10">
          <header className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md mb-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">
                Sports Addiction Group
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Choose your portal
            </h1>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              Admins manage locations, territories, and partner accounts.
              Partners view their assigned territory, hierarchy, and update
              their profile securely.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col justify-between border-2 border-white/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4 shadow-sm border border-blue-200 dark:border-blue-800">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Manage master data, partners, and territory assignments from
                    a single, consistent console.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2.5">
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> Location hierarchy management
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> Create and manage partner accounts
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> View territory occupancy and vacancies
                    </li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-0 relative mt-4">
                <Link href="/admin/login" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-0 h-11 text-base font-semibold">
                    Go to Admin Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between border-2 border-white/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-4 shadow-sm border border-orange-200 dark:border-orange-800">
                    <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Partner Portal</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Partners access their dashboard, see assigned territory, and
                    manage their credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2.5">
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" /> Role and territory summary
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" /> Upline information overview
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" /> Secure password change
                    </li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-0 relative mt-4">
                <Link href="/partner/login" className="block">
                  <Button variant="outline" className="w-full border-orange-200 hover:bg-orange-50 text-orange-700 dark:border-orange-800 dark:hover:bg-orange-950/50 dark:text-orange-400 shadow-sm h-11 text-base font-semibold transition-colors">
                    Go to Partner Login
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