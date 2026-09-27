// Setzt Checkout-Link und Enddatum aus konfiguration.js ein.
;(function () {
  var k = window.NACHFRAGETEST || {}
  var knopf = document.getElementById('vorbestellen')
  if (k.checkoutUrl) {
    knopf.href = k.checkoutUrl
    knopf.removeAttribute('aria-disabled')
    knopf.textContent = knopf.dataset.offen
  }
  var ende = document.getElementById('ende')
  if (ende && k.ende) {
    var d = new Date(k.ende + 'T00:00:00')
    ende.textContent = d.toLocaleDateString(document.documentElement.lang, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  var kontakt = document.getElementById('kontakt')
  if (kontakt && k.kontakt) {
    var a = document.getElementById('kontakt-adresse')
    a.href = 'mailto:' + k.kontakt + '?subject=' + encodeURIComponent(a.dataset.betreff)
    a.textContent = k.kontakt
    kontakt.hidden = false
  }
})()
