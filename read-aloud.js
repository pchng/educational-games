"use strict";

function createReadAloud(pauseFeedback) {
  const speech = window.speechSynthesis;
  const recordingsOnly = new Set();
  let active = null;

  // Ask for the list early so asynchronously loaded voices can be ready at the first tap.
  speech?.getVoices();

  function finish(session) {
    if (active !== session) return false;
    active = null;
    clearTimeout(session.startTimer);
    session.button.textContent = session.label;
    return true;
  }

  function stop(button) {
    const session = active;
    if (!session || (button && session.button !== button)) return;
    finish(session);
    if (session.utterance) speech.cancel();
    if (session.audio) {
      session.audio.pause();
      session.audio.currentTime = 0;
    }
  }

  function compatibleVoice() {
    const voices = speech?.getVoices().filter((voice) => voice.localService && /^en(-|$)/i.test(voice.lang)) ?? [];
    return voices.find((voice) => voice.default) ??
      voices.find((voice) => /^en-US$/i.test(voice.lang)) ??
      voices[0];
  }

  function playRecording(session, afterSpeech = false) {
    const audio = new Audio(session.recording);
    session.audio = audio;
    audio.addEventListener("ended", () => finish(session));
    const showPlaybackError = () => {
      if (finish(session)) {
        session.status.textContent = afterSpeech
          ? "Tap Read aloud again to play the recording."
          : "The recording couldn’t play. Tap Read aloud to try again.";
      }
    };
    audio.addEventListener("error", showPlaybackError);
    audio.play().catch(showPlaybackError);
  }

  function speechFailed(session, utterance, cancel = false) {
    if (active !== session || session.utterance !== utterance) return;
    session.utterance = null;
    clearTimeout(session.startTimer);
    if (cancel) speech.cancel();

    if (session.recording) {
      recordingsOnly.add(session.recording);
      playRecording(session, true);
    } else if (finish(session)) {
      session.status.textContent = "The voice couldn’t read this. Tap to try again.";
    }
  }

  function toggle(button, status, text, recording) {
    if (active?.button === button) {
      stop();
      return;
    }

    stop();
    status.textContent = "";
    const session = { button, status, label: button.textContent, recording };
    const voice = compatibleVoice();
    const canSpeak = voice && typeof window.SpeechSynthesisUtterance === "function";
    if (!canSpeak && !recording) {
      status.textContent = "This device needs an on-device English voice to read this aloud.";
      return;
    }

    active = session;
    button.textContent = "Stop reading";
    pauseFeedback();

    if (!canSpeak || recordingsOnly.has(recording)) {
      playRecording(session);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    session.utterance = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    utterance.onstart = () => clearTimeout(session.startTimer);
    utterance.onend = () => {
      if (session.utterance === utterance) finish(session);
    };
    utterance.onerror = () => speechFailed(session, utterance);
    session.startTimer = setTimeout(() => speechFailed(session, utterance, true), 4000);
    try {
      // The caller is a button tap. Starting here preserves Safari’s user activation.
      speech.speak(utterance);
    } catch {
      speechFailed(session, utterance);
    }
  }

  return { toggle, stop };
}
