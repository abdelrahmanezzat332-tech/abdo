"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomerForm } from "@/components/customer-form";
import { LoadingScreen } from "@/components/loading-screen";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";
import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("get_customer_by_id", { p_customer_id: params.id }).single();
      if (error) showToast(error.message, "error");
      setCustomer((data as Customer) ?? null);
      setLoading(false);
    }

    loadCustomer();
  }, [params.id, showToast]);

  return (
    <RequireAuth>
      <AppShell>
        <PageHeading eyebrow="تعديل عميل" title="تعديل بيانات العميل" description="يمكن تعديل بيانات العميل حسب صلاحيات حسابك." />
        {loading ? <LoadingScreen /> : customer ? <CustomerForm customer={customer} /> : <div className="panel">العميل غير موجود.</div>}
      </AppShell>
    </RequireAuth>
  );
}
