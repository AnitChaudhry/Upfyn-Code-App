import { useState, useRef, useCallback } from 'react';
import { authenticatedFetch } from '../utils/api';

const VOICE_ENABLED_KEY = 'upfynai-voice-output-enabled';
const VOICE_ID_KEY = 'upfynai-voice-id';
const MAX_TTS_LENGTH = 2000; // Skip TTS for very long texts

export function useVoiceOutput() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() =>
    localStorage.getItem(VOICE_ENABLED_KEY) === 'true'
  );
  const [selectedVoice, setSelectedVoice] = useState(() =>
    localStorage.getItem(VOICE_ID_KEY) || 'en-US-AriaNeural'
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!voiceEnabled || !text) return;
    if (text.length > MAX_TTS_LENGTH) return; // Skip very long responses

    try {
      setIsPlaying(true);
      const res = await authenticatedFetch('/api/voice/tts', {
        method: 'POST',
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        urlRef.current = null;
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        urlRef.current = null;
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, [voiceEnabled, selectedVoice]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem(VOICE_ENABLED_KEY, String(next));
    if (!next) stop();
  }, [voiceEnabled, stop]);

  const changeVoice = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem(VOICE_ID_KEY, voiceId);
  }, []);

  return { speak, stop, isPlaying, voiceEnabled, toggleVoice, selectedVoice, changeVoice };
}
