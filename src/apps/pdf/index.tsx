import { FileDown } from "lucide-react";
import { lazy } from "react";
import type { DesktopApp } from "../types";
import { FileTypes } from "../fileTypes";
import { PDF_FILE_URL, PdfZoomActions } from "./constants";
import { pdfFileDataSchema } from "./schema";

const PdfComponent = lazy(() => import("./Component"));

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
  minSize: { width: 480, height: 360 },
  createMenubar: createPdfMenubar,
  fileCapabilities: [{ fileType: FileTypes.pdf, schema: pdfFileDataSchema }],
};
