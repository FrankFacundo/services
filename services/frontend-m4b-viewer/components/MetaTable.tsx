import type { ParsedMetadata } from "@/lib/types";
import { formatTime } from "@/lib/time";

export default function MetaTable({ metadata }: { metadata: ParsedMetadata }) {
  const rows: { key: string; val?: string | number }[] = [
    { key: "Title", val: metadata.common.title },
    { key: "Album", val: metadata.common.album },
    { key: "Artist", val: metadata.common.artist || metadata.common.albumartist },
    { key: "Genre", val: metadata.common.genre?.join(", ") },
    { key: "Year", val: metadata.common.year },
    { key: "Codec", val: metadata.format.codec },
    { key: "Container", val: metadata.format.container },
    { key: "Duration", val: formatTime(metadata.format.duration) },
    { key: "Bitrate", val: metadata.format.bitrate ? `${Math.round((metadata.format.bitrate || 0) / 1000)} kbps` : undefined },
    { key: "Sample Rate", val: metadata.format.sampleRate ? `${metadata.format.sampleRate} Hz` : undefined },
    { key: "Channels", val: metadata.format.numberOfChannels },
    { key: "File Size", val: metadata.format.size ? `${(metadata.format.size / (1024 * 1024)).toFixed(1)} MB` : undefined },
  ];
  return (
    <div className="rounded border bg-white overflow-hidden">
      <table className="min-w-full">
        <tbody>
          {rows.filter(r => r.val != null && r.val !== "").map((r) => (
            <tr key={r.key} className="border-b">
              <td className="p-2 w-40 font-medium bg-gray-50">{r.key}</td>
              <td className="p-2">{r.val as any}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

