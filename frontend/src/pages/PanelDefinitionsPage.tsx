import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { Modal } from "../components/Modal";
import type { PanelDefinition } from "../types";

const emptyPanelDefinition: Omit<PanelDefinition, "id" | "created_at" | "updated_at"> = {
  name: "",
  description: "",
  width_mm: 2000,
  height_mm: 2200,
  depth_mm: 600,
  mounting_plate_width_mm: 1800,
  mounting_plate_height_mm: 2000,
  left_margin_mm: 100,
  right_margin_mm: 100,
  top_margin_mm: 100,
  bottom_margin_mm: 100,
  busbar_orientation: "horizontal",
  phase_system: "3P",
};

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("tr-TR");
}

const SEARCH_STORAGE_KEY = "panel-def-search";

export function PanelDefinitionsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyPanelDefinition);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [search, setSearch] = useState<string>(
    () => localStorage.getItem(SEARCH_STORAGE_KEY) ?? ""
  );

  const definitionsQuery = useQuery({
    queryKey: ["panel-definitions"],
    queryFn: client.listPanelDefinitions,
  });

  const createMutation = useMutation({
    mutationFn: () => client.createPanelDefinition(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
      setModalOpen(false);
      setDraft(emptyPanelDefinition);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (source: PanelDefinition) =>
      client.createPanelDefinition({
        name: source.name + " (Kopya)",
        description: source.description,
        width_mm: source.width_mm,
        height_mm: source.height_mm,
        depth_mm: source.depth_mm,
        mounting_plate_width_mm: source.mounting_plate_width_mm,
        mounting_plate_height_mm: source.mounting_plate_height_mm,
        left_margin_mm: source.left_margin_mm,
        right_margin_mm: source.right_margin_mm,
        top_margin_mm: source.top_margin_mm,
        bottom_margin_mm: source.bottom_margin_mm,
        busbar_orientation: source.busbar_orientation,
        phase_system: source.phase_system,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
      setCloningId(null);
    },
    onError: () => {
      setCloningId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deletePanelDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
    },
  });

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem(SEARCH_STORAGE_KEY, value);
  }

  const filteredDefinitions = (definitionsQuery.data ?? []).filter((def) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      def.name.toLowerCase().includes(term) ||
      (def.description ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanimlamalar</span>
          <h1>Kabin Tanimlama</h1>
          <p>Tanimli kabin olculerini liste halinde yonetin ve yeni kabin kayitlarini modal ile ekleyin.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>
          Yeni Kabin
        </button>
      </section>

      <section className="card">
        <div style={{ marginBottom: "0.75rem" }}>
          <input
            type="search"
            placeholder="Kabin ara..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: "100%", maxWidth: 320 }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kabin Adi</th>
                <th>Olcu</th>
                <th>Montaj Plakasi</th>
                <th>Yon</th>
                <th>Faz</th>
                <th>Olusturma / Revizyon</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefinitions.map((definition) => (
                <tr key={definition.id}>
                  <td>
                    <strong>{definition.name}</strong>
                    <div className="table-subtext">{definition.description || "-"}</div>
                  </td>
                  <td>
                    {definition.width_mm}x{definition.height_mm}x{definition.depth_mm ?? 0}
                  </td>
                  <td>
                    {definition.mounting_plate_width_mm ?? 0}x{definition.mounting_plate_height_mm ?? 0}
                  </td>
                  <td>{definition.busbar_orientation || "-"}</td>
                  <td>{definition.phase_system || "-"}</td>
                  <td>
                    <div>{fmtDate(definition.created_at)}</div>
                    <div className="table-subtext">{fmtDate(definition.updated_at)}</div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      disabled={cloningId === definition.id}
                      onClick={() => {
                        setCloningId(definition.id);
                        cloneMutation.mutate(definition);
                      }}
                    >
                      {cloningId === definition.id ? "..." : "Kopyala"}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => deleteMutation.mutate(definition.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredDefinitions.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      {search.trim() ? "Aramayla eslesen kabin bulunamadi." : "Tanimli kabin yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Yeni Kabin Ekleme" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label>
            <span>Kabin adi</span>
            <input value={draft.name} onChange={(event) => update("name", event.target.value)} required />
          </label>
          <label>
            <span>Aciklama</span>
            <input value={draft.description ?? ""} onChange={(event) => update("description", event.target.value)} />
          </label>
          <label>
            <span>Genislik</span>
            <input type="number" value={draft.width_mm} onChange={(event) => update("width_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Yukseklik</span>
            <input type="number" value={draft.height_mm} onChange={(event) => update("height_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Derinlik</span>
            <input type="number" value={draft.depth_mm ?? 0} onChange={(event) => update("depth_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Montaj genisligi</span>
            <input
              type="number"
              value={draft.mounting_plate_width_mm ?? 0}
              onChange={(event) => update("mounting_plate_width_mm", Number(event.target.value))}
            />
          </label>
          <label>
            <span>Montaj yuksekligi</span>
            <input
              type="number"
              value={draft.mounting_plate_height_mm ?? 0}
              onChange={(event) => update("mounting_plate_height_mm", Number(event.target.value))}
            />
          </label>
          <label>
            <span>Sol bosluk</span>
            <input type="number" value={draft.left_margin_mm} onChange={(event) => update("left_margin_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Sag bosluk</span>
            <input type="number" value={draft.right_margin_mm} onChange={(event) => update("right_margin_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Ust bosluk</span>
            <input type="number" value={draft.top_margin_mm} onChange={(event) => update("top_margin_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Alt bosluk</span>
            <input type="number" value={draft.bottom_margin_mm} onChange={(event) => update("bottom_margin_mm", Number(event.target.value))} />
          </label>
          <label>
            <span>Bara yonu</span>
            <select value={draft.busbar_orientation ?? "horizontal"} onChange={(event) => update("busbar_orientation", event.target.value)}>
              <option value="horizontal">Yatay</option>
              <option value="vertical">Dikey</option>
            </select>
          </label>
          <label>
            <span>Faz yapisi</span>
            <select value={draft.phase_system ?? "3P"} onChange={(event) => update("phase_system", event.target.value)}>
              <option value="3P">3P</option>
              <option value="3P+N">3P+N</option>
              <option value="3P+N+PE">3P+N+PE</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit">Kabini Kaydet</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
