"use client";

import { Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { useToast } from "@/context/toast-context";
import { normalizePhone } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import type { Operation, PartialAvailabilityType, Property, PropertyStatus } from "@/lib/types";

type ImportMode = "full" | "partial";

type ImportRow = {
  operation?: unknown;
  city?: unknown;
  property_type?: unknown;
  employee_name?: unknown;
  mobile?: unknown;
  description?: unknown;
  price?: unknown;
  status?: unknown;
  availability_type?: unknown;
  availability_other?: unknown;
};

const requiredFields = ["operation", "city", "property_type", "employee_name", "mobile", "description"] as const;
const validOperations = new Set<Operation>(["sell", "rent"]);
const validStatuses = new Set<PropertyStatus>(["available", "sold", "rented"]);
const validAvailabilityTypes = new Set<PartialAvailabilityType>(["bed", "room", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function extractImportItems(parsed: unknown): ImportRow[] {
  if (Array.isArray(parsed)) return parsed as ImportRow[];
  if (!isRecord(parsed)) return [];

  const candidates = [
    parsed.properties,
    parsed.units,
    parsed.data,
    isRecord(parsed.data) ? parsed.data.properties : undefined,
    isRecord(parsed.data) ? parsed.data.units : undefined
  ];

  const match = candidates.find(Array.isArray);
  return match ? (match as ImportRow[]) : [];
}

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function getRequiredText(row: ImportRow, field: (typeof requiredFields)[number], rowNumber: number): string {
  const value = asText(row[field]);
  if (!value) throw new Error(`Row ${rowNumber}: ${field} is required.`);
  return value;
}

function validateRequiredFields(row: ImportRow, rowNumber: number) {
  for (const field of requiredFields) {
    getRequiredText(row, field, rowNumber);
  }
}

function getOperation(value: string, rowNumber: number): Operation {
  if (validOperations.has(value as Operation)) return value as Operation;
  throw new Error(`Row ${rowNumber}: operation must be sell or rent.`);
}

function getStatus(value: unknown, rowNumber: number): PropertyStatus {
  const status = asText(value) || "available";
  if (validStatuses.has(status as PropertyStatus)) return status as PropertyStatus;
  throw new Error(`Row ${rowNumber}: status must be available, sold, or rented.`);
}

function getAvailabilityType(value: unknown, rowNumber: number): PartialAvailabilityType {
  const availabilityType = asText(value) || "bed";
  if (validAvailabilityTypes.has(availabilityType as PartialAvailabilityType)) {
    return availabilityType as PartialAvailabilityType;
  }
  throw new Error(`Row ${rowNumber}: availability_type must be bed, room, or other.`);
}

export function PropertyJsonImporter({
  mode = "full",
  onImported
}: {
  mode?: ImportMode;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();
  const [importing, setImporting] = useState(false);

  async function findRelatedMobile(mobile: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .rpc("find_property_by_mobile", {
        lookup_mobile: mobile,
        excluded_property_id: null
      })
      .maybeSingle();
    if (error) throw error;
    return data as Property | null;
  }

  async function importRow(row: ImportRow, rowNumber: number) {
    validateRequiredFields(row, rowNumber);

    const operation = getOperation(getRequiredText(row, "operation", rowNumber), rowNumber);
    const city = getRequiredText(row, "city", rowNumber);
    const propertyType = getRequiredText(row, "property_type", rowNumber);
    const employeeName = getRequiredText(row, "employee_name", rowNumber);
    const mobile = normalizePhone(getRequiredText(row, "mobile", rowNumber));
    const description = getRequiredText(row, "description", rowNumber);
    const price = asText(row.price);
    const status = getStatus(row.status, rowNumber);

    if (!mobile) throw new Error(`Row ${rowNumber}: mobile is invalid.`);

    const supabase = getSupabase();
    const relatedProperty = await findRelatedMobile(mobile);
    const commonPayload = {
      p_operation: operation,
      p_city: city,
      p_property_type: propertyType,
      p_employee_name: employeeName,
      p_mobile: mobile,
      p_description: description,
      p_price: price,
      p_status: status,
      p_related_property_id: relatedProperty?.id ?? null
    };

    const availabilityType = getAvailabilityType(row.availability_type, rowNumber);
    const availabilityOther = asText(row.availability_other);
    if (mode === "partial" && availabilityType === "other" && !availabilityOther) {
      throw new Error(`Row ${rowNumber}: availability_other is required when availability_type is other.`);
    }

    const request = mode === "partial"
      ? supabase.rpc("create_partial_property", {
          ...commonPayload,
          p_availability_type: availabilityType,
          p_availability_other: availabilityType === "other" ? availabilityOther : ""
        })
      : supabase.rpc("create_property", commonPayload);

    const { error } = await request;
    if (error) throw error;
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const rows = extractImportItems(parsed);
      if (!rows.length) throw new Error("JSON file must contain an array of units.");

      for (const [index, row] of rows.entries()) {
        if (!isRecord(row)) throw new Error(`Row ${index + 1}: unit data must be an object.`);
        await importRow(row, index + 1);
      }

      showToast(`تم استيراد ${rows.length} وحدة بنجاح`, "success");
      onImported?.();
      window.dispatchEvent(new CustomEvent("properties:imported"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "حدث خطأ أثناء استيراد الوحدات", "error");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        className="json-import-input"
        type="file"
        accept="application/json, .json"
        onChange={importJson}
        disabled={importing}
      />
      <button className="soft-button compact" type="button" onClick={() => inputRef.current?.click()} disabled={importing}>
        <Upload size={18} />
        {importing ? "جاري الاستيراد" : "استيراد JSON"}
      </button>
    </>
  );
}
