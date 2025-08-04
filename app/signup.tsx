import { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { router } from 'expo-router';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      Alert.alert('確認メールを送信しました', '続いてプロフィールを設定してください');
      router.replace('/signup_profile');
    } catch (error: any) {
      Alert.alert('登録失敗', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-orange-50 px-4">
      <Text className="text-2xl mb-4 font-bold text-orange-800">新規登録</Text>
      <TextInput
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        className="border border-orange-300 w-full p-2 mb-2 rounded-md bg-white"
        placeholderTextColor="#9A3412"
      />
      <TextInput
        placeholder="パスワード（6文字以上）"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-orange-300 w-full p-2 mb-4 rounded-md bg-white"
        placeholderTextColor="#9A3412"
      />
      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        className={`rounded-md px-4 py-2 w-full ${
          loading ? 'bg-orange-300' : 'bg-orange-500'
        }`}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? '登録中...' : '登録'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/login')} className="mt-4">
        <Text className="text-orange-600 underline">
          すでにアカウントをお持ちですか？ログイン
        </Text>
      </TouchableOpacity>
    </View>
  );
}
