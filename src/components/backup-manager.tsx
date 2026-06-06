"use client";

import { DatabaseBackup, Download, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { useToast } from "@/context/toast-context";
import { getSupabase } from "@/lib/supabase";

type BackupData = {
  data?: {
    customers?: unknown[];
    properties?: unknown[];
    users?: unknown[];
  };
  exported_at?: string;
  version?: number;
};

type ImportSummary = {
  customers?: number;
  properties?: number;
  users?: number;
};

function isBackupData(value: unknown): value is BackupData {
  return Boolean(value && typeof value === "object" && "data" in value);
}

export function BackupManager() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);

  async function exportBackup() {
    setExporting(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("export_app_backup");
    setExporting(false);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `al-kayan-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("تم تنزيل النسخة الاحتياطية", "success");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`استيراد البيانات من ${file.name}؟ سيتم دمج البيانات مع الموجود حاليًا.`)) {
      event.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isBackupData(parsed)) {
        throw new Error("ملف النسخة الاحتياطية غير صالح.");
      }

      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("import_app_backup", { p_backup: parsed });
      if (error) throw error;

      const summary = (data ?? {}) as ImportSummary;
      setLastSummary(summary);
      showToast("تم استيراد البيانات بنجاح", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "حدث خطأ أثناء استيراد البيانات", "error");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <section className="backup-grid">
      <article className="panel backup-panel">
        <div className="filter-title">
          <Download size={18} />
          <strong>تصدير JSON</strong>
        </div>
        <p>ينزل ملفًا يحتوي على الوحدات والعملاء والموظفين والصلاحيات.</p>
        <button className="primary-button compact" type="button" onClick={exportBackup} disabled={exporting}>
          <DatabaseBackup size={18} />
          {exporting ? "جاري التصدير" : "تنزيل نسخة"}
        </button>
      </article>

      <article className="panel backup-panel">
        <div className="filter-title">
          <Upload size={18} />
          <strong>استيراد JSON</strong>
        </div>
        <p>يرفع ملف نسخة احتياطية ويحدث السجلات المطابقة أو يضيف غير الموجود.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json, .json"
          onChange={importBackup}
          disabled={importing}
        />
        <button className="soft-button" type="button" onClick={() => inputRef.current?.click()} disabled={importing}>
          <Upload size={18} />
          {importing ? "جاري الاستيراد" : "اختيار ملف"}
        </button>
        {lastSummary ? (
          <p className="backup-summary">
            تم الدمج: {lastSummary.properties ?? 0} وحدة، {lastSummary.customers ?? 0} عميل،{" "}
            {lastSummary.users ?? 0} موظف.
          </p>
        ) : null}
      </article>
    </section>
  );
}
