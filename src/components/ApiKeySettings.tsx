import { useState } from "react";
import { maskKey } from "../hooks/useApiKey";
import { validateApiKeyShape } from "../lib/openai";

interface Props {
  apiKey: string;
  model: string;
  onChangeModel: (model: string) => void;
  onSave: (key: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const MODELS = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini (fast, cheap)" },
  { id: "gpt-4o", label: "gpt-4o (higher quality)" },
  { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { id: "gpt-4.1", label: "gpt-4.1" },
];

export function ApiKeySettings({
  apiKey,
  model,
  onChangeModel,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState(
    MODELS.some((m) => m.id === model) ? "" : model,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = value.trim();
    if (!validateApiKeyShape(k)) {
      setErr("That doesn't look like an OpenAI key.");
      return;
    }
    onSave(k);
    setEditing(false);
    setValue("");
    setErr(null);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Close settings"
            onClick={onClose}
          >
            Done
          </button>
        </div>

        <section className="stack">
          <h3 className="section-title">API key</h3>
          {!editing ? (
            <>
              <p className="mono muted">{maskKey(apiKey)}</p>
              <div className="row gap">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditing(true)}
                >
                  Replace key
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Remove your API key from this device? You'll need to paste it again to generate new captions.",
                      )
                    ) {
                      onRemove();
                      onClose();
                    }
                  }}
                >
                  Remove key
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="stack">
              <div className="input-row">
                <input
                  className="input mono"
                  type={show ? "text" : "password"}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="sk-..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-invalid={err ? "true" : "false"}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              {err && (
                <p className="error" role="alert">
                  {err}
                </p>
              )}
              <div className="row gap">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditing(false);
                    setValue("");
                    setErr(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="stack">
          <h3 className="section-title">Model</h3>
          <label className="field">
            <span className="field-label">Preset</span>
            <select
              className="input"
              value={MODELS.some((m) => m.id === model) ? model : "custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") {
                  onChangeModel(customModel || "");
                } else {
                  onChangeModel(v);
                }
              }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </label>
          {!MODELS.some((m) => m.id === model) && (
            <label className="field">
              <span className="field-label">Custom model id</span>
              <input
                className="input mono"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  onChangeModel(e.target.value);
                }}
                placeholder="gpt-4o"
              />
            </label>
          )}
          <p className="muted small">
            Any OpenAI model with vision will work. More capable models cost
            more and are slower.
          </p>
        </section>
      </div>
    </div>
  );
}
