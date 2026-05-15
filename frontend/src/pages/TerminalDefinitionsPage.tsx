import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import type { TerminalDefinition } from "../types";

const SURFACES = [
  { value: "front",  label: "Ön" },
  { value: "back",   label: "Arka" },
  { value: "left",   label: "Sol" },
  { value: "right",  label: "Sağ" },
  { value: "top",    label: "Üst" },
  { value: "bottom", label: "Alt" },
];

function buildPayload(def: TerminalDefinition): Omit<TerminalDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: `${def.name} (Kopya)`,
    terminal_type: def.terminal_type,
    surface: def.surface,
    bolt_type: def.bolt_type,
    bolt_count: def.bolt_count,
    bolt_center_distance_mm: def.bolt_center_distance_mm,
    hole_diameter_mm: def.hole_diameter_mm,
    slot_width_mm: def.slot_width_mm,
    slot_length_mm: def.slot_length_mm,
    terminal_width_mm: def.terminal_width_mm,
    terminal_height_mm: def.terminal_height_mm,
    terminal_depth_mm: def.terminal_depth_mm,
  };
}

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function surfaceLabel(value: string): string {
  return SURFACES.find((s) => s.value === value)?.label ?? value;
}

// ─── Sayfa ─────────────────────────────────────────────────────────────────────
export function TerminalDefinitionsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const definitionsQuery = useQuery({
    queryKey: ["terminal-definitions"],
    queryFn: client.listTerminalDefinitions,
  });

  const definitions = definitionsQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.terminal_type.toLowerCase().includes(search.toLowerCase()),
      )
    : definitions;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["terminal-definitions"] });

  const deleteMutation = useMutation({
    mutationFn: client.deleteTerminalDefinition,
    onSuccess: async () => { await invalidate(); setDeleteError(null); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(
          error.response.data?.detail ??
            "Bu terminal tipi bir cihazda kullanıldığı için silinemedi.",
        );
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (def: TerminalDefinition) => client.createTerminalDefinition(buildPayload(def)),
    onSuccess: async () => { await invalidate(); },
  });

  return (
    <div className="stack">
      {/* Başlık */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Terminal Tipleri</h1>
          <p>
            Cihaz terminallerinde kullanılan fiziksel terminal standartlarını yönetin.
            Her terminal tipi; boyut, vida ve yüzey bilgilerini bir arada saklar.
          </p>
        </div>
        <button type="button" onClick={() => navigate("new")}>
          Yeni Terminal Tipi
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      {/* Liste */}
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
          <input
            type="search"
            className="input"
            placeholder="Terminal tipi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: "320px" }}
          />
          {search.trim() && (
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {filtered.length} / {definitions.length} kayıt
            </span>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Tip</th>
                <th>Yüzey</th>
                <th>Vida</th>
                <th>Merkez</th>
                <th>Delik</th>
                <th>Boyut (G×Y×D mm)</th>
                <th>Oluşturma</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((def) => (
                <tr key={def.id}>
                  <td><strong>{def.name}</strong></td>
                  <td>{def.terminal_type}</td>
                  <td>{surfaceLabel(def.surface)}</td>
                  <td>
                    {def.bolt_type ?? "—"}
                    {def.bolt_count ? ` ×${def.bolt_count}` : ""}
                  </td>
                  <td>{def.bolt_center_distance_mm != null ? `${def.bolt_center_distance_mm} mm` : "—"}</td>
                  <td>
                    {def.slot_width_mm != null && def.slot_length_mm != null
                      ? `Slot ${def.slot_width_mm}×${def.slot_length_mm}`
                      : def.hole_diameter_mm != null
                        ? `Ø${def.hole_diameter_mm}`
                        : "—"}
                  </td>
                  <td>
                    {[def.terminal_width_mm, def.terminal_height_mm, def.terminal_depth_mm]
                      .map((v) => v ?? "-")
                      .join(" × ")}
                  </td>
                  <td>{fmtDate(def.created_at)}</td>
                  <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                    <button type="button" className="ghost" onClick={() => navigate(`${def.id}/edit`)}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={cloneMutation.isPending}
                      onClick={() => cloneMutation.mutate(def)}
                    >
                      Kopyala
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        setConfirmPending({
                          message: `"${def.name}" terminal tipini silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { deleteMutation.mutate(def.id); setConfirmPending(null); },
                        })
                      }
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      {search
                        ? "Arama kriterine uygun terminal tipi bulunamadı."
                        : "Tanımlı terminal tipi yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
