import { z } from "zod";

export const imageFileDataSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
});

export type ImageFileData = z.infer<typeof imageFileDataSchema>;
