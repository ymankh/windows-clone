import { z } from "zod";

export const pdfFileDataSchema = z.object({
  url: z.string().min(1),
});

export type PdfFileData = z.infer<typeof pdfFileDataSchema>;
