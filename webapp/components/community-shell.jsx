"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCommunity } from "@/context/CommunityContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CommunityShell({ children }) {
  const { status } = useSession();
  const {
    communities,
    activeCommunity,
    activeCommunityId,
    isLoading,
    error,
    createCommunity,
    switchCommunity,
    refresh,
  } = useCommunity();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return <main className="p-8 text-center">Loading communities...</main>;
  }
  if (status !== "authenticated") return children;

  const handleCreateCommunity = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      await createCommunity(name);
      setName("");
      toast.success("Community created");
      window.location.reload();
    } catch (createError) {
      toast.error(createError.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8 text-center">
        <p>{error}</p>
        <Button onClick={refresh}>Try again</Button>
      </main>
    );
  }

  if (!activeCommunityId || !activeCommunity) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Choose a community</h1>
          <p className="mt-2 text-muted-foreground">
            Create a community or select one you already belong to.
          </p>
        </div>
        {communities.length > 0 && (
          <div className="space-y-3">
            {communities.map((community) => (
              <Button
                key={community.id}
                className="w-full"
                onClick={() => switchCommunity(community.id).catch((switchError) => toast.error(switchError.message))}
              >
                Open {community.name}
              </Button>
            ))}
          </div>
        )}
        <form onSubmit={handleCreateCommunity} className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Start a community</h2>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Community name"
            maxLength={80}
            required
          />
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create community"}
          </Button>
        </form>
      </main>
    );
  }

  return children;
}
