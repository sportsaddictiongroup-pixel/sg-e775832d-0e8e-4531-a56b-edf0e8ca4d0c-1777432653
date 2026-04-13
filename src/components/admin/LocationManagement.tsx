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
  initialValue?: string;
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
  initialValue,
  onOpenChange,
  onSubmit,
}: AddEntityDialogProps): JSX.Element {
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
    } else {
      setValue("");
    }
  }, [open, initialValue]);

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

interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  targetLabel: string;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

function DeleteConfirmDialog({
  open,
  title,
  targetLabel,
  submitting,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps): JSX.Element {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) {
      setValue("");
    }
  }, [open, targetLabel]);

  const disabled = submitting || value !== targetLabel;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            This action is irreversible. To confirm, type{" "}
            <span className="font-semibold">&quot;{targetLabel}&quot;</span> in
            the box below and then press Delete.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type the exact name to confirm
            </label>
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={targetLabel}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={disabled}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

interface DeleteDialogContext {
  title: string;
  targetLabel: string;
  onConfirm: () => Promise<void> | void;
}

export function LocationManagement(): JSX.Element {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [viewLevel, setViewLevel] = useState<ViewLevel>("country");

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

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [stateDialogError, setStateDialogError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);

  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [districtDialogError, setDistrictDialogError] =
    useState<string | null>(null);
  const [savingDistrict, setSavingDistrict] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);

  const [pincodeDialogOpen, setPincodeDialogOpen] = useState(false);
  const [pincodeDialogError, setPincodeDialogError] =
    useState<string | null>(null);
  const [savingPincode, setSavingPincode] = useState(false);
  const [editingPincode, setEditingPincode] = useState<Pincode | null>(null);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDialogError, setLocationDialogError] =
    useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogContext, setDeleteDialogContext] =
    useState<DeleteDialogContext | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const openDeleteDialog = (
    title: string,
    targetLabel: string,
    onConfirm: () => Promise<void> | void,
  ) => {
    setDeleteDialogContext({ title, targetLabel, onConfirm });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogContext) {
      return;
    }
    setDeleting(true);
    await deleteDialogContext.onConfirm();
    setDeleting(false);
  };

  const handleStaticCountryClick = async (countryName: string) => {
    setGlobalError(null);
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedPincode(null);
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);

    const { data: country, error } = await supabase
      .from("countries")
      .select("*")
      .ilike("name", countryName)
      .maybeSingle();

    if (error) {
      console.error(
        "Error fetching country by name for Location Management",
        {
          countryName,
          error,
        },
      );
      setGlobalError("Unable to load data for this country.");
      return;
    }

    if (!country) {
      setGlobalError("No data found. Please add states for this country.");
      return;
    }

    await handleSelectCountry(country as Country);
  };

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

  const handleSubmitStateDialog = async (name: string) => {
    if (editingState) {
      if (!selectedCountry) {
        setStateDialogError("Select a country before renaming a state.");
        return;
      }
      setSavingState(true);
      const { item, error } = await locationService.updateState(
        selectedCountry.id,
        editingState.id,
        name,
      );
      if (error || !item) {
        setStateDialogError(error ?? "Unable to update state.");
      } else {
        setStates((prev) =>
          prev.map((state) => (state.id === editingState.id ? item : state)),
        );
        setEditingState(null);
        setStateDialogError(null);
        setStateDialogOpen(false);
      }
      setSavingState(false);
      return;
    }

    await handleCreateState(name);
  };

  const handleDeleteState = async (stateId: State["id"]) => {
    const { error } = await locationService.deleteState(stateId);
    if (error) {
      setGlobalError(error);
      return;
    }
    setStates((prev) => prev.filter((state) => state.id !== stateId));
    setDeleteDialogOpen(false);
    setDeleteDialogContext(null);
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

  const handleSubmitDistrictDialog = async (name: string) => {
    if (editingDistrict) {
      if (!selectedState) {
        setDistrictDialogError("Select a state before renaming a district.");
        return;
      }
      setSavingDistrict(true);
      const { item, error } = await locationService.updateDistrict(
        selectedState.id,
        editingDistrict.id,
        name,
      );
      if (error || !item) {
        setDistrictDialogError(error ?? "Unable to update district.");
      } else {
        setDistricts((prev) =>
          prev.map((district) =>
            district.id === editingDistrict.id ? item : district,
          ),
        );
        setEditingDistrict(null);
        setDistrictDialogError(null);
        setDistrictDialogOpen(false);
      }
      setSavingDistrict(false);
      return;
    }

    await handleCreateDistrict(name);
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
    setDeleteDialogOpen(false);
    setDeleteDialogContext(null);
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

  const handleSubmitPincodeDialog = async (code: string) => {
    if (editingPincode) {
      if (!selectedDistrict) {
        setPincodeDialogError("Select a district before renaming a PIN code.");
        return;
      }
      setSavingPincode(true);
      const { item, error } = await locationService.updatePincode(
        selectedDistrict.id,
        editingPincode.id,
        code,
      );
      if (error || !item) {
        setPincodeDialogError(error ?? "Unable to update PIN code.");
      } else {
        setPincodes((prev) =>
          prev.map((pincode) =>
            pincode.id === editingPincode.id ? item : pincode,
          ),
        );
        setEditingPincode(null);
        setPincodeDialogError(null);
        setPincodeDialogOpen(false);
      }
      setSavingPincode(false);
      return;
    }

    await handleCreatePincode(code);
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
    setDeleteDialogOpen(false);
    setDeleteDialogContext(null);
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

  const handleSubmitLocationDialog = async (name: string) => {
    if (editingLocation) {
      if (!selectedPincode) {
        setLocationDialogError("Select a PIN code before renaming a location.");
        return;
      }
      setSavingLocation(true);
      const { item, error } = await locationService.updateLocation(
        selectedPincode.id,
        editingLocation.id,
        name,
      );
      if (error || !item) {
        setLocationDialogError(error ?? "Unable to update location.");
      } else {
        setLocations((prev) =>
          prev.map((location) =>
            location.id === editingLocation.id ? item : location,
          ),
        );
        setEditingLocation(null);
        setLocationDialogError(null);
        setLocationDialogOpen(false);
      }
      setSavingLocation(false);
      return;
    }

    await handleCreateLocation(name);
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
    setDeleteDialogOpen(false);
    setDeleteDialogContext(null);
  };

  const renderContent = () => {
    if (viewLevel === "country") {
      const staticCountries = [
        "India",
        "Malaysia",
        "Sri Lanka",
        "UAE",
        "Nepal",
      ];

      return (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staticCountries.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  void handleStaticCountryClick(name);
                }}
                className={`flex flex-col rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${getCountryCardClasses(
                  name,
                )}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Country
                </p>
                <p className="mt-2 text-xl font-semibold">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap to manage states
                </p>
              </button>
            ))}
          </div>
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
                setEditingState(null);
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
                setEditingState(null);
                setStateDialogError(null);
              }
            }}
            title={editingState ? "Edit state" : "Add state"}
            description={
              editingState
                ? "Update the name of this state."
                : selectedCountry
                  ? `Create a new state under ${selectedCountry.name}.`
                  : "Create a new state."
            }
            label="State name"
            placeholder="e.g. Uttar Pradesh"
            submitting={savingState}
            error={stateDialogError}
            initialValue={editingState?.name}
            onSubmit={handleSubmitStateDialog}
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
                    onClick={() => {
                      void handleSelectState(state);
                    }}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{state.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage districts
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingState(state);
                        setStateDialogError(null);
                        setStateDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        openDeleteDialog(
                          `Delete State: ${state.name}`,
                          state.name,
                          async () => {
                            await handleDeleteState(state.id);
                          },
                        );
                      }}
                    >
                      Delete
                    </Button>
                  </div>
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
                setEditingDistrict(null);
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
                setEditingDistrict(null);
                setDistrictDialogError(null);
              }
            }}
            title={editingDistrict ? "Edit district" : "Add district"}
            description={
              editingDistrict
                ? "Update the name of this district."
                : selectedState
                  ? `Create a new district under ${selectedState.name}.`
                  : "Create a new district."
            }
            label="District name"
            placeholder="e.g. Agra"
            submitting={savingDistrict}
            error={districtDialogError}
            initialValue={editingDistrict?.name}
            onSubmit={handleSubmitDistrictDialog}
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
                    onClick={() => {
                      void handleSelectDistrict(district);
                    }}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{district.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage PIN codes
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDistrict(district);
                        setDistrictDialogError(null);
                        setDistrictDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        openDeleteDialog(
                          `Delete District: ${district.name}`,
                          district.name,
                          async () => {
                            await handleDeleteDistrict(district.id);
                          },
                        );
                      }}
                    >
                      Delete
                    </Button>
                  </div>
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
                setEditingPincode(null);
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
                setEditingPincode(null);
                setPincodeDialogError(null);
              }
            }}
            title={editingPincode ? "Edit PIN code" : "Add PIN code"}
            description={
              editingPincode
                ? "Update the value of this PIN code."
                : selectedDistrict
                  ? `Create a new PIN code under ${selectedDistrict.name}.`
                  : "Create a new PIN code."
            }
            label="PIN code"
            placeholder="e.g. 282001"
            submitting={savingPincode}
            error={pincodeDialogError}
            initialValue={editingPincode?.code ?? undefined}
            onSubmit={handleSubmitPincodeDialog}
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
                    onClick={() => {
                      void handleSelectPincode(pincode);
                    }}
                    className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-medium">{pincode.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Tap to manage locations
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPincode(pincode);
                        setPincodeDialogError(null);
                        setPincodeDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        openDeleteDialog(
                          `Delete PIN Code: ${pincode.code}`,
                          pincode.code,
                          async () => {
                            await handleDeletePincode(pincode.id);
                          },
                        );
                      }}
                    >
                      Delete
                    </Button>
                  </div>
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
              setEditingLocation(null);
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
              setEditingLocation(null);
              setLocationDialogError(null);
            }
          }}
          title={editingLocation ? "Edit location" : "Add location"}
          description={
            editingLocation
              ? "Update the name of this location."
              : selectedPincode
                ? `Create a new location under PIN ${selectedPincode.code}.`
                : "Create a new location."
          }
          label="Location name"
          placeholder="e.g. Civil Lines"
          submitting={savingLocation}
          error={locationDialogError}
          initialValue={editingLocation?.name}
          onSubmit={handleSubmitLocationDialog}
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
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingLocation(location);
                      setLocationDialogError(null);
                      setLocationDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      openDeleteDialog(
                        `Delete Location: ${location.name}`,
                        location.name,
                        async () => {
                          await handleDeleteLocation(location.id);
                        },
                      );
                    }}
                  >
                    Delete
                  </Button>
                </div>
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

        <DeleteConfirmDialog
          open={deleteDialogOpen && !!deleteDialogContext}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setDeleteDialogContext(null);
            }
          }}
          title={deleteDialogContext?.title ?? ""}
          targetLabel={deleteDialogContext?.targetLabel ?? ""}
          submitting={deleting}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </main>
  );
}