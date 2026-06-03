// lib/firebase.ts — React Native Firebase ✅
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

export const app = rnApp.app();
export const auth = rnAuth();
export const db = rnFirestore();
export const storage = rnStorage();
export const functions = rnFunctions();
