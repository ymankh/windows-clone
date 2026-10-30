import { z } from "zod";
import type { SerializedEditorState } from "lexical";

type SerializedNodeShape = {
  type: string;
  children?: SerializedNodeShape[];
  [key: string]: unknown;
};

const serializedNodeSchema: z.ZodType<SerializedNodeShape> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      children: z.array(serializedNodeSchema).optional(),
    })
    .catchall(z.unknown())
);

const serializedEditorStateShape = z.object({
  root: serializedNodeSchema.refine((root) => root.type === "root"),
});

export const serializedEditorStateSchema = z.custom<SerializedEditorState>(
  (value) => serializedEditorStateShape.safeParse(value).success,
  "Invalid Notes editor state"
);

export const notesFileDataSchema = z.object({
  text: z.string().optional(),
  serialized: serializedEditorStateSchema.optional(),
});

export type NotesFileData = z.infer<typeof notesFileDataSchema>;
