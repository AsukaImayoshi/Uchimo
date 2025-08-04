import React from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'expo-router';

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login'); // ルートに応じて適宜変更
    } catch (error: any) {
      Alert.alert('ログアウトエラー', error.message);
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout} className="mb-4 self-end" style={{ marginRight: 12 }} >
      <Text className="text-orange-800 font-medium">ログアウト</Text>
    </TouchableOpacity>
  );
};

export default LogoutButton;
