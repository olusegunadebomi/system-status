"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useHydrated } from "../hooks/use-client-env";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const isDark = hydrated && resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={hydrated ? label : "Toggle theme"}
      title={hydrated ? label : undefined}
      className="flex size-10 items-center justify-center rounded-full border border-border bg-grouped-card text-secondary transition-colors hover:bg-fill hover:text-foreground"
    >
      {/* Render both and let CSS pick, so the icon is right before hydration too. */}
      <Sun aria-hidden className="hidden size-[18px] dark:block" />
      <Moon aria-hidden className="size-[18px] dark:hidden" />
    </button>
  );
}
