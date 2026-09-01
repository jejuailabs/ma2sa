import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = '';

    if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith('.pptx') || name.endsWith('.xlsx') || name.endsWith('.odt') || name.endsWith('.odp')) {
      const { parseOffice } = await import('officeparser');
      const parsed = await parseOffice(buffer);
      text = String(parsed ?? '');
    } else if (name.endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse(buffer);
      const pdfResult = await parser.getText();
      text = String(pdfResult);
      await parser.destroy();
    } else if (name.endsWith('.hwpx')) {
      text = await extractHwpxText(buffer);
    } else if (name.endsWith('.hwp')) {
      text = '';
    } else if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) {
      const unsupported = name.endsWith('.hwp')
        ? 'HWP(구버전 한글) 파일은 서버에서 직접 읽을 수 없습니다. 한글 프로그램에서 내용을 복사해서 붙여넣기 해주세요.'
        : '파일에서 텍스트를 추출할 수 없습니다. 내용을 복사해서 텍스트로 붙여넣기 해주세요.';
      return NextResponse.json({ text: '', unsupported });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error('extract-text error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '텍스트 추출에 실패했습니다.' },
      { status: 500 },
    );
  }
}

async function extractHwpxText(buffer: Buffer): Promise<string> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const { XMLParser } = await import('fast-xml-parser');
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const sectionFiles = entries
      .filter((e) => /Contents\/section\d+\.xml/i.test(e.entryName))
      .sort((a, b) => a.entryName.localeCompare(b.entryName));

    if (sectionFiles.length === 0) return '';

    const parser = new XMLParser({ ignoreAttributes: false });
    const allTexts: string[] = [];

    for (const entry of sectionFiles) {
      const xml = entry.getData().toString('utf-8');
      const parsed = parser.parse(xml);
      collectText(parsed, allTexts);
    }
    return allTexts.join('\n');
  } catch {
    return '';
  }
}

function collectText(obj: unknown, results: string[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === 'hp:t' || key === 'hp:T' || key === 'T' || key === 't') {
      const val = record[key];
      if (typeof val === 'string') results.push(val);
      else if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string') results.push(v);
          else if (v && typeof v === 'object' && '#text' in v) results.push(String(v['#text']));
        }
      } else if (val && typeof val === 'object' && '#text' in (val as Record<string, unknown>)) {
        results.push(String((val as Record<string, unknown>)['#text']));
      }
    } else {
      collectText(record[key], results);
    }
  }
}
