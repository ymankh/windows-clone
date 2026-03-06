import { z } from "zod";

export const notesFileDataSchema = z.object({
  text: z.string().optional(),
  serialized: z.unknown().optional(),
});

export type NotesFileData = z.infer<typeof notesFileDataSchema>;
