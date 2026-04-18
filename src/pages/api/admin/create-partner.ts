import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

interface CreatePartnerBody {
  fullName?: string;
  mobileCountryCode?: string;
  mobileNumber?: string;
  whatsappCountryCode?: string;
  whatsappNumber?: string;
  email?: string;
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
  const whatsappNumber = (body.whatsappNumber ?? "").trim();
  const email = (body.email ?? "").trim();
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!fullName) {
    fieldErrors.fullName = "Full name is required.";
  }

  if (!mobileNumber) {
    fieldErrors.mobileNumber = "Mobile number is required.";
  } else if (!/^[0-9+]{7,18}$/.test(mobileNumber)) {
    fieldErrors.mobileNumber = "Enter a valid mobile number.";
  }

  if (!whatsappNumber) {
    fieldErrors.whatsappNumber = "WhatsApp number is required.";
  } else if (!/^[0-9+]{7,18}$/.test(whatsappNumber)) {
    fieldErrors.whatsappNumber = "Enter a valid WhatsApp number.";
  }

  if (!email) {
    fieldErrors.email = "Email ID is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!username) {
    fieldErrors.username = "Username is required.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters long.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({
      success: false,
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    });
    return;
  }

  const { data: existingMobile } = await (supabase as any)
    .from("partner_details")
    .select("profile_id")
    .eq("mobile_number", mobileNumber)
    .maybeSingle();

  if (existingMobile) {
    res.status(400).json({
      success: false,
      message: "Mobile number already exists",
      fieldErrors: {
        mobileNumber: "Mobile number already exists",
      },
    });
    return;
  }

  const { data: existingEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingEmail) {
    res.status(400).json({
      success: false,
      message: "Email ID already registered.",
      fieldErrors: {
        email: "Email ID already registered.",
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

  console.log("CreatePartner: creating auth user", {
    username,
    email,
  });

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    console.error("CreatePartner: SUPABASE_SERVICE_ROLE_KEY is missing");
    res.status(500).json({
      success: false,
      message: "Server configuration error: Service role key is missing.",
    });
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseServiceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      mobile_number: mobileNumber,
      whatsapp_number: whatsappNumber,
      role: "partner",
      username,
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

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: newUser.id,
      username: username,
      role: "partner",
      upline_profile_id: uplineProfileId,
    })
    .select("id")
    .maybeSingle();

  if (profileError || !profileData) {
    const errorMessage = profileError?.message || "Unknown database error";
    console.error("CreatePartner: profile insert failed", {
      error: profileError,
      message: errorMessage,
      details: profileError?.details,
      hint: profileError?.hint,
      newUserId: newUser.id,
    });

    // Rollback: safe cleanup so repeated retries do not leave broken orphan users
    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(newUser.id);
    if (rollbackError) {
      console.error("CreatePartner: Failed to rollback orphan auth user", rollbackError);
    } else {
      console.log("CreatePartner: Safely rolled back auth user after profile failure.");
    }

    res.status(500).json({
      success: false,
      message: `Profile creation failed (${errorMessage}). The login account was rolled back safely.`,
    });
    return;
  }

  const { error: pdError } = await (supabaseAdmin as any)
    .from("partner_details")
    .insert({
      profile_id: newUser.id,
      full_name: fullName,
      mobile_country_code: body.mobileCountryCode || null,
      mobile_number: mobileNumber,
      whatsapp_country_code: body.whatsappCountryCode || null,
      whatsapp_number: whatsappNumber,
      email: email,
      country_id: body.countryId || null,
      state_id: body.stateId || null,
      district_id: body.districtId || null,
      pincode_id: body.pincodeId || null,
      location_id: body.locationId || null
    });

  if (pdError) {
    const errorMessage = pdError?.message || "Unknown database error";
    console.error("CreatePartner: partner_details insert failed", {
      error: pdError,
      message: errorMessage,
      newUserId: newUser.id,
    });

    // Rollback: safe cleanup
    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(newUser.id);
    if (rollbackError) {
      console.error("CreatePartner: Failed to rollback orphan auth user after partner_details error", rollbackError);
    } else {
      console.log("CreatePartner: Safely rolled back auth user after partner_details failure.");
    }

    res.status(500).json({
      success: false,
      message: `Partner details creation failed (${errorMessage}). The login account was rolled back safely.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Partner created successfully.",
  });
}