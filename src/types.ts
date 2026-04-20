export type Tone =
  | "authentic"
  | "playful"
  | "minimal"
  | "poetic"
  | "professional"
  | "witty";

export interface GenerationOptions {
  tone: Tone;
  audience: string; // Optional free-text description
  language: string; // "en", "es", "auto", etc.
  emoji: boolean;
  maxHashtags: number;
  extraContext?: string;
}

export interface SuggestedTime {
  dayOfWeek: string;
  timeRange: string;
  timezoneHint: string;
  rationale: string;
}

export interface PostSuggestion {
  caption: string;
  hashtags: string[];
  suggestedTime: SuggestedTime;
  altText: string;
}

export type JobStatus = "idle" | "loading" | "done" | "error";

export interface ImageJob {
  id: string;
  file: File;
  previewUrl: string;
  mime: string;
  sizeBytes: number;
  status: JobStatus;
  result?: PostSuggestion;
  error?: string;
}
