/**
 * DeviceSideView — Yan Görünüm (ZY düzlemi)
 *
 * Koordinat projeksiyonu (soldan bakış):
 *   SVG X  ←→  Z (derinlik, 0 = ön yüzey, maxDepth = arka)
 *   SVG Y  ←→  Y (yükseklik, SVG'de üst = yüksek Y)
 *
 * Üç render modu:
 *   1. Sadece cihazlar (varsayılan — Sekme 2)
 *   2. Cihazlar + CopperSettings overlay (Sekme 3, canlı önizleme)
 *   3. Cihazlar + hesaplanmış Busbar segmentleri (Sekme 5, sonuçlar)
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

interface DeviceSideViewProps {
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
const SVG_W  = 420;
const PAD_L  = 52;  // sol: Y ekseni etiketi + boyut çizgisi için
const PAD_R  = 24;
const PAD_T  = 32;  // üst: "Ön" / "Arka" etiketi için
const PAD_B  = 44;  // alt: boyut çizgisi + Z ekseni oku için

export function DeviceSideView({
  panel,
  projectPanels = [],
  devices = [],
  copperSettings,
  busbars,
  barRows,
  title = "Yan Görünüm (ZY)",
}: DeviceSideViewProps) {
  if (!panel) {
    return (
      <section className="table-card" style={{ marginTop: 0 }}>
        <div className="empty-state" style={{ padding: "2rem 0" }}>
          Yan görünüm için kabin bilgisi gerekiyor.
        </div>
      </section>
    );
  }

  const { layouts, maxHeight: MH, maxDepth: rawMD } = buildCabinetLayouts(
    projectPanels,
    panel,
  );
  // Derinlik bilgisi yoksa 300mm varsayılan
  const MD = rawMD > 0 ? rawMD : 300;

  const boxes = deviceBoxes(devices, layouts);

  // Ölçekleme: Z × Y → SVG drawW × drawH
  const availW = SVG_W - PAD_L - PAD_R;
  const availH = 340;
  const scale  = MH > 0 && MD > 0
    ? Math.min(availW / MD, availH / MH)
    : 1;

  const drawW = MD * scale;
  const drawH = MH * scale;
  const SVG_H = PAD_T + drawH + PAD_B;

  /** Z (mm) → SVG x */
  const svgX = (z: number) => PAD_L + z * scale;
  /** Y-from-bottom (mm) + objH → SVG y (top-left corner of rect) */
  const svgY = (yFromBottom: number, objH = 0) =>
    PAD_T + (MH - yFromBottom - objH) * scale;

  // ── CopperSettings overlay parametreleri ──────────────────────────────────
  const cs           = copperSettings;
  const hasSegments  = (busbars?.length ?? 0) > 0;
  const phaseCount   = Math.min(Number(cs?.busbar_phase_count ?? 3), 5);
  const barsPerPhase = Math.max(1, Number(cs?.bars_per_phase ?? 1));
  const barGap       = Number(cs?.bar_gap_mm ?? 0);
  const barW         = Number(cs?.main_width_mm    ?? 40);
  const barT         = Number(cs?.main_thickness_mm ?? 5);
  const barStep      = barT + barGap;   // faz içi adım: kalınlık + boşluk
  const spacing      = Number(cs?.main_phase_spacing_mm ?? 60);
  const stackAxis    = (cs?.phase_stack_axis ?? "Y").toUpperCase();
  const busZ         = Number(cs?.busbar_z_mm ?? 0);
  const busY         = Number(cs?.busbar_y_mm ?? 0);
  const firstBm      = layouts[0]?.bm ?? 0;

  // ── İç alan sınırları (ilk kabin referanslı) ──────────────────────────────
  const firstLayout = layouts[0];
  const intTopY  = firstLayout ? MH - firstLayout.tm : MH;
  const intBotY  = firstLayout ? firstLayout.bm       : 0;

  return (
    <section className="table-card" style={{ marginTop: 0 }}>
      <div className="section-header" style={{ marginBottom: "0.5rem" }}>
        <h3>{title}</h3>
        <span className="helper-text" style={{ fontSize: "0.82rem" }}>
          Z = 0 ön · Z = {Math.round(MD)} mm arka&ensp;·&ensp;Y = yükseklik
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
        {/* ── Panel gövdesi (ZY kesiti) ────────────────────────────────── */}
        {/* Ana zemin */}
        <rect
          x={PAD_L} y={PAD_T}
          width={drawW} height={drawH}
          fill="#d8d8d8" stroke="#1a1a1a" strokeWidth={2}
        />
        {/* Ön yüzey vurgusu */}
        <rect
          x={PAD_L} y={PAD_T}
          width={Math.max(3, 3 * scale)} height={drawH}
          fill="#b0b0b0"
        />
        {/* İç montaj alanı (kesik çizgi) */}
        {firstLayout && (
          <rect
            x={PAD_L}
            y={svgY(intTopY)}
            width={drawW}
            height={(intTopY - intBotY) * scale}
            fill="#f0f6ff"
            stroke="#3366cc"
            strokeWidth={0.5}
            strokeDasharray="5 3"
          />
        )}

        {/* ── Cihazlar (ZY projeksiyonu) ───────────────────────────────── */}
        {boxes.map((box, i) => {
          const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
          const sx = svgX(box.z);
          const sy = svgY(box.y, box.h);
          const sw = Math.max(box.d * scale, 2);
          const sh = Math.max(box.h * scale, 2);
          const fs = Math.min(8, sh * 0.35, sw * 0.2);
          return (
            <g key={i}>
              <rect
                x={sx} y={sy} width={sw} height={sh}
                fill={fill} stroke={stroke} strokeWidth={1}
                rx={1} opacity={0.9}
              />
              {fs >= 4 && sh > 10 && sw > 10 && (
                <text
                  x={sx + sw / 2} y={sy + sh / 2}
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
        {cs && !hasSegments && cs.busbar_z_mm != null && cs.busbar_y_mm != null && (() => {
          if (barRows && barRows.length > 0) {
            // Düzenlenmiş koordinatlardan doğrudan çiz
            return barRows.map((row) => {
              const phaseIdx = PHASE_LABELS.indexOf(row.phase);
              const color = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];
              const rectZ = row.zCenter - barT / 2;
              const rectY = row.yCenter - barW / 2;
              const sx = svgX(rectZ);
              const sy = svgY(rectY, barW);
              const sw = Math.max(barT * scale, 2);
              const sh = Math.max(barW * scale, 3);
              return (
                <g key={`br-${row.key}`}>
                  <rect x={sx} y={sy} width={sw} height={sh}
                    fill={color} opacity={0.75} rx={1} stroke={color} strokeWidth={0.5} />
                  {sh > 8 && (
                    <text x={sx + sw / 2} y={sy + sh / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.min(7, sh * 0.55)}
                      fill="#fff" fontWeight="700" fontFamily="monospace">
                      {row.key}
                    </text>
                  )}
                </g>
              );
            });
          }

          // Formülden hesapla
          return Array.from({ length: phaseCount }, (_, pi) =>
            Array.from({ length: barsPerPhase }, (__, bi) => {
              const color = PHASE_COLORS[pi] ?? PHASE_COLORS[0];
              // fazlar phase_stack_axis yönünde; barlar her zaman Z'de
              const rectZ = stackAxis === "Z"
                ? busZ + pi * spacing + bi * barStep
                : busZ + bi * barStep;
              const rectY = stackAxis === "Z"
                ? firstBm + busY
                : firstBm + busY + pi * spacing;
              const sx = svgX(rectZ);
              const sy = svgY(rectY, barW);
              const sw = Math.max(barT * scale, 2);
              const sh = Math.max(barW * scale, 3);
              const label = barsPerPhase > 1 ? `L${pi + 1}·${bi + 1}` : `L${pi + 1}`;
              return (
                <g key={`cs-${pi}-${bi}`}>
                  <rect x={sx} y={sy} width={sw} height={sh}
                    fill={color} opacity={barsPerPhase > 1 ? 0.65 - bi * 0.08 : 0.75}
                    rx={1} stroke={color} strokeWidth={0.5} />
                  {sh > 8 && bi === 0 && (
                    <text x={sx + sw / 2} y={sy + sh / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.min(7, sh * 0.55)}
                      fill="#fff" fontWeight="700" fontFamily="monospace">
                      {label}
                    </text>
                  )}
                </g>
              );
            })
          );
        })()}

        {/* ── Hesaplanmış busbar segmentleri (ZY projeksiyonu) ─────────── */}
        {hasSegments && busbars!.flatMap((b) => {
          const color = PHASE_COLORS[phaseColorIndex(b.phase)];
          const sw    = b.busbar_type === "main" ? 3 : 1.5;
          return b.segments.flatMap((seg, si) => {
            const x1 = svgX(Number(seg.start_z_mm ?? 0));
            const y1 = svgY(Number(seg.start_y_mm ?? 0));
            const x2 = svgX(Number(seg.end_z_mm   ?? 0));
            const y2 = svgY(Number(seg.end_y_mm   ?? 0));
            // Yalnızca ZY düzleminde hareket eden segmentleri çiz
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
        {/* Z ekseni → */}
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
        >Z</text>

        {/* Y ekseni ↑ */}
        <line
          x1={PAD_L - 20} y1={PAD_T + drawH}
          x2={PAD_L - 20} y2={PAD_T + drawH - Math.min(36, drawH * 0.35)}
          stroke="#e53935" strokeWidth={1}
        />
        <path
          d={arrowPath(PAD_L - 20, PAD_T + drawH,
            PAD_L - 20, PAD_T + drawH - Math.min(36, drawH * 0.35), 4)}
          stroke="#e53935" strokeWidth={1} fill="none"
        />
        <text
          x={PAD_L - 18}
          y={PAD_T + drawH - Math.min(36, drawH * 0.35) - 4}
          fontSize={8} fill="#e53935" fontFamily="monospace"
        >Y</text>

        {/* ── Boyut çizgileri ───────────────────────────────────────────── */}
        {/* Derinlik — alt */}
        <line x1={PAD_L}        y1={PAD_T + drawH + 7} x2={PAD_L}        y2={PAD_T + drawH + 12} stroke="#555" strokeWidth={1} />
        <line x1={PAD_L + drawW} y1={PAD_T + drawH + 7} x2={PAD_L + drawW} y2={PAD_T + drawH + 12} stroke="#555" strokeWidth={1} />
        <line x1={PAD_L}        y1={PAD_T + drawH + 9} x2={PAD_L + drawW} y2={PAD_T + drawH + 9} stroke="#555" strokeWidth={1} />
        <rect x={PAD_L + drawW / 2 - 22} y={PAD_T + drawH + 3} width={44} height={12} fill="white" />
        <text
          x={PAD_L + drawW / 2} y={PAD_T + drawH + 12}
          textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
        >{Math.round(MD)} mm</text>

        {/* Yükseklik — sol */}
        <line x1={PAD_L - 6} y1={PAD_T}          x2={PAD_L - 11} y2={PAD_T}          stroke="#555" strokeWidth={1} />
        <line x1={PAD_L - 6} y1={PAD_T + drawH}  x2={PAD_L - 11} y2={PAD_T + drawH}  stroke="#555" strokeWidth={1} />
        <line x1={PAD_L - 8} y1={PAD_T}          x2={PAD_L - 8}  y2={PAD_T + drawH}  stroke="#555" strokeWidth={1} />
        <text
          x={PAD_L - 11} y={PAD_T + drawH / 2}
          textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
          transform={`rotate(-90,${PAD_L - 11},${PAD_T + drawH / 2})`}
        >{Math.round(MH)} mm</text>

        {/* ── Yön etiketleri ─────────────────────────────────────────────── */}
        <text x={PAD_L + 3}      y={PAD_T - 5} fontSize={7} fill="#888" fontFamily="monospace">Ön (Z=0)</text>
        <text x={PAD_L + drawW}  y={PAD_T - 5} textAnchor="end" fontSize={7} fill="#888" fontFamily="monospace">Arka</text>
      </svg>
    </section>
  );
}
