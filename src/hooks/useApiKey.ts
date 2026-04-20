import { useCallback, useEffect, useState } from "react";
import { storage } from "../lib/storage";

const KEY = "openai_api_key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setApiKeyState(storage.get(KEY));
    setReady(true);
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    storage.set(KEY, trimmed);
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    storage.remove(KEY);
    setApiKeyState(null);
  }, []);

  return { apiKey, setApiKey, clearApiKey, ready };
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return "••••";
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}
