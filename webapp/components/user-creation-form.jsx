"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function UserCreationForm({ onUserCreated }) {
  const [formData, setFormData] = useState({
    email: "",
    firstname: "",
    lastname: "",
    displayname: "",
    role: "member",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      toast.error("Email is verplicht");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/users/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij het aanmaken van gebruiker");
        return;
      }

      toast.success(`Gebruiker aangemaakt! Welkomstmail verzonden naar ${formData.email}`);

      // Reset form
      setFormData({
        email: "",
        firstname: "",
        lastname: "",
        displayname: "",
        role: "member",
      });

      if (onUserCreated) {
        onUserCreated(data);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Fout bij het aanmaken van gebruiker");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Nieuwe Gebruiker Aanmaken</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="firstname">Voornaam</Label>
            <Input
              id="firstname"
              name="firstname"
              placeholder="Jan"
              value={formData.firstname}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="lastname">Achternaam</Label>
            <Input
              id="lastname"
              name="lastname"
              placeholder="Jansen"
              value={formData.lastname}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="displayname">Weergavenaam</Label>
            <Input
              id="displayname"
              name="displayname"
              placeholder="Jan Jansen"
              value={formData.displayname}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Bezig met aanmaken...
              </>
            ) : (
              "Gebruiker Aanmaken"
            )}
          </Button>

          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded">
            <p>
              De gebruiker ontvangt een welkomstmail met:
              <ul className="list-disc pl-5 mt-2">
                <li>Inlogemail</li>
                <li>Temporary wachtwoord</li>
                <li>6-cijferig OTP code</li>
              </ul>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
