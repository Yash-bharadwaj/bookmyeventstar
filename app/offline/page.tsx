import { WifiOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gold-500/30">
          <WifiOff className="w-10 h-10 text-navy-900" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">You&apos;re Offline</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          It looks like you&apos;ve lost your internet connection. Some features may not be available,
          but your cached data is still accessible.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
        <p className="text-white/30 text-xs mt-4">BookMyEventStar — India&apos;s Premier Artist Booking Platform</p>
      </div>
    </div>
  );
}
