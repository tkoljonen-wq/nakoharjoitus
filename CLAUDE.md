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
- **PDF** — tuettu yhä (iframe-preview + Avaa/Lataa-napit), mutta **ei suositeltu** harjoitusohjeisiin: mobiilissa kömpelö ja raskas offline-cachettaa. Käytä mieluummin `RICH_GUIDES`-mallia. (HUOM: **tulostettaviin A4-tauluihin** PDF on kuitenkin paras valinta — ks. istunto 2026-05-30 alla.)

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
- **Demotila** aktivoituu automaattisesti jos URL-hashissa ei ole `#program=...` JA localStoragessa ei ole tallennettua ohjelmaa (kovakoodattu esimerkkiharjoitukset)
- `loadProgramFromURL()` käy läpi: (1) URL-hash → (2) tallennus localStorageen + paluu; (3) jos hash puuttuu, yritä localStorage
- Fullscreen "Avaa harjoitus" -modaali: ohje (rich-ohje `RICH_GUIDES[id]` tai lyhyt `instructions`) + mahdolliset tulostettavat materiaalit (HTML-linkki / PDF-iframe) + tuloskirjaus

## PWA-tuki

Sovellus on täysi PWA:
- `manifest.json` — **`start_url: "nakoharjoitukset.html"`** (avaa urheilijasovelluksen suoraan, ei index.html:ää!), `scope: "."`, display `standalone`, theme `#9A5EA3`, background `#f7f5f9`
- `sw.js` — network-first; pre-cachetä HTML/JS/materiaalit (kuvat+HTML)/logo/ikonit. **Bumppaa `CACHE_NAME` aina kun julkaiset uusia tiedostoja** (nykyinen versio: ks. "Nykytila"-osio alla)
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

**Korjaus 4 (SW v8):** modaalin "Merkitse tehdyksi" -nappi jäi osittain fixed-bottom-navin taakse. `.modal-content`-alatäyte `40px` → `calc(110px + env(safe-area-inset-bottom, 0px))` (bottom-nav ~88px + iOS safe-area). Varmistettu previewillä (412px): nappi 36px navin yläpuolella.

## Istunto 2026-05-30 — Harjoitusten uudistus + sisältöarkkitehtuurin korjaus — VALMIS

Lisättiin suorituskuvat, uudistettiin/lisättiin harjoituksia, korjattiin tallennettujen ohjelmien sisällön päivittyminen, poistettiin 3 harjoitusta, ja korjattiin modaalin vieritys. **SW v8 → v13.** Kansio ei ole git-repo → käyttäjä pushaa itse (tiedostot `nakoharjoitukset.html`, `admin.html`, `sw.js` + uudet `materiaalit/`).

| Vaihe | Mitä tehtiin |
|---|---|
| **Brockin lanka: suorituskuva** | Lisätty `materiaalit/brock-suoritus.jpg` (leikepöydältä, pakattu ~83 kt) rich-ohjeen "1. Valmistelu" -osioon |
| **Silmä-käsikoordinaatio: uudistus** | Korvattiin uudella sisällöllä: brock-tyylinen `RICH_GUIDES['silmakasi']`, suorituskuva `silmakasi-suoritus.jpg` (~87 kt), Tasapainohaaste-variaatio. Päivitetty unit→`kiinniotot`, unitLabel→`onnistuneet kiinniotot (30 s)` |
| **Sakkadi → Fiksaatioharjoitus** | "Sakkadinen silmänliike" korvattiin Fiksaatioharjoituksella (id pysyi `sakkadi`). Uusi `RICH_GUIDES['sakkadi']`, suorituskuva `fiksaatio-suoritus.jpg` (~96 kt), **kaksi tulostettavaa A4-PDF-taulua** `fiksaatiotaulu-1.pdf` / `fiksaatiotaulu-2.pdf` `materiaalit`-taulukossa. unit→`kirjaimet` |
| **PDF-taulujen tapa** | Päätös: tulostettaviin A4-tauluihin **PDF on paras** (kiinteä asettelu, luotettava tulostus) ja sovelluksen valmis `materiaalit`-mekanismi näyttää ne "Tulostettavat materiaalit" -osiossa (iframe + Avaa + Lataa). Parempi kuin HTML-tulostussivu A4-tarkkuuden takia |
| **Poistettu 3 harjoitusta** | Akkomodaatio (`akkomodaatio`), Silmän seuranta (`pursuit`), Perifeerinen näkö (`periferia`) — poistettu `admin.html` LIBRARY:stä ja `nakoharjoitukset.html` katalogista + lisätty `REMOVED_EXERCISE_IDS`-listaan (katoavat myös jo jaetuista ohjelmista) |
| **Modaalin vieritys** | `openExerciseModal` nollaa nyt `overlay.scrollTop = 0` joka avauksella → harjoitus avautuu aina ylhäältä (overlay on vierittyvä elementti ja sitä käytetään uudelleen, joten scroll jäi muistiin) |

### ⭐ Sisältöarkkitehtuuri — harjoitusdatan KAKSI lähdettä (tärkein oppi)
Sisältö elää **kahdessa paikassa**, ja molemmat on päivitettävä kun harjoitusta muokataan:

1. **`admin.html` → `LIBRARY`** = lähde **uusille** generoitaville ohjelmille. Kun ohjelma generoidaan, harjoitusten sisältö (ml. `materiaalit`) leivotaan QR-koodiin/linkkiin (`out.materiaalit = ex.materiaalit`). Kentät: `{ id, name, icon, cat, unit, unitLabel, instructions, materiaalit? }` (ei duration/sets — ne asetetaan ohjelmakohtaisesti).

2. **`nakoharjoitukset.html` → `DEFAULT_EXERCISES`** = sisäänrakennettu katalogi (myös demo-fallback). Aktiivinen lista rakennetaan:
   ```js
   const REMOVED_EXERCISE_IDS = ['akkomodaatio','periferia','pursuit'];
   const EXERCISES = (URL_PROGRAM?.exercises || DEFAULT_EXERCISES)
     .filter(ex => !REMOVED_EXERCISE_IDS.includes(ex.id))   // poistetut pois myös vanhoista ohjelmista
     .map(ex => {
       const cat = DEFAULT_EXERCISES.find(c => c.id === ex.id);
       if (!cat) return ex;                                  // ei katalogissa → säilytä ohjelman sisältö
       return { ...ex,                                       // ohjelma: days, sets, duration
         name: cat.name ?? ex.name, icon: cat.icon ?? ex.icon, cat: cat.cat ?? ex.cat,
         unit: cat.unit ?? ex.unit, unitLabel: cat.unitLabel ?? ex.unitLabel,
         instructions: cat.instructions ?? ex.instructions,
         materiaalit: cat.materiaalit ?? ex.materiaalit };   // CONTENT katalogista id:n perusteella
     });
   ```

**Kultainen sääntö:** tallennettu/QR-jaettu ohjelma määrää vain **mitkä** harjoitukset + aikataulun (`days`, `sets`, `duration`). **Kaikki sisältö (name, icon, cat, unit, unitLabel, instructions, materiaalit) virkistetään aina `DEFAULT_EXERCISES`:stä id:n perusteella.** → Sisältömuutokset näkyvät myös jo jaetuissa ohjelmissa **ilman uutta QR-koodia**. (Tämä korjasi bugin jossa vanha "Numerotaulu"-materiaali jäi näkymään päivityksen jälkeen.)

Apulistat `nakoharjoitukset.html`:ssä:
- **`REMOVED_EXERCISE_IDS`** — poistetut harjoitus-id:t (suodattuvat pois myös vanhoista ohjelmista).
- **`REMOVED_MATERIALS`** (`openExerciseModal`:ssa) — poistettujen materiaalitiedostojen nimet. Nyt: `brock-lanka-ohje.pdf`, `brock-lanka-seurantalomake.html`, `sakkadi-numerotaulu.html`.
- **`RICH_GUIDES`** — kuvitetut ohjeet id:n mukaan.

### Nykyiset harjoitukset (2026-05-30)
| id | nimi | rich-ohje | materiaalit |
|----|------|-----------|-------------|
| `sakkadi` | Fiksaatioharjoitus | kyllä | `fiksaatiotaulu-1.pdf`, `fiksaatiotaulu-2.pdf` |
| `silmakasi` | Silmä-käsikoordinaatio | kyllä | – |
| `brock` | Brockin lanka | kyllä | – (kuvat rich-ohjeessa) |
| `kissakortti` | Kissakortti | kyllä | `kissakortti.pdf` (tulostettava kortti) |
| `reaktio` | Tennispallon pudotus | kyllä | – (kuva rich-ohjeessa, ei PDF) |

### Kuvanpakkaus-resepti (PowerShell System.Drawing)
Pakkaa kaikki uudet valokuvat ennen käyttöä: ~1200 px leveä JPG, laatu 82 (~85–100 kt). Käyttäjän alkuperäiskuva on usein **leikepöydällä tiedostona** — hae polku: `[System.Windows.Forms.Clipboard]::GetFileDropList()`.
```powershell
Add-Type -AssemblyName System.Drawing
$img=[System.Drawing.Image]::FromFile($src); $maxW=1200
if($img.Width -gt $maxW){$newW=$maxW;$newH=[int]($img.Height*$maxW/$img.Width)}else{$newW=$img.Width;$newH=$img.Height}
$bmp=New-Object System.Drawing.Bitmap $newW,$newH
$g=[System.Drawing.Graphics]::FromImage($bmp);$g.InterpolationMode='HighQualityBicubic';$g.DrawImage($img,0,0,$newW,$newH);$g.Dispose()
$codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}
$ep=New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality),([long]82)
$bmp.Save($dst,$codec,$ep)
```

### ⭐ RESEPTI: uuden harjoituksen lisääminen
1. **Kuva/PDF:t** → pakkaa kuva (yllä) ja kopioi `materiaalit/`-kansioon selkein nimin (esim. `<id>-suoritus.jpg`, `<id>-taulu-1.pdf`). Vain pieniä kirjaimia, viivoja, numeroita — ei ääkkösiä/välilyöntejä.
2. **`admin.html` `LIBRARY`** → lisää objekti `{ id, name, icon, cat, unit, unitLabel, instructions, materiaalit? }`. id uniikki ja lyhyt.
3. **`nakoharjoitukset.html` `DEFAULT_EXERCISES`** → lisää **sama** objekti (lisää myös `duration` ja `sets` demo-arvoiksi). Sama id.
4. **`nakoharjoitukset.html` `RICH_GUIDES`** → lisää `<id>: \`...\`` kuvitettu ohje brock/silmakasi/sakkadi-tyylillä (`.guide-warn`, `.guide-meta`, `<h4>`, `<figure>`, `.guide-callout`...). Valinnainen jos lyhyt `instructions` riittää.
5. **`sw.js`** → lisää uudet `materiaalit/`-tiedostot `PRECACHE_ASSETS`-listaan **ja bumppaa `CACHE_NAME`**.
6. Kerro käyttäjälle pushattavat tiedostot.

### ⭐ RESEPTI: harjoituksen poistaminen
1. Poista objekti `admin.html` `LIBRARY`:stä.
2. Poista objekti `nakoharjoitukset.html` `DEFAULT_EXERCISES`:stä (+ mahd. `RICH_GUIDES`-merkintä ja demo-päiväkirjaviittaukset).
3. Lisää id `REMOVED_EXERCISE_IDS`-listaan → katoaa myös jo jaetuista ohjelmista.
4. (Valinnainen) lisää vanhentuneet materiaalitiedostot `REMOVED_MATERIALS`-listaan.
5. Bumppaa `CACHE_NAME`.

## Istunto 2026-05-30 (4) — Monisarjainen tuloskirjaus (dynaaminen) + done-lippu — VALMIS

Fiksaatioharjoitus (`sakkadi`) kerää nyt **vaihtelevan määrän** sarjatuloksia. Toteutus on **geneerinen ja dynaaminen**: kenttä `series: true` saa modaalin näyttämään yhden syöttökentän kerrallaan + **"Tallenna"-napin**, joka lisää tuloksen listaan ja antaa syöttää seuraavan. "Merkitse tehdyksi" päättää harjoituksen. → Ei tarvitse tietää etukäteen montako sarjaa tehdään.

**Käyttövirta:** tyhjä kenttä "Sarja 1" → kirjoita arvo (Tallenna-nappi aktivoituu) → Tallenna (tai Enter) → rivi listaan, uusi kenttä "Sarja 2" → … → Merkitse tehdyksi. Jokaisella tallennetulla rivillä ✕-poistonappi. Aktiivisessa kentässä oleva kirjoittamaton arvo otetaan mukaan myös "Merkitse tehdyksi" -painalluksessa.

### ⭐ done-lippu (tärkeä arkkitehtuurimuutos)
Koska osatulokset persistoituvat jo "Tallenna"-napilla (ettei data katoa modaalin sulkeutuessa), kortin "tehty"-tila EI voi enää perustua pelkkään `completed[id]`:n olemassaoloon. Lisätty **`done`-lippu**:
- "Tallenna" → `completed[id] = { nums:[...], note, done:false, time }` (kortti EI vihreä)
- "Merkitse tehdyksi" → `done:true` (kortti vihreä)
- Apufunktio **`isDone(id)`** = `!!c && c.done !== false`. **Vanhat done-liputtomat tallennukset tulkitaan tehdyiksi** (ne kirjattiin vain markDone-napilla) → taaksepäin yhteensopiva.
- `isDone` korvaa vanhan "presence"-tarkistuksen: korttirenderöinti, ex-status, modaalin done-nappi, `updateProgress` (`done = TODAY_EXERCISES.filter(ex=>isDone(ex.id))`), streak-laskenta (`Object.values(day).some(e=>e.done!==false)`).

| Alue | Mitä tehtiin |
|---|---|
| **DEFAULT_EXERCISES / admin LIBRARY** | `series: true` lisätty **sakkadille**, **silmakasille** ja **reaktiolle**. EXERCISES refresh-map propagoi `series`:n jaettuihin ohjelmiin |
| **`openExerciseModal`** | `isMulti = !!ex.series`. Multi → `<div id="seriesContainer">` jonka `renderSeriesSection()` täyttää; init `modalSeries` `prev.nums`:sta. Single → yksi `#modalNum` kuten ennen |
| **Uudet fn:t** | `renderSeriesSection()`, `updateSeriesSaveBtn()`, `addSeriesEntry()`, `removeSeriesEntry(i)`, `persistSeriesProgress()`. Tila: `let modalSeries = []` |
| **CSS** | `.series-unit`, `.series-row`, `.series-value` (surface2-tausta), `.series-save` (violetti, disabled kun tyhjä), `.series-del` (✕) |
| **`sw.js`** | CACHE_NAME v15 → **v17** |

**⭐ Tallennusmuoto (Päiväkirja-työlle):** monisarjainen `completed[id] = { nums:['42','45','48'], note, done, time }`, yksittäinen `{ num, note, done, time }`. Tuleva päiväkirja-renderöinti (yhä demo, lukee vain `DIARY_DATA`a) pitää osata näyttää **molemmat muodot**.

**Testattu** live-previewillä (412px): alkutila 1 kenttä + disabloitu Tallenna; kirjoitus aktivoi napin; Tallenna lisää rivin + tyhjentää kentän + uusi "Sarja N+1"; Enter toimii; osatulos → localStorage `done:false`, kortti EI vihreä; aktiivinen kirjoittamaton arvo mukaan "Merkitse tehdyksi":ssä → `nums:['42','45','48'] done:true`; uudelleenavaus palauttaa rivit + "Sarja 4" jatkoa varten; ✕ poistaa; single-input (brock) toimii ennallaan `{num,done:true}`. ✓

## Istunto 2026-05-30 (2) — Uusi harjoitus: Kissakortti — KOODI VALMIS, kuvat puuttuvat

Lisätty harjoitus **Kissakortti** (`id: kissakortti`) — stereonäön/konvergenssin harjoitus (kynä + kortti jossa 2 kissaa → keskimmäiset sulautuvat "kolmanneksi kissaksi" joka näkyy kolmiulotteisena). Lähteet: `Desktop/Näköharjoitteet/Kissakortti.pdf` (tulostettava kortti) + `Kissakortti ohje.docx/.pdf` (ohjeteksti).

| Alue | Mitä tehtiin |
|---|---|
| **`admin.html` LIBRARY** | Lisätty kissakortti-objekti (icon 🐱, cat "Konvergenssi / stereonäkö", unit "toistot", materiaalit `kissakortti.pdf`) |
| **`nakoharjoitukset.html` DEFAULT_EXERCISES** | Sama objekti + `duration: '5 min'`, `sets: '5–10 toistoa'` |
| **`nakoharjoitukset.html` RICH_GUIDES** | Uusi `kissakortti`-kuvitettu ohje brock/sakkadi-tyylillä (guide-warn, guide-meta, 5 osiota + vianetsintätaulukko). Viittaa kuviin `kissakortti-suoritus.jpg` + `kissakortti-tavoite.jpg` |
| **`materiaalit/kissakortti.pdf`** | Kopioitu `Desktop/Näköharjoitteet/Kissakortti.pdf`:stä |
| **`sw.js`** | CACHE_NAME v13 → **v14**; lisätty `kissakortti.pdf`, `kissakortti-suoritus.jpg`, `kissakortti-tavoite.jpg` |

**⚠️ PUUTTUU (käyttäjän tehtävä):** kaksi valokuvaa liitettiin chattiin mutta EI levylle. Käyttäjän pitää tallentaa ne kansioon `materiaalit/` nimillä:
- `kissakortti-suoritus.jpg` — havainnekuva (henkilö pitää kissakorttia + kynää osoittimena)
- `kissakortti-tavoite.jpg` — tavoitenäkymä (kolme kissaa, keskimmäinen kolmiulotteinen)
Pakkaa kuvanpakkaus-reseptillä (~1200 px, laatu 82) ennen kopiointia. Ennen näiden lisäystä rich-ohjeen `<figure>`-kuvat näyttävät rikkinäisen kuvan (muu sisältö toimii).

## Istunto 2026-05-30 (3) — Uusi harjoitus: Tennispallon pudotus (reaktio) — VALMIS

Lisätty harjoitus **Tennispallon pudotus** (`id: reaktio`) — reaktio- ja perifeerisen näön harjoitus (pari pudottaa tennispallon, urheilija ottaa kiinni katse suoraan eteenpäin). Lähteet: `Desktop/Näköharjoitteet/Reaktio ja perifeerinen näkö ohje.docx/.pdf` + kuva `materiaalit/Reaktioharjoitus.png`. **Ei PDF-materiaaleja** (vaatii parin, ei tulostettavaa). Pisteytys: 10 pudotusta, 2/1/0 pistettä → max 20.

| Alue | Mitä tehtiin |
|---|---|
| **`admin.html` LIBRARY** | Lisätty reaktio-objekti (icon ⚡, cat "Reaktio / perifeerinen näkö", unit "pisteet", ei materiaaleja) |
| **`nakoharjoitukset.html` DEFAULT_EXERCISES** | Sama objekti + `duration: '5 min'`, `sets: '10 pudotusta'` |
| **`nakoharjoitukset.html` RICH_GUIDES** | Uusi `reaktio`-kuvitettu ohje (guide-warn, guide-meta, suorituskuva, pisteytystaulukko, callout, variaatiot) |
| **`materiaalit/reaktio-suoritus.jpg`** | Pakattu `Reaktioharjoitus.png`:stä (1,78 Mt → 94 kt, 1200×900); alkuperäinen PNG poistettu |
| **`sw.js`** | CACHE_NAME v14 → **v15**; lisätty `reaktio-suoritus.jpg` |

## Istunto 2026-05-30 (5) — Päiväkirja näyttää oikeaa dataa — VALMIS

Päiväkirja-välilehti luki aiemmin kovakoodattua `DIARY_DATA`-demoa. Nyt `buildDiary()` lukee oikeat suoritukset localStoragesta (`completed_YYYY-MM-DD`-avaimet) ja näyttää ne uusin päivä ensin.

| Alue | Mitä tehtiin |
|---|---|
| **`nakoharjoitukset.html`** | Poistettu demo-`DIARY_DATA`. `buildDiary()` skannaa kaikki `completed_*`-avaimet, suodattaa vain tehdyt (`done !== false`, sama logiikka kuin `isDone`), muotoilee tuloksen (monisarjainen `nums` → `42 · 45 · 48 yksikkö`, yksittäinen `num` → `22 cm`) ja hakee nimen+yksikön (`unit`) DEFAULT_EXERCISESista id:n perusteella |
| **Apufunktiot** | `diaryExMeta(id)` (nimi+yksikkö DEFAULT_EXERCISESista, fallback EXERCISES→id), `formatDiaryResult(entry, unit)`, `escapeHtml()` (käyttäjän muistiinpanot escapataan) |
| **Tyhjä tila** | `.diary-empty`-kortti "Ei vielä merkintöjä…" kun localStoragessa ei ole tehtyjä suorituksia |
| **Päivitys** | `showView('diary')` kutsuu `buildDiary()`n uudelleen → istunnon aikana tehdyt merkinnät näkyvät heti ilman reloadia |
| **`sw.js`** | CACHE_NAME v20 → **v21** |

**Tallennusmuoto-muistutus:** monisarjainen `{ nums:['42','45'], note, done, time }`, yksittäinen `{ num:'22', note, done, time }`. Päiväkirja osaa molemmat. `done:false` (osatulos, ei merkitty tehdyksi) suodatetaan pois.

**Testattu** previewillä (375px): 3 päivää uusin-ensin, `42 · 45 · 48 kirjaimet` + `22 cm` + `7 toistot`, muistiinpanot näkyvät, `done:false`-rivi pois, tyhjä tila näyttää placeholderin. ✓

**Pushattavat:** `nakoharjoitukset.html`, `sw.js` (käyttäjä pushaa itse — kansio ei ole git-repo).

## Istunto 2026-05-30 (6) — Kehitys-välilehti näyttää oikeaa dataa — VALMIS

Kehitys (Tilastot) -välilehti käytti kovakoodattua demo-dataa (`buildChart`-taulukko reaktioajoista + `statTotal = done + 12` + stat-korttien HTML-arvot 5/3/75%). Nyt kaikki neljä korttia, putki ja kaavio lasketaan oikeasti localStoragesta.

| Alue | Mitä tehtiin |
|---|---|
| **Jaetut apufunktiot** | `loadAllCompletions()` (kaikki `completed_*`-avaimet → `{date:data}`), `doneCountForDay(data)` (tehtyjen määrä, `done!==false`). `buildDiary` refaktoroitu käyttämään näitä |
| **`buildStats()`** | **Harjoitusta yhteensä** = kaikkien päivien tehdyt suoritukset; **Päivien putki** = peräkkäiset harjoituspäivät tähän asti (tämän päivän tekemättömyys ei katkaise); **Tällä viikolla** = kuluvan viikon tehdyt; **Suoritusaste** = viikon tehdyt / aikataulutetut (`computeTodayExercises(dayIdx).length`). Asettaa myös header-`streakCount`:n samasta laskennasta |
| **`buildChart()`** | Viikkokaavio: tehtyjä harjoituksia per päivä (ma–su, kuluva viikko). Tuleva päivä = tyhjä palkki. Otsikko "Sakkadi — reaktioaika (ms)" → **"Harjoituksia / päivä — tämä viikko"** |
| **`currentWeekDays()`** | Kuluvan viikon ma–su avaimet (UTC-pohjainen kuten tallennus), `future`-lippu tuleville päiville |
| **Live-päivitys** | `markDoneFromModal` ja `showView('stats')` kutsuvat `buildStats()/buildChart()` → tilastot päivittyvät heti. Init-osion vanha streak-silmukka poistettu (buildStats hoitaa) |
| **`sw.js`** | CACHE_NAME v21 → **v22** |

**Testattu** previewillä (375px): 5 päivän viikkodata → total 7, putki 4 (ma–ti aukko katkaisee), tällä viikolla 7, suoritusaste 23% (7/30, demossa 5 harj./pv × 6 mennyttä pv), kaavio ma2·ke1·to2·pe1·la1 (ti+su tyhjät), `done:false`-osatulos ei lasketa. Tyhjä tila → 0/0/0/0%. Ei konsolivirheitä. ✓

**Pushattavat:** `nakoharjoitukset.html`, `sw.js` (käyttäjä pushaa itse — kansio ei ole git-repo).

## Istunto 2026-05-30 (7) — Harjoituskohtaiset viivadiagrammit Kehitys-välilehdelle — VALMIS

Lisätty Kehitys-välilehdelle uusi osio **"Harjoituskohtainen kehitys"**: SVG-viivadiagrammi neljälle harjoitukselle. Päivän arvo = sen päivän lukemien **keskiarvo** (monisarjaiset → ka, yksittäinen lukema → arvo itse).

| Alue | Mitä tehtiin |
|---|---|
| **Kaaviot** | `brock` (cm), `silmakasi` (kiinniotot), `reaktio` (pisteet), `sakkadi` (kirjaimet). **Kissakortti jätetään pois** (`LINE_CHART_EXERCISES`-listassa ei). |
| **`exerciseSeries(id)`** | Kronologinen sarja: kunkin päivän `nums`/`num` → keskiarvo (parseFloat, NaN-suodatus). Vain `done!==false`. |
| **`lineChartSvg(points)`** | Inline-SVG viivadiagrammi (viimeiset 12 pistettä): pinta-alatäyttö (`--surface2`), viiva + pisteet (`--accent`), arvolabelit pisteiden yllä, x-akselin päivämäärät (DD.MM, joka toinen jos >7 pistettä). Yhden pisteen tapaus → keskitetty piste; tasainen sarja → viiva keskelle. |
| **`buildLineCharts()`** | Renderöi kortin (`.chart-card`) per harjoitus `#lineCharts`-konttiin. Tyhjä → "Ei vielä dataa". |
| **Apufunktiot** | `fmtAvg(v)` (kokonaisluku ilman desimaaleja, muuten 1 desim.), `shortDate(s)`. |
| **CSS** | `.chart-card`, `.chart-card-title`, `.chart-card-sub`, `.chart-empty`. |
| **Kytkennät** | Init, `showView('stats')` ja `markDoneFromModal` kutsuvat `buildLineCharts()`. |
| **`sw.js`** | CACHE_NAME v22 → **v23** |

**Huom:** x-akseli on **indeksipohjainen** (pisteet tasavälein), ei aikaskaalattu — päivämäärälabelit kertovat todelliset päivät. Riittää tähän käyttöön.

**Testattu** previewillä (375px): 6 päivän data → brock laskeva 30→20, silmakasi nouseva 13→21 (ka:t 13/15/17.5/19/21 oikein), reaktio 11→15, sakkadi 40→50; yhden pisteen brock = keskitetty piste; tyhjät = "Ei vielä dataa". Ei konsolivirheitä. ✓

**Pushattavat:** `nakoharjoitukset.html`, `sw.js` (käyttäjä pushaa itse — kansio ei ole git-repo).

## Nykytila
- **SW `CACHE_NAME` = `nakoharjoitus-v23`** (bumppaa aina kun `src` muuttuu ennen pushia).
- **Päiväkirja JA Kehitys** lukevat oikeaa dataa localStoragesta (ei enää demo-dataa). Molemmat välilehdet päivittyvät heti kun harjoitus merkitään tehdyksi.
- **Kehitys-välilehti:** 4 tilastokorttia + viikon volyymipylväät + harjoituskohtaiset viivadiagrammit (`brock`, `silmakasi`, `reaktio`, `sakkadi` — päivän keskiarvo; kissakortti ei kuvaajaa).
- Monisarjainen tuloskirjaus (`series: true`): **Fiksaatioharjoitus** (`sakkadi`), **Silmä-käsikoordinaatio** (`silmakasi`) ja **Tennispallon pudotus** (`reaktio`).
- Yhden arvon kirjaus: **Brockin lanka** (`brock`, mitattava: lähimmän helmen etäisyys silmästä cm) ja **Kissakortti** (`kissakortti`, onnistuneet sulautumiset).
- Aktiiviset harjoitukset: **Fiksaatioharjoitus** (`sakkadi`), **Silmä-käsikoordinaatio** (`silmakasi`), **Brockin lanka** (`brock`), **Kissakortti** (`kissakortti`), **Tennispallon pudotus** (`reaktio`).
- Repo `tkoljonen-wq/nakoharjoitus`, Pages `https://tkoljonen-wq.github.io/nakoharjoitus/`. Kansio ei ole git-repo tällä koneella → **käyttäjä pushaa itse**.

## Seuraavalla istunnolla — TODO

Tärkein:
- **Pushaa GitHubiin** kaikki muuttuneet tiedostot (käyttäjän tehtävä — tämä kansio ei ole git-repo). Erityisesti varmista että mukana ovat: `manifest.json`, `sw.js`, `icons/`-kansio, `qrcode.min.js`, `lz-string.min.js`, `silmaasema-logo.jpg` (uudemmat HTML:t menevät myös)
- **Testaa oikealla puhelimella** PWA-asennus + offline-tila (Android Chrome ja iOS Safari 16.4+). Erityisesti: skannaa QR → asenna PWA → sulje selain → avaa PWA aloitusnäytöltä → varmista että urheilijan oma ohjelma näkyy (eikä demo-tila)

Mahdollisia jatkokehityksiä (kysy käyttäjältä haluaako):
- **Uusien harjoitusten lisäys** — käytä yllä olevaa reseptiä (istunto 2026-05-30)
- **Kalenterimuistutus** (.ics-tiedosto) — jos halutaan korvata aiemmin poistettu Muistutusviesti-toiminto oikeasti toimivalla ratkaisulla
- **Asennusohjeen palautus** brändi-uudistettuna — jos halutaan auttaa urheilijoita PWA-asennuksessa

## Brändi-fontit täsmäävät brändikäsikirjaan

Tarkistettu 2026-05-28 brändikäsikirjasta (s. 25):
- ✅ Otsikot: Roboto Condensed
- ✅ Leipäteksti: Roboto Flex
- ⚠️ Numerot Roboto Mono — ei brändi-mainintaa, mutta ei myöskään kiellettyä. Säilytetty.
- ✅ Kirjainvälit: otsikot 0.02em, leipä 0.01em
- ✅ Värit: violetti #9A5EA3, oranssi #F06428, musta #323232

## Sessiohuomio — työkalujen tulostepuskurointi
Tässä ympäristössä Read/Grep/Bash-tulokset saattavat ajoittain palautua tyhjinä ja "huuhtoutua" vasta seuraavalla kierroksella. Kierto: aja komento uudelleen `echo "MARKER_$(date +%s)"`-etuliitteellä, niin oikea tuloste tulee näkyviin.
