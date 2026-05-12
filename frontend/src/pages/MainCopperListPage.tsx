import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import type { CopperDefinition } from "../types";

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function MainCopperListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState<string>(
    localStorage.getItem("copper-def-search-main") ?? "",
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", "main"],
    queryFn: () => client.listCopperDefinitions("main"),
  });

  const definitions = definitionsQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter((d) =>
        d.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : definitions;

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem("copper-def-search-main", value);
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["copper-definitions", "main"] });

  const cloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createCopperDefinition({
        name: `${def.name} (Kopya)`,
        copper_kind: "main",
        description: def.description ?? null,
        main_width_mm: def.main_width_mm ?? null,
        main_thickness_mm: def.main_thickness_mm ?? null,
        main_material: def.main_material,
        main_phase_spacing_mm: def.main_phase_spacing_mm ?? null,
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
        density_g_cm3: null,
        coating_type: null,
        busbar_x_mm: def.busbar_x_mm ?? null,
        busbar_y_mm: def.busbar_y_mm ?? null,
        busbar_z_mm: def.busbar_z_mm ?? null,
        busbar_orientation: def.busbar_orientation ?? null,
        busbar_length_mm: def.busbar_length_mm ?? null,
        phase_type: def.phase_type ?? null,
        bars_per_phase: def.bars_per_phase ?? null,
        bar_gap_mm: def.bar_gap_mm ?? null,
        phase_center_mm: def.phase_center_mm ?? null,
        layer_type: def.layer_type ?? null,
        neutral_bar_count: def.neutral_bar_count ?? null,
      }),
    onSuccess: async () => {
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => {
      await invalidate();
      setDeleteError(null);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(
          error.response.data?.detail ??
            "Bu bakır tanımı projede kullanıldığı için silinemedi.",
        );
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Ana Bakır Tanımlama</h1>
          <p>
            Ana bakır kütüphanesini yönetin. Faz yapısı, kat tipi, konum ve
            uzunluk varsayımları burada tutulur.
          </p>
        </div>
        <button type="button" onClick={() => navigate("new")}>
          Yeni Ana Bakır
        </button>
      </section>

      {deleteError && (
        <div className="alert alert-warning">{deleteError}</div>
      )}

      <section className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.9rem",
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            className="input"
            placeholder="Ana bakır ara..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
                <th>Kesit</th>
                <th>Faz Tipi</th>
                <th>Kat Tipi</th>
                <th>Faz Miktarı</th>
                <th>Fazlar Arası</th>
                <th>Oluşturma</th>
                <th>Revizyon</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((def) => (
                <tr key={def.id}>
                  <td>
                    <strong>{def.name}</strong>
                  </td>
                  <td>
                    {def.main_width_mm ?? "-"} × {def.main_thickness_mm ?? "-"}{" "}
                    mm
                  </td>
                  <td>{def.phase_type ?? "-"}</td>
                  <td>{def.layer_type ?? "-"}</td>
                  <td>{def.bars_per_phase ?? 1} adet</td>
                  <td>
                    {def.phase_center_mm
                      ? `${def.phase_center_mm} mm`
                      : def.main_phase_spacing_mm
                        ? `${def.main_phase_spacing_mm} mm`
                        : "-"}
                  </td>
                  <td>{fmtDate(def.created_at)}</td>
                  <td>{fmtDate(def.updated_at)}</td>
                  <td
                    className="actions-cell"
                    style={{ borderLeft: "2px solid var(--line)" }}
                  >
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => navigate(`${def.id}/edit`)}
                    >
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
                          message: `"${def.name}" bakır tanımını silmek istediğinizden emin misiniz?`,
                          onConfirm: () => {
                            deleteMutation.mutate(def.id);
                            setConfirmPending(null);
                          },
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
                        ? "Arama kriterine uygun bakır tanımı bulunamadı."
                        : "Tanımlı ana bakır yok."}
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
