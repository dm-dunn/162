import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

// Color palette matching DashboardScreen design system
const C = {
  cream: '#F4E9D0',
  creamDark: '#E8D9B8',
  creamDeep: '#D4C098',
  parchment: '#F9F3E3',
  red: '#C41E3A',
  redDark: '#9E1730',
  navy: '#0D1B4F',
  navyMid: '#1A2F6E',
  gold: '#C4912A',
  goldLight: '#E8B84B',
  brown: '#3D2112',
  ink: '#1A0F08',
  inkMid: '#4A3728',
  inkLight: '#7A6050',
  white: '#FFFFFF',
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            MLB<Text style={styles.logoRed}>162</Text>
          </Text>
          <Text style={styles.subtitle}>Daily Picks Game</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor={C.inkLight}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={C.inkLight}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.btnText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Forgot your password? <Text style={styles.link}>Reset it</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.link}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.parchment },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48, fontWeight: '900', fontStyle: 'italic', color: C.navy, letterSpacing: -0.5 },
  logoRed: { color: C.red },
  subtitle: { color: C.inkLight, fontSize: 16, marginTop: 4 },
  card: {
    backgroundColor: C.parchment,
    borderWidth: 1,
    borderColor: C.creamDeep,
    borderRadius: 0,
    padding: 24,
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  title: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 20, textAlign: 'center', letterSpacing: -0.5 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 0, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: C.creamDeep,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.ink,
    marginBottom: 16,
    backgroundColor: C.cream,
  },
  btn: {
    backgroundColor: C.navy,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.gold, fontSize: 16, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { color: C.inkLight, fontSize: 14 },
  link: { color: C.red, fontWeight: '700' },
});
