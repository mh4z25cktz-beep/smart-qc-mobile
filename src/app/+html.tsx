import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML configuration for static web rendering (Expo Router).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>스마트 공정 품질 관리</title>

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />

        {/* iOS Web App Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Smart QC" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Theme Color */}
        <meta name="theme-color" content="#0f172a" />

        {/* Disable body scrolling on web similar to mobile */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
