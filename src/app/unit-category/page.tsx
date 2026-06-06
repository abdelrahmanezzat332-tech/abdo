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
          <Link className="choice-card gold-choice" href={`/properties?operation=${operation}&city=${cityQuery}`}>
            <Building2 size={44} />
            <span>وحدات رئيسية</span>
            <small>عرض وإدارة الوحدات الرئيسية في المدينة المختارة</small>
          </Link>
          <Link className="choice-card blue-choice" href={`/partial-units?operation=${operation}&city=${cityQuery}`}>
            <Layers3 size={44} />
            <span>وحدات جزئية</span>
            <small>عرض وإدارة الغرف والأسرة والأنواع الجزئية</small>
          </Link>
        </section>
      </AppShell>
    </RequireAuth>
  );
}
