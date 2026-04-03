import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

// Color palette matching the app-wide design system
const C = {
  cream: '#F4E9D0',
  creamDark: '#E8D9B8',
  creamDeep: '#D4C098',
  parchment: '#F9F3E3',
  red: '#C41E3A',
  navy: '#0D1B4F',
  gold: '#C4912A',
  ink: '#1A0F08',
  inkLight: '#7A6050',
  white: '#FFFFFF',
};

export default function ChangePasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { changePassword } = useAuth();

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await changePassword(newPassword);
      // AppNavigator automatically transitions to the main app once mustChangePassword is false
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
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
        <View style={styles.header}>
          <Text style={styles.logo}>
            MLB<Text style={styles.logoRed}>162</Text>
          </Text>
          <Text style={styles.subtitle}>Daily Picks Game</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.description}>
            You signed in with a temporary password. Please create a permanent password to continue.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="#9ca3af"
            autoFocus
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter your password"
            placeholderTextColor="#9ca3af"
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
              <Text style={styles.btnText}>Set Password</Text>
            )}
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
  title: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: C.navy, marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  description: { color: C.inkLight, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
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
});
