/**
 * ConnectionSchematicView — Bağlantı Topoloji Şeması
 *
 * Koyu tema SVG: Ana bakır faz barları → cihaz terminal bağlantıları
 *
 * Sol blok:  Faz barları (dikey renkli çizgiler)
 * Sağ blok:  Cihaz kutuları (etiketli dikdörtgenler)
 * Çizgiler:
 *   - Renk = faz rengi
 *   - Solid = main_to_device (ana bakır → cihaz)
 *   - Kesik  = device_to_device (cihaz → cihaz)
 *   - ∿ sembolü = büküm tipi atanmış
 *   - Kalın = tali bakır atanmış
 */

import type { DeviceConnection, ProjectDevice } from "../../types";
import { PHASE_COLORS, phaseColorIndex } from "./viewHelpers";

interface Props {
  connections: DeviceConnection[];
  devices: ProjectDevice[];
}

// ── Sabitler ──────────────────────────────────────────────────────────────────
const BG      = "#1a1f2b";
const C_SURF  = "#0d1117";
const C_LINE  = "#334155";
const C_TEXT  = "#94a3b8";
const C_DIM   = "#475569";
const C_DEV   = "#1e293b";
const C_DEV_B = "#334155";

const SVG_W   = 520;
const PAD     = 16;
const BUS_X   = PAD + 20;         // busbar sol x
const BUS_W   = 10;               // bar genişliği (px)
const BUS_PH  = 16;               // fazlar arası boşluk (px)
const BUS_Y1  = 40;               // bar başlangıç y
const BUS_Y2  = 300;              // bar bitiş y

const DEV_X   = BUS_X + 80;      // cihaz blok başlangıç x
const DEV_W   = 110;              // cihaz kutu genişliği
const DEV_H   = 28;               // cihaz kutu yüksekliği
const DEV_GAP = 8;               // cihazlar arası boşluk
const DEV_PAD = PAD;

// ── Faz sırası ─────────────────────────────────────────────────────────────
const PHASE_ORDER = ["L1", "L2", "L3", "N", "PE"];

function phaseColor(phase: string): string {
  return PHASE_COLORS[phaseColorIndex(phase)] ?? "#888";
}

// ── Zig-zag path (büküm sembolü) ────────────────────────────────────────────
function zigzagPath(x1: number, y: number, x2: number): string {
  const mid = (x1 + x2) / 2;
  const amp = 5;
  const seg = 6;
  const steps = 4;
  let d = `M ${x1} ${y}`;
  for (let i = 0; i < steps; i++) {
    const px = mid - (steps / 2) * seg + i * seg;
    const py = y + (i % 2 === 0 ? -amp : amp);
    d += ` L ${px} ${py}`;
  }
  d += ` L ${x2} ${y}`;
  return d;
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function ConnectionSchematicView({ connections, devices }: Props) {
  if (connections.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${SVG_W} 120`}
        width="100%"
        style={{ display: "block", borderRadius: 8 }}
      >
        <rect width={SVG_W} height={120} fill={BG} rx={8} />
        <text x={SVG_W / 2} y={60} textAnchor="middle" fill={C_DIM} fontSize={13}>
          Bağlantı eklendikçe şema burada görünür
        </text>
      </svg>
    );
  }

  // ── Kullanılan fazları belirle ─────────────────────────────────────────────
  const usedPhases = PHASE_ORDER.filter((p) =>
    connections.some((c) => c.phase === p),
  );

  // ── Cihazları sırala ───────────────────────────────────────────────────────
  const uniqueDeviceIds = Array.from(new Set(connections.map((c) => c.target_device_id)));
  const orderedDevices = uniqueDeviceIds
    .map((id) => devices.find((d) => d.id === id))
    .filter(Boolean) as ProjectDevice[];
  orderedDevices.sort((a, b) => a.label.localeCompare(b.label));

  // ── SVG yüksekliği hesapla ────────────────────────────────────────────────
  const devAreaH = orderedDevices.length * (DEV_H + DEV_GAP) + DEV_PAD * 2;
  const busH     = Math.max(BUS_Y2 - BUS_Y1, devAreaH - 20);
  const svgH     = Math.max(devAreaH + 50, BUS_Y1 + busH + 30);

  // ── Cihaz Y koordinatları ─────────────────────────────────────────────────
  function deviceY(idx: number): number {
    const totalH = orderedDevices.length * (DEV_H + DEV_GAP) - DEV_GAP;
    const startY = (svgH - totalH) / 2;
    return startY + idx * (DEV_H + DEV_GAP);
  }

  // ── Faz barı X koordinatı ─────────────────────────────────────────────────
  function phaseBarX(phase: string): number {
    const idx = usedPhases.indexOf(phase);
    return BUS_X + idx * (BUS_W + BUS_PH) + BUS_W / 2;
  }

  const busY1 = 40;
  const busY2 = svgH - 30;

  // ── Bağlantı grupları (hedef cihaz bazında) ───────────────────────────────
  const connsByDevice = new Map<number, DeviceConnection[]>();
  for (const c of connections) {
    if (!connsByDevice.has(c.target_device_id)) connsByDevice.set(c.target_device_id, []);
    connsByDevice.get(c.target_device_id)!.push(c);
  }

  // ── Sağ sütun genişliği ───────────────────────────────────────────────────
  const devColX = BUS_X + usedPhases.length * (BUS_W + BUS_PH) + 30;
  const devRight = devColX + DEV_W;
  const viewW = devRight + PAD + 10;
  const scaleX = SVG_W / Math.max(viewW, SVG_W);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgH}`}
      width="100%"
      style={{ display: "block", borderRadius: 8 }}
      fontFamily="'Segoe UI', system-ui, monospace"
    >
      {/* Arka plan */}
      <rect width={SVG_W} height={svgH} fill={BG} rx={8} />

      {/* ── Faz barları ──────────────────────────────────────────────────────── */}
      {usedPhases.map((phase, pi) => {
        const x = BUS_X + pi * (BUS_W + BUS_PH);
        const clr = phaseColor(phase);
        return (
          <g key={phase}>
            {/* Bar dikey çizgisi */}
            <rect
              x={x} y={busY1 + 14} width={BUS_W} height={busY2 - busY1 - 14}
              fill={`${clr}22`} stroke={clr} strokeWidth={1.5} rx={2}
            />
            {/* Faz etiketi */}
            <text
              x={x + BUS_W / 2} y={busY1 + 10}
              textAnchor="middle" fill={clr}
              fontSize={10} fontWeight={700} fontFamily="monospace"
            >
              {phase}
            </text>
          </g>
        );
      })}

      {/* "ANA BAKIR" etiketi */}
      <text x={BUS_X} y={busY2 + 14} fill={C_DIM} fontSize={9}>ANA BAKIR</text>

      {/* ── Cihaz kutuları ────────────────────────────────────────────────────── */}
      {orderedDevices.map((dev, di) => {
        const dy = deviceY(di);
        const devConns = connsByDevice.get(dev.id) ?? [];

        // Bu cihazın fazlarını topla
        const devPhases = Array.from(new Set(devConns.map((c) => c.phase)));

        return (
          <g key={dev.id}>
            {/* Cihaz kutusu */}
            <rect
              x={devColX} y={dy} width={DEV_W} height={DEV_H}
              fill={C_DEV} stroke={C_DEV_B} strokeWidth={1} rx={4}
            />
            {/* Cihaz etiketi */}
            <text
              x={devColX + 6} y={dy + 11}
              fill={C_TEXT} fontSize={10} fontWeight={700}
            >
              {dev.label.length > 12 ? dev.label.slice(0, 11) + "…" : dev.label}
            </text>
            {/* Model bilgisi */}
            <text
              x={devColX + 6} y={dy + 22}
              fill={C_DIM} fontSize={8}
            >
              {`${dev.device.brand} ${dev.device.model}`.slice(0, 18)}
            </text>

            {/* Faz renk noktaları (sağ kenarda) */}
            {devPhases.slice(0, 4).map((ph, i) => (
              <circle
                key={ph}
                cx={devColX + DEV_W - 8 - i * 9} cy={dy + DEV_H / 2}
                r={3} fill={phaseColor(ph)}
              />
            ))}

            {/* ── Bağlantı çizgileri ───────────────────────────────────────── */}
            {devConns.map((conn, ci) => {
              const barX = phaseBarX(conn.phase);
              const lineY = dy + 6 + ci * Math.min(4, (DEV_H - 8) / Math.max(devConns.length, 1));
              const clr = phaseColor(conn.phase);
              const isDashed = conn.connection_type === "device_to_device";
              const isThick  = !!conn.branch_conductor_id;
              const hasBend  = !!conn.bend_type_id;
              const strokeW  = isThick ? 2.2 : 1.2;

              if (hasBend) {
                // Büküm sembolü: bar çıkışından devColX'e kadar normal çizgi +
                // ortada zig-zag + sonra devColX'e bağlan
                const midX = barX + BUS_W / 2 + 20;
                return (
                  <g key={conn.id}>
                    <line
                      x1={barX + BUS_W / 2} y1={lineY}
                      x2={midX - 12} y2={lineY}
                      stroke={clr} strokeWidth={strokeW}
                      strokeDasharray={isDashed ? "5 3" : undefined}
                    />
                    <path
                      d={zigzagPath(midX - 12, lineY, midX + 12)}
                      fill="none" stroke={clr} strokeWidth={strokeW + 0.5}
                    />
                    <line
                      x1={midX + 12} y1={lineY}
                      x2={devColX} y2={lineY}
                      stroke={clr} strokeWidth={strokeW}
                      strokeDasharray={isDashed ? "5 3" : undefined}
                    />
                  </g>
                );
              }

              return (
                <line
                  key={conn.id}
                  x1={barX + BUS_W / 2} y1={lineY}
                  x2={devColX} y2={lineY}
                  stroke={clr} strokeWidth={strokeW}
                  strokeDasharray={isDashed ? "5 3" : undefined}
                  strokeOpacity={0.85}
                />
              );
            })}
          </g>
        );
      })}

      {/* ── Lejant ───────────────────────────────────────────────────────────── */}
      <g transform={`translate(${SVG_W - 140}, ${svgH - 36})`}>
        <rect x={0} y={0} width={130} height={32} fill={C_SURF} rx={4} opacity={0.9} />
        <line x1={8} y1={10} x2={30} y2={10} stroke={C_TEXT} strokeWidth={1.5} />
        <text x={34} y={13} fill={C_DIM} fontSize={8}>Ana Bakır→Cihaz</text>
        <line x1={8} y1={24} x2={30} y2={24} stroke={C_TEXT} strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={34} y={27} fill={C_DIM} fontSize={8}>Cihaz→Cihaz</text>
      </g>

      {/* Büküm sembolü lejant */}
      <g transform={`translate(${PAD}, ${svgH - 22})`}>
        <path d={zigzagPath(0, 8, 24)} fill="none" stroke={C_DIM} strokeWidth={1.2} />
        <text x={28} y={12} fill={C_DIM} fontSize={8}>Büküm tipi atanmış</text>
      </g>
    </svg>
  );
}
