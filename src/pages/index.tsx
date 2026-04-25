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
import { Trophy, Dumbbell, Target, Medal, Users, Shield, CheckCircle2, Star, Globe, Flame } from "lucide-react";

export default function Home(): JSX.Element {
  return (
    <>
      <SEO
        title="Sports Addiction Group | Build Your Sports Network"
        description="Journey of Local Star to Global Star. Build Your Sports Network and Earn Without Limits."
      />
      <main className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col items-center justify-center px-4 py-12 md:py-20 overflow-hidden">

        {/* Colorful Sports Energy Orbs (CSS Gradients) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[15%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

        {/* Subtle Dot Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:32px_32px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40 pointer-events-none" />

        {/* Sports Icons Watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none text-slate-900/[0.02] dark:text-white/[0.02]">
          <Trophy className="absolute w-[20vw] h-[20vw] top-[5%] left-[2%] -rotate-12" />
          <Target className="absolute w-[18vw] h-[18vw] top-[30%] right-[5%] rotate-12" />
          <Dumbbell className="absolute w-[15vw] h-[15vw] bottom-[15%] left-[8%] -rotate-45" />
          <Flame className="absolute w-[22vw] h-[22vw] -bottom-[5%] -right-[2%] rotate-45" />
          <Medal className="absolute w-[12vw] h-[12vw] top-[10%] right-[35%] rotate-6" />
          <Star className="absolute w-[16vw] h-[16vw] bottom-[40%] left-[40%] -rotate-12" />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-5xl space-y-12 text-center mt-8 md:mt-12">

          {/* Brand Header */}
          <header className="space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md">
              <Shield className="h-5 w-5 text-orange-600" />
              <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.25em]">
                Sports Addiction Group
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-3xl font-extrabold text-slate-700 dark:text-slate-300 tracking-tight">
                Journey of Local Star to Global Star
              </h2>
              <h3 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400 uppercase tracking-widest">
                My Own Sports Network
              </h3>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] pt-4">
              Build Your Sports Network.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Earn Without Limits.</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto font-semibold leading-relaxed pt-2 px-4">
              India ka pehla aisa platform jahan sports passion ko passive income, identity aur global exposure mein convert kiya ja sakta hai.
            </p>
          </header>

          {/* Benefits Section */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-4xl mx-auto pt-2 px-2">
            {[
              "Passive Income in Sports – bina heavy effort",
              "Local to Global Journey",
              "Earn Respect + Recognition",
              "Build Your Own Network",
              "International Opportunities",
              "No Experience Needed"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white/90 dark:bg-slate-900/90 px-4 md:px-5 py-2.5 rounded-full shadow-sm border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md hover:scale-105 transition-transform cursor-default">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                <span className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-200">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Highlight Line */}
          <div className="mx-auto max-w-3xl p-1 rounded-2xl bg-gradient-to-r from-orange-500 via-purple-500 to-blue-600 shadow-lg mx-4 md:mx-auto">
            <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-xl p-5 md:p-6">
              <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                Aisa system India hi nahi, world mein pehli baar. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-purple-600 font-black text-xl md:text-2xl mt-1 inline-block">
                  Abhi join karo – aur apni sports journey ko next level par le jao.
                </span>
              </p>
            </div>
          </div>

          {/* Login Portals Grid */}
          <section className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto pt-8 px-4 md:px-0">
            {/* Admin Portal Card */}
            <Card className="flex flex-col justify-between border-0 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white shadow-xl hover:shadow-2xl hover:shadow-blue-900/30 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden group relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

              <div className="relative z-10 text-left">
                <CardHeader>
                  <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-blue-100" />
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight">Admin Portal</CardTitle>
                  <CardDescription className="text-base font-medium text-blue-100 mt-2">
                    Manage master data, partners, and territory assignments from a single, consistent console.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-blue-50 space-y-3 font-medium">
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" /> Location hierarchy management
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" /> Create and manage partner accounts
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" /> View territory occupancy and vacancies
                    </li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-6 relative z-10 mt-auto">
                <Link href="/admin/login" className="block">
                  <Button className="w-full bg-white hover:bg-blue-50 text-blue-900 shadow-lg hover:shadow-xl border-0 h-12 text-lg font-bold transition-all">
                    Go to Admin Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Partner Portal Card */}
            <Card className="flex flex-col justify-between border-0 bg-gradient-to-br from-orange-500 via-red-500 to-purple-700 text-white shadow-xl hover:shadow-2xl hover:shadow-orange-900/30 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden group relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4"></div>

              <div className="relative z-10 text-left">
                <CardHeader>
                  <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
                    <Globe className="h-7 w-7 text-orange-100" />
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight">Partner Portal</CardTitle>
                  <CardDescription className="text-base font-medium text-orange-100 mt-2">
                    Partners access their dashboard, see assigned territory, and manage their credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-orange-50 space-y-3 font-medium">
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.8)]" /> Role and territory summary
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.8)]" /> Upline information overview
                    </li>
                    <li className="flex items-center gap-3">
                       <div className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.8)]" /> Secure password change
                    </li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-6 relative z-10 mt-auto">
                <Link href="/partner/login" className="block">
                  <Button className="w-full bg-white hover:bg-orange-50 text-orange-900 shadow-lg hover:shadow-xl border-0 h-12 text-lg font-bold transition-all">
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