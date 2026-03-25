"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function MockPrivyContext({ children }: { children: React.ReactNode }) {
  // When no Privy app ID is configured, render children without Privy
  return <>{children}</>;
}

export default function PrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  // Skip Privy if no valid app ID (dev/build without credentials)
  if (!PRIVY_APP_ID || PRIVY_APP_ID === "your_privy_app_id_here") {
    return (
      <QueryClientProvider client={queryClient}>
        <MockPrivyContext>{children}</MockPrivyContext>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Privy
        appId={PRIVY_APP_ID}
        config={{
          appearance: {
            theme: "dark",
            accentColor: "#FFD700",
            logo: "/sprites/logo.png",
          },
          loginMethods: ["email", "wallet", "telegram"],
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
        }}
      >
        {children}
      </Privy>
    </QueryClientProvider>
  );
}
