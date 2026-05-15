import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={24} />
    </div>
  );
}
