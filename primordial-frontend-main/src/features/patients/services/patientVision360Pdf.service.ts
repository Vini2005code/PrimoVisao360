import {
  patientVision360PdfRequestSchema,
  type PatientVision360PdfRequest,
  type PatientVision360PdfWorkerResponse,
} from "../types/patientVision360Pdf.types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportPatientVision360Pdf(
  input: PatientVision360PdfRequest,
) {
  const request = patientVision360PdfRequestSchema.parse(input);
  const worker = new Worker(
    new URL("../workers/patientVision360Pdf.worker.ts", import.meta.url),
    { type: "module", name: "primordial-data-pdf" },
  );

  try {
    const response = await new Promise<PatientVision360PdfWorkerResponse>(
      (resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Tempo limite ao montar o PDF.")),
          45_000,
        );
        worker.onmessage = (event: MessageEvent<PatientVision360PdfWorkerResponse>) => {
          window.clearTimeout(timeout);
          resolve(event.data);
        };
        worker.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("Falha no processo local de exportação."));
        };
        worker.postMessage(request);
      },
    );
    if (response.type === "error") throw new Error(response.message);
    const blob = new Blob([response.buffer], { type: "application/pdf" });
    downloadBlob(blob, response.filename);
    return response.filename;
  } finally {
    worker.terminate();
  }
}
