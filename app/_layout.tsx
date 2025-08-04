import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useLocalSearchParams, useRouter, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Button } from 'react-native';
import "@/global.css"
import 'react-native-reanimated'
import 'react-native-gesture-handler'
import LogoutButton from '../components/LogoutButton';
// import { NativeWindStyleSheet } from 'nativewind';
//
// NativeWindStyleSheet.setOutput({ default: "native" });

export const OrangeTheme = {
...DefaultTheme,
colors: {
  ...DefaultTheme.colors,
  primary: '#f97316',
  background: '#fff7ed',
  card: '#fdba74',
  text: '#7c2d12',
  border: '#fb923c',
  notification: '#ea580c',
},
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { slug } = useLocalSearchParams();
  const router = useRouter();
    const handleLogout = async () => {
      try {
        await signOut(auth);
        router.replace('../login');
      } catch (error: any) {
        Alert.alert('ログアウトエラー', error.message);
      }
    };



  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : OrangeTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{title: '',
              detachPreviousScreen: true,
               headerRight: () => (
                   <LogoutButton  />
                   ),
               }}
           />
          <Stack.Screen name="login" options={{title: 'ログイン',}}/>
          <Stack.Screen name="signup" options={{title: '新規登録',}}/>
          <Stack.Screen name="profile" options={{title: 'プロフィール編集',}}/>
          <Stack.Screen
            name="post/[slug]/new"
            options={{
              title: '投稿作成',
              headerLeft: () => (
                <Button
                  title="←"
                  onPress={() => router.back()}
                  color={OrangeTheme.colors.card}
                />
              ),
            }}
          />
          <Stack.Screen name="thread/[slug]" options={{title: '',
                            headerLeft: () => (
                              <Button
                                title="←"
                                onPress={() => router.replace("/")}
                                color={OrangeTheme.colors.card}
                              />
                              ),
                            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

