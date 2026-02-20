"use client";

import { useProfile } from "@/lib/useProfile";

export default function PushInstallBanner() {
  const { profile } = useProfile();
  if (!profile || profile.role !== "customer") return null;

  return (
    <div className="panel p-5 mb-6">
      <div className="section-title">Enable notifications</div>
      <h3 className="mt-2 text-xl font-semibold">Get quote alerts on your phone & desktop</h3>
      <p className="text-white/60 mt-2">
        Turn on notifications so you get instant alerts when a quote is sent or approved.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
        <div className="rounded-xl border border-white/10 p-3 bg-black/30">
          <div className="font-semibold">📱 iPhone / iPad</div>
          <ol className="mt-2 space-y-1 text-white/70 list-decimal list-inside">
            <li>Tap Share → Add to Home Screen</li>
            <li>Open the installed app</li>
            <li>Tap “Enable Push Notifications”</li>
          </ol>
        </div>
        <div className="rounded-xl border border-white/10 p-3 bg-black/30">
          <div className="font-semibold">🤖 Android</div>
          <ol className="mt-2 space-y-1 text-white/70 list-decimal list-inside">
            <li>Open in Chrome</li>
            <li>Tap “Install app”</li>
            <li>Enable notifications</li>
          </ol>
        </div>
        <div className="rounded-xl border border-white/10 p-3 bg-black/30">
          <div className="font-semibold">💻 Desktop</div>
          <ol className="mt-2 space-y-1 text-white/70 list-decimal list-inside">
            <li>Click “Enable Push Notifications”</li>
            <li>Allow in your browser prompt</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
