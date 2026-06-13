"use client";

import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
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
        <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
