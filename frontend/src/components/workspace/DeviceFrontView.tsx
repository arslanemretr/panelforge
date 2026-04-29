import type { CopperSettings, Panel, ProjectDevice, ProjectPanel } from "../../types";

interface DeviceFrontViewProps {
  panel?: Panel | null;
  projectPanels?: ProjectPanel[];
  devices?: ProjectDevice[];
  copperSettings?: CopperSettings | null;
  title?: string;
}

const SVG_W = 900;
const PAD_L = 50;
const PAD_R = 55;
const PAD_T = 40;
const PAD_B = 40;
const ARROW = 6;

const DEVICE_COLORS = [
  { fill: "#fff3e0", stroke: "#e65100" },
  { fill: "#e8f5e9", stroke: "#2e7d32" },
  { fill: "#e3f2fd", stroke: "#1565c0" },
  { fill: "#fce4ec", stroke: "#880e4f" },
  { fill: "#f3e5f5", stroke: "#6a1b9a" },
  { fill: "#e0f2f1", stroke: "#00695c" },
  { fill: "#fff8e1", stroke: "#f57f17" },
  { fill: "#e8eaf6", stroke: "#283593" },
];

function arrowPath(x1: number, y1: number, x2: number, y2: number, sz = ARROW): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  return (
    `M${x2},${y2}L${x2 + sz * Math.cos(a + 2.5)},${y2 + sz * Math.sin(a + 2.5)} ` +
    `M${x2},${y2}L${x2 + sz * Math.cos(a - 2.5)},${y2 + sz * Math.sin(a - 2.5)}`
  );
}

// ─── Per-cabinet layout helper ────────────────────────────────────────────────
interface CabinetLayout {
  pp: ProjectPanel;
  cumulX: number;   // mm from assembly left to this cabinet's left wall
  cW: number;
  cH: number;
  lm: number; rm: number; tm: number; bm: number;
  cabinetTopMm: number;  // mm from assembly top to this cabinet's top
  intLeft: number;       // mm from assembly left: interior left edge
  intBottom: number;     // mm from assembly top:  interior bottom edge
}

function buildLayouts(projectPanels: ProjectPanel[], PH: number): CabinetLayout[] {
  let acc = 0;
  return projectPanels.map((pp) => {
    const def = pp.panel_definition;
    const cumulX   = acc;
    const cW = Number(def.width_mm);
    const cH = Number(def.height_mm);
    acc += cW;
    const lm = Number(def.left_margin_mm   ?? 0);
    const rm = Number(def.right_margin_mm  ?? 0);
    const tm = Number(def.top_margin_mm    ?? 0);
    const bm = Number(def.bottom_margin_mm ?? 0);
    const cabinetTopMm = PH - cH;          // bottom-aligned
    return {
      pp,
      cumulX, cW, cH, lm, rm, tm, bm,
      cabinetTopMm,
      intLeft:   cumulX + lm,
      intBottom: PH - bm,                  // Y from assembly top down to interior floor
    };
  });
}

// ─── Convert device local coords → SVG px ────────────────────────────────────
// x_mm : from THIS cabinet's left interior edge  (0 = left wall)
// y_mm : from THIS cabinet's bottom interior edge (0 = floor)
// Returns {sx, sy, sw, sh} in SVG pixels, or null if data is unusable.
function deviceToSvg(
  pd: ProjectDevice,
  layouts: CabinetLayout[],
  ox: number,
  oy: number,
  scale: number,
  PH: number,
): { sx: number; sy: number; sw: number; sh: number } | null {

  const dW = Number(pd.device.width_mm);
  const dH = Number(pd.device.height_mm);
  if (!dW || !dH) return null;

  const xLocal = Number(pd.x_mm);
  const yLocal = Number(pd.y_mm);

  // Find the cabinet this device belongs to.
  // Fall back to first cabinet if project_panel_id is null or unrecognised.
  let layout = layouts.find((cl) => cl.pp.id === pd.project_panel_id);
  if (!layout && layouts.length > 0) layout = layouts[0];
  if (!layout) return null;

  // Convert to global assembly coords (mm from assembly top-left)
  const globalX   = layout.intLeft + xLocal;
  const globalYtop = layout.intBottom - yLocal - dH;  // flip Y

  const sw = dW   * scale;
  const sh = dH   * scale;
  const sx = ox + globalX    * scale;
  const sy = oy + globalYtop * scale;

  // Skip if completely outside the SVG (sanity guard)
  if (sx + sw < 0 || sx > SVG_W || sy + sh < 0) return null;

  return { sx, sy, sw, sh };
}

// ─── Component ────────────────────────────────────────────────────────────────
const PHASE_COLORS = ["#e53935", "#f9a825", "#1565c0", "#616161"]; // L1 L2 L3 N
const PHASE_LABELS = ["L1", "L2", "L3", "N"];

export function DeviceFrontView({
  panel,
  projectPanels = [],
  devices = [],
  copperSettings,
  title = "Pano Ön Görünüş",
}: DeviceFrontViewProps) {
  if (!panel) {
    return (
      <div className="empty-state" style={{ padding: "2rem 0" }}>
        Yerleşim görünümü için önce Kabin Seçimi sekmesinden kabin ekleyin.
      </div>
    );
  }

  const PW = Number(panel.width_mm);
  const PH = Number(panel.height_mm);

  const availW = SVG_W - PAD_L - PAD_R;
  const availH = 460;
  const scale  = Math.min(availW / Math.max(PW, 1), availH / Math.max(PH, 1));

  const ox = PAD_L;
  const oy = PAD_T;
  const SVG_H = PAD_T + PH * scale + PAD_B;

  const layouts = buildLayouts(projectPanels, PH);

  return (
    <section className="table-card" style={{ marginTop: 0 }}>
      <div className="section-header" style={{ marginBottom: "0.5rem" }}>
        <h3>{title}</h3>
        <span className="helper-text" style={{ fontSize: "0.82rem" }}>
          Her kabin için X = soldan, Y = alttan (zemin = 0)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{ display: "block", background: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
      >
        {/* ── Cabinets ─────────────────────────────────────────────────── */}
        {layouts.map((cl) => {
          const { pp, cumulX, cW, cH, cabinetTopMm, lm, rm, tm, bm } = cl;
          const cx   = ox + cumulX          * scale;
          const cy   = oy + cabinetTopMm    * scale;
          const cWpx = cW * scale;
          const cHpx = cH * scale;
          const wallPx = Math.max(4, Math.min(16, 25 * scale));

          // interior area in SVG px
          const intX  = cx + lm * scale;
          const intY  = cy + tm * scale;
          const intW  = (cW - lm - rm) * scale;
          const intH  = (cH - tm - bm) * scale;

          // origin marker position (bottom-left of interior)
          const ox0 = cx + lm * scale;
          const oy0 = oy + (PH - bm) * scale;

          return (
            <g key={pp.id}>
              {/* body */}
              <rect x={cx} y={cy} width={cWpx} height={cHpx} fill="#d6d6d6" stroke="#1a1a1a" strokeWidth={2.5} />
              {/* wall highlights */}
              <rect x={cx}           y={cy} width={cWpx} height={wallPx}   fill="#e2e2e2" />
              <rect x={cx}           y={cy} width={wallPx}   height={cHpx} fill="#e2e2e2" />
              <rect x={cx+cWpx-wallPx} y={cy} width={wallPx} height={cHpx} fill="#e2e2e2" />
              <rect x={cx} y={cy+cHpx-wallPx} width={cWpx} height={wallPx} fill="#c8c8c8" />
              {/* interior / mounting area */}
              <rect x={intX} y={intY} width={intW} height={intH}
                    fill="#f0f6ff" stroke="#3366cc" strokeWidth={1} strokeDasharray="5 3" />
              {/* outer frame */}
              <rect x={cx} y={cy} width={cWpx} height={cHpx} fill="none" stroke="#1a1a1a" strokeWidth={2.5} />

              {/* seq badge */}
              <circle cx={cx+wallPx+9} cy={cy+wallPx+9} r={8} fill="#222" opacity={0.75} />
              <text x={cx+wallPx+9} y={cy+wallPx+13} textAnchor="middle" fontSize={9} fill="#fff"
                    fontWeight="700" fontFamily="monospace">{pp.seq}</text>

              {/* label above */}
              <text x={cx+cWpx/2} y={cy-18} textAnchor="middle" fontSize={9} fill="#888"
                    fontFamily="monospace">
                {`Kabin ${pp.seq}`}
              </text>
              <text x={cx+cWpx/2} y={cy-6} textAnchor="middle" fontSize={11} fill="#111"
                    fontWeight="600" fontFamily="'Segoe UI', sans-serif">
                {pp.label ?? pp.panel_definition.name}
              </text>

              {/* width dim below */}
              <line x1={cx}     y1={oy+PH*scale+15} x2={cx}     y2={oy+PH*scale+24} stroke="#444" strokeWidth={1} />
              <line x1={cx+cWpx} y1={oy+PH*scale+15} x2={cx+cWpx} y2={oy+PH*scale+24} stroke="#444" strokeWidth={1} />
              <line x1={cx} y1={oy+PH*scale+19} x2={cx+cWpx} y2={oy+PH*scale+19} stroke="#444" strokeWidth={1} />
              <path d={arrowPath(cx+cWpx,oy+PH*scale+19,cx,oy+PH*scale+19)} stroke="#444" strokeWidth={1.2} fill="none" />
              <path d={arrowPath(cx,oy+PH*scale+19,cx+cWpx,oy+PH*scale+19)} stroke="#444" strokeWidth={1.2} fill="none" />
              <rect x={cx+cWpx/2-24} y={oy+PH*scale+11} width={48} height={14} fill="white" />
              <text x={cx+cWpx/2} y={oy+PH*scale+23} textAnchor="middle" fontSize={10} fill="#222" fontFamily="monospace">
                {Math.round(cW)} mm
              </text>

              {/* (0,0) origin marker */}
              <circle cx={ox0} cy={oy0} r={3} fill="#e53935" />
              <line x1={ox0} y1={oy0} x2={ox0+14} y2={oy0} stroke="#e53935" strokeWidth={1} />
              <path d={arrowPath(ox0,oy0,ox0+14,oy0,4)} stroke="#e53935" strokeWidth={1} fill="none" />
              <text x={ox0+16} y={oy0+4} fontSize={7} fill="#e53935" fontFamily="monospace">X</text>
              <line x1={ox0} y1={oy0} x2={ox0} y2={oy0-14} stroke="#e53935" strokeWidth={1} />
              <path d={arrowPath(ox0,oy0,ox0,oy0-14,4)} stroke="#e53935" strokeWidth={1} fill="none" />
              <text x={ox0+2} y={oy0-16} fontSize={7} fill="#e53935" fontFamily="monospace">Y</text>
            </g>
          );
        })}

        {/* ── Devices ──────────────────────────────────────────────────── */}
        {devices.map((pd, i) => {
          const pos = deviceToSvg(pd, layouts, ox, oy, scale, PH);
          if (!pos) return null;
          const { sx, sy, sw, sh } = pos;
          const { fill, stroke } = DEVICE_COLORS[i % DEVICE_COLORS.length];
          const minLabelH = 12;
          const fontSize  = Math.min(10, sh * 0.38, sw * 0.18);

          return (
            <g key={pd.id}>
              <rect x={sx} y={sy} width={Math.max(sw,1)} height={Math.max(sh,1)}
                    fill={fill} stroke={stroke} strokeWidth={1.5} rx={1} />
              {sh >= minLabelH && fontSize >= 4 && (
                <text x={sx+sw/2} y={sy+sh/2} textAnchor="middle" dominantBaseline="middle"
                      fontSize={fontSize} fill={stroke} fontWeight="600"
                      fontFamily="'Segoe UI', sans-serif" clipPath={`url(#clip-${pd.id})`}>
                  {pd.label}
                </text>
              )}
              {/* coord label at bottom-right */}
              {sw > 18 && sh > 18 && (
                <text x={sx+sw-2} y={sy+sh-2} textAnchor="end" fontSize={6}
                      fill={stroke} fontFamily="monospace" opacity={0.7}>
                  ({Math.round(Number(pd.x_mm))},{Math.round(Number(pd.y_mm))})
                </text>
              )}
            </g>
          );
        })}

        {/* ── Height dim on right ── */}
        <line x1={ox+PW*scale+14} y1={oy}           x2={ox+PW*scale+24} y2={oy}           stroke="#444" strokeWidth={1} />
        <line x1={ox+PW*scale+14} y1={oy+PH*scale}  x2={ox+PW*scale+24} y2={oy+PH*scale}  stroke="#444" strokeWidth={1} />
        <line x1={ox+PW*scale+19} y1={oy}            x2={ox+PW*scale+19} y2={oy+PH*scale}  stroke="#444" strokeWidth={1} />
        <path d={arrowPath(ox+PW*scale+19,oy+PH*scale,ox+PW*scale+19,oy)} stroke="#444" strokeWidth={1.2} fill="none" />
        <path d={arrowPath(ox+PW*scale+19,oy,ox+PW*scale+19,oy+PH*scale)} stroke="#444" strokeWidth={1.2} fill="none" />
        <text x={ox+PW*scale+22} y={oy+PH*scale/2} fontSize={10} fill="#222" fontFamily="monospace"
              dominantBaseline="middle" transform={`rotate(90,${ox+PW*scale+22},${oy+PH*scale/2})`}>
          {Math.round(PH)} mm
        </text>

        {/* ── Ground line ── */}
        <line x1={ox-8} y1={oy+PH*scale} x2={ox+PW*scale+8} y2={oy+PH*scale} stroke="#1a1a1a" strokeWidth={3} />
        {Array.from({ length: Math.ceil((PW*scale+16)/10) }, (_, i) => (
          <line key={i} x1={ox-8+i*10} y1={oy+PH*scale} x2={ox-8+i*10-6} y2={oy+PH*scale+6} stroke="#555" strokeWidth={1} />
        ))}

        {/* ── Ana Bakır Overlay ── */}
        {(() => {
          if (!copperSettings) return null;
          const cs = copperSettings;
          if (cs.busbar_x_mm == null || cs.busbar_y_mm == null || !cs.busbar_length_mm) return null;
          if (!layouts.length) return null;

          const firstLayout = layouts[0];
          const phaseCount = Math.min(Number(cs.busbar_phase_count ?? 3), 4);
          const spacing   = Number(cs.main_phase_spacing_mm ?? 60);
          const barW      = Number(cs.main_width_mm ?? 40);
          const lenMm     = Number(cs.busbar_length_mm);
          const isH       = (cs.busbar_orientation ?? "horizontal") === "horizontal";

          // Global mm from assembly top-left interior
          const xBase = firstLayout.intLeft + Number(cs.busbar_x_mm);
          // Y from assembly top: interior bottom minus y_mm
          const yBase = firstLayout.intBottom - Number(cs.busbar_y_mm);

          return Array.from({ length: phaseCount }, (_, pi) => {
            const color = PHASE_COLORS[pi];
            const label = PHASE_LABELS[pi];

            let rx: number, ry: number, rw: number, rh: number;
            if (isH) {
              // horizontal run: length along X, width along Y (stacked upward)
              rx = ox + xBase * scale;
              ry = oy + (yBase - (pi + 1) * spacing) * scale;
              rw = lenMm * scale;
              rh = Math.max(barW * scale, 3);
            } else {
              // vertical run: length along Y, width along X (side by side)
              rx = ox + (xBase + pi * spacing) * scale;
              ry = oy + (yBase - lenMm) * scale;
              rw = Math.max(barW * scale, 3);
              rh = lenMm * scale;
            }

            return (
              <g key={`busbar-phase-${pi}`}>
                <rect
                  x={rx} y={ry} width={rw} height={rh}
                  fill={color} opacity={0.75} rx={1}
                  stroke={color} strokeWidth={1}
                />
                <text
                  x={isH ? rx + 4 : rx + rw / 2}
                  y={isH ? ry + rh / 2 : ry + 10}
                  dominantBaseline="middle"
                  textAnchor={isH ? "start" : "middle"}
                  fontSize={Math.min(9, Math.max(rh * 0.55, 5))}
                  fill="#fff"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          });
        })()}
      </svg>
    </section>
  );
}
