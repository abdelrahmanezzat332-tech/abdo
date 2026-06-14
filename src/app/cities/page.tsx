import { MapPinned } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";
import { cities } from "@/lib/constants";
import { operationLabel } from "@/lib/format";

export default async function CitiesPage({
  searchParams
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  const params = await searchParams;
  const operation = params.operation === "rent" ? "rent" : "sell";

  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow={`عملية ${operationLabel(operation)}`}
          title="اختر المدينة"
          description="ستظهر الوحدات الخاصة بالمدينة ونوع العملية المختارة فقط."
        />

        <section className="city-grid">
          {cities.map((city) => (
            <Link className="city-card" key={city} href={`/unit-category?operation=${operation}&city=${encodeURIComponent(city)}`}>
              <MapPinned size={28} />
              <span>{city}</span>
            </Link>
          ))}
        </section>
      </AppShell>
    </RequireAuth>
  );
}
