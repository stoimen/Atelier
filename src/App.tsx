import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiKeyPrompt } from "./components/ApiKeyPrompt";
import { ApiKeySettings } from "./components/ApiKeySettings";
import { GenerationControls } from "./components/GenerationControls";
import { ImageCard } from "./components/ImageCard";
import { ImagePicker } from "./components/ImagePicker";
import { useApiKey } from "./hooks/useApiKey";
import {
  DEFAULT_MODEL,
  OpenAIError,
  generatePostForImage,
} from "./lib/openai";
import { storage } from "./lib/storage";
import type { GenerationOptions, ImageJob } from "./types";

const DEFAULT_OPTIONS: GenerationOptions = {
  tone: "authentic",
  audience: "",
  language: "auto",
  emoji: true,
  maxHashtags: 15,
  extraContext: "",
};

function loadOptions(): GenerationOptions {
  try {
    const raw = storage.get("options");
    if (!raw) return DEFAULT_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<GenerationOptions>;
    return { ...DEFAULT_OPTIONS, ...parsed };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const { apiKey, setApiKey, clearApiKey, ready } = useApiKey();
  const [model, setModel] = useState<string>(
    () => storage.get("model") ?? DEFAULT_MODEL,
  );
  const [options, setOptions] = useState<GenerationOptions>(loadOptions);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Track in-flight aborts so leaving/refresh cancels requests.
  const abortersRef = useRef<Map<string, AbortController>>(new Map());

  // Persist preferences.
  useEffect(() => {
    storage.set("options", JSON.stringify(options));
  }, [options]);
  useEffect(() => {
    if (model) storage.set("model", model);
  }, [model]);

  // Release object URLs when jobs are removed.
  const revokeOnUnmount = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      for (const url of revokeOnUnmount.current) URL.revokeObjectURL(url);
    };
  }, []);

  const runJob = useCallback(
    async (job: ImageJob, currentKey: string) => {
      const controller = new AbortController();
      abortersRef.current.set(job.id, controller);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "loading", error: undefined } : j,
        ),
      );
      try {
        const result = await generatePostForImage({
          apiKey: currentKey,
          model,
          file: job.file,
          options,
          signal: controller.signal,
        });
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "done", result } : j,
          ),
        );
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
        const msg =
          e instanceof OpenAIError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unexpected error.";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "error", error: msg } : j,
          ),
        );
      } finally {
        abortersRef.current.delete(job.id);
      }
    },
    [model, options],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (!apiKey) return;
      const newJobs: ImageJob[] = files.map((file) => {
        const url = URL.createObjectURL(file);
        revokeOnUnmount.current.push(url);
        return {
          id: newId(),
          file,
          previewUrl: url,
          mime: file.type || "image/jpeg",
          sizeBytes: file.size,
          status: "loading",
        };
      });
      setJobs((prev) => [...newJobs, ...prev]);
      for (const j of newJobs) void runJob(j, apiKey);
    },
    [apiKey, runJob],
  );

  const retry = useCallback(
    (id: string) => {
      if (!apiKey) return;
      const job = jobs.find((j) => j.id === id);
      if (!job) return;
      void runJob(job, apiKey);
    },
    [apiKey, jobs, runJob],
  );

  const remove = useCallback((id: string) => {
    setJobs((prev) => {
      const target = prev.find((j) => j.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((j) => j.id !== id);
    });
    const ctrl = abortersRef.current.get(id);
    ctrl?.abort();
    abortersRef.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    if (!jobs.length) return;
    if (!confirm("Clear all results?")) return;
    for (const j of jobs) URL.revokeObjectURL(j.previewUrl);
    for (const [, ctrl] of abortersRef.current) ctrl.abort();
    abortersRef.current.clear();
    setJobs([]);
  }, [jobs]);

  const hasKey = useMemo(() => Boolean(apiKey), [apiKey]);

  if (!ready) {
    return (
      <main className="app">
        <div className="centered">
          <span className="spinner" />
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <div>
            <h1 className="brand-title">Atelier</h1>
            <p className="brand-sub muted small">Instagram assistant</p>
          </div>
        </div>
        {hasKey && (
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>
        )}
      </header>

      {!hasKey ? (
        <ApiKeyPrompt onSave={setApiKey} />
      ) : (
        <>
          <GenerationControls options={options} onChange={setOptions} />

          {jobs.length === 0 ? (
            <section className="card empty">
              <div className="empty-art" aria-hidden="true">
                <svg viewBox="0 0 120 80" width="100%" height="100%">
                  <rect x="4" y="8" width="72" height="60" rx="6" fill="#1c1c22"/>
                  <circle cx="26" cy="28" r="6" fill="#f472b6"/>
                  <path d="M4 58 L30 38 L50 52 L76 32 V68 H4 Z" fill="#f59e0b" opacity=".7"/>
                  <rect x="46" y="22" width="70" height="54" rx="6" fill="#111" stroke="#2a2a33"/>
                  <circle cx="68" cy="42" r="5" fill="#f472b6" opacity=".6"/>
                  <path d="M46 68 L68 50 L88 62 L116 40 V76 H46 Z" fill="#f59e0b" opacity=".5"/>
                </svg>
              </div>
              <h2>Pick a few photos</h2>
              <p className="muted">
                Atelier sends each photo to OpenAI and writes a caption,
                hashtags, and a suggested posting time. Pictures never leave
                your device except to go straight to OpenAI.
              </p>
              <ImagePicker onFiles={addFiles} />
            </section>
          ) : (
            <>
              <div className="row between center wrap gap">
                <ImagePicker onFiles={addFiles} compact />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={clearAll}
                >
                  Clear all
                </button>
              </div>
              <div className="job-list" role="list">
                {jobs.map((job) => (
                  <div role="listitem" key={job.id}>
                    <ImageCard
                      job={job}
                      onRetry={() => retry(job.id)}
                      onRemove={() => remove(job.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {settingsOpen && apiKey && (
        <ApiKeySettings
          apiKey={apiKey}
          model={model}
          onChangeModel={setModel}
          onSave={setApiKey}
          onRemove={clearApiKey}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <footer className="app-footer muted small">
        <p>
          Your key and your photos stay on this device. Atelier only talks to{" "}
          <code>api.openai.com</code>.
        </p>
      </footer>
    </main>
  );
}
