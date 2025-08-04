import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../../lib/firebase';
import { Link } from 'expo-router';
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
  addDoc,
  runTransaction,
  increment,
  setDoc,
} from 'firebase/firestore';
import { Dropdown } from 'react-native-element-dropdown';
import { ReactionButton } from '../../components/ReactionButton';
import UchimoIcon from '../../assets/icons/uchimo.svg';
import GambarouIcon from '../../assets/icons/gambarou.svg';
import { AnimatedBookmark } from '../../components/AnimatedBookmark';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';
import { addThreads } from '../../scripts/newThreads';

type Thread = { id: string; slug: string; title: string; tags: string[]; postCount: number; };
type Post = {
  id: string; content: string; likes_uchimo: number; likes_gambarou: number;
  created_at: string; user_id: string; displayname: string; thread_title: string;
};

export default function FavoriteThreadsScreen() {
  useProtectedRoute();
  const user = auth.currentUser!;

  /** プロフィール **/
  const [displayname, setDisplayname] = useState('');
  const [bio, setBio] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

/** お気に入りスレッド **/
const [threads, setThreads] = useState<Thread[]>([]);
const [favoriteThreadIds, setFavoriteThreadIds] = useState<Set<string>>(new Set());
const [favLoading, setFavLoading] = useState(false);
const [searchQuery, setSearchQuery] = useState('');

/** 自分のポスト **/
const [posts, setPosts] = useState<Post[]>([]);
const [postLoading, setPostLoading] = useState(false);
const [sortType, setSortType] = useState<'new' | 'uchimo' | 'gambarou'>('new');
const dropData = [
  { label: '新着順', value: 'new' },
  { label: 'うちも順', value: 'uchimo' },
  { label: '頑張ろう順', value: 'gambarou' },
];

  /** プロフィール取得 **/
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'user', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setDisplayname(d.displayname || '');
          setBio(d.bio || '');
        }
      } finally { setLoadingProfile(false); }
    })();
  }, [user.uid]);

  /** お気に入りスレッド初回・追加取得 **/
  /** お気に入りスレッド初回取得のみ（最大5件） **/
  const fetchFavoriteThreads = async () => {
    if (favLoading || !user?.uid) return;
    setFavLoading(true);

    try {
      const favSnap = await getDocs(
        query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          orderBy('created_at', 'desc'),
          limit(6)
        )
      );

      if (favSnap.empty) return;

      const threadIds = favSnap.docs.map(doc => doc.data().threadId).filter(Boolean);
      const idsSet = new Set(threadIds);

      if (threadIds.length === 0) return;

      const threadSnap = await getDocs(
        query(
          collection(db, 'threads'),
          where('__name__', 'in', threadIds)
        )
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
        threadMap.get(tid) || {
          id: tid,
          slug: '',
          title: '不明',
          tags: [],
          postCount: 0,
        }
      );

      setThreads(threadsBatch);
      setFavoriteThreadIds(idsSet);
    } catch (e) {
      console.error('fetchFavoriteThreads error:', e);
    } finally {
      setFavLoading(false);
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

  /** 自分のポスト取得（最大5件） **/
  const fetchPosts = async () => {
    if (postLoading || !user?.uid) return;
    setPostLoading(true);

    try {
      const q = query(
        collection(db, 'posts'),
        where('user_id', '==', user.uid),
        ...(sortType === 'uchimo'
          ? [orderBy('likes_uchimo', 'desc'), orderBy('created_at', 'desc')]
          : sortType === 'gambarou'
            ? [orderBy('likes_gambarou', 'desc'), orderBy('created_at', 'desc')]
            : [orderBy('created_at', 'desc')]
        ),
        limit(6)
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const postsBatch: Post[] = await Promise.all(snap.docs.map(async docSnap => {
        const d = docSnap.data();
        const usnap = await getDoc(doc(db, 'user', d.user_id));
        const tsnap = await getDoc(doc(db, 'threads', d.thread_id));
        return {
          id: docSnap.id,
          content: d.content,
          likes_uchimo: d.likes_uchimo,
          likes_gambarou: d.likes_gambarou,
          created_at: d.created_at.toDate().toISOString(),
          user_id: d.user_id,
          displayname: usnap.exists() ? usnap.data()!.displayname : '匿名',
          thread_title: tsnap.exists() ? tsnap.data()!.title : '不明なスレッド',
        };
      }));

      setPosts(postsBatch);
    } catch (e) {
      console.error('fetchPosts error:', e);
    } finally {
      setPostLoading(false);
    }
  };


    //初回フェッチ（お気に入り）
    useEffect(() => {
      if (user?.uid) fetchFavoriteThreads();
    }, [user?.uid]);

    // 初回フェッチ（投稿）
    useEffect(() => {
      if (user?.uid) fetchPosts();
    }, [user?.uid]);

   //スレッド追加（開発用）
//     useEffect(() => {
//       if (user?.uid) addThreads();
//     }, [user?.uid]);



    // ソート変更時に再フェッチ
    useEffect(() => {
      if (!user?.uid) return;
      fetchFavoriteThreads()
      fetchPosts();
    }, [sortType]);

    //フォーカス時に再フェッチ
    useFocusEffect(
      useCallback(() => {
        if (user?.uid) {
          fetchFavoriteThreads();
          fetchPosts();
        }
      }, [user?.uid])
    );




  if (loadingProfile) {
    return <View className="flex-1 justify-center items-center"><ActivityIndicator /></View>;
  }

  // 検索フィルター適用
  const filteredThreads = threads.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* プロフィール */}
        <View className="bg-orange-50 px-4 py-4 mb-4 rounded-2xl shadow-md flex-row items-center">
          <View className="flex-1">
            <Text className="text-orange-800 text-xl font-bold">{displayname}</Text>
            <Text className="text-orange-700 text-sm">{bio}</Text>
          </View>
          <Link href="../myProfile" asChild>
            <TouchableOpacity className="bg-orange-200 px-3 py-1 rounded-full">
              <Text className="text-orange-700 text-xs font-semibold">編集</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* お気に入りスレッド */}
        <View className="bg-orange-100 px-4 py-4 mb-4 rounded-2xl shadow-md">
          <Text className="text-orange-800 text-lg font-semibold mb-3">🌟 お気に入りスレッド</Text>
          <TextInput
            placeholder="🔍 スレッド検索"
            placeholderTextColor="#9A3412"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="bg-white px-4 py-2 mb-4 rounded-xl border border-orange-300"
          />
          {filteredThreads.slice(0, 5).map((item) => (
            <View key={item.id} className="bg-orange-200 px-4 py-3 mb-3 rounded-2xl shadow-sm">
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
                {item.tags?.map((tag, index) => (
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
          ))}
          {filteredThreads.length > 5 && (
            <Link href="../more-favorite-threads" asChild>
              <TouchableOpacity className="mt-2 px-4 py-2 bg-orange-300 rounded-full items-center">
                <Text className="text-orange-800 font-semibold">もっと見る</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

         {/* 自分のポスト */}
         <View className="bg-orange-100 p-4 mb-4 rounded-2xl shadow-sm border border-orange-200">
           <Text className="text-orange-800 text-lg font-semibold mb-3">📝 自分の投稿</Text>

           {posts.slice(0, 5).map((item) => (
             <View key={item.id} className="bg-orange-50 p-4 mb-4 rounded-2xl shadow-sm border border-orange-100">
               <View className="mb-2">
                 <Text className="text-orange-700 text-xs font-semibold">{item.thread_title}</Text>
                 <View className="flex-row justify-between items-center">
                   <Text className="text-orange-600 text-xs font-semibold">{item.displayname}</Text>
                   <Text className="text-orange-600 text-xs font-semibold">
                     {new Date(item.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                   </Text>
                 </View>
               </View>

               <Text className="text-gray-800 text-base leading-relaxed mb-3">{item.content}</Text>

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
           ))}

           {posts.length > 5 && (
             <Link href="../more-my-posts" asChild>
               <TouchableOpacity className="mt-3 px-4 py-2 bg-orange-200 rounded-full items-center shadow-sm">
                 <Text className="text-orange-800 font-semibold">もっと見る</Text>
               </TouchableOpacity>
             </Link>
           )}
         </View>
      </ScrollView>
  );
}
