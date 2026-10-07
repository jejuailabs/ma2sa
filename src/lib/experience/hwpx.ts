import 'server-only';
import template from './community-template.json';
import { prepareHwpxLayout } from './hwpx-layout';
import { budgetSummary,planSectionLabels,type PlanBasics,type PlanResult } from './catalog';

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data:Buffer){let crc=0xffffffff;for(let index=0;index<data.length;index++)crc=crcTable[(crc^data[index])&0xff]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function zip(entries:{name:string;data:Buffer}[]){const locals:Buffer[]=[];const centrals:Buffer[]=[];let offset=0;for(const entry of entries){const name=Buffer.from(entry.name,'utf8');const crc=crc32(entry.data);const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc,14);header.writeUInt32LE(entry.data.length,18);header.writeUInt32LE(entry.data.length,22);header.writeUInt16LE(name.length,26);locals.push(header,name,entry.data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt32LE(crc,16);central.writeUInt32LE(entry.data.length,20);central.writeUInt32LE(entry.data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);centrals.push(central,name);offset+=header.length+name.length+entry.data.length;}const directory=Buffer.concat(centrals);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,directory,end]);}
const escapeXml=(value:string)=>value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export function buildCommunityHwpx(basics: PlanBasics, result: PlanResult) {
  const budget = budgetSummary(basics);
  const s = result.sections;
  const missing = '[입력 필요]';
  const activity = result.supportArea === 'activity';
  const year = activity ? result.year || '[확인]' : '2026';
  const thousand = (value: number | null) => value === null ? `${missing} 천원` : `${(value / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 3 })} 천원`;
  const scheduleRows = result.scheduleRows?.length ? result.scheduleRows : [{ name: result.title, when: s.schedule || missing, content: s.activities || missing }];
  const budgetRows = result.budgetRows || [];
  const budgetTotal = budgetRows.length && budgetRows.every(row => row.amount !== null) ? budgetRows.reduce((sum, row) => sum + (row.amount || 0), 0) : null;
  const fields: Record<string, string> = {
    supportArea: activity ? '공동체 활동 (샘플)' : '공간조성',
    activityField: result.activityField || '[확인: 주 활동분야 1개]',
    addressLabel: activity ? '모임소재지 주소' : '공간조성지 주소',
    group: basics.group || missing, representative: basics.representative || missing,
    address: basics.address || missing, phone: basics.phone || missing, title: result.title,
    totalThousand: activity ? `${thousand(budget.grant)} (보조금, 자체 경비 별도)` : thousand(budget.total),
    grantThousand: thousand(budget.grant), contributionThousand: thousand(budget.contribution),
    ratioNote: activity ? '공동체 활동 샘플 · 자체 경비는 별도 확인' : `보조금 대비 자부담: ${budget.ratio === null ? missing : budget.ratio + '%'} (첨부 양식: 5% 이상 필수)`,
    summary: result.summary || [s.purpose, s.target, s.activities, s.effects].filter(Boolean).join('\n\n'),
    scheduleNote: `${s.schedule || missing}\n${activity ? '샘플 기간이며 실제 공고에서 확인' : '※ 첨부 공간조성 양식: 2026년 10월 말까지 완료 조건 확인'}`,
    purposeWithTarget: `${s.purpose || missing}\n\n사업 대상: ${s.target || missing}`,
    participation: s.participation || missing,
    scheduleHeading: activity ? '사업내용(활동·장소·참여자)' : '사업내용(공사내용 및 공사 후 프로그램 활동 운영계획 등)',
    groupIntro: s.groupIntro || missing, founded: result.founded || missing,
    members: result.members || missing, history: result.history || '[입력 필요: 실제 주요 활동 이력을 5줄 이내로 기재]',
    budgetTotal: budgetTotal === null ? missing : (budgetTotal / 1000).toLocaleString('ko-KR', {maximumFractionDigits: 3}),
    budgetNote: [s.budget, budgetTotal !== null && budget.grant !== null && budgetTotal !== budget.grant ? '[확인: 예산표 합계와 보조금 총액이 다름]' : '단가 × 인원(수량) × 횟수 · 단위: 천원'].filter(Boolean).join('\n'),
    applicationFooter: activity
      ? `공동체 활동 참고 샘플 — 제공된 한글 양식과 새터 반찬 두레 예시를 바탕으로 작성한 초안입니다.\n${year}년   월   일\n대표제안자:                  (서명/날인)\n구성원 서명과 개인정보 동의는 본인이 별도로 작성합니다.`
      : '작성한 내용은 사실과 다름없으며, 가평군 마을공동체 주민제안 공모사업(공간조성)을 신청합니다.\n2026년   월   일\n대표제안자:                  (서명/날인)\n첨부서류: 사업계획서(견적서 포함), 모임 소개서, 모임구성원 서명부, 공간소개서(공간확보 증명 포함), 온라인 강의 수료증\n가평군수 귀하',
    missing,
  };
  for (let index = 0; index < 8; index++) {
    const row = scheduleRows[index];
    fields[`schedule${index}Name`] = row?.name || '';
    fields[`schedule${index}When`] = row?.when || '';
    fields[`schedule${index}Content`] = row?.content || '';
    const item = budgetRows[index];
    fields[`budget${index}Name`] = item?.name || (index === 0 && !budgetRows.length ? result.title : '');
    fields[`budget${index}Category`] = item?.category || '';
    fields[`budget${index}Amount`] = item ? item.amount === null ? '[확인]' : (item.amount / 1000).toLocaleString('ko-KR', {maximumFractionDigits: 3}) : '';
    fields[`budget${index}Basis`] = item?.basis || (index === 0 && !budgetRows.length ? s.budget || missing : '');
  }
  for (let row = 0; row < 2; row++) for (let column = 0; column < 5; column++) {
    fields[`funding${row}${column}`] = result.fundingHistory?.[row]?.[column] || (row === 0 && column === 0 && !result.fundingHistory?.length ? '[확인: 이전 지원 내역]' : '');
  }
  const preview = `${result.title}\n모임명: ${basics.group || missing}\n${Object.entries(planSectionLabels).map(([key, label]) => `${label}\n${s[key] || missing}`).join('\n\n')}\n초안 — 제출 전 확인 필요`;
  const entries = template.entries.map(entry => {
    let data = Buffer.from(entry.data, 'base64');
    if (entry.name === 'Contents/section0.xml') {
      let xml = prepareHwpxLayout(data.toString('utf8'), fields, Math.min(8, scheduleRows.length), Math.max(1, Math.min(8, budgetRows.length)));
      const field = (key: string) => Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : missing;
      xml = xml.replace(/<hp:p\b([^>]*)><hp:run\b([^>]*)><hp:t>\{\{([A-Za-z][A-Za-z0-9]*)\}\}<\/hp:t><\/hp:run><\/hp:p>/g, (_match, pAttrs, runAttrs, key) => {
        const lines = field(key).split(/\r?\n/);
        return lines.map(line => `<hp:p${pAttrs}><hp:run${runAttrs}><hp:t>${escapeXml(line)}</hp:t></hp:run></hp:p>`).join('');
      });
      xml = xml.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_match, key) => escapeXml(field(key)));
      data = Buffer.from(xml, 'utf8');
    } else if (entry.name === 'Preview/PrvText.txt') data = Buffer.from(preview, 'utf8');
    return { name: entry.name, data };
  });
  return zip(entries);
}
