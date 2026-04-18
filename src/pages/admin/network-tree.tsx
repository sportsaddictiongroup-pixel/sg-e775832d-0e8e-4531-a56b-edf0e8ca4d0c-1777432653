import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, ChevronRight, ChevronDown, User, Network, ArrowLeft, Eye, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";

type NetworkNode = {
  id: string;
  username: string;
  role: string;
  level: number;
  children: NetworkNode[];
};

type ProfileExt = {
  id: string;
  username?: string;
  full_name?: string;
  role?: string;
  upline_profile_id?: string;
  [key: string]: any;
};

const TreeNode = ({ node }: { node: NetworkNode }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative ml-4 mt-3">
      {hasChildren && expanded && (
        <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
      )}
      
      <div className="flex items-start relative z-10">
        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="mt-1.5 h-6 w-6 flex items-center justify-center rounded-md border bg-background hover:bg-muted shrink-0 cursor-pointer shadow-sm transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="mt-1.5 h-6 w-6 flex items-center justify-center shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        <div className="ml-3 flex-1">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm w-fit min-w-[220px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User size={16} className="text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">{node.username}</span>
              <span className="text-xs text-muted-foreground mt-1.5 font-medium">Level {node.level} • {node.role || 'Partner'}</span>
            </div>
          </div>
          
          {expanded && hasChildren && (
            <div className="pb-2">
              {node.children.map(child => (
                <TreeNode key={child.id} node={child} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function NetworkTreePage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  
  // Data States
  const [allUsers, setAllUsers] = useState<ProfileExt[]>([]);
  const [userMap, setUserMap] = useState<Map<string, ProfileExt>>(new Map());
  const [assignmentsMap, setAssignmentsMap] = useState<Map<string, boolean>>(new Map());
  const [loadingData, setLoadingData] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tree States
  const [selectedRoot, setSelectedRoot] = useState<ProfileExt | null>(null);
  const [networkTree, setNetworkTree] = useState<NetworkNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  // Profile Modal State
  const [viewProfileUser, setViewProfileUser] = useState<ProfileExt | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: authProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (authProfile?.role !== "admin") {
        router.replace("/partner/login");
        return;
      }
      setAuthLoading(false);

      // Load all users safely (using * allows dynamic column mapping without crashing if full_name is missing)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: assignmentsData } = await supabase
        .from("territory_assignments")
        .select("profile_id");

      if (isMounted && profilesData) {
        setAllUsers(profilesData);
        
        const uMap = new Map<string, ProfileExt>();
        profilesData.forEach(p => uMap.set(p.id, p));
        setUserMap(uMap);

        if (assignmentsData) {
          const aMap = new Map<string, boolean>();
          assignmentsData.forEach(a => {
            if (a.profile_id) {
              aMap.set(a.profile_id, true);
            }
          });
          setAssignmentsMap(aMap);
        }
        
        setLoadingData(false);
      }
    };
    void init();
    return () => { isMounted = false; };
  }, [router]);

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const un = (u.username || '').toLowerCase();
    const fn = (u.full_name || '').toLowerCase();
    const idStr = (u.id || '').toLowerCase();
    return un.includes(q) || fn.includes(q) || idStr.includes(q);
  });

  const loadNetworkTree = async (rootUser: ProfileExt) => {
    setSelectedRoot(rootUser);
    setLoadingTree(true);

    try {
      const { data: l1 } = await supabase
        .from('profiles')
        .select('id, username, full_name, role, upline_profile_id')
        .eq('upline_profile_id', rootUser.id);
        
      if (!l1 || l1.length === 0) {
        setNetworkTree([]);
        return;
      }

      const l1Ids = l1.map(p => p.id);
      const { data: l2 } = await supabase.from('profiles').select('id, username, full_name, role, upline_profile_id').in('upline_profile_id', l1Ids);
      const l2Ids = l2?.map(p => p.id) || [];

      let l3: any[] = [];
      if (l2Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, full_name, role, upline_profile_id').in('upline_profile_id', l2Ids);
        l3 = data || [];
      }
      const l3Ids = l3.map(p => p.id);

      let l4: any[] = [];
      if (l3Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, full_name, role, upline_profile_id').in('upline_profile_id', l3Ids);
        l4 = data || [];
      }
      const l4Ids = l4.map(p => p.id);

      let l5: any[] = [];
      if (l4Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, full_name, role, upline_profile_id').in('upline_profile_id', l4Ids);
        l5 = data || [];
      }

      const buildNodes = (nodes: any[], currentLevel: number, allData: any[][]): NetworkNode[] => {
        if (currentLevel > 5) return [];
        const nextLevelData = allData[currentLevel - 1] || [];
        
        return nodes.map(node => ({
          id: node.id,
          username: node.username || 'Unknown',
          role: node.role || 'Partner',
          level: currentLevel,
          children: buildNodes(
            nextLevelData.filter(child => child.upline_profile_id === node.id),
            currentLevel + 1,
            allData
          )
        }));
      };

      const tree = buildNodes(l1, 1, [l2 || [], l3, l4, l5]);
      setNetworkTree(tree);
      
    } catch (err) {
      console.error("Failed to load network tree:", err);
    } finally {
      setLoadingTree(false);
    }
  };

  const formatRole = (rawRole?: string) => {
    if (!rawRole) return null;
    return rawRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </main>
    );
  }

  return (
    <>
      <SEO title="Network Tree" description="View partner hierarchy and network structure." />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Portal</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold flex items-center gap-3">
              <Network className="h-7 w-7 text-primary" />
              Network Tree
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedRoot ? "Inspecting partner downline up to 5 levels." : "Browse and search the complete user network to inspect downlines."}
            </p>
          </header>

          {!selectedRoot ? (
            // ==========================================
            // MAIN USER LIST VIEW
            // ==========================================
            <Card className="border-primary/10 shadow-sm animate-in fade-in duration-500">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 space-y-4 md:space-y-0">
                <div>
                  <CardTitle className="text-lg">Network Directory</CardTitle>
                  <CardDescription>All registered users in the system.</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by username, name, or ID..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                    Loading network data...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No users found matching your search.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Partner</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Upline</TableHead>
                          <TableHead>Position / Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(u => {
                          const isAssigned = assignmentsMap.get(u.id);
                          const uplineName = u.upline_profile_id ? userMap.get(u.upline_profile_id)?.username : null;
                          const displayUpline = uplineName || (u.role === 'admin' ? "—" : "Admin");
                          const displayPos = isAssigned ? formatRole(u.role) : null;

                          return (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold">{u.full_name || u.username}</span>
                                  {u.full_name && <span className="text-xs text-muted-foreground">{u.username}</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium text-muted-foreground">{u.username}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium">{displayUpline}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  {displayPos ? (
                                    <Badge variant="default" className="bg-primary/90">{displayPos}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{u.role}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setViewProfileUser(u)} title="View Partner Profile">
                                    <UserCog className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-8" onClick={() => loadNetworkTree(u)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Tree
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // ==========================================
            // TREE INSPECTION VIEW
            // ==========================================
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button variant="outline" size="sm" onClick={() => setSelectedRoot(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to User List
              </Button>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                    <User size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedRoot.full_name || selectedRoot.username}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" className="bg-primary/80 hover:bg-primary/80">Root User</Badge>
                      <span className="text-sm text-muted-foreground">{selectedRoot.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingTree ? (
                <div className="py-12 text-center text-sm text-muted-foreground animate-pulse border rounded-xl">
                  Constructing network tree...
                </div>
              ) : networkTree.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Network className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-foreground">No Downline Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">This partner currently has no direct children in their network.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {networkTree.map(l1Node => (
                    <Card key={l1Node.id} className="overflow-hidden shadow-sm hover:shadow transition-shadow">
                      <CardHeader className="bg-muted/30 border-b pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <span className="font-bold text-primary text-sm">1</span>
                            </div>
                            <div>
                              <CardTitle className="text-base">{l1Node.username}'s Branch</CardTitle>
                              <CardDescription>{l1Node.role}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-background">Level 1 Direct</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-4 sm:pt-6 pt-4 bg-gradient-to-b from-transparent to-muted/10">
                        {l1Node.children.length > 0 ? (
                          <div className="pl-2 sm:pl-0">
                            {l1Node.children.map(child => (
                              <TreeNode key={child.id} node={child} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground px-4 sm:px-0">No further downline in this branch.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SECURE PARTNER PROFILE FALLBACK MODAL */}
      <Dialog open={!!viewProfileUser} onOpenChange={(open) => !open && setViewProfileUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Partner Profile</DialogTitle>
            <DialogDescription>
              Account summary and assignment details.
            </DialogDescription>
          </DialogHeader>
          
          {viewProfileUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Partner</span>
                <div className="col-span-2 flex flex-col">
                  <span className="text-sm font-semibold">{viewProfileUser.full_name || viewProfileUser.username}</span>
                  {viewProfileUser.full_name && <span className="text-xs text-muted-foreground">{viewProfileUser.username}</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">User ID</span>
                <span className="col-span-2 text-sm">{viewProfileUser.username}</span>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">System Role</span>
                <span className="col-span-2 text-sm capitalize">{viewProfileUser.role}</span>
              </div>

              <div className="grid grid-cols-3 items-center gap-4 border-t pt-4">
                <span className="text-sm font-medium text-muted-foreground">Position</span>
                <span className="col-span-2 text-sm font-medium">
                  {assignmentsMap.get(viewProfileUser.id) ? formatRole(viewProfileUser.role) : "Unassigned"}
                </span>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <UserCog className="h-4 w-4 text-foreground" />
                  <p className="font-semibold text-foreground">Secure Account Access</p>
                </div>
                <p className="text-xs leading-relaxed">
                  Direct dashboard impersonation is currently disabled to maintain strict session security. Future implementation of secure access will require backend token generation.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewProfileUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}