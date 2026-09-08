# Elden Ring Extreme Bingo – Komplettpaket

Diese Version ist für **3 Spieler**, **100 exklusive Aufgaben**, **Live-Synchronisierung** und maximal **12 Stunden** gebaut.

## Wichtig vor dem Hochladen

Du musst nur **eine Datei bearbeiten**:

`firebase-config.js`

Dort ersetzt du alle `HIER_EINTRAGEN`-Werte durch deine Firebase-Web-Konfiguration.

---

# 1. Firebase

## Web-App / Config finden
Firebase Console → dein Projekt → **Einstellungen → Allgemein** → ganz nach unten zu **Deine Apps** → deine Web-App `</>` → **Firebase SDK snippet → Config**.

Du bekommst Werte wie:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Diese Werte übernimmst du in `firebase-config.js`.

## databaseURL
Firebase → **Realtime Database**.

Oben findest du die URL, z. B.:

`https://dein-projekt-default-rtdb.europe-west1.firebasedatabase.app`

Diese URL kommt bei `databaseURL` hinein.

## Anonymous Authentication
Firebase → **Authentication → Sign-in method → Anonymous** → aktivieren.

## Regeln
Firebase → **Realtime Database → Rules**.

Den kompletten Inhalt aus `database.rules.json` hineinkopieren und **Publish / Veröffentlichen** drücken.

---

# 2. GitHub Pages

Lade den **Inhalt dieses Ordners** direkt ins Repository hoch.

Auf der Hauptseite des Repositories müssen nebeneinander sichtbar sein:

- `index.html`
- `styles.css`
- `app.js`
- `tasks.js`
- `firebase-config.js`
- `database.rules.json`
- `README.md`
- Ordner `electron-overlay`

Dann:

**Settings → Pages → Deploy from a branch → main → /(root) → Save**

Warte, bis unter **Actions** der Pages-Deploy einen grünen Haken hat.

Deine Seite ist dann normalerweise:

`https://DEIN-GITHUB-NAME.github.io/DEIN-REPOSITORY-NAME/`

Nach Änderungen: Browser mit **Strg + F5** neu laden.

---

# 3. Wenn es funktioniert

Auf der Startseite muss unter den Buttons stehen:

`✓ Firebase verbunden. Du kannst jetzt einen Raum erstellen oder beitreten.`

Wenn stattdessen ein roter Fehler erscheint, sagt die Seite jetzt direkt, was fehlt.

---

# 4. Mit Freunden

Host:
1. Namen eingeben.
2. 12 Stunden wählen.
3. **Neuen Raum erstellen**.
4. **Einladungslink kopieren**.
5. Link an beide Freunde schicken.

Freunde:
1. Link öffnen.
2. Eigenen Namen eingeben.
3. **Raum beitreten**.

Alle können in verschiedenen Netzwerken sein.

Der Host drückt danach **Bingo starten**.

---

# 5. Wertung

- Grün = 1 Punkt
- Orange = 2 Punkte
- Rot = 3 Punkte
- komplette eigene 10er-Reihe = +5
- komplette eigene 10er-Spalte = +5
- jede der 2 Hauptdiagonalen = +5
- Ende bei Zeitablauf oder wenn alle 100 Felder belegt sind
- bei Gleichstand: mehr rote Felder, danach mehr Bingos

Ein Feld kann nur einmal geclaimt werden. Firebase benutzt dafür eine Transaktion.

---

# 6. Aufgaben ändern

Alle Aufgaben stehen in:

`tasks.js`

Format:

```js
{t:"Dein Text",d:3},
```

Es müssen **exakt 100** bleiben.

---

# 7. Overlay

Der Button **Overlay-Link kopieren** erzeugt einen Link für genau deinen Spieler.

Du kannst ihn:
- auf einem zweiten Monitor öffnen,
- als OBS Browser Source verwenden,
- oder mit dem `electron-overlay`-Ordner als Always-on-top-Fenster starten.

Electron, PowerShell:

```powershell
cd electron-overlay
npm install
$env:BINGO_URL='DEIN_OVERLAY_LINK'
npm start
```

F8 = Klickdurchleitung an/aus  
F9 = Overlay anzeigen/verstecken

Elden Ring am besten in **Borderless Windowed / randloses Fenster** verwenden.

Das Overlay injiziert nichts in Elden Ring.
