"use client";
import { formatTime } from "@/lib/time";

type Chapter = { title?: string; start: number };

export default function ChapterList({ chapters, relPath, showNoChapters }: { chapters: Chapter[]; relPath: string; showNoChapters?: boolean }) {
  function seekTo(t: number) {
    const audio = document.querySelector<HTMLAudioElement>(`audio[src*="${CSS.escape(relPath)}"]`) || document.querySelector("audio");
    if (audio) audio.currentTime = t;
  }
  if (!chapters || chapters.length === 0) {
    return <div className="rounded border bg-white p-4 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">{showNoChapters ? "No chapters detected" : "No chapters"}</div>;
  }
  return (
    <div className="rounded border bg-white overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <table className="min-w-full">
        <thead className="bg-gray-50 text-left text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <tr>
            <th className="p-2">Start</th>
            <th className="p-2">Title</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {chapters.map((c, i) => (
            <tr key={i} className="border-t hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <td className="p-2 font-mono text-sm">{formatTime(c.start)}</td>
              <td className="p-2">{c.title || `Chapter ${i + 1}`}</td>
              <td className="p-2"><button className="text-blue-600 dark:text-blue-400" onClick={() => seekTo(c.start)}>Jump</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
