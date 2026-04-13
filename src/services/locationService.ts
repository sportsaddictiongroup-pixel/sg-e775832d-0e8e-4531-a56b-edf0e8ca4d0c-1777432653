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
    const trimmed = name.trim();
    if (!trimmed) {
      return { item: null, error: "Country name is required." };
    }

    const { data, error } = await supabase
      .from("countries")
      .insert({ name: trimmed })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating country", error);
      return { item: null, error: "Unable to create country. Please try again." };
    }

    return { item: data as Country, error: null };
  },

  async getStatesByCountry(countryId: string): Promise<State[]> {
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

  async createState(countryId: string, name: string): Promise<CreateResult<State>> {
    const trimmed = name.trim();
    if (!countryId) {
      return { item: null, error: "Select a country before adding a state." };
    }
    if (!trimmed) {
      return { item: null, error: "State name is required." };
    }

    const { data, error } = await supabase
      .from("states")
      .insert({ name: trimmed, country_id: countryId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating state", error);
      return { item: null, error: "Unable to create state. Please try again." };
    }

    return { item: data as State, error: null };
  },

  async getDistrictsByState(stateId: string): Promise<District[]> {
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
    stateId: string,
    name: string,
  ): Promise<CreateResult<District>> {
    const trimmed = name.trim();
    if (!stateId) {
      return { item: null, error: "Select a state before adding a district." };
    }
    if (!trimmed) {
      return { item: null, error: "District name is required." };
    }

    const { data, error } = await supabase
      .from("districts")
      .insert({ name: trimmed, state_id: stateId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating district", error);
      return { item: null, error: "Unable to create district. Please try again." };
    }

    return { item: data as District, error: null };
  },

  async getPincodesByDistrict(districtId: string): Promise<Pincode[]> {
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
    districtId: string,
    code: string,
  ): Promise<CreateResult<Pincode>> {
    const trimmed = code.trim();
    if (!districtId) {
      return { item: null, error: "Select a district before adding a PIN code." };
    }
    if (!trimmed) {
      return { item: null, error: "PIN code is required." };
    }

    const { data, error } = await supabase
      .from("pincodes")
      .insert({ code: trimmed, district_id: districtId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating PIN code", error);
      return { item: null, error: "Unable to create PIN code. Please try again." };
    }

    return { item: data as Pincode, error: null };
  },

  async getLocationsByPincode(pincodeId: string): Promise<Location[]> {
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
    pincodeId: string,
    name: string,
  ): Promise<CreateResult<Location>> {
    const trimmed = name.trim();
    if (!pincodeId) {
      return { item: null, error: "Select a PIN code before adding a location." };
    }
    if (!trimmed) {
      return { item: null, error: "Location name is required." };
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({ name: trimmed, pincode_id: pincodeId })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      console.error("Error creating location", error);
      return { item: null, error: "Unable to create location. Please try again." };
    }

    return { item: data as Location, error: null };
  },
};