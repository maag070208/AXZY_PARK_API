import dayjs from "dayjs";
import "dayjs/locale/es";
import PDFDocument from "pdfkit";
import {
  getDebtorsData,
  getFinancialData,
  getInventoryData,
  getOccupancyData,
  getOperatorsData,
} from "./reports.service";
dayjs.locale("es");
const fs = require("fs");
const path = require("path");

const ensureDir = () => {
  const dir = path.join(process.cwd(), "public", "pdf");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Modern Color Palette
const COLORS = {
  primary: "#0f172a", // Slate 900
  secondary: "#64748b", // Slate 500
  accent: "#10b981", // Emerald 500
  border: "#e2e8f0", // Slate 200
  bg: "#f8fafc", // Slate 50
};

const createDoc = (title: string, range?: string) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const dir = ensureDir();
  const filename = `report-${Date.now()}.pdf`;
  const filepath = path.join(dir, filename);
  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  // Minimalist Header
  doc.fontSize(18).fillColor(COLORS.primary).text(title, { align: "left" });

  if (range) {
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .fillColor(COLORS.secondary)
      .text(`${range.toUpperCase()}`, { align: "left" });
  }

  doc.moveDown(0.5);
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(2);

  return { doc, writeStream, filename };
};

const finishDoc = (
  doc: any,
  writeStream: any,
  filename: string
): Promise<string> => {
  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(`/pdf/${filename}`));
    writeStream.on("error", reject);
  });
};

export const generateFinancialReportPdf = async (
  startDate: Date,
  endDate: Date
) => {
  // 1. Setup Document
  // We recreate functionality of createDoc manually for full control or use it lightly
  const { doc, writeStream, filename } = createDoc(
    "REPORTE FINANCIERO",
    "" // Empty range, will add manually
  );

  // 2. Fetch Data
  const { exits, extraCosts } = await getFinancialData(startDate, endDate);

  // 3. Calculate Totals
  const totalParking = exits.reduce(
    (acc: number, curr: any) => acc + curr.finalCost,
    0
  );
  const totalExtras = extraCosts.reduce(
    (acc: number, curr: any) => acc + curr.amount,
    0
  );
  const grandTotal = totalParking + totalExtras;
  const totalTransactions = exits.length + extraCosts.length; // Approximate

  // 4. Styles Config
  const COLORS = {
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#10B981",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#1E293B",
    textLight: "#64748B",
    white: "#FFFFFF",
  };

  // ================= HEADER OVERWRITE =================
  // Draw over the default header to look exactly like the request
  doc.rect(0, 0, 595.28, 120).fill(COLORS.primary); // Blue banner

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    // Larger logo (width 110), shifted text to accommodate
    doc.image(logoPath, 30, 25, { width: 110 });
  } else {
    doc.circle(50, 60, 25).fill("#2563EB").stroke("#3B82F6");
    doc.fillColor(COLORS.white).fontSize(20).text("P", 44, 53);
  }

  // Title (Shifted right to standard 160)
  doc
    .fillColor(COLORS.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("REPORTE FINANCIERO", 160, 40);
  doc
    .fillColor("#DBEAFE")
    .fontSize(14)
    .font("Helvetica")
    .text("Resumen Ejecutivo de Ingresos", 160, 70);

  // Period (Spanish)
  // Format: 06 enero 2026
  const startStr = dayjs(startDate).format("DD MMMM YYYY");
  const endStr = dayjs(endDate).format("DD MMMM YYYY");
  doc
    .fillColor(COLORS.white)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `PERÍODO: ${startStr.toUpperCase()} - ${endStr.toUpperCase()}`,
      160,
      95
    );

  // Generation Date
  doc
    .fillColor("#93C5FD")
    .fontSize(9)
    .font("Helvetica")
    .text(`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 400, 95, {
      align: "right",
      width: 140,
    });

  // ================= KPI CARDS (3 requested) =================
  let currentY = 140;
  const cardWidth = 160;
  const cardGap = 15;
  const startX = 20; // Reduced margin to fit wide table

  const drawCard = (
    x: number,
    title: string,
    value: string,
    icon: string,
    color: string,
    bg: string
  ) => {
    doc
      .rect(x, currentY, cardWidth, 90)
      .fill(COLORS.white)
      .stroke(COLORS.border);
    // Icon
    doc.circle(x + 25, currentY + 25, 18).fill(bg);
    doc
      .fillColor(color)
      .fontSize(14)
      .text(icon, x + 18, currentY + 20);

    // Content
    doc
      .fillColor(COLORS.secondary)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(title, x + 50, currentY + 22, { width: 100 });
    doc
      .fillColor(color)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(value, x + 15, currentY + 55);
  };

  // Card 1: INGRESOS DE ESTACIONAMIENTO
  drawCard(
    startX,
    "INGRESOS ESTACIONAMIENTO",
    `$${totalParking.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    "P",
    "#0C4A6E",
    "#F0F9FF"
  );

  // Card 2: INGRESOS EXTRAS
  drawCard(
    startX + cardWidth + cardGap,
    "INGRESOS EXTRAS",
    `$${totalExtras.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    "+",
    "#166534",
    "#F0FDF4"
  );

  // Card 3: TOTAL GANADO
  drawCard(
    startX + (cardWidth + cardGap) * 2,
    "TOTAL GANADO",
    `$${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    "$",
    COLORS.primary,
    "#EFF6FF"
  );

  currentY += 120;

  // ================= DETALLE DE MOVIMIENTOS (TABLE) =================
  doc
    .fillColor(COLORS.primary)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Detalle de Movimientos", startX, currentY);
  doc
    .fillColor(COLORS.textLight)
    .fontSize(10)
    .font("Helvetica")
    .text("Desglose de salidas", startX, currentY + 20);
  currentY += 40;

  // Table Headers - AJUSTADO para que quepa en la página
  const headers = [
    { text: "FECHA", w: 65, align: "left" },
    { text: "VEHICULO", w: 95, align: "left" },
    { text: "CLIENTE", w: 80, align: "left" },
    { text: "ENT", w: 40, align: "left" },
    { text: "SAL", w: 40, align: "left" },
    { text: "BASE", w: 45, align: "right" },
    { text: "EXTRA", w: 45, align: "right" },
    { text: "TOTAL", w: 70, align: "right" },
  ];

  // Reducir el ancho total de la tabla a 525px
  const tableWidth = 525; // En lugar de 550

  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > 780) {
      doc.addPage();
      currentY = 50;
      drawTableHeader();
    }
  };

  const drawTableHeader = () => {
    doc.rect(startX, currentY, tableWidth, 25).fill(COLORS.primary);
    let hX = startX + 5;
    doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");

    // Centrar verticalmente el texto en los headers
    headers.forEach((h) => {
      const textWidth = h.w - 10; // Dejar margen interno
      doc.text(h.text, hX + 5, currentY + 9, {
        width: textWidth,
        align: h.align as any,
        lineBreak: false, // Evitar saltos de línea
      });
      hX += h.w;
    });
    currentY += 25;
  };

  drawTableHeader();

  // Data Rows
  exits.forEach((exit: any, index: number) => {
    checkPageBreak(25);

    const entry = exit.entry || {};
    const entryOp = entry.operator
      ? `${entry.operator.name.split(" ")[0]}`
      : "-";
    const exitOp = exit.operator ? `${entry.operator.name.split(" ")[0]}` : "-";
    const client = entry.user
      ? `${entry.user.name.split(" ")[0]} ${entry.user.lastName?.[0] || ""}.`
      : "Casual";
    const vehicle = `${entry.brand} ${entry.model}`;

    const baseCost = entry.vehicleType?.cost || 60;
    const extras =
      entry.extraCosts?.reduce((s: number, c: any) => s + c.amount, 0) || 0;
    const total = exit.finalCost + extras;

    // Alternate Row Color
    if (index % 2 === 0)
      doc.rect(startX, currentY, tableWidth, 20).fill("#F1F5F9");

    let cX = startX + 5;
    doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");

    // Ajustar posiciones según los nuevos anchos
    doc.text(dayjs(exit.exitDate).format("DD/MM HH:mm"), cX + 2, currentY + 6, {
      width: headers[0].w - 5,
    });
    cX += headers[0].w;

    doc.text(vehicle, cX + 2, currentY + 6, {
      width: headers[1].w - 5,
      lineBreak: false,
      ellipsis: true,
    });
    cX += headers[1].w;

    doc.text(client, cX + 2, currentY + 6, {
      width: headers[2].w - 5,
      lineBreak: false,
      ellipsis: true,
    });
    cX += headers[2].w;

    doc.text(entryOp, cX + 2, currentY + 6, { width: headers[3].w - 5 });
    cX += headers[3].w;

    doc.text(exitOp, cX + 2, currentY + 6, { width: headers[4].w - 5 });
    cX += headers[4].w;

    doc.text(`$${baseCost}`, cX + 2, currentY + 6, {
      width: headers[5].w - 5,
      align: "right",
    });
    cX += headers[5].w;

    doc
      .fillColor(extras > 0 ? COLORS.accent : COLORS.textLight)
      .text(extras > 0 ? `+$${extras}` : "-", cX + 2, currentY + 6, {
        width: headers[6].w - 5,
        align: "right",
      });
    cX += headers[6].w;

    doc
      .fillColor(COLORS.primary)
      .font("Helvetica-Bold")
      .text(`$${total.toFixed(2)}`, cX + 2, currentY + 6, {
        width: headers[7].w - 5,
        align: "right",
      });

    currentY += 20;
  });

  // Footer signature line
  checkPageBreak(50);
  currentY += 30;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(startX, currentY)
    .lineTo(startX + 550, currentY)
    .stroke();
  doc
    .fillColor(COLORS.textLight)
    .fontSize(8)
    .font("Helvetica")
    .text("Fin del Reporte", startX, currentY + 10, {
      align: "center",
      width: 550,
    });

  return finishDoc(doc, writeStream, filename);
};

export const generateOperatorsReportPdf = async (
  startDate: Date,
  endDate: Date
) => {
  // 1. Setup Document
  const { doc, writeStream, filename } = createDoc("REPORTE DE OPERADORES", "");
  const { entries, exits } = await getOperatorsData(startDate, endDate);

  // 2. Compute Stats
  const stats: any = {};
  const totalEntries = entries.length;
  const totalExits = exits.length;
  let totalMoney = 0;

  // Helper to init stat
  const getStat = (name: string) => {
    if (!stats[name]) stats[name] = { entries: 0, exits: 0, money: 0 };
    return stats[name];
  };

  entries.forEach((e: any) => {
    const name = e.operator
      ? `${e.operator.name} ${e.operator.lastName || ""}`.trim()
      : "Sin Asignar";
    getStat(name).entries++;
  });

  exits.forEach((e: any) => {
    const name = e.operator
      ? `${e.operator.name} ${e.operator.lastName || ""}`.trim()
      : "Sin Asignar";
    const s = getStat(name);
    s.exits++;
    s.money += e.finalCost;
    totalMoney += e.finalCost;
  });

  // 3. Styles
  const COLORS = {
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#10B981",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#1E293B",
    textLight: "#64748B",
    white: "#FFFFFF",
  };

  // ================= HEADER =================
  doc.rect(0, 0, 595.28, 120).fill(COLORS.primary);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 25, { width: 110 });
  } else {
    doc.circle(50, 60, 25).fill("#2563EB").stroke("#3B82F6");
    doc.fillColor(COLORS.white).fontSize(20).text("OP", 44, 53);
  }

  doc
    .fillColor(COLORS.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("REPORTE DE OPERADORES", 160, 40);
  doc
    .fillColor("#DBEAFE")
    .fontSize(14)
    .font("Helvetica")
    .text("Auditoría de Rendimiento y Caja", 160, 70);

  const startStr = dayjs(startDate).format("DD MMMM YYYY");
  const endStr = dayjs(endDate).format("DD MMMM YYYY");
  doc
    .fillColor(COLORS.white)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `PERÍODO: ${startStr.toUpperCase()} - ${endStr.toUpperCase()}`,
      160,
      95
    );

  doc
    .fillColor("#93C5FD")
    .fontSize(9)
    .font("Helvetica")
    .text(`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 400, 95, {
      align: "right",
      width: 140,
    });

  // ================= GLOBAL SUMMARY =================
  let currentY = 140;
  const startX = 20;

  // Small cards for global totals
  const drawMiniCard = (
    x: number,
    label: string,
    value: string,
    color: string
  ) => {
    doc.rect(x, currentY, 170, 60).fill(COLORS.white).stroke(COLORS.border);
    doc
      .fillColor(COLORS.secondary)
      .fontSize(9)
      .font("Helvetica")
      .text(label, x + 15, currentY + 15);
    doc
      .fillColor(color)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(value, x + 15, currentY + 35);
  };

  drawMiniCard(
    startX,
    "TOTAL ENTRADAS",
    totalEntries.toString(),
    COLORS.primary
  );
  drawMiniCard(
    startX + 185,
    "TOTAL SALIDAS",
    totalExits.toString(),
    COLORS.primary
  );
  drawMiniCard(
    startX + 370,
    "DINERO RECAUDADO",
    `$${totalMoney.toFixed(2)}`,
    COLORS.accent
  );

  currentY += 80;

  // ================= OPERATOR DETAILS =================
  doc
    .fillColor(COLORS.primary)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Desglose por Operador", startX, currentY);
  currentY += 30;

  // Operator Cards
  const operators = Object.keys(stats);

  operators.forEach((op, index) => {
    const data = stats[op];

    // Check page break (Need ~90 height)
    if (currentY + 100 > 780) {
      doc.addPage();
      currentY = 50;
    }

    // Card Container
    doc
      .rect(startX, currentY, 550, 85)
      .fill(COLORS.white)
      .stroke(COLORS.border);

    // Avatar / Name Area
    doc.rect(startX, currentY, 550, 30).fill("#F1F5F9"); // Header strip
    doc
      .fillColor(COLORS.primary)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(op.toUpperCase(), startX + 15, currentY + 10);

    // Metrics Grid within Card
    const metricsY = currentY + 45;

    // Entries
    doc
      .fillColor(COLORS.textLight)
      .fontSize(9)
      .font("Helvetica")
      .text("Entradas Recibidas", startX + 30, metricsY);
    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(data.entries.toString(), startX + 30, metricsY + 15);

    // Exits
    doc
      .fillColor(COLORS.textLight)
      .fontSize(9)
      .font("Helvetica")
      .text("Salidas Procesadas", startX + 200, metricsY);
    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(data.exits.toString(), startX + 200, metricsY + 15);

    // Money
    doc
      .fillColor(COLORS.textLight)
      .fontSize(9)
      .font("Helvetica")
      .text("Dinero en Caja", startX + 370, metricsY);
    doc
      .fillColor(COLORS.accent)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(`$${data.money.toFixed(2)}`, startX + 370, metricsY + 15);

    // Visual Separators
    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(startX + 180, metricsY)
      .lineTo(startX + 180, metricsY + 30)
      .stroke();
    doc
      .moveTo(startX + 350, metricsY)
      .lineTo(startX + 350, metricsY + 30)
      .stroke();

    currentY += 100; // Card height + gap
  });

  // Footer
  doc
    .fillColor(COLORS.textLight)
    .fontSize(8)
    .font("Helvetica")
    .text("Fin del Reporte de Operadores", startX, currentY + 10, {
      align: "center",
      width: 550,
    });

  return finishDoc(doc, writeStream, filename);
};

export const generateInventoryReportPdf = async () => {
  // 1. Setup Document
  const { doc, writeStream, filename } = createDoc("INVENTARIO DE PATIO", "");
  const inventory = await getInventoryData();

  // 2. Styles
  const COLORS = {
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#10B981",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#1E293B",
    textLight: "#64748B",
    white: "#FFFFFF",
  };

  // ================= HEADER =================
  doc.rect(0, 0, 595.28, 120).fill(COLORS.primary);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 25, { width: 110 });
  } else {
    doc.circle(50, 60, 25).fill("#2563EB").stroke("#3B82F6");
    doc.fillColor(COLORS.white).fontSize(20).text("IN", 44, 53);
  }

  doc
    .fillColor(COLORS.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("INVENTARIO DE PATIO", 160, 40);
  doc
    .fillColor("#DBEAFE")
    .fontSize(14)
    .font("Helvetica")
    .text("Vehículos actualmente en las instalaciones", 160, 70);

  // Date: "AL MOMENTO"
  const nowStr = dayjs().format("DD MMMM YYYY - HH:mm");
  doc
    .fillColor(COLORS.white)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`GENERADO: ${nowStr.toUpperCase()}`, 160, 95);

  // ================= SUMMARY =================
  let currentY = 140;
  const startX = 20;

  // Total Card
  doc.rect(startX, currentY, 200, 70).fill(COLORS.white).stroke(COLORS.border);
  doc
    .fillColor(COLORS.secondary)
    .fontSize(10)
    .font("Helvetica")
    .text("VEHÍCULOS DENTRO", startX + 15, currentY + 15);
  doc
    .fillColor(COLORS.primary)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(inventory.length.toString(), startX + 15, currentY + 40);

  // Tip/Info
  doc
    .fillColor(COLORS.textLight)
    .fontSize(9)
    .font("Helvetica")
    .text(
      'Este reporte muestra una "fotografía" del estado actual del estacionamiento.',
      startX + 220,
      currentY + 25,
      { width: 330 }
    );

  currentY += 90;

  // ================= VEHICLE LIST =================
  doc
    .fillColor(COLORS.primary)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Listado Detallado", startX, currentY);
  currentY += 25;

  // Headers
  const headers = [
    { text: "#", w: 30, align: "left" },
    { text: "VEHÍCULO", w: 140, align: "left" },
    { text: "CLIENTE", w: 120, align: "left" },
    { text: "ENTRADA", w: 90, align: "left" },
    { text: "TIEMPO", w: 80, align: "right" },
    { text: "ESTADO", w: 80, align: "center" },
  ];

  // Table Header BG
  doc.rect(startX, currentY, 550, 25).fill(COLORS.primary);

  let hX = startX + 5;
  doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
  headers.forEach((h) => {
    doc.text(h.text, hX, currentY + 8, { width: h.w, align: h.align as any });
    hX += h.w;
  });
  currentY += 25;

  // Rows
  inventory.forEach((item: any, index: number) => {
    // Page break check
    if (currentY + 25 > 780) {
      doc.addPage();
      currentY = 50;
      // Redraw header
      doc.rect(startX, currentY, 550, 25).fill(COLORS.primary);
      let thX = startX + 5;
      doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
      headers.forEach((h) => {
        doc.text(h.text, thX, currentY + 8, {
          width: h.w,
          align: h.align as any,
        });
        thX += h.w;
      });
      currentY += 25;
    }

    const vehicle = `${item.brand || ""} ${item.model || ""} (Ticket: ${item.entryNumber || item.id})`;
    const client = item.user
      ? `${item.user.name} ${item.user.lastName || ""}`
      : "Casual";
    const entryTime = dayjs(item.entryDate);
    const hours = dayjs().diff(entryTime, "hour");
    const since = entryTime.format("DD/MM HH:mm");

    const statusMap: Record<string, string> = {
      ACTIVE: "ACTIVO",
      MOVED: "MOVIDO",
      EXITED: "SALIDA",
      CANCELLED: "CANCELADO",
    };
    const status = statusMap[item.status] || item.status;

    // Zebra striping
    if (index % 2 === 0) doc.rect(startX, currentY, 550, 20).fill("#F1F5F9");

    let cX = startX + 5;
    doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");

    // #
    doc.text((index + 1).toString(), cX, currentY + 6, { width: 30 });
    cX += 30;
    // Vehicle
    doc.text(vehicle, cX, currentY + 6, {
      width: 140,
      lineBreak: false,
      ellipsis: true,
    });
    cX += 140;
    // Client
    doc.text(client, cX, currentY + 6, {
      width: 120,
      lineBreak: false,
      ellipsis: true,
    });
    cX += 120;
    // Entry
    doc.text(since, cX, currentY + 6, { width: 90 });
    cX += 90;
    // Time
    doc.text(`${hours} hrs`, cX, currentY + 6, { width: 80, align: "right" });
    cX += 80;
    // Status
    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .text(status, cX, currentY + 6, { width: 80, align: "center" });

    currentY += 20;
  });

  // Footer
  currentY += 10;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(startX, currentY)
    .lineTo(startX + 550, currentY)
    .stroke();
  doc
    .fillColor(COLORS.textLight)
    .fontSize(8)
    .font("Helvetica")
    .text("Fin del Inventario", startX, currentY + 5, {
      align: "center",
      width: 550,
    });

  return finishDoc(doc, writeStream, filename);
};

export const generateOccupancyReportPdf = async (
  startDate: Date,
  endDate: Date
) => {
  // 1. Setup Document
  const { doc, writeStream, filename } = createDoc(
    "REPORTE DE FLUJO Y OCUPACIÓN",
    ""
  );
  const { entries, exits } = await getOccupancyData(startDate, endDate);

  // 2. Styles
  const COLORS = {
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#10B981",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#1E293B",
    textLight: "#64748B",
    white: "#FFFFFF",
  };

  // ================= HEADER =================
  doc.rect(0, 0, 595.28, 120).fill(COLORS.primary);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 25, { width: 110 });
  } else {
    doc.circle(50, 60, 25).fill("#2563EB").stroke("#3B82F6");
    doc.fillColor(COLORS.white).fontSize(20).text("FL", 44, 53);
  }

  doc
    .fillColor(COLORS.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("REPORTE DE FLUJO", 160, 40);
  doc
    .fillColor("#DBEAFE")
    .fontSize(14)
    .font("Helvetica")
    .text("Ingresos, Salidas y Ocupación Histórica", 160, 70);

  const startStr = dayjs(startDate).format("DD MMMM YYYY");
  const endStr = dayjs(endDate).format("DD MMMM YYYY");
  doc
    .fillColor(COLORS.white)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `PERÍODO: ${startStr.toUpperCase()} - ${endStr.toUpperCase()}`,
      160,
      95
    );

  doc
    .fillColor("#93C5FD")
    .fontSize(9)
    .font("Helvetica")
    .text(`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 400, 95, {
      align: "right",
      width: 140,
    });

  // ================= SUMMARY =================
  let currentY = 140;
  const startX = 20;

  const totalIn = entries.length;
  const totalOut = exits.length;
  const netFlow = totalIn - totalOut;
  const netColor = netFlow >= 0 ? COLORS.accent : "#EF4444";
  const netPrefix = netFlow > 0 ? "+" : "";

  // ================= DATA PROCESSING =================
  // 1. Process Data by Day
  const daysMap: Record<string, { in: number; out: number }> = {};

  entries.forEach((e: any) => {
    const d = dayjs(e.entryDate).format("YYYY-MM-DD");
    if (!daysMap[d]) daysMap[d] = { in: 0, out: 0 };
    daysMap[d].in++;
  });
  exits.forEach((e: any) => {
    const d = dayjs(e.exitDate).format("YYYY-MM-DD");
    if (!daysMap[d]) daysMap[d] = { in: 0, out: 0 };
    daysMap[d].out++;
  });

  interface ChartRow {
    date: string;
    in: number;
    out: number;
  }
  const rows: ChartRow[] = Object.keys(daysMap)
    .sort()
    .map((date) => ({
      date,
      ...daysMap[date],
    }));

  // Small cards
  const drawMiniCard = (
    x: number,
    label: string,
    value: string,
    color: string
  ) => {
    doc.rect(x, currentY, 170, 60).fill(COLORS.white).stroke(COLORS.border);
    doc
      .fillColor(COLORS.secondary)
      .fontSize(9)
      .font("Helvetica")
      .text(label, x + 15, currentY + 15);
    doc
      .fillColor(color)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(value, x + 15, currentY + 35);
  };

  drawMiniCard(startX, "TOTAL ENTRADAS", totalIn.toString(), COLORS.primary);
  drawMiniCard(
    startX + 185,
    "TOTAL SALIDAS",
    totalOut.toString(),
    COLORS.primary
  );
  drawMiniCard(startX + 370, "FLUJO NETO", `${netPrefix}${netFlow}`, netColor);

  currentY += 90;

  // ================= VISUAL CHART (Entries vs Exits) =================
  // Draw a simple bar chart if there are days to show
  if (rows.length > 0) {
    doc
      .fillColor(COLORS.primary)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Gráfica de Movimientos", startX, currentY);
    currentY += 30;

    const chartHeight = 150;
    const chartWidth = 550;
    const maxVal = Math.max(...rows.map((r) => Math.max(r.in, r.out)), 5); // Min scale 5
    const scale = (chartHeight - 30) / maxVal;
    const barWidth = Math.min(40, chartWidth / rows.length / 3);
    const gap = barWidth / 2;

    // Draw Axis
    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(startX, currentY)
      .lineTo(startX, currentY + chartHeight) // Y Axis
      .lineTo(startX + chartWidth, currentY + chartHeight)
      .stroke(); // X Axis

    // Draw Bars
    let bx = startX + 20;
    const footerY = currentY + chartHeight + 5;

    rows.forEach((row) => {
      const hIn = row.in * scale;
      const hOut = row.out * scale;

      // Bar In (Green)
      if (hIn > 0) {
        doc
          .rect(bx, currentY + chartHeight - hIn, barWidth, hIn)
          .fill(COLORS.accent);
        doc
          .fillColor(COLORS.text)
          .fontSize(8)
          .text(row.in.toString(), bx, currentY + chartHeight - hIn - 10, {
            width: barWidth,
            align: "center",
          });
      }

      // Bar Out (Blue/Gray)
      if (hOut > 0) {
        doc
          .rect(
            bx + barWidth + 2,
            currentY + chartHeight - hOut,
            barWidth,
            hOut
          )
          .fill(COLORS.secondary);
        doc
          .fillColor(COLORS.text)
          .fontSize(8)
          .text(
            row.out.toString(),
            bx + barWidth + 2,
            currentY + chartHeight - hOut - 10,
            { width: barWidth, align: "center" }
          );
      }

      // Label (Day)
      doc
        .fillColor(COLORS.textLight)
        .fontSize(8)
        .text(dayjs(row.date).format("DD/MM"), bx, footerY, {
          width: barWidth * 2 + 2,
          align: "center",
        });

      bx += barWidth * 2 + 2 + gap * 2;
    });

    // Legendary
    const legY = currentY - 15;
    doc.rect(startX + 180, legY, 10, 10).fill(COLORS.accent);
    doc.fillColor(COLORS.text).text("Entradas", startX + 195, legY);
    doc.rect(startX + 260, legY, 10, 10).fill(COLORS.secondary);
    doc.fillColor(COLORS.text).text("Salidas", startX + 275, legY);

    currentY += chartHeight + 40;
  }

  // ================= DAILY BREAKDOWN TABLE =================
  doc
    .fillColor(COLORS.primary)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Desglose Diario", startX, currentY);
  currentY += 25;

  // Headers - AJUSTADO para que no se corte
  const headers = [
    { text: "FECHA", w: 160, align: "left" },
    { text: "ENTRADAS", w: 100, align: "center" },
    { text: "SALIDAS", w: 100, align: "center" },
    { text: "BALANCE", w: 130, align: "right" },
  ];

  // Table Header BG
  const tableWidth = headers.reduce((sum, h) => sum + h.w, 0); // Calcula dinámicamente
  doc.rect(startX, currentY, tableWidth, 25).fill(COLORS.primary);

  // Mejor alineación vertical y horizontal para los headers
  let hX = startX;
  doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
  headers.forEach((h) => {
    // Centrar texto en la celda tanto vertical como horizontalmente
    const textY = currentY + 9; // Ajuste vertical
    const textWidth = h.w - 8; // Dejar margen interno
    const textX = hX + 4; // Margen izquierdo

    doc.text(h.text, textX, textY, {
      width: textWidth,
      align: h.align as any,
      lineBreak: false, // Evitar saltos de línea en headers
    });
    hX += h.w;
  });
  currentY += 25;

  // Rows
  rows.forEach((row, index) => {
    if (currentY + 25 > 780) {
      doc.addPage();
      currentY = 50;
      // Header repeat logic con el mismo cálculo de ancho
      doc.rect(startX, currentY, tableWidth, 25).fill(COLORS.primary);
      let rhX = startX;
      doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
      headers.forEach((h) => {
        doc.text(h.text, rhX + 4, currentY + 9, {
          width: h.w - 8,
          align: h.align as any,
          lineBreak: false,
        });
        rhX += h.w;
      });
      currentY += 25;
    }

    const dateStr = dayjs(row.date).format("DD MMMM YYYY").toUpperCase();
    const balance = row.in - row.out;
    const balPrefix = balance > 0 ? "+" : "";
    const balColor =
      balance === 0
        ? COLORS.textLight
        : balance > 0
          ? COLORS.accent
          : "#EF4444";

    if (index % 2 === 0)
      doc.rect(startX, currentY, tableWidth, 20).fill("#F1F5F9");

    let cX = startX;
    doc.fillColor(COLORS.text).fontSize(9).font("Helvetica");

    // FECHA (160)
    doc.text(dateStr, cX + 4, currentY + 6, {
      width: headers[0].w - 8,
      lineBreak: false, // Evitar saltos en fechas largas
    });
    cX += headers[0].w;

    // ENTRADAS (100)
    doc.text(row.in.toString(), cX + 4, currentY + 6, {
      width: headers[1].w - 8,
      align: "center",
    });
    cX += headers[1].w;

    // SALIDAS (100)
    doc.text(row.out.toString(), cX + 4, currentY + 6, {
      width: headers[2].w - 8,
      align: "center",
    });
    cX += headers[2].w;

    // BALANCE (130)
    doc
      .fillColor(balColor)
      .font("Helvetica-Bold")
      .text(`${balPrefix}${balance}`, cX + 4, currentY + 6, {
        width: headers[3].w - 8,
        align: "right",
        lineBreak: false,
      });

    currentY += 20;
  });
  // Footer
  currentY += 20;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(startX, currentY)
    .lineTo(startX + tableWidth, currentY)
    .stroke();
  doc
    .fillColor(COLORS.textLight)
    .fontSize(8)
    .font("Helvetica")
    .text("Fin del Reporte de Flujo", startX, currentY + 5, {
      align: "center",
      width: tableWidth,
    });

  return finishDoc(doc, writeStream, filename);
};

export const generateDebtorsReportPdf = async () => {
  // 1. Setup Document
  const { doc, writeStream, filename } = createDoc("REPORTE DE DEUDORES", "");
  const debtors = await getDebtorsData();

  // 2. Constants & Calculations
  let totalDebt = 0;

  // Enrich data
  // Enrich data
  const rows = debtors.map((item: any) => {
    const now = dayjs();
    const entryDate = dayjs(item.entryDate);
    // Full days or partial? Usually parkings charge by hour or day fraction. Estimate by 24h chunks.
    const days = Math.max(1, Math.ceil(now.diff(entryDate, "hour") / 24));

    // Dynamic Cost
    const typeCost = item.vehicleType?.cost || 60;
    const debt = days * typeCost;

    totalDebt += debt;
    return {
      ...item,
      days,
      debt,
    };
  });

  // 3. Styles
  const COLORS = {
    primary: "#1E40AF",
    secondary: "#475569",
    accent: "#10B981",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    text: "#1E293B",
    textLight: "#64748B",
    white: "#FFFFFF",
  };

  // ================= HEADER =================
  doc.rect(0, 0, 595.28, 120).fill(COLORS.primary);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 25, { width: 110 });
  } else {
    doc.circle(50, 60, 25).fill("#2563EB").stroke("#3B82F6");
    doc.fillColor(COLORS.white).fontSize(20).text("DB", 44, 53);
  }

  doc
    .fillColor(COLORS.white)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("REPORTE DE DEUDORES", 160, 40);
  doc
    .fillColor("#DBEAFE")
    .fontSize(14)
    .font("Helvetica")
    .text("Cuentas por Cobrar (Estimado)", 160, 70);

  const nowStr = dayjs().format("DD MMMM YYYY - HH:mm");
  doc
    .fillColor(COLORS.white)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`GENERADO: ${nowStr.toUpperCase()}`, 160, 95);

  // ================= SUMMARY =================
  let currentY = 140;
  const startX = 20;

  // Total Card
  doc.rect(startX, currentY, 220, 70).fill(COLORS.white).stroke(COLORS.border);
  doc
    .fillColor(COLORS.secondary)
    .fontSize(10)
    .font("Helvetica")
    .text("DEUDA TOTAL ESTIMADA", startX + 15, currentY + 15);
  doc
    .fillColor("#EF4444")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(
      `$${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      startX + 15,
      currentY + 40
    );

  // Count Card
  doc
    .rect(startX + 240, currentY, 150, 70)
    .fill(COLORS.white)
    .stroke(COLORS.border);
  doc
    .fillColor(COLORS.secondary)
    .fontSize(10)
    .font("Helvetica")
    .text("VEHÍCULOS", startX + 255, currentY + 15);
  doc
    .fillColor(COLORS.primary)
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(debtors.length.toString(), startX + 255, currentY + 40);

  currentY += 90;

  // ================= DETAIL TABLE =================
  doc
    .fillColor(COLORS.primary)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Detalle de Adeudos", startX, currentY);
  currentY += 25;

  // Headers - REVISADO para asegurar que quepan
  const headers = [
    { text: "#", w: 30, align: "left" },
    { text: "CLIENTE", w: 120, align: "left" },
    { text: "VEHÍCULO", w: 140, align: "left" },
    { text: "ENTRADA", w: 90, align: "left" },
    { text: "DÍAS", w: 60, align: "center" },
    { text: "DEUDA", w: 105, align: "right" }, // Reducido de 110 a 105
  ];

  const tableWidth = headers.reduce((sum, h) => sum + h.w, 0); // Calcula dinámicamente

  // Dibujar fondo del header
  doc.rect(startX, currentY, tableWidth, 25).fill(COLORS.primary);

  // Colocar headers SIN padding extra en la posición inicial
  let hX = startX;
  doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
  headers.forEach((h) => {
    // Agregar padding interno dentro del ancho de la celda
    const cellPadding = 4;
    const textWidth = h.w - cellPadding * 2;
    const textX = hX + cellPadding;

    doc.text(h.text, textX, currentY + 9, {
      width: textWidth,
      align: h.align as any,
      lineBreak: false, // Importante para evitar cortes
    });
    hX += h.w;
  });
  currentY += 25;

  // Rows - AJUSTAR para usar los mismos anchos
  rows.forEach((row, index) => {
    if (currentY + 25 > 780) {
      doc.addPage();
      currentY = 50;
      // Redraw header con el mismo cálculo
      doc.rect(startX, currentY, tableWidth, 25).fill(COLORS.primary);
      let thX = startX;
      doc.fillColor(COLORS.white).fontSize(8).font("Helvetica-Bold");
      headers.forEach((h) => {
        const cellPadding = 4;
        const textWidth = h.w - cellPadding * 2;
        const textX = thX + cellPadding;

        doc.text(h.text, textX, currentY + 9, {
          width: textWidth,
          align: h.align as any,
          lineBreak: false,
        });
        thX += h.w;
      });
      currentY += 25;
    }

    const client = row.user
      ? `${row.user.name} ${row.user.lastName || ""}`
      : "Casual";
    const vehicle = `${row.brand} ${row.model} (Ticket: ${row.entryNumber})`;
    const entryStr = dayjs(row.entryDate).format("DD/MM HH:mm");

    if (index % 2 === 0)
      doc.rect(startX, currentY, tableWidth, 20).fill("#F1F5F9");

    let cX = startX;
    doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");

    // # (30)
    const cellPadding = 4;
    doc.text((index + 1).toString(), cX + cellPadding, currentY + 6, {
      width: headers[0].w - cellPadding * 2,
    });
    cX += headers[0].w;

    // Client (120)
    doc.text(client, cX + cellPadding, currentY + 6, {
      width: headers[1].w - cellPadding * 2,
      lineBreak: false,
      ellipsis: true,
    });
    cX += headers[1].w;

    // Vehicle (140)
    doc.text(vehicle, cX + cellPadding, currentY + 6, {
      width: headers[2].w - cellPadding * 2,
      lineBreak: false,
      ellipsis: true,
    });
    cX += headers[2].w;

    // Entry (90)
    doc.text(entryStr, cX + cellPadding, currentY + 6, {
      width: headers[3].w - cellPadding * 2,
    });
    cX += headers[3].w;

    // Days (60)
    doc.text(row.days.toString(), cX + cellPadding, currentY + 6, {
      width: headers[4].w - cellPadding * 2,
      align: "center",
    });
    cX += headers[4].w;

    // Debt (105)
    doc
      .fillColor("#EF4444")
      .font("Helvetica-Bold")
      .text(`$${row.debt.toFixed(2)}`, cX + cellPadding, currentY + 6, {
        width: headers[5].w - cellPadding * 2,
        align: "right",
        lineBreak: false,
      });

    currentY += 20;
  });

  // Footer
  currentY += 10;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(startX, currentY)
    .lineTo(startX + tableWidth, currentY)
    .stroke();
  doc
    .fillColor(COLORS.textLight)
    .fontSize(8)
    .font("Helvetica")
    .text("Fin del Reporte de Deudores", startX, currentY + 5, {
      align: "center",
      width: tableWidth,
    });

  return finishDoc(doc, writeStream, filename);
};
