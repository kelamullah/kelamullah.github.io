/**
 * Kelâmullah - Mushaf / Sayfa Modu (Page-by-Page Mushaf View)
 * Gerçek matbu Kur'an sayfası deneyimi: İki yana yaslı Arapça metin akışı,
 * sayfa çevirme (1..604), âyet mealleri ve sesli tilavet.
 */

class MushafView {
  constructor() {
    this.currentPageKey = 0; // default to page 0 (Fâtiha, Sayfa 1)
    this.container = null;
    this.selectedVerse = null;

    this._setupAudioListener();
    this._setupKeyboardNavigation();
  }

  _setupAudioListener() {
    window.audioController.onVerseChange((surahId, verseNumber) => {
      this.highlightPlayingVerse(surahId, verseNumber);
    });
  }

  _setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Only active if mushaf view is current
      if (window.app.currentView !== 'mushaf') return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        // Next page (Arabic reading goes right to left, next page is to the left)
        this.nextPage();
      } else if (e.key === 'ArrowRight') {
        this.prevPage();
      }
    });
  }

  init(containerElement) {
    this.container = containerElement;
  }

  renderPage(pageKey = 0) {
    const pageData = window.dataService.getPageData(pageKey);
    if (!pageData) {
      if (this.container) {
        this.container.innerHTML = `
          <div class="container" style="padding: 4rem 1rem; text-align: center;">
            <div class="empty-state">
              <h2>Sayfa Bulunamadı</h2>
              <p style="margin: 1rem 0;">Geçersiz sayfa numarası.</p>
              <button class="page-nav-btn" onclick="window.location.hash='#/mushaf/0'">1. Sayfaya Git</button>
            </div>
          </div>
        `;
      }
      return;
    }

    this.currentPageKey = pageData.pageKey;

    // Save last read page
    const firstV = pageData.verses[0];
    const surah = window.dataService.surahMap.get(firstV.surahId);
    localStorage.setItem('kelamullah_last_read', JSON.stringify({
      surahId: firstV.surahId,
      surahName: surah ? surah.name : 'Kur\'an',
      verseNumber: firstV.verseNumber,
      timestamp: Date.now()
    }));

    window.app.updateResumeReadingCard();

    // Surah names for header
    const surahNamesAr = pageData.surahsOnPage.map(s => s.nameArabic).join(' - ');
    const surahNamesTr = pageData.surahsOnPage.map(s => s.name).join(' - ');

    // Page options for dropdown
    const allPages = window.dataService.getAllPages();
    const pageOptions = allPages.map(pKey => {
      const pData = window.dataService.getPageData(pKey);
      const isSel = pKey === pageData.pageKey ? 'selected' : '';
      return `<option value="${pKey}" ${isSel}>Sayfa ${pData.displayPage} (${pData.surahsOnPage[0]?.name || ''})</option>`;
    }).join('');

    // Generate continuous text content
    let textHtml = '';
    let currentSurahId = null;

    pageData.verses.forEach(v => {
      // If a new surah starts on this page at verse 1
      if (v.verseNumber === 1 && v.surahId !== currentSurahId) {
        currentSurahId = v.surahId;
        const sInfo = window.dataService.surahMap.get(v.surahId);

        textHtml += `
          <div class="mushaf-surah-header">
            <div class="mushaf-surah-title-ar">${sInfo ? sInfo.nameArabic : ''}</div>
            <div class="mushaf-surah-title-tr">${sInfo ? `${sInfo.surahId}. ${sInfo.name} Suresi (${sInfo.verseCount} Âyet • ${sInfo.revelationTitle})` : ''}</div>
          </div>
        `;

        // Basmala (except Tawbah 9 and Fatiha 1 where basmala is verse 1 itself)
        if (v.surahId !== 9 && v.surahId !== 1) {
          textHtml += `
            <div class="mushaf-bismillah">
              بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ
            </div>
          `;
        }
      }

      const isPlaying = window.audioController.isPlaying &&
                        window.audioController.currentSurahId === v.surahId &&
                        window.audioController.currentVerseNumber === v.verseNumber;

      textHtml += `
        <span class="mushaf-verse-span ${isPlaying ? 'playing' : ''}" 
              id="mushaf-verse-${v.surahId}-${v.verseNumber}"
              data-surah="${v.surahId}" 
              data-ayah="${v.verseNumber}"
              onclick="window.mushafView.openAyahSheet(${v.surahId}, ${v.verseNumber})">
          ${v.arabic}
          <span class="mushaf-ayah-badge">﴿${v.verseNumber}﴾</span>
        </span>
      `;
    });

    const html = `
      <!-- Top Sticky Control Bar -->
      <div class="reader-sticky-bar">
        <div class="container">
          <div class="reader-bar-content">
            <div class="reader-bar-left">
              <button class="nav-back-btn" onclick="window.location.hash='#/'" title="Sure Listesine Dön">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                <span>Sureler</span>
              </button>

              <select class="select-dropdown" id="mushafPageSelect" onchange="window.location.hash='#/mushaf/' + this.value">
                ${pageOptions}
              </select>

              <span class="revelation-tag" style="background: var(--bg-pill); color: var(--text-muted); font-size: 0.75rem;">
                ${pageData.juz}. Cüz
              </span>
            </div>

            <div class="reader-bar-right">
              <!-- Switch to Verse List mode -->
              <button class="search-trigger-btn" onclick="window.location.hash='#/sure/' + ${firstV.surahId}" title="Âyet Ayet Meal Listesine Geç">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                <span>Ayet Listesi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Mushaf Sheet Page Frame -->
      <div class="container" style="max-width: 860px;">
        <div class="mushaf-page-frame">
          <!-- Page Header Line -->
          <div class="mushaf-page-topbar">
            <div class="mushaf-header-juz">${pageData.juz}. CÜZ</div>
            <div class="mushaf-header-page">SAYFA ${pageData.displayPage}</div>
            <div class="mushaf-header-surah">${surahNamesTr}</div>
          </div>

          <!-- Page Arabic Text Body (Justified Flow) -->
          <div class="mushaf-page-content arabic-quran-text">
            ${textHtml}
          </div>

          <!-- Page Bottom Bar -->
          <div class="mushaf-page-bottombar">
            <span>kelamullah.github.io</span>
            <span>— ${pageData.displayPage} —</span>
            <span>${pageData.juz}. Cüz</span>
          </div>
        </div>

        <!-- Page Turning Navigation Buttons -->
        <div class="reader-pagination" style="margin-top: 1.5rem;">
          ${pageData.prevPage !== null ? `
            <button class="page-nav-btn" onclick="window.location.hash='#/mushaf/${pageData.prevPage}'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Önceki Sayfa (${pageData.displayPage - 1})</span>
            </button>
          ` : `<div></div>`}

          <div style="font-size: 0.8rem; color: var(--text-dim); text-align: center;">
            Sol / Sağ ok tuşlarıyla sayfa çevirebilirsiniz
          </div>

          ${pageData.nextPage !== null ? `
            <button class="page-nav-btn" onclick="window.location.hash='#/mushaf/${pageData.nextPage}'">
              <span>Sonraki Sayfa (${pageData.displayPage + 1})</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ` : `<div></div>`}
        </div>
      </div>

      <!-- Ayah Info Bottom Sheet Modal -->
      <div class="modal-backdrop" id="mushafAyahSheet" onclick="if(event.target===this) window.mushafView.closeAyahSheet()">
        <div class="modal-card" id="mushafAyahCard" style="max-width: 620px;">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    window.scrollTo(0, 0);
  }

  nextPage() {
    const pageData = window.dataService.getPageData(this.currentPageKey);
    if (pageData && pageData.nextPage !== null) {
      window.location.hash = `#/mushaf/${pageData.nextPage}`;
    }
  }

  prevPage() {
    const pageData = window.dataService.getPageData(this.currentPageKey);
    if (pageData && pageData.prevPage !== null) {
      window.location.hash = `#/mushaf/${pageData.prevPage}`;
    }
  }

  highlightPlayingVerse(surahId, verseNumber) {
    document.querySelectorAll('.mushaf-verse-span.playing').forEach(el => el.classList.remove('playing'));

    const activeEl = document.getElementById(`mushaf-verse-${surahId}-${verseNumber}`);
    if (activeEl) {
      activeEl.classList.add('playing');
    } else if (window.app && window.app.currentView === 'mushaf') {
      // Verse is on a different page: auto-flip page to follow recitation
      const { verses } = window.dataService.getSurah(surahId);
      const v = verses ? verses.find(item => item.verseNumber === verseNumber) : null;
      if (v && v.page !== undefined && v.page !== this.currentPageKey) {
        window.location.hash = `#/mushaf/${v.page}`;
      }
    }
  }

  openAyahSheet(surahId, verseNumber) {
    const { surah, verses } = window.dataService.getSurah(surahId);
    const verse = verses.find(v => v.verseNumber === verseNumber);
    if (!verse || !surah) return;

    this.selectedVerse = verse;

    // Highlight verse in page
    document.querySelectorAll('.mushaf-verse-span.selected').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(`mushaf-verse-${surahId}-${verseNumber}`);
    if (el) el.classList.add('selected');

    const isBookmarked = window.readerView.isBookmarked(surahId, verseNumber);

    const sheet = document.getElementById('mushafAyahSheet');
    const card = document.getElementById('mushafAyahCard');

    if (!sheet || !card) return;

    card.innerHTML = `
      <div class="modal-header">
        <div>
          <h3 class="modal-title">${surah.name} Suresi, ${verseNumber}. Âyet</h3>
          <span style="font-size: 0.75rem; color: var(--text-dim);">${surah.nameArabic} • Cüz ${verse.juz}</span>
        </div>
        <button class="icon-btn" onclick="window.mushafView.closeAyahSheet()" title="Kapat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Arabic Text -->
      <div class="verse-arabic" style="padding: 1rem 0; font-size: 26px; border-bottom: 0.5px solid var(--border-hairline);">
        ${verse.arabic}
        <span class="mushaf-ayah-badge">﴿${verse.verseNumber}﴾</span>
      </div>

      <!-- Meal -->
      <div class="verse-meal" style="padding: 1rem 0; font-size: 16px;">
        ${verse.mealClean || verse.meal}
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 1.25rem; padding-top: 1rem; border-top: 0.5px solid var(--border-hairline);">
        <button class="page-nav-btn" style="flex: 1; justify-content: center; background: var(--accent-emerald); color: #fff; border: none;"
                onclick="window.audioController.playVerse(${surah.surahId}, ${verse.verseNumber}, window.dataService.getSurah(${surah.surahId}).verses); window.mushafView.closeAyahSheet();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          <span>Dinle</span>
        </button>

        <button class="page-nav-btn" style="flex: 1; justify-content: center;"
                onclick="window.readerView.copyVerse(${surah.surahId}, ${verse.verseNumber});">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>Kopyala</span>
        </button>

        <button class="page-nav-btn ${isBookmarked ? 'active' : ''}" style="flex: 1; justify-content: center;"
                onclick="window.readerView.toggleBookmark(${surah.surahId}, ${verse.verseNumber}); this.classList.toggle('active');">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          <span>${isBookmarked ? 'Kaydedildi' : 'Kaydet'}</span>
        </button>
      </div>
    `;

    sheet.classList.add('open');
  }

  closeAyahSheet() {
    const sheet = document.getElementById('mushafAyahSheet');
    if (sheet) sheet.classList.remove('open');
    document.querySelectorAll('.mushaf-verse-span.selected').forEach(el => el.classList.remove('selected'));
  }
}

window.mushafView = new MushafView();
