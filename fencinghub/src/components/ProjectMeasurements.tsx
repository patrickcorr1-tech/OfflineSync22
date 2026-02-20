"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { enqueueOutbox } from "@/lib/outbox";
import { getCachedMeasurements, setCachedMeasurements } from "@/lib/offlineCache";

const MAPS_URL = (key: string) =>
  `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry`;

type Point = { lat: number; lng: number };

type Mode = "distance" | "gate";

export default function ProjectMeasurements({ projectId }: { projectId: string }) {
  const supabase = createSupabaseBrowserClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const polyline = useRef<any>(null);
  const markers = useRef<any[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [mode, setMode] = useState<Mode>("distance");
  const [points, setPoints] = useState<Point[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [comment, setComment] = useState("");

  const load = async () => {
    try {
      const { data } = await supabase
        .from("measurements")
        .select("id,data,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setCachedMeasurements(projectId, data || []);
    } catch {
      const cached = getCachedMeasurements<any[]>(projectId);
      if (cached?.value) setItems(cached.value);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key || !mapRef.current) return;

    const existing = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js"]`,
    );
    if (!existing) {
      const s = document.createElement("script");
      s.src = MAPS_URL(key);
      s.async = true;
      s.onload = initMap;
      document.body.appendChild(s);
    } else if ((window as any).google?.maps) {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapObj.current) return;
      const g = (window as any).google;
      mapObj.current = new g.maps.Map(mapRef.current, {
        center: { lat: 51.5074, lng: -0.1278 },
        zoom: 13,
        mapId: "fencinghub-map",
        disableDefaultUI: true,
        zoomControl: true,
      });

      mapObj.current.addListener("click", (e: any) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat == null || lng == null) return;
        addPoint({ lat, lng });
      });
    }
  }, []);

  const addPoint = (p: Point) => {
    const updated = [...points, p];
    setPoints(updated);

    if (mapObj.current) {
      const g = (window as any).google;
      const marker = new g.maps.Marker({ position: p, map: mapObj.current });
      markers.current.push(marker);

      if (!polyline.current) {
        polyline.current = new g.maps.Polyline({
          map: mapObj.current,
          strokeColor: "#7dd3fc",
          strokeOpacity: 0.9,
          strokeWeight: 3,
        });
      }

      if (mode === "distance") {
        polyline.current.setPath(updated);
        if (g?.maps?.geometry) {
          const meters = g.maps.geometry.spherical.computeLength(
            updated.map((x: Point) => new g.maps.LatLng(x.lat, x.lng)),
          );
          setDistanceMeters(meters);
        }
      }
    }
  };

  const clearPoints = () => {
    setPoints([]);
    setDistanceMeters(0);
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];
    if (polyline.current) polyline.current.setPath([]);
  };

  const saveMeasurement = async () => {
    const payload =
      mode === "distance"
        ? { type: "distance", points, distance_m: Math.round(distanceMeters), comment }
        : { type: "gate", points, comment };

    if (!navigator.onLine) {
      await enqueueOutbox("measurement", { project_id: projectId, data: payload });
      clearPoints();
      setComment("");
      setItems((prev) => [{ id: `queued-${Date.now()}`, data: payload }, ...prev]);
      return;
    }

    await supabase.from("measurements").insert({ project_id: projectId, data: payload });

    await fetch("/api/notify/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: "New measurements submitted",
        body: "Customer submitted measurements for this project.",
      }),
    });

    clearPoints();
    setComment("");
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 panel p-4">
        <div className="flex items-center justify-between">
          <div className="section-title">Map</div>
          <div className="flex gap-2">
            <button
              className={mode === "distance" ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setMode("distance");
                clearPoints();
              }}
            >
              Distance
            </button>
            <button
              className={mode === "gate" ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setMode("gate");
                clearPoints();
              }}
            >
              Gate points
            </button>
          </div>
        </div>
        <div ref={mapRef} className="mt-3 h-[420px] w-full rounded-xl border border-white/10" />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
          <span>{points.length} points</span>
          {mode === "distance" && <span>{(distanceMeters / 1000).toFixed(2)} km</span>}
          <button className="rounded-lg border border-white/20 px-3 py-1" onClick={clearPoints}>
            Clear
          </button>
        </div>
      </div>

      <div className="panel p-5">
        <div className="section-title">Save measurement</div>
        <textarea
          className="mt-3 w-full rounded-xl bg-white/10 p-3 text-xs"
          rows={4}
          placeholder="Notes (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="mt-3 btn-primary w-full" onClick={saveMeasurement}>
          Save
        </button>

        <div className="mt-6 section-title">History</div>
        <div className="mt-3 space-y-2 text-xs text-white/60">
          {items.map((m) => (
            <div key={m.id} className="rounded-xl border border-white/10 p-3 bg-black/30">
              <div className="flex justify-between">
                <span>{m.data?.type || "measurement"}</span>
                {m.data?.distance_m && <span>{(m.data.distance_m / 1000).toFixed(2)} km</span>}
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-[11px] text-white/50">
                {JSON.stringify(m.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
