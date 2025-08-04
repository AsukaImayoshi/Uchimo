import { View, Text, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useProtectedRoute } from '../hooks/useProtectedRoute';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { Link } from 'expo-router';
import { ReactionButton } from '../components/ReactionButton';
import UchimoIcon from '../assets/icons/uchimo.svg';
import GambarouIcon from '../assets/icons/gambarou.svg';

type Post = {
  id: string;
  content: string;
  thread_id: string;
  created_at: any;
};

type Thread = {
  id: string;
  title: string;
  slug: string;
};

export default function MoreMyPostsScreen() {
  useProtectedRoute();
  const user = auth.currentUser!;
  const [posts, setPosts] = useState<Post[]>([]);
  const [threadsMap, setThreadsMap] = useState<Map<string, Thread>>(new Map());
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchMyPosts = async (isRefresh = false) => {
    if (loading || !user?.uid || (!isRefresh && !hasMore)) return;

    setLoading(true);
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        ...(lastDoc && !isRefresh ? [startAfter(lastDoc)] : []),
        limit(10)
      );

      const snap = await getDocs(postsQuery);
      if (snap.empty) {
        setHasMore(false);
        return;
      }

      const newLastDoc = snap.docs[snap.docs.length - 1];
      if (isRefresh) {
        setLastDoc(newLastDoc);
      } else {
        setLastDoc(prev => newLastDoc);
      }

      const newPosts = snap.docs.map(doc => ({
        id: doc.id,
        content: doc.data().content,
        thread_id: doc.data().thread_id,
        created_at: doc.data().created_at,
      }));

      setPosts(prev => isRefresh ? newPosts : [...prev, ...newPosts]);

      // fetch thread info if not cached
      const newThreadIds = newPosts
        .map(p => p.thread_id)
        .filter(id => !threadsMap.has(id));

      const newThreadMap = new Map(threadsMap);
      for (const threadId of newThreadIds) {
        const threadRef = doc(db, 'threads', threadId);
        const threadSnap = await getDoc(threadRef);
        if (threadSnap.exists()) {
          const data = threadSnap.data();
          newThreadMap.set(threadId, {
            id: threadId,
            title: data.title || '（タイトル不明）',
            slug: data.slug,
          });
        }
      }

      setThreadsMap(newThreadMap);
    } catch (e) {
      console.error('fetchMyPosts error:', e);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // トグル式リアクション
    const handleReaction = async (
    postId: string,
    type: 'likes\_uchimo' | 'likes\_gambarou'
    ) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    const reactionRef = collection(db, 'reactions');

      const q = query(
        reactionRef,
        where('post_id', '==', postId),
        where('user_id', '==', userId),
        where('type', '==', type)
      );

      const snapshot = await getDocs(q);

      const postRef = doc(db, 'posts', postId);

      try {
        if (!snapshot.empty) {
          // すでにリアクションしていればトグルオフ
          const existing = snapshot.docs[0];
          await deleteDoc(doc(db, 'reactions', existing.id));

          await runTransaction(db, async (tx) => {
            tx.update(postRef, {
              [type]: increment(-1),
            });
          });
        } else {
          // リアクションしていなければトグルオン
          await addDoc(reactionRef, {
            post_id: postId,
            user_id: userId,
            type,
            created_at: new Date(),
          });

          await runTransaction(db, async (tx) => {
            tx.update(postRef, {
              [type]: increment(1),
            });
          });
        }

        // 投稿情報を再取得・更新
          const updatedSnap = await getDoc(postRef);
          if (updatedSnap.exists()) {
            const updatedData = updatedSnap.data() as Post;

            // displayname を取得
            const userRef = doc(db, 'user', updatedData.user_id);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : { displayname: '匿名' };

            const updatedPost: Post = {
              id: updatedSnap.id,
              ...updatedData,
              displayname: userData.displayname,
              created_at: updatedData.created_at.toDate().toISOString(),
            };

            setPosts((prev) =>
              prev.map((post) => (post.id === postId ? updatedPost : post))
            );
          }
      } catch (error) {
        console.error('リアクションエラー:', error);
      }
    };

  useEffect(() => {
    fetchMyPosts(true);
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchMyPosts(true);
    }, [])
  );

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-orange-50 px-4 pt-4">
      <Text className="text-orange-800 text-xl font-bold mb-4">📝 自分の投稿一覧</Text>
      <TextInput
        placeholder="🔍 投稿内容で検索"
        placeholderTextColor="#9A3412"
        value={searchQuery}
        onChangeText={setSearchQuery}
        className="bg-white px-4 py-2 mb-4 rounded-xl border border-orange-300"
      />
      <FlatList
        data={filteredPosts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const thread = threadsMap.get(item.thread_id);
          return (
            <View className="bg-orange-100 px-4 py-3 mb-3 rounded-2xl shadow-sm">
              <View className="flex-row justify-between items-center mb-1">
                <Link href={`../thread/${thread?.slug ?? ''}`} asChild>
                  <TouchableOpacity disabled={!thread}>
                    <Text className="text-orange-700 text-sm font-semibold">
                      {thread?.title ?? 'スレッド情報なし'}
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
                <Text className="text-xs text-orange-600 text-right">
                  {new Date(item.created_at?.toDate?.() ?? item.created_at).toLocaleString()}
                </Text>
              <Text className="text-orange-800 text-sm mb-1">{item.content}</Text>
                 <View className="flex-row gap-4">
                   <ReactionButton
                     onPress={() => handleReaction(item.id, 'likes_uchimo')}
                     icon={<UchimoIcon width={20} height={20} color="#EA580C" />}
                     count={item.likes_uchimo}
                   />
                   <ReactionButton
                     onPress={() => handleReaction(item.id, 'likes_gambarou')}
                     icon={<GambarouIcon width={20} height={20} color="#EA580C" />}
                     count={item.likes_gambarou}
                   />
                 </View>
            </View>
          );
        }}
        onEndReached={() => fetchMyPosts()}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setPosts([]);
          setThreadsMap(new Map());
          setLastDoc(null);
          setHasMore(true);
          fetchMyPosts(true);
        }}
        ListFooterComponent={loading ? <ActivityIndicator className="mt-4" /> : null}
      />
    </View>
  );
}
