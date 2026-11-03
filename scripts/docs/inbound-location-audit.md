# Einwurfort: Regelabgleich

Untersuchung und anschließende Umsetzung vom 3. November 2026.
Die folgende Befundmatrix beschreibt den Ausgangsstand; die Umsetzung steht am Ende.

## Quellen und Geltungsbereich

Für den Einwurfort sind die Ligaregeln maßgeblich. Coaching-Literatur kann Empfangsstationen
und Einwurfspielzüge begründen, bestimmt aber nicht den regelrecht vorgeschriebenen Ort.
Die bereits untersuchte Safety-Catch-Choreografie beantwortet deshalb eine andere Frage.

- [NBA Rule 6, Section I](https://official.nba.com/rule-no-6-putting-ball-in-play-live-dead-ball/): Ortsgruppen und Periodenbeginn.
- [NBA Rule 8, Section III](https://official.nba.com/rule-no-8-out-of-bounds-and-throw-in/): Treffer, Freiwurfverstöße, Rückspiel.
- [NBA Rule 10](https://official.nba.com/rule-no-10-violations-and-penalties/): spezielle Verstöße und ursprünglicher Einwurfort.
- [NBA Rule 12B](https://official.nba.com/rule-no-12-fouls-and-penalties/): Fouls und erhaltenes Angriffsrecht.
- [NBA Rule 5, Section VI](https://official.nba.com/rule-no-5-scoring-and-timing/): Vorverlegung nach Auszeit.
- [WNBA Official Rules 2026](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf): insbesondere Regeln 5, 6, 8, 10 und 12.

NBA-Abgleich gegen die aktuell veröffentlichte HTML-Fassung; eine gesonderte NBA-Ausgabe
2026–27 wurde nicht verifiziert. Historische Spiele benötigen die jeweilige Saisonfassung.
Die Aussagen beziehen sich auf gewöhnliche Fortsetzungen; zusätzliche Strafen und Reviews
können diese verändern. Ein Fehlwurf, Steal oder individueller Live-Rebound allein verlangt
keinen Einwurf. Bei And-one und laufenden Freiwurfserien darf kein Einwurf dazwischentreten.

## Regelmatrix und Codebefund

| Situation | Vorgeschriebener Ort / Einschränkung | Ausgangsbefund |
| --- | --- | --- |
| Feldkorb oder letzter getroffener gewöhnlicher Freiwurf | Grundlinie am gerade getroffenen Korb; Bewegung entlang der Linie erlaubt | Richtige Grundlinie; fester schematischer Punkt ist zulässig. |
| Beginn Q2–Q4 | Eigene hintere Grundlinie; Einwurfrecht nach erstem Ballbesitz | Grundlinie und Teamfolge modelliert; Overtime beginnt mit Sprungball. |
| Ausball über Seitenlinie | Am Austrittsort | Gewöhnlicher Dead-Ball-Turnover verwendet pauschale Seitenlinienposition; sichtbarer Ausball wird nicht weitergereicht. |
| Ausball über Grundlinie | Nächster Grundlinienpunkt außerhalb der verlängerten Drei-Sekunden-Zone | Gewöhnlicher Turnover nicht getrennt; angenommene Teamrebound-Ausbälle können innerhalb der verlängerten Zone einwerfen lassen. |
| Gewöhnliches Foul ohne Freiwürfe, Offensivfoul | Nächste Seitenlinie zum Unterbrechungsort, nicht näher an der betreffenden Grundlinie als die verlängerte Freiwurflinie | `foul` fällt auf pauschalen Ort zurück. |
| Traveling, Dribbelverstoß, Shotclock, Kickball während Live-Spiel | Seitenlinie beim Verstoß, mit Grenze an der verlängerten Freiwurflinie | Keine entsprechende Ortsableitung. |
| Offensive drei Sekunden, offensives Basket Interference, fünf Sekunden mit Rücken zum Korb | Seitenlinie an verlängerter Freiwurflinie beim betroffenen Korb | Gewöhnliche Turnover werden nicht nach diesen Ortsgruppen unterschieden. |
| Defensive drei Sekunden | Nach technischem Freiwurf: nächste Seitenlinie an verlängerter Freiwurflinie | Eigene Ortsgruppe und Seitenwahl vorhanden; keine vollständige Freigabe aller Ereignisfolgen. |
| Flagrant / Punching | Nach Strafe: Seitenlinie an verlängerter Freiwurflinie; Flagrant erlaubt beide Seiten | Flagrant-Freiwurfdescriptor hat passende Ortsgruppe; Punching nicht separat nachgewiesen. |
| Clear Path / Transition Take / Away from Play | Eigene Strafen; fortgesetzter Besitz am regelabhängigen Unterbrechungsort, kein pauschaler Flagrant-Ort | Kein ausdrücklich differenzierter Ortsplan; Freiwurfdescriptor und Folgeereignisse gesondert prüfen. |
| Rückspiel / acht Sekunden | NBA: Mittellinie; WNBA 2026: Seitenlinie einen Schritt im Rückfeld des einwerfenden Teams | Gemeinsamer Seitenlinienfallback; WNBA-Abweichung fehlt. Auch erlaubte Passrichtung unterscheidet sich. |
| Auszeit bei laufendem Spiel | Seitenlinie nächstgelegen zum Unterbrechungsort | Seitenlinienfortsetzung vorhanden, aber ohne gespeicherten Ort. |
| Auszeit bei bereits totem Ball | Bisherige Fortsetzung erhalten, soweit keine Ausnahme greift | Fortsetzungsart teilweise erhalten; genauer Ort wird nicht allgemein mitgeführt. |
| Berechtigte späte Auszeit | Wahlweise 28-Fuß-Markierung im Vorfeld, abhängig von Besitz, vorherigem Vortragen und belasteter Auszeit | Keine Vorverlegungsentscheidung; Auszeit allein beweist deren Nutzung nicht. |
| Gewöhnliches Technical | Unterbrochene Fortsetzung nach Strafe erhalten | Art/Team werden modelliert; ein allgemeiner räumlicher Unterbrechungsanker fehlt. |
| Einwurf ohne Berührung wieder ins Aus / Kick während Einwurf | Ursprünglicher Einwurfort, mit regelabhängig erhaltenen Privilegien | Kein allgemeiner persistenter Einwurfort für solche Folgen. |
| Offensiver Freiwurfverstoß bei letztem live bleibendem Versuch | Seitenlinie an verlängerter Freiwurflinie; andere Freiwurfkonstellationen gesondert behandeln | Keine allgemeine eigene Fortsetzung für diesen Verstoß. |

Zustandsentscheidung: `js/replay-rules.js`, insbesondere `planGameStates`.
Räumliche Wahl: `js/replay-engine.js`, `prepareAttack` (Einwurfblock um Zeile 1611),
`animateTeamReboundOut` und `animateOutOfBoundsPass`.
Der allgemeine Seitenlinienfallback liegt bei x=47, y=51.5; bei geplanter Rückfeldformation
bei x=34 bzw. 60. Er richtet sich damit teilweise nach dem folgenden Wurf statt nach dem Pfiff.
Koordinaten in Fuß: x=0–94, y=0–50; verlängerte Freiwurflinien x=19/75, Zonenbreite y=17–33.

## Konkrete reproduzierte Fälle

Die beiden vollständigen Spiele wurden über den bestehenden Projektserver geladen und kompiliert.
Die folgenden Punkte stammen aus den erzeugten Frames, nicht aus Video oder Tracking.
Die untersuchten Foul-/Turnover-Einträge enthielten keine numerischen x/y-Ortsbelege.

| Spiel / Ereignis → nächste Einwurfszene | Beobachtung |
| --- | --- |
| DEN–OKC `0022600007`, 131 → 132, Q1 1:23 | Fehlpass endet bei (28.16, -1), nächster Einwerfer bei (47, 51.5): andere Seitenlinie und andere Längsposition. |
| DEN–OKC, 404 → 405, Q3 8:30 | Offensive Goaltending am rechten Korb; Einwurf bei (47, 51.5) statt verlängerter Freiwurflinie x=75. |
| GSV–ATL `1042600304`, 139 → 144, Q2 8:36 | Fehlpass endet bei (80.28, -1), Einwurf bei (47, 51.5): erneut falsche Seite im eigenen schematischen Ablauf. |
| GSV–ATL, 194 → 199, Q2 4:53 | Shotclock-Verstoß mit Ball bei (79, 45.8); Einwurf bei (47, 51.5), statt nächster Seitenlinie mit Begrenzung auf x=75. |
| DEN–OKC, Teamrebound 59 → Einwurf in 61 | Angenommener Grundlinienausball und Einwerfer bei (95.5, 25), innerhalb verlängerter Zone. |
| GSV–ATL, Teamrebound 55 → Einwurf in 57 | Entsprechender Fall bei (-1.5, 25). |

Insgesamt lagen in diesen Spielen sechs bzw. sieben Einwürfe nach angenommenem
Teamrebound-Ausball an der Grundlinie innerhalb der verlängerten Zone. Diese Zahl betrifft nur
diesen geometrisch geprüften Fall, keine vollständige Fehlerquote aller Einwürfe.
Der Austrittsort und zulässige Einwurfort müssen getrennt werden: Der Ball darf hinter dem Korb
ins Aus gelangen, während der Einwerfer seitlich außerhalb der verlängerten Zone steht.

## Umsetzungsumfang

1. Ortsgruppe anhand von Regel, Liga und Fortsetzung bestimmen; diese von der Choreografie trennen.
2. Unterbrechungs-/Ausballort und ursprünglichen Einwurfort mitführen. Aufgezeichnete Orte haben
   Vorrang; ohne Ortsbeleg den eigenen schematischen Ereignisort verwenden und als Annahme behandeln.
3. Erst danach nächste zulässige Grenzposition wählen. Ausballpunkt und Einwurfort getrennt halten;
   Treffer-Grundlinie behält ihre Bewegungsfreiheit.
4. Späte Auszeiten separat untersuchen: Berechtigung und tatsächliche Wahl nicht gleichsetzen.
5. Obige Fehlerszenen, beide Angriffsrichtungen sowie Technical-/Freiwurf-Unterbrechungen absichern.

Risiko einer Umsetzung: Andere Einwurforte verändern Fangpunkt, Vortragswege und verfügbare
Anschlusszeiten. Die räumliche Kontinuität muss zusammen mit der bestehenden Passplanung geprüft
werden. Keine zusätzliche tatsächliche Ortsgenauigkeit behaupten.

Ausgangsverifikation: `deno test scripts/replay-rules_test.js` bestand mit 14 Tests. Die Tests schützten
unter anderem Fortsetzungen und identische Ausball-/Einwurfpositionen, prüfen jedoch nicht
vollständig die zulässige Ortsgruppe. Gerade die bisher verlangte identische Grundlinienposition
muss bei Ausball innerhalb der verlängerten Zone fachlich präzisiert werden.
Die Ausgangsuntersuchung verwendete Zustände und kompilierte Positionsframes.

## Umsetzung und gezielte Verifikation

`js/replay-inbounds.js` ordnet Fortsetzungsgründe expliziten Ortsgruppen zu und berechnet daraus
zulässige Grenzpositionen. `planGameStates` erhält den Ursprung über technische Strafen,
Freiwurfserien, Auszeiten und Wechsel. Der kompilierte Einwurf speichert Herkunft, Ortsgruppe,
Privilegien und erlaubte Passrichtung. Alle Einwürfe erhalten einen freien Ballflug zum Empfänger.
Ausballpunkt und Einwerferposition werden getrennt geführt; Teamrebound-Ausballflüge bleiben erhalten.

Die oben aufgeführten Treffer-/Perioden-, Ausball-, Foul-, Verstoß-, Technical- und
Freiwurf-Fortsetzungen sind berücksichtigt. Gewöhnliche Fouls/Turnover verwenden ihren Ereignisort;
Freiwurflinienfälle und NBA-/WNBA-Mittellinienfälle erhalten eigene Orte. Einwurfverstöße und
Kickball während eines Einwurfs erhalten den ursprünglichen Kontext und die jeweils verbleibenden
Privilegien; ein fester Grundlinieneinwurf liegt außerhalb der verlängerten Zone.
Nach einem Einwurfverstoß an einer zuvor vorverlegten Stelle bleibt deren physischer Ort erhalten;
eine spätere Auszeit des Gegners prüft dessen neu entstandenes Einwurfrecht separat.

Eine berechtigte späte Auszeit wählt schematisch die 28-Fuß-Markierung, sofern kein anschließender
belegter Rückfeldwurf dagegen spricht. Das ist als `schematic-choice` gekennzeichnet. Ein
unmittelbarer Rückfeld-Rebound/-Steal ohne aufgezeichneten Zeitfortschritt kann die Berechtigung
stützen. Nach bereits erfolgtem Vortragen genügt die erste Live-Auszeit nicht; eine zweite
belastete Auszeit ohne Fortsetzung kann die Option eröffnen. Neutrale Auszeiten und Challenges
ohne Beleg einer belasteten Auszeit lösen keine ergänzte Vorverlegung aus. Ob tatsächlich eine
bestimmte Option gewählt oder noch im selben Uhrintervall gedribbelt wurde, ist ohne weitere
Daten nicht rekonstruierbar; die ursprüngliche zulässige Fortsetzung bleibt die Alternative.

Zusätzlich wurden tatsächliche CDN-Schreibweisen anhand ihrer Nachbarereignisse geprüft:
`3-second-violation` (`0012600017:134`), `8-second-violation` (`0012600066:508`),
`5-second-violation` (`0012600033:483`) und `LaneViolation` (`1042600307:270`). Die Originalnamen
bleiben unverändert. Explizite Varianten wie `discontinued dribble`, `offensive-kicked-ball` und
`basket-from-below` erreichen dieselben fachlichen Ortsgruppen. Team-Fünf-Sekunden-Turnover vor
einem ausstehenden Einwurf erzeugen keinen erfundenen Live-Aufbau, auch wenn die Feed-Uhr abweicht.
Ein aufgezeichneter Lane-Turnover bestimmt den Besitzverlust; bei gewöhnlichen Violation-Einträgen
werden verbleibende Freiwürfe und die Seite des Verstoßes berücksichtigt. Double-Lane-Einträge
erzeugen keinen zusätzlichen Einwurf vor dem aufgezeichneten Sprungball.

Regressionstests prüfen Ortsgruppen in beiden Ligen und Richtungen, Live-/Einwurf-Kicks,
erhaltene Orte über Strafen und Auszeiten, Freiwurfverstöße, späte Vorverlegung einschließlich
Gegenbeispielen, Passrichtung, Uhr, Seeking und unveränderte Quellen. Die sechs ursprünglichen
Realspielszenen sowie die vier CDN-Fundstellen sind explizit geschützt. Die Replay-Validierung
prüft die tatsächlichen Einwerferpositionen und ersten Fänge zusätzlich zur Fortsetzungsart.

Chrome MCP am vorhandenen lokalen Server: DEN–OKC Aktion 132 mit Einwurf an der oberen
Seitenlinie des Ausballs und GSV–ATL Aktion 57 mit Grundlinieneinwerfer außerhalb der verlängerten
Zone sowie SEA–GSV `1022600311`, Aktion 546 mit vorverlegtem Einwurf an der 28-Fuß-Markierung
visuell geprüft. Diese Stichproben sind keine umfassende visuelle Abnahme aller Anschlusswege.

Abschlussprüfung: `deno task test` bestand mit 186 Tests, ohne Fehler.
`deno task audit --limit=4` prüfte acht über die verfügbaren NBA-/WNBA-Spielpläne verteilte
Spiele mit insgesamt 76.032 Frames; alle acht bestanden ohne Validierungsfehler.
`git diff --check` bestand. Kein Service Worker ist registriert; daher kein Versionsbump.
Keine neuen Abhängigkeiten, Endpunkte oder Änderungen an aufgezeichneten Ereignissen.

Der anschließend gemeldete Dribbelregressionsfall MIL–UTA `0022600172`, Aktion 19 (Replay 0:41 ff.),
betraf den Zustandsübergang nach dem Einwurffang: Der neue Ballflug hatte `dribble` deaktiviert,
der Fang setzte nur den Besitzer. Der anschließende Live-Vortrag aktiviert das Dribbeln nun wieder.
Ein lokaler Regressionstest schützt Ballflug und bewegten Empfänger in beiden Ligen/Richtungen;
ein Realspieltest schützt die gemeldete Szene und Seeking. `deno task test:local`: 113 bestanden;
gezielter Realspieltest: bestanden. Chrome MCP nach Neuladen: 0:41–0:45 mit aktivem Dribbeln und
wechselnder dargestellter Ballhöhe geprüft.
