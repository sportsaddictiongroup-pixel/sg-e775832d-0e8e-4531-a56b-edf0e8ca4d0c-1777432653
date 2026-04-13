import { SEO } from "@/components/SEO";
import { LocationManagement } from "@/components/admin/LocationManagement";

export default function LocationsPage(): JSX.Element {
  return (
    <>
      <SEO
        title="Location Management"
        description="Manage countries, states, districts, PIN codes, and locations."
      />
      <LocationManagement />
    </>
  );
}