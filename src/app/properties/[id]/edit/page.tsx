"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/loading-screen";
import { PageHeading } from "@/components/page-heading";
import { PropertyForm } from "@/components/property-form";
import { RequireAuth } from "@/components/require-auth";
import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperty() {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("get_property_by_id", { p_property_id: params.id }).single();
      if (error) showToast(error.message, "error");
      setProperty((data as Property) ?? null);
      setLoading(false);
    }

    loadProperty();
  }, [params.id, showToast]);

  return (
    <RequireAuth>
      <AppShell>
        <PageHeading eyebrow="تعديل وحدة" title="تعديل بيانات الوحدة" description="يمكن تعديل البيانات حسب صلاحيات حسابك." />
        {loading ? <LoadingScreen /> : property ? <PropertyForm property={property} /> : <div className="panel">الوحدة غير موجودة.</div>}
      </AppShell>
    </RequireAuth>
  );
}
