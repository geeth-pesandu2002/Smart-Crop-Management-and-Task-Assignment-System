import React, { useState } from 'react';
import { View, Text, TextInput, Button, Platform, Image, Alert, Pressable, ScrollView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { createReport as dbCreateReport, updateReport } from '../db/reports';
import { createReport as apiCreateReport } from '../api/reports';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../api/uploads';
import { Audio } from 'expo-av';
import { API_URL } from '../config/env';
import { showToast } from '../components/Toast';


export default function ReportCreate({ navigation }: any) {
  const { t } = useTranslation();
  const [field, setField] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return Alert.alert(t('permission'), t('mediaLibraryPermission'));
      const res: any = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      // Support both legacy { cancelled, uri } and new { assets: [{ uri }] }
      const found = (res && res.uri) ? res.uri : (res && res.assets && res.assets[0] && res.assets[0].uri ? res.assets[0].uri : null);
      if (found) setPhotoUri(normalizeUri(found));
    } catch (e) {
      Alert.alert(t('imageError'), String(e));
    }
  }

  async function takePhoto() {
    try {
  const p = await ImagePicker.requestCameraPermissionsAsync();
  if (!p.granted) return Alert.alert(t('permission'), t('cameraPermission'));
      const res: any = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      const found = (res && res.uri) ? res.uri : (res && res.assets && res.assets[0] && res.assets[0].uri ? res.assets[0].uri : null);
      if (found) setPhotoUri(normalizeUri(found));
    } catch (e) {
      Alert.alert(t('cameraError'), String(e));
    }
  }

  function normalizeUri(uri: string) {
    if (!uri) return uri;
    // If already has a scheme or is a web URL, return as-is
    if (/^(https?:|file:|content:|data:)/i.test(uri)) return uri;
    // Some Android camera responses are plain paths; ensure file:// prefix
    return `file://${uri}`;
  }

  async function startRecording() {
    try {
  const p = await Audio.requestPermissionsAsync();
  if (!p.granted) return Alert.alert(t('permission'), t('microphonePermission'));
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      Alert.alert(t('recordError'), String(e));
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setVoiceUri(uri || null);
      setRecording(null);
      setIsRecording(false);
    } catch (e) {
      Alert.alert(t('stopError'), String(e));
    }
  }

  // Audio playback
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function playAudio() {
    try {
      if (!voiceUri) return;
      // unload previous
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const s = new Audio.Sound();
      await s.loadAsync({ uri: voiceUri });
      setSound(s);
      await s.playAsync();
      setIsPlaying(true);
      s.setOnPlaybackStatusUpdate((st: any) => {
        if (st.didJustFinish) {
          setIsPlaying(false);
          s.unloadAsync().catch(() => {});
          setSound(null);
        }
      });
    } catch (e) {
      Alert.alert(t('playError'), String(e));
    }
  }

  async function stopAudio() {
    try {
      if (!sound) return;
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    } catch (e) {
      // ignore
    }
  }

  async function onSave() {
    // Save locally
    const id = dbCreateReport({
      userId: 'local',
      userName: 'Me',
      field,
      date: new Date(date).getTime(),
      issueType,
      description,
    });

    // Try to push to server (best-effort)
    let uploaded = false;
    try {
      let photoUrl: string | undefined;
      let voiceUrl: string | undefined;
      if (photoUri) {
        const r = await uploadFile(photoUri);
        photoUrl = r.url;
        // update preview to uploaded path
        if (photoUrl && photoUrl.startsWith('/')) photoUrl = `${API_URL.replace(/\/+$/,'')}${photoUrl}`;
        // set photoUri to uploaded URL so preview shows uploaded image after save
        if (photoUrl) setPhotoUri(photoUrl);
      }
      if (voiceUri) {
        const r2 = await uploadFile(voiceUri);
        voiceUrl = r2.url;
        if (voiceUrl && voiceUrl.startsWith('/')) voiceUrl = `${API_URL.replace(/\/+$/,'')}${voiceUrl}`;
        if (voiceUrl) setVoiceUri(voiceUrl);
      }

      await apiCreateReport({ field, date, issueType, description, photoUrl, voiceUrl });
      uploaded = true;
    } catch (e: any) {
      console.warn('report upload failed:', e?.message || e);
      uploaded = false; // will sync later via background sync
    }

    // Show transient confirmation (Sinhala) and clear the form so user can create another report
    try {
      if (uploaded) {
        // mark local record as synced and attach server urls
        try { updateReport(id, { photoUrl: (photoUri as any) || null, voiceUrl: (voiceUri as any) || null, dirty: 0 }); } catch {}
        showToast(t('saveUploaded') || `${t('saveDone')}: ${t('saveDoneDetail')}`);
      } else {
        showToast(t('saveLocal') || (t('saveDoneDetail') || 'Saved locally — will sync when online'));
      }
    } catch {
      // fallback to alert if toast fails
      if (uploaded) Alert.alert(t('saveDone') || 'Saved', t('saveDoneDetail') || 'Saved — you can create another report.');
      else Alert.alert(t('saveDone') || 'Saved', t('saveDoneDetail') || 'Saved locally — will sync when online.');
    }

    // Stop any playing audio and unload
    try {
      if (sound) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        setSound(null);
        setIsPlaying(false);
      }
    } catch (e) {
      // ignore
    }

    // Reset form fields
    setField('');
    setDate(new Date().toISOString().slice(0, 10));
    setIssueType('');
    setDescription('');
    setPhotoUri(null);
    setVoiceUri(null);
    setRecording(null);
    setIsRecording(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#22c55e', paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{t('report')}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text>{t('field')}</Text>
            <TextInput value={field} onChangeText={setField} style={{ borderWidth: 1, marginBottom: 8 }} />

      <Text>{t('date')}</Text>
      <TextInput value={date} onChangeText={setDate} style={{ borderWidth: 1, marginBottom: 8 }} />

      <Text>{t('issueType')}</Text>
      <TextInput value={issueType} onChangeText={setIssueType} style={{ borderWidth: 1, marginBottom: 8 }} />

      <Text>{t('description')}</Text>
      <TextInput value={description} onChangeText={setDescription} style={{ borderWidth: 1, marginBottom: 8, height: 80 }} multiline />

      <Text>{t('photo')}</Text>
      {photoUri ? <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200, marginBottom: 8 }} /> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Pressable onPress={takePhoto} style={({ pressed }: { pressed: boolean }) => ({
          backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center'
        })}>
          <MaterialIcons name="photo-camera" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: '700' }}>{t('takePhoto')}</Text>
        </Pressable>
        <Pressable onPress={pickImage} style={({ pressed }: { pressed: boolean }) => ({
          backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center'
        })}>
          <MaterialIcons name="photo-library" size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: '700' }}>{t('pickPhoto')}</Text>
        </Pressable>
      </View>

      <Text>{t('voiceNote')}</Text>
  {voiceUri ? <Text style={{ marginBottom: 8 }}>{t('attached')}: {voiceUri.split('/').pop()}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Pressable onPress={isRecording ? stopRecording : startRecording} style={({ pressed }: { pressed: boolean }) => ({
          backgroundColor: isRecording ? '#dc2626' : '#22c55e', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center'
        })}>
          <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={18} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontWeight: '700' }}>{isRecording ? t('stop') : t('record')}</Text>
        </Pressable>
        {voiceUri ? (
          <Pressable onPress={isPlaying ? stopAudio : playAudio} style={({ pressed }: { pressed: boolean }) => ({
            backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center'
          })}>
            <MaterialIcons name={isPlaying ? 'stop' : 'play-arrow'} size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontWeight: '700' }}>{isPlaying ? t('stop') : t('play')}</Text>
          </Pressable>
        ) : null}
      </View>

            <Pressable onPress={onSave} style={({ pressed }: { pressed: boolean }) => ({ backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, opacity: pressed ? 0.85 : 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 })}>
              <MaterialIcons name="save" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: '700' }}>{t('saveReport')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
