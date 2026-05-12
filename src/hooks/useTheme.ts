import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "forge-theme";

const apply = (t: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("light", t === "light");
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Theme | null) ?? "dark";
  });

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, setTheme, toggle };
};
