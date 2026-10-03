import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { showSuccess } from '../stores/alertStore';
import { BizoraMark } from '../components/illustrations/BrandAssets';
import { PinApprovalWaiting } from '../components/PinApprovalWaiting';
import { Palette } from '../constants/colors';

interface PinLoginScreenProps { onBack?: () => void; onSuccess?: () => void }
export function PinLoginScreen({ onBack, onSuccess }: PinLoginScreenProps) {
  const loginWithPin = useAuthStore(state => state.loginWithPin);
  const loading = useAuthStore(state => state.isLoading);
  const pending = useAuthStore(state => state.pendingPinApproval);
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const pinInput = useRef<TextInput>(null);
  const signIn = async () => {
    if (loading || submitting.current) return;
    if (!employeeId.trim() || !/^\d{4,6}$/.test(pin)) { setError('Enter your employee ID and a 4–6 digit PIN.'); return; }
    submitting.current = true; setError(null);
    try { await loginWithPin(employeeId.trim().toUpperCase(), pin); onSuccess?.(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign in. Try again.'); setPin(''); }
    finally { submitting.current = false; }
  };
  if (pending) return <PinApprovalWaiting onError={setError} />;
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Pressable accessibilityRole="button" onPress={onBack} disabled={loading} style={styles.back}><Feather name="arrow-left" size={19} color={Palette.brandPrimary} /><Text style={styles.backText}>Back to sign-in</Text></Pressable>
        <View style={styles.brand}><BizoraMark size={40} /></View>
        <Text accessibilityRole="header" style={styles.title}>Employee sign-in</Text>
        <Text style={styles.subtitle}>Use the employee ID and PIN your employer shared with you.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput accessibilityLabel="Employee ID" editable={!loading} value={employeeId} onChangeText={value => { setEmployeeId(value); setError(null); }} placeholder="e.g. EMP001" placeholderTextColor={Palette.textSecondary} autoCapitalize="characters" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => pinInput.current?.focus()} style={styles.input} />
          <Text style={styles.label}>PIN</Text>
          <View style={styles.pinRow}><TextInput ref={pinInput} accessibilityLabel="Employee PIN" editable={!loading} value={pin} onChangeText={value => { setPin(value.replace(/\D/g, '')); setError(null); }} placeholder="4–6 digits" placeholderTextColor={Palette.textSecondary} keyboardType="number-pad" secureTextEntry={!showPin} maxLength={6} onSubmitEditing={() => void signIn()} style={[styles.input, styles.pinInput]} /><Pressable accessibilityRole="button" accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'} onPress={() => setShowPin(value => !value)} style={styles.eye}><Feather name={showPin ? 'eye-off' : 'eye'} size={19} color={Palette.textSecondary} /></Pressable></View>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ busy: loading }} disabled={loading} onPress={signIn} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color={Palette.textInverse} /> : <Text style={styles.buttonText}>Sign in</Text>}</Pressable>
          <Pressable accessibilityRole="button" onPress={() => showSuccess('Ask your employer to reset your PIN from the Employees screen.', 'Forgot your PIN?')} style={styles.help}><Text style={styles.backText}>Forgot your PIN?</Text></Pressable>
        </View>
        <View style={styles.note}><Feather name="info" size={15} color={Palette.textSecondary} /><Text style={styles.caption}>Your employer may need to approve your first sign-in.</Text></View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas }, flex: { flex: 1 }, scroll: { flexGrow: 1, padding: 22 }, content: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, backText: { color: Palette.brandPrimary, fontSize: 14, fontWeight: '600' }, brand: { marginTop: 12 }, title: { color: Palette.textPrimary, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 }, subtitle: { color: Palette.textSecondary, fontSize: 15, lineHeight: 23 }, card: { backgroundColor: Palette.surface, padding: 20, borderWidth: 1, borderColor: Palette.border, borderRadius: 22, gap: 12 }, label: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600' }, input: { minHeight: 52, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: Palette.textPrimary }, pinRow: { flexDirection: 'row', alignItems: 'center' }, pinInput: { flex: 1, paddingRight: 52 }, eye: { position: 'absolute', right: 0, width: 48, height: 52, justifyContent: 'center', alignItems: 'center' }, button: { backgroundColor: Palette.brandPrimary, minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 6 }, buttonText: { color: Palette.textInverse, fontSize: 16, fontWeight: '600' }, help: { alignItems: 'center', paddingVertical: 12 }, note: { flexDirection: 'row', alignItems: 'center', gap: 8 }, caption: { flex: 1, color: Palette.textSecondary, fontSize: 12, lineHeight: 18 }, error: { color: Palette.danger, backgroundColor: Palette.dangerTint, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 20 }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.7 },
});
