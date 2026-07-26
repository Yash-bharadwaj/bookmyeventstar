"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, Smartphone, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { sendPasswordResetEmail, getAdditionalUserInfo, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { sendPhoneOtp, resetRecaptcha, signOutEverywhere } from "@/lib/firebase/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Step = "identifier" | "emailSent" | "otp" | "newPassword" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone-path state
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // New password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const isEmail = identifier.includes("@");

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Enter your email or mobile number");
      return;
    }
    setLoading(true);
    try {
      if (isEmail) {
        // Firebase sends a real, signed reset link to the inbox — this is
        // the actual identity check for the email path. Always show success
        // (whether or not the address exists) so this can't be used to probe
        // which emails have accounts.
        await sendPasswordResetEmail(auth, identifier.trim().toLowerCase());
        setStep("emailSent");
      } else {
        const digits = identifier.replace(/\D/g, "").slice(-10);
        if (!/^[6-9]\d{9}$/.test(digits)) {
          toast.error("Enter a valid 10-digit mobile number");
          return;
        }
        const res = await fetch("/api/auth/phone-exists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits }),
        });
        const json = await res.json();
        if (!json.exists) {
          toast.error("No account found with that mobile number.");
          return;
        }
        const result = await sendPhoneOtp(`+91${digits}`);
        setConfirmationResult(result);
        setResendIn(60);
        setStep("otp");
        toast.success("OTP sent to your mobile");
      }
    } catch (err) {
      console.error("[forgot-password] request failed:", err);
      resetRecaptcha();
      toast.error("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    const digits = identifier.replace(/\D/g, "").slice(-10);
    setOtpBusy(true);
    try {
      const result = await sendPhoneOtp(`+91${digits}`);
      setConfirmationResult(result);
      setResendIn(60);
      toast.success("OTP resent");
    } catch {
      resetRecaptcha();
      toast.error("Could not resend OTP — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (!confirmationResult || code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setOtpBusy(true);
    try {
      const cred = await confirmationResult.confirm(code);
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;
      if (isNewUser) {
        // This number was never linked as a verified phone credential on the
        // existing account (e.g. it signed up via /register, which never
        // verifies phone) — confirming just created an unrelated bare
        // account. Never let that stand in for the real one, and remove the
        // stray account so the phone number isn't permanently stuck on it.
        const strayToken = await cred.user.getIdToken();
        fetch("/api/auth/delete-stray-phone-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: strayToken }),
        }).catch(() => {});
        await signOutEverywhere();
        toast.error("This number isn't set up for phone verification yet — please reset via email instead.");
        setStep("identifier");
        return;
      }
      toast.success("Mobile number verified");
      setStep("newPassword");
    } catch (err) {
      console.error("[forgot-password] OTP confirm failed:", err);
      toast.error("Incorrect OTP — please try again.");
      setOtpError(true);
      setOtpCode("");
      setTimeout(() => setOtpError(false), 500);
    } finally {
      setOtpBusy(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("Verification expired — please start over.");
        setStep("identifier");
        return;
      }
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not reset password");
        return;
      }
      await signOutEverywhere();
      setStep("done");
    } catch {
      toast.error("No internet connection — please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <div id="recaptcha-container" />

      {/* Left panel — branding, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 h-full navy-gradient relative overflow-hidden flex-col items-center justify-center p-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <BrandLogo href="/" size="lg" priority />
          </div>
          <p className="text-white/70">
            India&apos;s premier artist management and event booking platform
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            {[
              ["Verified", "Every Artist"],
              ["2 Hours", "Coordinator Response"],
              ["Pan-India", "Coverage"],
              ["₹0", "Upfront Fee"],
            ].map(([val, label]) => (
              <div key={label} className="glass rounded-xl p-3.5">
                <p className="font-display text-xl font-bold text-white">{val}</p>
                <p className="text-white/60 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 h-full overflow-y-auto flex items-center justify-center p-6 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md py-6"
      >
          <div className="lg:hidden mb-6 flex justify-center">
            <BrandLogo href="/" size="lg" priority />
          </div>

          {step === "identifier" && (
            <>
              <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-gold-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">Reset your password</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Enter the email or mobile number on your account. We&apos;ll verify it&apos;s really you before
                anything changes.
              </p>

              <form onSubmit={requestReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Email or mobile number</Label>
                  <Input
                    type="text"
                    placeholder="you@example.com or 9876543210"
                    icon={isEmail ? <Mail className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
                  {isEmail ? "Send reset link" : "Send verification code"}
                </Button>
              </form>
            </>
          )}

          {step === "emailSent" && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">Check your email</h2>
              <p className="text-muted-foreground text-sm mt-1">
                If an account exists for <strong className="text-navy-900">{identifier.trim()}</strong>, we&apos;ve
                sent a link to reset your password. It expires soon, so use it shortly.
              </p>
              <Button
                variant="outline"
                className="w-full mt-6"
                onClick={() => setStep("identifier")}
              >
                Use a different email or number
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-gold-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">Enter the code</h2>
              <p className="text-muted-foreground text-sm mt-1">
                We sent a 6-digit code to +91 {identifier.replace(/\D/g, "").slice(-10)}.
              </p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={(code) => verifyOtp(code)}
                    disabled={otpBusy}
                    error={otpError}
                    autoFocus
                  />
                  <Button type="button" onClick={() => verifyOtp()} loading={otpBusy} className="w-full">
                    Verify
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    className="text-gold-700 font-medium disabled:text-muted-foreground"
                    disabled={resendIn > 0 || otpBusy}
                    onClick={resendOtp}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-navy-900"
                    onClick={() => setStep("identifier")}
                  >
                    Edit number
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "newPassword" && (
            <>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">Choose a new password</h2>
              <p className="text-muted-foreground text-sm mt-1">Verified — set a new password for your account.</p>

              <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      icon={<Lock className="w-4 h-4" />}
                      className="pr-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    icon={<Lock className="w-4 h-4" />}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
                  Reset password
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-navy-900">Password reset</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your password has been updated. You can sign in with your new password now.
              </p>
              <Link href="/login">
                <Button className="w-full mt-6" size="lg">Go to login</Button>
              </Link>
            </>
          )}

          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-navy-900">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
      </motion.div>
      </div>
    </div>
  );
}
