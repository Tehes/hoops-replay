# Hoops Replay — Produktkontext und Entwicklerübergabe

Stand: 24. Oktober 2026. Diese Datei hält die Entscheidungen und den geprüften Stand des
ursprünglichen Entwicklungsdialogs fest. Sie soll zusammen mit dem Code eine Weiterentwicklung
ermöglichen, ohne Zugriff auf diesen Chat zu benötigen.

## Zuerst lesen

1. `AGENTS.md`: verbindliche Arbeits- und Coderegeln.
2. Diese Datei: Produktziel, getroffene Entscheidungen, Umsetzung und Grenzen.
3. `README.md`: lokale Ausführung und Prüfungen.
4. Die drei Replay-Module und beide Referenzdatensätze vor fachlichen Änderungen.

Diese Datei bei Änderungen am Produktkonzept, Datenvertrag oder Implementierungsstand mitpflegen.
Beschlossene Anforderungen, vorhandene Implementierung und mögliche nächste Schritte getrennt halten.
Offene Ideen sind keine Erlaubnis, den Umfang selbstständig zu erweitern.

## Was wir bauen

Ein schematisches Court Replay, mit dem man ein abgeschlossenes NBA-Spiel erneut „anschauen“ kann.
Play-by-Play liefert die Ereignisse und ihre Reihenfolge. Boxscore und ergänzende verfügbare Feeds
liefern Spieler, Aufstellungen und weitere Hinweise. Daraus entstehen nachvollziehbare Bewegungen
von Spielern und Ball auf einem vollständigen Basketballfeld.

Es gibt ausdrücklich keinen Anspruch auf eine realistische Rekonstruktion aller zehn tatsächlichen
Spielerpositionen. Das Produkt nutzt belegte Ereignisse und ergänzt die Lücken durch erkennbare,
basketballtypische Annahmen. Es ist keine Video-Wiedergabe und kein Ersatz für Tracking-Daten.

Das Interesse gilt zunächst dem Erlebnis: Kann man einen Spielverlauf auf diese Weise verständlich
und unterhaltsam verfolgen? Ein endgültiger Anwendungsfall oder ein Geschäftsmodell ist noch nicht
festgelegt. Der Nutzer findet den Prototyp interessant, möchte aber weiter erkunden, was daraus wird.

## Beschlossene Produktentscheidungen

- Eigenständige HTML-Seite, ausschließlich Replay und dazugehörige Steuerung. Derzeit keine Menüs,
  keine zusätzlichen Inhaltsbereiche und kein Tickertext als tragende Erklärung des Spielverlaufs.
- Ganzes Spielfeld, waagerecht. Logo und Farben in den Zonen machen den Homecourt erkennbar.
- Spieler als Trikots in Teamfarben mit Rückennummern. Namen als kleine Badges oder Overlays;
  die aktuelle Umsetzung zeigt sie unter anderem beim Antippen eines Trikots.
- Treffer werden durch Kreise und direkte Werte wie +1, +2 oder +3 am Wurfort erkennbar.
  Fehlwürfe bekommen Kreuze. Fouls und andere Ereignisse erhalten passende Symbole auf dem Feld.
- Markierungen verschwinden nach kurzer Replay-Zeit, damit der Court übersichtlich bleibt.
  Pause und Seeking müssen ihre Sichtbarkeit konsistent erhalten.
- Dunk, Layup und weitere Wurfarten sollen sichtbar unterschiedliche Animationen erhalten.
  Ein gemeinsamer Standard-Wurfbogen für sämtliche Abschlüsse reicht nicht.
- Die vollständigen Daten eines abgeschlossenen Spiels dürfen vorab analysiert werden.
  Ein späteres Foul, ein Steal oder ein Block darf bereits frühere schematische Matchups beeinflussen.
  Das ist bewusst erlaubt; es handelt sich nicht um eine kausale Live-Simulation.
- Vanilla HTML/CSS/JavaScript, ohne Framework, zusätzliche Dependencies oder Build-Schritt.
- Datenfeeds dürfen weiterhin vom Deno-Deploy-Backend des Spielplans kommen.
- Langfristig ist etwa replay.nba-spielplan.de mit einer Verknüpfung aus dem Spielplan denkbar.
  Domain, Hosting und konkrete Integration sind noch nicht eingerichtet oder abschließend beschlossen.

## Fachliche Rekonstruktionsregeln

| Situation | Vereinbarte schematische Darstellung |
| --- | --- |
| Feldwurf mit Koordinaten | Aufgezeichnete Wurfposition als Anker, passende Bewegung und Ballflug ergänzen. |
| Freiwurf | Bekannte Freiwurflinie und plausible Aufstellung, ohne behauptete gemessene Spielerpositionen. |
| Auswechslung | Spieler an der Außenlinie austauschen und den Formationsplatz übernehmen lassen. |
| Formation | PG/SG/SF/PF/C als Grundaufstellung; Positionsschema statt behaupteter Momentaufnahme. |
| Verteidigung | Mann gegen Mann; bekannte Kontakte helfen, passende Gegenspieler vorab zuzuordnen. |
| Nach einem Treffer | Einwurf hinter der Grundlinie, Ball zum PG, über die Mittellinie in die Formation. |
| Defensiver Rebound oder Steal | Besitzwechsel und Bewegung in die Gegenrichtung, gegebenenfalls Outlet zum PG. |
| Assistierter Abschluss | Ball zum Assistgeber und anschließend zum Schützen. Ohne Assist direkt zum Schützen. |
| Tip-off | Sprungball am Mittelkreis mit den identifizierten Beteiligten. |
| Heave ohne genaue Position | Ungefähren plausiblen Ausgangspunkt aus Distanz, Korbrichtung und Kontext ableiten. |
| Foul am Ball | Ballbesitz des Gefoulten vorher plausibel herstellen; Täter und Opfer zusammenführen. |
| Foul ohne klaren Ballbezug | Letzte bekannte schematische Position oder Formation verwenden. |

Nicht jedes Foul ist ein Foul am Ball. On-ball/off-ball ist eine kontextabhängige Interpretation.
Keine pauschale Gleichsetzung einführen. Auch „letzte bekannte Position“ kann bereits schematisch
sein und darf später nicht als gemessenes Tracking behandelt werden.

Diese Tabelle beschreibt das Produktziel. Die konkrete Umsetzung enthält Vereinfachungen:
beispielsweise werden manche Besitzübergaben über interpolierte Owner-Wechsel statt über einen
separat physikalisch simulierten Pass dargestellt. Die vorhandene Choreografie ist ausbaufähig.

## Aktueller Repository-Stand

Repository: https://github.com/Tehes/hoops-replay, Standardbranch bei der Übergabe: `master`.
Der eigenständige Replay wurde mit Commit `738b38f` aus `Tehes/nba-spielplan` übernommen.
Der ursprüngliche Prototyp war dort noch uncommitted; eine frühere Replay-Commit-Historie wurde
entsprechend nicht übernommen. Das Starter-Template bleibt in der Git-Historie erhalten.

Der lokale Checkout bei der Übergabe liegt unter
`/Users/Tehes/Documents/design/NonPrint/Projekte/hoops-replay`.
Dieser Pfad und laufende Server sind maschinenspezifisch und keine Voraussetzung des Projekts.
Im alten Spielplan wurden die übertragenen Prototyp-Dateien und ihre README-Ergänzung entfernt;
sein Arbeitsverzeichnis war danach sauber. Die gemeinsam genutzten Teamlogos bleiben dort erhalten.
Der alte Pfad replay.html wird nicht mehr bereitgestellt. Der neue Einstieg ist index.html.

Ungenutzte Starter-Dateien für Beispiel-API, PWA, Service Worker und Beispiel-App wurden im neuen
Repo entfernt. Die vorhandenen AGENTS-Regeln, LICENSE.txt, PROJECT-LICENSE-KIT.txt und .nojekyll
wurden erhalten. Die Lizenz nicht beiläufig ändern; das Lizenz-Kit ist kein bereits ausgeführter
Lizenzwechsel. Es gibt im Replay aktuell weder Service Worker noch Analytics.

### Enthaltene Referenzspiele

Die folgenden Werte beschreiben die gebündelten Snapshots, nicht einen bei jedem Start frisch
geprüften NBA-Datenstand. Beide gehören laut Snapshot zur Saison 2026–27.

| ID | Spiel | Datum im Snapshot (UTC) | Endstand | Aktionen | Szenen | Replay-Dauer |
| --- | --- | --- | --- | --- | --- | --- |
| 0022600007 | DEN bei OKC | 2026-10-23 01:30 | 84:96 | 613 | 462 | 1392,113 s |
| 0022600008 | NYK bei BOS | 2026-10-23 23:00 | 103:107 | 563 | 434 | 1363,758 s |

Ohne Parameter startet DEN–OKC. `?game=0022600008` startet NYK–BOS mit Boston-Homecourt.
Unbekannte IDs fallen aktuell auf DEN–OKC zurück. Der Parameter ist keine allgemeine NBA-Spielsuche.
Die Replay-Dauer ist eine verdichtete Animationsdauer und entspricht nicht 48 Minuten Spielzeit
oder der tatsächlichen Dauer der Übertragung.

### Datenvertrag und Quellen

`data/replay-<gameId>.json` enthält auf oberster Ebene:

- `gameId`, `date`, `arena`, `season`.
- `sources`: ursprüngliche Play-by-Play- und Boxscore-URLs, Roster-URLs, Erfassungsdatum.
- `teams`: auswärts zuerst, heim zweitens; `id`, `code`, `name`, `home`, `score`, `players`.
- Pro Spieler: `id`, `name`, `number`, `position`, `starter`, `minutes`.
- `actions`: übernommene Ereignisfelder einschließlich `actionNumber`, `orderNumber`, `period`,
  ISO-Dauer `clock`, `actionType`, `subType`, optional `descriptor`/`qualifiers`, `teamId`, beteiligte
  Personen-IDs, `x`/`y`, `isFieldGoal`, `shotResult`, `scoreAway`/`scoreHome` und `possession`.
  Nicht jedes Ereignis enthält alle diese Felder; nicht jeder Wert ist belegt.

Die Dateien sind für den Replay aufbereitete Snapshots, keine vollständigen unbearbeiteten
Boxscore-Responses. Ein Import-/Normalisierungsskript ist aktuell nicht im Repo enthalten.

Quellmuster in den Snapshots:

- https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_0022600007.json
- https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0022600007.json
- Entsprechende URLs für 0022600008 sowie offizielle Teamseiten stehen direkt in `sources`.

Das verwendete Schema entspricht dem modernen liveData-Feed. Für Legacy-/Stats-Play-by-Play
existiert kein Adapter und keine dokumentierte Austauschbarkeit. Neue Feeds an einer klaren Grenze
normalisieren, statt ihre unterschiedlichen Koordinaten- oder Ereignisformate ungeprüft zu mischen.

Wichtig: `actionNumber` ist eine Ereignis-ID, keine verlässlich monotone Reihenfolge.
`buildScenes()` sortiert die vorhandenen Snapshots nach `orderNumber`. Bei weiteren Quellen deren
Ordnung explizit prüfen und erhalten; niemals ersatzweise nach actionNumber sortieren.
Gleichzeitige Ereignisse können fachlich zusammengehören, sind aber nicht pauschal Duplikate.
Das Feed-Feld `jumpBallRecoverdPersonId` ist tatsächlich so geschrieben und wird so gelesen.

Nur Feldwürfe mit belegtem x/y erhalten eine gemessene Wurfposition. Die Engine verlangt für
`isFieldGoal` endliche Koordinaten. Freiwürfe, Fouls, Rebounds usw. erhalten meist abgeleitete Orte.
Heaves werden explizit aus Distanz und Korbrichtung angenähert. Nicht aus jedem vorhandenen oder
auf null gesetzten Koordinatenfeld einen verlässlichen Ort ableiten.

### Architektur und wichtige Einstiegspunkte

- `index.html`: ausschließlich Court/Scoreboard/Controls; Timeline mit `step="0.001"`.
- `css/replay.css`: Layout und Darstellung.
- `js/replay.js`: Daten laden, Teamfarben und vier lokale Logos, Canvas zeichnen, Wiedergabe,
  Keyboard, Namen und Resize. `init()`, `render()`, `seek()`, `tick()` sind zentrale Einstiegspunkte.
- `js/replay-engine.js`: `compileReplay(data)` berechnet Szenen, Keyframes, Lineups, Besitz,
  Matchups, Marker, Angriffs- und Viertelgrenzen. `getReplayFrame(replay, time)` interpoliert daraus
  den Zustand zu einem beliebigen Zeitpunkt. Kein Netzwerk-/DOM-Code in der Engine.
- `js/replay-shots.js`: `getShotStyle(action)` klassifiziert Wurffamilie und Descriptor-Merkmale;
  `animateShot()` baut Bewegungen, `flyBall()` tastet Ballflug vorab ab, `landPlayers()` setzt Posen zurück.

Der Court misst im Engine-Koordinatensystem 94 × 50. Reguläre Feed-Wurfkoordinaten werden mit
x × 0,94 und y × 0,5 umgerechnet. Körbe liegen bei x 5,25 / 88,75 und y 25.
Die Canvas-Welt umfasst 110 × 68 einschließlich Rand und wird um (8,9) versetzt.
Eigene Änderungen nicht mit halbfeldbezogenen Legacy-Koordinaten verwechseln.
Die Korbrichtung wechselt zur Halbzeit anhand Heimteam und Periode; dies ist eine Schema-Annahme.

Szenen verbinden unter anderem zugehörige Blocks mit Würfen, Steals mit Turnovern sowie
Offensivfouls mit Turnovern, damit dieselbe Aktion nicht doppelt abgespielt wird.
Zeitgleiche Auswechslungen werden zusammengefasst. Matchups schauen innerhalb des Angriffs voraus;
bekannte Kontakte haben Vorrang, übrige Verteidiger werden nach Formationsplätzen zugeordnet.
Eingewechselte Spieler übernehmen den Slot des ausgewechselten Spielers. PG meint im Angriff den
aktuellen Spieler im ersten Lineup-Slot, nicht eine stets aus dem Feed bestätigte Ballführerrolle.

Der Score wird aus den Ereignisständen übernommen. Neue Animationen dürfen Zeitpunkt und Ergebnis
des eigentlichen Ereignisses nicht versehentlich verschieben. Marker, Ballflug, Posen und Score
müssen auch bei direktem Seeking konsistent sein, ohne zuvor alle Animationen abgespielt zu haben.

### Vorhandene Animationen und Ereignisse

Wurffamilien: Sprungwurf, Layup, Dunk, Hook und Heave. Ergänzende Descriptor-Merkmale: Alley-oop,
Tip, Putback, Reverse, Finger Roll, Floater, Bank, Running, Driving, Cutting, Pull-up, Step-back,
Fadeaway und Turnaround. Merkmale werden kombiniert; „37 Profile“ bezeichnet die in den beiden
Referenzspielen vorkommenden Kombinationen, nicht eine vollständige Liste aller NBA-Wurfvarianten.

Umgesetzt sind außerdem Rebounds, Freiwürfe, Fouls, Turnover/Steals, Auswechslungen, Sprungbälle,
Viertel- und Spielende, Auszeiten und weitere Regelverstöße. Beispiele für Sonderbehandlungen:

- Technischer Freiwurf behält den vorherigen Ballbesitz und erzeugt keinen normalen Rebound;
  Positionen werden danach wiederhergestellt.
- Letzter regulärer Fehlfreiwurf lässt einen anschließenden Rebound zu; Zwischenfreiwürfe bleiben
  beim Schützen. And-one-/Besitzkontext darf keinen unberechtigten Gegenangriff erzeugen.
- Alley-oop mit freiem Lob und Abschluss am Korb; Tip/Putback mit direktem Folgeabschluss ohne
  zwischengeschalteten normalen Aufbau oder Assistpass.
- Bankshots über das Brett; Step-back/Fadeaway/Turnaround mit eigener Bewegung oder Pose.
- Shooting Foul, Charge, Loose-ball, technisches Foul, Traveling, Shot-clock, Out-of-bounds,
  Lost-ball, offensives Goaltending, Kicked-ball und Challenge haben spezifische Behandlung.

Viele Ereignisse teilen sich trotzdem schematische Zweige oder generische Symbole. Es gibt keine
Garantie, dass alle NBA-actionTypes, Descriptors und Kombinationen bereits fachlich vollständig
abgedeckt sind. Neue Aktionen anhand tatsächlicher Daten prüfen, nicht aus dieser Liste ableiten.

### Steuerung

Play/Pause; 0,5×/1×/1,5×/2×/4×; Timeline; Viertelsprünge; vorheriger/nächster Angriff.
Leertaste und Pfeiltasten; Trikot antippen für Namen. Play am Ende startet von vorn.
Marker altern in Replay-Zeit, nicht in unabhängigen Wall-clock-Timern.

## Verifikation bei der Übergabe

Beim Umzug am 24.10.2026 liefen `deno fmt --check`, `deno check`, `deno lint` für die Replay-Dateien
und `git diff --check` erfolgreich. Beide Spiele wurden im neuen Checkout über Chrome MCP auf
Port 5501 geladen: lokale Assets, richtige Homecourts, Endstände FINAL 84:96 und 103:107,
Restart nach Spielende und keine Warnungen/Fehler in der geprüften Browserkonsole.
Dies ist keine Safari-/iPhone-Abnahme und keine Prüfung einer öffentlichen Deployment-URL.

Ein zusätzlicher temporärer Deno-Audit prüfte 10.276 Keyframes in 896 Szenen und 37 Wurfprofilen
beider Spiele ohne Fehler. Geprüft wurden unter anderem endliche Spieler-/Ballpositionen und Posen,
Lineups, Score-Abfolge, Zuordnung der Aktionen, gültige Ballbesitzer, Schussorte, Landungen,
Lob/Tip/Putback/Bankshot-Eigenschaften sowie technische Freiwürfe. Das Audit-Skript war ein temporäres
Werkzeug außerhalb des Repos und ist keine mitgelieferte Test-Suite. Ein neuer Checkout darf sich
nicht auf Dateien unter /tmp oder auf den ursprünglichen Chat verlassen.

Die reproduzierbaren Befehle und eine manuelle Checkliste mit konkreten Spielsituationen stehen
in README.md. Beim Prüfen direkt zum Ende scrubben: Die Engine rundet Szenenzeiten auf drei
Nachkommastellen. `step="0.01"` würde für diese Dauern den exakten Endpunkt verfehlen; deshalb
Timeline-Schritt 0.001 beibehalten oder bei einer Änderung bewusst gleichwertig lösen.

## Grenzen und noch offene Arbeit

- Nur zwei lokale Spiele, vier Teamfarben/Logos, vier Viertel-Buttons. Keine Auswahl beliebiger
  Spiele, keine allgemeine Roster-/Feed-Pipeline und keine automatische Aktualisierung.
- Verlängerung ist nicht abgesichert: Viertellänge in der Kompilierung ist derzeit 720 Sekunden,
  UI/Quarter-Handling ist auf vier Viertel ausgelegt. Nicht als OT-Unterstützung bezeichnen.
- Die Engine setzt unter anderem einen Sprungball mit verwertbaren Beteiligten, fünf Starter pro
  Team, passende PG–C-Starterpositionen, bekannte Personen und zusammenpassende Substitutionen voraus.
  Andere Spiele, fehlende Koordinaten, Korrekturen und seltene Events können diese Annahmen verletzen.
- Rebounds und weitere kontaktlose Ereignisse haben nur plausible abgeleitete Positionen.
  Die Grundformation ist statisch; reale Sets, Zonenverteidigung und exakte Off-ball-Wege fehlen.
- Die Wurfklassifikation nutzt derzeit strukturierte Subtypes und Descriptor-Text. Unbekannte
  Schreibweisen oder neue Kombinationen können bei der allgemeinen Animation landen.
- Keine öffentliche Bereitstellung, kein Custom-Domain-Setup und kein Live-Datenanschluss im Rahmen
  dieser Übergabe eingerichtet. Externe Änderungen nach diesem Datum bei Bedarf frisch prüfen.
- TEAM_COLORS, REFERENCE_GAMES und UI-Annahmen vor einer Verallgemeinerung gemeinsam prüfen.
- Keine neue Produkt-Roadmap als beschlossen behandeln. Der nächste Nutzerauftrag bestimmt den Umfang.

## Deno-Backend und mögliche spätere Integration

Das bestehende Backend gehört weiterhin zu `Tehes/nba-spielplan`, dort `api/main.js`.
Die dort konfigurierte Basis-URL bei der Übergabe ist https://nba-spielplan.tehes.deno.net.
Es gibt unter anderem `/playbyplay/<gameId>` und `/boxscore/<gameId>`; aktuelle Antwortformate,
Verfügbarkeit und Cache-Verhalten vor einer Anbindung prüfen. Keine Abhängigkeit vom lokal
benachbarten Spielplan-Checkout in das Replay einbauen.

Die vorhandene Origin-Liste erlaubt bei der Übergabe https://tehes.github.io,
https://nba-spielplan.de und http://127.0.0.1:5500. Port 5501 und ein eigener Replay-Subdomain-Origin
sind darin nicht enthalten. Eine spätere Verbindung braucht eine gezielte Änderung und Deployment
im Backend-Repo. Der derzeitige Replay auf 5501 funktioniert ohne diese Änderung, da er ausschließlich
lokale Snapshots lädt. Backend-Code, Zugangsdaten oder Betriebszustand wurden nicht übernommen.

Denkbare nächste Schritte, ausdrücklich noch keine beauftragte Umsetzung: reproduzierbarer Import
weiterer abgeschlossener Spiele; robuste Behandlung bislang unbekannter Actions; gezielte visuelle
Verbesserungen; OT; danach bei Bedarf Datenanbindung, Hosting und Integration aus dem Spielplan.
Vor solchen Änderungen den bestehenden Prototyp zeigen/prüfen und seinen bewusst schlanken Umfang
bewahren. Keine Menüs, Statistikseiten, Analytics, Frameworks oder PWA-Funktionen ungefragt ergänzen.
