import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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

  let docs = Object.values(state.documents)
    .filter((d) => !d.deleted_at)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (start_date) docs = docs.filter((d) => d.created_at >= start_date);
  if (end_date) docs = docs.filter((d) => d.created_at <= end_date);

  return docs.slice(offset, offset + limit).map((d) => ({
    id: d.id,
    title: getTitle(d),
    created_at: d.created_at,
  }));
}

export async function getNote(id: string): Promise<Note> {
  const state = await loadState();
  const doc = state.documents[id];
  if (!doc) throw new Error(`Document not found: ${id}`);

  return {
    id: doc.id,
    title: getTitle(doc),
    summary: doc.notes_plain || "",
    created_at: doc.created_at,
  };
}

export async function getTranscript(id: string): Promise<Transcript> {
  const state = await loadState();
  const doc = state.documents[id];
  if (!doc) throw new Error(`Document not found: ${id}`);

  const entries = state.transcripts[id] || [];
  const transcript = [...entries]
    .sort((a, b) => Date.parse(a.start_timestamp) - Date.parse(b.start_timestamp))
    .map((e) => e.text)
    .join("\n");

  return { id, transcript };
}
