import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from './context/AuthContext';

// Inner component that has access to AuthContext
function AppNavigator() {
  const colorScheme = useColorScheme();
  const { loggedIn } = useAuth();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Hide splash screen when fonts are loaded
    if (loaded) {
      SplashScreen.hideAsync(); // Uncomment if using SplashScreen
    }
  }, [loaded]);


  useEffect(() => {
    if (loaded) {
          if (!loggedIn) {
            router.replace('/(auth)/login');
          }
    }

  }, [loggedIn]);
  // Keep splash visible until fonts are ready
  if (!loaded) {
    return null;
  }

   

  // Main app navigation for authenticated users
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
         <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Root layout that provides AuthContext
export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}