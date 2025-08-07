import { View, Text, FlatList, TouchableOpacity, TextInput , Platform} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../../lib/firebase';
import { Dropdown } from 'react-native-element-dropdown';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  limit,
  startAfter,
  runTransaction,
  increment,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import UchimoIcon from '../../assets/icons/uchimo.svg';
import GambarouIcon from '../../assets/icons/gambarou.svg';
import PostIcon from '../../assets/icons/post.svg';
import { ReactionButton } from '../../components/ReactionButton';
import { AnimatedBookmark } from '../../components/AnimatedBookmark';




export default function ThreadScreen() {
  const { slug } = useLocalSearchParams();
  const [posts, setPosts] = useState([]);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [sortType, setSortType] = useState('new');
  const [searchText, setSearchText] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const router = useRouter();
  const lastShown = useRef(0);

  const fetchPosts = async (reset = false) => {
    if (!thread) return;
    setLoading(true);
    try {
        let q = query(collection(db, 'posts'), where('thread_id', '==', thread.id));

        if (sortType === 'uchimo') {
          q = query(
            q,
            orderBy('user_id'),
            orderBy('likes_uchimo', 'desc'),
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc')
          );
        } else if (sortType === 'gambarou') {
          q = query(
            q,
            orderBy('user_id'),
            orderBy('likes_gambarou', 'desc'),
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc')
          );
        } else {
          q = query(
            q,
            orderBy('user_id'),
            orderBy('created_at', 'desc'),
            orderBy('__name__', 'desc')
          );
        }

      if (searchText) {
        const allSnap = await getDocs(q);
        const filtered = [];
        for (let docSnap of allSnap.docs) {
          const data = docSnap.data();
          const userSnap = await getDoc(doc(db, 'user', data.user_id));
          const name = userSnap.exists() ? userSnap.data().displayname : '匿名';
          if (
            data.content.includes(searchText) ||
            name.includes(searchText)
          ) {
            filtered.push({
              id: docSnap.id,
              ...data,
              displayname: name,
              created_at: data.created_at.toDate().toISOString(),
            });
          }
        }
        setPosts(filtered);
        setLastVisible(null);
        return;
      }

      const snap = await getDocs(reset ? query(q, limit(10)) : query(q, startAfter(lastVisible), limit(10)));
      const postList = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const userSnap = await getDoc(doc(db, 'user', data.user_id));
          const name = userSnap.exists() ? userSnap.data().displayname : '匿名';
          return {
            id: docSnap.id,
            ...data,
            displayname: name,
            created_at: data.created_at.toDate().toISOString(),
          };
        })
      );
      setPosts(prev => reset ? postList : [...prev, ...postList]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    } catch (e) {
      console.error('投稿取得エラー:', e);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
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
          // すでにリアクションしていれば削除（トグルオフ）
          const existing = snapshot.docs[0];
          await deleteDoc(doc(db, 'reactions', existing.id));

          await runTransaction(db, async (tx) => {
            tx.update(postRef, {
              [type]: increment(-1),
            });
          });
        } else {
          // リアクションしていなければ追加（トグルオン）
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
    const fetchThread = async () => {
      const q = query(collection(db, 'threads'), where('slug', '==', slug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setThread({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    };
    fetchThread();
  }, [slug]);

  useEffect(() => {
    if (thread) fetchPosts(true);
  }, [thread, sortType]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsub;
  }, []);

    }


  //フォーカス時に広告表示
  useFocusEffect(
    useCallback(() => {
//       showInterstitialAdOncePerMinute();
    }, [])
  );

  const loadMore = () => {
    if (!isFetchingMore && lastVisible) {
      setIsFetchingMore(true);
      fetchPosts();
    }
  };

  return (
    <View className="flex-1 bg-orange-50 px-4 py-2">

          {/* iOS・Android専用の要素 */}
          {Platform.OS === 'ios' || Platform.OS === 'android' ? (
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          ) : null}
         <TouchableOpacity
           onPress={() => router.replace(`../post/${slug}/new`)}
           className="flex-row items-center bg-orange-100 px-3 py-2 rounded-xl border border-orange-300 shadow-sm"
         >
           <PostIcon width={20} height={20} color="#EA580C" />
           <Text className="ml-2 text-orange-600 font-medium">投稿</Text>
         </TouchableOpacity>

           <TextInput
             value={searchText}
             onChangeText={text => setSearchText(text)}
             placeholder="投稿内容・ユーザー名で検索"
             onSubmitEditing={() => fetchPosts(true)}
             className="bg-white px-4 py-2 mb-4 rounded-xl border border-orange-300"
           />


      <Dropdown
        data={[
          { label: '新着順', value: 'new' },
          { label: 'うちも順', value: 'uchimo' },
          { label: '頑張ろう順', value: 'gambarou' },
        ]}
        labelField="label"
        valueField="value"
        value={sortType}
        onChange={item => setSortType(item.value)}
        style={{ backgroundColor: '#FFE6C6', borderRadius: 16, padding: 12, marginBottom: 16 }}
        itemTextStyle={{ color: '#7c2d12' }}
        selectedTextStyle={{ color: '#7c2d12', fontWeight: '600' }}
      />

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View className="bg-orange-100 p-4 mb-4 rounded-2xl shadow-sm border border-orange-200">
            <View className="flex-row justify-between mb-2">
              <TouchableOpacity
                onPress={() => router.replace(`../profile/${item.user_id}`)}
                className="flex-row items-center"
              >
                <Text className="text-orange-700 text-sm font-semibold">{item.displayname}</Text>
              </TouchableOpacity>
              <Text className="text-orange-500 text-xs">
                {new Date(item.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </Text>
            </View>
            <Text className="text-gray-800 text-base mb-3 leading-relaxed">{item.content}</Text>
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
        )}
        ListFooterComponent={isFetchingMore ? <Text className="text-center py-2">読み込み中...</Text> : null}
      />
    </View>
  );
}


