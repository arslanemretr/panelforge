import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { TerminalDefinition } from "../types";

// ─── Seçenekler ────────────────────────────────────────────────────────────────
const TERMINAL_TYPES = [
  "Ön Bakır Basmalı",
  "Arka Yatay Taraklı",
  "Yandan Taraklı",
  "Üstten Taraklı",
  "Kablo Pabuçlu",
];

const SURFACES = [
  { value: "front",  label: "Ön" },
  { value: "back",   label: "Arka" },
  { value: "left",   label: "Sol" },
  { value: "right",  label: "Sağ" },
  { value: "top",    label: "Üst" },
  { value: "bottom", label: "Alt" },
];

// ─── Draft tipi ───────────────────────────────────────────────────────────────
interface TerminalDraft {
  name: string;
  terminal_type: string;
  surface: string;
  bolt_type: string;
  bolt_count: number | null;
  bolt_center_distance_mm: number | null;
  hole_diameter_mm: number | null;
  terminal_width_mm: number | null;
  terminal_height_mm: number | null;
  terminal_depth_mm: number | null;
}

const EMPTY_DRAFT: TerminalDraft = {
  name: "",
  terminal_type: "Ön Bakır Basmalı",
  surface: "front",
  bolt_type: "M12",
  bolt_count: 2,
  bolt_center_distance_mm: 25,
  hole_diameter_mm: 13,
  terminal_width_mm: null,
  terminal_height_mm: null,
  terminal_depth_mm: null,
};

function draftFromDef(def: TerminalDefinition): TerminalDraft {
  return {
    name: def.name,
    terminal_type: def.terminal_type,
    surface: def.surface,
    bolt_type: def.bolt_type ?? "M12",
    bolt_count: def.bolt_count ?? null,
    bolt_center_distance_mm: def.bolt_center_distance_mm ?? null,
    hole_diameter_mm: def.hole_diameter_mm ?? null,
    terminal_width_mm: def.terminal_width_mm ?? null,
    terminal_height_mm: def.terminal_height_mm ?? null,
    terminal_depth_mm: def.terminal_depth_mm ?? null,
  };
}

function buildPayload(draft: TerminalDraft): Omit<TerminalDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    terminal_type: draft.terminal_type,
    surface: draft.surface,
    bolt_type: draft.bolt_type || null,
    bolt_count: draft.bolt_count,
    bolt_center_distance_mm: draft.bolt_center_distance_mm,
    hole_diameter_mm: draft.hole_diameter_mm,
    terminal_width_mm: draft.terminal_width_mm,
    terminal_height_mm: draft.terminal_height_mm,
    terminal_depth_mm: draft.terminal_depth_mm,
  };
}

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function surfaceLabel(value: string): string {
  return SURFACES.find((s) => s.value === value)?.label ?? value;
}

function NullNum({ label, value, onChange }: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        type="number"
        step="any"
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}

// ─── Sayfa ─────────────────────────────────────────────────────────────────────
export function TerminalDefinitionsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<TerminalDefinition | null>(null);
  const [draft, setDraft] = useState<TerminalDraft>(EMPTY_DRAFT);
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

  const createMutation = useMutation({
    mutationFn: () => client.createTerminalDefinition(buildPayload(draft)),
    onSuccess: async () => { await invalidate(); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => client.updateTerminalDefinition(editingDef!.id, buildPayload(draft)),
    onSuccess: async () => { await invalidate(); closeModal(); },
  });

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
    mutationFn: (def: TerminalDefinition) =>
      client.createTerminalDefinition(buildPayload({ ...draftFromDef(def), name: `${def.name} (Kopya)` })),
    onSuccess: async () => { await invalidate(); },
  });

  function openCreate() {
    setEditingDef(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }

  function openEdit(def: TerminalDefinition) {
    setEditingDef(def);
    setDraft(draftFromDef(def));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDef(null);
    setDraft(EMPTY_DRAFT);
  }

  function set<K extends keyof TerminalDraft>(key: K, value: TerminalDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
        <button type="button" onClick={openCreate}>
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
                <th>Delik Ø</th>
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
                  <td>{def.hole_diameter_mm != null ? `Ø${def.hole_diameter_mm}` : "—"}</td>
                  <td>
                    {[def.terminal_width_mm, def.terminal_height_mm, def.terminal_depth_mm]
                      .map((v) => v ?? "-")
                      .join(" × ")}
                  </td>
                  <td>{fmtDate(def.created_at)}</td>
                  <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                    <button type="button" className="ghost" onClick={() => openEdit(def)}>
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

      {/* Modal */}
      <Modal
        title={editingDef ? "Terminal Tipini Düzenle" : "Yeni Terminal Tipi"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            editingDef ? updateMutation.mutate() : createMutation.mutate();
          }}
        >
          {/* Ad — tam genişlik */}
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Terminal Adı</span>
            <input
              className="input"
              required
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="ABB Emax Ön Terminal M12"
            />
          </label>

          {/* Tip */}
          <label className="field">
            <span>Terminal Tipi</span>
            <select className="input" value={draft.terminal_type} onChange={(e) => set("terminal_type", e.target.value)}>
              {TERMINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          {/* Yüzey */}
          <label className="field">
            <span>Yüzey</span>
            <select className="input" value={draft.surface} onChange={(e) => set("surface", e.target.value)}>
              {SURFACES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          {/* Vida tipi */}
          <label className="field">
            <span>Vida Tipi</span>
            <input
              className="input"
              value={draft.bolt_type}
              onChange={(e) => set("bolt_type", e.target.value)}
              placeholder="M12"
            />
          </label>

          {/* Vida adet */}
          <NullNum
            label="Vida Adedi"
            value={draft.bolt_count}
            onChange={(v) => set("bolt_count", v != null ? Math.round(v) : null)}
          />

          {/* Merkez mesafe */}
          <NullNum
            label="Vida Merkez Mesafesi (mm)"
            value={draft.bolt_center_distance_mm}
            onChange={(v) => set("bolt_center_distance_mm", v)}
          />

          {/* Delik çapı */}
          <NullNum
            label="Delik Çapı (mm)"
            value={draft.hole_diameter_mm}
            onChange={(v) => set("hole_diameter_mm", v)}
          />

          {/* Ayırıcı */}
          <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", margin: "0.25rem 0" }} />
          <span style={{ gridColumn: "1 / -1", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "-0.25rem" }}>
            Fiziksel Boyutlar (opsiyonel)
          </span>

          {/* Boyutlar */}
          <NullNum label="Genişlik X (mm)" value={draft.terminal_width_mm} onChange={(v) => set("terminal_width_mm", v)} />
          <NullNum label="Yükseklik Y (mm)" value={draft.terminal_height_mm} onChange={(v) => set("terminal_height_mm", v)} />
          <NullNum label="Derinlik Z (mm)" value={draft.terminal_depth_mm} onChange={(v) => set("terminal_depth_mm", v)} />

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : editingDef ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
