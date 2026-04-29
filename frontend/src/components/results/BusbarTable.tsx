import type { Busbar } from "../../types";

interface BusbarTableProps {
  busbars: Busbar[];
  onView?: (busbar: Busbar) => void;
}

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  main: { label: "Ana", bg: "rgba(224,104,0,0.12)", color: "#b45309" },
  branch: { label: "Tali", bg: "rgba(21,101,192,0.12)", color: "#1565c0" },
};

const PHASE_COLORS: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1565c0",
  N: "#616161",
};

export function BusbarTable({ busbars, onView }: BusbarTableProps) {
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 840 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Parca No</th>
              <th style={{ width: 70 }}>Tip</th>
              <th style={{ width: 50 }}>Faz</th>
              <th>Bagli Cihaz</th>
              <th style={{ width: 100 }}>Kesit (mm)</th>
              <th style={{ width: 110 }}>Kesim Boyu</th>
              <th style={{ width: 60 }}>Delik</th>
              <th style={{ width: 60 }}>Bukum</th>
              <th style={{ width: 120 }}>Gorunum</th>
            </tr>
          </thead>
          <tbody>
            {busbars.map((busbar) => {
              const badge =
                TYPE_BADGE[busbar.busbar_type] ?? { label: busbar.busbar_type, bg: "#eee", color: "#333" };
              const phaseColor = PHASE_COLORS[busbar.phase] ?? "#888";

              return (
                <tr key={busbar.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{busbar.part_no}</td>
                  <td>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        background: `${phaseColor}18`,
                        color: phaseColor,
                        borderRadius: 6,
                        padding: "2px 7px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {busbar.phase}
                    </span>
                  </td>
                  <td style={{ color: busbar.connected_device_label ? "var(--text)" : "var(--muted)" }}>
                    {busbar.connected_device_label ?? "-"}
                  </td>
                  <td style={{ fontFamily: "monospace" }}>
                    {busbar.width_mm}x{busbar.thickness_mm}
                  </td>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{busbar.cut_length_mm} mm</td>
                  <td style={{ textAlign: "center" }}>{busbar.holes.length}</td>
                  <td style={{ textAlign: "center" }}>{busbar.bends.length}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      style={{ padding: "0.35rem 0.7rem", borderRadius: 8, fontSize: "0.82rem" }}
                      onClick={() => onView?.(busbar)}
                    >
                      Goruntule
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
