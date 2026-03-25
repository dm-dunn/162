import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { authService } from '../../services/auth';

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
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
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
  container: { flex: 1, backgroundColor: '#000080' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  logoRed: { color: '#FF0000' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000080', marginBottom: 8, textAlign: 'center' },
  hint: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14 },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20 },
  successText: { color: '#15803d', fontSize: 14, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  btn: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#6b7280', fontSize: 14 },
  link: { color: '#FF0000', fontWeight: '600' },
});
