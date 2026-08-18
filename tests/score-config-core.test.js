import { deepStrictEqual, equal, match, throws } from "node:assert/strict";
import "../core/score-config-core.js";

const {
  compareQuality,
  compareQualityCondition,
  compareRulePriority,
  compareScope,
  createCombinationRule,
  createEmptyUserConfig,
  createRule,
  getCombinationRuleKey,
  getQualityConditionKey,
  getRuleKey,
  normalizeQuality,
  normalizeRuleScope,
  normalizeScoreHighlight,
  resolveUserConfig,
  validateUserConfig,
} = globalThis.GbfArtifactScoreConfigCore;

const ATTRIBUTES = ["火", "水", "土", "風", "光", "闇"];
const WEAPON_TYPES = ["剣", "短剣", "槍", "斧", "杖"];
const EFFECTS = [
  { name: "攻撃力", qualities: [1, 2, 3, 4, 5] },
  { name: "ディスペルガード", qualities: [1] },
];
const VALIDATION_CONTEXT = {
  effectByName: new Map(EFFECTS.map((effect) => [effect.name, effect])),
  attributes: ATTRIBUTES,
  weaponTypes: WEAPON_TYPES,
};

function validate(value, options = {}) {
  return validateUserConfig(value, {
    ...VALIDATION_CONTEXT,
    ...options,
  });
}

function assertValidationError(value, expectedMessage) {
  throws(
    () => validate(value),
    (error) => {
      match(error.message, expectedMessage);
      return true;
    },
  );
}

Deno.test("設定JSONを正規化し、未指定の条件フィールドを省略する", () => {
  const config = validate({
    unmatchedScore: "-2",
    favoriteBonus: "4",
    hideGameScore: true,
    showScoreTooltip: true,
    rules: [
      {
        effect: "攻撃力",
        quality: "3",
        attributes: ["水", "火", "火"],
        weaponTypes: [],
        comment: "  火属性向け  ",
        score: "5",
      },
      {
        effect: "ディスペルガード",
        quality: "1",
        attributes: ATTRIBUTES,
        weaponTypes: WEAPON_TYPES,
        comment: "   ",
        score: -3,
      },
    ],
    combinationRules: [
      {
        effects: [
          { effect: "攻撃力", quality: "3" },
          { effect: "ディスペルガード", quality: 1 },
        ],
        attributes: ["水", "火", "火"],
        weaponTypes: [],
        comment: "  攻防セット  ",
        score: "4",
      },
    ],
  });

  deepStrictEqual(config, {
    unmatchedScore: -2,
    favoriteBonus: 4,
    rules: [
      {
        effect: "攻撃力",
        comment: "火属性向け",
        quality: 3,
        attributes: ["火", "水"],
        score: 5,
      },
      {
        effect: "ディスペルガード",
        score: -3,
      },
    ],
    combinationRules: [
      {
        effects: [
          { effect: "攻撃力", quality: 3 },
          { effect: "ディスペルガード" },
        ],
        attributes: ["火", "水"],
        comment: "攻防セット",
        score: 4,
      },
    ],
  });
});

Deno.test("クオリティの以上・以下条件を検証して保持する", () => {
  const config = validate({
    unmatchedScore: 0,
    rules: [
      { effect: "攻撃力", qualityMin: 2, score: 2 },
      { effect: "攻撃力", qualityMax: 4, score: 3 },
    ],
  });

  deepStrictEqual(config.rules, [
    { effect: "攻撃力", qualityMin: 2, score: 2 },
    { effect: "攻撃力", qualityMax: 4, score: 3 },
  ]);
});

Deno.test("重複・無効・固定クオリティの範囲条件を拒否する", () => {
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", quality: 3, qualityMin: 2, score: 1 }],
    },
    /クオリティ条件を複数指定できません/,
  );
  for (
    const rule of [
      { effect: "攻撃力", qualityMin: 1, score: 1 },
      { effect: "攻撃力", qualityMin: 5, score: 1 },
      { effect: "攻撃力", qualityMax: 1, score: 1 },
      { effect: "攻撃力", qualityMax: 5, score: 1 },
    ]
  ) {
    assertValidationError(
      { unmatchedScore: 0, rules: [rule] },
      /単一指定または全てと重複しています/,
    );
  }
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "ディスペルガード", qualityMin: 1, score: 1 }],
    },
    /固定クオリティには範囲を指定できません/,
  );
});

Deno.test("旧ゲーム画面設定を除外し、一覧プレビュー設定を保持する", () => {
  deepStrictEqual(
    validate({
      unmatchedScore: 0,
      hideGameScore: true,
      showScoreTooltip: true,
      rules: [],
    }),
    { unmatchedScore: 0, rules: [] },
  );

  deepStrictEqual(
    validate({
      unmatchedScore: 0,
      scoreHighlight: { highThreshold: "10", lowThreshold: "-2" },
      rules: [],
    }),
    {
      unmatchedScore: 0,
      rules: [],
      scoreHighlight: { highThreshold: 10, lowThreshold: -2 },
    },
  );
  deepStrictEqual(
    normalizeScoreHighlight({ highThreshold: 5, lowThreshold: 0 }),
    { highThreshold: 5, lowThreshold: 0 },
  );
  equal(normalizeScoreHighlight(undefined), undefined);
  assertValidationError(
    {
      unmatchedScore: 0,
      scoreHighlight: { highThreshold: 1, lowThreshold: 1 },
      rules: [],
    },
    /scoreHighlightにはlowThresholdより大きいhighThreshold/,
  );
  assertValidationError(
    { unmatchedScore: 0, scoreHighlight: [], rules: [] },
    /scoreHighlightにはlowThresholdより大きいhighThreshold/,
  );
  assertValidationError(
    { unmatchedScore: 0, favoriteBonus: "不正", rules: [] },
    /favoriteBonusが数値ではありません/,
  );
});

Deno.test("0点ルールは通常拒否し、保存済み設定の移行時だけ除外できる", () => {
  const value = {
    unmatchedScore: 0,
    rules: [
      { effect: "攻撃力", score: 0 },
      { effect: "ディスペルガード", score: -1 },
    ],
    combinationRules: [
      {
        effects: [{ effect: "攻撃力" }, { effect: "ディスペルガード" }],
        score: 0,
      },
    ],
  };

  assertValidationError(value, /1件目のスコアには0を指定できません/);
  deepStrictEqual(validate(value, { omitZeroScores: true }), {
    unmatchedScore: 0,
    rules: [{ effect: "ディスペルガード", score: -1 }],
  });
});

Deno.test("保存設定を検証し、不正な場合は標準設定へ戻す", () => {
  const defaultValue = {
    unmatchedScore: 0,
    rules: [{ effect: "攻撃力", score: 1 }],
  };
  const initial = resolveUserConfig(
    undefined,
    defaultValue,
    VALIDATION_CONTEXT,
  );
  deepStrictEqual(initial.config, defaultValue);
  equal(initial.source, "default");
  equal(initial.recoveryError, undefined);

  const stored = resolveUserConfig(
    {
      unmatchedScore: -1,
      rules: [
        { effect: "攻撃力", score: 0 },
        { effect: "ディスペルガード", quality: 1, score: 3 },
      ],
    },
    defaultValue,
    VALIDATION_CONTEXT,
  );
  deepStrictEqual(stored.config, {
    unmatchedScore: -1,
    rules: [{ effect: "ディスペルガード", score: 3 }],
  });
  equal(stored.source, "stored");
  equal(stored.removedZeroScoreCount, 1);
  equal(stored.recoveryError, undefined);

  const recovered = resolveUserConfig(
    { unmatchedScore: 0, rules: "不正" },
    defaultValue,
    VALIDATION_CONTEXT,
  );
  deepStrictEqual(recovered.config, defaultValue);
  deepStrictEqual(recovered.defaultConfig, defaultValue);
  equal(recovered.source, "default");
  equal(recovered.recoveryError instanceof Error, true);
  equal(recovered.config === recovered.defaultConfig, false);
});

Deno.test("設定全体と必須フィールドの型を検証する", () => {
  assertValidationError(null, /設定全体がオブジェクトではありません/);
  assertValidationError(
    { unmatchedScore: "不正", rules: [] },
    /unmatchedScoreが数値ではありません/,
  );
  assertValidationError(
    { unmatchedScore: 0, rules: {} },
    /rulesが配列ではありません/,
  );
  assertValidationError(
    { unmatchedScore: 0, rules: [], combinationRules: {} },
    /combinationRulesが配列ではありません/,
  );
});

Deno.test("組み合わせボーナスの効果・クオリティ・スコアを検証する", () => {
  const base = { unmatchedScore: 0, rules: [] };
  assertValidationError(
    { ...base, combinationRules: [{ effects: [], score: 1 }] },
    /効果を2つ指定してください/,
  );
  assertValidationError(
    {
      ...base,
      combinationRules: [{
        effects: [{ effect: "攻撃力" }, { effect: "攻撃力" }],
        score: 1,
      }],
    },
    /異なる効果を指定してください/,
  );
  assertValidationError(
    {
      ...base,
      combinationRules: [{
        effects: [{ effect: "攻撃力" }, { effect: "未知" }],
        score: 1,
      }],
    },
    /効果2がマスタにありません/,
  );
  assertValidationError(
    {
      ...base,
      combinationRules: [{
        effects: [
          { effect: "攻撃力" },
          { effect: "ディスペルガード", quality: 2 },
        ],
        score: 1,
      }],
    },
    /効果2のクオリティが不正です/,
  );
  assertValidationError(
    {
      ...base,
      combinationRules: [{
        effects: [{ effect: "攻撃力" }, { effect: "ディスペルガード" }],
        score: "不正",
      }],
    },
    /スコアが数値ではありません/,
  );
  assertValidationError(
    {
      ...base,
      combinationRules: [{
        effects: [{ effect: "攻撃力" }, { effect: "ディスペルガード" }],
        score: 0,
      }],
    },
    /スコアには0を指定できません/,
  );
});

Deno.test("効果の順序が違っても同じ組み合わせ条件の重複を拒否する", () => {
  assertValidationError({
    unmatchedScore: 0,
    rules: [],
    combinationRules: [
      {
        effects: [
          { effect: "攻撃力", quality: 3 },
          { effect: "ディスペルガード" },
        ],
        attributes: ["火"],
        score: 1,
      },
      {
        effects: [
          { effect: "ディスペルガード" },
          { effect: "攻撃力", quality: 3 },
        ],
        attributes: ["火"],
        score: 2,
      },
    ],
  }, /2件目の組み合わせボーナス条件が重複しています/);
});

Deno.test("効果名・スコア・クオリティを検証する", () => {
  assertValidationError(
    { unmatchedScore: 0, rules: [{ effect: "未知", score: 1 }] },
    /1件目の効果名がマスタにありません/,
  );
  assertValidationError(
    { unmatchedScore: 0, rules: [{ effect: "攻撃力", score: "不正" }] },
    /1件目のスコアが数値ではありません/,
  );
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "ディスペルガード", quality: 2, score: 1 }],
    },
    /1件目のクオリティが不正です/,
  );
});

Deno.test("属性・武器種の型と値を検証する", () => {
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", attributes: "火", score: 1 }],
    },
    /1件目の属性が配列ではありません/,
  );
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", weaponTypes: ["大剣"], score: 1 }],
    },
    /1件目の武器種「大剣」が不正です/,
  );
});

Deno.test("コメントを1行500文字以内に制限する", () => {
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", comment: 123, score: 1 }],
    },
    /1件目のコメントが文字列ではありません/,
  );
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", comment: "1行目\n2行目", score: 1 }],
    },
    /1件目のコメントには改行を使用できません/,
  );
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [{ effect: "攻撃力", comment: "あ".repeat(501), score: 1 }],
    },
    /1件目のコメントが500文字を超えています/,
  );
});

Deno.test("コメントや条件配列の順序が違っても同じ条件の重複を拒否する", () => {
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [
        {
          effect: "攻撃力",
          quality: 3,
          attributes: ["火", "水"],
          comment: "1つ目",
          score: 1,
        },
        {
          effect: "攻撃力",
          quality: 3,
          attributes: ["水", "火"],
          comment: "2つ目",
          score: 2,
        },
      ],
    },
    /2件目のルール条件が重複しています/,
  );
});

Deno.test("全選択と条件省略を同じルールとして重複判定する", () => {
  assertValidationError(
    {
      unmatchedScore: 0,
      rules: [
        { effect: "攻撃力", attributes: ATTRIBUTES, score: 1 },
        { effect: "攻撃力", score: 2 },
      ],
    },
    /2件目のルール条件が重複しています/,
  );
});

Deno.test("設定画面用のルール生成と比較関数を検証する", () => {
  deepStrictEqual(createEmptyUserConfig(), { unmatchedScore: 0, rules: [] });

  const rule = createRule(
    "攻撃力",
    3,
    ["火"],
    ["剣"],
    5,
    "火剣向け",
  );
  deepStrictEqual(rule, {
    effect: "攻撃力",
    comment: "火剣向け",
    quality: 3,
    attributes: ["火"],
    weaponTypes: ["剣"],
    score: 5,
  });
  equal(
    getRuleKey(rule),
    getRuleKey({ ...rule, comment: "別コメント", score: -1 }),
  );

  const combination = createCombinationRule(
    [{ effect: "攻撃力", quality: 3 }, { effect: "ディスペルガード" }],
    ["火"],
    ["剣"],
    -2,
    "組み合わせ",
  );
  deepStrictEqual(combination, {
    effects: [
      { effect: "攻撃力", quality: 3 },
      { effect: "ディスペルガード" },
    ],
    comment: "組み合わせ",
    attributes: ["火"],
    weaponTypes: ["剣"],
    score: -2,
  });
  equal(
    getCombinationRuleKey(combination),
    getCombinationRuleKey({
      ...combination,
      effects: [...combination.effects].reverse(),
    }),
  );

  equal(compareQuality(undefined, undefined), 0);
  equal(compareQuality(undefined, 1), -1);
  equal(compareQuality(1, undefined), 1);
  equal(compareQuality(2, 3), -1);
  equal(
    compareQualityCondition(
      { effect: "攻撃力", qualityMin: 2 },
      { effect: "攻撃力", qualityMax: 4 },
    ) !== 0,
    true,
  );
  equal(getQualityConditionKey({ quality: 3 }), "exact:3");
  equal(getQualityConditionKey({ qualityMin: 2 }), "min:2");
  equal(getQualityConditionKey({ qualityMax: 4 }), "max:4");
  equal(getQualityConditionKey({}), "all");
  equal(compareScope(["火"], ["火"]), 0);
  equal(compareScope(["火"], ["水"]) !== 0, true);
});

Deno.test("採点用のクオリティと適用範囲を正規化する", () => {
  equal(normalizeQuality("Q5"), 5);
  equal(normalizeQuality(3), 3);
  equal(normalizeQuality("なし"), undefined);
  deepStrictEqual(
    normalizeRuleScope(["水", "火", "不明"], ATTRIBUTES),
    ["火", "水"],
  );
  equal(normalizeRuleScope(ATTRIBUTES, ATTRIBUTES), undefined);
  equal(normalizeRuleScope([], ATTRIBUTES), undefined);
  equal(normalizeRuleScope("火", ATTRIBUTES), undefined);
});

Deno.test("指定項目数が多く、対象範囲が狭いルールを優先する", () => {
  const fixedRule = {
    effect: "攻撃力",
    quality: 3,
    attributes: ["火"],
    weaponTypes: ["剣"],
    score: 4,
  };
  const attributeRule = {
    effect: "攻撃力",
    quality: 3,
    attributes: ["火"],
    score: 3,
  };
  const qualityRule = { effect: "攻撃力", quality: 3, score: 2 };
  const defaultRule = { effect: "攻撃力", score: 1 };

  equal(compareRulePriority(fixedRule, attributeRule) > 0, true);
  equal(compareRulePriority(attributeRule, qualityRule) > 0, true);
  equal(compareRulePriority(qualityRule, defaultRule) > 0, true);
  equal(
    compareRulePriority(
      { effect: "攻撃力", attributes: ["火"], score: 1 },
      qualityRule,
    ),
    0,
  );
  equal(
    compareRulePriority(
      { effect: "攻撃力", attributes: ["火", "水"], score: 1 },
      qualityRule,
    ) < 0,
    true,
  );
  equal(compareRulePriority(defaultRule, { ...defaultRule, score: 9 }), 0);
});

Deno.test("単一クオリティと狭いクオリティ範囲を優先する", () => {
  const exact = { effect: "攻撃力", quality: 4, score: 4 };
  const narrowRange = { effect: "攻撃力", qualityMin: 4, score: 3 };
  const wideRange = { effect: "攻撃力", qualityMin: 2, score: 2 };
  const all = { effect: "攻撃力", score: 1 };

  equal(compareRulePriority(exact, narrowRange) > 0, true);
  equal(compareRulePriority(narrowRange, wideRange) > 0, true);
  equal(compareRulePriority(wideRange, all) > 0, true);
  equal(
    compareRulePriority(
      { effect: "攻撃力", qualityMin: 2 },
      { effect: "攻撃力", qualityMax: 4 },
    ),
    0,
  );
});
