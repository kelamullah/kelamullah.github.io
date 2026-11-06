/**
 * Kelâmullah - Full Text Search Engine
 * High-performance client-side search across all 6,236 verses.
 * Features Turkish diacritics normalization, Arabic searching,
 * and highlighted snippet generation.
 */

class SearchEngine {
  constructor() {
    this.normalizedVerses = null;
  }

  // Normalize Turkish & accented characters for resilient searching
  normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // keep words and arabic
      .replace(/\s+/g, ' ')
      .trim();
  }

  prepareIndex(verses, surahs) {
    if (this.normalizedVerses) return;

    const surahMap = new Map();
    surahs.forEach(s => surahMap.set(s.surahId, s));

    this.normalizedVerses = verses.map(v => {
      const s = surahMap.get(v.surahId) || {};
      return {
        ...v,
        surahName: s.name || '',
        surahNameAr: s.nameArabic || '',
        normMeal: this.normalizeText(v.mealClean || v.meal || ''),
        normArabic: (v.arabic || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''), // strip tashkeel for loose arabic search
        normSurah: this.normalizeText(s.name || '')
      };
    });
  }

  search(query, selectedSurahId = null, maxResults = 100) {
    if (!query || query.trim().length < 2) return [];

    const normQuery = this.normalizeText(query);
    const queryWords = normQuery.split(' ').filter(w => w.length > 0);

    const results = [];
    const surahFilter = selectedSurahId ? Number(selectedSurahId) : null;

    for (const v of this.normalizedVerses) {
      if (surahFilter && v.surahId !== surahFilter) continue;

      // Check if all query words appear in Turkish meal
      const mealMatches = queryWords.every(word => v.normMeal.includes(word));
      
      // Or matches in normalized Arabic
      const arabicMatches = v.normArabic.includes(query.trim()) || v.arabic.includes(query.trim());

      // Or matches in Surah name
      const surahMatches = queryWords.every(word => v.normSurah.includes(word));

      if (mealMatches || arabicMatches || surahMatches) {
        results.push({
          verse: v,
          highlightedMeal: this.highlightMatches(v.mealClean || v.meal, queryWords),
          matchType: mealMatches ? 'meal' : (arabicMatches ? 'arabic' : 'surah')
        });

        if (results.length >= maxResults) break;
      }
    }

    return results;
  }

  highlightMatches(text, queryWords) {
    if (!text || !queryWords || queryWords.length === 0) return text;

    let highlighted = text;
    for (const word of queryWords) {
      if (word.length < 2) continue;
      const pattern = this.buildFuzzyRegex(word);
      highlighted = highlighted.replace(pattern, '<mark>$1</mark>');
    }
    return highlighted;
  }

  buildFuzzyRegex(word) {
    const charMap = {
      'a': '[aâAÂ]',
      'i': '[iîıİIÎ]',
      'u': '[uûUÛ]',
      'c': '[cçCÇ]',
      's': '[sşSŞ]',
      'g': '[gğGĞ]',
      'o': '[oöOÖ]'
    };
    let pattern = '';
    for (const char of word.toLowerCase()) {
      pattern += charMap[char] || char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`(${pattern})`, 'gi');
  }
}

window.searchEngine = new SearchEngine();
