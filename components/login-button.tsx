'use client';

import { ChevronRight, LoaderCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface LoginButtonProps {
  label?: string;
  className?: string;
  variant?: 'default' | 'secondary';
  showArrow?: boolean;
  onMessage?: (message: string) => void;
}

export function LoginButton({
  label = '로그인',
  className,
  variant = 'default',
  showArrow = false,
  onMessage,
}: LoginButtonProps) {
  const router = useRouter();
  const { user, profile, loading, signIn, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setSubmitting(true);
    try {
      const nextProfile = await signIn();
      router.push(nextProfile.villageId ? `/village/${nextProfile.villageId}` : '/village/setup');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google 로그인에 실패했습니다.';
      onMessage?.(message.includes('popup-closed') ? 'Google 로그인이 취소되었습니다.' : message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Button className={className} disabled><LoaderCircle className="animate-spin" /> 확인 중</Button>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm font-semibold hover:bg-accent"
          onClick={() => router.push(profile?.villageId ? `/village/${profile.villageId}` : '/village/setup')}
        >
          <Avatar size="sm">
            {user.photoURL && <AvatarImage src={user.photoURL} alt="" />}
            <AvatarFallback>{user.displayName?.slice(0, 1) ?? '나'}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.displayName ?? '마이페이지'}</span>
        </button>
        <Button variant="ghost" size="icon-sm" aria-label="로그아웃" onClick={() => logout()}>
          <LogOut />
        </Button>
      </div>
    );
  }

  return (
    <Button variant={variant} className={className} onClick={handleSignIn} disabled={submitting}>
      {submitting ? <LoaderCircle className="animate-spin" /> : null}
      {label}
      {showArrow ? <ChevronRight /> : null}
    </Button>
  );
}
