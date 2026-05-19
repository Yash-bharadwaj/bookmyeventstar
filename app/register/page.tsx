"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, Phone, Eye, EyeOff, CalendarCheck, Mic2, Globe, Info, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, RegisterFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "client" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name, phone: data.phone, role: data.role },
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          name: data.name,
          email: data.email,
          phone: "+91" + data.phone,
          role: data.role,
          is_active: true,
        });

        if (profileError) throw profileError;

        if (data.role === "artist") {
          await supabase.from("artist_profiles").insert({
            user_id: authData.user.id,
            bio: "",
            categories: [],
            cities: [],
            base_price: 0,
            pricing_details: {},
            rating: 0,
            total_bookings: 0,
            is_verified: false,
            is_listed: false,
            is_profile_complete: false,
            social_links: {},
          });
        }

        toast.success(
          data.role === "artist"
            ? "Account created! Complete your profile to get listed."
            : "Account created! Welcome to BookMyEventStar."
        );
        router.push(`/${data.role}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6 flex justify-start">
            <BrandLogo href="/" size="md" />
          </div>

          <h2 className="font-display text-2xl font-bold text-navy-900">Create your account</h2>
          <p className="text-muted-foreground text-sm mt-1">Join thousands using BookMyEventStar</p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { value: "client", label: "I want to book artists", icon: CalendarCheck, color: "text-violet-600 bg-violet-50" },
              { value: "artist", label: "I am an artist",         icon: Mic2,           color: "text-rose-600 bg-rose-50" },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedRole === opt.value
                      ? "border-gold-500 bg-gold-50"
                      : "border-border hover:border-gold-300"
                  }`}
                >
                  <input type="radio" value={opt.value} className="sr-only" {...register("role")} />
                  <div className={`w-10 h-10 rounded-xl ${opt.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{opt.label}</span>
                </label>
              );
            })}
          </div>

          {/* Artist context panel */}
          {selectedRole === "artist" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-2"
            >
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />What happens after you register?
              </p>
              <ul className="space-y-1.5">
                {[
                  "Complete your artist profile — bio, categories, cities, portfolio photos",
                  "Your profile is reviewed and verified by our team",
                  "Once verified, you appear in client and coordinator searches",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-amber-800">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                    {step}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                icon={<User className="w-4 h-4" />}
                error={errors.name?.message}
                {...register("name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register("email")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 rounded-xl border bg-muted text-sm text-muted-foreground font-medium gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  +91
                </div>
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  icon={<Phone className="w-4 h-4" />}
                  error={errors.phone?.message}
                  {...register("phone")}
                />
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Re-enter password"
                icon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-gold-600 font-medium hover:text-gold-700">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
