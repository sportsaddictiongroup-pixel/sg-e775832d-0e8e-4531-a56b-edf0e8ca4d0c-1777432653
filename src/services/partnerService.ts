export type PartnerRoleValue =
  | "investor"
  | "state_head"
  | "district_head"
  | "pincode_head"
  | "pincode_partner";

export interface CreatePartnerInput {
  fullName: string;
  dobDay?: string;
  dobMonth?: string;
  dobYear?: string;
  mobileNumber: string;
  role: PartnerRoleValue;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  pincodeId?: string;
  locationId?: string;
  uplineUsername?: string;
  username: string;
  password: string;
}

export interface CreatePartnerResponse {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const partnerService = {
  async createPartner(
    input: CreatePartnerInput,
    accessToken: string,
  ): Promise<CreatePartnerResponse> {
    try {
      const response = await fetch("/api/admin/create-partner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as CreatePartnerResponse;

      if (!response.ok) {
        return {
          success: false,
          message:
            data.message ?? "Unable to create partner. Please try again.",
          fieldErrors: data.fieldErrors,
        };
      }

      return data;
    } catch {
      return {
        success: false,
        message: "Unable to create partner right now. Please try again.",
      };
    }
  },
};