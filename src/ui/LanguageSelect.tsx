import type { Lang } from "./i18n";
export function LanguageSelect({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <select
      className="language"
      aria-label="语言 / Langue / Language"
      value={lang}
      onChange={(e) => onChange(e.target.value as Lang)}
    >
      <option value="zh">中文</option>
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  );
}
