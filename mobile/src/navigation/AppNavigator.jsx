import { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import AuthNavigator from './AuthNavigator';
import AppTabNavigator from './AppTabNavigator';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import { leagueService } from '../services/leagues';
import { preloadLogos } from '../services/logoCache';

const Stack = createNativeStackNavigator();
const PENDING_INVITE_KEY = 'pendingInviteCode';

// Extract invite code from both URL formats:
//   mlb162://join?code=ABCD1234   (custom scheme)
//   https://mlb162.app/join/ABCD1234  (universal link)
function extractInviteCode(url) {
    if (!url) return null;
    try {
        const parsed = Linking.parse(url);
        if (parsed.queryParams?.code) return parsed.queryParams.code;
        const match = url.match(/\/join\/([A-Za-z0-9]+)/);
        if (match) return match[1];
    } catch (_) {}
    return null;
}

export default function AppNavigator() {
    const { user, loading } = useAuth();
    const navigationRef = useRef(null);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // Kick off logo caching in the background as soon as the navigator mounts.
    // Fire-and-forget: logos load silently; CDN URLs are used as fallback until ready.
    useEffect(() => { preloadLogos(); }, []);

    const handleDeepLink = async (url) => {
        const code = extractInviteCode(url);
        if (!code) return;

        if (userRef.current) {
            // Logged in — join immediately then navigate to the league
            try {
                const data = await leagueService.joinWithCode(code);
                navigationRef.current?.navigate('App', {
                    screen: 'Leagues',
                    params: { screen: 'LeagueDetail', params: { leagueId: data.leagueId } },
                });
            } catch (_) {
                // Already a member or invalid — just go to Leagues tab
                navigationRef.current?.navigate('App', { screen: 'Leagues' });
            }
        } else {
            // Not logged in — save code, will process after login
            await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
        }
    };

    // Handle links that arrive while the app is open
    useEffect(() => {
        const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
        return () => subscription.remove();
    }, []);

    // Handle cold-start links (app was closed when the link was tapped)
    useEffect(() => {
        Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    }, []);

    // After login: process any invite code that was saved before auth
    useEffect(() => {
        if (!user) return;
        const processPending = async () => {
            const code = await AsyncStorage.getItem(PENDING_INVITE_KEY);
            if (!code) return;
            await AsyncStorage.removeItem(PENDING_INVITE_KEY);
            try {
                const data = await leagueService.joinWithCode(code);
                setTimeout(() => {
                    navigationRef.current?.navigate('App', {
                        screen: 'Leagues',
                        params: { screen: 'LeagueDetail', params: { leagueId: data.leagueId } },
                    });
                }, 300);
            } catch (_) {}
        };
        processPending();
    }, [user]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000080' }}>
                <ActivityIndicator size="large" color="#FF0000" />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user?.mustChangePassword ? (
                    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                ) : user ? (
                    <Stack.Screen name="App" component={AppTabNavigator} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
