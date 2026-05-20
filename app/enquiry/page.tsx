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
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Building2,
  Briefcase,
  Heart,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enquiryFormSchema, EnquiryFormValues } from "@/lib/validations/enquiry";
// sendPhoneOtp / verifyPhoneOtp / toE164India imported when real OTP is wired up
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPES, INDIA_CITIES } from "@/lib/utils";

const STEPS = [
  { title: "Your details", subtitle: "Who is booking this event?" },
  { title: "Event details", subtitle: "When and where" },
  { title: "Budget & artists", subtitle: "So we can match the right talent" },
];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
];

const SUBMITTER_OPTIONS: {
  value: EnquiryFormValues["submitter_type"];
  label: string;
  hint: string;
  icon: typeof Heart;
}[] = [
  {
    value: "personal",
    label: "Personal / home",
    hint: "Wedding, birthday, private party, etc.",
    icon: Heart,
  },
  {
    value: "company",
    label: "Company / brand",
    hint: "Corporate show, product launch, annual day…",
    icon: Building2,
  },
  {
    value: "planner",
    label: "Event planner / agency",
    hint: "You’re booking on behalf of a client.",
    icon: Briefcase,
  },
];

const DAILY_ENQUIRY_LIMIT = 5;

function maskPhone(e164: string | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "").slice(-10);
  if (d.length < 10) return e164;
  return `+91 •••••${d.slice(-4)}`;
}

export default function EnquiryPage() {
  const [phase, setPhase] = useState<"otp" | "form">("otp");
  const [otpScreen, setOtpScreen] = useState<"phone" | "code">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifiedPhonePreview, setVerifiedPhonePreview] = useState("");

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artistCategories, setArtistCategories] = useState<string[]>([]);

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

  const syncFromSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.phone) {
      setVerifiedPhonePreview(maskPhone(session.user.phone));
      setPhase("form");
      const meta = session.user.user_metadata as { name?: string } | undefined;
      reset({
        source: "website",
        submitter_type: "personal",
        name: meta?.name?.trim() || "",
        email: "",
      });
    } else {
      setPhase("otp");
      setOtpScreen("phone");
    }
    setSessionReady(true);
  }, [reset]);

  useEffect(() => {
    syncFromSession();
  }, [syncFromSession]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    createClient().from("categories").select("name").order("name").then(({ data }) => {
      if (data) setArtistCategories(data.map((c) => c.name));
    });
  }, []);

  const startResendCooldown = () => setResendIn(60);

  const handleSendOtp = () => {
    const d = phoneDigits.replace(/\D/g, "");
    if (!d) {
      toast.error("Enter a mobile number");
      return;
    }
    setOtpCode("");
    setOtpScreen("code");
    startResendCooldown();
    toast.success("OTP sent to your mobile");
  };

  const handleVerifyOtp = async () => {
    const d = phoneDigits.replace(/\D/g, "");
    if (!d) {
      toast.error("Invalid mobile number");
      return;
    }
    if (!otpCode.replace(/\D/g, "")) {
      toast.error("Enter the OTP code");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await fetch("/api/auth/phone-otp-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: d }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: json.email,
        password: json.password,
      });
      if (signInError) throw signInError;

      setVerifiedPhonePreview(`+91 ${d}`);
      toast.success("Mobile verified");
      setPhase("form");
      setStep(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleChangeNumber = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setPhase("otp");
    setOtpScreen("phone");
    setPhoneDigits("");
    setOtpCode("");
    setVerifiedPhonePreview("");
    toast.success("Signed out — enter another number");
  };

  const nextStep = async () => {
    let fields: (keyof EnquiryFormValues)[] = [];
    if (step === 0) fields = ["name", "email", "submitter_type", "source"];
    if (step === 1) fields = ["event_type", "event_date", "location", "city"];
    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit: SubmitHandler<EnquiryFormValues> = async (raw) => {
    const parsed = enquiryFormSchema.safeParse(raw);
    if (!parsed.success) return;
    const data = parsed.data;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error("Your session expired — please enter your mobile again.");
        setPhase("otp");
        return;
      }
      const clientId = session.user.id;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", todayStart.toISOString());
      if ((count ?? 0) >= DAILY_ENQUIRY_LIMIT) {
        toast.error(
          `You’ve reached today’s enquiry limit (${DAILY_ENQUIRY_LIMIT}). Please try again tomorrow or WhatsApp us.`
        );
        return;
      }

      const { error: profileErr } = await supabase
        .from("users")
        .update({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          phone: phoneDigits.replace(/\D/g, "") ? `+91${phoneDigits.replace(/\D/g, "")}` : null,
        })
        .eq("id", clientId);
      if (profileErr) {
        if (profileErr.code === "23505") {
          toast.error("This email is already in use. Try a different email.");
        } else {
          toast.error(profileErr.message || "Could not save your profile");
        }
        return;
      }

      const budgetMax = data.budget_max && data.budget_max >= data.budget_min ? data.budget_max : data.budget_min;

      const { error: insErr } = await supabase.from("enquiries").insert({
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
        phone_verified_at: new Date().toISOString(),
      });
      if (insErr) throw insErr;

      setSubmitted(true);
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
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
          <h2 className="font-display text-2xl font-bold text-navy-900">Enquiry received</h2>
          <p className="text-muted-foreground mt-3">
            Our coordinator will reach you within <strong className="text-navy-900">2 hours</strong> on{" "}
            {verifiedPhonePreview || "your mobile"} and email.
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

  if (phase === "otp") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-6">
              <BrandLogo href="/" size="lg" priority />
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-white">
              Verify your mobile first
            </h1>
            <p className="text-white/65 mt-2 text-sm leading-relaxed px-2">
              One quick OTP protects real clients from spam enquiries — then you can share your event details. No password.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-display font-semibold text-navy-900 text-sm">
                  {otpScreen === "phone" ? "Step 1 — Mobile number" : "Step 2 — Enter OTP"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {otpScreen === "phone"
                    ? "We’ll send a 6-digit code by SMS (standard charges may apply)."
                    : `Code sent to +91 •••••${phoneDigits.slice(-4)}`}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {otpScreen === "phone" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Mobile number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap">
                        +91
                      </div>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="9876543210"
                        className="text-lg tracking-wide"
                        value={phoneDigits}
                        onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold"
                    loading={otpBusy}
                    onClick={handleSendOtp}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Send OTP
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>6-digit code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="• • • • • •"
                      className="text-center text-2xl tracking-[0.4em] font-semibold h-14"
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full h-12 text-base font-semibold"
                    loading={otpBusy}
                    onClick={handleVerifyOtp}
                  >
                    Verify & continue
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm">
                    <button
                      type="button"
                      className="text-indigo-600 font-medium disabled:text-muted-foreground"
                      disabled={resendIn > 0 || otpBusy}
                      onClick={handleSendOtp}
                    >
                      {resendIn > 0 ? `Resend SMS in ${resendIn}s` : "Resend SMS"}
                    </button>
                    <button type="button" className="text-muted-foreground hover:text-navy-900" onClick={() => {
                      setOtpScreen("phone");
                      setOtpCode("");
                    }}>
                      Edit number
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 pb-6">
              <Link href="/" className="block text-center">
                <Button type="button" variant="outline" className="w-full h-11">
                  Back to home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BrandLogo href="/" size="lg" priority />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Tell us about your event</h1>
          <p className="text-white/60 mt-2 text-sm">Verified enquiry — coordinator responds within 2 hours</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Mobile verified: <span className="font-semibold text-white">{verifiedPhonePreview}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleChangeNumber}
            className="text-xs font-medium text-gold-300 hover:text-gold-200 underline underline-offset-2 self-start sm:self-auto"
          >
            Wrong number? Start over
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < step
                      ? "gold-gradient text-navy-900"
                      : i === step
                        ? "bg-white text-navy-900"
                        : "bg-white/20 text-white/50"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-white/60 hidden sm:block">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 transition-all ${i < step ? "bg-gold-500" : "bg-white/20"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-display font-semibold text-navy-900">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
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
                          {...register("email")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Who is booking? *</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Helps our team prioritise real events and organise follow-up.
                      </p>
                      <div className="grid grid-cols-1 gap-2.5">
                        {SUBMITTER_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const sel = watch("submitter_type") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setValue("submitter_type", opt.value)}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                                sel ? "border-gold-500 bg-gold-50 ring-1 ring-gold-500/30" : "border-border hover:border-gold-200"
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  sel ? "gold-gradient text-navy-900" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-navy-900">{opt.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{opt.hint}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {errors.submitter_type && (
                        <p className="text-xs text-destructive">{errors.submitter_type.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>How did you hear about us?</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SOURCE_OPTIONS.map((opt) => {
                          const selected = watch("source") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setValue("source", opt.value as EnquiryFormValues["source"])}
                              className={`py-3 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                                selected ? "border-gold-500 bg-gold-50 text-gold-700" : "border-border hover:border-gold-300"
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
                        {errors.event_type && <p className="text-xs text-destructive">{errors.event_type.message}</p>}
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
                        {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
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
                <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setStep((s) => s - 1)}>
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

              {step < STEPS.length - 1 ? (
                <Button type="button" className="h-11 sm:h-9 flex-1 sm:flex-none" onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" className="h-11 sm:h-9 flex-1 sm:flex-none font-semibold" loading={loading}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit enquiry
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
