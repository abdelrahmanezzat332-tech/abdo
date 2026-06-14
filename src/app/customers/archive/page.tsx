import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomersView } from "@/components/customers-view";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function CustomersArchivePage() {
  return (
    <RequireAuth>
      <AppShell>
        <PageHeading
          eyebrow="أرشيف العملاء"
          title="العملاء المؤرشفون"
          description="عرض العملاء الذين تمت أرشفتهم مع إمكانية استعادتهم أو حذفهم."
        />
        <Suspense fallback={<div className="panel">جاري تحميل الأرشيف...</div>}>
          <CustomersView archivedOnly />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
