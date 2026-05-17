// ─────────────────────────────────────────────────────────────────────────────
// DeviceOrthographicPreview.tsx — Cihaz 4-görünüm ortografik önizleme
// Terminal noktaları faz renginde, aktif terminal halkalı gösterim
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import type { DeviceTerminal } from "../types";

// ─── Renkler ─────────────────────────────────────────────────────────────────
const BG   = "#1a1f2b";
const BODY = "#334155";
const DIM  = "#64748b";
const MUT  = "#94a3b8";

const PHASE_COL: Record<string, string> = {
  L1: "#ef4444",
  L2: "#f59e0b",
  L3: "#3b82f6",
  N:  "#64748b",
  PE: "#22c55e",
};

function phaseColor(phase: string): string {
  return PHASE_COL[phase] ?? "#a1b4cc";
}

// ─── SVG düzen sabitleri ──────────────────────────────────────────────────────
const SW   = 520;
const HDR  = 26;
const ML   = 54;
const MR   = 16;
const MT   = 14;
const MB   = 38;
const AVLW = SW - ML - MR;

// ─── Başlık bandı ────────────────────────────────────────────────────────────
function Hdr({ label, accent, id }: { label: string; accent: string; id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.20" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={SW} height={HDR} fill={`url(#${id})`} />
      <rect x={0} y={HDR - 1} width={SW} height={1} fill={accent} opacity={0.4} />
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
      <rect x={xl - 44} y={cy - 6} width={44} height={12} fill={BG} stroke="none" />
      <text x={xl - 4} y={cy + 4} textAnchor="end" fontSize={9} fill={color} stroke="none"
        fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Terminal nokta sembolü ───────────────────────────────────────────────────
interface TermDotProps {
  cx: number;
  cy: number;
  r: number;
  phase: string;
  name: string;
  active: boolean;
  dashed?: boolean;
}

function TermDot({ cx, cy, r, phase, name, active, dashed = false }: TermDotProps) {
  const col = phaseColor(phase);
  const labelSize = Math.max(Math.min(r * 0.8, 9), 6);

  if (dashed) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={col} strokeWidth={0.9} strokeDasharray="3 2" opacity={0.45} />
        {active && (
          <circle cx={cx} cy={cy} r={r + 3.5} fill="none"
            stroke={col} strokeWidth={1.2} strokeDasharray="3 2" opacity={0.6} />
        )}
      </g>
    );
  }

  return (
    <g>
      {active && (
        <circle cx={cx} cy={cy} r={r + 4} fill="none"
          stroke={col} strokeWidth={1.5} opacity={0.9} />
      )}
      <circle cx={cx} cy={cy} r={r} fill={col} fillOpacity={0.28}
        stroke={col} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={r * 0.38} fill={col} opacity={0.9} />
      {r >= 7 && (
        <text x={cx} y={cy - r - 3} textAnchor="middle" fontSize={labelSize}
          fill={col} fontFamily="system-ui,sans-serif" fontWeight="600" opacity={0.9}>
          {name}
        </text>
      )}
    </g>
  );
}

// ─── Terminal yarıçapı ────────────────────────────────────────────────────────
function termRadius(t: DeviceTerminal, sc: number): number {
  if (t.hole_diameter_mm != null && t.hole_diameter_mm > 0) {
    return Math.min(Math.max(t.hole_diameter_mm * sc / 2, 4), 14);
  }
  const dim = Math.min(t.terminal_width_mm ?? 18, t.terminal_height_mm ?? 18);
  return Math.min(Math.max(dim * sc / 4, 4), 12);
}

// ─── Boyut hesabı yardımcısı ──────────────────────────────────────────────────
function computeScale(realW: number, realH: number): { sc: number; bw: number; bh: number; bx: number; by: number } {
  const avlH = Math.max(realH > 0 ? Math.min(AVLW * (realH / realW), 260) : 120, 60);
  const scX = AVLW / Math.max(realW, 1);
  const scY = avlH / Math.max(realH, 1);
  const sc  = Math.min(scX, scY);
  const bw  = realW * sc;
  const bh  = realH * sc;
  const bx  = ML + (AVLW - bw) / 2;
  const by  = HDR + MT;
  return { sc, bw, bh, bx, by };
}

// ─── Ön Görünüm (X × Y) ─────────────────────────────────────────────────────
function FrontViewDev({
  widthMm, heightMm, terminals, activeIdx
}: {
  widthMm: number; heightMm: number;
  terminals: DeviceTerminal[]; activeIdx: number | null;
}) {
  const { sc, bw, bh, bx, by } = computeScale(widthMm, heightMm);
  const svgH = HDR + MT + bh + MB;

  return (
    <svg width={SW} height={svgH} viewBox={`0 0 ${SW} ${svgH}`}
      style={{ display: "block", background: BG }}>
      <Hdr label="ÖN GÖRÜNÜM  (X × Y)" accent="#22d3ee" id="fg-front" />

      {/* Cihaz gövdesi */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />

      {/* Köşegen çizgiler (cihaz sembolü) */}
      <line x1={bx} y1={by} x2={bx + bw} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />
      <line x1={bx + bw} y1={by} x2={bx} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />

      {/* Terminaller */}
      {terminals.map((t, i) => {
        const isFront = !t.terminal_face || t.terminal_face === "front";
        const cx = bx + Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        const r  = termRadius(t, sc);
        return (
          <TermDot key={i} cx={cx} cy={cy} r={r}
            phase={t.phase} name={t.terminal_name}
            active={activeIdx === i} dashed={!isFront} />
        );
      })}

      {/* Boyutlar */}
      <DimH x1={bx} x2={bx + bw} y={by + bh + 8} label={`${widthMm} mm`} />
      <DimV x={bx} y1={by} y2={by + bh} label={`${heightMm} mm`} />
    </svg>
  );
}

// ─── Arka Görünüm (X mirrorlanmış × Y) ───────────────────────────────────────
function BackViewDev({
  widthMm, heightMm, terminals, activeIdx
}: {
  widthMm: number; heightMm: number;
  terminals: DeviceTerminal[]; activeIdx: number | null;
}) {
  const { sc, bw, bh, bx, by } = computeScale(widthMm, heightMm);
  const svgH = HDR + MT + bh + MB;

  return (
    <svg width={SW} height={svgH} viewBox={`0 0 ${SW} ${svgH}`}
      style={{ display: "block", background: BG }}>
      <Hdr label="ARKA GÖRÜNÜM  (X mir × Y)" accent="#f59e0b" id="fg-back" />

      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      <line x1={bx} y1={by} x2={bx + bw} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />
      <line x1={bx + bw} y1={by} x2={bx} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />

      {terminals.map((t, i) => {
        const isBack = t.terminal_face === "back";
        // Arka görünümde X ekseni aynalı
        const cx = bx + bw - Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        const r  = termRadius(t, sc);
        return (
          <TermDot key={i} cx={cx} cy={cy} r={r}
            phase={t.phase} name={t.terminal_name}
            active={activeIdx === i} dashed={!isBack} />
        );
      })}

      <DimH x1={bx} x2={bx + bw} y={by + bh + 8} label={`${widthMm} mm`} />
      <DimV x={bx} y1={by} y2={by + bh} label={`${heightMm} mm`} />
    </svg>
  );
}

// ─── Sol Yan Görünüm (Z × Y) ─────────────────────────────────────────────────
function SideViewDev({
  depthMm, heightMm, terminals, activeIdx
}: {
  depthMm: number; heightMm: number;
  terminals: DeviceTerminal[]; activeIdx: number | null;
}) {
  const realD = Math.max(depthMm, 1);
  const { sc, bw, bh, bx, by } = computeScale(realD, heightMm);
  const svgH = HDR + MT + bh + MB;

  return (
    <svg width={SW} height={svgH} viewBox={`0 0 ${SW} ${svgH}`}
      style={{ display: "block", background: BG }}>
      <Hdr label="YAN GÖRÜNÜM  (Z × Y)" accent="#a78bfa" id="fg-side" />

      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      <line x1={bx} y1={by} x2={bx + bw} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />
      <line x1={bx + bw} y1={by} x2={bx} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />

      {terminals.map((t, i) => {
        const isSide = t.terminal_face === "left" || t.terminal_face === "right";
        const cx = bx + Math.min(Math.max(Number(t.z_mm ?? 0) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.y_mm) * sc, 0), bh);
        const r  = termRadius(t, sc);
        return (
          <TermDot key={i} cx={cx} cy={cy} r={r}
            phase={t.phase} name={t.terminal_name}
            active={activeIdx === i} dashed={!isSide} />
        );
      })}

      <DimH x1={bx} x2={bx + bw} y={by + bh + 8} label={`${depthMm} mm`} />
      <DimV x={bx} y1={by} y2={by + bh} label={`${heightMm} mm`} />
    </svg>
  );
}

// ─── Üst Görünüm (X × Z) ─────────────────────────────────────────────────────
function TopViewDev({
  widthMm, depthMm, terminals, activeIdx
}: {
  widthMm: number; depthMm: number;
  terminals: DeviceTerminal[]; activeIdx: number | null;
}) {
  const realD = Math.max(depthMm, 1);
  const { sc, bw, bh, bx, by } = computeScale(widthMm, realD);
  const svgH = HDR + MT + bh + MB;

  return (
    <svg width={SW} height={svgH} viewBox={`0 0 ${SW} ${svgH}`}
      style={{ display: "block", background: BG }}>
      <Hdr label="ÜST GÖRÜNÜM  (X × Z)" accent="#34d399" id="fg-top" />

      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(51,65,85,0.55)" stroke={MUT} strokeWidth={1.2} />
      <line x1={bx} y1={by} x2={bx + bw} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />
      <line x1={bx + bw} y1={by} x2={bx} y2={by + bh}
        stroke={MUT} strokeWidth={0.4} opacity={0.25} />

      {terminals.map((t, i) => {
        const isTop = t.terminal_face === "top" || t.terminal_face === "bottom";
        const cx = bx + Math.min(Math.max(Number(t.x_mm) * sc, 0), bw);
        const cy = by + Math.min(Math.max(Number(t.z_mm ?? 0) * sc, 0), bh);
        const r  = termRadius(t, sc);
        return (
          <TermDot key={i} cx={cx} cy={cy} r={r}
            phase={t.phase} name={t.terminal_name}
            active={activeIdx === i} dashed={!isTop} />
        );
      })}

      <DimH x1={bx} x2={bx + bw} y={by + bh + 8} label={`${widthMm} mm`} />
      <DimV x={bx} y1={by} y2={by + bh} label={`${depthMm} mm`} />
    </svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ terminals, activeIdx }: { terminals: DeviceTerminal[]; activeIdx: number | null }) {
  if (terminals.length === 0) return null;

  return (
    <div style={{
      background: BG,
      border: "1px solid rgba(148,163,184,0.18)",
      borderTop: "none",
      padding: "0.5rem 0.75rem 0.6rem",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem 0.75rem",
    }}>
      {terminals.map((t, i) => {
        const col = phaseColor(t.phase);
        const isActive = activeIdx === i;
        return (
          <span key={i} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.72rem",
            fontFamily: "system-ui,sans-serif",
            color: isActive ? col : "rgba(148,163,184,0.75)",
            fontWeight: isActive ? 700 : 400,
            padding: "0.1rem 0.35rem",
            borderRadius: 4,
            background: isActive ? `${col}1a` : "transparent",
            border: isActive ? `1px solid ${col}55` : "1px solid transparent",
            transition: "all 0.15s",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: col, opacity: isActive ? 1 : 0.5,
              display: "inline-block",
            }} />
            <span>{t.terminal_name}</span>
            <span style={{ opacity: 0.6 }}>{t.phase}</span>
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
      display: "flex",
      flexDirection: "column",
      gap: 0,
      border: "1px solid rgba(148,163,184,0.18)",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Başlık */}
      <div style={{
        background: "#0f1623",
        padding: "0.5rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "#94a3b8",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderBottom: "1px solid rgba(148,163,184,0.12)",
      }}>
        Cihaz Önizleme — 4 Görünüm
      </div>

      <FrontViewDev widthMm={widthMm} heightMm={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <BackViewDev  widthMm={widthMm} heightMm={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <SideViewDev  depthMm={depthMm} heightMm={heightMm} terminals={terminals} activeIdx={activeIdx} />
      <TopViewDev   widthMm={widthMm} depthMm={depthMm}   terminals={terminals} activeIdx={activeIdx} />

      <Legend terminals={terminals} activeIdx={activeIdx} />
    </div>
  );
}
