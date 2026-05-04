import es from "./es";
import en from "./en";

export type Locale = "es" | "en";

const translations: Record<Locale, Record<string, string>> = { es, en };

export const LOCALES: { key: Locale; label: string; flag: string }[] = [
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
