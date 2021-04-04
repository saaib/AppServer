import i18n from "i18next";
import Backend from "i18next-http-backend";
import config from "../package.json";
import { LANGUAGE } from "@appserver/common/constants";

const languages = ["en", "ru"];

const newInstance = i18n.createInstance();

const lng = localStorage.getItem(LANGUAGE) || "en";

newInstance.use(Backend).init({
  lng: lng,
  supportedLngs: languages,
  whitelist: languages,
  fallbackLng: false,
  load: "languageOnly",
  //debug: true,

  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
    format: function (value, format) {
      if (format === "lowercase") return value.toLowerCase();
      return value;
    },
  },

  backend: {
    loadPath: `${config.homepage}/locales/{{lng}}/{{ns}}.json`,
    allowMultiLoading: false,
    crossDomain: false,
  },

  react: {
    useSuspense: false,
  },
});

export default newInstance;
