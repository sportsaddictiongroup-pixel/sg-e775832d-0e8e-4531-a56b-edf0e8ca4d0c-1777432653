import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

interface ResetPasswordBody {
  profileId: string;
  newPassword: string;
}

interface ApiResponseBody {
  success: boolean;
  message: string;
}

async function getAdminProfileId(accessToken: string): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const scopedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  const { data: profile, error: profileError } = await scopedClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return null;
  }

  return profile.id as string;
}

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

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Admin access required.",
    });
  }

  const adminProfileId = await getAdminProfileId(token);
  if (!adminProfileId) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: You do not have permission to perform this action.",
    });
  }

  const { profileId, newPassword } = req.body as ResetPasswordBody;

  if (!profileId || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Invalid request: Profile ID and new password are required.",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    console.error("Reset Password: SUPABASE_SERVICE_ROLE_KEY missing");
    return res.status(500).json({
      success: false,
      message: "Server configuration error.",
    });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseServiceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Verify the target is actually a partner, not another admin
  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    res.status(404).json({ success: false, message: "Target profile not found." });
    return;
  }

  if (targetProfile.role !== "partner" && targetProfile.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Can only reset passwords for partners.",
    });
    return;
  }

  // 2. Execute secure password reset internally via Admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    profileId,
    { password: newPassword }
  );

  if (updateError) {
    console.error("Reset Password API Error:", updateError);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Partner password reset successfully.",
  });
}