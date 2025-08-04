import { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("ログイン成功:", user.email);
      router.replace('/');
    } catch (error: any) {
      console.error(error);
      Alert.alert('ログイン失敗', error.message || '不明なエラーが発生しました');
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-orange-50 p-4">
      <Text className="text-2xl mb-4 font-bold text-orange-800">ログイン</Text>
      <TextInput
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        className="border border-orange-300 w-full p-2 mb-2 rounded-md bg-white"
        placeholderTextColor="#9A3412"
      />
      <TextInput
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-orange-300 w-full p-2 mb-4 rounded-md bg-white"
        placeholderTextColor="#9A3412"
      />
      <TouchableOpacity
        onPress={handleLogin}
        className="bg-orange-500 rounded-md px-4 py-2 w-full"
      >
        <Text className="text-white text-center font-semibold">ログイン</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/signup')} className="mt-4">
        <Text className="text-orange-600 underline">
          アカウントをお持ちでない方はこちら
        </Text>
      </TouchableOpacity>
    </View>
  );
}
