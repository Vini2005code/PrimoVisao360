import { jsPDF } from "jspdf";
import type { PatientVision360Chart } from "../types/patientVision360.types";
import {
  patientVision360PdfRequestSchema,
  type PatientVision360PdfRequest,
} from "../types/patientVision360Pdf.types";

const TEAL = [1, 76, 105] as const;
const TEAL_LIGHT = [231, 241, 244] as const;
const ORANGE = [231, 128, 36] as const;
const INK = [31, 45, 52] as const;
const MUTED = [94, 110, 118] as const;
const BORDER = [212, 223, 227] as const;
const WHITE = [255, 255, 255] as const;
const PAGE_WIDTH = 210;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_LIMIT = 278;

export interface PatientVision360PdfFonts {
  regular: string;
  bold: string;
}

function cleanText(value: string) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
      ? " "
      : character;
  }).join("");
}

function filenameFor(patientName: string, generatedAt: string) {
  const safeName = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `primordial-data-visao-360-${safeName || "paciente"}-${generatedAt.slice(0, 10)}.pdf`;
}

function itemKind(title: string, content?: string) {
  const text = `${title} ${content ?? ""}`.toLocaleLowerCase("pt-BR");
  if (/alerta|cr[ií]tic|aten[cç][aã]o|risco|urgente/.test(text)) return "Alerta clínico";
  if (/resumo|s[ií]ntese|executiv/.test(text)) return "Resumo executivo";
  return "Insight fixado";
}

function sampleChart(chart: PatientVision360Chart, maximum = 18) {
  if (chart.values.length <= maximum) {
    return chart.labels.map((label, index) => ({ label, value: chart.values[index] }));
  }
  const step = (chart.values.length - 1) / (maximum - 1);
  return Array.from({ length: maximum }, (_, index) => {
    const source = Math.round(index * step);
    return { label: chart.labels[source], value: chart.values[source] };
  });
}

function drawCartesianChart(
  doc: jsPDF,
  chart: PatientVision360Chart,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const points = sampleChart(chart);
  const values = points.map((point) => point.value);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const plotX = x + 10;
  const plotY = y + 5;
  const plotWidth = width - 14;
  const plotHeight = height - 15;
  const valueY = (value: number) => plotY + plotHeight - ((value - minimum) / range) * plotHeight;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(plotX, plotY, plotX, plotY + plotHeight);
  doc.line(plotX, plotY + plotHeight, plotX + plotWidth, plotY + plotHeight);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(String(maximum), plotX - 2, plotY + 1, { align: "right" });
  doc.text(String(minimum), plotX - 2, plotY + plotHeight, { align: "right" });

  if (chart.type === "bar") {
    const slot = plotWidth / Math.max(points.length, 1);
    const barWidth = Math.max(1.5, slot * 0.58);
    points.forEach((point, index) => {
      const top = valueY(Math.max(point.value, 0));
      const bottom = valueY(Math.min(point.value, 0));
      doc.setFillColor(...TEAL);
      doc.roundedRect(
        plotX + index * slot + (slot - barWidth) / 2,
        Math.min(top, bottom),
        barWidth,
        Math.max(0.8, Math.abs(bottom - top)),
        0.5,
        0.5,
        "F",
      );
    });
  } else {
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.8);
    points.forEach((point, index) => {
      const pointX = plotX + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const pointY = valueY(point.value);
      if (index > 0) {
        const previous = points[index - 1];
        const previousX = plotX + ((index - 1) / Math.max(points.length - 1, 1)) * plotWidth;
        doc.line(previousX, valueY(previous.value), pointX, pointY);
      }
      doc.setFillColor(...ORANGE);
      doc.circle(pointX, pointY, 1.15, "F");
    });
  }

  const labelIndexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  [...new Set(labelIndexes)].forEach((index) => {
    const pointX = plotX + (index / Math.max(points.length - 1, 1)) * plotWidth;
    doc.text(cleanText(points[index].label).slice(0, 22), pointX, plotY + plotHeight + 5, {
      align: index === 0 ? "left" : index === points.length - 1 ? "right" : "center",
    });
  });
}

function drawDistributionChart(
  doc: jsPDF,
  chart: PatientVision360Chart,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const rows = chart.labels.slice(0, 8).map((label, index) => ({
    label,
    value: chart.values[index],
  }));
  const maximum = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  rows.forEach((row, index) => {
    const rowY = y + 4 + index * ((height - 5) / Math.max(rows.length, 1));
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(cleanText(row.label).slice(0, 28), x, rowY + 2.5);
    doc.setFillColor(...TEAL_LIGHT);
    doc.roundedRect(x + 45, rowY, width - 60, 3.5, 1, 1, "F");
    doc.setFillColor(index === 0 ? ORANGE[0] : TEAL[0], index === 0 ? ORANGE[1] : TEAL[1], index === 0 ? ORANGE[2] : TEAL[2]);
    doc.roundedRect(x + 45, rowY, ((width - 60) * Math.abs(row.value)) / maximum, 3.5, 1, 1, "F");
    doc.setTextColor(...MUTED);
    doc.text(String(row.value), x + width, rowY + 2.5, { align: "right" });
  });
  if (chart.labels.length > rows.length) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(`+ ${chart.labels.length - rows.length} categorias na tabela de dados`, x, y + height);
  }
}

function drawChart(doc: jsPDF, chart: PatientVision360Chart, x: number, y: number) {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(x, y, CONTENT_WIDTH - 12, 56, 2, 2, "FD");
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text(cleanText(chart.title), x + 5, y + 7);
  if (chart.type === "bar" || chart.type === "line") {
    drawCartesianChart(doc, chart, x + 5, y + 10, CONTENT_WIDTH - 22, 40);
  } else {
    drawDistributionChart(doc, chart, x + 5, y + 11, CONTENT_WIDTH - 22, 38);
  }
}

function drawDataTable(
  doc: jsPDF,
  chart: PatientVision360Chart,
  startY: number,
  ensureSpace: (height: number) => void,
  getY: () => number,
  setY: (value: number) => void,
) {
  setY(startY);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Dados do gráfico", MARGIN + 8, getY());
  setY(getY() + 4);
  chart.labels.forEach((label, index) => {
    ensureSpace(6);
    const y = getY();
    if (index % 2 === 0) {
      doc.setFillColor(247, 250, 251);
      doc.rect(MARGIN + 7, y - 3.5, CONTENT_WIDTH - 14, 5.5, "F");
    }
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(cleanText(label).slice(0, 80), MARGIN + 9, y);
    doc.setFont("NotoSans", "bold");
    doc.text(String(chart.values[index]), PAGE_WIDTH - MARGIN - 9, y, { align: "right" });
    setY(y + 5.5);
  });
}

export function buildPatientVision360Pdf(
  input: PatientVision360PdfRequest,
  fonts: PatientVision360PdfFonts,
) {
  const payload = patientVision360PdfRequestSchema.parse(input);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("NotoSans-Regular.ttf", fonts.regular);
  doc.addFileToVFS("NotoSans-Bold.ttf", fonts.bold);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  let y = 0;

  const drawPageHeader = (continuation = false) => {
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, PAGE_WIDTH, continuation ? 18 : 42, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(continuation ? 13 : 19);
    doc.text("PRIMORDIAL DATA", MARGIN, continuation ? 12 : 16);
    if (!continuation) {
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(9);
      doc.text("Visão 360 - Relatório de insights fixados", MARGIN, 24);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(12);
      doc.text(cleanText(payload.patientName), MARGIN, 35);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8);
      doc.text(
        `Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(payload.generatedAt))}`,
        PAGE_WIDTH - MARGIN,
        35,
        { align: "right" },
      );
      y = 50;
    } else {
      y = 25;
    }
  };

  const ensureSpace = (height: number) => {
    if (y + height <= FOOTER_LIMIT) return;
    doc.addPage();
    drawPageHeader(true);
  };

  drawPageHeader();
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Documento descritivo para apoio à leitura médica. Não substitui avaliação ou decisão profissional.",
    MARGIN,
    y,
  );
  y += 9;

  payload.items.forEach((item, itemIndex) => {
    const kind = itemKind(item.title, item.content);
    const accent = kind === "Alerta clínico" ? ORANGE : TEAL;
    const titleLines = doc.splitTextToSize(cleanText(item.title), CONTENT_WIDTH - 24) as string[];
    const contentLines = item.content
      ? (doc.splitTextToSize(cleanText(item.content), CONTENT_WIDTH - 24) as string[])
      : [];
    const remainingLines = [...contentLines];
    let firstSegment = true;
    do {
      const fixedHeight = firstSegment ? 22 + titleLines.length * 4.5 : 18;
      ensureSpace(fixedHeight + 5);
      const availableHeight = FOOTER_LIMIT - y;
      const maximumLines = Math.max(
        1,
        Math.floor((availableHeight - fixedHeight) / 4.2),
      );
      const segmentLines = remainingLines.splice(0, maximumLines);
      const isLastSegment = remainingLines.length === 0;
      const cardHeight = Math.max(
        24,
        fixedHeight + segmentLines.length * 4.2,
      );
      const cardStart = y;

      doc.setFillColor(249, 251, 252);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(MARGIN, cardStart, CONTENT_WIDTH, cardHeight, 2, 2, "FD");
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(MARGIN, cardStart, 3, cardHeight, 1, 1, "F");
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(
        firstSegment ? kind.toUpperCase() : `${kind.toUpperCase()} - CONTINUAÇÃO`,
        MARGIN + 8,
        cardStart + 7,
      );
      doc.setTextColor(...MUTED);
      doc.text(
        `#${String(itemIndex + 1).padStart(2, "0")}`,
        PAGE_WIDTH - MARGIN - 6,
        cardStart + 7,
        { align: "right" },
      );

      let bodyY = cardStart + 14;
      if (firstSegment) {
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        doc.text(titleLines, MARGIN + 8, bodyY);
        bodyY += titleLines.length * 4.5 + 1;
      }
      if (segmentLines.length) {
        doc.setFont("NotoSans", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text(segmentLines, MARGIN + 8, bodyY);
      }
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(
        isLastSegment
          ? `Fixado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}`
          : "Conteúdo continua na página seguinte",
        MARGIN + 8,
        cardStart + cardHeight - 5,
      );
      y = cardStart + cardHeight + 5;
      firstSegment = false;
      if (!isLastSegment) ensureSpace(FOOTER_LIMIT);
    } while (remainingLines.length > 0);

    if (item.chart_data) {
      ensureSpace(61);
      drawChart(doc, item.chart_data, MARGIN + 6, y);
      y += 61;
      drawDataTable(doc, item.chart_data, y, ensureSpace, () => y, (value) => { y = value; });
      y += 5;
    }
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.line(MARGIN, 286, PAGE_WIDTH - MARGIN, 286);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Primordial DATA - Ambiente clínico seguro", MARGIN, 291);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, 291, { align: "right" });
  }

  doc.setDocumentProperties({
    title: `Visão 360 - ${cleanText(payload.patientName)}`,
    subject: "Insights clínicos fixados pelo médico",
    author: "Primordial DATA",
    creator: "Primordial DATA - geração local no navegador",
  });
  return {
    buffer: doc.output("arraybuffer"),
    filename: filenameFor(payload.patientName, payload.generatedAt),
  };
}
