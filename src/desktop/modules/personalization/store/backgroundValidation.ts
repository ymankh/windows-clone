import { z } from "zod";

export const backgroundUrlSchema = z.string().trim().refine((value) => {
  if (value.startsWith("/") || value.startsWith("data:image/")) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Enter a valid image URL");
