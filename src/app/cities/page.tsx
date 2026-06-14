import { MapPinned } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";
import { cities } from "@/lib/constants";
import { operationLabel } from "@/lib/format";

const cityImages: Record<string, string> = {
  "بدر": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80",
  "الشروق": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
  "مدينتي": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
  "العبور": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"
};

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
            <Link
              className="city-card city-card-with-bg"
              key={city}
              href={`/unit-category?operation=${operation}&city=${encodeURIComponent(city)}`}
            >
              <div className="city-card-image-wrapper">
                <Image
                  src={cityImages[city] || cityImages["بدر"]}
                  alt={city}
                  className="city-card-img"
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1180px) 50vw, 25vw"
                />
                <div className="city-card-overlay" />
              </div>
              <div className="city-card-content">
                <MapPinned size={22} className="city-icon" />
                <span>{city}</span>
              </div>
            </Link>
          ))}
        </section>
      </AppShell>
    </RequireAuth>
  );
}
