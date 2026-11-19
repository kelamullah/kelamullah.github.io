/**
 * Kelâmullah - Master Application Controller
 * Handles routing, theme & layout preferences, smart omnibox, command palette,
 * spotlight verse, and global UI events.
 */

class App {
  constructor() {
    this.currentView = 'surahs'; // 'surahs', 'juz', 'reader', 'mushaf', 'search', 'saved'
    this.currentCategoryFilter = 'all'; // 'all', 'popular', 'mekki', 'medeni'
    this.searchQuery = '';
    this.theme = localStorage.getItem('kelamullah_theme') || 'light';
    this.surahSortBy = localStorage.getItem('kelamullah_surah_sort') || 'mushaf';
    this.surahLayout = localStorage.getItem('kelamullah_surah_layout') || 'grid';
    this.readingWidth = localStorage.getItem('kelamullah_reading_width') || 'normal';
    this.arabicFontSize = parseInt(localStorage.getItem('kelamullah_arabic_size') || '30', 10);
    this.mealFontSize = parseInt(localStorage.getItem('kelamullah_meal_size') || '16', 10);
    this.fontFamily = localStorage.getItem('kelamullah_font_family') || "'Abay Mushaf TDV', 'Hamdullah Quran', serif";

    this.popularSurahIds = [1, 2, 18, 36, 48, 55, 56, 67, 78, 112, 113, 114];
    this.spotlightVerses = [
      { s: 2, a: 186 },
      { s: 2, a: 255 },
      { s: 2, a: 286 },
      { s: 3, a: 139 },
      { s: 13, a: 28 },
      { s: 16, a: 90 },
      { s: 20, a: 114 },
      { s: 24, a: 35 },
      { s: 29, a: 69 },
      { s: 39, a: 53 },
      { s: 49, a: 13 },
      { s: 55, a: 60 },
      { s: 65, a: 3 },
      { s: 94, a: 5 }
    ];
    const todaySeed = new Date().getDate() + new Date().getMonth() * 31;
    this.spotlightIndex = todaySeed % this.spotlightVerses.length;

    this.cmdActiveIndex = 0;
    this.cmdCurrentItems = [];
  }

  async init() {
    this.applyTheme(this.theme);
    this.applyFontSizes(this.arabicFontSize, this.mealFontSize);
    this.applyFontFamily(this.fontFamily);
    this.setReadingWidth(this.readingWidth, false);

    const mainViewContainer = document.getElementById('mainViewContainer');
    window.readerView.init(mainViewContainer);
    window.mushafView.init(mainViewContainer);

    try {
      await window.dataService.init();
      window.searchEngine.prepareIndex(
        window.dataService.getAllVerses(),
        window.dataService.getAllSurahs()
      );
    } catch (err) {
      console.error("Data service init failed:", err);
      this.showToast("Veriler yüklenirken hata oluştu.");
    }

    this._setupRouter();
    this._setupAudioBar();
    this._setupSettingsModal();
    this._setupKeyboardShortcuts();

    this.handleRoute();
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ==========================================================================
     Theming & Appearance
     ========================================================================== */

  applyTheme(themeName) {
    const validTheme = ['light', 'dark', 'sepia'].includes(themeName) ? themeName : 'light';
    this.theme = validTheme;
    document.documentElement.setAttribute('data-theme', validTheme);
    localStorage.setItem('kelamullah_theme', validTheme);

    const themeColors = {
      light: '#FAF8F5',
      dark: '#0C1015',
      sepia: '#F5EDE0'
    };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', themeColors[validTheme]);

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === validTheme);
    });

    const themeIcon = document.getElementById('themeToggleIcon');
    const themeLabel = document.getElementById('themeToggleLabel');
    if (themeIcon) {
      if (validTheme === 'dark') {
        themeIcon.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
      } else if (validTheme === 'light') {
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
      } else {
        themeIcon.innerHTML = '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>';
      }
    }
    if (themeLabel) {
      themeLabel.textContent = validTheme === 'light' ? 'Açık' : (validTheme === 'dark' ? 'Koyu' : 'Mushaf');
    }
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'sepia'];
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

  setReaderViewMode(mode) {
    if (window.readerView) {
      window.readerView.setViewMode(mode);
    }
    this._syncReaderModeButtons(mode);
  }

  _syncReaderModeButtons(mode) {
    document.querySelectorAll('#settingViewModeOptions .seg-option-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view-mode') === mode);
    });
    document.querySelectorAll('#readerViewModePills .nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view-mode') === mode);
    });
  }

  setReadingWidth(width, save = true) {
    const valid = width === 'wide' ? 'wide' : 'normal';
    this.readingWidth = valid;
    if (save) {
      localStorage.setItem('kelamullah_reading_width', valid);
    }
    document.querySelectorAll('#settingWidthOptions .seg-option-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-reading-width') === valid);
    });
    const readerContainer = document.querySelector('.reader-container');
    if (readerContainer) {
      readerContainer.classList.toggle('wide-layout', valid === 'wide');
    }
  }

  /* ==========================================================================
     Routing System (Hash-based)
     ========================================================================== */

  _setupRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash || '#/';

    if (!hash.startsWith('#/sure/')) {
      document.body.classList.remove('focus-mode');
    }

    document.querySelectorAll('.nav-tab[data-route]').forEach(tab => {
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
      const pagePart = hash.replace('#/mushaf', '').replace(/^\/+/, '');
      let pageKey = 0;
      if (pagePart !== '') {
        const rawNum = parseInt(pagePart, 10);
        if (!isNaN(rawNum)) {
          if (rawNum === 1 || rawNum === 0) {
            pageKey = 0;
          } else if (rawNum > 1 && rawNum <= 586) {
            pageKey = rawNum - 1;
          } else {
            pageKey = Math.min(604, rawNum);
          }
        }
      } else if (this.lastViewedPageKey !== undefined) {
        pageKey = this.lastViewedPageKey;
      }
      this.lastViewedPageKey = pageKey;
      window.mushafView.renderPage(pageKey);
    } else if (hash.startsWith('#/cuzler')) {
      this.currentView = 'juz';
      this.renderJuzList();
    } else if (hash.startsWith('#/sure/')) {
      this.currentView = 'reader';
      const parts = hash.replace('#/sure/', '').split('/ayet/');
      const surahId = parseInt(parts[0], 10);
      const ayahNo = parts[1] ? parseInt(parts[1], 10) : null;
      if (window.readerView.currentSurah && window.readerView.currentSurah.surahId === surahId && ayahNo) {
        window.readerView.scrollToAyah(ayahNo);
      } else {
        window.readerView.renderSurah(surahId, ayahNo);
      }
    } else if (hash.startsWith('#/cuz/')) {
      const cuzId = parseInt(hash.replace('#/cuz/', ''), 10);
      this.openJuz(cuzId);
    } else if (hash.startsWith('#/arama')) {
      this.currentView = 'search';
      let searchQ = '';
      if (hash.includes('?q=')) {
        searchQ = decodeURIComponent(hash.split('?q=')[1].split('&')[0]);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('q')) searchQ = urlParams.get('q');
      }
      this.renderSearchView(searchQ);
    } else if (hash.startsWith('#/kaydedilenler')) {
      this.currentView = 'saved';
      this.renderSavedView();
    } else {
      this.currentView = 'surahs';
      this.renderSurahList();
    }
  }

  /* ==========================================================================
     View: Surah Directory, Smart Omnibox & Spotlight Verse
     ========================================================================== */

  getFilteredSurahs() {
    const surahs = window.dataService.getAllSurahs();
    let filtered = [...surahs];

    if (this.currentCategoryFilter === 'mekki') {
      filtered = filtered.filter(s => s.revelation === 'mekki');
    } else if (this.currentCategoryFilter === 'medeni') {
      filtered = filtered.filter(s => s.revelation === 'medeni');
    } else if (this.currentCategoryFilter === 'popular') {
      filtered = filtered.filter(s => this.popularSurahIds.includes(s.surahId));
    }

    if (this.searchQuery.trim()) {
      const raw = this.searchQuery.trim();
      const q = window.searchEngine.normalizeText(raw);
      filtered = filtered.filter(s => {
        const trName = window.searchEngine.normalizeText(s.name);
        const enName = window.searchEngine.normalizeText(s.nameEn || '');
        const meaning = window.searchEngine.normalizeText(s.meaningTr || '');
        const idStr = String(s.surahId);
        return trName.includes(q) || enName.includes(q) || meaning.includes(q) || idStr === q || (s.nameArabic && s.nameArabic.includes(raw));
      });
    }

    if (this.surahSortBy === 'revelation') {
      filtered.sort((a, b) => (a.revelationOrder || a.surahId) - (b.revelationOrder || b.surahId));
    } else if (this.surahSortBy === 'verses') {
      filtered.sort((a, b) => b.verseCount - a.verseCount || a.surahId - b.surahId);
    } else {
      filtered.sort((a, b) => a.surahId - b.surahId);
    }

    return filtered;
  }

  getSurahCardsHtml() {
    const filtered = this.getFilteredSurahs();
    if (filtered.length === 0) {
      return `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 2.5rem 1rem;">
          <p><strong>"${this.escapeHtml(this.searchQuery)}"</strong> ile eşleşen sure bulunamadı.</p>
          <p style="font-size: 0.85rem; margin-top: 6px;">Kelimeyi Kur'an mealinde aramak için <a href="#/arama?q=${encodeURIComponent(this.searchQuery)}" style="color: var(--accent-emerald); font-weight: 600;">Tam Arama sayfasına geçin →</a></p>
        </div>
      `;
    }

    return filtered.map(s => {
      const subText = this.surahSortBy === 'revelation'
        ? `${s.revelationOrder || s.surahId}. İniş • ${s.verseCount} Âyet`
        : `${s.meaningTr ? s.meaningTr + ' • ' : ''}${s.verseCount} Âyet`;

      return `
      <a class="surah-card" href="#/sure/${s.surahId}">
        <div class="surah-left">
          <div class="surah-badge">${s.surahId}</div>
          <div class="surah-details">
            <div class="surah-name-tr">
              <span>${s.name}</span>
              <span class="revelation-tag ${s.revelation}">${s.revelationTitle}</span>
            </div>
            <div class="surah-meaning">${subText}</div>
          </div>
        </div>

        <div class="surah-right">
          <div>
            <div class="surah-name-ar">${s.nameArabic}</div>
          </div>
        </div>
      </a>
    `;
    }).join('');
  }

  renderSpotlightCard() {
    const item = this.spotlightVerses[this.spotlightIndex] || { s: 2, a: 186 };
    const { surah, verses } = window.dataService.getSurah(item.s);
    const verse = verses.find(v => v.verseNumber === item.a);
    if (!surah || !verse) return '';

    return `
      <section class="spotlight-verse-card" aria-label="Tefekkür Âyeti">
        <div class="spotlight-top-bar">
          <div class="spotlight-label-group">
            <span class="spotlight-kicker">Tefekkür Âyeti</span>
            <span class="spotlight-ref-pill">${surah.name} Suresi • ${verse.verseNumber}. Âyet</span>
          </div>

          <div class="spotlight-actions">
            <button type="button" class="subtle-action-btn" onclick="window.app.shuffleSpotlightVerse()" title="Başka Bir Âyet Göster">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              <span>Başka Bir Âyet</span>
            </button>
            <button type="button" class="subtle-action-btn" onclick="window.app.playSpotlightVerse(${surah.surahId}, ${verse.verseNumber})" title="Dinle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
              <span>Dinle</span>
            </button>
            <a class="subtle-action-btn primary" href="#/sure/${surah.surahId}/ayet/${verse.verseNumber}">
              <span>Sureye Git →</span>
            </a>
          </div>
        </div>

        <div class="spotlight-arabic arabic-quran-text">
          ${verse.arabic}
          <span class="ayah-end-symbol">﴿${verse.verseNumber}﴾</span>
        </div>
        <div class="spotlight-meal">
          ${verse.mealClean || verse.meal}
        </div>
      </section>
    `;
  }

  shuffleSpotlightVerse() {
    if (this.spotlightVerses.length > 1) {
      this.spotlightIndex = (this.spotlightIndex + 1) % this.spotlightVerses.length;
    }
    const section = document.getElementById('spotlightSection');
    if (section) {
      section.innerHTML = this.renderSpotlightCard();
    }
  }

  playSpotlightVerse(surahId, verseNumber) {
    const { verses } = window.dataService.getSurah(surahId);
    window.audioController.playVerse(surahId, verseNumber, verses);
  }

  renderSurahList() {
    document.title = "Kelamullah | Kur'an-ı Kerim ve Meali";
    const container = document.getElementById('mainViewContainer');
    const cardsHtml = this.getSurahCardsHtml();
    const spotlightHtml = this.renderSpotlightCard();

    container.innerHTML = `
      <div class="container">
        <!-- Ana Başlık ve Arama -->
        <header class="hero-banner">
          <h1 class="hero-title">Kur'an-ı Kerim ve Türkçe Meali</h1>

          <div class="omnibox-container">
            <div class="omnibox-wrapper">
              <svg class="omnibox-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" class="omnibox-input" id="surahSearchInput"
                     placeholder="Sure adı, 2:255, Bakara 186, sayfa 42 veya meal kelimesi ara..."
                     value="${this.escapeHtml(this.searchQuery)}"
                     oninput="window.app.onSurahSearchInput(this.value)"
                     onkeydown="window.app.onHomeSearchKeydown(event)">
              <button type="button" class="omnibox-clear-btn" id="searchClearBtn" onclick="window.app.clearSurahSearch()" title="Temizle" style="display: ${this.searchQuery ? 'inline-flex' : 'none'};">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="omnibox-live-panel" id="omniboxLivePanel"></div>
          </div>

          <div class="quick-access-row">
            <a class="resume-pill" id="resumeCard" href="#/" style="display: none;">
              <span class="resume-dot"></span>
              <span>Son Okunan: <strong id="resumeTitle">-</strong> →</span>
            </a>
            <a class="quick-pill" href="#/sure/36">Yâsîn</a>
            <a class="quick-pill" href="#/sure/67">Mülk</a>
            <a class="quick-pill" href="#/sure/18">Kehf</a>
            <a class="quick-pill" href="#/sure/48">Fetih</a>
            <a class="quick-pill" href="#/sure/2/ayet/255">Âyetü'l-Kürsî (2:255)</a>
            <a class="quick-pill" href="#/sure/2/ayet/285">Âmenerrasûlü (2:285)</a>
          </div>
        </header>

        <!-- Spotlight Verse -->
        <div id="spotlightSection">
          ${spotlightHtml}
        </div>

        <!-- Directory Toolbar -->
        <div class="directory-toolbar">
          <div class="filter-chips">
            <button type="button" class="chip-btn ${this.currentCategoryFilter === 'all' ? 'active' : ''}" onclick="window.app.setCategoryFilter('all')">Tümü (114)</button>
            <button type="button" class="chip-btn ${this.currentCategoryFilter === 'popular' ? 'active' : ''}" onclick="window.app.setCategoryFilter('popular')">Sık Okunanlar</button>
            <button type="button" class="chip-btn ${this.currentCategoryFilter === 'mekki' ? 'active' : ''}" onclick="window.app.setCategoryFilter('mekki')">Mekkî</button>
            <button type="button" class="chip-btn ${this.currentCategoryFilter === 'medeni' ? 'active' : ''}" onclick="window.app.setCategoryFilter('medeni')">Medenî</button>
          </div>

          <div class="directory-controls-right">
            <select class="select-dropdown" id="surahSortSelect" aria-label="Sıralama" onchange="window.app.setSurahSort(this.value)">
              <option value="mushaf" ${this.surahSortBy === 'mushaf' ? 'selected' : ''}>Mushaf Sırası (1-114)</option>
              <option value="revelation" ${this.surahSortBy === 'revelation' ? 'selected' : ''}>Nüzul (İniş) Sırası</option>
              <option value="verses" ${this.surahSortBy === 'verses' ? 'selected' : ''}>Âyet Sayısına Göre</option>
            </select>

            <div class="layout-toggle-group" role="group" aria-label="Görünüm Biçimi">
              <button type="button" class="layout-toggle-btn ${this.surahLayout === 'grid' ? 'active' : ''}" onclick="window.app.setSurahLayout('grid')" title="Kart Görünümü (3 Sütun)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>
              </button>
              <button type="button" class="layout-toggle-btn ${this.surahLayout === 'list' ? 'active' : ''}" onclick="window.app.setSurahLayout('list')" title="Liste Görünümü">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Surahs Grid -->
        <div class="surah-grid ${this.surahLayout === 'list' ? 'list-layout' : ''}" id="surahGridContainer">
          ${cardsHtml}
        </div>
      </div>
    `;

    this.updateResumeReadingCard();
    if (this.searchQuery.trim()) {
      this.updateOmniboxLivePanel(this.searchQuery);
    }
  }

  onSurahSearchInput(val) {
    this.searchQuery = val;
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = val ? 'inline-flex' : 'none';

    const surahGrid = document.getElementById('surahGridContainer');
    if (surahGrid) {
      surahGrid.innerHTML = this.getSurahCardsHtml();
    }
    this.updateOmniboxLivePanel(val);
  }

  updateOmniboxLivePanel(val) {
    const panel = document.getElementById('omniboxLivePanel');
    if (!panel) return;

    const trimmed = (val || '').trim();
    if (!trimmed) {
      panel.classList.remove('open');
      panel.innerHTML = '';
      return;
    }

    const ref = window.dataService.parseQuickReference(trimmed);
    const mealHits = trimmed.length >= 2 ? window.searchEngine.search(trimmed, null, 4) : [];

    if (!ref && mealHits.length === 0) {
      panel.classList.remove('open');
      panel.innerHTML = '';
      return;
    }

    let html = '';

    if (ref) {
      html += `
        <div class="omnibox-section-title">Doğrudan Geçiş</div>
        <a class="omnibox-direct-card" href="${ref.route}">
          <div class="omnibox-direct-label">${this.escapeHtml(ref.label)}</div>
          <div class="omnibox-direct-sub">Doğrudan Git (Enter) →</div>
        </a>
      `;
    }

    if (mealHits.length > 0) {
      html += `<div class="omnibox-section-title">Meal Eşleşmeleri</div>`;
      html += mealHits.map(r => `
        <a class="omnibox-meal-hit" href="#/sure/${r.verse.surahId}/ayet/${r.verse.verseNumber}">
          <div class="omnibox-meal-ref">${r.verse.surahName} Suresi, ${r.verse.verseNumber}. Âyet</div>
          <div class="omnibox-meal-text">${r.highlightedMeal}</div>
        </a>
      `).join('');

      html += `
        <a class="omnibox-all-results-link" href="#/arama?q=${encodeURIComponent(trimmed)}">
          Tüm meal sonuçlarını görüntüle →
        </a>
      `;
    }

    panel.innerHTML = html;
    panel.classList.add('open');
  }

  onHomeSearchKeydown(event) {
    if (event.key === 'Escape') {
      this.clearSurahSearch();
      return;
    }
    if (event.key !== 'Enter') return;

    const val = (this.searchQuery || '').trim();
    if (!val) return;

    const ref = window.dataService.parseQuickReference(val);
    if (ref) {
      event.preventDefault();
      window.location.hash = ref.route;
      return;
    }

    const filtered = this.getFilteredSurahs();
    if (filtered.length === 1) {
      event.preventDefault();
      window.location.hash = `#/sure/${filtered[0].surahId}`;
      return;
    }

    if (val.length >= 2) {
      event.preventDefault();
      window.location.hash = `#/arama?q=${encodeURIComponent(val)}`;
    }
  }

  clearSurahSearch() {
    this.searchQuery = '';
    const input = document.getElementById('surahSearchInput');
    if (input) input.value = '';
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';

    const panel = document.getElementById('omniboxLivePanel');
    if (panel) {
      panel.classList.remove('open');
      panel.innerHTML = '';
    }

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

  setSurahSort(sortKey) {
    this.surahSortBy = sortKey;
    localStorage.setItem('kelamullah_surah_sort', sortKey);
    const surahGrid = document.getElementById('surahGridContainer');
    if (surahGrid) {
      surahGrid.innerHTML = this.getSurahCardsHtml();
    } else {
      this.renderSurahList();
    }
  }

  setSurahLayout(layout) {
    this.surahLayout = layout === 'list' ? 'list' : 'grid';
    localStorage.setItem('kelamullah_surah_layout', this.surahLayout);
    const surahGrid = document.getElementById('surahGridContainer');
    if (surahGrid) {
      surahGrid.classList.toggle('list-layout', this.surahLayout === 'list');
    }
    document.querySelectorAll('.layout-toggle-btn').forEach(btn => {
      const isGridBtn = btn.getAttribute('onclick')?.includes("'grid'");
      btn.classList.toggle('active', isGridBtn ? this.surahLayout === 'grid' : this.surahLayout === 'list');
    });
  }

  /* ==========================================================================
     Global Command Palette (Ctrl+K / /)
     ========================================================================== */

  openCommandPalette(initialQuery = '') {
    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('cmdPaletteInput');
    if (!modal || !input) return;

    modal.classList.add('open');
    input.value = initialQuery;
    this.onCommandInput(initialQuery);
    setTimeout(() => input.focus(), 40);
  }

  closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.remove('open');
  }

  navigateFromPalette(route) {
    this.closeCommandPalette();
    window.location.hash = route;
  }

  onCommandInput(query) {
    const resultsEl = document.getElementById('cmdPaletteResults');
    if (!resultsEl) return;

    const trimmed = (query || '').trim();
    const items = [];

    if (!trimmed) {
      const lastRead = JSON.parse(localStorage.getItem('kelamullah_last_read') || 'null');
      if (lastRead) {
        items.push({
          group: 'Kaldığınız Yer',
          title: `${lastRead.surahName} Suresi, ${lastRead.verseNumber}. Âyet`,
          sub: 'Son okuduğunuz noktaya devam edin',
          badge: 'Devam Et →',
          route: `#/sure/${lastRead.surahId}/ayet/${lastRead.verseNumber}`
        });
      }
      const defaults = [1, 2, 18, 36, 55, 67];
      defaults.forEach(id => {
        const s = window.dataService.surahMap.get(id);
        if (s) {
          items.push({
            group: 'Öne Çıkan Sureler',
            title: `${s.surahId}. ${s.name} Suresi (${s.nameArabic})`,
            sub: `${s.meaningTr ? s.meaningTr + ' • ' : ''}${s.verseCount} Âyet • ${s.revelationTitle}`,
            badge: `Sayfa ${s.mushafPage}`,
            route: `#/sure/${s.surahId}`
          });
        }
      });
    } else {
      const ref = window.dataService.parseQuickReference(trimmed);
      if (ref) {
        items.push({
          group: 'Doğrudan Geçiş',
          title: ref.label,
          sub: 'Doğrudan bu konuma git',
          badge: 'Aç →',
          route: ref.route
        });
      }

      const normQ = window.searchEngine.normalizeText(trimmed);
      const surahMatches = window.dataService.getAllSurahs().filter(s => {
        const tr = window.searchEngine.normalizeText(s.name);
        const en = window.searchEngine.normalizeText(s.nameEn || '');
        const mean = window.searchEngine.normalizeText(s.meaningTr || '');
        return tr.includes(normQ) || en.includes(normQ) || mean.includes(normQ) || String(s.surahId) === trimmed;
      }).slice(0, 6);

      surahMatches.forEach(s => {
        items.push({
          group: 'Sureler',
          title: `${s.surahId}. ${s.name} (${s.nameArabic})`,
          sub: `${s.meaningTr ? s.meaningTr + ' • ' : ''}${s.verseCount} Âyet • ${s.revelationTitle}`,
          badge: 'Sureye Git',
          route: `#/sure/${s.surahId}`
        });
      });

      if (trimmed.length >= 2) {
        const verseHits = window.searchEngine.search(trimmed, null, 6);
        verseHits.forEach(r => {
          items.push({
            group: 'Âyet Mealleri',
            title: `${r.verse.surahName} Suresi, ${r.verse.verseNumber}. Âyet`,
            subHtml: r.highlightedMeal,
            badge: `Cüz ${r.verse.juz}`,
            route: `#/sure/${r.verse.surahId}/ayet/${r.verse.verseNumber}`
          });
        });

        items.push({
          group: 'Arama',
          title: `"${trimmed}" için tüm Kur'an'da ara`,
          sub: 'Gelişmiş arama sonuçları sayfasını aç',
          badge: 'Ara →',
          route: `#/arama?q=${encodeURIComponent(trimmed)}`
        });
      }
    }

    this.cmdCurrentItems = items;
    this.cmdActiveIndex = 0;
    this._renderCommandPaletteItems(resultsEl);
  }

  _renderCommandPaletteItems(resultsEl) {
    if (this.cmdCurrentItems.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state" style="padding: 2rem 1rem;">Sonuç bulunamadı.</div>`;
      return;
    }

    let html = '';
    let lastGroup = null;
    this.cmdCurrentItems.forEach((item, idx) => {
      if (item.group && item.group !== lastGroup) {
        html += `<div class="cmd-group-title">${this.escapeHtml(item.group)}</div>`;
        lastGroup = item.group;
      }
      const subHtml = item.subHtml ? item.subHtml : this.escapeHtml(item.sub || '');
      html += `
        <div class="cmd-item ${idx === this.cmdActiveIndex ? 'active' : ''}" data-cmd-index="${idx}"
             onclick="window.app.navigateFromPalette('${item.route}')">
          <div class="cmd-item-main">
            <div class="cmd-item-title">${this.escapeHtml(item.title)}</div>
            <div class="cmd-item-sub">${subHtml}</div>
          </div>
          <div class="cmd-item-badge">${this.escapeHtml(item.badge || '')}</div>
        </div>
      `;
    });

    resultsEl.innerHTML = html;
  }

  handleCommandKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeCommandPalette();
      return;
    }

    if (!this.cmdCurrentItems.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.cmdActiveIndex = (this.cmdActiveIndex + 1) % this.cmdCurrentItems.length;
      this._updateCmdActiveHighlight();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cmdActiveIndex = (this.cmdActiveIndex - 1 + this.cmdCurrentItems.length) % this.cmdCurrentItems.length;
      this._updateCmdActiveHighlight();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = this.cmdCurrentItems[this.cmdActiveIndex];
      if (target) {
        this.navigateFromPalette(target.route);
      }
    }
  }

  _updateCmdActiveHighlight() {
    const items = document.querySelectorAll('#cmdPaletteResults .cmd-item');
    items.forEach((el, idx) => {
      const isAct = idx === this.cmdActiveIndex;
      el.classList.toggle('active', isAct);
      if (isAct) el.scrollIntoView({ block: 'nearest' });
    });
  }

  /* ==========================================================================
     View: Juz (Cüz) List
     ========================================================================== */

  renderJuzList() {
    document.title = "30 Cüz Dizini - Kelâmullah";
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
          <span>Sayfa ${j.startPage}</span>
          <span style="color: var(--accent-emerald); font-weight: 600;">Cüzü Oku →</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="container" style="padding-top: 2rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.9rem; font-weight: 700; margin-bottom: 0.45rem; letter-spacing: -0.02em;">Kur'an-ı Kerim Cüzleri</h1>
          <p style="color: var(--text-muted); font-size: 0.96rem;">30 cüzün her birinin başlangıç ve bitiş âyetleri.</p>
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

  renderSearchView(initialQuery = '') {
    document.title = initialQuery ? `"${initialQuery}" - Kur'an'da Arama - Kelâmullah` : "Kur'an-ı Kerim'de Arama - Kelâmullah";
    const container = document.getElementById('mainViewContainer');
    const allSurahs = window.dataService.getAllSurahs();

    const surahOptions = allSurahs.map(s =>
      `<option value="${s.surahId}">${s.surahId}. ${s.name}</option>`
    ).join('');

    const safeInitial = this.escapeHtml(initialQuery || '');

    container.innerHTML = `
      <div class="container search-view-container" style="padding-top: 2rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.9rem; font-weight: 700; margin-bottom: 0.45rem; letter-spacing: -0.02em;">Kur'an-ı Kerim'de Arama</h1>
          <p style="color: var(--text-muted); font-size: 0.96rem;">6.236 âyet içinde Türkçe meal, Arapça kelime veya referans (2:255) araması yapın.</p>
        </div>

        <div class="toolbar-container" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; margin-bottom: 1.5rem;">
          <div class="search-input-wrapper" style="flex: 2; min-width: 240px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" class="search-input" id="fullSearchInput"
                   placeholder="Kelime, kavram veya 2:255 yazın (Örn: adalet, sabır, merhamet)..."
                   value="${safeInitial}"
                   oninput="window.app.executeFullSearch()">
          </div>

          <select class="select-dropdown" id="searchSurahScope" style="height: 46px; flex: 1; min-width: 180px;" onchange="window.app.executeFullSearch()">
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
      if (input) {
        if (initialQuery && initialQuery.trim().length >= 2) {
          this.executeFullSearch();
        } else {
          input.focus();
        }
      }
    }, 80);
  }

  executeFullSearch() {
    const input = document.getElementById('fullSearchInput');
    const scopeSelect = document.getElementById('searchSurahScope');
    const resultsArea = document.getElementById('searchResultsArea');

    if (!input || !resultsArea) return;

    const query = input.value.trim();
    const scopeSurahId = scopeSelect ? scopeSelect.value : null;

    if (query.length >= 2) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#/arama?q=' + encodeURIComponent(query));
      }
    }

    if (query.length < 2) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p>Arama yapmak için en az 2 harf girin.</p>
        </div>
      `;
      return;
    }

    const ref = window.dataService.parseQuickReference(query);
    const results = window.searchEngine.search(query, scopeSurahId, 150);

    if (!ref && results.length === 0) {
      resultsArea.innerHTML = `
        <div class="empty-state">
          <p><strong>"${this.escapeHtml(query)}"</strong> için herhangi bir âyet bulunamadı.</p>
          <p style="font-size: 0.85rem; margin-top: 6px;">Farklı bir kelime veya kök deneyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    const directBanner = ref ? `
      <a class="omnibox-direct-card" href="${ref.route}" style="border-radius: 14px; border: 1px solid var(--border-highlight); margin-bottom: 1rem;">
        <div class="omnibox-direct-label">${this.escapeHtml(ref.label)}</div>
        <div class="omnibox-direct-sub">Doğrudan Konuma Git →</div>
      </a>
    ` : '';

    const html = `
      ${directBanner}
      <div class="search-results-stats">
        <strong>${results.length}</strong> âyet bulundu:
      </div>
      <div class="search-results-list">
        ${results.map(r => `
          <div class="search-result-card" onclick="window.location.hash='#/sure/${r.verse.surahId}/ayet/${r.verse.verseNumber}'">
            <div class="search-result-ref">
              <span>${r.verse.surahName} Suresi, ${r.verse.verseNumber}. Âyet</span>
              <span class="verse-page-juz">Cüz ${r.verse.juz} • Sayfa ${r.verse.mushafPage || (r.verse.page === 0 ? 1 : r.verse.page)}</span>
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
     View: Saved Bookmarks
     ========================================================================== */

  renderSavedView() {
    document.title = "Kaydedilen Âyetler - Kelâmullah";
    const container = document.getElementById('mainViewContainer');
    const bookmarks = window.readerView.bookmarks;

    let contentHtml = '';

    if (bookmarks.length === 0) {
      contentHtml = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <h3>Henüz kaydedilmiş yer iminiz yok</h3>
          <p style="margin-top: 8px;">Sure okurken âyetlerin yanındaki kaydet simgesine tıklayarak yer imi ekleyebilirsiniz.</p>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="search-results-stats" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Toplam <strong>${bookmarks.length}</strong> kayıtlı âyet</span>
          <button type="button" class="nav-back-btn" onclick="window.app.clearAllBookmarks()" style="font-size: 0.78rem;">Tümünü Temizle</button>
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
                  ${this.escapeHtml(b.mealSnippet)}
                </div>
              </div>

              <button type="button" class="verse-action-btn" onclick="window.app.removeBookmark(${idx})" title="Sil" style="color: #dc2626;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="container saved-container" style="padding-top: 2rem;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <h1 style="font-size: 1.9rem; font-weight: 700; margin-bottom: 0.45rem; letter-spacing: -0.02em;">Kaydedilen Âyetler</h1>
          <p style="color: var(--text-muted); font-size: 0.96rem;">Daha sonra tekrar okumak için işaretlediğiniz yer imleri.</p>
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
      if (state.surahId && state.verseNumber) {
        audioBar.classList.add('visible');
        const surah = window.dataService.surahMap.get(state.surahId);
        if (titleEl) {
          titleEl.textContent = `${surah ? surah.name : 'Sure'} • Âyet ${state.verseNumber}`;
        }
        if (reciterEl) {
          reciterEl.textContent = state.reciterName;
        }
      } else {
        audioBar.classList.remove('visible');
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

    if (playPauseBtn) playPauseBtn.onclick = () => window.audioController.togglePlay();
    if (prevBtn) prevBtn.onclick = () => window.audioController.prev();
    if (nextBtn) nextBtn.onclick = () => window.audioController.next();
    if (speedBtn) speedBtn.onclick = () => window.audioController.toggleSpeed();
  }

  /* ==========================================================================
     Resume Reading Pill
     ========================================================================== */

  updateResumeReadingCard() {
    const lastRead = JSON.parse(localStorage.getItem('kelamullah_last_read') || 'null');
    const card = document.getElementById('resumeCard');
    const title = document.getElementById('resumeTitle');

    if (card && lastRead) {
      card.style.display = 'inline-flex';
      card.href = `#/sure/${lastRead.surahId}/ayet/${lastRead.verseNumber}`;
      if (title) {
        title.textContent = `${lastRead.surahName} ${lastRead.verseNumber}. Âyet`;
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
    if (fontSelect) fontSelect.value = this.fontFamily;

    const arabicRange = document.getElementById('arabicFontRange');
    if (arabicRange) {
      arabicRange.value = this.arabicFontSize;
      arabicRange.oninput = (e) => this.applyFontSizes(parseInt(e.target.value, 10), this.mealFontSize);
    }

    const mealRange = document.getElementById('mealFontRange');
    if (mealRange) {
      mealRange.value = this.mealFontSize;
      mealRange.oninput = (e) => this.applyFontSizes(this.arabicFontSize, parseInt(e.target.value, 10));
    }

    this._syncReaderModeButtons(window.readerView.viewMode);
    this.setReadingWidth(this.readingWidth, false);
  }

  openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      this._syncReaderModeButtons(window.readerView.viewMode);
      modal.classList.add('open');
    }
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openCommandPalette();
        return;
      }

      if (e.key === 'Escape') {
        this.closeCommandPalette();
        this.closeSettings();
        window.readerView?.closeVerseSpotlight?.();
        window.mushafView?.closeAyahSheet?.();
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.target.blur();
        }
        return;
      }

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        this.openCommandPalette();
      } else if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        window.audioController.togglePlay();
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
