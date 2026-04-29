import type { CalculationSummary } from "../../types";

interface SummaryCardsProps {
  summary: CalculationSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const items: { label: string; value: string | number; sub?: string; accent?: string }[] = [
    {
      label: "Ana Bakır",
      value: summary.main_busbar_count,
      sub: "parça",
      accent: "#b45309",
    },
    {
      label: "Tali Bakır",
      value: summary.branch_busbar_count,
      sub: "parça",
      accent: "#1565c0",
    },
    {
      label: "Toplam Kesim",
      value: summary.total_cut_length_mm,
      sub: "mm",
      accent: "#1b5e20",
    },
    {
      label: "Toplam Delik",
      value: summary.total_hole_count,
      sub: "adet",
      accent: "#4a148c",
    },
    {
      label: "Toplam Büküm",
      value: summary.total_bend_count,
      sub: "adet",
      accent: "#880e4f",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "0.75rem",
      }}
    >
      {items.map(({ label, value, sub, accent }) => (
        <article
          key={label}
          style={{
            background: "var(--panel-strong)",
            border: `1.5px solid ${accent ?? "var(--line)"}33`,
            borderTop: `3px solid ${accent ?? "var(--accent)"}`,
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
            <strong
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                fontFamily: "monospace",
                color: accent ?? "var(--text)",
                lineHeight: 1,
              }}
            >
              {value}
            </strong>
            {sub && (
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{sub}</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
