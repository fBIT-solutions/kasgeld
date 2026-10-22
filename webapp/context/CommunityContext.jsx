"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const CommunityContext = createContext(null);

export function CommunityProvider({ children }) {
  const { status } = useSession();
  const [communities, setCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCommunities = useCallback(async () => {
    const response = await fetch("/api/communities", { cache: "no-store" });
    if (response.status === 401) return { communities: [], activeCommunityId: null };
    if (!response.ok) throw new Error("Could not load communities");
    return response.json();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchCommunities()
      .then(data => {
        if (cancelled) return;
        setCommunities(data.communities || []);
        setActiveCommunityId(data.activeCommunityId || null);
      })
      .catch(fetchError => {
        console.error("Error loading communities:", fetchError);
        if (!cancelled) setError(fetchError.message || "Could not load communities");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, fetchCommunities]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchCommunities();
      setCommunities(data.communities || []);
      setActiveCommunityId(data.activeCommunityId || null);
    } catch (fetchError) {
      console.error("Error loading communities:", fetchError);
      setError(fetchError.message || "Could not load communities");
    } finally {
      setIsLoading(false);
    }
  }, [fetchCommunities]);

  const createCommunity = useCallback(async (name) => {
    const response = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create community");
    setCommunities(data.communities);
    setActiveCommunityId(data.activeCommunityId);
  }, []);

  const switchCommunity = useCallback(async (communityId) => {
    const response = await fetch("/api/communities/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not switch community");
    setActiveCommunityId(data.activeCommunityId);
    window.location.reload();
  }, []);

  const visibleCommunities = status === "unauthenticated" ? [] : communities;
  const visibleActiveCommunityId = status === "unauthenticated" ? null : activeCommunityId;

  const value = useMemo(() => ({
    communities: visibleCommunities,
    activeCommunityId: visibleActiveCommunityId,
    activeCommunity: visibleCommunities.find((community) => community.id === visibleActiveCommunityId) || null,
    isLoading: status === "loading" || (status !== "unauthenticated" && isLoading),
    error,
    refresh,
    createCommunity,
    switchCommunity,
  }), [visibleCommunities, visibleActiveCommunityId, isLoading, status, error, refresh, createCommunity, switchCommunity]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("useCommunity must be used within CommunityProvider");
  return context;
}
