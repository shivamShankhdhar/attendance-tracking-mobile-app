import React, { useRef, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/colors';
import { parseWorkplaceInvite, savePendingJoin } from '../services/workplaceLinks';
import { StoreEnvelopeIllustration } from './illustrations/IllustrationAssets';
import { QRScannerBoundingBox, type BarcodeBounds } from './QRScannerBoundingBox';
import { AdBanner } from './AdBanner';

interface Props { visible: boolean; onClose: () => void; onJoinedSuccess: (workplaceId: string) => void }
export function JoinWorkplaceModal(props: Props) {
  return props.visible ? <JoinEntry onClose={props.onClose} /> : null;
}

function JoinEntry({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [qrBounds, setQrBounds] = useState<BarcodeBounds | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const opening = useRef(false);

  const open = async (input: string) => {
    if (opening.current) return;
    const token = parseWorkplaceInvite(input);
    if (!token) {
      setError('Use the workplace invitation link or 6-8 digit code shared by your admin.');
      setScanning(false);
      setQrBounds(null);
      return;
    }
    opening.current = true;
    try {
      await savePendingJoin(token);
      onClose();
      router.push({ pathname: '/join', params: { token } });
    } catch {
      setError('Unable to save the invitation. Try again.');
      opening.current = false;
      setQrBounds(null);
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1 }} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.artworkStage}>
              <View style={styles.ambientCircle} />
              <StoreEnvelopeIllustration size={96} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Feather name="x" size={20} color={Palette.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.title}>Join a workplace</Text>
          <Text style={styles.body}>
            Enter the 6 to 8 character invitation code (e.g. 509-250) or scan the workplace QR code.
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingTop: 10 }}>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            {scanning && permission?.granted ? (
              <View style={styles.camera}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={(result: any) => {
                    if (result.bounds) setQrBounds(result.bounds);
                    void open(result.data);
                  }}
                />
                <QRScannerBoundingBox
                  active={scanning}
                  bounds={qrBounds}
                  accentColor="#06B6D4"
                  defaultSize={160}
                />
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const result = permission?.granted ? permission : await requestPermission();
                if (result.granted) {
                  setError('');
                  setScanning(true);
                } else {
                  setError('Allow camera access to scan, or paste the invitation code below.');
                }
              }}
              style={styles.scanButton}
            >
              <Feather name="camera" size={18} color={Palette.brandPrimary} />
              <Text style={styles.scanButtonText}>Scan workplace QR</Text>
            </Pressable>

            <TextInput
              accessibilityLabel="Invitation link or workplace code"
              value={value}
              onChangeText={setValue}
              placeholder="e.g. 509-250 or invite link"
              placeholderTextColor={Palette.textSecondary}
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable
              accessibilityRole="button"
              disabled={!value.trim()}
              onPress={() => void open(value)}
              style={[styles.primary, !value.trim() && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryText}>View workplace</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push('/my-join-requests');
              }}
              style={styles.secondary}
            >
              <Text style={styles.link}>My join requests</Text>
            </Pressable>
          </ScrollView>
          <AdBanner position="bottom" safeBottom />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  artworkStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 104,
  },
  ambientCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EDF3DF',
  },
  close: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B2210',
    textAlign: 'center',
    marginBottom: 4,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: Palette.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EDF3DF',
    borderRadius: 14,
    paddingVertical: 14,
  },
  scanButtonText: {
    color: '#3B451B',
    fontWeight: '700',
    fontSize: 14,
  },
  primary: {
    backgroundColor: Palette.brandPrimary,
    paddingVertical: 15,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Palette.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    minHeight: 40,
  },
  link: { fontSize: 13.5, fontWeight: '600', color: Palette.brandPrimary },
  camera: { height: 220, borderRadius: 16, overflow: 'hidden' },
  error: { color: Palette.danger, fontSize: 13, textAlign: 'center' },
});

