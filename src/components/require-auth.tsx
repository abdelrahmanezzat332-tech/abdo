"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/context/auth-context";
import { LoadingScreen } from "@/components/loading-screen";

export function RequireAuth({
  children,
  adminOnly = false
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    if (adminOnly && profile && profile.role !== "admin") router.replace("/choose-operation");
  }, [adminOnly, loading, profile, router, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  if (adminOnly && profile?.role !== "admin") return null;

  return <>{children}</>;
}
