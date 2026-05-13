import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import type { BendType } from "../types";

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

const TEMPLATE_COLORS: Record<string, string> = {
  "Z":     "rgba(96,165,250,0.15)",
  "ZL":    "rgba(52,211,153,0.15)",
  "Tip-1": "rgba(251,191,36,0.15)",
  "Tip-2": "rgba(249,115,22,0.15)",
  "Özel":  "rgba(161,188,220,0.10)",
};

export function BendTypesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const listQuery = useQuery({
    queryKey: ["bend-types"],
    queryFn: client.listBendTypes,
  });

  const definitions = listQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.template_type.toLowerCase().includes(search.toLowerCase()),
      )
    : definitions;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["bend-types"] });

  const cloneMutation = useMutation({
    mutationFn: (def: BendType) =>
      client.createBendType({
        name: `${def.name} (Kopya)`,
        description: def.description ?? null,
        template_type: "Özel",
        thickness_mm: def.thickness_mm,
        parallel_count: def.parallel_count,
        start_direction: def.start_direction,
        parameters: (def.parameters ?? []).map(({ id: _id, ...p }) => p),
        segments:   (def.segments   ?? []).map(({ id: _id, ...s }) => s),
      }),
    onSuccess: async () => { await invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteBendType,
    onSuccess: async () => { await invalidate(); setDeleteError(null); },
    onError: () => setDeleteError("Silme işlemi başarısız oldu."),
  });

  // Kopyalamak için tam detayı çek
  async function handleClone(def: BendType) {
    const full = await client.getBendType(def.id);
    cloneMutation.mutate(full);
  }

  return (
    <div className="stack">
      {/* Başlık */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Büküm Tipleri</h1>
          <p>
            Cihaz terminalinden ana baraya bağlanan bakır köprülerin büküm
            geometrilerini yönetin. Z, ZL, Tip-1, Tip-2 şablonları ve özel
            tipler tanımlanabilir.
          </p>
        </div>
        <button type="button" onClick={() => navigate("new")}>
          Yeni Büküm Tipi
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      {/* Liste */}
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
            placeholder="Büküm tipi ara..."
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
                <th>Şablon</th>
                <th>Kalınlık</th>
                <th>Paralel</th>
                <th>Segment Sayısı</th>
                <th>Başlangıç</th>
                <th>Oluşturma</th>
                <th>Revizyon</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((def) => (
                <tr key={def.id}>
                  <td><strong>{def.name}</strong></td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        background: TEMPLATE_COLORS[def.template_type] ?? TEMPLATE_COLORS["Özel"],
                      }}
                    >
                      {def.template_type}
                    </span>
                  </td>
                  <td>{def.thickness_mm} mm</td>
                  <td>{def.parallel_count}'li</td>
                  <td>{def.bend_count ?? def.segments?.length ?? "—"} segment</td>
                  <td>{def.start_direction === "up" ? "↑ Yukarı" : "→ Sağa"}</td>
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
                      onClick={() => handleClone(def)}
                    >
                      Kopyala
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        setConfirmPending({
                          message: `"${def.name}" büküm tipini silmek istediğinizden emin misiniz?`,
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
                        ? "Arama kriterine uygun büküm tipi bulunamadı."
                        : "Tanımlı büküm tipi yok."}
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
