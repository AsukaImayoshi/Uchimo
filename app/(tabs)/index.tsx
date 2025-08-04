import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { db, auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, setDoc, deleteDoc, DocumentData, QueryDocumentSnapshot  } from 'firebase/firestore';
import { Link, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { AnimatedBookmark } from '../../components/AnimatedBookmark';
import { Pressable } from 'react-native';

type Thread = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  postCount: number;
};

export default function HomeScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'created' | 'postCount'>('created');
  const [favoriteThreadIds, setFavoriteThreadIds] = useState<Set<string>>(new Set());
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const THREADS_PER_PAGE = 20

  const router = useRouter();
  useProtectedRoute();

  // 検索＆フィルター関数（クライアント側）
  const filterThreads = useCallback(
    (rawThreads: Thread[], query: string): Thread[] => {
      if (!query.trim()) return rawThreads;

      const lower = query.toLowerCase();
      return rawThreads.filter(
        (thread) =>
          thread.title.toLowerCase().includes(lower) ||
          thread.tags?.some((tag) => tag.toLowerCase().includes(lower))
      );
    },
    []
  );

  // 初回取得
  const fetchInitialThreads = async () => {
    setLoadingThreads(true);
    try {
      const q = query(
        collection(db, 'threads'),
        orderBy(sortType === 'created' ? 'created_at' : 'postCount', 'desc'),
        limit(THREADS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      const fetched = docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Thread, 'id'>),
      }));

      setThreads(fetched);
      setLastVisible(docs.length > 0 ? docs[docs.length - 1] : null);
      setFilteredThreads(filterThreads(fetched, searchQuery));
    } catch (error) {
      console.error('初期スレッド取得失敗:', error);
    } finally {
      setLoadingThreads(false);
    }
  };

  // 追加取得
  const fetchMoreThreads = async () => {
    if (loadingMore || !lastVisible) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'threads'),
        orderBy(sortType === 'created' ? 'created_at' : 'postCount', 'desc'),
        startAfter(lastVisible),
        limit(THREADS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      const newThreads = docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Thread, 'id'>),
      }));

      const combinedThreads = [...threads, ...newThreads];
      setThreads(combinedThreads);
      setFilteredThreads(filterThreads(combinedThreads, searchQuery));
      setLastVisible(docs.length > 0 ? docs[docs.length - 1] : null);
    } catch (error) {
      console.error('追加スレッド取得失敗:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchFavorites = async () => {
    if (!auth.currentUser) {
      setLoadingFavorites(false);
      return;
    }
    setLoadingFavorites(true);
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const favIds = new Set(snapshot.docs.map(doc => doc.data().threadId));
      setFavoriteThreadIds(favIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

    // 並び替え時に初期化
    useEffect(() => {
      fetchInitialThreads();
    }, [sortType]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchFavorites();
      } else {
        setFavoriteThreadIds(new Set());
        setLoadingFavorites(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (auth.currentUser) {
        fetchFavorites();
      }
    }, [])
  );

  const loading = useMemo(() => loadingThreads || loadingFavorites, [loadingThreads, loadingFavorites]);

    // 検索文字変更時にフィルター
    useEffect(() => {
      setFilteredThreads(filterThreads(threads, searchQuery));
    }, [searchQuery, threads, favoriteThreadIds]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>読み込み中...</Text>
      </View>
    );
  }

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
      console.error('Error toggling favorite:', error);
      // 失敗したらロールバック
      setFavoriteThreadIds(prev => {
        const newSet = new Set(prev);
        isFavorited ? newSet.add(threadId) : newSet.delete(threadId);
        return newSet;
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-orange-50"
    >
      <FlatList
      data={filteredThreads}
      keyExtractor={(item) => item.id}
      onEndReached={fetchMoreThreads}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <>

          <TextInput
            placeholder="スレッド検索（タイトル・タグ）"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="bg-white px-4 py-2 mb-4 rounded-xl border border-orange-300 shadow-sm text-orange-900"
          />


            {/* 並び替え */}
            <View className="flex-row mb-4">
              <TouchableOpacity
                onPress={() => setSortType('created')}
                className={`mr-2 px-3 py-1 rounded-full ${
                  sortType === 'created' ? 'bg-orange-400' : 'bg-orange-200'
                }`}
              >
                <Text
                  className={`${
                    sortType === 'postCount' ? 'text-white font-semibold' : 'text-orange-900'
                  }`}
                >
                  新着順
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSortType('postCount')}
                className={`px-3 py-1 rounded-full ${
                  sortType === 'postCount' ? 'bg-orange-400' : 'bg-orange-200'
                }`}
              >
                <Text
                  className={`${
                    sortType === 'created' ? 'text-white font-semibold' : 'text-orange-900'
                  }`}
                >
                    投稿数順
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View className="bg-orange-200 px-4 py-3 mb-3 rounded-2xl shadow-sm border border-orange-300">
            <View className="flex-row justify-between items-center">
              <Link href={`../thread/${item.slug}`} asChild>
                <TouchableOpacity>
                  <Text className="text-orange-800 font-medium">{item.title}</Text>
                </TouchableOpacity>
              </Link>

              <Pressable onPress={() => toggleFavorite(item.id)}>
                <AnimatedBookmark isActive={favoriteThreadIds.has(item.id)} />
              </Pressable>
            </View>

            {/* タグや投稿数など */}
            <View className="flex-row flex-wrap mt-1">
              {item.tags?.map((tag, index) => (
                <Text
                  key={index}
                  className="text-xs text-orange-600 mr-2 bg-orange-100 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </Text>
              ))}
            </View>

            <Text className="text-xs text-orange-600 text-right">投稿数: {item.postCount}</Text>
          </View>
        )}
         ListFooterComponent={
           loadingMore ? (
             <Text className="text-center text-orange-500 my-2">さらに読み込み中...</Text>
           ) : null
         }
         ListEmptyComponent={
           <Text className="text-orange-600 text-center mt-10">スレッドが見つかりません。</Text>
         }
         keyboardShouldPersistTaps="handled"
       />
    </KeyboardAvoidingView>
  );
}
