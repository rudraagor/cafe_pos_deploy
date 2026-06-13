import { CupSoda } from "lucide-react";

export default function PosOrderPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 p-6 text-center">
      <CupSoda className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">POS Terminal</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The floor pop-up and order view are built in the next milestone. The
        foundation (auth, database, and navigation) is in place.
      </p>
    </div>
  );
}
