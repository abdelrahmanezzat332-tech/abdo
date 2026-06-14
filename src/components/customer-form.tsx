"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { cities } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { getSupabase } from "@/lib/supabase";
import type { City, Customer } from "@/lib/types";

type FormState = {
  customer_name: string;
  representative_name: string;
  mobile: string;
  city: City;
  budget: string;
  notes: string;
};

const initialForm: FormState = {
  customer_name: "",
  representative_name: "",
  mobile: "",
  city: "بدر",
  budget: "",
  notes: ""
};

export function CustomerForm({ customer }: { customer?: Customer }) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const initialCanViewMobile = hasPermission(profile, "can_view_customer_mobile");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() =>
    customer
      ? {
          customer_name: customer.customer_name ?? "",
          representative_name: customer.representative_name ?? "",
          mobile: initialCanViewMobile ? customer.mobile : "",
          city: customer.city,
          budget: customer.budget,
          notes: customer.notes
        }
      : initialForm
  );

  const canSubmit = useMemo(() => {
    if (customer) return hasPermission(profile, "can_edit_customer");
    return hasPermission(profile, "can_add_customer");
  }, [customer, profile]);

  const canViewMobile = hasPermission(profile, "can_view_customer_mobile");
  const mobileIsHidden = Boolean(customer && !canViewMobile);

  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || !user) {
      showToast("ليست لديك صلاحية تنفيذ هذا الإجراء", "error");
      return;
    }

    const mobile = mobileIsHidden ? "" : normalizePhone(form.mobile);
    if (!mobileIsHidden && !mobile) {
      showToast("برجاء إدخال رقم موبايل صحيح", "error");
      return;
    }

    if (!form.budget.trim()) {
      showToast("برجاء إدخال الميزانية", "error");
      return;
    }

    if (!form.notes.trim()) {
      showToast("برجاء إدخال الملاحظات", "error");
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabase();
      const payload = {
        customer_name: form.customer_name.trim() || null,
        representative_name: form.representative_name.trim() || null,
        city: form.city,
        budget: form.budget.trim(),
        notes: form.notes.trim(),
        ...(mobileIsHidden ? {} : { mobile }),
        created_by: customer?.created_by ?? user.id
      };

      const request = customer
        ? supabase.rpc("update_customer", {
            p_customer_id: customer.id,
            p_customer_name: form.customer_name.trim() || null,
            p_representative_name: form.representative_name.trim() || null,
            p_mobile: mobileIsHidden ? null : mobile,
            p_keep_existing_mobile: mobileIsHidden,
            p_city: form.city,
            p_budget: form.budget.trim(),
            p_notes: form.notes.trim()
          })
        : supabase.from("customers").insert(payload);

      const { error } = await request;
      if (error) throw error;

      showToast(customer ? "تم تعديل العميل بنجاح" : "تمت إضافة العميل بنجاح", "success");
      router.push("/customers");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ العميل", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>اسم العميل اختياري</span>
          <input
            value={form.customer_name}
            onChange={(event) => updateField("customer_name", event.target.value)}
            placeholder="مثال: أحمد محمود"
          />
        </label>

        <label>
          <span>المندوب (اختياري)</span>
          <input
            value={form.representative_name}
            onChange={(event) => updateField("representative_name", event.target.value)}
            placeholder="مثال: محمد أحمد"
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
          {mobileIsHidden ? <small className="field-note">تحتاج صلاحية رؤية رقم موبايل العملاء لعرضه أو تعديله.</small> : null}
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
          <span>الميزانية</span>
          <input
            required
            value={form.budget}
            onChange={(event) => updateField("budget", event.target.value)}
            placeholder="مثال: 2,000,000"
          />
        </label>

        <label className="full-span">
          <span>ملاحظات</span>
          <textarea
            required
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="اكتب طلب العميل، نوع الوحدة، المساحة، طريقة الدفع، أو أي تفاصيل مهمة..."
            rows={6}
          />
        </label>
      </div>

      <button className="primary-button" type="submit" disabled={saving || !canSubmit}>
        <Save size={18} />
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>

      {!canSubmit ? <p className="permission-note">ليست لديك صلاحية حفظ بيانات العملاء.</p> : null}
    </form>
  );
}
