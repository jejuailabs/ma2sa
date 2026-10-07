"""Repair the imported HWPX template without altering the supplied original.

Run once against community-template.json after importing the source form.
The source SHA remains the fingerprint of the original, unmodified HWPX.
"""
import base64
import json
from pathlib import Path
from xml.dom import minidom

path = Path(__file__).resolve().parents[1] / 'src/lib/experience/community-template.json'
template = json.loads(path.read_text(encoding='utf-8'))
if template.get('layoutVersion', 0) >= 2:
    raise SystemExit('Layout version 2 already applied.')
entries = {entry['name']: entry for entry in template['entries']}
section = minidom.parseString(base64.b64decode(entries['Contents/section0.xml']['data']))
header = minidom.parseString(base64.b64decode(entries['Contents/header.xml']['data']))

def direct(node, tag):
    return [c for c in node.childNodes if c.nodeType == c.ELEMENT_NODE and c.tagName == tag]

def text(node):
    return ''.join(c.data for t in node.getElementsByTagName('hp:t') for c in t.childNodes if c.nodeType == c.TEXT_NODE)

def replace_paragraph(p, value):
    run = direct(p, 'hp:run')[0].cloneNode(False)
    for child in list(p.childNodes):
        p.removeChild(child)
    t = section.createElement('hp:t')
    t.appendChild(section.createTextNode(value))
    run.appendChild(t)
    p.appendChild(run)

tables = list(section.getElementsByTagName('hp:tbl'))
plan, schedule, budget_wrapper, budget = tables[1], tables[2], tables[5], tables[6]
plan_p = plan.parentNode.parentNode
budget_p = budget_wrapper.parentNode.parentNode

# A table inside a single enclosing cell cannot paginate independently.
# Lift the schedule and budget grids into the document flow, retaining columns.
schedule.parentNode.removeChild(schedule)
budget.parentNode.removeChild(budget)
plan_rows = direct(plan, 'hp:tr')
participation_row = plan_rows[-1]
participation_p = direct(direct(direct(participation_row, 'hp:tc')[0], 'hp:subList')[0], 'hp:p')[1]
replace_paragraph(participation_p, '{{participation}}')
sub = participation_p.parentNode
for child in list(sub.childNodes):
    if child is not participation_p:
        sub.removeChild(child)
plan_rows[-2].getElementsByTagName('hp:t')[0].firstChild.data = '  주민 참여 계획'

def table_paragraph(table, prototype, new_page=True):
    p = prototype.cloneNode(False)
    p.setAttribute('pageBreak', '1' if new_page else '0')
    run = section.createElement('hp:run')
    run.setAttribute('charPrIDRef', '0')
    run.appendChild(table)
    p.appendChild(run)
    return p

def prepend_title(table, title, prototype_row):
    row = prototype_row.cloneNode(True)
    tc = direct(row, 'hp:tc')[0]
    tc.getElementsByTagName('hp:cellSpan')[0].setAttribute('colSpan', table.getAttribute('colCnt'))
    tc.getElementsByTagName('hp:cellSz')[0].setAttribute('width', direct(table, 'hp:sz')[0].getAttribute('width'))
    cell_sub = direct(tc, 'hp:subList')[0]
    p = direct(cell_sub, 'hp:p')[0]
    replace_paragraph(p, title)
    for child in list(cell_sub.childNodes):
        if child is not p:
            cell_sub.removeChild(child)
    table.insertBefore(row, direct(table, 'hp:tr')[0])

prepend_title(schedule, '  사업추진 계획', plan_rows[-2])
section.documentElement.insertBefore(table_paragraph(schedule, plan_p), plan_p.nextSibling)
prepend_title(budget, '  비목별 예산계획 (보조금)', direct(budget_wrapper, 'hp:tr')[0])
budget_p.parentNode.replaceChild(table_paragraph(budget, budget_p), budget_p)

# Every major table starts on its own page. Rows continue together on subsequent
# pages; the exporter switches unusually long prose cells to line-level flow.
for index, p in enumerate(direct(section.documentElement, 'hp:p')):
    p.setAttribute('pageBreak', '0' if index == 0 else '1')

for table in list(section.getElementsByTagName('hp:tbl')):
    table.setAttribute('pageBreak', 'CELL')
    table.setAttribute('repeatHeader', '1')
    pos = direct(table, 'hp:pos')[0]
    pos.setAttribute('treatAsChar', '0')
    pos.setAttribute('affectLSpacing', '0')
    pos.setAttribute('vertOffset', '0')
    pos.setAttribute('flowWithText', '1')
    pos.setAttribute('allowOverlap', '0')
    rows = direct(table, 'hp:tr')
    table.setAttribute('rowCnt', str(len(rows)))
    height = 0
    for ri, row in enumerate(rows):
        row_height = 0
        for cell in direct(row, 'hp:tc'):
            cell.setAttribute('header', '1' if ri == 0 or (table in (schedule, budget) and ri == 1) else '0')
            direct(cell, 'hp:cellAddr')[0].setAttribute('rowAddr', str(ri))
            size = direct(cell, 'hp:cellSz')[0]
            # These are minimum heights, not fixed boxes for arbitrary answers.
            cell_height = min(int(size.getAttribute('height')), 3200 if ri == 0 else 2400)
            size.setAttribute('height', str(cell_height))
            row_height = max(row_height, cell_height)
            sub = direct(cell, 'hp:subList')[0]
            sub.setAttribute('lineWrap', 'BREAK')
            sub.setAttribute('vertAlign', 'TOP' if '{{' in text(cell) else 'CENTER')
        height += row_height
    direct(table, 'hp:sz')[0].setAttribute('height', str(height))

char_list = header.getElementsByTagName('hh:charProperties')[0]
para_list = header.getElementsByTagName('hh:paraProperties')[0]
char_styles = {c.getAttribute('id'): c for c in direct(char_list, 'hh:charPr')}
para_styles = {p.getAttribute('id'): p for p in direct(para_list, 'hh:paraPr')}
black_styles, body_styles = {}, {}
prose_fields = ('summary', 'purposeWithTarget', 'participation', 'groupIntro', 'history', 'budgetNote', 'applicationFooter')

for p in list(section.getElementsByTagName('hp:p')):
    value = text(p) if not p.getElementsByTagName('hp:tbl') else ''
    if '{{' not in value:
        continue
    for run in direct(p, 'hp:run'):
        old = run.getAttribute('charPrIDRef')
        if old not in black_styles:
            style = char_styles[old].cloneNode(True)
            new_id = str(len(direct(char_list, 'hh:charPr')))
            style.setAttribute('id', new_id)
            style.setAttribute('textColor', '#000000')
            style.setAttribute('height', str(max(1000, int(style.getAttribute('height')))))
            char_list.appendChild(style)
            black_styles[old] = new_id
        run.setAttribute('charPrIDRef', black_styles[old])
    old = p.getAttribute('paraPrIDRef')
    prose = any('{{' + key + '}}' in value for key in prose_fields)
    key = (old, prose)
    if key not in body_styles:
        style = para_styles[old].cloneNode(True)
        new_id = str(len(direct(para_list, 'hh:paraPr')))
        style.setAttribute('id', new_id)
        style.setAttribute('snapToGrid', '0')
        style.getElementsByTagName('hh:lineSpacing')[0].setAttribute('type', 'PERCENT')
        style.getElementsByTagName('hh:lineSpacing')[0].setAttribute('value', '160')
        settings = style.getElementsByTagName('hh:breakSetting')[0]
        for attr in ('keepWithNext', 'keepLines', 'pageBreakBefore'):
            settings.setAttribute(attr, '0')
        settings.setAttribute('lineWrap', 'BREAK')
        for margin in style.getElementsByTagName('hc:intent'):
            margin.setAttribute('value', '0')
        if prose:
            style.getElementsByTagName('hh:align')[0].setAttribute('horizontal', 'LEFT')
        para_list.appendChild(style)
        body_styles[key] = new_id
    p.setAttribute('paraPrIDRef', body_styles[key])

char_list.setAttribute('itemCnt', str(len(direct(char_list, 'hh:charPr'))))
para_list.setAttribute('itemCnt', str(len(direct(para_list, 'hh:paraPr'))))
# Line positions belong to the original guide text, never the inserted answers.
for cache in list(section.getElementsByTagName('hp:linesegarray')):
    cache.parentNode.removeChild(cache)
for name, doc in [('Contents/section0.xml', section), ('Contents/header.xml', header)]:
    entries[name]['data'] = base64.b64encode(doc.toxml(encoding='utf-8')).decode()
template['layoutVersion'] = 2
path.write_text(json.dumps(template, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('Repaired black field styles, paragraph layout, and page-flow tables.')
