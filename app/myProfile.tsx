import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const router = useRouter();
  const [displayname, setDisplayname] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'user', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDisplayname(data.displayname || '');
          setBio(data.bio || '');
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'user', user.uid);
      await updateDoc(docRef, {
        displayname,
        bio,
      });
      Alert.alert('プロフィールを更新しました');
    } catch (error) {
      Alert.alert('更新失敗', error.message);
    } finally {
      setLoading(false);
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-orange-50 px-6 py-8">

      <Text className="text-orange-800 font-semibold mb-2">表示名</Text>
      <View>
          <TextInput
            placeholder="ユーザー名"
            value={displayname}
            onChangeText={setDisplayname}
            className="border border-orange-300 w-full p-2 mb-2 rounded-md bg-white"
            placeholderTextColor="#9A3412"
            maxLength={20}
          />
          <Text className="text-right text-xs text-orange-500">{displayname.length}/20</Text>
      </View>

      <Text className="text-orange-800 font-semibold mb-2">自己紹介</Text>
      <View>
          <TextInput
            className="bg-white border border-orange-300 rounded-2xl p-4 mb-6 text-base h-32 text-start"
            value={bio}
            onChangeText={setBio}
            placeholder="自己紹介を入力してください"
            placeholderTextColor="#ccc"
            multiline
            maxLength={200}
          />
          <Text className="text-right text-xs text-orange-500">{bio.length}/200</Text>
      </View>

      <TouchableOpacity
        onPress={handleUpdateProfile}
        disabled={loading}
        className={`rounded-md px-4 py-2 w-full ${
          loading ? 'bg-orange-300' : 'bg-orange-500'
        }`}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? '保存中...' : '保存'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
