export type DocSummary = {
  id: string; // normalized relative path without extension
  title: string;
  pdfRel: string; // relative to DOCS_ROOT (POSIX)
  mdRel: string;  // relative to DOCS_ROOT (POSIX)
};

export type DocWithContent = DocSummary & {
  mdContent: string;
};

