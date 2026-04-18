// lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      home: "Home",
      explore: "Explore",
      notifications: "Notifications",
      profile: "Profile",
    },
  },
  es: {
    translation: {
      home: "Inicio",
      explore: "Explorar",
      notifications: "Notificaciones",
      profile: "Perfil",
    },
  },
  fr: {
    translation: {
      home: "Accueil",
      explore: "Explorer",
      notifications: "Notifications",
      profile: "Profil",
    },
  },
  de: {
    translation: {
      home: "Startseite",
      explore: "Erkunden",
      notifications: "Benachrichtigungen",
      profile: "Profil",
    },
  },
  // add more as needed
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
