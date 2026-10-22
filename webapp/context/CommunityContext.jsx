"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const CommunityContext = createContext(null);

export function CommunityProvider({ children }) {
  const { status } = useSession();
  const [communities, setCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/communities", { cache: "no-store" });
      if (!response.ok) {
        if (response.status !== 401) throw new Error("Could not load communities");
        setCommunities([]);
        setActiveCommunityId(null);
        return;
      }
      const data = await response.json();
      setCommunities(data.communities || []);
      setActiveCommunityId(data.activeCommunityId || null);
    } catch (fetchError) {
      console.error("Error loading communities:", fetchError);
      setError(fetchError.message || "Could not load communities");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      refresh();
    } else if (status === "unauthenticated") {
      setCommunities([]);
      setActiveCommunityId(null);
      setIsLoading(false);
    }
  }, [status]);

  const createCommunity = async (name) => {
    const response = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create community");
    setCommunities(data.communities);
    setActiveCommunityId(data.activeCommunityId);
  };

  const switchCommunity = async (communityId) => {
    const response = await fetch("/api/communities/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not switch community");
    setActiveCommunityId(data.activeCommunityId);
    window.location.reload();
  };

  const value = useMemo(() => ({
    communities,
    activeCommunityId,
    activeCommunity: communities.find((community) => community.id === activeCommunityId) || null,
    isLoading,
    error,
    refresh,
    createCommunity,
    switchCommunity,
  }), [communities, activeCommunityId, isLoading, error]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("useCommunity must be used within CommunityProvider");
  return context;
}
