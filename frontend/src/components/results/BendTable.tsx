import type { Busbar } from "../../types";

interface BendTableProps {
  busbars: Busbar[];
}

const DIRECTION_LABELS: Record<string, string> = {
  up:    "Yukarı",
  down:  "Aşağı",
  left:  "Sola",
  right: "Sağa",
  front: "Öne",
  back:  "Arkaya",
};

export function BendTable({ busbars }: BendTableProps) {
  const rows = busbars.flatMap((busbar) =>
    busbar.bends.map((bend) => ({
      partNo: busbar.part_no,
      bend,
    })),
  );

  if (rows.length === 0) return null;

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 580 }}>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Parça No</th>
              <th style={{ width: 70  }}>Büküm No</th>
              <th style={{ width: 130 }}>Baştan Mesafe</th>
              <th style={{ width: 80  }}>Açı</th>
              <th style={{ width: 90  }}>Yön</th>
              <th style={{ width: 100 }}>İç Yarıçap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ partNo, bend }) => (
              <tr key={`${partNo}-${bend.bend_no}`}>
                <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{partNo}</td>
                <td style={{ textAlign: "center" }}>{bend.bend_no}</td>
                <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                  {Number(bend.distance_from_start_mm).toFixed(1)} mm
                </td>
                <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                  {bend.angle_deg}°
                </td>
                <td>
                  <span
                    style={{
                      background: "rgba(217,119,6,0.12)",
                      color: "#92400e",
                      borderRadius: 5,
                      padding: "2px 8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    {DIRECTION_LABELS[bend.direction] ?? bend.direction}
                  </span>
                </td>
                <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                  R {bend.inner_radius_mm} mm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
