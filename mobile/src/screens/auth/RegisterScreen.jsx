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
  green: '#2E6B3E',
  white: '#FFFFFF',
};

const COLOR_OPTIONS = [
  { name: 'Navy', value: C.navy },
  { name: 'Red', value: C.red },
  { name: 'Green', value: C.green },
  { name: 'Gold', value: C.gold },
  { name: 'Brown', value: C.brown },
  { name: 'Ink', value: C.ink },
  { name: 'Cream', value: C.cream },
  { name: 'Parchment', value: C.parchment }
];

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [color, setColor] = useState(C.navy);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const { register } = useAuth();

  const handleRegister = async () => {
    setError('');

    if (!username || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password, color);
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <View style={styles.card}>
          <Text style={styles.emailIcon}>✉️</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.successText}>
            We sent a verification link to <Text style={{ fontWeight: 'bold' }}>{email}</Text>.
          </Text>
          <Text style={[styles.successText, { marginTop: 8 }]}>
            Click the link to verify your account and start making picks.
          </Text>
          <TouchableOpacity style={styles.btn} activeOpacity={0.8}>
            <Text style={styles.btnText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>
            Join MLB<Text style={styles.logoRed}>162</Text>
          </Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Choose a username"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="your@email.com"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Leaderboard Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setColor(opt.value)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: opt.value },
                  color === opt.value && styles.colorSwatchSelected
                ]}
                activeOpacity={0.8}
              >
                {color === opt.value && (
                  <Text style={styles.colorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.colorHint}>Choose a color for your bar on the leaderboard</Text>

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Min 6 characters"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repeat your password"
            placeholderTextColor="#9ca3af"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.link}>Login here</Text>
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
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 32, fontWeight: '900', fontStyle: 'italic', color: C.navy, letterSpacing: -0.5 },
  logoRed: { color: C.red },
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
  title: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  emailIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  successText: { color: C.ink, textAlign: 'center', fontSize: 15 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 0, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: C.creamDeep,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
    marginBottom: 16,
    backgroundColor: C.cream,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderColor: C.navy,
    borderWidth: 2.5,
  },
  colorCheck: { color: C.white, fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  colorHint: { color: C.inkLight, fontSize: 12, marginBottom: 16 },
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
