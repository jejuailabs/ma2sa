"""Build a value-free output template from the user-approved HWPX layout.

Usage: python scripts/import-plan-reference.py <reference.hwpx>
The source is read only. Reference prose, amounts, history and previews are never
part of the reusable template. Its fonts, borders, widths and section order are.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path
from xml.dom import minidom
from zipfile import ZipFile

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src/lib/experience/community-template.json'
with ZipFile(source) as archive:
    entries = {name: archive.read(name) for name in archive.namelist() if name != 'Preview/PrvImage.png'}
doc = minidom.parseString(entries['Contents/section0.xml'])
head = minidom.parseString(entries['Contents/header.xml'])

def direct(node, tag):
    return [child for child in node.childNodes if child.nodeType == child.ELEMENT_NODE and child.tagName == tag]

def text(node):
    return ''.join(child.data for t in node.getElementsByTagName('hp:t') for child in t.childNodes if child.nodeType == child.TEXT_NODE)

def rows(table): return direct(table, 'hp:tr')
def cells(row): return direct(row, 'hp:tc')
def cell(table, row, column): return cells(rows(table)[row])[column]

def paragraph(value, prototype):
    p = prototype.cloneNode(False)
    p.setAttribute('pageBreak', '0')
    run = direct(prototype, 'hp:run')[0].cloneNode(False)
    t = doc.createElement('hp:t'); t.appendChild(doc.createTextNode(value))
    run.appendChild(t); p.appendChild(run)
    return p

def set_cell(node, values, prototype=None):
    sub = direct(node, 'hp:subList')[0]
    prototype = prototype or direct(sub, 'hp:p')[0]
    for child in list(sub.childNodes): sub.removeChild(child)
    for value in values if isinstance(values, list) else [values]: sub.appendChild(paragraph(value, prototype))
    sub.setAttribute('vertAlign', 'TOP' if any('{{' in v for v in (values if isinstance(values, list) else [values])) else 'CENTER')

tables = list(doc.getElementsByTagName('hp:tbl'))
assert len(tables) == 7, 'Expected application, plan, schedule, group, history and two budget tables.'
app, plan, schedule, group, funding, budget_wrapper, budget = tables
body_proto = direct(direct(cell(plan, 7, 0), 'hp:subList')[0], 'hp:p')[0].cloneNode(True)
summary_proto = direct(direct(cell(app, 6, 1), 'hp:subList')[0], 'hp:p')[0].cloneNode(True)
grid_proto = direct(direct(cell(schedule, 1, 2), 'hp:subList')[0], 'hp:p')[0].cloneNode(True)
section_heading = rows(plan)[8].cloneNode(True)
plain_row = rows(plan)[7].cloneNode(True)

# Application: the original labels, four-part outline and signing block.
for r, c, value in [(1,1,'{{supportArea}}'),(2,1,'{{activityOptions}}'),(3,1,'{{group}}'),(3,3,'{{representative}}'),
                    (4,0,'{{addressLabel}}'),(4,1,'{{address}}'),(4,3,'{{phone}}'),(5,1,'{{title}}'),
                    (6,1,'{{summary}}'),(8,0,'{{totalThousand}}'),(8,1,'{{grantThousand}}'),(8,2,'{{contributionThousand}}'),
                    (9,0,'{{ratioNote}}'),(11,0,'{{applicationFooter}}')]:
    set_cell(cell(app,r,c), value, summary_proto if r in (2,6,11) else body_proto)
set_cell(cell(app,7,1),'총사업비 (천원)')

# Plan overview: purpose, target and effects share the reference's full-width box.
for r,c,value in [(1,1,'{{supportArea}}'),(2,1,'{{group}}'),(2,3,'{{title}}'),(3,1,'{{period}}'),
                  (5,0,'{{totalThousand}}'),(5,1,'{{grantThousand}}'),(5,2,'{{contributionThousand}}'),(5,3,'{{ratioNote}}'),
                  (7,0,'{{purposeBlock}}')]:
    set_cell(cell(plan,r,c),value,body_proto)
set_cell(cell(plan,4,1),'총사업비 (천원)')
for row in rows(plan)[8:]: plan.removeChild(row)

def full_row(prototype, value, columns, width, para=body_proto):
    row = prototype.cloneNode(True); node = cells(row)[0]
    for extra in cells(row)[1:]: row.removeChild(extra)
    span=direct(node,'hp:cellSpan')[0];span.setAttribute('colSpan',str(columns));span.setAttribute('rowSpan','1')
    size=direct(node,'hp:cellSz')[0];size.setAttribute('width',str(width));size.setAttribute('height','2400')
    direct(node,'hp:cellAddr')[0].setAttribute('colAddr','0')
    set_cell(node,value,para)
    return row

def replace_rows(table, new_rows):
    for row in rows(table): table.removeChild(row)
    for row in new_rows: table.appendChild(row)

def resize_columns(table, widths):
    direct(table,'hp:sz')[0].setAttribute('width',str(sum(widths)))
    for row in rows(table):
        for node in cells(row):
            start=int(direct(node,'hp:cellAddr')[0].getAttribute('colAddr'))
            count=int(direct(node,'hp:cellSpan')[0].getAttribute('colSpan'))
            direct(node,'hp:cellSz')[0].setAttribute('width',str(sum(widths[start:start+count])))

# The reference's third page: participation, schedule explanation, uses, grid.
# Lift the grid out of the large enclosing cell so long answers can continue.
execution = schedule.cloneNode(True)
execution.setAttribute('id','1214158751')
schedule_header = rows(schedule)[0].cloneNode(True)
schedule_prototype = rows(schedule)[1].cloneNode(True)
execution_rows = [full_row(section_heading,'추진계획',3,47452),
                  full_row(plain_row,['1) 주민 참여 계획','{{participation}}'],3,47452),
                  full_row(plain_row,['2) 사업추진 계획','{{scheduleNote}}'],3,47452),
                  full_row(plain_row,['□ 사업 내용 및 활용계획','{{activitiesDetail}}'],3,47452),
                  schedule_header]
for i in range(8):
    row = schedule_prototype.cloneNode(True)
    for node in cells(row): direct(node,'hp:cellSpan')[0].setAttribute('rowSpan','1')
    for node,value in zip(cells(row),['{{title}}','{{schedule'+str(i)+'When}}','{{schedule'+str(i)+'Content}}']): set_cell(node,value,grid_proto)
    execution_rows.append(row)
replace_rows(execution,execution_rows)
resize_columns(execution,[7138,6018,34296])

# Group data and funding history start empty, including the two printed examples.
mapping={(1,2):'group',(1,4):'founded',(2,1):'representative',(2,3):'phone',(3,1):'missing',
         (4,1):'missing',(4,3):'missing',(5,1):'missing',(6,1):'address',(6,3):'missing',
         (7,1):'members',(8,1):'groupIntro',(9,1):'history'}
for (r,c),key in mapping.items(): set_cell(cell(group,r,c),'{{'+key+'}}',body_proto)
for r in range(1,3):
    for c,node in enumerate(cells(rows(funding)[r])): set_cell(node,'{{funding'+str(r-1)+str(c)+'}}',grid_proto)
funding_sub=direct(cell(group,10,1),'hp:subList')[0]
for p in list(direct(funding_sub,'hp:p')):
    if not p.getElementsByTagName('hp:tbl'): funding_sub.removeChild(p)

# Budget matches the reference: project name spans rows; item names belong in
# the wide calculation column. Keep eight writable lines, never sample amounts.
budget_head=rows(budget)[0].cloneNode(True)
budget_sum=rows(budget)[1].cloneNode(True)
set_cell(cells(budget_sum)[1],'{{budgetTotal}}',body_proto);set_cell(cells(budget_sum)[2],'',body_proto)
budget_proto=rows(budget)[2].cloneNode(True)
budget_rows=[full_row(rows(budget_wrapper)[0],'비목별 예산계획',4,47452),
             full_row(plain_row,'{{budgetScope}}',4,47452),budget_head,budget_sum]
for i in range(8):
    row=budget_proto.cloneNode(True)
    for node in cells(row): direct(node,'hp:cellSpan')[0].setAttribute('rowSpan','1')
    values=['{{title}}','{{budget'+str(i)+'Category}}','{{budget'+str(i)+'Amount}}','{{budget'+str(i)+'Basis}}']
    for node,value in zip(cells(row),values): set_cell(node,value,body_proto)
    budget_rows.append(row)
budget_rows.append(full_row(plain_row,'{{budgetNarrative}}',4,47452))
replace_rows(budget,budget_rows);resize_columns(budget,[4802,8204,7740,26706])

# Preserve the first section setup, replacing only its tables and body flow.
top=direct(doc.documentElement,'hp:p')
first=top[0].cloneNode(False)
first_run=direct(top[0],'hp:run')[0].cloneNode(True)
for old_table in list(first_run.getElementsByTagName('hp:tbl')): old_table.parentNode.removeChild(old_table)
for child in list(first_run.childNodes):
    if child.nodeType==child.ELEMENT_NODE and child.tagName not in ('hp:secPr','hp:ctrl'): first_run.removeChild(child)
first_run.appendChild(app);first.appendChild(first_run)
for node in list(doc.documentElement.childNodes): doc.documentElement.removeChild(node)
doc.documentElement.appendChild(first)
for table in [plan,execution,group,budget]:
    p=top[1].cloneNode(False);p.setAttribute('pageBreak','1')
    run=doc.createElement('hp:run');run.setAttribute('charPrIDRef','0');run.appendChild(table);p.appendChild(run);doc.documentElement.appendChild(p)

# Reference-like writable space without fixed heights that clip longer input.
minimums={app:[3353,2657,6500,3472,3881,3472,12000,2400,3017,1930,2697,11500],
          plan:[3498,3000,3622,3920,2850,3743,3000,24000],
          execution:[3000,2400,2400,2400,2631]+[2927]*8,
          group:[3498]+[2600]*7+[16000,7000,11000],
          funding:[2231,3000,3000],budget:[3331,2000,3746,3363]+[4600]*8+[2400]}
for table in [app,plan,execution,group,funding,budget]:
    table.setAttribute('rowCnt',str(len(rows(table))))
    table.setAttribute('pageBreak','CELL');table.setAttribute('noAdjust','0')
    for ri,row in enumerate(rows(table)):
        for node in cells(row):
            direct(node,'hp:cellAddr')[0].setAttribute('rowAddr',str(ri))
            span=int(direct(node,'hp:cellSpan')[0].getAttribute('rowSpan'))
            direct(node,'hp:cellSz')[0].setAttribute('height',str(sum(minimums[table][ri:ri+span])))
            grid_header = (table is execution and ri == 4) or (table is budget and ri == 2) or (table is plan and ri == 6)
            node.setAttribute('header','1' if ri==0 or grid_header else '0')
    pos=direct(table,'hp:pos')[0]
    for key,value in {'treatAsChar':'1','affectLSpacing':'1','vertOffset':'0','horzOffset':'0','flowWithText':'1','allowOverlap':'0'}.items(): pos.setAttribute(key,value)

# Input text uses the reference's font sizes and 130% paragraph spacing in black.
char_list=head.getElementsByTagName('hh:charProperties')[0];para_list=head.getElementsByTagName('hh:paraProperties')[0]
chars={s.getAttribute('id'):s for s in direct(char_list,'hh:charPr')};paras={s.getAttribute('id'):s for s in direct(para_list,'hh:paraPr')}
char_map={};para_map={}
for p in doc.getElementsByTagName('hp:p'):
    if p.getElementsByTagName('hp:tbl'): continue
    for run in direct(p,'hp:run'):
        old=run.getAttribute('charPrIDRef')
        if old not in char_map:
            style=chars[old].cloneNode(True);identity=str(len(direct(char_list,'hh:charPr')));style.setAttribute('id',identity);style.setAttribute('textColor','#000000');char_list.appendChild(style);char_map[old]=identity
        run.setAttribute('charPrIDRef',char_map[old])
    if '{{' not in text(p): continue
    old=p.getAttribute('paraPrIDRef')
    if old not in para_map:
        style=paras[old].cloneNode(True);identity=str(len(direct(para_list,'hh:paraPr')));style.setAttribute('id',identity);style.setAttribute('snapToGrid','0')
        style.getElementsByTagName('hh:lineSpacing')[0].setAttribute('type','PERCENT');style.getElementsByTagName('hh:lineSpacing')[0].setAttribute('value','130')
        style.getElementsByTagName('hh:align')[0].setAttribute('horizontal','LEFT')
        for margin in style.getElementsByTagName('hc:intent'): margin.setAttribute('value','0')
        for attr in ('keepWithNext','keepLines','pageBreakBefore'):style.getElementsByTagName('hh:breakSetting')[0].setAttribute(attr,'0')
        para_list.appendChild(style);para_map[old]=identity
    p.setAttribute('paraPrIDRef',para_map[old])
for cache in list(doc.getElementsByTagName('hp:linesegarray')): cache.parentNode.removeChild(cache)
char_list.setAttribute('itemCnt',str(len(direct(char_list,'hh:charPr'))));para_list.setAttribute('itemCnt',str(len(direct(para_list,'hh:paraPr'))))
entries['Contents/section0.xml']=doc.toxml(encoding='utf-8');entries['Contents/header.xml']=head.toxml(encoding='utf-8')
entries['Preview/PrvText.txt']=b''
package=minidom.parseString(entries['Contents/content.hpf'])
for node in package.getElementsByTagName('opf:metadata'):
    for child in list(node.childNodes): node.removeChild(child)
entries['Contents/content.hpf']=package.toxml(encoding='utf-8')
serialized={'layoutVersion':4,'sourceName':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'entries':[{'name':name,'data':base64.b64encode(data).decode()} for name,data in entries.items()]}
target.write_text(json.dumps(serialized,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Imported reference layout without case values or source previews.')
