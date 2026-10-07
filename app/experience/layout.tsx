import type { Metadata, Viewport } from 'next';
import { ExperienceShell } from '@/components/experience/shell';
import './experience.css';

export const metadata: Metadata = { title: '무료 체험 | 마을AI사무장', description: '말로 만드는 사업계획서부터 마을 업무까지. 로그인 없이 마을AI사무장을 체험해 보세요.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content', themeColor: '#f8f9f5' };
export default function ExperienceLayout({ children }: { children: React.ReactNode }) { return <ExperienceShell>{children}</ExperienceShell>; }
