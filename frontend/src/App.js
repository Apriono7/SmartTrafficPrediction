import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
} from "recharts";

import axios from "axios";
import { Link } from "react-router-dom";
import { Route, AlertTriangle } from "lucide-react";

const API = "http://103.127.134.25:5000";

/* =============== Helper 1 Jam Predik ================= */
const predictionStyle = (status) => {
  switch (status) {
    case "POTENTIAL_JAM":
      return {
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
        icon: "🔴"
      };
    case "UNSTABLE":
      return {
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/30",
        icon: "🟡"
      };
    default:
      return {
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/30",
        icon: "🟢"
      };
  }
};


const findNearestCCTV = (point, cctvList) => {
  if (!point || !cctvList.length) return null;

  let nearest = null;
  let minDist = Infinity;

  cctvList.forEach(c => {
    const d =
      Math.pow(point.lat - c.lat, 2) +
      Math.pow(point.lng - c.lng, 2);

    if (d < minDist) {
      minDist = d;
      nearest = c;
    }
  });

  return nearest;
};


/* ================= FIX LEAFLET ICON ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

/* ================= CCTV ICON ================= */
const pulseIcon = (status) =>
  L.divIcon({
    className: "pulse-marker",
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <span style="
          position:absolute; inset:0; border-radius:50%;
          background:${status === "MERAH"
            ? "rgba(239,68,68,.35)"
            : "rgba(34,197,94,.35)"};
          animation:pulse 1.8s infinite;
        "></span>
        <span style="
          position:absolute; top:4px;left:4px;
          width:20px;height:20px;border-radius:50%;
          background:${status === "MERAH" ? "#ef4444" : "#22c55e"};
          border:2px solid white;
        "></span>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity:.9 }
          70% { transform: scale(2); opacity:0 }
          100% { opacity:0 }
        }
      </style>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  /* ================= ROUTE ICON ================= */
const startIcon = L.divIcon({
  html: `
    <div style="
      width:20px;height:20px;
      background:#22c55e;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 12px rgba(34,197,94,.9);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const endIcon = L.divIcon({
  html: `
    <div style="
      width:20px;height:20px;
      background:#ef4444;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 12px rgba(239,68,68,.9);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});


/* ================= MAP CLICK ================= */
function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

/* ================= MAIN APP ================= */
export default function App() {
  const [cctv, setCctv] = useState([]);
  const [selected, setSelected] = useState(null);

  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  const [routeLine, setRouteLine] = useState([]);
  const [eta, setEta] = useState(null);

  const [history, setHistory] = useState([]);
  const [nowVsUsual, setNowVsUsual] = useState(null);
  const [nextHourPrediction, setNextHourPrediction] = useState(null);

  /* ================= LOAD CCTV ================= */
  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`${API}/api/cctv_status`);
      setCctv(res.data);
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  /* ================= MAP CLICK (ROUTING) ================= */
  const handleMapPick = (latlng) => {
    setSelected(null);

    if (!startPoint) setStartPoint(latlng);
    else if (!endPoint) setEndPoint(latlng);
    else {
      setStartPoint(latlng);
      setEndPoint(null);
      setRouteLine([]);
      setEta(null);
    }
  };

  /* ================= TOMTOM ROUTING ================= */
  useEffect(() => {
    if (!startPoint || !endPoint) return;

    const fetchRoute = async () => {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${startPoint.lat},${startPoint.lng}:${endPoint.lat},${endPoint.lng}/json?traffic=true&key=${process.env.REACT_APP_TOMTOM_KEY}`;
      const res = await axios.get(url);
      const r = res.data.routes[0];

      setEta({
        time: Math.round(r.summary.travelTimeInSeconds / 60),
        distance: (r.summary.lengthInMeters / 1000).toFixed(1),
      });

      setRouteLine(r.legs[0].points.map(p => [p.latitude, p.longitude]));
    };

    fetchRoute();
  }, [startPoint, endPoint]);


  /* ================= 1 JAM PREDIKISI ================= */
  useEffect(() => {
    if (!startPoint || !endPoint || !cctv.length) {
      setNextHourPrediction(null);
      return;
    }
  
    const nearest = findNearestCCTV(startPoint, cctv);
    if (!nearest) return;
  
    axios
      .get(`${API}/api/predict-next-hour/${nearest.id}`)
      .then(res => setNextHourPrediction(res.data))
      .catch(() => setNextHourPrediction(null));
  
  }, [startPoint, endPoint, cctv]);
  /* ================= CCTV DETAIL ================= */
  useEffect(() => {
    if (!selected) return;

    axios
      .get(`${API}/api/traffic-history/${selected.id}?range=1h`)
      .then(res => {
        const d = res.data.map((v, i, arr) => ({
          ...v,
          volatility: i === 0 ? 0 : v.avg_vehicle - arr[i - 1].avg_vehicle,
        }));
        setHistory(d);
      });

    axios
      .get(`${API}/api/now-vs-usual/${selected.id}`)
      .then(res => setNowVsUsual(res.data));
  }, [selected]);

  const isRoutingActive = startPoint && endPoint;

  /* ================= CCTV DECISION ================= */
  let decisionLabel = "Lancar / Normal";
  let decisionColor = "text-emerald-400";
  let decisionNote = "Aktivitas lalu lintas dalam pola normal.";

  if (nowVsUsual?.status === "UNUSUAL") {
    decisionLabel = "Waspada";
    decisionColor = "text-yellow-400";
    decisionNote = "Aktivitas lalu lintas di atas pola normal.";
  }

  /* ================= ROUTE DECISION ================= */
  let routeDecisionLabel = "Direkomendasikan";
  let routeDecisionColor = "text-emerald-400";
  let routeDecisionBg = "bg-emerald-500/10 border-emerald-500/30";
  let routeDecisionNote = "Rute relatif lancar dan stabil.";

  if (eta) {
    if (eta.time > 20) {
      routeDecisionLabel = "Tidak Disarankan";
      routeDecisionColor = "text-red-400";
      routeDecisionBg = "bg-red-500/10 border-red-500/30";
      routeDecisionNote = "Waktu tempuh tinggi, kemacetan signifikan.";
    } else if (eta.time > 12) {
      routeDecisionLabel = "Perlu Pertimbangan";
      routeDecisionColor = "text-yellow-400";
      routeDecisionBg = "bg-yellow-500/10 border-yellow-500/30";
      routeDecisionNote = "Terdapat kepadatan di beberapa segmen jalan.";
    }
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* ================= MAP ================= */}
      <div className="flex-1 relative">
        {eta && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <div className="bg-slate-900 px-5 py-2 rounded-full text-sm">
              ETA {eta.time} menit • {eta.distance} km
            </div>
          </div>
        )}

        <MapContainer center={[-6.9, 107.6]} zoom={13} className="h-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <MapClickHandler onPick={handleMapPick} />

          {startPoint && (
            <Marker
            position={startPoint}
            icon={startIcon}
            draggable
            eventHandlers={{
              dragend: e => setStartPoint(e.target.getLatLng())
            }}
          >
            <Popup>Start</Popup>
          </Marker>
        )}
        
        {endPoint && (
          <Marker
            position={endPoint}
            icon={endIcon}
            draggable
            eventHandlers={{
              dragend: e => setEndPoint(e.target.getLatLng())
            }}
          >
            <Popup>Destination</Popup>
          </Marker>
          )}

          {routeLine.length > 0 && (
            <Polyline positions={routeLine} pathOptions={{ color: "#22c55e", weight: 6 }} />
          )}

          {cctv.map(c => (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={pulseIcon(c.status)}
              eventHandlers={{ click: () => setSelected(c) }}
            >
              <Popup><b>{c.name}</b><br />{c.vehicles} kendaraan</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ================= SIDEBAR ================= */}
      <div className="w-[36%] p-6 border-l border-slate-800 overflow-y-auto">
        {selected ? (
          <>
            <h2 className="text-2xl font-bold mb-1">{selected.name}</h2>
            <p className="text-slate-400 mb-4">{selected.vehicles} kendaraan saat ini</p>

            {nowVsUsual && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Sekarang</p>
                  <p className="text-2xl font-bold">{nowVsUsual.now}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Biasanya</p>
                  <p className="text-2xl font-bold">{Math.round(nowVsUsual.usual)}</p>
                </div>
              </div>
            )}
            

            <div className="mb-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <p className={`font-bold ${decisionColor}`}>{decisionLabel}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">{decisionNote}</p>
            </div>

            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-2">
                Traffic Stability & Volatility (1 Jam Terakhir)
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={history}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Area type="natural" dataKey="avg_vehicle" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={3} />
                  <Line type="monotone" dataKey="volatility" stroke="#ef4444" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Link to="/admin" className="mt-6 block text-center bg-slate-800 py-3 rounded-xl font-bold">
              Admin Dashboard
            </Link>
          </>
        ) : isRoutingActive ? (
          <>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Route size={20} /> Informasi Rute
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900 p-4 rounded-xl">
                <p className="text-xs text-slate-400">ETA</p>
                <p className="text-2xl font-bold">{eta?.time} menit</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl">
                <p className="text-xs text-slate-400">Jarak</p>
                <p className="text-2xl font-bold">{eta?.distance} km</p>
              </div>
            </div>

            <div className={`mb-4 p-4 rounded-xl border ${routeDecisionBg}`}>
              <p className={`font-bold ${routeDecisionColor}`}>
                {routeDecisionLabel}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {routeDecisionNote}
              </p>
            </div>

              {/* 🆕 PREDIKSI 1 JAM KEDEPAN */}
    {nextHourPrediction && (
      <div
        className={`mb-4 p-4 rounded-xl border ${
          predictionStyle(nextHourPrediction.status).bg
        }`}
      >
        <p className="text-xs text-slate-400 mb-1">
          Prediksi 1 Jam Kedepan
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xl">
            {predictionStyle(nextHourPrediction.status).icon}
          </span>
          <p
            className={`font-bold ${
              predictionStyle(nextHourPrediction.status).color
            }`}
          >
            {nextHourPrediction.label}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-xs text-slate-400">Sekarang</p>
            <p className="text-lg font-bold">
              {nextHourPrediction.now}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Prediksi</p>
            <p className="text-lg font-bold">
              {nextHourPrediction.predicted}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Perubahan:{" "}
          <span className="font-bold">
            {nextHourPrediction.change_percent}%
          </span>
          {" • "}
          Confidence:{" "}
          <span className="font-bold">
            {nextHourPrediction.confidence}
          </span>
        </p>

        <p className="text-xs text-slate-500 mt-2 italic">
          {nextHourPrediction.note}
        </p>
      </div>
    )}

    {/* REKOMENDASI SISTEM */}
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <p className="text-xs text-slate-400 mb-2">Rekomendasi Sistem</p>
      <ul className="text-sm space-y-1 text-slate-300 list-disc ml-4">
        <li>Gunakan rute ini jika tidak ada alternatif lebih cepat</li>
        <li>Hindari jam sibuk (07.00–09.00 & 16.30–18.30)</li>
        <li>Perhatikan titik rawan kepadatan di tengah rute</li>
      </ul>
    </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-center">
            Klik peta untuk routing<br />
            atau klik CCTV untuk analisis lalu lintas
          </div>
        )}
      </div>
    </div>
  );
}
