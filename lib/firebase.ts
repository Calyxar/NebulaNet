// lib/firebase.ts — React Native Firebase ✅
// All services routed through @react-native-firebase so auth state is
// shared across auth, firestore, storage, and functions calls.

import { firebase as rnApp } from "@react-native-firebase/app";
import rnAuth from "@react-native-firebase/auth";
import rnFirestore from "@react-native-firebase/firestore";
import rnFunctions from "@react-native-firebase/functions";
import rnStorage from "@react-native-firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

// RN Firebase reads config from google-services.json on Android, so we don't
// need to call initializeApp manually — rnApp.app() returns the default.
export const app = rnApp.app();

// These look like the web SDK's singletons but return RN Firebase modules
// whose methods are accessed via instance (e.g. auth().currentUser).
export const auth = rnAuth();
export const db = rnFirestore();
export const storage = rnStorage();
export const functions = rnFunctions();
