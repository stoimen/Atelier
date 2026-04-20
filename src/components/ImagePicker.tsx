import { useRef } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ACCEPT = "image/*";

export function ImagePicker({ onFiles, disabled, compact }: Props) {
  const libRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) onFiles(files);
    // Reset so the same file can be picked again later.
    e.target.value = "";
  }

  return (
    <div className={`picker ${compact ? "picker-compact" : ""}`}>
      <input
        ref={libRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handle}
        hidden
      />
      <input
        ref={camRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        onChange={handle}
        hidden
      />
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={disabled}
        onClick={() => libRef.current?.click()}
      >
        {compact ? "Add more photos" : "Choose photos"}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        disabled={disabled}
        onClick={() => camRef.current?.click()}
      >
        Take a photo
      </button>
    </div>
  );
}
