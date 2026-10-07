'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight, Menu, Sparkles, X } from 'lucide-react';
import { ExperienceIcon } from './icon';
import { villageSections } from '@/lib/experience/catalog';
import { clearPlanDrafts, NewPlanLink } from './new-plan-link';

export function ExperienceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const wizard = pathname.startsWith('/experience/business-plan');
  const tools = pathname === '/experience' || pathname.includes('/tools/');

  useEffect(() => { drawer.current?.close(); }, [pathname]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      const gap = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      document.documentElement.style.setProperty('--experience-keyboard', `${gap > 100 ? gap : 0}px`);
    };
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); document.documentElement.style.removeProperty('--experience-keyboard'); document.body.style.overflow = ''; };
  }, []);

  const closeMenu = () => { drawer.current?.close(); };
  const startTools = () => { clearPlanDrafts();closeMenu(); };
  const nav = <>
    <p className="exp-nav-label">직접 써보세요</p>
    <Link href="/experience" className={`exp-nav-item ${tools || wizard ? 'is-active' : ''}`} aria-current={tools || wizard ? 'page' : undefined} onClick={startTools}><Sparkles size={20} /> AI 도구 체험 <ChevronRight className="exp-nav-arrow" size={16} /></Link>
    <NewPlanLink mode="live" href="/live-plan" className="exp-nav-item exp-nav-live" onClick={closeMenu}><ExperienceIcon name="conversation" /> AI와 대화하기 <span className="exp-nav-live-badge">음성</span></NewPlanLink>
    <p className="exp-nav-label exp-nav-label-spaced">우리 마을 둘러보기 <span>DEMO</span></p>
    {villageSections.map(item => <Link key={item.slug} href={`/experience/village/${item.slug}`} onClick={closeMenu} className={`exp-nav-item ${pathname.endsWith(`/village/${item.slug}`) ? 'is-active' : ''}`} aria-current={pathname.endsWith(`/village/${item.slug}`) ? 'page' : undefined}><ExperienceIcon name={item.icon} />{item.title}</Link>)}
  </>;

  return <div className="experience">
    <a href="#experience-content" className="exp-skip">본문으로 바로가기</a>
    <aside className="exp-sidebar" aria-label="체험관 메뉴">
      <Link href="/experience" className="exp-brand" onClick={startTools}><span className="exp-brand-icon"><ExperienceIcon name="home" /></span><span>마을AI사무장<small>우리 마을의 든든한 동료</small></span></Link>
      <div className="exp-demo-village"><span className="exp-status-dot" /><div><strong>함께마을</strong><p>가상의 마을로 둘러보는 체험관</p></div><span className="exp-demo-pill">데모</span></div>
      <nav>{nav}</nav>
      <div className="exp-sidebar-bottom"><p>작은 일부터, 함께 가볍게.</p><Link href="/">메인화면으로 <ArrowUpRight size={17} /></Link></div>
    </aside>
    <div className="exp-body">
      <header className="exp-header">
        {wizard || pathname.includes('/tools/') ? <Link href="/experience" className="exp-icon-button" aria-label="AI 도구로 돌아가기" onClick={startTools}><ArrowLeft /></Link> : <button ref={menuButton} className="exp-icon-button exp-menu-button" aria-label="마을 메뉴 열기" aria-haspopup="dialog" onClick={() => { drawer.current?.showModal(); document.body.style.overflow = 'hidden'; }}><Menu /></button>}
        <Link href="/experience" className="exp-header-title" onClick={startTools}>마을AI사무장 <span>체험관</span></Link>
        <Link href="/" className="exp-home-link">메인 <ArrowUpRight size={16} /></Link>
      </header>
      <main id="experience-content" className={`exp-content ${wizard ? 'exp-content-wizard' : ''}`}>{children}</main>
      {!wizard && !pathname.includes('/tools/') && <nav className="exp-tabbar" aria-label="체험 하단 메뉴"><Link href="/experience" onClick={startTools} aria-current={tools ? 'page' : undefined} className={tools ? 'is-active' : ''}><Sparkles /><span>AI 체험</span></Link><Link href="/experience/village/dashboard" className={pathname.includes('/village/') && !pathname.endsWith('/documents') ? 'is-active' : ''}><ExperienceIcon name="home" /><span>우리 마을</span></Link><Link href="/experience/village/documents" className={pathname.endsWith('/documents') ? 'is-active' : ''}><ExperienceIcon name="folder" /><span>문서함</span></Link><button aria-label="전체 마을 메뉴 열기" aria-haspopup="dialog" onClick={() => { drawer.current?.showModal(); document.body.style.overflow = 'hidden'; }}><Menu /><span>전체 메뉴</span></button></nav>}
    </div>
    <dialog ref={drawer} className="exp-drawer" aria-labelledby="experience-menu-title" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} onClose={() => { document.body.style.overflow = ''; menuButton.current?.focus(); }}>
      <div className="exp-drawer-inner"><div className="exp-drawer-heading"><strong id="experience-menu-title">마을AI사무장 체험관</strong><button className="exp-icon-button" aria-label="메뉴 닫기" onClick={closeMenu}><X /></button></div><p className="exp-drawer-caption">로그인 없이 자유롭게 둘러보세요.</p><nav>{nav}</nav><Link className="exp-drawer-home" href="/">메인화면으로 <ArrowUpRight size={18} /></Link></div>
    </dialog>
  </div>;
}
