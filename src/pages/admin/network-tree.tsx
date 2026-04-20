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
  Layers
} from "lucide-react";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

// --- TYPES ---
interface NormalizedPartner {
  profile_id: string;
  partner_name: string;
  user_id: string; // username
  role: string;
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
          .select("id, username, role, upline_profile_id, created_at, partner_details(full_name)");

        if (error) throw error;
        if (!isMounted) return;

        // 3. Normalize Data (Pass 1: Base mapping)
        const pMap = new Map<string, NormalizedPartner>();
        const cMap = new Map<string, NormalizedPartner[]>();

        (data || []).forEach((row: any) => {
          const pd = row.partner_details;
          const fullName = pd ? (Array.isArray(pd) ? pd[0]?.full_name : pd.full_name) : null;

          pMap.set(row.id as string, {
            profile_id: row.id as string,
            partner_name: fullName || (row.username as string),
            user_id: row.username as string,
            role: row.role as string,
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

  const renderNodeCard = (partner: NormalizedPartner) => (
    <Card className="w-56 shadow-sm border-muted transition-all hover:border-primary/30 hover:shadow-md bg-background z-10 relative">
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <span className="text-sm font-bold text-primary">
            {partner.partner_name.substring(0, 2).toUpperCase()}
          </span>
        </div>
        <h4 className="text-sm font-bold text-foreground truncate w-full" title={partner.partner_name}>
          {partner.partner_name}
        </h4>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{partner.user_id}</p>
        <Badge variant={getRoleBadgeVariant(partner.role)} className="mt-2 text-[10px] px-1.5 py-0">
          {formatRole(partner.role)}
        </Badge>
        {partner.direct_downlines_count > 0 && (
          <div className="mt-3 flex items-center text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Users className="h-3 w-3 mr-1" />
            {partner.direct_downlines_count} Direct
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPreviewTree = (parent: NormalizedPartner, children: NormalizedPartner[]) => {
    return (
      <div className="flex flex-col items-center py-6">
        {renderNodeCard(parent)}
        {children.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical drop line */}
            <div className="w-px h-8 bg-border" />
            
            {/* Horizontal line container spanning all children */}
            <div className="flex flex-row gap-6 items-start pt-6 border-t border-border relative">
              {children.map((child) => (
                <div key={child.profile_id} className="flex flex-col items-center relative">
                  {/* Vertical connect line going up */}
                  <div className="w-px h-6 bg-border absolute -top-6 left-1/2 -translate-x-1/2" />
                  {renderNodeCard(child)}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground mb-2" asChild>
                <Link href="/admin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold flex items-center gap-2">
                <Network className="h-6 w-6 text-primary" />
                Network Tree Explorer
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Navigate the partner hierarchy seamlessly, built for unlimited downline scaling.
              </p>
            </div>
            
            {!selectedProfileId && (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partner, ID, or upline..."
                  className="pl-9 bg-background"
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
              <div className="flex items-center text-sm text-muted-foreground overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap bg-muted/10 p-2 rounded-lg border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleBreadcrumbClick(-1)} 
                  className="h-8 px-3 hover:bg-background shadow-sm bg-background border"
                >
                  <Home className="h-4 w-4 mr-2 text-primary" />
                  Root Directory
                </Button>
                {drilldownPath.map((p, i) => (
                  <div key={p.profile_id} className="flex items-center">
                    <ChevronRight className="h-4 w-4 mx-2 opacity-50 shrink-0" />
                    <Button
                      variant={i === drilldownPath.length - 1 ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleBreadcrumbClick(i)}
                      className={`h-8 px-3 ${i === drilldownPath.length - 1 ? 'font-bold shadow-sm' : 'hover:bg-background'}`}
                    >
                      {p.partner_name}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Node Summary Card */}
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground leading-tight">
                        {selectedPartner.partner_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {selectedPartner.user_id}
                        </Badge>
                        <Badge variant={getRoleBadgeVariant(selectedPartner.role)} className="text-[10px] uppercase font-bold tracking-wider">
                          {formatRole(selectedPartner.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 sm:border-l sm:pl-8 border-primary/10">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Direct Downlines</p>
                      <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                        {selectedPartner.direct_downlines_count}
                        <Users className="h-5 w-5 text-muted-foreground/50" />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Upline</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedPartner.upline_username || <span className="italic text-muted-foreground">Admin Root</span>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs: Overview vs Direct Downlines vs Generations */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full sm:w-[600px] grid-cols-3">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview Preview</TabsTrigger>
                  <TabsTrigger value="downlines" className="text-xs sm:text-sm">
                    Direct Downlines
                    <Badge variant="secondary" className="ml-1.5 sm:ml-2 bg-background hidden sm:inline-flex">{selectedPartner.direct_downlines_count}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="generations" className="text-xs sm:text-sm">5-Level MLM View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4">
                  <Card className="shadow-sm border-muted overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-primary" />
                        Visual Node Preview
                      </CardTitle>
                      <CardDescription>
                        Adaptive visual preview of this specific node and its immediate children.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-muted/5">
                      {selectedChildren.length <= PREVIEW_THRESHOLD ? (
                        <div className="w-full overflow-x-auto p-8 flex justify-center min-w-max">
                          {renderPreviewTree(selectedPartner, selectedChildren)}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
                          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                            <Info className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground mb-2">High Volume Downline</h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            This node has <strong className="text-foreground">{selectedChildren.length}</strong> direct downlines. 
                            To ensure optimal performance and prevent browser lag, the visual horizontal tree preview is disabled for nodes with more than {PREVIEW_THRESHOLD} children.
                          </p>
                          <Button onClick={() => setActiveTab("downlines")}>
                            View in Direct Downlines List
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="downlines" className="mt-4">
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="bg-muted/10 border-b pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Direct Downlines
                          </CardTitle>
                          <CardDescription>
                            Scalable list of all partners directly sponsored by this node.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {selectedChildren.length === 0 ? (
                        <div className="py-16 text-center">
                          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">No direct downlines.</p>
                          <p className="text-xs text-muted-foreground mt-1">This partner has not sponsored anyone yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-muted/30">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="h-12">Partner Name</TableHead>
                                <TableHead className="h-12">Role</TableHead>
                                <TableHead className="h-12 text-center">Direct Downlines</TableHead>
                                <TableHead className="h-12 text-right pr-6">Explore</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedChildren.map((p) => (
                                <TableRow key={p.profile_id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell>
                                    <div className="font-medium text-foreground">{p.partner_name}</div>
                                    <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.user_id}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getRoleBadgeVariant(p.role)} className="font-medium">
                                      {formatRole(p.role)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent font-mono">
                                      {p.direct_downlines_count}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 hover:bg-primary/10 hover:text-primary"
                                      onClick={() => handleOpenNode(p)}
                                    >
                                      Open Node
                                      <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/5">
                              <p className="text-xs text-muted-foreground font-medium">
                                Showing <strong className="text-foreground">{(downlinesPage - 1) * DOWNLINES_PER_PAGE + 1}</strong> to <strong className="text-foreground">{Math.min(downlinesPage * DOWNLINES_PER_PAGE, selectedChildren.length)}</strong> of <strong className="text-foreground">{selectedChildren.length}</strong>
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDownlinesPage(p => Math.max(1, p - 1))}
                                  disabled={downlinesPage === 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-xs font-medium px-2">
                                  Page {downlinesPage} of {totalPages}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDownlinesPage(p => Math.min(totalPages, p + 1))}
                                  disabled={downlinesPage === totalPages}
                                  className="h-8 w-8 p-0"
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

                <TabsContent value="generations" className="mt-4 space-y-6">
                  {mlmGenerations.map((levelPartners, index) => {
                    const levelNum = index + 1;
                    const total = levelPartners.length;
                    const page = genPages[index];
                    const totalPages = Math.ceil(total / DOWNLINES_PER_PAGE) || 1;
                    const paginated = levelPartners.slice(
                      (page - 1) * DOWNLINES_PER_PAGE,
                      page * DOWNLINES_PER_PAGE
                    );

                    return (
                      <Card key={`gen-level-${levelNum}`} className="shadow-sm border-muted overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                Generation Level {levelNum}
                              </CardTitle>
                              <CardDescription>
                                {total === 0 
                                  ? "No partners at this level" 
                                  : `${total} partner${total !== 1 ? 's' : ''} in this generation`}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {total === 0 ? (
                            <div className="py-8 text-center">
                              <p className="text-sm text-muted-foreground">No downlines found at Level {levelNum}.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="bg-muted/30">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-12">Partner Name</TableHead>
                                    <TableHead className="h-12">Role</TableHead>
                                    <TableHead className="h-12 text-center">Direct Downlines</TableHead>
                                    <TableHead className="h-12 text-right pr-6">Explore</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginated.map((p) => (
                                    <TableRow key={p.profile_id} className="hover:bg-muted/20 transition-colors">
                                      <TableCell>
                                        <div className="font-medium text-foreground">{p.partner_name}</div>
                                        <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.user_id}</div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={getRoleBadgeVariant(p.role)} className="font-medium">
                                          {formatRole(p.role)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent font-mono">
                                          {p.direct_downlines_count}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right pr-6">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 hover:bg-primary/10 hover:text-primary"
                                          onClick={() => handleOpenNode(p)}
                                        >
                                          Open Node
                                          <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              
                              {/* Pagination Controls per Generation Level */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/5">
                                  <p className="text-xs text-muted-foreground font-medium">
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
                                      className="h-8 w-8 p-0"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-xs font-medium px-2">
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
                                      className="h-8 w-8 p-0"
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
            <Card className="shadow-sm border-muted animate-in fade-in duration-300">
              <CardContent className="p-0">
                {filteredPartners.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No partners found.</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust your search criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-12 w-[25%]">Partner Name</TableHead>
                          <TableHead className="h-12 w-[15%]">Role</TableHead>
                          <TableHead className="h-12 w-[20%]">Upline</TableHead>
                          <TableHead className="h-12 w-[15%] text-center">Direct Downlines</TableHead>
                          <TableHead className="h-12 w-[25%] text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPartners.slice(0, 100).map((p) => (
                          <TableRow key={p.profile_id} className="hover:bg-muted/20 transition-colors">
                            <TableCell>
                              <div className="font-medium text-foreground">{p.partner_name}</div>
                              <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.user_id}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(p.role)} className="font-medium">
                                {formatRole(p.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.upline_username ? (
                                <div className="text-sm text-foreground">{p.upline_username}</div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">None (Root)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent font-mono">
                                {p.direct_downlines_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 shadow-sm bg-primary/90 hover:bg-primary"
                                onClick={() => handleOpenNode(p)}
                              >
                                View Tree
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredPartners.length > 100 && (
                      <div className="p-4 text-center text-xs text-muted-foreground border-t bg-muted/10">
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
    </>
  );
}