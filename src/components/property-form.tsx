"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities, operations, propertyTypes } from "@/lib/constants";
import { normalizePhone, operationLabel } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

type FormState = {
  operation: "sell" | "rent";
  city: string;
  property_type: string;
  employee_name: string;
  mobile: string;
  description: string;
};

const initialForm: FormState = {
  operation: "sell",
  city: "بدر",
  property_type: "شقق",
  employee_name: "",
  mobile: "",
  description: ""
};

export function PropertyForm({ property }: { property?: Property }) {
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
          description: property.description
        }
      : {
          ...initialForm,
          employee_name: profile?.full_name ?? ""
        }
  );

  const canSubmit = useMemo(() => {
    if (property) return hasPermission(profile, "can_edit_property");
    return hasPermission(profile, "can_add_property");
  }, [profile, property]);
  const canViewMobile = hasPermission(profile, "can_view_mobile");
  const mobileIsHidden = Boolean(property && !canViewMobile);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "mobile") setRelatedProperty(null);
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

    setSaving(true);
    setRelatedProperty(null);

    try {
      const existing = mobileIsHidden ? null : await findRelatedMobile(mobile);
      if (existing) setRelatedProperty(existing);

      const supabase = getSupabase();
      const payload = {
        operation: form.operation,
        city: form.city,
        property_type: form.property_type,
        employee_name: form.employee_name.trim(),
        ...(mobileIsHidden ? {} : { mobile }),
        description: form.description.trim(),
        related_property_id: existing?.id ?? property?.related_property_id ?? null,
        created_by: property?.created_by ?? user.id
      };

      const request = property
        ? supabase.from("properties").update(payload).eq("id", property.id)
        : supabase.from("properties").insert(payload);

      const { error } = await request;
      if (error) {
        throw error;
      }

      showToast(
        existing
          ? "تم حفظ الوحدة كوحدة منفصلة بنفس رقم الموبايل"
          : property
            ? "تم تعديل الوحدة بنجاح"
            : "تمت إضافة الوحدة بنجاح",
        "success"
      );
      router.push(`/properties?operation=${form.operation}&city=${encodeURIComponent(form.city)}`);
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
          <select value={form.operation} onChange={(event) => updateField("operation", event.target.value)}>
            {operations.map((operation) => (
              <option key={operation.value} value={operation.value}>
                {operation.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>المدينة</span>
          <select value={form.city} onChange={(event) => updateField("city", event.target.value)}>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>نوع الوحدة</span>
          <select value={form.property_type} onChange={(event) => updateField("property_type", event.target.value)}>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>اسم الموظف المسؤول</span>
          <input
            required
            value={form.employee_name}
            onChange={(event) => updateField("employee_name", event.target.value)}
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
            onChange={(event) => updateField("mobile", event.target.value)}
            placeholder="01000000000"
          />
          {mobileIsHidden ? <small className="field-note">تحتاج صلاحية رؤية رقم الموبايل لعرضه أو تعديله.</small> : null}
        </label>

        <label className="full-span">
          <span>وصف الوحدة</span>
          <textarea
            required
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="اكتب تفاصيل الوحدة، المساحة، الدور، التشطيب، السعر أو أي ملاحظات مهمة..."
            rows={6}
          />
        </label>
      </div>

      {relatedProperty ? (
        <div className="duplicate-box">
          <strong>هذا الرقم مرتبط بوحدة أخرى</strong>
          <p>
            سيتم حفظ الوحدة الحالية كوحدة منفصلة، مع ربطها داخليًا بالوحدة القديمة.
          </p>
          <span>
            الوحدة القديمة: {operationLabel(relatedProperty.operation)} - {relatedProperty.city} - {relatedProperty.property_type}
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
