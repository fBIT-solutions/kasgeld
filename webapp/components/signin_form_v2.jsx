"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState("credentials"); // "credentials" | "otp" | "password-change"
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Login credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [userData, setUserData] = useState(null);

  // Step 3: Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email en wachtwoord zijn verplicht");
      return;
    }

    try {
      setIsLoading(true);

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Ongeldige inloggegevens");
        setIsLoading(false);
        return;
      }

      if (res?.ok) {
        // Check if user has OTP (new user)
        const userResponse = await fetch("/api/users", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (userResponse.ok) {
          const users = await userResponse.json();
          const user = users.find(u => u.email === email);

          if (user?.otp) {
            // User has OTP - needs to verify it
            setUserData(user);
            setStep("otp");
            setIsLoading(false);
            return;
          }

          // No OTP - regular login
          toast.success("Je bent ingelogd!");
          setIsLoading(false);
          router.push("/");
          return;
        }

        // If we can't check, assume regular login
        toast.success("Je bent ingelogd!");
        setIsLoading(false);
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Inloggen mislukt");
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("OTP code is verplicht");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Ongeldige OTP code");
        setIsLoading(false);
        return;
      }

      if (data.mustChangePassword) {
        // Need to change password
        setStep("password-change");
        setIsLoading(false);
      } else {
        // OTP verified, can proceed to login
        toast.success("OTP geverifieerd!");
        setIsLoading(false);
        router.push("/");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Fout bij verificatie");
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Beide wachtwoord velden zijn verplicht");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Wachtwoorden komen niet overeen");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 karakters lang zijn");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData?.id,
          newPassword,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij wachtwoord wijzigen");
        setIsLoading(false);
        return;
      }

      toast.success("Wachtwoord gewijzigd! Je bent nu ingelogd.");
      setIsLoading(false);
      router.push("/");
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Fout bij wachtwoord wijzigen");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {step === "credentials" && "Inloggen"}
            {step === "otp" && "Verificatie Code"}
            {step === "password-change" && "Wachtwoord Wijzigen"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Bezig met inloggen..." : "Inloggen"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  We hebben een verificatie code naar je email gezonden. Voer deze in:
                </p>
              </div>

              <div>
                <Label htmlFor="otp">Verificatie Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  required
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading ? "Bezig met verificatie..." : "Code Verifiëren"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                }}
                disabled={isLoading}
                className="w-full"
              >
                Terug naar Inloggen
              </Button>
            </form>
          )}

          {step === "password-change" && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Eerste keer inloggen:</strong> Je moet je wachtwoord wijzigen voordat je verder kunt gaan.
                </p>
              </div>

              <div>
                <Label htmlFor="new-password">Nieuw Wachtwoord</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimaal 8 karakters
                </p>
              </div>

              <div>
                <Label htmlFor="confirm-password">Wachtwoord Bevestigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isLoading ? "Bezig met opslaan..." : "Wachtwoord Wijzigen"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
