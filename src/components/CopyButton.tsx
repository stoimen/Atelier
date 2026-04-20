import { useClipboard } from "../hooks/useClipboard";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", className }: Props) {
  const { copied, copy } = useClipboard();
  return (
    <button
      type="button"
      className={`btn btn-ghost ${className ?? ""}`}
      onClick={() => void copy(text)}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
