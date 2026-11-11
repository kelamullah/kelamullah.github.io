/**
 * Kelâmullah - Audio Player Module
 * Handles verse recitation playback, continuous surah listening,
 * reciter switching, and active verse auto-scrolling.
 */

const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mişâri Raşid el-Afâsi', bitrate: '128 kbps' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdülbasit Abdüssamed', bitrate: '192 kbps' },
  { id: 'Maher_AlMuaiqly_64kbps', name: 'Mâhir el-Muaykılî', bitrate: '64 kbps' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'Ebu Bekir eş-Şâtırî', bitrate: '128 kbps' },
  { id: 'Ghamadi_40kbps', name: 'Saad el-Gamdi', bitrate: '40 kbps' }
];

class AudioController {
  constructor() {
    this.audio = new Audio();
    this.reciterId = localStorage.getItem('kelamullah_reciter') || 'Alafasy_128kbps';
    this.isPlaying = false;
    this.currentSurahId = null;
    this.currentVerseNumber = null;
    this.surahVerses = [];
    this.autoplayNext = true;
    this.playbackRate = 1;

    this.onVerseChangeCallbacks = [];
    this.onStateChangeCallbacks = [];

    this._setupAudioListeners();
    this._setupMediaSession();
  }

  _setupAudioListeners() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this._notifyStateChange();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this._notifyStateChange();
    });

    this.audio.addEventListener('ended', () => {
      if (this.autoplayNext) {
        this.next();
      } else {
        this.isPlaying = false;
        this._notifyStateChange();
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn("Audio playback error:", e);
      window.app?.showToast?.("Ses dosyası yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
      this.isPlaying = false;
      this._notifyStateChange();
    });
  }

  getReciters() {
    return RECITERS;
  }

  setReciter(reciterId) {
    this.reciterId = reciterId;
    localStorage.setItem('kelamullah_reciter', reciterId);
    if (this.isPlaying && this.currentSurahId && this.currentVerseNumber) {
      this.playVerse(this.currentSurahId, this.currentVerseNumber, this.surahVerses);
    } else {
      this._notifyStateChange();
    }
  }

  getReciterName() {
    const r = RECITERS.find(item => item.id === this.reciterId);
    return r ? r.name : 'Mişâri Raşid el-Afâsi';
  }

  getAudioUrl(surahId, verseNumber) {
    const s = String(surahId).padStart(3, '0');
    const v = String(verseNumber).padStart(3, '0');
    return `https://everyayah.com/data/${this.reciterId}/${s}${v}.mp3`;
  }

  playVerse(surahId, verseNumber, surahVerses = null) {
    this.currentSurahId = Number(surahId);
    this.currentVerseNumber = Number(verseNumber);
    if (surahVerses) this.surahVerses = surahVerses;

    const url = this.getAudioUrl(this.currentSurahId, this.currentVerseNumber);
    this.audio.src = url;
    this.audio.playbackRate = this.playbackRate;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn("Autoplay was prevented or error:", err);
      });
    }

    this._notifyVerseChange();
    this._notifyStateChange();
  }

  togglePlay() {
    if (this.audio.src && (this.isPlaying || this.audio.paused)) {
      if (this.audio.paused) {
        this.audio.play();
      } else {
        this.audio.pause();
      }
    } else if (this.currentSurahId && this.currentVerseNumber) {
      this.playVerse(this.currentSurahId, this.currentVerseNumber, this.surahVerses);
    }
  }

  next() {
    if (!this.currentSurahId || !this.currentVerseNumber) return;

    if (!this.surahVerses || this.surahVerses.length === 0) {
      const s = window.dataService?.getSurah?.(this.currentSurahId);
      if (s && s.verses) this.surahVerses = s.verses;
    }

    if (this.surahVerses && this.surahVerses.length > 0) {
      const currentIndex = this.surahVerses.findIndex(v => v.verseNumber === this.currentVerseNumber);
      if (currentIndex !== -1 && currentIndex + 1 < this.surahVerses.length) {
        const nextVerse = this.surahVerses[currentIndex + 1];
        this.playVerse(this.currentSurahId, nextVerse.verseNumber, this.surahVerses);
        return;
      }
    }

    // End of surah
    this.stop();
  }

  prev() {
    if (!this.currentSurahId || !this.currentVerseNumber) return;

    if (!this.surahVerses || this.surahVerses.length === 0) {
      const s = window.dataService?.getSurah?.(this.currentSurahId);
      if (s && s.verses) this.surahVerses = s.verses;
    }

    if (this.surahVerses && this.surahVerses.length > 0) {
      const currentIndex = this.surahVerses.findIndex(v => v.verseNumber === this.currentVerseNumber);
      if (currentIndex > 0) {
        const prevVerse = this.surahVerses[currentIndex - 1];
        this.playVerse(this.currentSurahId, prevVerse.verseNumber, this.surahVerses);
      }
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.currentVerseNumber = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
    this._notifyVerseChange();
    this._notifyStateChange();
  }

  setSpeed(speed) {
    this.playbackRate = speed;
    this.audio.playbackRate = speed;
    this._notifyStateChange();
  }

  toggleSpeed() {
    const speeds = [1, 1.25, 0.75];
    const currentIndex = speeds.indexOf(this.playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    this.setSpeed(nextSpeed);
    return nextSpeed;
  }

  onVerseChange(callback) {
    this.onVerseChangeCallbacks.push(callback);
  }

  onStateChange(callback) {
    this.onStateChangeCallbacks.push(callback);
  }

  _notifyVerseChange() {
    this.onVerseChangeCallbacks.forEach(cb => cb(this.currentSurahId, this.currentVerseNumber));
  }

  _notifyStateChange() {
    this._updateMediaSession();
    this.onStateChangeCallbacks.forEach(cb => cb({
      isPlaying: this.isPlaying,
      surahId: this.currentSurahId,
      verseNumber: this.currentVerseNumber,
      playbackRate: this.playbackRate,
      reciterName: this.getReciterName()
    }));
  }

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    } catch (e) {
      console.warn("MediaSession action handler error:", e);
    }
  }

  _updateMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const surah = window.dataService?.surahMap?.get(this.currentSurahId);
    const surahTitle = surah ? `${surah.name} Suresi` : `Sure ${this.currentSurahId || ''}`;
    const verseTitle = this.currentVerseNumber ? `${surahTitle}, ${this.currentVerseNumber}. Âyet` : surahTitle;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: verseTitle,
      artist: this.getReciterName(),
      album: "Kelâmullah - Kur'an-ı Kerim",
      artwork: [
        { src: 'assets/logo.jpg', sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : (this.currentSurahId ? 'paused' : 'none');
  }
}

window.audioController = new AudioController();
