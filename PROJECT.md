# Hoops Replay — Zielbild und Projektkonzept

Diese Datei beschreibt das gültige Produkt- und Entwicklungskonzept. Sie ist der gemeinsame
Ausgangspunkt für jede Weiterentwicklung, kein Entwicklungsprotokoll. Zielbild und vorhandene
Implementierung sind ausdrücklich getrennt: Eine Anforderung in dieser Datei ist kein Nachweis,
dass sie bereits umgesetzt oder geprüft ist.

## Orientierung und Pflege

- Der [Northstar im Kopf von js/replay-engine.js](js/replay-engine.js) beschreibt das dauerhafte
  übergeordnete Ziel. Diese Datei konkretisiert Produkt, Verantwortlichkeiten und Bewertungsverfahren.
- [AGENTS.md](AGENTS.md) enthält die verbindlichen Arbeitsregeln.
- [README.md](README.md) beschreibt Nutzung, lokale Ausführung und Prüfkommandos.
- Code, vorhandene Prüfungen und Server-Batchberichte belegen den Implementierungsstand.
  Git hält die Änderungsgeschichte fest.

### Wie diese Datei gepflegt wird

1. Vor fachlichen Änderungen das Zielbild und den betroffenen Implementierungsstand lesen.
   Die konkrete Entwicklung soll erkennen lassen, welchen Teil des Konzepts sie verbessert.
   Das Konzept ist keine pauschale Erlaubnis, bei jedem Auftrag weitere Bereiche umzubauen.
2. Änderungen direkt im zuständigen Abschnitt einarbeiten. Überholte Aussagen ersetzen und
   Widersprüche auflösen; keine datierten Ergänzungen, Sitzungsberichte oder Entscheidungsketten
   anhängen. Es soll genau eine gültige Beschreibung pro Thema geben.
3. Dauerhafte Anforderungen im Zielbild beschreiben. Im Abschnitt zum Implementierungsstand nur
   tatsächlich vorhandenes Verhalten nennen. Geplante Module, Prüfungen und Fähigkeiten niemals
   durch ihre Beschreibung als implementiert ausgeben.
4. Bei einer Umsetzung den betroffenen Status und seine Grenzen im selben Änderungsvorgang
   aktualisieren. Eine Teilumsetzung bleibt als teilweise umgesetzt erkennbar.
   Relevante Module und Tests verlinken, statt flüchtige Testanzahlen, Framezahlen oder Laufzeiten
   abzuschreiben.
5. Technische Details nur bewahren, wenn sie Dateninterpretation, Produktverhalten oder sichere
   Weiterentwicklung erklären. Veraltete Experimente, lokale Rechnerpfade, Browserlauf-Protokolle
   und erledigte Arbeitsaufträge gehören nicht hierher.
6. Gültige Einschränkungen und wichtige Gegenbeispiele erhalten, auch wenn die auslösende
   Fehlergeschichte entfällt. Reproduzierbare Fehlerfälle gehören möglichst in Tests oder Fixtures.
   Ein bestandener Test belegt nur seine konkrete Abdeckung.
7. Eine neue fachliche Erkenntnis kann das Zielbild ändern. Dann die betroffenen Aussagen
   zusammenhängend überarbeiten und gegebenenfalls den Northstar angleichen.
   Zielbild und Implementierungsstand dürfen auseinanderliegen; dieser Abstand muss sichtbar bleiben.
8. Arbeitsplanung und Prioritäten stehen im jeweiligen Auftrag oder Chat. Erkenntnisse aus
   akzeptierten oder verworfenen Experimenten sollen in einem eigenen knappen Learning-Dokument
   festgehalten werden. [Heuristik-Learnings](scripts/docs/heuristic-learnings.md) enthält diese
   Ergebnisse und ihre Grenzen; es ersetzt weder dieses Konzept noch die Git-Historie.

## Produktziel

Hoops Replay macht abgeschlossene NBA- und WNBA-Spiele als schematischen Court Replay erlebbar.
Play-by-Play liefert Ereignisse und Reihenfolge, Boxscore die Spieler und Startaufstellungen.
Verfügbare Wurfkoordinaten verankern Abschlüsse. Dazwischen ergänzt die Anwendung nachvollziehbare
Bewegungen von Spielern und Ball auf einem vollständigen Basketballfeld.

Das Ziel sind regelkonforme, zusammenhängende Ballbesitze: Ball, Angriff und Verteidigung handeln
räumlich und zeitlich abgestimmt. Jede Bewegung erfüllt einen erkennbaren Zweck; freie Positionen
dürfen gehalten werden. Das Erlebnis soll verständlich und unterhaltsam sein.

Es entsteht keine Rekonstruktion aus Tracking-Daten. Die tatsächlichen Positionen und Laufwege
aller zehn Spieler sind unbekannt. Formationen, Matchups und Verbindungspässe bleiben als
schematische Ergänzungen zu verstehen. Es gibt keinen Live-Spielmodus.

### Verbindliche Produktgrenzen

- Belegte Ereignisse, Beteiligte, Spielstände, Uhrzeiten und verfügbare Abschlussorte haben Vorrang.
  Ergänzte Bewegungen erzeugen keine zusätzlichen PbP-Ereignisse, Assists oder Statistiken.
- Das gesamte abgeschlossene Spiel darf vorab analysiert werden. Vorauswissen darf frühere
  Positionierungen beeinflussen; sichtbare Reaktionen dürfen keinen exakten Abprall- oder
  Abfangpunkt vorwegnehmen.
- Konkrete Screens, Pick-and-Roll-, Pick-and-Pop- oder andere feste Spielzugabläufe erfordern
  ausdrückliche Quelldaten. Assist, Wurfort oder ein passender Laufweg reichen dafür nicht aus.
  Ein fehlender Assist beweist keine Isolation, ein Turnover allein keinen Fastbreak.
- Das Replay verdichtet Zeit. Auch bei 1× ist es keine Echtzeitwiedergabe.
  Aufgezeichnete Spieluhrzeiten bleiben verbindliche Anker.
- Vanilla HTML, CSS und JavaScript mit relativen ES-Modulen; keine neuen Dependencies, Frameworks
  oder Build-Schritte. Regeln und Planung müssen ohne Browser prüfbar bleiben.
- Keine zusätzlichen Menüs, Statistikseiten, PWA-Funktionen oder Tracking-Events ohne eigenen Auftrag.
  Die bestehende Lizenz nicht beiläufig ändern.

## Fachliche Referenzen

| Bereich | Grundlage | Verwendung |
| --- | --- | --- |
| Spielregeln | Offizielle NBA-/WNBA-Regelwerke der jeweiligen Liga und Saison | Erlaubte Fortsetzungen und Grenzen ergänzter Bewegungen |
| Taktische Prinzipien | FIBA/WABC Coaches Manuals | Spacing, Transition, Zusammenspiel, Hilfe und defensive Rotation |
| Individuelle Fähigkeiten | USA Basketball und Jr. NBA Curriculum | Freilaufen, Passen/Fangen, Fußarbeit, Abschlüsse und Rebounding |
| Tatsächlicher Spielverlauf | Aufgezeichnete, normalisierte Spieldaten | Ereignisse, Beteiligte, Spielstände, Uhrzeiten und verfügbare Orte |

Einstiegspunkte: [NBA Rules](https://official.nba.com/rulebook/),
[WNBA Rules](https://www.wnba.com/wnba-rule-book),
[WABC Coaching Manuals](https://about.fiba.basketball/en/wabc-documents),
[USA Basketball](https://www.usab.com/coaching-resources-curriculum) und
[Jr. NBA Curriculum](https://jr.nba.com/basketball-practice-plans/all-star/page/3/).
Allgemeine Einstiegslinks ersetzen keinen Nachweis der für eine Partie gültigen Regelversion.

Jede größere Heuristik soll Prinzip, konkrete Quelle beziehungsweise Abschnitt, Anwendungsbedingungen
und passende Tests nachvollziehbar machen. Coaching-Literatur begründet plausible Ergänzungen;
sie beweist keinen tatsächlich gespielten Ablauf. Trainingsübungen und ihre vereinfachten
Spielregeln werden nicht ungeprüft als NBA-/WNBA-Regeln übernommen.

### Fachlicher Abgleich: Ballvortrag und Halbfeldaufbau

Diese erste Zuordnung ist keine vollständige Regelmatrix. Sie trennt Vorschriften von Coaching-Prinzipien
und dokumentiert nur den jeweils benannten Teil der Umsetzung.

| Anforderung / Prinzip | Konkrete Grundlage | Stand und Grenze |
| --- | --- | --- |
| Einwurf von außerhalb; Ball vor eigenem Betreten abgeben | NBA Rule 10, Section III; WNBA 2026 Rule 10, Section III | Einwerfer und Übergabe sind vorhanden; Frist und alle Bedingungen werden nicht systematisch geprüft |
| Kein ergänztes Rückspiel nach kontrolliertem Vorfeldbesitz | NBA Rule 10, Section IX; WNBA 2026 Rule 10, Section IX | Der neue Outlet-Zweig gilt nur für eigene-Hälfte-Rebounds und bleibt bis zum Fang dort; kein allgemeiner Besitz-/Rückspielautomat |
| Begrenzte Zeit in der eigenen Hälfte | NBA Rule 10, Section VIII; WNBA 2026 Rule 10, Section VIII | Ereignisuhren sind Anker; eine vollständige Acht-Sekunden-Prüfung fehlt |
| Seitlicher Outlet und bewegter Fang | WABC Level 1, Team 2.3.1, „Basic Fast Break – Starting the Break“ | Bei ununterbrochenen Defensivrebound-Aufbauten ohne Zeitdruck werden seitliche Empfangspunkte und ein Fang in Bewegung geplant; keine Rekonstruktion des tatsächlichen Passes |
| Mitspieler laufen früh in breite Bahnen | WABC Level 1, Team 2.3.2, „Basic Fast Break – Running Wide Lanes“ | Bestehende Vorlaufphasen und breite Flügelbahnen sind vorhanden; die Bahnwahl und Pass-voraus-Entscheidung sind noch kein vollständig quellenbasiertes Modell |
| Raum für Ball und nächste Aktion schaffen | WABC Level 1, Team 2.1.1, „Basic Floor Spacing – Pass and Cut / Give and Go“ | Kurze Passgeber-Freiläufe vergleichen auch diagonale Vorwärtsoptionen mit Laufwegprüfung; kein vollständiges Pass-and-Cut-/Give-and-Go-Modell und keine Übernahme der Trainingsformation als tatsächlich gespieltes Set |
| Aufenthalte in der Zone regelabhängig begrenzen | NBA Rule 10, Sections VI–VII; WNBA 2026 Rule 10, Sections VI–VII | Offensive Wartepositionen außerhalb der Zone; Diagnose der offensiven Wurfvorbereitung. Vollständige Ausnahmen und defensive Bedingungen offen |

Quellen: [NBA Rule 10](https://official.nba.com/rule-no-10-violations-and-penalties/),
[WNBA-Regelwerk 2026](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf),
[WABC Level 1 Coaches Manual](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf).
Die angeführten WABC-Prinzipien begründen schematische Entscheidungen, keine zusätzlichen Ereignisse
oder aus dem Training übernommene NBA-/WNBA-Regeln. Drucksituationen, vollständige Fußarbeit und
sämtliche Fortsetzungsfälle sind damit nicht abgedeckt.

## Architektur im Zielbild

Die Verarbeitung folgt klaren Verantwortlichkeiten. Diese Aufteilung ist das Ziel; die unten
genannten zusätzlichen Module sind noch nicht angelegt.

| Baustein | Aufgabe | Grenze |
| --- | --- | --- |
| Daten | Laden, normalisieren, Herkunft und Korrekturen erhalten | Keine Choreografie aus ungeprüften Feed-Feldern ableiten |
| Ereignisse | Reihenfolge auflösen und zusammengehörige Ereignisse verknüpfen | Originalereignisse und ihre Identität erhalten |
| Regeln | Spielzustand und erlaubte Fortsetzung bestimmen | Keine Laufwege oder Posen auswählen |
| Choreografie | Einen plausiblen Ablauf innerhalb der Vorgaben planen | Keine Regeln, Rulings oder Ergebnisse überschreiben |
| Bewegung | Aufträge in erreichbare Wege, Ballflüge und Posen übersetzen | Keinen eigenständigen fachlichen Besitzwechsel entscheiden |
| Darstellung | Den kompilierten Zustand zum Zeitpunkt X zeichnen | Keine Spielregeln oder taktischen Entscheidungen ausführen |
| Analyse | Korrektheit prüfen, Entscheidungen erklären und Qualität vergleichen | Messungen nicht mit vollständiger Basketball-Plausibilität gleichsetzen |

`replay-engine.js` soll diese Verarbeitung koordinieren und die gemeinsame Timeline bereitstellen.
Ereignisverknüpfung kann in `replay-events.js`, Regelzustand in `replay-rules.js` und heuristische
Planung in `replay-planner.js` liegen. `replay-data.js`, `replay-shots.js`,
`replay-motion.js` und die Darstellung bleiben fachlich klar zugeordnet.
Wenige verständliche Module und explizite Datenübergaben haben Vorrang vor einem allgemeinen
Plugin- oder Regelframework. Die Dateien werden bei passenden Entwicklungen schrittweise abgegrenzt.

### Spielzustand und Darstellungszustand

Der Spielzustand umfasst Periode, Spieluhr, Spielstand, aktive Aufstellung, live/toten Ball,
ballberechtigtes Team, ausstehende Strafen/Freiwürfe und die vorgesehene Fortsetzung.
Er muss auch den unterbrochenen Zustand über zusätzliche Strafen hinweg ausdrücken können.

Der Darstellungszustand umfasst Spielerpositionen, Posen, momentanen Ballhalter, Ballposition,
Laufwege und visuelle Marker. Ballberechtigung und sichtbarer Ballhalter sind unterschiedliche
Sachverhalte: Ein Team kann einwerfen müssen, obwohl noch niemand einen spielbaren Ball hält.

Alle Entscheidungen werden deterministisch vorkompiliert. Wiedergabe, Pause,
Geschwindigkeitswechsel und Seeking verwenden dieselbe Replay-Zeitbasis. Die Spieluhr ist davon
getrennt abgebildet; Unterbrechungsanimationen dürfen keine zusätzliche Live-Spielzeit erzeugen.

## Regelmodell im Zielbild

Die Regelabdeckung berücksichtigt das gesamte Regelwerk systematisch. Jede Vorschrift wird
einer Verantwortung zugeordnet; eine nicht modellierte Vorschrift verschwindet nicht stillschweigend.

| Kategorie | Umsetzung im Konzept |
| --- | --- |
| Zustandsübergang | Fortsetzung, Besitz, Strafen, Einwurf und erlaubte nächste Aktion bestimmen |
| Bewegungsbedingung | Ergänzte Positionen und Wege begrenzen und über ihren Verlauf prüfen |
| Aufgezeichnete Entscheidung | Ruling aus dem Feed übernehmen und seine Folgen darstellen |
| Außerhalb der Darstellung oder nicht prüfbar | Begründung, Annahme und verbleibende Unsicherheit ausdrücklich festhalten |

Eine Regelmatrix soll Quelle/Version, Anwendungsbedingungen, zuständigen Baustein, Umsetzungsstatus,
Tests und bekannte Grenzen verbinden. Statuswerte unterscheiden offen, teilweise umgesetzt,
abgedeckt sowie begründet nicht relevant beziehungsweise nicht prüfbar. Ein einzelner erfolgreicher
Beispielfall rechtfertigt keine vollständige Freigabe einer Regelfamilie.

### Fortsetzungen und zusammengehörige Ereignisse

Die Regelentscheidung verarbeitet bisherigen Spielzustand und verknüpfte Ereignisse.
Sie beschreibt beispielsweise: Treffer zählt, Ball ist tot, ein Zusatzfreiwurf steht aus,
danach ist je nach Ergebnis ein Live-Rebound oder Einwurf möglich.
Freiwurfserien, technische Zusatzstrafen, erhaltenes Angriffsrecht und Unterbrechungen müssen
zusammenhängend behandelt werden. Unzureichende oder widersprüchliche Belege bleiben erkennbar.

Wir entscheiden tatsächliche Fouls oder Video-Reviews nicht selbst neu. Feed-Entscheidungen
und ihre Folgen sind maßgeblich; auch Bonusfreiwürfe oder Platzverweise werden nicht aus
erfundenen Kontakten abgeleitet.

### Grenzen ergänzter Bewegungen

Ein formal korrekt wiedergegebenes Ereignis genügt nicht, wenn der Weg dorthin neue Verstöße
erzeugt. Der Planer muss solche Abläufe vermeiden; die Prüfung muss sie unabhängig erkennen können.
Dazu gehören unter anderem Zonenaufenthalte, Feldgrenzen, Rückspiel sowie Bedingungen bei
Einwürfen und Freiwürfen, jeweils nach dem anwendbaren Regelwerk.

Zeitabhängige Bedingungen werden in abgebildeter Spielzeit geprüft, einschließlich Live-/Dead-Ball-
Status und regelabhängiger Ausnahmen. Offensive und defensive Drei-Sekunden-Regeln dürfen nicht
zu einem pauschalen Zonentimer zusammenfallen. Ein späterer Abschluss ist kein Grund, einen
Spieler während der ganzen Vorbereitung in der Zone zu parken.

Bei einem durch die Choreografie erzeugten Problem wird der Plan geändert, kein zusätzlicher
Pfiff oder Statistikwert erfunden. Die Prüfung darf nicht präziser erscheinen als die Darstellung:
Ohne einzelne Füße, Schritte und Hände lässt sich beispielsweise Traveling nicht vollständig
geometrisch beurteilen. Verbleibende Grenzen werden ausdrücklich dokumentiert.

## Choreografie im Zielbild

Der Planer verbindet wiederverwendbare Fähigkeiten: einwerfen, vortragen, passen, fangen,
freilaufen, Position halten, zum Korb ziehen, abschließen, helfen, zurückkehren und rebounden.
Er plant das Zusammenspiel beider Teams aus bisherigen Positionen, verfügbarem Zeitfenster
und belegten Ereignissen.

- Herkunft des Ballbesitzes und Unterbrechungen bestimmen, ob Transition, zweite Chance oder
  geordneter Aufbau plausibel ist.
- Abschlussorte werden rechtzeitig erreicht, ohne den nächsten Schützen dauerhaft dort abzustellen.
  Rollen helfen bei der Verteilung; aufgezeichnete Beteiligung und Außenwürfe haben Vorrang.
- Pässe treffen erreichbare Empfänger. Mitspieler schaffen Raum für Drives und Passlinien;
  freie Spieler müssen nicht nach jedem Pass weiterlaufen.
- Defensive Zuordnungen, Ballorientierung, Korbschutz, Hilfe und Rückkehr werden gemeinsam geplant.
  Die Defense kopiert nicht nur den Lauf ihres Gegenspielers mit konstantem Abstand.
- Wege bleiben einfach, mit plausibler Beschleunigung und Bremsen. Geplante Abstände, ein
  Ausweichweg oder ein späterer Start sind wiederholtem Hin-und-her-Korrigieren vorzuziehen.
- Bei wenig Zeit oder schwachen Belegen wird der Ablauf einfacher, statt zusätzliche Aktionen
  in das Fenster zu zwingen.

Der Planer kann wenige Alternativen vergleichen. Regelwidrige und zeitlich unmögliche Kandidaten
scheiden vor der Qualitätsbewertung aus. Erst danach entscheiden Kontinuität, Wege, Spacing,
freie Passlinien und vermeidbare Bewegung. Ein besserer Qualitätswert darf keinen Regelverstoß
oder Verlust eines belegten Ereignisses ausgleichen.

Wichtige Entscheidungen sollen erklärbar bleiben: verwendete Belege, gewählte Fortsetzung,
Alternativen und Gründe für Auswahl oder Ablehnung.

## Bewertung und Weiterentwicklung im Zielbild

Als Vorbild dient der Verbesserungsprozess der
[Poker-Bots](https://github.com/Tehes/poker/blob/master/scripts/docs/bot-tuning-playbook.md):
Literatur beziehungsweise Regelgrundlage, konkrete Hypothese, fokussierte Änderung,
Vergleich gegen einen akzeptierten Stand und nachvollziehbares Learning.
Ein allgemeines Modell für eine gemeinsame Ursache hat Vorrang vor Ausnahmen für einzelne
Spieler, Spiele oder Szenen.

### Spielauswahl und Vergleichsdaten

Reale NBA-/WNBA-Spiele werden über den Schedule ausgewählt und mit Boxscore und Play-by-Play
vom bestehenden Backend geladen. Nur die Demo ohne GameID liegt als Spiel-JSON im Repository.
Ein wachsender lokaler Vollspiel- oder Rohdatenbestand ist nicht Teil des Entwicklungsverfahrens.

Eine Iteration vergleicht Ausgangsstand und Kandidat auf denselben einmal geladenen Eingaben.
Serverantworten dürfen dafür im Arbeitsspeicher wiederverwendet werden; die Engine erhält jeweils
unabhängige Kopien. GameIDs und Datenfingerabdrücke machen die Eingaben im Bericht erkennbar.
Gleiche IDs allein garantieren bei späteren Abrufen keine gleichen Daten, da Feeds korrigiert werden können.
Ein Fingerabdruck erkennt Unterschiede, ersetzt aber kein Archiv zur späteren Rekonstruktion.

Breite Spielauswertungen bilden den üblichen Verbesserungsprozess nach dem Poker-Vorbild.
Gezielte Ereignisfolgen und systematische Varianten können konkrete Regel- oder Planungsfehler
untersuchen, sind aber keine Voraussetzung für jede Iteration und kein eigener Ausbauauftrag.
NBA und WNBA werden getrennt gekennzeichnet, soweit ihre Regeln voneinander abweichen.

### Maßstab für Verbesserungen

1. **Korrektheit:** Belegte Ereignisse, Regelübergänge, Aufstellungen, Ballzustände und Seeking stimmen.
   Neue harte Fehler sind keine akzeptable Gegenleistung für bessere Bewegungen.
2. **Kontextabhängige Bewegungsqualität:** Erreichbare Fangpunkte, machbare Geschwindigkeit,
   räumliche Kontinuität, sinnvolle Abstände, freie Korridore sowie wenige unnötige Umwege und
   Richtungswechsel. Nähe beim Rebound ist anders zu bewerten als im normalen Aufbau.
3. **Visuelle Basketball-Plausibilität:** Eine kleine A/B-Auswahl prüft, ob die automatischen
   Kriterien das gewünschte Verhalten erfassen. Hier fließt zunächst die Einschätzung des Nutzers ein.

Die Baseline ist der letzte akzeptierte Stand, kein perfektes Vorbild. Vergleiche verwenden
dieselben Eingaben und stabile Kriterien; Änderungen an der Messung müssen separat erkennbar sein.
Ein einzelner Gesamtscore genügt nicht.

### Iterationsprinzip

Eine Iteration benennt Zielursache, Hypothese, betroffenen Hebel und geschützte Vergleichsfälle.
Der Prüfumfang folgt der Hypothese; breite Spielauswertungen sind der Ausgangspunkt.
Der Bericht unterscheidet Datenfehler, Regelfehler und Bewegungsauffälligkeiten, nennt die tatsächliche Abdeckung und macht Beispiele
über Spiel-/Ereignis-ID auffindbar.

Die visuelle Auswahl enthält typische, verbesserte und verschlechterte Fälle sowie feste
Vergleichsszenen; gleicher Abspielmaßstab und gleiche Ereignisanker erleichtern den A/B-Vergleich.
Automatische Diagnose entlastet die visuelle Prüfung, ersetzt sie aber nicht vollständig.

Akzeptiert wird eine Änderung, wenn die Zielursache plausibel verbessert ist, die verbindlichen
Prüfungen bestehen und verwandte Fälle nicht wesentlich schlechter werden. Ein Ergebnis darf auch
verworfen werden. Ein Learning hält knapp Hypothese, Hebel, Evidenz, Entscheidung und Bedingungen
für einen erneuten Versuch fest. Es soll Wiederholungen falsifizierter Ansätze verhindern.

## Vorhandene Implementierung

Dieser Abschnitt beschreibt den Codebestand, nicht die vollständige Umsetzung der vorstehenden Ziele.

### Statusübersicht

| Konzeptbereich | Tatsächlicher Stand | Fehlender Teil des Zielbilds |
| --- | --- | --- |
| Daten und Quellen | Gemeinsame Normalisierung, Backend-Laden und Schedule-Auswahl für Batchläufe vorhanden; nur Demo lokal | Kein Adapter für beliebige andere Feed-Formate |
| Ereignisverknüpfung | Blocks/Steals, Auswechslungen, Rebounds und And-one-Zuordnung vorhanden | Keine umfassende Auflösung aller verschachtelten Strafen |
| Spielregeln | Fallbezogene Fortsetzungen innerhalb der Engine vorhanden | Keine vollständige Regelmatrix und kein separates allgemeines Regelmodell |
| Zustände und Module | Browserfreie Kompilierung, getrennte Wurf-/Bewegungsmodule vorhanden | Fachlicher Zustand und Animation noch im Compilerzustand vermischt; Zielaufteilung nicht umgesetzt |
| Choreografie | Kontext, Formationsplanung, Passauswahl und defensive Reaktionen vorhanden | Kein vollständig aus Coaching-Referenzen abgeleitetes Heuristiksystem |
| Zeitabhängige Regeln | Spieluhrabstände steuern die Vorbereitung; offensive Zonenaufenthalte im Aufbau werden diagnostiziert | Keine vollständige offensive/defensive Drei-Sekunden-Prüfung oder Shot-clock-Logik |
| Batch-Auswertung | Schedule-basierter Server-Audit und bestehende Einzelprüfungen mit Serverdaten vorhanden | Kein automatischer Baseline-/Kandidatenvergleich mit kontextabhängiger Qualitätsbewertung |
| Diagnose und Lernen | Einzelne Planungsmetadaten und teilbare Szenen vorhanden | Kein umfassendes Entscheidungsprotokoll, A/B-Verfahren oder separates Learning-Dokument |

Die neue Regelmatrix, zusätzliche Architekturmodule, vollständige Regelprüfung und systematische
Baseline-/Learning-Infrastruktur sind Konzept, keine durch diese Dokumentation implementierten Funktionen.
Bestehende Heuristiken und Tests sind eine Grundlage dafür, kein Nachweis vollständiger Abdeckung.

### Aktuelle Module

| Datei | Aktuelle Verantwortung |
| --- | --- |
| [js/app.js](js/app.js) | Laden und Freigabe, Canvas, Darstellung, Playback, Controls und Resize |
| [js/replay-data.js](js/replay-data.js) | Backend-Abruf und gemeinsame Feed-Normalisierung |
| [js/replay-engine.js](js/replay-engine.js) | Szenen, Lineups, Besitz, Matchups, Vorbereitung, Regelsonderfälle und Timeline |
| [js/replay-motion.js](js/replay-motion.js) | Verbindende Routen, Halten, Reaktionszeiten und Kreuzungsreservierungen |
| [js/replay-shots.js](js/replay-shots.js) | Wurfprofile, Abschlussbewegungen und Ballflug |
| [js/replay-leagues.js](js/replay-leagues.js) | Ligaerkennung, Viertellänge und Dreiergeometrie |
| [js/replay-rules.js](js/replay-rules.js) | Offensive Zonengeometrie und nahe Wartepositionen außerhalb |
| [js/replay-teams.js](js/replay-teams.js) | NBA-/WNBA-Teamdaten, Paletten und lokale Logos |
| [js/replay-colors.js](js/replay-colors.js) | Farbähnlichkeit, Kontrast und Jersey-Auswahl |
| [js/replay-validation.js](js/replay-validation.js) | Gemeinsame Prüfung für Browser und Audit |
| [scripts/replay-source.js](scripts/replay-source.js) | Serverabruf, Schedule-Auswahl und Wiederverwendung im Arbeitsspeicher für CLI-Aufrufer |
| [scripts/check-replay.js](scripts/check-replay.js) | Re-Export der gemeinsamen Prüfung für CLI-Aufrufer |
| [scripts/audit-replays.js](scripts/audit-replays.js) | Auswahl und Auswertung abgeschlossener Server-Spiele mit Fehlerbericht je Verarbeitungsschritt |

`compileReplay(data)` erzeugt Szenen, Keyframes, Marker und Navigationsgrenzen ohne DOM oder Netzwerk.
`getReplayFrame(replay, time)` liefert den Zustand zu einem beliebigen Zeitpunkt.
Die aktuelle Engine bündelt mehrere Verantwortlichkeiten des Zielbilds; die zusätzlichen Dateien
`replay-events.js` und `replay-planner.js` existieren noch nicht. `replay-rules.js` enthält bislang
nur Zonengeometrie, keinen allgemeinen Regelzustand.

### Aktuelle Ereignis- und Bewegungsbehandlung

- Szenen werden nach `orderNumber` gebildet. Zugehörige Blocks/Würfe, Steals/Turnover und
  Offensivfouls/Turnover werden gemeinsam behandelt; zeitgleiche Auswechslungen zusammengefasst.
- Innerhalb einer zusammenhängenden Gruppe mit identischer Periode und identischem `clock`
  können widersprechende Auswechslungen anhand der aktiven Beteiligten kausal angeordnet werden.
  Übrige Spielereignisse und Wechselgruppen behalten ihre relative Reihenfolge.
  Widersprüchliche Abhängigkeiten lassen die ursprüngliche Gruppe unverändert; es wird nicht über
  Uhr- oder Periodengrenzen umgeordnet. Originalfelder und Rohdaten bleiben erhalten.
- Sprungbälle verwenden genannte Springer und Fänger. Fehlende Springer werden aus der aktiven
  Aufstellung ergänzt: bevorzugt Spieler mit C-Position, andernfalls der aktuelle C-Slot.
  Fehlt nur ein Springer, bestimmt der genannte Gegner die Teamzuordnung. Ein fehlender Fänger
  wird als nächstgelegener aktiver Nicht-Springer des belegten Gewinnerteams ergänzt.
  Ergänzungen stehen mit Herkunft in `scene.jumpBallPlan`; Originalereignisse und Statistiken
  bleiben unverändert. Eröffnung, Overtime, `doubleviolation`, `lodgedball` und `challenge`
  verwenden den Mittelkreis. Andere Ereignisse verwenden den zum verfügbaren Ort nächstgelegenen
  Kreis (x 19, 47 oder 75, y 25); ohne Feed-Koordinaten dient die vorherige schematische Ballposition.
  Bei unbekanntem Descriptor ist diese Kreiswahl eine Annahme, keine rekonstruierte Entscheidung.
  Beide Springer stellen sich auf, die übrigen Spieler bleiben vor dem Tipp außerhalb des Kreises.
  Hochwurf, Sprung, Tipp und Fang werden animiert; Aufbauzeit vor dem Tipp verbraucht keine
  zusätzliche Spielzeit. Ein als Fänger genannter Springer erhält vorher einen schematischen
  Bodenkontakt des Balls. Das Ergebnis bleibt beim im Feed belegten Team.
  Grundlage: Rule 6, Sections V–VII in [NBA Rules](https://official.nba.com/rule-no-6-putting-ball-in-play-live-dead-ball/)
  und [WNBA 2026](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf#page=35).
  Die Zuordnung unbekannter Ereignistypen und alle Sonderfolgen sind damit nicht vollständig modelliert.
- Wechselketten verändern zuerst die Slots; animiert wird nur der Unterschied zwischen ursprünglicher
  und endgültiger Aufstellung. Eingewechselte Spieler übernehmen Position und Matchup ihres Vorgängers.
- Formationen entstehen aus bisherigen Positionen und dem nächsten belegten Wurf oder Wurffoul.
  Die Vorausplanung endet vor einem offensiven Wechsel; feste Five-out-/Horns-Schablonen werden nicht
  als reale Sets behauptet. `FALLBACK_SPACING` hilft beim ersten Aufbau.
- Bekannte Foul-, Block- und Steal-Kontakte priorisieren Matchups. Übrige Paare bleiben im Angriff stabil.
  Bei einem Seiteneinwurf nach einem Foul werden Formation und Matchups neu geplant, damit frühere Foulkontakte
  nicht die Zuordnung beim nächsten Angriff nach der Unterbrechung festlegen.
  Die Defense reagiert zusätzlich auf Ball und Korb, hilft und schließt nach Pässen zum Empfänger auf.
- `attackContext` unterscheidet Einwurf, Outlet, Steal, zweite Chance und Fortsetzung. Der PG ist
  der Spieler im ersten Lineup-Slot, keine aus dem Feed bestätigte Ballführerrolle. Alle vier
  Mitspieler laufen beim normalen Vortrag voraus auf ihre Ziele; es gibt keinen festen Big-Man-Trailer.
  Belegte Außenaktionen gehen vor einer schematischen Innenrolle.
  Nach einem ununterbrochenen Defensivrebound in der eigenen Hälfte kann ein anderer Ballführer
  einen seitlichen Outlet erhalten: nahe der verlängerten Freiwurflinie, bei weiterem Rebound weiter
  vorn, weiterhin in der eigenen Hälfte. Die Auswahl prüft drei Empfangspunkte zur näheren Seitenlinie,
  etwas zur Grundlinie und etwas zur Mitte gegen Mitspielerabstände und die aktuelle schematische
  Defense im Passkorridor. Der Empfänger startet zwei Fuß hinter dem Fangpunkt und fängt im Vorlaufen.
  Ist kein Punkt geeignet, bleibt der bisherige Aufbau erhalten. `scene.outletPlan` beschreibt nur die
  ergänzte Verbindung, keinen belegten Assist oder zusätzlichen PbP-Pass.
  Bereits selbst ballführender PG, kurze Transitionen, Unterbrechungen, Steals, Einwürfe und
  Backcourt-Abschlüsse erhalten keinen solchen neuen Outlet. Der PG bleibt eine schematische Slot-Rolle.
- Spätere Empfangswege, bewegte Fänge, kurze Passgeber-Relokationen und passende Folgeempfänger
  werden teilweise vorausgeplant. Passfolgen werden deterministisch verglichen. Ohne geeignete
  Verbindung bleibt eine kurze Dribbelsondierung mit Haltephase möglich; höchstens zwei freie
  Angreifer korrigieren ihr Spacing in der Vorbereitung.
  Nach einem schematischen Pass kann ein freier Passgeber auch kurz diagonal Richtung Korb
  freilaufen. Die Auswahl behält die bestehende Grenze von sechs Fuß und das verfügbare Zeitfenster
  bei. Vier Zwischenpunkte prüfen geplante Mitspielerpositionen, aktuelle Verteidiger und die Zone;
  eine bereits freie Station darf halten. Diese begrenzte Relokation erzeugt keinen zusätzlichen
  Rückpass und ist kein vollständiger Korb-Cut. Verteidiger werden dafür nicht vorausberechnet;
  die Stichproben garantieren keine durchgehende Kollisionsfreiheit der dargestellten Routen.
- Routen werden aus Szenenankern geplant: Gerade, Perimeterbogen oder ein einfacher Ausweichbogen.
  Ein späterer Start kann Kreuzungen entzerren. Wege bleiben beim Seeking unverändert; ruhende
  Spieler werden nicht durch nachträgliche Abstoßung verschoben.
- Wurfarten umfassen Sprungwurf, Layup, Dunk, Hook und Heave mit kombinierbaren Merkmalen wie
  Alley-oop, Tip, Putback, Reverse, Floater, Bank, Running, Driving, Cutting, Pull-up,
  Step-back, Fadeaway und Turnaround. Unbekannte Kombinationen können generisch dargestellt werden.
- Rebounds verwenden `shotActionNumber`; nur bei fehlender/null Referenz ist der unmittelbar
  vorausgehende Wurf ein Fallback. Ungültige explizite Referenzen werden nicht ersetzt.
  Ein freier Offensivrebounder kann während der Vorbereitung eine erreichbare Position 8–12 Fuß
  vom Korb anlaufen. Gerade Wege durch gehaltene Angreiferplätze und belegte Abschluss-/Empfangsorte
  sowie Ziele in der Passlinie werden verworfen; bestehende Innenpositionen dürfen gehalten werden.
  Schütze, Assistent, Ballhalter und vorausgeplanter Folgeempfänger behalten ihre Aufgaben.
  Es gibt keinen erzwungenen Platztausch. Der Aufbau berücksichtigt den nötigen Lauf mit höchstens
  8 Fuß pro Replay-Sekunde; der laufende Rebounder wird nicht zusätzlich als Passoption verwendet.
  Dies folgt dem Positionierungs-/Kontinuitätsprinzip des Northstars, modelliert aber kein belegtes Box-out.
  Erst ab sichtbarem Korb-/Blockausgang führt der Fangweg zum schematischen Abprallort. Seine
  Geschwindigkeit bleibt mit durchgängiger Beschleunigung/Bremsung auf 14 Fuß pro Replay-Sekunde
  begrenzt; bei nötigen längeren Wegen verlängert sich die freie Ballphase, nicht der Wurfflug.
  Das gilt auch, wenn keine freie Vorbereitungsroute vorhanden ist oder der Rebounder am Wurf
  beteiligt war. Dadurch können Aufbau und Abprallphase länger dauern. Die aufgezeichneten
  Ereignisse und Spieluhranker bleiben erhalten; vollständige Kollisionsfreiheit ist nicht zugesichert.
  Blocks dürfen diese Verbindung erhalten; Fouls, Timeouts und Wechsel unterbrechen den Vorlauf.
  Team-Rebounds erfinden keinen individuellen Fänger.
- Steals erhalten einen Zugang zum Ball beziehungsweise zu einer plausiblen Passlinie; Besitz
  wechselt beim Fang. Fehlpässe ins Aus fliegen knapp an einem aktiven Mitspieler vorbei über
  die Außenlinie. Der Abstand zur Empfangshand wird an der Fluggeraden berechnet;
  zu nahe Empfänger und Flugrichtungen, die vor der Empfangsstation ins Aus führen, scheiden aus.
  Empfänger, Passweg und Abprallorte sind schematisch.
- Timeouts einschließlich Challenges und Periodenenden führen beide Teams schematisch an den
  Rand. Wechsel während der Unterbrechung bleiben erhalten; die aktuelle Aufstellung kehrt vor
  der nächsten Spielaktion zurück. Nach Spielende bleiben die Teams außerhalb.

### Vorhandene Regelsonderfälle und ihre Grenzen

| Fall | Aktuelle Behandlung |
| --- | --- |
| Treffer und folgendes gewöhnliches Live-Foul | Gegnerischer Grundlinieneinwurf vor dem neuen Aufbau; dessen Fortschritt hängt vom Spieluhrabstand ab |
| Persönliches Foul ohne Descriptor | Schematisch am Ball; der Gefoulte erhält den Ball vor dem Kontakt gegebenenfalls durch einen ergänzten Pass. Keine Aussage über den tatsächlichen Ballbesitzer |
| Persönliches Foul mit `off-the-ball` | Kein pauschaler Balltransfer an den Gefoulten; Loose-ball- und technische Fouls behalten ihre Sonderbehandlung |
| Wurffoul | Zwei-/Dreipunktbereich aus Qualifiers oder folgender regulärer Freiwurfserie; schematische Annahme vor dem Kontakt |
| And-one | Gleiche Periode/Uhr, passender Schütze und gegnerisches Wurffoul verknüpfen Treffer und Kontakt; kein zweiter Aufbau oder Gegner-Einwurf |
| Reguläre Freiwürfe | Zwischenwurf und letzter Wurf unterschieden; nach letztem Fehlwurf kann ein Live-Rebound folgen |
| Technischer Freiwurf | Vorheriger Team-Ballbesitz und Positionen werden grundsätzlich wiederhergestellt; keine normale Rebound-Vorabplanung |
| Technisches Foul gegen Person außerhalb des Rosters | Bei bekanntem Team als Teamereignis ohne erfundenen Court-Spieler erhalten |
| Freiwurf mit Descriptor `flagrant` | Nach Ende der Serie unabhängig vom Ergebnis Seiteneinwurf des gefoulten Teams an der verlängerten Freiwurflinie; Team-Rebound überschreibt den Ort nicht |
| Weitere Ereignisse | Spezifische Zweige unter anderem für Charge, Loose-ball, Traveling, Shot-clock, Aus, Lost-ball, offensives Goaltending und Kicked Ball |

Diese Zweige sind keine vollständige Regelabdeckung. Insbesondere sind Fortsetzungen nach
verschachtelten technischen Strafen und alle Sonderfoul-Kombinationen nicht umfassend modelliert.
Freiwurfaufstellung, Lane Violations/Wiederholungen, Clear Path, Transition Take, Away-from-play,
Doppelfouls, defensive Goaltending-Folgen, Einwurfvorverlegung und geänderte Review-Entscheidungen
dürfen ohne gezielte Prüfung nicht als vollständig umgesetzt gelten.
Eine Challenge-Darstellung allein modelliert noch nicht die Folgen einer geänderten Entscheidung.

Der Shot-clock-Rückblick verlängert die Vorbereitung vor einem aufgezeichneten Verstoß.
Er berechnet keine durchgängige Restuhr mit allen 24-/14-Sekunden-Resets.
Offensive Wartepositionen im Halbfeld liegen außerhalb der Zone. Bei längerer Vorbereitung warten
auch spätere Innenschützen zunächst außerhalb; ihre eigentliche Anspiel-/Abschlussposition bleibt
erhalten. Kurze Zuspiele in die Zone, Abschlüsse und direkte zweite Chancen bleiben möglich.
Spieler, die nach einem Rebound innen stehen, können sich auf kurzem Weg aus der Zone lösen.
Auch bei übernommenen Positionen in einem fortgesetzten Aufbau wird eine Innenposition durch
den nächstgelegenen Wartepunkt außerhalb ersetzt. Dafür muss keine zusätzliche Wartephase übrig
sein. Begrenzte Positionskorrekturen werden an ihrem tatsächlich verwendeten Endpunkt beurteilt;
ein freier, weiter entfernter Zielpunkt allein genügt nicht. Die Erhaltungsprüfung erlaubt bei
übernommenen Positionen genau dieses kurze Freimachen, keine beliebige Neuaufstellung.
Zwischenstationen des längeren Live-Aufbaus liegen ebenfalls außerhalb der Zone. Innen stehende
Mitspieler lösen sich zunächst nach außen, während der Rebounder den gesicherten Ball behält.
Für einen vorbereitenden Lauf zum nächsten Abschluss wird die vom aktuellen Standort nähere
Außenseite gewählt; die eigentliche Anspiel- und Abschlussposition bleibt erhalten.

`checkReplay()` meldet `offensiveLaneStays` als Prüfkandidaten, nicht als Fehler oder Pfiffe:
In den bereits vorhandenen Abtastungen alle 0,2 Replay-Sekunden wird ab bekannter Ballkontrolle
im Vorfeld die abgebildete Spielzeit je Angreifer innerhalb der Zone summiert. Die Diagnose gilt
nur innerhalb einer Wurfszene vor deren Abschlussbewegung; Tip-ins, Putbacks und Backcourt-Szenen
sind ausgenommen. Sie läuft nicht über Szenengrenzen und erfasst keine vollständige Regelkonformität.
Körpermittelpunkte ersetzen keine Füße; unmittelbares Verlassen, Schussbewegungen und gegnerische
Ballberührungen sind nicht vollständig als Regelausnahmen modelliert. Deshalb bleiben auch
Bewegungsfälle über drei Sekunden sichtbar und müssen beurteilt werden. Defensive drei Sekunden
werden weiterhin nicht geprüft. Grundlage: NBA/WNBA Rule 10, Section VI.

### Zeit und Geometrie

- Court-Koordinaten: 94 × 50 Fuß, Körbe bei x 5,25/88,75 und y 25.
  Reguläre Feed-Koordinaten werden mit x × 0,94 und y × 0,5 umgerechnet.
  Die Canvas-Welt umfasst 110 × 65 mit Court-Versatz (8,9).
- Die erste Feldwurfaktion mit gültigem `side` belegt die Richtung; das andere Team greift
  entgegengesetzt an, zur Halbzeit wird gewechselt. Verlängerungen behalten die zweite Halbzeit.
  Ohne Seitenbeleg dient Heimteam vor der Halbzeit nach rechts als schematischer Fallback.
- NBA-Viertel verwenden 720, WNBA-Viertel 600, Verlängerungen 300 Sekunden.
  Dreierlinien berücksichtigen Ligageometrie und gerade Ecklinien.
- `scene.liveSeconds` ist der Abstand aufgezeichneter Ereignisse, nicht automatisch eine
  vollständige Ballbesitzdauer. Normale Vorbereitungsbudgets verwenden grundsätzlich 50 Prozent
  bis zwölf Replay-Sekunden; markierter Shot-clock-Druck 85 Prozent bis 24 Replay-Sekunden.
  Abschlussreserven und notwendige Wege können eine Szene verlängern.
- Einwurf und Rückkehr liegen bei stehender Uhr vor `liveAt`; die Uhr erreicht am `eventAt`
  den aufgezeichneten Wert. Ballflüge und Abschlussphasen behalten eigene Dauern.
- Wegabhängige Dauer und Geschwindigkeitsgrenzen gelten nur für die jeweiligen markierten
  Bewegungsabschnitte, nicht pauschal für jede Pose, jeden Freiwurf oder Kontakt.
  Es gibt keine garantierte Kollisionsfreiheit aller zehn Spieler.
- Szenenzeiten werden auf Millisekunden gerundet. Die Timeline behält `step="0.001"`,
  damit Endpunkte und Fangmomente exakt angesprungen werden können.

## Datenvertrag und Integration

### Laden und Wiederverwenden

Öffentliche Anwendung: [Hoops Replay](https://tehes.github.io/hoops-replay/).
Ohne GameID wird der lokale DEN–OKC-Snapshot `0022600007` geladen.
Jede explizite zehnstellige `?game=GAME_ID` lädt Boxscore und Play-by-Play vom bestehenden Backend
`https://nba-spielplan.tehes.deno.net`. Es gibt keine lokalen Ersatzspiele bei Fehlern.
IDs mit Präfix `10` verwenden WNBA und den Query `?league=wnba`; andere NBA.

Normalisierung, Kompilierung und gemeinsame Prüfung müssen vor Freigabe des Replays erfolgreich sein.
Unfertige Spiele, falsche IDs, HTTP-Fehler und inkonsistente Daten ergeben einen Fehler, kein
stilles Ersatzspiel. Es gibt weder Polling noch automatische Aktualisierung oder lokale Spielspeicherung.

Auch Entwicklungs- und Einzelprüfungen laden reale Spiele vom Server. Der frühere Importer und
seine lokalen Rohdaten, Vollspiel-Snapshots und Szenen-JSONs sind entfernt. Die vorhandenen
Einzelprüfungen bleiben fachlich unverändert; ein benötigter Szenenausschnitt entsteht aus dem
Serverfeed. Wiederholte Abrufe derselben Quelle werden innerhalb des Prozesses im Arbeitsspeicher
wiederverwendet, niemals als Spiel-JSON gespeichert. Kopien schützen die Eingaben vor Szenenänderungen.

Das Backend gehört zu `Tehes/nba-spielplan`; Änderungen daran sind ein eigener Arbeitsbereich.
Die lokale Vorschau verwendet ausdrücklich `http://127.0.0.1:5500` wegen der Backend-CORS-Freigabe.
`localhost` oder andere Ports sind kein gleichwertiger Ersatz. Den Origin-Header nicht im
Browsercode setzen. Ein erfolgreicher CLI-Abruf ersetzt keine Browser-CORS-Freigabe.
Custom-Domain und weitere Spielplan-Integration sind kein eingerichteter Produktbestandteil.

### API-Endpunkte und Auswahl von Game IDs

Maßgebliche Serverlogik:
[Tehes/nba-spielplan: api/main.js](https://github.com/Tehes/nba-spielplan/blob/master/api/main.js).
Basis-URL: `https://nba-spielplan.tehes.deno.net`. Die folgenden Abrufe verwenden `GET`.

| Daten | NBA | WNBA | Relevante Antwortfelder |
| --- | --- | --- | --- |
| Schedule | `/schedule` | `/schedule?league=wnba` | `leagueSchedule.gameDates[].games[]` mit `gameId`, `gameStatus`, `gameDateTimeUTC`, `homeTeam` und `awayTeam` |
| Boxscore | `/boxscore/GAME_ID` | `/boxscore/GAME_ID?league=wnba` | `game.gameId`, `game.gameStatus`, Teams, Spieler und Statistiken |
| Play-by-Play | `/playbyplay/GAME_ID` | `/playbyplay/GAME_ID?league=wnba` | `game.gameId` und `game.actions[]` |

Beispiel-URLs:

- `https://nba-spielplan.tehes.deno.net/schedule`
- `https://nba-spielplan.tehes.deno.net/schedule?league=wnba`
- `https://nba-spielplan.tehes.deno.net/boxscore/0022600007`
- `https://nba-spielplan.tehes.deno.net/playbyplay/0022600007`
- `https://nba-spielplan.tehes.deno.net/boxscore/1042600304?league=wnba`
- `https://nba-spielplan.tehes.deno.net/playbyplay/1042600304?league=wnba`

Der Server wählt die Liga ausschließlich über `league=nba|wnba`; ohne Parameter gilt NBA.
Anders als der Replay-Client leitet er WNBA nicht aus der GameID ab.
`GAME_ID` muss genau zehn Ziffern enthalten und als String mit führenden Nullen erhalten bleiben.

Für den Schedule ist zusätzlich `region=de|us` möglich. Standard ist `de` (Broadcast-Code 14),
`us` verwendet Code 1. `region=none` und unbekannte Werte fallen ebenfalls auf Code 14 zurück;
`none` bedeutet auf diesem Server nicht „ohne Broadcaster“.
Die Region wählt die Broadcast-Variante des Schedules, keine Replay-Liga oder Saison.

Schedule, Boxscore und Play-by-Play werden aus den jeweiligen offiziellen CDN-Feeds durchgereicht.
Der Schedule verweist auf `scheduleLeagueV2_<regionCode>.json`; es gibt in diesen Routen keinen
implementierten Saison-, Datums-, Pagination- oder Mehrfach-GameID-Parameter.
Der verfügbare Saisonstand stammt aus der Upstream-Antwort
(`leagueSchedule.seasonYear`, ersatzweise `meta.seasonYear`).
Ein Abruf ist kein beliebiges historisches Saisonarchiv. Der Batchbericht hält deshalb Quelle,
Saison und ausgewählte IDs fest; je ausgewertetem Spiel kommt ein Datenfingerabdruck hinzu.

Alle drei Routen verlangen bereits serverseitig einen freigegebenen `Origin`; ohne passenden
Header liefert der Server 403. Für CLI-Werkzeuge ist
`Origin: http://127.0.0.1:5500` zu verwenden. Im Browser entsteht der Header aus der tatsächlichen
Seitenherkunft. Ungültige Liga oder GameID liefern 400; Upstream- und Netzwerkfehler müssen
auch bei einer Batch-Auswahl ausdrücklich behandelt werden.

### Schedule-basierte Batch-Auswertung

[scripts/audit-replays.js](scripts/audit-replays.js) verwendet standardmäßig beide Ligen und
höchstens zehn abgeschlossene Spiele je Liga. Die Auswahl dedupliziert gültige String-GameIDs,
sortiert nach Spieldatum und ID und verteilt eine begrenzte Stichprobe gleichmäßig über den
verfügbaren Zeitraum. Sie umfasst bei mehreren gewählten Spielen den ersten und letzten Eintrag;
bei nur einem den letzten. Preseason und Postseason bleiben Teil der Auswahl, sofern der Schedule
sie enthält. Dies ist eine zeitlich gestreute Stichprobe, keine garantierte Abdeckung aller Regeltypen.

`--league=nba|wnba|all` begrenzt die Ligen, `--limit=N` die Auswahl je Liga; `--limit=0` wählt alle
abgeschlossenen Spiele. Explizite zehnstellige GameIDs umgehen die Schedule-Auswahl und das Limit.
Eine explizite Liga muss zu diesen IDs passen. Kommandos stehen in README.md.

Der Ablauf ist Schedule → abgeschlossene GameIDs (`gameStatus === 3`) → Boxscore und Play-by-Play →
Normalisierung → Kompilierung → vorhandene gemeinsame Prüfung. Spiele werden nacheinander
verarbeitet; nur die beiden Detailfeeds eines Spiels werden parallel geladen.

Die JSONL-Ausgabe enthält Auswahlquelle, Saison, Anzahl verfügbarer abgeschlossener Spiele,
ausgewählte IDs, Zeitpunkt, SHA-256-Fingerabdruck der normalisierten Eingaben ohne variable
Erfassungszeit sowie den vorhandenen Auditbericht je Spiel mit Liga. Fehler in Schedule,
Datenabruf/Normalisierung, Kompilierung oder Prüfung werden mit Verarbeitungsschritt protokolliert.
Ein fehlerhaftes Spiel verhindert die Auswertung der übrigen nicht und wird nicht stillschweigend
ersetzt. Die Zusammenfassung nennt gewählte, erfolgreiche und fehlgeschlagene Spiele; bei Fehlern
endet der Lauf mit Exitcode 1. Warnungen laufen getrennt über stderr.

Die bestehende Prüfung wird wiederverwendet, ihre Maßstäbe werden hier nicht erweitert.
Ein bestandener Audit bedeutet weder vollständige Regelkonformität noch visuelle Basketballqualität.
Ein Fehler bei Daten oder Kompilierung ist zunächst eine Diagnose, kein Beweis für einen Feedfehler.

Ein automatischer Baseline-/Kandidatenvergleich auf denselben Speicher-Eingaben, eine vollständige
Regelmatrix und literaturgestützte Qualitätsmessung sind noch nicht implementiert. Einzelne
CLI-Läufe laden erneut vom Server; für spätere Vergleiche müssen Eingabegleichheit und Kriterien
explizit geprüft werden. Der Top-Excitement-Filter des Spielplans wird nicht verwendet.

### Normalisiertes Schema

| Feld | Bedeutung |
| --- | --- |
| `gameId`, optional `league`, `date`, `arena`, `season` | Partie und Metadaten; Liga bei der Demo aus der ID ableitbar |
| `sources` | Quell-URLs und Erfassungsangaben |
| `teams` | Auswärts zuerst, Heimteam danach; ID, Code, Name, Heimstatus, Endstand und Spieler |
| `players` | ID, Name, Nummer, Position, Starterstatus und Minuten |
| `actions` | Übernommene Ereignisfelder einschließlich IDs, Ordnung, Uhr, Typ, Beteiligten und optionaler Orts-/Wurf-/Besitzangaben |

Neue Normalisierung leitet NBA-Saison aus dem Spieldatum und WNBA-Saison aus dem Kalenderjahr ab.
Fünf Starter je Team sind erforderlich. Fehlende oder doppelte Starterpositionen bekommen eindeutige
schematische PG–C-Slots mit `sourcePosition` und `positionSource: "schematic"`.

Wichtige Datenregeln:

- `actionNumber` ist eine Ereignis-ID, keine verlässlich monotone Reihenfolge.
  `orderNumber` bestimmt die Ausgangsordnung. Niemals allgemein nach Ereignis-ID umsortieren.
- Zeitgleiche Ereignisse sind nicht automatisch Duplikate. Begrenzte kausale Wechselkorrekturen
  betreffen den Replay-Plan, nicht die ursprünglichen Feed-Felder.
- Der Feed schreibt `jumpBallRecoverdPersonId` tatsächlich so.
- Feldwürfe brauchen endliche x/y. Nur hinreichend belegte Orte sind Abschlussanker;
  Nullkoordinaten anderer Ereignisarten sind kein Tracking-Nachweis.
- Normalisierung prüft x/y gegen `side` und `shotDistance` mit einem Fuß Toleranz.
  Nur wenn `100 - x` den Widerspruch auflöst, wird x mit erhaltenem `sourceX` und
  `coordinateCorrection: "mirrored-x"` korrigiert. Andernfalls wird abgelehnt.
  Ohne Distanz-/Seitenbeleg wird keine Korrektur geraten; Rohfeeds und y bleiben unverändert.
- Heaves ohne genauen Ort werden aus Distanz und Korbrichtung angenähert.
  Rebounds, Fouls und Freiwurfaufstellungen haben überwiegend abgeleitete Positionen.
- Die Normalisierung verarbeitet den modernen liveData-artigen Feed. Legacy-/Stats-Feeds
  besitzen keinen Adapter und dürfen nicht ungeprüft beigemischt werden.
- Unbekannte Personen sind grundsätzlich ein Fehler. Die eng begrenzte Ausnahme für technische
  Fouls bei bekanntem Team erfindet weder Spieler noch eine Trainerrolle.
- Die lokale DEN–OKC-Demo besitzt kein vollständiges Roharchiv.
  Ihre Herkunft nicht nachträglich vollständiger darstellen als vorhanden.

## Oberfläche und Darstellung

- Ein waagerechter vollständiger Court, Jumbotron und Playback-Controls bilden die Oberfläche.
  Heimlogo und Paint identifizieren den Homecourt. Heimteamname und Arena stehen außen hochkant,
  ungespiegelt; die Korbanlagen bleiben über den Spielern, Ball und Wurfeffekte darüber sichtbar.
- Initiale Seite und Social-Metadaten bleiben neutral „Hoops Replay“. Titel, Teamdaten und Court
  werden erst nach erfolgreicher Datenprüfung konkret. Bis dahin bleibt die Darstellung neutral.
- Das Jumbotron zeigt Score, Periode und Uhr sowie ab dem Ereignis Spieler/Team und originalen
  PbP-Text für höchstens fünf Replay-Sekunden oder bis zum nächsten Ereignis.
  Zusammengefasste Szenen zeigen den Text der Hauptaktion. Ohne aktive Aktion erscheint
  Matchup/Spieldatum nach America/New_York; Perioden-/Finaltexte stehen ebenfalls im Jumbotron.
- Spieler erscheinen als nummerierte ärmellose Jerseys; Namen beim Antippen. Keine zusätzlichen
  Auswahl- oder Ballbesitzerkreise. Teamlogos liegen lokal, Spielerfotos kommen vom jeweiligen
  NBA-/WNBA-CDN mit Teamlogo als Fallback. Fotos zeigen den aktuellen CDN-Stand.
- Treffer erhalten grüne Punkte, Fehlwürfe rote Kreuze unter den Jerseys, dazu Punktewerte.
  Sichtbarkeit und Ausblenden laufen in Replay-Zeit; andere Ereignis-Icons bleiben vom Court fern.
- Play/Pause, 0,5×/1×/1,5×/2×/4×, Scrubbing, Perioden- und Angriffssprünge bleiben konsistent.
  Leertaste/Pfeile ergänzen die Steuerung. Play am Ende startet neu.
- `?game=GAME_ID&action=ACTION_NUMBER` öffnet eine Szene am Ereignis pausiert.
  Auch IDs zugehöriger Annotationen führen zur gemeinsamen Szene. Ungültige IDs warnen und
  lassen den Start bei null; die URL wird während der Wiedergabe nicht fortgeschrieben.
- Der Fußtext erklärt belegte Eckpunkte, schematische Ergänzungen und verdichtete Zeit.
  Uniformen, Formationen und Laufwege werden nicht als gemessene Originale ausgegeben.
- Darunter verlinken lokale GitHub- und Threads-Icons ohne sichtbaren Text die Profile von Tehes.
- Runtime-Pfade bleiben relativ und GitHub-Pages-kompatibel. Es gibt keinen aktiven Service Worker
  oder Offline-Cache. Umami erfasst bestehende Seitenaufrufe auf `tehes.github.io`, keine neuen Events.

### Teamfarben

Die verbindlichen NBA-/WNBA-Paletten stehen in `js/replay-teams.js`. Alternates sind bewusst
pragmatische Replay-Farben, keine saisonal recherchierten tatsächlichen Uniformen. Schwarz bleibt
eine implizite Option. Historische Uniformrecherche ist keine Freigabebedingung.

Home bleibt normalerweise weiß, Away trägt Primary. Erst die Farbähnlichkeits- und
Verbesserungsentscheidung nach Spielplan-Prinzip löst die Away-Suche aus; bloß geringer
Helligkeitskontrast genügt nicht. Away versucht Alternate, dann Schwarz bei weißem Home.
Erst wenn keine geeignete Variante mit lesbaren eigenen Teamdetails gelingt, wechselt Home
zu Primary; Away versucht Alternate, danach Weiß/Schwarz. Away-Primary bleibt dann ausgeschlossen.

Nummern/Ränder brauchen mindestens 4:1 gegen das eigene Jersey. Eigene Teamfarben werden in
Grundfläche oder Details bevorzugt; nötigenfalls sind neutrale Details erlaubt.
Zwischen Jersey-Flächen beziehungsweise Away und Paint gibt es keine feste Mindest-Kontrastrate.
Die Auswahl bleibt bei Pause, Seeking und Seitenwechsel stabil; Court-Paletten ändern sich nicht.
Details der OKLab-Schwellen und Auswahlreihenfolge sind in `replay-colors.js` und dessen Tests maßgeblich.

## Auswertung und bekannte Grenzen

Der gemeinsame Replay-Audit läuft mit Serverdaten über
[scripts/audit-replays.js](scripts/audit-replays.js). Er prüft unter anderem End- und Zwischenstände,
Repräsentation der Ereignisse, aktive Aufstellungen, Ballbesitzer, endliche Koordinaten,
Wurf-/Reboundverhalten und interpolierte Zustände. Die Fadeaway-Landung wird am Wurfende
(`eventAt`) bewertet, bevor ein eigener Rebound-Lauf die Position verändern kann.
Formationserhalt nach Offensivrebound wird
nur bei einer ununterbrochenen Live-Fortsetzung des verknüpften Wurfs mit vorhandener Formation
verlangt. Ein als `deadball` erfasster Team-Rebound nach einer Strafe erfordert diesen Erhalt nicht.
Nach Flagrant-Freiwürfen ist der anschließende Einwurf zulässig; Grundlage ist für die WNBA
[Rule 12B, Section IV des Regelwerks 2026](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf#page=60).
Die vorhandenen Einzelprüfungen in
[replay-data_test.js](scripts/replay-data_test.js) laden ihre realen Ausgangsspiele ebenfalls vom
Server; [replay-motion_test.js](scripts/replay-motion_test.js) und
[replay-colors_test.js](scripts/replay-colors_test.js) benötigen keine Spieldateien.
Ausführung steht in [README.md](README.md). Es werden keine neuen festen Einzeltests als
Voraussetzung des Iterationsverfahrens eingeführt.

Die lokale Demo ist DEN–OKC `0022600007` mit dem Endstand 84–96 (auswärts–heim).
Alle anderen realen Vergleichsfälle hängen vom aktuellen Serverfeed ab. Es gibt keine automatische
Übernahme früherer Prüfergebnisse auf nachträglich korrigierte Daten.

Dauerhaft wichtige Gegenbeispiele und Grenzen:

- MIN–CLE `0022600120`: Dosunmus zeitgleicher Steal 385/386 und Auswechslung 254/253 sind
  Gegenbeispiele zur reinen Quellordnung. Die bestehende Einzelprüfung untersucht die begrenzte
  kausale Replay-Korrektur am Serverfeed; dessen unveränderter Fortbestand ist nicht garantiert.
  Die Overtime dieses Spiels ist nicht visuell vollständig abgenommen.
- CLE–ATL `0022600144`: Die bestehende Einzelprüfung schneidet den Serverfeed bis Rebound 57
  zu. Aktion 56 untersucht Alexander-Walkers Vorbereitung ohne den früheren Platztausch mit McCollum,
  gespiegelt und mit verkürztem Spieluhrabstand. Die Team-Endstände stammen aus dem vollständigen Spiel.
- Burton/Canada in `1042600305`: Treffer/Foul 450/451 bei Q4 6:27, Fehlfreiwurf 453 und
  Hillmon-Rebound 454 bei 6:25. Der gezielte Test sichert den And-one-Kontakt ohne zweiten Angriff;
  die Ereignisfolge ist im Testcode definiert, ihre Ausgangsaufstellung kommt vom Server.
- HOU–SAS `0022600009` ist ein bekannter inkonsistenter Feedfall, dessen aktuelle Serverdaten geprüft werden.
  Endstand allein genügt nicht. Widersprechende Zeiten/Zwischenstände dürfen nicht durch allgemeines
  Umsortieren oder Abschalten von Prüfungen verdeckt werden.
- Andere seltene Ereignisse, neue Descriptor-Schreibweisen, fehlende Koordinaten, unbekannte Personen
  oder unpassende Wechsel können weiterhin zur Ablehnung oder generischen Darstellung führen.
  Ein Ladefehler ist nicht automatisch ein nachgewiesener Fehler des Feeds.
- Frühere Sichtprüfungen zeigten einen Canvas-`drawImage`-Fehler beim Wechsel von Desktop- zu
  Mobilgröße im bereits geladenen Replay. Ein behobener Zustand ist nicht belegt; Resize benötigt
  eine gezielte aktuelle Prüfung. Daraus folgt keine allgemeine Behauptung, Mobilansichten seien defekt.
- Es gibt keine vollständige Safari-/iPhone-Abnahme und keine garantierte kollisionsfreie
  Zehn-Spieler-Simulation. Die neue Regel- und Qualitätsbewertung ist noch nicht implementiert.

Jede Weiterentwicklung kann an diesen Konzeptgrenzen ansetzen. Ihr Abschluss beschreibt, welcher
Teil tatsächlich verbessert wurde und welche Lücke verbleibt, ohne die gesamte Zielarchitektur
oder Regelabdeckung vorwegzunehmen.
