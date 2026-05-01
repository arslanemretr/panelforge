/**
 * DeviceTechDrawing — Mühendislik teknik çizim bileşeni
 *
 * Tek SVG içinde 3 hizalı ortografik görünüm:
 *   [Ön Görünüm  ]  [Sağ Yan Görünüm]
 *   [Alt Plan    ]
 *
 * Görünümler birbirine projeksiyon çizgileriyle hizalı.
 * Delik sembolü, boyut okları, merkez çizgileri, lejant.
 */

const COLORS = {
  paper:      "#f4f6f8",   // kağıt zemin
  border:     "#c8d4e0",   // kağıt kenarlığı
  grid:       "#dce6ef",   // faint grid
  object:     "#1a2e3d",   // kalın nesne çizgisi
  dim:        "#2d5a8e",   // boyut çizgisi / ok
  dimText:    "#1e3a5f",
  center:     "#b03030",   // merkez çizgisi
  hidden:     "#7a8fa8",   // gizli çizgi
  projection: "#aabbd0",   // projeksiyon bağlantı çizgisi
  viewBg:     "#ffffff",   // görünüm zemin
  labelBg:    "#e0eaf6",
  labelText:  "#1a2e3d",
};

const OBJ_W  = 1.6;   // nesne çizgisi kalınlığı
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
  terminal_width_mm?: number | null;
  terminal_height_mm?: number | null;
  terminal_depth_mm?: number | null;
  hole_diameter_mm?: number | null;
  bolt_type?: string | null;
  bolt_count?: number | null;
  bolt_center_distance_mm?: number | null;
}

export interface DeviceTechDrawingProps {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  terminals: TechTerminal[];
  /** Bileşen display yüksekliği (px). Varsayılan 480. */
  height?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı çizim fonksiyonları
// ─────────────────────────────────────────────────────────────────────────────

/** Çift-ok boyut çizgisi */
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
  const ARR = 4; // ok başı boyutu
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
      {/* uzatma çizgileri */}
      {vertical ? (
        <>
          <line x1={x1 - 3} y1={y1} x2={x1 + offset + 8} y2={y1} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line x1={x2 - 3} y1={y2} x2={x2 + offset + 8} y2={y2} stroke={COLORS.dim} strokeWidth={DIM_W * 0.6} />
          <line
            x1={x1 + offset} y1={y1} x2={x2 + offset} y2={y2}
            stroke={COLORS.dim} strokeWidth={DIM_W}
            markerEnd={`url(#${arrowId})`}
            markerStart={`url(#${arrowBackId})`}
          />
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
          <line
            x1={x1} y1={y1 + offset} x2={x2} y2={y2 + offset}
            stroke={COLORS.dim} strokeWidth={DIM_W}
            markerEnd={`url(#${arrowId})`}
            markerStart={`url(#${arrowBackId})`}
          />
          <text x={mx} y={y1 + offset - 3} fill={COLORS.dimText}
            fontSize={7} textAnchor="middle" dominantBaseline="auto">
            {text}
          </text>
        </>
      )}
    </g>
  );
}

/** Delik sembolü: daire + yatay/dikey merkez çizgileri */
function HoleSymbol({
  cx, cy, r, label, dimR,
}: {
  cx: number; cy: number; r: number; label?: string; dimR?: number;
}) {
  const ext = r * 1.6;
  return (
    <g>
      {/* dış boyut dairesi (varsa) */}
      {dimR && dimR > r && (
        <circle cx={cx} cy={cy} r={dimR}
          fill="none" stroke={COLORS.hidden} strokeWidth={HID_W} strokeDasharray="3 2" />
      )}
      {/* delik dairesi */}
      <circle cx={cx} cy={cy} r={r}
        fill="rgba(30,46,61,0.06)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
      {/* merkez çizgileri */}
      <line x1={cx - ext} y1={cy} x2={cx + ext} y2={cy}
        stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
      <line x1={cx} y1={cy - ext} x2={cx} y2={cy + ext}
        stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
      {/* etiket */}
      {label && (
        <text x={cx + r + 3} y={cy - r - 2} fill={COLORS.dimText}
          fontSize={6.5} textAnchor="start">
          {label}
        </text>
      )}
    </g>
  );
}

/** Görünüm etiketi kutusu */
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

// ─────────────────────────────────────────────────────────────────────────────
// Ana bileşen
// ─────────────────────────────────────────────────────────────────────────────

export function DeviceTechDrawing({
  widthMm, heightMm, depthMm, terminals, height = 480,
}: DeviceTechDrawingProps) {
  const W = Math.max(widthMm  || 1, 1);
  const H = Math.max(heightMm || 1, 1);
  const D = Math.max(depthMm  || 1, 1);

  // Çizim boşlukları (mm biriminde, SVG birimlerine doğrudan eşlenir)
  const OUTER   = 12;  // kağıt kenar boşluğu
  const DIM_OFF = 22;  // boyut oku boşluğu
  const GAP     = 18;  // görünümler arası boşluk
  const LBL_H   = 13;  // görünüm etiketi yüksekliği

  // Görünüm kök koordinatları
  const frontX  = OUTER + DIM_OFF;
  const frontY  = OUTER + DIM_OFF;
  const sideX   = frontX + W + GAP;
  const sideY   = frontY;
  const topX    = frontX;
  const topY    = frontY + H + GAP;

  // Toplam SVG iç boyutu (mm)
  const svgW = sideX + D + DIM_OFF + OUTER;
  const svgH = topY  + D + DIM_OFF + OUTER;

  // Grid çizgisi aralığı: 10mm veya büyük cihazlarda daha seyrek
  const gridStep = Math.max(W, H, D) > 400 ? 50 : Math.max(W, H, D) > 200 ? 25 : 10;

  // Terminal filtreleri
  const frontTerminals = terminals.filter(
    (t) => !t.terminal_face || t.terminal_face === "front"
  );
  const sideTerminals = terminals.filter(
    (t) => t.terminal_face && ["right", "left", "back"].includes(t.terminal_face)
  );
  const topTerminals = terminals.filter(
    (t) => t.terminal_face && ["top", "bottom"].includes(t.terminal_face)
  );
  // Ön terminallerden üst görünümde gizli çizgi olarak gösterilenler
  const topHiddenTerminals = frontTerminals;

  // Delik yarıçapı: hole_diameter_mm/2, yoksa varsayılan
  const holeR = (t: TechTerminal) =>
    t.hole_diameter_mm ? Number(t.hole_diameter_mm) / 2 : Math.min(W, H) * 0.04 + 2;

  const dimId = (suffix: string) => `d-${suffix}-${W}-${H}-${D}`;

  return (
    <div style={{ width: "100%", height, background: COLORS.border, borderRadius: 10, padding: 1 }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", borderRadius: 9 }}
        fontFamily="'Courier New', Consolas, monospace"
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

        {/* ── Projeksiyon hizalama çizgileri (kesikli) ─────────────── */}
        {/* Ön ← Üst hizası (dikey) */}
        <line x1={frontX} y1={frontY + H} x2={topX} y2={topY}
          stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
        <line x1={frontX + W} y1={frontY + H} x2={topX + W} y2={topY}
          stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
        {/* Ön ← Sağ hizası (yatay) */}
        <line x1={frontX + W} y1={frontY} x2={sideX} y2={sideY}
          stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />
        <line x1={frontX + W} y1={frontY + H} x2={sideX} y2={sideY + H}
          stroke={COLORS.projection} strokeWidth={0.5} strokeDasharray="4 3" />

        {/* ── ÖN GÖRÜNÜM ───────────────────────────────────────────── */}
        <g>
          <rect x={frontX} y={frontY} width={W} height={H}
            fill={COLORS.viewBg} stroke={COLORS.object} strokeWidth={OBJ_W} />

          {/* Ön terminaller */}
          {frontTerminals.map((t, i) => {
            const cx = frontX + Number(t.x_mm);
            const cy = frontY + Number(t.y_mm);
            const r  = holeR(t);
            const bw = t.terminal_width_mm  ? Number(t.terminal_width_mm)  : 0;
            const bh = t.terminal_height_mm ? Number(t.terminal_height_mm) : 0;
            return (
              <g key={i}>
                {bw > 0 && bh > 0 ? (
                  // Terminal blok dikdörtgeni
                  <>
                    <rect x={cx - bw/2} y={cy - bh/2} width={bw} height={bh}
                      fill="rgba(30,46,61,0.04)" stroke={COLORS.object} strokeWidth={OBJ_W * 0.7} />
                    {/* merkez çizgileri */}
                    <line x1={cx - bw/2 - 4} y1={cy} x2={cx + bw/2 + 4} y2={cy}
                      stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
                    <line x1={cx} y1={cy - bh/2 - 4} x2={cx} y2={cy + bh/2 + 4}
                      stroke={COLORS.center} strokeWidth={CTR_W} strokeDasharray="4 2 1 2" />
                    {/* Vida delikleri */}
                    {t.bolt_center_distance_mm && (
                      <>
                        <HoleSymbol cx={cx - Number(t.bolt_center_distance_mm)/2} cy={cy} r={r * 0.8} />
                        {(t.bolt_count ?? 2) >= 2 && (
                          <HoleSymbol cx={cx + Number(t.bolt_center_distance_mm)/2} cy={cy} r={r * 0.8} />
                        )}
                      </>
                    )}
                    <text x={cx + bw/2 + 3} y={cy - bh/2 - 2} fill={COLORS.dimText}
                      fontSize={6.5}>{t.terminal_name}</text>
                  </>
                ) : (
                  <HoleSymbol cx={cx} cy={cy} r={r} label={t.terminal_name} />
                )}
              </g>
            );
          })}

          {/* Görünüm etiketi */}
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

          {/* Sağ yan görünümde ön terminaller gizli çizgi olarak */}
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

          {/* Gizli çizgi — ön terminaller yukarıdan bakıldığında */}
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

          {/* Üst terminaller */}
          {topTerminals.map((t, i) => {
            const cx = topX + Number(t.x_mm);
            const cy = topY + Number(t.z_mm ?? 0);
            const r  = holeR(t);
            return <HoleSymbol key={`top${i}`} cx={cx} cy={cy} r={r} label={t.terminal_name} />;
          })}

          <ViewLabel x={topX} y={topY + D + 4} w={W} text="ALT PLAN" />
        </g>

        {/* ── BOYUT OKLARI ─────────────────────────────────────────── */}

        {/* Genişlik W — ön görünüm üstü */}
        <DimLine
          id={dimId("W")}
          x1={frontX} y1={frontY} x2={frontX + W} y2={frontY}
          text={`${W} mm`} offset={-DIM_OFF + 6}
        />

        {/* Yükseklik H — ön görünüm solu */}
        <DimLine
          id={dimId("H")}
          x1={frontX} y1={frontY} x2={frontX} y2={frontY + H}
          text={`${H} mm`} offset={-DIM_OFF + 6} vertical
        />

        {/* Derinlik D — yan görünüm üstü */}
        <DimLine
          id={dimId("D")}
          x1={sideX} y1={sideY} x2={sideX + D} y2={sideY}
          text={`${D} mm`} offset={-DIM_OFF + 6}
        />

        {/* Derinlik D tekrar — üst plan sağı */}
        <DimLine
          id={dimId("D2")}
          x1={topX + W} y1={topY} x2={topX + W} y2={topY + D}
          text={`${D} mm`} offset={DIM_OFF - 6} vertical
        />

        {/* ── LEJANT (sağ alt) ─────────────────────────────────────── */}
        {(() => {
          const lx = sideX;
          const ly = topY;
          const lw = D;
          const lh = D;
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
              {/* Nesne çizgisi örneği */}
              {[
                { y: 20, stroke: COLORS.object, sw: OBJ_W, dash: "", label: "Nesne" },
                { y: 28, stroke: COLORS.hidden,  sw: HID_W, dash: "3 2",  label: "Gizli" },
                { y: 36, stroke: COLORS.center,  sw: CTR_W, dash: "4 2 1 2", label: "Merkez" },
                { y: 44, stroke: COLORS.dim,     sw: DIM_W, dash: "",  label: "Ölçü" },
                { y: 52, stroke: COLORS.projection, sw: 0.5, dash: "4 3", label: "Projeksiyon" },
              ].map(({ y, stroke, sw, dash, label }) => (
                <g key={label}>
                  <line x1={lx + 4} y1={ly + y} x2={lx + 20} y2={ly + y}
                    stroke={stroke} strokeWidth={sw}
                    strokeDasharray={dash || undefined} />
                  <text x={lx + 24} y={ly + y + 3} fill={COLORS.dimText}
                    fontSize={5.5}>{label}</text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* ── Dış çerçeve ──────────────────────────────────────────── */}
        <rect x={1} y={1} width={svgW - 2} height={svgH - 2}
          fill="none" stroke={COLORS.border} strokeWidth={1.2} rx={2} />
        {/* İç çerçeve */}
        <rect x={OUTER - 2} y={OUTER - 2}
          width={svgW - 2 * (OUTER - 2)} height={svgH - 2 * (OUTER - 2)}
          fill="none" stroke={COLORS.object} strokeWidth={0.8} />
      </svg>
    </div>
  );
}
