import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      message: "Server configuration error.",
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Find the admin profile by exact username
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("username", "admin")
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found.",
      });
    }

    // 2. Verify role is exactly "admin"
    if (profile.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Target profile does not have the admin role.",
      });
    }

    // 3. Update the password using the profile ID as the auth user ID
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: "Admin@123" }
    );

    if (updateError) {
      console.error("Fix Admin Password API Error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to reset password.",
        error: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin password successfully reset to 'Admin@123'. PLEASE DELETE THIS API ROUTE NOW.",
    });
  } catch (error) {
    console.error("Fix Admin Password Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
}