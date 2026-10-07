"""Build an independent, blank happiness-office planning form.

Only typography/table primitives come from the value-free community template.
The contents follow the public service description, not a community grant form.
Run after import-plan-reference.py. No office's example facts are embedded.
"""
import base64
import json
from pathlib import Path
from xml.dom import minidom

root = Path(__file__).resolve().parents[1] / 'src/lib/experience'
source = json.loads((root / 'community-template.json').read_text(encoding='utf-8'))
entries = {entry['name']: base64.b64decode(entry['data']) for entry in source['entries']}
doc = minidom.parseString(entries['Contents/section0.xml'])
head = minidom.parseString(entries['Contents/header.xml'])

def direct(node, tag):
    return [child for child in node.childNodes if child.nodeType == child.ELEMENT_NODE and child.tagName == tag]

tables = list(doc.getElementsByTagName('hp:tbl'))
base_table = tables[0].cloneNode(True)
title_cell = direct(direct(base_table, 'hp:tr')[0], 'hp:tc')[0]
label_cell = direct(direct(base_table, 'hp:tr')[1], 'hp:tc')[0]
body_cell = direct(direct(base_table, 'hp:tr')[1], 'hp:tc')[1]
char_list = head.getElementsByTagName('hh:charProperties')[0]
para_list = head.getElementsByTagName('hh:paraProperties')[0]
chars = {n.getAttribute('id'): n for n in direct(char_list, 'hh:charPr')}
paras = {n.getAttribute('id'): n for n in direct(para_list, 'hh:paraPr')}
styles = {}
for kind, proto, size, align in [('title', title_cell, 1800, 'CENTER'), ('label', label_cell, 1100, 'CENTER'), ('body', body_cell, 1100, 'LEFT')]:
    p = proto.getElementsByTagName('hp:p')[0]
    ch = chars[direct(p, 'hp:run')[0].getAttribute('charPrIDRef')].cloneNode(True)
    ch_id = str(len(direct(char_list, 'hh:charPr')))
    ch.setAttribute('id', ch_id); ch.setAttribute('textColor', '#000000'); ch.setAttribute('height', str(size)); char_list.appendChild(ch)
    pa = paras[p.getAttribute('paraPrIDRef')].cloneNode(True)
    pa_id = str(len(direct(para_list, 'hh:paraPr')))
    pa.setAttribute('id', pa_id); pa.setAttribute('snapToGrid', '0')
    pa.getElementsByTagName('hh:align')[0].setAttribute('horizontal', align)
    pa.getElementsByTagName('hh:lineSpacing')[0].setAttribute('type', 'PERCENT')
    pa.getElementsByTagName('hh:lineSpacing')[0].setAttribute('value', '150')
    for node in pa.getElementsByTagName('hc:intent'): node.setAttribute('value', '0')
    for attr in ['keepWithNext', 'keepLines', 'pageBreakBefore']: pa.getElementsByTagName('hh:breakSetting')[0].setAttribute(attr, '0')
    para_list.appendChild(pa); styles[kind] = (ch_id, pa_id)

def cell(value, col, span, width, height, kind='body', header=False):
    node = {'body':body_cell, 'label':label_cell, 'title':title_cell}[kind].cloneNode(True)
    node.setAttribute('header', '1' if header else '0')
    addr = direct(node, 'hp:cellAddr')[0]; addr.setAttribute('rowAddr', '0'); addr.setAttribute('colAddr', str(col))
    sp = direct(node, 'hp:cellSpan')[0]; sp.setAttribute('colSpan', str(span)); sp.setAttribute('rowSpan', '1')
    sz = direct(node, 'hp:cellSz')[0]; sz.setAttribute('width', str(width)); sz.setAttribute('height', str(height))
    margin = direct(node, 'hp:cellMargin')[0]
    for k,v in {'left':'700','right':'700','top':'500','bottom':'500'}.items(): margin.setAttribute(k,v)
    sub = direct(node, 'hp:subList')[0]; sub.setAttribute('vertAlign', 'TOP' if kind == 'body' else 'CENTER')
    proto = direct(sub, 'hp:p')[0].cloneNode(False)
    for child in list(sub.childNodes): sub.removeChild(child)
    for line in value.split('\n'):
        p=proto.cloneNode(False);p.setAttribute('paraPrIDRef',styles[kind][1]);p.setAttribute('pageBreak','0')
        run=doc.createElement('hp:run');run.setAttribute('charPrIDRef',styles[kind][0])
        t=doc.createElement('hp:t');t.appendChild(doc.createTextNode(line));run.appendChild(t);p.appendChild(run);sub.appendChild(p)
    return node

def full(value, height=3000, kind='body', header=False): return [(value,4,height,kind,header)]
def pair(label, value): return [(label,1,3600,'label',False),(value,3,3600,'body',False)]
def section(label, value, height=8000): return [full(label,3000,'label',True),full(value,height)]
def table(row_specs, widths):
    tab=base_table.cloneNode(True);tab.setAttribute('colCnt',str(len(widths)));tab.setAttribute('rowCnt',str(len(row_specs)))
    for row in direct(tab,'hp:tr'):tab.removeChild(row)
    for r,spec in enumerate(row_specs):
        row=doc.createElement('hp:tr');col=0
        for value,span,height,kind,header in spec:
            node=cell(value,col,span,sum(widths[col:col+span]),height,kind,header)
            direct(node,'hp:cellAddr')[0].setAttribute('rowAddr',str(r));row.appendChild(node);col+=span
        assert col==len(widths)
        tab.appendChild(row)
    direct(tab,'hp:sz')[0].setAttribute('width',str(sum(widths)))
    return tab

overview = [full('행복마을관리소 사업계획서',4200,'title'),
    pair('사 업 명','{{title}}'),
    [('관리소명',1,3600,'label',False),('{{group}}',1,3600,'body',False),('담 당 자',1,3600,'label',False),('{{representative}}',1,3600,'body',False)],
    pair('소 재 지','{{address}}'),pair('연 락 처','{{phone}}'),pair('사업기간','{{period}}'),pair('사업분야','{{activityField}}'),
    *section('사업 개요','{{summary}}',6500),*section('사업의 목적 및 필요성','{{purpose}}',8000),*section('서비스 대상 및 지역','{{target}}',6500)]
execution = [full('2. 세부 추진계획',4200,'title'),
    *section('생활서비스 및 지역 특색사업','{{activitiesDetail}}',8500),
    *section('주민참여 및 협력 계획','{{participation}}',7000),
    *section('관리소 현황 및 운영 주체','{{groupIntro}}',6000),
    *section('추진 일정','{{scheduleNote}}',4000),
    [('활동명',1,3000,'label',True),('일정',1,3000,'label',True),('활동 내용 · 장소 · 대상',2,3000,'label',True)]]
for i in range(8):execution.append([(f'{{{{schedule{i}Name}}}}',1,3600,'body',False),(f'{{{{schedule{i}When}}}}',1,3600,'body',False),(f'{{{{schedule{i}Content}}}}',2,3600,'body',False)])
operations = [full('3. 운영 및 성과관리',4200,'title')]
for label,key in [('담당 인력과 역할 분담','roles'),('서비스 접수 및 기관 연계','serviceProcess'),('현장 안전 및 개인정보 관리','safety'),('실적 기록 및 성과 확인','records')]:
    operations += section(label,'{{operation'+key+'}}',7000)
operations += section('기대효과 및 지속 운영','{{effects}}',8000)
budget=[full('4. 소요예산',4200,'title'),full('단위: 천원',2600),pair('사업비','{{grantThousand}}'),pair('기타 재원','{{contributionThousand}}'),pair('총사업비','{{totalThousand}}'),
    [('항목',1,3400,'label',True),('비목',1,3400,'label',True),('금액 (천원)',1,3400,'label',True),('산출기초',1,3400,'label',True)],
    [('합계',2,3400,'label',False),('{{budgetTotal}}',1,3400,'body',False),('',1,3400,'body',False)]]
for i in range(8):budget.append([(f'{{{{budget{i}Name}}}}',1,4200,'body',False),(f'{{{{budget{i}Category}}}}',1,4200,'body',False),(f'{{{{budget{i}Amount}}}}',1,4200,'body',False),(f'{{{{budget{i}Basis}}}}',1,4200,'body',False)])
budget += section('예산 설명 및 재원 계획','{{budgetNarrative}}',6500)
budget += [full('작성 참고: 가평군 마을공동체 통합지원센터 행복마을관리소 사업 안내\nhttps://gpcommunity.or.kr/sub04_07\n센터 안내를 참고해 구성한 작성용 양식입니다.',6000)]

old_top=direct(doc.documentElement,'hp:p')
first_run=direct(old_top[0],'hp:run')[0].cloneNode(True)
for node in list(first_run.childNodes):
    if node.nodeType==node.ELEMENT_NODE and node.tagName not in ('hp:secPr','hp:ctrl'):first_run.removeChild(node)
for node in list(doc.documentElement.childNodes):doc.documentElement.removeChild(node)
for index,(spec,widths) in enumerate([(overview,[8000,15726,8000,15726]),(execution,[8500,7000,15976,15976]),(operations,[11863]*4),(budget,[9500,7500,7500,22952])]):
    p=old_top[0].cloneNode(False);p.setAttribute('pageBreak','0' if index==0 else '1')
    run=first_run.cloneNode(True) if index==0 else doc.createElement('hp:run')
    run.setAttribute('charPrIDRef',styles['body'][0]);run.appendChild(table(spec,widths));p.appendChild(run);doc.documentElement.appendChild(p)
char_list.setAttribute('itemCnt',str(len(direct(char_list,'hh:charPr'))));para_list.setAttribute('itemCnt',str(len(direct(para_list,'hh:paraPr'))))
entries['Contents/section0.xml']=doc.toxml(encoding='utf-8');entries['Contents/header.xml']=head.toxml(encoding='utf-8')
output={'layoutVersion':1,'sourceUrl':'https://gpcommunity.or.kr/sub04_07','sourceChecked':'2026-10-07','formKind':'reference-based-working-draft',
    'entries':[{'name':name,'data':base64.b64encode(data).decode()} for name,data in entries.items()]}
(root/'happiness-template.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Built independent happiness-office form with empty data fields.')
