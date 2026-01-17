import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const RETRY_TIMEOUT_MS = 60_000;
const RETRY_INTERVAL_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilReady<T>(
  getData: () => Promise<T>,
  isEmpty: (data: T) => boolean
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const data = await getData();

    if (!isEmpty(data) || Date.now() - startTime >= RETRY_TIMEOUT_MS) {
      return data;
    }

    await sleep(RETRY_INTERVAL_MS);
  }
}

const CACHE_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Granola",
  "cache-v3.json"
);

interface Document {
  id: string;
  title?: string;
  created_at: string;
  deleted_at?: string | null;
  notes_plain?: string;
  google_calendar_event?: { summary?: string } | null;
}

interface TranscriptEntry {
  start_timestamp: string;
  text: string;
}

interface State {
  documents: Record<string, Document>;
  transcripts: Record<string, TranscriptEntry[]>;
}

async function loadState(): Promise<State> {
  const raw = await readFile(CACHE_PATH, "utf-8");
  const { cache } = JSON.parse(raw);
  return JSON.parse(cache).state;
}

function getTitle(doc: Document): string {
  return doc.title || doc.google_calendar_event?.summary || "Untitled";
}

export interface ListNotesOptions {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  summary: string;
  created_at: string;
}

export interface Transcript {
  id: string;
  transcript: string;
}

export async function listNotes(options: ListNotesOptions = {}): Promise<NoteSummary[]> {
  const { limit = 50, offset = 0, start_date, end_date } = options;
  const state = await loadState();

  const docs = Object.values(state.documents)
    .filter((d) => {
      if (d.deleted_at) return false;
      if (start_date && d.created_at < start_date) return false;
      if (end_date && d.created_at > end_date) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return docs.slice(offset, offset + limit).map((d) => ({
    id: d.id,
    title: getTitle(d),
    created_at: d.created_at,
  }));
}

export async function getNote(id: string): Promise<Note> {
  return pollUntilReady(
    async () => {
      const state = await loadState();
      const doc = state.documents[id];
      if (!doc) throw new Error(`Document not found: ${id}`);
      return {
        id: doc.id,
        title: getTitle(doc),
        summary: doc.notes_plain || "",
        created_at: doc.created_at,
      };
    },
    (note) => note.summary === ""
  );
}

export async function getTranscript(id: string): Promise<Transcript> {
  return pollUntilReady(
    async () => {
      const state = await loadState();
      const doc = state.documents[id];
      if (!doc) throw new Error(`Document not found: ${id}`);

      const entries = state.transcripts[id] || [];
      const transcript = [...entries]
        .sort((a, b) => Date.parse(a.start_timestamp) - Date.parse(b.start_timestamp))
        .map((e) => e.text)
        .join("\n");

      return { id, transcript };
    },
    (result) => result.transcript === ""
  );
}
