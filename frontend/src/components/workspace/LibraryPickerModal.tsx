import { useState } from "react";

import { Modal } from "../Modal";

interface LibraryPickerModalProps<T extends { id: number }> {
  open: boolean;
  title: string;
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  getSearchText?: (item: T) => string;
}

export function LibraryPickerModal<T extends { id: number }>({
  open,
  title,
  items,
  renderRow,
  onSelect,
  onClose,
  searchPlaceholder = "Ara...",
  getSearchText,
}: LibraryPickerModalProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? items.filter((item) => {
        const text = getSearchText ? getSearchText(item) : JSON.stringify(item);
        return text.toLowerCase().includes(search.toLowerCase());
      })
    : items;

  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="modal-body">
        <input
          className="input"
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "1rem" }}
        />
        <div style={{ maxHeight: "360px", overflowY: "auto" }}>
          <table className="data-table">
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={99} style={{ textAlign: "center", padding: "1rem", color: "var(--color-muted)" }}>
                    Sonuç bulunamadı
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id}>
                  {renderRow(item)}
                  <td>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem" }}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                        setSearch("");
                      }}
                    >
                      Seç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
