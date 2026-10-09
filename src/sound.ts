let audio: AudioContext | null = null;

/** A short synthesized note. Sound is optional, so any failure stays silent. */
export function tone(frequency: number, duration = 0.12): void {
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {
    /* Sound is optional; a silent visit remains complete. */
  }
}
