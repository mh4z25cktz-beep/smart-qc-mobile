import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => { });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = '스마트 공정 품질 관리';

      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('name', name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      const setLink = (rel: string, href: string, extra?: Record<string, string>) => {
        let el = document.querySelector(`link[rel="${rel}"]`);
        if (!el) {
          el = document.createElement('link');
          el.setAttribute('rel', rel);
          document.head.appendChild(el);
        }
        el.setAttribute('href', href);
        if (extra) {
          Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
        }
      };

      setMeta('apple-mobile-web-app-capable', 'yes');
      setMeta('apple-mobile-web-app-status-bar-style', 'default');
      setMeta('apple-mobile-web-app-title', 'Smart QC');
      setMeta('theme-color', '#0f172a');
      setLink('manifest', '/manifest.json');
      setLink('apple-touch-icon', '/icon.png');
      setLink('icon', '/favicon.png', { type: 'image/png' });
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
