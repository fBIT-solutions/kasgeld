"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCommunity } from "@/context/CommunityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CommunitySettings() {
  const { data: session } = useSession();
  const {
    activeCommunity,
    activeCommunityId,
    createCommunity,
    refresh,
  } = useCommunity();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const refreshMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/communities/members", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load members");
      setMembers(data.members || []);
    } catch (error) {
      console.error("Error loading community members:", error);
      toast.error(error.message);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !activeCommunity?.isOwner) return;
    let cancelled = false;
    fetch("/api/communities/members", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load members");
        return data;
      })
      .then(data => {
        if (!cancelled) setMembers(data.members || []);
      })
      .catch(error => {
        if (cancelled) return;
        console.error("Error loading community members:", error);
        toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeCommunityId, activeCommunity?.isOwner]);

  const handleToggleOpen = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen && activeCommunity?.isOwner) setIsLoadingMembers(true);
  };

  const handleCreateCommunity = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      await createCommunity(name);
      setName("");
      toast.success("Community created");
      window.location.href = "/";
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setIsAddingMember(true);
    try {
      const response = await fetch("/api/communities/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail, action: "add" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add member");
      setMemberEmail("");
      toast.success("Member added");
      await refreshMembers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const updateMember = async (member, action) => {
    try {
      const response = await fetch("/api/communities/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update member");
      toast.success(action === "remove" ? "Member removed" : "Member role updated");
      await refresh();
      await refreshMembers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (!activeCommunity?.isOwner) return null;

  return (
    <section className="mb-6 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Communitybeheer</h2>
          <p className="text-sm text-muted-foreground">
            Beheer {activeCommunity.name}, leden en eigen communities.
          </p>
        </div>
        <Button variant="outline" onClick={handleToggleOpen}>
          {isOpen ? "Sluiten" : "Community-instellingen"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-5 border-t pt-4">
          <form onSubmit={handleAddMember} className="flex max-w-xl flex-wrap gap-2">
            <Input
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="Email van bestaande gebruiker"
              required
            />
            <Button type="submit" disabled={isAddingMember}>
              {isAddingMember ? "Toevoegen..." : "Lid toevoegen"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Community-eigenaren zijn beheerders. Alleen bestaande gebruikersaccounts kunnen worden toegevoegd.
          </p>

          <div className="max-w-3xl space-y-2">
            <h3 className="text-sm font-medium">Leden en eigenaren</h3>
            {isLoadingMembers ? (
              <p className="text-sm text-muted-foreground">Leden laden...</p>
            ) : members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <span className="text-sm">
                  {member.displayname || member.email}{" "}
                  <span className="text-muted-foreground">({member.email})</span>
                </span>
                <div className="flex gap-2">
                  {member.isOwner ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={members.filter((entry) => entry.isOwner).length < 2}
                      onClick={() => updateMember(member, "demote")}
                    >
                      Eigenaar verwijderen
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => updateMember(member, "promote")}>
                      Eigenaar maken
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={member.id === session?.user?.id}
                    onClick={() => updateMember(member, "remove")}
                  >
                    Verwijderen
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateCommunity} className="flex max-w-xl flex-wrap gap-2 border-t pt-4">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Naam voor een nieuwe community"
              maxLength={80}
              required
            />
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Aanmaken..." : "Nieuwe community starten"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
