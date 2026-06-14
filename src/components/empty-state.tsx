import { SearchX } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <SearchX size={42} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
