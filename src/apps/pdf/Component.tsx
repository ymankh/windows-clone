import { useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const PdfComponent = () => {
  const fileUrl = useMemo(
    () =>
      encodeURI(
        "/Yaman AlKhashashneh - Resume.pdf"
      ),
    []
  );

  return (
    <div className="flex h-full w-full flex-col overflow-auto">
      <Document file={fileUrl} loading={<div className="p-4">Loading PDF...</div>}>
        <Page pageNumber={1} width={720} renderTextLayer renderAnnotationLayer />
      </Document>
      <div className="p-3">
        <a
          href={fileUrl}
          download
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
};

export default PdfComponent;
