"use client";

import { CalendarDays, Edit3, MapPin, Phone, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

import { formatDate, operationLabel } from "@/lib/format";
import { canManageProperty, hasPermission } from "@/lib/permissions";
import type { Property, UserProfile } from "@/lib/types";

export function PropertyCard({
  property,
  profile,
  onDelete
}: {
  property: Property;
  profile: UserProfile | null;
  onDelete: (property: Property) => void;
}) {
  const canEdit = canManageProperty(profile, "edit");
  const canDelete = canManageProperty(profile, "delete");
  const canViewMobile = hasPermission(profile, "can_view_mobile");

  return (
    <article className="property-card">
      <div className="card-topline">
        <div className="card-badges">
          <span className={`badge ${property.operation === "sell" ? "badge-gold" : "badge-blue"}`}>
            {operationLabel(property.operation)}
          </span>
          <span className="muted-pill">{property.property_type}</span>
        </div>
        {property.related_property_id ? <span className="linked-pill">نفس رقم وحدة أخرى</span> : null}
      </div>

      <div className="card-location">
        <MapPin size={18} />
        <strong>{property.city}</strong>
      </div>

      <p className="property-description">{property.description}</p>

      <div className="property-meta">
        <span>
          <UserRound size={16} />
          {property.employee_name}
        </span>
        <span>
          <Phone size={16} />
          {canViewMobile ? property.mobile : "رقم مخفي"}
        </span>
        <span>
          <CalendarDays size={16} />
          {formatDate(property.created_at)}
        </span>
      </div>

      {(canEdit || canDelete) && (
        <div className="card-actions">
          {canEdit ? (
            <Link className="soft-button" href={`/properties/${property.id}/edit`}>
              <Edit3 size={16} />
              تعديل
            </Link>
          ) : null}
          {canDelete ? (
            <button className="soft-button danger" type="button" onClick={() => onDelete(property)}>
              <Trash2 size={16} />
              حذف
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
