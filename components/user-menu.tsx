import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {user.role}
        </p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Log out"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
