"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, KeyRound, CalendarCheck, Mic2, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { signInWithEmail } from "@/lib/firebase/auth-client";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

const CREDENTIAL_ERROR_CODES = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
]);

// Only ever redirect back to a same-origin app path — never let a
// `redirect` param carry a protocol-relative or absolute URL off-site.
function safeRedirectTarget(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get("phone") ?? "";
  const redirectTo = safeRedirectTarget(searchParams.get("redirect"));

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    googleBusy, googleUser, pendingRole, setPendingRole,
    phoneDigits: googlePhone, setPhoneDigits: setGooglePhone,
    category: googleCategory, setCategory: setGoogleCategory,
    finishing: googleFinishing, startGoogleSignIn, finishGoogleSignup, cancelGoogleSignup,
  } = useGoogleSignIn(undefined, redirectTo);
  const { categories } = useCategories();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: prefillPhone },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const raw = data.identifier.trim();
      // Dynamic identifier — detect email vs. Indian mobile number automatically
      const isEmail = raw.includes("@");
      const email = isEmail
        ? raw.toLowerCase()
        : `${raw.replace(/\D/g, "").slice(-10)}@phone.bmes.app`;

      const cred = await signInWithEmail(email, data.password);
      const { claims } = await cred.user.getIdTokenResult();
      const role = (claims.role as string) ?? "client";

      toast.success("Welcome back!");
      router.push(redirectTo ?? `/${role}`);
      router.refresh();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code && CREDENTIAL_ERROR_CODES.has(code)) {
        toast.error(data.identifier.includes("@") ? "Incorrect email or password" : "Incorrect phone number or password");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 navy-gradient relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center"
        >
          <div className="flex justify-center mb-8">
            <BrandLogo href="/" size="xl" priority />
          </div>
          <p className="text-white/70 text-lg max-w-sm">
            India&apos;s premier artist management and event booking platform
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              ["Verified", "Every Artist"],
              ["2 Hours", "Coordinator Response"],
              ["Pan-India", "Coverage"],
              ["₹0", "Upfront Fee"],
            ].map(([val, label]) => (
              <div key={label} className="glass rounded-xl p-4">
                <p className="font-display text-2xl font-bold text-white">{val}</p>
                <p className="text-white/60 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo href="/" size="xl" priority />
          </div>

          <h2 className="font-display text-3xl font-bold text-navy-900">Welcome back</h2>
          <p className="text-muted-foreground mt-2">Sign in with your email or mobile number</p>

          {googleUser ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-sm">
                <p className="font-medium text-emerald-800">Signed in with Google</p>
                <p className="text-emerald-700 text-xs mt-0.5">{googleUser.name || googleUser.email}</p>
                <p className="text-emerald-700 text-xs mt-1">We couldn&apos;t find an account for this yet — let&apos;s finish setting one up.</p>
              </div>

              <div className="space-y-2">
                <Label>What brings you here?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "client" as const, label: "I want to book artists", icon: CalendarCheck, color: "text-gold-600 bg-gold-50" },
                    { value: "artist" as const, label: "I am an artist", icon: Mic2, color: "text-navy-700 bg-navy-50" },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <label
                        key={opt.value}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          pendingRole === opt.value ? "border-gold-500 bg-gold-50" : "border-border hover:border-gold-300"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          checked={pendingRole === opt.value}
                          onChange={() => setPendingRole(opt.value)}
                        />
                        <div className={`w-9 h-9 rounded-xl ${opt.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {pendingRole === "artist" && (
                <div className="space-y-2">
                  <Label>What kind of artist are you?</Label>
                  <Select value={googleCategory} onValueChange={setGoogleCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category — Dancer, DJ, Magician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
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
              <button type="button" onClick={cancelGoogleSignup} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                Use a different sign-in method
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <Button type="button" variant="outline" className="w-full gap-2" onClick={startGoogleSignIn} loading={googleBusy}>
              <GoogleIcon className="w-4 h-4" />
              Continue with Google
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Label>Email or mobile number</Label>
              <Input
                type="text"
                placeholder="you@example.com or 9876543210"
                icon={<Mail className="w-4 h-4" />}
                error={errors.identifier?.message}
                autoComplete="username"
                {...register("identifier")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <Link href="/forgot-password" className="text-sm text-gold-600 hover:text-gold-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  className="pr-11"
                  autoComplete="current-password"
                  {...register("password")}
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <KeyRound className="w-4 h-4 mr-2" />
              Sign In
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-gold-600 hover:text-gold-700 font-medium">
                Register
              </Link>{" "}
              or{" "}
              <Link href="/enquiry" className="text-gold-600 hover:text-gold-700 font-medium">
                submit an enquiry
              </Link>
            </p>
          </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
