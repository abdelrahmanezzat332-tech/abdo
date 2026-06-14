"use client";

import { Check, Copy, ExternalLink, MessageCircle, X } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getShareUrl } from "@/lib/share-url";
import { getSupabase } from "@/lib/supabase";
import type { Property } from "@/lib/types";

type ShareModalProps = {
  propertyIds: string[];
  selectedProperties: Property[];
  onClose: () => void;
};

const FIELDS = [
  { key: "property_code", label: "كود الوحدة" },
  { key: "city", label: "المدينة" },
  { key: "property_type", label: "نوع العقار" },
  { key: "price", label: "السعر" },
  { key: "employee_name", label: "اسم الموظف" },
  { key: "mobile", label: "رقم الموبايل" },
  { key: "description", label: "وصف الوحدة" },
  { key: "status", label: "الحالة" },
  { key: "availability_type", label: "المتاح (للوحدات الجزئية)" }
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ShareModal({ propertyIds, onClose }: ShareModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "property_code",
    "city",
    "property_type",
    "price",
    "employee_name",
    "description",
    "status",
    "availability_type"
  ]);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleField(fieldKey: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldKey) ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey]
    );
  }

  async function generateShareLink() {
    if (selectedFields.length === 0) {
      showToast("يرجى تحديد حقل واحد على الأقل للمشاركة", "error");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("shared_links")
        .insert({
          property_ids: propertyIds,
          visible_fields: selectedFields,
          created_by: user?.id ?? null
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const url = getShareUrl(data.id);
        setGeneratedUrl(url);
        showToast("تم إنشاء رابط المشاركة بنجاح", "success");
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "حدث خطأ أثناء إنشاء رابط المشاركة"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("تم نسخ الرابط إلى الحافظة", "success");
    } catch {
      showToast("فشل نسخ الرابط", "error");
    }
  }

  function shareToWhatsApp() {
    if (!generatedUrl) return;
    const message = `أهلاً بك، تفضل بزيارة الرابط التالي لمشاهدة الوحدات العقارية المتاحة:\n${generatedUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-panel" role="dialog" aria-modal="true">
          <header className="modal-header">
            <h3>إنشاء رابط مشاركة للوحدات</h3>
            <button className="modal-close" onClick={onClose} aria-label="إغلاق النافذة">
              <X size={20} />
            </button>
          </header>

          <div className="modal-body">
            <p className="field-note">
              تم تحديد <strong>{propertyIds.length}</strong> وحدة عقارية. اختر الحقول التي ترغب في إظهارها للمستلم:
            </p>

            {!generatedUrl ? (
              <>
                <div className="fields-selection-grid">
                  {FIELDS.map((field) => (
                    <label key={field.key} className="field-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        disabled={loading}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>

                <button
                  className="primary-button wide"
                  onClick={generateShareLink}
                  disabled={loading}
                >
                  {loading ? "جاري إنشاء الرابط..." : "إنشاء رابط المشاركة"}
                </button>
              </>
            ) : (
              <div className="link-result-box">
                <label>
                  <span>رابط المشاركة المباشر:</span>
                  <div className="link-input-wrapper">
                    <input type="text" readOnly value={generatedUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
                  </div>
                </label>

                <div className="link-actions-row">
                  <button className="primary-button compact" onClick={copyToClipboard}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "تم النسخ!" : "نسخ الرابط"}
                  </button>

                  <button className="soft-button compact" onClick={shareToWhatsApp}>
                    <MessageCircle size={16} />
                    واتساب
                  </button>

                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="soft-button compact"
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    <ExternalLink size={16} />
                    فتح الرابط
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
