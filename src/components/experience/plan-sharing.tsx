'use client';

import { useEffect, useRef, useState } from 'react';

function supportsShare(data: ShareData | null) {
  if (!data || typeof navigator.share !== 'function') return false;
  try { return typeof navigator.canShare !== 'function' || navigator.canShare(data); }
  catch { return false; }
}

export function usePlanSharing(data: ShareData | null, setMessage: (value: string) => void, setError: (value: string) => void) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const pending = useRef(false);
  const title = data?.title, text = data?.text;
  useEffect(() => { setSupported(supportsShare(text === undefined ? null : {title,text})); }, [title, text]);

  async function run(action: 'share' | 'copy') {
    if (!data || pending.current) return;
    pending.current = true; setBusy(true); setMessage(''); setError(''); setManualText(null);
    try {
      if (action === 'share') {
        if (!supportsShare(data)) {
          setSupported(false);
          setError('이 브라우저에서는 기기 공유 메뉴를 사용할 수 없어요. 내용을 복사해 원하는 대화창에 붙여넣어 주세요.');
          return;
        }
        // Call directly from the click: awaiting other work loses user activation.
        await navigator.share(data);
        // Opening a Windows share sheet is enough to resolve this promise.
        // It cannot confirm which app was chosen or that a message was sent.
        setMessage('기기 공유 메뉴를 열었어요. 전송 여부는 선택한 앱에서 확인해 주세요.');
      } else {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(data.text || '');
        setMessage('내용을 복사했어요. 카카오톡을 직접 열고 원하는 대화창에 붙여넣어 보내 주세요.');
      }
    } catch (cause) {
      if (action === 'copy') {
        setManualText(data.text || '');
        setError('자동 복사를 사용할 수 없어요. 아래 내용에서 직접 복사해 주세요.');
      } else if (cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError') {
        setMessage('공유가 완료되지 않았어요. 내용을 복사해 직접 보내실 수 있습니다.');
      } else {
        setError('기기 공유를 완료하지 못했어요. 내용을 복사해 카카오톡 대화창에 직접 붙여넣어 주세요.');
      }
    } finally { pending.current = false; setBusy(false); }
  }
  return { supported, busy, share: () => run('share'), copy: () => run('copy'), manualText, closeManual: () => { setManualText(null); setError(''); } };
}

export function ManualPlanCopy({ text, onClose }: { text: string | null; onClose: () => void }) {
  const input = useRef<HTMLTextAreaElement>(null);
  function select() { input.current?.focus(); input.current?.select(); }
  useEffect(() => { if (text !== null) { input.current?.focus(); input.current?.select(); } }, [text]);
  if (text === null) return null;
  return <section className="exp-manual-copy" aria-label="직접 복사">
    <p>내용을 선택한 뒤 PC에서는 Ctrl+C, 휴대폰에서는 선택 메뉴의 ‘복사’를 눌러 주세요.</p>
    <label className="exp-field">복사할 사업계획서 내용<textarea ref={input} readOnly value={text} aria-label="복사할 사업계획서 내용"/></label>
    <div className="exp-copy-actions"><button className="exp-secondary-button" onClick={select}>전체 선택</button><button className="exp-text-button" onClick={onClose}>닫기</button></div>
  </section>;
}
