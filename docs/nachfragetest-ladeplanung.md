# Nachfragetest Ladeplanung (#27)

Stand 27.09.2026. Dieses Dokument legt den Test fest, **bevor** er läuft —
damit das Ergebnis nicht hinterher passend gedeutet wird.

## Ausgangslage

Die Kette #16–#26 ist gebaut: Packer, Fahrzeugmodell, 3D-Ansicht,
Lastverteilungsplan, Ausgaben. Der Test entscheidet also nicht mehr, ob der
Packer-Kern gebaut wird, sondern **ob die Ladeplanung ein bezahltes Produkt
wird** — und damit, ob weitere Wochenenden hineinfließen (Paywall/Lizenz,
XLSX aus #25, Fahrzeugkatalog über den Ducato hinaus, Sattelzug-Fälle).

Preisanker, geprüft am 27.09.2026 auf <https://www.truckpacker.com/pricing>:
Truck Packer Pro **28 $/Monat**, Business auf Anfrage, 7 Tage Test.

## Festgelegt

| Punkt | Festlegung | Grund |
|---|---|---|
| Angebot | Vorbestellung zum **Gründerpreis 25 €/Monat**, die Vorbestellung zahlt den ersten Monat | aus #27: nicht unter Truck Packer, 25 € wird bezahlt, wenn 28 $ bezahlt werden |
| Erstattung | voll, automatisch bei verfehlter Schwelle, auf Wunsch jederzeit vorher | eine Vorbestellung ohne Rückweg misst Vertrauen, nicht Nachfrage |
| Zahlung | Merchant of Record (Lemon Squeezy oder Paddle) | stellt Rechnung und Umsatzsteuer; keine eigene Buchhaltung für Kleinbeträge |
| Laufzeit | **8 Wochen** ab dem ersten veröffentlichten Beitrag | aus #27 |
| **Schwelle** | **15 bezahlte Vorbestellungen** in 8 Wochen | aus #27 |
| Kennzahl 2 | eingesandte Fahrzeugdateien (*Export vehicles*) ohne Vorbestellung | siehe unten |

### Entscheidung nach 8 Wochen

- **ab 15 Vorbestellungen:** weiterbauen. Reihenfolge: Bezahlweg in der App, dann was die Rückmeldungen am häufigsten nennen.
- **5 bis 14:** nicht weiterbauen. Rückmeldungen auswerten; ein zweiter Durchlauf nur mit **einer** geänderten Variable (Zielgruppe *oder* Preis), wieder mit Schwelle vorab.
- **unter 5:** Ladeplanung bleibt ein kostenloser Teil des Lagers, so wie sie ist. Keine weiteren Wochenenden dafür.

Bei verfehlter Schwelle wird allen erstattet — ohne Nachfrage.

### Warum Kennzahl 2 keine Telemetrie ist

Die App ist offline-first und schickt nichts nach Hause. Ein Zähler für den
Fahrzeug-Vermesser bräuchte Server, Einwilligung und Datenschutzerklärung —
für eine Zahl, die nur für acht Wochen interessiert. Stattdessen zählt, wer
seine **Fahrzeugdatei schickt**: das ist Nutzung ohne Zahlung, freiwillig und
mit echtem Inhalt (welche Fahrzeuge die Zielgruppe fährt). Viele Dateien bei
wenigen Vorbestellungen heißt: das Werkzeug trifft, der Preis oder das
Bezahlen nicht. Wenige Dateien heißt: es trifft schon das Problem nicht.

Hinweis: Lemon Squeezy reicht eigene Felder aus dem Checkout-Link
(`checkout[custom][…]`) nur an Webhooks weiter, nicht ins Dashboard
(Dokumentation geprüft am 27.09.2026). Eine Kanalzuordnung darüber lohnt
ohne eigenen Server nicht — der Kanal wird in der Auswertung von Hand
eingetragen, wo er erkennbar ist.

## Die Testseite

`public/ladeplanung/` — englisch (`index.html`) und deutsch (`de.html`),
ausgeliefert mit der Web-Seite unter `…/inventory-planner/ladeplanung/`.
Bild: 3D-Ansicht eines gepackten Fiat Ducato L3H2 aus der App (Maße aus dem
Katalog, Cases aus den mitgelieferten Vorlagen). Ein Sprinter steht nicht im
Katalog — ohne Datenblatt-Quelle kommt er dort nicht hinein.

Drei Werte in `public/ladeplanung/konfiguration.js`: Checkout-Link, Testende,
Kontaktadresse für Fahrzeugdateien. Leer zeigt die Seite „Vorbestellung
öffnet in Kürze" und blendet den Kontaktabsatz aus.

## Wo gefragt wird

Kein Kaltvertrieb: keine Anrufe, keine Mails an Verleiher, die Lars nicht
kennt. Gefragt wird schriftlich, mit Substanz — ein laufendes Werkzeug und
eine echte Frage.

1. **Eigenes Netzwerk zuerst** — Techniker und Vereine mit Bus, die Lars
   kennt (CVJM, Sola-Multimedia, Kirche für Oberberg, frühere Kollegen).
   Persönliche Nachricht, Text unten.
2. **Fachforen und Reddit** (deutsche Veranstaltungstechnik-Foren,
   r/livesound, r/stagecraft) — als Beitrag mit Bild und Frage, nicht als
   Anzeige. Vorher die Regeln des jeweiligen Forums zu Eigenwerbung lesen;
   wo Eigenprojekte nur in bestimmten Fäden erlaubt sind, dort posten.

### Nachricht ans Netzwerk (de)

> Hi …, ich hab in den letzten Wochen eine Ladeplanung für Transporter gebaut
> — Radkästen, Cases mit Rollen, Lastverteilungsplan zum Ausdrucken. Du fährst
> ja regelmäßig mit Technik raus: Würdest du einmal deinen Bus darin ausmessen
> und mir sagen, wo es hakt? Link: … Wenn du es für Jobs nutzen würdest,
> gibt's dort auch eine Vorbestellung — aber ehrliche Kritik hilft mir gerade
> mehr.

### Forumsbeitrag (de)

> **Ladeplanung für Transporter — was fehlt euch?**
>
> Ich arbeite in der Veranstaltungs- und Medientechnik und habe mir eine Ladeplanung gebaut, die
> mit Transportern statt Sattelzügen rechnet: Radkästen, Hecktüröffnung,
> Cases mit Rollen und Rollentellern, Abladereihenfolge nach Gewerk,
> Lastverteilungsplan zum Ausdrucken. [Bild]
>
> Läuft im Browser: … Mich interessiert: Wie plant ihr heute, was in den Bus
> passt? Und wäre euch so etwas Geld wert — oder reicht Erfahrung und Zollstock?

### Reddit (en)

> **I built load planning for vans (wheel arches, castor cases, axle loads) — how do you plan yours?**
>
> Most load planners assume a box truck. This one starts from vans: it models
> wheel arches, the rear door opening, cases with castors and castor dishes,
> unload order by department, and prints an axle-load plan. [image]
>
> Runs in the browser: … How do you figure out what fits today? Would you pay
> for this, or is experience plus a tape measure enough?

## Was Lars tun muss

- [ ] **Pages einschalten**: *Settings → Pages → Source: GitHub Actions* (ohne das ist die Testseite nicht online, siehe README).
- [ ] Konto beim Merchant of Record anlegen, Produkt „Ladeplanung – Gründerpreis" (25 €/Monat, Abo) anlegen, Checkout-Link in `konfiguration.js` eintragen.
- [ ] Kontaktadresse für Fahrzeugdateien und Testende (Starttag + 8 Wochen) in `konfiguration.js` eintragen.
- [ ] Nachrichten ans Netzwerk schicken, dann Forum/Reddit — Start = erster Beitrag.
- [ ] Jede Vorbestellung, Datei und Rückmeldung in `nachfragetest-auswertung.csv` eintragen
  (Spalte `art`: `beitrag`, `antwort`, `fahrzeugdatei`, `vorbestellung`, `erstattung`;
  `kanal`: `netzwerk-…`, `forum-…`, `reddit-…`, `direkt`). Die Beispielzeile vorher löschen.
- [ ] Nach 8 Wochen nach der Tabelle oben entscheiden und das Ergebnis an #27 schreiben.
