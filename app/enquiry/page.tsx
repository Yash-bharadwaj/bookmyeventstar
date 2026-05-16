"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  DollarSign,
  Music,
  User,
  Mail,
  Phone,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { enquirySchema, EnquiryFormData } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_TYPES, ARTIST_CATEGORIES, INDIA_CITIES } from "@/lib/utils";

const STEPS = [
  { title: "Your Details", subtitle: "Who are you?" },
  { title: "Event Details", subtitle: "Tell us about your event" },
  { title: "Budget & Artist", subtitle: "What are you looking for?" },
];

const SOURCE_OPTIONS = [
  { value: "website",   label: "Website" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "email",     label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "referral",  label: "Referral" },
  { value: "walk_in",   label: "Walk-in" },
];

export default function EnquiryPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<EnquiryFormData>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { source: "website" },
  });

  const watchedCity = watch("city");

  const nextStep = async () => {
    let fields: (keyof EnquiryFormData)[] = [];
    if (step === 0) fields = ["name", "email", "phone", "source"];
    if (step === 1) fields = ["event_type", "event_date", "location", "city"];

    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: EnquiryFormData) => {
    setLoading(true);
    try {
      const supabase = createClient();

      let clientId: string | null = null;
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        clientId = session.session.user.id;
      } else {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", data.email)
          .single();

        if (existingUser) {
          clientId = existingUser.id;
        } else {
          const { data: newUser, error } = await supabase
            .from("users")
            .insert({
              name: data.name,
              email: data.email,
              phone: data.phone,
              role: "client",
              is_active: true,
            })
            .select("id")
            .single();

          if (!error && newUser) clientId = newUser.id;
        }
      }

      await supabase.from("enquiries").insert({
        client_id: clientId,
        event_type: data.event_type,
        event_date: data.event_date,
        location: data.location,
        city: data.city,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        artist_preference: data.artist_preference,
        other_requirements: data.other_requirements,
        status: "new",
        source: data.source,
      });

      setSubmitted(true);
    } catch (error) {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="font-display text-2xl font-bold text-navy-900">Enquiry Received!</h2>
          <p className="text-muted-foreground mt-3">
            Our expert coordinator will reach out to you within{" "}
            <strong className="text-navy-900">2 hours</strong> on your provided phone number and email.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-gold-50 border border-gold-200 text-sm text-gold-800">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 space-y-1 text-left list-disc list-inside">
              <li>Coordinator reviews your requirements</li>
              <li>Artists shortlisted for your event</li>
              <li>Proposal with options sent to you</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/login">
              <Button className="w-full">Track Your Enquiry</Button>
            </Link>
            <a href="https://wa.me/919999999999">
              <Button variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp Us
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-900" />
            </div>
            <span className="font-display font-bold text-white">BookMyEventStar</span>
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white">
            Tell us about your event
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Free enquiry — our coordinator responds within 2 hours
          </p>
        </div>

        {/* Progress */}
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

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-display font-semibold text-navy-900">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6">
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
                        <Label>Your Full Name *</Label>
                        <Input
                          placeholder="Rahul Sharma"
                          icon={<User className="w-4 h-4" />}
                          error={errors.name?.message}
                          {...register("name")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Mobile Number *</Label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap">
                            +91
                          </div>
                          <Input
                            type="tel"
                            placeholder="9999999999"
                            error={errors.phone?.message}
                            {...register("phone")}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        icon={<Mail className="w-4 h-4" />}
                        error={errors.email?.message}
                        {...register("email")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>How did you hear about us?</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {SOURCE_OPTIONS.map((opt) => {
                          const selected = watch("source") === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setValue("source", opt.value as EnquiryFormData["source"])}
                              className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
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
                        <Label>Event Type *</Label>
                        <Select onValueChange={(val) => setValue("event_type", val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.event_type && (
                          <p className="text-xs text-destructive">{errors.event_type.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Event Date *</Label>
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
                        <Label>Venue / Location *</Label>
                        <Input
                          placeholder="e.g. The Leela Palace"
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
                        <Label>Minimum Budget (₹) *</Label>
                        <Input
                          type="number"
                          placeholder="50000"
                          icon={<DollarSign className="w-4 h-4" />}
                          error={errors.budget_min?.message}
                          {...register("budget_min")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Maximum Budget (₹)</Label>
                        <Input
                          type="number"
                          placeholder="200000"
                          icon={<DollarSign className="w-4 h-4" />}
                          {...register("budget_max")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Artist Type Preference</Label>
                      <Select onValueChange={(val) => setValue("artist_preference", val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select artist category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTIST_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Additional Requirements</Label>
                      <Textarea
                        placeholder="E.g. Specific songs, stage setup requirements, dietary restrictions, language preference..."
                        rows={4}
                        {...register("other_requirements")}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-6 pb-6 flex items-center justify-between">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Link href="/">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              )}

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next Step
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit Enquiry
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
