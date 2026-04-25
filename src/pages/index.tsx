import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Trophy, Dumbbell, Target, Medal, Star, Flame, Shield, Users, Globe, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <SEO title="Sports Addiction Group | Affiliate Network" description="India's First Sports Affiliation Earning System" />
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-x-hidden relative selection:bg-orange-500/30 font-sans flex flex-col justify-between">
        
        {/* Background Watermark */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.02] dark:opacity-[0.015]">
          <div className="absolute top-10 left-10"><Trophy className="w-32 h-32" /></div>
          <div className="absolute top-40 right-20"><Dumbbell className="w-48 h-48 rotate-12" /></div>
          <div className="absolute bottom-20 left-1/4"><Target className="w-64 h-64 -rotate-12" /></div>
          <div className="absolute top-1/3 left-1/3"><Medal className="w-24 h-24 rotate-45" /></div>
          <div className="absolute bottom-1/3 right-1/3"><Star className="w-40 h-40 -rotate-12" /></div>
          <div className="absolute -bottom-10 -right-10"><Flame className="w-80 h-80 rotate-12" /></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 pt-12 md:pt-20 pb-6 max-w-5xl mx-auto text-center flex-1">
          
          {/* Brand Header */}
          <header className="space-y-4 w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-md mb-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                Sports Addiction Group
              </p>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400 tracking-tight">
                Journey of Local Stars to Global Stars
              </h2>
              <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                My Own Sports Network
              </h3>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-800 dark:text-white leading-tight pt-2 pb-1">
              Build Your Sports Network.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">Earn Without Limits.</span>
            </h1>

            {/* Subtext */}
            <div className="space-y-3 pt-3 px-4 max-w-2xl mx-auto">
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                India’s first platform where sports passion is transformed into passive income, identity, and global opportunities.
              </p>
              <p className="text-xs md:text-sm text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wide bg-indigo-50 dark:bg-indigo-950/30 inline-block px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                India’s First Sports Affiliation Earning System
              </p>
            </div>
          </header>

          {/* Benefits Section */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-4xl mx-auto px-2 pt-8 pb-6">
            {[
              "Passive Income in Sports — without heavy effort",
              "Local to Global Growth Journey",
              "Earn Respect & Recognition",
              "Build Your Own Network",
              "International Exposure Opportunities",
              "No Experience Required"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 px-4 py-2 rounded-full shadow-sm border border-slate-200/40 dark:border-slate-700/40 backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Login Portals Grid - Compact & Cute */}
          <section className="flex flex-col sm:flex-row justify-center items-center gap-6 w-full pt-4 pb-10">
            {/* Admin Portal Card */}
            <Card className="flex flex-col justify-center items-center text-center border border-blue-100 dark:border-blue-900/30 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900/80 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 w-full sm:w-[240px] rounded-[2rem] backdrop-blur-xl">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4 shadow-sm text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight mb-5 text-slate-800 dark:text-slate-200">Admin Portal</CardTitle>
              <Link href="/admin/login" className="block w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0 h-11 text-sm font-semibold transition-all rounded-xl">
                  Go to Admin Login
                </Button>
              </Link>
            </Card>

            {/* Partner Portal Card */}
            <Card className="flex flex-col justify-center items-center text-center border border-orange-100 dark:border-orange-900/30 bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900/80 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 w-full sm:w-[240px] rounded-[2rem] backdrop-blur-xl">
              <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-4 shadow-sm text-orange-600 dark:text-orange-400">
                <Globe className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold tracking-tight mb-5 text-slate-800 dark:text-slate-200">Partner Portal</CardTitle>
              <Link href="/partner/login" className="block w-full">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-0 h-11 text-sm font-semibold transition-all rounded-xl">
                  Go to Partner Login
                </Button>
              </Link>
            </Card>
          </section>

        </div>

        {/* Very Bottom Highlight */}
        <div className="relative z-10 w-full text-center pb-8 px-4 mt-auto">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 py-2.5 px-6 rounded-full shadow-sm backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 inline-block">
            Join now and take your sports journey to the next level.
          </p>
        </div>

      </main>
    </>
  );
}