import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import type { CopperDefinition } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────
interface MainDraft {
  name: string;
  width_mm: number;
  thickness_mm: number;
  phase_type: string;
  bars_per_phase: number;
  bar_gap_mm: number;
  phase_center_mm: number;
  layer_type: string;
  neutral_bar_count: number;
  busbar_x_mm: number;
  busbar_y_mm: number;
  busbar_z_mm: number;
  busbar_orientation: string;
  busbar_length_mm: number;
}

const EMPTY: MainDraft = {
  name: "",
  width_mm: 40,
  thickness_mm: 10,
  phase_type: "L1-L2-L3",
  bars_per_phase: 1,
  bar_gap_mm: 5,
  phase_center_mm: 60,
  layer_type: "Tek Kat",
  neutral_bar_count: 1,
  busbar_x_mm: 120,
  busbar_y_mm: 140,
  busbar_z_mm: 0,
  busbar_orientation: "horizontal",
  busbar_length_mm: 800,
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function hasNeutral(phaseType: string): boolean {
  return phaseType === "N-L1-L2-L3" || phaseType === "L1-L2-L3-N";
}

function phaseList(phaseType: string): string[] {
  if (phaseType === "N-L1-L2-L3") return ["N", "L1", "L2", "L3"];
  if (phaseType === "L1-L2-L3-N") return ["L1", "L2", "L3", "N"];
  return ["L1", "L2", "L3"];
}

function isNIndependent(phaseType: string): boolean {
  return phaseType === "L1-L2-L3-N";
}

function defToDraft(def: CopperDefinition): MainDraft {
  return {
    name: def.name,
    width_mm: Number(def.main_width_mm ?? 40),
    thickness_mm: Number(def.main_thickness_mm ?? 10),
    phase_type: def.phase_type ?? "L1-L2-L3",
    bars_per_phase: def.bars_per_phase ?? 1,
    bar_gap_mm: Number(def.bar_gap_mm ?? 5),
    phase_center_mm: Number(def.phase_center_mm ?? def.main_phase_spacing_mm ?? 60),
    layer_type: def.layer_type ?? "Tek Kat",
    neutral_bar_count: def.neutral_bar_count ?? 1,
    busbar_x_mm: Number(def.busbar_x_mm ?? 120),
    busbar_y_mm: Number(def.busbar_y_mm ?? 140),
    busbar_z_mm: Number(def.busbar_z_mm ?? 0),
    busbar_orientation: def.busbar_orientation ?? "horizontal",
    busbar_length_mm: Number(def.busbar_length_mm ?? 800),
  };
}

function buildPayload(draft: MainDraft): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    copper_kind: "main",
    description: null,
    main_width_mm: draft.width_mm,
    main_thickness_mm: draft.thickness_mm,
    main_material: "Cu",
    main_phase_spacing_mm: draft.phase_center_mm,
    branch_width_mm: null,
    branch_thickness_mm: null,
    branch_material: "Cu",
    branch_phase_spacing_mm: null,
    bend_inner_radius_mm: null,
    k_factor: null,
    min_hole_edge_distance_mm: null,
    min_bend_hole_distance_mm: null,
    default_hole_diameter_mm: null,
    use_slot_holes: false,
    slot_width_mm: null,
    slot_length_mm: null,
    density_g_cm3: null,
    coating_type: null,
    busbar_x_mm: draft.busbar_x_mm,
    busbar_y_mm: draft.busbar_y_mm,
    busbar_z_mm: draft.busbar_z_mm,
    busbar_orientation: draft.busbar_orientation,
    busbar_length_mm: draft.busbar_length_mm,
    phase_type: draft.phase_type,
    bars_per_phase: draft.bars_per_phase,
    bar_gap_mm: draft.bar_gap_mm,
    phase_center_mm: draft.phase_center_mm,
    layer_type: draft.layer_type,
    neutral_bar_count: hasNeutral(draft.phase_type) ? draft.neutral_bar_count : null,
  };
}

// ─── SVG Önizleme (Enine Kesit — Yan Görünüş) ─────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  L1: "#d4a017",
  L2: "#27ae60",
  L3: "#c0392b",
  N: "#2980b9",
};

/** Yatay boyut oku */
function DimLineH({
  x1, x2, y, label, color = "#e74c3c",
}: { x1: number; x2: number; y: number; label: string; color?: string }) {
  const cx = (x1 + x2) / 2;
  const arr = 5;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={0.8} />
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={color} strokeWidth={0.8} />
      <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke={color} strokeWidth={0.8} />
      <polyline points={`${x1 + arr},${y - arr / 2} ${x1},${y} ${x1 + arr},${y + arr / 2}`} stroke={color} strokeWidth={0.8} fill="none" />
      <polyline points={`${x2 - arr},${y - arr / 2} ${x2},${y} ${x2 - arr},${y + arr / 2}`} stroke={color} strokeWidth={0.8} fill="none" />
      <rect x={cx - 20} y={y - 12} width={40} height={11} fill="#1a1f2b" />
      <text x={cx} y={y - 3} textAnchor="middle" fontSize="9" fill={color} fontFamily="monospace">{label}</text>
    </g>
  );
}

/** Dikey boyut oku */
function DimLineV({
  x, y1, y2, label, color = "#3498db",
}: { x: number; y1: number; y2: number; label: string; color?: string }) {
  const cy = (y1 + y2) / 2;
  const arr = 5;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={0.8} />
      <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} stroke={color} strokeWidth={0.8} />
      <line x1={x - 3} y1={y2} x2={x + 3} y2={y2} stroke={color} strokeWidth={0.8} />
      <polyline points={`${x - arr / 2},${y1 + arr} ${x},${y1} ${x + arr / 2},${y1 + arr}`} stroke={color} strokeWidth={0.8} fill="none" />
      <polyline points={`${x - arr / 2},${y2 - arr} ${x},${y2} ${x + arr / 2},${y2 - arr}`} stroke={color} strokeWidth={0.8} fill="none" />
      <rect x={x - 22} y={cy - 6} width={44} height={12} fill="#1a1f2b" />
      <text x={x} y={cy + 4} textAnchor="middle" fontSize="9" fill={color} fontFamily="monospace"
        transform={`rotate(-90,${x},${cy})`}>{label}</text>
    </g>
  );
}

// ─── Ortak: SVG başlık bandı ─────────────────────────────────────────────────
function ViewHeader({ svgW, label, accent, id }: {
  svgW: number; label: string; accent: string; id: string;
}) {
  const H = 26;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={svgW} height={H} fill={`url(#${id})`} />
      <rect x={0} y={H - 1} width={svgW} height={1} fill={accent} opacity={0.45} />
      <circle cx={14} cy={H / 2} r={4.5} fill={accent} opacity={0.85} />
      <text x={26} y={H / 2 + 4} fontSize={10.5} fill={accent}
        fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="0.5">
        {label}
      </text>
    </g>
  );
}

// ─── Görünüş 1: Enine Kesit ───────────────────────────────────────────────────
function CrossSectionView({ draft }: { draft: MainDraft }) {
  const phases  = phaseList(draft.phase_type);
  const nInd    = isNIndependent(draft.phase_type);
  const isDouble = draft.layer_type === "Çift Kat";

  const barWmm  = Math.max(draft.width_mm, 1);
  const barTmm  = Math.max(draft.thickness_mm, 1);
  const bpc     = Math.max(draft.bars_per_phase, 1);
  const gapMm   = Math.max(draft.bar_gap_mm, 0);
  const pCenMm  = Math.max(draft.phase_center_mm, 1);
  const nBC     = Math.max(draft.neutral_bar_count || 1, 1);
  const layerGapMm = 8;

  const phGroupW = (bc: number) => bc * barWmm + Math.max(0, bc - 1) * gapMm;
  const lGroupW  = phGroupW(bpc);
  const nGroupW  = phGroupW(nBC);
  const lPhases  = nInd ? phases.filter((p) => p !== "N") : phases;
  const nLPh     = lPhases.length;
  const lTotalW  = (nLPh - 1) * pCenMm + lGroupW;
  const nGapMm   = 50;
  const contentW = nInd ? lTotalW + nGapMm + nGroupW : lTotalW;
  const contentH = isDouble ? 2 * barTmm + layerGapMm : barTmm;

  const SVG_W  = 520;
  const HEADER = 26;
  const LEFT   = 58;
  const RIGHT  = 14;
  const TOP    = HEADER + 38;   // faz merkez dim okları için boşluk
  const MID    = 26;
  const BOT    = 28;
  const availW = SVG_W - LEFT - RIGHT;
  const availH = 100;
  const sc     = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1), 5.5);

  const barsW  = contentW * sc;
  const barsH  = contentH * sc;
  const bx0    = LEFT + (availW - barsW) / 2;
  const by0    = TOP;
  const SVG_H  = TOP + barsH + MID + BOT;

  const centers: Record<string, number> = {};
  lPhases.forEach((ph, i) => {
    centers[ph] = bx0 + (i * pCenMm + lGroupW / 2) * sc;
  });
  if (nInd) {
    centers["N"] = bx0 + (lTotalW + nGapMm + nGroupW / 2) * sc;
  } else {
    const nIdx = phases.indexOf("N");
    if (nIdx >= 0) centers["N"] = bx0 + (nIdx * pCenMm + lGroupW / 2) * sc;
  }

  const getBC    = (ph: string) => (ph === "N" ? nBC : bpc);
  const getGWpx  = (ph: string) => phGroupW(getBC(ph)) * sc;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${Math.ceil(SVG_H)}`}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#1a1f2b", display: "block" }}>
      <ViewHeader svgW={SVG_W} label="ENİNE KESİT — YAN GÖRÜNÜŞ" accent="#e74c3c" id="hdr-cross" />

      {/* Faz merkez boyut okları */}
      {phases.map((ph, pi) => {
        if (pi === 0) return null;
        const prev = phases[pi - 1];
        if (nInd && (ph === "N" || prev === "N")) return null;
        const c1 = centers[prev]; const c2 = centers[ph];
        if (c1 == null || c2 == null) return null;
        return <DimLineH key={`dim-${pi}`} x1={c1} x2={c2} y={TOP - 14} label={`${pCenMm} mm`} color="#e74c3c" />;
      })}

      {phases.map((ph) => {
        const bc = getBC(ph); const gWpx = getGWpx(ph);
        const bWpx = barWmm * sc; const bTpx = barTmm * sc;
        const color = PHASE_COLORS[ph] ?? "#aaa";
        const cx = centers[ph];
        if (cx == null) return null;
        const gStartX = cx - gWpx / 2;
        return (
          <g key={ph}>
            <text x={cx} y={by0 + barsH + MID + 15} textAnchor="middle"
              fontSize={11} fill={color} fontWeight="bold" fontFamily="monospace">{ph}</text>
            {Array.from({ length: bc }, (_, bi) => {
              const barX = gStartX + bi * (barWmm + gapMm) * sc;
              return (
                <g key={bi}>
                  <rect x={barX} y={by0} width={bWpx} height={bTpx}
                    fill={color} opacity={0.88} rx={1} stroke={color} strokeWidth={0.5} />
                  {isDouble && (
                    <rect x={barX} y={by0 + bTpx + layerGapMm * sc} width={bWpx} height={bTpx}
                      fill={color} opacity={0.62} rx={1} stroke={color} strokeWidth={0.5} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Genişlik dim oku */}
      {(() => {
        const ph = lPhases[0] ?? phases[0]; if (!ph) return null;
        const gWpx = getGWpx(ph); const bWpx = barWmm * sc;
        const cx = centers[ph]; if (cx == null) return null;
        const gStartX = cx - gWpx / 2;
        return <DimLineH x1={gStartX} x2={gStartX + bWpx} y={by0 + barsH + 14} label={`${draft.width_mm} mm`} color="#9b59b6" />;
      })()}

      {/* Kalınlık dim oku */}
      <DimLineV x={LEFT - 14} y1={by0} y2={by0 + barTmm * sc} label={`${draft.thickness_mm} mm`} color="#3498db" />

      {isDouble && (
        <text x={LEFT - 14} y={by0 + barTmm * sc + layerGapMm * sc / 2 + 4}
          textAnchor="middle" fontSize={7} fill="#475569" fontFamily="system-ui">×2</text>
      )}
    </svg>
  );
}

// ─── Görünüş 2: Ön Görünüş ───────────────────────────────────────────────────
function FrontView({ draft }: { draft: MainDraft }) {
  const phases   = phaseList(draft.phase_type);
  const nInd     = isNIndependent(draft.phase_type);
  const isDouble = draft.layer_type === "Çift Kat";

  const barWmm   = Math.max(draft.width_mm, 1);       // barın eni (dikey görünür)
  const barTmm   = Math.max(draft.thickness_mm, 1);   // barın kalınlığı (çift kat için)
  const barLmm   = Math.max(draft.busbar_length_mm, 1); // bara uzunluğu (yatay)
  const pCenMm   = Math.max(draft.phase_center_mm, 1);
  const bpc      = Math.max(draft.bars_per_phase, 1);
  const nBC      = Math.max(draft.neutral_bar_count || 1, 1);
  const layerOffMm = barTmm + 3; // çift katta iki barın Y kayması (hafif)

  const getBC  = (ph: string) => (ph === "N" ? nBC : bpc);
  const lPhases = nInd ? phases.filter((p) => p !== "N") : phases;
  const nLPh   = lPhases.length;

  // İçerik boyutları mm
  const contentW = barLmm;
  const lContentH = (nLPh - 1) * pCenMm + barWmm;
  const nContentH = nInd ? (getBC("N") > 1 ? pCenMm : 0) + barWmm : 0;
  const contentH  = nInd
    ? Math.max(lContentH, nContentH)
    : (phases.length - 1) * pCenMm + barWmm;

  const SVG_W  = 520;
  const HEADER = 26;
  const LEFT   = 58;   // faz etiketleri
  const RIGHT  = 14;
  const TOP    = HEADER + 14;
  const BOT    = 30;   // uzunluk dim oku
  const availW = SVG_W - LEFT - RIGHT;
  const availH = 160;
  const sc     = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1), 4.0);

  const barsW  = contentW * sc;
  const barsH  = contentH * sc;
  const bx0    = LEFT + (availW - barsW) / 2;
  const by0    = TOP + (availH - barsH) / 2;
  const SVG_H  = TOP + availH + BOT;

  // Faz merkez Y pozisyonları
  const pCenterY: Record<string, number> = {};
  if (nInd) {
    lPhases.forEach((ph, i) => { pCenterY[ph] = by0 + (i * pCenMm + barWmm / 2) * sc; });
    pCenterY["N"] = by0 + (barWmm / 2) * sc; // N sola hizalı (ayrı grup)
  } else {
    phases.forEach((ph, i) => { pCenterY[ph] = by0 + (i * pCenMm + barWmm / 2) * sc; });
  }

  // Çift kat X offset (iki bar üst üste görünmesi için hafif kayma)
  const doubleOffX = isDouble ? Math.max(3, layerOffMm * sc * 0.15) : 0;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${Math.ceil(SVG_H)}`}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#1a1f2b", display: "block" }}>
      <ViewHeader svgW={SVG_W} label="ÖN GÖRÜNÜŞ — UZUNLUK × GENİŞLİK" accent="#3498db" id="hdr-front" />

      {/* Barlar */}
      {phases.map((ph) => {
        const bc     = getBC(ph);
        const color  = PHASE_COLORS[ph] ?? "#aaa";
        const cy     = pCenterY[ph];
        if (cy == null) return null;
        const barH   = barWmm * sc;
        const barY   = cy - barH / 2;

        // N bağımsız ise sağa kaydır
        const barX = (nInd && ph === "N")
          ? bx0 + barsW + 20
          : bx0;
        const barW2 = (nInd && ph === "N") ? barH * 1.2 : barsW; // N dar göster

        return (
          <g key={ph}>
            {/* Faz etiketi (sol taraf) */}
            <text x={barX - 6} y={cy + 4} textAnchor="end"
              fontSize={11} fill={color} fontWeight="bold" fontFamily="monospace">{ph}</text>

            {/* Çift kat gölge (arka bar) */}
            {isDouble && (
              <rect x={barX + doubleOffX * 2} y={barY + 3} width={barW2} height={barH}
                fill={color} opacity={0.28} rx={1} />
            )}
            {/* Ana bar */}
            <rect x={barX} y={barY} width={barW2} height={barH}
              fill={color} opacity={0.85} rx={1} stroke={color} strokeWidth={0.6} />

            {/* bars_per_phase > 1: ince çizgi ile ikinci bar vurgusu */}
            {bc > 1 && !isDouble && (
              <rect x={barX} y={barY + barH + 2} width={barW2} height={barH}
                fill={color} opacity={0.45} rx={1} stroke={color} strokeWidth={0.4} />
            )}
          </g>
        );
      })}

      {/* Faz aralığı dim oku (solda dikey) — ilk iki faz arası */}
      {lPhases.length >= 2 && (() => {
        const y1 = pCenterY[lPhases[0]];
        const y2 = pCenterY[lPhases[1]];
        if (y1 == null || y2 == null) return null;
        return <DimLineV x={bx0 - 14} y1={y1} y2={y2} label={`${pCenMm} mm`} color="#e74c3c" />;
      })()}

      {/* Bar genişliği dim oku (sağda dikey) */}
      {(() => {
        const ph = lPhases[0] ?? phases[0]; if (!ph) return null;
        const cy = pCenterY[ph]; if (cy == null) return null;
        const barH = barWmm * sc;
        return <DimLineV x={bx0 + barsW + 14} y1={cy - barH / 2} y2={cy + barH / 2}
          label={`${draft.width_mm} mm`} color="#9b59b6" />;
      })()}

      {/* Uzunluk dim oku (altta yatay) */}
      <DimLineH x1={bx0} x2={bx0 + barsW} y={by0 + barsH + 18} label={`${draft.busbar_length_mm} mm`} color="#3498db" />
    </svg>
  );
}

// ─── Görünüş 3: Üst Görünüş ──────────────────────────────────────────────────
function TopView({ draft }: { draft: MainDraft }) {
  const phases   = phaseList(draft.phase_type);
  const nInd     = isNIndependent(draft.phase_type);
  const isDouble = draft.layer_type === "Çift Kat";

  const barTmm  = Math.max(draft.thickness_mm, 1);   // yukarıdan görünen kalınlık
  const barLmm  = Math.max(draft.busbar_length_mm, 1);
  const pCenMm  = Math.max(draft.phase_center_mm, 1);
  const bpc     = Math.max(draft.bars_per_phase, 1);
  const nBC     = Math.max(draft.neutral_bar_count || 1, 1);
  const gapMm   = Math.max(draft.bar_gap_mm, 0);
  const layerGapMm = 6;

  const getBC   = (ph: string) => (ph === "N" ? nBC : bpc);
  const lPhases = nInd ? phases.filter((p) => p !== "N") : phases;
  const nLPh    = lPhases.length;

  // Bir fazın Y boyutu: bpc * barT + (bpc-1)*gap + (isDouble ? barT+layerGap : 0)
  const phGroupH = (bc: number) => bc * barTmm + Math.max(0, bc - 1) * gapMm + (isDouble ? barTmm + layerGapMm : 0);
  const lGroupH  = phGroupH(bpc);
  const nGroupH  = phGroupH(nBC);

  const lTotalH  = (nLPh - 1) * pCenMm + lGroupH;
  const nGapMm   = 50;
  const contentW = barLmm;
  const contentH = nInd ? Math.max(lTotalH, nGroupH) + nGapMm + nGroupH * 0.5 : lTotalH;

  const SVG_W  = 520;
  const HEADER = 26;
  const LEFT   = 58;
  const RIGHT  = 50;  // faz etiketleri için
  const TOP    = HEADER + 14;
  const BOT    = 30;
  const availW = SVG_W - LEFT - RIGHT;
  const availH = 180;
  const sc     = Math.min(availW / Math.max(contentW, 1), availH / Math.max(contentH, 1), 5.0);

  const barsW  = contentW * sc;
  const barsH  = contentH * sc;
  const bx0    = LEFT + (availW - barsW) / 2;
  const by0    = TOP + (availH - barsH) / 2;
  const SVG_H  = TOP + availH + BOT;

  // Faz merkez Y (her fazın ilk barının üst kenarı → grup ortası)
  const pTopY: Record<string, number> = {};
  if (nInd) {
    lPhases.forEach((ph, i) => { pTopY[ph] = by0 + i * pCenMm * sc; });
    pTopY["N"] = by0 + (lTotalH + nGapMm) * sc;
  } else {
    phases.forEach((ph, i) => { pTopY[ph] = by0 + i * pCenMm * sc; });
  }

  return (
    <svg viewBox={`0 0 ${SVG_W} ${Math.ceil(SVG_H)}`}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#1a1f2b", display: "block" }}>
      <ViewHeader svgW={SVG_W} label="ÜST GÖRÜNÜŞ — DÖŞEME PLANI" accent="#27ae60" id="hdr-top" />

      {phases.map((ph) => {
        const bc    = getBC(ph);
        const color = PHASE_COLORS[ph] ?? "#aaa";
        const topY  = pTopY[ph];
        if (topY == null) return null;
        const bTpx  = barTmm * sc;
        const blPx  = barsW;

        // Grup merkezi Y (etiket için)
        const groupH = phGroupH(bc) * sc;
        const groupCY = topY + groupH / 2;

        return (
          <g key={ph}>
            {/* Faz etiketi (sağ taraf) */}
            <text x={bx0 + blPx + 8} y={groupCY + 4} fontSize={11}
              fill={color} fontWeight="bold" fontFamily="monospace">{ph}</text>

            {Array.from({ length: bc }, (_, bi) => {
              const barY = topY + bi * (barTmm + gapMm) * sc;
              return (
                <g key={bi}>
                  {/* Kat 1 */}
                  <rect x={bx0} y={barY} width={blPx} height={bTpx}
                    fill={color} opacity={0.85} rx={1} stroke={color} strokeWidth={0.5} />
                  {/* Kat 2 (çift kat) */}
                  {isDouble && (
                    <rect x={bx0} y={barY + bTpx + layerGapMm * sc} width={blPx} height={bTpx}
                      fill={color} opacity={0.55} rx={1} stroke={color} strokeWidth={0.5} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Faz aralığı dim oku (solda dikey) */}
      {lPhases.length >= 2 && (() => {
        const y1 = pTopY[lPhases[0]]; const y2 = pTopY[lPhases[1]];
        if (y1 == null || y2 == null) return null;
        return <DimLineV x={bx0 - 14} y1={y1} y2={y2} label={`${pCenMm} mm`} color="#e74c3c" />;
      })()}

      {/* Kalınlık dim oku (solda, ilk barın kalınlığı) */}
      {(() => {
        const ph = lPhases[0] ?? phases[0]; if (!ph) return null;
        const topY = pTopY[ph]; if (topY == null) return null;
        const bTpx = barTmm * sc;
        return <DimLineV x={bx0 - 34} y1={topY} y2={topY + bTpx} label={`${draft.thickness_mm} mm`} color="#9b59b6" />;
      })()}

      {/* Uzunluk dim oku (altta yatay) */}
      <DimLineH x1={bx0} x2={bx0 + barsW} y={by0 + barsH + 18} label={`${draft.busbar_length_mm} mm`} color="#27ae60" />
    </svg>
  );
}

// ─── Ana önizleme bileşeni (tab switcher) ────────────────────────────────────
type ViewKey = "cross" | "front" | "top";

const VIEW_TABS: { key: ViewKey; label: string; accent: string }[] = [
  { key: "cross", label: "Enine Kesit",  accent: "#e74c3c" },
  { key: "front", label: "Ön Görünüş",  accent: "#3498db" },
  { key: "top",   label: "Üst Görünüş", accent: "#27ae60" },
];

function BusbarPreview({ draft }: { draft: MainDraft }) {
  const [view, setView] = useState<ViewKey>("cross");
  const activeAccent = VIEW_TABS.find((t) => t.key === view)?.accent ?? "#e74c3c";

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: "0.6rem", borderBottom: "2px solid var(--line)" }}>
        {VIEW_TABS.map(({ key, label, accent }) => {
          const isActive = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.82rem",
                fontWeight: isActive ? 700 : 400,
                border: "none",
                borderBottom: isActive ? `2px solid ${accent}` : "2px solid transparent",
                background: "transparent",
                color: isActive ? accent : "var(--muted)",
                cursor: "pointer",
                marginBottom: "-2px",
                transition: "color 0.12s",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              {isActive && (
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: accent, display: "inline-block", flexShrink: 0,
                }} />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Aktif görünüş */}
      <div style={{ border: `1px solid ${activeAccent}22`, borderRadius: 7 }}>
        {view === "cross" && <CrossSectionView draft={draft} />}
        {view === "front" && <FrontView draft={draft} />}
        {view === "top"   && <TopView draft={draft} />}
      </div>
    </div>
  );
}

// ─── Bölüm başlığı yardımcısı ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", marginBottom: "0.15rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        {children}
      </span>
    </div>
  );
}

// ─── Sayfa bileşeni ────────────────────────────────────────────────────────
export function MainCopperFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [draft, setDraft] = useState<MainDraft>(EMPTY);
  const [draftLoaded, setDraftLoaded] = useState(!isEditing);

  // Düzenleme modunda mevcut tanımı yükle
  const definitionQuery = useQuery({
    queryKey: ["copper-definition", id],
    queryFn: () => client.getCopperDefinition(Number(id)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (definitionQuery.data && !draftLoaded) {
      setDraft(defToDraft(definitionQuery.data));
      setDraftLoaded(true);
    }
  }, [definitionQuery.data, draftLoaded]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["copper-definitions", "main"] });

  const createMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(buildPayload(draft)),
    onSuccess: async () => {
      await invalidate();
      navigate("/definitions/copper/main");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      client.updateCopperDefinition(Number(id), buildPayload(draft)),
    onSuccess: async () => {
      await invalidate();
      navigate("/definitions/copper/main");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function set<K extends keyof MainDraft>(key: K, value: MainDraft[K]) {
    setDraft((v) => ({ ...v, [key]: value }));
  }

  if (isEditing && definitionQuery.isLoading) {
    return (
      <div className="stack">
        <div style={{ padding: "2rem", color: "var(--muted)", textAlign: "center" }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* ── Başlık ── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Ana Bakır Tanımlama</span>
          <h1>{isEditing ? "Bakırı Düzenle" : "Yeni Ana Bakır"}</h1>
          {isEditing && definitionQuery.data && (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {definitionQuery.data.name}
            </p>
          )}
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => navigate("/definitions/copper/main")}
        >
          ← Listeye Dön
        </button>
      </section>

      {/* ── İki sütun: Form | Önizleme ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* SOL: Form */}
        <section className="card">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              isEditing ? updateMutation.mutate() : createMutation.mutate();
            }}
          >
            <SectionLabel>Genel Bilgiler</SectionLabel>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Ana Bakır Adı</span>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus={!isEditing}
              />
            </label>

            <label className="field">
              <span>Genişlik (mm)</span>
              <input className="input" type="number" min={1} value={draft.width_mm}
                onChange={(e) => set("width_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Kalınlık (mm)</span>
              <input className="input" type="number" min={1} value={draft.thickness_mm}
                onChange={(e) => set("thickness_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Kat Tipi</span>
              <select className="input" value={draft.layer_type}
                onChange={(e) => set("layer_type", e.target.value)}>
                <option value="Tek Kat">Tek Kat</option>
                <option value="Çift Kat">Çift Kat</option>
              </select>
            </label>

            <SectionLabel>Elektriksel Yerleşim</SectionLabel>

            <label className="field">
              <span>Faz Tipi</span>
              <select className="input" value={draft.phase_type}
                onChange={(e) => set("phase_type", e.target.value)}>
                <option value="L1-L2-L3">L1 — L2 — L3</option>
                <option value="N-L1-L2-L3">N — L1 — L2 — L3</option>
                <option value="L1-L2-L3-N">L1 — L2 — L3 — N</option>
              </select>
            </label>

            <label className="field">
              <span>Faz Miktarı (adet/faz)</span>
              <input className="input" type="number" min={1} max={8} value={draft.bars_per_phase}
                onChange={(e) => set("bars_per_phase", Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Faz İçi Aralığı (mm)</span>
              <input className="input" type="number" min={0} value={draft.bar_gap_mm}
                onChange={(e) => set("bar_gap_mm", Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Fazlar Arası Aralık (mm)</span>
              <input className="input" type="number" min={1} value={draft.phase_center_mm}
                onChange={(e) => set("phase_center_mm", Number(e.target.value))} />
            </label>

            {hasNeutral(draft.phase_type) && (
              <label className="field">
                <span>Nötr Bakır Miktarı (adet)</span>
                <input className="input" type="number" min={1} max={8} value={draft.neutral_bar_count}
                  onChange={(e) => set("neutral_bar_count", Number(e.target.value))} />
              </label>
            )}

            <SectionLabel>Konum</SectionLabel>

            <label className="field">
              <span>X (mm)</span>
              <input className="input" type="number" value={draft.busbar_x_mm}
                onChange={(e) => set("busbar_x_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Y (mm)</span>
              <input className="input" type="number" value={draft.busbar_y_mm}
                onChange={(e) => set("busbar_y_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Z (mm)</span>
              <input className="input" type="number" value={draft.busbar_z_mm}
                onChange={(e) => set("busbar_z_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Uzunluk (mm)</span>
              <input className="input" type="number" value={draft.busbar_length_mm}
                onChange={(e) => set("busbar_length_mm", Number(e.target.value))} />
            </label>

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? "Kaydediliyor..." : (isEditing ? "Güncelle" : "Kaydet")}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => navigate("/definitions/copper/main")}
              >
                İptal
              </button>
            </div>
          </form>
        </section>

        {/* SAĞ: Canlı Önizleme */}
        <section className="card">
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.75rem" }}>
            Canlı Önizleme
          </div>
          <BusbarPreview draft={draft} />

          {/* Özet bilgiler */}
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {[
              ["Faz Tipi", draft.phase_type],
              ["Kat Tipi", draft.layer_type],
              ["Faz Miktarı", `${draft.bars_per_phase} adet/faz`],
              ["Faz İçi Aralığı", `${draft.bar_gap_mm} mm`],
              ["Fazlar Arası", `${draft.phase_center_mm} mm`],
              ...(hasNeutral(draft.phase_type) ? [["Nötr Miktarı", `${draft.neutral_bar_count} adet`]] : []),
              ["Kesit", `${draft.width_mm} × ${draft.thickness_mm} mm`],
              ["Uzunluk", `${draft.busbar_length_mm} mm`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "var(--surface)", borderRadius: "4px", padding: "0.4rem 0.6rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
