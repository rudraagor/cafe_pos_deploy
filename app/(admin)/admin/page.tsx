import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Configure your cafe and review performance.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Total Orders", value: "--" },
          { title: "Revenue", value: "--" },
          { title: "Avg. Order Value", value: "--" },
        ].map((m) => (
          <Card key={m.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Reporting and configuration modules arrive in the next milestones.
      </p>
    </div>
  );
}
