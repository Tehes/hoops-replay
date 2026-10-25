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

- Die initiale HTML-Seite und ihre Social-Metadaten tragen neutral „Hoops Replay“, kein festes
  Matchup. Description, Open Graph und Twitter Card beschreiben das Projekt allgemein; diese
  Social-Metadaten bleiben auch nach dem Laden neutral. Der Browser-Titel ergänzt nach erfolgreichem
  Laden und Prüfen das Matchup, z. B. `Hoops Replay · TOR @ WAS`.
  Während des Ladens und bei abgelehnten Spieldaten bleiben Scoreboard-Platzhalter und ein
  neutrales Spielfeld ohne Teamlogo, Teamnamen oder Arena sichtbar. Erst erfolgreich geprüfte
  Daten bestimmen Teams, Logos, Court-Farben, Beschriftungen, Score und Spielzeit.
- Eigenständige HTML-Seite mit Replay, zugehöriger Steuerung und einem dezenten englischen
  Fußtext unter der Steuerung. Dieser erklärt echte PbP-Ereignisse und verfügbare Wurfkoordinaten
  als Grundlage sowie schematisch ergänzte Positionen, Formationen, Matchups und Laufwege;
  keine Rekonstruktion aus Tracking-Daten. Keine Menüs oder weiteren Inhaltsbereiche. Eine flache Jumbotron-Anzeige ersetzt das bisherige Scoreboard:
  Score, Viertel und Uhr bleiben dauerhaft sichtbar. Darunter erscheinen ab dem Ereigniszeitpunkt
  Spielerfoto, Name und der originale englische PbP-Text der Szene, bis zum nächsten Ereignis oder
  maximal fünf Replay-Sekunden. Pause und Seeking bestimmen die Anzeige ohne eigene Timer.
  Ohne aktive Aktion zeigt die Fläche das Matchup und Spieldatum (z. B. NYK @ BOS · 23 OCT 2026),
  weiterhin nach America/New_York datiert. Die kleine Spiel-/Datumszeile am Court entfällt.
  Teamereignisse verwenden das Teamlogo;
  fehlt ein Spielerfoto, dient ebenfalls das Teamlogo als Ersatz. Bei zusammengefassten Aktionen
  wird der originale Text der Hauptaktion gezeigt, keine generierte Zusammenfassung.
  Spielerfotos werden ausdrücklich direkt über die Spieler-ID vom NBA-CDN verlinkt:
  https://cdn.nba.com/headshots/nba/latest/260x190/<personId>.png. Keine Fotos im Repo speichern.
  Diese vom Nutzer gewünschte Ausnahme von lokalen Assets gilt für Spielerfotos; Teamlogos bleiben
  lokal. Die Fotos benötigen eine Netzwerkverbindung und zeigen den aktuellen CDN-Stand,
  keine historischen Uniformen. Nicht verfügbare Fotos werden durch das Teamlogo ersetzt.
- Ganzes Spielfeld, waagerecht. Logo und Farben in den Zonen machen den Homecourt erkennbar.
  Außen links steht der vollständige Name des Heimteams aus TEAM_NAMES (Stadt und Team), rechts der Arenaname. Beide Beschriftungen werden
  hochkant gedreht, aber niemals gespiegelt. Unter dem Court steht kein zusätzlicher Arenaname;
  der untere Canvas-Rand ist zugunsten einer näheren Wiedergabesteuerung verkürzt.
  Beide Körbe besitzen eine schematische gepolsterte Stütze hinter der Grundlinie und einen
  Träger zum Brett. Die seitlichen Beschriftungen stehen nahe an den Grundlinien: Teamname unten links,
  Arenaname oben rechts, jeweils außerhalb des mittigen Stützenbereichs. Ring- und
  Brettpositionen im Spielfeld bleiben maßstäblich unverändert. Die Ringe sind orange mit dunkler
  Kontur, damit sie sowohl auf dunklen als auch auf hellen Teamfarben sichtbar bleiben.
- Spieler als ärmellose Basketball-Jerseys mit schmalen Schulterträgern, gerundetem Halsausschnitt,
  seitlichen Armausschnitten und Rückennummern: Heimteam in Weiß mit teamfarbenen Rändern und Nummern,
  Auswärtsteam in seiner bisherigen Teamfarbe, ohne Ausnahmen für Gelb oder Silber.
  Das ist eine bewusste Replay-Konvention, keine Behauptung der echten Uniformwahl des jeweiligen
  Spiels. Logo und Paint behalten ihre Heimteamfarben.
  Namen als kleine Badges oder Overlays;
  die aktuelle Umsetzung zeigt sie unter anderem beim Antippen eines Trikots.
  Keine zusätzlichen Kreise um Ballbesitzer oder ausgewählte Spieler; der Namensbadge genügt.
- Treffer erhalten kleine ausgefüllte grüne Punkte, Fehlwürfe kleine rote Kreuze auf dem Court.
  Diese Wurfmarker werden unterhalb der Trikots gezeichnet, als stünden die Spieler darauf.
  Sie bleiben 4,2 Sekunden Replay-Zeit sichtbar, mit Ausblenden über die letzte Sekunde.
  Direkte Werte wie +1, +2 oder +3 bleiben am Wurfort erkennbar. Alle anderen Ereignisse werden
  im Jumbotron erklärt: keine Ereignis-Icons oder schwebenden Icon-Kästchen auf dem Court.
  Viertelbeginn, Viertelende und Spielende stehen ebenfalls im Jumbotron mit dem bisherigen
  Bannertext als Überschrift und dem originalen PbP-Text darunter, ohne Banner über dem Spielfeld.
  Die Engine behält ihre Ereignismarker und Bannerdaten intern; die Darstellung nutzt auf dem
  Court ausschließlich Wurfmarker und Punktewerte.
- Markierungen verschwinden nach kurzer Replay-Zeit, damit der Court übersichtlich bleibt.
  Pause und Seeking müssen ihre Sichtbarkeit konsistent erhalten.
- Dunk, Layup und weitere Wurfarten sollen sichtbar unterschiedliche Animationen erhalten.
  Ein gemeinsamer Standard-Wurfbogen für sämtliche Abschlüsse reicht nicht.
- Die vollständigen Daten eines abgeschlossenen Spiels dürfen vorab analysiert werden.
  Ein späteres Foul, ein Steal oder ein Block darf bereits frühere schematische Matchups beeinflussen.
  Das ist bewusst erlaubt; es handelt sich nicht um eine kausale Live-Simulation.
- Formationen und verbindende Bewegungen dürfen schematisch ergänzt werden. Konkrete Spielzüge
  wie Pick & Roll, Pick & Pop oder Blockaktionen dürfen nur animiert werden, wenn eine Datenquelle
  sie ausdrücklich belegt. Assist und Wurfkoordinaten allein belegen keinen solchen Spielzug.
- Vanilla HTML/CSS/JavaScript, ohne Framework, zusätzliche Dependencies oder Build-Schritt.
- Ziel für die weitere Entwicklung: `?game=<GameID>` soll ein abgeschlossenes Spiel vom bestehenden
  Deno-Server laden und simulieren können. Alle NBA-Teams benötigen lokale Assets und Farben.
  Schon jetzt muss ein reproduzierbarer Download als lokale JSON-Dateien möglich sein, damit sich
  die Regressionstests um weitere echte Spiele erweitern lassen.
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

Beim Umzug wurden die Starter-Dateien zunächst zu weitgehend entfernt. Die Website-Basis wurde
am 25.10.2026 wieder mit dem Replay zusammengeführt: `css/style.css` enthält die Template-Basis
und anschließend die Replay-Stile; `js/app.js` enthält die Replay-Anwendung und startet sie mit `init()`.
Der HTML-Head erhält Author, Canonical, Open-Graph-URL/-Bild, Icon-Verweise und das ursprüngliche
Umami-Script mit Website-ID `2392a451-203c-4d8a-a4f5-bd7d06f832af` und
`data-domains="tehes.github.io"`. Das erfasst Seitenaufrufe auf GitHub Pages, nicht auf localhost;
es wurden keine eigenen Tracking-Events ergänzt. Die vorhandene Demo dient als Social-Vorschaubild.
Die absichtlich leeren SVG-/Touch-Icon-Platzhalter des Templates werden nicht wieder eingesetzt;
PNG-Favicon und Apple-Touch-Verweis nutzen das vorhandene Projekt-Icon.
Die optionalen Beispiel-API-, PWA- und Service-Worker-Dateien bleiben entsprechend der
Website-Variante der Template-README ungenutzt. Die Replay-Darstellung bleibt dunkel, die
Template-Regeln für Reset, Basis, reduzierte Bewegung und Standalone-Abstand bleiben erhalten.
AGENTS-Regeln, LICENSE.txt, PROJECT-LICENSE-KIT.txt und .nojekyll wurden erhalten.
Die Lizenz nicht beiläufig ändern; das Lizenz-Kit ist kein bereits ausgeführter Lizenzwechsel.

### Enthaltene Referenzspiele

Die folgenden Werte beschreiben die gebündelten Snapshots, nicht einen bei jedem Start frisch
geprüften NBA-Datenstand. Beide gehören laut Snapshot zur Saison 2026–27.

| ID | Spiel | Datum im Snapshot (UTC) | Endstand | Aktionen | Szenen | Replay-Dauer |
| --- | --- | --- | --- | --- | --- | --- |
| 0022600007 | DEN bei OKC | 2026-10-23 01:30 | 84:96 | 613 | 462 | 1361,923 s |
| 0022600008 | NYK bei BOS | 2026-10-23 23:00 | 103:107 | 563 | 434 | 1336,018 s |
| 0022600094 | ATL bei CHA | 2026-10-23 23:00 | 128:81 | 600 | 460 | 1420,665 s |

Ohne Parameter startet DEN–OKC. `?game=0022600008` startet NYK–BOS mit Boston-Homecourt.
Jede explizite zehnstellige GameID lädt Boxscore und Play-by-Play direkt vom bestehenden Deno-Server,
auch wenn ein lokaler Snapshot existiert. Ein vorheriger Import ist nicht erforderlich. Ohne Parameter
bleibt der lokale DEN–OKC-Snapshot der Standard, ohne Backend-Datenabruf. Ungültige IDs,
unvollständige oder inkonsistente Daten führen zur Ladefehlermeldung, ohne anderes Ersatzspiel.
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
  Personen-IDs, optional `shotActionNumber` als Verweis eines Rebounds auf die Wurf-ID, `x`/`y`,
  `isFieldGoal`, `shotResult`, `scoreAway`/`scoreHome` und `possession`.
  Nicht jedes Ereignis enthält alle diese Felder; nicht jeder Wert ist belegt.

Die Dateien sind für den Replay aufbereitete Snapshots, keine vollständigen unbearbeiteten
Boxscore-Responses. `scripts/import-game.js` lädt jetzt beide Rohfeeds vom bestehenden Deno-Server und normalisiert
weitere abgeschlossene Spiele. Die Rohantworten bleiben unter `data/raw/` erhalten. Die ursprünglichen
zwei Snapshots wurden noch ohne diesen Importer erstellt; für sie fehlen die Roharchive im Repo.
Der Saisonwert neuer Importe wird aus dem Spieldatum abgeleitet, nicht als Feed-Feld ausgegeben.
Fehlende oder doppelte Starterpositionen erhalten eindeutige schematische PG–C-Slots; ursprüngliche
Positionen werden dann mit `sourcePosition` und `positionSource: "schematic"` kenntlich gemacht.
Die Teamfarben sind Darstellungs-Paletten, keine behaupteten spielspezifischen Uniformdaten.

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
- `css/style.css`: Template-Basis und anschließend Replay-Layout und Darstellung.
- `js/app.js`: expliziter App-Einstieg, Daten laden, Teamfarben und 30 lokale Logos, Canvas zeichnen,
  Wiedergabe, Keyboard, Namen und Resize. `init()`, `render()`, `seek()`, `tick()` sind zentrale Einstiegspunkte.
- `js/replay-engine.js`: `compileReplay(data)` berechnet Szenen, Keyframes, Lineups, Besitz,
  Matchups, Marker, Angriffs- und Viertelgrenzen. `getReplayFrame(replay, time)` interpoliert daraus
  den Zustand zu einem beliebigen Zeitpunkt. Kein Netzwerk-/DOM-Code in der Engine.
- `js/replay-teams.js`: lokale Trikot-/Kontrastfarben für alle 30 NBA-Teams.
- `scripts/import-game.js`: Deno-only Download und Normalisierung; keine Browser-Abhängigkeit.
- `js/replay-data.js`: gemeinsame Normalisierung für Browser und Importer, Browser-Datenabruf.
- `js/replay-validation.js`: gemeinsame fachliche Prüfung für Browser, Import und Audit.
- `scripts/check-replay.js`: kompatibler Re-Export der gemeinsamen Prüfung für CLI-Aufrufer.
- `scripts/audit-replays.js`: automatische Entdeckung und Prüfung aller lokalen Replay-Snapshots.
- `js/replay-shots.js`: `getShotStyle(action)` klassifiziert Wurffamilie und Descriptor-Merkmale;
  `animateShot()` baut Bewegungen, `flyBall()` tastet Ballflug vorab ab, `landPlayers()` setzt Posen zurück.

Der Court misst im Engine-Koordinatensystem 94 × 50. Reguläre Feed-Wurfkoordinaten werden mit
x × 0,94 und y × 0,5 umgerechnet. Körbe liegen bei x 5,25 / 88,75 und y 25.
Die Canvas-Welt umfasst 110 × 65 einschließlich Rand und wird um (8,9) versetzt.
Eigene Änderungen nicht mit halbfeldbezogenen Legacy-Koordinaten verwechseln.
Die erste Feldwurfaktion mit gültigem `side: "left"` / `"right"` belegt die Korbrichtung.
Daraus werden die entgegengesetzte Richtung des anderen Teams und der Seitenwechsel zur Halbzeit
abgeleitet; Verlängerungen behalten die Richtung der zweiten Halbzeit. Ohne solchen Beleg bleibt
die bisherige Schema-Annahme (Heimteam vor der Halbzeit nach rechts) als Fallback bestehen.
Die aufgezeichneten x/y-Wurfkoordinaten werden dabei nicht gespiegelt oder geändert.

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
- Bei einem direkt folgenden persönlichen Rebound plant die Engine den bekannten Rebounder schon
  in den Keyframes des vorherigen Fehlwurfs ein. Er reagiert erst im letzten Viertel des Ballflugs und bewegt sich dann zum schematischen
  Abprallort; beim eigenen Fehlwurf beginnt der Weg nach dem Abschluss. Der Ball prallt sichtbar
  ab und wird in der Rebound-Szene im Sprung gefangen. Das gilt auch nach einem letzten verfehlten
  regulären Freiwurf. Team-Rebounds bleiben ohne erfundenen individuellen Fänger. Bei dazwischen
  liegenden eigenständigen Block-Szenen bleibt die Vorabplanung jetzt über `shotActionNumber` erhalten;
  Unterbrechungen verwenden weiterhin den einfachen Rebound-Weg.
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

Beim ursprünglichen Umzug prüfte ein zusätzlicher temporärer Deno-Audit 10.276 Keyframes in 896 Szenen und 37 Wurfprofilen
beider Spiele ohne Fehler. Geprüft wurden unter anderem endliche Spieler-/Ballpositionen und Posen,
Lineups, Score-Abfolge, Zuordnung der Aktionen, gültige Ballbesitzer, Schussorte, Landungen,
Lob/Tip/Putback/Bankshot-Eigenschaften sowie technische Freiwürfe. Dieser Audit wurde anschließend in `scripts/check-replay.js` und `scripts/audit-replays.js`
dauerhaft ins Repo übernommen und wird auch zur Importfreigabe verwendet. Kein Checkout muss
sich auf Dateien unter /tmp oder auf diesen Chat verlassen.

Die reproduzierbaren Befehle und eine manuelle Checkliste mit konkreten Spielsituationen stehen
in README.md. Beim Prüfen direkt zum Ende scrubben: Die Engine rundet Szenenzeiten auf drei
Nachkommastellen. `step="0.01"` würde für diese Dauern den exakten Endpunkt verfehlen; deshalb
Timeline-Schritt 0.001 beibehalten oder bei einer Änderung bewusst gleichwertig lösen.

## Grenzen und noch offene Arbeit

- Drei freigegebene lokale Regression-Snapshots und alle 30 NBA-Teamlogos und -paletten.
  Ohne Parameter läuft das lokale Beispiel, mit GameID werden abgeschlossene Spiele direkt vom
  Backend geladen. Kein Polling, keine automatische Aktualisierung und keine Speicherung im Browser.
- Reguläre Perioden verwenden 720 Sekunden, Verlängerungen 300 Sekunden. Sprungmarken und Labels
  werden dynamisch erzeugt (Q1–Q4, OT1, OT2 usw.). Synthetische OT-Grenzen sind getestet; eine echte
  OT-Partie ist noch nicht verifiziert. Nicht als vollständige OT-Abnahme bezeichnen.
- Die Engine setzt unter anderem einen Sprungball mit verwertbaren Beteiligten, fünf Starter pro
  Team, passende PG–C-Starterpositionen, bekannte Personen und zusammenpassende Substitutionen voraus.
  Andere Spiele, fehlende Koordinaten, Korrekturen und seltene Events können diese Annahmen verletzen.
- Rebounds und weitere kontaktlose Ereignisse haben nur plausible abgeleitete Positionen.
  Die schematische Aufstellung wird aus Abschluss und bisherigen Positionen abgeleitet; echte Sets,
  Zonenverteidigung und exakte Off-ball-Wege sind dadurch weiterhin nicht rekonstruiert.
- Die Wurfklassifikation nutzt derzeit strukturierte Subtypes und Descriptor-Text. Unbekannte
  Schreibweisen oder neue Kombinationen können bei der allgemeinen Animation landen.
- Öffentlich unter https://tehes.github.io/hoops-replay/, keine Custom-Domain eingerichtet. Der Browser lädt Daten
  abgeschlossener Spiele vom vorhandenen Backend; keine Live-Spiel-Simulation. Externe Änderungen nach diesem Datum bei Bedarf frisch prüfen.
- TEAM_COLORS liegt jetzt in replay-teams.js; die frühere REFERENCE_GAMES-Allowlist ist entfernt.
  Weitere Sonderfälle und echte OT-Spiele bleiben anhand ihrer Daten zu prüfen.
- Keine neue Produkt-Roadmap als beschlossen behandeln. Der nächste Nutzerauftrag bestimmt den Umfang.

## Deno-Backend und mögliche spätere Integration

Das bestehende Backend gehört weiterhin zu `Tehes/nba-spielplan`, dort `api/main.js`.
Die dort konfigurierte Basis-URL bei der Übergabe ist https://nba-spielplan.tehes.deno.net.
Es gibt unter anderem `/playbyplay/<gameId>` und `/boxscore/<gameId>`; aktuelle Antwortformate,
Verfügbarkeit und Cache-Verhalten vor einer Anbindung prüfen. Keine Abhängigkeit vom lokal
benachbarten Spielplan-Checkout in das Replay einbauen.

Die vorhandene Origin-Liste erlaubt bei der Übergabe https://tehes.github.io,
https://nba-spielplan.de und http://127.0.0.1:5500. Port 5501 und ein eigener Replay-Subdomain-Origin
sind darin nicht enthalten. Die aktuelle Vorschau verwendet deshalb nach Freigabe des Ports durch
den Nutzer http://127.0.0.1:5500. Für andere Origins ist weiterhin eine gezielte CORS-Änderung und
Deployment im Backend-Repo nötig. Backend-Code und Konfiguration wurden nicht geändert.

Der reproduzierbare CLI-Import weiterer abgeschlossener Spiele ist jetzt umgesetzt. Weitere
denkbare Schritte: robuste Behandlung weiterer Feed-Sonderfälle, gezielte visuelle Verbesserungen
und echte OT-Abnahme; danach bei Bedarf Hosting und Integration aus dem Spielplan.
Vor solchen Änderungen den bestehenden Prototyp zeigen/prüfen und seinen bewusst schlanken Umfang
bewahren. Keine Menüs, Statistikseiten, Analytics, Frameworks oder PWA-Funktionen ungefragt ergänzen.

## Ergänzung: Weitere Spiele importieren und testen (24.10.2026)

Vom Repo-Root aus:

```sh
deno run --allow-net=nba-spielplan.tehes.deno.net --allow-read --allow-write=data scripts/import-game.js GAME_ID
deno run --allow-read=data scripts/audit-replays.js
```

GAME_ID durch zehn Ziffern ersetzen. Bestehende Dateien nur mit `--overwrite` erneuern. Der Importer
setzt den vom Backend geforderten Origin-Header als serverseitiger Client; eine Browser-CORS-Freigabe
für 5501 wird dadurch nicht ersetzt. Nicht versuchen, diesen Header im Frontend zu setzen.
Bei einem fehlgeschlagenen Refresh bleibt die bisherige Replay-Datei bestehen; die Roharchive können
bereits aktualisiert sein. Fehlermeldung beachten und keinen erfolgreichen Refresh behaupten.

Erst nach erfolgreicher Prüfung wird data/replay-GAME_ID.json als Regression-Snapshot geschrieben.
`/?game=GAME_ID` lädt unabhängig davon direkt vom Backend und benötigt keinen Import. Der Gesamtaudit entdeckt alle solchen Dateien automatisch,
prüft auch Wurfvarianten, Zwischenstände, aktive Ballbesitzer, Lineups und interpolierte Zustände,
und liefert bei Fehlern Exitcode 1. Bei neuen Anforderungen aussagekräftige Prüfungen ergänzen.

ATL–CHA (0022600094) wurde über diesen Weg importiert und mit Chrome MCP geprüft: Wiedergabe,
Teamlogos und FINAL 128:81, keine Fehler/Warnungen in der geprüften Konsole. Alle drei freigegebenen
Spiele bestehen zusammen 15.716 Keyframes in 1.356 Szenen mit 39 vorkommenden Wurfprofilen.
Doppelte und ungültige Importanfragen wurden ohne Änderungen an gespeicherten Daten abgewiesen.

HOU–SAS (0022600009, Endstand 114:110) bleibt ein bewusst nicht freigegebener Rohdatenfall:
Die erfassten Feed-Antworten enthalten widersprüchliche Ereigniszeiten und Zwischenstände in der
vorliegenden Reihenfolge. Die Kompilierung trifft zwar den Endstand, der Audit meldet aber 25 Fehler,
unter anderem bei Zwischenständen und Ballbesitz ausgewechselter Spieler. Deshalb existieren nur
`data/raw/boxscore-0022600009.json` und `data/raw/playbyplay-0022600009.json`, kein Replay-Snapshot.
Nicht durch Sortieren nach actionNumber oder Abschalten von Prüfungen „reparieren“. Vor einer
Korrektur anhand der archivierten Daten klären, welche Feed-Angabe tatsächlich falsch ist.
Ein weiterer Abruf 0022600010 erhielt HTTP 403; das belegt keine allgemeine Nichterreichbarkeit
des Backends oder aller NBA-Daten. Den vorhandenen Spielplan zur Auswahl abgeschlossener IDs nutzen.


## Ergänzung: Rebound-Choreografie

`prepareRebound()` passt beim Kompilieren eines persönlichen Rebounds die Bewegungs-Keyframes
des über `shotActionNumber` zugeordneten Fehlwurfs an, sofern keine Unterbrechung dazwischenliegt.
Die Endposition wird vor dem ersten Rebound-Frame
auch in den Compilerzustand übernommen, damit Seeking und Szenenübergänge konsistent bleiben.
Das ist eine bewusste Nutzung des bekannten Spielverlaufs, keine Rekonstruktion gemessener Laufwege.
Die Fangphase behält einen freien Ball bis zum Kontakt und markiert den Besitzwechsel mit catchAt.
Der Audit prüft Ankunft vor der Fangphase, Bewegung während der vorausgehenden Szene, Sprung und
freien Ball bis zum Fang. Putback-/Tip-Folgen, technische Freiwürfe und Endstände werden weiter geprüft.
Die drei Referenzspiele umfassen nach dieser Änderung 18.200 Keyframes, weiterhin 1.356 Szenen.
Die Replay-Dauern in der Tabelle oben sind aktualisiert; die ursprünglich dokumentierten Audit-Zahlen
beschreiben den damaligen Prüfstand.


## Positionierung vor dem Rebound

Offensive ballferne Spieler können während des Aufbaus korbnähere Plätze übernehmen. Die bisherige
sichtbare Rotation zweier Verteidiger zur Vorbereitung eines Defensiv-Rebounds ist entfernt.
Die defensive Zuordnung entsteht stattdessen bereits im Aufbau und bleibt für diesen Angriff stabil.
Der gezielte Lauf zum Abprallort beginnt weiterhin erst im letzten Viertel der Wurfflugphase,
beim eigenen Fehlwurf nach dem Abschluss. Die animierte Fangphase bleibt erhalten.

## Aktueller Ansatz: Vom Abschluss rückwärts planen

Die festen Five-out-/Four-out-/Horns-/Asymmetrie-Vorlagen wurden nach visueller Bewertung wieder
entfernt. Selbst bei anderer Verteilung wirkten die Angriffe zu ähnlich und schematisch. Der aktuelle
Ansatz setzt die belegte Aktion an erste Stelle und übernimmt für die übrigen Spieler möglichst die
Positionen aus dem bisherigen Ablauf. Eine Grundaufstellung ist nur noch Hilfe beim ersten Aufbau.

`planFormation()` sucht weiterhin den ersten belegten Feldwurf im bevorstehenden Angriff. Sie
setzt weder das Label eines echten Spielzugs noch nimmt sie unbelegte Screens an. Im internen
Plan werden nun `event-spacing`, `continuity` oder `fallback` statt taktischer Vorlagennamen gespeichert.
`replay.formations` und `scene.formation` bleiben als technische Bezeichner erhalten.

- Ausgangspunkte sind die letzten schematischen Spielerpositionen. Beim Wechsel in die andere
  Spielhälfte wird die Gruppe in Angriffsrichtung vorgerückt, ihre räumliche Anordnung bleibt
  soweit möglich erhalten. Das ist keine Behauptung gemessener Positionen.
- Der Schütze erhält einen Anlauf-/Ausgangspunkt aus belegter Wurfposition und Aktionsmerkmalen.
  Die eigentliche Wurfkoordinate bleibt unverändert. Der Assistgeber erhält einen plausiblen
  Passabstand, ausgehend von seiner bisherigen Seite zum Schützen.
- Ein bekannter offensiver Rebounder oder ein bereits korbnaher ballferner Mitspieler erhält
  Raum für eine Innenposition. Das ist nicht der spätere genaue Abprallort. Die bestehende späte
  Reaktion und animierte Fangphase bleiben erhalten.
- Spieler im vorgesehenen Anlaufkorridor weichen seitlich aus. Zu enge Abstände werden lokal
  aufgelöst, mit Vorrang für Schütze und Passgeber. Es gibt keine zufälligen Musterwechsel und
  kein künstliches Dauerlaufen unbeteiligter Spieler.
- Ohne Abschlussbeleg wird mit der bisherigen räumlichen Anordnung weitergearbeitet. Nur wenn
  noch keine solche Aufstellung existiert, hilft `FALLBACK_SPACING` beim Einstieg.
- Im gleichen Angriff bleibt der Plan erhalten. Bei einem seitlichen Wiedereinwurf werden die
  aktuellen Positionen als Ziele verwendet; niemand wird auf alte Startplätze zurückgesetzt.
  Eingewechselte Spieler übernehmen weiter den Platz ihres Vorgängers.

Die Pläne enthalten `evidenceActionNumber`, `shooterId`, `assistId`, `interiorId`, `origins` und
`slots`. Alles außer der Belegaktion und beteiligten Personen bleibt schematisch. `spacingSource`
und `spacingDestinations` an einer Szene machen nachvollziehbar, ob ein neuer Angriff aufgebaut
oder mit den aktuellen Positionen weitergespielt wurde.

Pick & Roll, Pick & Pop und andere konkrete Block-/Spielzugabläufe werden nur bei ausdrücklichem
Datenbeleg ergänzt. Assist, Wurfort oder ein gut passender Laufweg reichen dafür nicht aus.

Der Audit prüft weiterhin deterministische Planung, den Bezug zu echten Abschlussbeteiligten,
lesbare Abstände, Positionskontinuität bei Wiedereinwürfen und den Erhalt des Angriffsplans nach
Offensiv-Rebounds. Alle Wurf-, Rebound-, Lineup-, Score- und Seeking-Prüfungen bleiben aktiv.
Die drei Referenzspiele bestehen nach der Spacing-Anpassung 18.226 Keyframes in 1.356 Szenen. Die Animationsdauern oben sind
aktualisiert; ältere Audit-Zahlen in vorherigen Abschnitten beschreiben den damaligen Stand.

Die lokale Vorschau und Browserprüfung verwendeten zunächst Port 5502. Für die direkte
Backend-Anbindung hat der Nutzer Port 5500 ausdrücklich freigegeben; die Vorschau läuft nun auf
http://127.0.0.1:5500. Port 5050 bleibt für das parallel laufende Projekt unangetastet.


## Stabile Matchups bereits im Aufbau

`prepareAttack()` berechnet mit dem Aufstellungsplan einmalig auch `planMatchups()`. Bekannte
Foul-/Block-/Steal-Kontakte werden zuerst zugeordnet. Bei mehreren widersprüchlichen Paarungen hat
die erste mit den bereits zugeordneten Spielern vereinbare Paarung Vorrang; die spätere konkrete
Ereignisanimation stellt ihren belegten Kontakt trotzdem dar, ohne daraus einen dauerhaften
Gegenspielertausch zu erfinden.

Ist ein späterer persönlicher Defensiv-Rebound bekannt und dessen Spieler noch frei, übernimmt er
den korbnächsten noch freien Angreifer der geplanten Aufstellung. Eine belegte Kontaktzuordnung wird
dafür nicht verdrängt. Der exakte spätere Abprallort bestimmt weder das Matchup noch die frühe
Bewegung. Das tatsächliche Lösen zum Rebound bleibt Teil der späten Reaktion auf den Ballflug.

`state.matchups` hält die aktive Zuordnung. Szenen speichern Snapshots in `scene.matchups` und
`matchupPlanId`; der Aufstellungsplan enthält `initialMatchups`, `contactMatchups` und
`reboundMatchup` einschließlich Kennzeichnung einer durch Kontakte gebundenen Zuordnung.
Bei Auswechslungen werden Schlüssel oder Zielspieler auf den eingewechselten Spieler übertragen;
die anderen Paare bleiben erhalten. Ein neuer Angriff darf neue Zuordnungen erhalten. Heaves
behalten ihre separate schematische Behandlung.

`prepareReboundFormation()` darf nur noch offensive Mitspieler rotieren lassen, keine Verteidiger.
Die Tests prüfen vollständige eindeutige Mann-gegen-Mann-Paare, bekannte Kontaktprioritäten,
korbnahe Zuordnung freier Rebounder, unveränderte Paare innerhalb des Angriffs und die regelgerechte
Übernahme bei Auswechslungen. Ein eigener Test verhindert defensive Rebound-Platztausch-Szenen.
Alle drei Referenzspiele bestehen die erweiterten Prüfungen, einschließlich Endständen und Fangphase.


## Ballfernes Spacing

Die Startplanung sucht für unbeteiligte Angreifer freie Räume in Breite und Tiefe der
Angriffshälfte. Schütze und Assistgeber haben Vorrang; ein weiterer Spieler bleibt innerhalb
von zwölf Fuß zum Korb. Ballferne Spieler halten nach Möglichkeit etwa dreizehn Fuß Abstand
und meiden den schematischen Pass-/Anlaufkorridor. Vorherige Position und Weglänge beeinflussen
die Auswahl. Die freien Punkte sind Suchräume, keine behaupteten Spielzüge oder festen Sets.

Während der Wurfvorbereitung können unbeteiligte Spieler einmalig ein nahes freies Ziel anlaufen:
höchstens sechs Fuß, maximal fünf Fuß pro Replay-Sekunde, nur bis zum Release. Ballbesitzer,
Schütze, Assistgeber und die Innenposition werden dafür nicht verschoben. Tip-ins, Putbacks und
Heaves erhalten diese Korrektur nicht. Zugeordnete Verteidiger folgen weiterhin ihrem Angreifer;
Matchups werden nicht neu vergeben. Wurf- und Rebound-Flugphasen behalten ihre eigene Choreografie.
`scene.spacingMoves` hält die vorab berechneten Ziele für die technische Prüfung fest.

Die drei vollständigen Referenzspiele bestehen den Audit mit 18.226 Keyframes und 39 Wurfprofilen.
Zusätzlich geprüft werden eine erhaltene Innenposition, ausreichende durchschnittliche Court-Breite,
seltene enge Angreiferpaare sowie Weglänge und Geschwindigkeit der kleinen Korrekturen.
Chrome MCP wurde lokal auf Port 5502 für Stichproben der Court-Darstellung und des Scrubbings genutzt.
Die Bewegung bleibt eine schematische Ergänzung; reale Verteidiger dürfen ihrem Gegenspieler nahe sein.


## Direkte GameID-Anbindung (24.10.2026)

`?game=GAME_ID` lädt die vorhandenen `/boxscore/`- und `/playbyplay/`-Endpunkte parallel.
Normalisierung, Kompilierung und die vollständige gemeinsame Prüfung müssen erfolgreich sein,
bevor Controls freigegeben werden. Es werden weder die Prüfungen gelockert noch lokale Dateien,
localStorage oder Daten anderer Spiele als stiller Ersatz geschrieben. Das bisherige CLI-Archivieren
bleibt optional; sein Normalisierungscode wurde nach js/replay-data.js verschoben, die Prüfung nach
js/replay-validation.js. Die Engine bleibt unabhängig von DOM und Netzwerk.

Chrome MCP auf Port 5500: DAL–IND 0022600095 direkt vom Backend geladen, FINAL 121:105 und
Neustart geprüft, ohne lokalen Snapshot-Abruf. Weitere direkte Backend-Datensätze bestehen den
Audit: 0022600001–0022600006, 0022600097, 0022600102 und 0022600103.
Nicht jedes beliebige Spiel ist bereits rekonstruierbar: 0022600098 scheitert an einer
Fadeaway-Prüfung und 0022600100/0022600101 an Personen, die dem Roster unbekannt sind.
Der zunächst bei 0022600099 gemeldete Lineup-Fehler ist unten als Engine-Korrektur dokumentiert. Diese Fälle sind offengelegt und nicht durch Abschalten
von Prüfungen behoben. HOU–SAS bleibt der dokumentierte abgelehnte Referenzfall.

scripts/replay-data_test.js prüft lokale Standardauswahl gegenüber direkter GameID-Anbindung,
HTTP-Fehler ohne Ersatzspiel, Ablehnung laufender Spiele und falscher Feed-IDs, den HOU–SAS-Fehlerfall
sowie synthetische Grenzen zweier Verlängerungen. Echte OT-Partien bleiben eine offene Abnahme.


## Formationsplanung über Auswechslungen (24.10.2026)

MIN–ORL 0022600096 scheiterte an einem Engine-Fehler, nicht an nachgewiesen falschen Feed-Daten:
Vor dem Foul bei Q3 8:44 verwendete die Vorausplanung da Silvas späteren Wurf bei 8:39, obwohl er
noch nicht auf dem Feld stand. Er wird zwischen den Freiwürfen für Banchero eingewechselt. Beide
Abschlussbeteiligten fehlten in der aktuellen Aufstellung, wodurch die Passgasse undefiniert war.

Die Suche nach einem künftigen Abschluss endet jetzt vor der nächsten Auswechslung des angreifenden
Teams. So beziehen sich Positionsanker auf die aktuelle Aufstellung. Wechsel des verteidigenden
Teams begrenzen diese Suche nicht. Die bestehende Slot-Übernahme und Matchup-Behandlung bleiben
unverändert; Vorauswissen innerhalb dieses Aufstellungsfensters bleibt ausdrücklich erlaubt.

Ein fokussierter Test mit Foul, Freiwürfen, Wechsel, Offensiv-Rebound und Abschluss des eingewechselten
Spielers reproduziert den ursprünglichen Absturz und prüft anschließend die korrekte aktive Aufstellung
sowie den vollständigen Audit. MIN–ORL wird mit Chrome MCP auf Port 5500 geprüft, einschließlich
da Silvas Eintritt und Abschluss, direktem Seeking und FINAL 115:93. Die drei vorhandenen
Regression-Snapshots bestehen unverändert alle Prüfungen. Keine Prüfung wurde gelockert.


## Wechselketten mit identischer Spielzeit (24.10.2026)

CHI–MIL 0022600099 scheiterte an der Darstellung zusammengefasster Auswechslungen: Bei Q1 2:53
enthält der Feed Green raus / Herro rein und danach Herro raus / Green rein, zusätzlich zu einem
Wechsel des anderen Teams. Die Engine aktualisierte zwar die Aufstellung, animierte aber beide
Zwischenschritte gleichzeitig und ließ Herro zusätzlich sichtbar. Das verursachte 98 Auditfehler.

Jetzt werden die Wechsel pro Team zunächst in Feed-Reihenfolge auf die Slots angewandt. Animiert
werden nur die Unterschiede zwischen ursprünglicher und endgültiger Aufstellung. Geschlossene
Wechselketten erzeugen keinen zusätzlichen sichtbaren Spieler, der tatsächliche Wechsel des anderen
Teams bleibt erhalten. Alle Originalereignisse bleiben in der Szene und im Audit repräsentiert.
Die bestehenden Prüfungen wurden nicht verändert. Die Endaufstellung bleibt auch bei Seeking korrekt.

Ein Regressionstest mit Rückwechsel und gleichzeitigem Wechsel des Gegners reproduziert vorher den
zusätzlichen sichtbaren Spieler und prüft danach zehn aktive Spieler sowie den vollständigen Audit.
CHI–MIL wird über den Backend-Abruf in Chrome MCP auf Port 5500 geprüft; die drei lokalen
Referenzspiele und alle sieben Tests bestehen weiter. Keine weiteren Feed-Fälle wurden mitgeändert.

## Korbrichtung aus dem Feed (24.10.2026)

TOR–WAS 0022600097 belegt die umgekehrte Startausrichtung: Washington wirft in Q1/Q2 auf den
linken, in Q3/Q4 auf den rechten Korb. Die bisherige feste Heimteam-Annahme führte zu Ballflügen
zum falschen Korb. `attackDirection()` verwendet jetzt den oben beschriebenen Seitenbeleg für
Aufbau, Matchups, Würfe, Freiwürfe und Wiedereinwürfe. Der Audit prüft jeden Abschluss mit
vorhandener Feed-Seite unabhängig gegen seinen Zielkorb und lehnt widersprüchliche Seiten ab.

Ein vollständig seitenverkehrter Referenzdatensatz reproduziert den Fehler vor der Korrektur.
Der Regressionstest prüft Zielkörbe, unveränderte Wurfkoordinaten, Freiwurfseiten und Seeking.
Alle acht Tests und die drei lokalen Referenzspiele bestehen. Der frisch abgerufene TOR–WAS-Feed
besteht mit 513 Szenen, 6.595 Keyframes und FINAL 112:102 den vollständigen Audit.
Chrome MCP auf Port 5500: Feed-Laden, Korbzuordnung in allen vier Vierteln und Seeking zum
Alley-oop von Davis in Q3 geprüft. Kein neuer lokaler Spiel-Snapshot wurde angelegt.


## Explizite Rebound-Zuordnung (25.10.2026)

`linkRebounds()` verknüpft Wurf- und Rebound-Szenen vor der Bewegungsplanung über die Ereignis-ID
`shotActionNumber`; die Reihenfolge bleibt ausschließlich durch `orderNumber` bestimmt. Nur wenn
`shotActionNumber` fehlt oder null ist, wird der unmittelbar vorherige Wurf verwendet. Eine vorhandene,
aber ungültige Referenz wird nicht durch einen anderen Wurf ersetzt. Vorwärtsverweise, Treffer,
Periodenwechsel, dazwischenliegende weitere Würfe oder Rebounds und doppelte Zuordnungen werden
nicht für diese Verknüpfung verwendet. Heaves ohne Ergebnisfeld bleiben wie bisher Fehlversuche.
Team-Rebounds nach Zwischenfreiwürfen bleiben fachlich verknüpft, ohne eine Live-Fangphase auszulösen;
auch technische Freiwürfe erhalten keine solche Vorabplanung.

Direkte persönliche Rebounds behalten ihren bisherigen späten Anlauf, Abprall und Sprungfang.
Bei eigenständigen Block-Annotationen dazwischen wird der Anlauf bereits im zugeordneten Wurf geplant
und die erreichte Position durch die Annotationen gehalten. Innenposition und Wurf-Abprall verwenden
dieselbe Verknüpfung. Fouls, Timeouts, Auswechslungen und andere Zwischenszenen unterbrechen diese
Vorabplanung: Ihre Positionen, Aufstellungen und Ballzustände werden nicht rückwirkend überschrieben;
der Rebound behält seinen bisherigen lokalen Anlauf und Fang. Die Zuordnung bleibt nachvollziehbar
in `reboundShotIndex` / `reboundSceneIndex`, die Animationsfreigabe in `reboundContinuous`.

Alle 338 Rebounds der drei Referenzspiele haben eine auflösbare explizite Wurf-ID. Ein Vergleich mit
dem Stand vor der Änderung bestätigt identische Spieler-/Ball-Keyframes und Replay-Dauern für alle
drei Spiele (18.226 Keyframes). Regressionstests prüfen außerdem fehlende Felder, ungültige Referenzen,
einen eigenständigen Block sowie Timeout-, Foul- und Wechselunterbrechungen. Der gemeinsame Audit
prüft die Zuordnung und die Positions-/Ballkontinuität durch Block-Annotationen zusätzlich zur Fangphase.

Chrome MCP auf http://127.0.0.1:5500: Wurf-, Anlauf- und Fangphase per Timeline, Seeking bis
FINAL 84:96 und zurück zum Rebound sowie Play/Pause geprüft; Fangdarstellung visuell kontrolliert.
Format-, Typ- und Lint-Prüfungen sowie `git diff --check` bestehen.

## Court verlassen bei Unterbrechungen (25.10.2026)

Timeouts (einschließlich Challenges) und Periodenenden lassen beide aktiven Fünfer zur oberen
Seitenlinie laufen: zwei getrennte schematische Teamgruppen außerhalb des Courts. Der Ball bleibt
ohne Besitzer auf dem Feld. Die Spieler bleiben durch nachfolgende Auswechslungen und Annotationen
außerhalb. Vor der nächsten Spielaktion oder beim nächsten Periodenstart kehrt die aktuelle Aufstellung
auf die gespeicherten Court-Positionen zurück; eingewechselte Spieler übernehmen dabei den gespeicherten
Platz ihres Vorgängers. Das gilt auch über die Halbzeit und bei Verlängerungen. Nach Spielende bleiben
beide Teams außerhalb. Bankplätze und Laufwege sind schematisch, keine belegten Arena-/Bankpositionen.

Gehen und Rückkehr dauern jeweils zwei Replay-Sekunden, mit kurzer Haltephase außerhalb. Dadurch
verlängern sich die Referenz-Replays auf 1412,923 / 1389,568 / 1464,865 Sekunden (DEN–OKC / NYK–BOS /
ATL–CHA). Alle Bewegungen bleiben Teil der vorkompilierten Keyframes: Pause, Seeking und
Geschwindigkeitswahl verwenden dieselbe Zeitbasis. `scene.returnAt` markiert den Rückkehrzeitpunkt;
der Audit prüft die anschließende Positionskontinuität ab diesem Court-Zustand. Die Frame-Auswahl
berücksichtigt Rundungsdifferenzen an Keyframe-Grenzen, damit exakt angesprungene Fangmomente auch
nach den zusätzlichen Laufphasen ihren Ballbesitzer behalten.

Alle 13 Regressionstests und der Audit der drei Referenzspiele mit 18.309 Keyframes bestehen,
einschließlich Bankwechseln, Rückkehr, Endständen und bisherigen Wurf-/Rebound-Prüfungen.
Format-, Typ-, Lint-Prüfung und `git diff --check` bestehen. Chrome MCP auf Port 5500 wurde für
Timeout, Halbzeit, Rückkehr in Q3 und Seeking zum Spielende verwendet; die Darstellung der beiden
Gruppen außerhalb des Courts wurde visuell geprüft.

## Wurfzone und Choreografie bei Wurffouls (25.10.2026)

Wurffouls verwenden die Feed-Qualifiers `2freethrow` / `3freethrow`, um den Gefoulten beim
Kontakt innerhalb bzw. außerhalb der Dreipunktlinie des angegriffenen Korbs zu positionieren.
Fehlt der Qualifier, wird die folgende reguläre Freiwurfsequenz desselben Spielers bei identischer
Perioden-/Spielzeit bis zum nächsten Foul ausgewertet. Die Geometrie berücksichtigt den Bogen
und die geraden Ecklinien sowie den Seitenwechsel.

Die Formationssuche endet jetzt auch am nächsten Wurffoul eines aktiven Angreifers. Der Gefoulte
und sein Anlauf erhalten denselben Vorrang wie ein Feldwurfschütze; die übrigen Spieler halten
Abstand zum Anlaufkorridor, eine Innenposition bleibt erhalten. `kind: "foul-spacing"`,
`foulActionNumber` und `foulPlan` kennzeichnen diesen schematischen Abschluss getrennt von
belegten Feldwurfkoordinaten. Die bestehenden Grenzen durch offensive Auswechslungen bleiben bestehen.
Ein späterer Feldwurf nach den Freiwürfen bestimmt nicht mehr die Vorbereitung dieses Fouls.

Ist ein anderer Spieler am Ball, läuft der Gefoulte zunächst zur Empfangsposition und erhält einen
sichtbaren Pass mit freiem Ballflug und Fang. Bei zwei Freiwürfen folgt ein schematischer kurzer
Drive zum geplanten Kontaktpunkt; beim Dreier wird die Empfangsposition außerhalb der Linie
reserviert. Hat der Gefoulte den Ball bereits, führt er ihn selbst zum Ziel. Zugeordnete Verteidiger
folgen weiterhin ihren Angreifern. Ankommen und Aufnehmen des Balls liegen vor der Wurfpose und
dem Foulkontakt; der Kontakt selbst versetzt den Gefoulten nicht mehr. Die Phasen liegen vollständig
in den Replay-Keyframes und bleiben bei Pause und Seeking konsistent.

Bei einem And-one (`1freethrow`) dient der vorangegangene Treffer desselben Spielers zur selben
Perioden-/Spielzeit als Positionsanker; dessen Anlauf wird nicht erneut animiert. Ohne belegte
Zuordnung bleibt die bisherige Position erhalten. Normale persönliche Fouls mit Bonusfreiwürfen
erhalten keine Wurfzonen-Korrektur. Orte, zusätzliche Pässe und Drives bleiben schematische Ergänzungen,
keine Behauptung eines gemessenen Spielzugs oder Tracking-Daten.

Alle 17 Regressionstests und der Audit der drei Referenzspiele mit 18.606 Keyframes bestehen,
einschließlich beider Korbrichtungen, Ecklinien, And-ones, Formationsankern, Passflug/-fang,
Ballbesitz beim Dribbling und Positionskontinuität vor dem Kontakt. Format-, Typ-, Lint-Prüfung und
`git diff --check` bestehen. Die zusätzliche Vorbereitung verlängert die Replay-Dauern auf
1426,308 / 1403,933 / 1476,176 Sekunden (DEN–OKC / NYK–BOS / ATL–CHA).
Chrome MCP auf Port 5500: Passflug und anschließender Drive vor DEN–OKC Q1 10:35 visuell geprüft,
Seeking zum Kontakt und ATL–CHA Q3 3:47 mit Ballannahme außerhalb des Dreierbogens geprüft.
