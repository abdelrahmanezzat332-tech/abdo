import { BackupManager } from "@/components/backup-manager";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { RequireAuth } from "@/components/require-auth";

export default function BackupPage() {
  return (
    <RequireAuth adminOnly>
      <AppShell>
        <PageHeading
          eyebrow="نسخ احتياطي"
          title="استيراد وتصدير البيانات"
          description="احتفظ بنسخة JSON من بيانات النظام أو ادمج بيانات محفوظة من جهازك."
        />
        <BackupManager />
      </AppShell>
    </RequireAuth>
  );
}
