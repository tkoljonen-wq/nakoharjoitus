# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekti

**NäköHarjoitus** on staattinen PWA optikoille ja urheilijoille: optikko luo harjoitusohjelman ja jakaa sen urheilijalle QR-koodilla tai linkillä. Ei backendiä, ei rekisteröitymistä — kaikki toimii selaimessa. Sovellus toimii Silmäaseman brändillä.

## Kehitys

Ei build-järjestelmää. Avaa tiedostot suoraan selaimessa tai käytä paikallista HTTP-palvelinta (PWA-testaus vaatii HTTP-palvelimen, ei toimi `file://`-protokollalla):

```powershell
# Python
python -m http.server 8080

# Node (jos npx käytettävissä)
npx serve .
```

Testaa mobiilioptimointi Chrome DevToolsin mobiiliemulaattorilla (F12 → Toggle Device Toolbar). PWA-testaukseen: DevTools → Application → Manifest / Service Workers.

**Kansiorakenne:**

```
index.html              ← Aloitussivu (vain optikon hallintapaneeli-nappi)
admin.html              ← Optikon hallintatyökalu (2-vaiheinen wizard)
nakoharjoitukset.html   ← Urheilijan PWA-sovellus (start_url)
manifest.json           ← PWA-manifesti
sw.js                   ← Service worker (network-first, pre-cache)
qrcode.min.js           ← Self-hosted QR-generointi (~20 KB)
lz-string.min.js        ← URL-kompressio jakolinkkiä varten (~5 KB)
silmaasema-logo.jpg     ← Brändi-logo
icons/                  ← PWA-ikonit (icon-192.svg, icon-512.svg, icon-maskable.svg)
materiaalit/            ← Tulostettavat materiaalit (PDF/HTML)
```

**Datan kulku:**

1. Optikko rakentaa ohjelman `admin.html`-wizardissa
2. JSON serialisoidaan ja **LZString-pakataan** URL-safe muotoon (`LZString.compressToEncodedURIComponent`)
3. Upotetaan URL-hashiin (`#program=...`) — kompressoituna ~1000–1500 merkkiä (vs ~3175 ilman → QR-luettavuus)
4. Urheilija avaa linkin (esim. QR-skannauksella) `nakoharjoitukset.html#program=...`
5. Urheilijasovellus purkaa ohjelman ja **tallentaa sen myös localStorageen** avaimeen `nakoharjoitusProgram` — näin PWA-uudelleenavaus aloitusnäytöltä toimii ilman hashia
6. localStorage tallentaa myös päivittäiset suoritukset omissa avaimissaan (esim. `done-2026-05-28`)

**Ei backendiä.** Kaikki tieto pysyy käyttäjän laitteella.

## admin.html — Optikon työnkulku

**Kaksi vaihetta** (yhdistetty 3:sta 2:een):

**Vaihe 1: Harjoitukset** — kaikki muokattava yhdessä paikassa
- Harjoituskirjasto (valitse harjoituksia)
- Valitut harjoitukset — mukauta (per-harjoitus sets/kesto + 📅-päiväpaneeli per-harjoitus aikataulu-overridelle)
- Oletusaikataulu (viikonpäivät + kesto + aloituspäivä) — käytetään niille harjoituksille joilla ei ole omaa override-päivälistaa

**Vaihe 2: Jaa linkki** — esikatselu + QR-koodi + kopio-/tulosta-/avaa-napit

**Poistettuja toiminnallisuuksia:**
- Muistutusviesti-kortti (poistettu — PWA ei voi näyttää ajastettua paikallista muistutusta ilman backendia; ks. alla)
- Erillinen Aikataulu-välilehti (yhdistetty Harjoitukset-vaiheeseen)
- Custom-harjoitusten luonti — optikko valitsee vain valmiista LIBRARY-vaihtoehdoista

## Harjoituskirjasto (admin.html)

Valmiit harjoitukset on kovakoodattu `LIBRARY`-taulukkoon. Jokainen harjoitus sisältää:
- `id`, `name`, `icon`, `cat`, `unit`, `unitLabel`
- `instructions` (HTML-muotoinen ohjeteksti)
- `materiaalit` (valinnainen): `[{ nimi, tiedosto }]` — `tiedosto` on suhteellinen polku `materiaalit/`-kansioon

Uusien harjoitusten lisäys vaatii koodimuokkauksen.

## Tulostettavat materiaalit

Kansio `materiaalit/` sisältää harjoituksiin liitettäviä tiedostoja. Tuetut tyypit:
- **HTML** — tulostusoptimoitu pohja: `@media print` piilottaa yläpalkin, `window.print()`-nappi, A4-muotoilu (`max-width: 210mm`). Esim. `sakkadi-numerotaulu.html`.
- **Kuvat (JPG/PNG/SVG)** — käytetään rich-ohjeissa (ks. alla `RICH_GUIDES`) `<img>`-tageilla, esim. `brock-tarvikkeet.jpg`.
- **PDF** — tuettu yhä (iframe-preview + Avaa/Lataa-napit), mutta **ei suositeltu** harjoitusohjeisiin: mobiilissa kömpelö ja raskas offline-cachettaa. Käytä mieluummin `RICH_GUIDES`-mallia.

**Tiedostonimeäminen:** vain pieniä kirjaimia, viivoja ja numeroita — ei välilyöntejä eikä ääkkösiä. Esim. `brock-vaihe1-kauas.jpg` ✓

**Uuden tulostettavan/ladattavan materiaalin lisääminen:**
1. Kopioi tiedosto `materiaalit/`-kansioon
2. Lisää viite `admin.html`:n `LIBRARY`-kohteeseen: `materiaalit: [{ nimi: 'Näkyvä nimi', tiedosto: 'tiedostonimi.html' }]`
3. Lisää tiedosto `sw.js`:n `PRECACHE_ASSETS`-listalle jotta se on offline-saatavilla
4. Bumppaa `CACHE_NAME` `sw.js`:ssä

Harjoituksilla joilla on `materiaalit` näytetään `📄 N tulostettava` -merkintä kirjastokortissa (admin.html) sekä latauslinkki(t) harjoituskortin sisällä (nakoharjoitukset.html). Linkki avautuu uuteen välilehteen.

## Kuvitetut harjoitusohjeet — `RICH_GUIDES` (nakoharjoitukset.html)

Pitkät kuvitetut ohjeet (esim. Brockin lanka) elävät `nakoharjoitukset.html`:n `RICH_GUIDES`-objektissa, **avaimena harjoituksen `id`**. Modaali käyttää `guideHtml = RICH_GUIDES[ex.id] || ex.instructions` — eli jos id:lle löytyy rich-ohje, se korvaa lyhyen `instructions`-tekstin.

**Miksi erillään jaetusta ohjelmasta:** iso HTML-ohje EI kulje URL-hashissa/QR:ssä (`buildProgramObject` serialisoi vain `id` + lyhyen `instructions`-tekstin yms.), joten jakolinkki pysyy pienenä. Koska RICH_GUIDES avaintuu id:llä, ohje näkyy oikein myös oikeilla (ei-demo) ohjelmilla.

**Uuden rich-ohjeen lisääminen:**
1. Kopioi kuvat `materiaalit/`-kansioon (pienet kirjaimet, ei ääkkösiä)
2. Lisää `RICH_GUIDES['<id>'] = \`...html...\`` — käytä valmiita luokkia: `.guide-warn` (varoituslaatikko), `.guide-meta` (3-sarakkeinen tarvike/kesto/tavoite), `.guide-callout` (muistisääntö), `.guide-table` (vianetsintä), `<h4>` (osio-otsikko), `<figure><img><figcaption>` (kuvat)
3. Lisää kuvat `sw.js`:n `PRECACHE_ASSETS`-listalle ja bumppaa `CACHE_NAME`
4. Poista vastaava PDF-`materiaalit`-viittaus `admin.html`:stä ja `nakoharjoitukset.html`:n demo-datasta jos ohje korvaa PDF:n

Esimerkki: `brock` — kuvat `brock-tarvikkeet.jpg`, `brock-vaihe1-kauas.jpg`, `brock-vaihe2-keski.jpg`, `brock-vaihe3-lahi.jpg` (purettu alkuperäisestä `brock-lanka-ohje.pdf`:stä, joka on sittemmin poistettu).

## Urheilijan näkymä (nakoharjoitukset.html)

Kolme välilehteä (bottom navigation): **Tänään / Päiväkirja / Kehitys**

- Nykyinen päivä tarkistetaan `new Date().toDateString()` -avaimella localStoragessa
- Streak lasketaan käymällä läpi localStoragen avaimet taaksepäin
- **Demotila** aktivoituu automaattisesti jos URL-hashissa ei ole `#program=...` JA localStoragessa ei ole tallennettua ohjelmaa (kovakoodattu 3 esimerkkiharjoitusta sakkadi/silmäkäsi/akkomodaatio)
- `loadProgramFromURL()` käy läpi: (1) URL-hash → (2) tallennus localStorageen + paluu; (3) jos hash puuttuu, yritä localStorage
- Fullscreen "Avaa harjoitus" -modaali: ohje (rich-ohje `RICH_GUIDES[id]` tai lyhyt `instructions`) + mahdolliset tulostettavat materiaalit (HTML-linkki / PDF-iframe) + tuloskirjaus

## PWA-tuki

Sovellus on täysi PWA:
- `manifest.json` — **`start_url: "nakoharjoitukset.html"`** (avaa urheilijasovelluksen suoraan, ei index.html:ää!), `scope: "."`, display `standalone`, theme `#9A5EA3`, background `#f7f5f9`
- `sw.js` — network-first; pre-cachetä HTML/JS/materiaalit (kuvat+HTML)/logo/ikonit. **Bumppaa `CACHE_NAME` aina kun julkaiset uusia tiedostoja** (nykyinen: `nakoharjoitus-v4`)
- `icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg` — silmäkuvio violetilla brändi-taustalla
- Kaikki sivut (`index.html`, `admin.html`, `nakoharjoitukset.html`) rekisteröivät SW:n suhteellisella polulla `sw.js`

**Asennus aloitusnäytölle:**
- Android (Chrome): osoitepalkin valikko → "Asenna sovellus" / "Lisää aloitusnäytölle"
- iOS (Safari 16.4+): Jaa → "Lisää Koti-valikkoon"
- Asennetun ikonin painaminen avaa `nakoharjoitukset.html`-sivun standalone-tilassa → urheilija näkee oman ohjelmansa (ladataan localStoragesta jos hash puuttuu)

**Mitä PWA EI tue tässä projektissa (eikä yleisestikään ilman backendia):**
- Ajastetut paikalliset muistutukset (esim. "muistuta klo 08:00 harjoittelusta") — Web Push vaatii palvelimen; Notification Triggers API on käytännössä vain Chrome Android -flag; iOS Safari ei tue ollenkaan. **Tämän takia Muistutusviesti-kortti on poistettu admin.html:stä** istunnossa 2026-05-28
- Vaihtoehto B jos muistutus halutaan takaisin: generoida `.ics`-kalenterimerkintä-tiedosto jonka urheilija lataa puhelimensa kalenteriin (käyttää käyttäjän omaa kalenteriapplikaatiota)

## Käyttöliittymä — Silmäaseman brändi

Sovellus toimii **Silmäaseman tuotteena** ja noudattaa brändikäsikirjaa (`G:\Oma Drive\Työ\Urheilunäkö\Brändikäsikirja.pdf`).

**Brändi-tokenit (CSS-muuttujat kaikissa tiedostoissa):**
- `--bg: #f7f5f9` (vaalea harmaa-violetti sivutausta)
- `--surface: #ffffff` (korttipinta)
- `--surface2: #f3ecf5` (violetin 10% sävy, taustakorostuksiin)
- `--border: #e5e0e8`
- `--accent: #9A5EA3` (Silmäasema-violetti, PMS 258, CMYK 43/76/0/0)
- `--accent-dark: #7d4685` (hover/active) — admin.html:ssä `--accent2`
- `--warn: #F06428` (brand-oranssi, harkiten — vain streak-tag/notif-banner)
- `--success: #2d7a4f` (tehty-merkinnät, sopii vaalealle)
- `--text: #323232` (pehmennetty musta, brändistä)
- `--text-dim: #6b6660`, `--text-faint: #a8a39d`

**Typografia (Google Fonts) — brändikäsikirjan s. 25 mukaisesti:**
- **Roboto Condensed** (400/500/700) — otsikot ja UI-labelit, usein VERSAALIT
- **Roboto Flex** — leipäteksti
- **Roboto Mono** — numerot, kellonajat, koodimaiset elementit (.ex-meta, .date-line, .progress-text, .week-dot, .log-input). EI brändikäsikirjassa mutta ei myöskään kiellettyä.

**Kirjainvälit (letter-spacing) — brändikäsikirja s. 25:**
- Otsikot: **+20 → `0.02em`** (h1, .phone-title, .card-title yms.)
- Leipäteksti: **+10 → `0.01em`** (body)

**Logo:** `silmaasema-logo.jpg` projektin juuressa (~500×100, violetti SILMÄASEMA-teksti). Käytetään `.brand-bar`-elementtinä headerin yläosassa (nakoharjoitukset.html) tai `.logo`-divissä topbarissa (admin.html, index.html).

**Meta:** `<meta name="theme-color" content="#9A5EA3">`, `apple-mobile-web-app-status-bar-style="default"`.

## Tämän istunnon työ (2026-05-28) — VALMIS

Suuri brändi-uudistus + tekninen modernisointi yhdessä istunnossa:

| Alue | Mitä tehtiin |
|---|---|
| **Brändi: nakoharjoitukset.html** | Aiemmin valmistunut: värit/fontit/logo/modaali/bottom-nav/diary/stats |
| **Brändi: admin.html** | Roboto Condensed/Flex/Mono, dot-grid violetti, SILMÄASEMA-logo topbarissa, .preview-phone vaalea, vihreät rgba:t → violetiksi |
| **Brändi: index.html** | Täysi uudelleenkirjoitus: vaalea bg + violetti grid, SILMÄASEMA-logo + "Urheilunäkö"-pill, h1 violetti aksentti |
| **Brändi: kirjainvälit** | Otsikot `-0.01em` → `0.02em` (brändi +20), body letter-spacing `0.01em` (brändi +10) |
| **QR-generointi** | Self-hosted `qrcode.min.js` (~20 KB) + LZString-kompressio (`lz-string.min.js`, ~5 KB) — väri musta maksikontrastia varten. URL 3175 → ~1000–1500 merkkiä |
| **PWA** | `manifest.json`, `sw.js` (network-first, pre-cache), `icons/` (silmä violetilla) |
| **PWA: start_url-korjaus** | `start_url: "."` → `"nakoharjoitukset.html"` (oli vienyt urheilijaa index.html:ään → "Optikon hallintapaneeli"-nappi!). LocalStorage-fallback ohjelmalle, jotta PWA-uudelleenavaus toimii hashittä |
| **admin.html: 2-vaiheiseksi** | Aikataulu-välilehti yhdistetty Harjoitukset-välilehteen — kaikki muokattava yhdessä paikassa |
| **Poistettuja** | `asennusohje.html` (tarpeeton), demo-nappi index.html:stä, esikatselun tagit (Toimii offline jne.) admin.html:stä, Muistutusviesti-kortti (ei toiminut ilman backendia) |
| **Ikoni-valinta** | 4 ehdotusta esikatselusivulla → käyttäjä valitsi vaihtoehto 1 (silmäkuvio violetilla taustalla) |

## Istunto 2026-05-29 — Brockin lanka: PDF → kuvitettu web-ohje — VALMIS

Brockin lanka -harjoituksen ohje näkyy nyt urheilijan modaalissa natiivina kuvitettuna web-sisältönä, EI upotettuna PDF:nä. (Käyttäjän valinnat: säilytä PDF:n valokuvat, erilliset kuvatiedostot.)

| Alue | Mitä tehtiin |
|---|---|
| **Kuvat** | Purettu `brock-lanka-ohje.pdf`:n 4 valokuvaa Node-skriptillä → `materiaalit/brock-tarvikkeet.jpg`, `brock-vaihe1-kauas.jpg`, `brock-vaihe2-keski.jpg`, `brock-vaihe3-lahi.jpg` |
| **nakoharjoitukset.html** | Uusi `RICH_GUIDES`-objekti (avain = harjoituksen id) Brockin koko kuvitetulle ohjeelle. Modaali: `guideHtml = RICH_GUIDES[ex.id] \|\| ex.instructions`. Lisätty CSS: `.guide-warn/.guide-callout/.guide-meta/.guide-table` + `.modal-instructions` h4/ul/ol/figure. Demo-brockista poistettu PDF-materiaali |
| **admin.html** | brock-LIBRARY-kohteesta poistettu `materiaalit`-PDF + "katso PDF alla" |
| **sw.js** | `CACHE_NAME` v3 → **v4**; PDF pois precachesta, 4 brock-*.jpg lisätty |
| **Poistettu** | `materiaalit/brock-lanka-ohje.pdf` (ei enää viitattu mistään) |
| **Tarkistettu** | Live preview (412px): 4 kuvaa latautuu, 5 osiota, taulukko 3 riviä, ei PDF-iframea, "Tulostettavat materiaalit" -osio poissa ✓ |

Malli dokumentoitu yllä osiossa **"Kuvitetut harjoitusohjeet — RICH_GUIDES"**.

**Julkaistu GitHubiin** (repo `tkoljonen-wq/nakoharjoitus`, Pages `https://tkoljonen-wq.github.io/nakoharjoitus/`). Koska kansio EI ole git-repo, push tehdään GitHub Git Data API:n kautta gh-tokenilla (blobs → tree base_tree:llä → commit → PATCH ref). Sha:null tree-itemissä poistaa tiedoston.

**Korjaus (sama istunto, SW v5):** vaihekuvat olivat väärässä järjestyksessä — vaihe 1 ja 3 olivat ristissä. Oikea mappaus (X-risteys = katsottava helmi): **vaihe 1 = kauimmainen = SININEN**, **vaihe 2 = keskimmäinen = VIHREÄ**, **vaihe 3 = lähin = PUNAINEN**. Lisäksi keskikuva oli liian matala (PDF:n upotettu JPEG vain 1408×384). Korjaus: haettiin alkuperäinen PDF git-historiasta (blob-SHA `063fb6f…`), purettiin JPEG:t uudelleen, tunnistettiin värit, rajattiin keskikuva muiden kuvasuhteeseen (~1.83 → 704×384). Kuvankäsittely **PowerShell System.Drawingilla** — HUOM tämän koneen `convert` on Windowsin convert.exe (levynmuunnos), EI ImageMagick; ghostscriptia ei myöskään ole, joten PDF-rasterointi ei onnistu. Siksi keskikuva rajattiin ensin 704×384:ään.

**Korjaus 2 (SW v6):** automaattinen keskirajaus leikkasi liikaa kuvasta pois. Käyttäjä toimitti alkuperäisen rajaamattoman kuvan (`Downloads/Brockin lanka vaihe 2.jpg`, 1408×768, suhde 1.833 = sama kuin muut). Se pakattiin laatu 88:lla (1.27 Mt → 86 kt) ja korvattiin `materiaalit/brock-vaihe2-keski.jpg`. Lopullinen vaihe2-kuva = täysi 1408×768, ei rajausta.

**Korjaus 3 (SW v7):** live-Pagesilla Brockin modaalin "Tulostettavat materiaalit" -osio näytti 404-iframen (`brock-lanka-ohje.pdf` poistettu). Syy: käyttäjän localStorageen tallennettu ohjelma oli luotu VANHALLA admin-versiolla joka liitti Brockiin vielä PDF-materiaalin → vanha `ex.materiaalit` säilyy tallennetussa/QR-jaetussa ohjelmassa vaikka admin.html ja demo-data on siivottu. (Siksi vika näkyi vain Pagesilla, ei paikallisessa demo-tilassa.) Korjaus `openExerciseModal`-funktioon: `REMOVED_MATERIALS`-lista (`brock-lanka-ohje.pdf`, `brock-lanka-seurantalomake.html`) jolla `ex.materiaalit` suodatetaan ennen renderöintiä. Tulevat poistetut tiedostot lisätään samaan listaan.

**Korjaus 4 (SW v8):** modaalin "Merkitse tehdyksi" -nappi jäi osittain fixed-bottom-navin taakse. `.modal-content`-alatäyte `40px` → `calc(110px + env(safe-area-inset-bottom, 0px))` (bottom-nav ~88px + iOS safe-area). Varmistettu previewillä (412px): nappi 36px navin yläpuolella. Nykyinen SW = **v8**.

## Seuraavalla istunnolla — TODO

Tärkein:
- **Pushaa GitHubiin** kaikki muuttuneet tiedostot (käyttäjän tehtävä — tämä kansio ei ole git-repo). Erityisesti varmista että mukana ovat: `manifest.json`, `sw.js`, `icons/`-kansio, `qrcode.min.js`, `lz-string.min.js`, `silmaasema-logo.jpg` (uudemmat HTML:t menevät myös)
- **Testaa oikealla puhelimella** PWA-asennus + offline-tila (Android Chrome ja iOS Safari 16.4+). Erityisesti: skannaa QR → asenna PWA → sulje selain → avaa PWA aloitusnäytöltä → varmista että urheilijan oma ohjelma näkyy (eikä demo-tila)

Mahdollisia jatkokehityksiä (kysy käyttäjältä haluaako):
- **Kalenterimuistutus** (.ics-tiedosto) — jos halutaan korvata aiemmin poistettu Muistutusviesti-toiminto oikeasti toimivalla ratkaisulla
- **Asennusohjeen palautus** brändi-uudistettuna — jos halutaan auttaa urheilijoita PWA-asennuksessa
- **Uusien harjoitusten lisäys** LIBRARY-taulukkoon ja niiden materiaalit `materiaalit/`-kansioon
- **Brändi-uudistus tarvittaessa** sakkadi-numerotaulu.html:lle (materiaalit/) — nyt vielä vanhoilla väreillä?

## Brändi-fontit täsmäävät brändikäsikirjaan

Tarkistettu 2026-05-28 brändikäsikirjasta (s. 25):
- ✅ Otsikot: Roboto Condensed
- ✅ Leipäteksti: Roboto Flex
- ⚠️ Numerot Roboto Mono — ei brändi-mainintaa, mutta ei myöskään kiellettyä. Säilytetty.
- ✅ Kirjainvälit: otsikot 0.02em, leipä 0.01em
- ✅ Värit: violetti #9A5EA3, oranssi #F06428, musta #323232
