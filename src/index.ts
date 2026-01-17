#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cache from "./cache.js";

type ToolResponse = {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function jsonResponse(data: unknown): ToolResponse {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResponse(error: unknown): ToolResponse {
  return { content: [{ type: "text", text: String(error) }], isError: true };
}

const server = new McpServer({
  name: "granola-mcp",
  version: "1.0.0",
});

server.registerTool(
  "list_notes",
  {
    title: "List Notes",
    description: "List meeting notes with optional filters",
    inputSchema: {
      limit: z.number().int().positive().default(50).describe("Max results"),
      offset: z.number().int().min(0).default(0).describe("Skip first N results"),
      start_date: z.string().optional().describe("ISO date, include notes from this date"),
      end_date: z.string().optional().describe("ISO date, include notes until this date"),
    },
  },
  async (args) => jsonResponse(await cache.listNotes(args))
);

server.registerTool(
  "get_note",
  {
    title: "Get Note",
    description: "Get note title and summary",
    inputSchema: {
      id: z.string().describe("Document UUID"),
    },
  },
  async ({ id }) => cache.getNote(id).then(jsonResponse).catch(errorResponse)
);

server.registerTool(
  "get_transcript",
  {
    title: "Get Transcript",
    description: "Get full transcript for a note",
    inputSchema: {
      id: z.string().describe("Document UUID"),
    },
  },
  async ({ id }) => cache.getTranscript(id).then(jsonResponse).catch(errorResponse)
);

const transport = new StdioServerTransport();
await server.connect(transport);
