import { z } from "zod";
import type { AppWindowComponentProps } from "../types";
import { FileTypes } from "../fileTypes";
import { notesFileDataSchema } from "../notes/schema";
import { serializedStateToMarkdown } from "../notes/serialization";
import type { PortableFile } from "./protocol";

const urlDataSchema = z.object({ url: z.string().min(1) });

/**
 * Converts the desktop's internal file data into something any store app can
 * use: Markdown text for notes (even when stored as Lexical JSON), and an
 * absolute URL for binary files.
 */
export const toPortableFile = (
  fileContext: AppWindowComponentProps["fileContext"]
): PortableFile | null => {
  if (!fileContext) return null;
  const { name, type, data } = fileContext;

  if (type === FileTypes.notes) {
    const parsed = notesFileDataSchema.safeParse(data);
    if (!parsed.success) return { name, type, text: "" };
    if (typeof parsed.data.text === "string") return { name, type, text: parsed.data.text };
    return {
      name,
      type,
      text: parsed.data.serialized ? serializedStateToMarkdown(parsed.data.serialized) : "",
    };
  }

  const parsed = urlDataSchema.safeParse(data);
  return {
    name,
    type,
    url: parsed.success ? new URL(parsed.data.url, window.location.href).href : undefined,
  };
};
