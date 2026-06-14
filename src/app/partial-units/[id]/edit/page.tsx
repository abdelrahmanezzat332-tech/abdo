"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/loading-screen";
import { PageHeading } from "@/components/page-heading";
import { PropertyForm } from "@/components/property-form";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

export default function EditPartialUnitPage() {
  const params = useParams<{ id: string }>();
  const { loading: authLoading, user } = useAuth();
  const { showToast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let active = true;

    async function loadProperty() {
      setLoading(true);
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("get_property_by_id", { p_property_id: params.id }).single();
      if (!active) return;
      if (error) showToast(error.message, "error");
      const loadedProperty = (data as Property) ?? null;
      setProperty(loadedProperty?.is_partial ? loadedProperty : null);
      setLoading(false);
    }

    void loadProperty();
    return () => {
      active = false;
    };
  }, [authLoading, params.id, showToast, user]);

  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="تعديل وحدة جزئية"
          title="تعديل بيانات الوحدة الجزئية"
          description="يمكن تعديل البيانات حسب صلاحيات حسابك."
        />
        {loading ? (
          <LoadingScreen />
        ) : property ? (
          <PropertyForm mode="partial" property={property} />
        ) : (
          <div className="panel">الوحدة الجزئية غير موجودة.</div>
        )}
      </AppShell>
    </RequireAuth>
  );
}
