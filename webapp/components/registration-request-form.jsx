"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function RegistrationRequestForm({ onSuccess, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    handsCount: "",
    referrer: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.displayName.trim() || !formData.email.trim()) {
      toast.error("Voornaam, achternaam, weergavenaam en email zijn verplicht");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Voer een geldig emailadres in");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/registration-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          displayName: formData.displayName.trim(),
          email: formData.email.trim(),
          handsCount: formData.handsCount ? parseInt(formData.handsCount) : 0,
          referrer: formData.referrer.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij het indienen van registratieverzoek");
        return;
      }

      toast.success(data.message || "Registratieverzoek ingediend!");
      setFormData({
        firstName: "",
        lastName: "",
        displayName: "",
        email: "",
        handsCount: "",
        referrer: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error("Fout bij het indienen van registratieverzoek");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Registratieverzoek</CardTitle>
        <CardDescription>
          Dien een verzoek in om deel te nemen aan Kasgeld
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Voornaam *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jan"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Achternaam *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Janssen"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="displayName">Weergavenaam *</Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="Oom Jan (zichtbaar voor alle deelnemers)"
              value={formData.displayName}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Emailadres *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jan@example.com"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="handsCount">Gewenste aantal handen</Label>
            <Input
              id="handsCount"
              name="handsCount"
              type="number"
              placeholder="2"
              min="0"
              value={formData.handsCount}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="referrer">Doorverwijzer</Label>
            <Input
              id="referrer"
              name="referrer"
              placeholder="Wie wees je op Kasgeld?"
              value={formData.referrer}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Verzoek indienen"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Annuleren
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
