"use client";

import { Filter, Link2, MessageCircle, Plus, RotateCcw, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PropertyCard } from "@/components/property-card";
import { ShareModal } from "@/components/share-modal";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities, operations, propertyStatuses, propertyTypes } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

export function PropertiesView({
  archivedOnly = false,
  hideAddAction = false,
  mode = "full",
  includeAllCategories = false
}: {
  archivedOnly?: boolean;
  hideAddAction?: boolean;
  mode?: "full" | "partial";
  includeAllCategories?: boolean;
}) {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const initialCity = searchParams.get("city") ?? "";
  const initialOperation = searchParams.get("operation") ?? "";
  const [search, setSearch] = useState("");
  const [dataSearch, setDataSearch] = useState("");
  const [employee, setEmployee] = useState("");
  const [city, setCity] = useState(initialCity);
  const [type, setType] = useState("");
  const [operation, setOperation] = useState(initialOperation);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
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

  const resetFilters = useCallback(
    function resetFilters() {
      setSearch("");
      setDataSearch("");
      setEmployee("");
      setType("");
      setCity(initialCity);
      setOperation(initialOperation);
    },
    [initialCity, initialOperation]
  );

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

  const filteredProperties = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const dataSearchTerm = dataSearch.trim().toLowerCase();
    const employeeTerm = employee.trim().toLowerCase();

    return properties.filter((property) => {
      if (!includeAllCategories && property.is_partial !== (mode === "partial")) return false;
      const archived = Boolean(property.archived_at) || property.status === "sold" || property.status === "rented";
      if (archivedOnly && !archived) return false;
      if (!archivedOnly && archived) return false;

      const matchesPropertyCode = searchTerm
        ? (property.property_code ?? "").toLowerCase().includes(searchTerm)
        : false;
      const matchesMobile = searchTerm ? canViewMobile && property.mobile.includes(searchTerm) : false;
      const matchesSearch = searchTerm ? matchesPropertyCode || matchesMobile : true;
      const operationText = operations.find((item) => item.value === property.operation)?.label ?? "";
      const statusText = propertyStatuses.find((item) => item.value === property.status)?.label ?? "";
      const searchableValues = [
        property.property_code ?? "",
        property.description,
        property.city,
        property.property_type,
        property.employee_name,
        property.price,
        property.status,
        statusText,
        property.operation,
        operationText,
        property.availability_type ?? "",
        property.availability_other ?? "",
        canViewMobile ? property.mobile : ""
      ];
      const matchesDataSearch = dataSearchTerm
        ? searchableValues.some((value) => value.toLowerCase().includes(dataSearchTerm))
        : true;
      const matchesEmployee = employeeTerm ? property.employee_name.toLowerCase().includes(employeeTerm) : true;
      const matchesCity = city ? property.city === city : true;
      const matchesType = type ? property.property_type === type : true;
      const matchesOperation = operation ? property.operation === operation : true;
      return matchesSearch && matchesDataSearch && matchesEmployee && matchesCity && matchesType && matchesOperation;
    });
  }, [archivedOnly, canViewMobile, city, dataSearch, employee, includeAllCategories, mode, operation, properties, search, type]);

  const selectedProperties = useMemo(
    () => properties.filter((property) => selectedPropertyIds.includes(property.id)),
    [properties, selectedPropertyIds]
  );

  function togglePropertySelection(property: Property, selected: boolean) {
    setSelectedPropertyIds((current) =>
      selected
        ? Array.from(new Set([...current, property.id]))
        : current.filter((id) => id !== property.id)
    );
  }

  function clearSelectedProperties() {
    setSelectedPropertyIds([]);
  }

  function formatPropertyShareMessage(items: Property[]) {
    return items
      .map((property, index) => {
        const lines = [
          `${index + 1}. ${property.property_code ?? "وحدة بدون كود"}`,
          `العملية: ${operations.find((item) => item.value === property.operation)?.label ?? property.operation}`,
          `المدينة: ${property.city}`,
          `نوع الوحدة: ${property.property_type}`,
          property.price ? `السعر: ${property.price}` : "",
          `الموظف: ${property.employee_name}`,
          canViewMobile && property.mobile ? `الموبايل: ${property.mobile}` : "",
          `الوصف: ${property.description}`
        ].filter(Boolean);

        return lines.join("\n");
      })
      .join("\n\n----------------\n\n");
  }

  function shareSelectedProperties() {
    if (!selectedProperties.length) {
      showToast("اختر وحدة واحدة على الأقل للمشاركة", "error");
      return;
    }

    const message = formatPropertyShareMessage(selectedProperties);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

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
          <label>
            <span>{canViewMobile ? "بحث بكود الوحدة أو رقم الموبايل" : "بحث بكود الوحدة"}</span>
            <div className="input-with-icon">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={canViewMobile ? "KY-S-00001 أو 010..." : "KY-S-00001"}
              />
            </div>
          </label>

          <label>
            <span>بحث في بيانات الوحدة</span>
            <div className="input-with-icon">
              <Search size={17} />
              <input
                value={dataSearch}
                onChange={(event) => setDataSearch(event.target.value)}
                placeholder="اكتب أي كلمة من بيانات الوحدة"
              />
            </div>
          </label>

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

          <button className="soft-button filter-reset-button" type="button" onClick={resetFilters}>
            <RotateCcw size={17} />
            مسح البحث
          </button>
        </div>
      </section>

      <div className="list-toolbar">
        <span>{filteredProperties.length} وحدة</span>
        <div className="toolbar-actions">
          {selectedPropertyIds.length ? (
            <>
              <span className="muted-pill">{selectedPropertyIds.length} محدد</span>
              <button className="primary-button compact" type="button" onClick={shareSelectedProperties}>
                <MessageCircle size={18} />
                مشاركة واتساب
              </button>
              <button className="soft-button compact" type="button" onClick={() => setShareModalOpen(true)}>
                <Link2 size={18} />
                إنشاء رابط مشاركة
              </button>
              <button className="soft-button compact" type="button" onClick={clearSelectedProperties}>
                <X size={18} />
                إلغاء التحديد
              </button>
            </>
          ) : null}
          {!hideAddAction && hasPermission(profile, "can_add_property") ? (
            <Link className="primary-button compact" href={mode === "partial" ? "/partial-units/new" : "/properties/new"}>
              <Plus size={18} />
              {mode === "partial" ? "إضافة وحدة جزئية" : "إضافة وحدة"}
            </Link>
          ) : null}
        </div>
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
              selected={selectedPropertyIds.includes(property.id)}
              onSelectChange={togglePropertySelection}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد وحدات مطابقة" description="جرّب تغيير كلمات البحث أو الفلاتر الحالية." />
      )}

      {shareModalOpen && (
        <ShareModal
          propertyIds={selectedPropertyIds}
          selectedProperties={selectedProperties}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </>
  );
}
