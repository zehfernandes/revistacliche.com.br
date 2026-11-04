import Link from "next/link";
import { about, people, volumes } from "@/lib/content";
import { Frame } from "@/components/Frame";

// Dated from the archive: the posts and episodes linked here, plus the 2013 "Experiência Cliche" episode for the N1 launch day.
// Talks without a link are dated by the slide files in the 2012–2014 Dropbox archive.
// The opening meeting is dated by its poster; the head count comes from the N1 editorial.
type Event = { when: string; kind: keyof typeof KINDS; text: string; href?: string; issue?: string };
const KINDS = { revista: "Revista", portal: "Portal", podcast: "ClicheCast", premio: "Prêmio", evento: "Evento", palestra: "Palestra" };
const TIMELINE: [string, Event[]][] = [
  ["2010", [
    { when: "15 set", kind: "evento", text: "Reunião de abertura na UTFPR, com cerca de 15 estudantes." },
    { when: "8 nov", kind: "revista", issue: "n1", text: "400 exemplares vendidos na primeira semana.", href: "/volumes/n1/" },
  ]],
  ["2011", [
    { when: "set", kind: "revista", issue: "n2", text: "Nova identidade, com trabalhos de toda Curitiba.", href: "/volumes/n2/" },
    { when: "set", kind: "portal", text: "O portal entra no ar.", href: "/2011/09/bem-vindo-a-cliche-online/" },
  ]],
  ["2012", [
    { when: "mar", kind: "evento", text: "Edital nacional e campanha no Catarse para a N3.", href: "/2012/03/cliche-3-edital-aberto/" },
    { when: "8 mai", kind: "palestra", text: "“Design Colaborativo” no IFSC." },
    { when: "ago", kind: "revista", issue: "n3", text: "A partir das Cidades Invisíveis de Calvino.", href: "/volumes/n3/" },
    { when: "18 ago", kind: "premio", text: "Primeiro troféu: Wake Content Talent Show, no YouPix.", href: "/2013/01/feliz-2013/" },
    { when: "13 out", kind: "palestra", text: "Oficina de webdesign no R Curitiba.", href: "/2012/10/encontros-de-design-e-a-cliche/" },
    { when: "24 out", kind: "palestra", text: "Palestra na Charneira, da PUC-PR.", href: "/2012/10/encontros-de-design-e-a-cliche/" },
    { when: "nov", kind: "palestra", text: "Palestra no R Lab e oficina no R Brasília.", href: "/2012/10/encontros-de-design-e-a-cliche/" },
    { when: "29 nov", kind: "podcast", text: "Estreia o ClicheCast: “Problemas Zumbis”.", href: "/2012/11/clichecast-problemas-zumbis/" },
  ]],
  ["2013", [
    { when: "mar", kind: "portal", text: "Mês recorde do portal: 27 artigos." },
    { when: "mar", kind: "palestra", text: "“Design Colaborativo” na FAE." },
    { when: "abr", kind: "palestra", text: "“Design Colaborativo” no ENEdesign." },
    { when: "10 out", kind: "palestra", text: "“Insight vs. Metodologia” na PUC-PR.", href: "/2013/10/disseminando-conhecimentos-nos-eventos-de-design/" },
    { when: "nov", kind: "podcast", text: "Experiência Cliche: cinco entrevistas em cinco dias.", href: "/exp/design-e-genero-marines-ribeiro/" },
    { when: "15 nov", kind: "palestra", text: "Palestra e oficina no R Porto Alegre.", href: "/2013/10/disseminando-conhecimentos-nos-eventos-de-design/" },
  ]],
  ["2014", [
    { when: "jun", kind: "podcast", text: "O ClicheCast fica semanal.", href: "/2014/06/clichecast21-massimo-vignelli/" },
    { when: "nov", kind: "palestra", text: "“Design, coisa de outro mundo” no R Bauru." },
    { when: "dez", kind: "evento", text: "Abre o edital da N4.", href: "/2014/12/revista-cliche-n4-edital-aberto/" },
  ]],
  ["2015", [
    { when: "jul", kind: "podcast", text: "Gravação ao vivo no NSP.", href: "/2015/11/clichecast50-live-questoes-de-design/" },
    { when: "2º sem", kind: "revista", issue: "n4", text: "A última edição impressa.", href: "/volumes/n4/" },
    { when: "nov", kind: "portal", text: "Último artigo do portal.", href: "/2015/11/design-nao-vai-salvar-a-vida-de-ninguem/" },
    { when: "14 dez", kind: "podcast", text: "Último episódio, o #56.", href: "/2015/12/clichecast56-gerente-de-projetos-uma-profissao-util/" },
  ]],
];

// authors, podcast guests and magazine contributors; people who were only the subject of a post don't count
const collaborators = people.filter((p) => p.roles.some((r) => r !== "tema")).length;

export function About() {
  const { stats } = about;
  return (
    <Frame
      crumbs={[{ label: "Sobre" }]}
      active="Sobre"
    >
      <article className="about">
        <header className="about-hero">
          <p className="kicker">2010–2015</p>
          <h1><img className="about-logo" src="/brand/logo-cliche.svg" alt="Revista Cliche" /></h1>
          <p>
            Arquivo do projeto Cliche, uma revista independente de design criada em 2010 por estudantes da UTFPR, em Curitiba.
            Começou impressa, ganhou um portal e um podcast, e até 2015 reuniu textos, entrevistas e conversas de estudantes e
            designers de todo o Brasil.
          </p>
        </header>

        <dl className="facts">
          {[
            [stats.posts, "artigos"],
            [stats.podcasts, "episódios"],
            [collaborators, "colaboradores"],
            [volumes.length, "edições"],
          ].map(([n, label]) => (
            <div key={label}>
              <dt>{n}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>

        <section id="historico" className="about-section" aria-label="Histórico">
          <ol className="timeline">
            {TIMELINE.map(([year, events]) => (
              <li key={year}>
                <h3 className="year">{year}</h3>
                <div>
                  {events.map((e) => {
                    const v = e.issue && volumes.find((v) => v.n === e.issue);
                    const text = v ? `${v.label}: ${e.text}` : e.text;
                    // /exp/ is the static 2013 mini-site, outside the Next router
                    return <p key={e.text}>{e.href?.startsWith("/exp/") ? <a href={e.href}>{text}</a> : e.href ? <Link href={e.href}>{text}</Link> : text}{v && <span className="star" aria-hidden> ★</span>}</p>;
                  })}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="edicoes" className="about-section">
          <h2>Edições</h2>
          <ul className="about-covers">
            {volumes.filter((v) => v.n !== "n1").map((v) => (
              <li key={v.n}>
                <Link href={`/volumes/${v.n}/`}>
                  {v.scans && v.cover ? <img src={v.cover} alt={`Capa da ${v.label}`} /> : <span className="issue-ph">?</span>}
                  <span>
                    {v.label} · {v.year}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="about-end">
            Este site guarda tudo: as <Link href="/volumes/">revistas</Link>, os <Link href="/articles/">artigos</Link> e os{" "}
            <Link href="/podcasts/">episódios</Link>.
          </p>
        </section>
      </article>
    </Frame>
  );
}
