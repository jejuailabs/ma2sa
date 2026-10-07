import 'server-only';
import template from './community-template.json';
import { prepareHwpxLayout } from './hwpx-layout';
import { planSectionLabels,type PlanBasics,type PlanResult } from './catalog';
import { planDocumentContent } from './plan-document';

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data:Buffer){let crc=0xffffffff;for(let index=0;index<data.length;index++)crc=crcTable[(crc^data[index])&0xff]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function zip(entries:{name:string;data:Buffer}[]){const locals:Buffer[]=[];const centrals:Buffer[]=[];let offset=0;for(const entry of entries){const name=Buffer.from(entry.name,'utf8');const crc=crc32(entry.data);const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc,14);header.writeUInt32LE(entry.data.length,18);header.writeUInt32LE(entry.data.length,22);header.writeUInt16LE(name.length,26);locals.push(header,name,entry.data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt32LE(crc,16);central.writeUInt32LE(entry.data.length,20);central.writeUInt32LE(entry.data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);centrals.push(central,name);offset+=header.length+name.length+entry.data.length;}const directory=Buffer.concat(centrals);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,directory,end]);}
export function buildCommunityHwpx(basics: PlanBasics, result: PlanResult) {
  const { fields, scheduleCount, budgetCount, sections: s } = planDocumentContent(basics, result);
  const missing = '';
  const preview = `${fields.title}\n모임명: ${fields.group}\n${Object.entries(planSectionLabels).map(([key, label]) => `${label}\n${s[key] || missing}`).join('\n\n')}\n초안 — 제출 전 확인 필요`;
  const headerXml = Buffer.from(template.entries.find(entry => entry.name === 'Contents/header.xml')!.data, 'base64').toString('utf8');
  // A source-form thumbnail would show stale guide/example content in Explorer.
  const entries = template.entries.filter(entry => entry.name !== 'Preview/PrvImage.png').map(entry => {
    let data = Buffer.from(entry.data, 'base64');
    if (entry.name === 'Contents/section0.xml') {
      const xml = prepareHwpxLayout(data.toString('utf8'), fields, scheduleCount, budgetCount, headerXml);
      data = Buffer.from(xml, 'utf8');
    } else if (entry.name === 'Preview/PrvText.txt') data = Buffer.from(preview, 'utf8');
    return { name: entry.name, data };
  });
  return zip(entries);
}
