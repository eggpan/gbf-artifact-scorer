import { deepStrictEqual, equal, notStrictEqual } from "node:assert/strict";
import "../core/score-config-core.js";
import "../core/score-config-editor-core.js";

const {
  createCombinationRule,
  createRule,
  getCombinationRuleKey,
  getRuleKey,
} = globalThis.GbfArtifactScoreConfigCore;
const {
  clearScoreRules,
  copyCombinationRule,
  copyRule,
  deleteCombinationRule,
  deleteRule,
  formatCombinationSummary,
  formatEffectRequirement,
  formatRuleSummary,
  matchesRuleSearch,
  restoreDefaultScoreSettings,
  sortConfig,
  updateCombinationRuleScore,
  updateRuleScore,
  upsertCombinationRule,
  upsertRule,
} = globalThis.GbfArtifactScoreConfigEditorCore;

const EFFECT_BY_NAME = new Map([
  ["攻撃力", { name: "攻撃力", skillGroup: 1, index: 0 }],
  ["HP", { name: "HP", skillGroup: 1, index: 1 }],
  ["奥義ダメージ上限", {
    name: "奥義ダメージ上限",
    skillGroup: 2,
    index: 2,
  }],
]);

function rule(effect, score, options = {}) {
  return createRule(
    effect,
    options.quality,
    options.attributes,
    options.weaponTypes,
    score,
    options.comment,
    options,
  );
}

function combination(effect1, effect2, score, options = {}) {
  return createCombinationRule(
    [
      {
        effect: effect1,
        ...(options.quality1 && { quality: options.quality1 }),
      },
      {
        effect: effect2,
        ...(options.quality2 && { quality: options.quality2 }),
      },
    ],
    options.attributes,
    options.weaponTypes,
    score,
    options.comment,
  );
}

Deno.test("採点ルールを追加し、表示順に並べる", () => {
  const original = {
    unmatchedScore: 0,
    rules: [rule("奥義ダメージ上限", 3)],
  };
  const result = upsertRule(
    original,
    rule("攻撃力", 5),
    null,
    EFFECT_BY_NAME,
  );

  equal(result.status, "added");
  deepStrictEqual(result.config.rules.map(({ effect }) => effect), [
    "攻撃力",
    "奥義ダメージ上限",
  ]);
  equal(original.rules.length, 1);
});

Deno.test("追加時は同じ条件の採点ルールを上書きする", () => {
  const existing = rule("攻撃力", 1, { comment: "古い設定" });
  const replacement = rule("攻撃力", 8, { comment: "新しい設定" });
  const result = upsertRule(
    { unmatchedScore: 0, rules: [existing] },
    replacement,
    null,
    EFFECT_BY_NAME,
  );

  equal(result.status, "overwritten");
  deepStrictEqual(result.config.rules, [replacement]);
});

Deno.test("コピーした採点ルールは条件変更時だけ追加する", () => {
  const source = rule("攻撃力", 1);
  const config = { unmatchedScore: 0, rules: [source] };
  const copied = rule("攻撃力", 1, { attributes: ["火"] });

  const result = copyRule(
    config,
    copied,
    getRuleKey(source),
    EFFECT_BY_NAME,
  );
  equal(result.status, "copied");
  deepStrictEqual(result.config.rules, [copied, source]);
  equal(config.rules.length, 1);

  for (
    const rejected of [
      copyRule(config, source, getRuleKey(source), EFFECT_BY_NAME),
      copyRule(config, copied, "missing", EFFECT_BY_NAME),
    ]
  ) {
    equal(rejected.config, config);
    equal(["conflict", "missing"].includes(rejected.status), true);
  }
});

Deno.test("編集中の採点ルールは安定キーで更新する", () => {
  const editing = rule("HP", 2);
  const config = {
    unmatchedScore: 0,
    rules: [rule("攻撃力", 1), editing],
  };
  const replacement = rule("HP", 9, { attributes: ["火"] });
  const result = upsertRule(
    config,
    replacement,
    getRuleKey(editing),
    EFFECT_BY_NAME,
  );

  equal(result.status, "updated");
  deepStrictEqual(
    result.config.rules.find(({ effect }) => effect === "HP"),
    replacement,
  );
});

Deno.test("編集後の条件が既存ルールと重なる場合は更新しない", () => {
  const existing = rule("攻撃力", 1);
  const editing = rule("攻撃力", 4, { attributes: ["火"] });
  const config = { unmatchedScore: 0, rules: [existing, editing] };
  const result = upsertRule(
    config,
    rule("攻撃力", 7),
    getRuleKey(editing),
    EFFECT_BY_NAME,
  );

  equal(result.status, "conflict");
  equal(result.config, config);
});

Deno.test("存在しない編集キーは採点ルールを変更しない", () => {
  const config = { unmatchedScore: 0, rules: [rule("攻撃力", 1)] };
  const result = upsertRule(
    config,
    rule("HP", 2),
    "missing",
    EFFECT_BY_NAME,
  );

  equal(result.status, "missing");
  equal(result.config, config);
});

Deno.test("存在しない操作対象では設定を変更しない", () => {
  const config = { unmatchedScore: 0, rules: [rule("攻撃力", 1)] };

  for (
    const result of [
      deleteRule(config, "missing", EFFECT_BY_NAME),
      updateRuleScore(config, "missing", 3, EFFECT_BY_NAME),
      upsertCombinationRule(
        config,
        combination("攻撃力", "HP", 2),
        "missing",
        EFFECT_BY_NAME,
      ),
      deleteCombinationRule(config, "missing", EFFECT_BY_NAME),
      updateCombinationRuleScore(config, "missing", 3, EFFECT_BY_NAME),
    ]
  ) {
    equal(result.status, "missing");
    equal(result.config, config);
  }
});

Deno.test("採点ルールをキーで削除し、スコアを変更する", () => {
  const target = rule("HP", 2);
  const config = {
    unmatchedScore: 0,
    rules: [rule("攻撃力", 1), target],
  };
  const updated = updateRuleScore(
    config,
    getRuleKey(target),
    -5,
    EFFECT_BY_NAME,
  );
  equal(updated.status, "updated");
  equal(updated.config.rules.find(({ effect }) => effect === "HP").score, -5);
  equal(target.score, 2);

  const deleted = deleteRule(
    updated.config,
    getRuleKey(target),
    EFFECT_BY_NAME,
  );
  equal(deleted.status, "deleted");
  deepStrictEqual(deleted.config.rules.map(({ effect }) => effect), ["攻撃力"]);
});

Deno.test("採点ルールを限定条件が優先される順に並べる", () => {
  const all = rule("攻撃力", 1);
  const quality = rule("攻撃力", 2, { quality: 3 });
  const scoped = rule("攻撃力", 3, { attributes: ["火"] });
  const config = sortConfig(
    { unmatchedScore: 0, rules: [all, quality, scoped] },
    EFFECT_BY_NAME,
  );

  deepStrictEqual(config.rules, [scoped, quality, all]);
});

Deno.test("クオリティの単一指定と範囲を限定順に並べる", () => {
  const all = rule("攻撃力", 1);
  const wide = rule("攻撃力", 2, { qualityMin: 2 });
  const narrow = rule("攻撃力", 3, { qualityMin: 4 });
  const exact = rule("攻撃力", 4, { quality: 4 });
  const config = sortConfig(
    { unmatchedScore: 0, rules: [all, wide, exact, narrow] },
    EFFECT_BY_NAME,
  );

  deepStrictEqual(config.rules, [exact, narrow, wide, all]);
});

Deno.test("同じ限定度の採点ルールを条件値の順に並べる", () => {
  const sword = rule("攻撃力", 1, {
    attributes: ["火"],
    weaponTypes: ["剣"],
  });
  const axe = rule("攻撃力", 2, {
    attributes: ["火"],
    weaponTypes: ["斧"],
  });
  const config = sortConfig(
    { unmatchedScore: 0, rules: [sword, axe] },
    EFFECT_BY_NAME,
  );

  deepStrictEqual(config.rules, [sword, axe]);
});

Deno.test("効果・条件・コメント・グループで採点ルールを検索する", () => {
  const target = rule("攻撃力", 5, {
    quality: 3,
    attributes: ["火"],
    weaponTypes: ["剣"],
    comment: "クリュサオル用",
  });

  for (const query of ["攻撃", "q3", "火", "剣", "クリュ", "グループⅠ"]) {
    equal(matchesRuleSearch(target, query, EFFECT_BY_NAME), true);
  }
  equal(matchesRuleSearch(target, "HP", EFFECT_BY_NAME), false);
  equal(matchesRuleSearch(target, "", EFFECT_BY_NAME), true);
  equal(
    matchesRuleSearch(
      rule("攻撃力", 2, { qualityMin: 2 }),
      "q2以上",
      EFFECT_BY_NAME,
    ),
    true,
  );
});

Deno.test("組み合わせボーナスを追加、上書き、編集する", () => {
  const existing = combination("攻撃力", "HP", 2);
  const config = { unmatchedScore: 0, rules: [] };
  const added = upsertCombinationRule(
    config,
    existing,
    null,
    EFFECT_BY_NAME,
  );
  equal(added.status, "added");
  equal(config.combinationRules, undefined);

  const replacement = combination("HP", "攻撃力", 5, {
    comment: "上書き",
  });
  const overwritten = upsertCombinationRule(
    added.config,
    replacement,
    null,
    EFFECT_BY_NAME,
  );
  equal(overwritten.status, "overwritten");
  deepStrictEqual(overwritten.config.combinationRules, [replacement]);

  const changed = combination("HP", "奥義ダメージ上限", 8);
  const updated = upsertCombinationRule(
    overwritten.config,
    changed,
    getCombinationRuleKey(replacement),
    EFFECT_BY_NAME,
  );
  equal(updated.status, "updated");
  deepStrictEqual(updated.config.combinationRules, [changed]);
});

Deno.test("コピーした組み合わせボーナスは条件変更時だけ追加する", () => {
  const source = combination("攻撃力", "HP", 2);
  const config = {
    unmatchedScore: 0,
    rules: [],
    combinationRules: [source],
  };
  const copied = combination("攻撃力", "HP", 2, { attributes: ["火"] });

  const result = copyCombinationRule(
    config,
    copied,
    getCombinationRuleKey(source),
    EFFECT_BY_NAME,
  );
  equal(result.status, "copied");
  deepStrictEqual(result.config.combinationRules, [source, copied]);
  equal(config.combinationRules.length, 1);

  for (
    const rejected of [
      copyCombinationRule(
        config,
        source,
        getCombinationRuleKey(source),
        EFFECT_BY_NAME,
      ),
      copyCombinationRule(config, copied, "missing", EFFECT_BY_NAME),
    ]
  ) {
    equal(rejected.config, config);
    equal(["conflict", "missing"].includes(rejected.status), true);
  }
});

Deno.test("組み合わせボーナス編集時の条件衝突を拒否する", () => {
  const existing = combination("攻撃力", "HP", 2);
  const editing = combination("HP", "奥義ダメージ上限", 4);
  const config = {
    unmatchedScore: 0,
    rules: [],
    combinationRules: [existing, editing],
  };
  const result = upsertCombinationRule(
    config,
    combination("HP", "攻撃力", 7),
    getCombinationRuleKey(editing),
    EFFECT_BY_NAME,
  );

  equal(result.status, "conflict");
  equal(result.config, config);
});

Deno.test("組み合わせボーナスのスコア変更と削除は入力を変更しない", () => {
  const target = combination("攻撃力", "HP", 2);
  const config = {
    unmatchedScore: 0,
    rules: [],
    combinationRules: [target],
  };
  const updated = updateCombinationRuleScore(
    config,
    getCombinationRuleKey(target),
    -4,
    EFFECT_BY_NAME,
  );
  equal(updated.status, "updated");
  equal(updated.config.combinationRules[0].score, -4);
  equal(target.score, 2);

  const deleted = deleteCombinationRule(
    updated.config,
    getCombinationRuleKey(target),
    EFFECT_BY_NAME,
  );
  equal(deleted.status, "deleted");
  equal(deleted.config.combinationRules, undefined);
});

Deno.test("組み合わせボーナスを条件キー順に並べ、1件ずつ削除する", () => {
  const first = combination("攻撃力", "HP", 2);
  const second = combination("HP", "奥義ダメージ上限", 3);
  const sorted = sortConfig(
    {
      unmatchedScore: 0,
      rules: [],
      combinationRules: [first, second],
    },
    EFFECT_BY_NAME,
  );
  deepStrictEqual(sorted.combinationRules, [second, first]);

  const updated = updateCombinationRuleScore(
    sorted,
    getCombinationRuleKey(second),
    9,
    EFFECT_BY_NAME,
  );
  equal(updated.config.combinationRules[0].score, 9);
  equal(updated.config.combinationRules[1].score, 2);

  const deleted = deleteCombinationRule(
    sorted,
    getCombinationRuleKey(second),
    EFFECT_BY_NAME,
  );
  deepStrictEqual(deleted.config.combinationRules, [first]);
});

Deno.test("採点ルール全削除では一覧プレビュー設定だけを保持する", () => {
  const original = {
    unmatchedScore: 9,
    hideGameScore: true,
    showScoreTooltip: true,
    scoreHighlight: { highThreshold: 10, lowThreshold: 0 },
    rules: [rule("攻撃力", 1)],
    combinationRules: [combination("攻撃力", "HP", 2)],
  };
  const cleared = clearScoreRules(original);

  deepStrictEqual(cleared, {
    unmatchedScore: 0,
    rules: [],
    scoreHighlight: { highThreshold: 10, lowThreshold: 0 },
  });
  notStrictEqual(cleared, original);
  notStrictEqual(cleared.scoreHighlight, original.scoreHighlight);
});

Deno.test("標準設定への復元では現在の一覧プレビュー設定を保持する", () => {
  const current = {
    unmatchedScore: -2,
    hideGameScore: true,
    showScoreTooltip: true,
    scoreHighlight: { highThreshold: 8, lowThreshold: -1 },
    rules: [rule("HP", 9)],
  };
  const defaultConfig = {
    unmatchedScore: 0,
    rules: [rule("攻撃力", 1, { attributes: ["火"] })],
    combinationRules: [combination("攻撃力", "HP", 3)],
  };
  const restored = restoreDefaultScoreSettings(current, defaultConfig);

  deepStrictEqual(restored, {
    unmatchedScore: 0,
    rules: [rule("攻撃力", 1, { attributes: ["火"] })],
    combinationRules: [combination("攻撃力", "HP", 3)],
    scoreHighlight: { highThreshold: 8, lowThreshold: -1 },
  });
  notStrictEqual(restored.rules, defaultConfig.rules);
  notStrictEqual(
    restored.rules[0].attributes,
    defaultConfig.rules[0].attributes,
  );
  notStrictEqual(
    restored.combinationRules[0].effects,
    defaultConfig.combinationRules[0].effects,
  );
});

Deno.test("確認ダイアログ用の要約を整形する", () => {
  const single = rule("攻撃力", 10, {
    quality: 5,
    attributes: ["火"],
    weaponTypes: ["剣", "斧"],
  });
  equal(
    formatRuleSummary(single),
    "「攻撃力」（Q5 / 属性 火 / 武器種 剣・斧、スコア 10）",
  );
  equal(formatEffectRequirement({ effect: "HP", quality: 2 }), "HP Q2");

  const bonus = combination("攻撃力", "HP", 3, { attributes: ["水"] });
  equal(
    formatCombinationSummary(bonus),
    "「攻撃力 ＋ HP」（属性 水、加算スコア 3）",
  );
  equal(formatRuleSummary(rule("HP", 1)), "「HP」（指定なし、スコア 1）");
  equal(
    formatRuleSummary(rule("攻撃力", 2, { qualityMin: 2 })),
    "「攻撃力」（Q2以上、スコア 2）",
  );
  equal(
    formatRuleSummary(rule("攻撃力", 3, { qualityMax: 4 })),
    "「攻撃力」（Q4以下、スコア 3）",
  );
  equal(
    formatCombinationSummary(
      combination("攻撃力", "HP", 2, { weaponTypes: ["斧"] }),
    ),
    "「攻撃力 ＋ HP」（武器種 斧、加算スコア 2）",
  );
  equal(
    formatCombinationSummary(combination("攻撃力", "HP", 2)),
    "「攻撃力 ＋ HP」（指定なし、加算スコア 2）",
  );
});
