"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RegistrationRequestForm } from "@/components/registration-request-form";

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState("login-method"); // "login-method" | "credentials" | "otp-verify" | "password-change"
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login"); // "login" | "registration"

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

      // If error, check if it's OTP requirement
      if (res?.error) {
        // Check whether this is a newly created account requiring its one-time code.
        try {
          const statusResponse = await fetch("/api/auth/otp-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const accountStatus = await statusResponse.json();
          if (statusResponse.ok && accountStatus.requiresOtp) {
            setStep("otp-verify");
            toast.info("OTP vereist - voer je eenmalige code in");
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error("Error checking for OTP:", err);
        }

        // If no OTP found, show error
        toast.error("Ongeldige inloggegevens");
        setIsLoading(false);
        return;
      }

      if (res?.ok) {
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

  const handleOtpVerifyStart = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is verplicht");
      return;
    }

    // Just switch to OTP verify step - the user will enter OTP there
    setStep("otp-verify");
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

      setUserData(data.user);

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

      toast.success("Wachtwoord gewijzigd! Je wordt ingelogd...");
      setIsLoading(false);
      
      // Wait a moment for the update to be processed, then refresh to get new session
      setTimeout(() => {
        window.location.replace("/");
      }, 1000);
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("Fout bij wachtwoord wijzigen");
      setIsLoading(false);
    }
  };

  // Show registration form if activeTab is "registration"
  if (activeTab === "registration") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <RegistrationRequestForm 
          onSuccess={() => {
            setActiveTab("login");
          }}
          onCancel={() => {
            setActiveTab("login");
          }}
        />
      </div>
    );
  }

  // Show login form
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {step === "login-method" && "Hoe wil je inloggen?"}
            {step === "credentials" && "Inloggen"}
            {step === "otp-verify" && "Verificatie Code"}
            {step === "password-change" && "Wachtwoord Wijzigen"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "login-method" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-6">
                Kies hoe je wilt inloggen. Heb je net een welkomsmail met OTP ontvangen? Selecteer dan "Met OTP Code".
              </p>
              
              <Button
                onClick={() => setStep("credentials")}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                🔐 Normaal Inloggen
              </Button>
              
              <Button
                onClick={() => {
                  setStep("otp-verify");
                  setEmail("");
                  setPassword("");
                  setOtp("");
                }}
                variant="outline"
                className="w-full"
                size="lg"
              >
                📧 Met OTP Code
              </Button>

              <div className="mt-6 pt-6 border-t">
                <p className="text-gray-600 text-sm mb-3 text-center">Nog geen account?</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("registration")}
                  className="w-full"
                >
                  Dien een Registratieverzoek In
                </Button>
              </div>
            </div>
          )}

          {step === "credentials" && (
            <>
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("login-method")}
                  disabled={isLoading}
                  className="w-full"
                >
                  Terug
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <p className="text-gray-600 mb-2">Nog geen account?</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("registration")}
                  className="w-full"
                >
                  Dien een Registratieverzoek In
                </Button>
              </div>
            </>
          )}

          {step === "otp-verify" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Je hebt zojuist een welkomsmail ontvangen!</strong><br/>
                  Voer je email en de 6-cijferige code uit de mail in om in te loggen.
                </p>
              </div>

              <div>
                <Label htmlFor="email-otp">Email</Label>
                <Input
                  id="email-otp"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <Label htmlFor="otp">Verificatie Code (OTP)</Label>
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
                disabled={isLoading || otp.length !== 6 || !email}
                className="w-full"
              >
                {isLoading ? "Bezig met verificatie..." : "Code Verifiëren"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("login-method");
                  setOtp("");
                  setEmail("");
                }}
                disabled={isLoading}
                className="w-full"
              >
                Terug
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

export default SignInForm;
