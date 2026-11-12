/**
 * @file scripts/build-docs.js
 * @description Compiles Markdown documentation sources from docs/src into styled
 * Word (.docx) documents in docs/docx using the docx library.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../docs/src');
const OUTPUT_DIR = path.resolve(__dirname, '../docs/docx');

/**
 * Parses inline formatting (such as **bold** text) into an array of docx TextRuns.
 * @param {string} text - Raw markdown line text
 * @returns {TextRun[]}
 */
function parseInlineFormatting(text) {
  const runs = [];
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: 'Calibri',
          size: 22, // 11pt
        })
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          font: 'Consolas',
          size: 20, // 10pt
          shading: {
            fill: 'F1F5F9',
          },
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          font: 'Calibri',
          size: 22,
        })
      );
    }
  }

  return runs;
}

/**
 * Converts Markdown file content into a docx Document structure.
 * @param {string} markdownContent - Full markdown text
 * @param {string} title - Document title
 * @returns {Document}
 */
function markdownToDocx(markdownContent, title) {
  const lines = markdownContent.split('\n');
  /** @type {(Paragraph | Table)[]} */
  const docChildren = [];

  let inCodeBlock = false;
  let codeBuffer = [];
  let tableBuffer = [];

  /**
   * Flushes any buffered table rows into a docx Table element.
   */
  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    // Filter out separator rows like |---|---|
    const validRows = tableBuffer.filter((row) => !row.every((cell) => /^[:\s-]+$/.test(cell)));

    if (validRows.length > 0) {
      const colCount = Math.max(...validRows.map((r) => r.length));
      const colWidthPercent = Math.floor(100 / colCount);

      const tableRows = validRows.map((cells, rowIndex) => {
        const isHeader = rowIndex === 0;
        return new TableRow({
          children: cells.map((cellText) => {
            return new TableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              shading: isHeader
                ? { fill: '0F172A' }
                : rowIndex % 2 === 1
                  ? { fill: 'F8FAFC' }
                  : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText.trim(),
                      bold: isHeader,
                      color: isHeader ? 'FFFFFF' : '0F172A',
                      font: 'Calibri',
                      size: 20,
                    }),
                  ],
                }),
              ],
            });
          }),
        });
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          },
        })
      );
      docChildren.push(new Paragraph({ spacing: { after: 200 } }));
    }

    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Code block boundaries
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Closing code block
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBuffer.join('\n'),
                font: 'Consolas',
                size: 19,
                color: '334155',
              }),
            ],
            shading: { fill: 'F1F5F9' },
            spacing: { before: 120, after: 180 },
          })
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Markdown tables
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableBuffer.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Empty lines
    if (!line) {
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      docChildren.push(
        new Paragraph({
          text: line.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (line.startsWith('## ')) {
      docChildren.push(
        new Paragraph({
          text: line.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (line.startsWith('### ')) {
      docChildren.push(
        new Paragraph({
          text: line.replace(/^###\s+/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 180, after: 80 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet list items
      const bulletContent = line.replace(/^[-*]\s+/, '');
      docChildren.push(
        new Paragraph({
          children: parseInlineFormatting(bulletContent),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else {
      // Standard paragraph
      docChildren.push(
        new Paragraph({
          children: parseInlineFormatting(line),
          spacing: { after: 140 },
        })
      );
    }
  }

  flushTable();

  return new Document({
    title,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (1440 dxa)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });
}

/**
 * Main execution function compiling all markdown sources to docx.
 */
async function buildDocs() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.md'));
  console.info(`Found ${files.length} markdown documentation files in ${SRC_DIR}`);

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const baseName = path.basename(file, '.md');
    const docxName = `${baseName}.docx`;
    const outputPath = path.join(OUTPUT_DIR, docxName);

    const doc = markdownToDocx(content, baseName);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    console.info(`✓ Generated: docs/docx/${docxName}`);
  }

  console.info(`\nSuccessfully built all ${files.length} Word documentation files.`);
}

buildDocs().catch((err) => {
  console.error('Error generating documentation:', err);
  process.exit(1);
});
