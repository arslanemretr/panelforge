// ─────────────────────────────────────────────────────────────────────────────
// DeviceOrthographicPreview.tsx — Cihaz 4-görünüm ortografik önizleme
// TerminalPreview ile aynı koyu tema stili
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import type { DeviceTerminal } from "../types";

// ─── Renkler ─────────────────────────────────────────────────────────────────
const BG    = "#1a1f2b";
const MUT   = "#94a3b8";
const DIM   = "#64748b";
const DASH  = "rgba(148,163,184,0.65)";

const PHASE_COL: Record<string, string> = {
  L1: "#ef4444",
  L2: "#f59e0b",
  L3: "#3b82f6",
  N:  "#64748b",
  PE: "#22c55e",
};
function phaseColor(p: string) { return PHASE_COL[p] ?? "#a1b4cc"; }

// ─── SVG düzen sabitleri ─────────────────────────────────────────────────────
const VW   = 520;   // viewBox genişliği (sabit, width="100%" ile kapsayıcıya uyar)
const HDR  = 26;
const ML   = 54;
const MR   = 16;
const MT   = 14;
const MB   = 40;
const AVLW = VW - ML - MR;  // 450

// ─── Başlık bandı ────────────────────────────────────────────────────────────
function Hdr({ label, accent, uid }: { label: string; accent: string; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={VW} height={HDR} fill={`url(#${uid})`} />
      <rect x={0} y={HDR - 1} width={VW} height={1} fill={accent} opacity={0.4} />
      <circle cx={14} cy={HDR / 2} r={4.5} fill={accent} opacity={0.85} />
      <text x={26} y={HDR / 2 + 4} fontSize={10.5} fill={accent}
        fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="0.5">
        {label}
      </text>
    </g>
  );
}

// ─── Boyut okları ─────────────────────────────────────────────────────────────
function DimH({ x1, x2, y, label, color = DIM, off = 14 }:
  { x1: number; x2: number; y: number; label: string; color?: string; off?: number }) {
  const cx = (x1 + x2) / 2; const yl = y - off;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x1} y1={y} x2={x1} y2={yl - 3} />
      <line x1={x2} y1={y} x2={x2} y2={yl - 3} />
      <line x1={x1} y1={yl} x2={x2} y2={yl} />
      <polygon points={`${x1+5},${yl-2} ${x1},${yl} ${x1+5},${yl+2}`} fill={color} stroke="none" />
      <polygon points={`${x2-5},${yl-2} ${x2},${yl} ${x2-5},${yl+2}`} fill={color} stroke="none" />
      <rect x={cx-26} y={yl-12} width={52} height={11} fill={BG} stroke="none" />
      <text x={cx} y={yl-3} textAnchor="middle" fontSize={9} fill={color} stroke="none"
        fontFamily="monospace">{label}</text>
    </g>
  );
}

function DimV({ x, y1, y2, label, color = DIM, off = 14 }:
  { x: number; y1: number; y2: number; label: string; color?: string; off?: number }) {
  const cy = (y1 + y2) / 2; const xl = x - off;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x} y1={y1} x2={xl - 3} y2={y1} />
      <line x1={x} y1={y2} x2={xl - 3} y2={y2} />
      <line x1={xl} y1={y1} x2={xl} y2={y2} />
      <polygon points={`${xl-2},${y1+5} ${xl},${y1} ${xl+2},${y1+5}`} fill={color} stroke="none" />
      <polygon points={`${xl-2},${y2-5} ${xl},${y2} ${xl+2},${y2-5}`} fill={color} stroke="none" />
      <rect x={xl-44} y={cy-6} width={44} height={12} fill={BG} stroke="none" />
      <text x={xl-4} y={cy+4} textAnchor="end" fontSize={9} fill={color} stroke="none"
        fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Terminal sembolü — faz renkli, geometrili ───────────────────────────────
interface TermSymProps {
  cx: number;
  cy: number;
  sc: number;           // ölçek faktörü
  t: DeviceTerminal;
  active: boolean;
  dashed?: boolean;     // gizli (başka yüzeyde)
}

function TermSym({ cx, cy, sc, t, active, dashed = false }: TermSymProps) {
  const col  = phaseColor(t.phase);
  const hd   = t.hole_diameter_mm ? Number(t.hole_diameter_mm) : null;
  const tw   = t.terminal_width_mm  ? Number(t.terminal_width_mm)  : null;
  const th   = t.terminal_height_mm ? Number(t.terminal_height_mm) : null;

  // Delik yarıçapı (px)
  const hR = hd != null
    ? Math.min(Math.max(hd * sc / 2, 3.5), 13)
    : tw != null
      ? Math.min(Math.max(Math.min(tw, th ?? tw) * sc / 4, 3.5), 10)
      : 5;

  const alpha = dashed ? 0.35 : 1;
  const dashArr = dashed ? "3 2" : undefined;

  // Aktif vurgu halkası
  const ring = active ? (
    <circle cx={cx} cy={cy} r={hR + 5.5} fill="none"
      stroke={col} strokeWidth={1.6} opacity={0.95} />
  ) : null;

  // Boyutlu terminal kutusu (tw × th mevcut ise)
  if (tw != null && th != null && !dashed) {
    const rw = Math.min(tw * sc / 2, 18);
    const rh = Math.min(th * sc / 2, 18);
    return (
      <g opacity={alpha}>
        {ring}
        <rect x={cx - rw} y={cy - rh} width={rw * 2} height={rh * 2}
          fill={`${col}18`} stroke={col} strokeWidth={1.1} rx={2} />
        {hd != null && (
          <circle cx={cx} cy={cy} r={hR} fill={BG} stroke={col} strokeWidth={0.9}
            strokeDasharray={dashArr} />
        )}
        <text x={cx} y={cy - rh - 3} textAnchor="middle" fontSize={8}
          fill={col} fontFamily="system-ui,sans-serif" fontWeight={600} opacity={0.85}>
          {t.terminal_name}
        </text>
      </g>
    );
  }

  // Basit delik sembolü
  return (
    <g opacity={alpha}>
      {ring}
      <circle cx={cx} cy={cy} r={hR} fill={dashed ? "none" : `${col}22`}
        stroke={col} strokeWidth={1.1} strokeDasharray={dashArr} />
      {!dashed && (
        <circle cx={cx} cy={cy} r={hR * 0.38} fill={col} opacity={0.85} />
      )}
      {!dashed && (
        <text x={cx} y={cy - hR - 3} textAnchor="middle" fontSize={8}
          fill={col} fontFamily="system-ui,sans-serif" fontWeight={600} opacity={0.85}>
          {t.terminal_name}
        </text>
      )}
    </g>
  );
}

// ─── Ölçek + kutu hesabı ──────────────────────────────────────────────────────
function layout(realW: number, realH: number) {
  const maxH = Math.min(AVLW * (realH / Math.max(realW, 1)), 260);
  const avlH = Math.max(maxH, 60);
  const sc   = Math.min(AVLW / Math.max(realW, 1), avlH / Math.max(realH, 1));
  const bw   = realW * sc;
  const bh   = realH * sc;
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const svgH = HDR + MT + bh + MB;
  return { sc, bw, bh, bx, by, svgH };
}

// ─── ÖN GÖRÜNÜM (X × Y) ──────────────────────────────────────────────────────
function FrontView({ W, H, terminals, activeIdx }:
  { W: number; H: number; terminals: DeviceTerminal[]; activeIdx: number | null }) {
  const { sc, bw, bh, bx, by, svgH } = layout(W, H);
  return (
    <svg viewBox={`0 0 ${VW} ${svgH}`} width="100%"
      style={{ display: "block", background: BG }}>
      <Hdr label="ÖN GÖRÜNÜM  (X × Y)" accent="#22d3ee" uid="dev-fg-front" />
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      {terminals.map((t, i) => {
        const isFront = !t.terminal_face || t.terminal_face === "front";
        const cx = bx + Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        return <TermSym key={i} cx={cx} cy={cy} sc={sc} t={t}
          active={activeIdx === i} dashed={!isFront} />;
      })}
      <DimH x1={bx} x2={bx+bw} y={by+bh+8}  label={`${W} mm`} />
      <DimV x={bx}  y1={by}    y2={by+bh}    label={`${H} mm`} />
    </svg>
  );
}

// ─── ARKA GÖRÜNÜM (X aynalı × Y) ─────────────────────────────────────────────
function BackView({ W, H, terminals, activeIdx }:
  { W: number; H: number; terminals: DeviceTerminal[]; activeIdx: number | null }) {
  const { sc, bw, bh, bx, by, svgH } = layout(W, H);
  return (
    <svg viewBox={`0 0 ${VW} ${svgH}`} width="100%"
      style={{ display: "block", background: BG }}>
      <Hdr label="ARKA GÖRÜNÜM  (X mir × Y)" accent="#f59e0b" uid="dev-fg-back" />
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      {terminals.map((t, i) => {
        const isBack = t.terminal_face === "back";
        const cx = bx + bw - Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        return <TermSym key={i} cx={cx} cy={cy} sc={sc} t={t}
          active={activeIdx === i} dashed={!isBack} />;
      })}
      <DimH x1={bx} x2={bx+bw} y={by+bh+8} label={`${W} mm`} />
      <DimV x={bx}  y1={by}    y2={by+bh}   label={`${H} mm`} />
    </svg>
  );
}

// ─── YAN GÖRÜNÜM (Z × Y) ─────────────────────────────────────────────────────
function SideView({ D, H, terminals, activeIdx }:
  { D: number; H: number; terminals: DeviceTerminal[]; activeIdx: number | null }) {
  const realD = Math.max(D, 1);
  const { sc, bw, bh, bx, by, svgH } = layout(realD, H);
  return (
    <svg viewBox={`0 0 ${VW} ${svgH}`} width="100%"
      style={{ display: "block", background: BG }}>
      <Hdr label="YAN GÖRÜNÜM  (Z × Y)" accent="#a78bfa" uid="dev-fg-side" />
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      {terminals.map((t, i) => {
        const isSide = t.terminal_face === "left" || t.terminal_face === "right";
        const cx = bx + Math.min(Math.max(Number(t.z_mm ?? 0) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        return <TermSym key={i} cx={cx} cy={cy} sc={sc} t={t}
          active={activeIdx === i} dashed={!isSide} />;
      })}
      <DimH x1={bx} x2={bx+bw} y={by+bh+8} label={`${D} mm`} />
      <DimV x={bx}  y1={by}    y2={by+bh}   label={`${H} mm`} />
    </svg>
  );
}

// ─── ÜST GÖRÜNÜM (X × Z) ─────────────────────────────────────────────────────
function TopView({ W, D, terminals, activeIdx }:
  { W: number; D: number; terminals: DeviceTerminal[]; activeIdx: number | null }) {
  const realD = Math.max(D, 1);
  const { sc, bw, bh, bx, by, svgH } = layout(W, realD);
  return (
    <svg viewBox={`0 0 ${VW} ${svgH}`} width="100%"
      style={{ display: "block", background: BG }}>
      <Hdr label="ÜST GÖRÜNÜM  (X × Z)" accent="#34d399" uid="dev-fg-top" />
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      {terminals.map((t, i) => {
        const isTop = t.terminal_face === "top" || t.terminal_face === "bottom";
        const cx = bx + Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.z_mm ?? 0) * sc, 0), bh);
        return <TermSym key={i} cx={cx} cy={cy} sc={sc} t={t}
          active={activeIdx === i} dashed={!isTop} />;
      })}
      <DimH x1={bx} x2={bx+bw} y={by+bh+8} label={`${W} mm`} />
      <DimV x={bx}  y1={by}    y2={by+bh}   label={`${D} mm`} />
    </svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ terminals, activeIdx }: { terminals: DeviceTerminal[]; activeIdx: number | null }) {
  if (!terminals.length) return null;
  return (
    <div style={{
      background: BG, borderTop: "1px solid rgba(148,163,184,0.14)",
      padding: "0.45rem 0.7rem 0.55rem",
      display: "flex", flexWrap: "wrap", gap: "0.35rem 0.65rem",
    }}>
      {terminals.map((t, i) => {
        const col = phaseColor(t.phase);
        const active = activeIdx === i;
        return (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: "0.28rem",
            fontSize: "0.71rem", fontFamily: "system-ui,sans-serif",
            color: active ? col : "rgba(148,163,184,0.7)",
            fontWeight: active ? 700 : 400,
            padding: "0.08rem 0.32rem",
            borderRadius: 4,
            background: active ? `${col}18` : "transparent",
            border: `1px solid ${active ? col + "55" : "transparent"}`,
            transition: "all 0.12s",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: col, opacity: active ? 1 : 0.45,
              display: "inline-block", flexShrink: 0,
            }} />
            {t.terminal_name}
            <span style={{ opacity: 0.6, fontSize: "0.66rem" }}>{t.phase}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export interface DeviceOrthographicPreviewProps {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  terminals: DeviceTerminal[];
  activeIdx: number | null;
}

export function DeviceOrthographicPreview({
  widthMm, heightMm, depthMm, terminals, activeIdx
}: DeviceOrthographicPreviewProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      border: "1px solid rgba(148,163,184,0.18)",
      borderRadius: 8, overflow: "hidden",
    }}>
      {/* Başlık */}
      <div style={{
        background: "#0f1623",
        padding: "0.45rem 0.75rem",
        fontSize: "0.72rem", fontWeight: 700,
        color: "#94a3b8", letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      }}>
        Cihaz Önizleme — 4 Görünüm
      </div>

      <FrontView W={widthMm}  H={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <BackView  W={widthMm}  H={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <SideView  D={depthMm}  H={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <TopView   W={widthMm}  D={depthMm}  terminals={terminals} activeIdx={activeIdx} />

      <Legend terminals={terminals} activeIdx={activeIdx} />
    </div>
  );
}
