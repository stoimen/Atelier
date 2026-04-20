import { useState } from "react";
import { validateApiKeyShape } from "../lib/openai";

interface Props {
  onSave: (key: string) => void;
}

export function ApiKeyPrompt({ onSave }: Props) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const k = value.trim();
    if (!validateApiKeyShape(k)) {
      setErr("That doesn't look like an OpenAI key. It should start with 'sk-'.");
      return;
    }
    setErr(null);
    onSave(k);
  }

  return (
    <section className="card welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title">Welcome to Atelier</h1>
      <p className="muted">
        A private Instagram helper for your photos. Paste your OpenAI API key
        to get started — it stays on this device.
      </p>

      <form onSubmit={submit} className="stack">
        <label className="field">
          <span className="field-label">OpenAI API key</span>
          <div className="input-row">
            <input
              className="input mono"
              type={show ? "text" : "password"}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              placeholder="sk-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={err ? "true" : "false"}
              aria-describedby={err ? "key-err" : undefined}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-label={show ? "Hide key" : "Show key"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {err && (
          <p id="key-err" role="alert" className="error">
            {err}
          </p>
        )}

        <button type="submit" className="btn btn-primary">
          Save key
        </button>
      </form>

      <details className="disclosure">
        <summary>Where does my key go?</summary>
        <p className="muted small">
          Your key is stored in this browser's <code>localStorage</code>, under
          this site's origin only. It is sent directly to{" "}
          <code>api.openai.com</code> over HTTPS when you generate a caption.
          Atelier has no backend of its own — there is no server that sees your
          key or your images. You can view or remove the key any time in
          Settings.
        </p>
        <p className="muted small">
          You can create a key at{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
          >
            platform.openai.com/api-keys
          </a>
          .
        </p>
      </details>
    </section>
  );
}
