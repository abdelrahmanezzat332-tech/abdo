"use client";

import { Banknote, CalendarDays, Edit3, MapPin, Phone, StickyNote, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import { canManageCustomer, hasPermission } from "@/lib/permissions";
import type { Customer, UserProfile } from "@/lib/types";

export function CustomerCard({
  customer,
  profile,
  onDelete
}: {
  customer: Customer;
  profile: UserProfile | null;
  onDelete: (customer: Customer) => void;
}) {
  const canEdit = canManageCustomer(profile, "edit");
  const canDelete = canManageCustomer(profile, "delete");
  const canViewMobile = hasPermission(profile, "can_view_customer_mobile");
  const customerName = customer.customer_name?.trim() || "عميل بدون اسم";

  return (
    <article className="property-card">
      <div className="card-topline">
        <div className="card-badges">
          <span className="badge badge-gold">كود: {customer.customer_code}</span>
          <span className="muted-pill">{customerName}</span>
        </div>
      </div>

      <div className="card-location">
        <MapPin size={18} />
        <strong>{customer.city}</strong>
      </div>

      <p className="property-description">{customer.notes}</p>

      <div className="property-meta">
        <span>
          <UserRound size={16} />
          {customerName}
        </span>

        <span>
          <Phone size={16} />
          {canViewMobile ? customer.mobile : "رقم مخفي"}
        </span>

        <span>
          <Banknote size={16} />
          {customer.budget}
        </span>

        <span>
          <StickyNote size={16} />
          {customer.notes}
        </span>

        <span>
          <CalendarDays size={16} />
          {formatDate(customer.created_at)}
        </span>
      </div>

      {(canEdit || canDelete) && (
        <div className="card-actions">
          {canEdit ? (
            <Link className="soft-button" href={`/customers/${customer.id}/edit`}>
              <Edit3 size={16} />
              تعديل
            </Link>
          ) : null}

          {canDelete ? (
            <button className="soft-button danger" type="button" onClick={() => onDelete(customer)}>
              <Trash2 size={16} />
              حذف
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
