// Utilities to extract structured Q&A JSON from markdown docs

export const AllowedCategories = [
  "Habilidad Verbal",
  "Habilidad Lógico-Matemática",
  "Aritmética",
  "Geometría",
  "Álgebra",
  "Trigonometría",
  "Lenguaje",
  "Literatura",
  "Psicología",
  "Educación Cívica",
  "Historia del Perú",
  "Historia Universal",
  "Geografía",
  "Economía",
  "Filosofía",
  "Física",
  "Química",
  "Biología",
];

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CategoryMap: Map<string, string> = new Map(
  AllowedCategories.map((c) => [normalizeKey(c), c])
);

export type QAEntry = {
  Categoria: string;
  Problema: string;
  Opciones: string[];
  Respuesta: string;
  Clave: string;
  Solucion?: string;
};

export type QADoc = Record<string, Record<string, QAEntry>>; // { Category: { index: entry } }

export function extractQADoc(markdown: string): QADoc {
  const lines = markdown.split(/\r?\n/);

  let currentCategory: string | null = null;
  let questionBuffer: string[] = [];
  let collecting = false;
  const categories: QADoc = {};
  const counters: Record<string, number> = {};

  // temp structure while parsing one question
  let qNumber: string | null = null;
  let problemLines: string[] = [];
  let options: string[] = [];
  let solucionLines: string[] = [];
  let clave: string | null = null;

  function flushQuestion() {
    if (!currentCategory) return;
    if (problemLines.length === 0) return;
    // Build Respuesta from clave
    let respuesta = "";
    if (clave) {
      const idx = clave.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      if (idx >= 0 && idx < options.length) {
        respuesta = options[idx];
      }
    }
    const entry: QAEntry = {
      Categoria: currentCategory,
      Problema: problemLines.join("\n"),
      Opciones: options.slice(),
      Respuesta: respuesta,
      Clave: (clave || "").toUpperCase(),
      Solucion: solucionLines.length ? solucionLines.join("\n") : undefined,
    };

    const cat = currentCategory;
    if (!categories[cat]) categories[cat] = {};
    const nextIdx = (counters[cat] = (counters[cat] || 0) + 1);
    categories[cat][String(nextIdx)] = entry;

    // reset
    qNumber = null;
    problemLines = [];
    options = [];
    solucionLines = [];
    clave = null;
  }

  function maybeSetCategoryFromHeading(text: string) {
    const norm = normalizeKey(text);
    const mapped = CategoryMap.get(norm);
    if (mapped) {
      // Flushing any pending question when category switches
      flushQuestion();
      currentCategory = mapped;
    }
  }

  let inResolucion = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Heading detection
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      const text = h[2].trim();
      // Is it a category heading?
      maybeSetCategoryFromHeading(text.replace(/^\d+\.\s*/, "")); // ignore leading numbering

      // Is this a question start?
      if (/^PREGUNTA\b/i.test(text)) {
        // flush previous question before starting a new one
        flushQuestion();
        collecting = true;
        inResolucion = false;
        qNumber = text.match(/\d+/)?.[0] ?? null;
        continue;
      }
      // Is this a resolución heading?
      if (/^RESOLUCI[ÓO]N\b/i.test(text)) {
        inResolucion = true;
        continue;
      }
      // Is this a clave heading like "CLAVE: C"?
      const mClaveH = /^CLAVE\s*:\s*([A-E])/i.exec(text);
      if (mClaveH) {
        clave = mClaveH[1].toUpperCase();
        continue;
      }
      // For any other heading, treat as a boundary in general
    }

    // Also support inline keyword lines
    const mClaveInline = /^CLAVE\s*[:\-]\s*([A-E])$/i.exec(line);
    if (mClaveInline) {
      clave = mClaveInline[1].toUpperCase();
      continue;
    }
    const mRespuestaInline = /^RESPUESTA\s*[:\-]\s*(.+)$/i.exec(line);
    if (mRespuestaInline) {
      // we capture but will prefer option-derived text if clave exists
      // add to solution narrative as contextual information
      solucionLines.push(`Respuesta: ${mRespuestaInline[1].trim()}`);
      continue;
    }

    // Options
    const mOpt = /^([A-E])[\)\.\-]\s*(.+)$/.exec(line);
    if (mOpt && collecting) {
      const idx = mOpt[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      // fill or append, ensure in order
      while (options.length < idx) options.push("");
      options[idx] = mOpt[2].trim();
      continue;
    }

    if (collecting) {
      if (inResolucion) {
        solucionLines.push(raw);
      } else {
        // Problem text until options/solution headers
        // Skip empty leading lines after question heading
        if (!(problemLines.length === 0 && line === "")) problemLines.push(raw);
      }
    }
  }

  // flush last
  flushQuestion();
  return categories;
}

export function buildQADocumentJson(markdown: string, docTitle: string) {
  const byCategory = extractQADoc(markdown);
  return { [docTitle]: byCategory } as Record<string, QADoc>;
}
