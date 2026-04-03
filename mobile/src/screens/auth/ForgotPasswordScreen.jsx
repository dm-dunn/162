import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { authService } from '../../services/auth';

// Color palette matching the app-wide design system
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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
          {sent ? (
            <>
              <Text style={styles.title}>Check Your Email</Text>
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  If an account with that email exists, a password reset link has been sent. Check your inbox.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.hint}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

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
                placeholder="Enter your email"
                placeholderTextColor={C.inkLight}
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={C.gold} />
                ) : (
                  <Text style={styles.btnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
                <Text style={styles.linkText}>
                  Back to <Text style={styles.link}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  title: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  hint: { color: C.inkLight, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 0, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14 },
  successBox: { backgroundColor: C.cream, borderColor: C.gold, borderWidth: 1, borderRadius: 0, padding: 12, marginBottom: 20 },
  successText: { color: C.ink, fontSize: 14, textAlign: 'center' },
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
