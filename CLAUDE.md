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
asennusohje.html    ← GitHub Pages -asennusohje käyttäjälle
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

Kansio `materiaalit/` sisältää HTML-tiedostoja jotka on optimoitu tulostamista varten:
- Yläpalkissa "🖨️ Tulosta / Tallenna PDF" -nappi (`window.print()`)
- `@media print` -sääntö piilottaa yläpalkin
- A4-muotoilu (`max-width: 210mm`, sopivat marginaalit)

**Uuden materiaalin lisääminen:**
1. Luo `materiaalit/harjoituksen-nimi.html` (kopioi olemassa olevan pohja)
2. Lisää `LIBRARY`-kohteeseen `materiaalit: [{ nimi: '...', tiedosto: 'harjoituksen-nimi.html' }]`

Harjoituksilla joilla on materiaali näytetään `📄 1 tulostettava` -merkintä kirjastokortissa (admin.html) sekä latauslinkki harjoituskortin sisällä (nakoharjoitukset.html).

## Urheilijan näkymä (nakoharjoitukset.html)

Kolme välilehteä (bottom navigation): **Tänään / Päiväkirja / Kehitys**

- Nykyinen päivä tarkistetaan `new Date().toDateString()` -avaimella localStoragessa
- Streak lasketaan käymällä läpi localStoragen avaimet taaksepäin
- Demotila aktivoituu automaattisesti jos URL-hashissa ei ole `#program=...`

## PWA-tuki

Sovelluksessa ei vielä ole manifest.json:ia eikä service workeria. Jos lisätään PWA-tuki, noudata `~/.claude/CLAUDE.md`:n PWA-ohjeita (network-first SW, SVG-ikonit, suhteelliset polut).

## Käyttöliittymä

- Värimaailma: tumma tausta (`#0a0a0f`), syaani (`#00d4ff`) ja violetti (`#8b5cf6`) aksentit
- Fontit: Syne (otsikot), DM Mono (koodityyliset labelit) — ladataan Google Fontsista
- Kaikki UI-teksti on suomeksi
