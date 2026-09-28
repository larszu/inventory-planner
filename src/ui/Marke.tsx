import signetOffwhite from '../assets/brand/lzm_signet_offwhite.svg'
import signetNavy from '../assets/brand/lzm_signet_navy.svg'
import hauptlogoOffwhite from '../assets/brand/lzm_hauptlogo_offwhite.svg'
import hauptlogoNavy from '../assets/brand/lzm_hauptlogo_navy.svg'

/* Das Signet ohne Tally-Punkt: der Blockkopf darunter traegt schon Rot, und
 * pro Sichtfeld gibt es nur eines. */

/** Beide Farbfassungen stehen im Markup; das Stilblatt zeigt die zum Thema passende. */
function Zweifach({ dunkel, hell, className }: { dunkel: string; hell: string; className: string }) {
  return (
    <>
      <img src={dunkel} alt="Lars Zumpe Medienproduktion" className={`${className} auf-dunkel`} />
      <img src={hell} alt="Lars Zumpe Medienproduktion" className={`${className} auf-hell`} />
    </>
  )
}

export const Signet = () => <Zweifach dunkel={signetOffwhite} hell={signetNavy} className="signet" />

export const Hauptlogo = () => <Zweifach dunkel={hauptlogoOffwhite} hell={hauptlogoNavy} className="hauptlogo" />
