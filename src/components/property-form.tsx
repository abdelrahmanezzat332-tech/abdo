"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities, operations, partialAvailabilityTypes, propertyStatuses, propertyTypes } from "@/lib/constants";
import { normalizePhone, operationLabel } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Operation, PartialAvailabilityType, Property, PropertyStatus } from "@/lib/types";

const OTHER_CITY_VALUE = "__other_city__";

type FormState = {
  operation: Operation;
  city: string;
  property_type: string;
  employee_name: string;
  mobile: string;
  description: string;
  price: string;
  status: PropertyStatus;
  availability_type: PartialAvailabilityType;
  availability_other: string;
};

const initialForm: FormState = {
  operation: "sell",
  city: "بدر",
  property_type: "شقق",
  employee_name: "",
  mobile: "",
  description: "",
  price: "",
  status: "available",
  availability_type: "bed",
  availability_other: ""
};

export function PropertyForm({
  property,
  mode = "full"
}: {
  property?: Property;
  mode?: "full" | "partial";
}) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const initialCanViewMobile = hasPermission(profile, "can_view_mobile");
  const [relatedProperty, setRelatedProperty] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() =>
    property
      ? {
          operation: property.operation,
          city: property.city,
          property_type: property.property_type,
          employee_name: property.employee_name,
          mobile: initialCanViewMobile ? property.mobile : "",
          description: property.description,
          price: property.price ?? "",
          status: property.status ?? "available",
          availability_type: property.availability_type ?? "bed",
          availability_other: property.availability_other ?? ""
        }
      : { ...initialForm, employee_name: profile?.full_name ?? "" }
  );

  const canSubmit = useMemo(() => {
    if (property) return hasPermission(profile, "can_edit_property");
    return hasPermission(profile, "can_add_property");
  }, [profile, property]);

  const canViewMobile = hasPermission(profile, "can_view_mobile");
  const mobileIsHidden = Boolean(property && !canViewMobile);
  const selectedCityIsCustom = !cities.includes(form.city as (typeof cities)[number]);
  const citySelectValue = selectedCityIsCustom ? OTHER_CITY_VALUE : form.city;
  const availabilityType = form.availability_type;

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "mobile") setRelatedProperty(null);
  }

  function updateCitySelection(value: string) {
    if (value === OTHER_CITY_VALUE) {
      setForm((current) => ({ ...current, city: selectedCityIsCustom ? current.city : "" }));
      return;
    }

    updateField("city", value);
  }

  async function findRelatedMobile(mobile: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .rpc("find_property_by_mobile", {
        lookup_mobile: mobile,
        excluded_property_id: property?.id ?? null
      })
      .maybeSingle();
    if (error) throw error;
    return data as Property | null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !user) {
      showToast("ليست لديك صلاحية تنفيذ هذا الإجراء", "error");
      return;
    }

    const mobile = normalizePhone(mobileIsHidden ? property?.mobile ?? "" : form.mobile);
    if (!mobile) {
      showToast("برجاء إدخال رقم موبايل صحيح", "error");
      return;
    }

    const city = form.city.trim();
    if (!city) {
      showToast("برجاء إدخال اسم المدينة", "error");
      return;
    }

    if (mode === "partial" && availabilityType === "other" && !form.availability_other.trim()) {
      showToast("برجاء كتابة نوع المتاح", "error");
      return;
    }

    setSaving(true);
    setRelatedProperty(null);

    try {
      const existing = mobileIsHidden ? null : await findRelatedMobile(mobile);
      if (existing) setRelatedProperty(existing);

      const supabase = getSupabase();

      const commonPayload = {
        p_operation: form.operation,
        p_city: city,
        p_property_type: form.property_type,
        p_employee_name: form.employee_name.trim(),
        p_description: form.description.trim(),
        p_price: form.price.trim(),
        p_status: form.status,
        p_related_property_id: existing?.id ?? property?.related_property_id ?? null
      };

      const request = mode === "partial"
        ? property
          ? supabase.rpc("update_partial_property", {
              p_property_id: property.id,
              ...commonPayload,
              p_mobile: mobileIsHidden ? null : mobile,
              p_keep_existing_mobile: mobileIsHidden,
              p_availability_type: availabilityType,
              p_availability_other: availabilityType === "other" ? form.availability_other.trim() : ""
            })
          : supabase.rpc("create_partial_property", {
              ...commonPayload,
              p_mobile: mobile,
              p_availability_type: availabilityType,
              p_availability_other: availabilityType === "other" ? form.availability_other.trim() : ""
            })
        : property
          ? supabase.rpc("update_property", {
            p_property_id: property.id,
            ...commonPayload,
            p_mobile: mobileIsHidden ? null : mobile,
            p_keep_existing_mobile: mobileIsHidden
          })
          : supabase.rpc("create_property", {
            ...commonPayload,
            p_mobile: mobile,
          });

      const { error } = await request;
      if (error) throw error;

      showToast(
        existing
          ? "تم حفظ الوحدة كوحدة منفصلة بنفس رقم الموبايل"
          : property
            ? "تم تعديل الوحدة بنجاح"
            : "تمت إضافة الوحدة بنجاح",
        "success"
      );

      if (form.status === "sold" || form.status === "rented") {
        router.push("/archive");
      } else {
        const destination = mode === "partial" ? "/partial-units" : "/properties";
        router.push(`${destination}?operation=${form.operation}&city=${encodeURIComponent(city)}`);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الوحدة", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>نوع العملية</span>
          <select value={form.operation} onChange={(e) => updateField("operation", e.target.value)}>
            {operations.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>حالة الوحدة</span>
          <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
            {propertyStatuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>المدينة</span>
          <select value={citySelectValue} onChange={(e) => updateCitySelection(e.target.value)}>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
            <option value={OTHER_CITY_VALUE}>أخرى</option>
          </select>
        </label>

        {citySelectValue === OTHER_CITY_VALUE ? (
          <label>
            <span>اسم المدينة</span>
            <input
              required
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="اكتب اسم المدينة"
            />
          </label>
        ) : null}

        <label>
          <span>نوع الوحدة</span>
          <select value={form.property_type} onChange={(e) => updateField("property_type", e.target.value)}>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        {mode === "partial" ? (
          <label>
            <span>المتاح</span>
            <select
              value={availabilityType}
              onChange={(e) => updateField("availability_type", e.target.value)}
            >
              {partialAvailabilityTypes.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "partial" && availabilityType === "other" ? (
          <label>
            <span>نوع المتاح</span>
            <input
              required
              value={form.availability_other}
              onChange={(e) => updateField("availability_other", e.target.value)}
              placeholder="اكتب النوع"
            />
          </label>
        ) : null}

        <label>
          <span>اسم الموظف المسؤول</span>
          <input
            required
            value={form.employee_name}
            onChange={(e) => updateField("employee_name", e.target.value)}
            placeholder="مثال: أحمد محمود"
          />
        </label>

        <label>
          <span>رقم الموبايل</span>
          <input
            required={!mobileIsHidden}
            disabled={mobileIsHidden}
            inputMode="tel"
            value={mobileIsHidden ? "رقم مخفي" : form.mobile}
            onChange={(e) => updateField("mobile", e.target.value)}
            placeholder="01000000000"
          />
          {mobileIsHidden ? (
            <small className="field-note">تحتاج صلاحية رؤية رقم الموبايل لعرضه أو تعديله.</small>
          ) : null}
        </label>

        <label>
          <span>السعر</span>
          <input
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            placeholder="مثال: 2,500,000 جنيه"
          />
        </label>

        <label className="full-span">
          <span>وصف الوحدة</span>
          <textarea
            required
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="اكتب تفاصيل الوحدة، المساحة، الدور، التشطيب، أو أي ملاحظات مهمة..."
            rows={6}
          />
        </label>
      </div>

      {relatedProperty ? (
        <div className="duplicate-box">
          <strong>هذا الرقم مرتبط بوحدة أخرى</strong>
          <p>سيتم حفظ الوحدة الحالية كوحدة منفصلة، مع ربطها داخليًا بالوحدة القديمة.</p>
          <span>
            الوحدة القديمة: {operationLabel(relatedProperty.operation)} - {relatedProperty.city} -{" "}
            {relatedProperty.property_type}
          </span>
          <span>
            الموظف: {relatedProperty.employee_name}
            {canViewMobile ? ` | الرقم: ${relatedProperty.mobile}` : ""}
          </span>
          <small>{relatedProperty.description}</small>
        </div>
      ) : null}

      <button className="primary-button" type="submit" disabled={saving || !canSubmit}>
        <Save size={18} />
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>

      {!canSubmit ? <p className="permission-note">ليست لديك صلاحية حفظ هذه الوحدة.</p> : null}
    </form>
  );
}
