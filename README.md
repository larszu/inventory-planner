# Inventory Planner

Das Lager als eigenes Werkzeug: **Bestand**, **Ausgabescheine**, **Sub-Hire** —
mit einer Bedienung für den Lageristen statt eines Dialogs im Kabelplan.

**Source language:** `en`

Die Oberfläche startet auf Englisch — auch auf einem deutschen Rechner. Deutsch
ist die erste Übersetzung und steht in **Einstellungen → Language**; die Wahl
überlebt den Neustart. Fehlt zu einem Schlüssel die Übersetzung, erscheint der
englische Quelltext: das ist die Rückfallebene und kein Fehler. Eine weitere
Sprache ist eine Datei unter `src/i18n/` plus ein Eintrag in `WOERTERBUECHER` —
keine Zeile Logik.

## Warum es dieses Repo gibt

Der Schnitt ist in
[ADR-006 „Der Schnitt"](https://github.com/larszu/av-planner-suite/blob/main/docs/decisions/ADR-006-werkzeug-schnitt.md)
entschieden und begründet. Die Kurzfassung: das Lager führt eigene Stammdaten,
die den Plan überdauern, es bedient jemand anderes als den Plan, es ist ohne
den Kabelgraph vollständig, und seine Verbindung zum Plan lässt sich auf
**wenige benannte Fragen** reduzieren:

| Frage | Wer antwortet |
| --- | --- |
| Deckt der Bestand den Bedarf? | das Lager — auf einen Bedarf, den der Plan rechnet |
| Was steht auf dem Ausgabeschein? | das Lager |
| Ist das Stück fremdes Material? | das Lager |

## Die Grenze zum Plan

**Dieses Repo kennt kein Plan-Modell.** Kein `EquipmentItem`, kein
`CablePlannerProject`, keine eigene Bedarfsrechnung. Der Plan rechnet seinen
Bedarf selbst und reicht `BedarfsZeile[]` herüber
(`src/domain/types/bedarf.ts`).

Das ist keine Stilfrage: ein Lager, das dem Geräte-Modell des Kabelplans folgen
muss, ist kein eigenes Werkzeug, sondern ein Anhängsel mit einer Repo-Grenze
davor. `npm run grenze:check` misst es, und CI führt es aus.

## Befehle

```bash
npm ci          # Installation — siehe Hinweis unten
npm run dev     # Vite, Port 4184 (fest, strictPort)
npm run build   # tsc -b && vite build
npm run lint
npm test        # vitest
npm run grenze:check   # die Grenze zum Plan
npm run lang:check     # Quellsprache (englisch, E-28)

npm run electron:dev   # Desktop-Fassung lokal starten (baut vorher)
npm run dist:win       # Windows: Setup + Portable nach release/
npm run dist:mac       # macOS: je ein DMG fuer Intel und Apple Silicon
```

**Hinweis zur Installation.** Hier stand, `npm install` breche ab. Das ist zu
pauschal, und die Korrektur steht hier statt einer stillen Änderung, weil der
alte Satz jemanden davon abhielt, das Naheliegende zu versuchen: **mit der
committeten `package-lock.json` läuft `npm install` durch** — also im normalen
Fall nach einem `clone`.

Es bricht mit `Cannot read properties of null (reading 'edgesOut')` ab, sobald
npm den Peer-Graph OHNE Lockdatei neu auflösen muss (Lockdatei gelöscht,
frisches Verzeichnis). Das ist ein Fehler im Auflöser, nicht in diesem Projekt;
dann hilft `npm install --legacy-peer-deps`. `npm ci` fasst die Auflösung nie
an und ist deshalb der Weg, den CI geht.

*Gemessen am 2026-09-09 mit npm 10.9.7, in beiden Fällen und in beiden neuen
Repos: mit Lockdatei grün, ohne Lockdatei rot.*

## Drei Wege, dasselbe Werkzeug zu benutzen

| Weg | Wie er entsteht | Wofür |
| --- | --- | --- |
| Desktop (Windows/macOS) | Tag `v*` → `.github/workflows/release.yml` | Der Rechner im Lager: Fensterstart, keine Adresszeile |
| Web-Seite | Push auf `main` → `.github/workflows/pages.yml` | Draufschauen, ohne etwas zu installieren |
| Eingebettet in die Suite | `av-planner-suite` vendoriert dieses Repo | Alle Werkzeuge unter einer Oberfläche |

**Sie teilen ihren Bestand nicht.** Die Ablage ist `localStorage`, und Electron
hält die in seinem eigenen `userData`-Bereich — Desktop-Fassung und
Browser-Fassung sind zwei Lager auf demselben Rechner. Das ist keine Panne,
sondern die Eigenschaft der Ablage; der Weg dazwischen ist der Export
(`avplan-inventory`), nicht die Erwartung, es sei dasselbe Fenster.

**Die Web-Seite ist noch nicht live.** Eine GitHub-Pages-Site kann nur ein
Mensch in den Repo-Einstellungen anlegen (*Settings → Pages → Source:
**GitHub Actions***); der `GITHUB_TOKEN` darf es nicht. Solange sie fehlt, baut
`pages.yml` trotzdem und überspringt nur das Veröffentlichen — mit einer
Warnung am Lauf statt einer roten Spalte auf `main`. Sobald die Freigabe da
ist, veröffentlicht der nächste Push von selbst; an der Datei ist nichts zu
ändern.

**Keine gekaufte Signatur.** Die macOS-Pakete tragen eine Ad-hoc-Signatur, die
Windows-Installer gar keine. Beim ersten Start meldet sich der jeweilige
Wächter des Betriebssystems; das ist erwartet und kein Zeichen eines defekten
Downloads.

## Lager — wo liegt es, und was steckt worin?

Die Ansicht **Storage** zeigt den Lagerbaum: Depot, Raum, Regal, Fach, Case,
Transport-Case, und darin die Artikel. **Gezogen wird mit dem Finger** — ein
Lagerort, ein Case oder ein Artikel wandert dorthin, wo er hingehört, mit der
Maus genauso wie auf dem Telefon im Regalgang. (HTML5-`draggable` gibt es auf
einem Touch-Gerät nicht; deshalb Zeiger-Ereignisse, dieselbe Lösung wie in der
Draufsicht der Ladeplanung.)

**Die Absage hat einen Namen, und zwar bevor man loslässt.** Wer ein Case in
sich selbst zieht, liest „Ein Container kann nicht in sich selbst", während
der Finger noch über dem Ziel steht. Ein Vorgang, der ohne Grund nichts tut,
ist von einem kaputten Programm nicht zu unterscheiden — und beim nächsten Mal
räumt jemand wieder von Hand um und trägt es nirgends ein.

**Jeder Umzug geht ins Journal**, mit dem Klartext-Pfad von damals, und lässt
sich als CSV ausgeben. Das ist der Nachweis, der „wo war es zuletzt"
beantwortet, wenn erfasster Ort und Wirklichkeit auseinandergelaufen sind.

### Grundriss und Raum — wo die Regale wirklich stehen

Der Baum sagt, wo etwas **hingehört**. Er sagt nicht, wo man **hinlaufen**
muss: er kennt keine Gasse, keine Reihenfolge im Raum und keine Seite. Genau
deshalb hängt in jedem Lager ein Plan an der Wand.

Derselbe Reiter hat deshalb drei Ansichten auf dieselben Knoten — **Baum**
(worin), **Grundriss** (wo) und **In 3D** (wie hoch):

* Im **Grundriss** bekommt ein Lagerort eine Grundfläche und wird mit der Maus
  oder mit dem Finger an seine Stelle geschoben, mit Raster. Räume und Depots
  sind Umrisse, Regale gefüllte Flächen mit ihrer Kennung.
* **In 3D** stehen dieselben Regale auf derselben Fläche, mit ihren Ebenen als
  Fachboden-Linien. Das beantwortet die eine Frage, die der Grundriss nicht
  beantwortet: wie hoch es wird.
* **Überschneidungen werden gemeldet, nicht verboten** — beim Umbau steht das
  neue Regal schon da, während das alte noch nicht weg ist. Gerechnet wird mit
  `ueberlappt` aus dem Packer: eine Antwort im Haus auf „überschneidet sich
  das".

**Die Halle wird nicht erfunden.** Es gibt keine Vorgabe von zehn mal zehn
Metern. Gezeichnet wird das vermessene Depot, sonst die Hülle dessen, was
schon steht — und dann steht dabei, dass der Umriss gerechnet und nicht
gemessen ist (`domain/lib/hallenumriss.ts`, eine Rechnung für beide
Ansichten). Ein Lagerort ohne Grundfläche ist nicht falsch; es hat nur
niemand gemessen, wo er steht.

### Flächen: Stellfläche, Pickzone, Verkehrsweg, Tor

Im Grundriss steht nicht nur, was etwas **aufnimmt**. Eine Halle hat Flächen,
die nichts aufnehmen und trotzdem den Betrieb bestimmen:

| Fläche | Was sie sagt |
|---|---|
| **Stellfläche** | hier darf etwas stehen — Anlieferung, Paletten, Cases |
| **Pickzone** | hier wird zusammengestellt, nicht gelagert |
| **Verkehrsweg** | muss frei bleiben (ASR A1.8) |
| **Tor** | der Weg hinein und hinaus, mit lichtem Mass |
| **Sperrfläche** | darf nicht genutzt werden — Löschbereich, Tropfstelle |

Sie sind **keine Lagerorte**: ein Tor nimmt nichts auf, ein Verkehrsweg soll
nichts aufnehmen. Beides als Lager-Knoten zu führen hiesse, dass der Baum
„Halle 1 › Tor Nord › Shure SM58" anbietet — eine Adresse, die es nicht gibt.

**Und sie sind mehr als Bild.** Ein Lagerort auf einem Verkehrsweg, vor einem
Tor oder in einer Sperrfläche ist ein **Befund** — gemeldet, nicht verboten,
denn beim Umbau steht das Regal im Gang, weil es gerade nirgendwo anders hin
kann. Es steht dort aber nicht still.

**Das engste Tor sind zwei Tore.** Das schmalste und das niedrigste können
verschiedene sein, und was durch beide muss, muss durch beide Masse. Eines
davon „das engste" zu nennen wäre eine Auskunft über ein Tor, das es so nicht
gibt. Das lichte Mass steht ausserdem getrennt von der Bauteilhöhe: bei einem
Sektionaltor sind das zwei Zahlen, und die falsche kostet ein Case.

### Kennungen: A1, A-01-02 — nach dem Schema des Hauses

**Dafür gibt es keine Norm.** Gasse, Feld und Ebene ist die verbreitete
Adressierung, aber jedes Haus schneidet sie anders: „A1" im kleinen Lager,
„A-01-02" mit führenden Nullen im grossen. Das Schema wird deshalb
eingestellt und nicht angenommen — dieselbe Entscheidung wie beim
Scan-Prefix der Inventur, der ausdrücklich „eine Hausregel, keine Norm" ist.

Eine Stufe ist eine Art (Gasse, Reihe, Feld, Ebene, Platz), ein Zeichensatz
(Buchstaben laufen wie Tabellenspalten: nach Z kommt AA) und eine Auffüllung.
`domain/lib/platzkennung.ts` baut die Kennung **und liest sie zurück** — ohne
den Rückweg wäre ein gescanntes „A-01-02" eine Zeichenkette, die zufällig wie
eine Adresse aussieht. Wo zwei Lesarten möglich wären („1102" ist 1|102 und
11|02 zugleich), entscheidet sich das Werkzeug nicht, sondern sagt nein.

**Eine Reihe wird auf einmal beschriftet:** acht Felder und vier Ebenen sind
zweiunddreissig Kennungen, und die tippt niemand ab. Angefasst wird nur, was
noch keine trägt — eine Kennung, die schon auf einem Aufkleber steht, wird
nicht still geändert. Doppelt vergebene Kennungen werden gemeldet, nicht
verhindert.

### Die Kennung ist die Adresse — überall dieselbe

Der Lagerort steht nicht nur in diesem Werkzeug. Er steht auf einem Aufkleber
am Regal, in einer CSV-Spalte, im Kabelplan als Freitext — und überall als
**Text**. Damit derselbe Text überall denselben Platz meint, löst genau eine
Stelle ihn auf: `domain/lib/platzAufloesen.ts`, über vier Wege in dieser
Reihenfolge — die Kennung am Knoten, die Kennung nach dem Hausschema, der
Pfad („Regal A / Ebene 2", auch mit `›`, `>` oder `|`), zuletzt der Name.

**Der Aufkleber schlägt den Namen.** Wer ein Regal umbenennt, ändert nicht das
Etikett, das daran klebt. Und der Name hängt ausserdem an der Sprache von
damals: eine Ebene, die bei englischer Oberfläche entsteht, heisst „Level 2" —
auch für jemanden, der später „Ebene 2" tippt. Die Kennung „A1-2" ist in jeder
Sprache dieselbe. Wer über Werkzeuggrenzen hinweg auf einen Platz zeigt, zeigt
auf die Kennung.

**Mehrdeutig ist ein Ergebnis und kein Fehler.** Zwei Regale heissen „Regal A"?
Dann gibt es keine Antwort, sondern die Frage „welcher?" mit beiden Pfaden.

In der Bestands-Tabelle steht der Lagerort deshalb als **Kennung mit Pfad**
und ist dort auch **eintippbar** — Umräumen geht durch `moveItem`, wird also
geprüft und ins Journal geschrieben.

### Ebenen sind echte Lagerplätze

Ein Regal mit vier Ebenen trägt im Grundriss die Zahl 4 — und einen Knopf, der
daraus vier Lagerplätze macht: `A1-1` bis `A1-4`, die Kennung des Regals
fortgesetzt. **Ohne sie kann „Regal A Ebene 1" auf nichts zeigen:** solange die
Ebene nur eine Zahl ist, gibt es dort keinen Platz, in den etwas gelegt werden
kann — weder von Hand, noch aus einem anderen Werkzeug, noch per Scan.

Der Trenner ist dabei nicht verhandelbar: ohne ihn wäre „A1" + Ebene 2 gleich
„A12", und das ist unter einem Schema aus Reihe und Feld die Kennung von Regal
A, Feld 12. Hat das Hausschema keinen Trenner, ergänzt das Werkzeug den
Bindestrich — und sagt es.

**In der 3D-Ansicht** bekommt eine belegte Ebene eine Fläche. Das ist die eine
Aussage, die der Grundriss nicht machen kann: „in Regal A liegt etwas, und zwar
auf Ebene 2".

### Etiketten für die Regale

Ein A4-Bogen zum Ausdrucken, in drei Grössen (Regalschild, Fachschild, klein),
die A4 **kacheln** — 2, 3 oder 4 je Reihe.

Die Form folgt einem gemessenen Bedarf und nicht dem Geschmack: Nr. 70 der
Suite-Recherche („Labels that survive the warehouse"), belegt an offenen
Snipe-IT-Issues — eine Vorlage für alle Grössen führt dazu, dass Etiketten mit
der Schere beschnitten werden, und ein fehlender Klartext lässt keinen Rückweg,
wenn der Code zerkratzt ist. Deshalb: **die Kennung gross als Text** (ein
Regalschild wird aus fünf Metern gelesen, nicht gescannt), der Pfad darunter,
drei Grössen.

**Kein Strichcode in diesem Bogen**, und das ist eine Entscheidung: er müsste
hier erzeugt werden — mit einer Bibliothek, die dieses Repo nicht hat, oder als
Bild aus dem Netz, was offline-first verbietet. Ein falsch gerasterter Code,
der beim Scannen versagt, ist schlimmer als keiner: er sieht aus, als müsste er
gehen.

Noch ohne Bedienung bleiben `addSet` und `addUnit`: ein Kit ist keine
Lagerstelle und eine serialisierte Einheit ist ein Stück mit Seriennummer —
zwei andere Fragen, die nicht in denselben Baum gehören, nur weil sie im
selben Store liegen.

## Ladeplanung

Was fährt mit — und trägt das Fahrzeug es? Die Ansicht **Load** rechnet einen
Ladeplan und zeigt ihn, statt Koordinaten aufzulisten.

**Der Packer** (`src/domain/lib/loadPacker/`) rechnet **frei in 3D**, nicht im
Raster: die Branche lädt Peli-Cases, weiche Taschen und Stative in Sprinter,
Ducato und Kofferräume, und dort gibt es kein Packmass, sondern Radkästen und
Reste. Verfahren ist eine Extreme-Point-Heuristik mit achsparallelen
Hüllquadern; berücksichtigt werden Stützfläche, Stapelregeln des Cases
(`noLoadOnTop`, `maxStackKg`, `maxLayers`), erlaubte Lagen, die Ladeöffnung,
Hindernisse im Laderaum und das Gewicht.

**Der Laderaum ist kein Quader.** Dachkanten sind gerundet, Wände laufen nach
oben zusammen, ein Kofferraum verjüngt sich zur Heckklappe. Jede der zwölf
Kanten lässt sich gefast (`fase`) oder gerundet (`rundung`) eintragen — bei
den Fahrzeugen, mit zwei Massen und in der Sprache dessen, der misst
(„Dachkante rechts", „Raumecke hinten links"). Packer, Draufsicht und
3D-Ansicht lesen **dieselbe** Rechnung (`src/domain/lib/kontur.ts`): der
Packer analytisch und exakt, die Bilder in Sehnen, die nach innen liegen —
kein Bild zeigt mehr Platz, als es gibt. Ohne Eintrag bleibt die Kante
scharf; Vorgabewerte je Fahrzeugklasse gibt es bewusst nicht.

**Was nicht passt, wird benannt — mit Grund.** „Passt nicht durch die
Heckklappe", „Stützfläche zu klein", „eine Stapelregel des Cases darunter
verbietet es". Ein Plan, der Stücke stillschweigend weglässt, ist am Dock
gefährlicher als gar keiner.

**Warum das hier liegt und nicht in einem eigenen Repo**, steht in
[ADR-010 „Die Ladeplanung ist ein Modul des Lagers"](https://github.com/larszu/av-planner-suite/blob/main/docs/decisions/ADR-010-ladeplanung-im-lager.md).
Kurz: die Case-Maße gehören dem Lager, und `CasePackedItem.itemId` zeigt auf
echten Bestand — deshalb heißt „Case 7 fehlt" hier automatisch „die
Ersatz-Funkstrecke fehlt auch". Ein Ladeplaner, der bei einer Tabelle
anfängt, kann das nicht.

**Die Reihenfolge zählt mehr als die Dichte.** Jedes Stück bekommt eine
Abladegruppe; der Packer legt die zuerst gebrauchte an die Öffnung. Wo das mit
der Passgenauigkeit kollidiert, sagt das Werkzeug, was es kostet, statt
stillschweigend umzuräumen.

**Die Gruppe setzt man am Stück** — ein Feld je Stück unter „Abladegruppe je
Stück", mit Vorschlagsliste der schon vorhandenen Gruppen. Tippen legt eine
neue an. Daneben steht ein Knopf, der die Gruppen **aus der Artikel-Kategorie**
vorschlägt (Lighting → Licht, Microphones → Ton, Cameras/Lenses/Tripods →
Video …). Er sagt vorher, was er tun wird („7 von 12 bekämen eine Gruppe, 3
haben keine zu holen, 2 behalten die von Hand gesetzte"), und er fasst eine von
Hand gesetzte Gruppe **nicht** an: die Abladereihenfolge ist eine Aussage über
den Aufbau, nicht über den Artikel. Ein Artikel ohne passende Kategorie bekommt
**keine** Gruppe — nicht „Sonstiges"; ohne Gruppe wird zuletzt abgeladen, und
das ist die ehrliche Vorgabe.

**Zwei Abladestellen an einer Fahrt** brauchen kein eigenes Feld: „Halle A ·
Licht" vor „Halle B · Ton" ist genau die Ordnung, nach der der Packer
schichtet. Ein zweites Feld „Stelle" wäre eine zweite Wahrheit über dieselbe
Reihenfolge.

**Bedient wird mit der Hand.** In der Draufsicht zieht man ein Case an seinen
Platz — mit der Maus oder mit dem Finger. Ein von Hand gesetztes Stück ist
**verankert**: der Packer fasst es nicht mehr an. Auf Wunsch kommt die
**3D-Ansicht** dazu (Drehen links, Schieben rechts, Zoom auf dem Rad — die
mittlere Maustaste wird nirgends gebraucht). Dort lassen sich die beiden
Ziehrichtungen **einzeln sperren** — wer eine Kiste nur nach hinten schieben
will, stösst sie sonst nebenbei zur Seite. Eine dritte Sperre für die Höhe
gibt es nicht: die stapelt der Packer.

**Was nicht geht, steht da, solange man zieht.** Beide Ansichten fragen
dieselbe Stelle (`src/domain/lib/platzGueltig.ts`) und schreiben den Grund
hin — „ragt heraus", „dort ist der Laderaum gerundet", „dort steht schon X".
Unterschieden wird dabei, was wirklich im Weg ist: ein Stück, das der Packer
selbst gesetzt hat, rückt zur Seite, und das Werkzeug sagt das auch so statt
rot zu warnen. Wer trotz einer echten Warnung loslässt, behält seine Lage —
sie ist verankert —, findet sie aber unter **Was es gekostet hat** wieder.

### Fahrzeuge: ausmessen, ableiten, weitergeben

**Wie man ein Fahrzeug ausmisst** steht in der Ansicht selbst: sechs Masse,
in der Reihenfolge, in der man einmal ums Fahrzeug geht, jedes mit der
Stelle, an der angesetzt wird. Die wichtigste Zeile darin ist die vierte —
die **Bodenbreite zwischen den Radkästen** ist eine andere Zahl als die
Breite darüber, und sie ist die, an der eine Europalette scheitert. Im Modell
ist die obere `cargoMm.widthMm`, die untere gehört als Radkasten unter die
Hindernisse, dort, wo sie auch im Weg ist.

**Alles am Fahrzeug ist änderbar, nicht nur beim Anlegen.** Unter
*Stammdaten und Laderaum* stehen Name, Klasse, die Maße des Laderaums, die
Ladeöffnung, Hebebühne, ebener Boden, Führerscheinklasse, Herkunft der Zahlen
und Notizen. Die Maße des Laderaums übernehmen erst auf Knopfdruck: bei jedem
Tastendruck zu speichern hieße, den Plan während des Tippens dreimal neu zu
rechnen.

**Wer den Laderaum ändert, liest vorher, was es kostet.** Der Packer rechnet
danach neu, und das kostet nichts — seine Platzierungen sind Vorschläge.
*Verankerte* Stücke sind es nicht: sie stehen dort, weil jemand sie
hingestellt hat. Passen sie nach der Änderung nicht mehr, werden sie **mit
Namen und Grund genannt**, bevor übernommen wird — verschoben wird nichts.
Diese Entscheidung gehört dem Menschen.

**Einbauten lassen sich eintragen** — Radkasten, Sitzbank, Ersatzrad, Aufbau.
Bis dahin kamen sie nur über den Import herein, obwohl der Packer mit ihnen
rechnet und beide Ansichten sie zeichnen; für einen ausgebauten Bus ist der
Radkasten die wichtigste Angabe überhaupt. Was nicht stimmt, wird **gemeldet
und nicht verboten**: „ragt aus dem Laderaum", „reicht in eine Rundung",
„überschneidet *Ersatzrad*". Ein Aufbau darf an der Öffnung überstehen, und
wer gerade misst, hat Zwischenstände.

**Der Radkasten lässt sich aus der Reifengröße herleiten.** `235/65 R16C` ist
eine genormte Angabe und keine Schätzung: Nennbreite 235 mm, Flanke 65 %
davon, Felge 16 Zoll — daraus folgt der Außendurchmesser exakt
(`16 × 25,4 + 2 × 152,75 = 711,9 mm`). Breite und Länge des Kastens ergeben
sich mit einem Zuschlag fürs Gehäuse, der als Feld dasteht (Vorgabe 30 mm,
gemessen ist er nicht). **Die Höhe über dem Ladeboden wird gefragt und nicht
gerechnet** — sie hängt daran, wie hoch der Boden über der Achse liegt, und
das steht in keiner Reifengröße. Eine hergeleitete Höhe sähe im Ladeplan aus
wie eine gemessene, und der Packer stapelt darauf. Ein Knopf legt beide
Kästen an, links und rechts, auf dem Boden.

**Im 3D-Bild lässt sich ein Einbau anfassen und schieben** — wer den Ladeplan
offen hat, sieht, dass der Radkasten zu weit vorn sitzt, und zieht ihn an
seinen Platz. Wie beim Case: x und z, mit denselben Achsensperren. Die Höhe
wird gemessen und nicht geschoben.

**Eigene Fahrzeuge lassen sich aus- und einlesen** (`avplan-vehicles`, eine
eigene Datei — ein Fahrzeug ist kein Lagerbestand, und das portable
Lager-Format liegt byte-gleich in allen Planern).

**Einen Startsatz mit belegten Zahlen gibt es noch nicht** (#19), und das ist
kein Versäumnis, sondern die Hausregel: jeder Stammdatensatz müsste eine
Quelle tragen — Datenblatt oder Zulassungsbescheinigung —, und die Quellen
sind aus der Bauumgebung nicht erreichbar (gemessen 2026-09-18:
`mercedes-benz.de` und selbst `wikipedia.org` antworten mit `EGRESS_BLOCKED`).
Zahlen aus einer Suchergebnis-Zusammenfassung abzuschreiben, die niemand an
der genannten Stelle nachlesen kann, wäre genau das, was die Regel verbietet.
Das Gerüst steht: `src/domain/data/fahrzeugKatalog.ts` nimmt Einträge auf,
`katalogMaengel` lässt keinen ohne Quelle und kein Pflichtmass auf 0 durch,
und ein Test führt das bei jedem Lauf aus. Der erste Eintrag muss die
Prüfung bestehen.

### Das Packmass-Raster

Das Packmass der Branche ist **1200 × 600 und 1200 × 800**, gerechnet auf
2,40 m Ladebreite: 4 × 600 quer oder 3 × 800 quer, und beides geht auf. Wo
das gilt, ist freies Packen nicht unnötig, sondern **falsch** — die Crew
erwartet saubere Reihen und keine optimal verkeilte Wand, die sich nicht
abladen lässt.

**Das Raster ist kein zweiter Solver**, sondern ein Filter auf die
Kandidatenpositionen des Kerns. Kollision, Stützfläche, Stapelregeln und
Öffnung bleiben identisch; sonst gäbe es zwei Antworten auf die Frage, ob
etwas passt.

Es **teilt quer und nicht längs**: die Reihe läuft quer durchs Fahrzeug, in
der Länge läuft sie durch. Ein 1200 mm tiefes Case steht auf einem 800er
Raster sauber in seiner Reihe, obwohl 1200 kein Vielfaches von 800 ist.

**600 und 800 sind zwei Raster und nicht eines.** Ihr grösster gemeinsamer
Teiler ist 200, und ein 200er-Netz ist fast dasselbe wie frei. Ein Haus fährt
das eine oder das andere; das Raster steht deshalb am **Fahrzeug** (Vorgabe:
LKW und Sattelzug 600 mm, Transporter keines — dort ist der Laderaum keine
2,40 m breit).

Wie streng es gilt, steht an der **Ladung**: *Gemischt* (Packmass-Cases in
die Reihe, alles andere frei in die Reste — der Alltagsfall), *nur im Raster*
oder *frei*. Die Draufsicht zeichnet die Rasterlinien, und die Auswahlzeile
sagt je Stück, ob es in der Reihe sitzt.

### Was am Dock an der Bordwand hängt

Am Dock steht niemand mit der 3D-Ansicht. Vier Ausgaben, alle ohne Electron —
das Repo liefert auch als Web-Seite aus:

* **Ladeplan** — je Lage eine Draufsicht im Umriss des Laderaums (nicht im
  Rechteck des Hüllquaders), Stücke in Ladereihenfolge nummeriert, Legende
  nach Abladegruppe. SVG und kein Bildschirmfoto: ein Rasterbild hat die
  Auflösung des Bildschirms, ein SVG die des Druckers.
* **Dock-Checkliste** — eine Zeile je Stück mit Kästchen, in 13 pt für
  schlechtes Hallenlicht. Auf demselben Blatt die **Rückladeliste**: dieselbe
  Liste rückwärts, denn der Abbau läuft so.
* **Case-Etiketten** — Nummer gross, darunter Ladung, Gruppe und Platz.
* **CSV** der Ladung für die Weitergabe.

**Jedes Blatt trägt Fahrzeug, Datum, gesetztes Gewicht und den
Haftungshinweis** — und was nicht eingeplant werden konnte, steht **mit
Grund** darauf und nicht nur im Werkzeug. Wer am Dock ein Case vermisst, soll
auf dem Papier lesen, warum, statt es im Lager zu suchen.

### Gewicht, Schwerpunkt, Achslast

**Gewicht ist die härtere Grenze.** Ein 3,5-Tonner ist oft bei unter 1.200 kg
Zuladung am Ende — wer nach Volumen packt, ist überladen, bevor der Laderaum
voll ist. Die Positionen stehen nach dem Packen fest; Schwerpunkt und
Achslast fallen als Hebelrechnung daraus heraus
(`src/domain/lib/lastverteilung.ts`).

Der **Lastverteilungsplan** ist in Deutschland das Papier, nach dem bei einer
Kontrolle gefragt wird. Er lässt sich drucken, mit Fahrzeug, Ladung,
Schwerpunkt, Achslasten, Merkliste der Sicherungsmittel und Datum.

**Er erteilt keine Freigabe.** Das Werkzeug rechnet und zeigt; die
Verantwortung für die Ladungssicherung bleibt bei Fahrer und Verlader, und
der Satz steht im Kopf des Blattes und nicht im Kleingedruckten.

**Vier Stellen, an denen geschwiegen wird, obwohl gerechnet werden könnte:**
kein einziges gewogenes Stück · ein gesetztes Stück ohne Gewicht (der
Schwerpunkt kommt trotzdem, mit der Zahl der ungewogenen daneben — die
Achslast nicht) · mehr als zwei Achsen (statisch überbestimmt, das hängt an
der Federung) · keine gewogene Leerlast je Achse (dann steht da, was die
Ladung beiträgt, und ausdrücklich nicht, ob die Achse überladen ist). Eine
Achslast aus geschätzten Fahrzeugdaten sähe auf dem Ausdruck aus wie eine
Messung, und bei der Kontrolle wiegt die Waage.

Eingetragen werden die Zahlen am Fahrzeug unter **Gewichte und Achsen** —
zulässige Gesamtmasse, Leermasse, Nutzlast, je Achse die zulässige Achslast
und die gewogene Leerlast, dazu die eine Zahl, die niemand erwartet: wie weit
die Ladefläche hinter der Vorderachse liegt. Ohne sie steht der Laderaum
nirgends am Fahrzeug, und ohne das gibt es keinen Hebelarm. **Nichts davon
wird aus etwas anderem gerechnet** — Nutzlast ist nicht zGG minus Leermasse,
sobald ein Aufbau, eine Hebebühne oder eine volle Tankfüllung dazwischen
liegt.

Three.js liegt hinter einer `lazy`-Grenze und wird erst geladen, wenn eine
3D-Ansicht geöffnet wird. Gemessen 2026-09-18: Startpaket **408 kB**
(gzip 126 kB), der gemeinsame Three-Brocken **916 kB** — und der steht in
keinem Skript, das die Seite beim Start holt. `dreiGrenze.node.test.ts` misst
nicht mehr den Ordner, sondern die Grenze: welche Dateien Three ziehen, wird
gefunden statt aufgezählt, und jede davon muss über `lazy()` geholt werden.

### Beladen — der Blick aus der Ladeöffnung

Derselbe Plan hat einen zweiten Modus, und der ist für die andere Seite
gedacht: nicht den Schreibtisch, sondern das Heck. Man schaut **aus der
Ladeöffnung** in den Laderaum und sieht drei Dinge:

* **was schon drin steht** — voll ausgefüllt,
* **die eine Lücke**, in die das nächste Stück gehört — als heller Umriss,
* **sonst nichts.** Kisten, die noch nicht dran sind, stehen dieser Frage im
  Bild nur im Weg.

Das Bild baut sich also Stück für Stück auf, während geladen wird. Vermerkt
wird per **Scan** (dieselbe Kamera-Erkennung wie in der Inventur) oder mit
einem Knopf, wenn der Aufkleber hinüber ist. Ein Code, der im Bestand steht
aber nicht zu dieser Fahrt gehört, wird ausdrücklich so gemeldet — „falsches
Fahrzeug?" ist der teurere Fall und darf nicht als „unbekannt" durchgehen.

Darüber läuft der **Lade-Streifen**: der ganze Plan in Ladereihenfolge, jede
Kachel mit ihrem Stand — *geladen · wird geladen · folgt*. Er rollt von selbst
auf das laufende Stück und lässt sich mit dem Daumen schieben; verstaut und
zurückgeholt wird direkt an der Kachel. Er zeigt **alles** und keinen
Ausschnitt: wer eine Kiste sucht, die er vor zehn Minuten falsch abgestellt
hat, findet sie sonst nicht mehr. „Wird geladen" ist dabei kein gespeicherter
Zustand, sondern das nächste Stück nach Plan — eine Ableitung kann nicht
hängenbleiben.

Daneben steht das **Schicht-Modell**: was in welcher Lage steht, und was davon
schon verstaut ist. Beim Laden arbeitet man eine Lage ab und stellt dann die
nächste darauf; wer nur eine Reihe sieht, merkt den Wechsel nicht.

**Aus der Reihe laden ist erlaubt und wird gemeldet.** Wer ein Case einlädt,
hat es in der Hand — vielleicht stand der Hänger im Weg. Das Werkzeug sagt,
was dadurch schwerer wird („zwei Stücke, die davor stehen sollten, fehlen
noch") und lässt den Menschen entscheiden. Ein Werkzeug, das am Dock „nein"
sagt, wird umgangen und weiss danach gar nichts mehr.

**Noch nicht gebaut:** Fahrzeug-Stammdaten mit Quelle (#19 — die Gewichte und Achsen daraus stehen
seit #24, die Herkunftsangabe noch nicht). Aus #25 fehlt XLSX; CSV ist da,
und eine zweite Tabellenfassung wäre eine zweite Wahrheit über dieselbe
Ladung.

## Marke

Die Oberfläche folgt dem Corporate Design der **Lars Zumpe Medienproduktion**
(Brand Guide 2.0) und damit ADR-007 der Suite: Deep Navy als Grund, Zumpe Navy
als Fläche, Off-White und Eisblau als Schrift, Stahlblau für Meta — **keine
Rundungen, keine Schatten, keine Verläufe**. Struktur entsteht durch die
Linie, Bedeutung durch den Punkt.

**Tally-Rot ist Signal und sonst nichts:** der Punkt im Primärknopf, der
Fokusring, die Öffnungskante in der Draufsicht. Nie Fläche, nie Text, nie
Rahmen — und nie zweimal in einem Sichtfeld. Die Meldefarben (`--warn`,
`--gefahr`, `--ok`) sind ausdrücklich **nicht** dasselbe; wer eine Warnung in
Tally-Rot setzt, nimmt dem Aufnahmelicht seine Bedeutung.

**Der Druckbogen ist die helle Anwendung derselben Palette** (Print 60 %
Off-White, Web 70 % Deep Navy — dieselben Farben, gedrehte Gewichtung), mit
Kicker und Kopflinie und ohne Rot. Hausschrift ist **Public Sans**; sie wird
nicht aus dem Netz geladen, weil dieses Repo offline-first ist, sondern
zuerst genannt und dann auf die Kette des Handbuchs zurückgefallen.

Gemessen wird das von `markenPalette.node.test.ts` — Token-Schicht, Druckbogen,
Schrift und die Regel „ein Signal pro Abschnitt".

## Stand

Erste Fassung. Übernommen ist die Domäne aus
`cable-planner/src/renderer/lager/` — Bestand, Lagerbaum, serialisierte
Einheiten, Ausgabescheine, Schäden, Sub-Hire — plus eine eigene Oberfläche über
den drei Fragen.

**Noch nicht hier:** der Deckungs-Abgleich gegen einen Plan (er braucht den
Bedarf von der anderen Seite), Scannen, Drucken, und der Umzug der
Cable-Planner-Seite auf dieses Repo. Der Cable-Planner behält seine Kopie,
solange das nicht steht — nach ADR-006 wird einzeln geschnitten, mit grünem CI
dazwischen, und der Planer bleibt in jedem Zwischenstand lauffähig.
