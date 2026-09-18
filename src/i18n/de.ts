// ───────────────────────────────────────────────────────────────────────────
// Deutsche Übersetzung des Lagers.
//
// Englisch ist die Quellsprache (E-28, Nutzer-Entscheidung 2026-09-11): sie
// steht als zweites Argument in `t()` direkt im JSX. Hier steht NUR die
// Übersetzung. Fehlt ein Schlüssel, erscheint der englische Quelltext — das
// ist kein Fehler, sondern die Rückfallebene.
//
// Eine weitere Sprache ist eine Datei wie diese plus ein Eintrag in
// `WOERTERBUECHER` (`i18n/index.ts`). Keine Zeile Logik.
//
// Sortiert nach Schlüssel, damit ein fehlender Eintrag beim Lesen auffällt
// und zwei Leute nicht an derselben Stelle einfügen.
// ───────────────────────────────────────────────────────────────────────────
export const de: Record<string, string> = {
  // ── Inventur (Sicht + domain/lib/inventoryAudit.ts) ──
  'audit.cam.back': 'Auf Rückkamera',
  'audit.cam.front': 'Auf Frontkamera',
  'audit.cam.hint':
    'Erkannte Codes landen in derselben Liste wie getippte. Wer zweimal dasselbe Etikett vor die Kamera hält, bekommt zwei Zeilen — dazwischen liegt eine Sperre von anderthalb Sekunden, damit ein Aufkleber im Bild nicht dreissig Zeilen pro Sekunde erzeugt.',
  'audit.cam.off': 'Kamera aus',
  'audit.cam.on': 'Mit Kamera scannen',
  'audit.code': 'Kennung',
  'audit.code.aria': 'Kennung des Lagerplatzes',
  'audit.code.placeholder': 'Kennung des Regals / Raums',
  'audit.col.checkedAt': 'Geprüft an',
  'audit.col.code': 'Code',
  'audit.col.expected': 'Erwartet in',
  'audit.col.model': 'Modell',
  'audit.col.object': 'Objekt',
  'audit.col.outcome': 'Ergebnis',
  'audit.col.via': 'Wie erfasst',
  'audit.col.viaShort': 'Wie',
  'audit.expectedHere': 'Soll hier liegen ({n})',
  'audit.expectedIn': 'erwartet in',
  'audit.isHere': 'liegt hier',
  'audit.missing': 'Fehlt ({n})',
  'audit.missing.allFound': 'Alles, was hier liegen soll, wurde erfasst.',
  'audit.missing.none': 'Hier wurde nichts erwartet — es kann also auch nichts fehlen.',
  'audit.noCam': 'Kein Kamera-Scan auf diesem Gerät.',
  'audit.noCode': 'ohne Code',
  'audit.noPrefix':
    'Kein Prefix hinterlegt — dann prüft an dieser Stelle nichts. Trage die Hausregel ein, wenn es eine gibt.',
  'audit.noSuchPlace': 'Kein Lagerplatz mit der Kennung „{code}".',
  'audit.notFound': 'Nicht gefunden',
  'audit.nothingExpected':
    'Der Datensatz verortet hier nichts. Das ist etwas anderes als „hier ist nichts" — es kann auch heißen, dass für die Objekte hier nie ein Lagerort hinterlegt wurde.',
  'audit.nothingRecorded': 'Noch nichts erfasst.',
  'audit.outcome.here': 'Am erwarteten Ort',
  'audit.outcome.isLocation': 'Das ist ein Lagerort, kein Objekt',
  'audit.outcome.noLocation': 'Ohne Lagerort im Datensatz',
  'audit.outcome.unknown': 'Nicht im Bestand',
  'audit.outcome.wrong': 'Am falschen Ort',
  'audit.pick.aria': 'Lagerplatz aus der Liste wählen',
  'audit.pickWithoutScan': 'Ohne Scan wählen',
  'audit.place': 'Lagerplatz',
  'audit.placeFirst':
    'Erst der Ort, dann die Objekte. Ohne ihn kann keine Zeile sagen, ob etwas am richtigen Platz liegt — das ist die ganze Frage einer Inventur.',
  'audit.prefix': 'Erwarteter Prefix',
  'audit.prefix.aria': 'Erwarteter Prefix für Lagerplätze',
  'audit.prefix.placeholder': 'z. B. L#',
  'audit.prefixMismatch':
    '„{code}" fängt nicht mit „{prefix}" an. Das ist die Kennung eines Lagerplatzes im Haus — steht sie am Case statt am Regal, wird gleich am falschen Ort inventiert.',
  'audit.record': 'Erfassen',
  'audit.recorded': 'Erfasst ({n})',
  'audit.scan.aria': 'Code des Objekts',
  'audit.scan.placeholder': 'Code scannen oder eintippen, Enter',
  'audit.sheet': 'Blatt laden (CSV)',
  'audit.step1': 'Schritt 1: Lagerplatz',
  'audit.step2': 'Schritt 2: Objekte an {place}',
  'audit.torch.off': 'Licht aus',
  'audit.torch.on': 'Licht an',
  'audit.via.pick': 'aus der Liste',
  'audit.via.scan': 'gescannt',
  'audit.viewfinder': 'Kamerabild',

  // ── Werte & Schäden: Prüffristen ──
  'checks.ageMonths': '{n} Mon. alt',
  'checks.ageNote':
    'Das Alter neben der Einheit kommt aus ihrem Kaufdatum und ist eine Angabe, kein Urteil: ab wann ein Akku zu alt ist, entscheidet das Haus — als Frist der Art „Akku".',
  'checks.allClear': 'Nichts überfällig und nichts in den nächsten {n} Tagen fällig.',
  'checks.col.days': 'Tage',
  'checks.col.due': 'fällig',
  'checks.col.kind': 'Art',
  'checks.col.model': 'Modell',
  'checks.col.source': 'Termin',
  'checks.col.unit': 'Einheit',
  'checks.coverage.full':
    'Jede Einheit trägt mindestens eine Frist; die Ampel deckt den ganzen Bestand.',
  'checks.coverage.many':
    'Für {n} Einheiten ist keine Frist hinterlegt — über sie sagt diese Ampel nichts, weder „geprüft" noch „fällig".',
  'checks.coverage.one':
    'Für eine Einheit ist keine Frist hinterlegt — über sie sagt diese Ampel nichts, weder „geprüft" noch „fällig".',
  'checks.daysOver': '{n} über',
  'checks.dueIn': 'fällig in {n} Tagen',
  'checks.empty':
    'Keine serialisierten Einheiten. Eine Prüffrist hängt am einzelnen Gerät, nicht am Modell — „die ULXD2 sind im März geprüft" ist eine Aussage über zwölf Geräte, von denen zwei in der Werkstatt standen.',
  'checks.interval': 'Intervall (Monate)',
  'checks.interval.aria': 'Intervall in Monaten',
  'checks.kinds.add': 'Art anlegen',
  'checks.kinds.basis': 'Grundlage',
  'checks.kinds.basis.aria': 'Grundlage der Frist',
  'checks.kinds.basis.example': 'z. B. DGUV Regel 100-500',
  'checks.kinds.every': 'alle {n} Mon.',
  'checks.kinds.hint':
    'Eingebaut sind {n} Arten. Alles, was dieses Haus zusätzlich prüft oder ablaufen lässt, steht hier — und reist in der Lager-Datei mit, damit ein Termin drüben nicht ohne seinen Grund ankommt.',
  'checks.kinds.interval.aria': 'Vorschlag für das Intervall',
  'checks.kinds.name': 'Name',
  'checks.kinds.name.aria': 'Name der neuen Fristart',
  'checks.kinds.name.example': 'z. B. Anschlagmittel',
  'checks.kinds.remove.title':
    'Eingetragene Termine dieser Art bleiben bestehen und werden danach als unbekannte Art angezeigt.',
  'checks.kinds.title': 'Eigene Fristarten ({n})',
  'checks.later': 'später',
  'checks.leadTime': 'Vorwarnzeit (Tage)',
  'checks.leadTime.aria': 'Vorwarnzeit in Tagen',
  'checks.new.add': 'Frist eintragen',
  'checks.new.kind.aria': 'Art der Frist',
  'checks.new.last': 'zuletzt erledigt',
  'checks.new.last.aria': 'Datum der letzten Erledigung',
  'checks.new.unit.aria': 'Einheit für die neue Frist',
  'checks.new.unit.none': '— Einheit —',
  'checks.overdue': 'überfällig',
  'checks.source.derived': 'aus Intervall',
  'checks.source.entered': 'eingetragen',
  'checks.title': 'Fristen',
  'checks.withoutDate': 'ohne Frist hinterlegt',

  // ── Gebunden (domain/lib/inventoryCommitment.ts) ──
  'committed.col.committed': 'gebunden',
  'committed.col.inStock': 'im Bestand',
  'committed.col.item': 'Artikel',
  'committed.col.where': 'wo',
  'committed.hint':
    'Diese Stücke zählt der Bestand mit, im Regal liegen sie nicht. Wer das nicht sieht, sucht das fünfte Stück dort, wo es nicht mehr ist.',
  'committed.none': 'Nichts gebunden — alle Ausgaben sind zurück.',
  'committed.note': '{n} auf offener Ausgabe ({where})',
  'committed.title': 'Auf offenen Ausgaben ({n})',

  // ── Was überall gleich heißt ──
  'common.notStated': 'nicht angegeben',
  'common.remove': 'Entfernen',

  // ── Schäden (domain/lib/damageRegister.ts) ──
  'damage.by.container': 'Container',
  'damage.by.person': 'Person',
  'damage.by.show': 'Show',
  'damage.col.count': 'Schäden',
  'damage.col.note': 'Vermerk',
  'damage.col.object': 'Objekt',
  'damage.col.with': 'bei',
  'damage.countBy': 'Zählen nach',
  'damage.countBy.aria': 'Schäden zählen nach',
  'damage.csv.container': 'Container',
  'damage.csv.damage': 'Schaden',
  'damage.csv.issuedTo': 'Ausgegeben an',
  'damage.csv.labelCode': 'Etiketten-Code',
  'damage.csv.noLabel': 'kein Etikett',
  'damage.csv.object': 'Objekt',
  'damage.csv.returnedOn': 'Zurück am',
  'damage.csv.show': 'Show',
  'damage.csvButton': 'Schadensregister (CSV)',
  'damage.empty':
    'Bei keiner Rückgabe wurde ein Schaden aufgenommen. Das ist etwas anderes als „nichts ist kaputt": es heißt, dass nichts vermerkt wurde.',
  'damage.title': 'Schäden ({n})',
  'damage.unnamed': 'nicht benannt',

  // ── Fristarten (domain/lib/fristen.ts) ──
  'deadline.kind.battery': 'Akku',
  'deadline.kind.calibration': 'Kalibrierung',
  'deadline.kind.other': 'Sonstige',
  'deadline.kind.service': 'Wartung',
  'deadline.kind.shelfLife': 'Haltbarkeit',
  'deadline.kind.unknown': '{id} (unbekannte Art)',

  // ── Ausgabescheine ──
  'checkouts.col.case': 'Container',
  'checkouts.col.due': 'Zurück bis',
  'checkouts.col.lines': 'Positionen',
  'checkouts.col.out': 'Ausgegeben',
  'checkouts.col.project': 'Projekt',
  'checkouts.col.to': 'An',
  'checkouts.count': '{open} offen, davon {late} überfällig · {all} insgesamt',
  'checkouts.empty':
    'Noch kein Ausgabeschein. Ein Schein entsteht, wenn ein Container das Lager verlässt — und er hält fest, was wirklich drin war, nicht was drin sein sollte.',
  'checkouts.noDue': 'kein Termin vereinbart',

  // ── Kopfzeile und Datei-Menü ──
  'brand': 'Lager',
  'file.importReport': '{ok} übernommen, {no} abgewiesen.',
  'file.unreadable': 'Die Datei ist kein lesbarer Lagerbestand (avplan-inventory).',
  'menu.about': 'Über Inventory Planner…',
  'menu.file': 'Datei',
  'menu.help': 'Hilfe',
  'menu.new': 'Neues Lager',
  'menu.new.confirm': 'Neues Lager — der aktuelle Bestand wird ersetzt. Fortfahren?',
  'menu.open': 'Öffnen…',
  'menu.save': 'Speichern',
  'menu.saveAs': 'Speichern unter…',
  'menu.saveAs.prompt': 'Dateiname',

  // ── Einstellungen ──
  'settings.about': 'Über',
  'settings.about.body': 'Das Lager der AV-Planner-Suite (ADR-006).',
  'settings.close': 'Schliessen',
  'settings.language': 'Sprache',
  'settings.language.hint':
    'Englisch ist die Quellsprache, Deutsch eine Übersetzung. Ein fehlender Eintrag fällt auf Englisch zurück.',
  'settings.theme': 'Thema',
  'settings.theme.dark': 'Dunkel',
  'settings.theme.dark.hint': 'Immer dunkel, unabhängig vom System.',
  'settings.theme.light': 'Hell',
  'settings.theme.light.hint': 'Immer hell, unabhängig vom System.',
  'settings.theme.system': 'Dem System folgen',
  'settings.theme.system.hint': 'Übernimmt, was das Betriebssystem sagt.',
  'settings.title': 'Einstellungen',

  // ── Eigentum (domain/lib/ownership.ts) ──
  'ownership.back': 'zurück',
  'ownership.backSince': 'zurück seit',
  'ownership.noReturnDate': 'kein Rückgabedatum',
  'ownership.owned': 'Eigen',
  'ownership.rented': 'Gemietet',
  'ownership.subhire': 'Sub-Hire',
  'ownership.supplierUnknown': 'Lieferant unbekannt',

  // ── Bestand ──
  'stock.aria.ownership': 'Eigentum von {model}',
  'stock.aria.qty': 'Menge von {model}',
  'stock.aria.target': 'Mindestmenge von {model}',
  'stock.col.category': 'Kategorie',
  'stock.col.location': 'Lagerort',
  'stock.col.model': 'Modell',
  'stock.col.ownership': 'Eigentum',
  'stock.col.qty': 'Menge',
  'stock.col.supplier': 'Lieferant',
  'stock.col.target': 'Ziel',
  'stock.countOf': '{shown} von {all}',
  'stock.create': 'Anlegen',
  // suite#231 — der Bestand hat jetzt einen eigenen Anlege-Block und einen
  // eigenen Zustand fuer „Suche ohne Treffer".
  'stock.create.head': 'In den Bestand aufnehmen',
  'stock.noHit': 'Nichts passt zu „{q}". Im Bestand stehen {all} Modelle.',
  'stock.clearSearch': 'Suche zuruecksetzen',
  'stock.empty':
    'Noch nichts im Bestand. Anlegen — oder eine vorhandene Lagerdatei einlesen; das Format ist zwischen den Werkzeugen dasselbe.',
  'stock.newModel': 'Neues Modell',
  'stock.newModel.aria': 'Modellbezeichnung',
  'stock.ownership.unset': 'nicht angegeben',
  'stock.remove': 'Entfernen',
  'stock.search': 'Suchen — Modell, Hersteller, Lieferant, Ort',
  'stock.search.aria': 'Bestand durchsuchen',
  'stock.target.title': 'Ab wann nachbestellt oder sub-hired wird. Leer heisst: nicht festgelegt.',
  'stock.targetExplain':
    'Ziel ist die Mindestmenge, ab der nachbestellt oder sub-hired wird — eine Entscheidung des Hauses, keine Vorgabe aus einer Show. Leer heisst nicht null, sondern nicht festgelegt; solche Artikel führt der Bericht unter „unbewertet" statt unter „reicht". Wie es aktuell steht, sagt dort der Block „Unter Ziel".',

  // ── Scannen und Beleg-Erkennung (lib/codeLeser.ts, lib/belegOcr.ts) ──
  'ocr.blocked.cancelled': 'Die Texterkennung wurde abgebrochen. Der Beleg ist unverändert.',
  'ocr.blocked.noLangData':
    'Die Sprachdaten für die Texterkennung sind nicht hinterlegt. Sie gehören als `deu.traineddata.gz` nach `public/tessdata/` — die Anleitung dazu liegt daneben. Bis dahin bleibt der Weg über eingefügten Text.',
  'ocr.blocked.noWorker':
    'Die Texterkennung liess sich nicht starten. Bis das geklärt ist, bleibt der Weg über eingefügten Text.',
  'scan.blocked.denied':
    'Die Kamera wurde abgelehnt. Im Browser über das Schloss-Symbol in der Adresszeile wieder freigeben.',
  'scan.blocked.insecure':
    'Die Seite läuft nicht über https oder localhost. Browser geben die Kamera nur in einem sicheren Kontext frei.',
  'scan.blocked.noApi': 'Dieser Browser stellt keine Kamera bereit (`navigator.mediaDevices` fehlt).',
  'scan.blocked.noDecoder':
    'Der mitgelieferte Barcode-Leser liess sich nicht laden. Solange das so ist, bleibt der Handscanner (er tippt in das Feld) oder „Ohne Scan wählen".',

  // ── Wareneingang ──
  'receiving.allReadable': 'Jede Zeile ist lesbar.',
  'receiving.book.many': '{n} Zeilen buchen',
  'receiving.book.one': '1 Zeile buchen',
  'receiving.booked': '{raised} Artikel erhöht, {created} Artikel neu angelegt.',
  'receiving.booked.hint': 'Der Beleg bleibt stehen, damit nachsehbar ist, was gerade passiert ist.',
  'receiving.case.create': 'Artikel anlegen',
  'receiving.case.raise': 'Menge erhöhen',
  'receiving.case.skipped': 'nicht gebucht',
  'receiving.col.after': 'Bestand danach',
  'receiving.col.becomes': 'daraus',
  'receiving.col.item': 'Artikel',
  'receiving.col.line': 'Zeile',
  'receiving.col.qty': 'Menge',
  'receiving.lines.aria': 'Positionen des Lieferscheins',
  'receiving.noQty': 'ohne Menge, offen',
  'receiving.ocr.aria': 'Foto oder Scan des Lieferscheins',
  'receiving.ocr.confidence': 'Erkennung {n} % sicher — Zeilen bitte durchsehen.',
  'receiving.ocr.running': 'Beleg wird gelesen…',
  'receiving.ocr.start': 'Beleg-Foto einlesen',
  'receiving.optional': 'optional',
  'receiving.ownership': 'Eigentum',
  'receiving.ownership.aria': 'Eigentum der neuen Artikel',
  'receiving.ownership.hint':
    'Das Eigentum gilt für die Artikel, die NEU angelegt werden. Was das Haus zumietet, gehört auf die Sub-Hire-Liste — eine Vorgabe wäre für die Hälfte der Lieferungen falsch, und zwar die teurere Hälfte.',
  'receiving.preview': 'Was daraus würde',
  'receiving.reason.empty': 'leere Zeile',
  'receiving.reason.noName': 'keine Bezeichnung in der ersten Spalte',
  'receiving.reason.notAQty': '„{value}" ist keine Menge',
  'receiving.reason.notSeparable': 'Menge und Bezeichnung nicht zu trennen',
  'receiving.receipt': 'Beleg',
  'receiving.receipt.hint':
    'Positionen aus dem Lieferschein hier hineinschreiben oder einfügen — eine je Zeile. Lesbar sind „4 x Shure ULXD2", „Shure ULXD2; 4; 249,00" (Semikolon oder Tabulator, wie aus einem Portal) und der blosse Name. Beim blossen Namen fehlt die Menge, und sie wird nicht als 1 erfunden.',
  'receiving.supplier': 'Lieferant',
  'receiving.unreadable.many':
    '{n} Zeilen sind nicht lesbar und werden nicht gebucht — sie stehen unten mit dem Grund.',
  'receiving.unreadable.one':
    'Eine Zeile ist nicht lesbar und wird nicht gebucht — sie steht unten mit dem Grund.',

  // ── Bericht: Packliste und Austausch ──
  'report.allPriced': 'Jede Zeile trägt einen Mietpreis; der Tagessatz deckt den ganzen Bestand.',
  'report.below.exact':
    '{n} Artikel liegen genau darauf — die nächste Ausgabe reisst die Lücke auf.',
  'report.below.n': '{n} Artikel liegen unter ihrer hinterlegten Mindestmenge.',
  'report.below.none': 'Kein Artikel liegt unter seiner hinterlegten Mindestmenge.',
  'report.below.unrated':
    'Für {n} weitere Artikel ist keine Mindestmenge hinterlegt; über sie sagt diese Liste nichts.',
  'report.belowTarget': 'Unter Soll',
  'report.by.category': 'Kategorie',
  'report.by.condition': 'Zustand der Einheit',
  'report.by.location': 'Lagerort',
  'report.by.material': 'Materialart',
  'report.by.ownership': 'Eigentum',
  'report.col.lines': 'Zeilen',
  'report.col.pieces': 'Stück',
  'report.csv.available': 'verfügbar',
  'report.csv.category': 'Kategorie',
  'report.csv.committed': 'gebunden',
  'report.csv.item': 'Artikel',
  'report.csv.short': 'Fehlmenge',
  'report.csv.stock': 'Bestand',
  'report.csv.target': 'Soll',
  'report.exchange': 'Bestand austauschen',
  'report.import.badFile':
    '„{name}" ist keine Datei im Format avplan-inventory — oder ihre Version ist neuer als die, die diese App liest.',
  'report.importFile.aria': 'Einzulesende Datei',
  'report.importMode.aria': 'Wie soll eingelesen werden',
  'report.importMode.merge': 'zusammenführen (nichts geht verloren)',
  'report.importMode.replace': 'ersetzen (der Bestand wird überschrieben)',
  'report.noPrice':
    '{without} von {all} Zeilen tragen keinen Mietpreis — der Tagessatz oben ist die Summe über den Rest, nicht über den Bestand.',
  'report.noTargets':
    'Nicht einer der {n} Artikel im Bestand hat eine Mindestmenge. Ohne so eine Zahl gibt es nichts zu vergleichen — die Spalte „Soll" in der Bestandssicht setzt sie.',
  'report.packList': 'Packliste',
  'report.packRoot.aria': 'Wurzel-Lagerort für die Packliste',
  'report.printBlocked': 'Das Blatt liess sich nicht öffnen — der Browser hat das Fenster blockiert.',
  'report.reorder.hint': 'Nur die Artikel unter Soll, mit der Fehlmenge.',
  'report.reorder.none': 'Nichts nachzubestellen.',
  'report.stockEmpty': 'Der Bestand ist leer — es gibt nichts zu vergleichen.',
  'report.tile.belowTarget': 'unter Soll',
  'report.tile.dailyRate': 'Tagessatz',
  'report.tile.dueChecks': 'Fristen fällig',
  'report.tile.lines': 'Zeilen',
  'report.tile.pieces': 'Stück insgesamt',
  'report.tile.units': 'serialisierte Einheiten',
  'report.exchange.export': 'Bestand exportieren',
  'report.exchange.format':
    'Format {name} — dieselbe Datei, die die Planer der Suite schreiben und lesen.',
  'report.exchange.onImport': 'Beim Einlesen',
  'report.packList.count': '{nodes} Knoten, {pieces} Stück.',
  'report.packList.empty':
    'Kein Wurzel-Lagerort angelegt. Eine Packliste beschreibt einen Container mit allem, was darin liegt — ohne Baum gibt es nichts zu beschreiben.',
  'report.packList.open': 'Blatt öffnen (A4)',
  'report.packList.root': 'Wurzel',

  // ── Sub-Hire ──
  'subhire.allTable': 'Alles fremde Material',
  'subhire.col.contract': 'Vertrag',
  'subhire.col.date': 'Termin',
  'subhire.col.model': 'Modell',
  'subhire.col.note': 'Vermerk',
  'subhire.col.qty': 'Menge',
  'subhire.col.supplier': 'Lieferant',
  'subhire.count': '{foreign} fremde Positionen · {due} brauchen eine Entscheidung',
  'subhire.dueTable': 'Zurück — überfällig oder ohne Termin',
  'subhire.empty':
    'Kein fremdes Material im Bestand. Was hier fehlt, ist keine Zusicherung: eine Position ohne Angabe zum Eigentum gilt als eigene — sie steht deshalb nicht auf dieser Liste, auch wenn sie gemietet ist.',
  'subhire.noDate': 'kein Rückgabedatum',
  'subhire.since': 'seit',
  'subhire.unknown': 'unbekannt',

  // ── Werte (domain/lib/insuranceSchedule.ts) ──
  'values.carnet.description': 'Beschreibung',
  'values.carnet.origin': 'Ursprungsland',
  'values.carnet.purchasePrice': 'Anschaffungspreis',
  'values.carnet.weight': 'Gewicht (kg)',
  'values.carnetButton': 'Carnet-Datenblatt (CSV)',
  'values.col.value': 'Wert',
  'values.csv.asOf': 'Stand',
  'values.csv.currency': 'Währung',
  'values.csv.houseRef': 'Hausreferenz',
  'values.csv.insuredValue': 'Versicherungswert',
  'values.csv.model': 'Modell',
  'values.csv.serial': 'Herstellernummer',
  'values.csv.sum': 'Summe ({n} Einheiten)',
  'values.csv.withoutValue': '{n} Einheiten ohne angegebenen Versicherungswert',
  'values.csvButton': 'Versicherungsliste (CSV)',
  'values.empty':
    'Keine serialisierten Einheiten. Ein Versicherungswert hängt an der einzelnen Einheit, nicht am Modell — ohne Einheiten gibt es nichts zu bewerten.',
  'values.noneValued': 'Keine einzige Einheit trägt einen Wert — es gibt nichts zu summieren.',
  'values.ofUnits': '{n} von {all} Einheiten',
  'values.title': 'Werte',
  'values.units.title': 'Einheiten mit Wert',
  'values.withoutValue.many':
    '{n} Einheiten ohne hinterlegten Wert — sie gehen in keine Summe oben ein:',
  'values.withoutValue.one':
    'Eine Einheit ohne hinterlegten Wert — sie geht in keine Summe oben ein:',

  // ── Reiter und ihre Fragen ──
  'tab.audit': 'Inventur',
  'tab.audit.q': 'Liegt hier, was hier liegen soll?',
  'tab.checkouts': 'Ausgabescheine',
  'tab.checkouts.q': 'Was ist draußen, bei wem, und seit wann?',
  'tab.receiving': 'Wareneingang',
  'tab.receiving.q': 'Was ist gekommen — und was macht das mit dem Bestand?',
  'tab.report': 'Bericht',
  'tab.report.q': 'Was steckt drin — und wie kommt es hier raus?',
  // ── Statusleiste (suite#231, ADR-007 Abschnitt 6) ──────────────────────
  // Je Reiter eine Zahl. Nichts davon wertet — es sind Anzahlen.
  'status.stock': '{n} Modelle · {p} Lagerplaetze',
  'status.checkouts': '{n} Ausgabescheine · {out} noch draussen',
  'status.subhire': '{n} Positionen gehoeren uns nicht',
  'status.units': '{n} serialisierte Einheiten',

  'stack.head': 'Stapel-Prüfung',
  'stack.intro':
    'Unteren und oberen Container wählen. Die Antwort unterscheidet „passt nicht" von „nicht gemessen" — das sind verschiedene Probleme.',
  'stack.noContainers': 'Noch keine Cases oder Transport-Cases im Bestand.',
  'stack.lower': 'Unterer Container',
  'stack.upper': 'Oberer Container',
  'stack.choose': 'Wählen…',
  'stack.fits': 'Passt.',
  'stack.doesNotFit': 'Passt nicht:',
  'stack.unknown': 'Nicht gemessen:',
  'stack.height': 'Stapelhöhe {mm} mm',
  'stack.heightUnknown': 'Stapelhöhe nicht berechenbar — ein Maß fehlt.',
  'stack.fields': 'Transport-Angaben — {name} ({role})',
  'stack.heightNow': 'Höhe in Stellung: {mm}',
  'stack.notGiven': 'nicht angegeben',
  'stack.castorHeight': 'Rollenhöhe (mm)',
  'stack.castorIncluded': 'Rollenhöhe in der Case-Höhe schon enthalten?',
  'stack.notMeasured': 'nicht gemessen',
  'stack.yes': 'ja',
  'stack.no': 'nein',
  'stack.castorKind': 'Rollenart',
  'stack.kind.swivel': 'freie Lenkrolle',
  'stack.kind.auto': 'Auto-Turn',
  'stack.kind.fixed': 'Bockrolle',
  'stack.dishDepth': 'Tellertiefe (mm)',
  'stack.noLoadOnTop': 'Auf dieses Case kommt nichts',

  'stack.castorsUnknown': 'Für das obere Case sind keine Rollen eingetragen.',
  'stack.castorTooLarge': 'Die Rolle ist größer, als der Teller aufnimmt.',
  'stack.dishesUnknown': 'Für das untere Case sind keine Rollenteller eingetragen.',
  'stack.insetUnknown': 'Für das obere Case ist kein gemessener Rollenabstand eingetragen.',
  'stack.noLoadOnTopMsg': 'Das untere Case ist als „nichts darauf" gekennzeichnet.',
  'stack.patternMismatch': 'Rollenraster und Tellerraster liegen nicht übereinander.',
  'stack.softNoRating':
    'Das untere Stück gibt nach und hat keine angegebene Belastbarkeit — damit trägt es nichts.',
  'stack.swivelNotAligned':
    'Freie Lenkrollen kehren nicht in eine bestimmte Stellung zurück; nötig sind Bock- oder Auto-Turn-Rollen.',
  'stack.tiltedNoDish':
    'Ein gekipptes Case hat keine Rollen unten, die Teller können es also nicht halten.',
  'stack.tooHeavy': 'Das obere Case überschreitet die angegebene Höchstlast.',
  'stack.weightUnknown': 'Für das obere Case ist kein Gewicht bekannt.',

  'tab.stack': 'Stapeln',
  'tab.stack.q': 'Kommt dieses Case auf jenes — und wie hoch wird der Turm?',

  'vehicle.add': 'Fahrzeug anlegen',
  'vehicle.aperture': 'Ladeöffnung:',
  'vehicle.apertureSize': '{w} x {h} mm',
  'vehicle.create.head': 'Fahrzeug anlegen',
  'vehicle.head': 'Fahrzeuge',
  'vehicle.height': 'Laderaum-Höhe (mm)',
  'vehicle.intro':
    'Ein Laderaum ist kein Quader: Radkästen verengen den Boden, und die Heckklappe ist kleiner als der Innenraum. Was nicht vermessen wurde, steht als nicht vermessen da.',
  'vehicle.itemNoDims': 'Für das Stück liegen keine vollständigen Außenmaße vor.',
  'vehicle.kind': 'Klasse',
  'vehicle.kind.boot': 'Kofferraum',
  'vehicle.kind.box35': '3,5-t-Koffer',
  'vehicle.kind.estate': 'Kombi',
  'vehicle.kind.lkw12': '12-Tonner',
  'vehicle.kind.lkw75': '7,5-Tonner',
  'vehicle.kind.semi': 'Sattelzug',
  'vehicle.kind.trailer': 'Anhänger',
  'vehicle.kind.van': 'Transporter',
  'vehicle.length': 'Laderaum-Länge (mm)',
  'vehicle.licence': 'Führerscheinklasse:',
  'vehicle.name': 'Name',
  'vehicle.noAperture': 'Für dieses Fahrzeug ist keine Ladeöffnung eingetragen.',
  'vehicle.none': 'Noch keine Fahrzeuge eingetragen.',
  'vehicle.noPayload': 'Für dieses Fahrzeug ist keine Nutzlast eingetragen.',
  'vehicle.notGiven': 'nicht angegeben',
  'vehicle.notMeasured': 'nicht vermessen — es lässt sich nichts dagegen prüfen',
  'vehicle.payload': 'Nutzlast:',
  'vehicle.payloadKg': '{kg} kg',
  'vehicle.remove': 'Entfernen',
  'vehicle.space': 'Brutto {brutto} l · netto {netto} l · Bodenbreite {boden} mm',
  'vehicle.width': 'Laderaum-Breite (mm)',

  'tab.vehicles': 'Fahrzeuge',
  'tab.vehicles.q': 'Was passt hinein — und wer darf es fahren?',

  'load.add': 'Ladung anlegen',
  'load.closePick': 'Auswahl schließen',
  'load.groups': 'Abladegruppen:',
  'load.head': 'Ladungen',
  'load.intro':
    'Die Container wählen, die mitfahren. Ein verschachteltes Case zählt einmal, zusammen mit seinem Transport-Case — nicht zweimal.',
  'load.name': 'Name der Ladung',
  'load.noContainers': 'Noch keine Cases oder Transport-Cases im Bestand.',
  'load.noVehicle': 'noch nicht gewählt',
  'load.noWeight': '{n} ohne Gewicht',
  'load.none': 'Noch keine Ladungen.',
  'load.openPick': 'Container hinzufügen',
  'load.payloadKg': '{kg} kg',
  'load.payloadLeft': 'Restliche Nutzlast:',
  'load.pickFor': 'Container für {name}',
  'load.pieces': '{n} Stücke · {kg} kg bekannt',
  'load.remove': 'Ladung entfernen',
  'load.take': 'Zur Ladung hinzufügen',
  'load.unplannable': '{n} Stücke lassen sich nicht einplanen — sie fahren trotzdem mit',
  'load.vehicle': 'Fahrzeug',

  'tab.load': 'Ladung',
  'tab.load.q': 'Was fährt mit — und trägt das Fahrzeug es?',

  'tab.stock': 'Bestand',
  'tab.stock.q': 'Was ist da, wieviel, und wo liegt es?',
  'tab.subhire': 'Sub-Hire',
  'tab.subhire.q': 'Was gehört uns nicht — und wann muss es zurück?',
  'tab.values': 'Werte & Schäden',
  'tab.values.q': 'Was ist es wert, was ist kaputt, und was ist gebunden?',

  // ── Ladeplan: Packer, Draufsicht, 3D (#20, #22, #23) ────────────────────
  'pack.noAperture':
    'Keine Ladeöffnung erfasst — niemand hat nachgesehen, ob die Stücke durch die Tür gehen.',
  'pack.noPayload': 'Keine Nutzlast eingetragen — das Gewicht wird summiert, aber nicht geprüft.',
  'pack.noDims': 'Keine Außenmaße erfasst — es fährt mit, es lässt sich nur nicht einplanen.',
  'pack.tooBigForAperture': 'Passt in keiner erlaubten Lage durch die Ladeöffnung.',
  'pack.noSupport': 'Kein Platz mit genug Auflage unter der Grundfläche — es würde kippen.',
  'pack.stackRule': 'Eine Stapelregel des Cases darunter verbietet es.',
  'pack.tooBig': 'In jeder erlaubten Lage größer als der Laderaum.',
  'pack.noRoom': 'Kein freier Platz mehr, in den es passt.',
  'pack.orderConflict':
    'Gruppe „{group}" passt nur, wenn {n} Stücke einer späteren Gruppe davor stehen.',
  'pack.overPayload':
    'Das gesetzte Gewicht übersteigt die Nutzlast — der Plan passt, das Fahrzeug nicht.',

  'plan.noVehicle':
    'Wähle ein Fahrzeug für diese Ladung — ohne Laderaum gibt es nichts einzuteilen.',
  'plan.grid': 'Raster',
  'plan.grid.free': 'frei',
  'plan.grid.mm': '{n} mm',
  'plan.show3d': 'In 3D zeigen',
  'plan.hide3d': '3D ausblenden',
  'plan.loading3d': 'Die 3D-Ansicht wird geladen…',
  'plan.releaseAll': '{n} von Hand gesetzte lösen',
  'plan.dragHint':
    'Zieh ein Case an seinen Platz. Was du gesetzt hast, bleibt stehen — der Packer fasst es nicht mehr an.',
  'plan.aperture': 'Ladeöffnung — was zuerst herauskommt, steht hier',
  'plan.selected': '{label} — Schritt {step}, {x}/{z} mm, {state}',
  'plan.anchored': 'von Hand gesetzt',
  'plan.byPacker': 'vom Packer gesetzt',
  'plan.anchoredShort': '(von Hand)',
  'plan.groups': 'Abladereihenfolge',
  'plan.groupsHint': 'Die erste Gruppe steht an der Öffnung und kommt zuerst heraus.',
  'plan.groupUp': 'Früher',
  'plan.groupDown': 'Später',
  'plan.findings': 'Was es gekostet hat',
  'plan.unplaced': 'Nicht eingeplant ({n})',
  'plan.order': 'Ladereihenfolge',
  'plan.orderHint': 'In dieser Reihenfolge laden. Das Abladen läuft rückwärts.',

  // ── Beladen: der Blick aus der Ladeöffnung ──────────────────────────────
  'plan.mode': 'Modus',
  'plan.modePlan': 'Planen',
  'plan.modeLoad': 'Beladen',

  'loading.stow': 'Verstaut',
  'loading.undo': 'Zurücknehmen',
  'loading.done': 'Alles vom Plan ist verstaut.',
  'loading.where': 'Lage {layer}, {x} mm von links, {z} mm tief',
  'loading.progress': '{n} von {m} verstaut · {kg} kg',
  'loading.noWeight': '{n} davon ohne Gewicht',
  'loading.stowed': '{label} verstaut — Schritt {step}.',
  'loading.already': '{label} ist schon verstaut.',
  'loading.outOfOrder':
    '{n} Stücke sollten vor diesem hinein — du musst später daran vorbeigreifen.',
  'loading.missingBelow': 'Es steht auf {n} Stücken, die noch nicht geladen sind: {labels}',
  'loading.unknownCode': 'Code „{code}" ist nicht im Bestand.',
  'loading.notInLoad':
    '{what} steht im Bestand — gehört aber nicht zu dieser Ladung. Falsches Fahrzeug?',
  'loading.camOn': 'Case scannen',
  'loading.camOff': 'Kamera aus',
  'loading.camFailed': 'Die Kamera liess sich nicht starten.',
  'loading.layers': 'Lagen',
  'loading.layer': 'Lage {n} — {mm} mm über dem Boden',

  // ── Die Form des Laderaums: Ecken, Kanten, Rundungen ────────────────────
  //
  // „Fase" und „Rundung" sind die Werkstattbegriffe; „abgeschrägt" wäre eine
  // Beschreibung, aber keine Benennung, und wer den Laderaum ausmisst, sagt
  // Fase. Links/rechts stehen aus Sicht dessen, der am Heck steht und
  // hineinschaut — dieselbe Blickrichtung wie in der Draufsicht.
  'pack.roomShape':
    'Es käme nur dort unter, wo der Laderaum gefast oder gerundet ist — das Kistenmass passt, das Fahrzeug nicht.',
  'plan.narrowest': 'Gestrichelt: der engste Querschnitt weiter oben',

  // ── Die Lage am Griff (#23) ─────────────────────────────────────────────
  //
  // Drei Gründe und drei Sätze: „geht nicht" liesse den Menschen raten, ob es
  // die Wand, die Rundung oder die Nachbarkiste ist. „Quer" und „längs" statt
  // X und Z — am Dock spricht niemand von Achsen.
  'plan.axes': 'Ziehrichtungen',
  'plan.axisX': 'Quer',
  'plan.axisZ': 'Längs',
  // Der Befund bleibt, wenn jemand trotz der Warnung losgelassen hat — die
  // Verankerung ist eine Entscheidung, eine unmögliche Lage ist keine.
  'pack.anchoredOutside': '{label} steht von Hand dort, wo kein Laderaum ist — es ragt heraus.',
  'pack.anchoredOverlap': '{label} steht von Hand dort, wo schon {other} steht.',
  'pack.obstruction': 'ein fester Einbau des Fahrzeugs',
  'place.outside': 'So ragt es aus dem Laderaum heraus.',
  'place.shape': 'Dort ist der Laderaum gefast oder gerundet.',
  'place.taken': 'Dort steht schon {what}.',
  'place.gives': '{what} rückt dafür zur Seite.',
  'vehicle.edgeLoss': '{l} l gehen für Fasen und Rundungen ab',

  'edge.along': 'läuft über die ganze Länge',
  'edge.across': 'läuft quer durchs Fahrzeug',
  'edge.upright': 'läuft vom Boden zum Dach',
  'edge.depth.width': 'in die Breite (mm)',
  'edge.depth.height': 'in die Höhe (mm)',
  'edge.depth.length': 'in die Länge (mm)',
  'edge.roofLeft': 'Dachkante links',
  'edge.roofRight': 'Dachkante rechts',
  'edge.floorLeft': 'Bodenkante links',
  'edge.floorRight': 'Bodenkante rechts',
  'edge.rearTop': 'Heckkante oben',
  'edge.rearBottom': 'Heckkante unten',
  'edge.frontTop': 'Stirnkante oben',
  'edge.frontBottom': 'Stirnkante unten',
  'edge.cornerRearLeft': 'Raumecke hinten links',
  'edge.cornerRearRight': 'Raumecke hinten rechts',
  'edge.cornerFrontLeft': 'Raumecke vorn links',
  'edge.cornerFrontRight': 'Raumecke vorn rechts',
  'edge.none': 'Form des Laderaums — scharfkantiger Quader, nichts gemessen',
  'edge.count': 'Form des Laderaums — {n} Kanten gemessen',
  'edge.intro':
    'Ein Laderaum ist selten eine Schachtel: Dachkanten sind gerundet, Wände laufen zusammen, ein Kofferraum verjüngt sich zur Heckklappe. Was nicht eingetragen ist, bleibt eine scharfe Kante — das lässt höchstens Platz ungenutzt und verspricht nie Platz, den es nicht gibt.',
  'edge.roundedBy': 'gerundet, {a} x {b} mm',
  'edge.chamferedBy': 'gefast, {a} x {b} mm',
  'edge.remove': 'Entfernen',
  'edge.which': 'Welche Kante',
  'edge.art': 'Form',
  'edge.rounded': 'Gerundet',
  'edge.chamfered': 'Gefast (gerade)',
  'edge.hintRound':
    'Gleiche Werte ergeben einen Viertelkreis, ungleiche eine Ellipse. Gemessen wird, wie weit die Rundung in jede Richtung reicht.',
  'edge.hintChamfer':
    'Ein gerader Schnitt von einer Wand zur anderen — gemessen wird, wie weit er in jede Richtung reicht.',
  'edge.add': 'Kante eintragen',

  // ── Der Druckbogen ──────────────────────────────────────────────────────
  'print.kicker': 'Packliste',
  'print.packList': 'Packliste — {name}',
  'print.positions': '{n} Positionen',

  // ── Lagerbaum und Umlagerungen ──────────────────────────────────────────
  //
  // „Umlagern" ist der Begriff des Hauses; „verschieben" wäre die Geste und
  // nicht der Vorgang. Der Unterschied steht mit Grund in
  // `types/storageMove.ts`: es ist eine Buchung und keine Nebenwirkung.
  'tab.storage': 'Lager',
  'tab.storage.q': 'Wo liegt es — und was steckt worin?',

  'move.subject.node': 'Lagerort/Container',
  'move.subject.item': 'Artikel',
  'move.subject.unit': 'Einheit',
  'move.refusal.subject': 'Das Objekt gibt es nicht mehr.',
  'move.refusal.target': 'Den Ziel-Lagerort gibt es nicht.',
  'move.refusal.cycle': 'Ein Container kann nicht in sich selbst.',
  'move.refusal.same': 'Liegt schon dort.',
  'move.place.unknown': 'nicht mehr im Lager',
  'move.place.never': 'nie eingeräumt',
  'move.col.at': 'Zeitpunkt',
  'move.col.kind': 'Art',
  'move.col.subject': 'Objekt',
  'move.col.from': 'Von',
  'move.col.to': 'Nach',
  'move.col.note': 'Notiz',

  'tree.kind.depot': 'Depot',
  'tree.kind.room': 'Raum',
  'tree.kind.shelf': 'Regal',
  'tree.kind.bin': 'Fach',
  'tree.kind.case': 'Case',
  'tree.kind.transportCase': 'Transport-Case',
  'tree.intro':
    'Zieh einen Lagerort, ein Case oder einen Artikel dorthin, wo er hingehört — mit der Maus oder mit dem Finger. Jeder Umzug geht ins Journal, und was nicht geht, sagt seinen Grund, bevor du loslässt.',
  'tree.create.head': 'Lagerort oder Case anlegen',
  'tree.name': 'Name',
  'tree.kind': 'Art',
  'tree.under': 'Liegt in',
  'tree.add': 'Anlegen',
  'tree.root': 'dem Lager selbst',
  'tree.grab': '{name} umlagern',
  'tree.container': 'Container',
  'tree.remove': 'Entfernen',
  'tree.qty': '{n} Stk',
  'tree.moved': '{what} liegt jetzt in {where}.',
  'tree.none': 'Noch keine Lagerorte. Ein Case braucht einen Platz, bevor etwas hineinkann.',
  'tree.dropRoot': 'Hierher ziehen, um es aus allem herauszunehmen',
  'tree.unplaced': 'Nicht eingeräumt ({n})',
  'tree.journal': 'Umlagerungen',
  'tree.journalHint':
    'Jeder Umzug wird festgehalten. Das ist der Nachweis, der „wo war es zuletzt" beantwortet, wenn erfasster Ort und Wirklichkeit auseinandergelaufen sind.',
  'tree.journalEmpty': 'Noch nichts umgelagert.',
  'tree.csv': 'Umlagerungen als CSV',
  'tree.mode': 'Ansicht',
  'tree.modeTree': 'Baum',
  'tree.modePlan': 'Grundriss',
  'tree.modeRoom': 'In 3D',

  // ── Grundriss, Raum und die Kennung des Lagerplatzes ────────────────────
  //
  // „Gasse", „Feld", „Ebene" sind die Begriffe der Lagertechnik und keine
  // Übersetzung von aisle/bay/level: ein Lagerist sagt Feld, nicht Fach —
  // ein Fach ist das, was in einem Case steckt.
  'floor.unplaced': 'Nicht im Grundriss ({n})',
  'floor.unplacedHint':
    'Ein Lagerort ohne Grundriss-Eintrag ist nicht falsch — es hat nur niemand gemessen, wo er steht.',
  'floor.place': 'In den Grundriss',
  'floor.empty':
    'Es steht noch nichts im Grundriss, und die Halle ist nicht vermessen — es gibt also nichts zu zeichnen. Setz einen Lagerort in den Grundriss, oder gib dem obersten Knoten seine eigene Grundfläche.',
  'floor.derived':
    'Der Umriss folgt dem, was im Grundriss steht, und nicht einer vermessenen Halle. Gib dem obersten Lagerort eine Grundfläche, dann steht die echte da.',
  'floor.label': 'Grundriss des Lagers',
  'floor.clashes': 'Überschneidungen im Grundriss',
  'floor.clashHint':
    'Gemeldet, nicht verboten — beim Umbau steht das neue Regal schon da, während das alte noch nicht weg ist.',
  'floor.clash': '{a} und {b} überschneiden sich.',
  'floor.unplace': 'Aus dem Grundriss nehmen',
  'floor.width': 'Breite (mm)',
  'floor.depth': 'Tiefe (mm)',
  'floor.height': 'Höhe (mm)',
  'floor.levels': 'Ebenen',
  'floor.rotation': 'Drehung (°)',

  'room.empty': 'Es steht noch nichts im Grundriss — im Raum ist dann auch nichts aufzustellen.',
  'room.noHeight': 'Ohne erfasste Höhe: {n}. Die liegen flach im Bild — geraten wird hier nichts.',
  'room.tall': '{h} mm hoch, {e} Ebenen',
  'room.flat': 'keine Höhe erfasst',

  'code.stage.aisle': 'Gasse',
  'code.stage.row': 'Reihe',
  'code.stage.bay': 'Feld',
  'code.stage.level': 'Ebene',
  'code.stage.slot': 'Platz',
  'code.clash': 'Kennung {code} ist {n}-mal vergeben.',
  'code.head': 'Hausschema für Lagerplatz-Kennungen',
  'code.intro':
    'Dafür gibt es keine Norm. Gasse, Feld und Ebene ist die verbreitete Adressierung, aber jedes Haus schneidet sie anders — deshalb wird sie hier eingestellt und nicht angenommen.',
  'code.stage': 'Stufe',
  'code.chars': 'Zeichen',
  'code.letters': 'Buchstaben (A, B, … AA)',
  'code.digits': 'Ziffern (1, 2, 3)',
  'code.pad': 'Auffüllen auf',
  'code.dropStage': 'Entfernen',
  'code.addStage': 'Stufe hinzufügen',
  'code.separator': 'Trenner',
  'code.example': 'Sieht so aus: {code}',
  'code.none': 'Keine Stufen — Lagerorte tragen dann keine Kennung aus diesem Schema.',
  'code.batch': 'Eine Reihe auf einmal beschriften',
  'code.batchHint':
    'Acht Felder und vier Ebenen sind zweiunddreissig Kennungen, und die tippt niemand ab. Angefasst wird nur, was noch keine Kennung trägt — eine Kennung, die schon auf einem Aufkleber steht, wird nicht still geändert.',
  'code.under': 'Unterhalb von',
  'code.pick': '— Lagerort wählen —',
  'code.howMany': '{stage} — wieviele?',
  'code.label': 'Beschriften',
  'code.allLabelled': 'Jeder Lagerort darunter trägt schon eine Kennung.',
  'code.noRange': 'Gib erst für jede Stufe des Schemas eine Anzahl an.',
  'code.labelled': '{n} von {m} Lagerorten ohne Kennung beschriftet.',
  'code.clashes': 'Doppelt vergebene Kennungen',

  // ── Flächen der Halle: Stellfläche, Pickzone, Verkehrsweg, Tor ──────────
  //
  // „Verkehrsweg" ist der Begriff der Arbeitssicherheit (ASR A1.8) und nicht
  // eine Übersetzung von „aisle": ein Gang ist, wo man geht, ein Verkehrsweg
  // ist, was frei bleiben MUSS. Der Unterschied ist genau das, was diese
  // Fläche prüft.
  'area.staging': 'Stellfläche',
  'area.pick': 'Pickzone',
  'area.aisle': 'Verkehrsweg',
  'area.gate': 'Tor',
  'area.blockedArea': 'Sperrfläche',
  'area.new': 'Fläche anlegen',
  'area.add': 'In den Grundriss',
  'area.name': 'Name',
  'area.remove': 'Fläche entfernen',
  'area.clearWidth': 'Lichte Breite (mm)',
  'area.clearHeight': 'Lichte Höhe (mm)',
  'area.blocked': '{node} steht auf {area} — das muss frei bleiben.',
  'area.blockedHead': 'Steht, wo es frei bleiben muss',
  'area.blockedHint':
    'Gemeldet, nicht verboten — beim Umbau steht ein Regal im Gang, weil es gerade nirgendwo anders hin kann. Es steht dort aber nicht still.',
  'area.narrowest': 'Alles muss durch {name}: {w} x {h} mm lichte Weite.',

  // ── Der Lagerort als Adresse, die überall gilt ──────────────────────────
  'place.empty': 'Kein Lagerort angegeben.',
  'place.ambiguous': 'Das passt auf {n} Lagerorte: {list}. Welcher?',
  'place.unknown': 'Kein Lagerort mit diesem Namen oder dieser Kennung.',
  'stock.nowhere': 'nicht eingeräumt',
  'stock.setPlace': 'Kennung oder Pfad…',
  'stock.setPlaceFor': 'Lagerort setzen',
  'floor.levelName': 'Ebene {n}',
  'floor.makeLevels': 'Die {n} Ebenen als Lagerorte anlegen',
  'floor.needsCode':
    'Das Regal hat noch keine Kennung — die Ebenen setzen sie fort und können ohne sie nicht benannt werden.',
  'room.holds': 'Artikel darin: {n}',

  // ── Regal-Etiketten ─────────────────────────────────────────────────────
  //
  // „Regalschild" und „Fachschild" sind die Begriffe am Lager: das eine
  // hängt am Regalkopf und wird aus fünf Metern gelesen, das andere klebt am
  // Fachboden. Ein Wort für beides gäbe es nur, wenn es dasselbe wäre.
  'label.sheet': 'Lagerplatz-Etiketten',
  'label.head': 'Etiketten drucken',
  'label.hint':
    'Die Kennung steht als Text da, gross, mit ihrem Pfad daneben — ein Regalschild wird aus fünf Metern gelesen und nicht gescannt. Gedruckt wird nur, was eine Kennung trägt: ein Etikett ohne Kennung ist ein leerer Aufkleber.',
  'label.none': 'Nichts ausgewählt, was eine Kennung trägt — ein Etikett ohne Kennung ist ein leerer Aufkleber.',
  'label.nothing': 'Noch trägt kein Lagerplatz eine Kennung.',
  'label.count': '{n} Etiketten',
  'label.blocked': 'Der Bogen liess sich nicht öffnen — der Browser hat das Fenster blockiert.',
  'label.size': 'Grösse',
  'label.size.shelf': 'Regalschild (95 x 62 mm, 2 je Reihe)',
  'label.size.bay': 'Fachschild (62 x 33 mm, 3 je Reihe)',
  'label.size.small': 'Klein (46 x 20 mm, 4 je Reihe)',
  'label.all': 'Alle wählen',
  'label.none.select': 'Keine wählen',
  'label.open': 'Bogen öffnen ({n})',

  // Der Lade-Streifen. „Wird gerade geladen" ist bewusst kein eigener
  // Zustand, sondern das nächste Stück nach Plan — siehe `beladen.ts`.
  'loading.stripLabel': 'Ladereihenfolge mit aktuellem Stand',
  'loading.roleLoaded': 'Geladen',
  'loading.roleCurrent': 'Wird geladen',
  'loading.roleOpen': 'Folgt',
  'loading.stowOf': '{label} als verstaut vermerken',
  'loading.undoOf': '{label} wieder herausnehmen',
}
