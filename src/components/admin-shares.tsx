"use client";

import { Check, Copy, ExternalLink, Link2, MessageCircle, Plus, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

type DynamicShareType = "main" | "partial" | "all";

type SharedLink = {
  id: string;
  name: string | null;
  property_ids: string[] | null;
  visible_fields: string[] | null;
  is_dynamic: boolean | null;
  dynamic_type: DynamicShareType | null;
  created_at: string;
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

export function AdminShares() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [dynamicType, setDynamicType] = useState<DynamicShareType>("main");
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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadLinks() {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("shared_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "فشل تحميل روابط المشاركة"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLinks();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleField(fieldKey: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldKey) ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey]
    );
  }

  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      showToast("يرجى إدخال اسم للرابط لتسهيل التعرف عليه", "error");
      return;
    }
    if (selectedFields.length === 0) {
      showToast("يرجى اختيار حقل واحد على الأقل للعرض للعملاء", "error");
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("shared_links")
        .insert({
          name: name.trim(),
          is_dynamic: true,
          dynamic_type: dynamicType,
          visible_fields: selectedFields,
          created_by: user?.id ?? null
        })
        .select()
        .single();

      if (error) throw error;

      showToast("تم إنشاء رابط المشاركة الديناميكي بنجاح", "success");
      setLinks((prev) => [data, ...prev]);
      setName("");
      setSelectedFields([
        "property_code",
        "city",
        "property_type",
        "price",
        "employee_name",
        "description",
        "status",
        "availability_type"
      ]);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "حدث خطأ أثناء إنشاء الرابط"), "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteLink(id: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا الرابط؟ لن يتمكن أي عميل يملك الرابط من فتحه بعد الحذف."
    );
    if (!confirmed) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("shared_links").delete().eq("id", id);
      if (error) throw error;

      showToast("تم حذف رابط المشاركة بنجاح", "success");
      setLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (err: unknown) {
      showToast(getErrorMessage(err, "فشل حذف الرابط"), "error");
    }
  }

  function getShareUrl(id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/share/${id}`;
  }

  async function copyToClipboard(id: string) {
    const url = getShareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast("تم نسخ رابط المشاركة إلى الحافظة", "success");
    } catch {
      showToast("فشل نسخ الرابط", "error");
    }
  }

  function shareToWhatsApp(id: string, name: string) {
    const url = getShareUrl(id);
    const message = `أهلاً بك، تفضل بزيارة الرابط التالي لمشاهدة الوحدات العقارية (${name}):\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function getLinkTypeName(link: SharedLink) {
    if (!link.is_dynamic) {
      const count = link.property_ids?.length || 0;
      return `ثابت (${count} وحدات محددة)`;
    }
    if (link.dynamic_type === "main") return "ديناميكي: وحدات رئيسية";
    if (link.dynamic_type === "partial") return "ديناميكي: وحدات جزئية";
    return "ديناميكي: جميع الوحدات";
  }

  return (
    <div className="admin-grid">
      {/* Creation Panel */}
      <section className="panel admin-share-panel">
        <h2 style={{ color: "var(--navy)", fontSize: "1.25rem", margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={20} style={{ color: "var(--gold)" }} />
          إنشاء رابط مشاركة عام جديد
        </h2>

        <form onSubmit={handleCreateLink} style={{ display: "grid", gap: "1rem" }}>
          <label>
            <span>اسم الرابط (للاستخدام الداخلي)</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: روابط وحدات البيع الرئيسية للعميل أحمد"
              disabled={creating}
            />
          </label>

          <label>
            <span>نوع التصفية الديناميكية</span>
            <select
              value={dynamicType}
              onChange={(e) => setDynamicType(e.target.value as DynamicShareType)}
              disabled={creating}
            >
              <option value="main">الوحدات الرئيسية فقط (الفيلات، الشقق، إلخ)</option>
              <option value="partial">الوحدات الجزئية فقط (الغرف، الأسِرّة)</option>
              <option value="all">كل الوحدات المتاحة في النظام</option>
            </select>
          </label>

          <div>
            <span style={{ fontSize: "0.95rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem", color: "var(--navy)" }}>
              جدول الصلاحيات (الحقول المعروضة للعميل):
            </span>
            <div className="fields-selection-grid admin-share-fields-grid">
              {FIELDS.map((field) => {
                const isSelected = selectedFields.includes(field.key);
                return (
                  <label
                    key={field.key}
                    className={`field-checkbox-label ${isSelected ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleField(field.key)}
                      disabled={creating}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button className="primary-button wide" type="submit" disabled={creating} style={{ marginTop: "0.5rem" }}>
            <Link2 size={18} />
            {creating ? "جاري الإنشاء..." : "إنشاء رابط ديناميكي"}
          </button>
        </form>
      </section>

      {/* List Panel */}
      <section className="panel admin-share-panel">
        <div className="section-title" style={{ margin: "0 0 1.25rem" }}>
          <h2 style={{ color: "var(--navy)", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Share2 size={20} style={{ color: "var(--gold)" }} />
            روابط المشاركة النشطة في النظام
          </h2>
          <span>{loading ? "جاري التحميل" : `${links.length} روابط`}</span>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: "30vh" }}>
            <div className="loader-ring" />
            <p>جاري تحميل روابط المشاركة...</p>
          </div>
        ) : links.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-shares-table">
              <thead>
                <tr style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.9rem", color: "var(--navy)" }}>اسم الرابط</th>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.9rem", color: "var(--navy)" }}>النوع</th>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.9rem", color: "var(--navy)" }}>صلاحيات البيانات</th>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.9rem", color: "var(--navy)" }}>الرابط العام</th>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.9rem", color: "var(--navy)", textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 150ms ease" }}>
                    <td data-label="اسم الرابط" style={{ padding: "0.9rem 1rem", fontWeight: "bold", color: "var(--navy)" }}>
                      {link.name || "رابط مشاركة يدوي"}
                      <div style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--muted)", marginTop: "0.15rem" }}>
                        أنشئ في: {formatDate(link.created_at)}
                      </div>
                    </td>
                    <td data-label="النوع" style={{ padding: "0.9rem 1rem" }}>
                      <span className="muted-pill" style={{ display: "inline-block" }}>{getLinkTypeName(link)}</span>
                    </td>
                    <td data-label="صلاحيات البيانات" style={{ padding: "0.9rem 1rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                      {link.visible_fields?.length || 0} حقول مرئية
                    </td>
                    <td data-label="الرابط العام" style={{ padding: "0.9rem 1rem" }}>
                      <div className="share-link-cell">
                        <input
                          type="text"
                          readOnly
                          value={getShareUrl(link.id)}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(link.id)}
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "0.38rem 0.55rem",
                            background: "#fff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                          title="نسخ الرابط"
                        >
                          {copiedId === link.id ? <Check size={14} style={{ color: "var(--success)" }} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td data-label="الإجراءات" style={{ padding: "0.9rem 1rem", textAlign: "center" }}>
                      <div className="share-actions-cell">
                        <button
                          className="soft-button compact"
                          onClick={() => shareToWhatsApp(link.id, link.name || "رابط مشاركة")}
                          style={{ padding: "0.45rem", minHeight: "auto", width: "32px", height: "32px" }}
                          title="مشاركة واتساب"
                        >
                          <MessageCircle size={15} style={{ color: "#25D366" }} />
                        </button>
                        <a
                          href={getShareUrl(link.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="soft-button compact"
                          style={{ padding: "0.45rem", minHeight: "auto", width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                          title="فتح الرابط"
                        >
                          <ExternalLink size={15} />
                        </a>
                        <button
                          className="soft-button danger compact"
                          onClick={() => handleDeleteLink(link.id)}
                          style={{ padding: "0.45rem", minHeight: "auto", width: "32px", height: "32px" }}
                          title="حذف الرابط"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: "30vh" }}>
            <Link2 size={40} style={{ color: "var(--gold)", marginBottom: "0.5rem" }} />
            <h3>لا توجد روابط مشاركة بعد</h3>
            <p>املأ النموذج على اليمين لإنشاء أول رابط مشاركة ديناميكي.</p>
          </div>
        )}
      </section>
    </div>
  );
}
