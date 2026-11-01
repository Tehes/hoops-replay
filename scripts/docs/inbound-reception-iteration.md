# Einwurffang vor dem Außenaufbau

## Hypothese und fachliche Grundlage

Ein pauschaler Fangpunkt knapp innerhalb der Ausballstelle erzeugt an der offensiven Baseline
unnötige Korbnähe. Der folgende Weg nach außen wirkt wie das Aufgeben einer Abschlusschance,
obwohl weder dieser Fangpunkt noch ein vorheriger Innenpass im Feed belegt sind.
Die Hypothese betrifft die ergänzte Einwurfstation, nicht den aufgezeichneten späteren Wurf.

- [WABC Level 3](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-3-eng.pdf),
  Team 2.5.1, S. 223 und 226: Baseline Out of Bounds; sichere Anspielbarkeit, verschiedene
  äußere Sicherheitsräume und die Anpassung an die Verteidigung. Die dort gezeigten Screens
  werden nicht als gespielte Aktionen übernommen.
- [WABC Level 2](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-2-eng.pdf),
  Team 1.1.2, S. 228, und Player 1.1.3, S. 97: Low-Post-Hilfe, Doppeln beim Fang und Rückpass
  an den Perimeter mit anschließender Rotation. Ein Rückpass muss nicht in die Corner gehen.

Diese Quellen begründen schematische Möglichkeiten. Sie belegen weder die tatsächliche
Verteidigung einer Partie noch eine Häufigkeitsaussage wie „fast immer versperrt“. Eine
historische Datierung des Corner-Kickouts wurde nicht untersucht und steuert die Änderung nicht.

## Vergleich

Untersuchung am 1. November 2026, Ausgangsstand `ccb7fe4`, zunächst sauberer Arbeitsbaum.
Aus jedem aktuellen Liga-Spielplan wurden fünf abgeschlossene Spiele gleichmäßig über die
verfügbare Zeitspanne gewählt (`selectGames(league, 5)`). Die Auswahl enthält die gemeldete Partie.
Normalisierte Eingaben einschließlich Saisonprofilen wurden einmal geladen und im Speicher für
beide Compilerstände verwendet. Keine archivierten Rohfeeds; spätere Abrufe können abweichen.

Messung: Bei Szenen mit `assumedInbound` wird der Ballhalter bei `scene.start + scene.liveAt`
über `getReplayFrame` bestimmt. „Tief“ bedeutet höchstens acht Fuß Abstand seines Mittelpunkts
zum angegriffenen Korb. Das ist ein Diagnosekriterium, kein Beweis einer freien Abschlusschance.

| Liga | Game ID | Tiefe Fänge vorher | Nachher | Neue äußere Stationen |
| --- | --- | ---: | ---: | ---: |
| NBA | 0012600009 | 1 | 0 | 1 |
| NBA | 0012600043 | 1 | 0 | 2 |
| NBA | 0022600091 | 2 | 0 | 2 |
| NBA | 0022600125 | 4 | 0 | 4 |
| NBA | 0022600153 | 2 | 0 | 4 |
| WNBA | 1012600001 | 1 | 0 | 1 |
| WNBA | 1022600076 | 5 | 0 | 5 |
| WNBA | 1022600168 | 1 | 0 | 1 |
| WNBA | 1022600261 | 5 | 0 | 5 |
| WNBA | 1042600307 | 7 | 0 | 7 |

Insgesamt 4.252 Szenen und 68 angenommene Einwürfe; 29 tiefe Fänge im Ausgangsstand.
Bei 23 davon liegt der spätere Wurf außerhalb dieses Korbraums oder es folgt ein Turnover.
Unter den 215 ergänzten Vorbereitungs-/Verbindungspässen fand sich kein Fang in diesem Korbraum.
Deshalb wurde die Passzirkulation nicht zusätzlich verändert.

Im gemeldeten Beispiel ist der Anschluss Action 20 (Q1 8:53), nach dem Teamrebound Action 18
und dem geblockten Layup Action 16. Der Fangpunkt wandert von `(86, 22.50)` nach `(85, 5)`:
rund 3,72 gegenüber 20,35 Fuß Korbabstand. Howards belegter Außenwurf bleibt an seinem Ort.
Weitere betroffene Beispiele: NBA `0022600125`, Action 26, und WNBA `1022600076`, Action 307.

## Gewählter Hebel und Grenzen

Nur angenommene Einwürfe im tiefen Vorfeld erhalten eine neue Fangpunktwahl. Zur Auswahl stehen
die Aufbauposition und äußere Stationen auf beiden Seiten. Passkorridor, Empfangsraum,
Mitspielerabstand und Anschlussweg bestimmen die Wahl. Die feste Sicherheitsdistanz von zwölf
Fuß und die Gewichte sind eigene Heuristiken, keine Literaturwerte. Das Verfahren wählt auch
Short-Corner-Stationen; es behauptet dort keinen freien Dreier oder ein individuelles Schützenprofil.

Ein kurzer direkter Innenabschluss des eingeplanten Empfängers ohne fremden Assist bleibt
ausgenommen. Wird keine geeignete Station gefunden, bleibt die bisherige Planung bestehen;
in dieser Stichprobe griff dieser Rückfall bei keinem der 32 betroffenen Einwürfe.
Eigene-Hälfte-Einwürfe und die übrigen Fortsetzungen erhalten keine neue Auswahlregel.

Ausgangsstand und Kandidat bestehen `checkReplay` in allen zehn Spielen; der Kandidat wurde an
77.628 Frames geprüft. Regressionstests schützen beide Ligen und Richtungen, direkte Abschlüsse,
belegte Wurfanker, unveränderte Quelldaten, freie Kandidaten, belegte Stationen und Seeking.
Chrome MCP am lokalen Server zeigt im A/B-Vergleich der gemeldeten Szene den äußeren Fang
anstelle des tiefen Einwurfs. Die visuelle Nutzerabnahme und eine umfassende Beurteilung der
bewegten Passverteidigung bleiben offen. Geänderte Fangpunkte können spätere Laufwege und
Formationsentscheidungen beeinflussen; erfolgreiche Validierung ersetzt keine Basketballabnahme.

## Eingabefingerabdrücke

SHA-256 über dieselbe normalisierte Struktur wie im Batch-Audit, ohne `sources.captured`.

| Game ID | SHA-256 |
| --- | --- |
| 0012600009 | `0e1e5e7bc290ea744828b111080c0d44674761e35bf9b796b1b3c2d89a53706e` |
| 0012600043 | `d856f380eef10a1eb8890e8184e63709327a84f8bb6b31afb4e868b3c24fae9b` |
| 0022600091 | `3e8d40b0a7a16ac43da4cde48289544819fcee2ec1af39d8e70512a6329da608` |
| 0022600125 | `1451b4f04a9b4712824180a63cf3bc033d383b4f08974a572110265ea4fc7774` |
| 0022600153 | `77e9673dd39048ed1b7201a8ec5a96f749adc2487e71fc337dc86d393d4f7d35` |
| 1012600001 | `ae6d7c2d579513d510405cdd4bc12f22021280ccba81690747b1d635c9eb01b1` |
| 1022600076 | `a430f1aa13ea9a46a41065b7b797adc4cb06358b70e992d13aeaecd8aa2bebab` |
| 1022600168 | `c095ce89cd42b157d0a91ff948f1d83fb20fd8879854d4323e47547399d1808f` |
| 1022600261 | `9cc1346455732afa376b5bfeefe4c1fc287f87e9847735d37940746eb95baf27` |
| 1042600307 | `b476a6d8f96ae902d08b94cc05af08295a405afa7e09d3c59b5a8bb34671abb3` |
