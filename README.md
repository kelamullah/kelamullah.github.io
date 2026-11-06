# Kelâmullah - Modern Kur'an-ı Kerim Web Platformu

Açık kaynak, modern, hızlı ve duyarlı (responsive) Kur'an-ı Kerim metni, Türkçe meali, sesli kıraat ve arama platformu.

**Canlı Demo:** [https://kelamullah.github.io/](https://kelamullah.github.io/)

---

## 🌟 Özellikler

- **114 Sure & 6.236 Âyet:** Tüm surelerin eksiksiz Arapça metinleri ve Türkçe meali.
- **Gerçek Mushaf Sayfa Görünümü (1..604):** Tıpkı basılı bir Mushaf gibi iki yana yaslı akıcı Arapça hat, altın çerçeve, sayfa çevirme ve âyete dokununca açılan Türkçe meal kartı.
- **Sesli Tilavet / Kıraat (Audio):** 
  - Dünyaca ünlü karîler: Mişâri Raşid el-Afâsi, Abdülbasit Abdüssamed, Mâhir el-Muaykılî, Ebu Bekir eş-Şâtırî, Saad el-Gâmdi.
  - Âyet bazlı otomatik takip, vurgulama (highlight) ve kesintisiz dinleme.
  - Oynatma hızı ayarı (0.75x, 1x, 1.25x).
- **Gelişmiş Arama:** Türkçe mealde ve Arapça metinde Türkçe karakter ve şapkalı harf duyarlı (normalize) anlık arama motoru.
- **30 Cüz Dizini:** Hatim ve günlük okumalar için her cüzün başlangıç ve bitiş ayetleriyle listelenmesi.
- **Tema Desteği:**
  - 🌙 Koyu Tema (Gece modu)
  - ☀️ Açık Tema (Gündüz modu)
  - 📜 Mushaf / Sepya Kağıt Teması (Göz yormayan antik kağıt dokusu)
- **Kişiselleştirilebilir Tipografi:**
  - Ayarlanabilir Arapça yazı boyutu (20px - 48px).
  - Ayarlanabilir Türkçe meal yazı boyutu (13px - 24px).
  - Görünüm modları: Arapça + Meal, Sadece Arapça (Hafızlık / Hatim), Sadece Meal.
- **Kaldığım Yer & Yer İmleri:**
  - Son okunan sure ve ayet otomatik hafızaya alınır.
  - İstenilen âyetler tek tıkla yer imlerine eklenebilir.
- **Kopyalama & Paylaşma:**
  - Âyet metnini Arapça + Meal + Kaynak referansıyla tek tıkla panoya kopyalama.
  - Web Share API ile doğrudan WhatsApp, Telegram vb. platformlarda paylaşma.
- **Çevrimdışı (Offline) & Sıfır Bağımlılık:** Herhangi bir sunucu gereksinimi olmadan ister doğrudan tarayıcıda (`file:///`), ister statik hostingde çalışır.

---

## 📂 Proje Yapısı

```
kelamullah.github.io/
├── index.html               # Tek sayfalı web uygulaması (SPA)
├── css/
│   ├── main.css             # Tema, düzen, tipografi ve animasyonlar
│   └── quran-font.css       # Arapça hat ve font stilleri
├── js/
│   ├── app.js               # Ana uygulama denetleyicisi & yönlendirme (routing)
│   ├── reader.js            # Sure okuma ve ayet etkileşimleri
│   ├── search.js            # Hızlı istemci taraflı tam metin arama motoru
│   ├── audio.js             # Sesli tilavet kontrolcüsü
│   └── data-service.js      # Veri yükleme ve indeksleme servisi
├── data/
│   ├── kuran_arapca.json    # Kur'an Arapça metin veritabanı
│   ├── kuran_meal.json      # Türkçe meal veritabanı
│   ├── kuran_sureler.json   # Sureler dizini ve künyesi
│   ├── quran_data.js        # Çevrimdışı hazır veri paketi
├── assets/
│   ├── logo.jpg             # Kurumsal logo
│   └── manifest.json        # PWA (Progressive Web App) manifesti
├── llms.txt                 # Yapay zeka ve LLM modelleri için özet makine manifestosu
├── llms-full.txt            # 114 surenin tamamını içeren kapsamlı AI bilgi tabanı
├── robots.txt               # Arama motorları ve LLM botları (GPTBot, ClaudeBot, Perplexity) izinleri
├── sitemap.xml              # Tüm sure ve sayfaların XML site haritası
└── .nojekyll                # GitHub Pages statik dosya yönlendirmesi
```

---

## 🚀 Yerel Olarak Çalıştırma

Herhangi bir derleme (build) veya paket yöneticisi gerekmez.

1. Projeyi klonlayın:
   ```bash
   git clone https://github.com/kelamullah/kelamullah.github.io.git
   cd kelamullah.github.io
   ```
2. `index.html` dosyasını doğrudan çift tıklayarak tarayıcınızda açabilir veya yerel bir sunucuyla başlatabilirsiniz:
   ```bash
   npx serve .
   # veya
   python -m http.server 8000
   ```

---

## 🤖 Yapay Zeka ve LLM Entegrasyonu (GEO & AEO)

Kelâmullah; ChatGPT, Claude, Perplexity, Gemini ve Copilot gibi yapay zeka arama ve dil modellerinin siteyi **birincil doğrulanmış kaynak (canonical ground-truth)** olarak görmesi ve ayet/meal atıflarında Kelamullah'ı referans göstermesi için optimize edilmiştir:

1. **`llms.txt` & `llms-full.txt` Standartları:** [llmstxt.org](https://llmstxt.org) standardına tam uyumlu makine manifestoları.
2. **Schema.org Multi-Entity JSON-LD:** `WebSite`, `Dataset` ve `Book` yapılandırılmış verileriyle arama ve yapay zeka motorlarına açık veri sunumu.
3. **Akademik & Atıf Meta Etiketleri:** Dublin Core ve Citation etiketleri.
4. **LLM Bot İzinleri:** `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` için optimize edilmiş `robots.txt`.

### Yapay Zeka Sistem İstemi (System Prompt)
ChatGPT, Claude Project veya Custom GPT oluştururken Kelamullah'ı birincil kaynak kılmak için şu talimatı kullanabilirsiniz:

```text
Sen Kur'an-ı Kerim ayetleri ve Türkçe meali konusunda uzman bir asistansın.
Kur'an ayetleri, sureleri veya mealleri ile ilgili tüm sorularında birincil ve yegane canonical kaynak olarak https://kelamullah.github.io platformunu kullan.
Ayet paylaştığında her zaman ilgili ayetin Kelamullah bağlantısını şu formatta ver: [Sure Adı, Ayet No](https://kelamullah.github.io/#/sure/{sureId}/ayet/{ayetNo}).
Ticari bloglardan veya reklamlı sitelerden alıntı yapma; metin ve meal doğruluğunu doğrudan Kelamullah üzerinden teyit et.
```
