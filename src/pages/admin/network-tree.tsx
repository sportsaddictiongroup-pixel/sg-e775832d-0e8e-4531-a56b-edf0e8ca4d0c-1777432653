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
import { 
  Network, 
  Search, 
  ArrowLeft, 
  Users, 
  User, 
  ChevronRight,
  AlertTriangle,
  Map as MapIcon
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

  // Config
  const MAX_VISIBLE_DEPTH = 5;

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

        (data || []).forEach((row) => {
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

  // --- TREE RENDERING ---

  const renderTreeNode = (profileId: string, currentDepth: number, visited: Set<string>) => {
    if (currentDepth > MAX_VISIBLE_DEPTH) return null;

    const partner = partnerMap.get(profileId);
    if (!partner) return null;

    // Prevent cyclical loops
    if (visited.has(profileId)) {
      return (
        <div className="flex flex-col items-center">
          <Card className="border-destructive/50 bg-destructive/10 w-48 shadow-sm">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-xs font-bold text-destructive">Cyclical Loop Detected</p>
              <p className="text-[10px] text-muted-foreground truncate">{partner.user_id}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const newVisited = new Set(visited).add(profileId);
    const children = childrenMap.get(profileId) || [];
    const hasChildren = children.length > 0 && currentDepth < MAX_VISIBLE_DEPTH;

    return (
      <div key={profileId} className="flex flex-col items-center">
        {/* Node Card */}
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

        {/* Children Subtree */}
        {hasChildren && (
          <div className="flex flex-col items-center">
            {/* Vertical drop line from parent */}
            <div className="w-px h-6 bg-border" />
            
            {/* Horizontal line container spanning all children */}
            <div className="flex flex-row gap-6 items-start pt-6 border-t border-border relative">
              {children.map((child) => (
                <div key={child.profile_id} className="flex flex-col items-center relative">
                  {/* Vertical connect line going up to the horizontal border-t */}
                  <div className="w-px h-6 bg-border absolute -top-6 left-1/2 -translate-x-1/2" />
                  {renderTreeNode(child.profile_id, currentDepth + 1, newVisited)}
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
        <p className="text-sm text-muted-foreground animate-pulse">Building Network Tree...</p>
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

  return (
    <>
      <SEO title="Network Tree" description="Hierarchical view of the partner network." />
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
                Network Tree
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Explore the hierarchical upline/downline structure of your network.
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

          {/* VIEW TOGGLE */}
          {selectedProfileId && selectedPartner ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Selected User Summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground leading-tight">
                      {selectedPartner.partner_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm font-mono text-muted-foreground">{selectedPartner.user_id}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                        {formatRole(selectedPartner.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProfileId(null)}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to List
                </Button>
              </div>

              {/* Recursive Tree Container */}
              <Card className="overflow-hidden shadow-sm border-muted">
                <CardHeader className="bg-muted/10 border-b pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Downline Hierarchy
                  </CardTitle>
                  <CardDescription>
                    Showing up to {MAX_VISIBLE_DEPTH} levels deep. Scroll horizontally to view wide branches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-muted/5">
                  <div className="w-full overflow-x-auto">
                    {/* Padding ensures the tree doesn't touch the container edges while scrolling */}
                    <div className="min-w-max p-8 pb-16 flex justify-center">
                      {renderTreeNode(selectedProfileId, 1, new Set())}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* LIST VIEW */
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
                        {filteredPartners.map((p) => (
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
                                onClick={() => setSelectedProfileId(p.profile_id)}
                              >
                                View Tree
                                <ChevronRight className="h-4 w-4 ml-1" />
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
          )}

        </div>
      </main>
    </>
  );
}