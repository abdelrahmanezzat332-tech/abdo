import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { PropertiesView } from "@/components/properties-view";
import { RequireAuth } from "@/components/require-auth";

export default function ArchivePage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="الأرشيف"
          title="الوحدات المؤرشفة"
          description="عرض الوحدات التي تم أرشفتها أو بيعها أو تأجيرها مع إمكانية البحث والفلترة حسب الصلاحيات."
        />
        <Suspense fallback={<div className="panel">جاري تحميل الأرشيف...</div>}>
          <PropertiesView archivedOnly hideAddAction includeAllCategories />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
