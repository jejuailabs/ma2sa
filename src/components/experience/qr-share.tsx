'use client';

import { useState } from 'react';
import { Download, LoaderCircle, QrCode } from 'lucide-react';

export function ExperienceQr() {
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const address = 'https://ma2sa.vercel.app/experience';

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const { toDataURL } = await import('qrcode');
      setImage(await toDataURL(address, {
        width: 1024, margin: 4, errorCorrectionLevel: 'M',
        color: { dark: '#173f32', light: '#ffffff' },
      }));
    } catch {
      setError('QR 코드를 만들지 못했어요. 한 번 더 눌러 주세요.');
    } finally { setBusy(false); }
  }

  return <section className="exp-qr-share" aria-label="체험관 QR 코드">
    <p className="exp-qr-caption">함께 체험해 보세요</p>
    {image ? <>
      {/* The generated image stays on the device; it is also the downloadable PNG. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="exp-qr-image" src={image} alt="마을AI사무장 체험관 접속 QR 코드" width={192} height={192} />
      <a className="exp-qr-button" href={image} download="마을AI사무장-체험관-QR.png"><Download size={17} /> PNG 다운로드</a>
      <p className="exp-qr-address">휴대폰 카메라로 비추면<br />체험관으로 바로 연결돼요.</p>
    </> : <>
      <QrCode className="exp-qr-placeholder" size={60} strokeWidth={1.4} aria-hidden="true" />
      <button className="exp-qr-button" disabled={busy} onClick={generate}>
        {busy ? <LoaderCircle className="exp-spin" size={17} /> : <QrCode size={17} />}
        {busy ? '만드는 중…' : 'QR 코드 생성하기'}
      </button>
      <p className="exp-qr-address">화면에 띄우거나 내려받아<br />여럿이 함께 접속해 보세요.</p>
    </>}
    {error && <p className="exp-qr-error" role="alert">{error}</p>}
    <span className="sr-only" role="status">{image ? 'QR 코드가 생성되었습니다. PNG로 내려받을 수 있습니다.' : ''}</span>
  </section>;
}
