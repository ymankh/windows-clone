import { FileDown } from "lucide-react";
import type { DesktopApp } from "../types";
import PdfComponent from "./Component";

export const PdfApp: DesktopApp = {
  id: "pdf",
  title: "PDF Viewer",
  icon: FileDown,
  Component: PdfComponent,
};

