/**
 * Audio Module - Text-to-Speech
 * Uses Web Speech API as primary, with server-side TTS adapter as fallback
 */

export type Accent = "us" | "uk";

function getBrowserVoice(accent: Accent): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  const langCode = accent === "uk" ? "en-GB" : "en-US";
  return (
    voices.find((v) => v.lang === langCode && !v.localService) ??
    voices.find((v) => v.lang === langCode) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export function speakWord(
  text: string,
  accent: Accent = "us",
  rate = 0.9
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = accent === "uk" ? "en-GB" : "en-US";

    const setVoice = () => {
      const voice = getBrowserVoice(accent);
      if (voice) utterance.voice = voice;
    };

    setVoice();

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(e.error));

    window.speechSynthesis.speak(utterance);
  });
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    }
  });
}
