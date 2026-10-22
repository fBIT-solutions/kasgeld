"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LogOut, Edit2, Loader, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ContactMessageButton } from "@/components/contact-message-button";
import { KasgeldRulesButton } from "@/components/kasgeld-rules-button";
import { useCommunity } from "@/context/CommunityContext";

export function UserMenu() {
  const { data: session, update: updateSession } = useSession();
  const { communities, activeCommunity, switchCommunity } = useCommunity();
  const [isEditing, setIsEditing] = useState(false);
  const [displayname, setDisplayname] = useState(session?.user?.displayname || "");
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [openPreferencesDialog, setOpenPreferencesDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  const months = [
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mrt" },
    { value: "04", label: "Apr" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Okt" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];

  if (!session?.user) {
    return null;
  }

  const displayName = session.user.displayname || `${session.user.firstname} ${session.user.lastname}`.trim() || session.user.email;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSaveDisplayname = async () => {
    if (!displayname.trim()) {
      toast.error("Displaynaam kan niet leeg zijn");
      return;
    }

    try {
      setIsSaving(true);

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

      // Update session immediately
      const updatedSession = {
        ...session,
        user: {
          ...session.user,
          displayname: displayname.trim(),
        },
      };
      
      await updateSession(updatedSession);

      toast.success("Displaynaam bijgewerkt!");
      setIsEditing(false);
      
      // Close dropdown to refresh the display
      setTimeout(() => {
        setOpen(false);
      }, 300);
    } catch (error) {
      console.error("Error updating display name:", error);
      toast.error("Fout bij het bijwerken van displaynaam");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPreferences = () => {
    setOpenPreferencesDialog(true);
  };

  // Load fresh preferences from database when dialog opens
  useEffect(() => {
    if (openPreferencesDialog && session?.user?.id) {
      setIsLoadingPreferences(true);
      setEditUser(null);

      const fetchPreferences = async () => {
        try {
          const response = await fetch(`/api/users?id=${encodeURIComponent(session.user.id)}`);
          if (response.ok) {
            const user = await response.json();
            setEditUser({
              ...user,
              preferences: user.preferences || { preferredHands: 1, preferredMonths: [] },
            });
          } else {
            console.error("Failed to fetch preferences");
            setEditUser({
              ...session.user,
              preferences: session.user.preferences || { preferredHands: 1, preferredMonths: [] },
            });
          }
        } catch (error) {
          console.error("Error fetching preferences:", error);
          setEditUser({
            ...session.user,
            preferences: session.user.preferences || { preferredHands: 1, preferredMonths: [] },
          });
        } finally {
          setIsLoadingPreferences(false);
        }
      };
      fetchPreferences();
    }
  }, [openPreferencesDialog, session?.user?.id]);

  const handleSavePreferences = async () => {
    try {
      setIsSavingPreferences(true);

      const response = await fetch(`/api/users?id=${encodeURIComponent(session.user.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUser),
      });

      if (response.ok) {
        const updated = await response.json();
        await updateSession({
          ...session,
          user: updated,
        });
        toast.success("Voorkeuren opgeslagen!");
        setOpenPreferencesDialog(false);
      } else {
        toast.error("Fout bij opslaan voorkeuren");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Fout bij opslaan voorkeuren");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-green-700 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{isEditing ? displayname : displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground mt-2">
              Rol: {Array.isArray(session.user.role) ? session.user.role.join(", ") : session.user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activeCommunity && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Community wijzigen
            </DropdownMenuLabel>
            {communities.map((community) => (
              <DropdownMenuItem
                key={community.id}
                onSelect={() => {
                  if (community.id !== activeCommunity.id) {
                    switchCommunity(community.id).catch((error) => toast.error(error.message));
                  }
                }}
                className="cursor-pointer"
              >
                <span className="flex-1">{community.name}</span>
                {community.id === activeCommunity.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {isEditing ? (
          <div className="px-2 py-3 space-y-2">
            <label className="text-xs font-medium">Displaynaam wijzigen</label>
            <Input
              value={displayname}
              onChange={(e) => setDisplayname(e.target.value)}
              placeholder="Voer displaynaam in"
              className="text-sm"
              autoFocus
              disabled={isSaving}
            />
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={handleSaveDisplayname}
                disabled={isSaving}
              >
                {isSaving && <Loader className="mr-1 h-3 w-3 animate-spin" />}
                Opslaan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  setDisplayname(session?.user?.displayname || "");
                }}
                disabled={isSaving}
              >
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="w-full px-2 py-2 text-sm text-left hover:bg-accent rounded-md flex items-center cursor-pointer"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            <span>Displaynaam wijzigen</span>
          </button>
        )}

        <DropdownMenuSeparator />
        
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground mb-2">Hulp & Informatie</p>
          <div className="flex gap-1">
            <KasgeldRulesButton />
            <ContactMessageButton />
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleOpenPreferences();
          }}
          className="cursor-pointer"
        >
          ⚙️ Voorkeuren
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            signOut({ redirect: true, callbackUrl: "/" });
          }}
          className="text-red-600 focus:text-red-600 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Uitloggen
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* User Preferences Dialog */}
      <Dialog open={openPreferencesDialog} onOpenChange={setOpenPreferencesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mijn Voorkeuren</DialogTitle>
            <DialogDescription>Stel je voorkeuren in voor automatische toewijzing</DialogDescription>
          </DialogHeader>

          {isLoadingPreferences ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : editUser ? (
            <div className="space-y-6">
              {/* Preferred Hands */}
              <div className="space-y-3">
                <Label>Voorkeur aantal handen</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <Button
                      key={num}
                      variant={editUser.preferences?.preferredHands === num ? "default" : "outline"}
                      onClick={() => {
                        setEditUser({
                          ...editUser,
                          preferences: {
                            ...editUser.preferences,
                            preferredHands: num,
                          },
                        });
                      }}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Preferred Months */}
              <div className="space-y-3">
                <Label>Voorkeur maanden (max 3)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {months.map((month) => {
                    const isSelected = editUser.preferences?.preferredMonths?.includes(month.value);
                    const canSelect = isSelected || (editUser.preferences?.preferredMonths?.length || 0) < 3;

                    return (
                      <div key={month.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month.value}`}
                          checked={isSelected}
                          disabled={!canSelect}
                          onCheckedChange={() => {
                            if (isSelected || (editUser.preferences?.preferredMonths?.length || 0) < 3) {
                              let newMonths = editUser.preferences?.preferredMonths || [];
                              if (isSelected) {
                                newMonths = newMonths.filter((m) => m !== month.value);
                              } else {
                                newMonths = [...newMonths, month.value];
                              }
                              setEditUser({
                                ...editUser,
                                preferences: {
                                  ...editUser.preferences,
                                  preferredMonths: newMonths,
                                },
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`month-${month.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {month.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {(editUser.preferences?.preferredMonths?.length || 0) > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {editUser.preferences?.preferredMonths?.length} van 3 geselecteerd
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSavePreferences}
                  disabled={isSavingPreferences}
                >
                  {isSavingPreferences && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpenPreferencesDialog(false)}
                  disabled={isSavingPreferences}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Fout bij laden van voorkeuren
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
