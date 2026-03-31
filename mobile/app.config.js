const IS_DEV = process.env.EXPO_PUBLIC_APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'MLB162 Dev' : 'MLB162',
    slug: 'mlb162',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    sdkVersion: '54.0.0',
    scheme: IS_DEV ? 'mlb162dev' : 'mlb162',
    updates: {
      url: 'https://u.expo.dev/2a00edff-02e7-4951-b32d-bd352bd4885c',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F9F3E3',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.mlb162.app.dev' : 'com.mlb162.app',
      associatedDomains: ['applinks:mlb162.app'],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: IS_DEV ? 'com.mlb162.app.dev' : 'com.mlb162.app',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'mlb162.app', pathPrefix: '/join' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-updates',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#0D1B4F',
          defaultChannel: 'default',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '2a00edff-02e7-4951-b32d-bd352bd4885c',
      },
    },
  },
};
