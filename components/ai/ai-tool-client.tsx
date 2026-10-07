'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Check, Download, FileAudio, FileUp, LoaderCircle, Save, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { WorkModeShell } from '@/components/work-mode-shell';
import { aiToolDefinitions, AiToolSlug } from '@/lib/ai/tools';
import { db, storage } from '@/lib/firebase/client';

type JsonResult = Record<string, unknown>;

const templates = ['마을 공지문', '마을 사업계획서', '보조금 신청서', '결과보고서', '공식 회의록'];
const styles = [
  { value: 'formal', label: '공지 · 정중하고 명확하게' },
  { value: 'friendly', label: '친근 · 따뜻하고 편안하게' },
  { value: 'cheerful', label: '경쾌 · 밝고 활기차게' },
];

function displayValue(value: unknown): string {
  if (value == null || value === '') return '확인 필요';
  if (Array.isArray(value)) return value.map((item) => typeof item === 'object' ? JSON.stringify(item, null, 2) : `• ${String(item)}`).join('\n');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function downloadBlob(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resultFile(tool: AiToolSlug, result: JsonResult) {
  if (tool === 'receipt') {
    const rows = Array.isArray(result.items) ? result.items as Array<Record<string, unknown>> : [];
    const headers = ['날짜', '판매처', '품목', '수량', '단가', '합계', '분류'];
    const keys = ['date', 'vendor', 'item', 'quantity', 'unitPrice', 'total', 'category'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\r\n');
    return { name: '마을-영수증-장부.csv', blob: new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }) };
  }
  if (tool === 'narration' && typeof result.audioBase64 === 'string') {
    const bytes = Uint8Array.from(atob(result.audioBase64), (char) => char.charCodeAt(0));
    return { name: '마을-방송.mp3', blob: new Blob([bytes], { type: 'audio/mpeg' }) };
  }
  const content = tool === 'format' ? String(result.content ?? '') : tool === 'transcribe' ? String(result.minutes ?? JSON.stringify(result, null, 2)) : JSON.stringify(result, null, 2);
  return { name: `마을-${aiToolDefinitions[tool].title}.txt`, blob: new Blob([content], { type: 'text/plain;charset=utf-8' }) };
}

function downloadResult(tool: AiToolSlug, result: JsonResult) {
  const file = resultFile(tool, result);
  downloadBlob(file.name, file.blob, file.blob.type);
}

export function AiToolClient({ villageId, tool }: { villageId: string; tool: AiToolSlug }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const definition = aiToolDefinitions[tool];
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('');
  const [template, setTemplate] = useState(templates[0]);
  const [style, setStyle] = useState(styles[0].value);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonResult | null>(null);

  const needsText = tool === 'format' || tool === 'narration';
  const canRun = useMemo(() => needsText ? text.trim().length > 0 : files.length > 0, [needsText, text, files]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (profile?.villageId !== villageId || (profile.role !== 'leader' && profile.role !== 'secretary')) router.replace('/');
  }, [loading, user, profile, villageId, router]);

  async function run() {
    if (!user || !canRun) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const token = await user.getIdToken();
      const headers: HeadersInit = { authorization: `Bearer ${token}` };
      let body: BodyInit;
      if (needsText) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify({ villageId, text, template, style });
      } else {
        const form = new FormData();
        form.append('villageId', villageId);
        if (tool === 'receipt') files.forEach((file) => form.append('files', file));
        else form.append('file', files[0]);
        body = form;
      }
      const response = await fetch(`/api/ai/${tool}`, { method: 'POST', headers, body });
      const payload = await response.json() as { success?: boolean; result?: JsonResult; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.result) throw new Error(payload.error?.message || 'AI 처리에 실패했습니다.');
      setResult(payload.result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 처리에 실패했습니다.');
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    if (!user || !result) return;
    setSaving(true);
    setError(null);
    try {
      const storableResult = { ...result };
      delete storableResult.audioBase64;
      const output = resultFile(tool, result);
      const extension = output.name.split('.').pop() || 'txt';
      const storageRef = ref(storage, `villages/${villageId}/documents/${Date.now()}-${tool}.${extension}`);
      await uploadBytes(storageRef, output.blob, { contentType: output.blob.type });
      const fileURL = await getDownloadURL(storageRef);
      const serialized = JSON.stringify(storableResult);
      const metadata = serialized.length < 500000 ? storableResult : { preview: serialized.slice(0, 20000), truncated: true };
      await addDoc(collection(db, 'villages', villageId, 'documents'), {
        villageId,
        type: tool === 'transcribe' ? 'minutes' : tool === 'format' ? 'formatted' : tool,
        title: String(result.title || result.projectName || `${definition.title} 결과`),
        description: String(result.summary || result.script || `${definition.title}에서 생성한 문서` ).slice(0, 300),
        fileURL,
        thumbnailURL: '',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        aiGenerated: true,
        metadata,
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문서함 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !profile || profile.villageId !== villageId || (profile.role !== 'leader' && profile.role !== 'secretary')) {
    return <main className="grid min-h-screen place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  }

  return (
    <WorkModeShell villageId={villageId} active="ai">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-primary"><Sparkles className="size-4" /> AI ASSISTANT</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">{definition.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{definition.description}</p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/village/${villageId}/ai`)}>AI 기능 전체</Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className="h-fit border-0 shadow-sm ring-border">
            <CardHeader><CardTitle>자료 입력</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {needsText ? (
                <div>
                  <label htmlFor="source-text" className="text-sm font-semibold">{tool === 'narration' ? '방송할 내용' : '문서 초안'}</label>
                  <Textarea id="source-text" value={text} onChange={(event) => setText(event.target.value)} rows={13} className="mt-2 resize-y" placeholder={tool === 'narration' ? '주민 여러분께 안내할 내용을 입력하세요.' : '메모나 초안을 자유롭게 입력하세요.'} />
                </div>
              ) : (
                <label className="grid min-h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-primary/25 bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/60">
                  <input type="file" className="sr-only" accept={definition.accept} multiple={definition.multiple} onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
                  <span><FileUp className="mx-auto mb-3 size-8 text-primary" /><strong className="block">파일 선택 또는 끌어놓기</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">{tool === 'announcement' ? 'PDF·JPG·PNG, 최대 10MB' : tool === 'receipt' ? 'JPG·PNG, 최대 10장' : 'MP3·M4A·WAV·WEBM, 최대 25MB'}</span></span>
                </label>
              )}

              {files.length > 0 && <div className="space-y-2">{files.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs"><FileAudio className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span></div>)}</div>}

              {tool === 'format' && <div><label htmlFor="template" className="text-sm font-semibold">변환할 양식</label><select id="template" value={template} onChange={(event) => setTemplate(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm">{templates.map((item) => <option key={item}>{item}</option>)}</select></div>}
              {tool === 'narration' && <div><label htmlFor="style" className="text-sm font-semibold">방송 스타일</label><select id="style" value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm">{styles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>}

              <Button className="h-12 w-full rounded-xl" disabled={!canRun || running} onClick={run}>{running ? <><LoaderCircle className="animate-spin" /> 처리 중입니다</> : <><Sparkles /> AI로 처리하기</>}</Button>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card className="min-h-[430px] border-0 shadow-sm ring-border">
            <CardHeader className="flex-row items-center justify-between"><CardTitle>결과 미리보기</CardTitle>{result && <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Check className="size-4" />완료</span>}</CardHeader>
            <CardContent>
              {!result && !running && <div className="grid min-h-72 place-items-center text-center text-sm text-muted-foreground"><div><Sparkles className="mx-auto mb-3 size-8 opacity-30" />AI 처리 결과가 여기에 표시됩니다.</div></div>}
              {running && <div className="grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto mb-3 size-8 animate-spin text-primary" /><p className="font-semibold">자료를 읽고 정리하고 있습니다.</p><p className="mt-1 text-xs text-muted-foreground">파일 크기에 따라 잠시 걸릴 수 있습니다.</p></div></div>}
              {result && <div className="space-y-4">
                {tool === 'narration' && typeof result.audioBase64 === 'string' && <audio className="w-full" controls src={`data:audio/mpeg;base64,${result.audioBase64}`} />}
                {Object.entries(result).filter(([key]) => !['audioBase64', 'audioMimeType'].includes(key)).map(([key, value]) => <div key={key} className="rounded-xl border bg-background p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{key}</p><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">{displayValue(value)}</pre></div>)}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => downloadResult(tool, result)}><Download /> 다운로드</Button>
                  <Button className="flex-1" onClick={save} disabled={saving || saved}>{saving ? <LoaderCircle className="animate-spin" /> : saved ? <Check /> : <Save />}{saved ? '문서함 저장 완료' : '문서함에 저장'}</Button>
                </div>
              </div>}
            </CardContent>
          </Card>
        </div>
      </section>
    </WorkModeShell>
  );
}
