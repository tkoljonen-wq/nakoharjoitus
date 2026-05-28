# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekti

**NäköHarjoitus** on staattinen PWA optikoille ja urheilijoille: optikko luo harjoitusohjelman ja jakaa sen urheilijalle QR-koodilla tai linkillä. Ei backendiä, ei rekisteröitymistä — kaikki toimii selaimessa.

## Kehitys

Ei build-järjestelmää. Avaa tiedostot suoraan selaimessa tai käytä paikallista HTTP-palvelinta:

```powershell
# Python
python -m http.server 8080

# Node (jos npx käytettävissä)
npx serve .
```

Testaa mobiilioptimointi Chrome DevToolsin mobiiliemulaattorilla (F12 → Toggle Device Toolbar).

## Arkkitehtuuri

```
index.html          ← Aloitussivu
admin.html          ← Optikon hallintatyökalu (4-vaiheinen wizard)
nakoharjoitukset.html ← Urheilijan mobiilisovellus
```

**Datan kulku:** Optikko rakentaa ohjelman `admin.html`-wizardissa → JSON serialisoidaan base64:ksi → upotetaan URL-hashiin (`#program=...`) → urheilija avaa linkin `nakoharjoitukset.html#program=...` → data puretaan muistiin → localStorage tallentaa päivittäiset suoritukset.

**Ei backendiä.** Kaikki tieto pysyy käyttäjän laitteella. Ohjelma jaetaan URL:n kautta, ei palvelimelta.

## Harjoituskirjasto (admin.html)

Valmiit harjoitukset on kovakoodattu `LIBRARY`-taulukkoon. Jokainen harjoitus sisältää:
- `id`, `name`, `icon`, `cat`, `unit`, `unitLabel`
- `instructions` (HTML-muotoinen ohjeteksti)
- `materiaalit` (valinnainen): `[{ nimi, tiedosto }]` — `tiedosto` on suhteellinen polku `materiaalit/`-kansioon

Urheilija voi kirjata numeerisen tuloksen + vapaamuotoisen muistiinpanon jokaisesta suorituksesta.

## Tulostettavat materiaalit

Kansio `materiaalit/` sisältää harjoituksiin liitettäviä tiedostoja. Tuetut tyypit:
- **PDF** — kopioidaan suoraan kansioon, Chrome avaa selaimessa
- **HTML** — tulostusoptimoitu pohja: `@media print` piilottaa yläpalkin, `window.print()`-nappi, A4-muotoilu (`max-width: 210mm`)

**Tiedostonimeäminen:** vain pieniä kirjaimia, viivoja ja numeroita — ei välilyöntejä eikä ääkkösiä. Esim. `brock-lanka-ohje.pdf` ✓

**Uuden materiaalin lisääminen:**
1. Kopioi tiedosto (`*.pdf` tai `*.html`) `materiaalit/`-kansioon
2. Lisää viite `admin.html`:n `LIBRARY`-kohteeseen: `materiaalit: [{ nimi: 'Näkyvä nimi', tiedosto: 'tiedostonimi.pdf' }]`

Harjoituksilla joilla on materiaali näytetään `📄 N tulostettava` -merkintä kirjastokortissa (admin.html) sekä latauslinkki(t) harjoituskortin sisällä (nakoharjoitukset.html). Linkki avautuu uuteen välilehteen.

## Urheilijan näkymä (nakoharjoitukset.html)

Kolme välilehteä (bottom navigation): **Tänään / Päiväkirja / Kehitys**

- Nykyinen päivä tarkistetaan `new Date().toDateString()` -avaimella localStoragessa
- Streak lasketaan käymällä läpi localStoragen avaimet taaksepäin
- Demotila aktivoituu automaattisesti jos URL-hashissa ei ole `#program=...`

## PWA-tuki

Sovellus on PWA (2026-05-28 alkaen):
- `manifest.json` — start_url `"."`, display `standalone`, theme `#9A5EA3`, background `#f7f5f9`
- `sw.js` — network-first; pre-cachetä HTML/CSS/JS/PDF/HTML-materiaalit/logo/ikonit; **bumppaa `CACHE_NAME` aina** kun julkaiset uusia tiedostoja
- `icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg` — silmäkuvio violetilla brändi-taustalla
- Kaikki kolme sivua (`index.html`, `admin.html`, `nakoharjoitukset.html`) rekisteröivät SW:n suhteellisella polulla `sw.js`

Asennus aloitusnäytölle:
- Android (Chrome): osoitepalkin valikko → "Asenna sovellus" / "Lisää aloitusnäytölle"
- iOS (Safari 16.4+): Jaa → "Lisää Koti-valikkoon"
- Sovellus avautuu standalone-tilassa (ei selaimen osoitepalkkia), `start_url` = "." → asennetun ikonin painaminen avaa sen sivun johon SW rekisteröitiin

## Käyttöliittymä — Silmäaseman brändi (2026-05-28 alkaen)

Sovellus toimii **Silmäaseman tuotteena** ja noudattaa brändikäsikirjaa (`G:\Oma Drive\Työ\Urheilunäkö\Brändikäsikirja.pdf`).

**Brändi-tokenit (CSS-muuttujat kaikissa tiedostoissa):**
- `--bg: #f7f5f9` (vaalea harmaa-violetti sivutausta)
- `--surface: #ffffff` (korttipinta)
- `--surface2: #f3ecf5` (violetin 10% sävy, taustakorostuksiin)
- `--border: #e5e0e8`
- `--accent: #9A5EA3` (Silmäasema-violetti, PMS 258)
- `--accent-dark: #7d4685` (hover/active) — admin.html:ssä `--accent2`
- `--warn: #F06428` (brand-oranssi, harkiten — vain streak-tag/notif-banner)
- `--success: #2d7a4f` (tehty-merkinnät, sopii vaalealle)
- `--text: #323232` (pehmennetty musta)
- `--text-dim: #6b6660`, `--text-faint: #a8a39d`

**Typografia (Google Fonts):**
- **Roboto Condensed** (400/500/700) — otsikot ja UI-labelit, usein VERSAALIT
- **Roboto Flex** — leipäteksti
- **Roboto Mono** — numerot, kellonajat, koodimaiset elementit (.ex-meta, .date-line, .progress-text, .week-dot, .log-input)

**Logo:** `silmaasema-logo.jpg` projektin juuressa (~500×100, violetti SILMÄASEMA-teksti). Lisätään `.brand-bar`-elementtiin headerin yläosaan kaikkiin näkymiin.

**Meta:** `<meta name="theme-color" content="#9A5EA3">`, `apple-mobile-web-app-status-bar-style="default"` (ei enää black-translucent).

## Käynnissä oleva työ: brändi-uudistus

Status 2026-05-28: kaikki kolme vaihetta valmiit. Brändi-uudistus päätökseen.

| Vaihe | Tiedosto | Tila |
|---|---|---|
| 1 | `nakoharjoitukset.html` | **Valmis** — kaikki värit/fontit/logo päivitetty, modaali + bottom-nav + diary + stats brändin mukaiset |
| 2 | `admin.html` | **Valmis 2026-05-28** — body Roboto Flex, otsikot/napit Roboto Condensed (uppercase), numerot Roboto Mono, dot-grid violetti `rgba(154,94,163,0.12)`, `.logo-mark`/`.logo-text` korvattu SILMÄASEMA-logolla + violetti pill "Optikon hallintapaneeli", `.preview-phone` vaalea (tumma kotelo + valkoinen näyttö + violetti vasen reuna + SILMÄASEMA-eyebrow), vanhat vihreät `rgba(44,110,78,...)` → `rgba(154,94,163,...)` |
| 3 | `index.html` | **Valmis 2026-05-28** — täysi uudelleenkirjoitus: vaalea bg + violetti grid, SILMÄASEMA-logo headerinä, "Urheilunäkö"-eyebrow pill, h1 Roboto Condensed uppercase (`Näkö` musta + violetti `Harjoitus`), violetti `.btn-primary` ja valkoinen `.btn-secondary` border-hoverilla |

### Muut 2026-05-28 valmistuneet työt
- **QR-generointi**: korjattu — self-hosted `qrcode.min.js` (~20 KB, davidshimjs/qrcodejs 1.0.0) + LZString-kompressio (`lz-string.min.js`, ~5 KB). Ohjelmadata pakataan ~3175 → ~1000–1500 merkkiä, QR luettavissa puhelinkameralla. Väri musta (#000000) maksikontrastia varten
- **PWA**: lisätty `manifest.json`, `sw.js` (network-first, pre-cache), `icons/` (silmä violetilla taustalla — vaihtoehto 1 4:stä ehdotuksesta). SW-rekisteröinti kaikilla kolmella sivulla. "Toimii offline" -lupaus asennusohjeessa nyt aidosti toteen

**Edelliset valmiit työt (kontekstina):**
- Optikon urheilijavaihe (Step 1) poistettu — admin.html alkaa nyt suoraan Harjoitukset-vaiheesta (3 vaihetta: Harjoitukset, Aikataulu, Jaa linkki)
- Per-harjoitus aikataulu-override: kunkin valitun harjoituksen rivissä 📅-nappi joka avaa viikonpäivä-paneelin. Tyhjä = käytä Step 2:n globaalia oletusta
- Urheilijanäkymässä tämän päivän harjoitukset suodatetaan per-harjoitus `days`-kentästä (tai oletuksesta); lepopäivänä rest-day-kortti
- Fullscreen "Avaa harjoitus" -modaali: ohjeteksti + PDF-preview (iframe) + Avaa/Lataa-napit + tuloskirjaus
- Brock-harjoitukseen liitetty `materiaalit/brock-lanka-ohje.pdf` valokuvineen (3 sivua)
- Custom-harjoitusten luonti poistettu admin.html:stä — optikko valitsee vain valmiista LIBRARY-vaihtoehdoista, uudet harjoitukset lisätään koodimuokkauksella
