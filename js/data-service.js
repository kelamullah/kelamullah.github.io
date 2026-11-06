/**
 * Kelâmullah - Data Service
 * Loads, normalizes and caches Quran surahs and verses.
 */

// Meccan / Medinan Surah Classification (28 Medinan Surahs)
const MEDINAN_SURAHS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 110
]);

class DataService {
  constructor() {
    this.surahs = [];
    this.verses = [];
    this.surahMap = new Map();
    this.versesBySurah = new Map();
    this.versesByJuz = new Map();
    this.versesByPage = new Map();
    this.allPages = [];
    this.isLoaded = false;
    this.loadPromise = null;
  }

  async init() {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      // 1. Check if pre-bundled window.QURAN_DATA is present
      if (window.QURAN_DATA && window.QURAN_DATA.surahs && window.QURAN_DATA.verses) {
        this.surahs = window.QURAN_DATA.surahs;
        this.verses = window.QURAN_DATA.verses;
      } else {
        // 2. Fetch original JSON files
        try {
          const [sRes, aRes, mRes] = await Promise.all([
            fetch('./data/kuran_sureler.json'),
            fetch('./data/kuran_arapca.json'),
            fetch('./data/kuran_meal.json')
          ]);

          this.surahs = await sRes.json();
          const aData = await aRes.json();
          const mData = await mRes.json();

          // Merge Arabic + Meal
          this.verses = aData.map((av, i) => {
            const mv = mData[i] || {};
            return {
              id: av.id,
              surahId: av.surahId,
              verseNumber: av.verseNumber,
              arabic: av.arabic,
              meal: mv.meal || '',
              page: av.page,
              juz: av.juz
            };
          });
        } catch (err) {
          console.error("Data loading error:", err);
          throw err;
        }
      }

      // Enrich Surahs metadata
      this.surahs = this.surahs.map(s => ({
        ...s,
        revelation: MEDINAN_SURAHS.has(s.surahId) ? 'medeni' : 'mekki',
        revelationTitle: MEDINAN_SURAHS.has(s.surahId) ? 'Medenî' : 'Mekkî',
        mushafPage: Math.min(604, (s.page || 0) + 1)
      }));

      // Build index maps
      for (const s of this.surahs) {
        this.surahMap.set(s.surahId, s);
        this.versesBySurah.set(s.surahId, []);
      }

      for (const v of this.verses) {
        v.mushafPage = Math.min(604, (v.page || 0) + 1);
        // Clean up hash signs in Turkish translation (# to ;)
        if (v.meal) {
          v.mealClean = v.meal.replace(/#\s*/g, '; ').trim();
        } else {
          v.mealClean = '';
        }

        // Add to surah map
        const sList = this.versesBySurah.get(v.surahId);
        if (sList) sList.push(v);

        // Add to juz map
        if (!this.versesByJuz.has(v.juz)) {
          this.versesByJuz.set(v.juz, []);
        }
        this.versesByJuz.get(v.juz).push(v);

        // Add to page map
        const pKey = v.page;
        if (!this.versesByPage.has(pKey)) {
          this.versesByPage.set(pKey, []);
        }
        this.versesByPage.get(pKey).push(v);
      }

      this.allPages = Array.from(this.versesByPage.keys()).sort((a, b) => a - b);
      this.isLoaded = true;
    })();

    return this.loadPromise;
  }

  getAllPages() {
    return this.allPages;
  }

  getPageData(pageKey) {
    const p = Number(pageKey);
    const verses = this.versesByPage.get(p) || [];
    if (verses.length === 0) return null;

    const first = verses[0];
    const surahIds = [...new Set(verses.map(v => v.surahId))];
    const surahsOnPage = surahIds.map(id => this.surahMap.get(id)).filter(Boolean);

    const pageIndex = this.allPages.indexOf(p);
    const prevPage = pageIndex > 0 ? this.allPages[pageIndex - 1] : null;
    const nextPage = pageIndex < this.allPages.length - 1 ? this.allPages[pageIndex + 1] : null;

    return {
      pageKey: p,
      displayPage: first.mushafPage,
      verses,
      juz: first.juz,
      surahsOnPage,
      pageIndex,
      prevPage,
      nextPage,
      totalCount: this.allPages.length
    };
  }

  getAllSurahs() {
    return this.surahs;
  }

  getSurah(surahId) {
    const id = Number(surahId);
    const surah = this.surahMap.get(id);
    const verses = this.versesBySurah.get(id) || [];
    return { surah, verses };
  }

  getAllVerses() {
    return this.verses;
  }

  getVersesByJuz(juzId) {
    const j = Number(juzId);
    return this.versesByJuz.get(j) || [];
  }

  getJuzList() {
    const list = [];
    for (let j = 1; j <= 30; j++) {
      const verses = this.versesByJuz.get(j) || [];
      if (verses.length > 0) {
        const first = verses[0];
        const last = verses[verses.length - 1];
        const sFirst = this.surahMap.get(first.surahId);
        const sLast = this.surahMap.get(last.surahId);

        list.push({
          juzNumber: j,
          verseCount: verses.length,
          startSurah: sFirst ? sFirst.name : '',
          startAyah: first.verseNumber,
          endSurah: sLast ? sLast.name : '',
          endAyah: last.verseNumber,
          firstSurahId: first.surahId,
          firstVerseNumber: first.verseNumber
        });
      }
    }
    return list;
  }
}

window.dataService = new DataService();
