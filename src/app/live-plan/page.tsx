import type { Metadata } from 'next';
import { LivePlan } from '@/components/experience/live-plan';
import './live-plan.css';
export const metadata: Metadata = { title: 'AI와 이야기하며 만드는 사업계획서 | 마을AI사무장', description: '말하거나 글로 답하면 우리 마을의 사업계획서가 차근차근 완성됩니다.' };
export default function LivePlanPage() { return <LivePlan />; }
