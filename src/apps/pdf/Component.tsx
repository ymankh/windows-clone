import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderWidth, setRenderWidth] = useState<number | undefined>(undefined);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const handleZoom = (event: Event) => {
      const detail = (event as CustomEvent<{ action: "in" | "out" | "reset" }>).detail;
      if (!detail) return;
      if (detail.action === "in") setScale((prev) => Math.min(prev + 0.1, 3));
      if (detail.action === "out") setScale((prev) => Math.max(prev - 0.1, 0.5));
      if (detail.action === "reset") setScale(1);
    };
    window.addEventListener("pdf-zoom", handleZoom as EventListener);
    return () => {
      window.removeEventListener("pdf-zoom", handleZoom as EventListener);
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      const maxWidth = node.clientWidth;
      setRenderWidth((current) =>
        current ? Math.min(current, maxWidth) : maxWidth
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col items-center overflow-auto"
    >
      <Document
        file={fileUrl}
        loading={<div className="p-4">Loading PDF...</div>}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        <div className="flex w-full flex-col items-center gap-6 py-4">
          {Array.from({ length: numPages }, (_, index) => (
            <Page
              key={index + 1}
              pageNumber={index + 1}
              width={renderWidth ? renderWidth * scale : renderWidth}
              renderTextLayer
              renderAnnotationLayer
              onLoadSuccess={(page) => {
                const maxWidth = containerRef.current?.clientWidth ?? page.originalWidth;
                setRenderWidth((current) => {
                  const targetWidth = Math.min(page.originalWidth, maxWidth);
                  return current ? Math.min(current, targetWidth) : targetWidth;
                });
              }}
            />
          ))}
        </div>
      </Document>
    </div>
  );
};

export default PdfComponent;
