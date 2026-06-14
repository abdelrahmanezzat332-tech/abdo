"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
