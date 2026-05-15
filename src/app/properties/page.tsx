import { Suspense } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { PropertiesView } from "@/components/properties-view";
import { RequireAuth } from "@/components/require-auth";

export default function PropertiesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="إدارة الوحدات"
          title="الوحدات العقارية"
          description="ابحث وفلتر وتابع بيانات الوحدات حسب المدينة والموظف ونوع العملية."
          action={
            <Link className="primary-button compact" href="/properties/new">
              <Plus size={18} />
              إضافة وحدة
            </Link>
          }
        />
        <Suspense fallback={<div className="panel">جاري تحميل الفلاتر...</div>}>
          <PropertiesView />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
