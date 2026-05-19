"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <BrandLogo size="lg" href="/" />

      <div className="mt-10 mb-6">
        <p className="text-8xl font-display font-bold text-muted-foreground/20 select-none">404</p>
        <h1 className="font-display text-2xl font-bold mt-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </Link>
        <Button variant="outline" onClick={() => history.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
