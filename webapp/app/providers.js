import { SessionProvider } from "next-auth/react";
import { ViewProvider } from "@/context/ViewContext";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export function ClientProviders({ children }) {
  return (
    <SessionProvider>
      <ViewProvider>
        {children}
        <Toaster richColors />
      </ViewProvider>
    </SessionProvider>
  );
}
