import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../../../lib/firebase';
import { useLocalSearchParams, Link } from 'expo-router';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { AnimatedBookmark } from '../../../components/AnimatedBookmark';
import { useProtectedRoute } from '../../../hooks/useProtectedRoute';

type Thread = { id: string; slug: string; title: string; tags: string[]; postCount: number; };

export default function MoreFavoriteThreadsScreen() {
  useProtectedRoute();
  const { user_id } = useLocalSearchParams();
  const otherUid = user_id
  console.log('otherUid:', otherUid);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [favoriteThreadIds, setFavoriteThreadIds] = useState<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchFavoriteThreads = async (isRefresh = false) => {
    if (loading || !otherUid || (!isRefresh && !hasMore)) return;

    setLoading(true);
    try {
      const favQuery = query(
        collection(db, 'favorites'),
        where('userId', '==', otherUid),
        orderBy('created_at', 'desc'),
        ...(lastDoc && !isRefresh ? [startAfter(lastDoc)] : []),
        limit(10)
      );

      const favSnap = await getDocs(favQuery);
      if (favSnap.empty) {
        setHasMore(false);
        return;
      }

      const newLastDoc = favSnap.docs[favSnap.docs.length - 1];
      if (isRefresh) {
        setLastDoc(newLastDoc);
      } else {
        setLastDoc(prev => newLastDoc);
      }

      const threadIds = favSnap.docs.map(doc => doc.data().threadId).filter(Boolean);
      const idsSet = new Set(threadIds);

      const threadSnap = await getDocs(
        query(collection(db, 'threads'), where('__name__', 'in', threadIds))
      );

      const threadMap = new Map(
        threadSnap.docs.map(doc => [
          doc.id,
          {
            id: doc.id,
            slug: doc.data().slug,
            title: doc.data().title,
            tags: doc.data().tags || [],
            postCount: doc.data().postCount || 0,
          } as Thread,
        ])
      );

      const threadsBatch: Thread[] = threadIds.map(tid =>
        threadMap.get(tid) || { id: tid, slug: '', title: '不明', tags: [], postCount: 0 }
      );

      setThreads(prev => isRefresh ? threadsBatch : [...prev, ...threadsBatch]);
      setFavoriteThreadIds(prev => {
        const merged = new Set(prev);
        threadIds.forEach(id => merged.add(id));
        return merged;
      });
    } catch (e) {
      console.error('fetchFavoriteThreads error:', e);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const toggleFavorite = async (threadId: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const favRef = doc(db, 'favorites', `${uid}_${threadId}`);

    const isFavorited = favoriteThreadIds.has(threadId);

    setFavoriteThreadIds(prev => {
      const newSet = new Set(prev);
      isFavorited ? newSet.delete(threadId) : newSet.add(threadId);
      return newSet;
    });

    try {
      if (isFavorited) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          userId: uid,
          threadId,
          created_at: new Date(),
        });
      }
    } catch (error) {
      console.error('toggleFavorite error:', error);
    }
  };

  useEffect(() => {
    fetchFavoriteThreads(true);
  }, [otherUid]);

  useFocusEffect(
    useCallback(() => {
      fetchFavoriteThreads(true);
    }, [])
  );

  const filteredThreads = threads.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View className="flex-1 bg-orange-50 px-4 pt-4">
      <Text className="text-orange-800 text-xl font-bold mb-4">🌟 お気に入りスレッド</Text>
      <TextInput
        placeholder="🔍 スレッド検索"
        placeholderTextColor="#9A3412"
        value={searchQuery}
        onChangeText={setSearchQuery}
        className="bg-white px-4 py-2 mb-4 rounded-xl border border-orange-300"
      />
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-orange-100 px-4 py-3 mb-3 rounded-2xl shadow-sm">
            <View className="flex-row justify-between items-center mb-1">
              <Link href={`../thread/${item.slug}`} asChild>
                <TouchableOpacity>
                  <Text className="text-orange-700 text-sm font-semibold">{item.title}</Text>
                </TouchableOpacity>
              </Link>
              <Pressable onPress={() => toggleFavorite(item.id)}>
                <AnimatedBookmark isActive={favoriteThreadIds.has(item.id)} />
              </Pressable>
            </View>
            <View className="flex-row flex-wrap mb-1">
              {item.tags.map((tag, index) => (
                <Text
                  key={index}
                  className="text-xs text-orange-700 mr-2 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-300"
                >
                  #{tag}
                </Text>
              ))}
            </View>
            <Text className="text-xs text-orange-600 text-right">投稿数: {item.postCount}</Text>
          </View>
        )}
        onEndReached={() => fetchFavoriteThreads()}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setThreads([]);
          setLastDoc(null);
          setHasMore(true);
          fetchFavoriteThreads(true);
        }}
        ListFooterComponent={loading ? <ActivityIndicator className="mt-4" /> : null}
      />
    </View>
  );
}
