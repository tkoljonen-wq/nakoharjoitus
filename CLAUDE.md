# CLAUDE.md

Ohjeet Claude Codelle (claude.ai/code) tässä repossa työskentelyyn.

## Projekti

**NäköHarjoitus** on staattinen PWA optikoille ja urheilijoille: optikko luo harjoitusohjelman ja jakaa sen urheilijalle QR-koodilla tai linkillä. Ei backendiä, ei rekisteröitymistä — kaikki toimii selaimessa, kaikki data pysyy käyttäjän laitteella. Sovellus toimii Silmäaseman brändillä.

Repo `tkoljonen-wq/nakoharjoitus`, Pages `https://tkoljonen-wq.github.io/nakoharjoitus/`. **Kansio EI ole git-repo tällä koneella → käyttäjä pushaa muutokset itse.**

## Kehitys

Ei build-järjestelmää. PWA-testaus vaatii HTTP-palvelimen (ei toimi `file://`-protokollalla):

```powershell
python -m http.server 8080      # tai:  npx serve .
```

Testaa mobiilioptimointi Chrome DevToolsin mobiiliemulaattorilla (F12 → Toggle Device Toolbar). PWA: DevTools → Application → Manifest / Service Workers.

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
materiaalit/            ← Tulostettavat materiaalit (PDF/HTML) + rich-ohjeiden kuvat
```

**Datan kulku:**

1. Optikko rakentaa ohjelman `admin.html`-wizardissa.
2. JSON serialisoidaan ja **LZString-pakataan** URL-safe muotoon (`LZString.compressToEncodedURIComponent`). **Vain minimaalinen payload upotetaan** — per harjoitus `{ id, sets, duration, days? }` + `schedule`. Sisältö virkistetään urheilijapuolella katalogista id:llä (ks. **Kultainen sääntö**), joten sitä ei lähetetä.
3. Upotetaan URL-hashiin (`#program=...`) — kompressoituna **~200–300 merkkiä** (pidettävä pienenä, jotta QR-koodi pysyy harvana ja luettavana).
4. Urheilija avaa linkin (esim. QR-skannauksella) `nakoharjoitukset.html#program=...`.
5. Urheilijasovellus purkaa ohjelman ja **tallentaa sen localStorageen** avaimeen `nakoharjoitusProgram` — näin PWA-uudelleenavaus aloitusnäytöltä toimii ilman hashia.
6. Päivittäiset suoritukset tallentuvat omiin avaimiinsa **`completed_YYYY-MM-DD`** (ks. **Datasopimukset**).

## admin.html — Optikon työnkulku

**Kaksi vaihetta:**

**Vaihe 1: Harjoitukset** — kaikki muokattava yhdessä paikassa
- Harjoituskirjasto (valitse harjoituksia `LIBRARY`-listasta)
- Valitut harjoitukset — mukauta. **Per-harjoitus näkyy vain YKSI mittari `series`-lipun mukaan:** sarja-harjoitukset (`series:true`) → sarjamäärä (oletus `3`, yksikkö "sarjaa"); muut → kesto minuutteina (oletus `5`, yksikkö "min"). **Syöttökentässä pelkkä numero**, yksikkö renderöidään kentän ulkopuolelle (`.input-unit`/`.unit-label`). Lisäksi Aikataulu-päiväpaneeli per-harjoitus aikataulu-overridelle.
- Oletusaikataulu (viikonpäivät + kesto + aloituspäivä) — käytetään harjoituksille joilla ei ole omaa override-päivälistaa

**Vaihe 2: Jaa linkki** — esikatselu + QR-koodi + Kopioi/Tulosta/Avaa-napit (kaikki lila `btn-primary`; "← Takaisin" vaalea `btn-secondary`)

Optikko valitsee vain valmiista `LIBRARY`-vaihtoehdoista (ei custom-harjoitusten luontia).

## Harjoituskirjasto — `LIBRARY` (admin.html)

Valmiit harjoitukset on kovakoodattu `LIBRARY`-taulukkoon. Kentät: `id`, `name`, `icon`, `cat`, `unit`, `unitLabel`, `instructions` (HTML), valinnainen `materiaalit: [{ nimi, tiedosto }]` (`tiedosto` = suhteellinen polku `materiaalit/`-kansioon), valinnainen `series: true` (ks. Datasopimukset). Uusien harjoitusten lisäys vaatii koodimuokkauksen (ks. RESEPTI alla).

## Tulostettavat materiaalit (`materiaalit/`)

Tuetut tyypit:
- **PDF** — paras valinta **tulostettaviin A4-tauluihin** (kiinteä asettelu, luotettava tulostus). Näytetään "Tulostettavat materiaalit" -osiossa (iframe-preview + Avaa/Lataa-napit). **Ei suositeltu** pitkiin harjoitusohjeisiin (mobiilissa kömpelö, raskas cachettaa) — käytä niihin `RICH_GUIDES`-mallia.
- **Kuvat (JPG/PNG/SVG)** — käytetään rich-ohjeissa `<img>`-tageilla.
- **HTML** — tulostusoptimoitu pohja (`@media print` piilottaa yläpalkin, `window.print()`-nappi, A4 `max-width: 210mm`).

**Tiedostonimeäminen:** vain pieniä kirjaimia, viivoja ja numeroita — ei välilyöntejä eikä ääkkösiä (esim. `brock-vaihe1-kauas.jpg`).

**Uuden tulostettavan materiaalin lisääminen:**
1. Kopioi tiedosto `materiaalit/`-kansioon.
2. Lisää viite `admin.html`:n `LIBRARY`-kohteeseen: `materiaalit: [{ nimi: 'Näkyvä nimi', tiedosto: 'tiedostonimi.pdf' }]`.
3. Lisää tiedosto `sw.js`:n `PRECACHE_ASSETS`-listalle (offline-saatavuus) ja bumppaa `CACHE_NAME`.

Harjoituksilla joilla on `materiaalit` näkyy "N tulostettava" -merkintä kirjastokortissa (admin.html) ja latauslinkit harjoituskortin modaalissa (nakoharjoitukset.html).

## Kuvitetut harjoitusohjeet — `RICH_GUIDES` (nakoharjoitukset.html)

Pitkät kuvitetut ohjeet elävät `nakoharjoitukset.html`:n `RICH_GUIDES`-objektissa, **avaimena harjoituksen `id`**. Modaali käyttää `guideHtml = fillGuide(RICH_GUIDES[ex.id] || ex.instructions, ex)` — jos id:lle löytyy rich-ohje, se korvaa lyhyen `instructions`-tekstin. Pidetään erillään jaetusta ohjelmasta (iso HTML ei kulkisi QR:ssä); koska se avaintuu id:llä, ohje näkyy oikein myös oikeilla (ei-demo) ohjelmilla.

**⭐ Dynaaminen volyymi-injektio:** rich-ohjeissa **ohjelman määräämä volyymi** (sarjamäärä / minuutit) kirjoitetaan paikkamerkillä `{{maara}}`, jonka `fillGuide(html, ex)` korvaa ajossa `exerciseMetric(ex)`-arvolla (esim. "3 sarjaa" / "5 min"). Näin ohjeen annostelu täsmää aina kortin/modaalin yläreunan mittariin ja päivittyy myös jo jaetuissa ohjelmissa. **Per-sarja-parametrit** joita ohjelma EI mallinna (per-sarja-aika `1 min/sarja`, lepoajat, pisteytys `10 pudotusta/sarja`, toistot, viikkorytmi) **jätetään kiinteäksi tekstiksi** — älä korvaa niitä `{{maara}}`:llä.

**Uuden rich-ohjeen lisääminen:**
1. Kopioi kuvat `materiaalit/`-kansioon (pienet kirjaimet, ei ääkkösiä).
2. Lisää `RICH_GUIDES['<id>'] = \`...html...\`` — valmiit luokat: `.guide-warn` (varoituslaatikko), `.guide-meta` (3-sarakkeinen tarvike/kesto/tavoite), `.guide-callout` (muistisääntö), `.guide-table` (vianetsintä), `<h4>` (osio-otsikko), `<figure><img><figcaption>` (kuvat). Ohjelman volyymiluvut paikkamerkillä `{{maara}}` (ks. yllä).
3. Lisää kuvat `sw.js`:n `PRECACHE_ASSETS`-listalle ja bumppaa `CACHE_NAME`.

## Urheilijan näkymä (nakoharjoitukset.html)

Kolme välilehteä (bottom nav): **Tänään / Päiväkirja / Kehitys**. Kaikki näkymät lukevat oikeaa dataa localStoragesta (ei demo-/kovakoodattua dataa); päivittyvät heti kun harjoitus merkitään tehdyksi.

- **Demotila** aktivoituu jos URL-hashissa ei ole `#program=...` JA localStoragessa ei ole tallennettua ohjelmaa (kovakoodatut esimerkit).
- `loadProgramFromURL()`: (1) URL-hash → tallennus localStorageen; (2) jos hash puuttuu, yritä localStorage.
- **Tänään**: edistymiskortti + "Tämä viikko" -ruudukko + harjoituskortit. Fullscreen "Avaa harjoitus" -modaali: ohje (rich tai lyhyt) + tulostettavat materiaalit + tuloskirjaus.
- **Mittarimerkintä** (kortti + modaalin otsikko): `exerciseMetric(ex)` → sarja-harjoitukset `series:true` näyttävät "N sarjaa", muut "N min" (vain kellosymboli `⏱` minuuteilla). Funktio **siivoaa arvosta yksikkösuffiksin** (vanhat jaetut ohjelmat upottivat esim. `"5 min"`) → vain numeerinen osa + yksikkö → ei "5 min min". Vain `series`-lipun mukainen mittari näytetään; toinen kenttä (oletusarvo) jätetään huomiotta.
- **Päiväkirja** (`buildDiary()`): skannaa `completed_*`-avaimet, näyttää tehdyt uusin ensin.
- **Kehitys**: 4 tilastokorttia + viikon volyymipylväät (`buildChart`) + harjoituskohtaiset SVG-viivadiagrammit (`buildLineCharts`, `LINE_CHART_EXERCISES` = `brock`/`silmakasi`/`reaktio`/`sakkadi`; päivän arvo = lukemien keskiarvo; kissakortti ei kuvaajaa).

## PWA-tuki

- `manifest.json` — **`start_url: "nakoharjoitukset.html"`** (avaa urheilijasovelluksen suoraan), `scope: "."`, display `standalone`, theme `#9A5EA3`, background `#f7f5f9`.
- `sw.js` — **network-first**; pre-cachetä HTML/JS/materiaalit/logo/ikonit. **Bumppaa `CACHE_NAME` aina kun `src` muuttuu ennen pushia** (nykyinen versio: ks. Nykytila).
- `icons/` — silmäkuvio violetilla brändi-taustalla. Kaikki sivut rekisteröivät SW:n suhteellisella polulla `sw.js`.
- Asennus: Android Chrome → "Asenna sovellus"; iOS Safari 16.4+ → Jaa → "Lisää Koti-valikkoon".

**Mitä PWA EI tue ilman backendia:** ajastetut paikalliset muistutukset (Web Push vaatii palvelimen; Notification Triggers vain Chrome Android -flag; iOS Safari ei tue). Tämän takia Muistutusviesti-toiminto poistettiin. Vaihtoehto jos halutaan takaisin: generoida ladattava `.ics`-kalenterimerkintä.

## Käyttöliittymä — Silmäaseman brändi

Brändikäsikirja: `G:\Oma Drive\Työ\Urheilunäkö\Brändikäsikirja.pdf`.

**Brändi-tokenit (CSS-muuttujat kaikissa tiedostoissa):**
- `--bg: #f7f5f9`, `--surface: #ffffff`, `--surface2: #f3ecf5` (violetin 10% sävy), `--border: #e5e0e8`
- `--accent: #9A5EA3` (Silmäasema-violetti, PMS 258)
- `--accent-dark: #7d4685` (hover/active) — admin.html:ssä nimellä `--accent2`
- `--warn: #F06428` (brand-oranssi, harkiten), `--success: #2d7a4f` (tehty-merkinnät)
- `--text: #323232`, `--text-dim: #6b6660`, `--text-faint: #a8a39d`

**Typografia (Google Fonts, brändikäsikirja s. 25):** otsikot/UI **Roboto Condensed** (usein VERSAALIT), leipäteksti **Roboto Flex**, numerot/koodimaiset **Roboto Mono**. **Kirjainvälit:** otsikot `0.02em`, leipäteksti `0.01em`.

**Logo:** `silmaasema-logo.jpg` (~500×100). **Meta:** `<meta name="theme-color" content="#9A5EA3">`.

**Ei UI-emojeja:** kaikki koriste-/UI-emojit on poistettu (osio-otsikot, napit, ikonit, badget, streak, tilakortit). Ainoa jäljellä on Kopioi-toiminnon ohimenevä toast-viestin 📋. Pidä uusi UI emojittomana ellei toisin pyydetä.

## ⭐ Sisältöarkkitehtuuri — harjoitusdatan KAKSI lähdettä (tärkein oppi)

Sisältö elää **kahdessa paikassa**, ja molemmat on päivitettävä kun harjoitusta muokataan:

1. **`admin.html` → `LIBRARY`** = lähde uusille generoitaville ohjelmille. Sisältää koko sisällön editorin esikatselua varten, **mutta jakolinkkiin/QR:ään serialisoidaan vain `{ id, sets, duration, days? }`** (`generateAndPreview`). Sisältö ei kulje linkissä, koska se virkistetään katalogista id:llä.

2. **`nakoharjoitukset.html` → `DEFAULT_EXERCISES`** = sisäänrakennettu katalogi (myös demo-fallback). Aktiivinen lista rakennetaan:
   ```js
   const REMOVED_EXERCISE_IDS = ['akkomodaatio','periferia','pursuit'];
   const EXERCISES = (URL_PROGRAM?.exercises || DEFAULT_EXERCISES)
     .filter(ex => !REMOVED_EXERCISE_IDS.includes(ex.id))   // poistetut pois myös vanhoista ohjelmista
     .map(ex => {
       const cat = DEFAULT_EXERCISES.find(c => c.id === ex.id);
       if (!cat) return ex;                                  // ei katalogissa → säilytä ohjelman sisältö
       return { ...ex,                                       // ohjelmasta: days, sets, duration
         name: cat.name ?? ex.name, icon: cat.icon ?? ex.icon, cat: cat.cat ?? ex.cat,
         unit: cat.unit ?? ex.unit, unitLabel: cat.unitLabel ?? ex.unitLabel,
         instructions: cat.instructions ?? ex.instructions,
         materiaalit: cat.materiaalit ?? ex.materiaalit,
         series: cat.series ?? ex.series };                  // CONTENT katalogista id:n perusteella
     });
   ```

**Kultainen sääntö:** jaettu ohjelma määrää vain **mitkä** harjoitukset + aikataulun (`days`, `sets`, `duration`). **Kaikki sisältö virkistetään aina `DEFAULT_EXERCISES`:stä id:n perusteella** → sisältömuutokset näkyvät myös jo jaetuissa ohjelmissa ilman uutta QR-koodia.

> **`sets`/`duration` ovat numeerisia merkkijonoja** (esim. `'3'`, `'5'` — ei yksikköä). Optikko muokkaa vain `series`-lipun mukaista mittaria (sarja-harjoitus → `sets`, muu → `duration`); toinen kenttä serialisoituu oletusarvolla mutta urheilijapuoli jättää sen huomiotta (`exerciseMetric`). Yksikkö ("sarjaa"/"min") lisätään näyttöhetkellä, ei dataan.

**Apulistat `nakoharjoitukset.html`:ssä:**
- **`REMOVED_EXERCISE_IDS`** — poistetut harjoitus-id:t (suodattuvat pois myös vanhoista ohjelmista).
- **`REMOVED_MATERIALS`** (`openExerciseModal`:ssa) — poistettujen materiaalitiedostojen nimet: `brock-lanka-ohje.pdf`, `brock-lanka-seurantalomake.html`, `sakkadi-numerotaulu.html`.
- **`RICH_GUIDES`** — kuvitetut ohjeet id:n mukaan.
- **`LINE_CHART_EXERCISES`** — mille harjoituksille piirretään kehityskäyrä.

## Nykyiset harjoitukset

| id | nimi | unit | rich-ohje | materiaalit | series |
|----|------|------|-----------|-------------|--------|
| `sakkadi` | Fiksaatioharjoitus | kirjaimet | kyllä | `fiksaatiotaulu-1.pdf`, `fiksaatiotaulu-2.pdf` | kyllä |
| `silmakasi` | Silmä-käsikoordinaatio | kiinniotot | kyllä | – | kyllä |
| `brock` | Brockin lanka | cm | kyllä | – (kuvat rich-ohjeessa) | ei (yksi arvo) |
| `kissakortti` | Kissakortti | toistot | kyllä | `kissakortti.pdf` | ei (yksi arvo) |
| `reaktio` | Tennispallon pudotus | pisteet | kyllä | – (kuva rich-ohjeessa) | kyllä |

## ⭐ RESEPTI: uuden harjoituksen lisääminen

1. **Kuva/PDF:t** → pakkaa kuva (ks. kuvanpakkaus-resepti) ja kopioi `materiaalit/`-kansioon selkein nimin (esim. `<id>-suoritus.jpg`, `<id>-taulu-1.pdf`). Vain pieniä kirjaimia, viivoja, numeroita.
2. **`admin.html` `LIBRARY`** → lisää objekti `{ id, name, icon, cat, unit, unitLabel, instructions, materiaalit?, series? }`. id uniikki ja lyhyt. (`icon` ei renderöidy UI:ssa mutta säilytetään datassa.)
3. **`nakoharjoitukset.html` `DEFAULT_EXERCISES`** → lisää **sama** objekti (+ `duration` ja `sets` demo-arvoiksi). Sama id.
4. **`nakoharjoitukset.html` `RICH_GUIDES`** → (valinnainen) lisää `<id>: \`...\`` kuvitettu ohje olemassa olevalla tyylillä (`.guide-warn`, `.guide-meta`, `<h4>`, `<figure>`, `.guide-callout`...). Ilman tätä näytetään lyhyt `instructions`.
5. Jos harjoitus halutaan kehityskäyrään, lisää id `LINE_CHART_EXERCISES`-listaan.
6. **`sw.js`** → lisää uudet `materiaalit/`-tiedostot `PRECACHE_ASSETS`-listaan **ja bumppaa `CACHE_NAME`**.
7. Kerro käyttäjälle pushattavat tiedostot.

## ⭐ RESEPTI: harjoituksen poistaminen

1. Poista objekti `admin.html` `LIBRARY`:stä.
2. Poista objekti `nakoharjoitukset.html` `DEFAULT_EXERCISES`:stä (+ mahd. `RICH_GUIDES`-merkintä, `LINE_CHART_EXERCISES`, demo-viittaukset).
3. Lisää id `REMOVED_EXERCISE_IDS`-listaan → katoaa myös jo jaetuista ohjelmista.
4. (Valinnainen) lisää vanhentuneet materiaalitiedostot `REMOVED_MATERIALS`-listaan.
5. Bumppaa `CACHE_NAME`.

## Kuvanpakkaus-resepti (PowerShell System.Drawing)

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

## Datasopimukset — tuloskirjaus & localStorage

**Päivän avain:** `completed_YYYY-MM-DD` (**paikallinen aika**, apufunktio `localDateKey(d)` — EI `toISOString()`/UTC:tä, jottei aamuyöllä 00–03 tehty harjoitus kirjaudu edelliselle päivälle). Sama funktio molemmissa HTML-tiedostoissa; viikkonumero ISO 8601 (`isoWeek`). Arvo = objekti `{ <harjoitus-id>: entry }`.

**Entry-muodot:**
- Monisarjainen (`series: true`): `{ nums: ['42','45','48'], note, done, time }`
- Yhden arvon: `{ num: '22', note, done, time }`

**`done`-lippu:** "Tallenna" → `done:false` (osatulos talletettu, kortti EI vihreä). "Merkitse tehdyksi" → `done:true` (kortti vihreä). Apufunktio **`isDone(id)` = `!!c && c.done !== false`** (vanhat done-liputtomat tallennukset tulkitaan tehdyiksi → taaksepäin yhteensopiva). `isDone` ohjaa korttirenderöinnin, edistymispalkin, streakin ja päiväkirja-/tilastosuodatuksen (`done:false` suodatetaan pois).

**Monisarjainen kirjaus (`series: true`):** modaali näyttää yhden syöttökentän kerrallaan + "Tallenna"-napin joka lisää rivin ja avaa seuraavan ("Sarja N+1"); ✕ poistaa rivin; "Merkitse tehdyksi" päättää (ottaa mukaan myös aktiivisen kirjoittamattoman arvon). Toteutus geneerinen: `modalSeries`-tila, `renderSeriesSection/addSeriesEntry/removeSeriesEntry/persistSeriesProgress`. Single-input (brock, kissakortti) käyttää `#modalNum`.

**Jaetut apufunktiot:** `loadAllCompletions()` (kaikki `completed_*` → `{date:data}`), `doneCountForDay(data)`, `currentWeekDays()` (kuluvan viikon ma–su avaimet + `future`-lippu).

## Tänään-tilakone & opt-in

`computeDayState()` → `DAY_STATE.mode`, jakso lasketaan `schedule.startDate` + `durationWeeks`:stä (`getProgramPhase`; puuttuessa → aina aktiivinen, taaksepäin yhteensopiva):
- `training` — aktiivinen jakso + treeniviikonpäivä → edistymiskortti + aikataulutetut harjoitukset.
- `rest` — aktiivinen jakso, ei harjoituksia tänään → "Tänään on lepopäivä".
- `before` — ennen `startDate` → "Ohjelmasi alkaa DD.MM.YYYY".
- `ended` — `today >= startDate + durationWeeks*7` → "Ohjelmasi on päättynyt".

**Opt-in vapaaehtoisuus:** ei-treenipäivänä (rest/before/ended) viestikortti + "Tee harjoitus silti" -nappi (`revealAllExercises()` → `showAllToday=true` → koko `EXERCISES` vapaaehtoisina + "Piilota"). **Treenipäivänä**, jos osa harjoituksista lepää (harjoituskohtainen `ex.days`), `buildExercises()` näyttää aikataulutetut + erikseen lepäävät opt-in-napin takaa ("Muut harjoitukset lepäävät tänään." / "Tee silti"). Kortin renderöinti: `renderExerciseCard()`. `updateProgress()` laskee vain `TODAY_EXERCISES` → vapaaehtoiset eivät kasvata päivän tavoitetta, mutta tallentuvat normaalisti (näkyvät päiväkirjassa/tilastoissa/putkessa). Modaalihaut käyttävät `EXERCISES.find` (paljastetut avautuvat).

## Julkaisu & ympäristöhuomiot

- **Käyttäjä pushaa itse** (kansio ei ole git-repo). Jos Claude joskus pushaa: GitHub Git Data API gh-tokenilla (blobs → tree `base_tree`:llä → commit → PATCH ref; `sha:null` tree-itemissä poistaa tiedoston). Varmista mukaan myös staattiset assetit (`manifest.json`, `sw.js`, `icons/`, `qrcode.min.js`, `lz-string.min.js`, `silmaasema-logo.jpg`) jos ne muuttuvat.
- **Kuvankäsittely:** tällä koneella `convert` on Windowsin convert.exe (levynmuunnos), EI ImageMagick; ghostscriptiä ei ole → PDF-rasterointi ei onnistu. Käytä PowerShell System.Drawingia (yllä).
- **Brockin vaihekuvat** (jos kosket niihin): X-risteys = katsottava helmi. vaihe 1 = kauimmainen = SININEN, vaihe 2 = keskimmäinen = VIHREÄ, vaihe 3 = lähin = PUNAINEN. Kuvasuhde ~1.83.
- **Työkalujen tulostepuskurointi:** Read/Grep/Bash-tulokset saattavat ajoittain palautua tyhjinä ja "huuhtoutua" vasta seuraavalla kierroksella → aja uudelleen.

## Nykytila

- **SW `CACHE_NAME` = `nakoharjoitus-v34`** (bumppaa aina kun `src` muuttuu ennen pushia).
- **Kovettamiset (2026-07-14):** admin validoi ettei tyhjää ohjelmaa voi jakaa (≥1 harjoitus; oletuspäiviä tarvitaan jos jollain harjoituksella ei ole omaa aikataulua); jakolinkin kanta `new URL('nakoharjoitukset.html', location.href)` (toimii myös clean URL:lla `/admin`); modaalin muistiinpano + sarja-arvot HTML-escapataan; legacy btoa-purku poistettu (`#program=` on aina LZString); sw.js offline-HTML-fallback vain `req.mode === 'navigate'` -pyynnöille; PDF-iframe-esikatselu piilotetaan kosketuslaitteilla (`pointer: coarse` — mobiili-Chrome ei renderöi PDF:ää iframeen, napit jäävät).
- Jakolinkki/QR minimoitu (~200–300 merkkiä); sisältö rakennetaan katalogista id:llä. Ei palvelinta → tietosuoja & painetun QR:n ikuisuus säilyvät. (Palvelinmalli harkittu ja hylätty: toisi GDPR-rekisterinpitäjävastuun + painettu QR voisi kuolla. Kannattaisi vasta isoille itsenäisille/custom-ohjelmille tai keskitettyyn hallintaan → persoonaton rakenne + satunnainen id + TTL.)
- Kaikki näkymät lukevat oikeaa dataa localStoragesta (Tänään, "Tämä viikko" -ruudukko, Päiväkirja, Kehitys).
- Aktiiviset harjoitukset: `sakkadi`, `silmakasi`, `brock`, `kissakortti`, `reaktio` (ks. taulukko yllä).
- UI emojiton (paitsi toast 📋); admin step 2 -napit kaikki lila.
- **Volyymimittari yhtenäistetty (`series`-pohjainen):** adminissa per-harjoitus vain yksi numeerinen kenttä (sarja-harjoitus → sarjat, muu → min) + yksikkö kentän ulkopuolella. Urheilijapuoli näyttää `exerciseMetric` ("N sarjaa"/"N min"), ja rich-ohjeet injektoivat ohjelman volyymin `{{maara}}`-paikkamerkillä (`fillGuide`). `sets`/`duration` numeerisia; yksikkö vain näytöllä.

## Seuraavalla istunnolla — TODO

- **Pushaa GitHubiin** kaikki muuttuneet tiedostot (käyttäjän tehtävä).
- **Testaa oikealla puhelimella** PWA-asennus + offline (Android Chrome ja iOS Safari 16.4+): skannaa QR → asenna PWA → sulje selain → avaa aloitusnäytöltä → varmista että urheilijan oma ohjelma näkyy (eikä demo-tila).
- Mahdollisia jatkokehityksiä (kysy käyttäjältä): uusien harjoitusten lisäys (resepti yllä); `.ics`-kalenterimuistutus; PWA-asennusohjeen palautus brändi-uudistettuna.
