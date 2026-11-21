/**
 * i18n setup — Indonesian default (ADR-013, AGENTS.md §1 rule 15).
 * Never hardcode UI strings in components — always use t() from react-i18next.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import id from "./locales/id.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      id: { translation: id },
    },
    lng: "id",
    fallbackLng: "id",
    interpolation: { escapeValue: false },
    // Number formatting: Indonesian uses comma as decimal (K023)
  });

export default i18n;
