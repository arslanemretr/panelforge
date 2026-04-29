import type { Busbar } from "../../types";

interface HoleTableProps {
  busbars: Busbar[];
}

export function HoleTable({ busbars }: HoleTableProps) {
  const rows = busbars.flatMap((busbar) =>
    busbar.holes.map((hole) => ({
      partNo:      busbar.part_no,
      busbarPhase: busbar.phase,
      hole,
    })),
  );

  if (rows.length === 0) return null;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Parça No</th>
              <th style={{ width: 70  }}>Delik No</th>
              <th style={{ width: 80  }}>X (mm)</th>
              <th style={{ width: 80  }}>Y (mm)</th>
              <th style={{ width: 120 }}>Ölçü</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ partNo, hole }) => {
              const isSlot = hole.slot_width_mm != null && hole.slot_length_mm != null;
              const sizeLabel = isSlot
                ? `${hole.slot_length_mm}×${hole.slot_width_mm} oval`
                : hole.diameter_mm != null
                  ? `ø${hole.diameter_mm}`
                  : "—";

              return (
                <tr key={`${partNo}-${hole.hole_no}`}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{partNo}</td>
                  <td style={{ textAlign: "center" }}>{hole.hole_no}</td>
                  <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                    {Number(hole.x_mm).toFixed(1)}
                  </td>
                  <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                    {Number(hole.y_mm).toFixed(1)}
                  </td>
                  <td>
                    <span
                      style={{
                        background: isSlot ? "rgba(21,101,192,0.1)" : "rgba(0,0,0,0.05)",
                        borderRadius: 5,
                        padding: "1px 7px",
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                      }}
                    >
                      {sizeLabel}
                    </span>
                  </td>
                  <td style={{ color: hole.description ? "var(--text)" : "var(--muted)", fontSize: "0.88rem" }}>
                    {hole.description ?? "—"}
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
