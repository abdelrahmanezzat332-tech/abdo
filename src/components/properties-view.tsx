"use client";

import { Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PropertyCard } from "@/components/property-card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities, operations, propertyTypes } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

export function PropertiesView({
  archivedOnly = false,
  hideAddAction = false
}: {
  archivedOnly?: boolean;
  hideAddAction?: boolean;
}) {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState("");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [type, setType] = useState("");
  const [operation, setOperation] = useState(searchParams.get("operation") ?? "");
  const canViewMobile = hasPermission(profile, "can_view_mobile");
  const cityOptions = useMemo(
    () => Array.from(new Set<string>([...cities, ...properties.map((property) => property.city).filter(Boolean)])),
    [properties]
  );

  async function loadProperties() {
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("get_properties");
    if (error) {
      showToast(error.message, "error");
      setLoading(false);
      return;
    }
    setProperties((data ?? []) as Property[]);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProperties();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProperties = useMemo(() => {
    const phoneTerm = search.trim();
    const employeeTerm = employee.trim().toLowerCase();

    return properties.filter((property) => {
      const archived = Boolean(property.archived_at) || property.status === "sold" || property.status === "rented";
      if (archivedOnly && !archived) return false;
      if (!archivedOnly && archived) return false;

      const matchesPhone = phoneTerm && canViewMobile ? property.mobile.includes(phoneTerm) : true;
      const matchesEmployee = employeeTerm ? property.employee_name.toLowerCase().includes(employeeTerm) : true;
      const matchesCity = city ? property.city === city : true;
      const matchesType = type ? property.property_type === type : true;
      const matchesOperation = operation ? property.operation === operation : true;
      return matchesPhone && matchesEmployee && matchesCity && matchesType && matchesOperation;
    });
  }, [archivedOnly, canViewMobile, city, employee, operation, properties, search, type]);

  async function deleteProperty(property: Property) {
    const confirmed = window.confirm(
      canViewMobile
        ? `هل تريد حذف وحدة ${property.city} المرتبطة بالرقم ${property.mobile}؟`
        : `هل تريد حذف وحدة ${property.city}؟`
    );
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("delete_property", { p_property_id: property.id });
    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("تم حذف الوحدة بنجاح", "success");
    setProperties((current) => current.filter((item) => item.id !== property.id));
  }

  async function archiveProperty(property: Property) {
    const confirmed = window.confirm(`هل تريد أرشفة وحدة ${property.city}؟`);
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("archive_property", { p_property_id: property.id });
    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("تم أرشفة الوحدة بنجاح", "success");
    setProperties((current) => current.filter((item) => item.id !== property.id));
  }

  async function unarchiveProperty(property: Property) {
    const confirmed = window.confirm(`هل تريد استعادة وحدة ${property.city} من الأرشيف؟`);
    if (!confirmed) return;

    const supabase = getSupabase();
    const { error } = await supabase.rpc("unarchive_property", { p_property_id: property.id });
    if (error) {
      showToast(error.message, "error");
      return;
    }

    showToast("تم استعادة الوحدة بنجاح", "success");
    setProperties((current) => current.filter((item) => item.id !== property.id));
  }

  return (
    <>
      <section className="filters-panel">
        <div className="filter-title">
          <Filter size={18} />
          <strong>البحث والفلترة</strong>
        </div>

        <div className="filters-grid">
          {canViewMobile ? (
            <label>
              <span>بحث برقم الموبايل</span>
              <div className="input-with-icon">
                <Search size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="010..." />
              </div>
            </label>
          ) : null}

          <label>
            <span>بحث باسم الموظف</span>
            <input value={employee} onChange={(event) => setEmployee(event.target.value)} placeholder="اسم الموظف" />
          </label>

          <label>
            <span>المدينة</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">كل المدن</option>
              {cityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>نوع الوحدة</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">كل الأنواع</option>
              {propertyTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>نوع العملية</span>
            <select value={operation} onChange={(event) => setOperation(event.target.value)}>
              <option value="">بيع وإيجار</option>
              {operations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="list-toolbar">
        <span>{filteredProperties.length} وحدة</span>
        {!hideAddAction && hasPermission(profile, "can_add_property") ? (
          <Link className="primary-button compact" href="/properties/new">
            <Plus size={18} />
            إضافة وحدة
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="skeleton-grid">
          <span />
          <span />
          <span />
        </div>
      ) : filteredProperties.length ? (
        <div className="properties-grid">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              profile={profile}
              onDelete={deleteProperty}
              onArchive={archivedOnly ? undefined : archiveProperty}
              onUnarchive={archivedOnly ? unarchiveProperty : undefined}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد وحدات مطابقة" description="جرّب تغيير كلمات البحث أو الفلاتر الحالية." />
      )}
    </>
  );
}
