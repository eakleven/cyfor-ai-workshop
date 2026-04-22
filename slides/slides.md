---
theme: default
title: Cyfor Workshop
info: |
  Workshop-dekk for Cyfor.
  Norsk versjon med enklere slides, mer speakernotater og et Sopra Steria-inspirert uttrykk.
themeConfig:
  primary: '#a60726'
class: hero-slide text-left
drawings:
  persist: false
transition: slide-left
mdc: true
---

# Cyfor Workshop

<div class="hero-block">
  <p class="eyebrow">Fra kodeassistent til leveransesystem</p>
  <p class="hero-lede">Fire oppgaver. Én retning.</p>
</div>

<!--
Åpning:

Dette er ikke en workshop om å få Copilot til å skrive mest mulig kode.
Det er en workshop om å gjøre AI til en del av et leveransesystem som er enklere å stole på.

Reisen går fra:
- liten app
- litt repo-kontekst
- til reusable skills, bedre problemforståelse og en tydelig issue-til-PR-flyt
-->

---
class: soft-slide
---

# Dagens reise

<div class="card-grid four">
  <div class="brand-card">
    <span class="step-no">1</span>
    <h3>Struktur</h3>
    <p>backlogg, issues og repo-kontekst</p>
  </div>
  <div class="brand-card">
    <span class="step-no">2</span>
    <h3>Evner</h3>
    <p>skills, MCP-er og review-flyt</p>
  </div>
  <div class="brand-card">
    <span class="step-no">3</span>
    <h3>Forståelse</h3>
    <p>fra vag idé til tydelig problem</p>
  </div>
  <div class="brand-card">
    <span class="step-no">4</span>
    <h3>Flyt</h3>
    <p>issue, plan, PR og menneskelig kontroll</p>
  </div>
</div>

<!--
Dette er rød tråd for hele dagen.

Poenget er at AI blir mer nyttig når den får:
- bedre struktur rundt seg
- gjenbrukbare arbeidsmåter
- klarere problemdefinisjoner
- tydelige kontrollpunkter for mennesker

Jeg ville sagt høyt at "mer autonomi" ikke er målet i seg selv.
Målet er bedre flyt uten å miste kontroll.
-->

---

# Utgangspunktet

<div class="two-panel">
  <div class="info-panel dark">
    <p class="eyebrow">I repoet nå</p>
    <h3>En liten app med items</h3>
    <p><code>api/</code> og <code>web/</code> er allerede på plass.</p>
  </div>
  <div class="info-panel">
    <p class="eyebrow">Hvorfor det er bra</p>
    <h3>Lite nok til å forstå. Ekte nok til å lære av.</h3>
    <p>Små endringer blir synlige på tvers av API, klient og UI.</p>
  </div>
</div>

<div class="quote-box">
  Hvis en PR ikke kan reviews på rundt 10 minutter, er den for stor for denne workshopen.
</div>

<!--
Vis raskt på maskinen:

1. Kjør appen.
2. Vis at UI-et fremdeles snakker om "items".
3. Pek på at dette er bevisst lite: perfekt for små, reviewbare endringer.
4. Nevn at API-endringer flyter via OpenAPI/generert klient og videre til frontend.
-->

---
class: soft-slide
---

# Repo-instruksjoner

<div class="two-panel">
  <div class="info-panel">
    <p class="eyebrow">AGENTS.md</p>
    <h3>Felles huskelapp for agenter</h3>
    <p>Hva repoet er, hvordan vi jobber, og hvilke regler som gjelder her.</p>
  </div>
  <div class="info-panel accent">
    <p class="eyebrow">CLAUDE.md</p>
    <h3>Samme idé, annet verktøy</h3>
    <p>En lignende instruksjonsfil brukt i Claude-økosystemet.</p>
  </div>
</div>

<div class="quote-box">
  Poenget er ikke filnavnet. Poenget er varig kontekst som følger repoet.
</div>

<!--
Konseptslide før oppgave 1.

Forklar:
- AGENTS.md er repo-spesifikke instrukser for agenten.
- Typisk innhold:
  - domene og arkitektur
  - hvor ting ligger
  - hvilke scripts som skal brukes
  - hva som ofte glemmes, f.eks. regenerering av klient
  - hva slags endringer vi ønsker: små, trygge, konsistente
- CLAUDE.md er samme mønster i et annet verktøy/økosystem.

Hovedpoeng:
Vi vil at viktig kontekst skal bo i repoet, ikke bare i hodet til den som sitter ved tastaturet.
-->

---
class: task-slide
---

# Oppgave 1

## Gi Copilot et sted å jobbe

<div class="two-panel">
  <div class="info-panel">
    <h3>Hvorfor</h3>
    <p>God AI starter sjelden med prompten. Den starter med et ryddig prosjekt.</p>
  </div>
  <div class="info-panel accent">
    <h3>Vi gjør</h3>
    <p>GitHub-issues, <code>AGENTS.md</code> og første ende-til-ende-endring fra items til ressurser.</p>
  </div>
</div>

<!--
Snakkepunkter:

- GitHub-backloggen skal speile workshopoppgavene.
- AGENTS.md er repoets hukommelse for Copilot.
- Første feature er liten med vilje:
  - beskrivelse
  - type/kategori
  - redigering etter opprettelse
  - språk fra "items" til "resources"

Vis raskt:
- ett task-dokument i workshop-tasks/
- dagens UI
- at repoet ennå ikke har den varige agentkonteksten vi ønsker
-->

---
class: soft-slide
---

# Hva er en skill?

<div class="two-panel">
  <div class="info-panel">
    <h3>En navngitt arbeidsmåte</h3>
    <p>Ikke bare en prompt, men et gjenbrukbart mønster for en bestemt jobb.</p>
  </div>
  <div class="info-panel accent">
    <h3>En god skill er liten</h3>
    <p>Kort, konkret, tydelig avgrenset og lett å bruke igjen.</p>
  </div>
</div>

<!--
Konseptslide før oppgave 2, del 1.

Forklar:
- En skill pakker inn god praksis.
- Den er nyttig når vi vil at agenten skal gjøre samme type jobb på en konsistent måte.
- Eksempler:
  - review-pr
  - refine-issue
  - triage-issue

Hva som gjør en skill god:
- tydelig formål
- riktig scope
- praktiske sjekkpunkter
- ikke for lang og ikke for generell
-->

---
class: soft-slide
---

# Hva er en MCP?

<div class="two-panel">
  <div class="info-panel dark">
    <h3>Verktøy + fersk kontekst</h3>
    <p>MCP lar agenten bruke eksterne systemer i stedet for å gjette fra modellminne.</p>
  </div>
  <div class="info-panel">
    <h3>Nyttig når vi trenger mer enn tekst</h3>
    <p>Dokumentasjon, GitHub, API-er og andre kilder kan hentes inn der og da.</p>
  </div>
</div>

<div class="quote-box">
  I oppgave 2 er poenget ikke bare å installere en MCP, men å bruke den til en bedre beslutning.
</div>

<!--
Konseptslide før oppgave 2, del 2.

Forklar:
- MCP = måten agenten kobler seg til verktøy og kunnskapskilder utenfor modellen.
- Det gjør output mer jordet i nåværende virkelighet.
- Context7 er et godt eksempel fordi det lar oss hente oppdatert dokumentasjon.

Viktig poeng:
Installasjon alene er ikke verdien.
Verdien kommer når MCP-en faktisk endrer hvordan vi implementerer.
-->

---
class: task-slide
---

# Oppgave 2

## Gjør god praksis gjenbrukbar

<div class="two-panel">
  <div class="info-panel">
    <h3>Hvorfor</h3>
    <p>Fri prompting kan fungere, men den er ikke stabil nok når vi vil jobbe likt hver gang.</p>
  </div>
  <div class="info-panel accent">
    <h3>Vi gjør</h3>
    <p>En review-skill, Context7 som MCP, og et lite søk/filter som faktisk går via API-et.</p>
  </div>
</div>

<!--
Snakkepunkter:

- En skill er mer enn en lagret prompt; den er en gjenbrukbar arbeidsmåte.
- Context7 brukes for å hente fersk dokumentasjon i stedet for å gjette.
- Vi vil se at filtrering skjer via API og kontrakt, ikke bare lokalt i UI.

Vis raskt:
- .agents/skills/
- at Context7 er tilgjengelig
- hvorfor dette er et bedre eksempel enn "installer MCP og stopp der"
-->

---
class: soft-slide
---

# Kontekst før kode

<div class="two-panel">
  <div class="info-panel">
    <h3>Prompten er bare en del av bildet</h3>
    <p>Kontekst er også mål, regler, avgrensning, dataflyt og språk om domenet.</p>
  </div>
  <div class="info-panel accent">
    <h3>Vage krav gir vage svar</h3>
    <p>Når problemet er uklart, må vi raffinere før vi bygger.</p>
  </div>
</div>

<!--
Konseptslide før oppgave 3.

Forklar:
- "Context engineering" handler om å forbedre arbeidsgrunnlaget, ikke bare prompten.
- God kontekst gjør det lettere å få:
  - bedre planer
  - riktigere edge cases
  - tydeligere akseptansekriterier
  - mindre omarbeid

Bro til oppgaven:
Refine-issue-skillen er et verktøy for å få frem skjulte antakelser før implementasjon.
-->

---
class: task-slide
---

# Oppgave 3

## Ikke kod før problemet er tydelig

<div class="two-panel">
  <div class="info-panel">
    <h3>Hvorfor</h3>
    <p>Vage krav skjuler regler, antakelser og konfliktpunkter.</p>
  </div>
  <div class="info-panel accent">
    <h3>Vi gjør</h3>
    <p>En refine-issue-skill som gjør «støtt planlegging og reservasjoner» om til noe som faktisk kan bygges.</p>
  </div>
</div>

<!--
Snakkepunkter:

- Dette er oppgaven der vi viser at "bedre prompt" ofte er feil ramme.
- Før koding må vi forstå:
  - hva som kan bookes
  - hva en plan betyr
  - hvilke statuser som finnes
  - hva som er konflikt og hva som ikke er det

Vis raskt:
- den vage teksten
- målet om å ende med user story, akseptansekriterier, business rules og non-goals
-->

---
class: soft-slide
---

# Kontrollpunkter

<div class="card-grid four">
  <div class="brand-card">
    <span class="step-no">1</span>
    <h3>Triage</h3>
    <p>Er scope og antakelser riktige?</p>
  </div>
  <div class="brand-card">
    <span class="step-no">2</span>
    <h3>Plan</h3>
    <p>Er løsningen liten og reviewbar?</p>
  </div>
  <div class="brand-card">
    <span class="step-no">3</span>
    <h3>Review</h3>
    <p>Fant vi feil og risiko før merge?</p>
  </div>
  <div class="brand-card">
    <span class="step-no">4</span>
    <h3>Merge</h3>
    <p>Mennesket beholder siste ord.</p>
  </div>
</div>

<!--
Konseptslide før oppgave 4.

Forklar:
- Når vi snakker om semi-autonomi, er det dette vi egentlig mener:
  AI kan gjøre mye arbeid mellom kontrollpunktene, men mennesket eier beslutningene.
- Hvis et steg sklir ut, skal neste kontrollpunkt stoppe det.
- Små PR-er er en konsekvens av god triage og god plan, ikke bare "snill kode".
-->

---
class: task-slide
---

# Oppgave 4

## Orkestrering, ikke magi

<div class="flow-row">
  <span class="flow-step">Issue</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">Triage</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">Plan</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">PR</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">Review</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">Merge</span>
</div>

<div class="quote-box">
  Hovedagenten skal først og fremst koordinere spesialiserte steg — ikke være én gigantisk prompt.
</div>

<!--
Snakkepunkter:

- Nå setter vi sammen alt fra de forrige oppgavene.
- Kontrollpunktene er det viktige:
  - triage
  - plan-godkjenning
  - PR-review
  - merge
- AI-review er første pass, menneskelig review er andre pass.

Vis raskt:
- valgt GitHub-issue
- triage-output
- plan-output
- at minst én skill skriver tilbake til GitHub
-->

---
class: hero-slide end-slide
---

# Det vi egentlig bygger

<div class="hero-block">
  <p class="eyebrow">Struktur → evner → forståelse → flyt</p>
  <p class="hero-lede">Copilot skal ikke bare hjelpe oss å kode. Den skal hjelpe oss å levere på en måte vi kan stole på.</p>
</div>

<!--
Avslutning:

Oppsummer med de fire ordene:
- struktur
- evner
- forståelse
- flyt

Hvis deltakerne sitter igjen med én ting, bør det være:
Tillit til AI kommer fra gode rammer og små, tydelige handoffs.
-->
