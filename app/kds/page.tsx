import { Monitor } from "lucide-react";

export default function KdsPage() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center gap-3 text-center">
      <Monitor className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Kitchen Display</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Real-time order tickets arrive in the KDS milestone.
      </p>
    </div>
  );
}
