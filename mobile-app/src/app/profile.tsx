import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronLeft, ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { panelStyle, TableBackdrop } from '../components/Backdrop';
import { Crown } from '../components/Decor';
import { Lbl, Pill } from '../components/LobbyPanes';
import { useStage } from '../game/Stage';
import { useLayout } from '../hooks/useLayout';
import { initialsOf, photoUri, useSession } from '../net/session';
import { useSettings } from '../state/settings';
import { colors, fonts } from '../theme';

/** Same set as the server gives new players at random. */
const EMOJI = ['😀', '😎', '🤠', '🥳', '😺', '🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🦄', '🐲', '👑', '🎩', '🌟', '🔥', '🍀', '🎯', '🃏'];

/**
 * Profile: shown once after TAP TO PLAY for new players (?first=1), and from the lobby to edit.
 * Name, the automatic player ID, and a photo (gallery or camera) or an emoji.
 */
export default function Profile() {
  const { first } = useLocalSearchParams<{ first?: string }>();
  const isFirst = first === '1';
  const L = useLayout();
  const st = useStage(L);
  const { z } = st;
  const { tap } = useSettings();
  const { me, saveProfile } = useSession();

  const startName = isFirst && me?.name?.startsWith('Player ') ? '' : me?.name ?? '';
  const [name, setName] = useState(startName);
  const [emoji, setEmoji] = useState(me?.avatar ?? EMOJI[0]);
  // photo: undefined = unchanged, string = new base64 JPEG, null = remove
  const [photo, setPhoto] = useState<{ b64: string; uri: string } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shownPhoto = photo === undefined ? photoUri(me?.photoUrl) : photo?.uri ?? null;
  const preview = { name: name || 'You', initials: initialsOf(name || 'You'), color: me?.color ?? '#1F6B4A' };

  const pick = async (from: 'library' | 'camera') => {
    tap(); setError(null);
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setError('Allow camera access in your phone settings to take a photo.'); return; }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
      const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      // shrink to a small square JPEG before it leaves the phone
      const ref = await ImageManipulator.manipulate(res.assets[0].uri).resize({ width: 256, height: 256 }).renderAsync();
      const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
      if (!out.base64) { setError('That photo could not be used. Try another one.'); return; }
      setPhoto({ b64: out.base64.replace(/^data:image\/\w+;base64,/, ''), uri: out.uri });
    } catch {
      setError('That photo could not be used. Try another one.');
    }
  };

  const save = async () => {
    const n = name.trim();
    if (n.length < 2) { setError('Enter a name with at least 2 letters.'); return; }
    setBusy(true); setError(null);
    const err = await saveProfile({
      name: n,
      avatar: emoji,
      ...(photo ? { photo: photo.b64 } : photo === null ? { removePhoto: true } : {}),
      profileDone: true,
    });
    setBusy(false);
    if (err) { setError(err); return; }
    tap('success');
    if (isFirst) router.replace('/lobby');
    else router.back();
  };

  const AV = 112;
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0906' }}>
      <TableBackdrop flat={0.7} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}
          style={[panelStyle, { position: 'absolute', left: st.x(70), top: st.y(26), width: z(820), height: z(380), borderRadius: z(22), paddingVertical: z(16), paddingHorizontal: z(22), gap: z(12) }]}>
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: z(10) }}>
            {isFirst ? <Crown width={z(28)} /> : (
              <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}
                style={{ width: z(36), height: z(36), minWidth: 40, minHeight: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={z(18)} color={colors.gold} />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(18), color: '#fff' }}>{isFirst ? 'Create your profile' : 'Edit profile'}</Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: z(11), color: '#B5BFD3' }}>
                {isFirst ? 'Pick a name and a photo or emoji · other players see them at the table' : 'Change your name, photo or emoji'}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, flexDirection: 'row', gap: z(18) }}>
            {/* photo column */}
            <Animated.View entering={FadeInDown.delay(80)} style={{ width: z(200), alignItems: 'center', gap: z(10) }}>
              <View style={{ width: z(AV), height: z(AV), borderRadius: z(AV / 2), backgroundColor: '#5A2E10', borderWidth: Math.max(3, z(4)), borderColor: '#C98A3E', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
                <View style={{ width: z(AV - 14), height: z(AV - 14), borderRadius: z(AV), overflow: 'hidden', backgroundColor: preview.color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.gold }}>
                  {shownPhoto ? (
                    <Image source={{ uri: shownPhoto }} style={{ width: '100%', height: '100%' }} accessibilityLabel="Your profile photo" />
                  ) : (
                    <Text accessibilityLabel={`Your emoji ${emoji}`} style={{ fontSize: z(54), lineHeight: z(68) }}>{emoji}</Text>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: z(8) }}>
                <IconPill z={z} label="Gallery" onPress={() => pick('library')}><ImagePlus size={z(15)} color={colors.goldBright} /></IconPill>
                {Platform.OS !== 'web' && <IconPill z={z} label="Camera" onPress={() => pick('camera')}><Camera size={z(15)} color={colors.goldBright} /></IconPill>}
              </View>
              {shownPhoto ? (
                <Pressable onPress={() => { tap(); setPhoto(null); }} accessibilityRole="button" hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: z(5), minHeight: 36 }}>
                  <Trash2 size={z(13)} color="#E9A0A0" />
                  <Text style={{ fontFamily: fonts.uiBold, fontSize: z(11), color: '#E9A0A0' }}>Remove photo · use emoji</Text>
                </Pressable>
              ) : (
                <Text style={{ fontFamily: fonts.ui, fontSize: z(10), color: '#B5BFD3', textAlign: 'center' }}>No photo? Your emoji is shown instead.</Text>
              )}
            </Animated.View>

            {/* details column */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: z(9), paddingBottom: z(6) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: z(12) }}>
                <View style={{ flex: 1.4, gap: z(5) }}>
                  <Lbl z={z}>YOUR NAME</Lbl>
                  <TextInput
                    value={name}
                    onChangeText={(t) => { setName(t.slice(0, 20)); setError(null); }}
                    placeholder="Enter your name"
                    placeholderTextColor="#6B7380"
                    autoFocus={isFirst}
                    maxLength={20}
                    returnKeyType="done"
                    accessibilityLabel="Your name"
                    style={{ height: z(40), minHeight: 44, borderRadius: z(10), borderWidth: 1.5, borderColor: name.trim().length >= 2 ? colors.gold : 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', fontFamily: fonts.uiBold, fontSize: z(15), paddingHorizontal: z(12) }}
                  />
                </View>
                <View style={{ flex: 1, gap: z(5) }}>
                  <Lbl z={z}>PLAYER ID</Lbl>
                  <View accessible accessibilityLabel={`Player ID ${me?.code ?? ''}, made for you automatically`}
                    style={{ height: z(40), minHeight: 44, borderRadius: z(10), borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', paddingHorizontal: z(12) }}>
                    <Text style={{ fontFamily: fonts.display, fontSize: z(15), letterSpacing: z(1.5), color: colors.goldBright }}>{me?.code ?? '…'}</Text>
                  </View>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.ui, fontSize: z(10), color: '#B5BFD3', marginTop: -z(4) }}>Your player ID is made automatically. Share it with support if you need help.</Text>

              <Lbl z={z}>OR PICK AN EMOJI</Lbl>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: z(6) }} accessibilityRole="radiogroup">
                {EMOJI.map((e) => {
                  const on = e === emoji && !shownPhoto;
                  return (
                    <Pressable key={e} onPress={() => { tap(); setEmoji(e); if (shownPhoto) setPhoto(null); }} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Emoji ${e}`}
                      style={{ width: z(38), height: z(38), minWidth: 36, minHeight: 36, borderRadius: z(19), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? colors.gold : 'rgba(255,255,255,0.12)', backgroundColor: on ? 'rgba(232,198,106,0.18)' : 'rgba(255,255,255,0.04)' }}>
                      <Text style={{ fontSize: z(20), lineHeight: z(26) }}>{e}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {error && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.uiBold, fontSize: z(12), color: colors.loss }}>{error}</Text>}
              <Pill z={z} label={isFirst ? "LET'S PLAY" : 'SAVE'} busy={busy} disabled={name.trim().length < 2} onPress={save} style={{ alignSelf: 'flex-start', width: z(220), marginTop: z(2) }} />
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

function IconPill({ z, label, onPress, children }: { z: (n: number) => number; label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Choose photo from ${label.toLowerCase()}`}
      style={({ pressed }) => ({ height: z(34), minHeight: 40, paddingHorizontal: z(12), borderRadius: z(17), borderWidth: 1.5, borderColor: colors.gold, flexDirection: 'row', alignItems: 'center', gap: z(6), transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {children}
      <Text style={{ fontFamily: fonts.uiHeavy, fontSize: z(11), color: colors.goldBright }}>{label}</Text>
    </Pressable>
  );
}
