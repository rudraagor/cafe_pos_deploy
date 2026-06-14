import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export default async function AuditLogPage() {
  await requireRole("admin");
  const rows = await db.query.auditLogs.findMany({
    with: { actor: true },
    orderBy: [desc(auditLogs.createdAt)],
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          Last 100 operational events across sessions, payments, discounts,
          users, and stock.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Entity</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td
                  className="text-muted-foreground px-4 py-8 text-center"
                  colSpan={5}
                >
                  No audit events yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">{row.actor?.name ?? "System"}</td>
                  <td className="px-4 py-3 font-medium">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.entityType}
                    {row.entityId ? (
                      <span className="text-muted-foreground block max-w-44 truncate text-xs">
                        {row.entityId}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground max-w-md px-4 py-3">
                    <code className="line-clamp-2 text-xs whitespace-pre-wrap">
                      {JSON.stringify(row.metadata)}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}
