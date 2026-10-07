'use client';

import { Home, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LoginButton } from '@/components/login-button';

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-md rounded-[28px] border bg-card p-7 shadow-[0_20px_70px_rgba(23,63,50,0.12)] sm:p-9">
        <Link href="/" className="mb-9 flex items-center gap-2.5 font-bold">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Home className="size-5" /></span>
          마을AI사무장
        </Link>
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><ShieldCheck /></span>
        <h1 className="text-3xl font-bold tracking-[-0.05em]">Google 계정으로<br />간편하게 시작하세요.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">로그인 후 소속 마을을 선택하면 주민 화면과 권한별 업무 기능을 이용할 수 있습니다.</p>
        <LoginButton label="Google로 계속하기" className="mt-8 h-12 w-full rounded-xl" onMessage={setMessage} />
        {message && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">로그인하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
      </section>
    </main>
  );
}
