export type DocSummary = {
  id: string; // normalized relative path without extension
  title: string;
  pdfRel: string; // relative to DOCS_ROOT (POSIX)
  mdRel: string;  // relative to DOCS_ROOT (POSIX)
};

export type DocWithContent = DocSummary & {
  mdContent: string;
};

export type ReviewState = 'not_started' | 'in_progress' | 'done';

export type DocStatus = {
  adsRemoved: boolean;
  reviewQuestions: ReviewState;
  reviewImages: ReviewState;
};

export const DefaultDocStatus: DocStatus = {
  adsRemoved: false,
  reviewQuestions: 'not_started',
  reviewImages: 'not_started',
};
