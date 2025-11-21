import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export const PDF_FILE_URL = "/pdfs/resume.pdf";

const PdfComponent = () => {
  const fileUrl = PDF_FILE_URL;

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <Document file={fileUrl} loading={<div className="p-4">Loading PDF...</div>}>
        <Page pageNumber={1} width={720} renderTextLayer renderAnnotationLayer />
      </Document>
    </div>
  );
};

export default PdfComponent;
