import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Network, 
  Search, 
  ArrowLeft, 
  Users, 
  User, 
  ChevronRight,
  ChevronLeft,
  Home,
  FolderTree,
  Info,
  Layers,
  Key
} from "lucide-react";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

// --- TYPES ---
interface NormalizedPartner {
  profile_id: string;
  partner_name: string;
  user_id: string; // username
  role: string;
  position: string;
  upline_profile_id: string | null;
  upline_username: string | null;
  created_at: string;
  direct_downlines_count: number;
}

const PREVIEW_THRESHOLD = 20;
const DOWNLINES_PER_PAGE = 20;

export default function NetworkTree(): JSX.Element {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data Maps
  const [partners, setPartners] = useState<NormalizedPartner[]>([]);
  const [partnerMap, setPartnerMap] = useState<Map<string, NormalizedPartner>>(new Map());
  const [childrenMap, setChildrenMap] = useState<Map<string, NormalizedPartner[]>>(new Map());

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [drilldownPath, setDrilldownPath] = useState<NormalizedPartner[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [downlinesPage, setDownlinesPage] = useState(1);
  const [genPages, setGenPages] = useState<number[]>([1, 1, 1, 1, 1]);

  // Password Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // 1. Admin Authorization Check
        const user = await authService.getCurrentUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !profile || profile.role !== "admin") {
          await authService.signOut();
          router.replace("/admin/login");
          return;
        }

        // 2. Fetch all profiles with their details safely
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, role, upline_profile_id, created_at, partner_details(full_name), territory_assignments(*)");

        if (error) throw error;
        if (!isMounted) return;

        // 3. Normalize Data (Pass 1: Base mapping)
        const pMap = new Map<string, NormalizedPartner>();
        const cMap = new Map<string, NormalizedPartner[]>();

        (data || []).forEach((row: any) => {
          const pd = row.partner_details;
          const fullName = pd ? (Array.isArray(pd) ? pd[0]?.full_name : pd.full_name) : null;

          let position = "Unassigned";
          if (row.territory_assignments && Array.isArray(row.territory_assignments)) {
            const active = row.territory_assignments.find((a: any) => a.is_active);
            if (active) {
              if (active.location_id) {
                position = "pincode_partner";
              } else if (active.pincode_id) {
                position = row.role === "pincode_partner" ? "pincode_partner" : "pincode_head";
              } else if (active.district_id) {
                position = "district_head";
              } else if (active.state_id) {
                position = "state_head";
              } else {
                position = "Assigned";
              }
            }
          }

          pMap.set(row.id as string, {
            profile_id: row.id as string,
            partner_name: fullName || (row.username as string),
            user_id: row.username as string,
            role: row.role as string,
            position: position,
            upline_profile_id: row.upline_profile_id as string | null,
            upline_username: null,
            created_at: row.created_at as string,
            direct_downlines_count: 0,
          });
        });

        // 4. Normalize Data (Pass 2: Link uplines and populate children)
        pMap.forEach((partner) => {
          if (partner.upline_profile_id) {
            const upline = pMap.get(partner.upline_profile_id);
            if (upline) {
              partner.upline_username = upline.user_id;
            }

            if (!cMap.has(partner.upline_profile_id)) {
              cMap.set(partner.upline_profile_id, []);
            }
            cMap.get(partner.upline_profile_id)!.push(partner);
          }
        });

        // 5. Normalize Data (Pass 3: Aggregate counts)
        pMap.forEach((partner) => {
          const children = cMap.get(partner.profile_id);
          partner.direct_downlines_count = children ? children.length : 0;
        });

        setPartnerMap(pMap);
        setChildrenMap(cMap);
        setPartners(Array.from(pMap.values()));
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to load network tree data:", err);
        if (isMounted) {
          setAuthError("Failed to load data. Please refresh and try again.");
          setIsLoading(false);
        }
      }
    };

    void initialize();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // --- HELPERS ---

  const formatRole = (role: string) => {
    if (!role) return "Unknown";
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "state_head": return "default";
      case "district_head": return "secondary";
      case "pincode_head": return "outline";
      case "pincode_partner": return "outline";
      default: return "outline";
    }
  };

  // --- FILTERING ---

  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(
      (p) =>
        p.partner_name.toLowerCase().includes(query) ||
        p.user_id.toLowerCase().includes(query) ||
        (p.upline_username && p.upline_username.toLowerCase().includes(query))
    );
  }, [partners, searchQuery]);

  // --- DRILLDOWN LOGIC ---

  const handleOpenNode = (partner: NormalizedPartner) => {
    setSelectedProfileId(partner.profile_id);
    setDrilldownPath((prev) => [...prev, partner]);
    setActiveTab("overview");
    setDownlinesPage(1);
    setGenPages([1, 1, 1, 1, 1]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setSelectedProfileId(null);
      setDrilldownPath([]);
    } else {
      const partner = drilldownPath[index];
      setSelectedProfileId(partner.profile_id);
      setDrilldownPath((prev) => prev.slice(0, index + 1));
    }
    setActiveTab("overview");
    setDownlinesPage(1);
    setGenPages([1, 1, 1, 1, 1]);
  };

  const handleResetPassword = async () => {
    setResetError(null);
    setResetSuccess(null);

    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (!selectedProfileId) return;

    setResetLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/admin/reset-partner-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          profileId: selectedProfileId,
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.message || "Failed to reset password.");
      } else {
        setResetSuccess("Password reset successfully.");
        setResetPassword("");
        setResetConfirm("");
        setTimeout(() => {
          setIsResetOpen(false);
          setResetSuccess(null);
        }, 2000);
      }
    } catch (err) {
      setResetError("An unexpected error occurred.");
    } finally {
      setResetLoading(false);
    }
  };

  // --- MLM GENERATION LOGIC ---

  const mlmGenerations = useMemo(() => {
    if (!selectedProfileId) return [];
    
    const gens: NormalizedPartner[][] = [];
    let currentLevel = childrenMap.get(selectedProfileId) || [];

    // Strictly compute up to 5 levels (Level 1 to Level 5)
    for (let i = 0; i < 5; i++) {
      gens.push(currentLevel);
      
      let nextLevel: NormalizedPartner[] = [];
      // Only iterate if there are people in the current level
      if (currentLevel.length > 0) {
        for (const p of currentLevel) {
          const children = childrenMap.get(p.profile_id) || [];
          nextLevel = nextLevel.concat(children);
        }
      }
      currentLevel = nextLevel;
    }
    // Level 6+ is naturally excluded because the loop breaks at i=4
    return gens;
  }, [selectedProfileId, childrenMap]);

  // --- RENDERERS ---

  const renderNodeCard = (partner: NormalizedPartner, level: number = 0) => {
    const getLevelTheme = (lvl: number, role: string) => {
      if (lvl === 0) return { 
        card: "border-rose-200 dark:border-rose-900/40 bg-gradient-to-b from-card to-rose-50/50 dark:to-rose-950/20 hover:border-rose-400 hover:shadow-rose-100", 
        iconBg: "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/50 dark:to-rose-800/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-rose-500 to-rose-600", 
        count: "bg-rose-100/80 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/50" 
      };
      if (lvl === 1) return { 
        card: "border-blue-200 dark:border-blue-900/40 bg-gradient-to-b from-card to-blue-50/50 dark:to-blue-950/20 hover:border-blue-400 hover:shadow-blue-100", 
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-blue-500 to-blue-600", 
        count: "bg-blue-100/80 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50" 
      };
      if (lvl === 2) return { 
        card: "border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-b from-card to-emerald-50/50 dark:to-emerald-950/20 hover:border-emerald-400 hover:shadow-emerald-100", 
        iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-emerald-500 to-emerald-600", 
        count: "bg-emerald-100/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50" 
      };
      if (lvl === 3) return { 
        card: "border-purple-200 dark:border-purple-900/40 bg-gradient-to-b from-card to-purple-50/50 dark:to-purple-950/20 hover:border-purple-400 hover:shadow-purple-100", 
        iconBg: "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-purple-500 to-purple-600", 
        count: "bg-purple-100/80 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900/50" 
      };
      if (lvl === 4) return { 
        card: "border-orange-200 dark:border-orange-900/40 bg-gradient-to-b from-card to-orange-50/50 dark:to-orange-950/20 hover:border-orange-400 hover:shadow-orange-100", 
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 dark:from-orange-900/50 dark:to-orange-800/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-orange-500 to-orange-600", 
        count: "bg-orange-100/80 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900/50" 
      };
      return { // Level 5
        card: "border-teal-200 dark:border-teal-900/40 bg-gradient-to-b from-card to-teal-50/50 dark:to-teal-950/20 hover:border-teal-400 hover:shadow-teal-100", 
        iconBg: "bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 dark:from-teal-900/50 dark:to-teal-800/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800", 
        title: "text-foreground", 
        accent: "bg-gradient-to-r from-teal-500 to-teal-600", 
        count: "bg-teal-100/80 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-900/50" 
      };
    };
    const theme = getLevelTheme(level, partner.role);

    return (
      <Card className={`w-72 shadow-md hover:shadow-xl z-10 relative overflow-hidden rounded-3xl border-2 ${theme.card} transition-all duration-300 hover:-translate-y-1.5`}>
        <div className={`h-2.5 w-full absolute top-0 left-0 ${theme.accent}`} />
        <CardContent className="p-7 flex flex-col items-center text-center mt-3">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 shadow-sm ${theme.iconBg}`}>
            <span className="text-xl font-black tracking-tight">
              {partner.partner_name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <h4 className={`text-base font-extrabold truncate w-full ${theme.title}`} title={partner.partner_name}>
            {partner.partner_name}
          </h4>
          <p className="text-xs text-muted-foreground font-mono mt-2 px-3 py-1 rounded-md bg-background/80 shadow-sm border border-muted-foreground/10">
            {partner.user_id}
          </p>
          {partner.direct_downlines_count > 0 && (
            <div className={`mt-5 flex items-center text-[11px] font-bold px-4 py-1.5 rounded-full border shadow-sm ${theme.count}`}>
              <Users className="h-3.5 w-3.5 mr-2 opacity-80" />
              {partner.direct_downlines_count} Direct Downlines
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPreviewTree = (parent: NormalizedPartner, children: NormalizedPartner[]) => {
    return (
      <div className="flex flex-col items-center py-8">
        {renderNodeCard(parent, 0)}
        {children.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical drop line */}
            <div className="w-0.5 h-12 bg-border dark:bg-border" />
            
            {/* Horizontal line container spanning all children */}
            <div className="flex flex-row gap-8 items-start pt-10 border-t-2 border-border dark:border-border relative">
              {children.map((child) => (
                <div key={child.profile_id} className="flex flex-col items-center relative">
                  {/* Vertical connect line going up */}
                  <div className="w-0.5 h-10 bg-border dark:bg-border absolute -top-10 left-1/2 -translate-x-1/2" />
                  {renderNodeCard(child, 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- UI SCREENS ---

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Building Scalable Network Tree...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-destructive font-medium">{authError}</p>
      </main>
    );
  }

  const selectedPartner = selectedProfileId ? partnerMap.get(selectedProfileId) : null;
  const selectedChildren = selectedProfileId ? (childrenMap.get(selectedProfileId) || []) : [];
  
  const totalPages = Math.ceil(selectedChildren.length / DOWNLINES_PER_PAGE);
  const paginatedChildren = selectedChildren.slice(
    (downlinesPage - 1) * DOWNLINES_PER_PAGE,
    downlinesPage * DOWNLINES_PER_PAGE
  );

  return (
    <>
      <SEO title="Network Tree Explorer" description="Scalable hierarchical view of the partner network." />
      <main className="min-h-screen bg-background text-foreground px-4 py-8 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-4" asChild>
                <Link href="/admin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="font-heading text-4xl md:text-5xl font-black flex items-center gap-4 tracking-tight">
                <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg border border-blue-400/30">
                  <Network className="h-8 w-8 text-white" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground">
                  Network Tree Explorer
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mt-3 max-w-2xl font-medium">
                Navigate the partner hierarchy seamlessly, built for unlimited downline scaling.
              </p>
            </div>
            
            {!selectedProfileId && (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partner, ID, or upline..."
                  className="pl-10 h-12 text-base bg-background shadow-sm border-muted-foreground/20 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* SUBTREE EXPLORER (Drilldown View) */}
          {selectedProfileId && selectedPartner ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Breadcrumbs */}
              <div className="flex items-center text-sm text-muted-foreground overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap bg-muted/10 p-2.5 rounded-2xl border border-muted-foreground/10 shadow-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleBreadcrumbClick(-1)} 
                  className="h-9 px-5 hover:bg-background shadow-sm bg-background border border-muted-foreground/20 font-bold rounded-xl"
                >
                  <Home className="h-4 w-4 mr-2 text-primary" />
                  Root Directory
                </Button>
                {drilldownPath.map((p, i) => (
                  <div key={p.profile_id} className="flex items-center">
                    <ChevronRight className="h-4 w-4 mx-2 opacity-40 shrink-0" />
                    <Button
                      variant={i === drilldownPath.length - 1 ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleBreadcrumbClick(i)}
                      className={`h-9 px-5 rounded-xl ${i === drilldownPath.length - 1 ? 'font-bold shadow-sm bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20' : 'hover:bg-background border border-transparent font-medium'}`}
                    >
                      {p.partner_name}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Node Summary Card */}
              <Card className="border border-muted-foreground/10 shadow-xl overflow-hidden rounded-3xl relative bg-card">
                <div className="absolute top-0 left-0 h-full w-2.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500" />
                <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pl-10">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center shrink-0">
                      <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                        {selectedPartner.partner_name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
                        {selectedPartner.partner_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge variant="outline" className="font-mono text-[11px] bg-muted/40 px-3 py-1 rounded-md shadow-sm border-muted-foreground/20">
                          {selectedPartner.user_id}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-3 text-xs bg-background shadow-sm hover:bg-muted"
                          onClick={() => {
                            setResetError(null);
                            setResetSuccess(null);
                            setResetPassword("");
                            setResetConfirm("");
                            setIsResetOpen(true);
                          }}
                        >
                          <Key className="h-3 w-3 mr-1.5" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5 w-full md:w-auto md:border-l md:pl-10 border-border/50">
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm text-center sm:text-left">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Direct
                      </p>
                      <p className="text-3xl font-black text-emerald-950 dark:text-emerald-100 leading-none">
                        {selectedPartner.direct_downlines_count}
                      </p>
                    </div>
                    <div className="bg-purple-50/80 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 shadow-sm text-center sm:text-left">
                      <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                        <User className="h-3.5 w-3.5" /> Upline
                      </p>
                      <p className="text-base font-bold text-purple-950 dark:text-purple-100 truncate max-w-[140px]" title={selectedPartner.upline_username || "Admin Root"}>
                        {selectedPartner.upline_username || <span className="italic opacity-80 font-medium">Root</span>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs: Overview vs Direct Downlines vs Generations */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 h-auto p-1.5 bg-muted/40 border border-muted/50 rounded-2xl shadow-inner mb-8 gap-1">
                  <TabsTrigger value="overview" className="py-3 px-8 text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80">
                    Overview Preview
                  </TabsTrigger>
                  <TabsTrigger value="downlines" className="py-3 px-8 text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80">
                    Direct Downlines
                    <Badge variant="secondary" className="ml-2 bg-white/20 text-current border-none shadow-sm hidden sm:inline-flex rounded-full px-2">{selectedPartner.direct_downlines_count}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="generations" className="py-3 px-8 text-sm font-bold rounded-xl transition-all duration-300 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80">
                    5-Level MLM View
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-0">
                  <Card className="shadow-lg border-muted rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-blue-500"></div>
                    <CardHeader className="bg-blue-50/40 dark:bg-blue-950/20 border-b pb-5">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FolderTree className="h-5 w-5 text-blue-600" />
                        Visual Node Preview
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Adaptive visual preview of this specific node and its immediate children.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-slate-50/30 dark:bg-muted/5">
                      {selectedChildren.length <= PREVIEW_THRESHOLD ? (
                        <div className="w-full overflow-x-auto p-12 flex justify-center min-w-max">
                          {renderPreviewTree(selectedPartner, selectedChildren)}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
                          <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 shadow-sm border border-amber-200 dark:border-amber-800">
                            <Info className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-3">High Volume Downline</h3>
                          <p className="text-base text-muted-foreground mb-8">
                            This node has <strong className="text-foreground">{selectedChildren.length}</strong> direct downlines. 
                            To ensure optimal performance and prevent browser lag, the visual horizontal tree preview is disabled for nodes with more than {PREVIEW_THRESHOLD} children.
                          </p>
                          <Button onClick={() => setActiveTab("downlines")} className="shadow-md rounded-full px-8 h-12 text-base font-bold transition-all hover:scale-105 bg-amber-600 hover:bg-amber-700 text-white">
                            View in Direct Downlines List
                            <ChevronRight className="h-5 w-5 ml-2" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="downlines" className="mt-0">
                  <Card className="shadow-lg border-muted rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-emerald-500"></div>
                    <CardHeader className="bg-emerald-50/40 dark:bg-emerald-950/20 border-b pb-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-600" />
                            Direct Downlines
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Scalable list of all partners directly sponsored by this node.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {selectedChildren.length === 0 ? (
                        <div className="py-24 text-center bg-muted/5 m-4 rounded-2xl border border-dashed border-muted-foreground/20">
                          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-base font-bold text-foreground">No direct downlines.</p>
                          <p className="text-sm text-muted-foreground mt-1">This partner has not sponsored anyone yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-muted/20">
                              <TableRow className="hover:bg-transparent border-b-muted-foreground/10">
                                <TableHead className="h-14 py-4 px-8 font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Partner Name</TableHead>
                                <TableHead className="h-14 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Direct Downlines</TableHead>
                                <TableHead className="h-14 py-4 text-right pr-8 font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Explore</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedChildren.map((p) => (
                                <TableRow key={p.profile_id} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 even:bg-muted/10 transition-colors border-b-muted-foreground/10 group">
                                  <TableCell className="py-5 px-8">
                                    <div className="font-extrabold text-foreground text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{p.partner_name}</div>
                                    <div className="text-xs font-mono text-muted-foreground mt-1.5 opacity-80 bg-muted/30 inline-block px-2 py-0.5 rounded">{p.user_id}</div>
                                  </TableCell>
                                  <TableCell className="text-center py-5">
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border shadow-sm">
                                      {p.direct_downlines_count}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right pr-8 py-5">
                                    <Button
                                      size="sm"
                                      className="h-10 rounded-full px-6 shadow-sm bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:-translate-y-0.5 text-white transition-all font-bold"
                                      onClick={() => handleOpenNode(p)}
                                    >
                                      View Tree
                                      <ChevronRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/10">
                              <p className="text-sm text-muted-foreground font-medium">
                                Showing <strong className="text-foreground">{(downlinesPage - 1) * DOWNLINES_PER_PAGE + 1}</strong> to <strong className="text-foreground">{Math.min(downlinesPage * DOWNLINES_PER_PAGE, selectedChildren.length)}</strong> of <strong className="text-foreground">{selectedChildren.length}</strong>
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDownlinesPage(p => Math.max(1, p - 1))}
                                  disabled={downlinesPage === 1}
                                  className="h-8 w-8 p-0 rounded-full shadow-sm"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm font-bold px-3">
                                  Page {downlinesPage} of {totalPages}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDownlinesPage(p => Math.min(totalPages, p + 1))}
                                  disabled={downlinesPage === totalPages}
                                  className="h-8 w-8 p-0 rounded-full shadow-sm"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="generations" className="mt-0 space-y-6">
                  {mlmGenerations.map((levelPartners, index) => {
                    const levelNum = index + 1;
                    const total = levelPartners.length;
                    const page = genPages[index];
                    const totalPages = Math.ceil(total / DOWNLINES_PER_PAGE) || 1;
                    const paginated = levelPartners.slice(
                      (page - 1) * DOWNLINES_PER_PAGE,
                      page * DOWNLINES_PER_PAGE
                    );

                    const getGenColor = (lvl: number) => {
                      if (lvl === 1) return { bar: "bg-blue-500", header: "bg-blue-50/40 dark:bg-blue-950/20", icon: "text-blue-600", hover: "hover:bg-blue-50/60 dark:hover:bg-blue-900/20", textHover: "group-hover:text-blue-700 dark:group-hover:text-blue-400", btn: "bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5" };
                      if (lvl === 2) return { bar: "bg-emerald-500", header: "bg-emerald-50/40 dark:bg-emerald-950/20", icon: "text-emerald-600", hover: "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20", textHover: "group-hover:text-emerald-700 dark:group-hover:text-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:-translate-y-0.5" };
                      if (lvl === 3) return { bar: "bg-purple-500", header: "bg-purple-50/40 dark:bg-purple-950/20", icon: "text-purple-600", hover: "hover:bg-purple-50/60 dark:hover:bg-purple-900/20", textHover: "group-hover:text-purple-700 dark:group-hover:text-purple-400", btn: "bg-purple-600 hover:bg-purple-700 hover:shadow-md hover:-translate-y-0.5" };
                      if (lvl === 4) return { bar: "bg-orange-500", header: "bg-orange-50/40 dark:bg-orange-950/20", icon: "text-orange-600", hover: "hover:bg-orange-50/60 dark:hover:bg-orange-900/20", textHover: "group-hover:text-orange-700 dark:group-hover:text-orange-400", btn: "bg-orange-600 hover:bg-orange-700 hover:shadow-md hover:-translate-y-0.5" };
                      return { bar: "bg-teal-500", header: "bg-teal-50/40 dark:bg-teal-950/20", icon: "text-teal-600", hover: "hover:bg-teal-50/60 dark:hover:bg-teal-900/20", textHover: "group-hover:text-teal-700 dark:group-hover:text-teal-400", btn: "bg-teal-600 hover:bg-teal-700 hover:shadow-md hover:-translate-y-0.5" };
                    };
                    const gTheme = getGenColor(levelNum);

                    return (
                      <Card key={`gen-level-${levelNum}`} className="shadow-lg border-muted overflow-hidden rounded-3xl">
                        <div className={`h-2 w-full ${gTheme.bar}`}></div>
                        <CardHeader className={`border-b py-6 ${gTheme.header}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
                            <div>
                              <CardTitle className="text-xl font-bold flex items-center gap-3">
                                <div className={`p-2 bg-white dark:bg-background rounded-lg shadow-sm`}>
                                  <Layers className={`h-5 w-5 ${gTheme.icon}`} />
                                </div>
                                Generation Level {levelNum}
                              </CardTitle>
                              <CardDescription className="text-sm mt-1.5 font-medium">
                                {total === 0 
                                  ? "No partners at this level" 
                                  : `${total} partner${total !== 1 ? 's' : ''} in this generation`}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {total === 0 ? (
                            <div className="py-16 text-center bg-muted/5">
                              <p className="text-base font-bold text-muted-foreground opacity-80">No downlines found at Level {levelNum}.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="bg-muted/20">
                                  <TableRow className="hover:bg-transparent border-b-muted-foreground/10">
                                    <TableHead className="h-14 py-4 px-8 font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Partner Name</TableHead>
                                    <TableHead className="h-14 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Direct Downlines</TableHead>
                                    <TableHead className="h-14 py-4 text-right pr-8 font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Explore</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginated.map((p) => (
                                    <TableRow key={p.profile_id} className={`${gTheme.hover} even:bg-muted/10 transition-colors border-b-muted-foreground/10 group`}>
                                      <TableCell className="py-5 px-8">
                                        <div className={`font-extrabold text-foreground text-sm transition-colors ${gTheme.textHover}`}>{p.partner_name}</div>
                                        <div className="text-xs font-mono text-muted-foreground mt-1.5 opacity-80 bg-muted/30 inline-block px-2 py-0.5 rounded">{p.user_id}</div>
                                      </TableCell>
                                      <TableCell className="text-center py-5">
                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border shadow-sm">
                                          {p.direct_downlines_count}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right pr-8 py-5">
                                        <Button
                                          size="sm"
                                          className={`h-10 rounded-full px-6 shadow-sm text-white transition-all font-bold ${gTheme.btn}`}
                                          onClick={() => handleOpenNode(p)}
                                        >
                                          View Tree
                                          <ChevronRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              
                              {/* Pagination Controls per Generation Level */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/10">
                                  <p className="text-sm text-muted-foreground font-medium">
                                    Showing <strong className="text-foreground">{(page - 1) * DOWNLINES_PER_PAGE + 1}</strong> to <strong className="text-foreground">{Math.min(page * DOWNLINES_PER_PAGE, total)}</strong> of <strong className="text-foreground">{total}</strong>
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newPages = [...genPages];
                                        newPages[index] = Math.max(1, page - 1);
                                        setGenPages(newPages);
                                      }}
                                      disabled={page === 1}
                                      className="h-8 w-8 p-0 rounded-full shadow-sm"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-sm font-bold px-3">
                                      Page {page} of {totalPages}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newPages = [...genPages];
                                        newPages[index] = Math.min(totalPages, page + 1);
                                        setGenPages(newPages);
                                      }}
                                      disabled={page === totalPages}
                                      className="h-8 w-8 p-0 rounded-full shadow-sm"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* ROOT LIST VIEW */
            <Card className="shadow-xl border-muted-foreground/10 rounded-3xl overflow-hidden animate-in fade-in duration-300 bg-card">
              <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              <CardContent className="p-0">
                {filteredPartners.length === 0 ? (
                  <div className="py-32 text-center bg-muted/5 m-6 rounded-3xl border border-dashed border-muted-foreground/20">
                    <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Users className="h-10 w-10 text-muted-foreground/60" />
                    </div>
                    <p className="text-xl font-bold text-foreground">No partners found.</p>
                    <p className="text-base text-muted-foreground mt-2 opacity-80">Adjust your search criteria to explore the network.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-b-muted-foreground/10">
                          <TableHead className="h-14 py-4 px-8 w-[30%] font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Partner Name</TableHead>
                          <TableHead className="h-14 py-4 w-[25%] font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Upline</TableHead>
                          <TableHead className="h-14 py-4 w-[20%] text-center font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Direct Downlines</TableHead>
                          <TableHead className="h-14 py-4 w-[25%] text-right pr-8 font-bold text-muted-foreground uppercase tracking-widest text-[11px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPartners.slice(0, 100).map((p) => (
                          <TableRow key={p.profile_id} className="hover:bg-blue-50/60 dark:hover:bg-blue-900/20 even:bg-muted/10 transition-colors border-b-muted-foreground/10 group">
                            <TableCell className="py-5 px-8">
                              <div className="font-extrabold text-foreground text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{p.partner_name}</div>
                              <div className="text-xs font-mono text-muted-foreground mt-1.5 opacity-80 bg-muted/30 inline-block px-2 py-0.5 rounded">{p.user_id}</div>
                            </TableCell>
                            <TableCell className="py-5">
                              {p.upline_username ? (
                                <div className="text-sm font-semibold text-muted-foreground bg-muted/20 inline-block px-3 py-1 rounded-md">{p.upline_username}</div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 italic font-medium">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-5">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border shadow-sm">
                                {p.direct_downlines_count}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-8 py-5">
                              <Button
                                size="sm"
                                className="h-10 rounded-full px-6 shadow-sm bg-blue-600 hover:bg-blue-700 hover:shadow-md text-white transition-all font-bold hover:-translate-y-0.5"
                                onClick={() => handleOpenNode(p)}
                              >
                                View Tree
                                <ChevronRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredPartners.length > 100 && (
                      <div className="p-5 text-center text-sm font-bold text-muted-foreground border-t bg-muted/10">
                        Showing top 100 results. Use the search box to find specific partners.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* Password Reset Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Partner Password</DialogTitle>
            <DialogDescription>
              Set a new login password for <strong>{selectedPartner?.partner_name}</strong>. No email will be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md font-medium">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-md font-medium border border-emerald-200 dark:border-emerald-900/50">
                {resetSuccess}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 8 chars)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetOpen(false)} disabled={resetLoading}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetLoading || !resetPassword || !resetConfirm}>
              {resetLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}