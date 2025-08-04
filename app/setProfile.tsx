import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
// import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [displayname, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('アクセス権限が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  // Firebase Storage を使用しないため、画像アップロード部分はコメントアウト
  // const uploadAvatar = async (uid: string) => {
  //   if (!avatar) return null;
  //   const response = await fetch(avatar);
  //   const blob = await response.blob();
  //   const imageRef = ref(storage, `avatars/${uid}.jpg`);
  //   await uploadBytes(imageRef, blob);
  //   return await getDownloadURL(imageRef);
  // };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // 画像アップロードなしで保存
        await setDoc(doc(db, 'user', user.uid), {
          displayname,
          bio,
          email: user.email,            // ユーザーのメールアドレス
          is_banned: false,             // 初期状態でBANされていない
          last_login: new Date(),       // 現在時刻をログイン時刻として記録
          last_posted: new Date(),      // 初期状態では同時に記録
          photo_url: "",                // 空の画像URL（後で変更）
          post_count: 0,                // 初期投稿数
          reaction_count: 0,            // 初期リアクション数
          created_at: new Date(),       // アカウント作成時刻
        });
      Alert.alert('プロフィールを保存しました');
      router.replace('/'); // ホームへ遷移
    } catch (error: any) {
      Alert.alert('保存失敗', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-orange-50 px-4">
      <Text className="text-2xl mb-4 font-bold text-orange-800">プロフィール設定</Text>

      <TouchableOpacity onPress={pickImage} className="mb-4">
        {avatar ? (
          <Image source={{ uri: avatar }} className="w-24 h-24 rounded-full" />
        ) : (
          <View className="w-24 h-24 rounded-full bg-orange-200 justify-center items-center">
            <Text className="text-orange-800">画像選択</Text>
          </View>
        )}
      </TouchableOpacity>
      <View>
          <TextInput
            placeholder="ユーザー名"
            value={displayname}
            onChangeText={setUsername}
            className="border border-orange-300 w-full p-2 mb-2 rounded-md bg-white"
            placeholderTextColor="#9A3412"
            maxLength={20}
          />
          <Text className="text-right text-xs text-orange-500">{displayname.length}/20</Text>
      </View>
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
        onPress={handleSaveProfile}
        disabled={loading}
        className={`rounded-md px-4 py-2 w-full ${
          loading ? 'bg-orange-300' : 'bg-orange-500'
        }`}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? '保存中...' : '保存してはじめる'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
