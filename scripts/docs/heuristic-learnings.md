# Replay-Heuristik: Learnings

Dieses Dokument hält begrenzte fachliche Iterationen fest. PROJECT.md beschreibt das gültige Konzept.
Reale Spiele kommen vom Server; IDs bezeichnen Vergleichsfälle, keine unveränderlichen Datenarchive.

## Seitlicher Outlet nach kontrolliertem Defensivrebound

- **Ursache:** Der erste Ballführer wurde bei der Outlet-Übergabe grundsätzlich auf y = 25 gestellt.
  Damit fehlten die seitliche Anspielstation und ein sichtbarer freier Pass mit bewegtem Fang.
- **Grundlage:** [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
  Team 2.3.1, „Basic Fast Break – Starting the Break“. NBA/WNBA-Rückspielbedingungen begrenzen den Einsatz
  auf Rebounds in der eigenen Hälfte; Fristen sind kein vollständig implementiertes Prüfmodell.
- **Hypothese und Hebel:** Bei genügend Zeit eine freie seitliche Station anbieten und im Vorlaufen fangen.
  Empfangspunkte gegen die aktuellen schematischen Spieler und den Passkorridor prüfen.
  Der Rebounder behält seine Position bis zum Pass; die Mitspieler laufen gleichzeitig voraus.
- **Geschützt:** Aufgezeichnete Akteure, Orte, Ergebnisse und Uhren; Steals, Einwürfe, schnelle Transitionen,
  Unterbrechungen, selbst vortragender PG und Backcourt-Abschlüsse. Keine zusätzlichen Statistikereignisse.
- **Evidenz:** Vergleich auf denselben einmal geladenen Daten des Standardbatches plus `0012600040`.
  Zuvor zentrale Übergaben werden zu seitlichen freien Passphasen. Konkrete Sichtfälle sind
  `0012600040`, Aktionen 19 und 27. Die gemeinsame Prüfung und vorhandenen Einzelprüfungen bleiben
  die technischen Grenzen; die Kriterien selbst wurden für diese Heuristik unverändert gelassen.
- **Entscheidung:** Als begrenzte technische Verbesserung beibehalten. Die visuelle Nutzerabnahme und
  eine umfassende Bewertung von Passdruck, Laufwegkonflikten und Anschlussentscheidungen bleiben offen.
- **Grenzen:** PG ist ein Aufstellungsslot; die tatsächliche Ballführerrolle ist unbekannt. Statische
  Korridorabstände beweisen keine gegen jede Verteidigerbewegung sichere Passlinie. Ohne geeigneten
  seitlichen Punkt bleibt der bisherige Aufbau erhalten. Keine vollständige Acht-/Drei-Sekunden-Prüfung.

## Fadeaway mit anschließendem eigenem Rebound

`0012600040`, Aktion 71: Die Landung war korrekt. Der spätere eigene Rebound-Lauf veränderte
jedoch die Endposition der Szene. Eine Abschlussprüfung muss die Landung am Wurfende beurteilen,
nicht erst nach der Folgebewegung. Dieser Messfehler wurde vor dem Outlet-Vergleich korrigiert;
die Bewegungsheuristik wurde dafür nicht geändert.

## Offensive Zone: Warten und Anspielen unterscheiden

- **Ursache:** Innenpositionen und spätere Abschlusspositionen wurden bereits während des langen
  Aufbaus besetzt. Die komprimierte Replay-Dauer verdeckte Aufenthalte über drei Spielsekunden.
- **Grundlage:** [NBA Rule 10, Section VI](https://official.nba.com/rule-no-10-violations-and-penalties/)
  und [WNBA 2026 Rule 10, Section VI](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf).
  Kurzes Anspielen in der Zone ist zulässig; Schussbewegungen und unmittelbares Verlassen brauchen
  eine eigene Beurteilung. Ein späterer Abschluss erlaubt kein beliebig langes vorheriges Warten.
- **Hebel:** Warte-, Passfolge- und Rebound-Vorbereitungsziele außerhalb der Zone wählen. Spätere
  Innenschützen warten bei längeren Angriffen außerhalb und gehen erst zur Abschlussbewegung hinein.
  Bestehende Innenpositionen nach zweiten Chancen dürfen sich direkt zum nächsten Rand lösen.
- **Geschützt:** Aufgezeichnete Wurfkoordinaten, Akteure, Uhren und Ergebnisse, kurze Innenzuspiele,
  direkte Abschlüsse und Tip-ins/Putbacks. Keine neuen Pfiffe oder Statistikereignisse.
- **Evidenz und Entscheidung:** Im Vergleich derselben einmal geladenen 20 Server-Spiele wurden
  lange Aufenthalte in der Vorbereitung deutlich seltener; die Quelldaten blieben unverändert.
  Der abschließende Standardbatch besteht die gemeinsame Prüfung. Die vorhandenen Einzelprüfungen
  bestehen ebenfalls; Wartepositions-Anker und direktes Freimachen werden dabei ausdrücklich
  von Abschlussankern und gewöhnlichen kleinen Positionskorrekturen unterschieden.
  Chrome MCP auf `127.0.0.1:5500`: `0022600007`, Aktion 45, zeigt den Weg von außen zum Innenzuspiel.
  Als begrenzte Verbesserung beibehalten, verbleibende Diagnosekandidaten weiter beurteilen.
- **Grenze:** Die unabhängige Diagnose meldet Aufenthalte im offensiven Aufbau in Spielsekunden.
  Ihre Prüfkandidaten sind keine bewiesenen Regelverstöße: Sie kennt Körperpositionen statt Füßen,
  noch keine vollständigen Ausnahmen und keine Kontinuität über Szenengrenzen. Ein Zonenverbot
  oder bloßes Verkürzen der Replay-Dauer wäre fachlich falsch.

### Übernommene Innenpositionen und begrenzte Zwischenschritte

- **Befund:** Die verbleibenden 20 Kandidaten wurden anhand ihrer abgetasteten Wege in sechs
  klare Wartefälle und 14 Bewegungsfälle getrennt. Übernommene Positionen bei fortgesetztem Aufbau
  konnten innen bleiben; die spätere Korrektur war von einer zusätzlichen Wartephase abhängig.
  Außerdem konnte ein auf sechs Fuß begrenzter Schritt innen enden, obwohl sein ferner Zielpunkt
  außerhalb lag. Laufende Spieler sind deshalb nicht pauschal von der Diagnose auszunehmen.
- **Änderung:** Übernommene Warteziele werden bei längeren Wurfvorbereitungen zum nächsten
  Zonenausgang verlegt. Begrenzte Positionskorrekturen dürfen nicht in der Zone enden.
  Die bestehende Erhaltungsprüfung erlaubt zusätzlich genau den nächstgelegenen Wartepunkt
  außerhalb; die Zonenmessung und ihre Drei-Sekunden-Schwelle bleiben unverändert.
- **Vergleich und Entscheidung:** Derselbe einmal geladene Standardbatch ergibt 20 → 11
  Diagnosekandidaten; alle sechs klaren Wartefälle entfallen. Keine Quelldatenänderungen und keine
  Fehler in der gemeinsamen Prüfung; die vorhandenen Einzelprüfungen bestehen. Verbesserung
  beibehalten. Beispiel `0012600032`, Aktion 253: Wallace löst sich vom Zonenrand, statt dort den
  Aufbau abzuwarten. `0012600014`, Aktion 696: Cryer hält die äußere Position, statt nach innen
  versetzt zu werden. Beide wurden mit Chrome MCP kontrolliert. Das Innenzuspiel in
  `0022600007`, Aktion 45, bleibt als geschützter Vergleich erhalten.
- **Zunächst verbleibende elf Fälle:** Zwei direkte Wege aus der Zone (`0022600131`:409, `1022600147`:369),
  sieben Durchquerungen während des Aufbaus (`0012600014`:572, `0012600059`:411,
  `0022600100`:48, `1022600024`:346, `1022600147`:166, `1022600228`:472, `1022600311`:242)
  und zwei vorbereitende Läufe zum nächsten Abschluss (`1022600228`:209, `1022600311`:449).
  Ihre vollständige Bewegung wurde anschließend wie folgt geprüft.

### Feinprüfung der elf Bewegungsfälle

Die Wege wurden bis zum tatsächlichen Austritt beziehungsweise zur Wurfabgabe verfolgt, zusätzlich
zur unveränderten Diagnose vor der Abschlussbewegung. Die folgende Messung verwendet Schritte von
0,01 Replay-Sekunden und die abgebildete Spieluhr. Werte sind gerundet und beschreiben weiterhin
Körpermittelpunkte, keine Füße. Ein laufender Spieler erhält keine pauschale Drei-Sekunden-Ausnahme.

| Spiel / Aktion | Spieler | Vorher, Spielsekunden | Nachher, Spielsekunden | Beurteilung |
| --- | --- | --- | --- | --- |
| `0012600014`:572 | Emanuel Sharp | 4,54 | 1,20 | Zu später Austritt aus einer Aufbau-Zwischenstation; korrigiert |
| `0012600059`:411 | Zach Edey | 4,86 | 0,99 | Langer Querweg im Aufbau; korrigiert |
| `0022600100`:48 | Jaren Jackson Jr. | 3,26 | 1,54 | Bereits unmittelbar am Rand; der Aufbauweg wird zusätzlich kürzer |
| `0022600131`:409 | Donovan Clingan | 3,36 | 3,34 | Kontinuierlicher direkter Austritt, plausibler Auslauf |
| `1022600024`:346 | Natasha Mack | 4,26 | 2,08 | Langer Querweg im Aufbau; korrigiert |
| `1022600147`:166 | Dominique Malonga | 4,88 | 1,66 | Innenliegende Zwischenstation mit Pause; korrigiert |
| `1022600147`:369 | Alyssa Thomas | 3,33 | 3,31 | Kontinuierlicher direkter Austritt, plausibler Auslauf |
| `1022600228`:209 | Shakira Austin | 3,05 | 0 | Bereits unmittelbar am Rand; nähere Außenseite vermeidet die Querung |
| `1022600228`:472 | Jessica Shepard | 3,18 | 1,53 | Bereits unmittelbar am Rand; der Aufbauweg wird zusätzlich kürzer |
| `1022600311`:242 | Awa Fam | 3,66 | 2,30 | Grenzfall einer laufenden Querung; nun ohne Überschreitung |
| `1022600311`:449 | Laeticia Amihere | 5,91 | 0 | Vorbereitender Lauf kreuzte die gesamte Zone; nähere Außenseite gewählt |

- **Allgemeine Ursachen und Änderung:** Nicht nur Endziele, auch Zwischenstationen des Live-Aufbaus
  dürfen nicht zum langen Innenaufenthalt führen. Innen stehende Mitspieler gehen zuerst zum
  nächstgelegenen Außenziel; der gesicherte Rebound bleibt beim Rebounder. Eine schematische
  Übergabe nutzt eine äußere Fangposition. Beim Vorauslaufen zum nächsten Abschluss wird die
  Außenseite nach dem tatsächlichen Ausgangspunkt gewählt, statt automatisch die gegenüberliegende
  Seite anzulaufen. Keine Änderungen an Ereignisankern, Innenzuspielen oder Abschlussorten.
- **Auslauf-Beurteilung:** Bei Clingan und Thomas liegen die Mittelpunkte nach drei Sekunden etwa
  0,6 beziehungsweise 0,7 Fuß vom Rand entfernt. Sie verlassen die Zone ohne Halt ungefähr
  0,35 Sekunden später. Das stützt die Auslauf-Ausnahme aus Rule 10, Section VI; es ist eine
  geometrisch begründete Einordnung, kein vollständig modellierter Schiedsrichterentscheid.
- **Vergleich und Entscheidung:** Auf denselben einmal geladenen 20 Spielen sinkt die unveränderte
  Diagnose von elf auf einen Kandidaten (Thomas). Clingans Auslauf endet nach Beginn der
  Abschlussbewegung und liegt damit teilweise außerhalb ihres Messfensters. Der Kandidat wird
  nicht ausgeblendet. Keine Validierungsfehler oder Quelldatenänderungen; vorhandene Einzelprüfungen
  bestehen. Die Transition-Prüfung erlaubt einen konkret geprüften nächstgelegenen Zonenaustritt,
  bevor sie den relativen Vorsprung gegenüber dem PG verlangt. Sonstige Lauf-, Tempo-, Anker- und
  Seeking-Prüfungen bleiben bestehen. Als allgemeine Verbesserung beibehalten.
- **Sichtkontrolle:** Chrome MCP überprüft die geänderten Wege bei Sharp und Amihere sowie das
  geschützte Innenzuspiel `0022600007`:45. Die verbleibende Auslaufmeldung ist fachlich beurteilt;
  defensive drei Sekunden und eine vollständige Fuß-/Regelausnahmen-Erkennung bleiben außerhalb
  dieser Iteration.

## Kurzer diagonaler Freilauf nach einem Pass

- **Grundlage:** [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
  Team 2.1.1, „Basic Floor Spacing – Pass and Cut / Give and Go“: Nach einem Pass auf Mitspieler und
  Verteidiger reagieren und eine neue Anspielmöglichkeit schaffen. Die Trainingsformation wird
  nicht als tatsächlich gespieltes NBA-/WNBA-Set übernommen.
- **Befund und Hebel:** Die lokalen Optionen der Passgeber-Relokation waren überwiegend seitlich
  oder rückwärts gerichtet. Zwei kurze diagonale Vorwärtsoptionen ergänzen die vorhandene Auswahl.
  Sie werden nur gewählt, wenn ihre bestehende Spacing-/Passlinienbewertung das Halten verbessert.
  Vier Zwischenpunkte prüfen den Weg gegen geplante Mitspielerpositionen, aktuelle Verteidiger und
  die Zone. Vorhandene enge Ausgangsabstände dürfen dabei nicht weiter unterschritten werden.
- **Geschützt:** Aufgezeichnete Beteiligte, Abschlussorte, Uhren und Ergebnisse; maximal sechs Fuß
  Relokation im vorhandenen Zeitfenster. Schütze, Assistent, Innenrolle, Rebound-Vorbereitung und
  vorausgeplanter Folgeempfänger werden weiterhin nicht zusätzlich versetzt. Keine neuen PbP-Pässe,
  Assists oder Rückpässe; ruhige freie Stationen bleiben möglich.
- **Vergleich:** Auf denselben einmal geladenen 20 Server-Spielen bleiben die zwölf bisherigen
  Passgeber-Relokationen unverändert. Hinzu kommt ein diagonaler Vorwärtsweg in `1022600147`,
  Aktion 44, Lexi Held: von (68, 45) nach (72, 42), fünf Fuß Weg in rund 2,48 Replay-Sekunden. Die abgetastete
  Bewegung hält über elf Fuß Abstand zu Mitspielern und über vier Fuß zu Verteidigern. Keine
  zusätzlichen Zonenmeldungen oder Validierungsfehler; die vorhandenen Einzelprüfungen bestehen.
  Chrome MCP bestätigt den Freilauf nach der Ballabgabe und unverändertes Seeking an dieser Aktion.
- **Entscheidung und Grenze:** Als kleine Erweiterung beibehalten. Ein zusätzlicher Fall im Batch
  belegt noch keine breit verbesserte Angriffschoreografie. Es handelt sich um einen kurzen
  Freilauf, keinen vollständigen Pass-and-Cut-/Give-and-Go-Ablauf. Statische Verteidigerpositionen,
  vier Planungsstichproben und ergänzende Abtastung ersetzen keine durchgängige Kollisionsprüfung.
