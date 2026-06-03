// hooks/usePhoneAuth.ts — REACT NATIVE FIREBASE ✅
// ✅ FIXED: uses verifyPhoneNumber + linkWithCredential
// so existing user session is preserved during 2FA enrollment

import auth from "@react-native-firebase/auth";
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
  const confirmationRef = useRef<{ verificationId: string } | null>(null);

  const reset = () => {
    setState("idle");
    setError(null);
    confirmationRef.current = null;
  };

  const sendOTP = async (phoneNumber: string): Promise<boolean> => {
    setError(null);
    setState("sending");
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Not signed in");

      // If phone is already linked, unlink first
      const provider = currentUser.providerData.find(
        (p) => p.providerId === "phone",
      );
      if (provider) {
        await currentUser.unlink("phone");
      }

      // ✅ verifyPhoneNumber keeps existing session intact
      const verificationId = await new Promise<string>((resolve, reject) => {
        auth()
          .verifyPhoneNumber(phoneNumber)
          .on(
            "state_changed",
            (snapshot) => {
              if (snapshot.state === auth.PhoneAuthState.CODE_SENT) {
                resolve(snapshot.verificationId);
              } else if (snapshot.state === auth.PhoneAuthState.ERROR) {
                reject(snapshot.error);
              }
            },
            reject,
          );
      });

      confirmationRef.current = { verificationId };
      setState("awaiting_code");
      return true;
    } catch (e: any) {
      console.error("[phoneAuth] sendOTP code:", e?.code, "msg:", e?.message);
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
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Not signed in");

      // ✅ linkWithCredential keeps existing session intact
      const credential = auth.PhoneAuthProvider.credential(
        confirmationRef.current.verificationId,
        code,
      );
      const result = await currentUser.linkWithCredential(credential);
      setState("success");
      return result.user ?? currentUser;
    } catch (e: any) {
      console.error("[phoneAuth] verifyOTP code:", e?.code, "msg:", e?.message);
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
  if (
    code === "auth/missing-client-identifier" ||
    msg.includes("missing-client-identifier")
  )
    return "Phone authentication isn't configured for this build. Check Play Integrity setup.";
  if (code === "auth/app-not-authorized" || msg.includes("app-not-authorized"))
    return "This app isn't authorized for phone auth. Check SHA-256 fingerprints in Firebase Console.";
  if (code === "auth/provider-already-linked" || msg.includes("already-linked"))
    return "This phone number is already linked to your account.";
  if (msg.includes("cancelled") || msg.includes("dismissed")) return "";
  return e?.message || "Something went wrong. Please try again.";
}
