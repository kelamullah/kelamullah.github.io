/**
 * Kelâmullah - Reader View Module
 * Renders surah verses, manages verse actions (copy, share, bookmark, play),
 * and handles view modes and typography settings.
 */

class ReaderView {
  constructor() {
    this.currentSurah = null;
    this.currentVerses = [];
    this.container = null;
    this.viewMode = localStorage.getItem('kelamullah_view_mode') || 'both'; // both, arabic-only, meal-only
    this.bookmarks = JSON.parse(localStorage.getItem('kelamullah_bookmarks') || '[]');

    this._setupAudioListener();
  }

  _setupAudioListener() {
    window.audioController.onVerseChange((surahId, verseNumber) => {
      this.highlightPlayingVerse(surahId, verseNumber);
    });
  }

  init(containerElement) {
    this.container = containerElement;
  }

  isBookmarked(surahId, verseNumber) {
    return this.bookmarks.some(b => b.surahId === surahId && b.verseNumber === verseNumber);
  }

  toggleBookmark(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const index = this.bookmarks.findIndex(b => b.surahId === sId && b.verseNumber === vNo);

    const surah = window.dataService.surahMap.get(sId);
    const verse = this.currentVerses.find(v => v.verseNumber === vNo);

    if (index > -1) {
      this.bookmarks.splice(index, 1);
      window.app.showToast("Yer imi kaldırıldı");
    } else {
      this.bookmarks.unshift({
        surahId: sId,
        verseNumber: vNo,
        surahName: surah ? surah.name : `Sure ${sId}`,
        mealSnippet: verse ? (verse.mealClean || verse.meal).slice(0, 100) + '...' : '',
        date: new Date().toLocaleDateString('tr-TR')
      });
      window.app.showToast("Ayet yer imlerine kaydedildi");
    }

    localStorage.setItem('kelamullah_bookmarks', JSON.stringify(this.bookmarks));
    this.updateBookmarkButtonState(sId, vNo);
  }

  updateBookmarkButtonState(surahId, verseNumber) {
    const btn = document.querySelector(`.bookmark-btn[data-surah="${surahId}"][data-ayah="${verseNumber}"]`);
    if (btn) {
      const active = this.isBookmarked(surahId, verseNumber);
      btn.classList.toggle('active', active);
      btn.title = active ? "Yer imini kaldır" : "Yer imlerine ekle";
    }
  }

  copyVerse(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const surah = window.dataService.surahMap.get(sId);
    const verse = this.currentVerses.find(v => v.verseNumber === vNo);

    if (!verse || !surah) return;

    const copyText = `${verse.arabic}\n\n${verse.mealClean || verse.meal}\n\n(${surah.name} Suresi, ${vNo}. Âyet)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(() => {
        window.app.showToast("Ayet panoya kopyalandı");
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.app.showToast("Ayet panoya kopyalandı");
    }
  }

  shareVerse(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const surah = window.dataService.surahMap.get(sId);
    const verse = this.currentVerses.find(v => v.verseNumber === vNo);

    if (!verse || !surah) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}#/sure/${sId}/ayet/${vNo}`;
    const shareData = {
      title: `${surah.name} Suresi, ${vNo}. Âyet - Kelâmullah`,
      text: `${verse.arabic}\n\n${verse.mealClean || verse.meal}\n(${surah.name} Suresi, ${vNo}. Âyet)`,
      url: shareUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(err => {
        if (err.name !== 'AbortError') {
          this.copyLink(shareUrl);
        }
      });
    } else {
      this.copyLink(shareUrl);
    }
  }

  copyLink(url) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        window.app.showToast("Ayet bağlantısı kopyalandı");
      });
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    localStorage.setItem('kelamullah_view_mode', mode);

    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) {
      readerContainer.classList.remove('view-mode-arabic-only', 'view-mode-meal-only');
      if (mode === 'arabic-only') {
        readerContainer.classList.add('view-mode-arabic-only');
      } else if (mode === 'meal-only') {
        readerContainer.classList.add('view-mode-meal-only');
      }
    }
  }

  highlightPlayingVerse(surahId, verseNumber) {
    document.querySelectorAll('.verse-card.playing').forEach(el => el.classList.remove('playing'));

    if (this.currentSurah && this.currentSurah.surahId === surahId && verseNumber) {
      const activeCard = document.getElementById(`verse-${surahId}-${verseNumber}`);
      if (activeCard) {
        activeCard.classList.add('playing');
        // Smooth scroll if not visible
        const rect = activeCard.getBoundingClientRect();
        if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  renderSurah(surahId, targetAyah = null) {
    const { surah, verses } = window.dataService.getSurah(surahId);
    if (!surah) {
      if (this.container) {
        this.container.innerHTML = `
          <div class="container" style="padding: 4rem 1rem; text-align: center;">
            <div class="empty-state">
              <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Sure Bulunamadı</h2>
              <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Aradığınız sure numarası mevcut değil veya hatalı bir bağlantı girdiniz.</p>
              <button class="page-nav-btn" onclick="window.location.hash='#/'">Sure Listesine Dön</button>
            </div>
          </div>
        `;
      }
      return;
    }

    this.currentSurah = surah;
    this.currentVerses = verses;

    // Update document title
    document.title = `${surah.surahId}. ${surah.name} Suresi (${surah.nameArabic}) - Kelâmullah`;

    // Save as last read
    localStorage.setItem('kelamullah_last_read', JSON.stringify({
      surahId: surah.surahId,
      surahName: surah.name,
      verseNumber: targetAyah || 1,
      timestamp: Date.now()
    }));

    window.app.updateResumeReadingCard();

    // Show Basmala unless Surah 9 (Tawbah) or Surah 1 (Fatiha - where basmala is verse 1)
    const showBasmala = surah.surahId !== 9 && surah.surahId !== 1;

    // Surah options for dropdown
    const allSurahs = window.dataService.getAllSurahs();
    const surahOptions = allSurahs.map(s => 
      `<option value="${s.surahId}" ${s.surahId === surah.surahId ? 'selected' : ''}>${s.surahId}. ${s.name} (${s.nameArabic})</option>`
    ).join('');

    // Verse options for jump dropdown
    const verseOptions = verses.map(v => 
      `<option value="${v.verseNumber}">Âyet ${v.verseNumber}</option>`
    ).join('');

    // Previous and Next surah ids
    const prevSurahId = surah.surahId > 1 ? surah.surahId - 1 : null;
    const nextSurahId = surah.surahId < 114 ? surah.surahId + 1 : null;

    const viewModeClass = this.viewMode === 'arabic-only' ? 'view-mode-arabic-only' : (this.viewMode === 'meal-only' ? 'view-mode-meal-only' : '');

    let html = `
      <!-- Sticky Navigation Bar -->
      <div class="reader-sticky-bar">
        <div class="container">
          <div class="reader-bar-content">
            <div class="reader-bar-left">
              <button class="nav-back-btn" onclick="window.location.hash='#/'" title="Sure Listesine Dön">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                <span>Sureler</span>
              </button>

              <select class="select-dropdown" id="surahSelectDropdown" onchange="window.location.hash='#/sure/' + this.value">
                ${surahOptions}
              </select>

              <select class="select-dropdown" id="verseJumpDropdown" onchange="window.readerView.scrollToAyah(this.value)">
                <option value="">Ayet Seç...</option>
                ${verseOptions}
              </select>
            </div>

            <div class="reader-bar-right">
              <!-- View mode toggles -->
              <div class="nav-tabs" style="padding: 2px;">
                <button class="nav-tab ${this.viewMode === 'both' ? 'active' : ''}" onclick="window.readerView.setViewMode('both'); this.parentElement.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');" title="Arapça ve Meal Birlikte">Tümü</button>
                <button class="nav-tab ${this.viewMode === 'arabic-only' ? 'active' : ''}" onclick="window.readerView.setViewMode('arabic-only'); this.parentElement.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');" title="Sadece Arapça (Hafızlık / Hatim)">Arapça</button>
                <button class="nav-tab ${this.viewMode === 'meal-only' ? 'active' : ''}" onclick="window.readerView.setViewMode('meal-only'); this.parentElement.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active')); this.classList.add('active');" title="Sadece Türkçe Meal">Meal</button>
              </div>

              <!-- Switch to Mushaf View -->
              <button class="search-trigger-btn" onclick="window.location.hash='#/mushaf/' + (${verses[0] ? verses[0].page : 0})" title="Mushaf Sayfa Görünümüne Geç">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>Mushaf</span>
              </button>

              <button class="icon-btn" onclick="window.audioController.playVerse(${surah.surahId}, 1, window.readerView.currentVerses)" title="Sureyi Baştan Dinle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="container reader-container ${viewModeClass}">
        <!-- Surah Hero Card -->
        <div class="surah-hero-header">
          <div class="surah-header-arabic">${surah.nameArabic}</div>
          <h1 class="surah-header-title">${surah.surahId}. ${surah.name} Suresi</h1>
          <div class="surah-header-meta">
            <span class="revelation-tag ${surah.revelation}">${surah.revelationTitle}</span>
            <span>•</span>
            <span><strong>${surah.verseCount}</strong> Âyet</span>
            <span>•</span>
            <span><strong>${surah.juz}.</strong> Cüz</span>
            <span>•</span>
            <span>Sayfa <strong>${surah.mushafPage}</strong></span>
          </div>

          ${showBasmala ? `
            <div class="surah-bismillah-box">
              <div class="bismillah-ar">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ</div>
              <div class="bismillah-tr">Rahmân ve Rahîm olan Allah'ın adıyla</div>
            </div>
          ` : ''}
        </div>

        <!-- Verses List -->
        <div class="verses-list" id="versesContainer">
    `;

    verses.forEach(v => {
      const isBookmarked = this.isBookmarked(surah.surahId, v.verseNumber);
      const isPlaying = window.audioController.isPlaying && 
                        window.audioController.currentSurahId === surah.surahId && 
                        window.audioController.currentVerseNumber === v.verseNumber;

      html += `
        <article class="verse-card ${isPlaying ? 'playing' : ''}" id="verse-${surah.surahId}-${v.verseNumber}" data-ayah="${v.verseNumber}">
          <span id="ayet-${v.verseNumber}" class="anchor-point"></span>
          <div class="verse-header-bar">
            <div class="verse-badge-info">
              <span class="verse-number-badge">${surah.surahId}:${v.verseNumber}</span>
              <span class="verse-page-juz">Cüz ${v.juz} • Sayfa ${v.mushafPage || Math.min(604, (v.page || 0) + 1)}</span>
            </div>

            <div class="verse-actions">
              <button class="verse-action-btn" onclick="window.audioController.playVerse(${surah.surahId}, ${v.verseNumber}, window.readerView.currentVerses)" title="Bu Âyeti Dinle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              </button>

              <button class="verse-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" 
                      data-surah="${surah.surahId}" data-ayah="${v.verseNumber}"
                      onclick="window.readerView.toggleBookmark(${surah.surahId}, ${v.verseNumber})" 
                      title="${isBookmarked ? 'Yer İmini Kaldır' : 'Yer İmlerine Kaydet'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              </button>

              <button class="verse-action-btn" onclick="window.readerView.copyVerse(${surah.surahId}, ${v.verseNumber})" title="Âyeti ve Meali Kopyala">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>

              <button class="verse-action-btn" onclick="window.readerView.shareVerse(${surah.surahId}, ${v.verseNumber})" title="Âyeti Paylaş">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
              </button>
            </div>
          </div>

          <div class="verse-arabic arabic-quran-text">
            ${v.arabic}
            <span class="ayah-end-symbol">﴿${v.verseNumber}﴾</span>
          </div>

          <div class="verse-meal">
            ${v.mealClean || v.meal}
          </div>
        </article>
      `;
    });

    html += `
        </div>

        <!-- Pagination Controls -->
        <nav class="reader-pagination">
          ${prevSurahId ? `
            <button class="page-nav-btn" onclick="window.location.hash='#/sure/${prevSurahId}'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Önceki Sure</span>
            </button>
          ` : `<div></div>`}

          <button class="page-nav-btn" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
            <span>Başa Dön</span>
          </button>

          ${nextSurahId ? `
            <button class="page-nav-btn" onclick="window.location.hash='#/sure/${nextSurahId}'">
              <span>Sonraki Sure</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ` : `<div></div>`}
        </nav>
      </div>
    `;

    this.container.innerHTML = html;

    // Scroll to target ayah if requested
    if (targetAyah) {
      setTimeout(() => {
        this.scrollToAyah(targetAyah);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }

  scrollToAyah(verseNumber) {
    if (!verseNumber || !this.currentSurah) return;
    const target = document.getElementById(`verse-${this.currentSurah.surahId}-${verseNumber}`) || document.getElementById(`ayet-${verseNumber}`);
    if (target) {
      const card = target.closest('.verse-card') || target;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('target-highlight');
      setTimeout(() => card.classList.remove('target-highlight'), 2000);
    }
  }
}

window.readerView = new ReaderView();
