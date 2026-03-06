import { z } from "zod";

export const audioFileDataSchema = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  artist: z.string().optional(),
});

export type AudioFileData = z.infer<typeof audioFileDataSchema>;
