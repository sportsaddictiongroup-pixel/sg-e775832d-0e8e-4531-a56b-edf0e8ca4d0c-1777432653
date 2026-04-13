import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
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
              Drill down from country to location to see which positions are
              assigned or vacant.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Start from country and go down to locations to inspect
                assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Country
                  </span>
                  <Select
                    value={selectedCountryId}
                    onValueChange={(value) => void handleSelectCountry(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem
                          key={country.id}
                          value={country.id as string}
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
                    value={selectedStateId}
                    onValueChange={(value) => void handleSelectState(value)}
                    disabled={!selectedCountryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id as string}>
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
                    value={selectedDistrictId}
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
                          value={district.id as string}
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
                    value={selectedPincodeId}
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
                          value={pincode.id as string}
                        >
                          {pincode.code}
                        </SelectItem>
                      ))}
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
                {states.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No states found. Add states under Location Management.
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {states.map((state) => {
                        const assignment =
                          stateAssignments[state.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={state.id}>
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
                {districts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No districts found. Add districts under Location
                    Management.
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {districts.map((district) => {
                        const assignment =
                          districtAssignments[district.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={district.id}>
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
                {pincodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No PIN codes found. Add PIN codes under Location
                    Management.
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pincodes.map((pincode) => {
                        const assignment =
                          pincodeAssignments[pincode.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={pincode.id}>
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
                  PIN Code Partner positions and their assignment status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No locations found. Add locations under Location
                    Management.
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => {
                        const assignment =
                          locationAssignments[location.id as string];
                        const isAssigned = !!assignment;

                        return (
                          <TableRow key={location.id}>
                            <TableCell>{location.name}</TableCell>
                            <TableCell>PIN Code Partner</TableCell>
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