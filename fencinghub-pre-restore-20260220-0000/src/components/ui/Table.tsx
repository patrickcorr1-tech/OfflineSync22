import React from "react";

export function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-2)] sticky top-0">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left font-medium text-[var(--text-secondary)] px-4 py-3 border-b border-[var(--border)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--state-hover)] transition">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 border-b border-[var(--border)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
