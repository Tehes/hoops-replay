# Hoops Replay — Zielbild und Projektkonzept

Diese Datei beschreibt ausschließlich das fachliche Zielbild von Hoops Replay: Produktziel,
Spielmodell, fachliche Grenzen und Anforderungen an die Bewertung. Eine Anforderung ist kein
Nachweis, dass sie bereits umgesetzt oder geprüft ist.

## Northstar

Hoops Replay macht aufgezeichnete Basketballspiele als regelkonforme, zusammenhängende und
verständliche Ballbesitze erlebbar. Ball und Spieler bewegen sich mit erkennbarem Zweck;
die aufgezeichneten Ereignisse und ihre Anker bleiben verbindlich. Was zwischen diesen Ankern
entsteht, ist eine plausible schematische Ergänzung und keine Rekonstruktion aus Tracking-Daten.

## Geltungsbereich und Pflege

**Keine Implementierungsdetails in dieser Datei.** Dazu gehören insbesondere aktueller
Implementierungsstand, Module und Funktionen, konkrete Algorithmen und Schwellenwerte,
Code- und Prüfabläufe, API-Endpunkte, technische Konfiguration sowie Statuslisten. Auch
Änderungsverläufe, Testprotokolle, einzelne Fehlergeschichten und erledigte Aufgaben gehören
nicht hierher. Das gilt auch dann, wenn ein Detail eine Umsetzung erklärt oder gerade geändert wurde.

Hier stehen dauerhafte fachliche Anforderungen, ihre Begründungen und Quellen sowie der
fachliche Datenvertrag. Regeln und Grenzen werden allgemein formuliert, nicht anhand einzelner
Spiele oder Implementierungsfälle dokumentiert. Eine fachliche Erkenntnis wird direkt in den
zuständigen Abschnitt eingearbeitet; Überholtes wird ersetzt, nichts chronologisch angehängt.
Eine reine Implementierungsänderung ist kein Anlass, diese Datei zu erweitern.

Der tatsächliche Stand ergibt sich aus Code und Tests. [README.md](README.md) beschreibt Nutzung,
Setup, Schnittstellen und Prüfkommandos; [AGENTS.md](AGENTS.md) enthält die Arbeitsregeln.
Git hält die Änderungsgeschichte fest. Erkenntnisse aus Experimenten stehen in den
[Heuristik-Learnings](scripts/docs/heuristic-learnings.md).

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
- Eine Shotclock-Anzeige beschränkt sich auf einen schematischen Schlusscountdown vor einem
  aufgezeichneten Shotclock-Verstoß mit ausreichend zusammenhängendem Vorlauf. Der Ablauf ist
  am belegten Verstoß verankert; eine durchgehend bekannte Shotclock wird nicht behauptet.
- Die Bonus-Anzeige zeigt das begünstigte Team anhand der bis zum Replay-Moment aufgezeichneten
  Teamfouls. Periodenwechsel, Overtime und die Zwei-Minuten-Regel der jeweiligen Liga gelten dabei;
  technische Fouls, gewöhnliche Offensivfouls und Doppelfouls zählen nicht zur Teamfoul-Grenze.
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

## Architektur im Zielbild

Die Verarbeitung folgt im Zielbild klaren fachlichen Verantwortlichkeiten:

| Baustein | Aufgabe | Grenze |
| --- | --- | --- |
| Daten | Laden, normalisieren, Herkunft und Korrekturen erhalten | Keine Choreografie aus ungeprüften Feed-Feldern ableiten |
| Ereignisse | Reihenfolge auflösen und zusammengehörige Ereignisse verknüpfen | Originalereignisse und ihre Identität erhalten |
| Regeln | Spielzustand und erlaubte Fortsetzung bestimmen | Keine Laufwege oder Posen auswählen |
| Choreografie | Einen plausiblen Ablauf innerhalb der Vorgaben planen | Keine Regeln, Rulings oder Ergebnisse überschreiben |
| Bewegung | Aufträge in erreichbare Wege, Ballflüge und Posen übersetzen | Keinen eigenständigen fachlichen Besitzwechsel entscheiden |
| Darstellung | Den kompilierten Zustand zum Zeitpunkt X zeichnen | Keine Spielregeln oder taktischen Entscheidungen ausführen |
| Analyse | Korrektheit prüfen, Entscheidungen erklären und Qualität vergleichen | Messungen nicht mit vollständiger Basketball-Plausibilität gleichsetzen |

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
- Der bekannte Ausgang darf plausible Vorteile von Angriff und Verteidigung unterschiedlich gewichten.
  Ein Treffer beweist keinen freien Wurf und ein Fehlwurf keine erfolgreiche Verteidigung; beide
  Varianten bleiben bei passenden Belegen und ausreichend Zeit möglich.
- Wege bleiben einfach, mit plausibler Beschleunigung und Bremsen. Geplante Abstände, ein
  Ausweichweg oder ein späterer Start sind wiederholtem Hin-und-her-Korrigieren vorzuziehen.
- Bei wenig Zeit oder schwachen Belegen wird der Ablauf einfacher, statt zusätzliche Aktionen
  in das Fenster zu zwingen.
- Zusammenhängende Ballverluste und Loose-Ball-Fouls benötigen einen durchgängigen Ballweg:
  sichtbare Ballabgabe beziehungsweise Kontrollverlust, freie Ballphase und belegter Kontakt.
  Der Foulort darf nicht durch nachträgliches Versetzen des Balls hergestellt werden.
  Ballberechtigung nach dem Pfiff ist kein Nachweis einer vorherigen Ballkontrolle des gefoulten Teams.
  Passziel, freie Ballbewegung und Kontaktort bleiben ohne Ortsbelege schematisch.

Der Planer kann wenige Alternativen vergleichen. Regelwidrige und zeitlich unmögliche Kandidaten
scheiden vor der Qualitätsbewertung aus. Erst danach entscheiden Kontinuität, Wege, Spacing,
freie Passlinien und vermeidbare Bewegung. Ein besserer Qualitätswert darf keinen Regelverstoß
oder Verlust eines belegten Ereignisses ausgleichen.

Wichtige Entscheidungen sollen erklärbar bleiben: verwendete Belege, gewählte Fortsetzung,
Alternativen und Gründe für Auswahl oder Ablehnung.

### Spielerprofile, Formationen und Matchups

Die Formationsbildung berücksichtigt die tatsächlich aktive Fünf und deren verfügbare
Rosterpositionen, Körpergrößen und Gewichte. Diese Merkmale unterstützen die Verteilung von
Aufbau, Flügeln, Innenpräsenz und Korbschutz, ohne jedem Spieler eine eindeutige PG–C-Position
zuzuweisen. Passende Formationen ergeben sich aus den
Spielerprofilen und dem Ereigniskontext, nicht allein aus einem Positionsetikett. Die Grundordnungen
Five-out, Four-out/one-in und Three-out/two-in stehen als Alternativen zur Verfügung; bei zwei
Innenrollen werden tiefe und hohe Anspielräume passend kombiniert. Eine Grundordnung schreibt
keinen konkreten Spielzug oder zusätzlichen Screen vor.

Defensive Matchups berücksichtigen Position, Größe, Gewicht und das offensive Profil der
Gegenspieler. Die Zuordnung bleibt innerhalb eines Angriffs stabil, soweit belegte Beteiligung
oder die Fortsetzung keine Anpassung erfordern. Diese Merkmale begründen plausible Zuordnungen,
beweisen aber keine tatsächlich gespielten Matchups.

Wurfquoten, Wurfversuche und weitere verfügbare Spielerstatistiken beschreiben individuelle
Tendenzen für die ergänzte Choreografie: etwa eher zum Korb ziehen, sich außen zum Wurf anbieten,
den Ball verteilen oder innen für Rebounds bereitstehen. Trefferquote, Versuchshäufigkeit und
Stichprobengröße werden gemeinsam betrachtet; eine hohe Quote allein belegt weder häufige
Außenwürfe noch Drives. Fehlen passende Orts- oder Aktionsdaten, bleiben solche Tendenzen
vorsichtige Annahmen. Die Profile beziehen sich auf die jeweilige Liga und Spielsaison.

Spielerprofile steuern nur die plausiblen Ergänzungen zwischen belegten Ereignissen.
Aufgezeichnete Beteiligte und Abschlussorte haben Vorrang vor statistischen Tendenzen.
Fehlende Profildaten führen zu einer einfacheren Planung ohne erfundene Körpereigenschaften
oder individuelle Spezialrollen. Formationen, Matchups und Bewegungstendenzen bleiben schematisch;
sie gelten nicht als Nachweis eines tatsächlich gespielten Systems oder Spielzugs.

## Bewertung und Weiterentwicklung im Zielbild

Als Vorbild dient der Verbesserungsprozess der
[Poker-Bots](https://github.com/Tehes/poker/blob/master/scripts/docs/bot-tuning-playbook.md):
Literatur beziehungsweise Regelgrundlage, konkrete Hypothese, fokussierte Änderung,
Vergleich gegen einen akzeptierten Stand und nachvollziehbares Learning.
Ein allgemeines Modell für eine gemeinsame Ursache hat Vorrang vor Ausnahmen für einzelne
Spieler, Spiele oder Szenen.

### Spielauswahl und Vergleichsdaten

Reale NBA-/WNBA-Spiele bilden die Grundlage der Spielauswahl. Eine Iteration vergleicht
Ausgangsstand und Kandidat auf denselben Eingaben. GameIDs und Datenfingerabdrücke machen
die Eingaben im Bericht erkennbar.
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

## Fachlicher Datenvertrag

Das Replay verwendet abgeschlossene NBA- und WNBA-Spiele. Play-by-Play liefert Ereignisse,
Beteiligte, Spielstände, Spieluhrzeiten und gegebenenfalls Abschlussorte; der Boxscore liefert
Teams, Spieler und Startaufstellungen. Verfügbare saison- und ligabezogene Roster- und
Spielerstatistiken ergänzen Profile, ersetzen aber keine Angaben zum konkreten Spiel.

Ereignisidentität und ursprüngliche Angaben bleiben erhalten. Eine Ereignis-ID ist nicht
notwendigerweise eine zeitliche Reihenfolge; zeitgleiche Ereignisse sind nicht automatisch
Duplikate. Zusammengehörige Ereignisse müssen unter Berücksichtigung ihrer fachlichen
Abhängigkeiten interpretiert werden. Widersprüchliche Daten dürfen nicht durch pauschales
Umsortieren oder das Abschalten von Prüfungen verdeckt werden.

Nur hinreichend belegte Orte sind verbindliche Abschlussanker. Fehlende oder widersprüchliche
Ortsangaben dürfen nicht als Tracking-Daten ausgegeben werden; sachlich begründete Korrekturen
müssen von ursprünglichen Angaben unterscheidbar bleiben. Nicht belegte Positionen, Wege und
Passfolgen bleiben schematische Ergänzungen. Unzureichende oder inkonsistente Daten müssen
als solche erkennbar bleiben, statt Sicherheit oder zusätzliche Ereignisse vorzutäuschen.
