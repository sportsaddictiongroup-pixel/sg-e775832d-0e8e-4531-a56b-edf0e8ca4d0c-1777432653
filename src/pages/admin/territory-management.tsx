import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MapPin, 
  Map, 
  Users, 
  Building, 
  Layers, 
  UserPlus, 
  UserCog, 
  UserMinus, 
  ShieldAlert, 
  UserCheck,
  ArrowLeft
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { authService } from "@/services/authService";
import {
  locationService,
  type Country,
  type State,
  type District,
  type Pincode,
  type Location,
} from "@/services/locationService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AssignmentInfo {
  profileId: string;
  username: string;
}

export default function TerritoryManagement(): JSX.Element {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core Data State
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Filter State
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedPincodeId, setSelectedPincodeId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // UI State
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("state");

  // Assignment Data Maps
  const [stateAssignments, setStateAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [districtAssignments, setDistrictAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [pincodeAssignments, setPincodeAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [locationAssignments, setLocationAssignments] = useState<Record<string, AssignmentInfo>>({});

  // Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalData, setAssignModalData] = useState<any>(null);
  const [partners, setPartners] = useState<{ id: string; username: string }[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // Unassign Modal State
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [unassignModalData, setUnassignModalData] = useState<any>(null);
  const [isSubmittingUnassign, setIsSubmittingUnassign] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        setAuthError("Unable to load your profile. Please try again.");
        setAuthLoading(false);
        return;
      }

      const profile = data as Profile;
      if (profile.role !== "admin") {
        await authService.signOut();
        router.replace("/partner/login");
        return;
      }

      const loadedCountries = await locationService.getCountries();
      if (!isMounted) return;

      setCountries(loadedCountries);
      setAuthError(null);
      setAuthLoading(false);
    };

    void init();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // --- DATA LOADING HELPERS ---

  const loadStateAssignments = async (items: State[]) => {
    if (!items.length) return setStateAssignments({});

    const ids = items.map((item) => item.id as string).filter(Boolean);
    if (!ids.length) return setStateAssignments({});

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("state_id, profile_id")
      .in("state_id", ids)
      .is("district_id", null)
      .is("pincode_id", null)
      .is("location_id", null);

    if (error || !assignments) return setStateAssignments({});

    const profileIds = Array.from(new Set(assignments.map((a) => a.profile_id as string).filter(Boolean)));
    if (!profileIds.length) return setStateAssignments({});

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", profileIds);

    if (!profilesData) return setStateAssignments({});

    const profilesMap = new Map(profilesData.map((p) => [p.id as string, p]));
    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const stateId = assignment.state_id as string;
      const profileId = assignment.profile_id as string;
      if (!stateId || !profileId) continue;

      const profile = profilesMap.get(profileId);
      if (profile) {
        map[stateId] = { profileId, username: (profile.username as string) ?? "" };
      }
    }
    setStateAssignments(map);
  };

  const loadDistrictAssignments = async (items: District[]) => {
    if (!items.length) return setDistrictAssignments({});

    const ids = items.map((item) => item.id as string).filter(Boolean);
    if (!ids.length) return setDistrictAssignments({});

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("district_id, profile_id")
      .in("district_id", ids)
      .is("pincode_id", null)
      .is("location_id", null);

    if (error || !assignments) return setDistrictAssignments({});

    const profileIds = Array.from(new Set(assignments.map((a) => a.profile_id as string).filter(Boolean)));
    if (!profileIds.length) return setDistrictAssignments({});

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", profileIds);

    if (!profilesData) return setDistrictAssignments({});

    const profilesMap = new Map(profilesData.map((p) => [p.id as string, p]));
    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const districtId = assignment.district_id as string;
      const profileId = assignment.profile_id as string;
      if (!districtId || !profileId) continue;

      const profile = profilesMap.get(profileId);
      if (profile) {
        map[districtId] = { profileId, username: (profile.username as string) ?? "" };
      }
    }
    setDistrictAssignments(map);
  };

  const loadPincodeAssignments = async (items: Pincode[]) => {
    if (!items.length) return setPincodeAssignments({});

    const ids = items.map((item) => item.id as string).filter(Boolean);
    if (!ids.length) return setPincodeAssignments({});

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("pincode_id, profile_id")
      .in("pincode_id", ids)
      .is("location_id", null);

    if (error || !assignments) return setPincodeAssignments({});

    const profileIds = Array.from(new Set(assignments.map((a) => a.profile_id as string).filter(Boolean)));
    if (!profileIds.length) return setPincodeAssignments({});

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", profileIds);

    if (!profilesData) return setPincodeAssignments({});

    const profilesMap = new Map(profilesData.map((p) => [p.id as string, p]));
    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const pincodeId = assignment.pincode_id as string;
      const profileId = assignment.profile_id as string;
      if (!pincodeId || !profileId) continue;

      const profile = profilesMap.get(profileId);
      if (profile) {
        map[pincodeId] = { profileId, username: (profile.username as string) ?? "" };
      }
    }
    setPincodeAssignments(map);
  };

  const loadLocationAssignments = async (items: Location[]) => {
    if (!items.length) return setLocationAssignments({});

    const ids = items.map((item) => item.id as string).filter(Boolean);
    if (!ids.length) return setLocationAssignments({});

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("location_id, profile_id")
      .in("location_id", ids);

    if (error || !assignments) return setLocationAssignments({});

    const profileIds = Array.from(new Set(assignments.map((a) => a.profile_id as string).filter(Boolean)));
    if (!profileIds.length) return setLocationAssignments({});

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", profileIds);

    if (!profilesData) return setLocationAssignments({});

    const profilesMap = new Map(profilesData.map((p) => [p.id as string, p]));
    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const locationId = assignment.location_id as string;
      const profileId = assignment.profile_id as string;
      if (!locationId || !profileId) continue;

      const profile = profilesMap.get(profileId);
      if (profile) {
        map[locationId] = { profileId, username: (profile.username as string) ?? "" };
      }
    }
    setLocationAssignments(map);
  };

  // --- EVENT HANDLERS ---

  const handleSelectCountry = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedStateId("");
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setTableSearch("");
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setStateAssignments({});
    setDistrictAssignments({});
    setPincodeAssignments({});
    setLocationAssignments({});
    setActiveTab("state"); // Auto-switch to newly populated level

    if (!countryId) return;

    const loadedStates = await locationService.getStatesByCountry(countryId);
    setStates(loadedStates);
    await loadStateAssignments(loadedStates);
  };

  const handleSelectState = async (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setTableSearch("");
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setDistrictAssignments({});
    setPincodeAssignments({});
    setLocationAssignments({});
    setActiveTab("district");

    if (!stateId) return;

    const loadedDistricts = await locationService.getDistrictsByState(stateId);
    setDistricts(loadedDistricts);
    await loadDistrictAssignments(loadedDistricts);
  };

  const handleSelectDistrict = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setTableSearch("");
    setPincodes([]);
    setLocations([]);
    setPincodeAssignments({});
    setLocationAssignments({});
    setActiveTab("pincode");

    if (!districtId) return;

    const loadedPincodes = await locationService.getPincodesByDistrict(districtId);
    setPincodes(loadedPincodes);
    await loadPincodeAssignments(loadedPincodes);
  };

  const handleSelectPincode = async (pincodeId: string) => {
    setSelectedPincodeId(pincodeId);
    setSelectedLocationId("");
    setTableSearch("");
    setLocations([]);
    setLocationAssignments({});
    setActiveTab("location");

    if (!pincodeId) return;

    const loadedLocations = await locationService.getLocationsByPincode(pincodeId);
    setLocations(loadedLocations);
    await loadLocationAssignments(loadedLocations);
  };

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setTableSearch("");
  };

  const loadPartners = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username");
    if (data) setPartners(data);
  };

  // --- MODAL LOGIC ---

  const openAssignModal = (
    item: any,
    positionName: string,
    positionType: string,
    levelColumn: string,
    createUrl: string,
    isAssigned: boolean,
    assignment?: AssignmentInfo
  ) => {
    setAssignModalData({
      territoryId: item.id,
      territoryName: item.name || item.code,
      positionName,
      positionType,
      levelColumn,
      createUrl,
      isAssigned,
      currentUsername: assignment?.username,
      currentProfileId: assignment?.profileId,
    });
    setSelectedPartnerId("");
    setPartnerSearch("");
    setIsAssignModalOpen(true);
    if (partners.length === 0) {
      void loadPartners();
    }
  };

  const handleAssignPartner = async () => {
    if (!selectedPartnerId || !assignModalData) return;
    setIsSubmittingAssignment(true);

    const { territoryId, levelColumn } = assignModalData;

    try {
      let query = (supabase.from("territory_assignments") as any)
        .select("id")
        .eq(levelColumn, territoryId);

      if (levelColumn === 'state_id') query = query.is('district_id', null).is('pincode_id', null).is('location_id', null);
      if (levelColumn === 'district_id') query = query.is('pincode_id', null).is('location_id', null);
      if (levelColumn === 'pincode_id') query = query.is('location_id', null);

      const { data: existing, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      let dbError;

      if (existing) {
        const { error: updateError } = await (supabase.from("territory_assignments") as any)
          .update({ profile_id: selectedPartnerId })
          .eq("id", existing.id);
        dbError = updateError;
      } else {
        const payload: any = {
          profile_id: selectedPartnerId,
          country_id: selectedCountryId || null,
          state_id: null,
          district_id: null,
          pincode_id: null,
          location_id: null
        };

        if (levelColumn === 'state_id') {
          payload.state_id = territoryId;
        } else if (levelColumn === 'district_id') {
          payload.state_id = selectedStateId || null;
          payload.district_id = territoryId;
        } else if (levelColumn === 'pincode_id') {
          payload.state_id = selectedStateId || null;
          payload.district_id = selectedDistrictId || null;
          payload.pincode_id = territoryId;
        } else if (levelColumn === 'location_id') {
          payload.state_id = selectedStateId || null;
          payload.district_id = selectedDistrictId || null;
          payload.pincode_id = selectedPincodeId || null;
          payload.location_id = territoryId;
        }

        const { error: insertError } = await (supabase.from("territory_assignments") as any)
          .insert(payload);
        dbError = insertError;
      }

      if (dbError) throw dbError;

      setIsAssignModalOpen(false);

      if (levelColumn === "state_id") void loadStateAssignments(states);
      if (levelColumn === "district_id") void loadDistrictAssignments(districts);
      if (levelColumn === "pincode_id") void loadPincodeAssignments(pincodes);
      if (levelColumn === "location_id") void loadLocationAssignments(locations);

    } catch (err: any) {
      console.error("Assignment save failed:", err);
      alert(`Failed to assign partner: ${err.message || err.details || "Unknown database error"}`);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const openUnassignModal = (item: any, levelColumn: string, assignment: AssignmentInfo) => {
    setUnassignModalData({
      territoryId: item.id,
      territoryName: item.name || item.code,
      levelColumn,
      username: assignment.username
    });
    setIsUnassignModalOpen(true);
  };

  const handleUnassignPartner = async () => {
    if (!unassignModalData) return;
    setIsSubmittingUnassign(true);
    const { territoryId, levelColumn } = unassignModalData;

    try {
      let query = (supabase.from("territory_assignments") as any)
        .delete()
        .eq(levelColumn, territoryId);

      if (levelColumn === 'state_id') {
        query = query.is('district_id', null).is('pincode_id', null).is('location_id', null);
      } else if (levelColumn === 'district_id') {
        query = query.is('pincode_id', null).is('location_id', null);
      } else if (levelColumn === 'pincode_id') {
        query = query.is('location_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      setIsUnassignModalOpen(false);

      if (levelColumn === "state_id") void loadStateAssignments(states);
      if (levelColumn === "district_id") void loadDistrictAssignments(districts);
      if (levelColumn === "pincode_id") void loadPincodeAssignments(pincodes);
      if (levelColumn === "location_id") void loadLocationAssignments(locations);

    } catch (err: any) {
      console.error("Unassign failed:", err);
      alert(`Failed to unassign partner: ${err.message || err.details || "Unknown database error"}`);
    } finally {
      setIsSubmittingUnassign(false);
    }
  };

  // --- UI RENDERING ---

  const getSummaryStats = () => {
    let total = 0;
    let assigned = 0;

    if (activeTab === "state" && selectedCountryId) {
      total = states.length;
      assigned = Object.keys(stateAssignments).length;
    } else if (activeTab === "district" && selectedStateId) {
      total = districts.length;
      assigned = Object.keys(districtAssignments).length;
    } else if (activeTab === "pincode" && selectedDistrictId) {
      total = pincodes.length;
      assigned = Object.keys(pincodeAssignments).length;
    } else if (activeTab === "location" && selectedPincodeId) {
      total = locations.length;
      assigned = Object.keys(locationAssignments).length;
    }

    return { total, assigned, vacant: total - assigned };
  };

  const renderTabContent = (
    items: any[],
    assignmentsMap: Record<string, AssignmentInfo>,
    positionName: string,
    positionType: string,
    levelColumn: string,
    getCreateUrl: (item: any) => string,
    dependencyId: string,
    dependencyName: string
  ) => {
    if (!dependencyId) {
      return (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background border shadow-sm mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select a {dependencyName}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Please select a {dependencyName} from the hierarchy filters above to view and manage {positionName} assignments.
            </p>
          </CardContent>
        </Card>
      );
    }

    const filtered = items.filter((item) => {
      if (!tableSearch) return true;
      const assignment = assignmentsMap[item.id as string];
      if (!assignment || !assignment.username) return false;
      return assignment.username.toLowerCase().includes(tableSearch.toLowerCase());
    });

    return (
      <Card className="shadow-sm border-muted animate-in fade-in duration-300">
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b bg-muted/10">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {positionName} Assignments
            </CardTitle>
            <CardDescription className="mt-1">
              Manage partners assigned to territories at this level.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assigned partner..."
              className="pl-9 bg-background"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No territories found.</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust your search or filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[30%] h-12">Territory Name</TableHead>
                    <TableHead className="w-[20%] h-12">Status</TableHead>
                    <TableHead className="w-[25%] h-12">Assigned Partner</TableHead>
                    <TableHead className="text-right w-[25%] pr-6 h-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const assignment = assignmentsMap[item.id as string];
                    const isAssigned = !!assignment;

                    return (
                      <TableRow key={item.id as string} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Building className="h-4 w-4 text-primary" />
                            </div>
                            {item.name || item.code}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isAssigned ? (
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border border-emerald-200/30">
                              Assigned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground bg-muted/50 border-dashed">
                              Vacant
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {assignment.username.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{assignment.username}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground/60 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isAssigned ? (
                            <div className="flex justify-end items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 shadow-sm"
                                onClick={() => openAssignModal(
                                  item,
                                  positionName,
                                  positionType,
                                  levelColumn,
                                  getCreateUrl(item),
                                  isAssigned,
                                  assignment
                                )}
                              >
                                <UserCog className="h-4 w-4 mr-2" />
                                Change
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Unassign"
                                onClick={() => openUnassignModal(item, levelColumn, assignment)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 shadow-sm bg-primary/90 hover:bg-primary"
                              onClick={() => openAssignModal(
                                item,
                                positionName,
                                positionType,
                                levelColumn,
                                getCreateUrl(item),
                                isAssigned,
                                assignment
                              )}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign
                            </Button>
                          )}
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
    );
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground animate-pulse">Checking your access...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <p className="text-sm text-destructive font-medium" role="alert">{authError}</p>
      </main>
    );
  }

  const stats = getSummaryStats();

  return (
    <>
      <SEO title="Territory Management" description="Manage hierarchical territory assignments." />
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
          
          <header className="space-y-2 pb-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Admin Portal</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">Territory Management</h1>
            <p className="text-sm text-muted-foreground">
              Filter geographies below and use the role tabs to manage position assignments across your network.
            </p>
          </header>

          {/* ACTIVE SUMMARY STRIP */}
          <div className="grid gap-4 md:grid-cols-3 mb-2">
            <Card className="bg-primary/5 border-primary/10 shadow-none">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Territories</p>
                  <p className="text-2xl font-bold text-foreground leading-none">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100 shadow-none dark:bg-emerald-950/20 dark:border-emerald-900">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700 shrink-0 dark:bg-emerald-900 dark:text-emerald-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700/70 uppercase tracking-wider mb-1 dark:text-emerald-500">Assigned Seats</p>
                  <p className="text-2xl font-bold text-emerald-700 leading-none dark:text-emerald-400">{stats.assigned}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-100 shadow-none dark:bg-orange-950/20 dark:border-orange-900">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl text-orange-700 shrink-0 dark:bg-orange-900 dark:text-orange-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-700/70 uppercase tracking-wider mb-1 dark:text-orange-500">Vacant Seats</p>
                  <p className="text-2xl font-bold text-orange-700 leading-none dark:text-orange-400">{stats.vacant}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HIERARCHY FILTERS */}
          <Card className="shadow-sm border-muted">
            <CardHeader className="pb-4 border-b bg-muted/10">
              <CardTitle className="text-base">Hierarchy Context Filters</CardTitle>
              <CardDescription>Select geographies from top to bottom to drill down.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country</span>
                  <Select value={selectedCountryId || undefined} onValueChange={handleSelectCountry}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={String(country.id)}>{country.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</span>
                  <Select value={selectedStateId || undefined} onValueChange={handleSelectState} disabled={!selectedCountryId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={String(state.id)}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">District</span>
                  <Select value={selectedDistrictId || undefined} onValueChange={handleSelectDistrict} disabled={!selectedStateId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district.id} value={String(district.id)}>{district.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PIN Code</span>
                  <Select value={selectedPincodeId || undefined} onValueChange={handleSelectPincode} disabled={!selectedDistrictId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pincodes.map((pincode) => (
                        <SelectItem key={pincode.id} value={String(pincode.id)}>{pincode.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location / Area</span>
                  <Select value={selectedLocationId || undefined} onValueChange={handleSelectLocation} disabled={!selectedPincodeId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ROLE TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-muted/60 border rounded-lg">
              <TabsTrigger value="state" className="py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
                State Heads
              </TabsTrigger>
              <TabsTrigger value="district" className="py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
                District Heads
              </TabsTrigger>
              <TabsTrigger value="pincode" className="py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
                PIN Code Heads
              </TabsTrigger>
              <TabsTrigger value="location" className="py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
                PIN Code Partners
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="state" className="m-0 focus-visible:outline-none">
              {renderTabContent(
                states, 
                stateAssignments, 
                "State Head", 
                "state_head", 
                "state_id", 
                (item) => `/admin/partners/create?role=state_head&countryId=${selectedCountryId}&stateId=${item.id}`, 
                selectedCountryId, 
                "Country"
              )}
            </TabsContent>

            <TabsContent value="district" className="m-0 focus-visible:outline-none">
              {renderTabContent(
                districts, 
                districtAssignments, 
                "District Head", 
                "district_head", 
                "district_id", 
                (item) => `/admin/partners/create?role=district_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${item.id}`, 
                selectedStateId, 
                "State"
              )}
            </TabsContent>

            <TabsContent value="pincode" className="m-0 focus-visible:outline-none">
              {renderTabContent(
                pincodes, 
                pincodeAssignments, 
                "PIN Code Head", 
                "pincode_head", 
                "pincode_id", 
                (item) => `/admin/partners/create?role=pincode_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${item.id}`, 
                selectedDistrictId, 
                "District"
              )}
            </TabsContent>

            <TabsContent value="location" className="m-0 focus-visible:outline-none">
              {renderTabContent(
                locations, 
                locationAssignments, 
                "Area Head", 
                "pincode_partner", 
                "location_id", 
                (item) => `/admin/partners/create?role=pincode_partner&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${selectedPincodeId}&locationId=${item.id}`, 
                selectedPincodeId, 
                "PIN Code"
              )}
            </TabsContent>
          </Tabs>

        </div>
      </main>

      {/* ASSIGN MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">{assignModalData?.isAssigned ? "Change Partner" : "Assign Partner"}</DialogTitle>
            <DialogDescription className="mt-1.5">
              Select an existing partner to assign to this territory position.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-5">
            <div className="grid grid-cols-[100px_1fr] items-center gap-3 bg-muted/40 p-4 rounded-lg border border-border/50">
              <span className="text-sm font-semibold text-muted-foreground">Territory:</span>
              <span className="text-sm font-bold text-foreground">{assignModalData?.territoryName}</span>
              
              <span className="text-sm font-semibold text-muted-foreground">Position:</span>
              <span className="text-sm font-bold text-foreground">{assignModalData?.positionName}</span>
            </div>

            {assignModalData?.isAssigned && (
              <div className="rounded-md bg-amber-50 border border-amber-100 p-4 dark:bg-amber-950/30 dark:border-amber-900">
                <p className="text-xs font-bold text-amber-700/70 uppercase tracking-wider mb-1 dark:text-amber-500">Current Assignment</p>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {assignModalData.currentUsername}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold">Select Partner</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partner by username..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose a partner from list..." />
                </SelectTrigger>
                <SelectContent>
                  {partners
                    .filter((p) => p.username?.toLowerCase().includes(partnerSearch.toLowerCase()))
                    .slice(0, 50)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {selectedPartnerId && (
                <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-primary/70 mb-0.5">Selected Preview</p>
                    <p className="text-sm font-bold text-primary">
                      {partners.find((p) => p.id === selectedPartnerId)?.username}
                    </p>
                  </div>
                  <UserCheck className="h-5 w-5 text-primary opacity-50" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-muted/30 p-4 border-t flex flex-col sm:flex-row sm:justify-between items-center gap-3">
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 text-muted-foreground h-auto font-medium hover:text-primary" 
              onClick={() => router.push(assignModalData?.createUrl || "")}
            >
              <UserPlus className="h-3 w-3 mr-1.5" />
              Create New Instead
            </Button>
            <div className="flex space-x-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
              <Button className="w-full sm:w-auto" onClick={handleAssignPartner} disabled={!selectedPartnerId || isSubmittingAssignment}>
                {isSubmittingAssignment ? "Saving..." : (assignModalData?.isAssigned ? "Confirm Change" : "Confirm Assign")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNASSIGN MODAL */}
      <Dialog open={isUnassignModalOpen} onOpenChange={setIsUnassignModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirm Unassign
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this partner from this territory? This action will leave the position vacant.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg bg-muted/50 border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Partner</p>
              <p className="text-sm font-bold mb-4">{unassignModalData?.username}</p>
              
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Territory</p>
              <p className="text-sm font-bold">{unassignModalData?.territoryName}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnassignModalOpen(false)} disabled={isSubmittingUnassign}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnassignPartner} disabled={isSubmittingUnassign}>
              {isSubmittingUnassign ? "Removing..." : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}