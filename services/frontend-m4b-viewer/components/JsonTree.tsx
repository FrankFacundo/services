"use client";
import { useMemo, useState } from "react";

type NodeProps = {
  name?: string;
  value: any;
  depth: number;
};

function isObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function preview(value: any, limit = 3): string {
  try {
    if (Array.isArray(value)) {
      const items = value.slice(0, limit).map((v) => smallPreview(v));
      return `[${items.join(", ")}${value.length > limit ? ", …" : ""}]`;
    }
    if (isObject(value)) {
      const keys = Object.keys(value).slice(0, limit);
      return `{ ${keys.map((k) => `${k}: ${smallPreview((value as any)[k])}`).join(", ")} ${Object.keys(value).length > limit ? "…" : ""}}`;
    }
    return smallPreview(value);
  } catch {
    return String(value);
  }
}

function smallPreview(v: any): string {
  if (typeof v === "string") {
    const s = v.length > 40 ? v.slice(0, 37) + "…" : v;
    return JSON.stringify(s);
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (isObject(v)) return "Object";
  return String(v);
}

function Line({ children }: { children: React.ReactNode }) {
  return <div className="whitespace-pre font-mono text-xs leading-5 text-gray-800">{children}</div>;
}

function Caret({ open }: { open: boolean }) {
  return <span className="inline-block w-4 select-none">{open ? "▾" : "▸"}</span>;
}

function JsonNode({ name, value, depth }: NodeProps) {
  const [open, setOpen] = useState(true); // expand all by default
  const padding = { paddingLeft: `${depth * 14}px` } as const;

  if (Array.isArray(value)) {
    const count = value.length;
    const DEFAULT_CHUNK = 200;
    const CHUNK = 200;
    const [visible, setVisible] = useState(Math.min(count, DEFAULT_CHUNK));
    const showMore = () => setVisible((v) => Math.min(count, v + CHUNK));
    const showAll = () => setVisible(count);
    const collapseToDefault = () => setVisible(Math.min(count, DEFAULT_CHUNK));
    return (
      <div>
        <Line>
          <span style={padding}>
            <button className="text-left hover:text-blue-700" onClick={() => setOpen(!open)} aria-label="Toggle array">
              <Caret open={open} />
              {name ? <span className="text-gray-600">{name}: </span> : null}
              <span className="text-purple-700">Array</span>
              <span className="text-gray-500">({count})</span>
              {!open && <span className="text-gray-500"> {preview(value)}</span>}
            </button>
          </span>
        </Line>
        {open && (
          <div>
            {value.slice(0, visible).map((v, i) => (
              <JsonNode key={i} name={String(i)} value={v} depth={depth + 1} />
            ))}
            {visible < count && (
              <div className="pl-6 py-1">
                <button className="text-blue-600 text-xs mr-3" onClick={showMore}>Show more ({Math.min(CHUNK, count - visible)})</button>
                <button className="text-blue-600 text-xs mr-3" onClick={showAll}>Show all ({count - visible} more)</button>
              </div>
            )}
            {visible >= count && count > DEFAULT_CHUNK && (
              <div className="pl-6 py-1">
                <button className="text-blue-600 text-xs" onClick={collapseToDefault}>Collapse to first {DEFAULT_CHUNK}</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isObject(value)) {
    const keys = Object.keys(value);
    const DEFAULT_CHUNK = 200;
    const CHUNK = 200;
    const [visible, setVisible] = useState(Math.min(keys.length, DEFAULT_CHUNK));
    const showMore = () => setVisible((v) => Math.min(keys.length, v + CHUNK));
    const showAll = () => setVisible(keys.length);
    const collapseToDefault = () => setVisible(Math.min(keys.length, DEFAULT_CHUNK));
    return (
      <div>
        <Line>
          <span style={padding}>
            <button className="text-left hover:text-blue-700" onClick={() => setOpen(!open)} aria-label="Toggle object">
              <Caret open={open} />
              {name ? <span className="text-gray-600">{name}: </span> : null}
              <span className="text-purple-700">Object</span>
              <span className="text-gray-500">({keys.length})</span>
              {!open && <span className="text-gray-500"> {preview(value)}</span>}
            </button>
          </span>
        </Line>
        {open && (
          <div>
            {keys.slice(0, visible).map((k) => (
              <JsonNode key={k} name={k} value={(value as any)[k]} depth={depth + 1} />
            ))}
            {visible < keys.length && (
              <div className="pl-6 py-1">
                <button className="text-blue-600 text-xs mr-3" onClick={showMore}>Show more ({Math.min(CHUNK, keys.length - visible)})</button>
                <button className="text-blue-600 text-xs mr-3" onClick={showAll}>Show all ({keys.length - visible} more)</button>
              </div>
            )}
            {visible >= keys.length && keys.length > DEFAULT_CHUNK && (
              <div className="pl-6 py-1">
                <button className="text-blue-600 text-xs" onClick={collapseToDefault}>Collapse to first {DEFAULT_CHUNK}</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // primitive
  const valStr = useMemo(() => {
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    try { return JSON.stringify(value); } catch { return String(value); }
  }, [value]);

  return (
    <Line>
      <span style={padding}>
        {name ? <span className="text-gray-600">{name}: </span> : null}
        <span className="text-teal-700">{valStr}</span>
      </span>
    </Line>
  );
}

export default function JsonTree({ data }: { data: any }) {
  return (
    <div className="rounded border bg-white">
      <div className="p-2 flex items-center justify-between border-b bg-gray-50">
        <div className="font-medium">JSON</div>
      </div>
      <div className="p-2 overflow-auto">
        <JsonNode value={data} depth={0} />
      </div>
    </div>
  );
}
