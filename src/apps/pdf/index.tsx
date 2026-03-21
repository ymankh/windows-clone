import { FileDown } from "lucide-react";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import PdfComponent, { PDF_FILE_URL } from "./Component";
import { PdfZoomActions } from "./constants";
import { pdfFileDataSchema } from "./schema";

const createPdfMenubar = (windowId: string) => [
  {
    label: "File",
    items: [
      {
        label: "Download",
        onSelect: () => {
          window.open(PDF_FILE_URL, "_blank");
        },
      },
    ],
  },
  {
    label: "View",
    items: [
      {
        label: "Zoom In",
        onSelect: () => {
          window.dispatchEvent(
            new CustomEvent("pdf-zoom", {
              detail: { action: PdfZoomActions.in, windowId },
            })
          );
        },
      },
      {
        label: "Zoom Out",
        onSelect: () => {
          window.dispatchEvent(
            new CustomEvent("pdf-zoom", {
              detail: { action: PdfZoomActions.out, windowId },
            })
          );
        },
      },
      {
        label: "Reset Zoom",
        onSelect: () => {
          window.dispatchEvent(
            new CustomEvent("pdf-zoom", {
              detail: { action: PdfZoomActions.reset, windowId },
            })
          );
        },
      },
    ],
  },
];

export const PdfApp: DesktopApp = {
  id: "pdf",
  title: "PDF Viewer",
  icon: FileDown,
  Component: PdfComponent,
  createMenubar: createPdfMenubar,
  fileCapabilities: [{ fileType: FileTypes.pdf, schema: pdfFileDataSchema }],
};
