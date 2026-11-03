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

## Sichtbarer Dribbelkontakt

Ein kleines globales Sinus-Wackeln vermittelt keinen Bodenkontakt. Eine größere Auslenkung allein
kann beim Pass oder Wurf einen Sprung zur Hand erzeugen. Vollständige Zyklen pro zusammenhängender
Dribbelphase verbinden Handhöhe, sichtbaren Bodenkontakt und anschließendes Aufnehmen; eine
Szenengrenze allein darf den Zyklus nicht zurücksetzen. Ballradius und Darstellungsgröße müssen
beim Kontakt mit dem Bodenschatten berücksichtigt werden. Eine starke seitliche Auslenkung zum
Freihalten des Trikots wurde visuell verworfen: Der Ball soll nahezu senkrecht unter der Hand
aufkommen. Der verbleibende leichte Winkel folgt der horizontalen Laufrichtung; im Stand wird
senkrecht gedribbelt. Auch der Haltepunkt muss zur Laufrichtung gespiegelt werden; allein den
Winkel umzukehren lässt den Ball auf der falschen Körperseite. Beim Anhalten bleibt die zuletzt
verwendete Seite erhalten; Fang und Abgabe müssen dieselbe Projektion verwenden.
Ein besitzloser Freigabezustand mit `z=0` direkt zwischen gehaltenem Ball und Flug ist kein
Bodenkontakt: Seine Projektion muss Höhe und Körperseite der letzten Handposition erhalten.
Ein Test ohne diesen expliziten Zwischenzustand erkennt den kurzen Sprung zur Feldposition nicht.
Diese Projektion verändert keine
kompilierten Ballwege und belegt weder echte Dribbelzeitpunkte noch die verwendete Hand.

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

## Teamrebound und angenommener Ausball

Ein Teamrebound ohne benannten Fänger ist kein belegter individueller Fang. Folgt auf einen
zusammenhängenden Live-Fehlwurf eine gewöhnliche Spielfortsetzung mit Einwurfrecht, kann ein
schematischer Ausball die fehlende Unterbrechung erklären. Den Ball im Feld liegen zu lassen und
danach an einer beliebigen Seitenlinienposition einzuwerfen, verdeckt diesen Zusammenhang.
Auch ein nachträglicher Flug aus einer bereits ruhenden Feldposition wurde visuell verworfen:
Der Abpraller muss unmittelbar am Korb beziehungsweise Block beginnen und ohne Zwischenlandung
im Feld ins Aus führen. Der folgende Teamrebound-Eintrag bewegt den Ball nicht erneut;
die tote Ballphase beginnt bereits mit dem Ausball.
Die nächstgelegene Feldgrenze ist eine räumliche Heuristik; Ausball, Ort und Ballweg sind als
Annahme im Plan gekennzeichnet und verändern keine Quelldaten. Eine letzte Berührung wird nicht
erfunden. Benannte Rebounder, Dead-Ball-Einträge, nicht zusammenhängende Wurf-/Rebound-Folgen und
belegte andere Fortsetzungen erhalten diese Ergänzung nicht. Die visuelle Nutzerabnahme steht aus.

Grundlage: [NBA Video Rulebook, Rebound](https://videorulebook.nba.com/rule/rebound/),
insbesondere „Team Rebound, no individual rebound as ball goes out of bounds“.
Die Statistikzuordnung macht diesen Ablauf plausibel, beweist ihn aber nicht für eine einzelne Szene.

## Fastbreak und geordneter Aufbau

Ein schnellerer Vorlauf in dieselbe Halbfeldformation genügt nicht als Fastbreak: Wenn die
Verteidiger vor dem Abschluss stets ihre Zuordnungen erreichen und der Ballgewinner zunächst an
einen festen Guard-Slot abgeben muss, verschwindet der mögliche Vorteil des Ballgewinns.
Dieser Ablauf ist als allgemeine Transition-Lösung ungeeignet. Startpositionen und kontrollierter
Ballbesitz müssen erhalten bleiben; Läufer bieten sich früh in breiten Bahnen an, während die
Defense Korb und Ballweg absichert. Ein offener Vorauspass und eigenes Vortragen sind Alternativen.
Nachlaufende Spieler brauchen getrennte Räume, sonst entstehen bereits vor einem folgenden
Offensivrebound überlagerte Ausgangspositionen. Bei einem frühen Außenwurf kann ein geeigneter
Mitspieler korbnah unterstützen, während der belegte Passgeber anspielbar bleibt.
Nach einem Gegenangriff können die beibehaltenen Positionen einen bisher freien direkten
Rebound-Vorbereitungsweg versperren. Ein einzelner auf freie Korridore geprüfter Außenweg kann
diesen Anschluss erhalten, ohne einen Mitspieler zu versetzen oder die Laufgeschwindigkeit zu erhöhen.

Der Feed liefert mit `fastbreak` einen ausdrücklichen Kontext auch für Dreier und Fehlwürfe.
`fromturnover`, ein Running-Abschluss oder eine kurze Zeitspanne allein reichen nicht aus.
Ohne Markierung ist die Kombination aus kontrolliertem Live-Ballgewinn, kurzem Zeitfenster,
passendem Abschluss und räumlichem Vorteil eine vorsichtige eigene Heuristik. Maßgeblich ist der
Abstand zum Besitzbeginn, nicht nur zum unmittelbar vorangehenden Annotationseintrag.
Dead-Ball-Turnover, Teamrebound-Einwürfe, Unterbrechungen und zweite Chancen dürfen dadurch keinen
Live-Gegenangriff erhalten. Ein ausdrücklich markierter Fastbreak nach einem Treffer benötigt
weiterhin den regulären Einwurf. Freiwerfeinträge mit Fastbreak-Markierung allein begründen keinen
neuen Gegenangriff nach dem Pfiff. Fastbreaks mit einem Foul oder Ballverlust als Endereignis sind
damit noch nicht vollständig choreografiert.

Pässe benötigen sichtbare freie Ballphasen und erreichbare Fänge; ein Assist darf auch beim
Running-Abschluss keinen unmittelbaren Wechsel des Ballhalters erzeugen. Zusätzliche Zirkulation,
Halbfeld-Wartephasen und ein vorsorglicher langer Reboundaufbau dürfen den frühen Abschluss nicht
wieder verzögern. Tests für Halbfeldaufbau und feste Matchups benötigen deshalb eine ausdrückliche
Abgrenzung zur Transition; Ballkontinuität, Ereignisanker und Bewegungsgrenzen gelten weiterhin.
Automatische Prüfungen belegen keine visuelle Nutzerabnahme oder tatsächlichen Laufwege.

Grundlage: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.3.1–2.3.3 (Starting the Break, Running Wide Lanes, Pass the Ball Ahead) und Team 1.1.11
(Transition Defence); [NBA Game Distribution API](https://developer.geniussports.com/nbangss/rest/index_central.html),
Play by Play Action Types, Qualifiers für `2pt`, `3pt` und `freethrow`.

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

## Offensivrebound: Korbschutz und Kick-out

Ein allgemeiner Zonen-Auslauf direkt nach dem Fang kann eine freie Korbchance grundlos aufgeben.
Korbschutz, Hilfe und Pass müssen davor zusammenpassen: Der zugeordnete Verteidiger reagiert erst
auf den Fehlwurf mit einem erreichbaren Weg zur Korbseite des Rebounders. Ein naher Außenverteidiger
kann herunterhelfen und nach der Ballabgabe zurückkehren. Der Rebounder hält bis zum Pass seine
Fangposition; eine Außenstation darf sich kurz für eine freie Passlinie lösen. Erst nach dem Fang
des Kick-outs beginnt der allgemeine Zonen-Auslauf. Hilfe allein garantiert keinen freien Pass:
Ein beim Start offener Korridor kann sich während des Freilaufens schließen und muss vor der
Abgabe erneut beurteilt werden. Ein direkter Weg der Hilfe auf den Ball kann außerdem genau die
gewünschte Außenpasslinie blockieren; seitlicher Druck auf der Korbseite lässt diese Option offen.
Die Hilfe kann bereits nach dem Fehlwurf anlaufen und während des Reboundfangs weiter reagieren;
erst danach zu starten verlängert den Aufenthalt des Rebounders unnötig. Ein kurzer Zonen-Auslauf
braucht außerdem seine eigene Bewegungsdauer, auch wenn ein Mitspieler gleichzeitig einen längeren
Anlauf absolviert. Nach dem früheren Erreichen bleibt das Außenziel bis zum Ende dieser gemeinsamen
Bewegungsphase erhalten, statt in deren langsamere Interpolation zurückzuspringen.

Die Ergänzung setzt einen benannten, zusammenhängenden Live-Offensivrebound, nahen Korbschutz,
eine Fortsetzung mit anderem Beteiligten und ausreichend Zeit voraus. Putbacks, Alley-oops,
unmittelbare Eigenabschlüsse, Team-/Dead-Ball-Rebounds und Unterbrechungen erzwingen keinen Kick-out.
Fehlt eine geeignete Passlinie, wird kein sicherer Pass behauptet. Die Abstände und Auswahlgewichte
sind eigene Heuristiken; statische Korridore ersetzen keine vollständige Prüfung bewegter Defense.
Die visuelle Nutzerabnahme des Ablaufs steht aus.

Grundlagen: [WABC Level 2](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-2-eng.pdf),
Team 1.1.2, S. 228 (Low-Post-Hilfe und Rückpass), und Team 2.1.5, S. 294 (Entscheidung bei Hilfe),
sowie [USA Basketball, Advanced Rebounding](https://www.usab.com/news/2014/01/advanced-rebounding-secrets-from-the-pros)
(freie ballferne Schützen nach Offensivrebound). Diese Prinzipien begründen eine schematische
Ergänzung, keine Rekonstruktion der tatsächlichen Verteidigung.

## Früher Druck auf die Rebounderin

Eine gewöhnliche persönliche Foulfolge direkt nach einem benannten Defensivrebound kann als
früher Druck auf die Rebounderin ergänzt werden. Ein zuerst zurücklaufender Verteidiger mit
anschließend erzwungenem Kontakt erklärt diesen Druck nicht. Der Zusammenhang beginnt beim
Rebound: allgemeine Reboundposition vor dem Wurf, Reaktion auf den Ausgang und eine erreichbare
Annäherung. Der genaue Fangpunkt darf vor dem Fehlwurf nicht vorweggenommen werden.

WABC Level 1, Team 1.1.11, S. 268–270, beschreibt frühe Absicherung und das Bedrängen der
Rebounderin, um den Outlet-Pass zu verzögern. Team 2.3.1, S. 345, ergänzt Ballabschirmung und
eine seitliche, bei Druck veränderbare Anspielstation. Die Rebounderin muss dafür nicht sofort
dribbeln oder einen zusätzlichen Pass spielen. Andere Verteidiger sichern nach hinten ab.

Die enge zeitliche Verknüpfung ist eine eigene Eignungsheuristik. Sie belegt weder eine konkrete
Kontaktform noch eine Pressverteidigung des ganzen Teams. Unterbrechungen, andere Foulopfer,
Team-/Dead-Ball-Rebounds und spezifisch bezeichnete Fouls tragen diese Ergänzung nicht.
Im visuell akzeptierten Vergleich wirkt der Zusammenhang aus Rebound, frühem Druck und Foul
stimmiger als der Rücklauf mit anschließender abrupter Kontaktannäherung. Diese Abnahme bestätigt
die gezeigte Folge, nicht pauschal alle Rebound-Foul-Kontexte.

Grundlage: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf).

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

### Einwurffang und anschließender Aufbau

Den Empfänger pauschal knapp innerhalb der nächsten Feldgrenze zu platzieren, erzeugt bei
angenommenen Ausbällen an der offensiven Baseline tiefe Fänge mit anschließendem Rückweg nach
außen. Die Ursache liegt dann bereits im Einwurf, nicht in der späteren Passauswahl. Zusätzliche
Korbschützer nur zur nachträglichen Rechtfertigung dieses Rückwegs wären keine belegte Lösung.

Eine äußere Sicherheitsstation kann anhand von Passlinie, Empfangsraum, Mitspielerabstand und
Anschlussweg gewählt werden. Kurze direkte Abschlüsse des Empfängers bleiben möglich; ein
aufgezeichneter späterer Innenabschluss beweist dagegen keinen tiefen Einwurffang. Gibt es unter
den geprüften Stationen keinen geeigneten Kandidaten, wird keine sichere Option behauptet;
die bisherige Einwurfplanung bleibt dann bestehen. Eine vollständige gemeinsame Planung von
Freilaufen, Passverteidigung und Druck beim Innenfang bleibt offen.

Grundlagen: WABC Level 3, Team 2.5.1, S. 223 und 226 (Baseline Out of Bounds, Safety Catch),
und Level 2, Team 1.1.2, S. 228 (Hilfe im Low Post und Rückpass an den Perimeter).
Ein Corner-Zwang ist daraus nicht abzuleiten. Fangabstände und Auswahlgewichte sind eigene
Heuristiken; statische Korridore beweisen keine sichere Anspielbarkeit gegen bewegte Verteidiger.
Der Vergleich verwendet identische Eingaben für Ausgangsstand und Kandidat; die visuelle
Nutzerabnahme steht aus. Details stehen im [Iterationsbericht](inbound-reception-iteration.md).

### Ball-Reversal und Anschluss an den Abschluss

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
Belegte Blocks und bewegte Abschlüsse brauchen ihren eigenen Kontext. Ein automatischer Vergleich
von Abständen ersetzt keine visuelle Nutzerabnahme; der [Iterationsbericht](offense-iteration.md)
beschreibt die geprüfte Stichprobe und die Grenzen der Messung.

Eine bloße Abwertung enger Passempfänger erzeugt noch keine Wurfchance. Ballbewegung,
Freilaufen und defensive Reaktionen müssen zusammen geplant und beim Fang sowie beim
anschließenden Wurf bewertet werden. Das umfasst Drive-and-Kick, Seitenwechsel und Extra Pass,
Relocation, Off-Ball-Screens sowie Pick-and-Roll/-Pop. Ein pauschaler Ausschluss unbelegter Screens
wurde als zu enge Modellgrenze verworfen: Wie andere ergänzte Wege dürfen sie schematisch
entstehen, ohne als tatsächlich gespielter Spielzug zu gelten.

Direkte Wege zum Ende eines Cuts können durch den Blocksteller führen. Erst ein stationärer
Block mit erreichbarem Umweg für den Verteidiger oder einer räumlich möglichen Übernahme
begründet eine Screening-Variante. Die Abfolge aus seitlichem Anlauf, Nutzung und Abrollen/-poppen
muss getrennte Räume lassen. Ein Switch verändert die weiteren Zuordnungen, nicht die
vorherigen Positionen; eine pauschale Ausnahme von stabilen Matchups wäre zu weitreichend.
Optionale kleine Spacing-Korrekturen dürfen einer gemeinsamen Angriffsplanung weichen,
reservierte Rebound- und Folgebewegungen dagegen nicht.

Ein Fangabstand allein reicht nicht: Der Ballflug gibt der Defense Zeit zur Rückkehr, und auch
Aufnehmen und Wurfvorbereitung verbrauchen den Vorteil. Planung und Abschlussanimation müssen
vergleichbare Reaktions- und Bewegungsgeschwindigkeiten verwenden. Ein verspäteter Closeout
ist eine schematische Annahme; feste Reaktionszeiten belegen keine tatsächliche Defensivleistung.
Körpermittelpunkte dienen der räumlichen Prüfung, während ein gemeinsamer Handversatz nur den
sichtbaren Ballflug bestimmt. Andernfalls kann eine Feldspiegelung die taktische Bewertung ändern.
Reservierte Folgebewegungen brauchen dieselbe Positionsprognose in Auswahl und Ausführung.
Ein weiterlaufender Empfänger bei statischer Prognose lässt seinen Verteidiger scheinbar grundlos
zurück. Ein pauschales Verbot jeder Zonenquerung verhindert außerdem erreichbare Screen-Anläufe
und Rolls; maßgeblich ist der zusammenhängende Aufenthalt in abgebildeter Spielzeit.
Die visuelle Nutzerabnahme des erweiterten Repertoires steht aus.

Beim belegten Assist muss der letzte Pass vom Assistgeber kommen. Sein Ballflug und der Closeout
laufen gemeinsam; ein zusätzlicher Pass gehört davor und setzt erreichbare Stationen und genügend
Zeit voraus. Ein Shot-Clock-Verstoß kann mit engerem Druck am Ball dargestellt werden, belegt
aber weder einen Steal noch die konkrete Ursache für den ausbleibenden Abschluss.

Grundlagen: [WABC Level 1](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-level-manuals-level-1-eng.pdf),
Team 2.1.4–2.1.5 und 2.2 (Ball Reversal, Receivers' Principles, Screens),
[WABC Level 2](https://assets.fiba.basketball/image/upload/documents-corporate-wabc-coaching-manual-level-2-eng.pdf),
Player 2.1.2 (Turn Out Cuts), [Jr. NBA, Kick Pass](https://jr.nba.com/basketball-practice-plans/starter/page/3/)
und [Jr. NBA, Extra Pass](https://jr.nba.com/basketball-practice-plans/rookie/page/7/).

## Bonus und Teamfouls

Der abschließende Boxscore-Bonuszustand eignet sich nicht für frühere Replay-Momente. Die Anzeige
muss aus den bisherigen Foulereignissen entstehen und am Ereignisanker wechseln, damit Seeking
denselben Zustand ergibt. Ein `inpenalty`-Qualifier an einem späteren Foul belegt nicht den genauen
früheren Eintrittszeitpunkt. Nach ausgeschöpfter Freifoulquote gilt der Bonus für das gegnerische
Team bereits vor dem nächsten Foul. In den letzten zwei Minuten genügt dafür das erste dort
gezählte Teamfoul; technische, gewöhnliche offensive und doppelte Fouls verbrauchen keine Quote.

Grundlage: [NBA Rule 12B, Sections V–VIII](https://official.nba.com/rule-no-12-fouls-and-penalties/)
und [WNBA 2026 Rule 12B, Sections V–VIII](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf).
Die Ableitung setzt vollständige und korrekt klassifizierte Foulereignisse voraus; sie entscheidet
keine Freiwurfstrafe neu.

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

Eine stabile Zuordnung innerhalb eines Angriffs darf spätere belegte Kontakte nicht blockieren.
Nach einem Offensivrebound kann derselbe Verteidiger einen anderen Angreifer beim Wurf foulen,
obwohl eine frühere Blockbeteiligung seine ursprüngliche Zuordnung festgelegt hat. Das aktuelle
Kontaktpaar muss bereits vor Pass und Drive berücksichtigt werden; ein Tausch der beiden
betroffenen Zuordnungen erhält die eindeutige Verteilung. Nur die letzte Kontaktanimation zu
verlängern verdeckt den falschen Vorlauf. Die verbleibende Kontaktannäherung benötigt zusätzlich
ein zur Strecke passendes Zeitfenster. Der ergänzte Zuordnungswechsel bleibt schematisch und
belegt keinen tatsächlich gespielten Switch.

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
