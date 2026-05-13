/**
 * DeviceTechDrawing — Mühendislik teknik çizim bileşeni
 *
 * Tek SVG içinde 4 ortografik görünüm:
 *   [Ön Görünüm  ]  [Sağ Yan Görünüm]
 *   [Alt Plan    ]  [Arka Görünüm   ]
 *
 * Görünümler birbirine projeksiyon çizgileriyle hizalı.
 * Terminal tipi (terminal_type) bazlı sembol çizimi.
 */

import { useEffect, useRef, useState } from "react";
import type { TerminalDefinition } from "../types";

const COLORS = {
  paper:      "#f4f6f8",
  border:     "#c8d4e0",
  grid:       "#dce6ef",
  object:     "#1a2e3d",
  dim:        "#2d5a8e",
  dimText:    "#1e3a5f",
  center:     "#b03030",
  hidden:     "#7a8fa8",
  projection: "#aabbd0",
  viewBg:     "#ffffff",
  labelBg:    "#e0eaf6",
  labelText:  "#1a2e3d",
  backView:   "#fff8f0",   // arka görünüş zemin tonu — hafif turuncu
};

const OBJ_W  = 1.6;
const DIM_W  = 0.7;
const HID_W  = 0.6;
const CTR_W  = 0.5;

interface TechTerminal {
  terminal_name: string;
  phase: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number | null;
  terminal_face?: string | null;
  terminal_type?: string | null;
  terminal_width_mm?: number | null;
  terminal_height_mm?: number | null;
  terminal_depth_mm?: number | null;
  hole_diameter_mm?: number | null;
  bolt_type?: string | null;
  bolt_count?: number | null;
  bolt_center_distance_mm?: number | null;
  terminal_definition_id?: number | null;
}

export interface DeviceTechDrawingProps {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  terminals: TechTerminal[];
  terminalDefs?: TerminalDefinition[];
  /** Bileşen display yüksekliği (px). Varsayılan 480. */
  height?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı çizim fonksiyonları
// ─────────────────────────────────────────────────────────────────────────────

function DimLine({
  x1, y1, x2, y2, text, offset = 0, vertical = false, id,
}: {
  x1: number; y1: number; x2: number; y2: number;
  text: string; offset?: number; vertical?: boolean; id: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const arrowId = `arr-${id}`;
  const arrowBackId = `arrb-${id}`;
  const ARR = 4;
  return (
    <g>
      <defs>
        <marker id={arrowId} viewBox={`0 0 ${ARR*2} ${ARR*2}`}
          refX={ARR*2} refY={ARR} markerWidth={ARR} markerHeight={ARR} orient="auto">
          <path d={`M0,0 L${ARR*2},${ARR} L0,${ARR*2} Z`} fill={COLORS.dim} />
        </marker>
        <marker id={arrowBackId} viewBox={`0 0 ${ARR*2} ${ARR*2}`}
          refX={0} refY={ARR} markerWidth={ARR} markerHeight={ARR} orient="auto-start-reverse">
          <path d={`M0,0 L${ARR*2},${ARR} L0,${ARR*2} Z`} fill={COLORS.dim} />
        </marker>
      </defs>
      {vertical ? (
        <>
          <line x1={x1 - 3} y1={y1} x2={x1 + offset + 8} y2={y1} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line x1={x2 - 3} y1={y2} x2={x2 + offset + 8} y2={y2} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line x1={x1 + offset} y1={y1} x2={x2 + offset} y2={y2}
            stroke={COLORS.dim} strokeWidth={DIM_W}
            markerEnd={`url(#${arrowId})`} markerStart={`url(#${arrowBackId})`} />
          <text x={x1 + offset + 4} y={my} fill={COLORS.dimText}
            fontSize={7} textAnchor="start" dominantBaseline="central"
            transform={`rotate(-90,${x1 + offset + 4},${my})`}>
            {text}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + offset + 8} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + offset + 8} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line x1={x1} y1={y1 + offset} x2={x2} y2={y2 + offset}
            stroke={COLORS.dim} strokeWidth={DIM_W}
            markerEnd={`url(#${arrowId})`} markerStart={`url(#${arrowBackId})`} />
          <text x={mx} y={y1 + offset - 3} fill={COLORS.dimText}
            fontSize={7} textAnchor="middle" dominantBaseline="auto">
            {text}
          </text>
        </>
      )}
    </g>
  );
}

function HoleSymbol({ cx, cy, r, label, dimR }: {
  cx: number; cy: number; r: number; label?: string; dimR?: number;
}) {
  const ext = r * 1.6;
  return (
    <g>
      {dimR && dimR > r && (
        <circle cx={cx} cy={cy} r={dimR}
          fill="none" stroke={COLORS.hidden} strokeWidth={HID_W} strokeDasharray="3 2" />
      )}
      <circle cx={cx} cy={cy} r={r}
        fill="rgba(30,46,61,0.06)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
      <line x1={cx - ext} y1={cy} x2={cx + ext} y2={cy}
        stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
      <line x1={cx} y1={cy - ext} x2={cx} y2={cy + ext}
        stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
      {label && (
        <text x={cx + r + 3} y={cy - r - 2} fill={COLORS.dimText} fontSize={6.5} textAnchor="start">
          {label}
        </text>
      )}
    </g>
  );
}

function ViewLabel({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={11}
        fill={COLORS.labelBg} stroke={COLORS.border} strokeWidth={0.5} />
      <text x={x + w / 2} y={y + 7.5} fill={COLORS.labelText}
        fontSize={7} textAnchor="middle" fontWeight={700} letterSpacing="0.5">
        {text}
      </text>
    </g>
  );
}

/**
 * Terminal tipi bazlı sembol çizimi.
 * Ön terminal (Ön Bakır Basmalı): dikdörtgen blok + vida delikleri
 * Arka Yatay Taraklı: yatay paralel çizgilerden oluşan tarak sembolü
 * Yandan Taraklı: dikey paralel çizgiler
 * Diğer: basit delik sembolü
 */
function TerminalSymbol({
  t, offsetX, offsetY, defaultR,
}: {
  t: TechTerminal;
  offsetX: number;  // görünüm orijin X
  offsetY: number;  // görünüm orijin Y
  defaultR: number;
}) {
  const cx = offsetX + Number(t.x_mm);
  const cy = offsetY + Number(t.y_mm);
  const bw = t.terminal_width_mm ? Number(t.terminal_width_mm) : 0;
  const bh = t.terminal_height_mm ? Number(t.terminal_height_mm) : 0;
  const r = t.hole_diameter_mm ? Number(t.hole_diameter_mm) / 2 : defaultR;
  const ttype = t.terminal_type ?? "";

  // Arka Yatay Taraklı — yatay tarak sembolü
  if (ttype.includes("Yatay Taraklı")) {
    const tw = bw > 0 ? bw : 50;
    const th = bh > 0 ? bh : 20;
    const lineCount = 4;
    const lineGap = th / (lineCount + 1);
    return (
      <g>
        <rect x={cx - tw/2} y={cy - th/2} width={tw} height={th}
          fill="rgba(255,140,0,0.07)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
        {Array.from({ length: lineCount }, (_, i) => {
          const lineY = cy - th/2 + lineGap * (i + 1);
          return (
            <line key={i} x1={cx - tw/2 + 3} y1={lineY} x2={cx + tw/2 - 3} y2={lineY}
              stroke={COLORS.object} strokeWidth={0.8} />
          );
        })}
        <line x1={cx - tw/2 - 3} y1={cy} x2={cx + tw/2 + 3} y2={cy}
          stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
        <text x={cx + tw/2 + 3} y={cy - th/2 - 2} fill={COLORS.dimText} fontSize={6.5}>
          {t.terminal_name}
        </text>
      </g>
    );
  }

  // Yandan Taraklı — dikey tarak sembolü
  if (ttype.includes("Yandan Taraklı")) {
    const tw = bw > 0 ? bw : 20;
    const th = bh > 0 ? bh : 50;
    const lineCount = 4;
    const lineGap = tw / (lineCount + 1);
    return (
      <g>
        <rect x={cx - tw/2} y={cy - th/2} width={tw} height={th}
          fill="rgba(100,100,255,0.07)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
        {Array.from({ length: lineCount }, (_, i) => {
          const lineX = cx - tw/2 + lineGap * (i + 1);
          return (
            <line key={i} x1={lineX} y1={cy - th/2 + 3} x2={lineX} y2={cy + th/2 - 3}
              stroke={COLORS.object} strokeWidth={0.8} />
          );
        })}
        <line x1={cx} y1={cy - th/2 - 3} x2={cx} y2={cy + th/2 + 3}
          stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
        <text x={cx + tw/2 + 3} y={cy - th/2 - 2} fill={COLORS.dimText} fontSize={6.5}>
          {t.terminal_name}
        </text>
      </g>
    );
  }

  // Ön Bakır Basmalı (veya boyutu olan herhangi bir terminal)
  if (bw > 0 && bh > 0) {
    return (
      <g>
        <rect x={cx - bw/2} y={cy - bh/2} width={bw} height={bh}
          fill="rgba(30,46,61,0.04)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
        <line x1={cx - bw/2 - 4} y1={cy} x2={cx + bw/2 + 4} y2={cy}
          stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
        <line x1={cx} y1={cy - bh/2 - 4} x2={cx} y2={cy + bh/2 + 4}
          stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
        {t.bolt_center_distance_mm && (
          <>
            <HoleSymbol cx={cx - Number(t.bolt_center_distance_mm)/2} cy={cy} r={r * 0.8} />
            {(t.bolt_count ?? 2) >= 2 && (
              <HoleSymbol cx={cx + Number(t.bolt_center_distance_mm)/2} cy={cy} r={r * 0.8} />
            )}
          </>
        )}
        <text x={cx + bw/2 + 3} y={cy - bh/2 - 2} fill={COLORS.dimText} fontSize={6.5}>
          {t.terminal_name}
        </text>
      </g>
    );
  }

  // Fallback: basit delik sembolü
  return <HoleSymbol cx={cx} cy={cy} r={r} label={t.terminal_name} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana bileşen
// ─────────────────────────────────────────────────────────────────────────────

export function DeviceTechDrawing({
  widthMm, heightMm, depthMm, terminals, terminalDefs = [], height = 480,
}: DeviceTechDrawingProps) {
  const W = Math.max(widthMm  || 1, 1);
  const H = Math.max(heightMm || 1, 1);
  const D = Math.max(depthMm  || 1, 1);

  const OUTER   = 12;
  const DIM_OFF = 22;
  const GAP     = 18;

  // Görünüm kök koordinatları — 2×2 grid
  const frontX  = OUTER + DIM_OFF;
  const frontY  = OUTER + DIM_OFF;
  const sideX   = frontX + W + GAP;
  const sideY   = frontY;
  const topX    = frontX;
  const topY    = frontY + H + GAP;
  const backX   = sideX;    // arka görünüş sağ alt
  const backY   = topY;

  // Toplam SVG boyutu
  const svgW = sideX + D + DIM_OFF + OUTER;
  const svgH = topY  + Math.max(D, H) + DIM_OFF + OUTER;

  const gridStep = Math.max(W, H, D) > 400 ? 50 : Math.max(W, H, D) > 200 ? 25 : 10;

  // Terminal filtreleri
  const frontTerminals = terminals.filter(
    (t) => !t.terminal_face || t.terminal_face === "front",
  );
  const backTerminals = terminals.filter(
    (t) => t.terminal_face === "back",
  );
  const sideTerminals = terminals.filter(
    (t) => t.terminal_face && ["right", "left"].includes(t.terminal_face),
  );
  const topTerminals = terminals.filter(
    (t) => t.terminal_face && ["top", "bottom"].includes(t.terminal_face),
  );
  const topHiddenTerminals = frontTerminals;

  const holeR = (t: TechTerminal) =>
    t.hole_diameter_mm ? Number(t.hole_diameter_mm) / 2 : Math.min(W, H) * 0.04 + 2;

  const dimId = (suffix: string) => `d-${suffix}-${W}-${H}-${D}`;

  // ── Zoom / Pan ──────────────────────────────────────────────────────────────
  const [zoom, setZoom]     = useState(1);
  const [pan,  setPan]      = useState({ x: 0, y: 0 });
  const [dragging, setDrag] = useState(false);
  const svgRef   = useRef<SVGSVGElement>(null);
  const dragRef  = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const stateRef = useRef({ zoom, pan, svgW, svgH });
  stateRef.current = { zoom, pan, svgW, svgH };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: cz, pan: cp, svgW: cW, svgH: cH } = stateRef.current;
      const factor  = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const newZoom = Math.min(12, Math.max(0.2, cz * factor));
      const rect    = el.getBoundingClientRect();
      const vbW = cW / cz;  const vbH = cH / cz;
      const ancX = cp.x + (e.clientX - rect.left)  / rect.width  * vbW;
      const ancY = cp.y + (e.clientY - rect.top)   / rect.height * vbH;
      const newVbW = cW / newZoom; const newVbH = cH / newZoom;
      const fX = (ancX - cp.x) / vbW; const fY = (ancY - cp.y) / vbH;
      setZoom(newZoom);
      setPan({ x: ancX - fX * newVbW, y: ancY - fY * newVbH });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function zoomBy(factor: number) {
    const { zoom: cz, pan: cp, svgW: cW, svgH: cH } = stateRef.current;
    const newZoom = Math.min(12, Math.max(0.2, cz * factor));
    const vbW = cW / cz; const vbH = cH / cz;
    const cx = cp.x + vbW / 2; const cy = cp.y + vbH / 2;
    const nW = cW / newZoom;   const nH = cH / newZoom;
    setZoom(newZoom);
    setPan({ x: cx - nW / 2, y: cy - nH / 2 });
  }

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    setDrag(true);
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.sx) / rect.width  * (svgW / zoom);
    const dy = (e.clientY - dragRef.current.sy) / rect.height * (svgH / zoom);
    setPan({ x: dragRef.current.px - dx, y: dragRef.current.py - dy });
  }
  function onMouseUp() { dragRef.current = null; setDrag(false); }

  const viewBoxStr = `${pan.x} ${pan.y} ${svgW / zoom} ${svgH / zoom}`;

  // Kullanılmayan parametre uyarısını bastır
  void terminalDefs;

  return (
    <div style={{ width: "100%" }}>
      {/* Zoom toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
        <button type="button" className="ghost"
          style={{ padding: "0.18rem 0.5rem", fontSize: "1rem", lineHeight: 1 }}
          onClick={() => zoomBy(1.4)} title="Yakınlaştır">+</button>
        <span style={{ fontSize: "0.78rem", minWidth: "2.8rem", textAlign: "center", color: "var(--muted)" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="ghost"
          style={{ padding: "0.18rem 0.5rem", fontSize: "1rem", lineHeight: 1 }}
          onClick={() => zoomBy(1 / 1.4)} title="Uzaklaştır">−</button>
        <button type="button" className="ghost"
          style={{ padding: "0.18rem 0.5rem", fontSize: "0.8rem" }}
          onClick={resetView} title="Görünümü sıfırla">↺</button>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.25rem" }}>
          · Kaydırmak için sürükle, yakınlaştırmak için scroll
        </span>
      </div>

      <div style={{ width: "100%", height, background: COLORS.border, borderRadius: 10, padding: 1 }}>
        <svg
          ref={svgRef}
          viewBox={viewBoxStr}
          width="100%"
          height="100%"
          style={{
            display: "block", borderRadius: 9,
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
          fontFamily="'Courier New', Consolas, monospace"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* ── Kağıt zemini ─────────────────────────────────────────── */}
          <rect x={0} y={0} width={svgW} height={svgH} fill={COLORS.paper} />

          {/* ── Grid çizgileri ───────────────────────────────────────── */}
          <g opacity={0.45}>
            {Array.from({ length: Math.ceil(svgW / gridStep) + 1 }, (_, i) => i * gridStep).map((x) => (
              <line key={`gv${x}`} x1={x} y1={0} x2={x} y2={svgH}
                stroke={COLORS.grid} strokeWidth={0.4} />
            ))}
            {Array.from({ length: Math.ceil(svgH / gridStep) + 1 }, (_, i) => i * gridStep).map((y) => (
              <line key={`gh${y}`} x1={0} y1={y} x2={svgW} y2={y}
                stroke={COLORS.grid} strokeWidth={0.4} />
            ))}
          </g>

          {/* ── Projeksiyon hizalama çizgileri ──────────────────────── */}
          <line x1={frontX} y1={frontY + H} x2={topX} y2={topY}
            stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
          <line x1={frontX + W} y1={frontY + H} x2={topX + W} y2={topY}
            stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
          <line x1={frontX + W} y1={frontY} x2={sideX} y2={sideY}
            stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
          <line x1={frontX + W} y1={frontY + H} x2={sideX} y2={sideY + H}
            stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />

          {/* ── ÖN GÖRÜNÜM ───────────────────────────────────────────── */}
          <g>
            <rect x={frontX} y={frontY} width={W} height={H}
              fill={COLORS.viewBg} stroke={COLORS.object} strokeWidth={OBJ_W} />

            {frontTerminals.map((t, i) => (
              <TerminalSymbol key={i} t={t} offsetX={frontX} offsetY={frontY} defaultR={holeR(t)} />
            ))}

            <ViewLabel x={frontX} y={frontY + H + 4} w={W} text="ÖN GÖRÜNÜM" />
          </g>

          {/* ── SAĞ YAN GÖRÜNÜM ──────────────────────────────────────── */}
          <g>
            <rect x={sideX} y={sideY} width={D} height={H}
              fill={COLORS.viewBg} stroke={COLORS.object} strokeWidth={OBJ_W} />

            {sideTerminals.map((t, i) => {
              const cx = sideX + Number(t.z_mm ?? 0);
              const cy = sideY + Number(t.y_mm);
              const r  = holeR(t);
              return <HoleSymbol key={i} cx={cx} cy={cy} r={r} label={t.terminal_name} />;
            })}

            {/* Ön terminaller gizli çizgi */}
            {frontTerminals.map((t, i) => {
              const cx = sideX + Number(t.z_mm ?? D / 2);
              const cy = sideY + Number(t.y_mm);
              const r  = holeR(t);
              return (
                <circle key={`h${i}`} cx={cx} cy={cy} r={r}
                  fill="none" stroke={COLORS.hidden} strokeWidth={HID_W} strokeDasharray="3 2" />
              );
            })}

            <ViewLabel x={sideX} y={sideY + H + 4} w={D} text="SAĞ YAN" />
          </g>

          {/* ── ALT PLAN (ÜST) GÖRÜNÜM ──────────────────────────────── */}
          <g>
            <rect x={topX} y={topY} width={W} height={D}
              fill={COLORS.viewBg} stroke={COLORS.object} strokeWidth={OBJ_W} />

            {topHiddenTerminals.map((t, i) => {
              const cx = topX + Number(t.x_mm);
              const cy = topY + Number(t.z_mm ?? D / 2);
              const r  = holeR(t);
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={r}
                    fill="none" stroke={COLORS.hidden} strokeWidth={HID_W} strokeDasharray="3 2" />
                  <line x1={cx - r * 1.5} y1={cy} x2={cx + r * 1.5} y2={cy}
                    stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" opacity={0.6} />
                </g>
              );
            })}

            {topTerminals.map((t, i) => {
              const cx = topX + Number(t.x_mm);
              const cy = topY + Number(t.z_mm ?? 0);
              const r  = holeR(t);
              return <HoleSymbol key={`top${i}`} cx={cx} cy={cy} r={r} label={t.terminal_name} />;
            })}

            <ViewLabel x={topX} y={topY + D + 4} w={W} text="ALT PLAN" />
          </g>

          {/* ── ARKA GÖRÜNÜM (sağ alt) ──────────────────────────────── */}
          <g>
            <rect x={backX} y={backY} width={W} height={H}
              fill={COLORS.backView} stroke={COLORS.object} strokeWidth={OBJ_W}
              strokeDasharray="6 2" />

            {/* Arka terminal semboller — X ekseni aynalı (arka görünüşte sol/sağ ters) */}
            {backTerminals.map((t, i) => {
              // Arka görünüşte X koordinatı aynalı: x_back = W - x_mm
              const mirroredT: TechTerminal = {
                ...t,
                x_mm: W - Number(t.x_mm),
              };
              return (
                <TerminalSymbol
                  key={i}
                  t={mirroredT}
                  offsetX={backX}
                  offsetY={backY}
                  defaultR={holeR(t)}
                />
              );
            })}

            {/* Ön terminaller arka görünüşte gizli çizgi */}
            {frontTerminals.map((t, i) => {
              const cx = backX + (W - Number(t.x_mm));
              const cy = backY + Number(t.y_mm);
              const r  = holeR(t);
              return (
                <circle key={`bh${i}`} cx={cx} cy={cy} r={r}
                  fill="none" stroke={COLORS.hidden} strokeWidth={HID_W} strokeDasharray="3 2" />
              );
            })}

            {/* Arka görünüş etiketi - hafif vurgulu */}
            <ViewLabel x={backX} y={backY + H + 4} w={W} text="ARKA GÖRÜNÜM" />

            {/* Arka görünüş köşe notu */}
            <text x={backX + 2} y={backY + 9} fill={COLORS.hidden}
              fontSize={5} fontStyle="italic">
              aynalı görünüm
            </text>
          </g>

          {/* ── BOYUT OKLARI ─────────────────────────────────────────── */}
          <DimLine id={dimId("W")} x1={frontX} y1={frontY} x2={frontX + W} y2={frontY}
            text={`${W} mm`} offset={-DIM_OFF + 6} />
          <DimLine id={dimId("H")} x1={frontX} y1={frontY} x2={frontX} y2={frontY + H}
            text={`${H} mm`} offset={-DIM_OFF + 6} vertical />
          <DimLine id={dimId("D")} x1={sideX} y1={sideY} x2={sideX + D} y2={sideY}
            text={`${D} mm`} offset={-DIM_OFF + 6} />
          <DimLine id={dimId("D2")} x1={topX + W} y1={topY} x2={topX + W} y2={topY + D}
            text={`${D} mm`} offset={DIM_OFF - 6} vertical />

          {/* ── LEJANT ───────────────────────────────────────────────── */}
          {(() => {
            const lx = backX + W + 4;
            const ly = backY;
            const lw = Math.max(D - W - 4, 60);
            const lh = 70;
            // Lejant alanı yeterince geniş değilse atla
            if (lw < 50) return null;
            return (
              <g>
                <rect x={lx} y={ly} width={lw} height={lh}
                  fill={COLORS.viewBg} stroke={COLORS.border} strokeWidth={0.7} />
                <text x={lx + lw/2} y={ly + 11} fill={COLORS.labelText}
                  fontSize={7} textAnchor="middle" fontWeight={700}>
                  LEJANT
                </text>
                <line x1={lx} y1={ly + 14} x2={lx + lw} y2={ly + 14}
                  stroke={COLORS.border} strokeWidth={0.5} />
                {[
                  { y: 20, stroke: COLORS.object, sw: OBJ_W, dash: "", label: "Nesne" },
                  { y: 28, stroke: COLORS.hidden,  sw: HID_W, dash: "3 2",    label: "Gizli" },
                  { y: 36, stroke: COLORS.center,  sw: CTR_W, dash: "4 2 1 2",label: "Merkez" },
                  { y: 44, stroke: COLORS.dim,     sw: DIM_W, dash: "",        label: "Ölçü" },
                  { y: 52, stroke: COLORS.projection, sw: 0.5, dash: "4 3",   label: "Projeksiyon" },
                ].map(({ y, stroke, sw, dash, label }) => (
                  <g key={label}>
                    <line x1={lx + 4} y1={ly + y} x2={lx + 20} y2={ly + y}
                      stroke={stroke} strokeWidth={sw} strokeDasharray={dash || undefined} />
                    <text x={lx + 24} y={ly + y + 3} fill={COLORS.dimText} fontSize={5.5}>
                      {label}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

          {/* ── Dış çerçeve ──────────────────────────────────────────── */}
          <rect x={1} y={1} width={svgW - 2} height={svgH - 2}
            fill="none" stroke={COLORS.border} strokeWidth={1.2} rx={2} />
          <rect x={OUTER - 2} y={OUTER - 2}
            width={svgW - 2 * (OUTER - 2)} height={svgH - 2 * (OUTER - 2)}
            fill="none" stroke={COLORS.object} strokeWidth={0.8} />
        </svg>
      </div>
    </div>
  );
}
