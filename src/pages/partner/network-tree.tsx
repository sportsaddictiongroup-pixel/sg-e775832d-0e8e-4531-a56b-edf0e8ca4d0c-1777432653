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
  LogOut
} from "lucide-react";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

interface NormalizedPartner {
  profile_id: string;
  partner_name: string;
  user_id: string; 
  role: string;
  position: string;
  upline_profile_id: string | null;
  upline_username: string | null;
  created_at: string;
  direct_downlines_count: number;
}

const PREVIEW_THRESHOLD = 20;
const DOWNLINES_PER_PAGE = 20;

export default function PartnerNetworkTree(): JSX.Element {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [partners, setPartners] = useState<NormalizedPartner[]>([]);
  const [partnerMap, setPartnerMap] = useState<Map<string, NormalizedPartner>>(new Map());
  const [childrenMap, setChildrenMap] = useState<Map<string, NormalizedPartner[]>>(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const [rootProfileId, setRootProfileId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [drilldownPath, setDrilldownPath] = useState<NormalizedPartner[]>([]);
  const [activeTab, setActiveTab] = useState("downlines");
  const [downlinesPage, setDownlinesPage] = useState(1);
  const [genPages, setGenPages] = useState<number[]>([1, 1, 1, 1, 1]);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      router.replace("/partner/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          router.replace("/partner/login");
          return;
        }

        // Chunk helper for safe querying without hitting URL limits
        const chunkArray = (arr: string[], size: number) => {
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        };

        // 1. Fetch Root Partner securely without complex upline joins that might trigger RLS/FK errors
        const { data: rootData, error: rootError } = await supabase
          .from("profiles")
          .select(`
            id, 
            username, 
            role, 
            upline_profile_id, 
            created_at, 
            partner_details(full_name), 
            territory_assignments(*)
          `)
          .eq("id", user.id)
          .maybeSingle();

        if (rootError) {
          console.error("Root fetch error:", rootError);
          throw new Error("Could not load your profile data.");
        }
        if (!rootData) {
          throw new Error("Profile not found.");
        }

        if (rootData.role === "admin") {
          router.replace("/admin/network-tree");
          return;
        }

        const fetchedNodes: any[] = [rootData];
        let currentLevelIds = [user.id];

        // 2. Fetch 5 levels explicitly to guarantee strict scoping
        for (let i = 0; i < 5; i++) {
          if (currentLevelIds.length === 0) break;
          
          const levelData: any[] = [];
          const chunks = chunkArray(currentLevelIds, 150);
          
          for (const chunk of chunks) {
            const { data, error } = await supabase
              .from("profiles")
              .select("id, username, role, upline_profile_id, created_at, partner_details(full_name), territory_assignments(*)")
              .in("upline_profile_id", chunk);
              
            if (!error && data) {
              levelData.push(...data);
            }
          }
          
          if (levelData.length === 0) break;
          fetchedNodes.push(...levelData);
          currentLevelIds = levelData.map((d: any) => d.id);
        }

        if (!isMounted) return;

        // 3. Normalize Data
        const pMap = new Map<string, NormalizedPartner>();
        const cMap = new Map<string, NormalizedPartner[]>();

        fetchedNodes.forEach((row: any) => {
          const pd = row.partner_details;
          const fullName = pd ? (Array.isArray(pd) ? pd[0]?.full_name : pd.full_name) : null;

          let position = "Unassigned";
          if (row.territory_assignments && Array.isArray(row.territory_assignments)) {
            const active = row.territory_assignments.find((a: any) => a.is_active);
            if (active) {
              if (active.location_id) position = "pincode_partner";
              else if (active.pincode_id) position = row.role === "pincode_partner" ? "pincode_partner" : "pincode_head";
              else if (active.district_id) position = "district_head";
              else if (active.state_id) position = "state_head";
              else position = "Assigned";
            }
          }

          pMap.set(row.id as string, {
            profile_id: row.id as string,
            partner_name: fullName || (row.username as string),
            user_id: row.username as string,
            role: row.role as string,
            position: position,
            upline_profile_id: row.upline_profile_id as string | null,
            upline_username: null, // Populated safely below
            created_at: row.created_at as string,
            direct_downlines_count: 0,
          });
        });

        // Safely fetch root's upline details in a separate query to bypass strict RLS blocks
        if (rootData.upline_profile_id) {
          try {
            const { data: upProfile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", rootData.upline_profile_id)
              .maybeSingle();

            if (upProfile) {
              pMap.get(user.id)!.upline_username = upProfile.username;
              
              const { data: upPd } = await (supabase as any)
                .from("partner_details")
                .select("full_name")
                .eq("profile_id", rootData.upline_profile_id)
                .maybeSingle();
                
              (pMap.get(user.id) as any)._root_upline_full_name = upPd?.full_name || upProfile.username;
            }
          } catch (e) {
            console.warn("Could not fetch upline details safely, falling back", e);
          }
        }

        // 4. Link Uplines and Populate Children
        pMap.forEach((partner) => {
          if (partner.upline_profile_id) {
            const upline = pMap.get(partner.upline_profile_id);
            if (upline) partner.upline_username = upline.user_id;

            if (!cMap.has(partner.upline_profile_id)) {
              cMap.set(partner.upline_profile_id, []);
            }
            cMap.get(partner.upline_profile_id)!.push(partner);
          }
        });

        // 5. Aggregate Counts
        pMap.forEach((partner) => {
          const children = cMap.get(partner.profile_id);
          partner.direct_downlines_count = children ? children.length : 0;
        });

        setPartnerMap(pMap);
        setChildrenMap(cMap);
        setPartners(Array.from(pMap.values()));
        setRootProfileId(user.id);
        setSelectedProfileId(user.id);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to load network tree data:", err);
        if (isMounted) {
          setAuthError("Failed to load your network securely. Please try again.");
          setIsLoading(false);
        }
      }
    };

    void initialize();
    return () => { isMounted = false; };
  }, [router]);

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

  const handleOpenNode = (partner: NormalizedPartner) => {
    setSelectedProfileId(partner.profile_id);
    setDrilldownPath((prev) => [...prev, partner]);
    setActiveTab("downlines");
    setDownlinesPage(1);
    setGenPages([1, 1, 1, 1, 1]);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1 && rootProfileId) {
      setSelectedProfileId(rootProfileId);
      setDrilldownPath([]);
    } else {
      const partner = drilldownPath[index];
      setSelectedProfileId(partner.profile_id);
      setDrilldownPath((prev) => prev.slice(0, index + 1));
    }
    setActiveTab("downlines");
    setDownlinesPage(1);
    setGenPages([1, 1, 1, 1, 1]);
  };

  const mlmGenerations = useMemo(() => {
    if (!selectedProfileId) return [];
    
    const gens: NormalizedPartner[][] = [];
    let currentLevel = childrenMap.get(selectedProfileId) || [];

    for (let i = 0; i < 5; i++) {
      gens.push(currentLevel);
      let nextLevel: NormalizedPartner[] = [];
      if (currentLevel.length > 0) {
        for (const p of currentLevel) {
          const children = childrenMap.get(p.profile_id) || [];
          nextLevel = nextLevel.concat(children);
        }
      }
      currentLevel = nextLevel;
    }
    return gens;
  }, [selectedProfileId, childrenMap]);

  const renderNodeCard = (partner: NormalizedPartner, level: number = 0) => {
    const getLevelTheme = (lvl: number) => {
      if (lvl === 0) return { card: "border-blue-200 bg-gradient-to-b from-card to-blue-50/50", iconBg: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700", title: "text-foreground", accent: "bg-gradient-to-r from-blue-500 to-blue-600", count: "bg-blue-100/80 text-blue-700 border-blue-200" };
      if (lvl === 1) return { card: "border-emerald-200 bg-gradient-to-b from-card to-emerald-50/50", iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700", title: "text-foreground", accent: "bg-gradient-to-r from-emerald-500 to-emerald-600", count: "bg-emerald-100/80 text-emerald-700 border-emerald-200" };
      return { card: "border-purple-200 bg-gradient-to-b from-card to-purple-50/50", iconBg: "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700", title: "text-foreground", accent: "bg-gradient-to-r from-purple-500 to-purple-600", count: "bg-purple-100/80 text-purple-700 border-purple-200" };
    };
    const theme = getLevelTheme(level > 1 ? 2 : level);

    return (
      <Card className={`shrink-0 min-w-[140px] max-w-[180px] w-[140px] sm:w-[160px] h-[110px] sm:h-[124px] shadow-sm hover:shadow-md z-10 relative overflow-hidden rounded-2xl border-2 ${theme.card} transition-all duration-200 hover:-translate-y-0.5`}>
        <div className={`h-1 w-full absolute top-0 left-0 ${theme.accent}`} />
        <CardContent className="p-2 sm:p-3 flex flex-col items-center text-center h-full mt-0.5 sm:mt-1">
          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 shadow-sm shrink-0 ${theme.iconBg}`}>
            <span className="text-sm sm:text-base font-black tracking-tight">{partner.partner_name.substring(0, 2).toUpperCase()}</span>
          </div>
          <h4 className={`text-[10px] sm:text-xs font-extrabold truncate w-full px-1 ${theme.title}`} title={partner.partner_name}>{partner.partner_name}</h4>
          <p className="text-[8px] sm:text-[9px] text-muted-foreground font-mono mt-0.5 px-1.5 py-0.5 rounded bg-background/80 shadow-sm border border-muted-foreground/10 truncate max-w-[95%]">{partner.user_id}</p>
          {partner.direct_downlines_count > 0 && (
            <div className={`absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] flex items-center justify-center text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full border shadow-sm ${theme.count}`}>
              <Users className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-1 opacity-80 shrink-0" />
              <span className="truncate">{partner.direct_downlines_count} Direct</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPreviewTree = (parent: NormalizedPartner, children: NormalizedPartner[]) => {
    return (
      <div className="flex flex-col min-w-max pb-4">
        <div className="flex justify-center w-full relative z-10">
          {renderNodeCard(parent, 0)}
        </div>
        
        {children.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-0.5 h-6 sm:h-8 bg-border" />
            <div className="min-w-max flex flex-row flex-nowrap gap-4 items-start pt-6 sm:pt-8 border-t-2 border-border relative px-4 justify-center">
              {children.map((child) => (
                <div key={child.profile_id} className="flex flex-col items-center relative shrink-0">
                  <div className="w-0.5 h-6 sm:h-8 bg-border absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2" />
                  {renderNodeCard(child, 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading Your Secure Network Tree...</p>
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
  const paginatedChildren = selectedChildren.slice((downlinesPage - 1) * DOWNLINES_PER_PAGE, downlinesPage * DOWNLINES_PER_PAGE);

  return (
    <>
      <SEO title="My Network Tree" description="View your securely scoped partner downline hierarchy." />
      <main className="min-h-screen bg-background text-foreground px-4 pt-8 pb-8 md:py-8 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-4" asChild>
                <Link href="/partner">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="font-heading text-3xl md:text-4xl font-black flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md border border-blue-400/30">
                  <Network className="h-6 w-6 text-white" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground">
                  My Network Tree
                </span>
              </h1>
              <p className="text-base text-muted-foreground mt-2 max-w-2xl font-medium">
                Your securely scoped downline view.
              </p>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your downline..."
                className="pl-10 h-12 text-base bg-background shadow-sm border-muted-foreground/20 hover:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {selectedProfileId && selectedPartner ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center text-sm text-muted-foreground overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap bg-muted/10 p-2.5 rounded-2xl border border-muted-foreground/10 shadow-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleBreadcrumbClick(-1)} 
                  className="h-9 px-5 hover:bg-background shadow-sm bg-background border border-muted-foreground/20 font-bold rounded-xl"
                >
                  <Home className="h-4 w-4 mr-2 text-primary" />
                  My Root
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

              <Card className="border border-muted-foreground/10 shadow-xl overflow-hidden rounded-3xl relative bg-card">
                <div className="absolute top-0 left-0 h-full w-2.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500" />
                <CardContent className="p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 pl-10">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full xl:w-auto">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center shrink-0">
                        <span className="text-2xl font-black text-blue-700">{selectedPartner.partner_name.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">{selectedPartner.partner_name}</h2>
                        <div className="flex items-center mt-3">
                          <Badge variant="outline" className="font-mono text-[11px] bg-muted/40 px-3 py-1 rounded-md shadow-sm border-muted-foreground/20">
                            {selectedPartner.user_id}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* UPLINE DETAILS (Only shown for Root Partner or when safely known) */}
                    {selectedProfileId === rootProfileId && (
                      <div className="md:ml-6 md:pl-6 md:border-l border-border/50 flex flex-col justify-center mt-4 md:mt-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Network className="h-3 w-3" /> Upline
                        </p>
                        {selectedPartner.upline_username ? (
                          <>
                            <p className="text-sm font-bold text-foreground">
                              {(selectedPartner as any)._root_upline_full_name || selectedPartner.upline_username}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {selectedPartner.upline_username}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-foreground">Admin / Root</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 md:gap-3 w-full xl:w-auto xl:border-l xl:pl-8 border-border/50 mt-6 xl:mt-0">
                    <div className="bg-blue-50/80 px-2 py-3 md:p-3 rounded-xl border border-blue-200 shadow-sm text-center flex flex-col justify-center w-[85px] sm:w-[100px]">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 whitespace-nowrap">Direct/L1</p>
                      <p className="text-2xl font-black text-blue-950 leading-none">{mlmGenerations[0]?.length || 0}</p>
                    </div>
                    <div className="bg-emerald-50/80 px-2 py-3 md:p-3 rounded-xl border border-emerald-200 shadow-sm text-center flex flex-col justify-center w-[85px] sm:w-[100px]">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1.5">L2</p>
                      <p className="text-2xl font-black text-emerald-950 leading-none">{mlmGenerations[1]?.length || 0}</p>
                    </div>
                    <div className="bg-purple-50/80 px-2 py-3 md:p-3 rounded-xl border border-purple-200 shadow-sm text-center flex flex-col justify-center w-[85px] sm:w-[100px]">
                      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1.5">L3</p>
                      <p className="text-2xl font-black text-purple-950 leading-none">{mlmGenerations[2]?.length || 0}</p>
                    </div>
                    <div className="bg-amber-50/80 px-2 py-3 md:p-3 rounded-xl border border-amber-200 shadow-sm text-center flex flex-col justify-center w-[85px] sm:w-[100px]">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">L4</p>
                      <p className="text-2xl font-black text-amber-950 leading-none">{mlmGenerations[3]?.length || 0}</p>
                    </div>
                    <div className="bg-rose-50/80 px-2 py-3 md:p-3 rounded-xl border border-rose-200 shadow-sm text-center flex flex-col justify-center w-[85px] sm:w-[100px]">
                      <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1.5">L5</p>
                      <p className="text-2xl font-black text-rose-950 leading-none">{mlmGenerations[4]?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="w-full overflow-x-auto mb-8">
                  <TabsList className="w-full flex flex-col sm:flex-row gap-2 h-auto p-2 overflow-x-auto sm:overflow-visible bg-muted/40 border border-muted/50 rounded-2xl shadow-inner">
                    {false && (
                    <TabsTrigger value="overview" className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm px-3 py-2 min-w-[120px] font-bold rounded-xl text-muted-foreground hover:text-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white">Overview Preview</TabsTrigger>
                    )}
                    <TabsTrigger value="downlines" className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm px-3 py-2 min-w-[120px] font-bold rounded-xl text-muted-foreground hover:text-foreground data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Direct Downlines</TabsTrigger>
                    <TabsTrigger value="generations" className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm px-3 py-2 min-w-[120px] font-bold rounded-xl text-muted-foreground hover:text-foreground data-[state=active]:bg-purple-600 data-[state=active]:text-white">5-Level MLM View</TabsTrigger>
                  </TabsList>
                </div>
                
                {false && (
                <TabsContent value="overview" className="mt-0">
                  <Card className="shadow-lg border-muted rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-blue-500"></div>
                    <CardContent className="p-0 bg-slate-50/30 overflow-hidden">
                      <div className="flex flex-col items-center w-full">
                        <div className="w-full max-w-full overflow-x-auto overflow-y-hidden p-4 sm:p-8 md:p-12 scroll-smooth">
                          <div className="text-center font-bold text-xs bg-red-500 text-white py-1 mb-4 rounded-md mx-auto max-w-max px-4">VISUAL NODE PREVIEW UI v2</div>
                          {renderPreviewTree(selectedPartner, selectedChildren.slice(0, 30))}
                        </div>
                        {selectedChildren.length > 30 && (
                          <div className="py-6 flex flex-col items-center border-t border-border/50 w-full bg-muted/10">
                             <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3 shadow-sm border border-amber-200">
                               <Info className="h-5 w-5 text-amber-600" />
                             </div>
                             <p className="text-sm font-medium text-muted-foreground mb-4 text-center px-4">
                               Showing first 30 of <strong className="text-foreground">{selectedChildren.length}</strong> direct downlines to maintain performance.
                             </p>
                             <Button onClick={() => setActiveTab("downlines")} className="shadow-sm rounded-full px-6 font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all hover:scale-105">
                               View Full List <ChevronRight className="h-4 w-4 ml-1.5" />
                             </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                )}

                <TabsContent value="downlines" className="mt-0">
                  <Card className="shadow-lg border-muted rounded-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-emerald-500"></div>
                    <CardContent className="p-0">
                      {selectedChildren.length === 0 ? (
                        <div className="py-24 text-center m-4">
                          <p className="text-base font-bold text-foreground">No direct downlines.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-muted/20">
                              <TableRow>
                                <TableHead className="h-14 py-4 px-8 font-bold text-muted-foreground text-[11px] uppercase">Partner Name</TableHead>
                                <TableHead className="h-14 py-4 text-center font-bold text-muted-foreground text-[11px] uppercase">Direct Downlines</TableHead>
                                <TableHead className="h-14 py-4 text-right pr-8 font-bold text-muted-foreground text-[11px] uppercase">Explore</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedChildren.map((p) => (
                                <TableRow key={p.profile_id} className="hover:bg-emerald-50/60">
                                  <TableCell className="py-5 px-8">
                                    <div className="font-extrabold text-foreground text-sm">{p.partner_name}</div>
                                    <div className="text-xs font-mono text-muted-foreground mt-1.5 bg-muted/30 inline-block px-2 rounded">{p.user_id}</div>
                                  </TableCell>
                                  <TableCell className="text-center py-5">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border">{p.direct_downlines_count}</span>
                                  </TableCell>
                                  <TableCell className="text-right pr-8 py-5">
                                    <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleOpenNode(p)}>
                                      Explore <ChevronRight className="h-4 w-4 ml-1.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="generations" className="mt-0 space-y-6">
                  {mlmGenerations.map((levelPartners, index) => {
                    const levelNum = index + 1;
                    const total = levelPartners.length;
                    const page = genPages[index] || 1;
                    const totalPages = Math.ceil(total / DOWNLINES_PER_PAGE) || 1;
                    const paginated = levelPartners.slice((page - 1) * DOWNLINES_PER_PAGE, page * DOWNLINES_PER_PAGE);

                    // Define premium color themes per level
                    const colors = [
                      { bg: "bg-blue-500", headerBg: "bg-blue-50/40", text: "text-blue-600", hover: "hover:bg-blue-50/60", btn: "bg-blue-600 hover:bg-blue-700" },
                      { bg: "bg-emerald-500", headerBg: "bg-emerald-50/40", text: "text-emerald-600", hover: "hover:bg-emerald-50/60", btn: "bg-emerald-600 hover:bg-emerald-700" },
                      { bg: "bg-purple-500", headerBg: "bg-purple-50/40", text: "text-purple-600", hover: "hover:bg-purple-50/60", btn: "bg-purple-600 hover:bg-purple-700" },
                      { bg: "bg-amber-500", headerBg: "bg-amber-50/40", text: "text-amber-600", hover: "hover:bg-amber-50/60", btn: "bg-amber-600 hover:bg-amber-700" },
                      { bg: "bg-rose-500", headerBg: "bg-rose-50/40", text: "text-rose-600", hover: "hover:bg-rose-50/60", btn: "bg-rose-600 hover:bg-rose-700" },
                    ];
                    const theme = colors[index];

                    return (
                      <Card key={`gen-level-${levelNum}`} className="shadow-lg border-muted overflow-hidden rounded-3xl">
                        <div className={`h-2 w-full ${theme.bg}`}></div>
                        <CardHeader className={`border-b py-6 ${theme.headerBg} flex flex-row items-center justify-between`}>
                          <CardTitle className={`text-xl font-bold flex items-center gap-3 ${theme.text}`}>
                            <Layers className="h-5 w-5" />
                            Generation Level {levelNum}
                          </CardTitle>
                          <div className="text-sm font-semibold bg-background/80 px-3 py-1 rounded-full shadow-sm border border-border/50 text-foreground">
                            {total} {total === 1 ? "Partner" : "Partners"}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {total === 0 ? (
                            <div className="py-12 text-center">
                              <p className="text-muted-foreground font-medium">No partners at this level.</p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader className="bg-muted/20">
                                <TableRow>
                                  <TableHead className="h-14 py-4 px-8 font-bold text-[11px] uppercase">Partner</TableHead>
                                  <TableHead className="h-14 py-4 text-center font-bold text-[11px] uppercase">Direct Downlines</TableHead>
                                  <TableHead className="h-14 py-4 text-right pr-8 font-bold text-[11px] uppercase">Explore</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginated.map((p) => (
                                  <TableRow key={p.profile_id} className={theme.hover}>
                                    <TableCell className="py-5 px-8">
                                      <div className="font-extrabold text-foreground text-sm">{p.partner_name}</div>
                                      <div className="text-xs font-mono text-muted-foreground mt-1.5 bg-background/50 inline-block px-1.5 py-0.5 rounded border border-border/50">{p.user_id}</div>
                                    </TableCell>
                                    <TableCell className="text-center py-5">
                                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-background text-foreground border shadow-sm">{p.direct_downlines_count}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-5">
                                      <Button size="sm" className={`rounded-full text-white font-bold ${theme.btn}`} onClick={() => handleOpenNode(p)}>
                                        Explore <ChevronRight className="h-4 w-4 ml-1.5" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="py-32 text-center">
              <p className="text-xl font-bold text-foreground">No partners found in your downline.</p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}