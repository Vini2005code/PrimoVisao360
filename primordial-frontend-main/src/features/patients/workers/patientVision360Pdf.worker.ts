/// <reference lib="webworker" />

import notoSansBoldUrl from "../../../assets/fonts/NotoSans-Bold.ttf?url";
import notoSansRegularUrl from "../../../assets/fonts/NotoSans-Regular.ttf?url";
import { buildPatientVision360Pdf } from "../services/patientVision360Pdf.builder";
import { patientVision360PdfRequestSchema } from "../types/patientVision360Pdf.types";

function arrayBufferToBinary(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 16_384;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return binary;
}

async function loadFont(url: string) {
  const response = await fetch(url, {
    cache: "force-cache",
    credentials: "same-origin",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Fonte local indisponível");
  return arrayBufferToBinary(await response.arrayBuffer());
}

self.onmessage = async (event: MessageEvent<unknown>) => {
  try {
    const request = patientVision360PdfRequestSchema.parse(event.data);
    const [regular, bold] = await Promise.all([
      loadFont(notoSansRegularUrl),
      loadFont(notoSansBoldUrl),
    ]);
    const result = buildPatientVision360Pdf(request, { regular, bold });
    self.postMessage(
      { type: "success", buffer: result.buffer, filename: result.filename },
      { transfer: [result.buffer] },
    );
  } catch {
    self.postMessage({
      type: "error",
      message: "Não foi possível montar o relatório local.",
    });
  }
};

export {};
