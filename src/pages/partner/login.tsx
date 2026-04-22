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

export default function PartnerLogin(): JSX.Element {
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
      // 0. Proactively clear any stale/admin sessions before attempting a new partner login
      // This prevents cross-tab session contamination between admin and partner views
      await supabase.auth.signOut();

      // 1. Query public.profiles by exact username to resolve internal email
      const { data: lookupData, error: lookupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", trimmedUsername)
        .maybeSingle();

      // 2. If no record found
      if (lookupError || !lookupData) {
        console.error("Partner Login Lookup Error:", lookupError);
        setError(`Invalid login credentials. [Debug: User lookup failed ${lookupError?.message || 'Not found'}]`);
        setLoading(false);
        return;
      }

      // 3. If email missing
      if (!lookupData.email) {
        setError("Account configuration error. [Debug: No email attached to this username]");
        setLoading(false);
        return;
      }

      // 4. Call supabase.auth.signInWithPassword using the resolved internal email
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password: password,
      });

      if (signInError || !authData.user) {
        console.error("Partner Login Auth Error:", signInError);
        setError(`Invalid login credentials. [Debug: Auth failed ${signInError?.message || 'No user'}]`);
        setLoading(false);
        return;
      }

      // 5. Fetch the matching profile using auth user id to verify it's valid
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        console.error("Partner Login Profile Verify Error:", profileError);
        setError(`No profile found for this account. [Debug: Verify failed ${profileError?.message || 'Not found'}]`);
        setLoading(false);
        return;
      }

      // 6. Verify role (Allow login only if the resolved profile role exactly matches the intended partner role)
      if (profile.role !== "partner") {
        await supabase.auth.signOut();
        setError(`Invalid login credentials. [Debug: Role mismatch. Expected partner, got ${profile.role}]`);
        setLoading(false);
        return;
      }

      // 7. Preserve existing redirect
      router.push("/partner");
    } catch (err: any) {
      console.error("Partner Login Unexpected Error:", err);
      setError(`Unable to sign in at the moment. [Debug: ${err?.message || 'Unknown error'}]`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Partner Login" description="Sign in to the Partner portal." />
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Partner Login</CardTitle>
              <CardDescription>
                Sign in with your credentials.
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
                    placeholder="Enter your username"
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