import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { usePreferencesStore } from "../stores/preferencesStore";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";
import en from "./en.json";
import ja from "./ja.json";

export { useTranslation } from "react-i18next";

export const resources = {
  "zh-CN": { translation: zhCN },
  "zh-TW": { translation: zhTW },
  en: { translation: en },
  ja: { translation: ja },
};

// Bundle every language so switching also works offline in the native app.
export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: usePreferencesStore.getState().language,
  fallbackLng: "zh-CN",
  supportedLngs: Object.keys(resources),
  keySeparator: false,
  nsSeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
});

const updateDocumentLanguage = (language: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = language;
};
updateDocumentLanguage(i18n.language);
i18n.on("languageChanged", updateDocumentLanguage);
const unsubscribe = usePreferencesStore.subscribe((state, previous) => {
  if (state.language !== previous.language)
    void i18n.changeLanguage(state.language);
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe();
    i18n.off("languageChanged", updateDocumentLanguage);
  });
}
