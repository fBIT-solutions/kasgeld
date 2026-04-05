"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function AppSettingsPanel() {
  const [adminEmail, setAdminEmail] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings/get-config");
      const data = await response.json();
      setAdminEmail(data.adminEmail || "");
      setPaymentUrl(data.paymentUrl || "");
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Fout bij ophalen van instellingen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!adminEmail.trim()) {
      toast.error("Admin email is verplicht");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast.error("Ongeldig email adres");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings/get-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail,
          paymentUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij opslaan");
        return;
      }

      toast.success("Instellingen opgeslagen!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Fout bij opslaan van instellingen");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>App Instellingen</CardTitle>
        <CardDescription>Beheer de algemene instellingen van Kasgeld</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="admin-email">Beheerder Email Adres</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Dit adres ontvangt berichten van gebruikers en notifications
            </p>
          </div>
          <div>
            <Label htmlFor="payment-url">Betaal URL</Label>
            <Input
              id="payment-url"
              type="url"
              placeholder="https://example.com/payment"
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
             Geef hier een betaallink op zodat deelnemers hun inleg kunnen voldoen.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Bezig met opslaan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Instellingen Opslaan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
