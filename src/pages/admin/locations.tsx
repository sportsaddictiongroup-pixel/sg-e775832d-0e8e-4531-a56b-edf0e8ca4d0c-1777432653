import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  locationService,
  type Country,
  type State,
  type District,
  type Pincode,
  type Location,
} from "@/services/locationService";

type Profile = Tables<"profiles">;

export default function LocationManagement(): JSX.Element {
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

  const [newCountryName, setNewCountryName] = useState("");
  const [countryError, setCountryError] = useState<string | null>(null);

  const [newStateName, setNewStateName] = useState("");
  const [stateError, setStateError] = useState<string | null>(null);

  const [newDistrictName, setNewDistrictName] = useState("");
  const [districtError, setDistrictError] = useState<string | null>(null);

  const [newPincodeCode, setNewPincodeCode] = useState("");
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const [newLocationName, setNewLocationName] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

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

      setAuthLoading(false);
      setAuthError(null);

      setLoadingCountries(true);
      const loadedCountries = await locationService.getCountries();
      if (!isMounted) {
        return;
      }
      setCountries(loadedCountries);
      setLoadingCountries(false);
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSelectCountry = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedStateId("");
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);

    if (!countryId) {
      return;
    }

    setLoadingStates(true);
    const loadedStates = await locationService.getStatesByCountry(countryId);
    setStates(loadedStates);
    setLoadingStates(false);
  };

  const handleSelectState = async (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setDistricts([]);
    setPincodes([]);
    setLocations([]);

    if (!stateId) {
      return;
    }

    setLoadingDistricts(true);
    const loadedDistricts = await locationService.getDistrictsByState(stateId);
    setDistricts(loadedDistricts);
    setLoadingDistricts(false);
  };

  const handleSelectDistrict = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedPincodeId("");
    setPincodes([]);
    setLocations([]);

    if (!districtId) {
      return;
    }

    setLoadingPincodes(true);
    const loadedPincodes = await locationService.getPincodesByDistrict(
      districtId,
    );
    setPincodes(loadedPincodes);
    setLoadingPincodes(false);
  };

  const handleSelectPincode = async (pincodeId: string) => {
    setSelectedPincodeId(pincodeId);
    setLocations([]);

    if (!pincodeId) {
      return;
    }

    setLoadingLocations(true);
    const loadedLocations = await locationService.getLocationsByPincode(
      pincodeId,
    );
    setLocations(loadedLocations);
    setLoadingLocations(false);
  };

  const handleCreateCountry = async () => {
    setCountryError(null);
    const { item, error } = await locationService.createCountry(newCountryName);
    if (error || !item) {
      setCountryError(error ?? "Unable to create country.");
      return;
    }
    setCountries((prev) => [...prev, item]);
    setNewCountryName("");
  };

  const handleCreateState = async () => {
    setStateError(null);
    const { item, error } = await locationService.createState(
      selectedCountryId,
      newStateName,
    );
    if (error || !item) {
      setStateError(error ?? "Unable to create state.");
      return;
    }
    setStates((prev) => [...prev, item]);
    setNewStateName("");
  };

  const handleCreateDistrict = async () => {
    setDistrictError(null);
    const { item, error } = await locationService.createDistrict(
      selectedStateId,
      newDistrictName,
    );
    if (error || !item) {
      setDistrictError(error ?? "Unable to create district.");
      return;
    }
    setDistricts((prev) => [...prev, item]);
    setNewDistrictName("");
  };

  const handleCreatePincode = async () => {
    setPincodeError(null);
    const { item, error } = await locationService.createPincode(
      selectedDistrictId,
      newPincodeCode,
    );
    if (error || !item) {
      setPincodeError(error ?? "Unable to create PIN code.");
      return;
    }
    setPincodes((prev) => [...prev, item]);
    setNewPincodeCode("");
  };

  const handleCreateLocation = async () => {
    setLocationError(null);
    const { item, error } = await locationService.createLocation(
      selectedPincodeId,
      newLocationName,
    );
    if (error || !item) {
      setLocationError(error ?? "Unable to create location.");
      return;
    }
    setLocations((prev) => [...prev, item]);
    setNewLocationName("");
  };

  if (authLoading) {
    return (
      <>
        <SEO
          title="Location Management"
          description="Manage location hierarchy"
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
          title="Location Management"
          description="Manage location hierarchy"
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
        title="Location Management"
        description="Manage countries, states, districts, PIN codes, and locations."
      />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Admin Portal
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">
              Location Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Maintain the full Country → State → District → PIN Code → Location
              hierarchy. Changes here power cascading selectors across the
              system.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Countries</CardTitle>
                <CardDescription>
                  Base layer for all territories. Add each operating country.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="country-name">Country name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="country-name"
                      value={newCountryName}
                      onChange={(event) =>
                        setNewCountryName(event.target.value)
                      }
                      placeholder="e.g. India"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateCountry}
                      disabled={loadingCountries}
                    >
                      Add
                    </Button>
                  </div>
                  {countryError && (
                    <p className="text-xs text-destructive" role="alert">
                      {countryError}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Existing countries
                  </p>
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    {loadingCountries ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Loading countries...
                      </p>
                    ) : countries.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No countries added yet.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {countries.map((country) => (
                          <li
                            key={country.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                              selectedCountryId === country.id
                                ? "bg-muted"
                                : ""
                            }`}
                            onClick={() => handleSelectCountry(country.id)}
                          >
                            {country.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>States</CardTitle>
                <CardDescription>
                  States are grouped under a selected country.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="state-country">Country</Label>
                  <select
                    id="state-country"
                    value={selectedCountryId}
                    onChange={(event) =>
                      handleSelectCountry(event.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state-name">State name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="state-name"
                      value={newStateName}
                      onChange={(event) => setNewStateName(event.target.value)}
                      placeholder="e.g. Uttar Pradesh"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateState}
                      disabled={!selectedCountryId || loadingStates}
                    >
                      Add
                    </Button>
                  </div>
                  {stateError && (
                    <p className="text-xs text-destructive" role="alert">
                      {stateError}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    States in selected country
                  </p>
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    {selectedCountryId === "" ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Select a country to view its states.
                      </p>
                    ) : loadingStates ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Loading states...
                      </p>
                    ) : states.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No states added yet.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {states.map((state) => (
                          <li
                            key={state.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                              selectedStateId === state.id ? "bg-muted" : ""
                            }`}
                            onClick={() => handleSelectState(state.id)}
                          >
                            {state.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Districts</CardTitle>
                <CardDescription>
                  Districts are grouped under a selected state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="district-state">State</Label>
                  <select
                    id="district-state"
                    value={selectedStateId}
                    onChange={(event) =>
                      handleSelectState(event.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district-name">District name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="district-name"
                      value={newDistrictName}
                      onChange={(event) =>
                        setNewDistrictName(event.target.value)
                      }
                      placeholder="e.g. Agra"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateDistrict}
                      disabled={!selectedStateId || loadingDistricts}
                    >
                      Add
                    </Button>
                  </div>
                  {districtError && (
                    <p className="text-xs text-destructive" role="alert">
                      {districtError}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Districts in selected state
                  </p>
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    {selectedStateId === "" ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Select a state to view its districts.
                      </p>
                    ) : loadingDistricts ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Loading districts...
                      </p>
                    ) : districts.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No districts added yet.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {districts.map((district) => (
                          <li
                            key={district.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                              selectedDistrictId === district.id
                                ? "bg-muted"
                                : ""
                            }`}
                            onClick={() => handleSelectDistrict(district.id)}
                          >
                            {district.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>PIN Codes</CardTitle>
                <CardDescription>
                  PIN codes are grouped under a selected district.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="pincode-district">District</Label>
                  <select
                    id="pincode-district"
                    value={selectedDistrictId}
                    onChange={(event) =>
                      handleSelectDistrict(event.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select district</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode-code">PIN code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pincode-code"
                      value={newPincodeCode}
                      onChange={(event) =>
                        setNewPincodeCode(event.target.value)
                      }
                      placeholder="e.g. 282001"
                    />
                    <Button
                      type="button"
                      onClick={handleCreatePincode}
                      disabled={!selectedDistrictId || loadingPincodes}
                    >
                      Add
                    </Button>
                  </div>
                  {pincodeError && (
                    <p className="text-xs text-destructive" role="alert">
                      {pincodeError}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    PIN codes in selected district
                  </p>
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    {selectedDistrictId === "" ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Select a district to view its PIN codes.
                      </p>
                    ) : loadingPincodes ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Loading PIN codes...
                      </p>
                    ) : pincodes.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No PIN codes added yet.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {pincodes.map((pincode) => (
                          <li
                            key={pincode.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                              selectedPincodeId === pincode.id
                                ? "bg-muted"
                                : ""
                            }`}
                            onClick={() => handleSelectPincode(pincode.id)}
                          >
                            {pincode.code}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>Locations / Areas</CardTitle>
                <CardDescription>
                  Locations are grouped under a selected PIN code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="location-pincode">PIN code</Label>
                  <select
                    id="location-pincode"
                    value={selectedPincodeId}
                    onChange={(event) =>
                      handleSelectPincode(event.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select PIN code</option>
                    {pincodes.map((pincode) => (
                      <option key={pincode.id} value={pincode.id}>
                        {pincode.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-name">Location name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location-name"
                      value={newLocationName}
                      onChange={(event) =>
                        setNewLocationName(event.target.value)
                      }
                      placeholder="e.g. Civil Lines"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateLocation}
                      disabled={!selectedPincodeId || loadingLocations}
                    >
                      Add
                    </Button>
                  </div>
                  {locationError && (
                    <p className="text-xs text-destructive" role="alert">
                      {locationError}
                    </p>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Locations in selected PIN code
                  </p>
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    {selectedPincodeId === "" ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Select a PIN code to view its locations.
                      </p>
                    ) : loadingLocations ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        Loading locations...
                      </p>
                    ) : locations.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No locations added yet.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {locations.map((location) => (
                          <li
                            key={location.id}
                            className="px-3 py-2 text-sm"
                          >
                            {location.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}