'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_SITE_CONFIG, getSiteConfig, type SiteConfig } from '@/lib/firebase/admin';

export function HeroSection() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    getSiteConfig().then(setConfig).catch(() => {});
  }, []);

  return (
    <section className="relative hidden md:block rounded-2xl overflow-hidden mb-10">
      <div
        className="h-[400px] bg-cover bg-center"
        style={{ backgroundImage: `url(${config.bannerImageURL})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
        <div className="relative z-10 flex flex-col justify-center h-full px-12 max-w-2xl">
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight whitespace-pre-line">
            {config.bannerTitle}
          </h1>
          <p className="text-lg text-white/80 mb-8 whitespace-pre-line">
            {config.bannerSubtitle}
          </p>
          <div className="flex gap-4">
            <Link
              href="#feed"
              className="px-6 py-3 bg-primary text-white font-medium rounded-button hover:opacity-90 transition-opacity"
            >
              마을 소식 둘러보기
            </Link>
            <Link
              href="#events"
              className="px-6 py-3 bg-white/20 backdrop-blur text-white font-medium rounded-button hover:bg-white/30 transition-colors border border-white/30"
            >
              이벤트 확인하기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
