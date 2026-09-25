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
  // Einbauten und Laderaum-Bearbeitung (Nutzer-Frage 2026-09-19).
  // „Radkasten", „Ersatzrad" sind Bauteile und keine Normbegriffe – sie
  // werden übersetzt; die Reifengröße selbst (235/65 R16C) nicht.
  'obstacle.kind.arch': 'Radkasten',
  'obstacle.kind.bench': 'Sitzbank',
  'obstacle.kind.spare': 'Ersatzrad',
  'obstacle.kind.fitment': 'Aufbau',
  'obstacle.kind.other': 'Sonstiges',
  'obstacle.none': 'Einbauten – keine eingetragen',
  'obstacle.count': 'Einbauten – {n} eingetragen',
  'obstacle.intro':
    'Radkästen, eine Sitzbank, das Ersatzrad: der Packer behandelt sie als belegten Raum, Draufsicht und 3D-Ansicht zeichnen sie. Der Ursprung ist die Ecke hinten links unten im Laderaum; x läuft quer, y nach oben, z nach vorn.',
  'obstacle.name': 'Name',
  'obstacle.kind': 'Art',
  'obstacle.fromLeft': 'Von links (mm)',
  'obstacle.fromFloor': 'Über dem Boden (mm)',
  'obstacle.fromRear': 'Von hinten (mm)',
  'obstacle.width': 'Breite (mm)',
  'obstacle.height': 'Höhe (mm)',
  'obstacle.depth': 'Tiefe (mm)',
  'obstacle.remove': 'Einbau entfernen',
  'obstacle.add': 'Einbau hinzufügen',
  'obstacle.left': 'links',
  'obstacle.right': 'rechts',
  'obstacle.noName':
    'Der Einbau hat keinen Namen. Auf einem Ladeplan wäre er ein Kasten, den niemand zuordnen kann.',
  'obstacle.noSize':
    'Ein Einbau ohne Maße nimmt keinen Platz weg – und dann ist er keiner.',
  'obstacle.outside':
    'Ragt aus dem Laderaum ({l} × {b} × {h} mm). Meist ein Tippfehler – der Packer rechnete mit Platz, den es nicht gibt.',
  'obstacle.inShape':
    'Reicht in eine Fase oder Rundung – dort ist ohnehin kein Raum.',
  'obstacle.overlaps': 'Überschneidet „{name}" – der Platz ginge zweimal ab.',
  'affected.outside': '{label} stünde außerhalb des Laderaums.',
  'affected.shape': '{label} stünde in einer Fase oder Rundung.',
  'affected.inObstacle': '{label} stünde in „{name}".',
  'tyre.head': 'Radkasten aus der Reifengröße',
  'tyre.intro':
    'Eine Reifengröße ist eine genormte Angabe und keine Schätzung: 235/65 R16 gibt Breite und Außendurchmesser exakt. Die Höhe über dem Ladeboden folgt daraus nicht – sie hängt am Aufbau und wird deshalb gefragt.',
  'tyre.size': 'Reifengröße',
  'tyre.clearance': 'Zuschlag je Seite (mm)',
  'tyre.outer': 'Außendurchmesser',
  'tyre.unreadable':
    'Keine metrische Reifengröße mit Verhältnis. Größen wie 7.50 R16 tragen die Flankenhöhe nicht – trage die Maße unten von Hand ein.',
  'tyre.derived': 'Der Radkasten wäre {b} mm breit und {l} mm lang.',
  'tyre.archHeight': 'Höhe über dem Boden (mm) – gemessen',
  'tyre.fromRear': 'Von hinten (mm)',
  'tyre.create': 'Beide Radkästen anlegen',
  'tyre.needHeight':
    'Die Höhe fehlt. Eine hergeleitete Höhe sähe auf dem Ladeplan aus wie eine gemessene – und der Packer stapelt darauf.',
  'vehicle.edit': 'Stammdaten und Laderaum',
  'vehicle.affected':
    'Diese {n} Stücke wurden von Hand gesetzt und passten dann nicht mehr. Sie bleiben, wo sie sind – es wird nichts für dich verschoben:',
  'vehicle.applySize': 'Laderaum übernehmen',
  'common.discard': 'Verwerfen',
  'vehicle.apertureHead': 'Ladeöffnung',
  'vehicle.apertureWidth': 'Breite (mm)',
  'vehicle.apertureHeight': 'Höhe (mm)',
  'vehicle.sill': 'Ladekantenhöhe über Grund (mm)',
  'vehicle.apertureClear': 'Doch nicht vermessen',
  'vehicle.apertureMissing':
    'Nicht vermessen. Es wird nichts dagegen geprüft – das ist besser, als eine Öffnung anzunehmen, die niemand gesehen hat.',
  'vehicle.apertureAdd': 'Öffnung eintragen',
  'vehicle.equipment': 'Ausstattung und Papiere',
  'vehicle.flatFloor': 'Ebener Boden – sonst sind Rollen nutzlos',
  'vehicle.tailLift': 'Hebebühne (kg)',
  'vehicle.licenceClass': 'Führerscheinklasse',
  'vehicle.source': 'Herkunft der Zahlen',
  'vehicle.sourcePlaceholder': 'Datenblatt-Link oder Zulassungsbescheinigung',
  'vehicle.notes': 'Notizen',
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

  // ── Gewicht, Schwerpunkt, Achslast (#24) ────────────────────────────────
  //
  // Normbegriffe bleiben, wie sie heissen: zGG, Nutzlast, Achslast, kg, mm.
  // Übersetzt wird, was das Werkzeug SAGT — nicht, wie die Papiere heissen.
  // Die Sätze, die eine fehlende Angabe erklären, sind ausdrücklich SÄTZE
  // und keine Kürzel: sie stehen an der Stelle einer Zahl, und dort liest
  // jemand mit einer Frage.
  'load.noWeights':
    'Kein einziges gesetztes Stück ist gewogen — daraus lässt sich kein Schwerpunkt rechnen.',
  'load.noAxles': 'Für dieses Fahrzeug sind keine Achsen eingetragen — es gibt nichts zu verteilen.',
  'load.threeAxles':
    'Mehr als zwei Achsen: wie sich die Last verteilt, hängt an der Federung und nicht allein an der Statik. Hier hilft nur die Waage.',
  'load.noFloorOffset':
    'Es ist nicht eingetragen, wie weit die Ladefläche hinter der Vorderachse liegt — ohne diese Zahl gibt es keinen Hebelarm.',
  'load.someUnweighed':
    'Es fahren Stücke ohne gewogenes Gewicht mit: {n}. Eine Achslast, die um sie herum gerechnet ist, läse sich wie eine Messung.',
  'load.axlesSamePlace':
    'Beide Achsen stehen mit demselben Abstand eingetragen — eine der beiden Zahlen stimmt nicht.',
  'load.antiSlip': 'Antirutschmatten unter jedes Stück, das nicht verkeilt steht',
  'load.straps': 'Zurrgurte, ein Paar je Reihe, mit abgelesener Zurrkraft',
  // Abladegruppen (#22) — die Gewerke, in denen abgeladen wird. Sie werden
  // EINMAL beim Setzen aufgeloest und dann als freier Text gespeichert: die
  // Gruppe ist danach ein Name, den der Nutzer umbenennen darf.
  'group.rigging': 'Rigging',
  'group.light': 'Licht',
  'group.power': 'Strom',
  'group.sound': 'Ton',
  'group.video': 'Video',
  'group.control': 'Regie',
  'group.cable': 'Kabel',
  'load.groupAssign': 'Abladegruppe je Stück',
  'load.groupSuggest':
    '{n} von {total} Stücken bekämen eine Gruppe aus ihrer Kategorie, {offen} haben keine zu holen, {behalten} behalten die von Hand gesetzte.',
  'load.groupApply': 'Vorschlag übernehmen',
  'load.groupNone': 'keine Gruppe – wird zuletzt abgeladen',
  'load.bars': 'Sperrstangen oder Ladungssicherungsnetz zur Tür hin',
  'load.edges': 'Kantenschutz überall dort, wo ein Gurt über eine Ecke läuft',
  'load.disclaimer':
    'Dieses Blatt rechnet und zeigt. Es erteilt keine Freigabe: die Verantwortung für die Ladungssicherung bleibt bei Fahrer und Verlader.',

  // Das Blatt
  'sheet.vehicle': 'Fahrzeug',
  'sheet.cargoSpace': 'Laderaum',
  'sheet.cargoSpaceValue': '{l} × {w} × {h} mm',
  'sheet.payload': 'Nutzlast',
  'sheet.kg': '{n} kg',
  'sheet.loaded': 'Gesetztes Gewicht',
  'sheet.unweighed': 'Nicht gewogen',
  'sheet.unweighedValue':
    'Stücke an Bord ohne gewogenes Gewicht: {n}. Sie stecken in keiner Zahl weiter unten.',
  'sheet.over': 'Über der Nutzlast',
  'sheet.overValue': 'Um {n} kg — erreicht mit {label}, in Ladereihenfolge.',
  'sheet.cogValue': '{z} mm ab der vorderen Kante der Ladefläche, {x} mm ab der linken Wand, {y} mm hoch',
  'sheet.frontAxle': 'Vorderachse',
  'sheet.rearAxle': 'Hinterachse',
  'sheet.fromLoad': 'aus der Ladung {n} kg',
  'sheet.noEmptyAxle': 'Leerlast nicht gewogen — keine Gesamtlast',
  'sheet.total': 'gesamt {n} kg',
  'sheet.permitted': 'zulässig {n} kg',
  'sheet.axleOver': 'um {n} kg überschritten',
  'sheet.axleLoads': 'Achslasten',
  'sheet.title': 'Lastverteilungsplan — {name}',
  'sheet.kicker': 'Lastverteilungsplan',
  'sheet.vehicleAndLoad': 'Fahrzeug und Ladung',
  'sheet.cog': 'Schwerpunkt',
  // Die Zeile heisst nicht wie ihre Überschrift: „Schwerpunkt — Schwerpunkt"
  // stand zweimal untereinander und sagte beim zweiten Mal nichts mehr.
  'sheet.cogRow': 'Lage',
  'sheet.securing': 'Sicherungsmittel — Merkliste',
  'sheet.securingNote':
    'Eine Liste, keine Rechnung: welches Mittel ein Stück braucht, hängt an Reibwert, Schwerpunkt und Aufbau — und keines davon kennt dieses Werkzeug.',

  // Die Ansicht
  'weight.printBlocked': 'Das Blatt liess sich nicht öffnen — der Browser hat das Fenster blockiert.',
  'weight.head': 'Gewicht und Achslasten',
  'weight.placed': 'Gesetzt: {kg} kg',
  'weight.unweighed': 'ohne gewogenes Gewicht: {n}',
  'weight.over': 'Um {n} kg über der Nutzlast — erreicht mit {label}, in Ladereihenfolge.',
  'weight.cog': 'Schwerpunkt:',
  'weight.cogValue': '{z} mm ab der vorderen Kante, {x} mm ab der linken Wand, {y} mm hoch',
  'weight.front': 'Vorderachse',
  'weight.rear': 'Hinterachse',
  'weight.fromLoad': 'aus der Ladung {n} kg',
  'weight.noEmptyAxle': 'Leerlast nicht gewogen — keine Gesamtlast',
  'weight.total': 'gesamt {n} kg von {max} zulässig',
  'weight.axleOver': 'um {n} kg überschritten',
  'weight.securing': 'Sicherungsmittel — Merkliste',
  'weight.sheet': 'Lastverteilungsplan',

  // Die Maske am Fahrzeug
  'weigh.none': 'Gewichte und Achsen — nichts eingetragen',
  'weigh.count': 'Gewichte und Achsen — {n} Achsen, davon {m} leer gewogen',
  'weigh.intro':
    'Gewicht ist die härtere Grenze: ein 3,5-Tonner ist oft bei unter 1.200 kg Zuladung am Ende. Nichts hier wird aus etwas anderem gerechnet — Nutzlast ist nicht zGG minus Leermasse, sobald ein Aufbau, eine Hebebühne oder eine volle Tankfüllung dazwischen liegt.',
  'weigh.gross': 'Zulässige Gesamtmasse (kg)',
  'weigh.kerb': 'Leermasse (kg)',
  'weigh.payload': 'Nutzlast (kg)',
  'weigh.floorOffset': 'Ladefläche hinter der Vorderachse (mm)',
  'weigh.floorOffsetWhy':
    'Gemessen von der Mitte der Vorderachse bis zur vorderen Kante der Ladefläche. Ohne sie steht der Laderaum nirgends am Fahrzeug, und ohne das gibt es keinen Hebelarm für eine Achslast.',
  'weigh.front': 'Vorderachse',
  'weigh.rear': 'Hinterachse',
  'weigh.axlePos': 'Abstand von der Vorderachse (mm)',
  'weigh.axleMax': 'Zulässige Achslast (kg)',
  'weigh.axleEmpty': 'Leer gewogen (kg)',
  'weigh.removeAxle': 'Achse entfernen',
  'weigh.addAxle': 'Achse hinzufügen',
  'weigh.axleWhy':
    'Die Leerlast einer Achse kommt von der Brückenwaage und nicht aus den Papieren: die Papiere nennen, was eine Achse tragen DARF, nicht was sie leer trägt. Ohne sie sagt das Blatt, was die Ladung auf die Achse bringt, und schweigt dazu, ob die Achse überladen ist.',

  // ── Die Ausgabe: was am Dock an der Bordwand hängt (#25) ────────────────
  'out.totalWeight': '{kg} kg gesetzt',
  'out.unweighed': 'ohne gewogenes Gewicht: {n}',
  'out.layer': 'Lage {n} — {y} mm über der Ladefläche · Stücke: {c}',
  'out.planTitle': 'Ladeplan — {name}',
  'out.planKicker': 'Ladeplan',
  'out.groups': 'Abladegruppen — die erste kommt zuerst heraus',
  'out.notPlaced': 'Nicht eingeplant',
  'out.dockTitle': 'Dock-Checkliste — {name}',
  'out.dockKicker': 'Dock-Checkliste',
  'out.loading': 'Laden — in dieser Reihenfolge',
  'out.unloading': 'Abladen — dieselbe Liste rückwärts',
  'out.returnKicker': 'Rückladeliste',
  'out.noGroup': 'ohne Gruppe',
  'out.spot': '{x}/{z} mm, Lage bei {y} mm',
  'out.spotShort': '{x}/{z} mm',
  'out.labelTitle': 'Case-Etiketten — {name}',
  'out.labelKicker': 'Case-Etiketten',
  'out.labelNone': 'Es ist nichts eingeplant — es gibt nichts zu beschriften.',
  'out.csv.step': 'Reihenfolge',
  'out.csv.label': 'Stück',
  'out.csv.group': 'Abladegruppe',
  'out.csv.weight': 'kg',
  'out.csv.x': 'x mm',
  'out.csv.y': 'y mm',
  'out.csv.z': 'z mm',
  'out.csv.size': 'B × H × T mm',
  'out.csv.state': 'Stand',
  'out.csv.byHand': 'von Hand gesetzt',
  'out.csv.byPacker': 'vom Packer gesetzt',
  'out.blocked': 'Das Blatt liess sich nicht öffnen — der Browser hat das Fenster blockiert.',
  'out.head': 'Fürs Dock',
  'out.intro':
    'Am Dock steht niemand mit der 3D-Ansicht. Jedes Blatt trägt Fahrzeug, Datum, gesetztes Gewicht und das, was nicht eingeplant werden konnte — mit Grund.',
  'out.plan': 'Ladeplan',
  'out.dock': 'Dock-Checkliste',
  'out.labels': 'Case-Etiketten',
  'out.csv': 'CSV',

  // ── Das Packmass-Raster (#21) ───────────────────────────────────────────
  //
  // „Packmass" ist der Branchenbegriff und bleibt stehen. Der Schalter
  // heisst „Raster" und nicht „Snap": den Finger rastet die Leiste darüber
  // ein, hier geht es um die Reihen im Laderaum.
  'vehicle.grid': 'Packmass-Raster (mm)',
  'vehicle.gridNone': 'ohne Raster',
  'vehicle.gridMm': '{n} mm',
  'vehicle.gridDefault':
    'Üblich für diese Klasse: {n} mm — 1200 × 600er Cases stehen darauf in Reihen.',
  'vehicle.gridNoDefault':
    'Für diese Klasse ist kein Raster üblich: der Laderaum ist keine 2,40 m breit, die Reihe geht nicht auf.',
  'plan.rasterMode': 'Raster ({n} mm)',
  'plan.rasterMixed': 'Gemischt',
  'plan.rasterStrict': 'Nur im Raster',
  'plan.rasterFree': 'Frei',
  'plan.onGrid': 'vom Packer gesetzt, im Raster',

  // ── Fahrzeug-Stammdaten und Ausmessen (#19) ─────────────────────────────
  //
  // „Radkasten", „Ladekante", „Trennwand" sind Werkstattbegriffe und bleiben
  // stehen. Der Satz zur Bodenbreite ist der wichtigste dieser Gruppe: an
  // ihr scheitert die Europalette, und wer nur oben misst, misst die
  // falsche Zahl.
  'fleet.derivedFrom': 'abgeleitet von {source}',
  'fleet.fromCatalogue': 'Von einem Stammdatensatz ableiten',
  'fleet.pick': 'auswählen',
  'fleet.catalogueEmpty':
    'Es gibt noch keinen Startsatz. Er müsste je Fahrzeug eine Quelle tragen — einen Link aufs Datenblatt oder die Zulassungsbescheinigung —, und geratene Innenmasse lesen sich auf einem Ladeplan wie Messungen.',
  'fleet.export': 'Fahrzeuge ausgeben',
  'fleet.import': 'Fahrzeuge einlesen',
  'fleet.importBad': 'Das ist keine Fahrzeug-Datei dieses Werkzeugs.',
  'fleet.imported': 'Übernommen: {n}',
  'measure.head': 'Wie man ein Fahrzeug ausmisst',
  'measure.intro':
    'Sechs Masse, in der Reihenfolge, in der man einmal ums Fahrzeug geht. Die Bodenbreite zwischen den Radkästen ist eine andere Zahl als die Breite darüber — und sie ist die, an der eine Europalette scheitert.',
  'measure.apertureW': 'Breite der Hecköffnung',
  'measure.apertureW.where': 'Zwischen den Türdichtungen an der engsten Stelle, nicht die Aussenbreite.',
  'measure.apertureH': 'Höhe der Hecköffnung',
  'measure.apertureH.where': 'Von der Ladekante bis zum tiefsten Punkt des Rahmens.',
  'measure.length': 'Laderaumlänge',
  'measure.length.where':
    'Von der Trennwand bis zu den geschlossenen Türen, auf Bodenhöhe. Der Boden ist das, worauf ein Case steht.',
  'measure.widthFloor': 'Bodenbreite zwischen den Radkästen',
  'measure.widthFloor.where':
    'Die engste Stelle auf Bodenhöhe. An dieser Zahl scheitert die Europalette — den Radkasten selbst als Hindernis eintragen.',
  'measure.widthTop': 'Breite über den Radkästen',
  'measure.widthTop.where': 'Etwa auf Hüfthöhe, von Wand zu Wand. Das ist die Laderaumbreite im Modell.',
  'measure.height': 'Laderaumhöhe',
  'measure.height.where':
    'Vom Boden bis zum tiefsten festen Einbau — eine Dachluke oder eine Querstrebe zählt mit.',
  // ── Cases: Layout und Inhaltsliste ──────────────────────────────────────
  'tab.cases': 'Cases',
  'tab.cases.q': 'Wie liegt es darin — und was muss drin sein?',
  'case.pick': 'Case',
  'case.pick.aria': 'Welches Case',
  'case.none':
    'Noch kein Case im Lagerbaum. Ein Case ist ein Container-Knoten — ohne einen gibt es nichts aufzuteilen.',
  'case.buildout': 'Innen',
  'case.inner.width': 'Innenbreite (mm)',
  'case.inner.height': 'Innenhöhe (mm)',
  'case.inner.depth': 'Innentiefe (mm)',
  'case.inner.measured': 'Gemessenes Innenmass — es schlägt jede Rechnung.',
  'case.inner.derived': 'Aus Aussenmass und Wandstärke gerechnet.',
  'case.wall': 'Wandstärke (mm)',
  'case.web': 'Steg zwischen den Fächern (mm, Vorgabe {mm})',
  'case.layout': 'Layout',
  'case.layout.empty': 'Nichts mit Massen liegt direkt in diesem Case.',
  'case.layout.summary': '{lagen} Lagen · {faecher} Fächer · {kg} kg gesetzt',
  'case.layer': 'Lage {nr} · {mm} mm hoch · {pct} % der Grundfläche belegt',
  'case.layer.top': 'das sieht man, wenn der Deckel aufgeht',
  'case.layer.aria': 'Lage {nr} von oben',
  'case.turned': 'gedreht',
  'case.noRoom': 'Ohne Fach',
  'case.contents': 'Inhaltsliste',
  'case.contents.empty': 'Es liegt nichts direkt in diesem Case.',
  'case.col.what': 'Was',
  'case.col.qty': 'Anzahl',
  'case.col.kg': 'kg',
  'case.subcase': 'eigenes Blatt',
  'case.notWeighed': 'nicht gewogen',
  'case.totalKg': 'Gesamt {kg} kg, Case leer {leer} kg.',
  'case.noTotal':
    'Inhalt {kg} kg — kein Gesamtgewicht: {n} Positionen sind nicht gewogen, oder das Leergewicht des Cases fehlt.',
  'case.openSheet': 'Blatt für den Deckel öffnen (A4)',
  'case.copy': 'Als Text kopieren',
  'case.copied': 'Kopiert',
  'case.printBlocked': 'Das Blatt liess sich nicht öffnen — der Browser hat das Fenster blockiert.',

  // Der Layout-Generator
  'caseLayout.noInner':
    'Kein Innenmass hinterlegt, und auch keine Wandstärke. Das Innere folgt nicht aus dem Äusseren — Schale, Schaum und Deckel nehmen sich ihren Teil, also wird hier nichts gerechnet.',
  'caseLayout.noOuter':
    'Eine Wandstärke ist hinterlegt, aber die Aussenmasse des Cases nicht. Es gibt nichts, wovon sie abgezogen werden könnte.',
  'caseLayout.wallTooThick':
    'Eine Wand von {wand} mm lässt in diesem Case nichts übrig. Eine der beiden Zahlen ist falsch.',
  'caseLayout.noSize': 'Für diesen Artikel sind keine Masse hinterlegt — er bekommt kein Fach.',
  'caseLayout.tooBig': '{label} ist in mindestens einer Richtung grösser als das Innere dieses Cases.',
  'caseLayout.noRoom': 'Für {label} ist in diesem Case kein Platz mehr.',
  'caseLayout.unweighed':
    'Von den gesetzten Stücken haben {n} kein Gewicht hinterlegt. Die Summe darunter ist das Bekannte, nicht das Gewicht des Cases.',
  'caseLayout.headroom': 'Über der obersten Lage bleiben {mm} mm Höhe frei.',

  // Das Deckelblatt
  'caseList.kicker': 'Case-Inhalt',
  'caseList.title': 'Inhalt — {name}',
  'caseList.pieces': '{n} Stück',
  'caseList.noCode': 'kein Code',
  'caseList.total': 'Gesamtgewicht',
  'caseList.totalKg': 'Gesamt {kg} kg',
  'caseList.emptyKg': 'Case leer {kg} kg',
  'caseList.contents': 'Inhalt',
  'caseList.contentsKg': 'Inhalt {kg} kg',
  'caseList.unweighed': 'nicht gewogen',
  'caseList.unweighedShort': 'nicht gewogen',
  'caseList.missingBoth':
    'kein Gesamtgewicht: {n} Positionen sind nicht gewogen, und das Leergewicht des Cases ist nicht hinterlegt',
  'caseList.missingEmpty': 'kein Gesamtgewicht: das Leergewicht des Cases ist nicht hinterlegt',
  'caseList.missingItems': 'kein Gesamtgewicht: {n} Positionen sind nicht gewogen',
  // ── Case-Ausbau: Arten, Divider, Schubladen, Rack ───────────────────────
  'ausbau.art': 'Innen',
  'ausbau.art.foam': 'Schaumausschnitte',
  'ausbau.art.divider': 'Verstellbare Trennwände',
  'ausbau.art.drawers': 'Schubladen',
  'ausbau.art.rack': '19-Zoll-Schienen',
  'ausbau.innerHint':
    'Das Innenmass folgt nicht aus dem Aussenmass — Schale, Schaum und Deckel nehmen sich ihren Teil. Miss es nach, oder gib die Wandstärke an, damit sie abgezogen werden kann. Geschätzt wird hier nichts.',
  'ausbau.wallThickness': 'Wandstärke der Trennwand (mm)',
  'ausbau.columns': 'Spaltenbreiten (mm)',
  'ausbau.rows': 'Reihentiefen (mm)',
  'ausbau.dividerHint':
    'Die Teilung ist deine Entscheidung und kein Ergebnis: die Wände bleiben, wo du sie hinsteckst, und gefragt wird, was hineinpasst. Breiten in mm, mit Komma getrennt.',
  'ausbau.evenSplit': '{n} Spalten, gleichmässig',
  'ausbau.drawersHint':
    'Unten zuerst — welcher Auszug tief sitzt, ist eine Entscheidung (das Schwere nach unten) und kein Rechenergebnis. Ein Auszug ohne Höhe steht in der Liste, wird aber nicht gestapelt; eine angenommene Höhe verschöbe jeden Auszug darüber.',
  'ausbau.drawerName': 'Auszug',
  'ausbau.drawerHeight': 'Lichte Höhe (mm)',
  'ausbau.drawerRemove': 'Entfernen',
  'ausbau.drawerAdd': 'Auszug hinzufügen',
  'ausbau.drawerDefault': 'Auszug {n}',
  'ausbau.rackHint':
    'Das leere Rack gehört dem Lager: wieviele Höheneinheiten dieses Case hat, ist eine Eigenschaft des Cases. Was darin sitzt, gehört dem Signal-Plan — lade die Rack-Datei aus dem Cable Planner und wähle unten das Rack.',
  'ausbau.rackUnits': 'Höhe (HE)',
  'ausbau.rackDepth': 'Nutzbare Tiefe hinter der Schiene (mm)',
  'ausbau.rackRef': 'Rack im Signal-Plan',
  'ausbau.rackRefPlaceholder': 'Name oder Kennung des Racks',

  'case.template': 'Vorlage',
  'case.view2d': 'Draufsicht',
  'case.view3d': '3D',
  'case.layerToggle': 'Lage {nr}',
  'case3d.loading': 'Die 3D-Ansicht wird geladen…',

  'divider.legend': 'Fächer: {n} · {pct} % der Grundfläche ist Fach, der Rest ist Wand',
  'divider.aria': 'Die Teilung von oben',
  'divider.empty': 'leer',
  'divider.tooBig': '{label} passt in kein Fach dieser Teilung.',
  'divider.full': 'Jedes Fach, in das {label} passt, ist voll.',
  'divider.noRaster': 'Noch keine Teilung eingetragen — gib oben die Spaltenbreiten und Reihentiefen an.',

  'drawers.legend': 'Auszüge: {n} · {mm} mm bleiben oben frei',
  'drawers.aria': 'Die Auszüge von der Seite',
  'drawers.tooTall': 'Die Auszüge sind zusammen höher als das Case.',
  'drawers.noHeight': 'Ohne lichte Höhe, nicht gestapelt: {n}',
  'drawers.none': 'Noch kein Auszug mit lichter Höhe.',

  'rack.legend': '{he} HE · {frei} frei',
  'rack.aria': 'Das Rack von vorn',
  'rack.noHeight':
    'Für dieses Case ist keine Rack-Höhe hinterlegt. Wieviele Höheneinheiten es hat, ist eine Eigenschaft des Cases — der Plan kann das nicht beantworten.',
  'rack.noPlan':
    'Kein Rack-Layout aus dem Signal-Plan verknüpft. Das Case wird leer gezeigt — das ist keine Aussage darüber, dass es leer ist.',
  'rack.overlap': 'HE {he}: {a} und {b} sind übereinander geplant.',
  'rack.tooTall': '{label} reicht bis HE {oben}, dieses Case hat aber {hoehe}.',
  'rack.planMissing':
    'Das Rack „{ref}" steht nicht in der letzten Datei des Signal-Plans. Vielleicht wurde es dort umbenannt oder gelöscht — das Case wird leer gezeigt, und das ist keine Aussage darüber, dass es leer ist.',
  'rack.planTaller': 'Der Signal-Plan baut dieses Rack mit {plan} HE, dieses Case hat {hoehe}.',
  'planRack.notAFile':
    'Das ist keine Rack-Datei des Signal-Plans. Im Cable Planner: Bibliothek → Racks → Fürs Lager.',
  'planRack.option': '{name} · {he} HE',
  'planRack.load': 'Rack-Datei aus dem Plan laden',
  'planRack.loaded': '{n} Racks aus dem Plan, geladen {wann}.',

  // Der Katalog
  'katalog.noSize': 'kein Mass hinterlegt — einmal nachmessen, dann trägt die Vorlage es',
  'katalog.measured': 'in diesem Haus gemessen',
  'katalog.measuredBy': 'gemessen · {quelle}',
  'katalog.fromSheet': 'aus dem Datenblatt · {quelle}',
  'katalog.fromSheetPlain': 'aus dem Datenblatt',
  'katalog.unknownSource': 'Masse hinterlegt, Herkunft nicht angegeben',
  'katalog.rackOnlySheet':
    'Aussenmasse nicht veröffentlicht — nur Höheneinheiten und Einbautiefe · {quelle}',
  'katalog.units': '{he} HE',
  'katalog.mountDepth': '{mm} mm Einbautiefe',
  'katalog.outside': 'aussen {mass}',
  'katalog.inside': 'innen {mass}',
  'katalog.lidBase': 'Deckel {deckel} mm + Unterteil {unterteil} mm',
  'katalog.empty': '{kg} kg leer',

  'vorlage.pick': 'Schale aus einer Vorlage',
  'vorlage.apply': 'Übernehmen',
  'vorlage.own': ' eigen',
  'vorlage.maker': 'Hersteller',
  'vorlage.model': 'Modell',
  'vorlage.save': 'Dieses Case als Vorlage sichern',
  'vorlage.saved': 'Als Vorlage „{name}" gesichert.',
  'vorlage.cannotSave':
    'Noch nichts zu sichern: eine Vorlage braucht einen Modellnamen und mindestens einen vollständigen Satz Masse.',
  'vorlage.noSizeToApply':
    'Diese Vorlage trägt noch keine Masse. Miss das Case aus und sichere es als Vorlage zurück — ab dann trägt sie welche.',
  'vorlage.shippedHint':
    'Die mitgelieferten Vorlagen tragen Datenblatt-Zahlen mit Quelle. Ein gemessenes Case schlägt das Datenblatt: einmal nachmessen und zurücksichern, dann ersetzen deine Zahlen die mitgelieferten für dieses Modell.',
  // ── Inlay: Schaumzuschnitt und 3D-Druck ─────────────────────────────────
  'case.inlay': 'Inlay als Datei',
  'inlay.nothing':
    'Noch keine Lage zum Schneiden. Ein Inlay braucht Innenmasse und mindestens ein Stück mit Massen.',
  'inlay.hint':
    'Das Layout legt die Stücke auf ihre wahren Masse; das Inlay gibt Spiel dazu, denn ein Fach in Gerätegrösse nimmt das Gerät nicht auf. Eine Datei je Lage — Lagen sind einzelne Platten.',
  'inlay.layer': 'Lage',
  'inlay.layerOption': 'Lage {nr} · {mm} mm',
  'inlay.clearance': 'Spiel je Seite (mm, Vorgabe {mm})',
  'inlay.clearanceAria': 'Spiel je Seite',
  'inlay.floor': 'Boden unter den Taschen (mm)',
  'inlay.grip': 'Griffmulden',
  'inlay.summary':
    'Rohling {b} × {t} × {h} mm · {n} Taschen · {tri} Dreiecke · {open} offene Kanten · {vol} cm³',
  'inlay.dxf': 'DXF für den Schaumzuschnitt',
  'inlay.3mf': '3MF zum Drucken',
  'inlay.stl': 'STL (ohne Einheit in der Datei)',
  'inlay.formats':
    '3MF nennt die Einheit (Millimeter) in der Datei und verlangt ein dichtes Netz — nimm es zuerst. STL nennt gar keine Einheit; ein Leser muss raten, und der klassische Fehler ist der Faktor 25,4. Stege unter {min} mm stehen oben.',
  'inlay.overEdge':
    'Mit {spiel} mm Spiel ragt die Tasche für {label} über die Kante des Rohlings. Nimm weniger Spiel — oder das Stück gehört nicht in diese Lage.',
  'inlay.noGrip':
    'Für {label} ist kein Platz für eine Griffmulde. Ohne sie reisst die Fachkante ein, wenn man das Stück heraushebelt.',
  'inlay.thinWeb':
    'Zwischen {paar} bleiben nur {mm} mm Material. Unter {min} mm bricht ein Schaumsteg aus, wenn ein Stück herausgehoben wird.',
  'inlay.thinFloor': 'Ein Boden von {mm} mm trägt wenig. Unter einem schweren Stück gibt er nach.',

  // ── Geräte-Bibliothek (Sicht Bibliothek, Einstellungen, domain/lib/geraetebibliothek.ts) ──
  'library.add': 'Ins Lager',
  'library.added': '{model} ist im Bestand angelegt.',
  'library.col.status': 'Status',
  'library.col.weight': 'Gewicht kg',
  'library.count': '{shown} von {all} · {invalid} ungültig',
  'library.empty': 'Noch keine Geräte aus der Bibliothek. Abgleichen holt die Geräte, die eine Lager-Ansicht haben.',
  'library.error.code': 'Der Code ist falsch oder abgelaufen. Den aktuellen Code aus der Authenticator-App eingeben.',
  'library.error.credentials': 'Anmeldung fehlgeschlagen: E-Mail, Benutzername oder Passwort stimmt nicht.',
  'library.error.offline': 'Der Bibliotheks-Server ist nicht erreichbar. Verbindung und Server-Adresse prüfen.',
  'library.error.rate': 'Zu viele Versuche. Eine Minute warten und erneut versuchen.',
  'library.error.server': 'Der Bibliotheks-Server hat mit einem Fehler geantwortet. Später erneut versuchen.',
  'library.error.session': 'Nicht angemeldet, oder die Sitzung ist abgelaufen. Bitte neu anmelden.',
  'library.error.unverified': 'Zuerst die E-Mail-Adresse bestätigen — der Link steht in der Nachricht der Bibliothek.',
  'library.inStock': 'Schon im Bestand (gleicher Hersteller und gleiches Modell).',
  'library.inStockShort': 'Im Bestand',
  'library.lastSync': 'Server {server} · zuletzt abgeglichen {when}',
  'library.neverSynced': 'Server {server} · noch nicht abgeglichen',
  'library.qty': 'Menge beim Anlegen',
  'library.search': 'Suche — Modell, Hersteller, Kategorie',
  'library.search.aria': 'Die Geräte-Bibliothek durchsuchen',
  'library.signInFirst': 'Zum Abgleichen und Einreichen unter Einstellungen → Geräte-Bibliothek anmelden.',
  'library.status.confirmed': 'bestätigt',
  'library.status.disputed': 'umstritten',
  'library.status.unconfirmed': 'unbestätigt',
  'library.status.verified': 'geprüft',
  'library.statusLine': '{status} · {n} Bestätigungen',
  'library.submit': 'Einreichen',
  'library.submit.choose': 'auswählen …',
  'library.submit.done': 'Eingereicht als {slug} ({state}).',
  'library.submit.head': 'Einen Lagerartikel in die Bibliothek einreichen',
  'library.submit.hint':
    'Gesendet werden nur die Typdaten: Modell, Hersteller, Kategorie, Maße, Gewicht, Materialart, Ursprungsland. Mengen, Lagerorte, Preise und Seriennummern bleiben hier. Das Gerät geht zuerst in die Moderation.',
  'library.submit.item': 'Lagerartikel',
  'library.submit.link': 'Datenblatt-Link',
  'library.submit.needCategory': 'Der Artikel braucht eine Kategorie.',
  'library.submit.needLink': 'Ein Link zum Datenblatt des Herstellers (https://…) ist Pflicht.',
  'library.submit.needManufacturer': 'Der Artikel braucht einen Hersteller.',
  'library.sync': 'Abgleichen',
  'settings.library': 'Geräte-Bibliothek',
  'settings.library.apply': 'Übernehmen',
  'settings.library.badServer': 'Das ist keine brauchbare Server-Adresse. https:// verwenden (http nur für localhost).',
  'settings.library.cancel': 'Abbrechen',
  'settings.library.code': 'Authenticator-Code',
  'settings.library.forgot': 'Passwort vergessen',
  'settings.library.hint':
    'Gemeinsame Gerätedaten der AV-Planner-Suite. Lesen geht nur mit Konto; der Planer speichert nur das Anmelde-Token, nie das Passwort.',
  'settings.library.login': 'E-Mail oder Benutzername',
  'settings.library.password': 'Passwort',
  'settings.library.register': 'Konto anlegen',
  'settings.library.reset': 'Auf Vorgabe zurücksetzen',
  'settings.library.server': 'Server',
  'settings.library.serverHint': 'Ein anderer Server meldet ab und leert die zwischengespeicherten Geräte.',
  'settings.library.signIn': 'Anmelden',
  'settings.library.signOut': 'Abmelden',
  'settings.library.signedIn': 'Angemeldet als {name} ({email}).',
  'settings.library.signedOut': 'Nicht angemeldet.',
  'settings.library.verify': 'Bestätigen',
  'tab.library': 'Geräte-Bibliothek',
  'tab.library.q': 'Welche Gerätetypen kennt die gemeinsame Bibliothek — und welche von unseren fehlen dort?',
}
