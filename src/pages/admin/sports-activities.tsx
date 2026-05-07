import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Activity, 
  Plus, 
  Search, 
  Dumbbell, 
  Gamepad2, 
  Pencil, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";

interface SportActivity {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export default function SportsActivitiesAdmin() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<SportActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "sport" });
  const [selectedActivity, setSelectedActivity] = useState<SportActivity | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/admin/login');
        return;
      }
      setAuthChecked(true);
      fetchActivities();
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_activities')
        .select('*')
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching activities",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('sports_activities')
        .insert([{ name: formData.name.trim(), type: formData.type, is_active: true }]);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Activity added successfully.",
      });
      setIsAddModalOpen(false);
      setFormData({ name: "", type: "sport" });
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error adding activity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedActivity || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('sports_activities')
        .update({ name: formData.name.trim(), type: formData.type })
        .eq('id', selectedActivity.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Activity updated successfully.",
      });
      setIsEditModalOpen(false);
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error updating activity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity || deleteConfirmText !== selectedActivity.name) return;
    setIsSubmitting(true);
    try {
      // Soft Delete: update is_active to false instead of deleting row
      const { error } = await supabase
        .from('sports_activities')
        .update({ is_active: false })
        .eq('id', selectedActivity.id);
        
      if (error) throw error;
      
      toast({
        title: "Deleted",
        description: `${selectedActivity.name} has been removed.`,
      });
      setIsDeleteModalOpen(false);
      setDeleteConfirmText("");
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "Error deleting activity",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: SportActivity) => {
    setSelectedActivity(item);
    setFormData({ name: item.name, type: item.type });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (item: SportActivity) => {
    setSelectedActivity(item);
    setDeleteConfirmText("");
    setIsDeleteModalOpen(true);
  };

  const filteredActivities = activities.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authChecked) return null;

  return (
    <>
      <SEO title="Sports & Activities | Admin Dashboard" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-rose-50/30 dark:from-background dark:via-background/95 dark:to-background pb-12">
        
        {/* Header */}
        <header className="bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <Link href="/admin">
                  <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold font-heading flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Activity className="h-5 w-5 text-pink-600 dark:text-pink-500" />
                Sports & Activities
              </h1>
            </div>
            <div>
              <Button 
                onClick={() => {
                  setFormData({ name: "", type: "sport" });
                  setIsAddModalOpen(true);
                }}
                className="bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-500/20 transition-all font-bold rounded-full px-4 sm:px-6"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Add Sport / Activity</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          
          {/* Search */}
          <div className="mb-8 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search sports & activities..." 
              className="pl-9 h-12 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus-visible:ring-pink-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mb-4"></div>
              <p className="text-muted-foreground font-medium">Loading sports and activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card className="shadow-sm border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-card/50 rounded-3xl">
              <CardContent className="py-24 text-center flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8 text-pink-500 dark:text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No sports or activities added yet</h3>
                <p className="text-muted-foreground font-medium mb-6 max-w-sm">
                  {searchQuery ? "No results match your search." : "Get started by adding your first sport or activity to the master list."}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => {
                      setFormData({ name: "", type: "sport" });
                      setIsAddModalOpen(true);
                    }}
                    className="bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold px-8 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sport / Activity
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredActivities.map((item) => (
                <Card 
                  key={item.id} 
                  className="group relative shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/90 dark:bg-card/90 hover:shadow-md hover:border-pink-300 dark:hover:border-pink-800 transition-all duration-300"
                >
                  {/* Decorative top border */}
                  <div className={`h-1.5 w-full ${item.type === 'sport' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${item.type === 'sport' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                        {item.type === 'sport' ? <Dumbbell className="h-5 w-5" /> : <Gamepad2 className="h-5 w-5" />}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-full"
                          onClick={() => openDeleteModal(item)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 line-clamp-1 mb-1" title={item.name}>
                      {item.name}
                    </h3>
                    
                    <Badge variant="outline" className={`capitalize text-xs font-semibold ${item.type === 'sport' ? 'border-blue-200 text-blue-700 bg-blue-50/50 dark:border-blue-900/50 dark:text-blue-400 dark:bg-blue-900/10' : 'border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:border-emerald-900/50 dark:text-emerald-400 dark:bg-emerald-900/10'}`}>
                      {item.type}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Sport / Activity</DialogTitle>
            <DialogDescription>
              Add a new item to the master list. This will be available for partner selection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Cricket, Yoga, Chess" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-semibold">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleAdd} disabled={!formData.name.trim() || isSubmitting} className="rounded-xl font-bold bg-pink-600 hover:bg-pink-700 text-white">
              {isSubmitting ? "Adding..." : "Add to List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Item</DialogTitle>
            <DialogDescription>
              Update the name or type of this sport or activity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-semibold">Name</Label>
              <Input 
                id="edit-name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type" className="text-sm font-semibold">Type</Label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="sport">Sport</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim() || isSubmitting} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-rose-200 dark:border-rose-900">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            </div>
            <DialogTitle className="text-xl text-center text-rose-600 dark:text-rose-500">Delete Record</DialogTitle>
            <DialogDescription className="text-center pt-2">
              This action will remove <strong>{selectedActivity?.name}</strong> from the active list. Existing references to this activity will remain intact.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            <Label htmlFor="confirm-delete" className="text-sm text-center">
              Please type <strong className="select-none text-foreground">{selectedActivity?.name}</strong> to confirm.
            </Label>
            <Input 
              id="confirm-delete" 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="rounded-xl h-11 text-center font-bold text-rose-600 focus-visible:ring-rose-500"
              autoComplete="off"
            />
          </div>
          
          <DialogFooter className="sm:justify-center flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl font-bold w-full">Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleDelete} 
              disabled={deleteConfirmText !== selectedActivity?.name || isSubmitting} 
              className="rounded-xl font-bold w-full bg-rose-600 hover:bg-rose-700"
            >
              {isSubmitting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}