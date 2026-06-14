"use client";

import {
  Banknote,
  CalendarDays,
  FileText,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
  X
} from "lucide-react";
import { use, useEffect, useState } from "react";

import { formatDate, operationLabel } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";

type SharePageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: string) {
  if (status === "sold") return "تم البيع";
  if (status === "rented") return "تم الإيجار";
  return "متوفرة";
}

function statusClass(status: string) {
  if (status === "sold") return "status-sold";
  if (status === "rented") return "status-rented";
  return "status-available";
}

function getAvailabilityLabel(property: any) {
  if (property.availability_type === "other") {
    return property.availability_other;
  }
  const found = [
    { value: "bed", label: "سرير" },
    { value: "room", label: "غرفة" },
    { value: "other", label: "أخرى" }
  ].find((item) => item.value === property.availability_type);
  return found ? found.label : property.availability_type;
}

function getWhatsAppUrl(mobile: string, propertyCode: string | null) {
  let cleanMobile = mobile.replace(/\s+/g, "");
  if (cleanMobile.startsWith("01")) {
    cleanMobile = "20" + cleanMobile.slice(1);
  }
  const message = encodeURIComponent(
    `مرحباً، أنا مهتم بالوحدة العقارية المعروضة في الرابط` + (propertyCode ? ` (كود: ${propertyCode})` : "")
  );
  return `https://wa.me/${cleanMobile}?text=${message}`;
}

export default function SharePage({ params }: SharePageProps) {
  const { id } = use(params);
  const [properties, setProperties] = useState<any[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDesc, setSelectedDesc] = useState<any | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.rpc("get_shared_properties", {
          p_share_id: id
        });
        if (error) throw error;

        if (!data || data.length === 0) {
          // Check if link exists
          const { data: linkData, error: linkError } = await supabase
            .from("shared_links")
            .select("id")
            .eq("id", id)
            .maybeSingle();

          if (linkError || !linkData) {
            setError("رابط المشاركة هذا غير صالح أو منتهي الصلاحية.");
          } else {
            setError("لا توجد وحدات معروضة في هذا الرابط حالياً.");
          }
        } else {
          setProperties(data);
          setVisibleFields(data[0].visible_fields || []);
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل الوحدات المشتركة.");
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [id]);

  return (
    <div className="shared-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        className="shared-header"
        style={{
          background: "linear-gradient(135deg, var(--navy), var(--navy-2))",
          color: "#fff",
          padding: "1.25rem 2rem",
          boxShadow: "var(--shadow)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span className="brand-mark" style={{
            display: "grid",
            placeItems: "center",
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            color: "var(--navy)",
            background: "linear-gradient(135deg, var(--gold), var(--gold-2))",
            fontWeight: "900",
            fontSize: "1.25rem"
          }}>
            ك
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: "1.2rem", color: "#fff" }}>الكيان</strong>
            <small style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.7)" }}>تسويق عقاري</small>
          </span>
        </div>
        <div
          className="eyebrow"
          style={{
            borderRadius: "999px",
            padding: "0.35rem 0.85rem",
            color: "#fff",
            background: "rgba(255, 255, 255, 0.15)",
            fontSize: "0.85rem",
            fontWeight: "bold"
          }}
        >
          عرض الوحدات العقارية
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem max(1rem, 5vw)", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {loading ? (
          <div className="loading-screen" style={{ minHeight: "60vh" }}>
            <div className="loader-ring" />
            <p>جاري تحميل الوحدات العقارية...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ minHeight: "50vh", marginTop: "2rem" }}>
            <Home size={48} style={{ color: "var(--gold)", marginBottom: "1rem" }} />
            <h3>عذراً!</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
              <h2 style={{ color: "var(--navy)", margin: 0, fontSize: "1.8rem" }}>العقارات المقترحة لك</h2>
              <p style={{ color: "var(--muted)", margin: "0.5rem 0 0" }}>
                إليك قائمة بالوحدات العقارية المتاحة التي تم تحديدها لمشاركتها معك. يمكنك مراجعة التفاصيل أدناه والتواصل مباشرة مع المسؤول.
              </p>
            </div>

            <div className="properties-grid">
              {properties.map((property) => (
                <article key={property.id} className="property-card unit-card shared-property-card" style={{ display: "flex", flexDirection: "column", minHeight: "340px" }}>
                  {/* Badges */}
                  <div className="card-topline">
                    <div className="card-badges">
                      <span className={`badge ${property.operation === "sell" ? "badge-gold" : "badge-blue"}`}>
                        {operationLabel(property.operation)}
                      </span>
                      {visibleFields.includes("property_type") && property.property_type && (
                        <span className="muted-pill">{property.property_type}</span>
                      )}
                      {visibleFields.includes("property_code") && property.property_code && (
                        <span className="muted-pill">كود: {property.property_code}</span>
                      )}
                      {visibleFields.includes("status") && property.status && (
                        <span className={`muted-pill ${statusClass(property.status)}`}>
                          {statusLabel(property.status)}
                        </span>
                      )}
                      {property.is_partial && visibleFields.includes("availability_type") && property.availability_type && (
                        <span className="muted-pill">المتاح: {getAvailabilityLabel(property)}</span>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {visibleFields.includes("city") && property.city && (
                    <div className="card-location" style={{ marginTop: "0.5rem" }}>
                      <MapPin size={16} />
                      <strong>{property.city}</strong>
                    </div>
                  )}

                  {/* Description */}
                  {visibleFields.includes("description") && property.description && (
                    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <p className="property-description" style={{
                        display: "-webkit-box",
                        overflow: "hidden",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 4,
                        lineHeight: 1.7,
                        margin: 0
                      }}>
                        {property.description}
                      </p>
                      <button
                        className="description-more-button"
                        type="button"
                        onClick={() => setSelectedDesc(property)}
                        style={{ marginTop: "auto" }}
                      >
                        <FileText size={15} />
                        عرض التفاصيل بالكامل
                      </button>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="property-meta" style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "0.85rem", gap: "0.45rem" }}>
                    {visibleFields.includes("price") && property.price && (
                      <span className="property-price" style={{ fontSize: "1.1rem", color: "var(--navy)" }}>
                        <Banknote size={17} />
                        <strong>{property.price}</strong>
                      </span>
                    )}
                    {visibleFields.includes("employee_name") && property.employee_name && (
                      <span>
                        <UserRound size={15} />
                        المسؤول: {property.employee_name}
                      </span>
                    )}
                    {visibleFields.includes("mobile") && property.mobile && (
                      <span>
                        <Phone size={15} />
                        الهاتف: {property.mobile}
                      </span>
                    )}
                    {visibleFields.includes("created_at") && property.created_at && (
                      <span>
                        <CalendarDays size={15} />
                        نُشر في: {formatDate(property.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Contact Actions */}
                  {visibleFields.includes("mobile") && property.mobile && (
                    <div className="card-actions" style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", width: "100%" }}>
                      <a
                        href={`tel:${property.mobile}`}
                        className="soft-button compact"
                        style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Phone size={16} />
                        اتصال هاتفي
                      </a>
                      <a
                        href={getWhatsAppUrl(property.mobile, property.property_code)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="primary-button compact"
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#25D366",
                          backgroundImage: "none",
                          color: "#fff",
                          border: "none",
                          boxShadow: "none"
                        }}
                      >
                        <MessageCircle size={16} />
                        واتساب
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "var(--navy)",
          color: "rgba(255, 255, 255, 0.6)",
          padding: "1.5rem 2rem",
          textAlign: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          fontSize: "0.9rem"
        }}
      >
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} الكيان للتسويق العقاري. جميع الحقوق محفوظة.</p>
      </footer>

      {/* Full Description Drawer */}
      {selectedDesc && (
        <div className="description-drawer">
          <button
            aria-label="إغلاق الوصف الكامل"
            className="description-drawer-backdrop"
            type="button"
            onClick={() => setSelectedDesc(null)}
          />
          <aside
            aria-modal="true"
            className="description-drawer-panel"
            role="dialog"
            style={{ width: "min(480px, 95vw)" }}
          >
            <header className="description-drawer-header">
              <div>
                <span className={`badge ${selectedDesc.operation === "sell" ? "badge-gold" : "badge-blue"}`}>
                  {operationLabel(selectedDesc.operation)}
                </span>
                <h2>وصف الوحدة العقارية بالكامل</h2>
                <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {visibleFields.includes("city") && selectedDesc.city}
                  {visibleFields.includes("property_type") && ` - ${selectedDesc.property_type}`}
                  {visibleFields.includes("property_code") && selectedDesc.property_code && ` - كود: ${selectedDesc.property_code}`}
                </p>
              </div>
              <button
                aria-label="إغلاق الوصف الكامل"
                className="description-drawer-close"
                type="button"
                onClick={() => setSelectedDesc(null)}
              >
                <X size={18} />
              </button>
            </header>

            <p className="description-drawer-text" style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
              {selectedDesc.description}
            </p>

            {visibleFields.includes("mobile") && selectedDesc.mobile && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <a
                  href={`tel:${selectedDesc.mobile}`}
                  className="soft-button"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Phone size={16} />
                  اتصال هاتفي
                </a>
                <a
                  href={getWhatsAppUrl(selectedDesc.mobile, selectedDesc.property_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button"
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#25D366",
                    backgroundImage: "none",
                    color: "#fff",
                    border: "none",
                    boxShadow: "none"
                  }}
                >
                  <MessageCircle size={16} />
                  واتساب
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
