"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/app/(auth)/actions";
import { closeSession } from "@/app/(pos)/pos/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminNav } from "@/lib/nav";

export function PosHamburgerMenu() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCloseSession() {
    startTransition(async () => {
      const result = await closeSession();
      if (result.ok) {
        toast.success(result.message ?? "Session closed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-md p-1.5 hover:bg-muted"
        aria-label="Menu"
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Manage</DropdownMenuLabel>
          {adminNav.map((item) => (
            <DropdownMenuItem
              key={item.href}
              onClick={() => router.push(item.href)}
            >
              <item.icon className="size-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCloseSession} disabled={isPending}>
          Close session
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
