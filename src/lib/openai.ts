import type { GenerationOptions, PostSuggestion } from "../types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// gpt-4o-mini has vision and is the cost-effective default. Users can switch.
export const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
    this.code = code;
  }
}

export function validateApiKeyShape(key: string): boolean {
  // OpenAI keys start with `sk-` and are at least ~40 chars. We don't verify
  // against the API here — that happens on first use.
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(key.trim());
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function buildSystemPrompt(opts: GenerationOptions): string {
  const emojiRule = opts.emoji
    ? "Use a light, tasteful sprinkle of emoji (0–4)."
    : "Do not use any emoji.";
  const lang =
    opts.language === "auto"
      ? "Match the language to the apparent audience / setting of the photo, defaulting to English."
      : `Write in language code "${opts.language}".`;
  const audience = opts.audience?.trim()
    ? `Target audience: ${opts.audience.trim()}.`
    : "";
  const extra = opts.extraContext?.trim()
    ? `Additional context from the user: ${opts.extraContext.trim()}.`
    : "";

  return [
    "You are an expert Instagram content strategist and copywriter.",
    "Given a single photograph, produce a ready-to-post Instagram caption,",
    "a relevant list of hashtags, a concrete suggested posting time, and",
    "accessibility alt text.",
    "",
    "Rules:",
    `- Tone: ${opts.tone}.`,
    "- Caption: 1–3 short paragraphs, at most ~300 characters total. No hashtags inside the caption.",
    `- Hashtags: up to ${opts.maxHashtags} items, lowercase, no spaces, no leading '#' (the client adds it). Mix broad and niche tags. Avoid banned / spammy tags.`,
    "- Suggested posting time: name a specific day-of-week window and a time range (with user's local timezone, assume general audience unless context says otherwise) and a one-sentence rationale based on what's in the photo (content type, likely audience).",
    "- Alt text: factual, 1–2 sentences, describing the image for screen readers. Never include speculation about people's identity.",
    `- ${emojiRule}`,
    `- ${lang}`,
    audience,
    extra,
    "",
    "Return ONLY valid minified JSON matching this TypeScript type, with no prose, no code fences:",
    "type Out = {",
    "  caption: string;",
    "  hashtags: string[];",
    "  suggestedTime: { dayOfWeek: string; timeRange: string; timezoneHint: string; rationale: string };",
    "  altText: string;",
    "};",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseJsonResponse(text: string): PostSuggestion {
  // Tolerate code fences just in case the model wraps despite instructions.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new OpenAIError(
      "The model returned a response we couldn't parse as JSON.",
    );
  }

  if (!data || typeof data !== "object") {
    throw new OpenAIError("Malformed response: not an object.");
  }

  const d = data as Record<string, unknown>;
  const caption = typeof d.caption === "string" ? d.caption : "";
  const hashtagsRaw = Array.isArray(d.hashtags) ? d.hashtags : [];
  const hashtags = hashtagsRaw
    .filter((h): h is string => typeof h === "string")
    .map((h) => h.trim().replace(/^#+/, "").replace(/\s+/g, ""))
    .filter(Boolean);

  const st = (d.suggestedTime ?? {}) as Record<string, unknown>;
  const suggestedTime = {
    dayOfWeek: typeof st.dayOfWeek === "string" ? st.dayOfWeek : "",
    timeRange: typeof st.timeRange === "string" ? st.timeRange : "",
    timezoneHint: typeof st.timezoneHint === "string" ? st.timezoneHint : "",
    rationale: typeof st.rationale === "string" ? st.rationale : "",
  };
  const altText = typeof d.altText === "string" ? d.altText : "";

  if (!caption) {
    throw new OpenAIError("Model returned no caption.");
  }

  return { caption, hashtags, suggestedTime, altText };
}

export interface GenerateArgs {
  apiKey: string;
  model?: string;
  file: File;
  options: GenerationOptions;
  signal?: AbortSignal;
}

export async function generatePostForImage(
  args: GenerateArgs,
): Promise<PostSuggestion> {
  const { apiKey, file, options, signal } = args;
  const model = args.model ?? DEFAULT_MODEL;

  if (!validateApiKeyShape(apiKey)) {
    throw new OpenAIError(
      "API key doesn't look right. It should start with 'sk-'.",
    );
  }

  const dataUrl = await fileToDataUrl(file);

  const body = {
    model,
    // JSON-only response for easy parsing. Structured output via json_schema
    // is also supported, but json_object is broadly compatible and enough here.
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(options),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this photo and produce the JSON described by the system prompt.",
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              // "auto" lets the model decide; original pixels are preserved.
              detail: "auto",
            },
          },
        ],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") throw e;
    throw new OpenAIError(
      "Network error talking to OpenAI. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    let msg = `OpenAI returned ${res.status} ${res.statusText}.`;
    let code: string | undefined;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) msg = errJson.error.message;
      if (errJson?.error?.code) code = errJson.error.code;
    } catch {
      // ignore
    }
    if (res.status === 401) {
      throw new OpenAIError(
        "Your API key was rejected by OpenAI. Update it in Settings.",
        401,
        code,
      );
    }
    if (res.status === 429) {
      throw new OpenAIError(
        "Rate limited or out of quota. Try again in a minute.",
        429,
        code,
      );
    }
    throw new OpenAIError(msg, res.status, code);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) throw new OpenAIError("Empty response from OpenAI.");

  return parseJsonResponse(text);
}
