# Gemeinsame Planung von Angriffsaktion und defensiver Antwort

## Hypothese und fachliche Grundlage

Eine Passauswahl anhand momentaner Positionen und nachträgliche Hilfe erzeugen noch keine
zusammenhängende Wurfchance. Der Kandidat vergleicht deshalb Ballbewegung, Freilaufen,
Drive-and-Kick, Off-Ball-Screens und Pick-and-Roll/-Pop zusammen mit Verfolgen, Übernehmen,
Absinken, Hilfe und Closeout. Transition und belegte spezielle Abschlüsse behalten ihre Planung.

Grundlagen: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.1.4–2.1.5 und 2.2; [WABC Level 2](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-2-eng.pdf),
Player 2.1.2; [Jr. NBA, Extra Pass](https://jr.nba.com/basketball-practice-plans/rookie/page/7/).
Diese Quellen begründen Möglichkeiten, keine tatsächlich gespielten Systeme oder numerischen
Bewegungs- und Reaktionsparameter. Die Modellgrenze erlaubt nun auch unbelegte Screens als
schematische Ergänzung. Aufgezeichnete Beteiligte, Assists und Abschlussorte bleiben verbindlich.

## Vergleich

Untersuchung am 2./3. November 2026; Ausgangsstand `a221dd4`, zunächst sauberer Arbeitsbaum.
Je zehn abgeschlossene Spiele wurden mit `selectGames(league, 10)` gleichmäßig aus den aktuellen
NBA-/WNBA-Spielplänen ausgewählt. Normalisierte Daten einschließlich Profilen wurden pro Spiel
einmal geladen und für beide Compiler im Speicher verwendet. Beide Fassungen wurden mit ihrer
jeweiligen `checkReplay`-Version geprüft. Rohfeeds wurden nicht archiviert.

Die folgende Tabelle nennt den SHA-256-Fingerabdruck der normalisierten Eingabe ohne Abrufzeit.
Identische IDs garantieren bei späteren Abrufen keine identischen Feeds.

| Game ID | Geplante Angriffe | Eingabe-SHA-256 |
| --- | ---: | --- |
| 0012600009 | 1 | `0e1e5e7bc290ea744828b111080c0d44674761e35bf9b796b1b3c2d89a53706e` |
| 0012600001 | 7 | `fbfdd2710e3aa85c6f50c36437a4b95e5ee071b2e08dd09cb1c067a90b0d14ec` |
| 0012600065 | 8 | `cc4cbc71849ab53165c0faa5c2ae3b133bc9700fb9f40ea689050f13dc98dc6f` |
| 0012600055 | 10 | `baeed580e5fcdf36288de166d8f0d1b6f35d46645b64d9222cf9b480fb3d4785` |
| 0022600085 | 7 | `8aac11119ded82b309949d6ff50f17951df350fc965c7cee13eec3fbacc6439a` |
| 0022600097 | 4 | `bacd9d7467595aaa47c0017d5e5a7375367aedb2bdce9978e561cbe6286bda81` |
| 0022600114 | 5 | `0f520a790dcf87ee5a7cc836754c598463abc3a68cfb6466d6af831b5c6a91c2` |
| 0022600132 | 9 | `b9c2969d87aa2fe806b3c3df0787fc17bb6c6a5efdad324dfe8381134215f114` |
| 0022600017 | 9 | `357b1075e7cef82910d73b8c6d313139b4721a55624162105fd62b49fb392e55` |
| 0022600157 | 17 | `392dc00aa091ab7e83a2af1429e86966df877aa1bfede1aea91ba1e5af7a49f3` |
| 1012600001 | 7 | `ae6d7c2d579513d510405cdd4bc12f22021280ccba81690747b1d635c9eb01b1` |
| 1022600024 | 4 | `dafa8e000c08545f1ace573b79ebe9a73676d36c419bc4cf8232c0a8ec22ce92` |
| 1022600066 | 13 | `6617621a955d98113439870e83c3d3706059fa9e2adbe76b5e211a6634d993bb` |
| 1022600107 | 12 | `4a9ae3c7a1d9b0505c815f0220e7191b0f15499f5c878c226e4a153ca461205e` |
| 1022600147 | 11 | `7d231a121a17cea92b0d7a165ce936efb9628a11ed18c440627b5e99ea757907` |
| 1022600190 | 13 | `73bf3a50073c5ab99b74871a384477cc7e26e28198ba6009f3b26838d8d3bfed` |
| 1022600229 | 6 | `fe07e49dbf1a87b5abebbfca46bc70f979298d0729ae044c836fe6bae1b3464e` |
| 1022600270 | 6 | `6a099701522d56a293483dd6db77aa86b66d498ddbf57e4ef6b25f80dac2a6e1` |
| 1022600312 | 9 | `178c7bfd068767e692eb85b8d793e42f9675a232eef44a3ca49798ac34915938` |
| 1042600307 | 11 | `b476a6d8f96ae902d08b94cc05af08295a405afa7e09d3c59b5a8bb34671abb3` |

## Ergebnis und Messgrenzen

Beide Fassungen bestehen die harten Replay-Prüfungen in allen 20 Spielen. Es entstehen keine
neuen offensiven oder defensiven Zonenaufenthalts-Diagnosen; fünf bisherige offensive Meldungen
entfallen. Diese Diagnosen sind weiterhin keine vollständige Regelprüfung.

| Gewählte Variante | Anzahl |
| --- | ---: |
| ball-reversal | 31 |
| catch-and-shoot | 25 |
| drive-kick | 48 |
| extra-pass | 12 |
| off-ball-screen | 10 |
| pick-and-pop | 3 |
| pick-and-roll | 2 |
| relocation | 38 |

Die 168 neu geplanten stationären Sprungwürfe werden am tatsächlichen Wurf-Release
mit denselben Aktionen des Ausgangsstands verglichen. Gemessen wird der kleinste Abstand des
Schützenmittelpunkts zu einem aktiven Verteidiger, in Fuß. Der Mittelwert steigt von
3.17 auf 3.67. Bei mindestens sechs Fuß Abstand steigt die Anzahl von
0 auf 7. Sechs Fuß ist hier ein Diagnosewert, keine aus Tracking-Daten ermittelte Wurfkategorie.
Die Mehrzahl der Würfe bleibt eng verteidigt; der Kandidat erzeugt keine pauschal freien Abschlüsse.

Ein Fangvergleich ist nur für die 45 Aktionen sinnvoll, die in beiden Fassungen einen
expliziten Fang besitzen. Deren mittlerer nächster Verteidigerabstand steigt von
4.08 auf 4.87 Fuß. Ein Vergleich neuer Fänge mit einem beliebigen früheren Vorbereitungspunkt
würde einen nicht vorhandenen Ausgangs-Fang behaupten und wurde deshalb ausgeschlossen.
Mittelwerte belegen keine Verbesserung jeder Szene oder eine vollständige Basketball-Plausibilität.

## Regressionen und Browserprüfung

`deno task test`: 159 Tests bestanden. Die neun neuen lokalen Tests prüfen das Repertoire in
beiden Feldrichtungen, stationäre Screens und Switch-Zuordnungen, Hilfe und Fangfenster,
einen bewegten Fang des abrollenden Centers, Input-Erhalt, deterministische Auswahl, Zeitlimits,
verdeckte Empfänger, Assist-/Wurf-/Score-Anker und Seeking. Bestehende Transition-, Rebound-,
Freiwurf-, Foul- und Folgebewegungsprüfungen bleiben enthalten. Nach einer abschließenden
Präzisierung der sichtbaren Passfreigabe wurden zusätzlich alle 87 lokalen Tests und der gesamte
20-Spiele-Vergleich erneut ausgeführt.

Chrome über Chrome DevTools MCP am lokalen Server: WNBA `1042600307`, Action `482`,
Pick-and-Pop mit Verfolgen und anschließendem Closeout. Gemessener nächster Abstand beim Fang
9,72 Fuß, beim Release 6,50 Fuß; Fang beim belegten Schützen. Zurück- und erneutes Vorwärts-Seeking
liefert dasselbe Canvas-Bild. Der Browser meldet keine Warnungen oder Fehler. Die zusätzliche
Kompilierung dieser Partie dauerte im Browser rund 0,6 Sekunden; das ist kein allgemeiner Benchmark.

Lokaler Einstieg: [Action 482](http://127.0.0.1:5500/?game=1042600307&action=482).
Der Browser-Sichtfall ersetzt keine Nutzerabnahme der gesamten Bewegungsqualität.

## Grenzen

- Die gezeigten Screens, Deckungsvarianten und Pässe bleiben Annahmen. Der Planer kennt weder
  tatsächliche Verteidigungsqualität noch die im Original gewählte Coverage.
- Umfangreichere Abläufe brauchen mehr Vorbereitung; knappe Zeitfenster oder räumlich ungeeignete
  Kandidaten behalten den einfacheren bestehenden Ablauf. Geschützte Rebound- und Folgewege
  sind keine verfügbaren Screen- oder Passstationen.
- Eine zeitbegrenzte Zonenquerung ist möglich; ein dauerhaftes Abstellen in der Zone ist keine
  zulässige Abkürzung. Der lokale Zonentimer ist eine konservative Planungsbedingung und bildet
  die vollständigen Regel-Ausnahmen nicht ab.
- Körpermittelpunkt-Abstände und diskrete Flug-/Wegproben ersetzen keine vollständige Körper-,
  Hand- und Kontaktgeometrie. Die Häufigkeitsverteilung ist keine kalibrierte NBA-/WNBA-Playtype-Verteilung.
