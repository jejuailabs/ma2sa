'use client';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
const AuthProvider = dynamic(() => import('@/components/auth-provider').then(module => module.AuthProvider));
export function AppProviders({ children }: { children: React.ReactNode }) { const pathname = usePathname(); return pathname === '/experience' || pathname.startsWith('/experience/') ? children : <AuthProvider>{children}</AuthProvider>; }
