import { Building2, Layers3 } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";
import { cities } from "@/lib/constants";
import { operationLabel } from "@/lib/format";

export default async function UnitCategoryPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string; operation?: string }>;
}) {
  const params = await searchParams;
  const operation = params.operation === "rent" ? "rent" : "sell";
  const city = cities.some((item) => item === params.city) ? params.city ?? "" : "";
  const cityQuery = encodeURIComponent(city);

  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow={`عملية ${operationLabel(operation)}${city ? ` - ${city}` : ""}`}
          title="اختر نوع الوحدات"
          description="حدد ما إذا كنت تريد عرض الوحدات الرئيسية أو الوحدات الجزئية للمدينة المختارة."
        />

        <section className="choice-grid">
          <Link className="choice-card gold-choice choice-card-with-bg" href={`/properties?operation=${operation}&city=${cityQuery}`}>
            <div className="choice-card-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
                alt="وحدات رئيسية"
                className="choice-card-img"
              />
              <div className="choice-card-overlay" />
            </div>
            <div className="choice-card-content">
              <Building2 size={38} className="choice-icon" />
              <span>وحدات رئيسية</span>
              <small>عرض وإدارة الوحدات الرئيسية في المدينة المختارة</small>
            </div>
          </Link>
          <Link className="choice-card blue-choice choice-card-with-bg" href={`/partial-units?operation=${operation}&city=${cityQuery}`}>
            <div className="choice-card-image-wrapper">
              <img
                src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"
                alt="وحدات جزئية"
                className="choice-card-img"
              />
              <div className="choice-card-overlay" />
            </div>
            <div className="choice-card-content">
              <Layers3 size={38} className="choice-icon" />
              <span>وحدات جزئية</span>
              <small>عرض وإدارة الغرف والأسرة والأنواع الجزئية</small>
            </div>
          </Link>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
