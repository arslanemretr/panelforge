import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { Modal } from "../components/Modal";
import type { CopperDefinition } from "../types";

type DraftCopper = {
  name: string;
  main_thickness_mm: number;
  main_width_mm: number;
};

const emptyDraft: DraftCopper = {
  name: "",
  main_thickness_mm: 10,
  main_width_mm: 40,
};

// Build a full CopperDefinition payload from the 3-field draft
function buildPayload(draft: DraftCopper): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    description: null,
    main_width_mm: draft.main_width_mm,
    main_thickness_mm: draft.main_thickness_mm,
    main_material: "Cu",
    main_phase_spacing_mm: null,
    branch_width_mm: null,
    branch_thickness_mm: null,
    branch_material: "Cu",
    branch_phase_spacing_mm: null,
    bend_inner_radius_mm: null,
    k_factor: null,
    min_hole_edge_distance_mm: null,
    min_bend_hole_distance_mm: null,
    default_hole_diameter_mm: null,
    use_slot_holes: false,
    slot_width_mm: null,
    slot_length_mm: null,
    coating_type: null,
  };
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("tr-TR");
}

export function CopperDefinitionsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCopper>(emptyDraft);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>(
    localStorage.getItem("copper-def-search") ?? ""
  );

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions"],
    queryFn: client.listCopperDefinitions,
  });

  const allDefinitions = definitionsQuery.data ?? [];

  const filtered = search.trim()
    ? allDefinitions.filter((d) =>
        d.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : allDefinitions;

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem("copper-def-search", value);
  }

  const createMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(buildPayload(draft)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions"] });
      setModalOpen(false);
      setDraft(emptyDraft);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createCopperDefinition(
        buildPayload({
          name: def.name + " (Kopya)",
          main_thickness_mm: def.main_thickness_mm ?? 10,
          main_width_mm: def.main_width_mm ?? 40,
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions"] });
      setDeleteError(null);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(error.response.data?.detail ?? "Bu bakır bir projede kullanılıyor, silinemez.");
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  function update<K extends keyof DraftCopper>(key: K, value: DraftCopper[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanimlamalar</span>
          <h1>Bakır Tanımlama</h1>
          <p>Bakir kesitlerini listeleyin ve yeni bakir kayitlarini modal uzerinden ekleyin.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>
          Yeni Bakir
        </button>
      </section>

      {deleteError && (
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(229,57,53,0.1)",
          border: "1px solid rgba(229,57,53,0.4)",
          borderRadius: "8px",
          color: "#e53935",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}>
          <span>⚠️</span>
          <span>{deleteError}</span>
          <button type="button" className="ghost" style={{ marginLeft: "auto", padding: "0.1rem 0.4rem", fontSize: "0.8rem" }}
            onClick={() => setDeleteError(null)}>✕</button>
        </div>
      )}

      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="search"
            className="input"
            placeholder="Bakır kodu ara..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ flex: 1, maxWidth: "320px" }}
          />
          {search.trim() && (
            <span style={{ fontSize: "0.85rem", color: "var(--color-muted, #888)" }}>
              {filtered.length} / {allDefinitions.length} kayıt
            </span>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem 0.65rem" }}>Bakır Kodu</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Kalınlık (mm)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>En (mm)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Oluşturma</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Revizyon</th>
                <th style={{
                  padding: "0.5rem 0.9rem",
                  borderLeft: "2px solid var(--line)",
                  background: "rgba(255,255,255,0.03)",
                }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((definition) => (
                <tr key={definition.id}>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    <strong>{definition.name}</strong>
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{definition.main_thickness_mm ?? "—"}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{definition.main_width_mm ?? "—"}</td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(definition.created_at)}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(definition.updated_at)}
                  </td>
                  <td
                    className="actions-cell"
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderLeft: "2px solid var(--line)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <button
                      type="button"
                      className="ghost"
                      disabled={cloneMutation.isPending}
                      onClick={() => cloneMutation.mutate(definition)}
                    >
                      Kopyala
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(definition.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      {search ? "Arama kriterine uyan bakır bulunamadı." : "Tanımlı bakır yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Yeni Bakır Ekle" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Bakır Kodu</span>
            <input
              className="input"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Örn: 40x10, Cu-40x10, BKR-001"
              required
            />
          </label>
          <label className="field">
            <span>Kalınlık (mm)</span>
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={draft.main_thickness_mm}
              onChange={(event) => update("main_thickness_mm", Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>En (mm)</span>
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={draft.main_width_mm}
              onChange={(event) => update("main_width_mm", Number(event.target.value))}
            />
          </label>
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn-primary" disabled={!draft.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
