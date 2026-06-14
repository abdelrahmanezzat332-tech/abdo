"use client";

import {
  Banknote,
  CalendarDays,
  FileText,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  UserRound,
  X
} from "lucide-react";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import { formatDate, operationLabel } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import type { Property, PropertyStatus } from "@/lib/types";

type SharePageProps = {
  params: Promise<{ id: string }>;
};

type SharedProperty = Omit<
  Property,
  | "property_code"
  | "city"
  | "property_type"
  | "employee_name"
  | "mobile"
  | "description"
  | "price"
  | "status"
  | "availability_other"
> & {
  property_code: string | null;
  city: string | null;
  property_type: string | null;
  employee_name: string | null;
  mobile: string | null;
  description: string | null;
  price: string | null;
  status: PropertyStatus | null;
  availability_other: string | null;
  visible_fields?: string[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function statusLabel(status: PropertyStatus | null) {
  if (status === "sold") return "تم البيع";
  if (status === "rented") return "تم الإيجار";
  return "متوفرة";
}

function statusClass(status: PropertyStatus | null) {
  if (status === "sold") return "status-sold";
  if (status === "rented") return "status-rented";
  return "status-available";
}

function getAvailabilityLabel(property: SharedProperty) {
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
  const [properties, setProperties] = useState<SharedProperty[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDesc, setSelectedDesc] = useState<SharedProperty | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");

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
          const sharedProperties = data as SharedProperty[];
          setProperties(sharedProperties);
          setVisibleFields(sharedProperties[0].visible_fields || []);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, "حدث خطأ أثناء تحميل الوحدات المشتركة."));
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [id]);

  const canShow = useCallback((field: string) => visibleFields.includes(field), [visibleFields]);

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .map((property) => property.city)
            .filter((city): city is string => Boolean(city))
        )
      ),
    [properties]
  );

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .map((property) => property.property_type)
            .filter((type): type is string => Boolean(type))
        )
      ),
    [properties]
  );

  const filteredProperties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return properties.filter((property) => {
      if (cityFilter && property.city !== cityFilter) return false;
      if (typeFilter && property.property_type !== typeFilter) return false;
      if (operationFilter && property.operation !== operationFilter) return false;

      if (!term) return true;

      const searchableValues = [
        operationLabel(property.operation),
        canShow("property_code") ? property.property_code : "",
        canShow("city") ? property.city : "",
        canShow("property_type") ? property.property_type : "",
        canShow("employee_name") ? property.employee_name : "",
        canShow("mobile") ? property.mobile : "",
        canShow("description") ? property.description : "",
        canShow("price") ? property.price : "",
        canShow("status") ? statusLabel(property.status) : "",
        canShow("availability_type") ? getAvailabilityLabel(property) : ""
      ];

      return searchableValues
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [canShow, cityFilter, operationFilter, properties, searchTerm, typeFilter]);

  const groupedProperties = useMemo(() => {
    const cityMap = new Map<
      string,
      {
        city: string;
        total: number;
        categories: Map<string, { category: string; items: SharedProperty[] }>;
      }
    >();

    filteredProperties.forEach((property) => {
      const cityName = canShow("city") && property.city ? property.city : "مدينة غير معلنة";
      const categoryName =
        canShow("property_type") && property.property_type ? property.property_type : "نوع الوحدة غير معلن";

      if (!cityMap.has(cityName)) {
        cityMap.set(cityName, { city: cityName, total: 0, categories: new Map() });
      }

      const cityGroup = cityMap.get(cityName)!;
      cityGroup.total += 1;

      if (!cityGroup.categories.has(categoryName)) {
        cityGroup.categories.set(categoryName, { category: categoryName, items: [] });
      }

      cityGroup.categories.get(categoryName)!.items.push(property);
    });

    return Array.from(cityMap.values()).map((cityGroup) => ({
      city: cityGroup.city,
      total: cityGroup.total,
      categories: Array.from(cityGroup.categories.values())
    }));
  }, [canShow, filteredProperties]);

  return (
    <div className="shared-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Premium Header */}
      <header
        className="shared-header"
        style={{
          background: "linear-gradient(135deg, #071b34 0%, #0d2c52 100%)",
          color: "#fff",
          padding: "1.1rem 2rem",
          boxShadow: "0 4px 25px rgba(7, 27, 52, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(199, 155, 54, 0.2)"
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
            fontSize: "1.25rem",
            boxShadow: "0 0 15px rgba(199, 155, 54, 0.3)"
          }}>
            ك
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: "1.25rem", color: "#fff", letterSpacing: "0.5px" }}>الكيان</strong>
            <small style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.7)", fontWeight: "bold" }}>تسويق عقاري</small>
          </span>
        </div>
        <div
          className="eyebrow"
          style={{
            borderRadius: "999px",
            padding: "0.4rem 0.95rem",
            color: "var(--gold-2)",
            background: "rgba(199, 155, 54, 0.12)",
            fontSize: "0.85rem",
            fontWeight: "900",
            border: "1px solid rgba(199, 155, 54, 0.25)"
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
            <p>جاري تحميل الوحدات العقارية الأكثر تميزاً...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ minHeight: "50vh", marginTop: "2rem" }}>
            <Home size={48} style={{ color: "var(--gold)", marginBottom: "1rem" }} />
            <h3>عذراً!</h3>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Real Estate Hero Banner with Beautiful Image Overlay */}
            <div
              className="shared-hero-banner"
              style={{
                position: "relative",
                minHeight: "220px",
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "2.5rem",
                backgroundImage: 'linear-gradient(to bottom, rgba(7, 27, 52, 0.35), rgba(7, 27, 52, 0.88)), url("https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "2rem max(1.5rem, 3vw)",
                color: "#fff",
                boxShadow: "0 15px 45px rgba(7, 27, 52, 0.18)"
              }}
            >
              <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: 0, color: "#fff", textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
                العقارات المقترحة لك
              </h2>
              <p style={{ color: "rgba(255, 255, 255, 0.88)", margin: "0.5rem 0 0", fontSize: "1rem", lineHeight: "1.7", maxWidth: "800px" }}>
                نقدم لك باقة مختارة من العقارات المتميزة المطابقة لطلبك. يمكنك تصفح التفاصيل الكاملة بالأسفل، والتواصل المباشر مع الوكيل المعتمد في أي وقت.
              </p>
            </div>

            <section className="shared-filters-panel">
              <label className="shared-search-field">
                <span>بحث في الوحدات المعروضة</span>
                <div className="input-with-icon">
                  <Search size={17} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="ابحث بالكود، المدينة، النوع، السعر أو الوصف"
                  />
                </div>
              </label>

              {canShow("city") ? (
                <label>
                  <span>المدينة</span>
                  <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
                    <option value="">كل المدن</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {canShow("property_type") ? (
                <label>
                  <span>نوع الوحدة</span>
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="">كل الأنواع</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label>
                <span>نوع العملية</span>
                <select value={operationFilter} onChange={(event) => setOperationFilter(event.target.value)}>
                  <option value="">بيع وإيجار</option>
                  <option value="sell">بيع</option>
                  <option value="rent">إيجار</option>
                </select>
              </label>

              <div className="shared-results-count">
                <strong>{filteredProperties.length}</strong>
                <span>وحدة مطابقة</span>
              </div>
            </section>

            {filteredProperties.length ? (
              <div className="shared-city-sections">
                {groupedProperties.map((cityGroup) => (
                  <section className="shared-city-section" key={cityGroup.city}>
                    <header className="shared-city-header">
                      <div>
                        <MapPin size={20} />
                        <h2>{cityGroup.city}</h2>
                      </div>
                      <span>{cityGroup.total} وحدة</span>
                    </header>

                    {cityGroup.categories.map((categoryGroup) => (
                      <section className="shared-category-section" key={`${cityGroup.city}-${categoryGroup.category}`}>
                        <div className="shared-category-header">
                          <h3>{categoryGroup.category}</h3>
                          <span>{categoryGroup.items.length} وحدة</span>
                        </div>

                        <div className="properties-grid">
                          {categoryGroup.items.map((property, index) => (
                            <article
                              key={property.id}
                              className="property-card unit-card shared-property-card animate-card-fade-in"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                minHeight: "350px",
                                animationDelay: `${index * 0.06}s`
                              }}
                            >
                              <div className="card-topline">
                                <div className="card-badges">
                                  <span className={`badge ${property.operation === "sell" ? "badge-gold" : "badge-blue"}`}>
                                    {operationLabel(property.operation)}
                                  </span>
                                  {canShow("property_type") && property.property_type && (
                                    <span className="muted-pill">{property.property_type}</span>
                                  )}
                                  {canShow("property_code") && property.property_code && (
                                    <span className="muted-pill">كود: {property.property_code}</span>
                                  )}
                                  {canShow("status") && property.status && (
                                    <span className={`muted-pill ${statusClass(property.status)}`}>
                                      {statusLabel(property.status)}
                                    </span>
                                  )}
                                  {property.is_partial && canShow("availability_type") && property.availability_type && (
                                    <span className="muted-pill">المتاح: {getAvailabilityLabel(property)}</span>
                                  )}
                                </div>
                              </div>

                              {canShow("city") && property.city && (
                                <div className="card-location" style={{ marginTop: "0.5rem" }}>
                                  <MapPin size={16} />
                                  <strong>{property.city}</strong>
                                </div>
                              )}

                              {canShow("description") && property.description && (
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

                              <div className="property-meta" style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: "0.85rem", gap: "0.45rem" }}>
                                {canShow("price") && property.price && (
                                  <span className="property-price" style={{ fontSize: "1.1rem", color: "var(--navy)" }}>
                                    <Banknote size={17} />
                                    <strong>{property.price}</strong>
                                  </span>
                                )}
                                {canShow("employee_name") && property.employee_name && (
                                  <span>
                                    <UserRound size={15} />
                                    المسؤول: {property.employee_name}
                                  </span>
                                )}
                                {canShow("mobile") && property.mobile && (
                                  <span>
                                    <Phone size={15} />
                                    الهاتف: {property.mobile}
                                  </span>
                                )}
                                {canShow("created_at") && property.created_at && (
                                  <span>
                                    <CalendarDays size={15} />
                                    نُشر في: {formatDate(property.created_at)}
                                  </span>
                                )}
                              </div>

                              {canShow("mobile") && property.mobile && (
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
                      </section>
                    ))}
                  </section>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ minHeight: "30vh", marginTop: "1rem" }}>
                <Home size={42} style={{ color: "var(--gold)", marginBottom: "0.5rem" }} />
                <h3>لا توجد وحدات مطابقة</h3>
                <p>جرّب تغيير كلمات البحث أو الفلاتر الحالية.</p>
              </div>
            )}
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
          fontSize: "0.9rem",
          marginTop: "3rem"
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
