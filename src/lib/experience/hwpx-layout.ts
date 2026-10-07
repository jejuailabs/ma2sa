import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { ApiError } from './ai/errors';

type Attributes = Record<string, string>;
type Node = { [key: string]: Node[] | Attributes | string };
const options = { preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false, parseAttributeValue: false, trimValues: false };
const children = (node: Node, tag: string) => (node[tag] as Node[] | undefined) || [];
const attrs = (node: Node) => node[':@'] as Attributes;
const find = (nodes: Node[], tag: string): Node | undefined => nodes.find(n => tag in n);
const descendants = (nodes: Node[], tag: string): Node[] => nodes.flatMap(node => Object.entries(node).flatMap(([key, value]) => Array.isArray(value) ? [...(key === tag ? [node] : []), ...descendants(value, tag)] : []));
const content = (nodes: Node[]): string => nodes.map(node => typeof node['#text'] === 'string' ? node['#text'] : Object.entries(node).filter(([key]) => key !== ':@').map(([, value]) => Array.isArray(value) ? content(value) : '').join('')).join('');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const cellParts = (cell: Node) => children(cell, 'hp:tc');
const rowsOf = (table: Node) => children(table, 'hp:tbl').filter(n => 'hp:tr' in n);
const cellsOf = (row: Node) => children(row, 'hp:tr').filter(n => 'hp:tc' in n);

// Leave room for the anchor paragraph and differences between Hancom versions.
const PAGE_HEIGHT = 68000;
const MAX_ROW_HEIGHT = 40000;

/** Fill a clean form, measure its cells and paginate complete row groups.
 * Explicit page tables avoid relying on a viewer to grow stale template rows.
 * A long narrative is continued without truncating it or shrinking its font.
 */
export function prepareHwpxLayout(xml: string, fields: Record<string, string>, scheduleCount: number, budgetCount: number, headerXml: string, mergeProject = false) {
  const parser = new XMLParser(options);
  const document = parser.parse(xml) as Node[];
  const header = parser.parse(headerXml) as Node[];
  const charStyles = new Map(descendants(header, 'hh:charPr').map(n => [attrs(n).id, n]));
  const paraStyles = new Map(descendants(header, 'hh:paraPr').map(n => [attrs(n).id, n]));
  const resolve = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key] || '');
  let identity = 1800000000;

  function setParagraphText(p: Node, value: string) {
    const run = find(children(p, 'hp:p'), 'hp:run');
    p['hp:p'] = [{ 'hp:run': [{ 'hp:t': [{ '#text': value }] }], ':@': clone(run ? attrs(run) : { charPrIDRef: '100' }) }];
  }

  function fill(nodes: Node[]): Node[] {
    return nodes.flatMap(node => {
      if ('hp:tbl' in node) {
        node['hp:tbl'] = children(node, 'hp:tbl').filter(item => {
          if (!('hp:tr' in item)) return true;
          const value = content(children(item, 'hp:tr'));
          const optional = value.trim().match(/^\{\{(effects|effectsHeading|summaryDetail|summaryDetailHeading|budgetNarrative|budgetNarrativeHeading)\}\}$/);
          if (optional && !fields[optional[1]]) return !mergeProject;
          const slot = value.match(/\{\{(schedule|budget)(\d+)(?:Name|Category|When|Content|Amount|Basis)\}\}/);
          return !slot || Number(slot[2]) < (slot[1] === 'schedule' ? scheduleCount : budgetCount);
        });
      }
      if ('hp:p' in node && !descendants(children(node, 'hp:p'), 'hp:tbl').length && /^\{\{\w+\}\}$/.test(content(children(node, 'hp:p')))) {
        return resolve(content(children(node, 'hp:p'))).split(/\r?\n/).map(line => {
          const p = clone(node); setParagraphText(p, line); return p;
        });
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === '#text') node[key] = resolve(value as string);
        else if (Array.isArray(value)) node[key] = fill(value);
      }
      return [node];
    });
  }

  function paragraphMetrics(p: Node, width: number) {
    const runs = children(p, 'hp:p').filter(n => 'hp:run' in n);
    const fontSize = Math.max(1000, ...runs.map(run => Number(attrs(charStyles.get(attrs(run).charPrIDRef) || { ':@': {} }).height) || 1000));
    const style = paraStyles.get(attrs(p).paraPrIDRef);
    const spacing = style && find(children(style, 'hh:paraPr'), 'hh:lineSpacing');
    const lineHeight = Math.ceil(fontSize * Math.max(1.3, Number(spacing && attrs(spacing).value) / 100 || 1.6));
    // Conservative width allows for Korean word wrapping and font substitution.
    const capacity = Math.max(1, width * 0.88 / fontSize);
    const units = (value: string) => Array.from(value).reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? 0.55 : 1), 0);
    const value = content(children(p, 'hp:p'));
    let lines = 1, used = 0;
    for (const token of value.match(/\S+\s*|\s+/g) || []) {
      const size = units(token);
      if (used && used + size > capacity) { lines++; used = 0; }
      const full = Math.max(0, Math.ceil(size / capacity) - 1);
      lines += full; used += size - full * capacity;
    }
    return { height: Math.max(1, lines) * lineHeight, lineHeight, capacity, units };
  }

  function cellMetrics(cell: Node) {
    const parts = cellParts(cell);
    const size = find(parts, 'hp:cellSz')!;
    const margin = find(parts, 'hp:cellMargin');
    const padding = margin ? attrs(margin) : {};
    const width = Number(attrs(size).width) - Number(padding.left || 510) - Number(padding.right || 510);
    const sub = find(parts, 'hp:subList');
    const paragraphs = sub ? children(sub, 'hp:subList').filter(n => 'hp:p' in n) : [];
    let height = Number(padding.top || 141) + Number(padding.bottom || 141) + 400;
    for (const p of paragraphs) {
      const nested = descendants(children(p, 'hp:p'), 'hp:tbl');
      height += nested.length ? nested.reduce((sum, t) => sum + Number(attrs(find(children(t, 'hp:tbl'), 'hp:sz')!).height) + 1000, 0) : paragraphMetrics(p, width).height;
    }
    return { height: Math.ceil(height), width, paragraphs, sub };
  }

  function measureTable(table: Node, measureProjectText = false) {
    const rows = rowsOf(table);
    const projectGrid = mergeProject && /추진계획|비목별 예산계획/.test(content(children(rows[0], 'hp:tr')));
    const heights = rows.map(() => 2400);
    const spanning: { cell: Node; start: number; span: number; height: number }[] = [];
    rows.forEach((row, index) => cellsOf(row).forEach(cell => {
      const parts = cellParts(cell);
      attrs(find(parts, 'hp:cellAddr')!).rowAddr = String(index);
      const span = Number(attrs(find(parts, 'hp:cellSpan')!).rowSpan);
      const projectCell = projectGrid && attrs(find(parts, 'hp:cellAddr')!).colAddr === '0' && attrs(find(parts, 'hp:cellSpan')!).colSpan === '1' && content(parts) === fields.title;
      const height = Math.max(projectCell && span === 1 && !measureProjectText ? 0 : cellMetrics(cell).height, Number(attrs(find(parts, 'hp:cellSz')!).height), index === 0 ? 3200 : 2400);
      if (span === 1) heights[index] = Math.max(heights[index], height);
      else spanning.push({ cell, start: index, span, height });
    }));
    for (const { start, span, height } of spanning) {
      const available = heights.slice(start, start + span).reduce((a, b) => a + b, 0);
      if (height > available) heights[start + span - 1] += height - available;
    }
    rows.forEach((row, index) => cellsOf(row).forEach(cell => {
      const parts = cellParts(cell), span = Number(attrs(find(parts, 'hp:cellSpan')!).rowSpan);
      attrs(find(parts, 'hp:cellSz')!).height = String(heights.slice(index, index + span).reduce((a, b) => a + b, 0));
    }));
    attrs(table).rowCnt = String(rows.length);
    attrs(table).pageBreak = 'CELL';
    attrs(table).noAdjust = '0';
    attrs(find(children(table, 'hp:tbl'), 'hp:sz')!).height = String(heights.reduce((a, b) => a + b, 0));
    return heights;
  }

  // Split only exceptionally long, unmerged rows. Normal paragraphs and grid
  // rows stay together. Each fragment retains all of its original text.
  function splitTallRow(row: Node): Node[] {
    const cells = cellsOf(row);
    if (cells.some(cell => Number(attrs(find(cellParts(cell), 'hp:cellSpan')!).rowSpan) !== 1)) return [row];
    if (Math.max(...cells.map(cell => cellMetrics(cell).height)) <= MAX_ROW_HEIGHT) return [row];
    const chunks = cells.map(cell => {
      const { width, paragraphs } = cellMetrics(cell);
      const pages: Node[][] = [[]]; let height = 1000;
      for (const p of paragraphs) {
        const metrics = paragraphMetrics(p, width);
        const value = content(children(p, 'hp:p'));
        const limit = Math.max(10, metrics.capacity * Math.floor((MAX_ROW_HEIGHT - 3000) / metrics.lineHeight) * 0.8);
        let fragment = '', length = 0;
        const pieces: string[] = [];
        for (const char of Array.from(value)) {
          if (length + metrics.units(char) > limit) { pieces.push(fragment); fragment = ''; length = 0; }
          fragment += char; length += metrics.units(char);
        }
        pieces.push(fragment);
        for (const piece of pieces) {
          const part = clone(p); setParagraphText(part, piece);
          const measured = paragraphMetrics(part, width).height;
          if (height + measured > MAX_ROW_HEIGHT && pages[pages.length - 1].length) { pages.push([]); height = 1000; }
          pages[pages.length - 1].push(part); height += measured;
        }
      }
      return pages;
    });
    return Array.from({ length: Math.max(...chunks.map(parts => parts.length)) }, (_, index) => {
      const part = clone(row);
      cellsOf(part).forEach((cell, column) => {
        attrs(find(cellParts(cell), 'hp:cellSz')!).height = '2400';
        const sub = find(cellParts(cell), 'hp:subList')!;
        const empty = clone(cellMetrics(cell).paragraphs[0]); setParagraphText(empty, '');
        sub['hp:subList'] = chunks[column][index] || [empty];
      });
      return part;
    });
  }

  function paginate(table: Node): Node[] {
    const originalRows = rowsOf(table);
    const title = content(children(originalRows[0], 'hp:tr'));
    const headerCount = 1;
    const gridHeader = originalRows.find((row, index) => index > 0 && cellsOf(row).length > 1 && cellsOf(row).every(cell => attrs(cell).header === '1'));
    const expanded = originalRows.flatMap((row, index) => index < headerCount ? [row] : splitTallRow(row));
    table['hp:tbl'] = [...children(table, 'hp:tbl').filter(n => !('hp:tr' in n)), ...expanded];
    const heights = measureTable(table);
    const headerHeight = heights.slice(0, headerCount).reduce((a, b) => a + b, 0);
    const groups: Node[][] = [];
    for (let index = headerCount; index < expanded.length;) {
      let end = index + 1;
      const firstText = content(children(expanded[index], 'hp:tr')).trim();
      // Keep section headings with the first following content row.
      if ((cellsOf(expanded[index]).length === 1 && attrs(cellsOf(expanded[index])[0]).header === '1') || expanded[index] === gridHeader) end++;
      if (firstText.includes('개인정보 수집')) end = expanded.length;
      end = Math.min(end, expanded.length);
      for (let i = index; i < end; i++) for (const cell of cellsOf(expanded[i])) end = Math.max(end, i + Number(attrs(find(cellParts(cell), 'hp:cellSpan')!).rowSpan));
      groups.push(expanded.slice(index, end)); index = end;
    }
    const pages: Node[][] = []; let page: Node[] = [], height = headerHeight;
    let passedGrid = false;
    for (const group of groups) {
      const groupHeight = group.reduce((sum, row) => sum + heights[expanded.indexOf(row)], 0);
      if (page.length && height + groupHeight > PAGE_HEIGHT) {
        pages.push(page); page = []; height = headerHeight;
        if (passedGrid && gridHeader && cellsOf(group[0]).length > 1) {
          page.push(gridHeader); height += heights[expanded.indexOf(gridHeader)];
        }
      }
      page.push(...group); height += groupHeight;
      if (group.includes(gridHeader!)) passedGrid = true;
    }
    if (page.length) pages.push(page);
    return pages.map((pageRows, index) => {
      const pageTable = clone(table);
      pageTable['hp:tbl'] = [...children(pageTable, 'hp:tbl').filter(n => !('hp:tr' in n)), ...clone(expanded.slice(0, headerCount)), ...clone(pageRows)];
      attrs(pageTable).id = String(identity++);
      if (index) {
        const titleCell = cellsOf(rowsOf(pageTable)[0])[0];
        const p = cellMetrics(titleCell).paragraphs[0];
        setParagraphText(p, `${content(children(p, 'hp:p')).trim()} (계속)`);
      }
      // Merge the reference's project-name column only within this page.
      // Pagination is calculated first so a long project never locks all rows.
      if (mergeProject && /추진계획|비목별 예산계획/.test(title)) {
        const pageRows = rowsOf(pageTable);
        const dataRows = pageRows.filter(row => {
          const cells = cellsOf(row), first = cells[0];
          return cells.length >= 3 && attrs(first).header !== '1' && Number(attrs(find(cellParts(first), 'hp:cellSpan')!).colSpan) === 1 && content(cellParts(first)) === fields.title;
        });
        if (dataRows.length > 1) {
          const first = cellsOf(dataRows[0])[0];
          attrs(find(cellParts(first), 'hp:cellSpan')!).rowSpan = String(dataRows.length);
          for (const row of dataRows.slice(1)) row['hp:tr'] = children(row, 'hp:tr').filter(cell => cell !== cellsOf(row)[0]);
        }
      }
      // Whole page tables are inline: honor the document margins, with no
      // floating anchors that depend on cached line positions from the sample.
      Object.assign(attrs(find(children(pageTable, 'hp:tbl'), 'hp:pos')!), { treatAsChar: '1', affectLSpacing: '1', vertRelTo: 'PARA', horzRelTo: 'COLUMN', vertOffset: '0', horzOffset: '0' });
      const pageHeight = measureTable(pageTable, true).reduce((sum, height) => sum + height, 0);
      if (pageHeight > PAGE_HEIGHT) throw new ApiError(422, 'DOCUMENT_FIELD_TOO_LONG', '모임 기본정보나 이전 지원 내역이 한 쪽보다 길어요. 해당 항목을 간결하게 정리한 뒤 다시 받아 주세요.');
      return pageTable;
    });
  }

  const filled = fill(document);
  // Measure nested funding history before its containing cell.
  const tables = descendants(filled, 'hp:tbl');
  for (const table of [...tables].reverse()) measureTable(table);
  const section = descendants(filled, 'hs:sec')[0];
  const body = children(section, 'hs:sec');
  section['hs:sec'] = body.flatMap(node => {
    if (!('hp:p' in node)) return [node];
    const table = descendants(children(node, 'hp:p'), 'hp:tbl')[0];
    if (!table) return [node];
    return paginate(table).map((pageTable, index) => {
      const p = clone(node);
      attrs(p).id = String(identity++);
      if (index) attrs(p).pageBreak = '1';
      const run = children(p, 'hp:p').find(r => 'hp:run' in r && children(r, 'hp:run').some(n => 'hp:tbl' in n))!;
      run['hp:run'] = children(run, 'hp:run').flatMap(item => 'hp:tbl' in item ? [pageTable] : index && ('hp:secPr' in item || 'hp:ctrl' in item) ? [] : [item]);
      return p;
    });
  });
  return new XMLBuilder({ ...options, suppressEmptyNode: true }).build(filled) as string;
}
