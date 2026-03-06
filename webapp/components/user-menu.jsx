"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Edit2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export function UserMenu() {
  const { data: session, update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [displayname, setDisplayname] = useState(session?.user?.displayname || "");
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

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
    </DropdownMenu>
  );
}
