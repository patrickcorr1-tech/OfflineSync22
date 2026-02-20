"use client";

import { useEffect, useRef, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useProfile } from "@/lib/useProfile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export default function CobrowseAdminPage() {
  const { profile } = useProfile();
  const supabase = createSupabaseBrowserClient();
  const [code, setCode] = useState("");
  const [session, setSession] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowControl, setAllowControl] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isStaff = ["admin", "sales", "contractor"].includes(profile?.role || "");

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!session?.expires_at) return;
    const update = () => {
      const remaining = new Date(session.expires_at).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00");
        endSession();
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session?.expires_at]);

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setStream(null);
    setCursor({ x: 0, y: 0, visible: false });
  };

  const endSession = async () => {
    if (!session) return cleanup();
    await fetch("/api/cobrowse/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    cleanup();
    setSession(null);
  };

  const joinSession = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/cobrowse/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invalid code");
      setSession(data.session);
      setAllowControl(!!data.session?.allow_control);
      setupConnection(data.session.id);
    } catch (err: any) {
      setError(err.message || "Unable to join session");
    } finally {
      setJoining(false);
    }
  };

  const setupConnection = (sessionId: string) => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setStream(remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "ice", candidate: event.candidate },
        });
      }
    };

    const channel = supabase.channel(`cobrowse:${sessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        if (!pcRef.current) return;
        if (payload?.type === "offer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { type: "answer", sdp: pcRef.current.localDescription },
          });
        }
        if (payload?.type === "ice" && payload.candidate) {
          await pcRef.current.addIceCandidate(payload.candidate);
        }
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (typeof payload?.x !== "number" || typeof payload?.y !== "number") return;
        setCursor({ x: payload.x, y: payload.y, visible: true });
      })
      .on("broadcast", { event: "control" }, ({ payload }) => {
        setAllowControl(!!payload?.allowControl);
      })
      .on("broadcast", { event: "end" }, () => {
        endSession();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "ready", payload: {} });
        }
      });

    channelRef.current = channel;
  };

  return (
    <DashboardShell title="Co-browse" subtitle="Join a customer session">
      {!isStaff && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You don&apos;t have access to join co-browse sessions.
        </div>
      )}

      {isStaff && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="section-title">Join session</div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="rounded-xl bg-[#f1f5f9] px-4 py-3 text-sm"
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="btn-primary" type="button" onClick={joinSession}>
                {joining ? "Joining..." : "Join"}
              </button>
              {session && (
                <button className="btn-ghost" type="button" onClick={endSession}>
                  End session
                </button>
              )}
            </div>
            {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
          </div>

          {session && (
            <div className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="section-title">Live view</div>
                  <div className="mt-1 text-xs text-[var(--slate-500)]">
                    Session code {session.code} · {timeLeft || "15:00"} remaining
                  </div>
                </div>
                <div className="text-xs text-[var(--slate-500)]">
                  Control: {allowControl ? "Enabled" : "View-only"}
                </div>
              </div>
              <div className="relative mt-4 h-[520px] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                {stream ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain"
                    />
                    {cursor.visible && (
                      <div
                        className="pointer-events-none absolute h-3 w-3 rounded-full bg-blue-500"
                        style={{
                          left: `calc(${cursor.x * 100}% - 6px)`,
                          top: `calc(${cursor.y * 100}% - 6px)`,
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-white/60">
                    Waiting for host...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
