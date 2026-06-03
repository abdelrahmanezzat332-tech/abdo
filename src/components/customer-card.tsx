"use client";

import { Archive, Banknote, CalendarDays, Edit3, MapPin, Phone, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import { canManageCustomer, hasPermission } from "@/lib/permissions";
import type { Customer, UserProfile } from "@/lib/types";

export function CustomerCard({
  customer,
  profile,
  onDelete,
  onArchive,
  onUnarchive
}: {
  customer: Customer;
  profile: UserProfile | null;
  onDelete: (customer: Customer) => void;
  onArchive?: (customer: Customer) => void;
  onUnarchive?: (customer: Customer) => void;
}) {
  const canEdit = canManageCustomer(profile, "edit");
  const canDelete = canManageCustomer(profile, "delete");
  const canViewMobile = hasPermission(profile, "can_view_customer_mobile");
  const customerName = customer.customer_name?.trim() || "عميل بدون اسم";
  const isArchived = Boolean(customer.archived_at);

  return (
    <article className="property-card customer-card">
      {/* ── Badges ── */}
      <div className="card-topline">
        <div className="card-badges">
          <span className="badge badge-gold">كود: {customer.customer_code}</span>
          <span className="muted-pill">{customerName}</span>
          {isArchived ? <span className="muted-pill status-sold">مؤرشف</span> : null}
        </div>
      </div>

      {/* ── Location ── */}
      <div className="card-location">
        <MapPin size={16} />
        <strong>{customer.city}</strong>
      </div>

      {/* ── Notes — flex-grow pushes meta to bottom ── */}
      <p className="property-description customer-description">{customer.notes || "—"}</p>

      {/* ── Meta ── */}
      <div className="property-meta">
        <span><UserRound size={15} />{customerName}</span>
        <span><Phone size={15} />{canViewMobile ? customer.mobile : "رقم مخفي"}</span>
        <span><Banknote size={15} />{customer.budget}</span>
        <span><CalendarDays size={15} />{formatDate(customer.created_at)}</span>
        {isArchived && customer.archived_at ? (
          <span><Archive size={15} />أُرشف: {formatDate(customer.archived_at)}</span>
        ) : null}
      </div>

      {/* ── Actions ── */}
      {(canEdit || canDelete) && (
        <div className="card-actions">
          {canEdit && !isArchived ? (
            <Link className="soft-button" href={`/customers/${customer.id}/edit`}>
              <Edit3 size={15} />
              تعديل
            </Link>
          ) : null}

          {canEdit && !isArchived && onArchive ? (
            <button className="soft-button" type="button" onClick={() => onArchive(customer)}>
              <Archive size={15} />
              أرشفة
            </button>
          ) : null}

          {canEdit && isArchived && onUnarchive ? (
            <button className="soft-button" type="button" onClick={() => onUnarchive(customer)}>
              <Archive size={15} />
              استعادة
            </button>
          ) : null}

          {canDelete ? (
            <button className="soft-button danger" type="button" onClick={() => onDelete(customer)}>
              <Trash2 size={15} />
              حذف
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
