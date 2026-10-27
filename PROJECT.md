# Hoops Replay — Produktkontext und Entwicklerübergabe

Stand: 25. Oktober 2026. Diese Datei hält die Entscheidungen und den geprüften Stand des
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

## Northstar für die Choreografie (27.10.2026)

Der englische Kopfkommentar in `js/replay-engine.js` hält die Leitlinie für die weitere
Choreografieplanung fest: zusammenhängende, nachvollziehbare Ballbesitze mit zeitlich
gestaffelter Abschlussvorbereitung, abgestimmten Pässen an bewegte Empfänger und einer
auf Ball und Gefahr reagierenden Defense. Freie Positionen dürfen gehalten werden;
Laufwege sollen einfach, zeitlich machbar und aus den bisherigen Positionen anschlussfähig sein.

Dies beschreibt das Entwicklungsziel, nicht zusätzliche bereits implementierte Funktionen.
Belegte Ereignisse haben Vorrang; ergänzte Abläufe bleiben schematisch. Die bestehende
Grenze für konkrete Screens und Pick-and-Roll-/Pick-and-Pop-Abläufe gilt unverändert.
Planungsentscheidungen müssen deterministisch bleiben und Wiedergabe, Pause,
Geschwindigkeit sowie Seeking auf derselben Replay-Zeitbasis erhalten.
Dieser Schritt ergänzt ausschließlich Dokumentation und verändert keine Laufzeitlogik.

## Beschlossene Produktentscheidungen

- Die initiale HTML-Seite und ihre Social-Metadaten tragen neutral „Hoops Replay“, kein festes
  Matchup. Description, Open Graph und Twitter Card beschreiben das Projekt allgemein; diese
  Social-Metadaten bleiben auch nach dem Laden neutral. Der Browser-Titel ergänzt nach erfolgreichem
  Laden und Prüfen das Matchup, z. B. `Hoops Replay · TOR @ WAS`.
  Während des Ladens und bei abgelehnten Spieldaten bleiben Scoreboard-Platzhalter und ein
  neutrales Spielfeld ohne Teamlogo, Teamnamen oder Arena sichtbar. Erst erfolgreich geprüfte
  Daten bestimmen Teams, Logos, Court-Farben, Beschriftungen, Score und Spielzeit.
- Eigenständige HTML-Seite mit Replay, zugehöriger Steuerung und einem dezenten englischen
  Fußtext unter der Steuerung. Dieser stellt zuerst die echten Eckpunkte heraus: Ereignisreihenfolge,
  Spielstände, beteiligte Spieler, aufgezeichnete Spieluhrzeiten und verfügbare Wurfkoordinaten.
  Er erklärt Positionen, Formationen, Matchups und Laufwege als plausibel ergänzte Darstellung;
  keine Rekonstruktion aus Tracking-Daten. Er erklärt außerdem die zeitliche Verdichtung und die
  Abstimmung der Spieluhr auf aufgezeichnete Ereignisse statt einer Echtzeitwiedergabe.
  Keine Menüs oder weiteren Inhaltsbereiche. Eine flache Jumbotron-Anzeige ersetzt das bisherige Scoreboard:
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
  Körbe einschließlich Brett, Träger und Stütze werden über den Spielern gezeichnet, damit
  Bewegungen darunter die Korbanlage nicht verdecken. Wurfeffekte, Ball und Namensanzeigen
  bleiben darüber sichtbar.
- Spieler als ärmellose Basketball-Jerseys mit schmalen Schulterträgern, gerundetem Halsausschnitt,
  seitlichen Armausschnitten und Rückennummern: Normalerweise Heimteam in Weiß, Auswärtsteam
  in Primary. Sind die Primaries ähnlich und erreicht die eigene Away-Alternative die Spielplan-
  Verbesserungsschwelle, versucht Away zuerst Alternate, dann Schwarz, während Home weiß bleibt.
  Erst wenn keine geeignete Variante lesbare Teamdetails erlaubt, trägt Home Primary. Dann versucht Away
  zuerst Alternate, danach Weiß/Schwarz nach Nummernkontrast. Away-Primary ist bei diesem Farbkonflikt ausgeschlossen. Auf neutralen Jerseys bestimmt
  die kontrastreichere lesbare eigene Primary-/Alternate-Farbe Rand und Nummer, sonst Weiß oder Schwarz.
  Es gibt keinen festen Mindestkontrast zwischen Jerseys/Paint; Ränder und Nummern müssen 4:1 erreichen.
  Die eigene Primary oder Alternate bleibt nach Möglichkeit in Grundfarbe oder Details sichtbar. Auf farbigen Primary-Jerseys sind
  Rand und Nummer das kontrastreichere Weiß oder Schwarz.
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

### Einwurf nach Flagrant-Freiwürfen (26.10.2026)

Freiwürfe mit dem Feed-Descriptor `flagrant` führen nach Abschluss der Serie unabhängig von
Treffer oder Fehlwurf zu einem Seiteneinwurf des gefoulten Teams auf Höhe der verlängerten
Freiwurflinie (Court-x 75 bzw. 19, je nach Angriffsrichtung). Das gilt auch für Serien mit
`subType: "other"`, wie sie im Referenzspiel BKN–CLE vorkommen. Die vorhandene Einwurfanimation
läuft vor dem erneuten Start der Spieluhr; Team-Rebound-Annotationen überschreiben diesen
Einwurfort nicht. Ein verknüpfter Fehlwurf löst keine kontinuierliche Live-Rebound-Choreografie aus.
Die Zahl der Freiwürfe und ihre Ergebnisse stammen weiterhin unverändert aus dem Feed.

Synthetische Tests prüfen beide Spielrichtungen, Treffer/Fehlwurf, Timeout zwischen den Würfen,
Ballbesitz, Seeking und die Abgrenzung zu regulären Freiwürfen. Die Flagrant-Serien aus
`0022600105` dienen als zusätzlicher echter Regressionstest.

Das gemeldete Spiel `0022600114` wurde zusätzlich mit echten Backend-Feeds geprüft: Anunobys
Flagrant Foul (Aktion 52), Carter Jr.s Freiwürfe (55/56) und der folgende Aufbau (57).
Chromium über Playwright, lokale Vorschau auf Port 5050: ORL wirft bei Q1 7:17 und 2:12
an der Seitenlinie bei Court-x 19 ein; die Spieluhr steht bis zur Ballannahme. Wiedergabe,
Pause, wiederholtes Seeking, Endstand 111:102 und Desktop-/Mobilansicht wurden geprüft,
ohne JavaScript-Laufzeitfehler. Der zusätzliche Replay-Audit besteht.
Das Backend akzeptiert die Herkunft `http://127.0.0.1:5500`, lehnt aber `localhost:5050` ab.
Die echten Feeds wurden mit der akzeptierten Herkunft abgerufen und für den Browsertest
über Playwright zugespielt; die Anwendung selbst wurde dafür nicht verändert.

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
| 0022600007 | DEN bei OKC | 2026-10-23 01:30 | 84:96 | 613 | 462 | 2328,775 s |
| 0022600008 | NYK bei BOS | 2026-10-23 23:00 | 103:107 | 563 | 434 | 2350,292 s |
| 0022600094 | ATL bei CHA | 2026-10-23 23:00 | 128:81 | 600 | 460 | 2360,720 s |

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
Die Feed-Normalisierung prüft für jeden Feldwurf mit endlichen x/y, `shotDistance` und
belegter Korbseite, ob Position und Distanz zusammenpassen. Ein Fuß Toleranz berücksichtigt
Rundungen. Eine passende Position bleibt erhalten, auch bei echten Würfen aus dem Rückfeld.
Bei einem Widerspruch wird geprüft, ob das Spiegeln der Längskoordinate (`100 - x`) die
angegebene Distanz zum angegebenen Korb bestätigt. Nur dann wird x korrigiert;
`sourceX` und `coordinateCorrection: "mirrored-x"` halten den Eingriff fest.
Passen beide Positionen nicht, wird das Spiel mit einer Datenfehlermeldung abgelehnt.
Fehlen Distanz oder Korbseite, wird keine Korrektur geraten. Rohfeeds und y bleiben unverändert.
Die Regeln gelten unabhängig von Spiel, Team, Spieler und Ereignis-ID.

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
- Technische Fouls (`foul / technical`) mit einer Personen-ID außerhalb des Spieleraufgebots
  werden bei bekannter Team-ID als Teamereignisse gezeigt: Teamlogo und originaler PbP-Text,
  ohne erfundenen Spieler oder Foulanimation auf dem Court. Personen-ID und Quelldaten bleiben
  erhalten; eine Trainerrolle wird nicht aus der ID abgeleitet. Ball und Ballbesitz bleiben erhalten.
  Für andere Aktionen oder eine unbekannte Team-ID bleibt eine unbekannte Personen-ID ein Fehler.
  Reproduktionsfall: GSW–PHX `?game=0022600111&action=724`, technisches Foul gegen S. Kerr.

Viele Ereignisse teilen sich trotzdem schematische Zweige oder generische Symbole. Es gibt keine
Garantie, dass alle NBA-actionTypes, Descriptors und Kombinationen bereits fachlich vollständig
abgedeckt sind. Neue Aktionen anhand tatsächlicher Daten prüfen, nicht aus dieser Liste ableiten.

### Steuerung

Play/Pause; 0,5×/1×/1,5×/2×/4×; Timeline; Viertelsprünge; vorheriger/nächster Angriff.
Leertaste und Pfeiltasten; Trikot antippen für Namen. Play am Ende startet von vorn.
Marker altern in Replay-Zeit, nicht in unabhängigen Wall-clock-Timern.

`?action=<actionNumber>` öffnet das geladene Spiel pausiert am Ereigniszeitpunkt der zugehörigen
Szene. Mit `?game=<GameID>&action=<actionNumber>` lässt sich eine konkrete Aktion teilen;
ohne `game` bezieht sich die ID auf das lokale Standardspiel. Die Nummer ist die PbP-Ereignis-ID,
kein Listenindex oder Zeitwert. Auch IDs aus `scene.related` führen zur gemeinsamen Szene;
im Jumbotron bleibt der Text der Hauptaktion. Ungültige oder unbekannte IDs erzeugen eine
Konsolenwarnung und belassen den Start bei null. Die URL wird bei der Wiedergabe nicht verändert.

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

## Spielzeit als Choreografie-Budget (25.10.2026)

Die Engine verwendet die Differenz zwischen vorheriger und aktueller Ereignisuhr als `scene.liveSeconds`.
Perioden beginnen weiterhin bei 12 bzw. 5 Minuten; negative Differenzen erzeugen kein Zeitbudget.
Das ist der Abstand zwischen Ereignissen, nicht automatisch die Dauer eines vollständigen Ballbesitzes.
Bei Feldwürfen und Ballaktionen vor Fouls/Turnovern steuert dieser Abstand die vorhandene Vorbereitung:

- Ballvortrag wird bei kurzen Abständen bis auf 65 Prozent seiner bisherigen Dauer verdichtet.
  Bei höchstens fünf vergangenen Spielsekunden entfällt die separate Zwischenstation an der Mittellinie.
- Längere Abstände erhalten zusätzliche Vorbereitung mit Dribbling und den bereits geplanten
  Positionskorrekturen. Das Zielbudget beträgt die halbe vergangene Spielzeit, maximal zwölf
  Replay-Sekunden, abzüglich des bisherigen Aufbaus und einer Abschlussreserve (2,5 Sekunden
  für Feldwürfe, 2 für Wurffouls, sonst 0,8). Es ist ein schematischer Richtwert; die bestehenden
  Abschlussphasen haben Vorrang und dürfen das Budget überschreiten.
- Ballflüge, Abschlüsse, Rebounds und Kontakte behalten ihre bisherigen Dauern. Heaves, Tip-ins,
  Putbacks und Freiwürfe erhalten keine zusätzliche Wartephase. Es werden keine weiteren Pässe,
  Kontakte oder konkreten Spielzüge aus dem Zeitabstand abgeleitet.
- Einwurfaufbau und Rückkehr vom Spielfeldrand beanspruchen Replay-Zeit bei stehender Spieluhr.
  `scene.liveAt` markiert anschließend den Beginn der Uhrinterpolation bis `scene.eventAt`.
  Ereignisse mit gleicher Spieluhr behalten ihre Animationszeit ohne zusätzliches Live-Zeitbudget.

Alle Phasen bleiben vorkompilierte Keyframes. Pause, Geschwindigkeit und Seeking verwenden weiterhin
dieselbe Replay-Zeitbasis. Score und Marker bleiben an den jeweiligen Ereigniszeitpunkt gebunden.
Die Referenz-Replays dauern jetzt 1992,445 / 2007,033 / 1993,778 Sekunden (DEN–OKC / NYK–BOS /
ATL–CHA). Die längere Gesamtdauer und schematische Dribblingphasen sind bewusste Folgen dieser Planung;
weitere Laufwege und eine Rekonstruktion konkreter Spielzüge gehören nicht zu dieser Änderung.

Alle 19 Regressionstests und der Audit der drei Referenzspiele mit 19.527 Keyframes bestehen.
Die neuen Tests vergleichen dieselbe Aktion nach 4, 12 und 22 Spielsekunden, unveränderte Wurf-Flugzeit,
Marker-/Score-Zuordnung sowie stehende Uhren bei Einwürfen, Rückkehr und zeitgleichen Ereignissen.
Format-, Typ-, Lint-Prüfung der JavaScript-Dateien und `git diff --check` bestehen.
Chrome MCP am bestehenden lokalen Server auf Port 5500: lange Vorbereitung visuell geprüft,
kurze und lange Abschlüsse, Halbzeit, Spielende und wiederholtes Seeking geprüft; Wiedergabe mit
2× und anschließende Pause geprüft.

### Shot-Clock-Verstöße als Planungshinweis (25.10.2026)

Ein Turnover mit `subType: "shot clock"` kennzeichnet rückblickend den vorausgehenden Angriff
mit `shotClockPressure`. Dessen Vorbereitung nutzt 85 statt 50 Prozent des jeweiligen belegten
Spieluhrabstands, begrenzt auf 24 statt 12 Replay-Sekunden. Abschlussreserve und Mindestdauer der
vorhandenen Bewegungen bleiben erhalten. So bekommt ein ausgespielter Angriff vor dem Verstoß
sichtbar mehr Zeit mit schematischem Dribbling.

Der Rückblick erfasst eigene Fehlwürfe über eigene Offensivrebounds hinweg. Ein Verstoß kann im
Feed bereits 1–3 Sekunden nach einem solchen Fehlwurf auftreten; dann wird vor allem die Vorbereitung
vor dem Wurf verlängert, ohne nach dem Rebound einen neuen langen Angriff zu erfinden. Der Rückblick
endet an Besitzwechseln, Treffern, Fouls, Freiwürfen, anderen Verstößen, Sprungbällen und Periodengrenzen.
Timeouts, Wechsel und Annotationen allein beenden ihn nicht. Das rekonstruiert keine exakte Rest-Shot-Clock
und unterstellt keinen Reset; maßgeblich bleiben die aufgezeichneten Ereignisse und Spieluhrabstände.
Zeitgleiche Ereignisse erzeugen weiterhin keine zusätzliche Wartezeit. Es gibt keine neue Shot-Clock-Anzeige.

Alle 21 Tests bestehen, darunter die sechs echten Shot-Clock-Verstöße aus NYK–BOS und ATL–CHA,
Grenzen des Rückblicks, unveränderte Wurfflugzeit, Besitzwechsel und Marker-Zuordnung. Der Audit
besteht mit 19.529 Keyframes; die Replay-Dauern betragen jetzt 1992,445 / 2036,483 / 2009,613 Sekunden.
Typ-, Lint-, Formatprüfung der JavaScript-Dateien und `git diff --check` bestehen.
Chrome MCP auf Port 5500 mit den lokalen Rohfeed-Fixtures für ATL–CHA: verlängerte Vorbereitung
visuell geprüft, Play/Pause, Seeking zum Verstoß, zum Endstand 128:81 und zurück geprüft.

### Zusätzliches Referenzspiel BKN–CLE (25.10.2026)

`0022600105` wurde mit dem bestehenden Importer als `data/replay-0022600105.json` gespeichert,
zusammen mit beiden unveränderten Rohfeeds unter `data/raw/`. Der Snapshot datiert das Spiel auf
2026-10-24 23:30 UTC: BKN bei CLE, Endstand 121:125, 641 Aktionen, 504 Szenen und 2158,599 Sekunden
Replay-Dauer mit der aktuellen Zeitplanung.

Das Spiel ergänzt die Shot-Clock-Regression: Aktion 8, Q1 11:34, Team-Turnover nach 26 vergangenen
Spielsekunden. Die Vorbereitung bis zum Verstoß dauert rund 22,3 Replay-Sekunden. Der bestehende
Shot-Clock-Test berücksichtigt jetzt alle sieben Verstöße aus drei Referenzspielen; der automatische
Snapshot-Audit entdeckt das vierte Spiel ohne Konfigurationsänderung. Der Default bleibt DEN–OKC;
`?game=0022600105` lädt wie bisher die Backend-Feeds, nicht den gespeicherten Snapshot.

### Bewegung während langer Vorbereitung (25.10.2026)

Die zusätzliche Vorbereitungszeit wird nicht mehr überwiegend als stationäres Dribbling abgespielt.
Der bestehende Ballvortrag darf bei langen Spieluhrabständen bis zum Faktor 1,8 seiner ursprünglichen
Dauer beanspruchen; die Verdichtung kurzer Angriffe bleibt erhalten. Die Vorbereitung rechnet diesen
Zeitverbrauch weiterhin auf ihr vorhandenes Budget an.

Bei mindestens drei verbleibenden Replay-Sekunden erhält der aktuelle Ballführer bis zu drei kurze
seitliche bzw. rückwärtige Bewegungen mit jeweils 0,4 Sekunden Ruhe am Zwischenpunkt. Die Wege
bleiben nahe am Ausgangspunkt und führen nach Erreichen des Angriffshalbfelds nicht zurück ins
Rückfeld. Der bestehende Mannverteidiger folgt. Die Planung prüft kurze Wegsegmente gegen andere
aktive Spieler, geplante Positionsziele und einen Abschlussanker eines anderen Spielers. Gibt es
keinen passenden Weg, bleibt der Spieler während dieses Teilabschnitts an seinem Platz. Das ist
keine allgemeine Kollisionssimulation; Überschneidungen aus bestehenden Formationen und gleichzeitig
laufenden Bewegungen bleiben möglich. Es werden weder weitere Pässe noch konkrete Spielzüge ergänzt.

Bei Feldwürfen verteilen sich bereits geplante Positionskorrekturen zeitversetzt über die Vorbereitung.
Neue Laufwege enden vor dem bestehenden Wurf-/Foulanlauf. Ballbesitz, Ballflüge, Kontakte und Ereignisse
folgen weiterhin der bisherigen Logik; alle neuen Bewegungen sind vorkompilierte Keyframes.
`preparationAt`, `dribbleRoute` sowie die Zeitdaten in `spacingMoves` machen die Vorbereitung prüfbar.

Alle 22 Tests und die vier Spiel-Audits mit 26.990 Keyframes bestehen. Der zusätzliche Test prüft
Bewegung, Ballbindung, folgenden Verteidiger, Court-/Halbfeldgrenzen, verteilte Positionskorrekturen
und reproduzierbares Seeking für lange Vorbereitungen über alle vier Spiele. Der Vergleich mit dem
Stand vor dieser Änderung bestätigt identische Ereignisreihenfolge und Wurfflugzeiten. Die Dauern
betragen jetzt 1993,304 / 2037,708 / 2011,068 / 2159,742 Sekunden (DEN–OKC / NYK–BOS / ATL–CHA /
BKN–CLE). Typ-, Lint-, Formatprüfung der JavaScript-Dateien und `git diff --check` bestehen.
Chrome MCP am bestehenden Server auf Port 5500 mit lokalen Rohfeed-Fixtures: Bewegung vor dem
Shot-Clock-Verstoß Q1 11:34 in BKN–CLE visuell geprüft; Übergang zum Driving Layup (Aktion 73),
Play/Pause, Seeking zum Verstoß, Endstand 121:125 und zurück geprüft.

### Schematische Ballzirkulation (25.10.2026)

Zusätzliche Verbindungspässe sind jetzt ausdrücklich Teil der schematischen Vorbereitung. Sie
ersetzen bei geeigneten Passwegen einen Teil der bisherigen Dribbelphasen; die vorhandene Erklärung
schematisch ergänzter Bewegungen bleibt bestehen. Das stellt keine belegte Passfolge oder einen
bestimmten Spielzug dar und erzeugt weder PbP-Ereignisse noch Statistikwerte oder Assist-Zuschreibungen.

Ab sechs verbleibenden Replay-Sekunden plant `circulateBall()` zwei Pässe, ab zehn Sekunden drei,
über mindestens drei aktive Angreifer. Nahe Empfänger werden bevorzugt. Empfangende Spieler mit
laufender Positionskorrektur werden ausgelassen; Wege zwischen 6 und 32 Court-Fuß werden gegen
Verteidiger im Passkorridor geprüft. Die Prüfung verwendet die schematischen Positionen bei der
Planung, keine vollständige Kollisions- oder Interceptionssimulation. Ohne vollständige passende
Folge bleibt die bisherige Dribbelvorbereitung erhalten.

Bei Feldwürfen endet die Folge beim belegten Assistgeber, sonst beim Schützen, bevor die bestehende
Abschlussanimation übernimmt. Bei individuellen Turnovern endet sie beim beteiligten Spieler;
Team-Turnover erlauben einen anderen letzten Ballhalter. Bei Fouls kehrt die Folge zum bisherigen
Ballhalter zurück, damit der vorhandene Pass-/Drive-Ablauf zum Gefoulten unverändert übernehmen kann.
Sichtbare Ballflüge und Fänge verwenden die bestehenden Keyframes und `flyBall()`. Halte-/Dribbelzeiten
zwischen Pässen füllen das übrige Budget. Die Engine hält die schematischen Verbindungen separat
unter `scene.preparationPasses` mit Absender, Empfänger, Release- und Catch-Zeit fest.

Alle 23 Tests und die vier Spiel-Audits mit 27.418 Keyframes bestehen. Der neue Test prüft freie
Ballflüge, Fänge am Empfänger, aktive Aufstellungen, mindestens drei Beteiligte, den Übergang zum
belegten Assistgeber/Schützen, unveränderte Quelldaten und Scores sowie reproduzierbares Seeking.
Die Replay-Dauern bleiben gegenüber der vorherigen Bewegungsplanung unverändert.
Typ-, Lint-, Formatprüfung der JavaScript-Dateien und `git diff --check` bestehen.
Chrome MCP auf Port 5500 mit den lokalen BKN–CLE-Rohfeeds: Passflug vor Q1 11:34 visuell geprüft,
Wiedergabe über Pass und Fang mit anschließender Pause sowie Seeking zum Verstoß, zum Endstand
121:125 und zurück geprüft.

### Aufbau vor Rückfeldwürfen (25.10.2026)

Die Abschlussplanung berücksichtigt jetzt auch Heaves. Liegt der belegte Feldwurf beziehungsweise
bei einem Heave der aus Distanz und Korbrichtung abgeleitete Wurfort in der eigenen Hälfte,
verwendet die Engine `backcourt-spacing`: breite Anspielstationen in der eigenen Hälfte statt
vorherigem Vorrücken in die Angriffshälfte. Einwurf, Outlet, vorbereitende Dribblings und
Positionskorrekturen bleiben dort; die Mannverteidiger folgen weiterhin ihren Zuordnungen.
Die normale korbnahe Aufstellung und offensive Rebound-Rotation entfallen bei diesem Aufbau.
Step-back-/Fadeaway-Anläufe dürfen vor dem Rückfeldwurf keinen Ballbesitz im Vorfeld herstellen.
Heaves erhalten bei einem anderen Ballhalter einen sichtbaren Pass zum Schützen und bei Running
anschließend einen kurzen Anlauf. Die vorhandenen Wurforte und Flugprofile bleiben erhalten;
zusätzliche Vorbereitung kann die verdichtete Replay-Dauer verlängern.

Die Positionen und Verbindungen bleiben schematisch, ohne Behauptung eines belegten Spielzugs.
Der Audit prüft die passende Hälfte der Formation und den Ballbesitz bis zur Wurfabgabe; bei
gebundenem Ball ist hierfür die Position des Trägers maßgeblich, da die Grafik den Ball seitlich versetzt.
Ein Regressionstest prüft beide Spielrichtungen vor und nach der Halbzeit, Grundlinien-/Seiteneinwurf,
defensiven Rebound, assistierten Running-Pull-up und Step-back, Wurforte sowie reproduzierbares Seeking.

Verifiziert: 25 Tests und vier Spiel-Audits mit 27.460 Keyframes ohne Fehler; Deno-Typprüfung,
Lint, JavaScript-/HTML-/CSS-Formatprüfung und `git diff --check` bestehen. Chrome MCP am lokalen
Server auf Port 5500: DEN–OKC, Rückfeld-Heaves in Q1 und Q3, Wiedergabe über den Q3-Wurf,
Pause sowie Seeking zum Endstand und zurück geprüft.

### Fehlpässe ins Aus (25.10.2026)

Bei `turnover / out-of-bounds / bad pass` ohne Steal wählt die Engine einen anderen aktiven
Angreifer als schematische Anspielstation aus der vorhandenen Aufstellung. Kurze Wege und ein
nahes Aus werden bevorzugt; Verteidiger im Flugkorridor und ein Rückflug über die Mittellinie
werden bei der Auswahl nachrangig behandelt. Der flache Pass verfehlt die Empfangsposition um
knapp drei Court-Fuß seitlich und fliegt auf derselben Linie weiter über die erste Außenlinie.
Der Empfänger bekommt keinen Ballbesitz; es entsteht kein zusätzliches PbP-Ereignis.
Der Turnover wird nach dem Flug ins Aus angezeigt. `scene.missedPass` hält Empfänger-ID,
Abwurf- und Aus-Zeit für Prüfungen und Seeking fest. Empfänger und Passweg sind schematisch
gewählt, nicht aus dem Feed belegt; eine vollständige Kollisionssimulation findet nicht statt.
Die distanzabhängige Flugdauer kann betroffene Replay-Szenen geringfügig verlängern.

26 Tests und vier Spiel-Audits mit 27.549 Keyframes bestehen. Der neue Test prüft 19 echte
Fehlpässe auf aktive Anspielstation, knappes Verfehlen vor dem Aus, durchgehende Flugrichtung,
freien Ball, Turnover-Zeitpunkt, beide Spielrichtungen und reproduzierbares Seeking.
Deno-Typprüfung, Lint, Formatprüfung und `git diff --check` bestehen. Chrome MCP auf Port 5500:
Ajay Mitchells Fehlpass in DEN–OKC bei Q1 3:11 visuell geprüft, über den Pass abgespielt, pausiert
und zum Endstand sowie zurück gesucht.


### Gleichzeitiger Aufbau mit wegabhängiger Dauer (25.10.2026)

Die Spieler laufen im Aufbau gemeinsam statt große Strecken in festen 0,3–0,85 Sekunden
abzuarbeiten und erst danach das übrige Budget zu nutzen. Die längste sichtbare Spielerstrecke
bestimmt die Mindestdauer eines Bewegungsabschnitts: maximal 18 Court-Fuß pro Replay-Sekunde
im Mittel, bei der vorhandenen Smoothstep-Interpolation maximal 27 in der Spitze bei 1×.
Freies Zeitbudget erlaubt einen langsameren Aufbau; die bestehende Reserve für den Abschluss
bleibt erhalten. Reicht das verdichtete Budget für den Laufweg nicht, verlängert sich die Szene.
Diese Grenze gilt für die markierten Aufbau-/Rotationsabschnitte, nicht pauschal für Freiwurf-
Aufstellungen, Auswechslungen, Kontaktanimationen oder den späten Rebound-Anlauf.

Beim Einwurf übernimmt der nächstgelegene aktive Mitspieler außer dem PG den Einwurf.
Die übrigen Spieler beginnen gleichzeitig mit dem Vorrücken. Nach dem Einwurf laufen Guard,
Einwerfer und Mitspieler gemeinsam weiter; der bisherige feste Zwischenstopp des Guards an der
Mittellinie entfällt. Nach defensivem Rebound oder Steal bleibt der Fänger während der
Outlet-Vorbereitung am Fangort, während sich die anderen bereits bewegen. Matchups bleiben
bestehen; defensive Wege gehören zur gemeinsamen Laufphase.

Reguläre Feldwurfschützen laufen bereits im Aufbau zum Anlauf-/Empfangspunkt der bestehenden
Abschlussanimation. `getShotEntry()` teilt dieselbe Geometrie zwischen Aufbau und Abschluss;
belegte Wurfkoordinaten und Ballflüge werden nicht gestreckt. Tip-ins, Putbacks und Heaves
behalten ihre gesonderte Behandlung. `scene.buildupMoves` enthält die gemeinsamen Zeitintervalle,
`scene.shotEntry` den vorgezogenen Anlaufpunkt. Seeking bleibt vollständig vorkompiliert.

Laufwege verbrauchen nun einen größeren Teil des vorhandenen Budgets. Optionale Dribbelrouten
und Passfolgen entstehen deshalb seltener. Zwei verbindende Pässe sind bereits ab vier statt
sechs verbleibenden Replay-Sekunden erlaubt; die bisherigen Empfänger-, Längen- und
Korridorprüfungen bleiben erhalten. Shot-clock-Tests prüfen das Zeitbudget einschließlich
Laufbewegung statt ausschließlich zusätzlicher Wartezeit.

Verifiziert: 27 Tests und vier vollständige Spiel-Audits mit 26.009 Keyframes ohne Fehler;
Deno-Typprüfung, Lint, Formatprüfung und `git diff --check` bestehen. Der neue Regressionstest
prüft die Weg-/Zeitgrenze, gleichzeitige Bewegung mehrerer Spieler, die frühe Schützenposition,
die auffälligen DEN–OKC-Aktionen 95 und 566 sowie unveränderte Quelldaten und Seeking.
Chrome MCP auf Port 5500: beide Situationen mit Play/Pause und Seeking, gemeinsamer Feldwechsel,
Endstand FINAL 84:96 und Rücksprung geprüft; keine Fehler oder Warnungen in der Konsole.
Die vier Dauern betragen jetzt 2333,096 / 2350,521 / 2363,237 / 2515,147 Sekunden
(DEN–OKC / NYK–BOS / ATL–CHA / BKN–CLE). Beispielsweise wächst DEN–OKC von 33:22 auf 38:53.
Die Bewegungen und ihre Zwischenpositionen bleiben schematisch; dies ist keine Tracking-Simulation.


### Anspielstation vor einem Folgeabschluss vorbereiten (25.10.2026)

Bei einem direkt folgenden Feldwurf nach einem kontinuierlich verknüpften persönlichen
Offensiv-Rebound berücksichtigt die Planung bereits im vorausgehenden Abschluss den nächsten
Schützen. `planContinuation()` verwendet dessen belegte Wurfposition und die vorhandene
Anlaufgeometrie. Die Startformation hält diesen Spieler auf der passenden Seite, mit einem
kurzen Restweg. Während der Vorbereitung und des Abschlusses läuft er weiter zur Empfangsposition;
sein bestehender Mannverteidiger folgt. Ein langer Restweg wird über längere Zeit verteilt,
nicht durch zusätzliche Geschwindigkeit erzwungen. Ballbesitz und Ballflüge bleiben getrennt.

Der aktuelle Schütze, Assistgeber, PG und Rebounder werden dafür nicht verschoben. Freie
Ballzirkulation und kleine Spacing-Korrekturen verwenden den laufenden Empfänger nicht zusätzlich.
Tip-ins, Putbacks, Rückfeldwürfe und Heaves behalten ihre eigene Choreografie. Vorausgeplant wird
jeweils der nächste unmittelbar folgende Abschluss; dazwischen dürfen nur eigenständige
Block-Annotationen liegen. Fouls, Timeouts, Auswechslungen, Verstöße, Besitz-/Periodenwechsel und
Treffer sperren diese Verbindung. Der späte Rebound-Anlauf und die Fangphase bleiben erhalten.
Es werden keine gemessenen Off-ball-Laufwege oder belegten Spielzüge behauptet.

`formation.continuation` enthält den folgenden Schützen und Zielpunkt, `scene.continuationMove`
zusätzlich Ursprung, Beginn und Dauer der Bewegung. Die Bewegung läuft über die bestehenden
Keyframes, ohne nachträgliches Umschreiben von Scores, Ereignissen oder Wurfflugzeiten.
Wo keine sichere Verbindung besteht, bleibt der bisherige Aufbau erhalten.

DEN–OKC, Aktionen 40 → 41 → 43: Johnson befindet sich beim Rebound bereits an der
Empfangsposition seines Eckendreiers. Der bisherige Restweg von etwa 43 Court-Fuß nach dem
Rebound entfällt. Die Positionierung beginnt im gemeinsamen Aufbau und setzt sich während
Gordons Abschluss fort. Die Fälle sind über die Aktionslinks und Zurückspulen reproduzierbar.

Verifiziert: 30 Regressionstests und die vier vollständigen Spiel-Audits. Die Tests prüfen
26 vorbereitete Empfängerbewegungen über alle vier Referenzspiele, Geschwindigkeit, folgende
Verteidiger, freie Ballbesitzfolge, Positionskontinuität, Seeking, unveränderte Quelldaten und
Grenzen durch Unterbrechungen, Wechsel, Treffer und Defensiv-Rebounds.
Die Dauern betragen jetzt 2328,775 / 2350,292 / 2360,720 / 2512,693 Sekunden
(DEN–OKC / NYK–BOS / ATL–CHA / BKN–CLE).
Deno-Typprüfung, Lint, Formatprüfung und `git diff --check` bestehen. Der Gesamtaudit umfasst
26.016 Keyframes ohne Fehler. Chrome MCP: Aktionen 40 → 41 → 43 mit Wiedergabe und Pause
visuell geprüft; Endstand FINAL 84:96 und Rücksprung geprüft, ohne Fehler/Warnungen in der Konsole.


## Teamfarben und Jersey-Auswahl (26.10.2026)

Alle 45 NBA-/WNBA-Basislogos und Primary-Farben stammen aus `Tehes/nba-spielplan`,
Commit `610e3d627f88f891ace7335300d7b831268a433a`. Court-Paletten und Logoauswahl bleiben
unabhängig von der Jersey-Auswahl. `shirt` ist die Primary-Farbe; `trim` und `ink` in den
Teamdaten dienen weiterhin der bisherigen Darstellung außerhalb der Jerseys.

Die aktuelle Auswahlregel folgt der Farbähnlichkeit und den Verbesserungsschwellen des Spielplans:
- Der Normalfall Home weiß / Away Primary bleibt erhalten, solange die Spielplan-Auswahl die Primaries behält.
  Ein Wechsel benötigt ähnliche Primaries und genügend Verbesserung durch die eigene Away-Alternative;
  bei leerem Alternate wird dafür implizites Schwarz verwendet. Weiß und Schwarz als weitere Jersey-
  Optionen dürfen diesen Wechsel nicht auslösen. Die Nähe allein genügt nicht.
  Diese Entscheidung startet die Away-Farbsuche; sie erzwingt keinen Home-Wechsel.
  Niedriger Helligkeitskontrast allein erzwingt keinen Wechsel. Ein Detailkonflikt auf dem weißen
  Home-Jersey wird durch lesbare neutrale Details gelöst, nicht durch einen Wechsel der Grundfarbe.
- Home bleibt zunächst weiß. Away versucht Alternate, dann Schwarz. Beide Varianten müssen gegen die
  Paint die Verbesserungsschwelle erreichen und gegen Weiß mindestens 0,30 OKLab-Helligkeitsabstand haben.
  Ein neutrales Away-Jersey benötigt lesbare eigene Teamdetails, bevor diese Stufe erfolgreich ist.
- Erst wenn diese Optionen scheitern, trägt Home Primary. Away bevorzugt ein geeignetes Alternate.
  Andernfalls werden Weiß und Schwarz gegen Home-Primary (zugleich Paint) geprüft. Away-Primary bleibt
  bei dieser Suche ausgeschlossen, auch als Rückfalloption.
- Eine Ausweichfarbe muss die Trennung gegenüber dem Primary-Paar um mindestens 0,04 OKLab-Abstand
  verbessern; bei neutralen Primary-Paaren gilt stattdessen eine Verbesserung des Kontrastverhältnisses
  um mindestens 0,5. Es gibt keinen festen Mindestkontrast zwischen Jerseys/Paint.
- Die Reihenfolge Alternate vor Schwarz beziehungsweise Alternate vor Weiß/Schwarz hat Vorrang vor
  dem Nummernkontrast. Erst unter geeigneten neutralen Varianten bei Home-Primary entscheidet der höhere
  Nummernkontrast, dann der Jersey-Kontrast gegen Home-Primary, danach Weiß durch stabile Reihenfolge.
  Ränder/Nummern müssen mindestens 4:1 gegen das eigene Jersey erreichen.
- Eigene Primary oder Alternate wird in Grundfarbe oder Rand/Nummer bevorzugt. Auf neutralen
  Jerseys gewinnt die eigene Teamfarbe mit dem höheren Detailkontrast; bei Gleichstand Primary.
  Bei Away kommen neutrale Details erst nach dem Versuch mit Home-Primary zum Einsatz, wenn keine
  geeignete Teamfarbvariante lesbare Details erlaubt.
  Diese allgemeine Regel gilt dynamisch für jede Paarung, ohne feste Ausnahmeliste.
- Ein neutrales Jersey kann kontrastierende neutrale Ränder und Nummern erhalten, wenn die
  eigene Teamfarbe dort keine 4:1 erreicht. Die sichtbare Teamfarbe am Jersey darf dann entfallen.
  Ein farbiges Alternate ist ausdrücklich auch als Jersey-Grundfarbe erlaubt. Auf farbigen Jerseys sind Details das
  kontrastreichere Weiß oder Schwarz.
- Die Auswahl erfolgt einmal beim Laden und bleibt bei Pause, Seeking und Seitenwechsel stabil.

`replay-colors.js` übernimmt die OKLab-Farbähnlichkeit aus dem Spielplan: 45° Farbton,
0,30 Helligkeitsdifferenz bei Neutralfarben, Chroma-Grenze 0,04, Verbesserungsschwellen 0,04
OKLab-Abstand beziehungsweise 0,5 Kontrastverhältnis. Die Alternates folgen der Spielplan-Palette gemäß der unten dokumentierten
pragmatischen Entscheidung. `alternate: null` bedeutet Primary, Weiß und Schwarz.
Die aktuelle Alternate-Palette steht direkt in `js/replay-teams.js`. Bucks-Cream `#eee1c6`
ist eingetragen; auch Celtics-Gold ist als Replay-Alternative verfügbar. Quellen: [Cream-Farbwert](https://sportcolorcodes.com/milwaukee-bucks-color-codes/)
und [offizielle Cream City Edition](https://shop.bucks.com/pages/city-edition).
Die Werte in `js/replay-teams.js` sind für NBA und WNBA die verbindliche Palette.

Die Trikots bleiben eine Replay-Konvention, keine Behauptung der tatsächlichen Uniformwahl.
Home kann dieselbe Grundfarbe wie die Paint haben; kontrastierende Ränder und Nummern sind
bewusst die Unterscheidung. Holz- und Logo-Flächen werden nicht zusätzlich bewertet.

Verifiziert: 38 Tests inklusive aller 1.080 liga-internen Paarungen und fünf vollständige
Spiel-Audits mit 31.117 Keyframes ohne Fehler. JavaScript-/CSS-Formatcheck, Deno-Check,
Lint und `git diff --check` bestehen. Chromium über Playwright auf Port 5500: NBA-Default
und WNBA mit lokalen Rohfeed-Fixtures, Play/Pause, Seeking und Endstände geprüft. Zwei
synthetische Farbzuordnungen auf dem unveränderten DEN–OKC-Ereignisverlauf prüfen Home-Grün
mit Away-Weiß sowie Home-Orange mit Away-Schwarz; Desktop/Mobil visuell kontrolliert.
Alle 45 Logos decodieren, keine JavaScript-Seitenfehler. Die bereits bekannte Formatabweichung
der unveränderten `index.html` bleibt außerhalb dieser Änderung.


### Pragmatische Alternate-Palette (26.10.2026)

Der Nutzer hat die bisherigen Einschränkungen durch die Uniform-Recherche ausdrücklich ersetzt:
Alle Alternativen aus dem Spielplan werden übernommen, auch Brooklyn-Grau, Celtics-Gold,
Denver-Rot und Utah-Hellblau. Ob eine Farbe einer aktuellen Edition entspricht, ist keine
Freigabebedingung mehr. Auffällige Partien werden im Replay bewertet und dann gezielt korrigiert.
Keine saisonalen oder historischen Ausschlüsse anhand der Recherche erneut einführen.

Bucks behalten echtes Cream `#eee1c6` statt des abgedunkelten Bronze-Werts. Schwarz bleibt
implizit: explizit schwarze Alternates und die zuvor auf Schwarz normalisierten Near-Black-Werte
von Magic/Liberty bleiben leer. Damit sind 35 zusätzliche Alternates gesetzt und zehn Einträge
leer. Alle aktiven Werte stehen in `js/replay-teams.js`.

Die Alternate-Freigabe ändert Court-Paletten und Logos nicht.
Alternates konkurrieren mit Primary für Ränder und Nummern neutraler Jerseys. Die Werte sind
bewusste Darstellungsfarben und keine Behauptung der Uniformwahl eines tatsächlichen Spiels.

Verifiziert nach der Palette-Anpassung: fünf Farbtests inklusive aller 1.080 Paarungen und
Brooklyn-Grau in der tatsächlichen Kontrastwahl, Deno-Check, Lint, JavaScript-/CSS-Formatcheck
und `git diff --check` bestanden.


### Getrennte Kontrastgrenzen und sichtbare Teamfarbe (26.10.2026)

Historischer Stand mit 3:1; die unten dokumentierte Anpassung auf 2,5:1 ersetzt diese Grafik-Grenze
und die daraus resultierenden Matchup-Beispiele.

Die zuvor gemeinsame 4:1-Prüfung ist durch 3:1 für Jersey gegen Home-Jersey/Paint und ein
4:1-Mindestkontrast für Nummern ersetzt. Bei mehreren geeigneten neutralen Away-Jerseys entscheidet
der höhere Kontrast der teamfarbenen Nummer. Beispiele: ATL@CHI → CHI rot/weiß, ATL
schwarz/rot; DEN@PHI → PHI blau/weiß, DEN weiß/dunkelblau. NYK@ORL wechselt nun ebenfalls:
ORL blau/weiß, NYK weiß/blau, weil Orange gegen das bisher weiße Home-Jersey unter 3:1 liegt.

Aktuell sieben von 1.080 Paarungen können mit der freigegebenen Palette sichtbare Teamfarbe, 3:1
Grafik-Kontrast und 4:1 Nummernkontrast nicht gleichzeitig erreichen. Hier ist die sichtbare
Teamfarbe eine Präferenz; beide Kontrastgrenzen bleiben verbindlich. CHI/DET/HOU/ORL/POR/TOR
bei NYK erhalten schwarze Away-Jerseys mit weißen Rändern und Nummern. WNBA CHI@SEA erhält
Weiß mit schwarzen Rändern und Nummern. Teamidentität bleibt über Scoreboard und Logos erkennbar.
Die frühere Best-Effort-Auswahl mit Nummernkontrast unter 4:1 ist damit ausdrücklich ersetzt.
Die genannten Paarungen sind Ergebnisse der allgemeinen Regel und Regression-Beispiele,
keine Sonderfälle im Code. Nach Änderungen der Farben kann sich diese Menge ändern.

Nach Umsetzung der allgemeinen Regel für neutrale Details: acht Farbtests inklusive aller 1.080 Paarungen
bestanden. Alle Paarungen erfüllen 3:1 für Jerseys/Away-Paint und 4:1 für Nummern. Die sieben
betroffenen Paarungen werden ausdrücklich geprüft; bei fehlender Teamfarbe wird eine passende Teamfarbvariante
rechnerisch ausgeschlossen. Deno-Check, Lint, JavaScript-/CSS-Formatcheck und `git diff --check`
bestanden. Chromium über Playwright: NBA/WNBA mit lokalen Fixtures, Play/Pause, Seeking und
Endstände; ORL@NYK mit weißen Nummern auf Schwarz sowie ATL@CHI mit roten Details auf Schwarz
als synthetische Farbzuordnungen auf Desktop/Mobil geprüft, ohne JavaScript-Seitenfehler.

Verifiziert: 40 Tests bestanden. Der Farbtest prüft alle 1.080 Paarungen auf deterministische
Auswahl, sichtbare Teamfarbe, mindestens 3:1 zwischen Jerseys und Away/Paint sowie 4:1 für
Nummern. Fehlt eine sichtbare Teamfarbe, prüfen die Tests zusätzlich rechnerisch, dass keine
Teamfarbvariante beide Grenzen erfüllt.
Deno-Check, Lint, JavaScript-/CSS-Formatcheck und `git diff --check` bestehen. Chromium über
Playwright: NBA-/WNBA-Replays mit lokalen Fixtures, Play/Pause, Seeking und Endstände geprüft;
ATL@CHI und DEN@PHI als synthetische Farbzuordnungen visuell auf Desktop/Mobil kontrolliert.
Keine JavaScript-Seitenfehler, alle 45 Logos laden. Keine neue Safari-Abnahme.


### Projektbereinigung (26.10.2026)

Die 45°-Hue-Regel aus dem Spielplan und die abgestimmte Trikot-/Kontrastlogik bleiben erhalten.
Temporäre Recherche-, Erklärungs-, Export- und Prüfdateien dieser Arbeit wurden entfernt,
einschließlich der separaten Alternate-Übersicht und der Matchup-HTML/CSV-Dateien.
Die verbindliche Palette steht in `js/replay-teams.js`, die Produktentscheidungen in dieser Datei.
Dauerhafte Regressionstests, Spieldaten-Fixtures, Importer und die bereits zum Projekt gehörenden
Validierungs-/Audit-Skripte bleiben erhalten.


### Häufiger Primary durch 2,5:1 Grafik-Kontrast (26.10.2026)

Historischer Zwischenstand; die nachfolgende Umstellung ersetzt die feste Grafik-Kontrastgrenze.

Der Mindestkontrast zwischen Jerseys sowie zwischen Away-Jersey und Home-Paint sinkt von 3:1
auf 2,5:1. Die 4:1 für Ränder/Nummern und die 45°-OKLab-Ähnlichkeitsregel bleiben erhalten.
Dadurch behält Away in 218 von 870 NBA-Paarungen Primary (zuvor 137); in der WNBA sind es
67 von 210 (zuvor 59). Der geringere Helligkeitskontrast ist eine bewusste Darstellungsentscheidung.

ORL@NYK und NYK@ORL zeigen Home weiß und Away Primary. ATL@CHI bleibt Home rot/weiß,
Away schwarz/rot; DEN@PHI bleibt Home blau/weiß, Away weiß/dunkelblau.
Die bisherigen sieben Paarungen ohne sichtbare Jersey-Teamfarbe benötigen diese Lösung aktuell
nicht mehr: CHI/DET/HOU/POR/TOR bei NYK tragen Weiß mit Teamdetails, ORL@NYK und WNBA
CHI@SEA behalten Away-Primary. Die allgemeine Regel für neutrale Details bleibt für andere
Paletten gültig und wird weiterhin mit einer synthetischen Farbkombination geprüft.

Verifiziert: neun Farbtests bestanden, einschließlich aller 1.080 Paarungen mit mindestens 2,5:1
für Jerseys/Away-Paint und 4:1 für Ränder/Nummern. Deno-Check, Lint, Formatcheck der geänderten
JavaScript-Dateien und `git diff --check` bestehen. Keine neue Browser-Abnahme für diese Grenzwertänderung.


### Spielplan-Logik statt fester Grafik-Kontrastgrenze (26.10.2026)

Historischer Stand mit unvollständig übertragenem Wechsel-Auslöser; die nachfolgende Korrektur
übernimmt die vollständige Wechselentscheidung des Spielplans.

Die feste 2,5:1-Grenze entfällt. Home bleibt weiß, außer die Spielplan-Regel erkennt ähnliche Primaries.
Dann trägt Home Primary, Away wählt aus Alternate, Weiß und Schwarz unter den oben dokumentierten
Verbesserungsschwellen. Away-Primary ist bei ähnlichen Primaries ausdrücklich ausgeschlossen.
Alternate ist als tatsächliche Jersey-Grundfarbe zugelassen. 4:1 für Ränder/Nummern bleiben verbindlich.

Beispiele: PHI@BOS und DAL@LAL behalten Home weiß / Away Primary trotz geringem Kontrast gegen die Paint.
ORL@NYK und NYK@ORL bleiben ebenfalls weiß / Primary. PHX@NYK zeigt Home orange/schwarz,
Away lila/weiß; ATL@CHI bleibt rot/weiß gegen schwarz/rot. MIA@NYK erhält Away schwarz/weiß,
anstatt auf die zu ähnliche Primary zurückzuwechseln.

Verifiziert: zehn Farbtests einschließlich aller 1.080 Paarungen bestanden; passende Grundfarben,
kein Away-Primary bei Home-Primary, lesbare Details und stabile Auswahl geprüft. Deno-Check,
Lint, Formatcheck der geänderten JavaScript-Dateien und `git diff --check` bestanden.
Chromium über Playwright auf Port 5500: PHI@BOS, PHX@NYK, ATL@CLE und MIA@NYK als synthetische
Paletten auf dem unveränderten DEN–OKC-Replay geprüft, einschließlich Play/Pause und Seeking.
Getrennte Desktop-/Mobil-Läufe und die sichtbare Alternate-Grundfarbe geprüft, ohne Seitenfehler.

Separater Bestandsfehler: Beim Wechsel des Viewports von Desktop auf Mobil im geladenen Replay
tritt ein `drawImage`-Fehler wegen einer Canvas-Größe von 0 auf. Mit dem vorherigen Farbmodul aus
Commit `5128f49` reproduziert; nicht durch die Jersey-Auswahl verursacht. Die Größenänderungslogik
bleibt außerhalb dieser Farbänderung.


### Vollständige Spielplan-Wechselentscheidung: MEM@SAC (26.10.2026)

Historischer Stand mit direktem Home-Wechsel; die nachfolgende Prioritätenfolge erhält den Einstieg
über die Spielplan-Regel und verzögert den Home-Wechsel.

Eine ähnliche Primary-Paarung löst den Home-Wechsel nur aus, wenn die eigene Away-Alternative die
Spielplan-Verbesserungsschwelle erreicht. Zuvor konnten stattdessen Weiß oder Schwarz als allgemeine
Jersey-Option diesen Wechsel auslösen. Dieser Übertragungsfehler ist korrigiert, ohne die 45°-Grenze
zu verändern. Die nachgelagerte Auswahl aus Alternate, Weiß und Schwarz und 4:1 für Details bleiben erhalten.

Bei MEM@SAC beträgt der Farbtonabstand rund 41,17°. Memphis-Alternate verschlechtert aber den
OKLab-Abstand um rund 0,00308, statt ihn um mindestens 0,04 zu verbessern. Deshalb bleibt Sacramento
weiß mit lila Details, Memphis spielt in Primary-Blau mit schwarzen Details.

Verifiziert: elf Farbtests einschließlich MEM@SAC und aller 1.080 Paarungen bestanden; Formatcheck,
Deno-Check, Lint und `git diff --check` bestehen. Die Home-Wechselentscheidung wurde zusätzlich mit
den Originalfunktionen `compareMatchupColors` und `selectSimilarMatchup` aus dem Spielplan bei
identischen Replay-Paletten verglichen (leeres Alternate entspricht Schwarz): keine Abweichung in
1.080 Paarungen, zuvor 44 unnötige Wechsel. Die Originaldatei hatte den Blob-SHA
`95780b1273c14d624e69fa64c1b07f245081c3cb`.
Der erneute Browserlauf traf auf den oben dokumentierten Canvas-Bestandsfehler; keine neue visuelle Abnahme.


### Home bleibt vorrangig weiß (27.10.2026)

Die vollständige Spielplan-Entscheidung bleibt Einstieg der Away-Farbsuche. Bei einem Konflikt bleibt
Home zunächst weiß, Away versucht Alternate und danach Schwarz. Die Paint-Trennung folgt weiter den
Verbesserungsschwellen; gegen Home-Weiß gilt die neutrale 0,30-OKLab-Helligkeitsregel. Auf neutralen
Away-Jerseys sind lesbare eigene Primary-/Alternate-Details erforderlich, bevor Home weiß bleiben kann.

Erst wenn das nicht funktioniert, wechselt Home zu Primary. Dann hat ein geeignetes Away-Alternate
Vorrang; sonst entscheidet zwischen Weiß und Schwarz der lesbare Team-Nummernkontrast. Neutrale
Away-Details sind der letzte Ausweg nach diesem Home-Wechsel. Es bleibt bei 4:1 für Ränder/Nummern,
ohne feste Mindest-Kontrastrate für Jersey-Flächen und ohne Änderung der Court-Paletten.

Beispiele: PHX@OKC → OKC weiß/blau, PHX lila/weiß. MEM@SAC bleibt SAC weiß/lila, MEM blau/schwarz.
MIL@BOS → BOS weiß/grün, MIL schwarz/cream; das Cream-Jersey wäre Weiß zu ähnlich. SAS@BKN →
BKN schwarz/grau, SAS grau/schwarz, weil Grau zu nahe an Weiß und Schwarz zu nahe an der Paint liegt.
CHI@NYK → NYK orange/schwarz, CHI weiß/rot; lesbare rote Nummern auf Schwarz fehlen. MIA@NYK
benötigt erst Home-Primary und danach neutrale weiße Details auf schwarzem Away-Jersey.

Verifiziert: 14 Farbtests mit allen 1.080 Paarungen, Deno-Check, Lint, Formatcheck und
`git diff --check` bestanden. Der Einstieg in die Away-Farbsuche stimmt bei identischen Paletten für
alle Paarungen mit den Originalfunktionen des Spielplans überein. Home bleibt jetzt in 791 von 870
NBA- und 202 von 210 WNBA-Paarungen weiß; Home-Primary wird nur noch 79 beziehungsweise achtmal benötigt.
Chromium über Playwright auf Port 5500: PHX@OKC, MEM@SAC, SAS@BKN, CHI@NYK und MIA@NYK als
synthetische Paletten auf dem unveränderten DEN–OKC-Replay bei 1280 und 390 Pixeln geprüft,
einschließlich Play/Pause und Seeking, ohne Seitenfehler. PHX@OKC auf Desktop/Mobil visuell geprüft.

### Individuelle verbindende Laufwege (27.10.2026)

`replay-motion.js` ergänzt die Darstellung der Aufbau- und Vorbereitungsintervalle. Monotone
kubische Interpolation erhält Geschwindigkeit an durchlaufenen Zwischenpunkten und stoppt bei
Haltepositionen/Richtungswechseln. Spieler starten und erreichen Haltepositionen zeitversetzt;
Verteidiger reagieren verzögert auf die Bewegung ihres zugeordneten Angreifers. Lange Übergänge
führen über breite Außenbahnen, kurze Off-ball-Wege am Perimeter biegen nach außen, Wege in
Korbnähe halten die Mitte der Zone frei. Die bestehende Planung bestimmt weiterhin Aufbau,
Anspielstationen, Innenposition, Pass-/Drive-Korridor und Wurfvorbereitung.

Eine kurze Vorausschau ergänzt seitliches Ausweichen bei sich nähernden Laufwegen. Ereignisbeteiligte
und Ballbesitzer behalten Vorrang; echte Ereignispunkte, Ballflüge, Abschlüsse, Rebounds und
Einwurfpositionen werden nicht verschoben. Die Ausweichbewegung ist begrenzt und keine vollständige
Kollisionsphysik: Bei dicht belegten Ereignisankern oder zwei priorisierten Beteiligten können weiterhin
Überlagerungen auftreten. Die Berechnung ist zustandslos, sodass Pause und Seeking reproduzierbar bleiben.
Der gehaltene Ball übernimmt die Positionskorrektur seines Besitzers.

Keine neuen behaupteten Pick-&-Roll-, Screen- oder anderen Set-Play-Sequenzen. Die Laufwege bleiben
basketballtypische Ergänzungen ohne Tracking-Beleg. Keine Änderung am Datenvertrag oder an Dependencies.

Verifiziert: 47 bestehende Tests sowie drei Bewegungstests bestanden unter Node mit einer kleinen
Kompatibilitätsschicht für `Deno.test`/`Deno.readTextFile`; Deno selbst ist hier nicht installiert.
Alle fünf Referenzspiele bestehen den Replay-Audit. Chromium über Playwright, lokale Vorschau auf
Port 5500: Aktionen 95/566, Wiedergabe/Pause, wiederholtes Seeking sowie Desktop (1280 px) und
Mobil (390 px) ohne Seitenfehler geprüft. `git diff --check` bestanden. Die bisherige
Midpoint-Prüfung erlaubt jetzt individuelle Start-/Reaktionszeiten statt nahezu gleichzeitigen Fortschritt.

### Bogenwege am Perimeter geprüft und verstärkt (27.10.2026)

Die visuelle Nachprüfung anhand zeitlich abgetasteter Court-Bilder und Laufspuren zeigte: Die
bisherige radiale Ausbuchtung um 1,2 Fuß war noch kein Weg entlang des Perimeters. Für passende
Verbindungen vor dem Abschluss wird jetzt Radius/Winkel um den angreifenden Korb interpoliert.
Das hält Laufwege auf ihrem Bogen, statt die direkte Sehne durch den Innenraum abzulaufen.
Bedingungen: beide Endpunkte im Feld und vor dem Korb, Radius 18–34 Fuß, Radiusänderung maximal
acht Fuß, Winkeländerung etwa 7–80 Grad. Größere Übergänge, Einwurfpositionen außerhalb des Feldes
und direkte Wege zum Korb behalten ihre passende bisherige Behandlung. Auch Empfänger,
Ballführer und Verteidiger können Bogenwege verwenden. Ihre Ereignisanker bleiben unverändert.

Geplante Richtungswechsel bremsen weiterhin vor der Umkehr ab; keine zufällig ergänzten
Bewegungsschleifen. Neue Tests decken Perimeterwege in beiden Spielrichtungen einschließlich
priorisierter Empfänger sowie eine Umkehr ab. Ein echter Regressionstest prüft Bagleys Bogenweg
in DEN–OKC, Aktion 539, während des Aufbaus nach der Ballannahme. Die gehaltene Ballposition
bleibt an den bewegten Besitzer gebunden.

Visuell geprüft in Chromium über Playwright: Laufspuren unter anderem für Aktionen 95, 395, 539,
564 und 566; für 539 eine Court-Bildfolge von 2,9 bis 5,9 Sekunden Szenenzeit und laufende Wiedergabe,
ohne Seitenfehler. Die Darstellung ist weiter schematisch: Gruppierte Übergänge nach Einwürfen
und belegte enge Kontaktpunkte sind keine vollständig aufgelöste Bewegungssimulation.

Abschließende Prüfung: 53 Tests bestanden unter Node mit Deno-Test-/Dateilese-Kompatibilitätsschicht;
alle fünf Referenzspiel-Audits fehlerfrei. Deno selbst ist weiterhin nicht verfügbar.
`git diff --check` bestanden.

### Gestaffelter Aufbau und situative Varianten (27.10.2026)

Lange Wege in die neue Angriffsformation werden in `advanceFormation` über drei durchlaufene
Positionsbilder geplant: vorauslaufende Außenbahnen, nachrückender Ballführer und späterer
Trailer/Einwerfer. Flügel können ihren Platz vor den anderen erreichen. Verteidiger ziehen sich
zuerst enger zum eigenen Korb zurück, schließen anschließend zu ihren Gegenspielern auf und
übernehmen die bisherigen Endpositionen. Während dieses Übergangs entfällt das direkte
interpolierte Nachziehen am Angreifer; im Halbfeld gelten wieder die Perimeter- und Matchup-Wege.

Vier deterministisch aus dem Kontext gewählte Varianten:
- `patient-inbound`: Grundlinieneinwurf mit mindestens zwölf verfügbaren Spielsekunden.
- `quick-push`: höchstens acht Spielsekunden oder ein als laufender Abschluss eingeordneter Wurf;
  früheres Nachrücken und bei passendem Ziel ein Flügel Richtung Korb.
- `live-outlet`: Nachrücken bei `needsAdvance`, etwa nach Rebound oder Steal.
- `spread-inbound`: sonstiger längerer Aufbau nach einem Einwurf.

Aktuelle Positionen, Richtung, Aufstellung, Einwerfer und Zielpositionen bestimmen die konkreten
Wege. Keine Zufallsauswahl und keine behaupteten belegten Set-Plays. Kurze Wege unter 24 Fuß
sowie Backcourt-Heaves erhalten keinen zusätzlichen dreistufigen Aufbau. Bereits vor der
Ballannahme rücken Flügel, große Spieler und Verteidiger unterschiedlich weit vor.

Bei längeren Besitzphasen mit gestaffeltem Aufbau nutzt die Vorbereitung bis zu 65 Prozent der
verfügbaren Spielsekunden (maximal 14 Replay-Sekunden), damit zwischen Aufbau und Abschluss Zeit
für die bisherige Ballbewegung bleibt. Kurze Angriffe behalten das bisherige Zeitbudget;
Shot-Clock-Druck bleibt bei der bisherigen 85-Prozent-Regel. Der Replay kann dadurch länger dauern.
Spieluhr, Ereignisse, Endpositionen und Ballbesitz bleiben an die bisherigen Anker gebunden.
Eine nötige Ballannahme wird vor dem ersten Laufabschnitt aufgezeichnet.

Die frühere Bogenweg-Prüfung für DEN–OKC 539 wird durch einen Übergangstest ersetzt: Die Verteidigung
soll hier zuerst die Zone schützen und erst danach ins Matchup gehen. Die vorhandenen isolierten
Perimetertests prüfen Bogenwege weiterhin in beiden Richtungen. Der neue echte Übergangstest
prüft alle vier Varianten, beide Richtungen, NBA und WNBA, Staffelung, anfänglich engere Verteidigung,
abschließende Matchups, gehaltenen Ball, unveränderte Quelldaten und reproduzierbares Seeking.
53 Tests unter Node mit der beschriebenen Deno-Kompatibilitätsschicht und alle fünf Referenzspiel-
Audits bestanden. Deno selbst ist hier nicht installiert. `git diff --check` bestanden.
Visuell zusätzlich in Chromium/Playwright geprüft: Aktionen 9 (`patient-inbound`), 17 (`quick-push`)
und 539 (`spread-inbound`), jeweils eine zeitlich gestaffelte Court-Bildfolge über den gesamten
Übergang und laufende Wiedergabe ohne Seitenfehler. Die Bildfolgen zeigen frühe Außenbahnen,
nachkommenden Ballführer/Trailer und Rückzug vor der Matchup-Übernahme.

### Positionsrollen und Guard-Drives (27.10.2026)

Die Rollen geben bevorzugte Ausgangsräume vor und sind keine festen Aufenthaltszonen.
Guard-Rollen (`PG`, `SG`, `G`, `G-F`) werden beim freien Spacing außen bevorzugt; Center,
danach große Forwards, erhalten freie Innenpositionen. Schützen, Assistgeber und vorbereitete
Folgeempfänger bleiben von dieser freien Rollenverteilung ausgenommen. So kann ein Center
am Flügel anspielbar sein, einen Dreier vorbereiten oder als Passgeber außen bleiben.
Belegte Wurfpositionen und unmittelbare Ereignisse haben weiterhin Vorrang vor der Positionsrolle.

Der bisherige Anlauf von vier bis sieben Fuß ließ Guards schon während der Vorbereitung in
Korbnähe warten. Für passende Guard-Drives (Driving-Abschluss oder unassistierter Layup/Dunk bis
18 Fuß Korbabstand) beginnt die Vorbereitung jetzt 1,5 Fuß außerhalb der ligaspezifischen
Dreierdistanz. Erst nach der Ballannahme startet der durchgehend abgetastete Drive mit maximal
zwölf Fuß pro Replay-Sekunde bis zur Aufnahme nahe am Korb. Danach folgt die bisherige
Abschlussanimation. Die Drive-Samples werden ohne erneutes Abbremsen an jedem Zehntelsekunden-
Zwischenpunkt dargestellt; der gehaltene Ball bleibt am Besitzer. Die Vorbereitung reserviert
zusätzliche Zeit für diese Strecke, dadurch können solche Szenen länger dauern.

Cutting, Alley-oops, Tip-ins, Putbacks, unmittelbare eigene Offensiv-Rebound-Abschlüsse,
Stepbacks/Fadeaways und reine Catch-Abschlüsse behalten ihre passende bisherige Behandlung.
Nicht jeder Guard-Abschluss wird pauschal zu einem langen Drive. Ohne spezifischeren Beleg
bleibt der vorgeschaltete Lauf eine schematische Ergänzung, kein rekonstruierter Spielzug.

Verifiziert: 54 Tests unter Node mit Deno-Test-/Dateilese-Kompatibilitätsschicht sowie alle fünf
Referenzspiel-Audits bestanden; Deno selbst ist hier nicht verfügbar. Neue echte NBA-/WNBA-Prüfungen
kontrollieren Vorbereitung außerhalb des Perimeters, keinen Aufenthalt in der Zone vor dem Drive,
Bewegung zum Korb mit begrenzter Geschwindigkeit, Ballbesitz und freie Center-Dreier in beiden
Richtungen. Die Zirkulationsprüfung fordert weiterhin Fälle mit Assists und Shot-Clock-Verstößen,
aber keine feste Anzahl von vier Zirkulationen: Rollenbasiertes Spacing kann einen bislang
freien Passweg belegen und dann die vorhandene Dribbelvorbereitung verwenden.
Chromium über Playwright: DEN–OKC Aktion 246 als Bildfolge von Vorbereitung über Drive bis zum
Wurf sowie laufende Wiedergabe ohne Seitenfehler geprüft. `git diff --check` bestanden.
Zusätzlich Jokićs Dreier in DEN–OKC Aktion 81 als Court-Bildfolge und laufende Chromium-Wiedergabe
geprüft: Vorbereitung und Abschluss bleiben außen, ohne Seitenfehler.

### Fehlpässe mit Steal: sichtbarer Weg zum Abfangen (27.10.2026)

Der bisherige Steal-Zweig setzte den Verteidiger unmittelbar vor dem ersten Ballflug-Sample an eine
neue Position. Dadurch konnte er in etwa 0,1 Replay-Sekunden quer über das Feld springen und der
Ballbesitzwechsel war vor dem sichtbaren Abfangen angekündigt.

`animateSteal` plant bei einem abgefangenen Fehlpass jetzt einen plausiblen aktiven Mitspieler als
Passziel. Aus dessen Passlinie wird ein Abfangpunkt zwischen Werfer und Empfänger gewählt, wobei
nahe erreichbare Passwege bevorzugt werden. Wenn vorhanden werden Passstrecken ab zwölf Fuß
verwendet; der Abfangpunkt liegt dann mindestens ungefähr sieben Fuß vom Abspiel entfernt.
Der Empfänger und die genaue Passlinie sind schematische Ergänzungen, keine neuen Feed-Belege.

Der ausgewiesene Stealer bewegt sich zunächst mit maximal neun Fuß pro Replay-Sekunde in die Nähe
dieses Passwegs. Falls der direkte Zugang durch den Ballführer führen würde, bekommt der Zugang
einen auf die Feldgrenzen begrenzten Bogen. Während des Passes tritt der Verteidiger die restliche
Strecke in die Linie und fängt den frei fliegenden Ball. Ballbesitz, Possession, Turnover- und Steal-
Zeitpunkt wechseln erst beim Fang. Während dieser Bewegung wird der Stealer nicht auf die Position
relativ zu seinem ursprünglichen Gegenspieler zurückgesetzt. Die gesampelten Schritte werden bei
Wiedergabe kontinuierlich interpoliert, ohne pro Sample neu anzuhalten.

Lost-Ball-Steals erhalten eine Annäherung an den Ballführer und einen kurzen freien Ballweg statt
eines erfundenen langen Passes. Fehlpässe ins Aus bleiben bei der vorhandenen Missed-Pass-Animation.
Die aufgenommene Position geht in den anschließenden Gegenangriff ein; zusätzliche Wege können die
Replay-Dauer verlängern, Ereignisreihenfolge, Beteiligte, Spieluhr-Anker und Ergebnis bleiben erhalten.

Als gemeldeter Prüffall ist `0022600110` festgehalten. Seine Backend-Daten konnten hier nicht geladen
werden: Der Netzwerkproxy verweigerte den CONNECT zum bestehenden Backend mit HTTP 403; die
alternativ über das Web-Werkzeug angefragten offiziellen NBA-CDN-Feeds waren dort ebenfalls nicht
verfügbar. Keine Behauptung einer direkten visuellen Prüfung dieses Spiels.

Der neue Regressionstest nutzt stattdessen alle fünf lokalen NBA-/WNBA-Referenzspiele: Er prüft
beide Angriffsrichtungen, beabsichtigten aktiven Empfänger, Fang auf dem Passweg vor dem Empfänger,
maximale sichtbare Bewegungsgeschwindigkeit, Feldgrenzen, freien Ballflug, Eigentümerwechsel beim
Fang, reproduzierbares Seeking und unveränderte Quelldaten. Chromium/Playwright: DEN–OKC Aktion 79
und GSV–ATL Aktion 34 anhand zeitlicher Court-Bildfolgen und Wiedergabe geprüft, ohne Seitenfehler.
Abschließend 55 Tests unter Node mit der bestehenden Deno-Test-/Dateilese-Kompatibilitätsschicht
sowie alle fünf Referenzspiel-Audits bestanden; Deno selbst ist hier weiterhin nicht installiert.
`git diff --check` bestanden.



### Zielgerichtete Laufwege und ruhige Haltepositionen (27.10.2026)

Dieser Stand ersetzt die überlagerten Interpolationskorrekturen der früheren Bewegungslogik.
Jede verbindende Route wird einmal aus den unveränderten Szenenankern geplant: Gerade,
Perimeterbogen oder ein einfacher seitlicher Bogen um einen Konflikt. Der geometrische Weg
bleibt während der Wiedergabe fest; eine gemeinsame Fortschrittskurve steuert Beschleunigung
und Abbremsen. Nur annähernd gleichgerichtete Zwischenpunkte tragen Geschwindigkeit weiter.
An bewussten Knicken, Umkehrpunkten und Haltepositionen wird gebremst. Ruhende Spieler bleiben
auf ihrem Spot und werden nicht von einer Laufzeit-Abstoßung verschoben.

Ballbesitzer und Ereignisbeteiligte reservieren ihre Wege zuerst. Andere laufende Spieler prüfen
vorab zeitgleich belegte Wege und ruhende Spieler und wählen gegebenenfalls einen einzigen
Ausweichbogen oder einen späteren Start. Perimeterbögen bleiben geometrisch erhalten;
Verteidiger beginnen verzögert. Direkte Gegenspieler bleiben für absichtliche Deckungsnähe von
der Kollisionsbewertung ausgenommen. Es gibt kein nachträgliches Hin-und-her-Korrigieren.
Die Wege werden intern pro Szene/Intervall gecacht; die Berechnung bleibt unabhängig von der
Reihenfolge des Seekings und verändert weder Quelldaten noch Ereignisanker.

In der Wurfvorbereitung reagieren höchstens zwei freie Angreifer auf belegte Räume oder den
geplanten Pass-/Drive-Korridor. Bereits freie Spots bleiben besetzt. Die Dribbelvorbereitung
verwendet höchstens eine kurze Sondierung in eine freie Richtung, danach hält der Ballführer
seine Position. Die vorhandene Ballzirkulation, belegten Cuts, Drives, Folgeempfänger,
Übergangsvarianten und Abschlussanimationen bleiben erhalten. Es werden keine unbelegten
festen Set-Plays oder zusätzlichen Ballbesitzwechsel erfunden.

Grenze: Die Reservierung minimiert Konflikte, garantiert aber keine kollisionsfreie Simulation
aller zehn Spieler. Dichte Ereignisanker und priorisierte Kontakte bleiben möglich; die Daten
enthalten weiterhin kein Tracking. Einfachere Wege können solche bestehenden Engstellen
sichtbarer machen. Keine Änderung am Datenvertrag, an Dependencies oder an der Oberfläche.

Verifiziert: 60 Tests unter Node mit der vorhandenen Deno-Test-/Dateilese-Kompatibilitätsschicht
bestanden, einschließlich fünf neuer Bewegungs-/Vorbereitungsprüfungen. Alle fünf Referenzspiele
bestehen den Audit mit zusammen 34.392 geprüften Frames und null Fehlern. JavaScript-Syntaxcheck
und `git diff --check` bestanden. Laufspuren der DEN–OKC-Aktionen 95, 246, 539 und 566 wurden
als abgetastete Diagramme visuell geprüft. Keine neue Browser-Abnahme: Das vorhandene Playwright
findet hier kein Chromium; der Installationsversuch lieferte ein ungültiges Downloadarchiv.
Deno ist ebenfalls nicht installiert, deshalb keine native Deno-Check-/Lint-/Formatprüfung.
Zur manuellen Abnahme in der lokalen Vorschau: `http://127.0.0.1:5500/?action=95`,
`?action=246`, `?action=539` und `?action=566`; jeweils vor das Ereignis zurückspulen,
Aufbau und Vorbereitung abspielen sowie Pause und wiederholtes Seeking prüfen.


### PG-Aufbau ohne künstlichen Big-Man-Trailer (27.10.2026)

Der PG trägt den Ball vor, während alle vier Mitspieler ihre Zielpositionen anlaufen.
Die frühere feste Trailer-Rolle für Slot 4 beziehungsweise den Einwerfer entfällt vollständig,
auch beim Vorrücken vor einem Einwurf oder Outlet. Nach der Ballannahme erhalten Innen- und
Außenspieler einen früheren Laufbeginn beziehungsweise größeren Fortschritt als der PG und
besetzen ihre Ziele spätestens am zweiten der drei Aufbauschritte. Der letzte Schritt gehört
dem Ballvortrag des PG und der abschließenden Defensivzuordnung; kein künstliches spätes
Aufholen des Centers. Ein Einwerfer oder Rebounder darf bis zur Ballabgabe natürlich zurückliegen.

Auch Formationen ohne folgenden Wurf-/Shooting-Foul-Anker planen jetzt einen freien Center,
ersatzweise PF, auf einer freien Innenposition statt seine alte Außenposition zu übernehmen.
Belegte Center-Dreier, Assistpositionen und vorbereitete Folgeempfänger behalten ihre Priorität;
die Positionsrolle erzwingt keine falsche Innenposition bei belegten Außenaktionen.
Die situativen Aufbauvarianten, Außenbahnen, Defensivrückzug und echten Ereignisse bleiben erhalten.

Verifiziert: 61 Tests unter Node mit Deno-Kompatibilitätsschicht bestanden. Der umgestellte
Übergangstest prüft alle vier Off-ball-Spieler, frühes Besetzen aller Zielpositionen, beide
Angriffsrichtungen, alle vier Aufbauvarianten sowie NBA/WNBA. Ein zusätzlicher Test prüft freie
Center-Innenpositionen in Formationen ohne Wurfanker; belegte Center-Dreier bleiben durch den
bestehenden Rollen-/Drive-Test geschützt. Alle fünf Spiel-Audits bestehen mit 34.507 Frames
und null Fehlern. Syntaxcheck und `git diff --check` bestanden. Die oben beschriebene Grenze
für Browser- und native Deno-Prüfungen gilt weiterhin; keine neue Browser-Abnahme.
