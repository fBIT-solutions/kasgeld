"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function ProfileSettings() {
  const { data: session, update: updateSession } = useSession();
  const [displayname, setDisplayname] = useState(session?.user?.displayname || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  if (!session) {
    return null;
  }

  const handleSave = async (e) => {
    e.preventDefault();

    if (!displayname.trim()) {
      toast.error("Displaynaam kan niet leeg zijn");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/profile/update-displayname", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayname: displayname.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij het bijwerken van displaynaam");
        return;
      }

      // Update session
      await updateSession({
        ...session,
        user: {
          ...session.user,
          displayname: displayname.trim(),
        },
      });

      toast.success("Displaynaam bijgewerkt!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating display name:", error);
      toast.error("Fout bij het bijwerken van displaynaam");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayname(session?.user?.displayname || "");
    setIsEditing(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Mijn Profiel</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={session?.user?.email || ""}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <Label htmlFor="displayname">Displaynaam</Label>
            <div className="flex gap-2">
              <Input
                id="displayname"
                type="text"
                value={displayname}
                onChange={(e) => setDisplayname(e.target.value)}
                disabled={!isEditing || isLoading}
                placeholder="Voer je displaynaam in"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                Bewerken
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Annuleren
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
