import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Activity, Plus, Trash2, Dumbbell, FolderTree, ArrowRight } from "lucide-react";

interface SportActivity {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface SportSkill {
  id: string;
  sport_activity_id: string;
  name: string;
  is_active: boolean;
}

export default function SportsActivities() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<SportActivity[]>([]);
  const [skills, setSkills] = useState<SportSkill[]>([]);

  const [currentView, setCurrentView] = useState<"list" | "detail">("list");
  const [selectedItem, setSelectedItem] = useState<SportActivity | null>(null);

  // Modals
  const [isAddSportOpen, setIsAddSportOpen] = useState(false);
  const [newSportName, setNewSportName] = useState("");
  const [newSportType, setNewSportType] = useState("sport");
  const [isAddingSport, setIsAddingSport] = useState(false);

  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // 1. Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
          
        if (!profile || profile.role !== "admin") {
          router.replace("/partner/login");
          return;
        }
        setAuthChecked(true);
      } catch (err) {
        console.error("Auth error", err);
        router.replace("/admin/login");
      }
    };
    checkAuth();
  }, [router]);

  // 2. Fetch Active Sports & Activities
  const fetchSports = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("sports_activities")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching sports/activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      fetchSports();
    }
  }, [authChecked]);

  // 3. Fetch Skills for Detail View
  const fetchSkills = async (sportId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("sports_activity_skills")
        .select("*")
        .eq("sport_activity_id", sportId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setSkills(data || []);
    } catch (err) {
      console.error("Error fetching skills:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add Sport/Activity
  const handleAddSport = async () => {
    if (!newSportName.trim()) return;
    setIsAddingSport(true);
    try {
      const { error } = await (supabase as any).from("sports_activities").insert({
        name: newSportName.trim(),
        type: newSportType,
        is_active: true
      });
      if (error) throw error;
      
      setNewSportName("");
      setNewSportType("sport");
      setIsAddSportOpen(false);
      await fetchSports();
    } catch (err) {
      console.error("Failed to add sport/activity:", err);
      alert("Failed to add record. Please try again.");
    } finally {
      setIsAddingSport(false);
    }
  };

  // Soft Delete Sport/Activity
  const handleDeleteSport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    
    try {
      const { error } = await (supabase as any)
        .from("sports_activities")
        .update({ is_active: false })
        .eq("id", id);
        
      if (error) throw error;
      await fetchSports();
    } catch (err) {
      console.error("Failed to remove sport/activity:", err);
      alert("Failed to remove record.");
    }
  };

  // Navigate to Detail View
  const handleViewDetail = (item: SportActivity) => {
    setSelectedItem(item);
    setCurrentView("detail");
    fetchSkills(item.id);
  };

  // Add Skill
  const handleAddSkill = async () => {
    if (!newSkillName.trim() || !selectedItem) return;
    setIsAddingSkill(true);
    try {
      const { error } = await (supabase as any).from("sports_activity_skills").insert({
        sport_activity_id: selectedItem.id,
        name: newSkillName.trim(),
        is_active: true
      });
      if (error) throw error;
      
      setNewSkillName("");
      setIsAddSkillOpen(false);
      await fetchSkills(selectedItem.id);
    } catch (err) {
      console.error("Failed to add skill:", err);
      alert("Failed to add skill. Please try again.");
    } finally {
      setIsAddingSkill(false);
    }
  };

  // Soft Delete Skill
  const handleDeleteSkill = async (id: string) => {
    if (!selectedItem) return;
    if (!window.confirm("Are you sure you want to remove this skill/sub-activity?")) return;
    
    try {
      const { error } = await (supabase as any)
        .from("sports_activity_skills")
        .update({ is_active: false })
        .eq("id", id);
        
      if (error) throw error;
      await fetchSkills(selectedItem.id);
    } catch (err) {
      console.error("Failed to remove skill:", err);
      alert("Failed to remove record.");
    }
  };

  if (!authChecked) return null;

  return (
    <>
      <Head>
        <title>Sports & Activities | Admin | SAG Network</title>
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-orange-50/30 dark:from-background dark:via-background/95 dark:to-background text-foreground pb-12">
        {/* Header */}
        <header className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => currentView === 'list' ? router.push('/admin') : setCurrentView('list')} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <h1 className="text-xl font-bold font-heading flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Activity className="h-5 w-5 text-pink-600 dark:text-pink-500" />
                {currentView === 'list' ? 'Sports & Activities' : selectedItem?.name}
              </h1>
            </div>
            
            {/* Top Right Action Button */}
            <div className="flex items-center">
              {currentView === 'list' ? (
                <Button 
                  onClick={() => setIsAddSportOpen(true)} 
                  className="shadow-sm font-bold bg-pink-600 hover:bg-pink-700 text-white transition-all rounded-full px-4 sm:px-5"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Add Sport / Activity</span>
                  <span className="sm:hidden">Add New</span>
                </Button>
              ) : (
                <Button 
                  onClick={() => setIsAddSkillOpen(true)} 
                  className="shadow-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all rounded-full px-4 sm:px-5"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Add Skill / Sub Activity</span>
                  <span className="sm:hidden">Add Skill</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
          
          {/* VIEW: MAIN LIST */}
          {currentView === 'list' && (
            <div className="space-y-6">
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mb-4"></div>
                  <p className="text-muted-foreground font-medium">Loading records...</p>
                </div>
              ) : items.length === 0 ? (
                <Card className="shadow-sm border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-card/50 rounded-2xl">
                  <CardContent className="py-20 text-center flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-4">
                      <Activity className="h-8 w-8 text-pink-500 dark:text-pink-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No sports or activities added yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mb-6">Create the master list of sports and activities available for partners and users.</p>
                    <Button onClick={() => setIsAddSportOpen(true)} className="bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold">
                      <Plus className="h-4 w-4 mr-2" /> Add First Record
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((item) => (
                    <Card 
                      key={item.id} 
                      onClick={() => handleViewDetail(item)}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-200/80 dark:border-slate-800/80 overflow-hidden bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-2xl hover:-translate-y-1 relative"
                    >
                      <div className={`h-1.5 w-full ${item.type === 'sport' ? 'bg-gradient-to-r from-orange-400 to-pink-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}></div>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant="secondary" className={`${item.type === 'sport' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'} font-bold uppercase tracking-wider text-[10px] px-2 py-0.5`}>
                            {item.type}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleDeleteSport(e, item.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors -mr-2 -mt-2 opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 pr-4 line-clamp-2 leading-tight">
                          {item.name}
                        </h3>
                        <div className="mt-4 flex items-center text-sm font-medium text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300">
                          Manage Skills <ArrowRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: DETAIL (SKILLS) */}
          {currentView === 'detail' && selectedItem && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-white/60 dark:bg-card/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-sm">
                <div className={`p-3 rounded-xl ${selectedItem.type === 'sport' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50'}`}>
                  {selectedItem.type === 'sport' ? <Dumbbell className="h-6 w-6" /> : <FolderTree className="h-6 w-6" />}
                </div>
                <div>
                  <Badge variant="outline" className="mb-1 uppercase text-[10px] font-bold tracking-widest">{selectedItem.type}</Badge>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedItem.name}</h2>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                  <p className="text-muted-foreground font-medium">Loading skills...</p>
                </div>
              ) : skills.length === 0 ? (
                <Card className="shadow-sm border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-card/50 rounded-2xl mt-4">
                  <CardContent className="py-16 text-center flex flex-col items-center justify-center">
                    <FolderTree className="h-10 w-10 text-emerald-200 dark:text-emerald-900 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">No skills or sub-activities added</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mb-6">Add specific competencies or variations under this category.</p>
                    <Button onClick={() => setIsAddSkillOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold">
                      <Plus className="h-4 w-4 mr-2" /> Add Skill
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {skills.map(skill => (
                    <div key={skill.id} className="group bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{skill.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Add Sport/Activity Modal */}
      <Dialog open={isAddSportOpen} onOpenChange={setIsAddSportOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Sport / Activity</DialogTitle>
            <DialogDescription>
              Create a new master record for the network.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sport-name">Name</Label>
              <Input
                id="sport-name"
                placeholder="e.g. Cricket, Yoga, Chess"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                disabled={isAddingSport}
                className="bg-slate-50 dark:bg-slate-900 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport-type">Type</Label>
              <Select value={newSportType} onValueChange={setNewSportType} disabled={isAddingSport}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSportOpen(false)} disabled={isAddingSport} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddSport} disabled={isAddingSport || !newSportName.trim()} className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl">
              {isAddingSport ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Skill Modal */}
      <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Skill / Sub Activity</DialogTitle>
            <DialogDescription>
              Add a new skill under <strong>{selectedItem?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                placeholder="e.g. Fast Bowling, Vinyasa, Opening Openings"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                disabled={isAddingSkill}
                className="bg-slate-50 dark:bg-slate-900 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSkillOpen(false)} disabled={isAddingSkill} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={isAddingSkill || !newSkillName.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              {isAddingSkill ? "Saving..." : "Save Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}