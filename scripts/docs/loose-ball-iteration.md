# Turnover und Loose-Ball-Foul: Fachliche Iteration

Status: begrenzter lokaler Kandidat einer fachlichen Iteration nach
[PROJECT.md](../../PROJECT.md#bewertung-und-weiterentwicklung-im-zielbild).
Ausgangscode: Commit `193d5c3`; die dortige Paarreservierung ist eine unvollständige Teilkorrektur.
Der Kandidat ergänzt einen gemeinsamen Ball-/Kontaktablauf. Technische und visuelle Evidenz
stehen unten; die visuelle Nutzerabnahme ist offen.

## Beleg und fachliche Grenze

Auslöser: `0022600002`, PHI–NYK, Einstieg über Aktion 267. Der problematische Kontakt folgt
bei Q2 7:03 in den Aktionen 271/272:

| Ereignis | Belegt | Nicht belegt |
| --- | --- | --- |
| 271 | Harts Turnover, `subType: "bad pass"` | Passziel, Ballweg, Fehlpassort, Abfälschung |
| 272 | Harts persönliches Foul, `descriptor: "loose ball"`, Caldwell-Pope als Gefoulter; gleiche Periode/Uhr, `inpenalty`, `2freethrow` | Kontaktort, individuelle Laufwege, Art des Körperkontakts |

Der Feed enthält keine Ortskoordinaten für diese beiden Ereignisse. Die gleiche Uhr stützt einen
gemeinsamen Ablauf, liefert aber keine messbare Dauer seiner Teilbewegungen. `possession` beim
Foul darf nicht als gefangener Ball bei Caldwell-Pope interpretiert werden.

[NBA Rule 4, Definitionen von Foul und Team Control](https://official.nba.com/rule-no-4-definitions/)
und [Rule 12B, Section VIII](https://official.nba.com/rule-no-12-fouls-and-penalties/)
begründen die entscheidende Bedingung: Beim Loose-Ball-Foul besteht keine Teamkontrolle.
Die Strafe folgt dem erfassten Ruling und den anschließenden Ereignissen. Daraus folgt weder,
dass beide Spieler zwingend zum Ball laufen, noch eine bestimmte Kampf-, Fall- oder Hechtbewegung.
Solche Bewegungen dürfen nicht als rekonstruierter Spielablauf behauptet werden.
WNBA 2026 wurde separat geprüft: Rule 4, Sections IV/XVI, beschreibt dieselbe hier benötigte
Abgrenzung; Rule 12B, Section VIII, beschreibt die Loose-Ball-Foul-Strafen
([offizielles Regelwerk](https://cdn.wnba.com/sites/4/2026/05/2026-WNBA-Official-Rule-Book.pdf)).
Die Umsetzung übernimmt weiter die belegten Strafen und berechnet keine zusätzlichen Pfiffe.

Rule 4, Section XVI, unterscheidet Teamkontrolle von einem individuellen Ballhalter:
Ein Pass allein beendet Teamkontrolle nicht; eine gegnerische Ablenkung kann sie beenden,
ohne einen kontrollierten Ballgewinn zu erzeugen. Der Kandidat zeigt deshalb eine solche
schematische Berührung vor der freien Ballphase. Das ist keine belegte individuelle Deflection
und kein zusätzlicher Steal. `ball.owner === null` allein wäre als Regelbegründung unzureichend.

Das offizielle NBA Video Rulebook zeigt als unterschiedliche Kontaktbeispiele
[Festhalten beim Rebound](https://videorulebook.nba.com/archive/clamp-defender-clamps-opponent-during-rebounding/)
und [unerlaubtes Hineinhechten](https://videorulebook.nba.com/archive/loose-ball-foul-takes-out-opponents-legs-during-loose-ball-2/).
Die dortigen Erläuterungen begründen keine einheitliche Kampfbewegung für alle Loose-Ball-Fouls.
Insbesondere ist kein zwingender gemeinsamer Lauf beider Spieler zum Ball abzuleiten.
Das Replay verwendet nur einen kurzen Kontakt im Ballbereich; Hände, Griffe und Stürze fehlen.

## Zielursache im Ausgangscode

Die allgemeine Ereignisfolge ist in `compileScene()` als getrennte Turnover- und Foulszene geplant:

1. `planMatchups()` reserviert inzwischen das Paar für ein unmittelbar folgendes zeitgleiches
   Loose-Ball-Foul. Das verkürzt nur den späteren Kontaktweg.
2. Der allgemeine Turnover-Zweig übergibt Hart den Ball. Für `subType: "bad pass"` ohne Stealer
   und ohne `out-of-bounds` fehlt hier eine Fehlpassanimation. `releaseBall()` setzt den freien
   Ball unmittelbar neben den bisherigen Halter, ohne eine erkennbare Passrichtung.
3. Der Turnover-Zweig setzt bereits gegnerischen Besitz und `restart: "sideline"`.
   Das beschreibt eine Fortsetzung, ersetzt aber keinen sichtbaren Ballgewinn. Beim vorliegenden
   Folgefoul muss die gemeinsame Live-Ball-Phase vor dem Pfiff davon getrennt bleiben.
4. Der Loose-Ball-Foul-Zweig setzt den Fouler neben den Gefoulten und den Ball an deren
   Kontaktpunkt. Damit bestimmt die Foulpose nachträglich den Ballweg; Caldwell-Pope hält
   in diesem kurzen Kontaktabschnitt seine Position.

Browser-/Compilerprüfung des Ausgangsstands mit Chrome MCP auf `127.0.0.1:5500`:
Am Turnover bleibt der freigegebene Ball bei etwa (63,48; 31,38) Fuß. Im Foul wandert er
auf (64,78; 31,23), während Hart rund 1,74 Fuß zum Kontakt geht. Das ist kein sichtbarer Fehlpass
mit anschließender Reaktion auf den freien Ball. Die kürzere Weglänge erfüllt allein das Produktziel nicht.

Einordnung: nachgewiesene Planungslücke, kein nachgewiesener Feedfehler. Die vorliegenden
Tests und Audits können trotz dieser Darstellung bestehen; ihre Abdeckung ist enger als das Ziel.

## Hypothese und fokussierter Hebel

Wenn verknüpfte Ballverluste und Loose-Ball-Fouls einen gemeinsamen räumlichen Ablauf erhalten,
entsteht der Kontakt aus dem sichtbaren Ballverlust statt aus einer isolierten Foulpose.

Umgesetzter Geltungsbereich: direkte Turnover-/Loose-Ball-Foul-Folgen mit gleicher Periode und Uhr,
bekannten aktiven gegnerischen Kontaktpartnern und ohne widersprechenden kontrollierten Fang
oder bereits toten Ball. Gleiche Uhr allein genügt nicht, insbesondere bei Aus-Turnovern oder Steals.
Keine Spieler-, Team- oder GameID-Sonderregel. Nicht verknüpfbare Fälle bleiben ausdrücklich offen.

Gemeinsamer Ablauf:

1. Ereignisse kausal verknüpfen, beide Original-IDs und ihre Anker erhalten.
2. Vom bisherigen Ballhalter einen kurzen plausiblen Fehlpass beziehungsweise Kontrollverlust
   planen. Ein beabsichtigter Empfänger ist nur eine schematische Auswahl, kein neuer PbP-Pass.
3. Eine schematische gegnerische Ballberührung und einen freien Ballweg mit erreichbar geplantem
   Kontaktbereich wählen; die Beteiligten orientieren sich daran. Niemand fängt den Ball
   allein deshalb, weil ihm nach dem Foul das Angriffsrecht zusteht.
4. Kontakt und Pfiff beenden die Live-Ball-Phase. Anschließend die belegten Freiwürfe/Fortsetzungen
   darstellen. Kein zusätzlicher Steal, Rebound, Assist oder Statistikwert.

Betroffene Hebel: Ereignisverknüpfung und begrenzte Ablaufplanung in der vorhandenen Engine;
Ballflug und Bewegungsaufträge nutzen vorhandene Mechanismen. Keine allgemeine Architekturzerlegung,
neuen Endpunkte, Dependencies, UI- oder Analytics-Änderungen.

## Vergleich und Abnahme

Baseline und Kandidat müssen im selben Lauf dieselben einmal geladenen Servereingaben als
unabhängige Kopien erhalten. Spiel-IDs und SHA-256-Fingerabdrücke im Vergleichsbericht erhalten.
Die folgende Bestandsaufnahme ist noch kein A/B-Vergleich und weist keine Verbesserung nach.

Geschützt bleiben gewöhnliche Bad-pass-Steals, Fehlpässe ins Aus, Lost-ball-Turnover,
Loose-Ball-Fouls nach Würfen/Rebounds, offensive Fouls, And-one, Freiwurfserien, Unterbrechungen
und Periodengrenzen. Feste bestehende Vergleichsfälle: `0022600007`:45 (Innenzuspiel),
`0022600144`:56 (Rebound-Vorbereitung), `1042600305`:450–454 (And-one).

Die Auswertung unterscheidet:

- **Korrektheit:** Quelldaten unverändert; Ereignisse, Beteiligte, Spielstand, Uhren, Aufstellungen,
  Ballkontrolle und Strafen bleiben konsistent. Gemeinsamer Audit ohne neue Fehler; deterministisches Seeking.
- **Bewegungsqualität:** Ballabgabe und freier Ballweg sind sichtbar; keine unverbundene neue
  Ballposition im Foul. Wege und Zeitbudget passen zusammen. Nähe am Kontakt ist kein Kollisionsfehler
  und darf nicht durch pauschales Auseinanderdrücken beseitigt werden.
- **Visuelle Plausibilität:** A/B bei gleichem Maßstab und gleichen Ereignisankern: Hart-Fall,
  mindestens ein weiterer Bad-pass-Fall, ein Lost-ball-Fall sowie unveränderte und schlechter gewordene
  Vergleichsfälle, falls vorhanden. Erst den Ablauf vom Ballverlust bis zur Strafe beurteilen.

Akzeptanz verlangt eine verständliche freie Ballphase vor dem Kontakt und unveränderte belegte
Folgen; kürzere Laufwege oder bestandene Invarianten allein reichen nicht. Das Ergebnis kann verworfen
werden. Hypothese, Evidenz, Entscheidung und offene Grenzen anschließend im Learning festhalten.


## Bestandsaufnahme vom 31. Oktober 2026

Der zeitlich gestreute Standardbatch (zehn Spiele je Liga, einschließlich Vor-/Nachsaison)
plus das Auslöserspiel wurde einmal geladen und mit dem aktuellen Compiler geprüft:
21 Spiele, keine Abruf-/Kompilierfehler und keine Fehler der gemeinsamen Replay-Prüfung.
NBA: elf Spiele mit 44 Loose-Ball-Fouls; WNBA: zehn Spiele mit 29.
Die vorherige kompilierte Szene ist in 58 Fällen ein Rebound, in elf ein Turnover,
in drei ein Wurf und in einem eine Auswechslung. Diese Nachbarschaft ist noch keine kausale Verknüpfung.

Neun der elf Turnover-Nachbarschaften haben dieselbe Periode/Uhr. Sie bilden die erste
Vergleichsauswahl. Die Tabelle nennt die Entfernung der Ballpositionen zwischen Foulstart und
Foulereignis, nicht die tatsächliche Weglänge oder einen automatisch bewiesenen Sprung.
Sie dient als Diagnose; eine größere Entfernung allein beweist bei vorhandener Bewegung keinen Fehler.

| Liga | Spiel | Turnover / Foul | Turnoverart | Ball-Endpunktabstand im Foul, Fuß |
| --- | --- | --- | --- | --- |
| NBA | `0012600009` | 524 / 525 | lost ball | 4.16 |
| NBA | `0012600009` | 680 / 681 | bad pass | 14.34 |
| NBA | `0022600123` | 84 / 85 | bad pass | 12.62 |
| NBA | `0022600123` | 268 / 269 | bad pass | 24.19 |
| WNBA | `1022600024` | 232 / 235 | bad pass | 1.94 |
| WNBA | `1022600189` | 368 / 370 | bad pass | 2.87 |
| WNBA | `1042600306` | 62 / 63 | lost ball | 2.18 |
| WNBA | `1042600306` | 471 / 472 | bad pass | 17.84 |
| NBA | `0022600002` | 271 / 272 | bad pass | 1.30 |

Auch mit vorhandener Paarreservierung bleiben große Ballverlagerungen sichtbar, etwa bei
`0012600009`:680/681 und `1042600306`:471/472. Das sind zunächst Diagnosekandidaten,
keine einzeln visuell abgenommenen Fehler. Die aktuelle Änderung kann außerdem nur ein Paar
reservieren, das nicht bereits durch einen früheren Kontakt gebunden ist. Eine neue gemeinsame
Planung muss solche Konflikte erklären, statt frühere belegte Kontakte zu überschreiben.

Eingabefingerabdrücke (normalisierte Eingaben einschließlich Profilen, ohne variable Erfassungszeit;
SHA-256 nach bestehendem Auditverfahren). Es wurden keine Rohfeeds oder Vollspiele gespeichert.
Die Diagnostik lag nur im temporären Arbeitsbereich; diese Aufbereitung bewahrt die Zusammenfassung.

| Spiel | SHA-256 |
| --- | --- |
| `0012600009` | `0e1e5e7bc290ea744828b111080c0d44674761e35bf9b796b1b3c2d89a53706e` |
| `0012600033` | `9482aba63035bd3a9fb2b6810dd5fcef1bf31d5f345ebc031648c46352de545c` |
| `0012600041` | `6862f838371d22e272dab052b61061f43676caa6ab3fb7bfbd0fe5f160c88e3a` |
| `0012600052` | `946c990b6282b9946223498363a06a43cd7482ef6ce4397d72c3c15a39da3c03` |
| `0012600062` | `5d8e919b25c5c7a7e82aecfac3e5c6569d760af19aad6531b345c99db4139432` |
| `0022600007` | `2f1700eb7f3a5ba579b76e196e713d994cd36938094ebc4f050d7d23fd3e0606` |
| `0022600108` | `3c699040e70e6f6e9590210b1ab9c9a04a28a30f019e7d070ca9bb07a3626db7` |
| `0022600123` | `5903a2a61a5f91df2e32ba7ea1acc1521661e2522ea268e4ef0cc59fc0333e0c` |
| `0022600140` | `4ba23817db97c02a59670ca99888e01c2ff1e6affa3ed6ff71d4a02a526b0e05` |
| `0022600024` | `39ea8d2c6249970ee20d18820a0f7ac65a828c2a106c53ee6f03970cdcb111d6` |
| `1012600001` | `ae6d7c2d579513d510405cdd4bc12f22021280ccba81690747b1d635c9eb01b1` |
| `1022600024` | `dafa8e000c08545f1ace573b79ebe9a73676d36c419bc4cf8232c0a8ec22ce92` |
| `1022600065` | `5d51f884b36492d9ddb5d7120ccadc9fc58db96a2ca080b15b65ece5032ace06` |
| `1022600107` | `4a9ae3c7a1d9b0505c815f0220e7191b0f15499f5c878c226e4a153ca461205e` |
| `1022600147` | `7d231a121a17cea92b0d7a165ce936efb9628a11ed18c440627b5e99ea757907` |
| `1022600189` | `041373dbaa1294a3b7a4a31fa52427ae32ff3e3c87728012bd9af759595db637` |
| `1022600228` | `8fab030b9ecad5278da4bf3e7ab3fc485162c881e1b05e98f39ed9b7f4d64545` |
| `1022600270` | `6a099701522d56a293483dd6db77aa86b66d498ddbf57e4ef6b25f80dac2a6e1` |
| `1022600311` | `ce249f984abaa1104079a7a54416c2c0dc44b5e051483d734bac334848fce18f` |
| `1042600306` | `3393885ab16b2bd1755fdaae3edd0dbbd1d73bf5715b6d24c32f99bfc3317ac5` |
| `0022600002` | `0d0a0e371e1d26d8b528260e46c8c3f5a3ed70e914ff0484ee4f815f906a39a5` |


## Kandidat und Ergebnis

Der Vergleich läuft gegen den Ausgangscode auf denselben einmal geladenen 23 Eingaben:
Standardbatch plus `0022600002`, `0022600144` und `1042600305`. Beide Compiler erhalten eigene
Kopien. Die gemeinsame Replay-Prüfung bleibt unverändert. Ergänzende Messungen prüfen getrennt
Ereignis-/Uhr-/Lineup-Signaturen, Halterzustände, Ballkontinuität über die Szenengrenze,
Geschwindigkeit der Kontaktpartner und Seeking.

Alle 23 Spiele bestehen in Baseline und Kandidat ohne zusätzliche Vergleichsfehler.
Sieben Folgen erhalten einen gemeinsamen Ablauf. Zwei der neun ursprünglichen zeitgleichen
Turnover-Nachbarschaften sind wegen belegter Steals ausdrücklich ausgeschlossen:
`1022600024`:232/235 und `1042600306`:62/63. Nicht jede zeitgleiche Nachbarschaft ist ein
unkontrollierter Ball ohne zwischenzeitlichen Ballgewinn.

| Spiel | Turnover / Foul | Ball ohne Halter ab Abgabe bis Ende des Nachlaufens, Replay-Sekunden | Ballverlagerung durch Foulpose, Fuß |
| --- | --- | --- | --- |
| `0012600009` | 524 / 525 | 1.11 | 0.00 |
| `0012600009` | 680 / 681 | 2.27 | 0.00 |
| `0022600123` | 84 / 85 | 1.39 | 0.00 |
| `0022600123` | 268 / 269 | 1.62 | 0.00 |
| `1022600189` | 368 / 370 | 1.00 | 0.00 |
| `1042600306` | 471 / 472 | 1.25 | 0.00 |
| `0022600002` | 271 / 272 | 1.42 | 0.00 |

Die Zeit ohne individuellen Halter beginnt mit der Abgabe. Die eigentliche Phase ohne
Teamkontrolle beginnt erst mit der schematischen gegnerischen Berührung. Die Kontaktpartner
reagieren nach 0,18 Replay-Sekunden und bewegen sich bis zum Foulaufbau mit höchstens acht Fuß
pro Replay-Sekunde; eine gesonderte kurze Kontaktbewegung schließt an. Die numerischen Werte
sind eigene Darstellungsparameter, keine Vorgaben aus dem Regelwerk oder Tracking-Messwerte.

Eine frühe Kandidatenfassung ließ die Beteiligten bei der Ballberührung bereits überlappen.
Sie wurde vor Übernahme korrigiert: Beide Zwischenpositionen und Wege sind nun gemeinsam
abgestimmt. Der gezielte Test prüft Ballberührung, Abstände vor dem Foul, freie Halterzustände,
beide Korbrichtungen, Bad-pass-/Lost-ball-Varianten, Seeking und unveränderte Quelldaten.
Steal, Aus-Turnover und abweichende Uhr sind negative Vergleichsvarianten.

Die bestehenden geschützten Szenen `0022600007`:45, `0022600144`:56 sowie
`1042600305`:450/451/453/454 bleiben im Vergleich bis auf absolute Szenenzeiten identisch.
Die vollständigen vorhandenen Tests bestehen (`deno task test`); `git diff --check` ist sauber.
Es wurden keine neuen Abhängigkeiten oder Runtime-Endpunkte eingeführt.

Chrome MCP auf `127.0.0.1:5500` vergleicht Baseline und Kandidat jeweils aus derselben im
Browser gehaltenen Eingabe und mit demselben App-Renderer: `0022600002`:271/272,
`0012600009`:524/525 (Lost-ball) und `1042600306`:471/472 (weiterer Fehlpass, WNBA).
Ballabgabe, Berührung, Nachlaufen und Kontakt werden an getrennten Zeitpunkten verglichen.
Die Baseline lässt den Ball am Halter stehen beziehungsweise versetzt ihn zum späteren Foul;
der Kandidat verbindet die Ballbewegung und den Kontakt räumlich. Keine Gleichsetzung von
Standbildkontrolle mit einer vollständigen Sichtprüfung aller 23 Spiele.

**Entscheidung:** Als begrenzten lokalen Kandidaten beibehalten; visuelle Nutzerabnahme offen.
Kein technisch nachgewiesener verschlechterter Vergleichsfall in diesem Lauf. Die drei Sichtfälle
belegen keine allgemeine Kollisionsfreiheit und keine vollständige NBA-/WNBA-Regelabdeckung.
Insbesondere bleiben freie Bälle nach Rebounds/Würfen, nicht direkt benachbarte Ereignisse,
fehlende aktive Kontaktpartner und fehlende zulässige Planungsoptionen außerhalb der neuen Animation.
Die Ablenkung und der konkrete Kontakt sind schematisch, nicht aus diesem Feed rekonstruiert.

Zusätzliche Eingabefingerabdrücke der geschützten Vergleichsspiele; die übrigen 21 stimmen mit
obiger Bestandsaufnahme überein:

| Spiel | SHA-256 |
| --- | --- |
| `0022600144` | `f748e1bb6326e09d7a30a6e062a7ae57e88daa82c89e4dcfd341b7141565e60e` |
| `1042600305` | `5a8ba2d13a3a24560531cf9212dc51d43c95d4ddb0839a7c6f69f053f2fe47b4` |
