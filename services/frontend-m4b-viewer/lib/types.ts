export interface DirEntry {
  name: string;
  type: "dir" | "file";
  relPath: string;
}

export interface Chapter {
  title?: string;
  start: number; // seconds
}

export interface ParsedMetadata {
  ok: true;
  fileName: string;
  common: {
    title?: string;
    album?: string;
    artist?: string;
    albumartist?: string;
    genre?: string[];
    year?: number;
  };
  format: {
    duration?: number;
    bitrate?: number;
    codec?: string;
    container?: string;
    sampleRate?: number;
    numberOfChannels?: number;
    size?: number;
  };
  chapters: Chapter[];
  prettyDuration: string;
  coverDataUrl?: string;
}

export interface ParsedMetadataError {
  ok: false;
  error: string;
  status?: number;
}

export type ParsedMetadataResult = ParsedMetadata | ParsedMetadataError;

