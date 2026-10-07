"""Remove source examples/guidance and add full-width narrative fields (v3)."""
import base64, json
from pathlib import Path
from xml.dom import minidom

path=Path(__file__).resolve().parents[1]/'src/lib/experience/community-template.json'
data=json.loads(path.read_text(encoding='utf-8'))
if data.get('layoutVersion')!=2: raise SystemExit('Run against layout version 2.')
entries={e['name']:e for e in data['entries']}
doc=minidom.parseString(base64.b64decode(entries['Contents/section0.xml']['data']))
head=minidom.parseString(base64.b64decode(entries['Contents/header.xml']['data']))
def direct(n,t): return [c for c in n.childNodes if c.nodeType==c.ELEMENT_NODE and c.tagName==t]
def text(n): return ''.join(c.data for t in n.getElementsByTagName('hp:t') for c in t.childNodes if c.nodeType==c.TEXT_NODE)
def replace(p,value):
    run=direct(p,'hp:run')[0].cloneNode(False)
    for c in list(p.childNodes): p.removeChild(c)
    t=doc.createElement('hp:t');t.appendChild(doc.createTextNode(value));run.appendChild(t);p.appendChild(run)

tables=list(doc.getElementsByTagName('hp:tbl'))
app,plan,schedule,group,funding,budget=tables
rows=direct(plan,'hp:tr')
def full_row(table,prototype,value):
    row=prototype.cloneNode(True);tc=direct(row,'hp:tc')[0]
    tc.getElementsByTagName('hp:cellSpan')[0].setAttribute('colSpan',table.getAttribute('colCnt'))
    tc.getElementsByTagName('hp:cellSz')[0].setAttribute('width',direct(table,'hp:sz')[0].getAttribute('width'))
    sub=direct(tc,'hp:subList')[0];p=direct(sub,'hp:p')[0];replace(p,value)
    for c in list(sub.childNodes):
        if c is not p: sub.removeChild(c)
    table.appendChild(row)
    return row

for title,field in [('effectsHeading','effects'),('summaryDetailHeading','summaryDetail')]:
    full_row(plan,rows[6],'{{'+title+'}}');full_row(plan,rows[7],'{{'+field+'}}')
full_row(budget,rows[6],'{{budgetNarrativeHeading}}');full_row(budget,rows[7],'{{budgetNarrative}}')

# Guidance from the old blank form is never user content.
for p in list(doc.getElementsByTagName('hp:p')):
    if p.getElementsByTagName('hp:tbl'): continue
    value=text(p).strip()
    if value.startswith('※') or '2015년~2018년' in value:
        replace(p,'')
    if value=='총사업비': replace(p,'총사업비 (천원)')
    if value=='비목별 예산계획 (보조금)': replace(p,'비목별 예산계획')

def columns(table,widths):
    for row in direct(table,'hp:tr'):
        for cell in direct(row,'hp:tc'):
            addr=cell.getElementsByTagName('hp:cellAddr')[0];span=cell.getElementsByTagName('hp:cellSpan')[0]
            start=int(addr.getAttribute('colAddr'));count=int(span.getAttribute('colSpan'))
            cell.getElementsByTagName('hp:cellSz')[0].setAttribute('width',str(sum(widths[start:start+count])))
columns(schedule,[8500,10000,27791])
columns(budget,[10000,6500,6500,23332])

for table in tables:
    rows=direct(table,'hp:tr');table.setAttribute('rowCnt',str(len(rows)))
    for i,row in enumerate(rows):
        for cell in direct(row,'hp:tc'):
            cell.getElementsByTagName('hp:cellAddr')[0].setAttribute('rowAddr',str(i))
    # Empty reference-row paragraphs must not carry the old blue guide styles.
    if table is funding:
        for r in rows[1:]:
            for c in direct(r,'hp:tc'):
                c.getElementsByTagName('hp:cellSz')[0].setAttribute('height','2200')

paras=head.getElementsByTagName('hh:paraProperties')[0]
styles={p.getAttribute('id'):p for p in direct(paras,'hh:paraPr')}
for p in doc.getElementsByTagName('hp:p'):
    if p.getElementsByTagName('hp:tbl'): continue
    value=text(p)
    if value not in ('{{summary}}','{{applicationFooter}}'): continue
    original=styles[p.getAttribute('paraPrIDRef')];style=original.cloneNode(True)
    identity=str(max(int(x.getAttribute('id')) for x in direct(paras,'hh:paraPr'))+1)
    style.setAttribute('id',identity)
    style.getElementsByTagName('hh:lineSpacing')[0].setAttribute('value','150' if value=='{{summary}}' else '130')
    style.getElementsByTagName('hh:breakSetting')[0].setAttribute('keepLines','1')
    paras.appendChild(style);p.setAttribute('paraPrIDRef',identity)
paras.setAttribute('itemCnt',str(len(direct(paras,'hh:paraPr'))))
for name,xml in [('Contents/section0.xml',doc),('Contents/header.xml',head)]: entries[name]['data']=base64.b64encode(xml.toxml(encoding='utf-8')).decode()
data['layoutVersion']=3
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Clean template v3: no old instructions, wider data columns, separate narrative fields.')
