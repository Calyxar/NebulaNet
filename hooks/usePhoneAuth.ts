// hooks/usePhoneAuth.ts — REACT NATIVE FIREBASE ✅
// ✅ FIXED: separate modes for sign-up (signInWithPhoneNumber)
// vs 2FA enrollment (verifyPhoneNumber + linkWithCredential)

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
  const confirmationRef = useRef<any>(null);
  const modeRef = useRef<"signin" | "link">("signin");

  const reset = () => {
    setState("idle");
    setError(null);
    confirmationRef.current = null;
    modeRef.current = "signin";
  };

  // ✅ For sign-up / phone login — creates new session
  const sendOTP = async (phoneNumber: string): Promise<boolean> => {
    setError(null);
    setState("sending");
    modeRef.current = "signin";
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      confirmationRef.current = confirmation;
      setState("awaiting_code");
      return true;
    } catch (e: any) {
      console.error("[phoneAuth] sendOTP:", e?.code, e?.message);
      const msg = parsePhoneError(e);
      setError(msg);
      setState("error");
      return false;
    }
  };

  // ✅ For 2FA enrollment on existing user — keeps session intact
  const sendOTPForLink = async (phoneNumber: string): Promise<boolean> => {
    setError(null);
    setState("sending");
    modeRef.current = "link";
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error("Not signed in");

      const provider = currentUser.providerData.find(
        (p) => p.providerId === "phone",
      );
      if (provider) {
        await currentUser.unlink("phone");
      }

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

      confirmationRef.current = { verificationId, mode: "link" };
      setState("awaiting_code");
      return true;
    } catch (e: any) {
      console.error("[phoneAuth] sendOTPForLink:", e?.code, e?.message);
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
      // ✅ Link mode — keeps existing session
      if (modeRef.current === "link") {
        const currentUser = auth().currentUser;
        if (!currentUser) throw new Error("Not signed in");
        const credential = auth.PhoneAuthProvider.credential(
          confirmationRef.current.verificationId,
          code,
        );
        const result = await currentUser.linkWithCredential(credential);
        setState("success");
        return result.user ?? currentUser;
      }

      // ✅ Sign-in mode — new session
      const result = await confirmationRef.current.confirm(code);
      setState("success");
      return result.user;
    } catch (e: any) {
      console.error("[phoneAuth] verifyOTP:", e?.code, e?.message);
      const msg = parsePhoneError(e);
      setError(msg);
      setState("error");
      return null;
    }
  };

  return { state, error, sendOTP, sendOTPForLink, verifyOTP, reset };
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
