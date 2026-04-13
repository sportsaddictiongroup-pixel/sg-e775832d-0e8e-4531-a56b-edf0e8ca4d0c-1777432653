import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function Home(): JSX.Element {
  return (
    <>
      <SEO
        title="Portal Selection | Admin & Partner"
        description="Access the Admin or Partner portal for territory-based partner management."
      />
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-4xl space-y-10">
          <header className="text-center space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.2em]">
              Territory Partner Management
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              Choose how you want to sign in
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Admins manage locations, territories, and partner accounts.
              Partners view their assigned territory, hierarchy, and update
              their profile securely.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Admin Portal</CardTitle>
                  <CardDescription>
                    Manage master data, partners, and territory assignments from
                    a single, consistent console.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Location hierarchy management</li>
                    <li>Create and manage partner accounts</li>
                    <li>View territory occupancy and vacancies</li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-0">
                <Link href="/admin/login" className="block">
                  <Button className="w-full">Go to Admin Login</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <CardTitle>Partner Portal</CardTitle>
                  <CardDescription>
                    Partners access their dashboard, see assigned territory, and
                    manage their credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Role and territory summary</li>
                    <li>Upline information overview</li>
                    <li>Secure password change</li>
                  </ul>
                </CardContent>
              </div>
              <CardContent className="pt-0">
                <Link href="/partner/login" className="block">
                  <Button variant="outline" className="w-full">
                    Go to Partner Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}