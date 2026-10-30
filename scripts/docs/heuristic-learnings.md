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
