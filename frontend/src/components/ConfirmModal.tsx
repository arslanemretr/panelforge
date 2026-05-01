interface ConfirmModalProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  message,
  confirmLabel = "Evet, Sil",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        style={{ width: "min(420px, 92vw)", padding: 0, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst kırmızı şerit */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, #ef4444, #f87171)",
            borderRadius: "24px 24px 0 0",
          }}
        />

        <div style={{ padding: "1.5rem 1.75rem 1.25rem" }}>
          {/* İkon + Mesaj */}
          <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <span
              style={{
                fontSize: "1.5rem",
                lineHeight: 1,
                flexShrink: 0,
                marginTop: "0.05rem",
              }}
            >
              🗑️
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "var(--text)",
                  lineHeight: 1.45,
                }}
              >
                {message}
              </p>
              <p
                style={{
                  margin: "0.4rem 0 0",
                  fontSize: "0.82rem",
                  color: "var(--muted)",
                }}
              >
                Bu işlem geri alınamaz.
              </p>
            </div>
          </div>

          {/* Butonlar */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.6rem",
            }}
          >
            <button
              type="button"
              className="ghost"
              onClick={onCancel}
              style={{ padding: "0.45rem 1.1rem" }}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{
                padding: "0.45rem 1.1rem",
                background: "linear-gradient(135deg, #dc2626, #f87171)",
                border: "none",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
