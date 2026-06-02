"use client";

import { Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

import { CustomerCard } from "@/components/customer-card";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

export function CustomersView() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const canViewMobile = hasPermission(profile, "can_view_customer_mobile");

  async function loadCustomers() {
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_customers");
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
      return;
    }
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const phoneTerm = search.trim();

    return customers.filter((customer) => {
      const matchesPhone = phoneTerm && canViewMobile ? customer.mobile.includes(phoneTerm) : true;
      const matchesCity = city ? customer.city === city : true;
      return matchesPhone && matchesCity;
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
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("تم حذف العميل بنجاح", "success");
    setCustomers((current) => current.filter((item) => item.id !== customer.id));
  }

  return (
    <>
      <section className="filters-panel">
        <div className="filter-title">
          <Filter size={18} />
          <strong>البحث والفلترة</strong>
        </div>

        <div className="filters-grid customer-filters-grid">
          {canViewMobile ? (
            <label>
              <span>بحث برقم موبايل العميل</span>
              <div className="input-with-icon">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="010..." />
              </div>
            </label>
          ) : null}

          <label>
            <span>المدينة</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">كل المدن</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="list-toolbar">
        <span>{filteredCustomers.length} عميل</span>
        {hasPermission(profile, "can_add_customer") ? (
          <Link className="primary-button compact" href="/customers/new">
            <Plus size={18} />
            إضافة عميل
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="skeleton-grid">
          <span />
          <span />
          <span />
        </div>
      ) : filteredCustomers.length ? (
        <div className="properties-grid">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} profile={profile} onDelete={deleteCustomer} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا يوجد عملاء مطابقون" description="جرّب تغيير البحث أو الفلاتر الحالية." />
      )}
    </>
  );
}
