'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getSiteConfig, DEFAULT_SITE_CONFIG, type SiteConfig } from '@/lib/firebase/admin';

export function HeroSection() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    getSiteConfig().then(setConfig).catch(() => {});
  }, []);

  const hasImage = !!config.bannerImageURL;

  return (
    <section className="rounded-2xl overflow-hidden mb-8 text-white relative" style={{ minHeight: '220px' }}>
      {/* Background: image or gradient */}
      {hasImage ? (
        <>
          <img src={config.bannerImageURL} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-accent">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-8 sm:p-10">
        <span className="inline-block px-3 py-1 text-xs font-medium bg-white/20 rounded-full mb-4">우리 마을의 오늘</span>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3 whitespace-pre-line">
          {config.bannerTitle}
        </h1>
        <p className="text-sm sm:text-base text-white/70 mb-6 whitespace-pre-line">
          {config.bannerSubtitle}
        </p>
        {user?.villageId ? (
          <Link
            href={`/village/${user.villageId}`}
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-white text-primary font-medium text-sm rounded-full hover:bg-white/90 transition-colors"
          >
            내 마을 들어가기 &rsaquo;
          </Link>
        ) : (
          <Link
            href="/village/setup"
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-white text-primary font-medium text-sm rounded-full hover:bg-white/90 transition-colors"
          >
            우리 마을 시작하기 &rsaquo;
          </Link>
        )}
      </div>
    </section>
  );
}
