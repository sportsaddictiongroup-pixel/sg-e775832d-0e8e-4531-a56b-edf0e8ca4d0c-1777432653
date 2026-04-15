import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  fullName: string;
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
  const [usernameFilter, setUsernameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [stateAssignments, setStateAssignments] = useState<
    Record<string, AssignmentInfo>
  >({});
  const [districtAssignments, setDistrictAssignments] = useState<
    Record<string, AssignmentInfo>
  >({});
  const [pincodeAssignments, setPincodeAssignments] = useState<
    Record<string, AssignmentInfo>
  >({});
  const [locationAssignments, setLocationAssignments] = useState<
    Record<string, AssignmentInfo>
  >({});

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

      if (!isMounted) {
        return;
      }

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
      if (!isMounted) {
        return;
      }

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
    if (!items.length) {
      setStateAssignments({});
      return;
    }

    const ids = items
      .map((item) => item.id as string)
      .filter((id) => typeof id === "string" && id.length > 0);

    if (!ids.length) {
      setStateAssignments({});
      return;
    }

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("state_id, profile_id, is_active, role")
      .eq("role", "state_head")
      .eq("is_active", true)
      .in("state_id", ids);

    if (error || !assignments) {
      setStateAssignments({});
      return;
    }

    const profileIds = Array.from(
      new Set(
        assignments
          .map((item) => item.profile_id as string | null)
          .filter((value): value is string => !!value),
      ),
    );

    if (!profileIds.length) {
      setStateAssignments({});
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profilesError || !profilesData) {
      setStateAssignments({});
      return;
    }

    const profilesMap = new Map(
      profilesData.map((profile) => [profile.id as string, profile]),
    );

    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const stateId = assignment.state_id as string | null;
      const profileId = assignment.profile_id as string | null;

      if (!stateId || !profileId) {
        continue;
      }

      const profile = profilesMap.get(profileId);
      if (!profile) {
        continue;
      }

      map[stateId] = {
        profileId,
        fullName: (profile.full_name as string) ?? "",
        username: (profile.username as string) ?? "",
      };
    }

    setStateAssignments(map);
  };

  const loadDistrictAssignments = async (items: District[]) => {
    if (!items.length) {
      setDistrictAssignments({});
      return;
    }

    const ids = items
      .map((item) => item.id as string)
      .filter((id) => typeof id === "string" && id.length > 0);

    if (!ids.length) {
      setDistrictAssignments({});
      return;
    }

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("district_id, profile_id, is_active, role")
      .eq("role", "district_head")
      .eq("is_active", true)
      .in("district_id", ids);

    if (error || !assignments) {
      setDistrictAssignments({});
      return;
    }

    const profileIds = Array.from(
      new Set(
        assignments
          .map((item) => item.profile_id as string | null)
          .filter((value): value is string => !!value),
      ),
    );

    if (!profileIds.length) {
      setDistrictAssignments({});
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profilesError || !profilesData) {
      setDistrictAssignments({});
      return;
    }

    const profilesMap = new Map(
      profilesData.map((profile) => [profile.id as string, profile]),
    );

    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const districtId = assignment.district_id as string | null;
      const profileId = assignment.profile_id as string | null;

      if (!districtId || !profileId) {
        continue;
      }

      const profile = profilesMap.get(profileId);
      if (!profile) {
        continue;
      }

      map[districtId] = {
        profileId,
        fullName: (profile.full_name as string) ?? "",
        username: (profile.username as string) ?? "",
      };
    }

    setDistrictAssignments(map);
  };

  const loadPincodeAssignments = async (items: Pincode[]) => {
    if (!items.length) {
      setPincodeAssignments({});
      return;
    }

    const ids = items
      .map((item) => item.id as string)
      .filter((id) => typeof id === "string" && id.length > 0);

    if (!ids.length) {
      setPincodeAssignments({});
      return;
    }

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("pincode_id, profile_id, is_active, role")
      .eq("role", "pincode_head")
      .eq("is_active", true)
      .in("pincode_id", ids);

    if (error || !assignments) {
      setPincodeAssignments({});
      return;
    }

    const profileIds = Array.from(
      new Set(
        assignments
          .map((item) => item.profile_id as string | null)
          .filter((value): value is string => !!value),
      ),
    );

    if (!profileIds.length) {
      setPincodeAssignments({});
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profilesError || !profilesData) {
      setPincodeAssignments({});
      return;
    }

    const profilesMap = new Map(
      profilesData.map((profile) => [profile.id as string, profile]),
    );

    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const pincodeId = assignment.pincode_id as string | null;
      const profileId = assignment.profile_id as string | null;

      if (!pincodeId || !profileId) {
        continue;
      }

      const profile = profilesMap.get(profileId);
      if (!profile) {
        continue;
      }

      map[pincodeId] = {
        profileId,
        fullName: (profile.full_name as string) ?? "",
        username: (profile.username as string) ?? "",
      };
    }

    setPincodeAssignments(map);
  };

  const loadLocationAssignments = async (items: Location[]) => {
    if (!items.length) {
      setLocationAssignments({});
      return;
    }

    const ids = items
      .map((item) => item.id as string)
      .filter((id) => typeof id === "string" && id.length > 0);

    if (!ids.length) {
      setLocationAssignments({});
      return;
    }

    const { data: assignments, error } = await supabase
      .from("territory_assignments")
      .select("location_id, profile_id, is_active, role")
      .eq("role", "pincode_partner")
      .eq("is_active", true)
      .in("location_id", ids);

    if (error || !assignments) {
      setLocationAssignments({});
      return;
    }

    const profileIds = Array.from(
      new Set(
        assignments
          .map((item) => item.profile_id as string | null)
          .filter((value): value is string => !!value),
      ),
    );

    if (!profileIds.length) {
      setLocationAssignments({});
      return;
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", profileIds);

    if (profilesError || !profilesData) {
      setLocationAssignments({});
      return;
    }

    const profilesMap = new Map(
      profilesData.map((profile) => [profile.id as string, profile]),
    );

    const map: Record<string, AssignmentInfo> = {};

    for (const assignment of assignments) {
      const locationId = assignment.location_id as string | null;
      const profileId = assignment.profile_id as string | null;

      if (!locationId || !profileId) {
        continue;
      }

      const profile = profilesMap.get(profileId);
      if (!profile) {
        continue;
      }

      map[locationId] = {
        profileId,
        fullName: (profile.full_name as string) ?? "",
        username: (profile.username as string) ?? "",
      };
    }

    setLocationAssignments(map);
  };

  const handleSelectCountry = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedStateId("");
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setStateAssignments({});
    setDistrictAssignments({});
    setPincodeAssignments({});
    setLocationAssignments({});

    if (!countryId) {
      return;
    }

    const loadedStates = await locationService.getStatesByCountry(countryId);
    setStates(loadedStates);
    await loadStateAssignments(loadedStates);
  };

  const handleSelectState = async (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setDistrictAssignments({});
    setPincodeAssignments({});
    setLocationAssignments({});

    if (!stateId) {
      return;
    }

    const loadedDistricts = await locationService.getDistrictsByState(stateId);
    setDistricts(loadedDistricts);
    await loadDistrictAssignments(loadedDistricts);
  };

  const handleSelectDistrict = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedPincodeId("");
    setSelectedLocationId("");
    setPincodes([]);
    setLocations([]);
    setPincodeAssignments({});
    setLocationAssignments({});

    if (!districtId) {
      return;
    }

    const loadedPincodes = await locationService.getPincodesByDistrict(
      districtId,
    );
    setPincodes(loadedPincodes);
    await loadPincodeAssignments(loadedPincodes);
  };

  const handleSelectPincode = async (pincodeId: string) => {
    setSelectedPincodeId(pincodeId);
    setSelectedLocationId("");
    setLocations([]);
    setLocationAssignments({});

    if (!pincodeId) {
      return;
    }

    const loadedLocations = await locationService.getLocationsByPincode(
      pincodeId,
    );
    setLocations(loadedLocations);
    await loadLocationAssignments(loadedLocations);
  };

  const selectedCountry = countries.find(
    (country) => (country.id as string) === selectedCountryId,
  );
  const selectedState = states.find(
    (state) => (state.id as string) === selectedStateId,
  );
  const selectedDistrict = districts.find(
    (district) => (district.id as string) === selectedDistrictId,
  );
  const selectedPincode = pincodes.find(
    (pincode) => (pincode.id as string) === selectedPincodeId,
  );

  const filteredStates = states.filter((state) => {
    if (selectedStateId && selectedStateId !== "all" && state.id !== selectedStateId) return false;
    if (roleFilter !== "all" && roleFilter !== "state_head") return false;
    const assignment = stateAssignments[state.id as string];
    if (usernameFilter) {
      if (!assignment || !assignment.username) return false;
      if (!assignment.username.toLowerCase().includes(usernameFilter.toLowerCase())) return false;
    }
    return true;
  });

  const filteredDistricts = districts.filter((district) => {
    if (selectedDistrictId && selectedDistrictId !== "all" && district.id !== selectedDistrictId) return false;
    if (roleFilter !== "all" && roleFilter !== "district_head") return false;
    const assignment = districtAssignments[district.id as string];
    if (usernameFilter) {
      if (!assignment || !assignment.username) return false;
      if (!assignment.username.toLowerCase().includes(usernameFilter.toLowerCase())) return false;
    }
    return true;
  });

  const filteredPincodes = pincodes.filter((pincode) => {
    if (selectedPincodeId && selectedPincodeId !== "all" && pincode.id !== selectedPincodeId) return false;
    if (roleFilter !== "all" && roleFilter !== "pincode_head") return false;
    const assignment = pincodeAssignments[pincode.id as string];
    if (usernameFilter) {
      if (!assignment || !assignment.username) return false;
      if (!assignment.username.toLowerCase().includes(usernameFilter.toLowerCase())) return false;
    }
    return true;
  });

  const filteredLocations = locations.filter((location) => {
    if (selectedLocationId && selectedLocationId !== "all" && location.id !== selectedLocationId) return false;
    if (roleFilter !== "all" && roleFilter !== "pincode_partner") return false;
    const assignment = locationAssignments[location.id as string];
    if (usernameFilter) {
      if (!assignment || !assignment.username) return false;
      if (!assignment.username.toLowerCase().includes(usernameFilter.toLowerCase())) return false;
    }
    return true;
  });

  if (authLoading) {
    return (
      <>
        <SEO
          title="Territory Management"
          description="View territory assignments and vacancies."
        />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm text-muted-foreground">
            Checking your access...
          </p>
        </main>
      </>
    );
  }

  if (authError) {
    return (
      <>
        <SEO
          title="Territory Management"
          description="View territory assignments and vacancies."
        />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
          <p className="text-sm text-destructive" role="alert">
            {authError}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Territory Management"
        description="See which territories are vacant or assigned and navigate by hierarchy."
      />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Admin Portal
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">
              Territory Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Filter by territory, position, or username to inspect
              assignments across the hierarchy.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Use the dropdowns to drill down or search by specific criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Country
                  </span>
                  <Select
                    value={selectedCountryId || undefined}
                    onValueChange={(value) => void handleSelectCountry(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem
                          key={country.id}
                          value={String(country.id)}
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    State
                  </span>
                  <Select
                    value={selectedStateId || undefined}
                    onValueChange={(value) => void handleSelectState(value)}
                    disabled={!selectedCountryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={String(state.id)}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    District
                  </span>
                  <Select
                    value={selectedDistrictId || undefined}
                    onValueChange={(value) => void handleSelectDistrict(value)}
                    disabled={!selectedStateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem
                          key={district.id}
                          value={String(district.id)}
                        >
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    PIN Code
                  </span>
                  <Select
                    value={selectedPincodeId || undefined}
                    onValueChange={(value) => void handleSelectPincode(value)}
                    disabled={!selectedDistrictId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select PIN code" />
                    </SelectTrigger>
                    <SelectContent>
                      {pincodes.map((pincode) => (
                        <SelectItem
                          key={pincode.id}
                          value={String(pincode.id)}
                        >
                          {pincode.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* NEW: Location / Area Filter */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Area / Location
                  </span>
                  <Select
                    value={selectedLocationId || undefined}
                    onValueChange={setSelectedLocationId}
                    disabled={!selectedPincodeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem
                          key={location.id}
                          value={String(location.id)}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* NEW: Username Filter */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Username
                  </span>
                  <Input 
                    placeholder="Search by username..." 
                    value={usernameFilter} 
                    onChange={(e) => setUsernameFilter(e.target.value)} 
                  />
                </div>

                {/* NEW: Role Assigned Filter */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Role Assigned (Position)
                  </span>
                  <Select
                    value={roleFilter}
                    onValueChange={setRoleFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      <SelectItem value="state_head">State Head</SelectItem>
                      <SelectItem value="district_head">District Head</SelectItem>
                      <SelectItem value="pincode_head">PIN Code Head</SelectItem>
                      <SelectItem value="pincode_partner">Area / Location Head</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedCountry && (
            <Card>
              <CardHeader>
                <CardTitle>States in {selectedCountry.name}</CardTitle>
                <CardDescription>
                  State Head positions and their assignment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredStates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching states or assignments found for current filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStates.map((state) => {
                        const assignment =
                          stateAssignments[state.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={state.id as string}>
                            <TableCell>{state.name}</TableCell>
                            <TableCell>State Head</TableCell>
                            <TableCell>
                              <Badge
                                variant={isAssigned ? "default" : "outline"}
                              >
                                {isAssigned ? "Assigned" : "Vacant"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment?.fullName ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.username ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.profileId ?? "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isAssigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/admin/partners/create?role=state_head&countryId=${selectedCountryId}&stateId=${state.id as string}`,
                                    )
                                  }
                                >
                                  Create partner for this position
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {selectedState && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Districts in {selectedState.name}
                  {selectedCountry ? `, ${selectedCountry.name}` : ""}
                </CardTitle>
                <CardDescription>
                  District Head positions and their assignment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredDistricts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching districts or assignments found for current filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDistricts.map((district) => {
                        const assignment =
                          districtAssignments[district.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={district.id as string}>
                            <TableCell>{district.name}</TableCell>
                            <TableCell>District Head</TableCell>
                            <TableCell>
                              <Badge
                                variant={isAssigned ? "default" : "outline"}
                              >
                                {isAssigned ? "Assigned" : "Vacant"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment?.fullName ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.username ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.profileId ?? "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isAssigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/admin/partners/create?role=district_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${district.id as string}`,
                                    )
                                  }
                                >
                                  Create partner for this position
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {selectedDistrict && (
            <Card>
              <CardHeader>
                <CardTitle>
                  PIN Codes in {selectedDistrict.name}
                  {selectedState ? `, ${selectedState.name}` : ""}
                </CardTitle>
                <CardDescription>
                  PIN Code Head positions and their assignment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPincodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching PIN codes or assignments found for current filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPincodes.map((pincode) => {
                        const assignment =
                          pincodeAssignments[pincode.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={pincode.id as string}>
                            <TableCell>{pincode.code}</TableCell>
                            <TableCell>PIN Code Head</TableCell>
                            <TableCell>
                              <Badge
                                variant={isAssigned ? "default" : "outline"}
                              >
                                {isAssigned ? "Assigned" : "Vacant"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment?.fullName ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.username ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.profileId ?? "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isAssigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/admin/partners/create?role=pincode_head&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${pincode.id as string}`,
                                    )
                                  }
                                >
                                  Create partner for this position
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {selectedPincode && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Locations under PIN {selectedPincode.code}
                  {selectedDistrict ? `, ${selectedDistrict.name}` : ""}
                </CardTitle>
                <CardDescription>
                  Area / Location Partner positions and their assignment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching locations or assignments found for current filters.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.map((location) => {
                        const assignment =
                          locationAssignments[location.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={location.id as string}>
                            <TableCell>{location.name}</TableCell>
                            <TableCell>Area / Location Head</TableCell>
                            <TableCell>
                              <Badge
                                variant={isAssigned ? "default" : "outline"}
                              >
                                {isAssigned ? "Assigned" : "Vacant"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment?.fullName ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.username ?? "-"}
                            </TableCell>
                            <TableCell>
                              {assignment?.profileId ?? "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isAssigned && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/admin/partners/create?role=pincode_partner&countryId=${selectedCountryId}&stateId=${selectedStateId}&districtId=${selectedDistrictId}&pincodeId=${selectedPincodeId}&locationId=${location.id as string}`,
                                    )
                                  }
                                >
                                  Create partner for this position
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}