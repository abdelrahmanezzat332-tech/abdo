"use client";

import { Archive, Banknote, CalendarDays, Edit3, MapPin, Phone, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

import { formatDate, operationLabel } from "@/lib/format";
import { canManageProperty, hasPermission } from "@/lib/permissions";
import type { Property, UserProfile } from "@/lib/types";

function statusLabel(status: Property["status"]) {
  if (status === "sold") return "تم البيع";
  if (status === "rented") return "تم الإيجار";
  return "متوفرة";
}

function statusClass(status: Property["status"]) {
  if (status === "sold") return "status-sold";
  if (status === "rented") return "status-rented";
  return "status-available";
}

export function PropertyCard({
  property,
  profile,
  onDelete,
  onArchive,
  onUnarchive
}: {
  property: Property;
  profile: UserProfile | null;
  onDelete: (property: Property) => void;
  onArchive?: (property: Property) => void;
  onUnarchive?: (property: Property) => void;
}) {
  const canEdit = canManageProperty(profile, "edit");
  const canDelete = canManageProperty(profile, "delete");
  const canViewMobile = hasPermission(profile, "can_view_mobile");
  const isArchived = Boolean(property.archived_at) || property.status === "sold" || property.status === "rented";

  return (
    <article className="property-card">
      {/* ── Badges ── */}
      <div className="card-topline">
        <div className="card-badges">
          <span className={`badge ${property.operation === "sell" ? "badge-gold" : "badge-blue"}`}>
            {operationLabel(property.operation)}
          </span>
          <span className="muted-pill">{property.property_type}</span>
          <span className="muted-pill">كود: {property.property_code ?? "تلقائي"}</span>
          <span className={`muted-pill ${statusClass(property.status)}`}>
            {statusLabel(property.status)}
          </span>
          {isArchived ? <span className="muted-pill status-archived">مؤرشف</span> : null}
        </div>
        {property.related_property_id ? (
          <span className="linked-pill">نفس رقم وحدة أخرى</span>
        ) : null}
      </div>

      {/* ── Location ── */}
      <div className="card-location">
        <MapPin size={16} />
        <strong>{property.city}</strong>
      </div>

      {/* ── Description — flex-grow pushes meta to bottom ── */}
      <p className="property-description">{property.description}</p>

      {/* ── Meta ── */}
      <div className="property-meta">
        <span><UserRound size={15} />{property.employee_name}</span>
        <span><Phone size={15} />{canViewMobile ? property.mobile : "رقم مخفي"}</span>
        {property.price ? (
          <span className="property-price"><Banknote size={15} />{property.price}</span>
        ) : null}
          <span><CalendarDays size={15} />{formatDate(property.created_at)}</span>
        {isArchived && property.archived_at ? (
          <span><Archive size={15} />أُرشف: {formatDate(property.archived_at)}</span>
        ) : null}
      </div>

      {/* ── Actions ── */}
      {(canEdit || canDelete) && (
        <div className="card-actions">
          {canEdit && !isArchived ? (
            <Link className="soft-button" href={`/properties/${property.id}/edit`}>
              <Edit3 size={15} />
              تعديل
            </Link>
          ) : null}
          {canEdit && !isArchived && onArchive ? (
            <button className="soft-button" type="button" onClick={() => onArchive(property)}>
              <Archive size={15} />
              أرشفة
            </button>
          ) : null}
          {canEdit && isArchived && onUnarchive ? (
            <button className="soft-button" type="button" onClick={() => onUnarchive(property)}>
              <Archive size={15} />
              استعادة
            </button>
          ) : null}
          {canDelete ? (
            <button className="soft-button danger" type="button" onClick={() => onDelete(property)}>
              <Trash2 size={15} />
              حذف
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
