"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      if (authData.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        const role = profile?.role ?? "client";
        toast.success(`Welcome back! Redirecting to your dashboard...`);
        router.push(`/${role}`);
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      toast.error(message);
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
          <div className="w-20 h-20 rounded-2xl gold-gradient mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-gold-500/30 animate-glow">
            <Sparkles className="w-10 h-10 text-navy-900" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-2">BookMy</h1>
          <h1 className="font-display text-4xl font-bold text-gradient-gold mb-6">EventStar</h1>
          <p className="text-white/70 text-lg max-w-sm">
            India&apos;s premier artist management and event booking platform
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              ["2,400+", "Events Managed"],
              ["850+", "Artists Listed"],
              ["1,200+", "Happy Clients"],
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
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-900" />
            </div>
            <span className="font-display font-bold">
              <span className="text-navy-900">BookMy</span>
              <span className="text-gradient-gold">EventStar</span>
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold text-navy-900">Welcome back</h2>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  icon={<Lock className="w-4 h-4" />}
                  error={errors.password?.message}
                  className="pr-11"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-gold-600 hover:text-gold-700">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-gold-600 hover:text-gold-700 font-medium">
              Register here
            </Link>
          </p>

          <div className="mt-8 p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">Test Accounts:</p>
            <p><span className="font-medium">Admin:</span> <span className="font-mono">admin@bmes.com</span> / <span className="font-mono">Admin@123</span></p>
            <p><span className="font-medium">Coordinator:</span> <span className="font-mono">coordinator@bmes.com</span> / <span className="font-mono">Coord@123</span></p>
            <p><span className="font-medium">Client:</span> <span className="font-mono">client@bmes.com</span> / <span className="font-mono">Client@123</span></p>
            <p><span className="font-medium">Artist:</span> <span className="font-mono">artist@bmes.com</span> / <span className="font-mono">Artist@123</span></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
