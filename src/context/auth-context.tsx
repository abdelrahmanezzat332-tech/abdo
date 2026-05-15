"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { getSupabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";
import { getDefaultProfilePermissions } from "@/lib/permissions";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(user: User) {
  const supabase = getSupabase();
  const email = user.email ?? "";

  const byAuth = await supabase.from("users").select("*").eq("auth_id", user.id).maybeSingle();
  if (byAuth.error) throw byAuth.error;
  if (byAuth.data) return byAuth.data as UserProfile;

  const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}

async function ensureProfile(user: User, fallbackName?: string) {
  const supabase = getSupabase();
  const email = user.email ?? "";
  const fullName =
    fallbackName ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
    email.split("@")[0] ||
    "مستخدم جديد";

  const existing = await fetchProfile(user);
  if (existing) {
    if (existing.auth_id === user.id) return existing;

    const { data, error } = await supabase
      .from("users")
      .update({ auth_id: user.id, full_name: existing.full_name || fullName })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  const profilePayload = {
    auth_id: user.id,
    full_name: fullName,
    email,
    ...getDefaultProfilePermissions(email)
  };

  const { data, error } = await supabase.from("users").insert(profilePayload).select("*").single();
  if (error) throw error;
  return data as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user ?? null;
    setSession(data.session);

    if (currentUser) {
      const currentProfile = await ensureProfile(currentUser);
      setProfile(currentProfile);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        const currentProfile = await ensureProfile(data.session.user);
        if (mounted) setProfile(currentProfile);
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      ensureProfile(nextSession.user)
        .then(setProfile)
        .finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) setProfile(await ensureProfile(data.user));
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    if (data.session?.user) setProfile(await ensureProfile(data.session.user, fullName));
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
