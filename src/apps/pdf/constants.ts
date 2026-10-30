export const PdfZoomActions = {
  in: "in",
  out: "out",
  reset: "reset",
} as const;

export type PdfZoomAction =
  (typeof PdfZoomActions)[keyof typeof PdfZoomActions];

export type PdfZoomDetail = {
  action: PdfZoomAction;
  windowId?: string;
};
export const PDF_FILE_URL = "/pdfs/resume.pdf";
