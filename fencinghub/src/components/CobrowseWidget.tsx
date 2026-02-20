"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useProfile } from "@/lib/useProfile";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

type CobrowseSession = {
  id: string;
  code: string;
  expires_at: string;
  allow_control?: boolean;
  status?: string;
};

export default function CobrowseWidget({
  projectId,
  quoteId,
  label = "Request help",
}: {
  projectId?: string;
  quoteId?: string;
  label?: string;
}) {
  const { profile } = useProfile();
  const supabase = createSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<CobrowseSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [allowControl, setAllowControl] = useState(false);
  const [consent, setConsent] = useState(false);
  const [bugReport, setBugReport] = useState(false);
  const [bugNotes, setBugNotes] = useState("");
  const [recordConsent, setRecordConsent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cursorThrottle = useRef(false);
  const maskedElementsRef = useRef<Element[]>([]);

  const isCustomer = profile?.role === "customer";

  useEffect(() => {
    if (!open || session || creating) return;
    if (!isCustomer) return;
    const createSession = async () => {
      setCreating(true);
      setError(null);
      try {
        const res = await fetch("/api/cobrowse/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, quoteId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to start session");
        setSession(data.session);
      } catch (err: any) {
        setError(err.message || "Unable to start session");
      } finally {
        setCreating(false);
      }
    };
    createSession();
  }, [open, session, creating, projectId, quoteId, isCustomer]);

  useEffect(() => {
    if (!session?.expires_at) return;
    const update = () => {
      const remaining = new Date(session.expires_at).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00");
        endSession("Session closed after 15 minutes.");
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session?.expires_at, sharing]);

  useEffect(() => {
    if (!sharing) return;
    const handleMouse = (event: MouseEvent) => {
      if (!channelRef.current || cursorThrottle.current) return;
      cursorThrottle.current = true;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      requestAnimationFrame(() => {
        channelRef.current?.send({
          type: "broadcast",
          event: "cursor",
          payload: { x, y },
        });
        cursorThrottle.current = false;
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [sharing]);

  const sendOffer = async () => {
    if (!pcRef.current || !channelRef.current) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    await channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload: { type: "offer", sdp: pcRef.current.localDescription },
    });
  };

  const applyMasking = () => {
    const elements = Array.from(
      document.querySelectorAll(
        'input[type="password"], input[type="email"], input[type="tel"], input[name*="email" i], input[name*="phone" i], input[name*="address" i], input[data-sensitive], textarea[data-sensitive]',
      ),
    );
    maskedElementsRef.current = [];
    elements.forEach((el) => {
      if (!el.hasAttribute("data-cobrowse-mask")) {
        el.setAttribute("data-cobrowse-mask", "true");
        maskedElementsRef.current.push(el);
      }
    });
    document.body.classList.add("cobrowse-masking");
  };

  const clearMasking = () => {
    maskedElementsRef.current.forEach((el) => el.removeAttribute("data-cobrowse-mask"));
    maskedElementsRef.current = [];
    document.body.classList.remove("cobrowse-masking");
  };

  const setupConnection = async () => {
    if (!session) return;
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "ice", candidate: event.candidate },
        });
      }
    };

    const channel = supabase.channel(`cobrowse:${session.id}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        if (!pcRef.current) return;
        if (payload?.type === "answer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
        }
        if (payload?.type === "ice" && payload.candidate) {
          await pcRef.current.addIceCandidate(payload.candidate);
        }
      })
      .on("broadcast", { event: "ready" }, () => {
        sendOffer();
      })
      .on("broadcast", { event: "end" }, () => {
        stopSharing();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          sendOffer();
        }
      });

    channelRef.current = channel;
  };

  const startSharing = async () => {
    if (!session || sharing) return;
    if (!consent) return;
    if (!navigator.onLine) {
      setError("You appear to be offline. Please reconnect and try again.");
      return;
    }
    const connection = (navigator as any).connection?.effectiveType;
    if (connection && ["slow-2g", "2g"].includes(connection)) {
      setError("Connection is too weak for screen sharing. Please try again on a stronger signal.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/cobrowse/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          allowControl,
          bugReport,
          bugNotes: bugReport ? bugNotes : null,
          recordingConsent: bugReport ? recordConsent : false,
        }),
      });
      if (!res.ok) throw new Error("Unable to record consent");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false,
      });

      streamRef.current = stream;
      stream.getTracks().forEach((track) => {
        track.onended = () => stopSharing();
      });

      applyMasking();

      await setupConnection();
      setSharing(true);
    } catch (err: any) {
      setError(err.message || "Unable to start sharing");
    }
  };

  const endSession = async (message?: string) => {
    if (!session) return;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "end", payload: {} });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    clearMasking();
    setSharing(false);
    await fetch("/api/cobrowse/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    if (message) setNotice(message);
  };

  const stopSharing = async () => {
    await endSession("Session ended. You can request help again anytime.");
  };

  if (!isCustomer) return null;

  return (
    <div className="mb-4">
      <button className="btn-ghost" type="button" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Live co-browse</div>
            <h3 className="mt-3 text-lg font-semibold">Share your screen with support</h3>
            <p className="mt-2 text-sm text-slate-500">
              You&apos;ll share this tab for up to 15 minutes. Your support teammate can view only
              unless you enable control.
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="font-semibold">GDPR consent (FencingHub by StowAg)</div>
              <p className="mt-1">
                By starting a session you consent to share your screen with support for this session
                only. We do not access other tabs or apps. You can end the session anytime.
              </p>
              <p className="mt-1">
                Questions or data requests:{" "}
                <span className="font-medium">patrickcorr4@gmail.com</span>
              </p>
            </div>

            {session && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Session code
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[0.4em]">{session.code}</div>
                <div className="mt-2 text-xs text-slate-500">Expires in {timeLeft || "15:00"}</div>
                <button
                  className="btn-ghost mt-3"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(session.code)}
                >
                  Copy code
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I consent to share my screen for this session.
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowControl}
                  onChange={(e) => setAllowControl(e.target.checked)}
                />
                Allow control (optional)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bugReport}
                  onChange={(e) => {
                    setBugReport(e.target.checked);
                    if (!e.target.checked) setRecordConsent(false);
                  }}
                />
                I&apos;m reporting a bug
              </label>
              {bugReport && (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-xl bg-[#f1f5f9] px-3 py-2 text-xs"
                    rows={3}
                    placeholder="Briefly describe the bug (optional)"
                    value={bugNotes}
                    onChange={(e) => setBugNotes(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={recordConsent}
                      onChange={(e) => setRecordConsent(e.target.checked)}
                    />
                    I consent to screen recording for this session (to help diagnose the bug)
                  </label>
                </div>
              )}
            </div>

            {notice && <div className="mt-3 text-sm text-emerald-600">{notice}</div>}
            {error && <div className="mt-3 text-sm text-red-500">{error}</div>}

            <div className="mt-6 flex flex-wrap gap-2">
              {!sharing ? (
                <button
                  className={`btn-primary ${!consent || creating ? "opacity-50 pointer-events-none" : ""}`}
                  type="button"
                  onClick={startSharing}
                >
                  {creating ? "Preparing..." : "Start sharing"}
                </button>
              ) : (
                <button className="btn-primary" type="button" onClick={stopSharing}>
                  End session
                </button>
              )}
              <button className="btn-ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
