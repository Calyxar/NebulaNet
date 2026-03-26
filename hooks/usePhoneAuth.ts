// hooks/usePhoneAuth.ts ✅
// Firebase Phone Auth for React Native + Expo
// Flow: sendOTP(phone) → user enters code → verifyOTP(code) → signed in

import { auth } from "@/lib/firebase";
import {
  ApplicationVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { useRef, useState } from "react";

export type PhoneAuthState =
  | "idle"
  | "sending"
  | "awaiting_code"
  | "verifying"
  | "success"
  | "error";

export function usePhoneAuth() {
  const [state, setState] = useState<PhoneAuthState>("idle");
  const [error, setError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const reset = () => {
    setState("idle");
    setError(null);
    confirmationRef.current = null;
  };

  /**
   * Send OTP to phone number.
   * phoneNumber must include country code e.g. "+12125551234"
   * appVerifier is the RecaptchaVerifier from expo-firebase-recaptcha
   */
  const sendOTP = async (
    phoneNumber: string,
    appVerifier: ApplicationVerifier,
  ): Promise<boolean> => {
    setError(null);
    setState("sending");
    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier,
      );
      confirmationRef.current = confirmation;
      setState("awaiting_code");
      return true;
    } catch (e: any) {
      const msg = parsePhoneError(e);
      setError(msg);
      setState("error");
      return false;
    }
  };

  /**
   * Verify the OTP code the user entered.
   * Returns the Firebase User on success.
   */
  const verifyOTP = async (code: string) => {
    if (!confirmationRef.current) {
      setError("Session expired. Please request a new code.");
      setState("error");
      return null;
    }
    setError(null);
    setState("verifying");
    try {
      const result = await confirmationRef.current.confirm(code);
      setState("success");
      return result.user;
    } catch (e: any) {
      const msg = parsePhoneError(e);
      setError(msg);
      setState("error");
      return null;
    }
  };

  return { state, error, sendOTP, verifyOTP, reset };
}

function parsePhoneError(e: any): string {
  const code: string = e?.code ?? "";
  const msg: string = (e?.message ?? "").toLowerCase();

  if (code === "auth/invalid-phone-number" || msg.includes("invalid-phone-number"))
    return "Invalid phone number. Include your country code (e.g. +1).";
  if (code === "auth/too-many-requests" || msg.includes("too-many-requests"))
    return "Too many attempts. Please wait before trying again.";
  if (code === "auth/invalid-verification-code" || msg.includes("invalid-verification-code"))
    return "Incorrect code. Please check and try again.";
  if (code === "auth/code-expired" || msg.includes("code-expired"))
    return "Code expired. Please request a new one.";
  if (code === "auth/quota-exceeded")
    return "SMS quota exceeded. Please try again later.";
  if (msg.includes("cancelled") || msg.includes("dismissed"))
    return "";
  return e?.message || "Something went wrong. Please try again.";
}
