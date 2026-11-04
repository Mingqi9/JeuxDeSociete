import { describe, it, expect } from "vitest";
import { dictionaries } from "../src/ui/i18n";
import { onlineWords } from "../src/ui/onlineWords";
import { chineseCityNames, cityName } from "../src/ui/cityNames";
import { europe } from "../src/data/europe";

describe("language coverage", () => {
  for (const lang of ["zh", "fr", "en"] as const) {
    it(`${lang} covers every interface and error key`, () => {
      expect(Object.keys(dictionaries[lang]).sort()).toEqual(
        Object.keys(dictionaries.zh).sort(),
      );
      expect(Object.keys(dictionaries[lang].errors).sort()).toEqual(
        Object.keys(dictionaries.zh.errors).sort(),
      );
      expect(Object.keys(onlineWords[lang]).sort()).toEqual(
        Object.keys(onlineWords.zh).sort(),
      );
      expect(Object.keys(onlineWords[lang].errors).sort()).toEqual(
        Object.keys(onlineWords.zh.errors).sort(),
      );
    });
  }
  it("translates all 47 map cities without changing canonical identifiers", () => {
    expect(Object.keys(chineseCityNames).sort()).toEqual(
      Object.keys(europe.cities).sort(),
    );
    for (const city of Object.keys(europe.cities)) {
      expect(cityName(city, dictionaries.zh)).not.toBe(city);
      expect(cityName(city, dictionaries.en)).toBe(city);
      expect(cityName(city, dictionaries.fr)).toBe(city);
    }
    expect(cityName("Unknown", dictionaries.zh)).toBe("Unknown");
  });
});
