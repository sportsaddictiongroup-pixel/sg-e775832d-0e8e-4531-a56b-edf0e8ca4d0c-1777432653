import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: unknown;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_VERCEL_URL ??
    process?.env?.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  if (!url) {
    url = "http://localhost:3000";
  }

  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;

  return url;
};

export const authService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
      created_at: user.created_at,
    };
  },

  async getCurrentSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  async signUp(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/confirm-email`,
        },
      });

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.status?.toString() },
        };
      }

      const authUser = data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
            user_metadata: data.user.user_metadata,
            created_at: data.user.created_at,
          }
        : null;

      return { user: authUser, error: null };
    } catch {
      return {
        user: null,
        error: { message: "An unexpected error occurred during sign up" },
      };
    }
  },

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      console.log("Auth: signInWithPassword - attempting", { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Auth: signInWithPassword - response", { email, data, error });

      if (error) {
        console.error("Auth: signInWithPassword - Supabase error", error);
        return {
          user: null,
          error: { message: error.message, code: error.status?.toString() },
        };
      }

      const authUser = data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
            user_metadata: data.user.user_metadata,
            created_at: data.user.created_at,
          }
        : null;

      return { user: authUser, error: null };
    } catch (error) {
      console.error("Auth: signInWithPassword - unexpected error", error);
      return {
        user: null,
        error: { message: "An unexpected error occurred during sign in" },
      };
    }
  },

  async signInWithUsername(
    username: string,
    password: string,
  ): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      return { user: null, error: { message: "Username is required" } };
    }

    const primaryEmail = `${trimmed}@partners.app.example.com`;
    const fallbackEmail = `${trimmed}@app.local`;

    console.log("Auth: signInWithUsername - primary mapping", {
      username: trimmed,
      email: primaryEmail,
    });

    const primaryResult = await this.signIn(primaryEmail, password);

    if (primaryResult.user) {
      return primaryResult;
    }

    console.log("Auth: signInWithUsername - primary failed, trying fallback", {
      username: trimmed,
      primaryEmail,
      fallbackEmail,
      primaryError: primaryResult.error,
    });

    const fallbackResult = await this.signIn(fallbackEmail, password);

    return fallbackResult;
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch {
      return {
        error: { message: "An unexpected error occurred during sign out" },
      };
    }
  },

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch {
      return {
        error: { message: "An unexpected error occurred during password reset" },
      };
    }
  },

  async confirmEmail(
    token: string,
    type: "signup" | "recovery" | "email_change" = "signup",
  ): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.status?.toString() },
        };
      }

      const authUser = data.user
        ? {
            id: data.user.id,
            email: data.user.email || "",
            user_metadata: data.user.user_metadata,
            created_at: data.user.created_at,
          }
        : null;

      return { user: authUser, error: null };
    } catch {
      return {
        user: null,
        error: {
          message: "An unexpected error occurred during email confirmation",
        },
      };
    }
  },

  async changePassword(
    newPassword: string,
  ): Promise<{ error: AuthError | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          error: { message: "You must be logged in to change your password" },
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch {
      return {
        error: {
          message: "An unexpected error occurred while changing password",
        },
      };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};