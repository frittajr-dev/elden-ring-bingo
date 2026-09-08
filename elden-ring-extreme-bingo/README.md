# Elden Ring Extreme Bingo – 3 Spieler / 100 Felder

Ein browserbasiertes 10×10-Bingo mit Live-Synchronisierung über verschiedene Netzwerke.

## Enthalten
- 100 bewusst gemischte Elden-Ring-Aufgaben.
- 3 Schwierigkeitsstufen: 1 / 2 / 3 Punkte.
- Ein Feld kann nur einmal geclaimt werden; Firebase-Transaktionen verhindern Doppelclaims.
- 1–12 Stunden Spielzeit (Standard: 12).
- Ende bei Zeitablauf oder wenn alle 100 Felder vergeben sind.
- +5 Punkte je vollständig eigener 10er-Reihe, 10er-Spalte oder Hauptdiagonale.
- Live-Scoreboard und 3 Spielerfarben.
- Zufällige Feldanordnung für jeden neu erstellten Raum.
- Kompakt- und Overlay-Modus.

## 1. Firebase einmalig einrichten
1. Öffne https://console.firebase.google.com/ und erstelle ein neues Projekt.
2. Im Projekt: **Build → Realtime Database → Create Database**. Als Region ist eine europäische Region sinnvoll, wenn ihr in Europa seid.
3. **Build → Authentication → Sign-in method → Anonymous** aktivieren.
4. **Project settings → Your apps → Web-App hinzufügen**. Firebase zeigt dir ein Objekt `firebaseConfig`.
5. Öffne `firebase-config.js` und ersetze die Platzhalter mit diesen Werten. Achte besonders auf `databaseURL`.
6. In **Realtime Database → Rules** die Regeln aus `database.rules.json` einfügen und veröffentlichen.

Hinweis: Diese Regeln sind für eine private Freundesrunde gedacht. Jeder anonym authentifizierte Nutzer der App kann technisch Daten schreiben. Teilt den Raumcode nur untereinander. Für ein öffentliches Turnier sollte man strengere serverseitige Regeln/Cloud Functions verwenden.

## 2. Website hosten – einfachste Variante: GitHub Pages
1. Erstelle auf GitHub ein neues Repository, z. B. `elden-ring-bingo`.
2. Lade `index.html`, `styles.css`, `app.js`, `tasks.js` und deine ausgefüllte `firebase-config.js` hoch.
3. Repository → **Settings → Pages** → Deploy from branch → `main` / root.
4. Danach erhältst du eine HTTPS-Adresse wie `https://DEINNAME.github.io/elden-ring-bingo/`.

Alternativ kannst du jeden statischen Webhost verwenden (Netlify, Firebase Hosting, Cloudflare Pages usw.). Die Seite muss nur per HTTPS erreichbar sein.

## 3. Spiel starten
### Host
1. Öffne die gehostete Seite.
2. Namen eingeben, Dauer zwischen 1 und 12 Stunden wählen.
3. **Neuen Raum erstellen**. Den angezeigten Raumcode an die beiden Freunde schicken.
4. Sobald alle drin sind, **Spiel starten** drücken. Ab dann läuft der gemeinsame Timer.

### Freund 1 und Freund 2 – auch in anderen Netzwerken
1. Öffnen exakt dieselbe Website.
2. Eigenen Namen + Raumcode eingeben.
3. **Raum beitreten**.
4. Fertig: Claims und Punkte erscheinen live auf allen drei Geräten.

## 4. Wie wird ein Feld gewertet?
Wenn du eine Aufgabe wirklich geschafft hast, klickst du auf das Feld. Der Claim wird atomar gespeichert. Wenn ein anderer im gleichen Moment klickt, gewinnt nur der zuerst akzeptierte Claim; für alle anderen ist das Feld danach gesperrt.

Bingos werden automatisch aus den Besitzern der 100 Felder berechnet. Jede vollständige Reihe/Spalte/Hauptdiagonale desselben Spielers gibt +5 Punkte.

## 5. Overlay über Elden Ring
### Sicher und simpel: zweiter Monitor / Browserfenster
Drücke in der Bingo-Seite **Overlay-Link kopieren**. Öffne diesen Link in demselben Browserprofil. Die Overlay-Ansicht blendet Regeln und Setup aus und zeigt Board, Timer und Scores kompakt.

### OBS / Stream
Füge den Overlay-Link in OBS als **Browser Source** ein. Das ist ideal, wenn Zuschauer das Board sehen sollen. Das legt die Anzeige in den Stream, nicht direkt über dein persönliches Spielbild.

### Direkt über dem eigenen Spiel: mitgelieferter Electron-Overlay-Wrapper
Das Overlay injiziert **nichts** in Elden Ring. Es ist nur ein transparentes Always-on-top-Fenster.

Voraussetzung: Node.js installieren.

Im Ordner `electron-overlay`:

Windows CMD:
```bat
npm install
set BINGO_URL=https://DEINE-SEITE/?room=ABC123^&name=Alex^&overlay=1
npm start
```

PowerShell:
```powershell
npm install
$env:BINGO_URL='https://DEINE-SEITE/?room=ABC123&name=Alex&overlay=1'
npm start
```

Tasten:
- **F8**: Maus-Klicks für das Overlay an/aus. Standardmäßig gehen Klicks durch das Overlay zum Spiel.
- **F9**: Overlay verstecken/einblenden.

Für ein zuverlässiges Always-on-top-Overlay Elden Ring am besten auf **Borderless Windowed / randloses Fenster** stellen. Exklusives Vollbild kann fremde Fenster überdecken.

## 6. Aufgaben ändern
Alle 100 Aufgaben stehen in `tasks.js`:
```js
{t:"Aufgabentext", d:3}
```
`d` ist 1, 2 oder 3. Es müssen exakt 100 Einträge bleiben.

## Fairness-Empfehlungen
- Vorher festlegen: neuer Charakter oder vorhandener Save, Online/Offline, DLC ja/nein, Spirit Ashes allgemein erlaubt oder nur dort verboten, Glitches/Sequence Breaks erlaubt oder verboten.
- Für Challenge-Bedingungen im Zweifel Clips speichern.
- Das aktuelle Set ist primär auf das **Elden-Ring-Grundspiel** ausgelegt; einzelne Aufgaben können je nach Start-Save sehr unterschiedlich lange dauern.
