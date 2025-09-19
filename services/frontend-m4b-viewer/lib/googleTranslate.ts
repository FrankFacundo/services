const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "*/*",
};

export type GoogleTranslateOptions = {
  sourceLanguage?: string;
  targetLanguage: string;
  uiLanguage?: string;
  noAutocorrect?: boolean;
};

export type GoogleTranslateResult = {
  translation: string;
  original: string;
  detectedSourceLanguage?: string | null;
};

function buildUrl(text: string, options: GoogleTranslateOptions) {
  const params = new URLSearchParams({
    client: "gtx",
    "ie": "UTF-8",
    "oe": "UTF-8",
    sl: (options.sourceLanguage || "auto").trim() || "auto",
    tl: options.targetLanguage.trim(),
    hl: (options.uiLanguage || options.targetLanguage).trim(),
    q: text,
  });
  const detailParams = ["bd", "ex", "ld", "md", "rw", "rm", "ss", "t", "at", "gt"];
  const qc = options.noAutocorrect ? "qc" : "qca";
  detailParams.push(qc);
  for (const dt of detailParams) {
    params.append("dt", dt);
  }
  return `${GOOGLE_ENDPOINT}?${params.toString()}`;
}

function parseResponse(data: any, originalText: string): GoogleTranslateResult {
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  const translatedChunks: string[] = [];
  const originalChunks: string[] = [];
  for (const segment of segments) {
    if (!Array.isArray(segment)) continue;
    const translated = segment[0];
    const original = segment[1];
    if (typeof translated === "string") translatedChunks.push(translated);
    if (typeof original === "string") originalChunks.push(original);
  }
  const translation = translatedChunks.join("");
  const original = originalChunks.join("") || originalText;
  const detectedSourceLanguage = typeof data?.[2] === "string" ? data[2] : null;
  return { translation, original, detectedSourceLanguage };
}

export async function translateText(
  text: string,
  options: GoogleTranslateOptions
): Promise<GoogleTranslateResult> {
  if (!options.targetLanguage) {
    throw new Error("targetLanguage is required");
  }
  const url = buildUrl(text, options);
  const response = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Translate error ${response.status}: ${body}`);
  }
  const data = await response.json();
  return parseResponse(data, text);
}

export type BatchItem = { id: string; text: string };

export type BatchResultItem = {
  id: string;
  text: string;
  translation: string;
  detectedSourceLanguage?: string | null;
};

export async function translateBatch(
  items: BatchItem[],
  options: GoogleTranslateOptions
): Promise<{ items: BatchResultItem[]; detectedSourceLanguage?: string | null }> {
  const results: BatchResultItem[] = [];
  let detected: string | null | undefined;
  for (const item of items) {
    const trimmed = item.text.trim();
    if (!trimmed) {
      results.push({ id: item.id, text: item.text, translation: "", detectedSourceLanguage: null });
      continue;
    }
    const res = await translateText(trimmed, options);
    if (!detected && res.detectedSourceLanguage) {
      detected = res.detectedSourceLanguage;
    }
    results.push({
      id: item.id,
      text: item.text,
      translation: res.translation,
      detectedSourceLanguage: res.detectedSourceLanguage,
    });
  }
  return { items: results, detectedSourceLanguage: detected };
}
