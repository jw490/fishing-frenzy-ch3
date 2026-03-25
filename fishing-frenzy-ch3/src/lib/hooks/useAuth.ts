"use client";

// Stub auth hook for development without Privy credentials.
// When Privy is configured, replace this with the real usePrivy hook.
export function useAuth() {
  return {
    login: () => console.log("[Dev] Login triggered — configure PRIVY_APP_ID"),
    logout: () => console.log("[Dev] Logout triggered"),
    authenticated: false,
    ready: true,
    user: null,
  };
}
