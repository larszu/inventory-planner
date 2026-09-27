// Die zwei Werte, die Lars setzt, sobald der Test startet (docs/nachfragetest-ladeplanung.md).
// Leer = die Vorbestellung ist noch nicht offen; die Seite sagt das, statt ins Leere zu verlinken.
window.NACHFRAGETEST = {
  // Checkout-Link des Merchant of Record (Lemon Squeezy oder Paddle), Produkt „Gründerpreis".
  checkoutUrl: '',
  // Letzter Tag des Tests, ISO-Datum (z. B. '2026-12-01'). Danach wird erstattet, falls die Schwelle fehlt.
  ende: '',
  // Adresse, an die Fahrzeugdateien geschickt werden (Kennzahl 2). Leer = der Absatz bleibt ausgeblendet.
  kontakt: '',
}
