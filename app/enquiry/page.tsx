"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  DollarSign,
  User,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Eye,
  EyeOff,
  Briefcase,
  AtSign,
  Globe,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, getCountFromServer, Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { signInWithEmail, signOutEverywhere } from "@/lib/firebase/auth-client";
import { enquiryFormSchema, EnquiryFormValues } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OtpInput } from "@/components/ui/otp-input";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPES, INDIA_CITIES } from "@/lib/utils";
import { notifyAllAdmins } from "@/lib/notifications/client";

const ENQUIRY_STEPS = [
  { title: "Your details", subtitle: "Who is booking this event?" },
  { title: "Event details", subtitle: "When and where" },
  { title: "Budget & artists", subtitle: "So we can match the right talent" },
];

const DAILY_ENQUIRY_LIMIT = 5;

function maskPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(-10);
  return d.length < 10 ? `+91 ${digits}` : `+91 •••••${d.slice(-4)}`;
}

export default function EnquiryPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [phonePreview, setPhonePreview] = useState("");

  // Account fields — only collected/shown for brand-new (logged-out) visitors
  const [phoneDigits, setPhoneDigits] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEventManager, setIsEventManager] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email verification (OTP once at signup — phone-auth SMS is unreliable
  // without Firebase billing, so email is the verified channel instead)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationExpires, setVerificationExpires] = useState(0);

  // Enquiry wizard state
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artistCategories, setArtistCategories] = useState<string[]>([]);
  const [dailyCount, setDailyCount] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: { source: "website", submitter_type: "personal" },
  });

  const checkDailyLimit = useCallback(async (userId: string) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const q = query(
        collection(db, "enquiries"),
        where("client_id", "==", userId),
        where("created_at", ">=", Timestamp.fromDate(todayStart))
      );
      const snap = await getCountFromServer(q);
      setDailyCount(snap.data().count);
    } catch { /* non-fatal */ }
  }, []);

  const syncFromSession = useCallback(async (user: { uid: string } | null) => {
    try {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const profile = snap.exists() ? snap.data() : null;
        if (profile) {
          if (profile.phone) setPhonePreview(maskPhone(profile.phone));
          reset({
            source: "website",
            submitter_type: "personal",
            name: (profile.name as string)?.trim() || "",
            email: (profile.email as string) || "",
          });
          setHasSession(true);
          checkDailyLimit(user.uid);
        }
      }
    } catch {
      // session check failed — fall through to logged-out signup form
    }
    setSessionReady(true);
  }, [reset, checkDailyLimit]);

  useEffect(() => {
    // auth.currentUser is null until Firebase Auth finishes restoring the
    // persisted session after a fresh page load — reading it synchronously
    // here would incorrectly treat an already-logged-in client as a new
    // visitor on every hard navigation to this page. onAuthStateChanged's
    // first callback fires once that restoration completes (with the real
    // user, or null if there truly isn't one).
    const unsubscribe = onAuthStateChanged(auth, (user) => { syncFromSession(user); });
    return () => unsubscribe();
  }, [syncFromSession]);

  useEffect(() => {
    getDocs(collection(db, "categories")).then((snap) => {
      setArtistCategories(snap.docs.map((d) => d.data().name as string).sort());
    });
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSignOut = async () => {
    await signOutEverywhere();
    setHasSession(false);
    setPhonePreview("");
    setDailyCount(null);
    reset({ source: "website", submitter_type: "personal", name: "", email: "" });
  };

  const handleSendOtp = async () => {
    const email = watch("email")?.trim();
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
      console.error("[enquiry] email-otp send failed:", err);
      toast.error("Could not send the code — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    const email = watch("email")?.trim();
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
      console.error("[enquiry] email-otp verify failed:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const nextStep = async () => {
    let fields: (keyof EnquiryFormValues)[] = [];
    if (step === 0) fields = ["name", "email", "submitter_type", "source"];
    if (step === 1) fields = ["event_type", "event_date", "location", "city"];
    const valid = await trigger(fields);
    if (!valid) return;

    if (step === 0 && !hasSession) {
      const d = phoneDigits.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(d)) { toast.error("Enter a valid 10-digit mobile number"); return; }
      if (!emailVerified) { toast.error("Please verify your email first"); return; }
      if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
      if (isEventManager) {
        if (!companyName.trim()) { toast.error("Enter your company / agency name"); return; }
        if (!instagramHandle.trim()) { toast.error("Instagram handle is required"); return; }
      }
    }

    setStep((s) => s + 1);
  };

  const onSubmit: SubmitHandler<EnquiryFormValues> = async (raw) => {
    if (loading) return; // prevent double-submit
    const parsed = enquiryFormSchema.safeParse(raw);
    if (!parsed.success) return;
    const data = parsed.data;
    setLoading(true);
    try {
      let clientId = auth.currentUser?.uid ?? null;

      // Brand-new visitor — finish account setup, then continue
      if (!clientId) {
        if (!emailVerified) {
          toast.error("Please verify your email first");
          setStep(0);
          return;
        }
        const d = phoneDigits.replace(/\D/g, "");

        let res: Response;
        try {
          res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              phone: d,
              password,
              role: "client",
              emailVerificationToken: verificationToken,
              emailVerificationExpires: verificationExpires,
              isEventManager,
              companyName:     isEventManager ? companyName     : undefined,
              instagramHandle: isEventManager ? instagramHandle : undefined,
              websiteUrl:      isEventManager && websiteUrl.trim() ? websiteUrl : undefined,
            }),
          });
        } catch {
          toast.error("No internet connection — please check and try again.");
          return;
        }

        const json = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            toast("You already have an account. Redirecting to login…", { icon: "ℹ️" });
            window.location.href = `/login?email=${encodeURIComponent(data.email)}`;
            return;
          }
          toast.error(json.error ?? "Could not create your account — please try again.");
          return;
        }

        const cred = await signInWithEmail(data.email, password);
        setPhonePreview(maskPhone(d));
        clientId = cred.user.uid;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const limitQ = query(
        collection(db, "enquiries"),
        where("client_id", "==", clientId),
        where("created_at", ">=", Timestamp.fromDate(todayStart))
      );
      const countSnap = await getCountFromServer(limitQ);
      if (countSnap.data().count >= DAILY_ENQUIRY_LIMIT) {
        toast.error(`Daily enquiry limit reached (${DAILY_ENQUIRY_LIMIT}). Try again tomorrow or WhatsApp us.`);
        return;
      }

      try {
        await updateDoc(doc(db, "users", clientId), {
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
        });
      } catch (err) {
        console.error("[enquiry] profile update failed:", err);
        toast.error("Could not save your profile");
        return;
      }

      const budgetMax =
        data.budget_max && data.budget_max >= data.budget_min ? data.budget_max : data.budget_min;

      const enquiryRef = await addDoc(collection(db, "enquiries"), {
        client_id: clientId,
        event_type: data.event_type,
        event_date: data.event_date,
        location: data.location.trim(),
        city: data.city,
        budget_min: data.budget_min,
        budget_max: budgetMax,
        artist_preference: data.artist_preference?.trim() || null,
        other_requirements: data.other_requirements?.trim() || null,
        status: "new",
        source: data.source,
        submitter_type: data.submitter_type,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });

      notifyAllAdmins({
        title: "New Enquiry Received",
        message: `${data.name.trim()} submitted a ${data.event_type} enquiry in ${data.city}.`,
        type: "info",
        link: `/admin/enquiries/${enquiryRef.id}`,
      }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      console.error("[enquiry] submit failed:", err);
      toast.error("Failed to submit enquiry — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen navy-gradient flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-white/90">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen navy-gradient flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Enquiry received!</h2>
          <p className="text-muted-foreground mt-3">
            Our coordinator will reach you within{" "}
            <strong className="text-navy-900">2 hours</strong> on{" "}
            {phonePreview || "your mobile"} and email.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-gold-50 border border-gold-200 text-sm text-gold-800">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 space-y-1 text-left list-disc list-inside">
              <li>We review your brief and budget</li>
              <li>Suitable artists are shortlisted</li>
              <li>You receive options and a proposal</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/client">
              <Button className="w-full">Go to my dashboard</Button>
            </Link>
            <a href="https://wa.me/919999999999">
              <Button variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp us
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BrandLogo href="/" size="xl" priority />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">
            Tell us about your event
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Coordinator responds within 2 hours
          </p>
        </div>

        {hasSession && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white/90 text-sm min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                Signed in as{" "}
                <span className="font-semibold text-white">{phonePreview}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-medium text-gold-300 hover:text-gold-200 underline underline-offset-2 shrink-0"
            >
              Not you?
            </button>
          </div>
        )}

        {/* Daily limit banner */}
        {dailyCount !== null && dailyCount >= DAILY_ENQUIRY_LIMIT && (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 mb-4 flex items-center gap-3 text-sm text-red-200">
            <span className="text-base">🚫</span>
            <span>
              You&apos;ve used all <strong>{DAILY_ENQUIRY_LIMIT} enquiries</strong> for today. Come back tomorrow, or{" "}
              <a href="https://wa.me/919999999999" className="underline font-medium">WhatsApp us</a> directly.
            </span>
          </div>
        )}
        {dailyCount !== null && dailyCount === DAILY_ENQUIRY_LIMIT - 1 && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 mb-4 flex items-center gap-3 text-sm text-amber-200">
            <span className="text-base">⚠️</span>
            <span>You have <strong>1 enquiry left</strong> for today — make it count!</span>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {ENQUIRY_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step
                      ? "gold-gradient text-white"
                      : i === step
                        ? "bg-white text-navy-900"
                        : "bg-white/20 text-white/50"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-white/60 hidden sm:block">{s.title}</span>
              </div>
              {i < ENQUIRY_STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 transition-all ${i < step ? "bg-gold-500" : "bg-white/20"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-display font-semibold text-navy-900">{ENQUIRY_STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{ENQUIRY_STEPS[step].subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {/* Step 0: Your details (+ account setup for new visitors) */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Your name *</Label>
                        <Input
                          placeholder="Full name"
                          icon={<User className="w-4 h-4" />}
                          error={errors.name?.message}
                          {...register("name")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          icon={<Mail className="w-4 h-4" />}
                          error={errors.email?.message}
                          disabled={!hasSession && otpSent}
                          {...register("email")}
                        />
                      </div>
                    </div>

                    {!hasSession && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Mobile Number *</Label>
                          <div className="flex gap-2">
                            <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0">
                              +91
                            </div>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              placeholder="9876543210"
                              icon={<Smartphone className="w-4 h-4" />}
                              value={phoneDigits}
                              onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              className="min-w-0"
                            />
                          </div>
                        </div>

                        {!emailVerified ? (
                          <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4 space-y-3">
                            <p className="text-xs font-medium text-gold-700 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify your email
                            </p>
                            {!otpSent && (
                              <Button type="button" onClick={handleSendOtp} loading={otpBusy} className="w-full">
                                Send code
                              </Button>
                            )}

                            {otpSent && (
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
                            )}
                            {otpSent && (
                              <div className="flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  className="text-gold-700 font-medium disabled:text-muted-foreground"
                                  disabled={resendIn > 0 || otpBusy}
                                  onClick={handleSendOtp}
                                >
                                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                                </button>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-navy-900"
                                  onClick={() => { setOtpSent(false); setOtpCode(""); }}
                                >
                                  Edit email
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-2 rounded-xl">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {watch("email")} verified
                          </div>
                        )}

                        {emailVerified && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label>Password *</Label>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min. 8 characters"
                                    icon={<Lock className="w-4 h-4" />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="pr-11"
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
                                <Label>Confirm password *</Label>
                                <Input
                                  type="password"
                                  placeholder="Re-enter password"
                                  icon={<Lock className="w-4 h-4" />}
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  autoComplete="new-password"
                                />
                              </div>
                            </div>

                            {/* Event manager toggle */}
                            <button
                              type="button"
                              onClick={() => setIsEventManager((v) => !v)}
                              className={`w-full flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                                isEventManager
                                  ? "border-gold-500 bg-gold-50 ring-1 ring-gold-500/30"
                                  : "border-border hover:border-gold-200"
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isEventManager ? "gold-gradient text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-navy-900">
                                  I&apos;m an event manager / planner
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Booking on behalf of a client or agency
                                </p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                isEventManager ? "border-gold-500 bg-gold-500" : "border-muted-foreground/40"
                              }`}>
                                {isEventManager && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isEventManager && (
                                <motion.div
                                  key="em-fields"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4 space-y-3">
                                    <p className="text-xs font-medium text-gold-700 flex items-center gap-1.5">
                                      <Briefcase className="w-3.5 h-3.5" />
                                      Agency / company details
                                    </p>

                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Company / agency name *</Label>
                                      <Input
                                        type="text"
                                        placeholder="e.g. Starlight Events"
                                        icon={<Building2 className="w-4 h-4" />}
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                      />
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Instagram handle *</Label>
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
                                          @
                                        </span>
                                        <Input
                                          type="text"
                                          placeholder="youragency"
                                          className="pl-7"
                                          icon={<AtSign className="w-4 h-4" />}
                                          value={instagramHandle}
                                          onChange={(e) =>
                                            setInstagramHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""))
                                          }
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label className="text-xs">Website <span className="text-muted-foreground">(optional)</span></Label>
                                      <Input
                                        type="url"
                                        placeholder="https://youragency.com"
                                        icon={<Globe className="w-4 h-4" />}
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}

                        <p className="text-xs text-muted-foreground text-center">
                          Already have an account?{" "}
                          <Link href="/login" className="text-gold-600 hover:text-gold-700 font-medium">
                            Log in
                          </Link>
                        </p>
                      </>
                    )}

                    <div className="space-y-1.5">
                      <Label>How did you hear about us?</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { value: "website", label: "Website" },
                          { value: "whatsapp", label: "WhatsApp" },
                          { value: "email", label: "Email" },
                          { value: "instagram", label: "Instagram" },
                          { value: "referral", label: "Referral" },
                          { value: "walk_in", label: "Walk-in" },
                        ].map((opt) => {
                          const selected = watch("source") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setValue("source", opt.value as EnquiryFormValues["source"])
                              }
                              className={`py-3 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                                selected
                                  ? "border-gold-500 bg-gold-50 text-gold-700"
                                  : "border-border hover:border-gold-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Event details */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Event type *</Label>
                        <Select onValueChange={(val) => setValue("event_type", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.event_type && (
                          <p className="text-xs text-destructive">{errors.event_type.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Event date *</Label>
                        <Input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          icon={<Calendar className="w-4 h-4" />}
                          error={errors.event_date?.message}
                          {...register("event_date")}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>City *</Label>
                        <Select onValueChange={(val) => setValue("city", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDIA_CITIES.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                {c.name}, {c.state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.city && (
                          <p className="text-xs text-destructive">{errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Venue / location *</Label>
                        <Input
                          placeholder="e.g. hotel or hall name, area"
                          icon={<MapPin className="w-4 h-4" />}
                          error={errors.location?.message}
                          {...register("location")}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Budget */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Minimum budget (₹) *</Label>
                        <Input
                          type="number"
                          placeholder="50000"
                          icon={<DollarSign className="w-4 h-4" />}
                          error={errors.budget_min?.message}
                          {...register("budget_min")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Maximum budget (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Same as min if unsure"
                          icon={<DollarSign className="w-4 h-4" />}
                          error={errors.budget_max?.message}
                          {...register("budget_max")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Artist style</Label>
                      <Select onValueChange={(val) => setValue("artist_preference", val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional — category or mood" />
                        </SelectTrigger>
                        <SelectContent>
                          {artistCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Anything else we should know?</Label>
                      <Textarea
                        placeholder="Song preferences, stage, languages, timing…"
                        rows={4}
                        {...register("other_requirements")}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-9"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Link href="/">
                  <Button type="button" variant="outline" className="h-11 sm:h-9">
                    Cancel
                  </Button>
                </Link>
              )}

              {step < ENQUIRY_STEPS.length - 1 ? (
                <Button type="button" className="h-11 sm:h-9 flex-1 sm:flex-none" onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="h-11 sm:h-9 flex-1 sm:flex-none font-semibold"
                  loading={loading}
                  disabled={loading || (dailyCount !== null && dailyCount >= DAILY_ENQUIRY_LIMIT)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {dailyCount !== null && dailyCount >= DAILY_ENQUIRY_LIMIT
                    ? "Daily limit reached"
                    : "Submit enquiry"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
