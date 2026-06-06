"use client";

import { BadgeDollarSign, Building2, ShoppingBag, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PropertyCard } from "@/components/property-card";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";
import { hasPermission } from "@/lib/permissions";
import type { Property, UserProfile } from "@/lib/types";

export function AdminDashboard() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const canViewMobile = hasPermission(profile, "can_view_mobile");

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const [propertiesResult, usersResult] = await Promise.all([
        supabase.rpc("get_properties"),
        supabase.from("users").select("*").order("created_at", { ascending: false })
      ]);

      if (propertiesResult.error) showToast(propertiesResult.error.message, "error");
      if (usersResult.error) showToast(usersResult.error.message, "error");

      setProperties((propertiesResult.data ?? []) as Property[]);
      setEmployees((usersResult.data ?? []) as UserProfile[]);
      setLoading(false);
    }

    loadData();
  }, [showToast]);

  const stats = useMemo(
    () => ({
      total: properties.length,
      employees: employees.length,
      sell: properties.filter((property) => property.operation === "sell").length,
      rent: properties.filter((property) => property.operation === "rent").length
    }),
    [employees.length, properties]
  );

  async function deleteProperty(property: Property) {
    if (!window.confirm(canViewMobile ? `حذف الوحدة المرتبطة بالرقم ${property.mobile}؟` : "حذف هذه الوحدة؟")) return;
    const supabase = getSupabase();
    const { error } = await supabase.rpc("delete_property", { p_property_id: property.id });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    setProperties((current) => current.filter((item) => item.id !== property.id));
    showToast("تم حذف الوحدة", "success");
  }

  return (
    <>
      <section className="stats-grid">
        <StatCard label="عدد الوحدات" value={stats.total} icon={Building2} />
        <StatCard label="عدد الموظفين" value={stats.employees} icon={Users} />
        <StatCard label="عمليات البيع" value={stats.sell} icon={BadgeDollarSign} />
        <StatCard label="عمليات الإيجار" value={stats.rent} icon={ShoppingBag} />
      </section>

      <section className="admin-shortcuts">
        <Link href="/admin/employees">إدارة الموظفين</Link>
        <Link href="/admin/permissions">إدارة الصلاحيات</Link>
        <Link href="/admin/backup">نسخ احتياطي للبيانات</Link>
        <Link href="/properties">إدارة الوحدات</Link>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>آخر الوحدات المضافة</h2>
          <span>{loading ? "جاري التحميل" : `${properties.slice(0, 6).length} وحدات`}</span>
        </div>
        {properties.length ? (
          <div className="properties-grid">
            {properties.slice(0, 6).map((property) => (
              <PropertyCard key={property.id} property={property} profile={profile} onDelete={deleteProperty} />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد وحدات بعد" description="ابدأ بإضافة أول وحدة من صفحة إدارة الوحدات." />
        )}
      </section>
    </>
  );
}
