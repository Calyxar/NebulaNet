// hooks/usePhoneAuth.ts — FIXED ✅
// ✅ FIXED: use @react-native-firebase/auth instead of firebase/auth (web SDK)
// firebase/auth requires a real RecaptchaVerifier — returns error with SilentRecaptcha mock
// @react-native-firebase/auth handles Play Integrity/SafetyNet natively on Android
// No reCAPTCHA, no verifier needed at all

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
  const confirmationRef = useRef<any>(null);

  const reset = () => {
    setState("idle");
    setError(null);
    confirmationRef.current = null;
  };

  const sendOTP = async (phoneNumber: string): Promise<boolean> => {
    setError(null);
    setState("sending");
    try {
      // ✅ FIXED: use @react-native-firebase/auth — handles Play Integrity natively
      const rnAuth = require("@react-native-firebase/auth").default;
      const confirmation = await rnAuth().signInWithPhoneNumber(phoneNumber);
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
  if (
    code === "auth/invalid-phone-number" ||
    msg.includes("invalid-phone-number")
  )
    return "Invalid phone number. Include your country code (e.g. +1).";
  if (code === "auth/too-many-requests" || msg.includes("too-many-requests"))
    return "Too many attempts. Please wait before trying again.";
  if (
    code === "auth/invalid-verification-code" ||
    msg.includes("invalid-verification-code")
  )
    return "Incorrect code. Please check and try again.";
  if (code === "auth/code-expired" || msg.includes("code-expired"))
    return "Code expired. Please request a new one.";
  if (code === "auth/quota-exceeded")
    return "SMS quota exceeded. Please try again later.";
  if (msg.includes("cancelled") || msg.includes("dismissed")) return "";
  return e?.message || "Something went wrong. Please try again.";
}
