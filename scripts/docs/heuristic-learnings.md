# Replay-Heuristik: Learnings

Diese Sammlung bewahrt übertragbare Erkenntnisse und begründet verworfene Ansätze. Das gültige
fachliche Zielbild steht in [PROJECT.md](../../PROJECT.md); Code und Tests zeigen den aktuellen Stand.

## Pflege

- Erkenntnisse thematisch in bestehende Abschnitte einarbeiten und Überholtes ersetzen, statt
  Iterationen chronologisch anzuhängen. Ursache, Schlussfolgerung, Grenzen und gegebenenfalls
  Quelle oder Bedingung für einen erneuten Versuch knapp festhalten.
- Verworfene Ansätze mit ihrem Scheitergrund erhalten. Offene fachliche oder visuelle Bewertungen
  als solche kennzeichnen und nach einer Entscheidung aktualisieren.
- Reproduzierbare Fehler und geschützte Fälle bevorzugt durch Regressionstests absichern. Hier nur
  Beispiele oder Messwerte aufnehmen, die eine Erkenntnis oder ihre Grenzen künftig erklären.
- Keine Versuchsprotokolle, vollständigen Testergebnisse, Messwerttabellen oder Implementierungsstände
  sammeln. Git bewahrt die Änderungsgeschichte; Spiel-IDs allein sind kein unveränderliches Datenarchiv.

## Defensive Drei-Sekunden-Verstöße

Ein Verteidiger sollte nicht allein deshalb in die Zone laufen, damit ein geometrischer Timer beim
aufgezeichneten Pfiff überschritten ist. Dieser Ansatz wurde visuell als gestellt verworfen: Ohne
Bezug zu Ball, Gegenspieler und Korb fehlt ein erkennbarer Anlass für die Bewegung.

Ballferne Hilfe kann dagegen aus einer bewachten Position und dem anschließenden Freilaufen des
Gegenspielers entstehen; eine Penetration kann Hilfe und ein späteres Rückkehrsignal begründen.
Dafür müssen Ballwechsel und Wege zum Kontext passen. Nicht unterstützte Situationen bleiben
kenntlich, statt einen ursachenlosen Lauf zu ergänzen. Technische Zeit-, Kausalitäts- und
Seeking-Prüfungen belegen weder die tatsächliche Aktion noch vollständige Basketballplausibilität;
die visuelle Nutzerabnahme des neuen Kandidaten steht aus.

Grundlage: WABC Level 1, Team 1.1.7–1.1.8, sowie NBA-/WNBA-Regel 10, Abschnitt VII.
Coaching-Prinzipien belegen keine tatsächlichen Pässe oder Laufwege.

## Turnover und anschließendes Loose-Ball-Foul

Die frühe Reservierung des belegten Kontaktpaars verkürzt zwar Wege, erklärt aber weder den
Kontrollverlust noch die gemeinsame Ursache des Kontakts. Als vollständige Lösung wurde dieser
Ansatz verworfen. Dafür braucht es einen durchgängigen Ballweg: sichtbare Ballabgabe, freie
Ballphase und eine daraus entwickelte Bewegung der belegten Kontaktpartner.

Eine schematische gegnerische Ablenkung kann in geeigneten direkt verknüpften Folgen die
Teamkontrolle beenden, ohne einen zusätzlichen Fang oder Steal zu behaupten. Der Kontaktort darf
nicht durch nachträgliches Versetzen des Balls entstehen. Eine bestimmte Kontaktform lässt sich
nicht ohne Beleg ableiten. Ein allgemeines Teamkontrollmodell und die visuelle Nutzerabnahme des
Kandidaten stehen aus; nicht direkt verknüpfbare Folgen sowie Rebound-/Wurf-Fälle bleiben offen.
Details und Quellen zur Untersuchung stehen im [Iterationsbericht](loose-ball-iteration.md).

## Outlet nach kontrolliertem Defensivrebound

Eine immer zentral platzierte erste Anspielstation verdeckt den Outlet-Pass und die Bewegung beim
Fang. Bei genügend Zeit kann eine freie seitliche Station angeboten werden, während Mitspieler
bereits vorauslaufen und der Rebounder bis zum Pass seine Position hält. Die Eignung hängt von
Spielern, Passkorridor und Fortsetzung ab; ohne geeigneten Punkt bleibt ein einfacherer Aufbau.

Grundlage ist [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.3.1. Rückspielbedingungen begrenzen die Anwendung auf Rebounds in der eigenen Hälfte.
Ein Aufstellungsslot belegt nicht die tatsächliche Ballführerrolle; statische Korridorabstände
beweisen keine sichere Passlinie gegen bewegte Verteidiger. Die visuelle Nutzerabnahme und eine
umfassende Beurteilung von Passdruck, Laufwegkonflikten und Anschlussentscheidungen stehen aus.

## Abschluss und Folgebewegung getrennt beurteilen

Eine Abschlussprüfung muss die Landung am Wurfende bewerten. Die Endposition der gesamten Szene
kann bereits durch einen anschließenden eigenen Rebound-Lauf verändert sein und ist dafür kein
verlässlicher Messpunkt.

## Offensive Zone: Warten und Anspielen unterscheiden

Ein späterer Innenabschluss erlaubt kein langes vorheriges Warten in der Zone. Wartepositionen,
Zwischenstationen und begrenzte Positionskorrekturen müssen ebenso betrachtet werden wie Endziele:
Ein außerhalb liegendes Ziel verhindert nicht, dass ein Zwischenschritt innen endet oder ein Weg
zu lange durch die Zone führt. Innen stehende Spieler können sich zum nächstgelegenen Außenziel
lösen; bei vorbereitenden Läufen kann die zum Ausgangspunkt nähere Außenseite unnötige Querungen
vermeiden. Kurze Innenzuspiele, direkte Abschlüsse und Rebounds bleiben möglich.

Grundlage: [NBA Rule 10, Section VI](https://official.nba.com/rule-no-10-violations-and-penalties/)
und [WNBA 2026 Rule 10, Section VI](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf).
Ein pauschales Zonenverbot, bloß kürzere Replay-Dauer oder eine generelle Ausnahme für laufende
Spieler wären falsch. Die Diagnose misst Körpermittelpunkte in abgebildeter Spielzeit, kennt aber
nicht alle Fußpositionen, Ausnahmen und szenenübergreifenden Verläufe. Meldungen sind daher
Prüfkandidaten, keine bewiesenen Verstöße; ein unmittelbarer kontinuierlicher Auslauf kann eine
andere Beurteilung erfordern.

## Ballbewegung und lange Pässe

Ball-Reversal kann über mehrere Stationen oder als direkter Skip-Pass erfolgen. Ein langer Pass
ist besonders nachvollziehbar, wenn er eine offene ballferne Anspielstation schnell erreicht;
ein dazwischen stehender Mitspieler allein macht ihn nicht falsch. Bei ausgeglichenen Optionen
kann das Weiterpassen über geeignete freie Stationen plausibler wirken. Passlinien, Abstände,
Empfangssituation und verfügbares Zeitbudget müssen gemeinsam betrachtet werden; statische
Positionen belegen weder eine sichere Passlinie noch einen tatsächlichen Vorteil. Ein pauschales
Verbot langer Pässe oder eine Pflicht zur nächsten Station wäre deshalb nicht begründet.

Grundlagen: [WABC Coaches Manual, Ball Reversal](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaches-manual-eng.pdf),
Glossar 3.2, [WABC Level 1, Team 2.1.4](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf)
und [USA Basketball, Passing](https://www.usab.com/news/2014/01/6-tips-to-polish-your-teams-passing).

Die vorbereitende Ballzirkulation allein deckt lange Zuspiele nicht ab: Auch der Anschluss an
den Abschluss muss betrachtet werden. Ein unbelegtes direktes Zuspiel kann bei ausreichender
Zeit über eine geeignete Zwischenstation laufen; bei belegtem Assist muss diese Verbindung
zuerst den Assistgeber erreichen. Eine zusätzliche Station zwischen ihm und dem Schützen
würde die belegte Beteiligung verfälschen. Laufende Abschluss-, Rebound- und Freilaufaufträge
dürfen nicht zugunsten einer zusätzlichen Anspielstation unterbrochen werden.

Nur die Gesamtlänge aller Pässe zu minimieren bevorzugt die direkte Abkürzung. Die Länge der
einzelnen Pässe und der Raum beim Empfang ergänzen die Bewertung freier Korridore. Ein klar
freier ballferner Empfänger kann den direkten Seitenwechsel rechtfertigen. Flug und Fang
brauchen eigene Zeit; reicht die Reserve vor dem Abschluss nicht, entfällt die Zwischenstation.
Die verwendeten Abstände und Gewichte sind eigene Heuristiken. Statische Verteidigerabstände
beweisen keinen sicheren Flug gegen bewegte Verteidiger. In den visuell beurteilten Beispielen
wurde das Weiterpassen über passende Zwischenstationen als deutlich natürlicher bewertet;
daraus folgt keine allgemeine Bestätigung aller Passentscheidungen.

## Wurfchancen und bekannter Ausgang

Ballorientierte Hilfe und die Rückkehr nach einem Pass können einen zeitweilig freien Schützen
ergeben. Der bekannte Ausgang gewichtet solche Varianten, belegt aber weder den Verteidigerabstand
noch die tatsächliche Passfolge. Auch getroffene bedrängte und vergebene freie Würfe bleiben möglich.
Belegte Blocks und bewegte Abschlüsse brauchen ihren eigenen Kontext. Die visuelle Beurteilung und
ein breiter Vergleich der Wurfchancen stehen aus.

Beim belegten Assist muss der letzte Pass vom Assistgeber kommen. Sein Ballflug und der Closeout
laufen gemeinsam; ein zusätzlicher Pass gehört davor und setzt erreichbare Stationen und genügend
Zeit voraus. Ein Shot-Clock-Verstoß kann mit engerem Druck am Ball dargestellt werden, belegt
aber weder einen Steal noch die konkrete Ursache für den ausbleibenden Abschluss.

Grundlage: [Jr. NBA, Kick Pass](https://jr.nba.com/basketball-practice-plans/starter/page/3/)
und [Jr. NBA, Extra Pass](https://jr.nba.com/basketball-practice-plans/rookie/page/7/).

## Shotclock-Schlusscountdown

Ein aufgezeichneter Shotclock-Verstoß belegt den Endpunkt, aber keine vollständige Folge von
Starts, Stopps und Resets. Der Schlusscountdown bleibt deshalb eine schematische Ergänzung.
Er folgt der abgebildeten Spielzeit innerhalb der Verstoßszene und endet am Ereignisanker;
Einwurfvorbereitung zählt nicht mit. Bei weniger als drei Sekunden Spielzeit in dieser Szene
entfällt die Anzeige, statt den Countdown über möglicherweise unklare Ereignisgrenzen zu verlängern.
Eine vorausgehende Fehlwurf-/Rebound-Folge wird damit bewusst nicht als durchgehender Timer behandelt.

## Freilaufen nach einem Pass

Kurze diagonale Vorwärtswege können die bisher überwiegend seitlichen oder rückwärtigen Optionen
für Passgeber ergänzen. Sie sind nur sinnvoll, wenn sie Spacing oder Passlinien gegenüber dem
Halten verbessern und der Weg ausreichend frei bleibt. Freie Positionen dürfen auch gehalten
werden; ein kurzer Freilauf belegt keinen vollständigen Give-and-Go oder einen zusätzlichen Pass.

Grundlage: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.1.1. Stichproben entlang des Weges und statische Verteidigerpositionen ersetzen keine
kontinuierliche Kollisionsprüfung. Ein einzelner zusätzlicher Sichtfall belegt keine breite
Verbesserung der Angriffschoreografie.

## Spielerprofile, Matchups und Grundformationen

Mischpositionen müssen unabhängig von der Reihenfolge ihrer Bestandteile berücksichtigt werden.
Die Profile der aktiven Fünf unterstützen Rollen und gemeinsame Matchups; belegte Beteiligung
behält Vorrang. Maße helfen bei der Wahl einer benötigten Innenrolle, beweisen aber weder
Geschwindigkeit noch Defensivqualität oder tatsächliche Matchups.

Eine körperbasierte Sperre gegen Five-out wurde verworfen: Sie erzwang trotz Außenprofil eine
Innenbesetzung und störte einen geschützten Reboundanlauf. Dreieranteil, Quote und Stichprobe
müssen gemeinsam bewertet werden; eine hohe Quote bei seltenen Versuchen begründet keinen
Stretch-Spieler. Assists können das Aufbauprofil ergänzen, Zweipunktversuche belegen keine
Drive-Häufigkeit. Saisonaggregate sind keine historischen Scoutingberichte vor der Partie.

Five-out, Four-out/one-in und Three-out/two-in sind schematische Raumverteilungen. Zwei Innenrollen
können hohe und tiefe Anspielräume kombinieren, sofern Abstände und belegte Korridore dies erlauben;
Warteplätze bleiben außerhalb der Zone. Daraus folgen keine belegten Screens oder konkreten
Spielsysteme. Fehlende Profile rechtfertigen keine erfundenen Körpermaße oder Spezialrollen;
modellinterne Zuordnungskosten beweisen keine tatsächlichen Matchups.

Grundlagen: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.1.1 und 2.1.3 sowie Player 2.8.2, und
[WABC Level 2](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-2-eng.pdf),
Team 2.1.2 und Player 2.1.2. Auswahlgewichte und Raumgrenzen sind eigene Heuristiken.

## Inaktiver Abgänger bei einer Auswechslung

Ein nicht aktiver Abgänger darf nicht unbemerkt eine ungültige Aufstellung erzeugen: Ein nicht
gefundener Array-Index ersetzt keinen der fünf aktiven Spieler. Ein nachgelagerter Fehler bei
einem späteren Ereignis kann deshalb auf eine frühere Auswechslung zurückgehen.

Eine Konsistenzkorrektur ist nur bei genau einem durch spätere Beteiligung innerhalb derselben
Periode gestützten Kandidaten vertretbar. Frühere widersprechende Court-Beteiligung sowie fehlende,
mehrdeutige oder periodenfremde Belege schließen die Ableitung aus. Originaldaten und Beleg der
Korrektur bleiben erhalten; auch eine eindeutige Ableitung beweist den tatsächlichen Wechsel nicht
unabhängig. Regressionstests sichern den realen Fehler und die Grenzen der Ableitung ab.
