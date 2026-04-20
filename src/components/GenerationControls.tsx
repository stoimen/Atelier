import type { GenerationOptions, Tone } from "../types";

interface Props {
  options: GenerationOptions;
  onChange: (opts: GenerationOptions) => void;
}

const TONES: Tone[] = [
  "authentic",
  "playful",
  "minimal",
  "poetic",
  "professional",
  "witty",
];

const LANGS: { id: string; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "ja", label: "日本語" },
];

export function GenerationControls({ options, onChange }: Props) {
  function patch<K extends keyof GenerationOptions>(
    k: K,
    v: GenerationOptions[K],
  ) {
    onChange({ ...options, [k]: v });
  }

  return (
    <details className="card controls">
      <summary>
        <span>Style & options</span>
        <span className="muted small">
          {options.tone} · {options.language} · {options.maxHashtags} tags
        </span>
      </summary>

      <div className="stack controls-body">
        <label className="field">
          <span className="field-label">Tone</span>
          <div className="chips" role="radiogroup" aria-label="Tone">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={options.tone === t}
                className={`chip ${options.tone === t ? "chip-on" : ""}`}
                onClick={() => patch("tone", t)}
              >
                {t}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span className="field-label">Language</span>
          <select
            className="input"
            value={options.language}
            onChange={(e) => patch("language", e.target.value)}
          >
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Audience (optional)</span>
          <input
            className="input"
            value={options.audience}
            placeholder="e.g. indie coffee lovers in NYC"
            onChange={(e) => patch("audience", e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Extra context (optional)</span>
          <textarea
            className="input"
            rows={2}
            value={options.extraContext ?? ""}
            placeholder="Where or when this was taken, a story, a product..."
            onChange={(e) => patch("extraContext", e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">
            Hashtag count: <strong>{options.maxHashtags}</strong>
          </span>
          <input
            className="range"
            type="range"
            min={5}
            max={30}
            step={1}
            value={options.maxHashtags}
            onChange={(e) => patch("maxHashtags", Number(e.target.value))}
          />
        </label>

        <label className="field row gap">
          <input
            type="checkbox"
            checked={options.emoji}
            onChange={(e) => patch("emoji", e.target.checked)}
          />
          <span>Allow a little emoji</span>
        </label>
      </div>
    </details>
  );
}
