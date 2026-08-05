"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, CalendarCheck, Mic2, CheckCircle2,
  Smartphone, ShieldCheck, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { signInWithEmail } from "@/lib/firebase/auth-client";
import { registerSchema, RegisterFormData } from "@/lib/validations/auth";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useCategories } from "@/hooks/useCategories";
import { useCities } from "@/hooks/useCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { ResendTimer } from "@/components/ui/resend-timer";
import { ArtistCategorySelect } from "@/components/artist/ArtistCategorySelect";
import { ArtistLocationSelect } from "@/components/artist/ArtistLocationSelect";
import { BudgetRangeSelect, getBudgetBand } from "@/components/artist/BudgetRangeSelect";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

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
    <div className="h-dvh flex overflow-hidden">
      {/* Left panel — role-aware branding, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 h-full navy-gradient relative overflow-hidden flex-col items-center justify-center p-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <BrandLogo href="/" size="lg" priority />
          </div>

          {isArtist ? (
            <>
              <p className="text-white/70">
                List your profile and let our coordinators bring the bookings to you.
              </p>
              <div className="mt-6 space-y-2.5 text-left">
                {ARTIST_PANEL_BENEFITS.map((b) => (
                  <div key={b} className="flex items-start gap-3 glass rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/90 leading-snug">{b}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-white/70">
                India&apos;s premier artist management and event booking platform
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                {CLIENT_PANEL_STATS.map(([val, label]) => (
                  <div key={label} className="glass rounded-xl p-3.5">
                    <p className="font-display text-xl font-bold text-white">{val}</p>
                    <p className="text-white/60 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 h-full overflow-y-auto bg-white">
        {/* Centering lives on this inner min-h-full wrapper, not on the
            overflow-y-auto element itself — flex-centering a scroll
            container clips whichever end overflows past the viewport (the
            classic bug where the top of a tall, centered, scrollable form
            becomes unreachable). This wrapper just grows with content. */}
        <div className="min-h-full flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-6"
        >
          <div className="lg:hidden mb-6 flex justify-center">
            <BrandLogo href="/" size="lg" priority />
          </div>

          <h2 className="font-display text-2xl font-bold text-navy-900">Create your account</h2>
          <p className="text-muted-foreground text-sm mt-1">Join thousands using BookMyEventStar</p>

          {/* Role selector */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { value: "client", label: "I want to book artists", icon: CalendarCheck, color: "text-gold-600 bg-gold-50" },
              { value: "artist", label: "I am an artist", icon: Mic2, color: "text-navy-700 bg-navy-50" },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedRole === opt.value ? "border-gold-500 bg-gold-50" : "border-border hover:border-gold-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={selectedRole === opt.value}
                    onChange={() => setSelectedRole(opt.value as "client" | "artist")}
                  />
                  <div className={`w-9 h-9 rounded-xl ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                </label>
              );
            })}
          </div>

          {/* Client bookings are paused for now — ClientRegisterForm below is
              untouched and fully wired, just swapped out for a placeholder.
              Flip this back to `<ClientRegisterForm />` to re-enable. */}
          {selectedRole === "client" && <ClientBookingComingSoon />}
          {/* ArtistRegisterForm stays mounted (just hidden) instead of being
              swapped out by the ternary above — unmounting it would blow
              away its useGoogleSignIn state (in-progress Google sign-in,
              verified phone, entered category/location/budget) the moment
              someone taps the other tab and comes back. */}
          <div className={selectedRole === "artist" ? undefined : "hidden"}>
            <ArtistRegisterForm />
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-gold-600 font-medium hover:text-gold-700">
              Sign in
            </Link>
          </p>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

/**
 * Artist signup — mobile number is the verified channel, proven via Firebase
 * Phone Auth OTP before the account exists. Email is collected but not
 * proven. Artists still go through a separate admin verification/listing
 * gate afterward — this only closes the "anyone can type in a phone number
 * they don't own" gap at signup time.
 */
function ArtistRegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    googleBusy, googleUser, phoneDigits: googlePhone, setPhoneDigits: setGooglePhone,
    categories: googleCategories, setCategories: setGoogleCategories,
    city: googleCity, setCity: setGoogleCity,
    area: googleArea, setArea: setGoogleArea,
    budgetRange: googleBudgetRange, setBudgetRange: setGoogleBudgetRange,
    finishing: googleFinishing, startGoogleSignIn, finishGoogleSignup, cancelGoogleSignup,
  } = useGoogleSignIn("artist");
  // The hook only tracks city/area/budget (what the API needs) — "state" is
  // purely a local filter for the cascading dropdown, never submitted.
  const [googleLocationState, setGoogleLocationState] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationExpires, setVerificationExpires] = useState(0);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "artist" },
  });
  const email = watch("email");
  const selectedCategories = watch("categories");
  const locationState = watch("state");
  const locationCity = watch("city");
  const locationArea = watch("area");
  const budgetRange = watch("budgetRange");
  const { categories } = useCategories();
  const { cities } = useCities();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Enter a valid email address first"); return; }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Could not send the code — please try again."); return; }
      setOtpSent(true);
      setResendIn(45);
      toast.success("Code sent to your email");
    } catch (err) {
      console.error("[register-artist] email-otp send failed:", err);
      toast.error("Could not send the code — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.verified) {
        toast.error(json.error ?? "Incorrect code — please try again.");
        setOtpError(true);
        setOtpCode("");
        setTimeout(() => setOtpError(false), 500);
        return;
      }
      setVerificationToken(json.token);
      setVerificationExpires(json.expires);
      setEmailVerified(true);
      toast.success("Email verified");
    } catch (err) {
      console.error("[register-artist] email-otp verify failed:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!emailVerified) { toast.error("Please verify your email first"); return; }
    setLoading(true);
    try {
      const band = getBudgetBand(data.budgetRange ?? "");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          role: "artist",
          categories: data.categories,
          city: data.city,
          area: data.area,
          budgetMin: band?.min,
          budgetMax: band?.max,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast(result.error ?? "You already have an account — redirecting to login.", { icon: "ℹ️" });
          router.push(`/login?email=${encodeURIComponent(data.email)}`);
          return;
        }
        throw new Error(result.error ?? "Registration failed");
      }

      await signInWithEmail(data.email, data.password, "artist");
      toast.success("Account created! Complete your profile to get listed.");
      router.push("/artist");
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (googleUser) {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-sm">
          <p className="font-medium text-emerald-800">Signed in with Google</p>
          <p className="text-emerald-700 text-xs mt-0.5">{googleUser.name || googleUser.email}</p>
        </div>
        <div className="space-y-1">
          <Label>Mobile Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm text-muted-foreground font-medium shrink-0">
              +91
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              icon={<Phone className="w-4 h-4" />}
              value={googlePhone}
              onChange={(e) => setGooglePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-w-0"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>What kind of artist are you?</Label>
          <ArtistCategorySelect categories={categories} value={googleCategories} onChange={setGoogleCategories} />
        </div>
        <div className="space-y-1">
          <Label>Where do you perform?</Label>
          <ArtistLocationSelect
            cities={cities}
            value={{ state: googleLocationState, city: googleCity, area: googleArea }}
            onChange={(v) => { setGoogleLocationState(v.state); setGoogleCity(v.city); setGoogleArea(v.area); }}
          />
        </div>
        <div className="space-y-1">
          <Label>Starting price range</Label>
          <BudgetRangeSelect value={googleBudgetRange} onChange={setGoogleBudgetRange} />
        </div>
        <Button type="button" onClick={finishGoogleSignup} loading={googleFinishing} className="w-full" size="lg">
          Finish Sign Up
        </Button>
        <button type="button" onClick={cancelGoogleSignup} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          Use a different sign-in method
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
      <Button type="button" variant="outline" className="w-full gap-2" onClick={startGoogleSignIn} loading={googleBusy}>
        <GoogleIcon className="w-4 h-4" />
        Continue with Google
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Full Name</Label>
          <Input placeholder="John Doe" icon={<User className="w-4 h-4" />} error={errors.name?.message} {...register("name")} />
        </div>
        <div className="space-y-1">
          <Label>Mobile Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm text-muted-foreground font-medium shrink-0">
              +91
            </div>
            <Input type="tel" placeholder="9876543210" maxLength={10} icon={<Phone className="w-4 h-4" />} error={errors.phone?.message} className="min-w-0" {...register("phone")} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label>What kind of artist are you?</Label>
        <ArtistCategorySelect
          categories={categories}
          value={selectedCategories ?? []}
          onChange={(v) => setValue("categories", v, { shouldValidate: true })}
        />
        {errors.categories?.message && <p className="text-xs text-destructive">{errors.categories.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Where do you perform?</Label>
        <ArtistLocationSelect
          cities={cities}
          value={{ state: locationState ?? "", city: locationCity ?? "", area: locationArea ?? "" }}
          onChange={(v) => {
            setValue("state", v.state, { shouldValidate: true });
            setValue("city", v.city, { shouldValidate: true });
            setValue("area", v.area, { shouldValidate: true });
          }}
          errors={{ state: errors.state?.message, city: errors.city?.message, area: errors.area?.message }}
        />
      </div>

      <div className="space-y-1">
        <Label>Starting price range</Label>
        <BudgetRangeSelect
          value={budgetRange ?? ""}
          onChange={(v) => setValue("budgetRange", v, { shouldValidate: true })}
          error={errors.budgetRange?.message}
        />
      </div>

      <div className={cn(
        "rounded-2xl border p-3.5 space-y-2.5 transition-colors",
        emailVerified ? "border-emerald-200 bg-emerald-50/40" : "border-gold-200 bg-gold-50/50"
      )}>
        <p className={cn(
          "text-xs font-medium flex items-center gap-1.5",
          emailVerified ? "text-emerald-700" : "text-gold-700"
        )}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {emailVerified ? "Email verified" : "Verify your email"}
        </p>
        <Input
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
          rightIcon={emailVerified ? (
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </motion.span>
          ) : undefined}
          error={errors.email?.message}
          success={emailVerified}
          disabled={otpSent || emailVerified}
          {...register("email")}
        />
        {!emailVerified && !otpSent && (
          <Button type="button" onClick={handleSendOtp} loading={otpBusy} className="w-full">
            Send code
          </Button>
        )}
        {!emailVerified && otpSent && (
          <>
            <div className="space-y-2">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => handleVerifyOtp(code)}
                disabled={otpBusy}
                error={otpError}
                autoFocus
              />
              <Button type="button" onClick={() => handleVerifyOtp()} loading={otpBusy} className="w-full">
                Verify
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <ResendTimer seconds={resendIn} totalSeconds={45} onResend={handleSendOtp} disabled={otpBusy} />
              <button type="button" className="text-muted-foreground hover:text-navy-900" onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                Edit email
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {emailVerified && (
          <motion.div
            key="password-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  className="pr-11"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} autoComplete="new-password" {...register("confirmPassword")} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" loading={loading} disabled={!emailVerified} className="w-full mt-1" size="lg">
        Create Account
      </Button>
    </form>
  );
}

function ClientBookingComingSoon() {
  return (
    <div className="mt-6 text-center rounded-2xl border border-gold-200 bg-gold-50/50 p-6">
      <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-display font-bold text-lg text-navy-900 mb-1.5">Launching Soon 🎭</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Booking an artist here isn&apos;t live yet — it&apos;s still warming up backstage.
      </p>
    </div>
  );
}

/**
 * Client signup — mobile number is the verified channel, proven via Firebase
 * Phone Auth OTP before the account exists. Email is still collected as
 * contact info, just no longer proven.
 */
function ClientRegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    googleBusy, googleUser, phoneDigits: googlePhone, setPhoneDigits: setGooglePhone,
    finishing: googleFinishing, startGoogleSignIn, finishGoogleSignup, cancelGoogleSignup,
  } = useGoogleSignIn("client");

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationExpires, setVerificationExpires] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Enter a valid email address first"); return; }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Could not send the code — please try again."); return; }
      setOtpSent(true);
      setResendIn(45);
      toast.success("Code sent to your email");
    } catch (err) {
      console.error("[register] email-otp send failed:", err);
      toast.error("Could not send the code — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const json = await res.json();
      if (!res.ok || !json.verified) {
        toast.error(json.error ?? "Incorrect code — please try again.");
        setOtpError(true);
        setOtpCode("");
        setTimeout(() => setOtpError(false), 500);
        return;
      }
      setVerificationToken(json.token);
      setVerificationExpires(json.expires);
      setEmailVerified(true);
      toast.success("Email verified");
    } catch (err) {
      console.error("[register] email-otp verify failed:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerified) { toast.error("Please verify your email first"); return; }
    if (!name.trim() || name.trim().length < 2) { toast.error("Enter your name"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const digits = phoneDigits.replace(/\D/g, "");
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: digits,
          password,
          role: "client",
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast(json.error ?? "You already have an account — redirecting to login.", { icon: "ℹ️" });
          window.location.href = `/login?email=${encodeURIComponent(email.trim())}`;
          return;
        }
        toast.error(json.error ?? "Could not create your account — please try again.");
        return;
      }

      await signInWithEmail(email.trim(), password, "client");
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

  if (googleUser) {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-sm">
          <p className="font-medium text-emerald-800">Signed in with Google</p>
          <p className="text-emerald-700 text-xs mt-0.5">{googleUser.name || googleUser.email}</p>
        </div>
        <div className="space-y-1">
          <Label>Mobile Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0">+91</div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              icon={<Smartphone className="w-4 h-4" />}
              value={googlePhone}
              onChange={(e) => setGooglePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-w-0"
            />
          </div>
        </div>
        <Button type="button" onClick={finishGoogleSignup} loading={googleFinishing} className="w-full" size="lg">
          Finish Sign Up
        </Button>
        <button type="button" onClick={cancelGoogleSignup} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          Use a different sign-in method
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <Button type="button" variant="outline" className="w-full gap-2" onClick={startGoogleSignIn} loading={googleBusy}>
        <GoogleIcon className="w-4 h-4" />
        Continue with Google
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Full Name</Label>
          <Input placeholder="Jane Doe" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Mobile Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0">+91</div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="9876543210"
              icon={<Smartphone className="w-4 h-4" />}
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-w-0"
            />
          </div>
        </div>
      </div>

      <div className={cn(
        "rounded-2xl border p-3.5 space-y-2.5 transition-colors",
        emailVerified ? "border-emerald-200 bg-emerald-50/40" : "border-gold-200 bg-gold-50/50"
      )}>
        <p className={cn(
          "text-xs font-medium flex items-center gap-1.5",
          emailVerified ? "text-emerald-700" : "text-gold-700"
        )}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {emailVerified ? "Email verified" : "Verify your email"}
        </p>
        <Input
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
          rightIcon={emailVerified ? (
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </motion.span>
          ) : undefined}
          success={emailVerified}
          value={email}
          disabled={otpSent || emailVerified}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!emailVerified && !otpSent && (
          <Button type="button" onClick={handleSendOtp} loading={otpBusy} className="w-full">
            Send code
          </Button>
        )}
        {!emailVerified && otpSent && (
          <>
            <div className="space-y-2">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(code) => handleVerifyOtp(code)}
                disabled={otpBusy}
                error={otpError}
                autoFocus
              />
              <Button type="button" onClick={() => handleVerifyOtp()} loading={otpBusy} className="w-full">
                Verify
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <ResendTimer seconds={resendIn} totalSeconds={45} onResend={handleSendOtp} disabled={otpBusy} />
              <button type="button" className="text-muted-foreground hover:text-navy-900" onClick={() => { setOtpSent(false); setOtpCode(""); }}>
                Edit email
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {emailVerified && (
          <motion.div
            key="password-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Re-enter password" icon={<Lock className="w-4 h-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" loading={loading} disabled={!emailVerified} className="w-full mt-1" size="lg">
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
