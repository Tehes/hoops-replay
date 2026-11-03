# Nutzung der verfügbaren Feeds

Stand: 3. November 2026. Abgleich gegen den lokalen Arbeitsstand auf `10e6b56`, einschließlich
bereits vorhandener uncommitteter Einwurf-/Regeländerungen. Keine Replay-Logik wurde für diesen
Audit verändert. „Ungenutzt“ meint keine fachliche Auswertung; die unveränderte PbP-Beschreibung
kann die Information trotzdem im UI zeigen.

## Umfang und Grenzen

- Alle sechs angebundenen Feed-Typen für NBA und WNBA geprüft: Schedule, PbP, Boxscore,
  CommonTeamRoster, TeamPlayerDashboard und normalisierte LockerVision-Daten.
- PbP: alle 547 abgeschlossenen Spiele der aktuell gelieferten Spielpläne erfolgreich gelesen:
  174 NBA-Spiele mit 105.595 und 373 WNBA-Spiele mit 182.605 Ereignissen, insgesamt 288.200.
  Enthält Preseason, Regular Season und verfügbare WNBA-Playoffs; keine historischen Vollarchive.
- Boxscore: zwölf über den Spielplan verteilte Spiele je Liga, insgesamt 24. Roster und
  Spielerstatistiken: je vier Team-/Saisonabfragen pro Liga, verteilt auf die erste und letzte
  Spielplan-Stichprobe. Das prüft Feldstrukturen, keine vollständige historische Profilabdeckung.
- Uniforms: zwei Spielabfragen je Liga; jeweils Preseason ohne Datensatz und jüngstes Spiel mit
  Datensatz. HTTP 204 ist hier eine erwartete fehlende Ausstattung, kein fehlgeschlagener Abruf.
- Spielplan: aktueller Default `region=de`. US-Broadcastlabels und frühere Feedversionen nicht
  separat geprüft. Direkter LockerVision-Rohabruf scheiterte an HTTP/2 beziehungsweise Timeout;
  dessen zusätzliche Rohfelder sind deshalb nicht vollständig inventarisiert. Backend-Filter und
  tatsächlich ausgelieferter normalisierter Uniform-Feed wurden geprüft.
- Die Häufigkeiten unten zählen markierte **Ereignisse**, nicht Ballbesitze oder Punkte.
  Feeds können nachträglich korrigiert werden. Kein vollständiger Replay-/Browser-Plausibilitätstest.

## Wichtigste Ergebnisse

### 1. Defensive Goaltending: vorhandener Beleg ohne passende Choreografie

`defensivegoaltending` tritt 43-mal als Wurf-Qualifier auf; zusätzlich gibt es 88
`violation / defensive goaltending`-Einträge. Das sind unterschiedliche Darstellungen derselben
Regelfamilie, keine addierbaren Fallzahlen. Der Qualifier wird nicht ausgewertet; der separate
Verstoß erhält die allgemeine Violation-Darstellung. Der als `Made` gewertete Wurf läuft durch die
normale Trefferanimation. Eine Verknüpfung von Wurf, unerlaubter Berührung und benanntem Verteidiger
fehlt. Der Spielstand ist damit nicht automatisch falsch, die Darstellung der Ursache fehlt aber.

Konkreter Beleg: `0022600135`, Aktionen **225/226**, Q2 11:05: Aktion 225 ist ein als getroffen
gewerteter Layup mit `defensivegoaltending`; Aktion 226 nennt den Verteidiger. Diese Kombination
kann eine gemeinsame Szene begründen, ohne einen gewöhnlichen Block zu erfinden.

### 2. Verstoßvarianten: Information vorhanden, spezifische Erkennung greift nicht

Die Ereignisse werden als Turnover/Violation verarbeitet; ihre genaue Bedeutung erreicht aber
teilweise weder Ortswahl noch spezielle Fortsetzungslogik. Direkte Aufrufe von
`getViolationLocation`, `isThrowInViolation` und `isFreeThrowViolation` lieferten für
`3-second-violation`, `5-second-violation`, `LaneViolation` und `discontinued dribble`
`null / false / false`. Das belegt eine Erkennungslücke, nicht für jeden Fall einen falschen Endzustand.

| Gelieferter Wert | Ereignisse | Derzeitige Lücke / Nachweis |
| --- | ---: | --- |
| `3-second-violation` | 123 | Ortsliste kennt andere Drei-Sekunden-Schreibweisen; `0012600017:134` |
| `8-second-violation` | 25 | Ortsliste kennt `8-second`, aber diese Form fehlt; `0012600066:508` |
| `5-second-violation` | 28 | Keine Erkennung als Einwurfverstoß; zunächst Kontext prüfen, nicht jede Fünf-Sekunden-Variante gleichsetzen; `0012600033:483` |
| `LaneViolation` / `lane violation` | 5 / 4 | `isFreeThrowViolation` kennt nur `lane`/`free throw`; `1042600307:270` |
| `double lane` | 3 | Keine spezielle gemeinsame Lane-Verstoßbehandlung; `0012600059:647` |
| `discontinued dribble` | 12 | Ortsliste verwendet `discontinue dribble`; `0022600135:181` |
| `offensive-kicked-ball` | 11 | Kein spezieller Treffer in Orts-/Violation-Abfragen |
| `basket-from-below` | 4 | Nur allgemeiner Turnover-Ablauf |

Eine kleine, explizite Zuordnung tatsächlich gelieferter Varianten wäre sinnvoller als unscharfe
Textsuche. Unterschiedliche Ereignistypen und Fortsetzungen müssen dabei erhalten bleiben.

### 3. Platzverweise: Ereignis sichtbar, keine eigene Verfügbarkeitssemantik

16 `ejection`-Ereignisse (neun NBA, sieben WNBA), unter anderem `secondtechnical`, `flagranttype2`
und `secondflagranttype1`. Beispiel: `0012600063:426`. Sie bleiben als Szene/Beschreibung erhalten,
werden aber über den allgemeinen Ereigniszweig dargestellt. Es gibt keine eigene Behandlung des
Verlassens des Courts, der weiteren Einsatzberechtigung oder eine darauf gerichtete Validierung.
Aufgezeichnete Auswechslungen können die aktive Fünf trotzdem korrekt halten. Ein Platzverweis
kann außerdem Bankspieler betreffen; er erlaubt keinen erfundenen Ersatzspieler.

### 4. WNBA-Ortslabels: bisher vollständig ungenutzte Zusatzinformation

`area` ist an 112.974, `areaDetail` an 112.972 WNBA-Ereignissen gefüllt; in den gelesenen
NBA-Feeds fehlen beide Felder. Werte: Restricted Area, In The Paint (Non-RA), Mid-Range,
Above the Break 3, Left Corner 3 und Right Corner 3. Die Labels stehen auch an Fouls und Turnovern
mit `x/y = null`, nicht nur an Würfen. Damit sind grobe räumliche Hinweise denkbar, etwa für
Foulkontext oder Plausibilitätsprüfungen.

Ihre Zuverlässigkeit ist offen: `1042600307:7` hat `area = Above the Break 3`, aber
`areaDetail = Mid-Range`; weitere Unterschiede bestehen bei `:41`. Keine Priorität der beiden
Felder oder unabhängige Ortsgenauigkeit ist belegt. Deshalb vor Nutzung gegen Wurfkoordinaten,
Aktionsarten und gegebenenfalls Video prüfen. Keine exakten Foul-, Einwurf- oder Stealorte daraus
behaupten. Ob einzelne Labels übernommen/stale sind, wurde nicht nachgewiesen.

### 5. Spielerprofile: großer vorhandener Rest

Der Saisonfeed wird mit `MeasureType=Base` und `PerMode=PerGame` abgerufen. Aus dem
`PlayersSeasonTotals`-Resultset werden nur `PLAYER_ID`, `GP`, `FGA`, `FG3A`, `FG3_PCT`, `AST`, `REB`
übernommen. Der Resultsetname macht diese Werte nicht zu Saisonsummen.

- **Schon geladen, fachlich ungenutzt:** `REB`. Die Rollenberechnung liest diesen Wert nicht.
  Auch die aus dem Spielboxscore übernommenen `minutes` haben keinen weiteren Verbraucher.
- **Noch gar nicht übernommen:** `OREB`, `DREB`, `MIN`, `BLK`, `BLKA`, `STL`, `TOV`, `PF`, `PFD`,
  `FTA`, `FTM`, `FT_PCT`, `FGM`, `FG_PCT`, `FG3M`, `PTS`, `PLUS_MINUS` und weitere Ergebnis-/Rankingfelder.
- **Sinnvolle Kandidaten:** OREB/DREB getrennt für schematische Reboundorientierung,
  BLK für vorsichtiges Korbschutzprofil, MIN/GP für Einsatzumfang und Stabilität der Stichprobe.
  Spielzeit und Rollenabhängigkeit müssen berücksichtigt werden; reine Pro-Spiel-Werte sind
  keine gleichwertigen Fähigkeitsmaße.
- **Begrenzter Schluss:** STL beweist keine konkrete Aggressivität, FTA/PFD keine Drive-Häufigkeit,
  FG_PCT keinen bevorzugten Abschlussort, PLUS_MINUS keine individuelle Defensivqualität.
  Keine dieser Größen darf benannte Beteiligte oder tatsächliche Ergebnisse ersetzen.
- Saisonaggregate können spätere Spiele enthalten. Für historische Replays sind sie keine
  zeitgenössischen Scoutingberichte; genaue Nutzung als Vor-Spiel-Wissen wäre ein anderer Vertrag.

## Abgleich der sechs Feed-Typen

| Feed | Bereits verwendet | Noch ungenutzt / nur gespeichert | Sinnvoller Einsatz |
| --- | --- | --- | --- |
| Schedule | `gameDates/games`, `gameId`, `gameStatus`, `gameDateTimeUTC`; Audit zusätzlich Saisonmetadaten | Teamdaten/Ergebnisse, Serien-/Spielphasentexte, Arena/Neutralität, Broadcaster, Punkteführer, Wins/Losses/Seeds, lokale Termine, Verschiebungsmetadaten und Kalenderordnung | Spielkontext oder Quellenkonsistenz; wenig direkter Bewegungsgewinn |
| PbP | Reihenfolge, Uhr, Periode, Spielstand, Ballbesitz, Ereignisfamilien, viele Subtypes/Descriptor, Beteiligten-IDs, Wurfort/-distanz/-ergebnis, Wurf-Rebound-Link, ausgewählte Qualifier | Siehe Feld- und Qualifierinventar unten | Goaltending, Regelvarianten, bessere Gegenprüfungen, vorsichtig räumliche Labels |
| Boxscore | Spiel-ID/-status/-datum, Arena-Name, Teams/Endstand, Spieler-ID/-name/-nummer/-position, Starter; Minuten nur übernommen | Fast alle Team-/Spielerstatistiken, Periodenergebnisse, Status/played/oncourt/DNP-Gründe, Resttimeouts/Endbonus, Officials, weitere Hallen-/Zeit-/Besucherdaten | Unabhängigerer Abgleich von PbP, Aufstellungen, Spielminuten, Statistik und Qualifier-Summen |
| Roster | `PLAYER_ID`, `POSITION`, `HEIGHT`, `WEIGHT`; Positionsfallback | `PLAYER`, `NICKNAME`, `PLAYER_SLUG`, `NUM`, `AGE`, `BIRTH_DATE`, `EXP`, `SCHOOL`, `HOW_ACQUIRED`, `SUPPLEMENTAL_STATUS`; Team-/Saison-/Ligametadaten; gesamtes Coaches-Resultset | IDs/Saison als Join-Gegenprüfung; Biografie und Coaches derzeit ohne starken Modellnutzen |
| Player dashboard | GP/FGA/FG3A/FG3_PCT/AST für Profile; ID zum Join | REB nur geladen; übrige Base-Statistiken, Rankings/Fantasywerte; gesamtes `TeamOverall`-Resultset | Rebound-/Korbschutzprofile und bessere Stichprobengewichtung; TeamOverall eher Gegenprüfung |
| LockerVision | Spiel/Liga/Quelle/Team-IDs validiert; `shirt` verwendet | `edition` und `ink` geladen, aber nicht für Darstellung verwendet; weitere Upstreamfelder vom Backend verworfen und hier nicht vollständig geprüft | Edition optional für Kontext; `ink` bewusst **nicht** als echte Trikotnummernfarbe verwenden |

LockerVision-`ink` stammt aus `text_Color` für Websitebeschriftungen. Der bestehende Kommentar in
`getJerseyColors` dokumentiert diese Grenze. Das ist kein übersehener Beleg der realen
Nummern-/Randfarben. Auch Rostergröße und -gewicht, Positionen, Dreiertendenzen und Assists sind
bereits aktiv; sie gehören nicht auf eine Liste ungenutzter Daten.

## Boxscore als bislang kaum genutzte Gegenprobe

Nach Normalisierung bleiben außer Minuten keine individuellen Spielstatistiken erhalten; auch
Teamstatistiken und Periodenscores werden verworfen. Die bestehende Validierung prüft bereits
den Endstand gegen den Boxscore, aber keinen vollständigen statistischen Abgleich.

Hoher Nutzen ohne zusätzliche Choreografie:

- Gespielte Minuten und `played` mit den aus Wechseln rekonstruierten Einsätzen abgleichen.
  `oncourt` ist ein abschließender Zustand, keine historische Aufstellung.
- FGA/FGM, 3PA/3PM, Freiwürfe, individuelle Rebounds, Assists, Steals, Blocks und Turnover aus PbP
  gegen die entsprechenden Boxscorewerte prüfen. Teamrebound/Dead-Ball/Teamturnover getrennt halten.
- `pointsFastBreak`, `pointsSecondChance`, `pointsFromTurnovers`, `pointsInThePaint` als Gegenprobe
  zur PbP-Kontextauswertung nutzen. Punkte sind keine Zahl von Aktionen; Teamfelder mit
  `Attempted/Made` benötigen ihre eigene Semantik und dürfen nicht ungeprüft gleichgesetzt werden.
- Periodenergebnisse und kumulative individuelle PbP-Zähler als weitere Konsistenzanker verwenden.

Boxscore und PbP sind verschiedene Feeds desselben Anbieters, keine unabhängige Bestätigung aus
Tracking oder Video. `inBonus` und `timeoutsRemaining` am Spielende ersetzen niemals die Zustände
an früheren Replay-Momenten. Verletzungs-/DNP-Gründe erlauben keine erfundene Verletzungsszene.

## PbP-Qualifier: vollständige beobachtete Wertemenge

| Qualifier | Ereignisse | Nutzung / Bewertung |
| --- | ---: | --- |
| `startperiod` | 10.289 | Qualifier nicht direkt; Periodenstart über actionType/subType und Jumpball-Descriptor/Uhr schon berücksichtigt. |
| `team` | 15.916 | Nicht direkt; Teamereignisse überwiegend über fehlende personId/Ereignistyp erkannt. Gegenprobe möglich. |
| `2ndchance` | 13.927 | Nicht direkt; zweite Chance schon aus Offensivreboundfolge abgeleitet. Zusätzlicher belegter Kontext/Gegenprobe. |
| `2freethrow` | 10.355 | Aktiv: Shooting-Foul-Verknüpfung und Foulplanung. |
| `fromturnover` | 18.355 | Nicht direkt; Turnoverkontext teilweise aus Besitzfolge. Beweist ausdrücklich keinen Fastbreak. |
| `pointsinthepaint` | 40.443 | Nicht direkt; Wurfort bereits aus x/y. Räumliche Gegenprobe, keine Driveinformation. |
| `fastbreak` | 10.471 | Aktiv für geeignete 2pt/3pt-Transition. Foul-/Turnover-Enden und FT-Kontext noch nicht vollständig choreografiert. |
| `deadball` | 2.755 | Aktiv: unter anderem Rebound-/Live-Ball-Abgrenzung. |
| `mandatory` | 2.868 | Nicht direkt; Timeout bereits dargestellt. Geringer Bewegungsnutzen. |
| `1freethrow` | 3.100 | Aktiv in Foulplanung; And-one/Freiwurfserie zusätzlich aus Ereignisfolge. |
| `inpenalty` | 6.084 | Nicht direkt; Bonus wird bereits aus bisherigen Fouls berechnet. Wert als Gegenprobe nutzbar, nicht als genauer Bonuseintritt. |
| `3freethrow` | 390 | Aktiv: Shooting-Foul-Verknüpfung und Foulplanung. |
| `heave` | 146 | Qualifier nicht direkt; heave als actionType bereits speziell verarbeitet. |
| `defensivegoaltending` | 43 | Nicht direkt; siehe konkrete Darstellungslücke oben. |

## PbP-Feldinventar

Alle in der vollständigen PbP-Sichtung beobachteten fachlichen Felder sind hier gruppiert.
Vorhandensein, Abspeichern und fachliche Nutzung sind getrennte Sachverhalte.

| Felder | Status / Grenze |
| --- | --- |
| `actionNumber`, `orderNumber` | Aktiv: Identität/Links beziehungsweise Reihenfolge; `timeActual` ist kein Ersatz für orderNumber. |
| `clock`, `period` | Aktiv: Spielzeit, Periodenlängen/-wechsel, Ereignisanker. |
| `periodType`, `isTargetScoreLastPeriod` | Nicht ausgewertet; reguläre Perioden/OT bereits über period/Ligakonfiguration. Target-Score-Flag in sämtlichen gelesenen Ereignissen false. |
| `timeActual`, `edited`; Feed-`meta` | Nicht ausgewertet: reale Zeit, Änderungszeit und Liefermetadaten. Nützlich für Diagnosen/Quellenänderungen, kein kontinuierliches Bewegungs- oder Shotclock-Tracking. NBA-PbP-meta hat nicht durchgehend dieselben Felder wie WNBA. |
| `actionType`, `subType`, `descriptor`, `qualifiers` | Aktiv, aber wertabhängig nur teilweise interpretiert; siehe Detailfunde und Qualifiertabelle. |
| `teamId`, `possession` | Aktiv: Ereignisteam, Angriff und Ballberechtigung. |
| `teamTricode` | Im Rohereignis erhalten; Replay-Teamidentität kommt aus Boxscore/teamId, keine zusätzliche taktische Information. |
| `scoreHome`, `scoreAway` | Aktiv: aufgezeichnete Spielstände. |
| `x`, `y`, `side`, `shotDistance`, `isFieldGoal` | Aktiv: Wurfanker, Richtung, Geometrieprüfung/-korrektur; verfügbare Ereigniskoordinaten auch für Einwurfanker. |
| `shotResult` | Aktiv: Wurf/Freiwurf und Fortsetzung. |
| `shotActionNumber` | Aktiv: Verknüpfung von Rebound und vorherigem Wurf. |
| `xLegacy`, `yLegacy` | Ungenutzt: alternative Koordinatendarstellung. Als Gegenprüfung denkbar; Einheit/Orientierung gesondert validieren. Kein zusätzlicher Spielertracking-Feed. |
| `area`, `areaDetail` | Ungenutzt; nur WNBA beobachtet, grobe und teilweise widersprüchliche Labels. |
| `personId`, `assistPersonId`, `blockPersonId`, `stealPersonId`, `foulDrawnPersonId` | Aktiv: aufgezeichnete Haupt-/Nebenbeteiligte. |
| `jumpBallWonPersonId`, `jumpBallLostPersonId`, `jumpBallRecoverdPersonId` | Aktiv: benannte Springer und Empfänger; Schreibfehler Recoverd ist Bestandteil des gelieferten Feldnamens. |
| `personIdsFilter` | Ungenutzt: Beteiligtenliste. Potenzielle Gegenprobe zur eigenen participants-Liste, benennt selbst keine Rollen. Nicht als aktive Fünf interpretieren. |
| `playerName`, `playerNameI`, `assistPlayerNameInitial`, `blockPlayerName`, `stealPlayerName`, `foulDrawnPlayerName`, `jumpBallRecoveredName`, `jumpBallWonPlayerName`, `jumpBallLostPlayerName` | Nicht separat ausgewertet; Namen bereits aus Boxscore und/oder description vorhanden. Nützlich für Diagnose unbekannter Personen, kein Bewegungsgewinn. |
| `description` | Aktiv als Originaltext; nicht pauschal als weitere strukturierte Datenquelle geparst. Viele scheinbar ignorierte Details sind hier bereits sichtbar. |
| `pointsTotal`, `assistTotal`, `reboundTotal`, `reboundDefensiveTotal`, `reboundOffensiveTotal`, `turnoverTotal`, `foulPersonalTotal`, `foulTechnicalTotal` | Ungenutzte individuelle Zähler. Gute Gegenproben; insbesondere pointsTotal ist kumulativ und nicht die Punktezahl des einzelnen Ereignisses. Persönliche Fouls könnten Foulbelastung anzeigen, entscheiden aber keinen erfundenen Wechsel. |
| `officialId` | Ungenutzt; Zuordnung zu Boxscore-Officials möglich, derzeit keine geplante Schiedsrichterdarstellung. |

Weitere bereits genutzte Descriptor sind unter anderem driving/running/cutting, pullup,
step back, turnaround/fadeaway, bank, reverse/finger roll, alley-oop, tip und putback.
Diese Abschlussformen sind kein neuer ungenutzter Fund. Zusammengeschriebene Varianten
`drivingfloating` und `runningpullup` wurden nur an Heaves beobachtet; beide Bestandteile werden
bereits über Teilstringprüfungen erkannt. Ohne konkreten Fehler kein pauschaler Parserumbau.

Teilweise interpretiert sind unter anderem Foul-Descriptor: `flagrant-type-1/2`, `clear-path`,
`away-from-play` und `transition take` erreichen bereits die Fortsetzungslogik. `off-the-ball`
bei Offensivfouls erreicht dagegen keine eigene ballferne Choreografie: der allgemeine
Offensivfoulzweig behandelt den Täter als Ballführer. Das ist ein zusätzlicher sinnvoller
Choreografie-Kandidat (337 markierte Ereignisse), aber kein Beleg für einen konkret illegalen Screen.
`flopping`, `rim-hanging`, `delay` und `too-many-players` werden als technische Fouls verarbeitet,
ohne die konkrete Ursache zu animieren. Eine technische Strafe darf nicht automatisch zu einem
erfundenen Kontakt oder tatsächlich sechs dargestellten Spielern führen.

Jumpball-Descriptor sind ebenfalls nur teilweise aktiv: startperiod, heldball/örtlicher Fallback,
lodgedball, doubleviolation und challenge beeinflussen die bestehende Ortswahl; doublefoul,
outofbounds und unclearpass/unclearpath haben keine eigene Ursachenlogik. Das ist eine begrenzte
Abdeckung, keine vollständig ignorierte Jumpballinformation.

## Priorisierung für anschließende Arbeit

1. Reale Verstoßbezeichnungen eng zuordnen und mit den benannten Originalfällen absichern.
   Betroffen sind Regeln und Einwurforte; erst die genaue Semantik und Nachbarereignisse prüfen.
2. Defensive Goaltending aus Wurf und Violation zusammenführen. Trefferwertung erhalten,
   aufgezeichneten Verteidiger berücksichtigen, Ballweg nicht als normalen Treffer ausgeben.
3. Platzverweise und ballferne Offensivfouls gezielt prüfen. Eigene Semantik ergänzen,
   ohne verfügbare Ersatzspieler oder konkrete Kontaktformen zu erfinden.
4. Die bereits vorhandenen Qualifier und Boxscorezähler als Quellen-Gegenprüfungen nutzen.
   Vor allem 2ndchance/fromturnover/inpenalty sind Kontrollbelege, kein Anlass,
   bestehende zweite Chancen, Besitzwechsel oder Bonusanzeige als bisher ungenutzt auszugeben.
5. Saisonprofile um eng begründete Rebound-/Korbschutztendenzen erweitern; WNBA-area-Felder
   zunächst auf Zuverlässigkeit prüfen. Beide Arbeiten benötigen eine eigene Hypothese und
   geschützte Beispiele, bevor sie die Choreografie verändern.

## Quellen und Reproduktion

- Backend-Routen und Uniform-Filter: [api/main.js](../../api/main.js).
- Aufnahme/Verwerfen von Feldern: [replay-data.js](../../js/replay-data.js).
- Rollen/Profile: [replay-profiles.js](../../js/replay-profiles.js).
- Ereignisverknüpfung, Transition, Foul-/Jumpball-/Ereignisanimation:
  [replay-engine.js](../../js/replay-engine.js).
- Fortsetzungen/Teamfouls: [replay-rules.js](../../js/replay-rules.js).
- Gelieferte Verstoßwerte gegen Orts-/Fortsetzungslisten: [replay-inbounds.js](../../js/replay-inbounds.js).
- Bestehende Prüfung: [replay-validation.js](../../js/replay-validation.js).
- Bewusste Uniform-Grenze: [replay-teams.js](../../js/replay-teams.js), getJerseyColors.
- Qualifier-/Ereignisvokabular: [NBA Game Distribution API, Play by Play Action Types](https://developer.geniussports.com/nbangss/rest/index_central.html).
  Die Dokumentation ist als Draft gekennzeichnet und verwendet teils andere Schreibweisen als
  die tatsächlich gelieferten CDN-Daten; der Audit verwendet beobachtete Feedwerte.

Quellbasis: `https://hoops-replay.tehes.deno.net`, Requests mit
`Origin: http://127.0.0.1:5500`. Pro Liga `/schedule?league=nba|wnba` lesen, alle games mit
`gameStatus === 3` wählen und `/playbyplay/GAME_ID?league=...` vollständig inventarisieren.
Für die Boxscore-Stichprobe abgeschlossene Spiele nach gameDateTimeUTC sortieren und zwölf
Indexpositionen `round(i * (n - 1) / 11)`, i=0…11, wählen. Profil-/Uniform-Stichprobe verwendet
jeweils erstes und letztes dieser Spiele; Roster/Stats für beide Teams mit passender Saison und
Pre Season/Regular Season/Playoffs. JSON-Schlüssel und gefüllte Werte rekursiv inventarisieren;
Vorkommen allein wurde anschließend manuell gegen die Verbraucher verfolgt.

Boxscore-Stichprobe NBA: 0012600009, 0012600033, 0012600039, 0012600017, 0012600061,
0022600092, 0022600103, 0022600119, 0022600135, 0022600019, 0022600156, 0022600172.
WNBA: 1012600001, 1022600017, 1022600051, 1022600084, 1022600118, 1022600151,
1022600186, 1022600218, 1022600252, 1022600285, 1022600319, 1042600307.

Bewertung der Daten: ein erfolgreicher Abruf belegt Verfügbarkeit, nicht Konsistenz. Dieser Audit
ist eine Feld-/Werte- und Nutzungssichtung, keine Freigabe aller Feeds oder aller Replay-Regeln.
