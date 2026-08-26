import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPatientVision360Pdf } from "../src/features/patients/services/patientVision360Pdf.builder";

const generatedAt = "2026-08-12T10:45:00-03:00";
const fontDirectory = resolve("src", "assets", "fonts");
const [regularFont, boldFont] = await Promise.all([
  readFile(resolve(fontDirectory, "NotoSans-Regular.ttf")),
  readFile(resolve(fontDirectory, "NotoSans-Bold.ttf")),
]);
const result = buildPatientVision360Pdf({
  patientName: "Paciente de Teste",
  generatedAt,
  items: [
    {
      id: "sample-summary",
      source_message_id: "message-summary",
      title: "Resumo executivo do período",
      content:
        "Registros clínicos organizados cronologicamente para facilitar a revisão médica. O conteúdo apresentado permanece descritivo e restrito às informações documentadas no prontuário.",
      created_at: generatedAt,
    },
    {
      id: "sample-alert",
      source_message_id: "message-alert",
      title: "Alerta crítico documentado",
      content:
        "Este destaque em laranja representa um alerta fixado pelo médico para revisão prioritária. Nenhuma recomendação terapêutica é produzida pelo relatório.",
      created_at: generatedAt,
    },
    {
      id: "sample-line",
      source_message_id: "message-line",
      title: "Evolução dos registros no período",
      content: "Série temporal preservada com os valores recebidos do backend.",
      created_at: generatedAt,
      chart_data: {
        type: "line",
        title: "Evolução dos registros no período",
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
        values: [124, 128, 126, 121, 119, 122],
      },
    },
    {
      id: "sample-distribution",
      source_message_id: "message-distribution",
      title: "Distribuição de registros",
      content: "Comparativo categórico fixado na Visão 360.",
      created_at: generatedAt,
      chart_data: {
        type: "doughnut",
        title: "Distribuição por categoria",
        labels: ["Consultas", "Exames", "Evoluções", "Prescrições", "Sinais vitais"],
        values: [8, 14, 11, 5, 18],
      },
    },
    {
      id: "sample-long",
      source_message_id: "message-long",
      title: "Síntese longitudinal extensa",
      content: Array.from(
        { length: 24 },
        (_, index) =>
          `Período ${index + 1}: registro clínico descritivo preservado para avaliar quebra de página, hierarquia e legibilidade do documento corporativo.`,
      ).join(" "),
      created_at: generatedAt,
    },
  ],
}, {
  regular: regularFont.toString("binary"),
  bold: boldFont.toString("binary"),
});

const outputDirectory = resolve("..", "output", "pdf");
await mkdir(outputDirectory, { recursive: true });
const outputPath = resolve(outputDirectory, "primordial-data-visao-360-amostra.pdf");
await writeFile(outputPath, new Uint8Array(result.buffer));
console.log(outputPath);
