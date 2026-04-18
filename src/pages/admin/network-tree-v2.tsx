import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowLeft, Eye, Network, User, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ==========================================
// STRICT FLAT DATA TYPES
// ==========================================
type NormalizedProfile = {
  id: string;
  user_id: string;
  partner_name: string;
  role: string;
  position: string;
  upline_profile_id: string | null;
  upline_username: string;
  created_at: string;
};

type TreeNode = NormalizedProfile & {
  children: TreeNode[];
  level: number;
};

// ==========================================
// HELPERS
// ==========================================
const formatRole = (rawRole?: string) => {
  if (!rawRole) return "Unassigned";
  return rawRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// ==========================================
// RECURSIVE TREE NODE COMPONENT
// ==========================================
const NetworkNodeComponent = ({ node }: { node: TreeNode }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative flex flex-col items-start">
      <div className="flex items-center py-2">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm w-[260px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <User size={18} className="text-primary" />
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="text-sm font-semibold truncate">{node.partner_name}</span>
            <span className="text-xs text-muted-foreground truncate">{node.user_id}</span>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Lvl {node.level}</Badge>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{node.position}</span>
            </div>
          </div>
        </div>

        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background hover:bg-muted shrink-0 z-10"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="ml-8 border-l-2 border-muted/50 pl-6 flex flex-col gap-2 relative">
          <div className="absolute -left-[2px] top-0 bottom-6 w-[2px] bg-muted/50" />
          {node.children.map(child => (
            <div key={child.id} className="relative">
              <div className="absolute -left-6 top-7 w-6 h-[2px] bg-muted/50" />
              <NetworkNodeComponent node={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function NetworkTreeV2Page() {
  const router = useRouter();
  
  // State
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [allUsers, setAllUsers] = useState<NormalizedProfile[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);

  // ==========================================
  // INITIALIZATION & FETCHING
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // 1. Strict Admin Auth Check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: authProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (authProfile?.role !== "admin") {
        router.replace("/admin/login");
        return;
      }
      setAuthLoading(false);

      // 2. Fetch Data (Strict joined query)
      const { data: profilesData } = await (supabase as any)
        .from("profiles")
        .select(`
          id,
          username,
          role,
          upline_profile_id,
          created_at,
          partner_details (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      // Fetch territory assignments to derive position properly
      const { data: assignmentsData } = await supabase
        .from("territory_assignments")
        .select("profile_id");

      if (isMounted && profilesData) {
        // Build reference maps
        const userMap = new Map<string, any>();
        profilesData.forEach((u: any) => userMap.set(u.id, u));

        const assignmentsSet = new Set<string>();
        if (assignmentsData) {
          assignmentsData.forEach(a => {
            if (a.profile_id) assignmentsSet.add(a.profile_id);
          });
        }

        // 3. Strict Pre-render Normalization to Flat Structure
        const normalized: NormalizedProfile[] = profilesData.map((u: any) => {
          // Extract partner_details array safely
          const pd = Array.isArray(u.partner_details) ? u.partner_details[0] : u.partner_details;
          const partner_name = pd?.full_name || u.username;
          const user_id = u.username;
          const role = u.role || "partner";
          
          // Derive position
          const isAssigned = assignmentsSet.has(u.id);
          const position = isAssigned ? formatRole(role) : "Unassigned";

          // Resolve Upline Username safely
          let upline_username = "—";
          if (u.upline_profile_id) {
            const uplineRaw = userMap.get(u.upline_profile_id);
            upline_username = uplineRaw?.username || "Admin";
          } else if (role !== "admin") {
            upline_username = "Admin";
          }

          return {
            id: u.id,
            user_id,
            partner_name,
            role,
            position,
            upline_profile_id: u.upline_profile_id,
            upline_username,
            created_at: u.created_at
          };
        });

        setAllUsers(normalized);
        setDataLoading(false);
      }
    };

    void init();
    return () => { isMounted = false; };
  }, [router]);

  // ==========================================
  // TREE BUILDING LOGIC (In-Memory)
  // ==========================================
  const buildTree = (rootId: string) => {
    // 1. Build children map for fast O(1) lookups
    const childrenMap = new Map<string, NormalizedProfile[]>();
    allUsers.forEach(u => {
      if (u.upline_profile_id) {
        if (!childrenMap.has(u.upline_profile_id)) {
          childrenMap.set(u.upline_profile_id, []);
        }
        childrenMap.get(u.upline_profile_id)!.push(u);
      }
    });

    // 2. Recursive builder with depth constraint
    const MAX_DEPTH = 5;
    
    const getChildrenRecursive = (parentId: string, currentLevel: number): TreeNode[] => {
      if (currentLevel > MAX_DEPTH) return [];
      
      const directChildren = childrenMap.get(parentId) || [];
      return directChildren.map(child => ({
        ...child,
        level: currentLevel,
        children: getChildrenRecursive(child.id, currentLevel + 1)
      }));
    };

    // 3. Set root node
    const rootUser = allUsers.find(u => u.id === rootId);
    if (!rootUser) return;

    const fullTree: TreeNode = {
      ...rootUser,
      level: 0,
      children: getChildrenRecursive(rootId, 1)
    };

    setTreeData(fullTree);
    setSelectedRootId(rootId);
  };

  // ==========================================
  // SEARCH FILTER
  // ==========================================
  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.partner_name.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q) ||
      u.upline_username.toLowerCase().includes(q)
    );
  });

  // ==========================================
  // RENDER
  // ==========================================
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verifying secure admin session...</p>
      </main>
    );
  }

  return (
    <>
      <SEO title="Network Tree V2" description="View isolated partner hierarchy structure." />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Portal V2</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold flex items-center gap-3">
              <Network className="h-7 w-7 text-primary" />
              Network Directory & Tree
            </h1>
            <p className="text-sm text-muted-foreground">
              Completely isolated master directory. Explore up to 5 levels of partner downlines.
            </p>
          </header>

          {/* CONDITIONAL VIEW: TABLE vs TREE */}
          {!selectedRootId ? (
            // ==========================================
            // VIEW: MAIN DIRECTORY TABLE
            // ==========================================
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 space-y-4 md:space-y-0">
                <div>
                  <CardTitle className="text-lg">Network Directory</CardTitle>
                  <CardDescription>Select a partner to view their immediate downline.</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search name, ID, or upline..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                    Loading complete directory structure...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No partners found matching your search.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Partner Name</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Upline</TableHead>
                          <TableHead>Role / Position</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <span className="font-semibold">{u.partner_name}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-muted-foreground">{u.user_id}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{u.upline_username}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-1">
                                {u.position !== "Unassigned" ? (
                                  <Badge variant="default" className="bg-primary/90">{u.position}</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{u.role}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => buildTree(u.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Tree
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
          ) : (
            // ==========================================
            // VIEW: DOWNLINE TREE
            // ==========================================
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button variant="outline" size="sm" onClick={() => setSelectedRootId(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Directory
              </Button>

              {/* TREE SUMMARY HEADER */}
              {treeData && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 shrink-0">
                        <User size={24} className="text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{treeData.partner_name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{treeData.user_id}</span>
                          <span className="text-muted-foreground">•</span>
                          <Badge variant="default" className="bg-primary/80">{treeData.position}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium">Upline: {treeData.upline_username}</span>
                      <span className="text-xs text-muted-foreground">Joined: {new Date(treeData.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* RECURSIVE TREE CONTAINER */}
              <Card className="border-dashed overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Downline Hierarchy
                  </CardTitle>
                  <CardDescription>Displaying up to 5 levels deep based on strict upline configuration.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-max">
                      {treeData ? (
                        <NetworkNodeComponent node={treeData} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Tree data could not be generated.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </>
  );
}