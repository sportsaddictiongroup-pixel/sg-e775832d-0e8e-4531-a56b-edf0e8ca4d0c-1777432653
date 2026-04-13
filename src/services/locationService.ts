import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Country = Tables<"countries">;
export type State = Tables<"states">;
export type District = Tables<"districts">;
export type Pincode = Tables<"pincodes">;
export type Location = Tables<"locations">;

interface CreateResult<T> {
  item: T | null;
  error: string | null;
}

interface DeleteResult {
  error: string | null;
}

const normalize = (value: string): string => value.trim();

export const locationService = {
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error fetching countries", error);
      return [];
    }

    return data as Country[];
  },

  async createCountry(name: string): Promise<CreateResult<Country>> {
    const trimmed = normalize(name);
    if (!trimmed) {
      return { item: null, error: "Country name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("countries")
      .select("id")
      .ilike("name", trimmed)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing country", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "A country with this name already exists.",
      };
    }

    const { data, error } = await supabase
      .from("countries")
      .insert({ name: trimmed })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating country", error);
      return {
        item: null,
        error: "Unable to create country. Please try again.",
      };
    }

    return { item: data as Country, error: null };
  },

  async getStatesByCountry(countryId: State["country_id"]): Promise<State[]> {
    if (!countryId) {
      return [];
    }

    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("country_id", countryId)
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error fetching states", error);
      return [];
    }

    return data as State[];
  },

  async createState(
    countryId: State["country_id"],
    name: string,
  ): Promise<CreateResult<State>> {
    const trimmed = normalize(name);

    if (!countryId) {
      return {
        item: null,
        error: "Select a country before adding a state.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "State name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("states")
      .select("id")
      .eq("country_id", countryId)
      .ilike("name", trimmed)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing state", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "This state already exists for the selected country.",
      };
    }

    const { data, error } = await supabase
      .from("states")
      .insert({ name: trimmed, country_id: countryId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating state", error);
      return {
        item: null,
        error: "Unable to create state. Please try again.",
      };
    }

    return { item: data as State, error: null };
  },

  async updateState(
    countryId: State["country_id"],
    stateId: State["id"],
    name: string,
  ): Promise<CreateResult<State>> {
    const trimmed = normalize(name);

    if (!stateId) {
      return { item: null, error: "Missing state identifier." };
    }

    if (!countryId) {
      return {
        item: null,
        error: "Select a country before renaming a state.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "State name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("states")
      .select("id")
      .eq("country_id", countryId)
      .ilike("name", trimmed)
      .neq("id", stateId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing state for update", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "This state already exists for the selected country.",
      };
    }

    const { data, error } = await supabase
      .from("states")
      .update({ name: trimmed })
      .eq("id", stateId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating state", error);
      return {
        item: null,
        error: "Unable to update state. Please try again.",
      };
    }

    return { item: data as State, error: null };
  },

  async deleteState(stateId: State["id"]): Promise<DeleteResult> {
    if (!stateId) {
      return { error: "Missing state identifier." };
    }

    const { data: children, error: childrenError } = await supabase
      .from("districts")
      .select("id")
      .eq("state_id", stateId)
      .limit(1);

    if (childrenError) {
      console.error(
        "Error checking child districts before delete",
        childrenError,
      );
      return {
        error: "Unable to verify child districts before deleting this state.",
      };
    }

    if (children && children.length > 0) {
      return {
        error: "Cannot delete state because districts exist under this state.",
      };
    }

    const { error } = await supabase.from("states").delete().eq("id", stateId);

    if (error) {
      console.error("Error deleting state", error);
      return { error: "Unable to delete state. Please try again." };
    }

    return { error: null };
  },

  async getDistrictsByState(
    stateId: District["state_id"],
  ): Promise<District[]> {
    if (!stateId) {
      return [];
    }

    const { data, error } = await supabase
      .from("districts")
      .select("*")
      .eq("state_id", stateId)
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error fetching districts", error);
      return [];
    }

    return data as District[];
  },

  async createDistrict(
    stateId: District["state_id"],
    name: string,
  ): Promise<CreateResult<District>> {
    const trimmed = normalize(name);

    if (!stateId) {
      return {
        item: null,
        error: "Select a state before adding a district.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "District name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("districts")
      .select("id")
      .eq("state_id", stateId)
      .ilike("name", trimmed)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing district", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "This district already exists for the selected state.",
      };
    }

    const { data, error } = await supabase
      .from("districts")
      .insert({ name: trimmed, state_id: stateId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating district", error);
      return {
        item: null,
        error: "Unable to create district. Please try again.",
      };
    }

    return { item: data as District, error: null };
  },

  async updateDistrict(
    stateId: District["state_id"],
    districtId: District["id"],
    name: string,
  ): Promise<CreateResult<District>> {
    const trimmed = normalize(name);

    if (!districtId) {
      return { item: null, error: "Missing district identifier." };
    }

    if (!stateId) {
      return {
        item: null,
        error: "Select a state before renaming a district.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "District name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("districts")
      .select("id")
      .eq("state_id", stateId)
      .ilike("name", trimmed)
      .neq("id", districtId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error(
        "Error checking existing district for update",
        existingError,
      );
    }

    if (existing) {
      return {
        item: null,
        error: "This district already exists for the selected state.",
      };
    }

    const { data, error } = await supabase
      .from("districts")
      .update({ name: trimmed })
      .eq("id", districtId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating district", error);
      return {
        item: null,
        error: "Unable to update district. Please try again.",
      };
    }

    return { item: data as District, error: null };
  },

  async deleteDistrict(districtId: District["id"]): Promise<DeleteResult> {
    if (!districtId) {
      return { error: "Missing district identifier." };
    }

    const { data: children, error: childrenError } = await supabase
      .from("pincodes")
      .select("id")
      .eq("district_id", districtId)
      .limit(1);

    if (childrenError) {
      console.error(
        "Error checking child PIN codes before delete",
        childrenError,
      );
      return {
        error:
          "Unable to verify child PIN codes before deleting this district.",
      };
    }

    if (children && children.length > 0) {
      return {
        error:
          "Cannot delete district because PIN codes exist under this district.",
      };
    }

    const { error } = await supabase
      .from("districts")
      .delete()
      .eq("id", districtId);

    if (error) {
      console.error("Error deleting district", error);
      return { error: "Unable to delete district. Please try again." };
    }

    return { error: null };
  },

  async getPincodesByDistrict(
    districtId: Pincode["district_id"],
  ): Promise<Pincode[]> {
    if (!districtId) {
      return [];
    }

    const { data, error } = await supabase
      .from("pincodes")
      .select("*")
      .eq("district_id", districtId)
      .order("code", { ascending: true });

    if (error || !data) {
      console.error("Error fetching pincodes", error);
      return [];
    }

    return data as Pincode[];
  },

  async createPincode(
    districtId: Pincode["district_id"],
    code: string,
  ): Promise<CreateResult<Pincode>> {
    const trimmed = normalize(code);

    if (!districtId) {
      return {
        item: null,
        error: "Select a district before adding a PIN code.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "PIN code is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("pincodes")
      .select("id")
      .eq("district_id", districtId)
      .ilike("code", trimmed)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing PIN code", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "This PIN code already exists for the selected district.",
      };
    }

    const { data, error } = await supabase
      .from("pincodes")
      .insert({ code: trimmed, district_id: districtId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating PIN code", error);
      return {
        item: null,
        error: "Unable to create PIN code. Please try again.",
      };
    }

    return { item: data as Pincode, error: null };
  },

  async updatePincode(
    districtId: Pincode["district_id"],
    pincodeId: Pincode["id"],
    code: string,
  ): Promise<CreateResult<Pincode>> {
    const trimmed = normalize(code);

    if (!pincodeId) {
      return { item: null, error: "Missing PIN code identifier." };
    }

    if (!districtId) {
      return {
        item: null,
        error: "Select a district before renaming a PIN code.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "PIN code is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("pincodes")
      .select("id")
      .eq("district_id", districtId)
      .ilike("code", trimmed)
      .neq("id", pincodeId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error(
        "Error checking existing PIN code for update",
        existingError,
      );
    }

    if (existing) {
      return {
        item: null,
        error: "This PIN code already exists for the selected district.",
      };
    }

    const { data, error } = await supabase
      .from("pincodes")
      .update({ code: trimmed })
      .eq("id", pincodeId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating PIN code", error);
      return {
        item: null,
        error: "Unable to update PIN code. Please try again.",
      };
    }

    return { item: data as Pincode, error: null };
  },

  async deletePincode(pincodeId: Pincode["id"]): Promise<DeleteResult> {
    if (!pincodeId) {
      return { error: "Missing PIN code identifier." };
    }

    const { data: children, error: childrenError } = await supabase
      .from("locations")
      .select("id")
      .eq("pincode_id", pincodeId)
      .limit(1);

    if (childrenError) {
      console.error(
        "Error checking child locations before delete",
        childrenError,
      );
      return {
        error: "Unable to verify locations before deleting this PIN code.",
      };
    }

    if (children && children.length > 0) {
      return {
        error:
          "Cannot delete PIN code because locations exist under this PIN code.",
      };
    }

    const { error } = await supabase
      .from("pincodes")
      .delete()
      .eq("id", pincodeId);

    if (error) {
      console.error("Error deleting PIN code", error);
      return { error: "Unable to delete PIN code. Please try again." };
    }

    return { error: null };
  },

  async getLocationsByPincode(
    pincodeId: Location["pincode_id"],
  ): Promise<Location[]> {
    if (!pincodeId) {
      return [];
    }

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("pincode_id", pincodeId)
      .order("name", { ascending: true });

    if (error || !data) {
      console.error("Error fetching locations", error);
      return [];
    }

    return data as Location[];
  },

  async createLocation(
    pincodeId: Location["pincode_id"],
    name: string,
  ): Promise<CreateResult<Location>> {
    const trimmed = normalize(name);

    if (!pincodeId) {
      return {
        item: null,
        error: "Select a PIN code before adding a location.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "Location name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("locations")
      .select("id")
      .eq("pincode_id", pincodeId)
      .ilike("name", trimmed)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing location", existingError);
    }

    if (existing) {
      return {
        item: null,
        error: "This location already exists for the selected PIN code.",
      };
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({ name: trimmed, pincode_id: pincodeId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating location", error);
      return {
        item: null,
        error: "Unable to create location. Please try again.",
      };
    }

    return { item: data as Location, error: null };
  },

  async updateLocation(
    pincodeId: Location["pincode_id"],
    locationId: Location["id"],
    name: string,
  ): Promise<CreateResult<Location>> {
    const trimmed = normalize(name);

    if (!locationId) {
      return { item: null, error: "Missing location identifier." };
    }

    if (!pincodeId) {
      return {
        item: null,
        error: "Select a PIN code before renaming a location.",
      };
    }

    if (!trimmed) {
      return { item: null, error: "Location name is required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("locations")
      .select("id")
      .eq("pincode_id", pincodeId)
      .ilike("name", trimmed)
      .neq("id", locationId)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error(
        "Error checking existing location for update",
        existingError,
      );
    }

    if (existing) {
      return {
        item: null,
        error: "This location already exists for the selected PIN code.",
      };
    }

    const { data, error } = await supabase
      .from("locations")
      .update({ name: trimmed })
      .eq("id", locationId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error updating location", error);
      return {
        item: null,
        error: "Unable to update location. Please try again.",
      };
    }

    return { item: data as Location, error: null };
  },

  async deleteLocation(locationId: Location["id"]): Promise<DeleteResult> {
    if (!locationId) {
      return { error: "Missing location identifier." };
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("location_id", locationId)
      .limit(1);

    if (assignmentsError) {
      console.error(
        "Error checking territory assignments before deleting location",
        assignmentsError,
      );
      return {
        error:
          "Unable to verify territory assignments before deleting this location.",
      };
    }

    if (assignments && assignments.length > 0) {
      return {
        error:
          "Cannot delete location because territory assignments exist for this location.",
      };
    }

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId);

    if (error) {
      console.error("Error deleting location", error);
      return { error: "Unable to delete location. Please try again." };
    }

    return { error: null };
  },
};