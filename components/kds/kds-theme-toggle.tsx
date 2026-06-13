"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const storageKey = "kds-theme";

type KdsTheme = "light" | "dark";

export function KdsThemeToggle() {
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const theme =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    applyTheme(theme);
  }, []);

  function chooseTheme(theme: KdsTheme) {
    window.localStorage.setItem(storageKey, theme);
    applyTheme(theme);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => chooseTheme("light")}
        aria-label="Use light mode"
        title="Light mode"
      >
        <Sun className="size-4" />
        Light
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => chooseTheme("dark")}
        aria-label="Use dark mode"
        title="Dark mode"
      >
        <Moon className="size-4" />
        Dark
      </Button>
    </div>
  );
}

function applyTheme(theme: KdsTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
