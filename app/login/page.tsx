"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, phoneLoginSchema, LoginFormData, PhoneLoginFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get("phone") ?? "";

  const [tab, setTab] = useState<"email" | "phone">(prefillPhone ? "phone" : "email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const phoneForm = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: prefillPhone },
  });

  const redirectToDashboard = async (userId: string) => {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    const role = profile?.role ?? "client";
    toast.success("Welcome back!");
    router.push(`/${role}`);
    router.refresh();
  };

  const onEmailSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      await redirectToDashboard(authData.user.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneLoginFormData) => {
    setLoading(true);
    try {
      const digits = data.phone.replace(/\D/g, "");
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: `${digits}@phone.bmes.app`,
        password: data.password,
      });
      if (error) throw new Error("Incorrect phone number or password");
      await redirectToDashboard(authData.user.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
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
              ["2,400+", "Events Managed"],
              ["850+", "Artists Listed"],
              ["1,200+", "Happy Customers"],
              ["50+", "Cities Covered"],
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
          <p className="text-muted-foreground mt-2">Sign in to your account</p>

          {/* Tab switcher */}
          <div className="mt-6 flex rounded-xl border bg-muted/40 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "phone" ? "bg-white shadow text-navy-900" : "text-muted-foreground hover:text-navy-900"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Book an Event
            </button>
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "email" ? "bg-white shadow text-navy-900" : "text-muted-foreground hover:text-navy-900"
              }`}
            >
              <Mail className="w-4 h-4" />
              Staff / Artist
            </button>
          </div>

          {/* Phone login */}
          {tab === "phone" && (
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label>Mobile number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap">
                    +91
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    error={phoneForm.formState.errors.phone?.message}
                    {...phoneForm.register("phone")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    icon={<Lock className="w-4 h-4" />}
                    error={phoneForm.formState.errors.password?.message}
                    className="pr-11"
                    {...phoneForm.register("password")}
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
                Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No account yet?{" "}
                <Link href="/enquiry" className="text-gold-600 hover:text-gold-700 font-medium">
                  Submit an enquiry
                </Link>{" "}
                to create one.
              </p>
            </form>
          )}

          {/* Email login */}
          {tab === "email" && (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  error={emailForm.formState.errors.email?.message}
                  {...emailForm.register("email")}
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    icon={<Lock className="w-4 h-4" />}
                    error={emailForm.formState.errors.password?.message}
                    className="pr-11"
                    {...emailForm.register("password")}
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

              <div className="flex justify-end text-sm">
                <Link href="/forgot-password" className="text-gold-600 hover:text-gold-700">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign In
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-gold-600 hover:text-gold-700 font-medium">
                  Register here
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
