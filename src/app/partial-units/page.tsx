import { Suspense } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { PropertiesView } from "@/components/properties-view";
import { PropertyJsonImporter } from "@/components/property-json-importer";
import { RequireAuth } from "@/components/require-auth";

export default function PartialUnitsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إدارة الوحدات الجزئية"
          title="الوحدات الجزئية"
          description="إدارة الغرف والأسرة والأنواع الأخرى المتاحة بنفس بيانات الوحدات العقارية."
          action={
            <div className="toolbar-actions">
              <PropertyJsonImporter mode="partial" />
              <Link className="primary-button compact" href="/partial-units/new">
                <Plus size={18} />
                إضافة وحدة جزئية
              </Link>
            </div>
          }
        />
        <Suspense fallback={<div className="panel">جاري تحميل الوحدات الجزئية...</div>}>
          <PropertiesView mode="partial" />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
