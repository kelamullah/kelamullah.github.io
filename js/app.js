/**
 * Kelâmullah - Master Application Controller
 * Handles routing, view transitions, settings, bookmarks, and global UI events.
 */

class App {
  constructor() {
    this.currentView = 'surahs'; // 'surahs', 'juz', 'reader', 'search', 'saved'
    this.currentCategoryFilter = 'all'; // 'all', 'mekki', 'medeni', 'popular'
    this.searchQuery = '';
    this.theme = localStorage.getItem('kelamullah_theme') || 'dark';
    this.arabicFontSize = parseInt(localStorage.getItem('kelamullah_arabic_size') || '30');
    this.mealFontSize = parseInt(localStorage.getItem('kelamullah_meal_size') || '16');
    this.fontFamily = localStorage.getItem('kelamullah_font_family') || "'Abay Mushaf TDV', 'Hamdullah Quran', serif";

    this.popularSurahIds = [1, 2, 18, 36, 48, 55, 56, 67, 78, 112, 113, 114];
  }

  async init() {
    // Apply saved theme, fonts and font sizes
    this.applyTheme(this.theme);
    this.applyFontSizes(this.arabicFontSize, this.mealFontSize);
    this.applyFontFamily(this.fontFamily);

    // Initialize views
    const mainViewContainer = document.getElementById('mainViewContainer');
    window.readerView.init(mainViewContainer);
    window.mushafView.init(mainViewContainer);

    // Load Quran data
    try {
      await window.dataService.init();
      // Prepare search engine index
      window.searchEngine.prepareIndex(
        window.dataService.getAllVerses(),
        window.dataService.getAllSurahs()
      );
    } catch (err) {
      console.error("Data service init failed:", err);
      this.showToast("Veriler yüklenirken hata oluştu.");
    }

    // Setup global listeners
    this._setupRouter();
    this._setupAudioBar();
    this._setupSettingsModal();
    this._setupKeyboardShortcuts();
    this.updateResumeReadingCard();

    // Trigger initial route
    this.handleRoute();
  }

  /* ==========================================================================
     Theming & Appearance
     ========================================================================== */

  applyTheme(themeName) {
    this.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('kelamullah_theme', themeName);

    // Update settings modal theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
    });

    // Update nav theme icon
    const themeIcon = document.getElementById('themeToggleIcon');
    if (themeIcon) {
      if (themeName === 'dark') {
        themeIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'; // Moon
      } else if (themeName === 'light') {
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'; // Sun
      } else {
        themeIcon.innerHTML = '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>'; // Book/Sepia
      }
    }
  }

  toggleTheme() {
    const themes = ['dark', 'light', 'sepia'];
    const nextIdx = (themes.indexOf(this.theme) + 1) % themes.length;
    this.applyTheme(themes[nextIdx]);
  }

  applyFontSizes(arabicSize, mealSize) {
    this.arabicFontSize = arabicSize;
    this.mealFontSize = mealSize;

    document.documentElement.style.setProperty('--arabic-font-size', `${arabicSize}px`);
    document.documentElement.style.setProperty('--meal-font-size', `${mealSize}px`);

    localStorage.setItem('kelamullah_arabic_size', arabicSize);
    localStorage.setItem('kelamullah_meal_size', mealSize);

    const arabicLabel = document.getElementById('arabicSizeLabel');
    const mealLabel = document.getElementById('mealSizeLabel');
    if (arabicLabel) arabicLabel.textContent = `${arabicSize}px`;
    if (mealLabel) mealLabel.textContent = `${mealSize}px`;
  }

  applyFontFamily(fontFamily) {
    this.fontFamily = fontFamily;
    document.documentElement.style.setProperty('--arabic-font-family', fontFamily);
    localStorage.setItem('kelamullah_font_family', fontFamily);

    const fontSelect = document.getElementById('fontFamilySelect');
    if (fontSelect) fontSelect.value = fontFamily;
  }

  /* ==========================================================================
     Routing System (Hash-based)
     ========================================================================== */

  _setupRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash || '#/';
    const mainViewContainer = document.getElementById('mainViewContainer');

    // Update active nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const target = tab.getAttribute('data-route');
      if (!target) return;
      let isActive = false;
      if (target === '#/') {
        isActive = (hash === '#/' || hash.startsWith('#/sure'));
      } else {
        isActive = hash.startsWith(target);
      }
      tab.classList.toggle('active', isActive);
    });

    if (hash === '#/' || hash.startsWith('#/sureler')) {
      this.currentView = 'surahs';
      this.renderSurahList();
    } else if (hash.startsWith('#/mushaf')) {
      this.currentView = 'mushaf';
      const pagePart = hash.replace('#/mushaf', '').replace('/', '');
      const pageKey = pagePart !== '' ? parseInt(pagePart) : (this.lastViewedPageKey !== undefined ? this.lastViewedPageKey : 0);
      this.lastViewedPageKey = pageKey;
      window.mushafView.renderPage(pageKey);
    } else if (hash.startsWith('#/cuzler')) {
      this.currentView = 'juz';
      this.renderJuzList();
    } else if (hash.startsWith('#/sure/')) {
      this.currentView = 'reader';
      const parts = hash.replace('#/sure/', '').split('/ayet/');
      const surahId = parseInt(parts[0]);
      const ayahNo = parts[1] ? parseInt(parts[1]) : null;
      if (window.readerView.currentSurah && window.readerView.currentSurah.surahId === surahId && ayahNo) {
        window.readerView.scrollToAyah(ayahNo);
      } else {
        window.readerView.renderSurah(surahId, ayahNo);
      }
    } else if (hash.startsWith('#/cuz/')) {
      const cuzId = parseInt(hash.replace('#/cuz/', ''));
      this.openJuz(cuzId);
    } else if (hash.startsWith('#/arama')) {
      this.currentView = 'search';
      this.renderSearchView();
    } else if (hash.startsWith('#/kaydedilenler')) {
      this.currentView = 'saved';
      this.renderSavedView();
    } else {
      this.renderSurahList();
    }
  }

  /* ==========================================================================
     View: Surah Grid & Filter
     ========================================================================== */

  getFilteredSurahs() {
    const surahs = window.dataService.getAllSurahs();
    let filtered = surahs;

    // Filter by category
    if (this.currentCategoryFilter === 'mekki') {
      filtered = filtered.filter(s => s.revelation === 'mekki');
    } else if (this.currentCategoryFilter === 'medeni') {
      filtered = filtered.filter(s => s.revelation === 'medeni');
    } else if (this.currentCategoryFilter === 'popular') {
      filtered = filtered.filter(s => this.popularSurahIds.includes(s.surahId));
    }

    // Filter by live search query
    if (this.searchQuery.trim()) {
      const q = window.searchEngine.normalizeText(this.searchQuery);
      filtered = filtered.filter(s => {
        const trName = window.searchEngine.normalizeText(s.name);
        const enName = window.searchEngine.normalizeText(s.nameEn || '');
        const idStr = String(s.surahId);
        return trName.includes(q) || enName.includes(q) || idStr === q || (s.nameArabic && s.nameArabic.includes(this.searchQuery));
      });
    }

    return filtered;
  }

  getSurahCardsHtml() {
    const filtered = this.getFilteredSurahs();
    if (filtered.length === 0) {
      return '<div class="empty-state" style="padding: 2.5rem 1rem;">Aradığınız kriterlere uygun sure bulunamadı.</div>';
    }

    return filtered.map(s => `
      <a class="surah-card" href="#/sure/${s.surahId}">
        <div class="surah-left">
          <div class="surah-badge">${s.surahId}</div>
          <div class="surah-details">
            <div class="surah-name-tr">
              <span>${s.name}</span>
              <span class="revelation-tag ${s.revelation}">${s.revelationTitle}</span>
            </div>
            <div class="surah-meta">
              <span>${s.verseCount} Âyet</span>
              <span>•</span>
              <span>Cüz ${s.juz}</span>
              <span>•</span>
              <span>Sayfa ${s.mushafPage}</span>
            </div>
          </div>
        </div>

        <div class="surah-right">
          <div>
            <div class="surah-name-ar">${s.nameArabic}</div>
            <div class="surah-name-en">${s.nameEn || ''}</div>
          </div>
          <span class="ios-chevron">›</span>
        </div>
      </a>
    `).join('');
  }

  renderSurahList() {
    const container = document.getElementById('mainViewContainer');
    const cardsHtml = this.getSurahCardsHtml();

    container.innerHTML = `
      <div class="container">
        <!-- Hero Header -->
        <header class="hero-banner">
          <h1 class="hero-title">Kelâmullah</h1>
          <p class="hero-subtitle">Kur'an-ı Kerim metni, Türkçe meali, sesli kıraat ve arama dizini.</p>
          <div class="hero-stats">
            <span class="hero-stat-item"><strong>114</strong> Sure</span>
            <span class="hero-stat-item"><strong>6.236</strong> Âyet</span>
            <span class="hero-stat-item"><strong>30</strong> Cüz</span>
            <span class="hero-stat-item"><strong>604</strong> Sayfa</span>
          </div>

          <div class="resume-reading-card" id="resumeCard">
            <div class="resume-info">
              <svg class="resume-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              <div>
                <div>Son okuduğunuz yere dönün:</div>
                <strong id="resumeTitle">-</strong>
              </div>
            </div>
            <button class="nav-back-btn" id="resumeBtn">Devam Et</button>
          </div>
        </header>

        <!-- Filters & Search Toolbar -->
        <div class="toolbar-container">
          <div class="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" class="search-input" id="surahSearchInput" 
                   placeholder="Sure adı, numara veya Arapça ara... (Örn: Yasin, 36, Bakara)" 
                   value="${this.searchQuery}"
                   oninput="window.app.onSurahSearchInput(this.value)">
            <button class="search-clear-btn" id="searchClearBtn" onclick="window.app.clearSurahSearch()" title="Temizle" style="display: ${this.searchQuery ? 'flex' : 'none'};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="filter-chips">
            <button class="chip-btn ${this.currentCategoryFilter === 'all' ? 'active' : ''}" onclick="window.app.setCategoryFilter('all')">Tümü (114)</button>
            <button class="chip-btn ${this.currentCategoryFilter === 'popular' ? 'active' : ''}" onclick="window.app.setCategoryFilter('popular')">Popüler</button>
            <button class="chip-btn ${this.currentCategoryFilter === 'mekki' ? 'active' : ''}" onclick="window.app.setCategoryFilter('mekki')">Mekkî</button>
            <button class="chip-btn ${this.currentCategoryFilter === 'medeni' ? 'active' : ''}" onclick="window.app.setCategoryFilter('medeni')">Medenî</button>
          </div>
        </div>

        <!-- Surahs Grid -->
        <div class="surah-grid" id="surahGridContainer">
          ${cardsHtml}
        </div>
      </div>
    `;

    this.updateResumeReadingCard();
  }

  onSurahSearchInput(val) {
    this.searchQuery = val;
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

    const surahGrid = document.getElementById('surahGridContainer');
    if (surahGrid) {
      surahGrid.innerHTML = this.getSurahCardsHtml();
    } else {
      this.renderSurahList();
    }
  }

  clearSurahSearch() {
    this.searchQuery = '';
    const input = document.getElementById('surahSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';

    const surahGrid = document.getElementById('surahGridContainer');
    if (surahGrid) {
      surahGrid.innerHTML = this.getSurahCardsHtml();
    } else {
      this.renderSurahList();
    }
  }

  setCategoryFilter(category) {
    this.currentCategoryFilter = category;
    this.renderSurahList();
  }

  /* ==========================================================================
     View: Juz (Cüz) List
     ========================================================================== */

  renderJuzList() {
    const container = document.getElementById('mainViewContainer');
    const juzList = window.dataService.getJuzList();

    const cardsHtml = juzList.map(j => `
      <div class="juz-card" onclick="window.app.openJuz(${j.juzNumber})">
        <div class="juz-header">
          <div class="juz-title">${j.juzNumber}. Cüz</div>
          <span class="verse-number-badge">${j.verseCount} Âyet</span>
        </div>
        <div class="juz-range">
          <div><strong>Başlangıç:</strong> ${j.startSurah} (${j.startAyah}. Âyet)</div>
          <div><strong>Bitiş:</strong> ${j.endSurah} (${j.endAyah}. Âyet)</div>
        </div>
        <div class="juz-footer">
          <span>Hatim ve Günlük Okuma</span>
          <span style="color: var(--accent-emerald); font-weight: 600;">Cüzü Oku →</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="container" style="padding-top: 1.5rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem;">Kur'an-ı Kerim Cüzleri</h1>
          <p style="color: var(--text-muted); font-size: 0.95rem;">30 cüzün her birinin başlangıç ve bitiş ayetleri.</p>
        </div>

        <div class="juz-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  openJuz(juzId) {
    const verses = window.dataService.getVersesByJuz(juzId);
    if (verses && verses.length > 0) {
      const first = verses[0];
      window.location.hash = `#/sure/${first.surahId}/ayet/${first.verseNumber}`;
    }
  }

  /* ==========================================================================
     View: Full Text Search
     ========================================================================== */

  renderSearchView() {
    const container = document.getElementById('mainViewContainer');
    const allSurahs = window.dataService.getAllSurahs();

    const surahOptions = allSurahs.map(s => 
      `<option value="${s.surahId}">${s.surahId}. ${s.name}</option>`
    ).join('');

    container.innerHTML = `
      <div class="container search-view-container" style="padding-top: 1.5rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem;">Kur'an-ı Kerim'de Arama</h1>
          <p style="color: var(--text-muted); font-size: 0.95rem;">6.236 âyet içinde Türkçe meal veya Arapça kelime araması yapın.</p>
        </div>

        <div class="toolbar-container" style="gap: 10px; margin-bottom: 1.5rem;">
          <div class="search-input-wrapper" style="flex: 2;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" class="search-input" id="fullSearchInput" 
                   placeholder="Aramak istediğiniz kelimeyi veya kavramı yazın (Örn: adalet, namaz, cennet, sabır)..." 
                   oninput="window.app.executeFullSearch()">
          </div>

          <select class="select-dropdown" id="searchSurahScope" style="height: 44px; flex: 1; min-width: 180px;" onchange="window.app.executeFullSearch()">
            <option value="">Tüm Kur'an'da Ara</option>
            ${surahOptions}
          </select>
        </div>

        <div id="searchResultsArea">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <p>Arama yapmak için yukarıdaki kutuya en az 2 harf girin.</p>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById('fullSearchInput');
      if (input) input.focus();
    }, 100);
  }

  executeFullSearch() {
    const input = document.getElementById('fullSearchInput');
    const scopeSelect = document.getElementById('searchSurahScope');
    const resultsArea = document.getElementById('searchResultsArea');

    if (!input || !resultsArea) return;

    const query = input.value.trim();
    const scopeSurahId = scopeSelect ? scopeSelect.value : null;

    if (query.length < 2) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p>Arama yapmak için en az 2 harf girin.</p>
        </div>
      `;
      return;
    }

    const results = window.searchEngine.search(query, scopeSurahId, 150);

    if (results.length === 0) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <p><strong>"${query}"</strong> için herhangi bir âyet bulunamadı.</p>
          <p style="font-size: 0.85rem; margin-top: 6px;">Farklı bir kelime veya kök deneyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    const html = `
      <div class="search-results-stats">
        <strong>${results.length}</strong> âyet bulundu:
      </div>
      <div class="search-results-list">
        ${results.map(r => `
          <div class="search-result-card" onclick="window.location.hash='#/sure/${r.verse.surahId}/ayet/${r.verse.verseNumber}'">
            <div class="search-result-ref">
              <span>${r.verse.surahName} Suresi, ${r.verse.verseNumber}. Âyet</span>
              <span class="verse-page-juz">Cüz ${r.verse.juz} • Sayfa ${r.verse.page === 0 ? 1 : r.verse.page}</span>
            </div>
            <div class="search-result-meal">
              ${r.highlightedMeal}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    resultsArea.innerHTML = html;
  }

  /* ==========================================================================
     View: Saved Bookmarks & Notes
     ========================================================================== */

  renderSavedView() {
    const container = document.getElementById('mainViewContainer');
    const bookmarks = window.readerView.bookmarks;

    let contentHtml = '';

    if (bookmarks.length === 0) {
      contentHtml = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <h3>Henüz kaydedilmiş yer iminiz yok</h3>
          <p style="margin-top: 8px;">Sure okurken âyetlerin yanındaki 🔖 simgesine tıklayarak yer imi ekleyebilirsiniz.</p>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="search-results-stats" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Toplam <strong>${bookmarks.length}</strong> kayıtlı âyet</span>
          <button class="nav-back-btn" onclick="window.app.clearAllBookmarks()" style="font-size: 0.75rem;">Tümünü Temizle</button>
        </div>
        <div class="search-results-list">
          ${bookmarks.map((b, idx) => `
            <div class="search-result-card" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
              <div style="flex: 1; cursor: pointer;" onclick="window.location.hash='#/sure/${b.surahId}/ayet/${b.verseNumber}'">
                <div class="search-result-ref">
                  <span>${b.surahName} Suresi, ${b.verseNumber}. Âyet</span>
                  <span class="verse-page-juz">${b.date || ''}</span>
                </div>
                <div class="search-result-meal">
                  ${b.mealSnippet}
                </div>
              </div>

              <button class="verse-action-btn" onclick="window.app.removeBookmark(${idx})" title="Sil" style="color: #ef4444;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="container saved-container" style="padding-top: 1.5rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem;">Kaydedilen Âyetler</h1>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Daha sonra tekrar okumak için işaretlediğiniz yer imleri.</p>
        </div>

        ${contentHtml}
      </div>
    `;
  }

  removeBookmark(idx) {
    window.readerView.bookmarks.splice(idx, 1);
    localStorage.setItem('kelamullah_bookmarks', JSON.stringify(window.readerView.bookmarks));
    this.renderSavedView();
    this.showToast("Yer imi silindi");
  }

  clearAllBookmarks() {
    if (confirm("Tüm yer imlerini silmek istediğinize emin misiniz?")) {
      window.readerView.bookmarks = [];
      localStorage.setItem('kelamullah_bookmarks', JSON.stringify([]));
      this.renderSavedView();
      this.showToast("Tüm yer imleri temizlendi");
    }
  }

  /* ==========================================================================
     Audio Bar Controller & Sync
     ========================================================================== */

  _setupAudioBar() {
    const audioBar = document.getElementById('audioBar');
    const playPauseBtn = document.getElementById('audioPlayPauseBtn');
    const prevBtn = document.getElementById('audioPrevBtn');
    const nextBtn = document.getElementById('audioNextBtn');
    const speedBtn = document.getElementById('audioSpeedBtn');
    const titleEl = document.getElementById('audioSurahTitle');
    const reciterEl = document.getElementById('audioReciterName');

    if (!audioBar) return;

    window.audioController.onStateChange((state) => {
      if (state.surahId) {
        audioBar.classList.add('visible');
        const surah = window.dataService.surahMap.get(state.surahId);
        if (titleEl) {
          titleEl.textContent = `${surah ? surah.name : 'Sure'} • Âyet ${state.verseNumber}`;
        }
        if (reciterEl) {
          reciterEl.textContent = state.reciterName;
        }
      }

      if (playPauseBtn) {
        playPauseBtn.innerHTML = state.isPlaying
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
      }

      if (speedBtn) {
        speedBtn.textContent = `${state.playbackRate}x`;
      }
    });

    if (playPauseBtn) {
      playPauseBtn.onclick = () => window.audioController.togglePlay();
    }
    if (prevBtn) {
      prevBtn.onclick = () => window.audioController.prev();
    }
    if (nextBtn) {
      nextBtn.onclick = () => window.audioController.next();
    }
    if (speedBtn) {
      speedBtn.onclick = () => window.audioController.toggleSpeed();
    }
  }

  /* ==========================================================================
     Resume Reading Feature
     ========================================================================== */

  updateResumeReadingCard() {
    const lastRead = JSON.parse(localStorage.getItem('kelamullah_last_read') || 'null');
    const card = document.getElementById('resumeCard');
    const title = document.getElementById('resumeTitle');
    const btn = document.getElementById('resumeBtn');

    if (card && lastRead) {
      card.classList.add('visible');
      if (title) title.textContent = `${lastRead.surahName} Suresi, ${lastRead.verseNumber}. Âyet`;
      if (btn) {
        btn.onclick = () => {
          window.location.hash = `#/sure/${lastRead.surahId}/ayet/${lastRead.verseNumber}`;
        };
      }
    }
  }

  /* ==========================================================================
     Settings Modal
     ========================================================================== */

  _setupSettingsModal() {
    const reciterSelect = document.getElementById('reciterSelect');
    if (reciterSelect) {
      const reciters = window.audioController.getReciters();
      reciterSelect.innerHTML = reciters.map(r => 
        `<option value="${r.id}" ${r.id === window.audioController.reciterId ? 'selected' : ''}>${r.name} (${r.bitrate})</option>`
      ).join('');

      reciterSelect.onchange = (e) => {
        window.audioController.setReciter(e.target.value);
        this.showToast(`Karî değiştirildi: ${window.audioController.getReciterName()}`);
      };
    }

    const fontSelect = document.getElementById('fontFamilySelect');
    if (fontSelect) {
      fontSelect.value = this.fontFamily;
    }

    const arabicRange = document.getElementById('arabicFontRange');
    if (arabicRange) {
      arabicRange.value = this.arabicFontSize;
      arabicRange.oninput = (e) => this.applyFontSizes(parseInt(e.target.value), this.mealFontSize);
    }

    const mealRange = document.getElementById('mealFontRange');
    if (mealRange) {
      mealRange.value = this.mealFontSize;
      mealRange.oninput = (e) => this.applyFontSizes(this.arabicFontSize, parseInt(e.target.value));
    }
  }

  openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.add('open');
  }

  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('open');
  }

  /* ==========================================================================
     Keyboard Shortcuts & Toast
     ========================================================================== */

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
          this.closeSettings();
        }
        return;
      }

      if (e.key === '/' && this.currentView !== 'search') {
        e.preventDefault();
        window.location.hash = '#/arama';
      } else if (e.code === 'Space') {
        e.preventDefault();
        window.audioController.togglePlay();
      } else if (e.key === 'Escape') {
        this.closeSettings();
      }
    });
  }

  showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}

window.app = new App();
document.addEventListener('DOMContentLoaded', () => window.app.init());
