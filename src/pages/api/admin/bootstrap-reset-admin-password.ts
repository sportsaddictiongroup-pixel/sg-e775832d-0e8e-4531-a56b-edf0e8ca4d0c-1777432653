import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

interface BootstrapResetBody {
  username: string;
  newPassword: string;
  recoveryKey: string;
}

interface ApiResponseBody {
  success: boolean;
  message: string;
}

const RECOVERY_KEY = "SAG_ADMIN_RECOVERY_2026";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponseBody>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const { username, newPassword, recoveryKey } = req.body as BootstrapResetBody;

  // 1. Validate Recovery Key
  if (recoveryKey !== RECOVERY_KEY) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Invalid recovery key.",
    });
  }

  // 2. Validate Username
  if (username !== "admin") {
    return res.status(400).json({
      success: false,
      message: "Invalid request: This route is strictly for the 'admin' user only.",
    });
  }

  // 3. Validate Password Length
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  // 4. Initialize Supabase Admin Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Bootstrap Reset: Server configuration error missing URL or Service Key");
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
    // 5. Find the admin profile by exact username
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

    // 6. Verify role is exactly "admin"
    if (profile.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Target profile does not have the admin role.",
      });
    }

    // 7. Update the password using the profile ID as the auth user ID
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Bootstrap Reset API Error:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to reset password. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency admin password reset successfully. PLEASE DELETE THIS API ROUTE NOW.",
    });
  } catch (error) {
    console.error("Bootstrap Reset Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
}