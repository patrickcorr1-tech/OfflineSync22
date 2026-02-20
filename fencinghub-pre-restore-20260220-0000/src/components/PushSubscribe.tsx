"use client";

import { useState } from "react";
import { requestPushPermission, subscribeToPush } from "@/lib/push";

export default function PushSubscribe() {
  const [status, setStatus] = useState<string>("");

  const subscribe = async () => {
    const ok = await requestPushPermission();
    if (!ok) return setStatus("Permission denied");
    const subscription = await subscribeToPush();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });
    setStatus("Subscribed");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <button className="rounded-lg bg-white text-black px-3 py-1" onClick={subscribe}>
        Enable Push Notifications
      </button>
      {status && <p className="text-xs text-white/60 mt-2">{status}</p>}
    </div>
  );
}
