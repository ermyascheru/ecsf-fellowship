import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

export function exportToCSV(
  res: Response,
  filename: string,
  columns: ColumnDefinition[],
  data: any[]
) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

  // UTF-8 BOM for Excel compatibility
  res.write('\uFEFF');

  // Header row
  const headerLine = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  res.write(headerLine + '\r\n');

  // Data rows
  for (const row of data) {
    const line = columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
    res.write(line + '\r\n');
  }

  res.end();
}

export async function exportToExcel(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ColumnDefinition[],
  data: any[]
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FTVTI ECSF Fellowship';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || Math.max(15, c.header.length + 5),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Deep navy
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Add data rows with alternating colors
  data.forEach((row, idx) => {
    const r = worksheet.addRow(row);
    r.height = 22;
    r.alignment = { vertical: 'middle' };
    if (idx % 2 === 1) {
      r.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
    }
    r.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

export function exportToPDF(
  res: Response,
  filename: string,
  title: string,
  columns: ColumnDefinition[],
  data: any[]
) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  doc.pipe(res);

  // Title & Header banner
  doc.rect(30, 30, doc.page.width - 60, 40).fill('#0F172A');
  doc.fillColor('#FFFFFF').fontSize(16).text('FTVTI ECSF Fellowship Management System', 45, 38, {
    align: 'left',
  });
  doc.fontSize(10).fillColor('#94A3B8').text(title, 45, 55, { align: 'left' });

  doc.moveDown(2);
  const startY = 85;
  let currentY = startY;

  const colWidth = (doc.page.width - 60) / columns.length;

  // Table header
  doc.rect(30, currentY, doc.page.width - 60, 20).fill('#1E293B');
  doc.fillColor('#FFFFFF').fontSize(8);
  columns.forEach((col, i) => {
    doc.text(col.header, 35 + i * colWidth, currentY + 6, {
      width: colWidth - 10,
      ellipsis: true,
    });
  });

  currentY += 20;

  // Table rows
  doc.fontSize(8);
  data.forEach((row, idx) => {
    if (currentY > doc.page.height - 40) {
      doc.addPage();
      currentY = 40;
    }

    if (idx % 2 === 1) {
      doc.rect(30, currentY, doc.page.width - 60, 18).fill('#F8FAFC');
    }

    doc.fillColor('#0F172A');
    columns.forEach((col, i) => {
      const val = row[col.key] !== null && row[col.key] !== undefined ? String(row[col.key]) : '-';
      doc.text(val, 35 + i * colWidth, currentY + 5, {
        width: colWidth - 10,
        ellipsis: true,
      });
    });

    currentY += 18;
  });

  // Footer timestamp
  doc.fontSize(7).fillColor('#64748B').text(
    `Generated on ${new Date().toLocaleString()} by FTVTI ECSF System`,
    30,
    doc.page.height - 25,
    { align: 'center', width: doc.page.width - 60 }
  );

  doc.end();
}
