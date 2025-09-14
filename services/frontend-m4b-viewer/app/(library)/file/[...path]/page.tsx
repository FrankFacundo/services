import { notFound } from "next/navigation";
import { getMetadata } from "@/lib/metadata";
import { getStructure } from "@/lib/structure";
import { guardPath } from "@/lib/path-guard";
import AudioPlayer from "@/components/AudioPlayer";
import ChapterList from "@/components/ChapterList";
import MetaTable from "@/components/MetaTable";
import Tabs from "@/components/Tabs";
import JsonTree from "@/components/JsonTree";
import TranscribeTab from "@/components/TranscribeTab";
import CurrentTranscript from "@/components/CurrentTranscript";

export default async function FilePage({ params }: { params: { path: string[] } }) {
  const relPath = decodeURIComponent(params.path.join("/"));
  const full = guardPath(relPath);
  if (!full.ok) return notFound();

  const metaRes = await getMetadata(relPath);
  if (!metaRes.ok) return notFound();
  const meta = metaRes; // narrowed to ParsedMetadata

  const structure = await getStructure(relPath);

  const src = `/api/stream?path=${encodeURIComponent(relPath)}`;
  const cover = meta.coverDataUrl ?? "/placeholder-cover.svg";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="Cover" className="w-28 h-28 rounded shadow object-cover bg-gray-100 dark:bg-gray-700" />
        <div>
          <h1 className="text-2xl font-semibold">{meta.common.title ?? meta.fileName}</h1>
          <p className="text-gray-600 dark:text-gray-300">{meta.common.artist ?? meta.common.album ?? "Unknown"}</p>
          <p className="text-gray-500 text-sm dark:text-gray-400">{meta.format.codec ?? "MP4/M4B"} • {meta.prettyDuration}</p>
        </div>
      </div>

      <AudioPlayer src={src} relPath={relPath} chapters={meta.chapters} />

      {/* Always-visible transcript synced to current chapter */}
      <CurrentTranscript relPath={relPath} chapters={meta.chapters} />

      <Tabs
        tabs={[
          {
            id: "overview",
            title: "Overview",
            content: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetaTable metadata={meta} />
                <div>
                  <h3 className="font-semibold mb-2">Chapters</h3>
                  <ChapterList chapters={meta.chapters} relPath={relPath} />
                </div>
              </div>
            ),
          },
          {
            id: "stt",
            title: "Transcribe",
            content: <TranscribeTab relPath={relPath} chapters={meta.chapters} />,
          },
          {
            id: "chapters",
            title: "Chapters",
            content: <ChapterList chapters={meta.chapters} relPath={relPath} showNoChapters />,
          },
          {
            id: "structure",
            title: "Structure",
            content: (
              <div>
                <h3 className="font-semibold mb-2">MP4 Atoms / Streams</h3>
                <JsonTree data={structure} />
              </div>
            ),
          },
          {
            id: "raw",
            title: "Raw metadata",
            content: <JsonTree data={(metaRes as any).raw} />,
          },
        ]}
      />
    </div>
  );
}
