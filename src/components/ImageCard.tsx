import type { ImageJob } from "../types";
import { CopyButton } from "./CopyButton";

interface Props {
  job: ImageJob;
  onRetry: () => void;
  onRemove: () => void;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatHashtags(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}

function formatAll(job: ImageJob): string {
  if (!job.result) return "";
  const { caption, hashtags, suggestedTime, altText } = job.result;
  return [
    caption,
    "",
    formatHashtags(hashtags),
    "",
    `Suggested time: ${suggestedTime.dayOfWeek} ${suggestedTime.timeRange} (${suggestedTime.timezoneHint})`,
    `Why: ${suggestedTime.rationale}`,
    "",
    `Alt text: ${altText}`,
  ].join("\n");
}

export function ImageCard({ job, onRetry, onRemove }: Props) {
  return (
    <article className="card image-card" aria-busy={job.status === "loading"}>
      <div className="image-card-head">
        <img
          src={job.previewUrl}
          alt={job.result?.altText || "Selected photo"}
          className="thumb"
          loading="lazy"
        />
        <div className="image-card-meta">
          <p className="mono small muted truncate">{job.file.name}</p>
          <p className="small muted">
            {job.mime.replace("image/", "").toUpperCase()} ·{" "}
            {humanSize(job.sizeBytes)}
          </p>
          <div className="row gap wrap">
            {job.status === "loading" && (
              <span className="pill pill-info" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                Generating…
              </span>
            )}
            {job.status === "done" && (
              <span className="pill pill-ok">Ready</span>
            )}
            {job.status === "error" && (
              <span className="pill pill-err">Error</span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={onRemove}
              aria-label={`Remove ${job.file.name}`}
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {job.status === "error" && (
        <div className="alert alert-error" role="alert">
          <p>{job.error ?? "Something went wrong."}</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {job.status === "loading" && (
        <div className="skeleton-block" aria-hidden="true">
          <div className="skeleton-line w80" />
          <div className="skeleton-line w95" />
          <div className="skeleton-line w60" />
          <div className="skeleton-line w90" />
        </div>
      )}

      {job.status === "done" && job.result && (
        <div className="result stack">
          <section className="stack-sm">
            <div className="row between">
              <h3 className="section-title">Caption</h3>
              <CopyButton text={job.result.caption} />
            </div>
            <p className="caption-text">{job.result.caption}</p>
          </section>

          <section className="stack-sm">
            <div className="row between">
              <h3 className="section-title">Hashtags</h3>
              <CopyButton text={formatHashtags(job.result.hashtags)} />
            </div>
            <p className="hashtags">{formatHashtags(job.result.hashtags)}</p>
          </section>

          <section className="stack-sm">
            <div className="row between">
              <h3 className="section-title">Suggested posting time</h3>
              <CopyButton
                text={`${job.result.suggestedTime.dayOfWeek} ${job.result.suggestedTime.timeRange} (${job.result.suggestedTime.timezoneHint})`}
              />
            </div>
            <p>
              <strong>{job.result.suggestedTime.dayOfWeek}</strong>{" "}
              {job.result.suggestedTime.timeRange}{" "}
              <span className="muted small">
                ({job.result.suggestedTime.timezoneHint})
              </span>
            </p>
            <p className="muted small">{job.result.suggestedTime.rationale}</p>
          </section>

          <section className="stack-sm">
            <div className="row between">
              <h3 className="section-title">Alt text</h3>
              <CopyButton text={job.result.altText} />
            </div>
            <p className="muted small">{job.result.altText}</p>
          </section>

          <div className="row gap wrap">
            <CopyButton
              text={formatAll(job)}
              label="Copy everything"
              className="btn-block"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onRetry}
              aria-label="Regenerate"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
