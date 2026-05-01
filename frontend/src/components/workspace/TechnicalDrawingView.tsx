/**
 * TechnicalDrawingView — Klasik Teknik Resim (Üç Görünüm)
 *
 * Tek SVG içinde üç ortografik projeksiyon — tüm görünümler aynı ölçekte:
 *
 *   ┌─────────────┬─────────────┐
 *   │  ÖN (XY)    │  YAN (ZY)   │
 *   ├─────────────┼─────────────┤
 *   │  ÜST (XZ)   │             │
 *   └─────────────┴─────────────┘
 *
 * Hizalama:
 *   Ön ↔ Yan  : aynı Y ekseni (yükseklik)
 *   Ön ↔ Üst  : aynı X ekseni (genişlik)
 */

import { useEffect, useRef, useState } from "react";
import type { Busbar, CopperSettings, Panel, ProjectDevice, ProjectPanel } from "../../types";
import {
  buildCabinetLayouts,
  computeBarTable,
  deviceBoxes,
  DEVICE_COLORS,
  PHASE_COLORS,
  PHASE_LABELS,
  phaseColorIndex,
  type BarRow,
} from "./viewHelpers";

interface TechnicalDrawingViewProps {
  panel?: Panel | null;
  projectPanels?: ProjectPanel[];
  devices?: ProjectDevice[];
  copperSettings?: CopperSettings | null;
  busbars?: Busbar[];
  barRows?: BarRow[];
  title?: string;
}

// ── Sabitler ──────────────────────────────────────────────────────────────────
const SVG_W    = 840;
const PAD_L    = 48;
const PAD_R    = 20;
const PAD_T    = 36;
const PAD_B    = 44;
const GAP      = 20;   // görünümler arası boşluk (px)
const VIEW_LABEL_H = 16; // görünüm etiketi için alan (üstünde)

export function TechnicalDrawingView({
  panel,
  projectPanels = [],
  devices = [],
  copperSettings,
  busbars,
  barRows: barRowsProp,
  title = "Teknik Görünüm",
}: TechnicalDrawingViewProps) {
  if (!panel) {
    return (
      <section className="table-card" style={{ marginTop: 0 }}>
        <div className="empty-state" style={{ padding: "2rem 0" }}>
          Görünüm için kabin bilgisi gerekiyor.
        </div>
      </section>
    );
  }

  // ── Tüm kabin/cihaz verisi ───────────────────────────────────────────────
  const { layouts: allLayouts, maxHeight: allMH } =
    buildCabinetLayouts(projectPanels, panel);
  const allBoxes = deviceBoxes(devices, allLayouts);

  // ── Kabin filtresi ────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | "all">("all");

  // ── Zoom / Pan ────────────────────────────────────────────────────────────
  const [zoom, setZoom]   = useState(1);
  const [pan,  setPan]    = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef  = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const stateRef = useRef({ zoom, pan, svgH: 0 });

  // Seçime göre filtrelenmiş layout ve kutular
  const filteredLayouts = selectedId === "all"
    ? allLayouts
    : allLayouts.filter((l) => l.id === selectedId);

  // Seçim yapılmışsa filtrelenmiş grubun başlangıç X'i sıfırlanır
  const xOffset = selectedId !== "all" && filteredLayouts.length > 0
    ? filteredLayouts[0].assemblyX
    : 0;
  const layouts = filteredLayouts.map((l) => ({
    ...l,
    assemblyX: l.assemblyX - xOffset,
    intLeft:   l.intLeft   - xOffset,
  }));

  const boxes = selectedId === "all"
    ? allBoxes.map((b) => ({ ...b, x: b.x - xOffset }))
    : allBoxes
        .filter((b) => b.projectPanelId === selectedId)
        .map((b)  => ({ ...b, x: b.x - xOffset }));

  // Filtrelenmiş boyutlar
  const TW  = layouts.reduce((acc, l) => Math.max(acc, l.assemblyX + l.cW), 0);
  const MH  = layouts.length > 0 ? Math.max(...layouts.map((l) => l.cH)) : allMH;
  const rawMD = layouts.length > 0 ? Math.max(...layouts.map((l) => l.cD)) : 0;
  const MD  = rawMD > 0 ? rawMD : 300;

  // ── Ölçek — üç görünüm aynı ölçeği paylaşır ──────────────────────────────
  const horizAvail = SVG_W - PAD_L - PAD_R - GAP;
  const vertMax    = 480;

  const scaleH = TW + MD > 0 ? horizAvail / (TW + MD) : 1;
  const scaleV = MH + MD > 0 ? (vertMax - GAP) / (MH + MD) : 1;
  const scale  = Math.min(scaleH, scaleV, 1.2);

  const drawW = TW * scale;
  const drawH = MH * scale;
  const drawD = MD * scale;

  const SVG_H = PAD_T + VIEW_LABEL_H + drawH + GAP + drawD + PAD_B;

  // stateRef her render'da güncelle (wheel handler'da stale closure olmaz)
  stateRef.current = { zoom, pan, svgH: SVG_H };

  // ── Wheel zoom (passive:false gerektiğinden useEffect ile) ────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: cz, pan: cp, svgH: cH } = stateRef.current;
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      const newZoom = Math.min(10, Math.max(0.25, cz * factor));
      const rect    = el.getBoundingClientRect();
      const vbW = SVG_W / cz;
      const vbH = cH   / cz;
      // İmlecin SVG koordinat uzayındaki yeri
      const ancX = cp.x + (e.clientX - rect.left)  / rect.width  * vbW;
      const ancY = cp.y + (e.clientY - rect.top)   / rect.height * vbH;
      const newVbW = SVG_W / newZoom;
      const newVbH = cH    / newZoom;
      const fX = (ancX - cp.x) / vbW;
      const fY = (ancY - cp.y) / vbH;
      setZoom(newZoom);
      setPan({ x: ancX - fX * newVbW, y: ancY - fY * newVbH });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Zoom yardımcıları ─────────────────────────────────────────────────────
  function zoomBy(factor: number) {
    const { zoom: cz, pan: cp, svgH: cH } = stateRef.current;
    const newZoom = Math.min(10, Math.max(0.25, cz * factor));
    const vbW = SVG_W / cz;
    const vbH = cH   / cz;
    const cx = cp.x + vbW / 2;
    const cy = cp.y + vbH / 2;
    const newVbW = SVG_W / newZoom;
    const newVbH = cH    / newZoom;
    setZoom(newZoom);
    setPan({ x: cx - newVbW / 2, y: cy - newVbH / 2 });
  }

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // ── Drag-to-pan handlers ──────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const vbW  = SVG_W / zoom;
    const vbH  = SVG_H / zoom;
    const dx   = (e.clientX - dragRef.current.startX) / rect.width  * vbW;
    const dy   = (e.clientY - dragRef.current.startY) / rect.height * vbH;
    setPan({ x: dragRef.current.panX - dx, y: dragRef.current.panY - dy });
  }

  function onMouseUp() { dragRef.current = null; setDragging(false); }

  // viewBox: zoom ve pan'a göre
  const vbW = SVG_W / zoom;
  const vbH = SVG_H / zoom;
  const viewBoxStr = `${pan.x} ${pan.y} ${vbW} ${vbH}`;

  // ── Koordinat fonksiyonları ────────────────────────────────────────────────
  const fvX = (x: number) => PAD_L + x * scale;
  const fvY = (y: number) => PAD_T + VIEW_LABEL_H + (MH - y) * scale;
  const svX = (z: number) => PAD_L + drawW + GAP + z * scale;
  const tvY = (z: number) => PAD_T + VIEW_LABEL_H + drawH + GAP + z * scale;

  const groundY    = fvY(0);
  const frontRight = fvX(TW);

  // ── Bakır barları (CS overlay veya hesaplanmış) ───────────────────────────
  const cs = copperSettings;
  const hasSegments = (busbars?.length ?? 0) > 0;
  const effectiveBarRows: BarRow[] = barRowsProp ??
    (cs ? computeBarTable(cs) : []);

  const barW = Number(cs?.main_width_mm    ?? 40);
  const barT = Number(cs?.main_thickness_mm ?? 5);
  const firstLayout = layouts[0];

  return (
    <section className="table-card" style={{ marginTop: 0 }}>
      <div className="section-header" style={{ marginBottom: "0.5rem" }}>
        <h3>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Kabin filtresi */}
          {allLayouts.length > 1 && (
            <select
              className="input"
              value={selectedId}
              onChange={(e) =>
                setSelectedId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem", minWidth: 160 }}
            >
              <option value="all">Tüm Kabinler</option>
              {allLayouts.map((l, idx) => (
                <option key={`${l.id}-${idx}`} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
          {/* Zoom kontrolleri */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <button
              type="button" className="ghost"
              style={{ padding: "0.2rem 0.55rem", fontSize: "1rem", lineHeight: 1 }}
              onClick={() => zoomBy(1.4)} title="Yakınlaştır"
            >+</button>
            <span style={{ fontSize: "0.8rem", minWidth: "3rem", textAlign: "center", color: "var(--muted)" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button" className="ghost"
              style={{ padding: "0.2rem 0.55rem", fontSize: "1rem", lineHeight: 1 }}
              onClick={() => zoomBy(1 / 1.4)} title="Uzaklaştır"
            >−</button>
            <button
              type="button" className="ghost"
              style={{ padding: "0.2rem 0.55rem", fontSize: "0.8rem" }}
              onClick={resetView} title="Görünümü sıfırla"
            >↺</button>
          </div>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Aynı ölçek · Ön–Yan–Üst
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBoxStr}
        width="100%"
        style={{
          display: "block",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
          maxHeight: "108vh",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* ────────────────────────────────────────────────────────────────
            Projeksiyon yardım çizgileri (ince kesik)
        ──────────────────────────────────────────────────────────────── */}
        {/* Ön → Yan yatay hizalama çizgisi (zemin) */}
        <line x1={frontRight} y1={groundY}
              x2={frontRight + GAP} y2={groundY}
              stroke="#bbb" strokeWidth={0.6} strokeDasharray="3 2" />
        {/* Ön → Üst dikey hizalama çizgisi (sol kenar) */}
        <line x1={fvX(0)} y1={groundY}
              x2={fvX(0)} y2={groundY + GAP}
              stroke="#bbb" strokeWidth={0.6} strokeDasharray="3 2" />
        {/* Ön → Üst dikey hizalama çizgisi (sağ kenar) */}
        <line x1={frontRight} y1={groundY}
              x2={frontRight} y2={groundY + GAP}
              stroke="#bbb" strokeWidth={0.6} strokeDasharray="3 2" />

        {/* ────────────────────────────────────────────────────────────────
            Görünüm etiketleri
        ──────────────────────────────────────────────────────────────── */}
        {[
          { label: "ÖN (XY)",  x: PAD_L + drawW / 2 },
          { label: "YAN (ZY)", x: PAD_L + drawW + GAP + drawD / 2 },
        ].map(({ label, x }) => (
          <text key={label} x={x}
            y={PAD_T + VIEW_LABEL_H - 3}
            textAnchor="middle" fontSize={9} fill="#999"
            fontFamily="monospace" fontWeight="700" letterSpacing="1">
            {label}
          </text>
        ))}
        <text x={PAD_L + drawW / 2}
          y={PAD_T + VIEW_LABEL_H + drawH + GAP + drawD / 2}
          textAnchor="middle" fontSize={9} fill="#999"
          fontFamily="monospace" fontWeight="700" letterSpacing="1"
          transform={`rotate(-90, ${PAD_L + drawW / 2}, ${PAD_T + VIEW_LABEL_H + drawH + GAP + drawD / 2})`}>
        </text>
        <text x={PAD_L - 6}
          y={PAD_T + VIEW_LABEL_H + drawH + GAP + drawD / 2}
          textAnchor="middle" fontSize={9} fill="#999"
          fontFamily="monospace" fontWeight="700" letterSpacing="1"
          transform={`rotate(-90, ${PAD_L - 6}, ${PAD_T + VIEW_LABEL_H + drawH + GAP + drawD / 2})`}>
          ÜST (XZ)
        </text>

        {/* ════════════════════════════════════════════════════════════════
            ÖN GÖRÜNÜM (XY)
        ════════════════════════════════════════════════════════════════ */}

        {/* Kabin gövdeleri */}
        {layouts.map((cl) => {
          const cx  = fvX(cl.assemblyX);
          const cy  = fvY(cl.cH);
          const cWp = cl.cW * scale;
          const cHp = cl.cH * scale;
          const wall = Math.max(3, Math.min(12, 20 * scale));
          const intX = fvX(cl.assemblyX + cl.lm);
          const intY = fvY(cl.cH - cl.tm);
          const intW = (cl.cW - cl.lm - cl.rm) * scale;
          const intH = (cl.cH - cl.tm - cl.bm) * scale;
          return (
            <g key={`fv-cab-${cl.id}`}>
              <rect x={cx} y={cy} width={cWp} height={cHp} fill="#d6d6d6" stroke="#1a1a1a" strokeWidth={2} />
              <rect x={cx}           y={cy} width={cWp} height={wall} fill="#e4e4e4" />
              <rect x={cx}           y={cy} width={wall}   height={cHp} fill="#e4e4e4" />
              <rect x={cx+cWp-wall}  y={cy} width={wall}   height={cHp} fill="#e4e4e4" />
              <rect x={cx} y={cy+cHp-wall} width={cWp} height={wall}  fill="#c8c8c8" />
              <rect x={intX} y={intY} width={intW} height={intH}
                fill="#f0f6ff" stroke="#3366cc" strokeWidth={0.8} strokeDasharray="4 3" />
              <rect x={cx} y={cy} width={cWp} height={cHp} fill="none" stroke="#1a1a1a" strokeWidth={2} />
              <text x={cx + cWp / 2} y={cy + 13}
                textAnchor="middle" fontSize={8} fill="#444" fontFamily="'Segoe UI', sans-serif"
                fontWeight="600">
                {cl.label}
              </text>
            </g>
          );
        })}

        {/* Cihazlar — ön görünüm (XY) */}
        {boxes.map((box, i) => {
          const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
          const sx = fvX(box.x);
          const sy = fvY(box.y + box.h);
          const sw = Math.max(box.w * scale, 2);
          const sh = Math.max(box.h * scale, 2);
          const fs = Math.min(8, sh * 0.38, sw * 0.18);
          return (
            <g key={`fv-dev-${i}`}>
              <rect x={sx} y={sy} width={sw} height={sh}
                fill={fill} stroke={stroke} strokeWidth={1} rx={1} opacity={0.9} />
              {fs >= 4 && sh > 10 && sw > 14 && (
                <text x={sx + sw / 2} y={sy + sh / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fill={stroke} fontWeight="600"
                  fontFamily="'Segoe UI', sans-serif">
                  {box.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Bakır barları — ön görünüm (XY): Y konumunda yatay şerit */}
        {cs && !hasSegments && firstLayout && effectiveBarRows.map((row) => {
          const phaseIdx = PHASE_LABELS.indexOf(row.phase);
          const color = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];
          // Bar global X'i seçilen kabinin başlangıcına (xOffset) göre normalize et
          const barLocalX = row.xStart - xOffset;
          const barEndX   = barLocalX + row.length;
          const visStart  = Math.max(barLocalX, 0);
          const visEnd    = Math.min(barEndX, TW);
          if (visEnd <= visStart) return null; // bu kabinde bar yok
          const rx = fvX(visStart);
          const ry = fvY(firstLayout.bm + row.yCenter + barW / 2);
          const rw = Math.max((visEnd - visStart) * scale, 4);
          const rh = Math.max(barW * scale, 3);
          return (
            <g key={`fv-bar-${row.key}`}>
              <rect x={rx} y={ry} width={rw} height={rh}
                fill={color} opacity={0.75} rx={1} stroke={color} strokeWidth={0.5} />
              {rh > 8 && (
                <text x={rx + 4} y={ry + rh / 2} dominantBaseline="middle"
                  fontSize={Math.min(7, rh * 0.6)} fill="#fff" fontWeight="700" fontFamily="monospace">
                  {row.key}
                </text>
              )}
            </g>
          );
        })}

        {/* Bakır segmentleri — ön görünüm (XY) */}
        {hasSegments && busbars!.flatMap((b) => {
          const color = PHASE_COLORS[phaseColorIndex(b.phase)];
          const sw = b.busbar_type === "main" ? 2.5 : 1.5;
          return b.segments.flatMap((seg, si) => {
            const x1 = fvX(Number(seg.start_x_mm ?? 0));
            const y1 = fvY(Number(seg.start_y_mm ?? 0));
            const x2 = fvX(Number(seg.end_x_mm   ?? 0));
            const y2 = fvY(Number(seg.end_y_mm   ?? 0));
            if (Math.abs(x1 - x2) < 0.4 && Math.abs(y1 - y2) < 0.4) return [];
            return [<line key={`fv-seg-${b.id}-${si}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={sw} opacity={b.busbar_type === "main" ? 0.95 : 0.75}
              strokeLinecap="round" />];
          });
        })}

        {/* Zemin çizgisi */}
        <line x1={fvX(0) - 6} y1={groundY} x2={fvX(TW) + 6} y2={groundY}
          stroke="#1a1a1a" strokeWidth={2.5} />

        {/* Ön görünüm boyutları */}
        {/* Genişlik — alt */}
        <line x1={fvX(0)}  y1={groundY + 8} x2={fvX(0)}  y2={groundY + 13} stroke="#555" strokeWidth={1} />
        <line x1={fvX(TW)} y1={groundY + 8} x2={fvX(TW)} y2={groundY + 13} stroke="#555" strokeWidth={1} />
        <line x1={fvX(0)} y1={groundY + 10} x2={fvX(TW)} y2={groundY + 10} stroke="#555" strokeWidth={1} />
        <rect x={fvX(TW / 2) - 22} y={groundY + 4} width={44} height={12} fill="white" />
        <text x={fvX(TW / 2)} y={groundY + 13} textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace">
          {Math.round(TW)} mm
        </text>
        {/* Yükseklik — sol */}
        <line x1={fvX(0) - 8}  y1={fvY(MH)}  x2={fvX(0) - 13} y2={fvY(MH)}  stroke="#555" strokeWidth={1} />
        <line x1={fvX(0) - 8}  y1={groundY}  x2={fvX(0) - 13} y2={groundY}  stroke="#555" strokeWidth={1} />
        <line x1={fvX(0) - 10} y1={fvY(MH)}  x2={fvX(0) - 10} y2={groundY}  stroke="#555" strokeWidth={1} />
        <text x={fvX(0) - 13} y={fvY(MH / 2)} textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
          transform={`rotate(-90, ${fvX(0) - 13}, ${fvY(MH / 2)})`}>
          {Math.round(MH)} mm
        </text>

        {/* ════════════════════════════════════════════════════════════════
            YAN GÖRÜNÜM (ZY) — ön görünümün sağında
        ════════════════════════════════════════════════════════════════ */}

        {/* Kabin yan kesiti */}
        <rect x={svX(0)} y={fvY(MH)} width={drawD} height={drawH}
          fill="#d8d8d8" stroke="#1a1a1a" strokeWidth={2} />
        {/* Ön yüzey vurgusu */}
        <rect x={svX(0)} y={fvY(MH)} width={Math.max(3, 3 * scale)} height={drawH}
          fill="#b0b0b0" />
        {/* İç montaj alanı */}
        {firstLayout && (
          <rect x={svX(0)} y={fvY(MH - firstLayout.tm)}
            width={drawD} height={(MH - firstLayout.tm - firstLayout.bm) * scale}
            fill="#f0f6ff" stroke="#3366cc" strokeWidth={0.5} strokeDasharray="4 3" />
        )}

        {/* Cihazlar — yan görünüm (ZY) */}
        {boxes.map((box, i) => {
          const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
          const sx = svX(box.z);
          const sy = fvY(box.y + box.h);
          const sw = Math.max(box.d * scale, 2);
          const sh = Math.max(box.h * scale, 2);
          const fs = Math.min(7, sh * 0.35, sw * 0.2);
          return (
            <g key={`sv-dev-${i}`}>
              <rect x={sx} y={sy} width={sw} height={sh}
                fill={fill} stroke={stroke} strokeWidth={1} rx={1} opacity={0.85} />
              {fs >= 4 && sh > 9 && sw > 9 && (
                <text x={sx + sw / 2} y={sy + sh / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fs} fill={stroke} fontWeight="600" fontFamily="'Segoe UI', sans-serif">
                  {box.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Bakır barları — yan görünüm (ZY) */}
        {cs && !hasSegments && firstLayout && effectiveBarRows.map((row) => {
          const phaseIdx = PHASE_LABELS.indexOf(row.phase);
          const color = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];
          const sx = svX(row.zCenter - barT / 2);
          const sy = fvY(firstLayout.bm + row.yCenter + barW / 2);
          const sw = Math.max(barT * scale, 2);
          const sh = Math.max(barW * scale, 3);
          return (
            <g key={`sv-bar-${row.key}`}>
              <rect x={sx} y={sy} width={sw} height={sh}
                fill={color} opacity={0.75} rx={1} stroke={color} strokeWidth={0.5} />
              {sh > 8 && (
                <text x={sx + sw / 2} y={sy + sh / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(6, sh * 0.5)} fill="#fff" fontWeight="700" fontFamily="monospace">
                  {row.key}
                </text>
              )}
            </g>
          );
        })}

        {/* Bakır segmentleri — yan görünüm (ZY) */}
        {hasSegments && busbars!.flatMap((b) => {
          const color = PHASE_COLORS[phaseColorIndex(b.phase)];
          const sw = b.busbar_type === "main" ? 2.5 : 1.5;
          return b.segments.flatMap((seg, si) => {
            const x1 = svX(Number(seg.start_z_mm ?? 0));
            const y1 = fvY(Number(seg.start_y_mm ?? 0));
            const x2 = svX(Number(seg.end_z_mm   ?? 0));
            const y2 = fvY(Number(seg.end_y_mm   ?? 0));
            if (Math.abs(x1 - x2) < 0.4 && Math.abs(y1 - y2) < 0.4) return [];
            return [<line key={`sv-seg-${b.id}-${si}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={sw} opacity={b.busbar_type === "main" ? 0.95 : 0.75}
              strokeLinecap="round" />];
          });
        })}

        {/* Yan görünüm boyutları */}
        <line x1={svX(0)}  y1={groundY + 8} x2={svX(0)}  y2={groundY + 13} stroke="#555" strokeWidth={1} />
        <line x1={svX(MD)} y1={groundY + 8} x2={svX(MD)} y2={groundY + 13} stroke="#555" strokeWidth={1} />
        <line x1={svX(0)} y1={groundY + 10} x2={svX(MD)} y2={groundY + 10} stroke="#555" strokeWidth={1} />
        <rect x={svX(MD / 2) - 22} y={groundY + 4} width={44} height={12} fill="white" />
        <text x={svX(MD / 2)} y={groundY + 13} textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace">
          {Math.round(MD)} mm
        </text>

        {/* Yön etiketleri — yan görünüm */}
        <text x={svX(0) + 3} y={fvY(MH) + VIEW_LABEL_H - 2}
          fontSize={7} fill="#aaa" fontFamily="monospace">Ön</text>
        <text x={svX(MD) - 3} y={fvY(MH) + VIEW_LABEL_H - 2}
          textAnchor="end" fontSize={7} fill="#aaa" fontFamily="monospace">Arka</text>

        {/* ════════════════════════════════════════════════════════════════
            ÜST GÖRÜNÜM (XZ) — ön görünümün altında
        ════════════════════════════════════════════════════════════════ */}

        {/* Kabin gövdeleri — üst görünüm */}
        {layouts.map((cl) => {
          const cx = fvX(cl.assemblyX);
          const cw = cl.cW * scale;
          const cd = cl.cD * scale;
          return (
            <g key={`tv-cab-${cl.id}`}>
              <rect x={cx} y={tvY(0)} width={cw} height={cd}
                fill="#d8d8d8" stroke="#1a1a1a" strokeWidth={1.5} />
              {/* Ön yüzey vurgusu (SVG'de üst kenar) */}
              <rect x={cx} y={tvY(0)} width={cw} height={Math.max(3, 3 * scale)} fill="#b0b0b0" />
              {/* İç alan */}
              <rect x={fvX(cl.assemblyX + cl.lm)} y={tvY(0)}
                width={(cl.cW - cl.lm - cl.rm) * scale} height={cd}
                fill="#f0f6ff" stroke="#3366cc" strokeWidth={0.5} strokeDasharray="4 3" />
            </g>
          );
        })}

        {/* Cihazlar — üst görünüm (XZ) */}
        {boxes.map((box, i) => {
          const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
          const sx = fvX(box.x);
          const sy = tvY(box.z);
          const sw = Math.max(box.w * scale, 2);
          const sh = Math.max(box.d * scale, 2);
          return (
            <g key={`tv-dev-${i}`}>
              <rect x={sx} y={sy} width={sw} height={sh}
                fill={fill} stroke={stroke} strokeWidth={1} rx={1} opacity={0.8} />
            </g>
          );
        })}

        {/* Bakır barları — üst görünüm (XZ): Z konumunda yatay şerit */}
        {cs && !hasSegments && firstLayout && effectiveBarRows.map((row) => {
          const phaseIdx = PHASE_LABELS.indexOf(row.phase);
          const color = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];
          // Bar global X'i seçilen kabinin başlangıcına göre normalize et
          const barLocalX = row.xStart - xOffset;
          const barEndX   = barLocalX + row.length;
          const visStart  = Math.max(barLocalX, 0);
          const visEnd    = Math.min(barEndX, TW);
          if (visEnd <= visStart) return null;
          const rx = fvX(visStart);
          const ry = tvY(row.zCenter - barT / 2);
          const rw = Math.max((visEnd - visStart) * scale, 4);
          const rh = Math.max(barT * scale, 2);
          return (
            <g key={`tv-bar-${row.key}`}>
              <rect x={rx} y={ry} width={rw} height={rh}
                fill={color} opacity={0.75} rx={1} stroke={color} strokeWidth={0.5} />
              {rh > 7 && (
                <text x={rx + 4} y={ry + rh / 2} dominantBaseline="middle"
                  fontSize={Math.min(6, rh * 0.7)} fill="#fff" fontWeight="700" fontFamily="monospace">
                  {row.key}
                </text>
              )}
            </g>
          );
        })}

        {/* Bakır segmentleri — üst görünüm (XZ) */}
        {hasSegments && busbars!.flatMap((b) => {
          const color = PHASE_COLORS[phaseColorIndex(b.phase)];
          const sw = b.busbar_type === "main" ? 2.5 : 1.5;
          return b.segments.flatMap((seg, si) => {
            const x1 = fvX(Number(seg.start_x_mm ?? 0));
            const y1 = tvY(Number(seg.start_z_mm ?? 0));
            const x2 = fvX(Number(seg.end_x_mm   ?? 0));
            const y2 = tvY(Number(seg.end_z_mm   ?? 0));
            if (Math.abs(x1 - x2) < 0.4 && Math.abs(y1 - y2) < 0.4) return [];
            return [<line key={`tv-seg-${b.id}-${si}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={sw} opacity={b.busbar_type === "main" ? 0.95 : 0.75}
              strokeLinecap="round" />];
          });
        })}

        {/* Üst görünüm boyutları */}
        <line x1={fvX(0) - 8}  y1={tvY(0)}  x2={fvX(0) - 13} y2={tvY(0)}  stroke="#555" strokeWidth={1} />
        <line x1={fvX(0) - 8}  y1={tvY(MD)} x2={fvX(0) - 13} y2={tvY(MD)} stroke="#555" strokeWidth={1} />
        <line x1={fvX(0) - 10} y1={tvY(0)}  x2={fvX(0) - 10} y2={tvY(MD)} stroke="#555" strokeWidth={1} />
        <text x={fvX(0) - 13} y={tvY(MD / 2)} textAnchor="middle" fontSize={9} fill="#333" fontFamily="monospace"
          transform={`rotate(-90, ${fvX(0) - 13}, ${tvY(MD / 2)})`}>
          {Math.round(MD)} mm
        </text>

        {/* Yön etiketleri — üst görünüm */}
        <text x={fvX(0) + 3} y={tvY(0) + 10}
          fontSize={7} fill="#aaa" fontFamily="monospace">Ön</text>
        <text x={fvX(0) + 3} y={tvY(MD) - 3}
          fontSize={7} fill="#aaa" fontFamily="monospace">Arka</text>

        {/* ── Koordinat eksenleri (ön görünüm alt-sol köşesi) ─────────── */}
        <line x1={fvX(0)} y1={groundY} x2={fvX(0) + 22} y2={groundY}
          stroke="#e53935" strokeWidth={1} />
        <path d={`M${fvX(0) + 22},${groundY}L${fvX(0) + 17},${groundY - 3} M${fvX(0) + 22},${groundY}L${fvX(0) + 17},${groundY + 3}`}
          stroke="#e53935" strokeWidth={1} fill="none" />
        <text x={fvX(0) + 25} y={groundY + 4} fontSize={8} fill="#e53935" fontFamily="monospace">X</text>

        <line x1={fvX(0)} y1={groundY} x2={fvX(0)} y2={groundY - 22}
          stroke="#e53935" strokeWidth={1} />
        <path d={`M${fvX(0)},${groundY - 22}L${fvX(0) - 3},${groundY - 17} M${fvX(0)},${groundY - 22}L${fvX(0) + 3},${groundY - 17}`}
          stroke="#e53935" strokeWidth={1} fill="none" />
        <text x={fvX(0) + 2} y={groundY - 24} fontSize={8} fill="#e53935" fontFamily="monospace">Y</text>

        <line x1={svX(0)} y1={groundY} x2={svX(0) + 22} y2={groundY}
          stroke="#e53935" strokeWidth={1} />
        <path d={`M${svX(0) + 22},${groundY}L${svX(0) + 17},${groundY - 3} M${svX(0) + 22},${groundY}L${svX(0) + 17},${groundY + 3}`}
          stroke="#e53935" strokeWidth={1} fill="none" />
        <text x={svX(0) + 25} y={groundY + 4} fontSize={8} fill="#e53935" fontFamily="monospace">Z</text>
      </svg>
    </section>
  );
}
