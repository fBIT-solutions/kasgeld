import { SessionProvider } from "next-auth/react";
import { ViewProvider } from "@/context/ViewContext";
import { Toaster } from "sonner";
import { CommunityProvider } from "@/context/CommunityContext";
import { CommunityShell } from "@/components/community-shell";

export function ClientProviders({ children }) {
  return (
    <SessionProvider>
      <ViewProvider>
        <CommunityProvider>
          <CommunityShell>{children}</CommunityShell>
          <Toaster richColors />
        </CommunityProvider>
      </ViewProvider>
    </SessionProvider>
  );
}
