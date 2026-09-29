import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Camera, Images, PencilLine, QrCode, ReceiptText, X, Zap, ZapOff } from '@/components/icons';
import { PageTitle } from '@/components/page-title';
import { Button, goBack, IconButton, T, tap } from '@/components/ui';
import { useStore } from '@/data/store';
import { prepareBarcodeScanner } from '@/lib/barcode';
import { colors, radius, space } from '@/theme';

type Mode = 'receipt' | 'qr';

export default function Scan() {
  const { setDraft } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('receipt');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  // Web: QR scanning waits until its WebAssembly is pointed at our own copy (not the CDN).
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    prepareBarcodeScanner().then(() => setQrReady(true), () => setQrReady(true));
  }, []);
  const camera = useRef<CameraView>(null);

  const proceed = (uri?: string) => {
    setDraft({ photoUri: uri, receiptUri: uri });
    router.replace('/analyzing');
  };

  const capture = async () => {
    if (busy) return;
    tap();
    setBusy(true);
    try {
      const pic = await camera.current?.takePictureAsync({ quality: 0.6 });
      proceed(pic?.uri);
    } catch {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) proceed(res.assets[0].uri);
  };

  const manual = () => {
    setDraft({});
    router.replace('/confirm');
  };

  const granted = permission?.granted;

  return (
    <View style={styles.root}>
      <PageTitle title="Scan receipt" />
      <StatusBar style="light" />
      {granted ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={mode === 'qr' && qrReady ? { barcodeTypes: ['qr'] } : undefined}
          onBarcodeScanned={mode === 'qr' && qrReady && !busy ? () => { setBusy(true); proceed(); } : undefined}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <IconButton icon={X} dark label="Close" onPress={() => goBack()} />
          <T weight="semibold" size={17} color={colors.white}>
            {mode === 'qr' ? 'Scan QR Code' : 'Scan Receipt'}
          </T>
          <IconButton icon={torch ? Zap : ZapOff} dark label="Flash" onPress={() => setTorch((t) => !t)} />
        </View>
        <T size={14} color="#C9D2E8" style={{ textAlign: 'center', marginTop: space.sm }}>
          {mode === 'qr'
            ? 'Point at the QR code on your receipt or warranty card'
            : 'Fit the whole receipt inside the frame.\nMake sure the date and total are readable.'}
        </T>

        <View style={styles.frameWrap}>
          {granted ? (
            <View style={[styles.frame, mode === 'qr' && styles.frameQr]}>
              {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                <View key={c} style={[styles.corner, styles[c]]} />
              ))}
            </View>
          ) : (
            <View style={styles.permission}>
              <Camera size={40} color={colors.white} strokeWidth={1.6} />
              <T weight="semibold" size={17} color={colors.white} style={{ marginTop: space.md }}>
                Camera access needed
              </T>
              <T size={14} color="#C9D2E8" style={{ textAlign: 'center', marginVertical: space.md }}>
                Warrantyly uses the camera only to scan your receipts.
              </T>
              <Button label="Allow camera" compact onPress={requestPermission} />
            </View>
          )}
        </View>

        <View style={styles.segment}>
          {(
            [
              { key: 'qr', label: 'QR Code', icon: QrCode },
              { key: 'receipt', label: 'Receipt', icon: ReceiptText },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <Pressable key={key} onPress={() => setMode(key)} style={[styles.segBtn, active && styles.segActive]}>
                <Icon size={16} color={active ? colors.primary : colors.white} />
                <T weight="semibold" size={14} color={active ? colors.primary : colors.white}>
                  {label}
                </T>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.sideBtn} onPress={manual} accessibilityLabel="Add manually">
            <PencilLine size={22} color={colors.white} />
            <T size={11} color="#C9D2E8">
              Manual
            </T>
          </Pressable>
          <Pressable
            onPress={capture}
            disabled={!granted || mode === 'qr'}
            accessibilityLabel="Take photo"
            style={({ pressed }) => [styles.shutter, (!granted || mode === 'qr') && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.94 }] }]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable style={styles.sideBtn} onPress={pickFromGallery} accessibilityLabel="Upload from gallery">
            <Images size={22} color={colors.white} />
            <T size={11} color="#C9D2E8">
              Gallery
            </T>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const C = 34;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  dim: { backgroundColor: 'rgba(11,16,32,0.35)' },
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '86%', aspectRatio: 0.72 },
  frameQr: { width: '70%', aspectRatio: 1 },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#60A5FA' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 22 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 22 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 22 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 22 },
  permission: { alignItems: 'center', padding: space.xl, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.06)' },
  segment: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: 4, gap: 4 },
  segBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill },
  segActive: { backgroundColor: colors.white },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, paddingHorizontal: space.lg },
  sideBtn: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
});
