import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Mode = "light" | "dark";

export type ColorTheme = "coral" | "ocean" | "sunset" | "garden" | "lavender" | "rose" | "midnight" | "blush" | "berry" | "sky" | "custom";

export const COLOR_THEMES: { key: ColorTheme; label: string; preview: string; accent: string; gradient?: boolean }[] = [
  { key: "coral", label: "Coral", preview: "from-[#ff9f9b] to-[#fab0e4]", accent: "#ff9f9b", gradient: true },
  { key: "blush", label: "Rosa Pastel", preview: "from-[#f8b4c8] to-[#c8a8e8]", accent: "#f8b4c8", gradient: true },
  { key: "berry", label: "Berries", preview: "from-[#e85080] to-[#a848d0]", accent: "#e85080", gradient: true },
  { key: "ocean", label: "Oceano", preview: "from-[#5ba3e6] to-[#5ec4bb]", accent: "#5ba3e6", gradient: true },
  { key: "sky", label: "Cielo", preview: "from-[#88c8f8] to-[#b8a8f8]", accent: "#88c8f8", gradient: true },
  { key: "sunset", label: "Atardecer", preview: "from-[#f0a050] to-[#f08060]", accent: "#f0a050", gradient: true },
  { key: "garden", label: "Jardin", preview: "from-[#50b878] to-[#68d498]", accent: "#50b878", gradient: true },
  { key: "lavender", label: "Lavanda", preview: "from-[#b088e8] to-[#d088e8]", accent: "#b088e8", gradient: true },
  { key: "rose", label: "Rosa", preview: "from-[#e8688a] to-[#f080a8]", accent: "#e8688a", gradient: true },
  { key: "midnight", label: "Medianoche", preview: "from-[#6878a8] to-[#5878b0]", accent: "#6878a8", gradient: true },
];

interface ThemeContextType {
  theme: Mode;
  toggleTheme: () => void;
  isDark: boolean;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  customColor: string;
  setCustomColor: (color: string) => void;
  accentColor: string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Mode>(() => {
    const saved = localStorage.getItem("theme") as Mode;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem("colorTheme") as ColorTheme) || "coral";
  });

  const [customColor, setCustomColorState] = useState(() => {
    return localStorage.getItem("customColor") || "#e85080";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const accentColor = colorTheme === "custom"
    ? customColor
    : (COLOR_THEMES.find((t) => t.key === colorTheme)?.accent || "#ff9f9b");

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    COLOR_THEMES.forEach((t) => {
      root.classList.remove(`theme-${t.key}`);
    });
    root.classList.remove("theme-custom");
    // Add current theme class (coral = default, no class needed)
    if (colorTheme === "custom") {
      root.classList.add("theme-custom");
      root.style.setProperty("--custom-accent", customColor);
    } else if (colorTheme !== "coral") {
      root.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem("colorTheme", colorTheme);

    // Update PWA theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", accentColor);
    }

    // Update favicon dynamically with theme color
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs><clipPath id="c"><rect width="512" height="512" rx="114"/></clipPath></defs>
      <rect width="512" height="512" rx="114" fill="${accentColor}"/>
      <g clip-path="url(#c)"><rect x="0" y="390" width="512" height="122" fill="#000" opacity="0.13"/></g>
      <path d="M256,358 C240,342 190,308 160,278 C124,242 100,210 100,174 C100,124 136,86 180,86 C208,86 232,102 256,130 C280,102 304,86 332,86 C376,86 412,124 412,174 C412,210 388,242 352,278 C322,308 272,342 256,358Z" fill="white"/>
      <text x="258" y="450" text-anchor="middle" font-family="Georgia,serif" font-weight="400" font-size="54" letter-spacing="14" fill="white">AMORY</text>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.type = "image/svg+xml";
      link.href = url;
    }
    // Update apple-touch-icon
    const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleLink) {
      appleLink.href = colorTheme !== "custom" ? `/icons/icon-192-${colorTheme}.png` : `/icons/icon-192.png`;
    }
  }, [colorTheme, customColor, accentColor]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const setColorTheme = (ct: ColorTheme) => setColorThemeState(ct);

  const setCustomColor = (color: string) => {
    setCustomColorState(color);
    localStorage.setItem("customColor", color);
    setColorThemeState("custom");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark", colorTheme, setColorTheme, customColor, setCustomColor, accentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
