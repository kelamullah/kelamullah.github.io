/**
 * Kelâmullah - Reader View Module
 * Renders surah verses, supports 4 reading modes
 * (Alt Alta, Yan Yana, Meal, Arapça), in-surah filtering, focus mode,
 * reading progress indicator, and verse spotlight modal.
 */

class ReaderView {
  constructor() {
    this.currentSurah = null;
    this.currentVerses = [];
    this.container = null;
    this.viewMode = localStorage.getItem('kelamullah_view_mode') || 'both'; // both, side-by-side, arabic-only, meal-only
    this.bookmarks = JSON.parse(localStorage.getItem('kelamullah_bookmarks') || '[]');
    this.inSurahQuery = '';

    this._setupAudioListener();
    this._setupScrollProgressListener();
  }

  _setupAudioListener() {
    window.audioController.onVerseChange((surahId, verseNumber) => {
      this.highlightPlayingVerse(surahId, verseNumber);
    });
  }

  _setupScrollProgressListener() {
    window.addEventListener('scroll', () => {
      if (window.app && window.app.currentView === 'reader') {
        this._updateReadingProgress();
      }
    }, { passive: true });
  }

  _updateReadingProgress() {
    const fill = document.getElementById('surahReadingProgress');
    if (!fill) return;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      fill.style.width = '100%';
      return;
    }
    const pct = Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100));
    fill.style.width = `${pct.toFixed(1)}%`;
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
    const verses = this.currentVerses.length ? this.currentVerses : window.dataService.getSurah(sId).verses;
    const verse = verses.find(v => v.verseNumber === vNo);

    if (index > -1) {
      this.bookmarks.splice(index, 1);
      window.app.showToast("Yer imi kaldırıldı");
    } else {
      this.bookmarks.unshift({
        surahId: sId,
        verseNumber: vNo,
        surahName: surah ? surah.name : `Sure ${sId}`,
        mealSnippet: verse ? (verse.mealClean || verse.meal).slice(0, 120) + '...' : '',
        date: new Date().toLocaleDateString('tr-TR')
      });
      window.app.showToast("Âyet yer imlerine kaydedildi");
    }

    localStorage.setItem('kelamullah_bookmarks', JSON.stringify(this.bookmarks));
    this.updateBookmarkButtonState(sId, vNo);
  }

  updateBookmarkButtonState(surahId, verseNumber) {
    const btns = document.querySelectorAll(`.bookmark-btn[data-surah="${surahId}"][data-ayah="${verseNumber}"]`);
    const active = this.isBookmarked(surahId, verseNumber);
    btns.forEach(btn => {
      btn.classList.toggle('active', active);
      btn.title = active ? "Yer imini kaldır" : "Yer imlerine ekle";
    });
  }

  copyVerse(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const surah = window.dataService.surahMap.get(sId);
    const verses = this.currentVerses.length ? this.currentVerses : window.dataService.getSurah(sId).verses;
    const verse = verses.find(v => v.verseNumber === vNo);

    if (!verse || !surah) return;

    const copyText = `${verse.arabic}\n\n${verse.mealClean || verse.meal}\n\n(${surah.name} Suresi, ${vNo}. Âyet)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(() => {
        window.app.showToast("Âyet panoya kopyalandı");
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.app.showToast("Âyet panoya kopyalandı");
    }
  }

  shareVerse(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const surah = window.dataService.surahMap.get(sId);
    const verses = this.currentVerses.length ? this.currentVerses : window.dataService.getSurah(sId).verses;
    const verse = verses.find(v => v.verseNumber === vNo);

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
        window.app.showToast("Âyet bağlantısı kopyalandı");
      });
    }
  }

  setViewMode(mode) {
    const allowed = ['both', 'side-by-side', 'arabic-only', 'meal-only'];
    const valid = allowed.includes(mode) ? mode : 'both';
    this.viewMode = valid;
    localStorage.setItem('kelamullah_view_mode', valid);

    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) {
      readerContainer.classList.remove('view-mode-arabic-only', 'view-mode-meal-only', 'view-mode-side-by-side');
      if (valid === 'arabic-only') {
        readerContainer.classList.add('view-mode-arabic-only');
      } else if (valid === 'meal-only') {
        readerContainer.classList.add('view-mode-meal-only');
      } else if (valid === 'side-by-side') {
        readerContainer.classList.add('view-mode-side-by-side');
      }
    }

    if (window.app && typeof window.app._syncReaderModeButtons === 'function') {
      window.app._syncReaderModeButtons(valid);
    }
  }

  toggleFocusMode() {
    const isFocus = document.body.classList.toggle('focus-mode');
    const btn = document.getElementById('focusModeToggleBtn');
    if (btn) {
      btn.classList.toggle('active', isFocus);
    }
    window.app?.showToast(isFocus ? "Odak modu açıldı (Çıkmak için tekrar tıklayın)" : "Odak modu kapatıldı");
  }

  highlightPlayingVerse(surahId, verseNumber) {
    document.querySelectorAll('.verse-card.playing').forEach(el => el.classList.remove('playing'));

    if (this.currentSurah && this.currentSurah.surahId === surahId && verseNumber) {
      const activeCard = document.getElementById(`verse-${surahId}-${verseNumber}`);
      if (activeCard) {
        activeCard.classList.add('playing');
        const rect = activeCard.getBoundingClientRect();
        if (rect.top < 110 || rect.bottom > window.innerHeight - 110) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  _buildVersesHtml(surah, verses, queryWords = []) {
    if (!verses || verses.length === 0) {
      return `
        <div class="empty-state" style="padding: 3rem 1rem;">
          <p>Bu sure içinde aradığınız ifadeyle eşleşen âyet bulunamadı.</p>
        </div>
      `;
    }

    return verses.map(v => {
      const isBookmarked = this.isBookmarked(surah.surahId, v.verseNumber);
      const isPlaying = window.audioController.isPlaying &&
                        window.audioController.currentSurahId === surah.surahId &&
                        window.audioController.currentVerseNumber === v.verseNumber;

      const rawMeal = v.mealClean || v.meal;
      const renderedMeal = queryWords.length > 0 && window.searchEngine
        ? window.searchEngine.highlightMatches(rawMeal, queryWords)
        : rawMeal;

      return `
        <article class="verse-card ${isPlaying ? 'playing' : ''}" id="verse-${surah.surahId}-${v.verseNumber}" data-ayah="${v.verseNumber}">
          <span id="ayet-${v.verseNumber}" class="anchor-point"></span>
          <div class="verse-header-bar">
            <div class="verse-badge-info">
              <span class="verse-number-badge">${surah.surahId}:${v.verseNumber}</span>
              <span class="verse-page-juz">Cüz ${v.juz} • Sayfa ${v.mushafPage || Math.min(604, (v.page || 0) + 1)}</span>
            </div>

            <div class="verse-actions">
              <button type="button" class="verse-action-btn" onclick="window.audioController.playVerse(${surah.surahId}, ${v.verseNumber}, window.readerView.currentVerses)" title="Bu Âyeti Dinle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              </button>

              <button type="button" class="verse-action-btn" onclick="window.readerView.openVerseSpotlight(${surah.surahId}, ${v.verseNumber})" title="Tefekkür / Kart Görünümü">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
              </button>

              <button type="button" class="verse-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}"
                      data-surah="${surah.surahId}" data-ayah="${v.verseNumber}"
                      onclick="window.readerView.toggleBookmark(${surah.surahId}, ${v.verseNumber})"
                      title="${isBookmarked ? 'Yer İmini Kaldır' : 'Yer İmlerine Kaydet'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
              </button>

              <button type="button" class="verse-action-btn" onclick="window.readerView.copyVerse(${surah.surahId}, ${v.verseNumber})" title="Âyeti ve Meali Kopyala">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>

              <button type="button" class="verse-action-btn" onclick="window.readerView.shareVerse(${surah.surahId}, ${v.verseNumber})" title="Âyeti Paylaş">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
              </button>
            </div>
          </div>

          <div class="verse-content-flow">
            <div class="verse-arabic arabic-quran-text">
              ${v.arabic}
              <span class="ayah-end-symbol">﴿${v.verseNumber}﴾</span>
            </div>

            <div class="verse-meal">
              ${renderedMeal}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  filterInSurah(query) {
    this.inSurahQuery = query || '';
    const versesContainer = document.getElementById('versesContainer');
    const clearBtn = document.getElementById('inSurahClearBtn');
    if (clearBtn) clearBtn.style.display = this.inSurahQuery ? 'inline-flex' : 'none';
    if (!versesContainer || !this.currentSurah) return;

    const trimmed = this.inSurahQuery.trim();
    if (!trimmed) {
      versesContainer.innerHTML = this._buildVersesHtml(this.currentSurah, this.currentVerses, []);
      return;
    }

    if (/^\d+$/.test(trimmed)) {
      const targetNum = Number(trimmed);
      const exactMatches = this.currentVerses.filter(v => v.verseNumber === targetNum);
      const partialMatches = exactMatches.length > 0
        ? exactMatches
        : this.currentVerses.filter(v => String(v.verseNumber).includes(trimmed));
      versesContainer.innerHTML = this._buildVersesHtml(this.currentSurah, partialMatches, []);
      return;
    }

    const normQuery = window.searchEngine.normalizeText(trimmed);
    const words = normQuery.split(' ').filter(w => w.length > 0);
    const matched = this.currentVerses.filter(v => {
      const mealNorm = window.searchEngine.normalizeText(v.mealClean || v.meal || '');
      const arabicNoTashkeel = (v.arabic || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
      return words.every(w => mealNorm.includes(w)) || arabicNoTashkeel.includes(trimmed) || (v.arabic && v.arabic.includes(trimmed));
    });

    versesContainer.innerHTML = this._buildVersesHtml(this.currentSurah, matched, words);
  }

  clearInSurahFilter() {
    const input = document.getElementById('inSurahSearchInput');
    if (input) input.value = '';
    this.filterInSurah('');
  }

  openVerseSpotlight(surahId, verseNumber) {
    const sId = Number(surahId);
    const vNo = Number(verseNumber);
    const { surah, verses } = window.dataService.getSurah(sId);
    const verse = verses.find(v => v.verseNumber === vNo);
    if (!surah || !verse) return;

    const modal = document.getElementById('verseSpotlightModal');
    const card = document.getElementById('verseSpotlightCard');
    if (!modal || !card) return;

    const isBookmarked = this.isBookmarked(sId, vNo);
    const prevAyah = vNo > 1 ? vNo - 1 : null;
    const nextAyah = vNo < surah.verseCount ? vNo + 1 : null;

    card.innerHTML = `
      <div class="modal-header">
        <div>
          <h3 class="modal-title">${surah.name} Suresi, ${vNo}. Âyet</h3>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${surah.nameArabic}${surah.meaningTr ? ' • ' + surah.meaningTr : ''} • Cüz ${verse.juz}</span>
        </div>
        <button type="button" class="icon-btn" onclick="window.readerView.closeVerseSpotlight()" title="Kapat (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="verse-arabic arabic-quran-text" style="padding: 1.15rem 0; border-bottom: 1px solid var(--border-subtle); font-size: calc(var(--arabic-font-size) + 4px);">
        ${verse.arabic}
        <span class="ayah-end-symbol">﴿${verse.verseNumber}﴾</span>
      </div>

      <div class="verse-meal" style="padding: 1.2rem 0; border-top: none; font-size: calc(var(--meal-font-size) + 2px);">
        ${verse.mealClean || verse.meal}
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
        <button type="button" class="page-nav-btn" style="flex: 1; justify-content: center; background: var(--accent-emerald); color: #fff; border-color: var(--accent-emerald);"
                onclick="window.audioController.playVerse(${sId}, ${vNo}, window.dataService.getSurah(${sId}).verses)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          <span>Dinle</span>
        </button>
        <button type="button" class="page-nav-btn" style="flex: 1; justify-content: center;"
                onclick="window.readerView.copyVerse(${sId}, ${vNo})">
          <span>Kopyala</span>
        </button>
        <button type="button" class="page-nav-btn bookmark-btn ${isBookmarked ? 'active' : ''}" data-surah="${sId}" data-ayah="${vNo}" style="flex: 1; justify-content: center;"
                onclick="window.readerView.toggleBookmark(${sId}, ${vNo})">
          <span>${isBookmarked ? 'Kaydedildi' : 'Kaydet'}</span>
        </button>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
        ${prevAyah ? `<button type="button" class="subtle-action-btn" onclick="window.readerView.openVerseSpotlight(${sId}, ${prevAyah})">← ${prevAyah}. Âyet</button>` : '<span></span>'}
        ${nextAyah ? `<button type="button" class="subtle-action-btn" onclick="window.readerView.openVerseSpotlight(${sId}, ${nextAyah})">${nextAyah}. Âyet →</button>` : '<span></span>'}
      </div>
    `;

    modal.classList.add('open');
  }

  closeVerseSpotlight() {
    const modal = document.getElementById('verseSpotlightModal');
    if (modal) modal.classList.remove('open');
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
    this.inSurahQuery = '';

    document.title = `${surah.surahId}. ${surah.name} Suresi (${surah.nameArabic}) - Kelâmullah`;

    localStorage.setItem('kelamullah_last_read', JSON.stringify({
      surahId: surah.surahId,
      surahName: surah.name,
      verseNumber: targetAyah || 1,
      timestamp: Date.now()
    }));

    window.app.updateResumeReadingCard();

    const showBasmala = surah.surahId !== 9 && surah.surahId !== 1;
    const allSurahs = window.dataService.getAllSurahs();
    const surahOptions = allSurahs.map(s =>
      `<option value="${s.surahId}" ${s.surahId === surah.surahId ? 'selected' : ''}>${s.surahId}. ${s.name} (${s.nameArabic})</option>`
    ).join('');

    const verseOptions = verses.map(v =>
      `<option value="${v.verseNumber}">Âyet ${v.verseNumber}</option>`
    ).join('');

    const prevSurahId = surah.surahId > 1 ? surah.surahId - 1 : null;
    const nextSurahId = surah.surahId < 114 ? surah.surahId + 1 : null;

    const viewModeClass =
      this.viewMode === 'arabic-only' ? 'view-mode-arabic-only' :
      this.viewMode === 'meal-only' ? 'view-mode-meal-only' :
      this.viewMode === 'side-by-side' ? 'view-mode-side-by-side' : '';
    const wideClass = window.app?.readingWidth === 'wide' ? 'wide-layout' : '';
    const isFocus = document.body.classList.contains('focus-mode');

    const versesHtml = this._buildVersesHtml(surah, verses, []);

    const html = `
      <!-- Sticky Navigation Bar & Reading Progress -->
      <div class="reader-sticky-bar">
        <div class="container">
          <div class="reader-bar-content">
            <div class="reader-bar-left">
              <button type="button" class="nav-back-btn" onclick="window.location.hash='#/'" title="Sure Listesine Dön">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                <span>Sureler</span>
              </button>

              <select class="select-dropdown" id="surahSelectDropdown" onchange="window.location.hash='#/sure/' + this.value">
                ${surahOptions}
              </select>

              <select class="select-dropdown" id="verseJumpDropdown" onchange="window.readerView.scrollToAyah(this.value)">
                <option value="">Âyet Seç...</option>
                ${verseOptions}
              </select>

              <div class="reader-inline-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" class="reader-inline-input" id="inSurahSearchInput"
                       placeholder="Sure içi ara / âyet..."
                       oninput="window.readerView.filterInSurah(this.value)">
                <button type="button" class="reader-inline-clear" id="inSurahClearBtn" onclick="window.readerView.clearInSurahFilter()" title="Temizle">✕</button>
              </div>
            </div>

            <div class="reader-bar-right">
              <div class="nav-tabs" id="readerViewModePills" style="padding: 3px;">
                <button type="button" class="nav-tab ${this.viewMode === 'both' ? 'active' : ''}" data-view-mode="both" onclick="window.readerView.setViewMode('both')" title="Arapça ve Meal Alt Alta">Alt Alta</button>
                <button type="button" class="nav-tab ${this.viewMode === 'side-by-side' ? 'active' : ''}" data-view-mode="side-by-side" onclick="window.readerView.setViewMode('side-by-side')" title="Arapça ve Meal Yan Yana">Yan Yana</button>
                <button type="button" class="nav-tab ${this.viewMode === 'meal-only' ? 'active' : ''}" data-view-mode="meal-only" onclick="window.readerView.setViewMode('meal-only')" title="Sadece Türkçe Meal">Meal</button>
                <button type="button" class="nav-tab ${this.viewMode === 'arabic-only' ? 'active' : ''}" data-view-mode="arabic-only" onclick="window.readerView.setViewMode('arabic-only')" title="Sadece Arapça">Arapça</button>
              </div>

              <button type="button" class="focus-toggle-btn ${isFocus ? 'active' : ''}" id="focusModeToggleBtn" onclick="window.readerView.toggleFocusMode()" title="Dikkat Dağıtmayan Odak Modu">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                <span>Odak</span>
              </button>

              <button type="button" class="search-trigger-btn" onclick="window.location.hash='#/mushaf/' + (${verses[0] ? (verses[0].mushafPage || 1) : 1})" title="Mushaf Sayfa Görünümüne Geç">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>Mushaf</span>
              </button>

              <button type="button" class="icon-btn" onclick="window.audioController.playVerse(${surah.surahId}, 1, window.readerView.currentVerses)" title="Sureyi Baştan Dinle">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="reading-progress-track">
          <div class="reading-progress-fill" id="surahReadingProgress"></div>
        </div>
      </div>

      <div class="container reader-container ${viewModeClass} ${wideClass}">
        <!-- Surah Hero Header -->
        <div class="surah-hero-header">
          <div class="surah-header-arabic">${surah.nameArabic}</div>
          <h1 class="surah-header-title">${surah.surahId}. ${surah.name} Suresi</h1>
          ${surah.meaningTr ? `<div class="surah-header-meaning">${surah.meaningTr}</div>` : ''}
          <div class="surah-header-meta">
            <span class="revelation-tag ${surah.revelation}">${surah.revelationTitle}</span>
            <span>•</span>
            <span><strong>${surah.verseCount}</strong> Âyet</span>
            <span>•</span>
            <span>İniş Sırası: <strong>${surah.revelationOrder || surah.surahId}.</strong></span>
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
          ${versesHtml}
        </div>

        <!-- Pagination Controls -->
        <nav class="reader-pagination">
          ${prevSurahId ? `
            <button type="button" class="page-nav-btn" onclick="window.location.hash='#/sure/${prevSurahId}'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Önceki Sure</span>
            </button>
          ` : `<div></div>`}

          <button type="button" class="page-nav-btn" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
            <span>Başa Dön</span>
          </button>

          ${nextSurahId ? `
            <button type="button" class="page-nav-btn" onclick="window.location.hash='#/sure/${nextSurahId}'">
              <span>Sonraki Sure</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ` : `<div></div>`}
        </nav>
      </div>

      <!-- Verse Spotlight Modal -->
      <div class="modal-backdrop" id="verseSpotlightModal" onclick="if(event.target===this) window.readerView.closeVerseSpotlight()">
        <div class="modal-card spotlight-modal-card" id="verseSpotlightCard" style="max-width: 660px;">
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    if (targetAyah) {
      setTimeout(() => {
        this.scrollToAyah(targetAyah);
        this._updateReadingProgress();
      }, 100);
    } else {
      window.scrollTo(0, 0);
      this._updateReadingProgress();
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
