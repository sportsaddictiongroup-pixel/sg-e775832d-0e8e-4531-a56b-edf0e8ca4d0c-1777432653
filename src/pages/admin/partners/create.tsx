import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { authService } from "@/services/authService";
import {
  locationService,
  type Country,
  type State,
  type District,
  type Pincode,
  type Location,
} from "@/services/locationService";
import { partnerService } from "@/services/partnerService";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export default function CreatePartner(): JSX.Element {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedPincodeId, setSelectedPincodeId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [fullName, setFullName] = useState("");
  
  const [mobileCode, setMobileCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [whatsappCode, setWhatsappCode] = useState("+91");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  
  const [email, setEmail] = useState("");

  const [uplineUsername, setUplineUsername] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const user = await authService.getCurrentUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setAuthError("Unable to load your profile. Please try again.");
        setAuthLoading(false);
        return;
      }

      const profile = data as Profile;

      if (profile.role !== "admin") {
        await authService.signOut();
        router.replace("/partner/login");
        return;
      }

      setAuthError(null);
      setAuthLoading(false);

      const loadedCountries = await locationService.getCountries();
      if (!isMounted) return;
      setCountries(loadedCountries);
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (sameAsMobile) {
      setWhatsappCode(mobileCode);
      setWhatsappNumber(mobileNumber);
    }
  }, [sameAsMobile, mobileCode, mobileNumber]);

  const handleSelectCountry = async (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedStateId("");
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setStates([]);
    setDistricts([]);
    setPincodes([]);
    setLocations([]);

    if (!countryId) return;
    const loadedStates = await locationService.getStatesByCountry(countryId);
    setStates(loadedStates);
  };

  const handleSelectState = async (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId("");
    setSelectedPincodeId("");
    setDistricts([]);
    setPincodes([]);
    setLocations([]);

    if (!stateId) return;
    const loadedDistricts = await locationService.getDistrictsByState(stateId);
    setDistricts(loadedDistricts);
  };

  const handleSelectDistrict = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setSelectedPincodeId("");
    setPincodes([]);
    setLocations([]);

    if (!districtId) return;
    const loadedPincodes = await locationService.getPincodesByDistrict(districtId);
    setPincodes(loadedPincodes);
  };

  const handleSelectPincode = async (pincodeId: string) => {
    setSelectedPincodeId(pincodeId);
    setSelectedLocationId("");
    setLocations([]);

    if (!pincodeId) return;
    const loadedLocations = await locationService.getLocationsByPincode(pincodeId);
    setLocations(loadedLocations);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newFieldErrors.fullName = "Full name is required.";
    }

    if (!mobileNumber.trim()) {
      newFieldErrors.mobileNumber = "Mobile number is required.";
    }

    if (!sameAsMobile && !whatsappNumber.trim()) {
      newFieldErrors.whatsappNumber = "WhatsApp number is required.";
    }

    if (!email.trim()) {
      newFieldErrors.email = "Email ID is required.";
    }

    if (!username.trim()) {
      newFieldErrors.username = "Username is required.";
    }

    if (!password) {
      newFieldErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newFieldErrors.password = "Password must be at least 8 characters long.";
    }

    if (!confirmPassword) {
      newFieldErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = "Passwords must match.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setSubmitError("Please fix the highlighted fields and try again.");
      return;
    }

    const session = await authService.getCurrentSession();
    if (!session || !session.access_token) {
      setSubmitError("Your session has expired. Please sign in again.");
      return;
    }

    setSubmitting(true);

    try {
      const fullMobile = `${mobileCode.trim()}${mobileNumber.trim()}`;
      const fullWhatsapp = sameAsMobile 
        ? fullMobile 
        : `${whatsappCode.trim()}${whatsappNumber.trim()}`;

      const response = await partnerService.createPartner(
        {
          fullName: fullName.trim(),
          mobileNumber: fullMobile,
          whatsappNumber: fullWhatsapp,
          email: email.trim(),
          countryId: selectedCountryId || undefined,
          stateId: selectedStateId || undefined,
          districtId: selectedDistrictId || undefined,
          pincodeId: selectedPincodeId || undefined,
          locationId: selectedLocationId || undefined,
          uplineUsername: uplineUsername.trim() || undefined,
          username: username.trim(),
          password,
        },
        session.access_token,
      );

      if (!response.success) {
        setFieldErrors(response.fieldErrors ?? {});
        setSubmitError(
          response.message ?? "Unable to create partner. Please try again.",
        );
        return;
      }

      setSubmitSuccess("Partner created successfully.");
      setSubmitError(null);
    } catch {
      setSubmitError("Unable to create partner right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <SEO title="Create Partner" description="Create a new partner account." />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-sm text-muted-foreground">
            Checking your access...
          </p>
        </main>
      </>
    );
  }

  if (authError) {
    return (
      <>
        <SEO title="Create Partner" description="Create a new partner account." />
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
          <p className="text-sm text-destructive" role="alert">
            {authError}
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO title="Create Partner" description="Create a new partner account." />
      <main className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Admin Portal
            </p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold">
              Create Partner
            </h1>
            <p className="text-sm text-muted-foreground">
              Onboard a new partner with their details, address, and set login credentials.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Partner Details</CardTitle>
              <CardDescription>
                Fill in basic details, address details, and set login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitError && (
                <p className="mb-4 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="mb-4 text-sm text-emerald-600" role="status">
                  {submitSuccess}
                </p>
              )}
              <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold">Basic Details</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full Name *</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Enter full name"
                      />
                      {fieldErrors.fullName && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email ID *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter valid email ID"
                      />
                      {fieldErrors.email && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-number">Mobile Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={mobileCode}
                          onChange={(event) => setMobileCode(event.target.value)}
                          placeholder="+91"
                          className="w-20"
                        />
                        <Input
                          id="mobile-number"
                          value={mobileNumber}
                          onChange={(event) => setMobileNumber(event.target.value)}
                          placeholder="Enter mobile number"
                          className="flex-1"
                        />
                      </div>
                      {fieldErrors.mobileNumber && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.mobileNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="whatsapp-number">WhatsApp Number *</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="same-as-mobile" 
                            checked={sameAsMobile}
                            onCheckedChange={(checked) => setSameAsMobile(checked === true)}
                          />
                          <label
                            htmlFor="same-as-mobile"
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Same as Mobile Number
                          </label>
                        </div>
                      </div>
                      {!sameAsMobile && (
                        <div className="flex gap-2">
                          <Input
                            value={whatsappCode}
                            onChange={(event) => setWhatsappCode(event.target.value)}
                            placeholder="+91"
                            className="w-20"
                          />
                          <Input
                            id="whatsapp-number"
                            value={whatsappNumber}
                            onChange={(event) => setWhatsappNumber(event.target.value)}
                            placeholder="Enter WhatsApp number"
                            className="flex-1"
                          />
                        </div>
                      )}
                      {sameAsMobile && (
                        <div className="flex gap-2 opacity-60 pointer-events-none">
                          <Input value={mobileCode} readOnly className="w-20" />
                          <Input value={mobileNumber} readOnly className="flex-1" />
                        </div>
                      )}
                      {fieldErrors.whatsappNumber && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.whatsappNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold">Address Details</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={selectedCountryId}
                        onValueChange={(value) => handleSelectCountry(value)}
                      >
                        <SelectTrigger id="country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id as string}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={selectedStateId}
                        onValueChange={(value) => handleSelectState(value)}
                        disabled={!selectedCountryId}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.id as string}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Select
                        value={selectedDistrictId}
                        onValueChange={(value) => handleSelectDistrict(value)}
                        disabled={!selectedStateId}
                      >
                        <SelectTrigger id="district">
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id as string}>
                              {district.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">PIN Code</Label>
                      <Select
                        value={selectedPincodeId}
                        onValueChange={(value) => handleSelectPincode(value)}
                        disabled={!selectedDistrictId}
                      >
                        <SelectTrigger id="pincode">
                          <SelectValue placeholder="Select PIN code" />
                        </SelectTrigger>
                        <SelectContent>
                          {pincodes.map((pincode) => (
                            <SelectItem key={pincode.id} value={pincode.id as string}>
                              {pincode.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location / Area</Label>
                      <Select
                        value={selectedLocationId}
                        onValueChange={(value) => setSelectedLocationId(value)}
                        disabled={!selectedPincodeId}
                      >
                        <SelectTrigger id="location">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id as string}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold">Upline</h2>
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="upline-username">
                      Upline Username (optional)
                    </Label>
                    <Input
                      id="upline-username"
                      value={uplineUsername}
                      onChange={(event) => setUplineUsername(event.target.value)}
                      placeholder="Leave blank to default to Admin"
                    />
                    {fieldErrors.uplineUsername && (
                      <p className="text-xs text-destructive">
                        {fieldErrors.uplineUsername}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-semibold">Login Credentials</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Set login username"
                      />
                      {fieldErrors.username && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.username}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Temporary password"
                      />
                      {fieldErrors.password && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter password"
                      />
                      {fieldErrors.confirmPassword && (
                        <p className="text-xs text-destructive">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating partner..." : "Create Partner"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}