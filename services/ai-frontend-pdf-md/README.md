# Docs Viewer (PDF + Markdown, side-by-side)

A production-ready Next.js App Router project that discovers pairs of PDF and Markdown files from a local directory (`DOCS_ROOT`) and renders them side-by-side in the browser. Markdown images with relative paths are resolved and served via a secure file API.

## Features
- Next.js App Router + TypeScript + Tailwind CSS
- Local filesystem access; no serverless assumptions
- Secure file streaming at `/api/file?path=...` rooted at `DOCS_ROOT`
- Document discovery via `manifest.json` or directory scan
- React-PDF (pdfjs) viewer with zoom and pagination
- React-Markdown + Remark-GFM with image src rewriter
- Resizable split pane, light/dark theme toggle, in-page TOC

## Setup
1) Install dependencies:
- Node 18+
- `npm i`

2) Configure `DOCS_ROOT`:
- Copy `.env.local.example` to `.env.local` and set `DOCS_ROOT` to an absolute path or repo-relative path.
- Example:

```
DOCS_ROOT=<absolute_path_or_repo_relative>/fixtures/sample
```

3) Run the app:

```
npm run dev
```

Visit http://localhost:3000

## How it finds document pairs
- If `DOCS_ROOT/manifest.json` exists, it must contain an array of `{ id?, pdf, md }` (paths relative to `DOCS_ROOT`, POSIX-style). If `id` is omitted, it’s derived from the Markdown path (without extension).
- Otherwise, the app recursively scans `DOCS_ROOT` and matches pairs by directory + basename: `some/path/foo.pdf` ↔ `some/path/foo.md`.
- Each doc summary uses `id` equal to the POSIX relative path to the basename (without extension), e.g., `some/path/foo`.

## API
- `/api/file?path=<POSIX-like relative path>`: Streams files rooted at `DOCS_ROOT` with strict traversal checks and content type detection.
- `/api/docs`: Returns a list of `{ id, title, pdfRel, mdRel }`.
- `/api/doc?id=...`: Returns the above summary for one doc plus `mdContent` as UTF-8.

## Markdown image handling
- Images in Markdown are rewritten to `/api/file?path=...` resolved relative to the Markdown file’s directory.
- Supports PNG/JPG/GIF/SVG and displays images responsively with captions from alt text.

## UI/UX
- Home page lists all docs with search.
- Document page shows PDF (left) and Markdown (right) in a resizable split. Includes PDF page controls, sticky toolbar, and a TOC generated from headings.
- Toggle vertical split (default) and stacked layout.
- Download “Open PDF” / “Open MD” buttons link through `/api/file`.
- Keyboard support: use arrow keys on the splitter to resize; PDF controls for prev/next page.

## Notes and limitations
- The included `fixtures/sample/foo.pdf` is a placeholder text file so that the repo stays text-only. Replace it with a real PDF to test PDF rendering.
- The pdf.js worker is configured using `import.meta.url` with a CDN fallback. For fully offline usage, ensure `pdfjs-dist` is bundled correctly by your environment.
- This project assumes a trusted local environment. The file API enforces path normalization and root restriction.

## Scripts
- `dev`: Start Next.js dev server
- `build`: Production build
- `start`: Start production server
- `lint`: Run Next.js ESLint
- `typecheck`: TypeScript type checking

## Minimal tests (optional)
If you want to add tests for path sanitation or scan logic, add your preferred test runner (e.g., Vitest or Jest) and write tests against `lib/paths.ts` and `lib/scan.ts`. This repo does not include a test harness by default.

