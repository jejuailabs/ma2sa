import { notFound } from 'next/navigation';
import { VillageDemo } from '@/components/experience/village-demo';
import { villageSections } from '@/lib/experience/catalog';
export function generateStaticParams(){return villageSections.map(item=>({section:item.slug}));}
export default async function DemoPage({params}:{params:Promise<{section:string}>}){const{section}=await params;if(!villageSections.some(item=>item.slug===section))notFound();return <VillageDemo section={section}/>;}
