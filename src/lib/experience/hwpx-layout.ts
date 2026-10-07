import { XMLBuilder, XMLParser } from 'fast-xml-parser';

type Attributes = Record<string, string>;
type Node = { [key: string]: Node[] | Attributes | string };
const options = { preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false, parseAttributeValue: false, trimValues: false };
const children = (node: Node, tag: string) => node[tag] as Node[] | undefined;
const attrs = (node: Node) => node[':@'] as Attributes;
const content = (nodes: Node[]): string => nodes.map(node => typeof node['#text'] === 'string' ? node['#text'] : Object.entries(node).filter(([key]) => key !== ':@' && key !== '#text').map(([, value]) => Array.isArray(value) ? content(value) : '').join('')).join('');

/** Remove unused template rows and allow exceptionally tall cells to continue.
 * Ordinary rows use CELL boundaries; a cell taller than a page needs TABLE
 * (line-level division), otherwise Hancom can clip its remaining paragraphs.
 */
export function prepareHwpxLayout(xml: string, fields: Record<string, string>, scheduleCount: number, budgetCount: number) {
  const document = new XMLParser(options).parse(xml) as Node[];
  const resolve = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key] || '');
  function visit(nodes: Node[]) {
    for (const node of nodes) {
      for (const [key, value] of Object.entries(node)) if (key !== ':@' && Array.isArray(value)) visit(value);
      const table = children(node, 'hp:tbl');
      if (!table) continue;
      const activeRows = table.filter(item => {
        const row = children(item, 'hp:tr');
        if (!row) return true;
        const slot = content(row).match(/\{\{(schedule|budget)(\d+)(?:Name|Category|When|Content|Amount|Basis)\}\}/);
        return !slot || Number(slot[2]) < (slot[1] === 'schedule' ? scheduleCount : budgetCount);
      });
      node['hp:tbl'] = activeRows;
      const rows = activeRows.filter(item => children(item, 'hp:tr'));
      attrs(node).rowCnt = String(rows.length);
      let tallCell = false;
      let minimumHeight = 0;
      rows.forEach((row, index) => {
        let rowHeight = 0;
        for (const cell of children(row, 'hp:tr') || []) {
          const parts = children(cell, 'hp:tc');
          if (!parts) continue;
          const address = parts.find(part => children(part, 'hp:cellAddr'));
          if (address) attrs(address).rowAddr = String(index);
          const size = parts.find(part => children(part, 'hp:cellSz'));
          const span = parts.find(part => children(part, 'hp:cellSpan'));
          rowHeight = Math.max(rowHeight, Math.ceil(Number(size && attrs(size).height) / (Number(span && attrs(span).rowSpan) || 1)));
          const width = Number(size && attrs(size).width) || 10000;
          const lineWidth = Math.max(2, (width - 1000) / 1000);
          const lines = resolve(content(parts)).split(/\r?\n/).reduce((count, line) => {
            const units = Array.from(line).reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? 0.55 : 1), 0);
            return count + Math.max(1, Math.ceil(units / lineWidth));
          }, 0);
          // The A4 template has about 72,000 HWP units of printable height.
          // Reserve space for repeating titles and cell padding.
          if (lines * 1600 > 58000) tallCell = true;
        }
        minimumHeight += rowHeight;
      });
      const tableSize = activeRows.find(part => children(part, 'hp:sz'));
      if (tableSize) attrs(tableSize).height = String(minimumHeight);
      attrs(node).pageBreak = tallCell ? 'TABLE' : 'CELL';
    }
  }
  visit(document);
  return new XMLBuilder(options).build(document) as string;
}
