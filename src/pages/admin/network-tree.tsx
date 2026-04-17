import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, ChevronDown, User, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";

type NetworkNode = {
  id: string;
  username: string;
  role: string;
  level: number;
  children: NetworkNode[];
};

type ProfileBasic = {
  id: string;
  username: string;
  role: string;
};

const TreeNode = ({ node }: { node: NetworkNode }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative ml-4 mt-3">
      {/* Vertical connector line for children */}
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileBasic[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedRoot, setSelectedRoot] = useState<ProfileBasic | null>(null);
  const [networkTree, setNetworkTree] = useState<NetworkNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (data?.role !== "admin") {
        router.replace("/partner/login");
        return;
      }
      setAuthLoading(false);
    };
    void init();
    return () => { isMounted = false; };
  }, [router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, role')
      .ilike('username', `%${searchQuery.trim()}%`)
      .limit(15);
      
    if (!error && data) {
      setSearchResults(data as ProfileBasic[]);
    }
    setSearching(false);
  };

  const loadNetworkTree = async (rootUser: ProfileBasic) => {
    setSelectedRoot(rootUser);
    setSearchResults([]);
    setSearchQuery("");
    setLoadingTree(true);

    try {
      // LEVEL 1: Direct children
      const { data: l1 } = await supabase
        .from('profiles')
        .select('id, username, role, upline_profile_id')
        .eq('upline_profile_id', rootUser.id);
        
      if (!l1 || l1.length === 0) {
        setNetworkTree([]);
        return;
      }

      // LEVEL 2
      const l1Ids = l1.map(p => p.id);
      const { data: l2 } = await supabase
        .from('profiles')
        .select('id, username, role, upline_profile_id')
        .in('upline_profile_id', l1Ids);
      const l2Ids = l2?.map(p => p.id) || [];

      // LEVEL 3
      let l3: any[] = [];
      if (l2Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, role, upline_profile_id').in('upline_profile_id', l2Ids);
        l3 = data || [];
      }
      const l3Ids = l3.map(p => p.id);

      // LEVEL 4
      let l4: any[] = [];
      if (l3Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, role, upline_profile_id').in('upline_profile_id', l3Ids);
        l4 = data || [];
      }
      const l4Ids = l4.map(p => p.id);

      // LEVEL 5
      let l5: any[] = [];
      if (l4Ids.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, role, upline_profile_id').in('upline_profile_id', l4Ids);
        l5 = data || [];
      }

      // Recursively build the tree array up to max depth of 5
      const buildNodes = (nodes: any[], currentLevel: number, allData: any[][]): NetworkNode[] => {
        // Enforce strict 5-level cap
        if (currentLevel > 5) return [];
        
        // Retrieve the data array representing the next level down
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

      // allData array maps index to level data (index 0 = Level 2 data, index 1 = Level 3 data, etc.)
      const tree = buildNodes(l1, 1, [l2 || [], l3, l4, l5]);
      setNetworkTree(tree);
      
    } catch (err) {
      console.error("Failed to load network tree:", err);
    } finally {
      setLoadingTree(false);
    }
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
                ← Back to Dashboard
              </Link>
            </Button>
          </div>
          
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Portal</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold flex items-center gap-3">
              <Network className="h-7 w-7 text-primary" />
              Network Tree
            </h1>
            <p className="text-sm text-muted-foreground">Search for a partner to inspect their 5-level downline network.</p>
          </header>

          <Card className="border-primary/10 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Inspect Network</CardTitle>
              <CardDescription>Search by username to select the root of the tree.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Enter username..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-4 rounded-md border bg-card overflow-hidden max-w-md shadow-sm">
                  <div className="p-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    Search Results
                  </div>
                  <ul className="divide-y">
                    {searchResults.map(user => (
                      <li key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{user.username}</span>
                          <span className="text-xs text-muted-foreground">{user.role}</span>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => loadNetworkTree(user)}>
                          View Network
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {loadingTree && (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
              Constructing network tree...
            </div>
          )}

          {!loadingTree && selectedRoot && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Root Summary Card */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                    <User size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedRoot.username}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default" className="bg-primary/80 hover:bg-primary/80">Root User</Badge>
                      <span className="text-sm text-muted-foreground">{selectedRoot.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tree Branches Area */}
              {networkTree.length === 0 ? (
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
    </>
  );
}