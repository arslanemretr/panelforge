/**
 * viewHelpers.ts
 *
 * Paylaşılan geometri yardımcıları:
 *   - CabinetLayout: Her ProjectPanel için assembly koordinat sistemi bilgisi
 *   - buildCabinetLayouts: Panel listesinden yerleşim tablosu oluşturur
 *   - deviceBoxes: Cihazların 3D dünya koordinatlarını hesaplar
 *   - arrowPath: SVG ok ucu path'i
 *   - Renk sabitleri
 *
 * Koordinat sistemi:
 *   X → sağ (assembly sol duvarından itibaren)
 *   Y ↑ yukarı (assembly zeminden itibaren, bm + local y)
 *   Z → derinlik, ön yüzeyden arka yüzeye (0 = ön)
 */

import type { CopperSettings, Panel, ProjectDevice, ProjectPanel } from "../../types";

// ── Bar koordinat satırı ──────────────────────────────────────────────────────

export const PHASE_LABELS = ["L1", "L2", "L3", "N", "PE"];

export interface BarRow {
  key: string;       // "L1-B1", "L1-B2", …
  phase: string;
  barNo: number;     // faz içi sıra (1-indexed)
  xStart: number;    // mm, assembly sol iç kenarından
  yCenter: number;   // mm, bar Y merkezi (alttan)
  zCenter: number;   // mm, bar Z merkezi (ön yüzeyden)
  length: number;    // mm
}

/**
 * CopperSettings'ten her barın kesin 3D merkez koordinatını hesaplar.
 * Kural: fazlar phase_stack_axis yönünde, faz-içi barlar her zaman Z'de yığılır.
 */
export function computeBarTable(cs: CopperSettings): BarRow[] {
  if (!cs.busbar_length_mm) return [];

  const phaseCount   = Math.min(Number(cs.busbar_phase_count ?? 3), 5);
  const barsPerPhase = Math.max(1, Number(cs.bars_per_phase ?? 1));
  const barGap       = Number(cs.bar_gap_mm ?? 0);
  const barW         = Number(cs.main_width_mm ?? 40);
  const barT         = Number(cs.main_thickness_mm ?? 5);
  const barStep      = barT + barGap;   // bir barın kapladığı Z derinliği
  const xStart       = Number(cs.busbar_x_mm ?? 0);
  const baseY        = Number(cs.busbar_y_mm ?? 0);
  const baseZ        = Number(cs.busbar_z_mm ?? 0);
  const length       = Number(cs.busbar_length_mm);

  // Tüm barlar Z ekseninde ard arda dizilir; Y hepsi aynı.
  // main_phase_spacing_mm tali bara hesabında kullanılır, başlangıç
  // yerleşimini etkilemez.
  const yCenter = baseY + barW / 2;

  const rows: BarRow[] = [];

  for (let pi = 0; pi < phaseCount; pi++) {
    for (let bi = 0; bi < barsPerPhase; bi++) {
      const globalIndex = pi * barsPerPhase + bi;
      const zCenter = baseZ + barT / 2 + globalIndex * barStep;

      rows.push({
        key:     `${PHASE_LABELS[pi]}-B${bi + 1}`,
        phase:   PHASE_LABELS[pi],
        barNo:   bi + 1,
        xStart,
        yCenter: Math.round(yCenter * 10) / 10,
        zCenter: Math.round(zCenter * 10) / 10,
        length,
      });
    }
  }

  return rows;
}

// ── Renk sabitleri ────────────────────────────────────────────────────────────

export const PHASE_COLORS = [
  "#e53935", // L1
  "#f9a825", // L2
  "#1565c0", // L3
  "#616161", // N
  "#388e3c", // PE
];

export const DEVICE_COLORS = [
  { fill: "#fff3e0", stroke: "#e65100" },
  { fill: "#e8f5e9", stroke: "#2e7d32" },
  { fill: "#e3f2fd", stroke: "#1565c0" },
  { fill: "#fce4ec", stroke: "#880e4f" },
  { fill: "#f3e5f5", stroke: "#6a1b9a" },
  { fill: "#e0f2f1", stroke: "#00695c" },
  { fill: "#fff8e1", stroke: "#f57f17" },
  { fill: "#e8eaf6", stroke: "#283593" },
];

// ── CabinetLayout ─────────────────────────────────────────────────────────────

/**
 * Tek bir ProjectPanel'ın assembly koordinat sistemi içindeki konumu.
 */
export interface CabinetLayout {
  /** ProjectPanel.id (-1 = fallback panel) */
  id: number;
  seq: number;
  label: string;

  /** mm: bu kabinin sol dış duvarının assembly solundan mesafesi */
  assemblyX: number;

  cW: number; // width_mm
  cH: number; // height_mm
  cD: number; // depth_mm (Z derinliği)

  lm: number; rm: number; tm: number; bm: number; // kenar payları

  /** mm: iç alanın sol kenarı = assemblyX + lm */
  intLeft: number;
}

export interface AssemblyInfo {
  layouts: CabinetLayout[];
  /** mm: tüm kabinlerin toplam genişliği */
  totalWidth: number;
  /** mm: en yüksek kabinin yüksekliği */
  maxHeight: number;
  /** mm: en derin kabinin derinliği */
  maxDepth: number;
}

/**
 * ProjectPanel listesinden assembly bilgisini üretir.
 * Eğer projektPanel yoksa fallbackPanel kullanılır.
 */
export function buildCabinetLayouts(
  projectPanels: ProjectPanel[],
  fallbackPanel: Panel | null,
): AssemblyInfo {
  const sorted = [...projectPanels].sort((a, b) => a.seq - b.seq || a.id - b.id);

  let accX = 0;
  let maxH = 0;
  let maxD = 0;
  const layouts: CabinetLayout[] = [];

  for (const pp of sorted) {
    const def = pp.panel_definition;
    const cW = Number(def.width_mm);
    const cH = Number(def.height_mm);
    // depth_mm yoksa mounting_plate_height_mm veya 300mm fallback
    const cD = Number(def.depth_mm ?? (def as { depth_mm?: number }).depth_mm ?? 300);
    const lm = Number(def.left_margin_mm ?? 0);
    const rm = Number(def.right_margin_mm ?? 0);
    const tm = Number(def.top_margin_mm ?? 0);
    const bm = Number(def.bottom_margin_mm ?? 0);

    layouts.push({
      id: pp.id,
      seq: pp.seq,
      label: pp.label ?? def.name,
      assemblyX: accX,
      cW, cH, cD, lm, rm, tm, bm,
      intLeft: accX + lm,
    });

    accX += cW;
    maxH = Math.max(maxH, cH);
    maxD = Math.max(maxD, cD);
  }

  if (layouts.length > 0) {
    return { layouts, totalWidth: accX, maxHeight: maxH, maxDepth: maxD };
  }

  // Fallback: tek aggregate panel
  if (fallbackPanel) {
    const cW = Number(fallbackPanel.width_mm);
    const cH = Number(fallbackPanel.height_mm);
    const cD = Number(fallbackPanel.depth_mm ?? 300);
    const lm = Number(fallbackPanel.left_margin_mm ?? 0);
    const rm = Number(fallbackPanel.right_margin_mm ?? 0);
    const tm = Number(fallbackPanel.top_margin_mm ?? 0);
    const bm = Number(fallbackPanel.bottom_margin_mm ?? 0);

    layouts.push({
      id: -1,
      seq: 1,
      label: "Pano",
      assemblyX: 0,
      cW, cH, cD, lm, rm, tm, bm,
      intLeft: lm,
    });

    return { layouts, totalWidth: cW, maxHeight: cH, maxDepth: cD };
  }

  return { layouts: [], totalWidth: 0, maxHeight: 0, maxDepth: 0 };
}

// ── DeviceBox ─────────────────────────────────────────────────────────────────

/**
 * Bir cihazın assembly koordinat sistemindeki 3D kutusu.
 *
 * x: assembly sol iç kenarından (mm)
 * y: assembly zemininden (= cabinet.bm + device.y_mm)
 * z: ön yüzeyden derinlik yönünde (= device.z_mm)
 */
export interface DeviceBox {
  x: number;
  y: number;
  z: number;
  w: number; // device.width_mm
  h: number; // device.height_mm
  d: number; // device.depth_mm ?? 50
  colorIndex: number;
  label: string;
}

/**
 * Cihaz listesinden 3D kutu listesi üretir.
 * Proje panel id'si bulunamazsa ilk kabine fallback yapılır.
 */
export function deviceBoxes(
  devices: ProjectDevice[],
  layouts: CabinetLayout[],
): DeviceBox[] {
  return devices.flatMap((pd, i) => {
    const layout =
      layouts.find((cl) => cl.id === pd.project_panel_id) ?? layouts[0];
    if (!layout) return [];

    const dW = Number(pd.device.width_mm);
    const dH = Number(pd.device.height_mm);
    const dD = Number(pd.device.depth_mm ?? 50);
    if (!dW || !dH) return [];

    return [
      {
        x: layout.intLeft + Number(pd.x_mm),
        y: layout.bm + Number(pd.y_mm), // Y from assembly absolute bottom
        z: Number((pd as { z_mm?: number }).z_mm ?? 0),
        w: dW,
        h: dH,
        d: dD,
        colorIndex: i,
        label: pd.label,
      },
    ];
  });
}

// ── SVG yardımcıları ──────────────────────────────────────────────────────────

/** SVG ok ucu path'i: (x2, y2) hedefine yönelik. */
export function arrowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sz = 6,
): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  return (
    `M${x2},${y2}L${x2 + sz * Math.cos(a + 2.5)},${y2 + sz * Math.sin(a + 2.5)} ` +
    `M${x2},${y2}L${x2 + sz * Math.cos(a - 2.5)},${y2 + sz * Math.sin(a - 2.5)}`
  );
}

/** Faz adından renk indeksi döndürür. */
export function phaseColorIndex(phase: string): number {
  const idx = ["L1", "L2", "L3", "N", "PE"].indexOf(phase.toUpperCase());
  return idx >= 0 ? idx : 0;
}
