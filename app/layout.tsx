import type { Metadata } from 'next';
import { AppProviders } from '@/components/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: '마을AI사무장 | 우리 마을의 일을 더 가볍게',
  description: '마을 소식을 나누고 이장·사무장의 반복 업무를 AI로 돕는 마을 커뮤니티 플랫폼',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
