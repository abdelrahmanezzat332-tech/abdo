"use client";

import { Filter, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CustomerCard } from "@/components/customer-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

export function CustomersView({ archivedOnly = false }: { archivedOnly?: boolean }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const canViewMobile = hasPermission(profile, "can_view_customer_mobile");
  const cityOptions = useMemo(
    () => Array.from(new Set<string>([...cities, ...customers.map((customer) => customer.city).filter(Boolean)])),
    [customers]
  );

  async function loadCustomers() {
    setLoading(true);
    const supabase = getSupabase();
    const rpc = archivedOnly ? "get_archived_customers" : "get_customers";
    const { data, error } = await supabase.rpc(rpc);
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
      return;
    }
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCustomers(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivedOnly]);

  const resetFilters = useCallback(function resetFilters() {
    setSearch("");
    setCity("");
  }, []);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) resetFilters();
    }

    window.addEventListener("pagehide", resetFilters);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pagehide", resetFilters);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [resetFilters]);

  const filteredCustomers = useMemo(() => {
    const dataSearchTerm = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const searchableValues = [
        customer.customer_code,
        customer.customer_name ?? "",
        customer.representative_name ?? "",
        customer.city,
        customer.budget,
        customer.notes,
        canViewMobile ? customer.mobile : ""
      ];
      const matchesDataSearch = dataSearchTerm
        ? searchableValues.some((value) => value.toLowerCase().includes(dataSearchTerm))
        : true;
      const matchesCity = city ? customer.city === city : true;
      return matchesDataSearch && matchesCity;
    });
  }, [canViewMobile, city, customers, search]);

  async function deleteCustomer(customer: Customer) {
    const confirmed = window.confirm(
      canViewMobile
        ? `هل تريد حذف العميل ${customer.customer_code} المرتبط بالرقم ${customer.mobile}؟`
        : `هل تريد حذف العميل ${customer.customer_code}؟`
    );
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("delete_customer", { p_customer_id: customer.id });
    if (error) { showToast(error.message, "error"); return; }

    showToast("تم حذف العميل بنجاح", "success");
    setCustomers((cur) => cur.filter((c) => c.id !== customer.id));
  }

  async function archiveCustomer(customer: Customer) {
    const confirmed = window.confirm(`هل تريد أرشفة العميل ${customer.customer_code}؟`);
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("archive_customer", { p_customer_id: customer.id });
    if (error) { showToast(error.message, "error"); return; }

    showToast("تم أرشفة العميل بنجاح", "success");
    setCustomers((cur) => cur.filter((c) => c.id !== customer.id));
  }

  async function unarchiveCustomer(customer: Customer) {
    const confirmed = window.confirm(`هل تريد استعادة العميل ${customer.customer_code} من الأرشيف؟`);
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("unarchive_customer", { p_customer_id: customer.id });
    if (error) { showToast(error.message, "error"); return; }

    showToast("تم استعادة العميل بنجاح", "success");
    setCustomers((cur) => cur.filter((c) => c.id !== customer.id));
  }

  return (
    <>
      <section className="filters-panel">
        <div className="filter-title">
          <Filter size={18} />
          <strong>البحث والفلترة</strong>
        </div>

        <div className="filters-grid customer-filters-grid">
          <label>
            <span>{canViewMobile ? "بحث في بيانات العميل أو رقم الموبايل" : "بحث في بيانات العميل"}</span>
            <div className="input-with-icon">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={canViewMobile ? "الكود، الاسم، الطلب، أو 010..." : "الكود، الاسم، أو الطلب"}
              />
            </div>
          </label>

          <label>
            <span>المدينة</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">كل المدن</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <button className="soft-button filter-reset-button" type="button" onClick={resetFilters}>
            <RotateCcw size={17} />
            مسح البحث
          </button>
        </div>
      </section>

      <div className="list-toolbar">
        <span>{filteredCustomers.length} {archivedOnly ? "عميل مؤرشف" : "عميل"}</span>
        {!archivedOnly && hasPermission(profile, "can_add_customer") ? (
          <Link className="primary-button compact" href="/customers/new">
            <Plus size={18} />
            إضافة عميل
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="skeleton-grid">
          <span /><span /><span />
        </div>
      ) : filteredCustomers.length ? (
        <div className="customers-grid">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              profile={profile}
              onDelete={deleteCustomer}
              onArchive={archivedOnly ? undefined : archiveCustomer}
              onUnarchive={archivedOnly ? unarchiveCustomer : undefined}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={archivedOnly ? "لا يوجد عملاء مؤرشفون" : "لا يوجد عملاء مطابقون"}
          description="جرّب تغيير البحث أو الفلاتر الحالية."
        />
      )}
    </>
  );
}
