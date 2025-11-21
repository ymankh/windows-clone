import { FileDown } from "lucide-react";
import type { DesktopApp } from "../types";
import PdfComponent, { PDF_FILE_URL } from "./Component";

export const PdfApp: DesktopApp = {
  id: "pdf",
  title: "PDF Viewer",
  icon: FileDown,
  Component: () => <PdfComponent />,
  menubar: [
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
              new CustomEvent("pdf-zoom", { detail: { action: "in" } })
            );
          },
        },
        {
          label: "Zoom Out",
          onSelect: () => {
            window.dispatchEvent(
              new CustomEvent("pdf-zoom", { detail: { action: "out" } })
            );
          },
        },
        {
          label: "Reset Zoom",
          onSelect: () => {
            window.dispatchEvent(
              new CustomEvent("pdf-zoom", { detail: { action: "reset" } })
            );
          },
        },
      ],
    },
  ],
};
