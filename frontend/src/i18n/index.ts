import es from "./es";
import en from "./en";
import zh from "./zh";

export type Locale = "es" | "en" | "zh";

const translations: Record<Locale, Record<string, string>> = { es, en, zh };

export const LOCALES: { key: Locale; label: string; flag: string }[] = [
  { key: "zh", label: "中文", flag: "🇨🇳" },
  { key: "es", label: "Espanol", flag: "🇪🇸" },
  { key: "en", label: "English", flag: "🇺🇸" },
];

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] ?? translations.es[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    });
  }
  return text;
}

export default translations;
