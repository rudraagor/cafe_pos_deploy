import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  empty,
  emptyMessage = "No paid orders in this range.",
  children,
}: {
  title: string;
  description?: string;
  empty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
