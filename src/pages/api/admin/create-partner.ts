import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

type PartnerRoleValue =
  | "investor"
  | "state_head"
  | "district_head"
  | "pincode_head"
  | "pincode_partner";

interface CreatePartnerBody {
  fullName?: string;
  dobDay?: string;
  dobMonth?: string;
  dobYear?: string;
  mobileNumber?: string;
  role?: PartnerRoleValue;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  pincodeId?: string;
  locationId?: string;
  uplineUsername?: string;
  username?: string;
  password?: string;
}

interface ApiResponseBody {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const partnerRoles: PartnerRoleValue[] = [
  "investor",
  "state_head",
  "district_head",
  "pincode_head",
  "pincode_partner",
];

const INTERNAL_EMAIL_DOMAIN = "partners.app.example.com";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function getAdminProfileId(
  accessToken: string,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return null;
  }

  return profile.id as string;
}

async function resolveUplineProfileId(
  uplineUsername: string | undefined,
): Promise<string | null> {
  if (uplineUsername && uplineUsername.trim().length > 0) {
    const trimmed = uplineUsername.trim();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.id as string;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

async function checkTerritoryConflict(
  role: PartnerRoleValue | undefined,
  body: CreatePartnerBody,
): Promise<string | null> {
  if (!role) {
    return null;
  }

  if (role === "state_head") {
    if (!body.stateId) {
      return "State is required for State Head.";
    }
    const { data, error } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("role", "state_head")
      .eq("state_id", body.stateId)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return "This State Head position is already assigned.";
    }
  }

  if (role === "district_head") {
    if (!body.districtId) {
      return "District is required for District Head.";
    }
    const { data, error } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("role", "district_head")
      .eq("district_id", body.districtId)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return "This District Head position is already assigned.";
    }
  }

  if (role === "pincode_head") {
    if (!body.pincodeId) {
      return "PIN Code is required for PIN Code Head.";
    }
    const { data, error } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("role", "pincode_head")
      .eq("pincode_id", body.pincodeId)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return "This PIN Code Head position is already assigned.";
    }
  }

  if (role === "pincode_partner") {
    if (!body.locationId) {
      return "Location is required for PIN Code Partner.";
    }
    const { data, error } = await supabase
      .from("territory_assignments")
      .select("id")
      .eq("role", "pincode_partner")
      .eq("location_id", body.locationId)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return "This PIN Code Partner position is already assigned.";
    }
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponseBody>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      success: false,
      message: "Method not allowed for this endpoint.",
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "You must be signed in as an admin to create partners.",
    });
    return;
  }

  const adminProfileId = await getAdminProfileId(token);
  if (!adminProfileId) {
    res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
    return;
  }

  const body = req.body as CreatePartnerBody;
  const fieldErrors: Record<string, string> = {};

  const fullName = (body.fullName ?? "").trim();
  const mobileNumber = (body.mobileNumber ?? "").trim();
  const rawUsername = (body.username ?? "").trim();
  const username = rawUsername;
  const normalizedUsername = normalizeUsername(rawUsername);
  const password = body.password ?? "";
  const role = body.role;

  if (!fullName) {
    fieldErrors.fullName = "Full name is required.";
  }

  if (!mobileNumber) {
    fieldErrors.mobileNumber = "Mobile number is required.";
  } else if (!/^[0-9]{7,15}$/.test(mobileNumber)) {
    fieldErrors.mobileNumber = "Enter a valid mobile number.";
  }

  if (!role || !partnerRoles.includes(role)) {
    fieldErrors.role = "Select a valid role.";
  }

  if (!username) {
    fieldErrors.username = "Username is required.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters long.";
  }

  if (role === "state_head") {
    if (!body.countryId) {
      fieldErrors.countryId = "Country is required for State Head.";
    }
    if (!body.stateId) {
      fieldErrors.stateId = "State is required for State Head.";
    }
  }

  if (role === "district_head") {
    if (!body.countryId) {
      fieldErrors.countryId = "Country is required for District Head.";
    }
    if (!body.stateId) {
      fieldErrors.stateId = "State is required for District Head.";
    }
    if (!body.districtId) {
      fieldErrors.districtId = "District is required for District Head.";
    }
  }

  if (role === "pincode_head") {
    if (!body.countryId) {
      fieldErrors.countryId = "Country is required for PIN Code Head.";
    }
    if (!body.stateId) {
      fieldErrors.stateId = "State is required for PIN Code Head.";
    }
    if (!body.districtId) {
      fieldErrors.districtId = "District is required for PIN Code Head.";
    }
    if (!body.pincodeId) {
      fieldErrors.pincodeId = "PIN Code is required for PIN Code Head.";
    }
  }

  if (role === "pincode_partner") {
    if (!body.countryId) {
      fieldErrors.countryId =
        "Country is required for PIN Code Partner assignment.";
    }
    if (!body.stateId) {
      fieldErrors.stateId =
        "State is required for PIN Code Partner assignment.";
    }
    if (!body.districtId) {
      fieldErrors.districtId =
        "District is required for PIN Code Partner assignment.";
    }
    if (!body.pincodeId) {
      fieldErrors.pincodeId =
        "PIN Code is required for PIN Code Partner assignment.";
    }
    if (!body.locationId) {
      fieldErrors.locationId =
        "Location is required for PIN Code Partner assignment.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({
      success: false,
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    });
    return;
  }

  const { data: existingMobile } = await supabase
    .from("profiles")
    .select("id")
    .eq("mobile_number", mobileNumber)
    .maybeSingle();

  if (existingMobile) {
    res.status(400).json({
      success: false,
      message: "Mobile number already exists.",
      fieldErrors: {
        mobileNumber: "Mobile number already exists.",
      },
    });
    return;
  }

  const { data: existingUsername } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    res.status(400).json({
      success: false,
      message: "Username already exists.",
      fieldErrors: {
        username: "Username already exists.",
      },
    });
    return;
  }

  if (role) {
    const conflictMessage = await checkTerritoryConflict(role, body);
    if (conflictMessage) {
      res.status(400).json({
        success: false,
        message: conflictMessage,
      });
      return;
    }
  }

  const uplineProfileId = await resolveUplineProfileId(body.uplineUsername);
  if (!uplineProfileId) {
    res.status(400).json({
      success: false,
      message: "Upline profile not found. Please check the username.",
      fieldErrors: {
        uplineUsername: "Upline profile not found.",
      },
    });
    return;
  }

  const email = `${normalizedUsername}@${INTERNAL_EMAIL_DOMAIN}`;

  console.log("CreatePartner: creating auth user", {
    username,
    normalizedUsername,
    email,
  });

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        mobile_number: mobileNumber,
        role,
        username,
      },
    },
  });

  if (signUpError || !signUpData.user) {
    console.error("CreatePartner: auth signUp error", signUpError);
    res.status(400).json({
      success: false,
      message:
        signUpError?.message ??
        "Unable to create login credentials. Please try again.",
    });
    return;
  }

  const newUser = signUpData.user;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: newUser.id,
      full_name: fullName,
      username,
      mobile_number: mobileNumber,
      role,
      upline_profile_id: uplineProfileId,
      email,
    })
    .select("id")
    .maybeSingle();

  if (profileError || !profileData) {
    console.error("CreatePartner: profile insert failed", {
      profileError,
      newUserId: newUser.id,
    });
    res.status(500).json({
      success: false,
      message:
        "User was created in authentication, but profile creation failed. Please contact support.",
    });
    return;
  }

  if (role && role !== "investor") {
    const territoryPayload: {
      profile_id: string;
      role: PartnerRoleValue;
      country_id: string | null;
      state_id: string | null;
      district_id: string | null;
      pincode_id: string | null;
      location_id: string | null;
      is_active: boolean;
    } = {
      profile_id: profileData.id as string,
      role,
      country_id: body.countryId ?? null,
      state_id: body.stateId ?? null,
      district_id: body.districtId ?? null,
      pincode_id: body.pincodeId ?? null,
      location_id: body.locationId ?? null,
      is_active: true,
    };

    const { error: territoryError } = await supabase
      .from("territory_assignments")
      .insert(territoryPayload);

    if (territoryError) {
      console.error("CreatePartner: territory assignment insert failed", {
        territoryError,
        profileId: profileData.id,
      });
      res.status(500).json({
        success: false,
        message:
          "Partner was created, but territory assignment failed. Please review the Territory Management page.",
      });
      return;
    }
  }

  res.status(200).json({
    success: true,
    message: "Partner created successfully.",
  });
}