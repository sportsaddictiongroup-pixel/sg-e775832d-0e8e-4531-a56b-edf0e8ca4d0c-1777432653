import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import {
  locationService,
  type Country,
  type State,
  type District,
  type Pincode,
  type Location,
} from "@/services/locationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Profile = Tables<"profiles">;
type ViewLevel = "country" | "state" | "district" | "pincode" | "location";

interface AddEntityDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  submitting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => Promise<void> | void;
}

function AddEntityDialog({
  open,
  title,
  description,
  label,
  placeholder,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: AddEntityDialogProps): JSX.Element {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) {
      setValue("");
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PRIORITY_COUNTRIES = [
  "India",
  "Malaysia",
  "Sri Lanka",
  "UAE",
  "Nepal",
];

const getCountryCardClasses = (name: string): string => {
  const map: Record<string, string> = {
    India: "bg-blue-50 border-blue-200",
    Malaysia: "bg-emerald-50 border-emerald-200",
    "Sri Lanka": "bg-amber-50 border-amber-200",
    UAE: "bg-teal-50 border-teal-200",
    Nepal: "bg-purple-50 border-purple-200",
  };
  return map[name] ?? "bg-muted/40";
};

export function LocationManagement(): JSX.Element {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [viewLevel, setViewLevel] = useState<ViewLevel>("country");

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(
    null,
  );
  const [selectedPincode, setSelectedPincode] = useState<Pincode | null>(null);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [stateDialogError, setStateDialogError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState(false);

  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [districtDialogError, setDistrictDialogError] =
    useState<string | null>(null);
  const [savingDistrict, setSavingDistrict] = useState(false);

  const [pincodeDialogOpen, setPincodeDialogOpen] = useState(false);
  const [pincodeDialogError, setPincodeDialogError] =
    useState<string | null>(null);
  const [savingPincode, setSavingPincode] = useState(false);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDialogError, setLocationDialogError] =
    useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

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

      setAuthError(null);
      setAuthLoading(false);

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

  const handleSelectCountry = async (country: Country) => {
    setSelectedCountry(country);
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedPincode(null);
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setViewLevel("state");
    setGlobalError(null);

    setLoadingStates(true);
    const loaded = await locationService.getStatesByCountry(country.id);
    setStates(loaded);
    setLoadingStates(false);
  };

  const handleSelectState = async (state: State) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setSelectedPincode(null);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);
    setViewLevel("district");
    setGlobalError(null);

    setLoadingDistricts(true);
    const loaded = await locationService.getDistrictsByState(state.id);
    setDistricts(loaded);
    setLoadingDistricts(false);
  };

  const handleSelectDistrict = async (district: District) => {
    setSelectedDistrict(district);
    setSelectedPincode(null);
    setPincodes([]);
    setLocations([]);
    setViewLevel("pincode");
    setGlobalError(null);

    setLoadingPincodes(true);
    const loaded = await locationService.getPincodesByDistrict(district.id);
    setPincodes(loaded);
    setLoadingPincodes(false);
  };

  const handleSelectPincode = async (pincode: Pincode) => {
    setSelectedPincode(pincode);
    setLocations([]);
    setViewLevel("location");
    setGlobalError(null);

    setLoadingLocations(true);
    const loaded = await locationService.getLocationsByPincode(pincode.id);
    setLocations(loaded);
    setLoadingLocations(false);
  };

  const handleBack = () => {
    setGlobalError(null);
    if (viewLevel === "location") {
      setViewLevel("pincode");
      setSelectedPincode(null);
      setLocations([]);
      return;
    }
    if (viewLevel === "pincode") {
      setViewLevel("district");
      setSelectedDistrict(null);
      setPincodes([]);
      return;
    }
    if (viewLevel === "district") {
      setViewLevel("state");
      setSelectedState(null);
      setDistricts([]);
      return;
    }
    if (viewLevel === "state") {
      setViewLevel("country");
      setSelectedCountry(null);
      setStates([]);
    }
  };

  const handleCreateState = async (name: string) => {
    if (!selectedCountry) {
      setStateDialogError("Select a country before adding a state.");
      return;
    }
    setSavingState(true);
    const { item, error } = await locationService.createState(
      selectedCountry.id,
      name,
    );
    if (error || !item) {
      setStateDialogError(error ?? "Unable to create state.");
    } else {
      setStates((prev) => [...prev, item]);
      setStateDialogError(null);
      setStateDialogOpen(false);
    }
    setSavingState(false);
  };

  const handleCreateDistrict = async (name: string) => {
    if (!selectedState) {
      setDistrictDialogError("Select a state before adding a district.");
      return;
    }
    setSavingDistrict(true);
    const { item, error } = await locationService.createDistrict(
      selectedState.id,
      name,
    );
    if (error || !item) {
      setDistrictDialogError(error ?? "Unable to create district.");
    } else {
      setDistricts((prev) => [...prev, item]);
      setDistrictDialogError(null);
      setDistrictDialogOpen(false);
    }
    setSavingDistrict(false);
  };

  const handleCreatePincode = async (code: string) => {
    if (!selectedDistrict) {
      setPincodeDialogError("Select a district before adding a PIN code.");
      return;
    }
    setSavingPincode(true);
    const { item, error } = await locationService.createPincode(
      selectedDistrict.id,
      code,
    );
    if (error || !item) {
      setPincodeDialogError(error ?? "Unable to create PIN code.");
    } else {
      setPincodes((prev) => [...prev, item]);
      setPincodeDialogError(null);
      setPincodeDialogOpen(false);
    }
    setSavingPincode(false);
  };

  const handleCreateLocation = async (name: string) => {
    if (!selectedPincode) {
      setLocationDialogError("Select a PIN code before adding a location.");
      return;
    }
    setSavingLocation(true);
    const { item, error } = await locationService.createLocation(
      selectedPincode.id,
      name,
    );
    if (error || !item) {
      setLocationDialogError(error ?? "Unable to create location.");
    } else {
      setLocations((prev) => [...prev, item]);
      setLocationDialogError(null);
      setLocationDialogOpen(false);
    }
    setSavingLocation(false);
  };

  const handleDeleteState = async (stateId: State["id"]) => {
    const { error } = await locationService.deleteState(stateId);
    if (error) {
      setGlobalError(error);
      return;
    }
    setStates((prev) => prev.filter((state) => state.id !== stateId));
  };

  const handleDeleteDistrict = async (districtId: District["id"]) => {
    const { error } = await locationService.deleteDistrict(districtId);
    if (error) {
      setGlobalError(error);
      return;
    }
    setDistricts((prev) =>
      prev.filter((district) => district.id !== districtId),
    );
  };

  const handleDeletePincode = async (pincodeId: Pincode["id"]) => {
    const { error } = await locationService.deletePincode(pincodeId);
    if (error) {
      setGlobalError(error);
      return;
    }
    setPincodes((prev) =>
      prev.filter((pincode) => pincode.id !== pincodeId),
    );
  };

  const handleDeleteLocation = async (locationId: Location["id"]) => {
    const { error } = await locationService.deleteLocation(locationId);
    if (error) {
      setGlobalError(error);
      return;
    }
    setLocations((prev) =>
      prev.filter((location) => location.id !== locationId),
    );
  };

  const renderContent = () => {
    if (viewLevel === "country") {
      if (loadingCountries) {
        return (
          <p className="text-sm text-muted-foreground">
            Loading countries from Supabase...
          </p>
        );
      }

      if (countries.length === 0) {
        return (
          <p className="text-sm text-muted-foreground">
            No countries found. Add countries in the database to get started.
          </p>
        );
      }

      const prioritized = PRIORITY_COUNTRIES.map((name) =>
        countries.find((country) => country.name === name),
      ).filter((country): country is Country => Boolean(country));

      const others = countries.filter(
        (country) => !PRIORITY_COUNTRIES.includes(country.name),
      );

      return (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prioritized.map((country) => (
              <button
                key={country.id}
                type="button"
                onClick={() => handleSelectCountry(country)}
                className={`flex flex-col rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getCountryCardClasses(
                  country.name,
                )}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Country
                </p>
                <p className="mt-2 text-xl font-semibold">{country.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap to manage states
                </p>
              </button>
            ))}
          </div>
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Other countries
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((country) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className="flex flex-col rounded-xl border bg-muted/40 p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Country
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {country.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tap to manage states
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      );
    }

    if (viewLevel === "state") {
      return (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                States in {selectedCountry?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage states for this country.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setStateDialogError(null);
                setStateDialogOpen(true);
              }}
            >
              Add State
            </Button>
          </div>
          <AddEntityDialog
            open={stateDialogOpen}
            onOpenChange={(open) => {
              setStateDialogOpen(open);
              if (!open) {
                setStateDialogError(null);
              }
            }}
            title="Add state"
            description={
              selectedCountry
                ? `Create a new state under ${selectedCountry.name}.`
                : "Create a new state."
            }
            label="State name"
            placeholder="e.g. Uttar Pradesh"
            submitting={savingState}
            error={stateDialogError}
            onSubmit={handleCreateState}
          />
          {loadingStates ? (
            <p className="text-sm text-muted-foreground">
              Loading states from Supabase...
            </p>
          ) : states.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No states found for this country.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {states.map((state) => (
                <div
                  key={state.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectState(state)}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{state.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage districts
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteState(state.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (viewLevel === "district") {
      return (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                Districts in {selectedState?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage districts for this state.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setDistrictDialogError(null);
                setDistrictDialogOpen(true);
              }}
            >
              Add District
            </Button>
          </div>
          <AddEntityDialog
            open={districtDialogOpen}
            onOpenChange={(open) => {
              setDistrictDialogOpen(open);
              if (!open) {
                setDistrictDialogError(null);
              }
            }}
            title="Add district"
            description={
              selectedState
                ? `Create a new district under ${selectedState.name}.`
                : "Create a new district."
            }
            label="District name"
            placeholder="e.g. Agra"
            submitting={savingDistrict}
            error={districtDialogError}
            onSubmit={handleCreateDistrict}
          />
          {loadingDistricts ? (
            <p className="text-sm text-muted-foreground">
              Loading districts from Supabase...
            </p>
          ) : districts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No districts found for this state.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {districts.map((district) => (
                <div
                  key={district.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectDistrict(district)}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{district.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage PIN codes
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDistrict(district.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (viewLevel === "pincode") {
      return (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">
                PIN codes in {selectedDistrict?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage PIN codes for this district.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setPincodeDialogError(null);
                setPincodeDialogOpen(true);
              }}
            >
              Add PIN Code
            </Button>
          </div>
          <AddEntityDialog
            open={pincodeDialogOpen}
            onOpenChange={(open) => {
              setPincodeDialogOpen(open);
              if (!open) {
                setPincodeDialogError(null);
              }
            }}
            title="Add PIN code"
            description={
              selectedDistrict
                ? `Create a new PIN code under ${selectedDistrict.name}.`
                : "Create a new PIN code."
            }
            label="PIN code"
            placeholder="e.g. 282001"
            submitting={savingPincode}
            error={pincodeDialogError}
            onSubmit={handleCreatePincode}
          />
          {loadingPincodes ? (
            <p className="text-sm text-muted-foreground">
              Loading PIN codes from Supabase...
            </p>
          ) : pincodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No PIN codes found for this district.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pincodes.map((pincode) => (
                <div
                  key={pincode.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPincode(pincode)}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{pincode.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage locations
                    </p>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePincode(pincode.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Locations in PIN {selectedPincode?.code}
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage locations/areas for this PIN code.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setLocationDialogError(null);
              setLocationDialogOpen(true);
            }}
          >
            Add Location
          </Button>
        </div>
        <AddEntityDialog
          open={locationDialogOpen}
          onOpenChange={(open) => {
            setLocationDialogOpen(open);
            if (!open) {
              setLocationDialogError(null);
            }
          }}
          title="Add location"
          description={
            selectedPincode
              ? `Create a new location under PIN ${selectedPincode.code}.`
              : "Create a new location."
          }
          label="Location name"
          placeholder="e.g. Civil Lines"
          submitting={savingLocation}
          error={locationDialogError}
          onSubmit={handleCreateLocation}
        />
        {loadingLocations ? (
          <p className="text-sm text-muted-foreground">
            Loading locations from Supabase...
          </p>
        ) : locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No locations found for this PIN code.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{location.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Location / Area
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteLocation(location.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">
          Checking your access...
        </p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <p className="text-sm text-destructive" role="alert">
          {authError}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Admin Portal
          </p>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold">
            Location Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Drill down from countries to states, districts, PIN codes, and
            locations. All data is loaded live from Supabase.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  onClick={() => {
                    setViewLevel("country");
                    setSelectedCountry(null);
                    setSelectedState(null);
                    setSelectedDistrict(null);
                    setSelectedPincode(null);
                    setStates([]);
                    setDistricts([]);
                    setPincodes([]);
                    setLocations([]);
                    setGlobalError(null);
                  }}
                >
                  <button type="button" className="text-xs font-medium">
                    Country
                  </button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>
                  <span className="text-xs">
                    {selectedCountry ? selectedCountry.name : "State"}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>
                  <span className="text-xs">
                    {selectedState ? selectedState.name : "District"}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>
                  <span className="text-xs">
                    {selectedDistrict ? selectedDistrict.name : "Pincode"}
                  </span>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {viewLevel !== "country" && (
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>

        {globalError ? (
          <p className="text-sm text-destructive" role="alert">
            {globalError}
          </p>
        ) : null}

        {renderContent()}
      </div>
    </main>
  );
}