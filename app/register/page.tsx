"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, CalendarCheck, Mic2, Globe, Info, CheckCircle2,
  Smartphone, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAdditionalUserInfo, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signInWithEmail, sendPhoneOtp, resetRecaptcha, linkPasswordCredential, syncSessionCookie } from "@/lib/firebase/auth-client";
import { registerSchema, RegisterFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand/BrandLogo";

const CLIENT_PANEL_STATS: [string, string][] = [
  ["Verified", "Every Artist"],
  ["2 Hours", "Coordinator Response"],
  ["Pan-India", "Coverage"],
  ["₹0", "Upfront Fee"],
];

const ARTIST_PANEL_BENEFITS = [
  "Get discovered by coordinators actively booking for real events",
  "We handle client coordination, contracts, and logistics",
  "Free to list — no cost to create or maintain your profile",
  "Manage availability, bookings, and earnings from one dashboard",
];

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "artist" ? "artist" : "client";
  const [selectedRole, setSelectedRole] = useState<"client" | "artist">(initialRole);
  const isArtist = selectedRole === "artist";

  return (
    <div className="min-h-screen flex">
      <div id="recaptcha-container" />

      {/* Left panel — role-aware branding, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 navy-gradient relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center max-w-sm"
        >
          <div className="flex justify-center mb-8">
            <BrandLogo href="/" size="xl" priority />
          </div>

          {isArtist ? (
            <>
              <p className="text-white/70 text-lg">
                List your profile and let our coordinators bring the bookings to you.
              </p>
              <div className="mt-10 space-y-3 text-left">
                {ARTIST_PANEL_BENEFITS.map((b) => (
                  <div key={b} className="flex items-start gap-3 glass rounded-xl p-3.5">
                    <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white/90">{b}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-white/70 text-lg">
                India&apos;s premier artist management and event booking platform
              </p>
              <div className="mt-10 grid grid-cols-2 gap-4 text-left">
                {CLIENT_PANEL_STATS.map(([val, label]) => (
                  <div key={label} className="glass rounded-xl p-4">
                    <p className="font-display text-2xl font-bold text-white">{val}</p>
                    <p className="text-white/60 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo href="/" size="xl" priority />
          </div>

          <h2 className="font-display text-3xl font-bold text-navy-900">Create your account</h2>
          <p className="text-muted-foreground mt-2">Join thousands using BookMyEventStar</p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { value: "client", label: "I want to book artists", icon: CalendarCheck, color: "text-gold-600 bg-gold-50" },
              { value: "artist", label: "I am an artist", icon: Mic2, color: "text-navy-700 bg-navy-50" },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedRole === opt.value ? "border-gold-500 bg-gold-50" : "border-border hover:border-gold-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={selectedRole === opt.value}
                    onChange={() => setSelectedRole(opt.value as "client" | "artist")}
                  />
                  <div className={`w-10 h-10 rounded-xl ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                </label>
              );
            })}
          </div>

          {selectedRole === "client" ? <ClientRegisterForm /> : <ArtistRegisterForm />}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-gold-600 font-medium hover:text-gold-700">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Artist signup — unchanged from before: email + password via
 * /api/auth/register (Admin SDK), no phone verification. Artists are
 * reviewed/verified by the platform before listing regardless, so the
 * identity bar here is intentionally different from the client path.
 */
function ArtistRegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "artist" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone, password: data.password, role: "artist" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Registration failed");

      await signInWithEmail(data.email, data.password);
      toast.success("Account created! Complete your profile to get listed.");
      router.push("/artist");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="mt-4 rounded-xl border border-navy-200 bg-navy-50 p-3.5 space-y-2"
      >
        <p className="text-xs font-semibold text-navy-900 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />What happens after you register?
        </p>
        <ul className="space-y-1.5">
          {[
            "Complete your artist profile — bio, categories, cities, portfolio photos",
            "Your profile is reviewed and verified by our team",
            "Once verified, you appear in client and coordinator searches",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-navy-800">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-navy-600" />
              {step}
            </li>
          ))}
        </ul>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input placeholder="John Doe" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-1.5">
          <Label>Email Address</Label>
          <Input type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label>Mobile Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm text-muted-foreground font-medium gap-1.5">
              <Globe className="w-3.5 h-3.5" />+91
            </div>
            <Input type="tel" placeholder="9876543210" maxLength={10} icon={<Phone className="w-4 h-4" />} error={errors.phone?.message} {...register("phone")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              className="pr-11"
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Confirm Password</Label>
          <Input type="password" placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        </div>

        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Create Account
        </Button>
      </form>
    </>
  );
}

/**
 * Client signup — same verified-phone trust level as /enquiry's inline
 * signup, instead of the old unverified-phone email+password flow. Both
 * paths create the same `client` role, so both now require a real OTP
 * before the account exists.
 */
function ClientRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedUid, setVerifiedUid] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const d = phoneDigits.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(d)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setOtpBusy(true);
    try {
      const result = await sendPhoneOtp(`+91${d}`);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendIn(60);
      toast.success("OTP sent to your mobile");
    } catch (err) {
      console.error("[register] sendPhoneOtp failed:", err);
      resetRecaptcha();
      toast.error("Could not send OTP — please check the number and try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult || !otpCode.trim()) { toast.error("Enter the OTP code"); return; }
    setOtpBusy(true);
    try {
      const cred = await confirmationResult.confirm(otpCode.trim());
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;
      if (!isNewUser) {
        toast("You already have an account. Redirecting to login…", { icon: "ℹ️" });
        window.location.href = `/login?phone=${phoneDigits.replace(/\D/g, "")}`;
        return;
      }
      setVerifiedUid(cred.user.uid);
      setPhoneVerified(true);
      toast.success("Mobile number verified");
    } catch (err) {
      console.error("[register] OTP confirm failed:", err);
      toast.error("Incorrect OTP — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { toast.error("Enter your name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email address"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const digits = phoneDigits.replace(/\D/g, "");
      const res = await fetch("/api/auth/phone-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: verifiedUid, name: name.trim(), email: email.trim(), phone: digits }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast("You already have an account. Redirecting to login…", { icon: "ℹ️" });
          window.location.href = `/login?phone=${digits}`;
          return;
        }
        toast.error(json.error ?? "Could not create your account — please try again.");
        return;
      }

      await linkPasswordCredential(`${digits}@phone.bmes.app`, password);
      const freshToken = await auth.currentUser!.getIdToken(true);
      await syncSessionCookie(freshToken);

      toast.success("Account created! Welcome to BookMyEventStar.");
      router.push("/client");
      router.refresh();
    } catch (err) {
      console.error("[register] client submit failed:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <Label>Full Name</Label>
        <Input placeholder="Jane Doe" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Email Address</Label>
        <Input type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {!phoneVerified ? (
        <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4 space-y-3">
          <p className="text-xs font-medium text-gold-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />Verify your mobile number
          </p>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap">+91</div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              icon={<Smartphone className="w-4 h-4" />}
              value={phoneDigits}
              disabled={otpSent}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            {!otpSent && (
              <Button type="button" onClick={handleSendOtp} loading={otpBusy} className="shrink-0 whitespace-nowrap">
                Send code
              </Button>
            )}
          </div>
          {otpSent && (
            <>
              <div className="flex gap-2 items-start">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  maxLength={6}
                  className="text-center tracking-[0.3em] font-semibold"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <Button type="button" onClick={handleVerifyOtp} loading={otpBusy} className="shrink-0">
                  Verify
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-gold-700 font-medium disabled:text-muted-foreground"
                  disabled={resendIn > 0 || otpBusy}
                  onClick={handleSendOtp}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
                <button type="button" className="text-muted-foreground hover:text-navy-900" onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                  Edit number
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-2 rounded-xl">
          <ShieldCheck className="w-3.5 h-3.5" />+91 {phoneDigits} verified
        </div>
      )}

      <AnimatePresence>
        {phoneVerified && (
          <motion.div
            key="password-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Password</Label>
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" loading={loading} disabled={!phoneVerified} className="w-full mt-2" size="lg">
        Create Account
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
