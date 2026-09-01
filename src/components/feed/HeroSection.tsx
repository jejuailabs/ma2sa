'use client';

import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-primary-dark via-primary to-accent text-white p-8 sm:p-10 relative">
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>
      <div className="relative z-10">
        <span className="inline-block px-3 py-1 text-xs font-medium bg-white/20 rounded-full mb-4">우리 마을의 오늘</span>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
          가까운 소식부터 중요한 일까지,
          <br />
          한곳에서 함께 나눠요.
        </h1>
        <p className="text-sm sm:text-base text-white/70 mb-6">
          전국 마을의 이야기와 행사, 정성껏 기른 특산품을 만나보세요.
        </p>
        <Link
          href="/village/setup"
          className="inline-flex items-center gap-1 px-5 py-2.5 bg-white text-primary font-medium text-sm rounded-full hover:bg-white/90 transition-colors"
        >
          우리 마을 시작하기 &rsaquo;
        </Link>
      </div>
    </section>
  );
}
