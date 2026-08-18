"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ThemeToggle({
  className,
  showLabel = false,
  variant = "ghost",
  size = "icon"
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        showLabel && "w-full justify-start gap-2",
        className
      )}
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
      </div>
      {showLabel && (
        <span className="text-xs font-medium">
          {theme === "light" ? "Light Mode" : "Dark Mode"}
        </span>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
