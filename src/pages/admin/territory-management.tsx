import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedPincodeId, setSelectedPincodeId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [tableSearch, setTableSearch] = useState("");

  const [stateAssignments, setStateAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [districtAssignments, setDistrictAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [pincodeAssignments, setPincodeAssignments] = useState<Record<string, AssignmentInfo>>({});
  const [locationAssignments, setLocationAssignments] = useState<Record<string, AssignmentInfo>>({});

  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalData, setAssignModalData] = useState<any>(null);
  const [partners, setPartners] = useState<{ id: string; username: string }[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

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

  const loadStateAssignments = async (items: State[]) => {
    if (!items.length) return setStateAssignments({});

    const ids = items.map((item) => item.id as string).filter(Boolean);
    if (!ids.length) return setStateAssignments({});

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("state_id, profile_id")
      .eq("role", "state_head")
      .eq("is_active", true)
      .in("state_id", ids);

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
      .eq("role", "district_head")
      .eq("is_active", true)
      .in("district_id", ids);

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
      .eq("role", "pincode_head")
      .eq("is_active", true)
      .in("pincode_id", ids);

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
      .eq("role", "pincode_partner")
      .eq("is_active", true)
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

    const { territoryId, positionType, levelColumn } = assignModalData;

    // 1. Deactivate old assignments for this specific position and territory
    await supabase
      .from("territory_assignments")
      .update({ is_active: false })
      .eq(levelColumn as any, territoryId)
      .eq("role", positionType)
      .eq("is_active", true);

    // 2. Insert the new active assignment
    const payload: any = {
      profile_id: selectedPartnerId,
      role: positionType,
      is_active: true,
    };
    payload[levelColumn] = territoryId;

    const { error } = await (supabase.from("territory_assignments") as any)
      .insert(payload);

    setIsSubmittingAssignment(false);

    if (!error) {
      setIsAssignModalOpen(false);
      // Refresh the current view to show the new assignment
      if (levelColumn === "state_id") void loadStateAssignments(states);
      if (levelColumn === "district_id") void loadDistrictAssignments(districts);
      if (levelColumn === "pincode_id") void loadPincodeAssignments(pincodes);
      if (levelColumn === "location_id") void loadLocationAssignments(locations);
    } else {
      alert("Failed to assign partner. Please try again.");
    }
  };

  const renderTable = (
    title: string,
    description: string,
    items: any[],
    assignmentsMap: Record<string, AssignmentInfo>,
    positionName: string,
    positionType: string,
    levelColumn: string,
    getCreateUrl: (item: any) => string
  ) => {
    const filtered = items.filter((item) => {
      if (!tableSearch) return true;
      const assignment = assignmentsMap[item.id as string];
      if (!assignment || !assignment.username) return false;
      return assignment.username.toLowerCase().includes(tableSearch.toLowerCase());
    });

    return (
      <Card>
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assigned username..."
              className="pl-8"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No territories found matching your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Territory</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const assignment = assignmentsMap[item.id as string];
                  const isAssigned = !!assignment;

                  return (
                    <TableRow key={item.id as string}>
                      <TableCell className="font-medium">{item.name || item.code}</TableCell>
                      <TableCell>{positionName}</TableCell>
                      <TableCell>
                        <Badge variant={isAssigned ? "default" : "outline"}>
                          {isAssigned ? "Assigned" : "Vacant"}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment?.username || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {assignment?.profileId || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isAssigned ? "secondary" : "outline"}
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
                          {isAssigned ? "Change Partner" : "Assign Partner"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActiveView = () => {
    if (selectedLocationId) {
      const specificLocation = locations.filter((l) => l.id === selectedLocationId);
      const pincode = pincodes.find((p) => p.id === selectedPincodeId);
      return renderTable(
        `Location Details`,
        `Viewing assignment for specific area under PIN ${pincode?.code}`,
        specificLocation,
        locationAssignments,
        "Area Head",
        "pincode_partner",
        "location_id",
        (item) => `/admin/partners/create?role=pincode_partner&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${selectedPincodeId}&locationId=${item.id}`
      );
    }

    if (selectedPincodeId) {
      const pincode = pincodes.find((p) => p.id === selectedPincodeId);
      return renderTable(
        `Areas / Locations`,
        `Viewing Area Head positions under PIN ${pincode?.code}`,
        locations,
        locationAssignments,
        "Area Head",
        "pincode_partner",
        "location_id",
        (item) => `/admin/partners/create?role=pincode_partner&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${selectedPincodeId}&locationId=${item.id}`
      );
    }

    if (selectedDistrictId) {
      const district = districts.find((d) => d.id === selectedDistrictId);
      return renderTable(
        `PIN Codes`,
        `Viewing PIN Head positions in ${district?.name}`,
        pincodes,
        pincodeAssignments,
        "PIN Head",
        "pincode_head",
        "pincode_id",
        (item) => `/admin/partners/create?role=pincode_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${item.id}`
      );
    }

    if (selectedStateId) {
      const state = states.find((s) => s.id === selectedStateId);
      return renderTable(
        `Districts`,
        `Viewing District Head positions in ${state?.name}`,
        districts,
        districtAssignments,
        "District Head",
        "district_head",
        "district_id",
        (item) => `/admin/partners/create?role=district_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${item.id}`
      );
    }

    if (selectedCountryId) {
      const country = countries.find((c) => c.id === selectedCountryId);
      return renderTable(
        `States`,
        `Viewing State Head positions in ${country?.name}`,
        states,
        stateAssignments,
        "State Head",
        "state_head",
        "state_id",
        (item) => `/admin/partners/create?role=state_head&countryId=${selectedCountryId}&stateId=${item.id}`
      );
    }

    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Select a country from the filters above to drill down into territory assignments.</p>
        </CardContent>
      </Card>
    );
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Checking your access...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <p className="text-sm text-destructive" role="alert">{authError}</p>
      </main>
    );
  }

  return (
    <>
      <SEO title="Territory Management" description="Drill down to manage territory assignments and vacancies." />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin Portal</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">Territory Management</h1>
            <p className="text-sm text-muted-foreground">Select territories to drill down into the assignment hierarchy.</p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Hierarchy Filters</CardTitle>
              <CardDescription>Select a region to view specific assignments within it.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Country</span>
                  <Select value={selectedCountryId || undefined} onValueChange={handleSelectCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={String(country.id)}>{country.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">State</span>
                  <Select value={selectedStateId || undefined} onValueChange={handleSelectState} disabled={!selectedCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={String(state.id)}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">District</span>
                  <Select value={selectedDistrictId || undefined} onValueChange={handleSelectDistrict} disabled={!selectedStateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district.id} value={String(district.id)}>{district.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">PIN Code</span>
                  <Select value={selectedPincodeId || undefined} onValueChange={handleSelectPincode} disabled={!selectedDistrictId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PIN" />
                    </SelectTrigger>
                    <SelectContent>
                      {pincodes.map((pincode) => (
                        <SelectItem key={pincode.id} value={String(pincode.id)}>{pincode.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Area / Location</span>
                  <Select value={selectedLocationId || undefined} onValueChange={handleSelectLocation} disabled={!selectedPincodeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
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

          {renderActiveView()}
        </div>
      </main>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{assignModalData?.isAssigned ? "Change Partner" : "Assign Partner"}</DialogTitle>
            <DialogDescription>
              Select an existing partner to assign to this territory position.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 items-center gap-4 border-b pb-4">
              <span className="text-sm font-medium text-muted-foreground">Territory</span>
              <span className="col-span-2 text-sm font-semibold">{assignModalData?.territoryName}</span>
              
              <span className="text-sm font-medium text-muted-foreground">Position</span>
              <span className="col-span-2 text-sm font-semibold">{assignModalData?.positionName}</span>
            </div>

            {assignModalData?.isAssigned && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Assignment</p>
                <p className="text-sm font-semibold">{assignModalData.currentUsername}</p>
                <p className="text-xs font-mono text-muted-foreground">{assignModalData.currentProfileId}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-medium">Select Partner</label>
              <Input
                placeholder="Search by username..."
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="h-9"
              />
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a partner..." />
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
                <div className="mt-2 rounded-md border p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Selected Partner Preview:</p>
                  <p className="text-sm font-medium">
                    {partners.find((p) => p.id === selectedPartnerId)?.username}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {selectedPartnerId}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 text-muted-foreground h-auto" 
              onClick={() => router.push(assignModalData?.createUrl || "")}
            >
              Create New Partner Instead
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignPartner} disabled={!selectedPartnerId || isSubmittingAssignment}>
                {isSubmittingAssignment ? "Saving..." : (assignModalData?.isAssigned ? "Confirm Change" : "Confirm Assign")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}