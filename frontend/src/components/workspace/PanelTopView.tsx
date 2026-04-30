/**
 * PanelTopView — Üst Görünüm (XZ düzlemi)
 *
 * Koordinat projeksiyonu (yukarıdan bakış):
 *   SVG X  ←→  X (genişlik, soldan sağa)
 *   SVG Y  ←→  Z (derinlik, ↓ = arka yön; 0 = ön yüzey üstte)
 *
 * Üç render modu:
 *   1. Sadece cihaz gölgeleri (Sekme 2)
 *   2. Cihaz gölgeleri + CopperSettings overlay (Sekme 3, canlı önizleme)
 *   3. Cihaz gölgeleri + hesaplanmış Busbar segmentleri (Sekme 5, sonuçlar)
 */

import type { Busbar, CopperSettings, Panel, ProjectDevice, ProjectPanel } from "../../types";
import {
  arrowPath,
  buildCabinetLayouts,
  deviceBoxes,
  DEVICE_COLORS,
  PHASE_COLORS,
  PHASE_LABELS,
  phaseColorIndex,
  type BarRow,
} from "./viewHelpers";

interface PanelTopViewProps {
  panel?: Panel | null;
  projectPanels?: ProjectPanel[];
  devices?: ProjectDevice[];
  copperSettings?: CopperSettings | null;
  /** Hesaplanmış sonuçlar — varsa segment çizgisi, yoksa CopperSettings overlay */
  busbars?: Busbar[];
  /** Düzenlenmiş bar koordinatları — varsa CS overlay yerine bunlar kullanılır */
  barRows?: BarRow[];
  title?: string;
}

// SVG koordinat sabitleri
const SVG_W = 420;
const PAD_L = 52;  // sol: Z ekseni etiketi + boyut çizgisi
const PAD_R = 30;
const PAD_T = 28;  // üst: kabin etiketi için
const PAD_B = 44;  // alt: X ekseni oku + boyut çizgisi

export function PanelTopView({
  panel,
  projectPanels = [],
  devices = [],
  copperSettings,
  busbars,
  barRows,
  title = "Üst Görünüm (XZ)",
}: PanelTopViewProps) {
  if (!panel) {
    return (
      <section className="table-card" style={{ marginTop: 0 }}>
        <div className="empty-state" style={{ padding: "2rem 0" }}>
          Üst görünüm için kabin bilgisi gerekiyor.
        </div>
      </section>
    );
  }

  const { layouts, totalWidth: TW, maxDepth: rawMD } = buildCabinetLayouts(
    projectPanels,
    panel,
  );
  const MD = rawMD > 0 ? rawMD : 300;

  const boxes = deviceBoxes(devices, layouts);

  // Ölçekleme: X × Z → SVG drawW × drawH
  const availW = SVG_W - PAD_L - PAD_R;
  const availH = 240;
  const scale  = TW > 0 && MD > 0
    ? Math.min(availW / TW, availH / MD)
    : 1;

  const drawW = TW * scale;
  const drawH = MD * scale;
  const SVG_H = PAD_T + drawH + PAD_B;

  /** X (mm, assembly solundan) → SVG x */
  const svgX = (x: number) => PAD_L + x * scale;
  /** Z (mm, ön yüzeyden) → SVG y (↓ = arka yön) */
  const svgZ = (z: number) => PAD_T + z * scale;

  // ── CopperSettings overlay parametreleri ──────────────────────────────────
  const cs           = copperSettings;
  const hasSegments  = (busbars?.length ?? 0) > 0;
  const phaseCount   = Math.min(Number(cs?.busbar_phase_count ?? 3), 5);
  const barsPerPhase = Math.max(1, Number(cs?.bars_per_phase ?? 1));
  const barGap       = Number(cs?.bar_gap_mm ?? 0);
  const barT         = Number(cs?.main_thickness_mm ?? 5);  // Z yönünde kalınlık
  const barStep      = barT + barGap;   // faz içi adım
  const spacing      = Number(cs?.main_phase_spacing_mm ?? 60);
  const stackAxis    = (cs?.phase_stack_axis ?? "Y").toUpperCase();
  const busX         = Number(cs?.busbar_x_mm ?? 0);
  const busZ         = Number(cs?.busbar_z_mm ?? 0);
  const busLen       = Number(cs?.busbar_length_mm ?? 0);
  const firstLayout  = layouts[0];

  return (
    <section className="table-card" style={{ marginTop: 0 }}>
      <div className="section-header" style={{ marginBottom: "0.5rem" }}>
        <h3>{title}</h3>
        <span className="helper-text" style={{ fontSize: "0.82rem" }}>
          X = genişlik&ensp;·&ensp;Z = derinlik (↓ arka yön)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{
          display: "block",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        {/* ── Kabin gövdeleri (XZ gölgesi) ────────────────────────────── */}
        {layouts.map((cl) => {
          const cx = svgX(cl.assemblyX);
          const cw = cl.cW * scale;
          const ch = cl.cD * scale; // derinlik = SVG'de yükseklik

          return (
            <g key={cl.id}>
              {/* Ana kabin dikdörtgeni */}
              <rect
                x={cx} y={PAD_T}
                width={cw} height={ch}
                fill="#d8d8d8" stroke="#1a1a1a" strokeWidth={1.5}
              />
              {/* Ön yüzey vurgusu (SVG'de üst kenar) */}
              <rect
                x={cx} y={PAD_T}
                width={cw} height={Math.max(3, 3 * scale)}
                fill="#b0b0b0"
              />
              {/* İç alan (kesik çizgi) */}
              <rect
                x={cx + cl.lm * scale}
                y={PAD_T}
                width={(cl.cW - cl.lm - cl.rm) * scale}
                height={ch}
                fill="#f0f6ff"
                stroke="#3366cc"
                strokeWidth={0.5}
                strokeDasharray="4 3"
              />
              {/* Kabin etiketi (üstte) */}
              <text
                x={cx + cw / 2} y={PAD_T - 5}
                textAnchor="middle" fontSize={9} fill="#444"
                fontFamily="'Segoe UI', sans-serif"
              >
                {cl.label}
              </text>
            </g>
          );
        })}

        {/* ── Cihazlar (XZ gölgesi) ────────────────────────────────────── */}
        {boxes.map((box, i) => {
          const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
          const sx = svgX(box.x);
          const sz = svgZ(box.z);
          const sw = Math.max(box.w * scale, 2);
          const sh = Math.max(box.d * scale, 2);
          const fs = Math.min(8, sh * 0.5, sw * 0.15);
          return (
            <g key={i}>
              <rect
                x={sx} y={sz} width={sw} height={sh}
                fill={fill} stroke={stroke} strokeWidth={1}
                rx={1} opacity={0.85}
              />
              {fs >= 4 && sh > 7 && sw > 14 && (
                <text
                  x={sx + sw / 2} y={sz + sh / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fill={stroke} fontWeight="600"
                  fontFamily="'Segoe UI', sans-serif"
                >
                  {box.label}
                </text>
              )}
            </g>
          );
        })}

        {/* ── CopperSettings overlay — barRows varsa kesin koordinatlar, yoksa formül ── */}
        {cs && !hasSegments && cs.busbar_x_mm != null && cs.busbar_z_mm != null && busLen > 0 &&
          firstLayout && (() => {
          const barStartX = svgX(firstLayout.intLeft + busX);
          const barWidth  = Math.max(busLen * scale, 4);

          if (barRows && barRows.length > 0) {
            return barRows.map((row) => {
              const phaseIdx = PHASE_LABELS.indexOf(row.phase);
              const color = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];
              const barZ  = row.zCenter - barT / 2;
              const barH  = Math.max(barT * scale, 2);
              const bx    = svgX(firstLayout.intLeft + row.xStart - (cs.busbar_x_mm ?? 0) + (cs.busbar_x_mm ?? 0));
              return (
                <g key={`br-${row.key}`}>
                  <rect x={barStartX} y={svgZ(barZ)} width={barWidth} height={barH}
                    fill={color} opacity={0.75} rx={1} stroke={color} strokeWidth={0.5} />
                  {barH > 8 && (
                    <text x={barStartX + 4} y={svgZ(barZ) + barH / 2}
                      dominantBaseline="middle"
                      fontSize={Math.min(7, barH * 0.7)}
                      fill="#fff" fontWeight="700" fontFamily="monospace">
                      {row.key}
                    </text>
                  )}
                </g>
              );
            });
          }

          return Array.from({ length: phaseCount }, (_, pi) =>
            Array.from({ length: barsPerPhase }, (__, bi) => {
              const color = PHASE_COLORS[pi] ?? PHASE_COLORS[0];
              // fazlar phase_stack_axis yönünde; barlar her zaman Z'de
              const barZ = stackAxis === "Z"
                ? busZ + pi * spacing + bi * barStep
                : busZ + bi * barStep;
              const barH = Math.max(barT * scale, 2);
              const label = barsPerPhase > 1 ? `L${pi + 1}·${bi + 1}` : `L${pi + 1}`;
              return (
                <g key={`cs-${pi}-${bi}`}>
                  <rect x={barStartX} y={svgZ(barZ)} width={barWidth} height={barH}
                    fill={color} opacity={barsPerPhase > 1 ? 0.65 - bi * 0.08 : 0.75}
                    rx={1} stroke={color} strokeWidth={0.5} />
                  {barH > 8 && bi === 0 && (
                    <text x={barStartX + 4} y={svgZ(barZ) + barH / 2}
                      dominantBaseline="middle"
                      fontSize={Math.min(7, barH * 0.7)}
                      fill="#fff" fontWeight="700" fontFamily="monospace">
                      {label}
                    </text>
                  )}
                </g>
              );
            })
          );
        })()}

        {/* ── Hesaplanmış busbar segmentleri (XZ projeksiyonu) ─────────── */}
        {hasSegments && busbars!.flatMap((b) => {
          const color = PHASE_COLORS[phaseColorIndex(b.phase)];
          const sw    = b.busbar_type === "main" ? 3 : 1.5;
          return b.segments.flatMap((seg, si) => {
            const x1 = svgX(Number(seg.start_x_mm ?? 0));
            const y1 = svgZ(Number(seg.start_z_mm ?? 0));
            const x2 = svgX(Number(seg.end_x_mm   ?? 0));
            const y2 = svgZ(Number(seg.end_z_mm   ?? 0));
            // Yalnızca XZ düzleminde hareket eden segmentleri çiz
            if (Math.abs(x1 - x2) < 0.4 && Math.abs(y1 - y2) < 0.4) return [];
            return [
              <line
                key={`${b.id}-${si}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth={sw}
                opacity={b.busbar_type === "main" ? 0.95 : 0.75}
                strokeLinecap="round"
              />,
            ];
          });
        })}

        {/* ── Koordinat eksenleri ───────────────────────────────────────── */}
        {/* X ekseni → */}
        <line
          x1={PAD_L} y1={PAD_T + drawH + 20}
          x2={PAD_L + Math.min(36, drawW * 0.3)} y2={PAD_T + drawH + 20}
          stroke="#e53935" strokeWidth={1}
        />
        <path
          d={arrowPath(PAD_L, PAD_T + drawH + 20,
            PAD_L + Math.min(36, drawW * 0.3), PAD_T + drawH + 20, 4)}
          stroke="#e53935" strokeWidth={1} fill="none"
        />
        <text
          x={PAD_L + Math.min(36, drawW * 0.3) + 4}
          y={PAD_T + drawH + 24}
          fontSize={8} fill="#e53935" fontFamily="monospace"
        >X</text>

        {/* Z ekseni ↓ */}
        <line
          x1={PAD_L - 20} y1={PAD_T}
          x2={PAD_L - 20} y2={PAD_T + Math.min(36, drawH * 0.35)}
          stroke="#e53935" strokeWidth={1}
        />
        <path
          d={arrowPath(PAD_L - 20, PAD_T,
            PAD_L - 20, PAD_T + Math.min(36, drawH * 0.35), 4)}
          stroke="#e53935" strokeWidth={1} fill="none"
        />
        <text
          x={PAD_L - 16}
          y={PAD_T + Math.min(36, drawH * 0.35) + 10}
          fontSize={8} fill="#e53935" fontFamily="monospace"
        >Z</text>

        {/* ── Boyut çizgileri ───────────────────────────────────────────── */}
        {/* Genişlik — alt */}
        <line x1={PAD_L}        y1={PAD_T + drawH + 7} x2={PAD_L}        y2={PAD_T + drawH + 12} stroke="#555" strokeWidth={1} />
        <line x1={PAD_L + drawW} y1={PAD_T + drawH + 7} x2={PAD_L + drawW} y2={PAD_T + drawH + 12} stroke="#555" strokeWidth={1} />
        <line x1={PAD_L}        y1={PAD_T + drawH + 9}  x2={PAD_L + drawW} y2={PAD_T + drawH + 9}  stroke="#555" strokeWidth={1} />
        <rect x={PAD_L + drawW / 2 - 22} y={PAD_T + drawH + 3} width={44} height={12} fill="white" />
        <text
          x={PAD_L + drawW / 2} y={PAD_T + drawH + 12}
          textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
        >{Math.round(TW)} mm</text>

        {/* Derinlik — sağ */}
        <line x1={PAD_L + drawW + 6}  y1={PAD_T}        x2={PAD_L + drawW + 11} y2={PAD_T}        stroke="#555" strokeWidth={1} />
        <line x1={PAD_L + drawW + 6}  y1={PAD_T + drawH} x2={PAD_L + drawW + 11} y2={PAD_T + drawH} stroke="#555" strokeWidth={1} />
        <line x1={PAD_L + drawW + 8}  y1={PAD_T}        x2={PAD_L + drawW + 8}  y2={PAD_T + drawH} stroke="#555" strokeWidth={1} />
        <text
          x={PAD_L + drawW + 12} y={PAD_T + drawH / 2}
          textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
          transform={`rotate(90,${PAD_L + drawW + 12},${PAD_T + drawH / 2})`}
        >{Math.round(MD)} mm</text>

        {/* ── Yön etiketleri ─────────────────────────────────────────────── */}
        <text x={PAD_L - 4}      y={PAD_T + 8}        textAnchor="end" fontSize={7} fill="#888" fontFamily="monospace">Ön</text>
        <text x={PAD_L - 4}      y={PAD_T + drawH - 2} textAnchor="end" fontSize={7} fill="#888" fontFamily="monospace">Arka</text>
      </svg>
    </section>
  );
}
