#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cache from "./cache.js";

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
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await cache.listNotes(args), null, 2) }],
  })
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
  async ({ id }) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await cache.getNote(id), null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
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
  async ({ id }) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await cache.getTranscript(id), null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
