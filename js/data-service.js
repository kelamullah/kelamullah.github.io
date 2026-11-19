/**
 * Kelâmullah - Data Service
 * Loads, normalizes and caches Quran surahs and verses.
 */

// Meccan / Medinan Surah Classification (28 Medinan Surahs)
const MEDINAN_SURAHS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 110
]);

// Convert internal zero-based dataset page key to traditional 1..604 Mushaf display page
function toMushafPage(pageKey) {
  const p = Number(pageKey || 0);
  return p <= 586 ? p + 1 : p;
}

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
        mushafPage: toMushafPage(s.page)
      }));

      // Build index maps
      for (const s of this.surahs) {
        this.surahMap.set(s.surahId, s);
        this.versesBySurah.set(s.surahId, []);
      }

      for (const v of this.verses) {
        v.mushafPage = toMushafPage(v.page);
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

    const prevMushafPage = prevPage !== null ? toMushafPage(prevPage) : null;
    const nextMushafPage = nextPage !== null ? toMushafPage(nextPage) : null;

    return {
      pageKey: p,
      displayPage: first.mushafPage,
      verses,
      juz: first.juz,
      surahsOnPage,
      pageIndex,
      prevPage,
      nextPage,
      prevMushafPage,
      nextMushafPage,
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
          startPage: first.mushafPage,
          endSurah: sLast ? sLast.name : '',
          endAyah: last.verseNumber,
          firstSurahId: first.surahId,
          firstVerseNumber: first.verseNumber
        });
      }
    }
    return list;
  }

  /**
   * Akıllı referans çözümleyici:
   * - "2:255", "2.255", "2/255", "2-255", "2 255" -> Âyet referansı
   * - "Bakara 255", "yasin 12", "kehf 10", "ihlas 2" -> Sure adı + Âyet
   * - "sayfa 42", "s 42" -> Mushaf sayfası (1..604)
   * - "cüz 30", "cuz 30" -> Cüz (1..30)
   */
  parseQuickReference(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const trimmed = rawQuery.trim();
    if (!trimmed) return null;

    // 1. Sayısal Sure:Âyet (örn. 2:255, 2.255, 2/255, 2-255, 2 255)
    const numericMatch = trimmed.match(/^(\d{1,3})\s*[:./\-\s]\s*(\d{1,3})$/);
    if (numericMatch) {
      const surahId = parseInt(numericMatch[1], 10);
      const verseNumber = parseInt(numericMatch[2], 10);
      const surah = this.surahMap.get(surahId);
      if (surah && verseNumber >= 1 && verseNumber <= surah.verseCount) {
        return {
          type: 'ayah',
          surahId,
          verseNumber,
          surah,
          label: `${surah.name} Suresi, ${verseNumber}. Âyet`,
          route: `#/sure/${surahId}/ayet/${verseNumber}`
        };
      }
      return null;
    }

    // 2. Sayfa referansı (örn. "sayfa 42", "s 42", "sayfa:42")
    const pageMatch = trimmed.match(/^(?:sayfa|syf|s)\s*[:./\-\s]\s*(\d{1,3})$/i);
    if (pageMatch) {
      const pageNumber = parseInt(pageMatch[1], 10);
      if (pageNumber >= 1 && pageNumber <= 604) {
        return {
          type: 'page',
          pageNumber,
          label: `Mushaf ${pageNumber}. Sayfa`,
          route: `#/mushaf/${pageNumber}`
        };
      }
      return null;
    }

    // 3. Cüz referansı (örn. "cüz 30", "cuz 30", "cuz:30")
    const juzMatch = trimmed.match(/^(?:c[üu]z)\s*[:./\-\s]\s*(\d{1,2})$/i);
    if (juzMatch) {
      const juzNumber = parseInt(juzMatch[1], 10);
      if (juzNumber >= 1 && juzNumber <= 30) {
        return {
          type: 'juz',
          juzNumber,
          label: `${juzNumber}. Cüz`,
          route: `#/cuz/${juzNumber}`
        };
      }
      return null;
    }

    // 4. <Sure Adı> <Âyet No> (örn. "Bakara 255", "yasin 12", "kehf 10", "ihlas 2")
    const nameAyahMatch = trimmed.match(/^(.+?)[\s:./\-]+(\d{1,3})$/);
    if (nameAyahMatch) {
      const rawName = nameAyahMatch[1].trim();
      const verseNumber = parseInt(nameAyahMatch[2], 10);
      if (rawName.length < 2 || isNaN(verseNumber) || verseNumber < 1) return null;

      const normalize = (str) => {
        if (typeof window !== 'undefined' && window.searchEngine && typeof window.searchEngine.normalizeText === 'function') {
          return window.searchEngine.normalizeText(str);
        }
        return String(str || '')
          .replace(/İ/g, 'i')
          .replace(/I/g, 'i')
          .toLowerCase()
          .replace(/[âÂ]/g, 'a')
          .replace(/[îÎ]/g, 'i')
          .replace(/[ûÛ]/g, 'u')
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const compact = (str) => normalize(str).replace(/['’\-`\s]/g, '');
      const qNorm = normalize(rawName);
      const qCompact = compact(rawName);
      if (!qCompact) return null;

      // Exact match first, then prefix match, then substring match
      let matchedSurah =
        this.surahs.find(s => normalize(s.name) === qNorm || compact(s.name) === qCompact || compact(s.nameEn || '') === qCompact) ||
        this.surahs.find(s => normalize(s.name).startsWith(qNorm) || compact(s.name).startsWith(qCompact)) ||
        this.surahs.find(s => compact(s.name).includes(qCompact) || compact(s.nameEn || '').includes(qCompact));

      if (matchedSurah && verseNumber <= matchedSurah.verseCount) {
        return {
          type: 'ayah',
          surahId: matchedSurah.surahId,
          verseNumber,
          surah: matchedSurah,
          label: `${matchedSurah.name} Suresi, ${verseNumber}. Âyet`,
          route: `#/sure/${matchedSurah.surahId}/ayet/${verseNumber}`
        };
      }
    }

    return null;
  }
}

window.dataService = new DataService();
