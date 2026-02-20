import React from "react";
import { Button } from "./Button";

export function DataToolbar({
  title,
  subtitle,
  onFilter,
}: {
  title: string;
  subtitle?: string;
  onFilter?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-2xl font-semibold">{title}</div>
        {subtitle && <div className="text-sm text-[var(--text-muted)]">{subtitle}</div>}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onFilter}>
          Filters
        </Button>
        <Button>New</Button>
      </div>
    </div>
  );
}
