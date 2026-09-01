import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';

export type TemplateFormat = 'hwpx' | 'docx' | 'xlsx';

export type TemplateField = {
  id: string;
  label: string;
  hint: string;
};

type FormatConfig = {
  format: TemplateFormat;
  tableTag: string;
  rowTag: string;
  cellTag: string;
  textTag: string;
};

const CONFIG: Record<TemplateFormat, FormatConfig> = {
  hwpx: { format: 'hwpx', tableTag: 'hp:tbl', rowTag: 'hp:tr', cellTag: 'hp:tc', textTag: 'hp:t' },
  docx: { format: 'docx', tableTag: 'w:tbl', rowTag: 'w:tr', cellTag: 'w:tc', textTag: 'w:t' },
  xlsx: { format: 'xlsx', tableTag: '', rowTag: '', cellTag: '', textTag: '' },
};

export function getTemplateFormat(filename: string): TemplateFormat | null {
  const name = filename.toLowerCase();
  if (name.endsWith('.hwpx')) return 'hwpx';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.xlsx')) return 'xlsx';
  return null;
}

export async function inspectTemplate(buffer: Buffer, filename: string) {
  const format = getTemplateFormat(filename);
  if (!format) throw new Error('HWPX, DOCX 또는 XLSX 양식 파일만 채울 수 있습니다.');
  if (format === 'xlsx') return inspectXlsxTemplate(buffer);

  const zip = new AdmZip(buffer);
  const config = CONFIG[format];
  const entries = getDocumentEntries(zip, format);
  const fields: TemplateField[] = [];
  const text: string[] = [];

  entries.forEach((entry, sectionIndex) => {
    const xml = entry.getData().toString('utf-8');
    text.push(extractText(xml, config.textTag));
    fields.push(...inspectXmlFields(xml, config, sectionIndex));
  });

  const unique = new Map<string, TemplateField>();
  fields.forEach((field) => {
    const key = `${field.id}:${field.label}`;
    if (!unique.has(key)) unique.set(key, field);
  });

  return { format, text: text.filter(Boolean).join('\n'), fields: Array.from(unique.values()).slice(0, 80) };
}

export async function fillTemplate(buffer: Buffer, filename: string, values: Record<string, string>) {
  const format = getTemplateFormat(filename);
  if (!format) throw new Error('HWPX, DOCX 또는 XLSX 양식 파일만 채울 수 있습니다.');
  if (format === 'xlsx') return fillXlsxTemplate(buffer, values, filename);

  const zip = new AdmZip(buffer);
  const config = CONFIG[format];
  const entries = getDocumentEntries(zip, format);
  const filled = new Set<string>();

  entries.forEach((entry, sectionIndex) => {
    let xml = entry.getData().toString('utf-8');
    xml = fillXmlFields(xml, config, sectionIndex, values, filled);
    xml = fillMarkers(xml, values, filled);
    zip.updateFile(entry.entryName, Buffer.from(xml, 'utf-8'));
  });

  return {
    buffer: zip.toBuffer(),
    format,
    filledFieldIds: Array.from(filled),
    filename: filename.replace(/\.(hwpx|docx)$/i, `_작성본.$1`),
    mimeType: format === 'hwpx' ? 'application/vnd.hancom.hwpx' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

async function inspectXlsxTemplate(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const fields: TemplateField[] = [];
  const text: string[] = [];
  workbook.eachSheet((sheet) => {
    text.push(`[${sheet.name}]`);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      // 마지막 항목명 바로 오른쪽이 비어 있는 입력 칸인 경우도 잡기 위해 한 칸 더 확인한다.
      const values = Array.from({ length: Math.max(row.cellCount + 1, sheet.columnCount) }, (_, index) => cellText(row.getCell(index + 1).value));
      values.forEach((label, index) => {
        const target = values[index + 1];
        if (!isLabel(label) || target === undefined || !isInputCell(target)) return;
        const targetColumn = index + 2;
        fields.push({ id: `xlsx:${encodeURIComponent(sheet.name)}:${row.number}:${targetColumn}`, label: normalizeLabel(label), hint: target ? `양식 안내: ${compact(target)}` : '빈 입력 셀' });
      });
      if (values.some(Boolean)) text.push(values.filter(Boolean).join(' | '));
    });
  });
  return { format: 'xlsx' as const, text: text.join('\n'), fields: fields.slice(0, 80) };
}

async function fillXlsxTemplate(buffer: Buffer, values: Record<string, string>, filename: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const filled = new Set<string>();
  Object.entries(values).forEach(([id, value]) => {
    const match = id.match(/^xlsx:([^:]+):(\d+):(\d+)$/);
    if (!match) return;
    const sheet = workbook.getWorksheet(decodeURIComponent(match[1]));
    if (!sheet) return;
    sheet.getCell(Number(match[2]), Number(match[3])).value = value || '';
    filled.add(id);
  });
  const output = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(output), format: 'xlsx' as const, filledFieldIds: Array.from(filled),
    filename: filename.replace(/\.xlsx$/i, '_작성본.xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

function getDocumentEntries(zip: AdmZip, format: TemplateFormat) {
  const entries = zip.getEntries();
  if (format === 'hwpx') {
    const sections = entries.filter((entry) => /Contents\/section\d+\.xml/i.test(entry.entryName)).sort((a, b) => a.entryName.localeCompare(b.entryName));
    if (!sections.length) throw new Error('HWPX 본문을 찾을 수 없습니다.');
    return sections;
  }
  const document = entries.find((entry) => entry.entryName === 'word/document.xml');
  if (!document) throw new Error('DOCX 본문을 찾을 수 없습니다.');
  return [document];
}

function inspectXmlFields(xml: string, config: FormatConfig, sectionIndex: number) {
  const fields: TemplateField[] = [];
  const tables = findElements(xml, config.tableTag);
  tables.forEach((table, tableIndex) => {
    findElements(table, config.rowTag).forEach((row, rowIndex) => {
      const cells = findElements(row, config.cellTag);
      const cellTexts = cells.map((cell) => extractText(cell, config.textTag));
      cellTexts.forEach((label, cellIndex) => {
        const target = cellTexts[cellIndex + 1];
        if (!isLabel(label) || target === undefined || !isInputCell(target)) return;
        fields.push({
          id: `s${sectionIndex}-t${tableIndex}-r${rowIndex}-c${cellIndex + 1}`,
          label: normalizeLabel(label),
          hint: target ? `양식 안내: ${compact(target)}` : '빈 입력 칸',
        });
      });
    });
  });

  const markers = Array.from(xml.matchAll(/\{\{\s*([^{}\n]{1,80})\s*\}\}/g));
  markers.forEach((marker) => fields.push({ id: `marker:${marker[1].trim()}`, label: marker[1].trim(), hint: '자리표시자' }));
  return fields;
}

function fillXmlFields(xml: string, config: FormatConfig, sectionIndex: number, values: Record<string, string>, filled: Set<string>) {
  let tableIndex = 0;
  const tablePattern = elementPattern(config.tableTag);
  return xml.replace(tablePattern, (table) => {
    const currentTable = tableIndex++;
    let rowIndex = 0;
    return table.replace(elementPattern(config.rowTag), (row) => {
      const currentRow = rowIndex++;
      const rowCells = findElements(row, config.cellTag);
      let cellIndex = 0;
      return row.replace(elementPattern(config.cellTag), (cell) => {
        const currentCell = cellIndex++;
        const id = `s${sectionIndex}-t${currentTable}-r${currentRow}-c${currentCell}`;
        if (!(id in values)) return cell;
        // HWPX 양식에는 입력 예시가 빨간 글씨로 작성된 경우가 많다.
        // 항목명 셀의 글자 모양을 가져와 결과값에는 일반 항목 글자 모양을 적용한다.
        const sourceStyle = config.format === 'hwpx' ? getHwpRunStyle(rowCells[currentCell - 1]) : undefined;
        const updated = replaceCellText(cell, config.textTag, values[id] || '', config.format, sourceStyle);
        if (updated !== cell) filled.add(id);
        return updated;
      });
    });
  });
}

function fillMarkers(xml: string, values: Record<string, string>, filled: Set<string>) {
  return xml.replace(/\{\{\s*([^{}\n]{1,80})\s*\}\}/g, (marker, label) => {
    const id = `marker:${String(label).trim()}`;
    if (!(id in values)) return marker;
    filled.add(id);
    return escapeXml(values[id] || '');
  });
}

function replaceCellText(cell: string, textTag: string, value: string, format: TemplateFormat, sourceStyle?: string) {
  const pattern = new RegExp(`(<${escapeRegExp(textTag)}\\b[^>]*>)([\\s\\S]*?)(</${escapeRegExp(textTag)}>)`, 'g');
  let replaced = false;
  const escaped = escapeXml(value).replace(/\r?\n/g, ' ');
  let updated = cell.replace(pattern, (_match, open, _old, close) => {
    if (replaced) return `${open}${close}`;
    replaced = true;
    return `${open}${escaped}${close}`;
  });
  if (format === 'hwpx' && sourceStyle && replaced) updated = applyHwpRunStyle(updated, sourceStyle);
  return updated;
}

function getHwpRunStyle(cell: string | undefined) {
  if (!cell) return undefined;
  return cell.match(/<hp:run\\b[^>]*\\bcharPrIDRef="([^"]+)"/i)?.[1];
}

function applyHwpRunStyle(cell: string, charPrIDRef: string) {
  let applied = false;
  return cell.replace(/<hp:run\\b([^>]*)>/gi, (run, attributes) => {
    if (applied) return run;
    applied = true;
    if (/\\bcharPrIDRef="[^"]*"/i.test(attributes)) {
      return `<hp:run${attributes.replace(/\\bcharPrIDRef="[^"]*"/i, `charPrIDRef="${charPrIDRef}"`)}>`;
    }
    return `<hp:run charPrIDRef="${charPrIDRef}"${attributes}>`;
  });
}

function findElements(xml: string, tag: string) {
  return Array.from(xml.matchAll(elementPattern(tag))).map((match) => match[0]);
}

function elementPattern(tag: string) {
  return new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>[\\s\\S]*?</${escapeRegExp(tag)}>`, 'g');
}

function extractText(xml: string, textTag: string) {
  const pattern = new RegExp(`<${escapeRegExp(textTag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegExp(textTag)}>`, 'g');
  return Array.from(xml.matchAll(pattern)).map((match) => decodeXml(stripTags(match[1]))).join('').replace(/\s+/g, ' ').trim();
}

function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleDateString('ko-KR');
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('text' in value && typeof value.text === 'string') return value.text;
  if ('result' in value && value.result !== undefined) return String(value.result);
  return '';
}

function isLabel(value: string) {
  const normalized = normalizeLabel(value);
  return Boolean(normalized) && normalized.length <= 40 && !/^(※|\*|\[|\(|작성|예시|공고|신청)/.test(normalized);
}

function isInputCell(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return !normalized || /※|작성|기입|입력|예시|OOO|○○○|□|빈칸|내용/.test(normalized);
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, ' ').replace(/[※*•]/g, '').trim();
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').slice(0, 90);
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '');
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
