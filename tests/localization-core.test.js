import { deepStrictEqual, equal, ok } from "node:assert/strict";
import effectsMaster from "../effects-master.json" with { type: "json" };
import "../core/localization-core.js";
import "../core/score-config-core.js";
import "../core/artifact-score-core.js";

const {
  canonicalizeConfig,
  createMasterLocalization,
  localizeConfig,
} = globalThis.GbfArtifactLocalizationCore;
const { calculateArtifactScoreDetails, createActiveScoreConfig } =
  globalThis.GbfArtifactScoreCore;

Deno.test("英語効果名をゲーム応答の末尾空白を除いて解決する", () => {
  const localization = createMasterLocalization(effectsMaster, "en-US");

  equal(localization.locale, "en");
  equal(localization.effects.length, effectsMaster.effects.length);
  equal(localization.effectByGameName.get("ATK").name, "攻撃力");
  equal(
    localization.effectByGameName.get("Amplify DMG at 100% HP by").name,
    "HPが100%の時、与ダメージUP",
  );
  equal(
    localization.effectByGameName.get(
      "C.A. DMG cap boost for a 20%/80% hit to N.A./skill DMG cap:",
    ).name,
    "奥義ダメージ上限UP/通常攻撃ダメージ上限-20％/アビリティダメージ上限-80％",
  );
});

Deno.test("JSON内でエスケープされたスラッシュを通常の効果名として解決する", () => {
  const localization = createMasterLocalization(effectsMaster, "en");
  const response = JSON.parse(
    '{"name":"Boost item drop rate (Even when a sub ally \\/ Max 1 of this skill per party) by "}',
  );

  equal(
    response.name,
    "Boost item drop rate (Even when a sub ally / Max 1 of this skill per party) by ",
  );
  equal(
    localization.effectByGameName.get(response.name.trim()).name,
    "アイテムドロップ率UP(重複不可)　◆サブメンバーにいる場合でも発動",
  );
});

Deno.test("英語ゲーム応答を既存の日本語設定で採点する", () => {
  const localization = createMasterLocalization(effectsMaster, "en");
  const scoreConfig = createActiveScoreConfig({
    unmatchedScore: 0,
    rules: [{ effect: "攻撃力", quality: 4, score: 7 }],
  }, {
    attributes: effectsMaster.attributes,
    weaponTypes: effectsMaster.weaponTypes,
  });

  const result = calculateArtifactScoreDetails(
    {
      skill1_info: {
        name: "ATK",
        skill_quality: 4,
      },
    },
    scoreConfig,
    {},
    localization.effectByGameName,
  );

  equal(result.total, 7);
  equal(result.skills[0].name, "攻撃力");
  equal(result.skills[0].shortName, "ATK");
});

Deno.test("Chromeとゲームの表示言語が異なっても英語効果名を解決する", () => {
  const localization = createMasterLocalization(effectsMaster, "ja");

  equal(localization.effectByGameName.get("ATK").name, "攻撃力");
  equal(localization.effectByGameName.get("ATK").displayName, "攻撃力");
});

Deno.test("英語環境では設定JSONの効果名と対象範囲を英語へ変換する", () => {
  const localization = createMasterLocalization(effectsMaster, "en");
  const localized = localizeConfig({
    unmatchedScore: 0,
    rules: [{
      effect: "攻撃力",
      attributes: ["火", "水"],
      weaponTypes: ["剣", "刀"],
      score: 5,
    }],
    combinationRules: [{
      effects: [{ effect: "HP" }, { effect: "奥義ダメージ", quality: 3 }],
      attributes: ["闇"],
      score: 2,
    }],
  }, localization);

  deepStrictEqual(localized.rules[0], {
    effect: "ATK",
    attributes: ["Fire", "Water"],
    weaponTypes: ["Sabre", "Katana"],
    score: 5,
  });
  deepStrictEqual(localized.combinationRules[0], {
    effects: [{ effect: "HP" }, { effect: "C.A. DMG", quality: 3 }],
    attributes: ["Dark"],
    score: 2,
  });
});

Deno.test("日本語と英語が混在する設定JSONを内部名へ変換する", () => {
  const localization = createMasterLocalization(effectsMaster, "ja");
  const canonical = canonicalizeConfig({
    unmatchedScore: 0,
    rules: [
      {
        effect: "ATK",
        attributes: ["Fire"],
        weaponTypes: ["Sabre"],
        score: 5,
      },
      { effect: "HP", attributes: ["水"], weaponTypes: ["杖"], score: 2 },
    ],
    combinationRules: [{
      effects: [{ effect: "Skill DMG" }, { effect: "弱体成功率" }],
      weaponTypes: ["Gun"],
      score: 3,
    }],
  }, localization);

  deepStrictEqual(canonical.rules[0], {
    effect: "攻撃力",
    attributes: ["火"],
    weaponTypes: ["剣"],
    score: 5,
  });
  deepStrictEqual(canonical.rules[1], {
    effect: "HP",
    attributes: ["水"],
    weaponTypes: ["杖"],
    score: 2,
  });
  deepStrictEqual(canonical.combinationRules[0], {
    effects: [{ effect: "アビリティダメージ" }, { effect: "弱体成功率" }],
    weaponTypes: ["銃"],
    score: 3,
  });
  ok(canonical !== localization);
});
