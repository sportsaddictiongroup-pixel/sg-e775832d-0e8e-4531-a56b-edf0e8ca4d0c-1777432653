import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin(): JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Query public.profiles by exact username
      const { data: lookupData, error: lookupError } = await supabase
        .from("profiles")
        .select("email, role")
        .eq("username", trimmedUsername)
        .maybeSingle();

      // 2. If not found -> show safe invalid login message
      if (lookupError || !lookupData) {
        setError("Invalid login credentials.");
        setLoading(false);
        return;
      }

      // 3. Verify role is exactly 'admin' before attempting auth
      if (lookupData.role !== "admin") {
        setError("Invalid login credentials.");
        setLoading(false);
        return;
      }

      // 4. If email missing -> show safe config error
      if (!lookupData.email) {
        setError("Account configuration error.");
        setLoading(false);
        return;
      }

      // 5. Call supabase.auth.signInWithPassword
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password: password,
      });

      if (signInError || !authData.user) {
        console.error("Admin login failed at auth step", { signInError });
        setError("Invalid login credentials.");
        setLoading(false);
        return;
      }

      const user = authData.user;
      console.log("Admin login: fetching profile for user", { userId: user.id });

      // 6. After successful auth, fetch profile by authenticated user id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error("Admin login failed while fetching profile", {
          userId: user.id,
          profileError,
        });
        await supabase.auth.signOut();
        setError("No profile found for this account.");
        setLoading(false);
        return;
      }

      // 7. Verify role is exactly 'admin'
      if (profile.role !== "admin") {
        console.error("Admin login blocked due to non-admin role", { profile });
        await supabase.auth.signOut();
        setError("You do not have admin access. Please use the partner login.");
        setLoading(false);
        return;
      }

      // 8. Preserve existing redirect behavior
      router.push("/admin");
    } catch (error) {
      console.error("Admin login unexpected error", error);
      setError("Unable to sign in at the moment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Admin Login" description="Sign in to the Admin portal." />
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>
                Sign in using your admin credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="mb-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}