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

    // 1 & 2. Read entered username and trim it
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      // Pre-flight: Clear any stale sessions to prevent silent auth failures
      await supabase.auth.signOut();

      // 3. Query public.profiles with exact .eq("username", trimmedUsername)
      const { data: lookupData, error: lookupError } = await supabase
        .from("profiles")
        .select("email, role")
        .eq("username", trimmedUsername)
        .maybeSingle();

      // 4. Verify role is exactly "admin"
      if (lookupError || !lookupData || lookupData.role !== "admin") {
        setError("Invalid login credentials.");
        setLoading(false);
        return;
      }

      // 5. Read profile.email
      if (!lookupData.email) {
        setError("Account configuration error.");
        setLoading(false);
        return;
      }

      // 6. Call supabase.auth.signInWithPassword (trimming the resolved email for safety)
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: lookupData.email.trim(),
        password: password,
      });

      if (signInError || !authData.user) {
        setError("Invalid login credentials.");
        setLoading(false);
        return;
      }

      // 7. If auth succeeds, fetch profile again by authenticated user.id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      // 8. Verify role is exactly "admin"
      if (profileError || !profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setError("You do not have admin access. Please use the partner login.");
        setLoading(false);
        return;
      }

      // 9. Redirect to /admin
      router.push("/admin");
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Unable to sign in at the moment. Please try again.");
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
                <p className="mb-3 text-sm text-destructive font-medium" role="alert">
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