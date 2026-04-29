import type { ProjectPanel } from "../types";

interface PanelAssemblyPreviewProps {
  items: ProjectPanel[];
}

// ── Layout constants ──────────────────────────────────────────────────────────
const SVG_W = 900;
const PAD_L = 60;   // left margin (extra room for height dim)
const PAD_R = 70;   // right margin (height dim line lives here)
const PAD_T = 52;   // top  (label + dim clearance)
const PAD_B = 88;   // bottom (two rows of dim lines)
const ARROW = 7;

// ── Helpers ───────────────────────────────────────────────────────────────────
function arrowPath(x1: number, y1: number, x2: number, y2: number, sz = ARROW): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  return (
    `M${x2},${y2}L${x2 + sz * Math.cos(a + 2.5)},${y2 + sz * Math.sin(a + 2.5)} ` +
    `M${x2},${y2}L${x2 + sz * Math.cos(a - 2.5)},${y2 + sz * Math.sin(a - 2.5)}`
  );
}

function fmt(v: number): string {
  return `${Math.round(v)} mm`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PanelAssemblyPreview({ items }: PanelAssemblyPreviewProps) {
  if (!items.length) {
    return (
      <div className="empty-state" style={{ padding: "2rem 0" }}>
        Ön görünüş için en az bir kabin seçin.
      </div>
    );
  }

  const defs = items.map((i) => i.panel_definition);
  const totalW = defs.reduce((s, d) => s + Number(d.width_mm), 0);
  const maxH = Math.max(...defs.map((d) => Number(d.height_mm)));

  const availW = SVG_W - PAD_L - PAD_R;
  const availH = 380; // target cabinet area height
  const scale = Math.min(availW / Math.max(totalW, 1), availH / Math.max(maxH, 1));

  const totalWpx = totalW * scale;
  const SVG_H = PAD_T + maxH * scale + PAD_B;

  // Baseline (bottom of tallest cabinet)
  const yBase = PAD_T + maxH * scale;

  // Pre-compute per-cabinet layout
  let cx = PAD_L;
  const cabinets = items.map((item) => {
    const d = item.panel_definition;
    const W = Number(d.width_mm) * scale;
    const H = Number(d.height_mm) * scale;
    const x = cx;
    const y = yBase - H;
    cx += W;

    // Inner mounting plate area
    const ml = Number(d.left_margin_mm ?? 0) * scale;
    const mr = Number(d.right_margin_mm ?? 0) * scale;
    const mt = Number(d.top_margin_mm ?? 0) * scale;
    const mb = Number(d.bottom_margin_mm ?? 0) * scale;
    const mpX = x + ml;
    const mpY = y + mt;
    const mpW = Math.max(W - ml - mr, 0);
    const mpH = Math.max(H - mt - mb, 0);

    return { item, d, x, y, W, H, mpX, mpY, mpW, mpH };
  });

  // Dim row Y positions
  const dimY1 = yBase + 24;   // individual width dims
  const dimY2 = yBase + 56;   // total width dim
  const dimXH = PAD_L + totalWpx + 22; // height dim X (right of assembly)

  // Visual wall thickness (min 6px, max 18px)
  const wallPx = Math.max(6, Math.min(18, 25 * scale));

  return (
    <section className="table-card">
      <div className="section-header">
        <h3>Ön Görünüş</h3>
        <span className="helper-text">
          Toplam genişlik: {fmt(totalW)} &nbsp;/&nbsp; Maks. yükseklik: {fmt(maxH)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{
          display: "block",
          background: "#ffffff",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <defs>
          {/* Cross-hatch pattern for wall material */}
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0,6 L6,0" stroke="#bbb" strokeWidth="0.8" />
          </pattern>
        </defs>

        {cabinets.map(({ item, d, x, y, W, H, mpX, mpY, mpW, mpH }, idx) => {
          const cx = x + W / 2;
          const label = item.label ?? d.name;

          return (
            <g key={item.id}>
              {/* ── Cabinet body (wall fill = hatch) ── */}
              <rect x={x} y={y} width={W} height={H} fill="url(#hatch)" stroke="#1a1a1a" strokeWidth={2} />

              {/* ── Inner wall lines (top / left / right) showing wall thickness ── */}
              {/* Top wall */}
              <rect x={x} y={y} width={W} height={wallPx} fill="#e0e0e0" stroke="none" />
              {/* Left wall */}
              <rect x={x} y={y} width={wallPx} height={H} fill="#e0e0e0" stroke="none" />
              {/* Right wall */}
              <rect x={x + W - wallPx} y={y} width={wallPx} height={H} fill="#e0e0e0" stroke="none" />
              {/* Bottom (base) */}
              <rect x={x} y={y + H - wallPx} width={W} height={wallPx} fill="#d0d0d0" stroke="none" />

              {/* ── Mounting plate area ── */}
              {mpW > 0 && mpH > 0 && (
                <rect
                  x={mpX}
                  y={mpY}
                  width={mpW}
                  height={mpH}
                  fill="#eef4ff"
                  stroke="#3366cc"
                  strokeWidth={1}
                  strokeDasharray="5 3"
                />
              )}

              {/* ── Outer frame on top ── */}
              <rect x={x} y={y} width={W} height={H} fill="none" stroke="#1a1a1a" strokeWidth={2.5} />

              {/* ── Cabinet number badge ── */}
              <text
                x={x + wallPx + 4}
                y={y + wallPx + 13}
                fontSize={Math.max(9, Math.min(13, W * 0.08))}
                fill="#1a1a1a"
                fontWeight="700"
                fontFamily="monospace"
              >
                {idx + 1}
              </text>

              {/* ── Label above cabinet ── */}
              <text
                x={cx}
                y={y - 8}
                textAnchor="middle"
                fontSize={12}
                fill="#111"
                fontWeight="600"
                fontFamily="'Segoe UI', sans-serif"
              >
                {label}
              </text>

              {/* ── Individual width dimension line (below cabinet) ── */}
              {/* Ticks */}
              <line x1={x} y1={yBase + 6} x2={x} y2={yBase + 18} stroke="#444" strokeWidth={1} />
              <line x1={x + W} y1={yBase + 6} x2={x + W} y2={yBase + 18} stroke="#444" strokeWidth={1} />
              {/* Arrows + line */}
              <line x1={x} y1={dimY1} x2={x + W} y2={dimY1} stroke="#444" strokeWidth={1} />
              <path d={arrowPath(x + W, dimY1, x, dimY1)} stroke="#444" strokeWidth={1.2} fill="none" />
              <path d={arrowPath(x, dimY1, x + W, dimY1)} stroke="#444" strokeWidth={1.2} fill="none" />
              {/* Text */}
              <rect
                x={cx - 22}
                y={dimY1 - 8}
                width={44}
                height={14}
                fill="white"
              />
              <text x={cx} y={dimY1 + 4} textAnchor="middle" fontSize={10} fill="#222" fontFamily="monospace">
                {fmt(Number(d.width_mm))}
              </text>

              {/* ── Height dim (individual, right side of each cabinet) ── */}
              <line x1={x + W + 4} y1={y} x2={x + W + 14} y2={y} stroke="#999" strokeWidth={0.8} />
              <line x1={x + W + 4} y1={y + H} x2={x + W + 14} y2={y + H} stroke="#999" strokeWidth={0.8} />
              <line x1={x + W + 9} y1={y} x2={x + W + 9} y2={y + H} stroke="#999" strokeWidth={0.8} strokeDasharray="3 2" />
              <text
                x={x + W + 12}
                y={y + H / 2}
                fontSize={9}
                fill="#555"
                fontFamily="monospace"
                dominantBaseline="middle"
                transform={`rotate(90, ${x + W + 12}, ${y + H / 2})`}
              >
                {fmt(Number(d.height_mm))}
              </text>
            </g>
          );
        })}

        {/* ── Total width dimension line ── */}
        {items.length > 1 && (
          <g>
            <line x1={PAD_L} y1={yBase + 36} x2={PAD_L} y2={dimY2} stroke="#222" strokeWidth={1} />
            <line x1={PAD_L + totalWpx} y1={yBase + 36} x2={PAD_L + totalWpx} y2={dimY2} stroke="#222" strokeWidth={1} />
            <line x1={PAD_L} y1={dimY2} x2={PAD_L + totalWpx} y2={dimY2} stroke="#222" strokeWidth={1.5} />
            <path d={arrowPath(PAD_L + totalWpx, dimY2, PAD_L, dimY2)} stroke="#222" strokeWidth={1.4} fill="none" />
            <path d={arrowPath(PAD_L, dimY2, PAD_L + totalWpx, dimY2)} stroke="#222" strokeWidth={1.4} fill="none" />
            <rect
              x={PAD_L + totalWpx / 2 - 34}
              y={dimY2 - 9}
              width={68}
              height={16}
              fill="white"
            />
            <text
              x={PAD_L + totalWpx / 2}
              y={dimY2 + 5}
              textAnchor="middle"
              fontSize={11}
              fontWeight="700"
              fill="#111"
              fontFamily="monospace"
            >
              {fmt(totalW)}
            </text>
          </g>
        )}

        {/* ── Ground line ── */}
        <line
          x1={PAD_L - 10}
          y1={yBase}
          x2={PAD_L + totalWpx + 10}
          y2={yBase}
          stroke="#1a1a1a"
          strokeWidth={3}
        />
        {/* ground hatching */}
        {Array.from({ length: Math.ceil((totalWpx + 20) / 10) }, (_, i) => (
          <line
            key={i}
            x1={PAD_L - 10 + i * 10}
            y1={yBase}
            x2={PAD_L - 10 + i * 10 - 6}
            y2={yBase + 6}
            stroke="#555"
            strokeWidth={1}
          />
        ))}
      </svg>
    </section>
  );
}
