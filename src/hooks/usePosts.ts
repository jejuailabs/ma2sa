'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPublicPosts, getVillagePosts } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { MOCK_POSTS } from '@/lib/mockData';
import type { Post, PostType } from '@/types/feed';

export function usePosts({ villageId, type }: { villageId?: string; type?: PostType }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!isFirebaseConfigured) {
        setPosts(MOCK_POSTS.filter((post) => (!villageId || post.villageId === villageId || villageId === 'v1') && (!type || post.type === type)));
      } else if (villageId) {
        setPosts(await getVillagePosts(villageId, type));
      } else {
        setPosts((await getPublicPosts(type)).posts);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '소식을 불러오지 못했습니다.');
      setPosts([]);
    } finally { setLoading(false); }
  }, [type, villageId]);

  useEffect(() => { void reload(); }, [reload]);
  return { posts, loading, error, reload };
}
