"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "./Button";

export function DataTable<TData>({
  columns,
  data,
  tableId,
  renderRowActions,
}: {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  tableId: string;
  renderRowActions?: (row: TData) => React.ReactNode;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [savedViews, setSavedViews] = useState<
    { name: string; columnVisibility: Record<string, boolean>; globalFilter: string }[]
  >([]);
  const [viewName, setViewName] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  useEffect(() => {
    const stored = localStorage.getItem(`fh:views:${tableId}`);
    if (stored) setSavedViews(JSON.parse(stored));
  }, [tableId]);

  useEffect(() => {
    localStorage.setItem(`fh:views:${tableId}`, JSON.stringify(savedViews));
  }, [savedViews, tableId]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const saveView = () => {
    if (!viewName) return;
    setSavedViews((prev) => [...prev, { name: viewName, columnVisibility, globalFilter }]);
    setViewName("");
  };

  const applyView = (name: string) => {
    const view = savedViews.find((v) => v.name === name);
    if (!view) return;
    setColumnVisibility(view.columnVisibility);
    setGlobalFilter(view.globalFilter);
  };

  const columnsList = useMemo(() => table.getAllLeafColumns(), [table]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          placeholder="Search…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
        />
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
            <button
              className={`px-3 py-2 ${density === "comfortable" ? "bg-[var(--surface-2)]" : "text-[var(--text-2)]"}`}
              onClick={() => setDensity("comfortable")}
            >
              Comfortable
            </button>
            <button
              className={`px-3 py-2 ${density === "compact" ? "bg-[var(--surface-2)]" : "text-[var(--text-2)]"}`}
              onClick={() => setDensity("compact")}
            >
              Compact
            </button>
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Save view"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
            />
            <Button variant="secondary" onClick={saveView}>
              Save View
            </Button>
          </div>
          {savedViews.length > 0 && (
            <select
              className="px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
              onChange={(e) => applyView(e.target.value)}
            >
              <option>Saved Views</option>
              {savedViews.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <div className="relative group">
            <Button variant="secondary">Columns</Button>
            <div className="absolute right-0 mt-2 hidden group-hover:block w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 z-40">
              {columnsList.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={c.getIsVisible()}
                    onChange={c.getToggleVisibilityHandler()}
                  />
                  {c.id}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-2)] sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left font-medium text-[var(--text-secondary)] px-4 py-3 border-b border-[var(--border)]"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
                {renderRowActions && (
                  <th className="text-right font-medium text-[var(--text-secondary)] px-4 py-3 border-b border-[var(--border)]">
                    Actions
                  </th>
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`group hover:bg-[var(--state-hover)] transition ${density === "compact" ? "text-xs" : "text-sm"}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`${density === "compact" ? "px-3 py-2" : "px-4 py-3"} border-b border-[var(--border)]`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {renderRowActions && (
                  <td
                    className={`${density === "compact" ? "px-3 py-2" : "px-4 py-3"} border-b border-[var(--border)] text-right opacity-0 group-hover:opacity-100 transition`}
                  >
                    {renderRowActions(row.original)}
                  </td>
                )}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (renderRowActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-[var(--text-2)]"
                >
                  <div className="mx-auto max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm">
                    No results. Try adjusting filters or saved views.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
