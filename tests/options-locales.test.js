import { equal } from "node:assert/strict";
import "../options-locales.js";

const { createOptionsI18n } = globalThis.GbfArtifactOptionsI18n;

Deno.test("英語UIの固定文言と動的な件数を翻訳する", () => {
  const ui = createOptionsI18n("en-US");

  equal(ui.locale, "en");
  equal(ui.translateText("採点ルール"), "Scoring Rules");
  equal(ui.translateText("20件"), "20 items");
  equal(ui.translateText("3 / 10件"), "3 / 10 items");
  equal(
    ui.translateText("ゲーム画面で2番目を選択中です。"),
    "Item 2 is selected in the game.",
  );
  equal(ui.translateText("Q2以上"), "Q2 or higher");
  equal(ui.translateText("Q4以下"), "Q4 or lower");
});

Deno.test("日本語UIでは元の文言を維持する", () => {
  const ui = createOptionsI18n("ja-JP");

  equal(ui.locale, "ja");
  equal(ui.translateText("採点ルール"), "採点ルール");
  equal(ui.translateText("20件"), "20件");
});
