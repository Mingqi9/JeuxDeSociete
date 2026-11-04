import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "./i18n";
import { LanguageSelect } from "./LanguageSelect";
import { landingWords, rulebooks } from "./landingWords";

type Section = "online" | "rules" | "about" | "local";
export function Landing({
  lang,
  setLang,
  mode,
  onMode,
  children,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  mode: "online" | "local";
  onMode: () => void;
  children: ReactNode;
}) {
  const [section, setSection] = useState<Section>(mode);
  const [rulesLang, setRulesLang] = useState<Lang>(lang);
  const content = useRef<HTMLDivElement>(null);
  const w = landingWords[lang];
  useEffect(() => setRulesLang(lang), [lang]);
  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [section]);
  const navigate = (next: Section) => {
    if ((next === "local" || next === "online") && next !== mode) onMode();
    else setSection(next);
  };
  return (
    <main className="landing">
      <section className="landing-hero" aria-label={w.title}>
        <div className="landing-header">
          <a className="landing-brand" href="/" aria-label="Europa Rail Club">
            <span className="club-monogram" aria-hidden="true">
              M
            </span>
            <span>{w.title}</span>
          </a>
          <LanguageSelect lang={lang} onChange={setLang} />
        </div>
        <div className="landing-hero-content">
          <img
            className="landing-box"
            src="/images/railway-box-fr.webp"
            alt={w.boxAlt}
            width="800"
            height="767"
          />
          <div className="landing-hero-title">
            <img
              src="/images/railway-title-fr.webp"
              alt={w.logoAlt}
              width="1000"
              height="380"
            />
            <h1>{w.tagline}</h1>
          </div>
          <ul className="landing-facts">
            <li>
              <span aria-hidden="true">♟</span>
              {w.players}
            </li>
            <li>
              <span aria-hidden="true">♧</span>
              {w.age}
            </li>
            <li>
              <span aria-hidden="true">◷</span>
              {w.duration}
            </li>
          </ul>
        </div>
      </section>
      <div className="landing-workspace">
        <nav className="landing-nav" aria-label={w.navigation}>
          <span className="landing-nav-caption">EUROPA RAIL CLUB</span>
          {(["online", "rules", "about", "local"] as const).map((id, i) => (
            <button
              key={id}
              aria-current={section === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <span aria-hidden="true">{["↗", "☷", "◇", "⌂"][i]}</span>
              {w[id]}
              <span className="nav-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
          <small>{w.footer}</small>
        </nav>
        <div
          ref={content}
          className="landing-content"
          tabIndex={0}
          role="region"
          aria-label={w[section]}
        >
          {(section === "online" || section === "local") && children}
          {section === "rules" && (
            <section className="landing-rules">
              <span className="landing-eyebrow">01 / EUROPA RAIL CLUB</span>
              <h2>{w.rules}</h2>
              <p>{w.rulesIntro}</p>
              <div className="rule-languages" aria-label="PDF language">
                {(["zh", "fr", "en"] as const).map((l) => (
                  <button
                    key={l}
                    aria-pressed={rulesLang === l}
                    onClick={() => setRulesLang(l)}
                  >
                    {{ zh: "中文", fr: "Français", en: "English" }[l]}
                  </button>
                ))}
              </div>
              <a
                className="rule-open"
                href={rulebooks[rulesLang]}
                target="_blank"
                rel="noreferrer"
              >
                {w.openRules} ↗
              </a>
              <p className="pdf-hint">{w.pdfHint}</p>
              <iframe
                key={rulesLang}
                title={`${w.rules} · ${rulesLang}`}
                src={rulebooks[rulesLang]}
                loading="lazy"
              />
            </section>
          )}
          {section === "about" && (
            <section className="landing-about">
              <span className="landing-eyebrow">02 / EUROPA RAIL CLUB</span>
              <h2>{w.aboutTitle}</h2>
              <p className="landing-lead">{w.aboutIntro}</p>
              <div className="about-steps">
                {w.steps.map((step, i) => (
                  <article key={i}>
                    <span>0{i + 1}</span>
                    <h3>{step}</h3>
                    <p>{w.descriptions[i]}</p>
                  </article>
                ))}
              </div>
              <div className="about-together">
                <h3>{w.together}</h3>
                <p>{w.togetherText}</p>
                <button className="primary" onClick={() => navigate("online")}>
                  {w.online} ↗
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
