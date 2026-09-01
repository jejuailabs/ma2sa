import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProviderWrapper } from '@/components/auth/AuthProviderWrapper';

export const metadata: Metadata = {
  title: '마을AI사무장 - 마을의 이야기가 여행이 되는 곳',
  description: '전국의 마을 소식을 한곳에서. AI로 이장·사무장 업무를 지원합니다.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AuthProviderWrapper>
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
