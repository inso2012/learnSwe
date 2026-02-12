/**
 * Shared audio playback utility for word pronunciation
 */

let currentAudio = null;

export function playAudio(url) {
  if (!url) return;

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentAudio = new Audio(url);
  currentAudio.play().catch(() => {
    // Silently handle playback errors (e.g. network issues, missing file)
  });
}

export function createAudioButton(audioUrl) {
  if (!audioUrl) return null;

  const btn = document.createElement('button');
  btn.className = 'audio-btn';
  btn.textContent = '\u{1F50A}';
  btn.title = 'Listen to pronunciation';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.classList.add('audio-playing');
    playAudio(audioUrl);
    if (currentAudio) {
      currentAudio.addEventListener('ended', () => btn.classList.remove('audio-playing'), { once: true });
      currentAudio.addEventListener('error', () => btn.classList.remove('audio-playing'), { once: true });
    }
  });

  return btn;
}
