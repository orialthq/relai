export type Provider = "anthropic" | "openai";

export interface Settings {
  provider: Provider;
  apiKey: string;
  model: string;
}

const KEY = "relai.settings.v1";

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-3-5-haiku-20241022",
  openai: "gpt-4o-mini",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { provider: "anthropic", apiKey: "", model: DEFAULT_MODEL.anthropic };
    const s = JSON.parse(raw) as Partial<Settings>;
    const provider: Provider = s.provider === "openai" ? "openai" : "anthropic";
    return {
      provider,
      apiKey: s.apiKey ?? "",
      model: s.model || DEFAULT_MODEL[provider],
    };
  } catch {
    return { provider: "anthropic", apiKey: "", model: DEFAULT_MODEL.anthropic };
  }
}

export function saveSettings(s: Settings): void {
  // Key lives only here, in the browser — never in the exported workspace JSON.
  localStorage.setItem(KEY, JSON.stringify(s));
}
