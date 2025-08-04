// app/post/new.tsx
import { TouchableOpacity, View, Text, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit, increment } from 'firebase/firestore';
import dayjs from 'dayjs';

export default function NewPost() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  // スレッドIDをslugから取得
  useEffect(() => {
    const getThreadId = async () => {
      const q = query(
        collection(db, 'threads'),
        where('slug', '==', slug),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('スレッドが見つかりません');
        router.replace('/');
        return;
      }

      setThreadId(snapshot.docs[0].id);
    };

    if (slug) getThreadId();
  }, [slug]);

  // 投稿済みかチェック
  useEffect(() => {
    const checkIfPosted = async () => {
      if (!userId || !threadId) return;

      const q = query(
        collection(db, 'posts'),
        where('user_id', '==', userId),
        where('thread_id', '==', threadId),
        where('created_at', '>=', dayjs().startOf('day').toDate())
      );

      const snapshot = await getDocs(q);
      setHasPostedToday(!snapshot.empty);
      setLoading(false);
    };

    if (threadId && userId) checkIfPosted();
  }, [threadId, userId]);

    const handleSubmit = async () => {
      if (!content.trim() || !threadId || !userId) {
        Alert.alert('入力が不足しています');
        return;
      }

      try {
        // 投稿を追加
        await addDoc(collection(db, 'posts'), {
          user_id: userId,
          thread_id: threadId,
          content,
          likes_uchimo: 0,
          likes_gambarou: 0,
          created_at: new Date(),
        });

        // ✅ postCount をインクリメント
        const threadRef = doc(db, 'threads', threadId);
        await updateDoc(threadRef, {
          postCount: increment(1),
        });

        // ユーザーの最終投稿日を更新
        const userRef = doc(db, 'user', userId);
        await updateDoc(userRef, {
          last_posted: dayjs().startOf('day').toDate(),
        });

        Alert.alert('投稿が完了しました！');
        router.replace(`/thread/${slug}`);
      } catch (err) {
        Alert.alert('投稿に失敗しました', String(err));
      }
    };

  if (loading || !threadId) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <Text className="text-orange-800 text-lg font-semibold">確認中...</Text>
      </View>
    );
  }

  if (hasPostedToday) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50 p-4">
        <Text className="text-center text-lg font-semibold text-orange-800">
          本日はこのスレッドにすでに投稿しています。
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50 p-4">
      <Text className="mb-2 text-lg font-semibold text-orange-800">今日の悩みを投稿</Text>
        <View>
          <TextInput
            className="h-40 border border-orange-300 bg-white p-2 rounded-xl mb-2 text-base text-gray-800"
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="ここに悩みを書いてください"
            placeholderTextColor="#D97706"
            maxLength={600}
          />
          <Text className="text-right text-xs text-orange-500">{content.length}/600</Text>
        </View>
      <TouchableOpacity
        className="bg-orange-500 rounded-xl py-3 items-center"
        onPress={handleSubmit}
      >
        <Text className="text-white font-bold text-base">投稿する</Text>
      </TouchableOpacity>
    </View>
  );
}
