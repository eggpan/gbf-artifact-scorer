import { deepStrictEqual, equal } from "node:assert/strict";
import "../core/score-config-core.js";
import "../core/artifact-score-core.js";

const {
  calculateArtifactScoreDetails,
  classifyScore,
  createActiveScoreConfig,
  createTooltipLines,
  findMatchingCombinationBonuses,
  findMatchingUserScore,
  getSkillScore,
  normalizeArtifactValue,
} = globalThis.GbfArtifactScoreCore;

const ATTRIBUTES = ["火", "水", "土", "風", "光", "闇"];
const WEAPON_TYPES = ["剣", "短剣", "槍", "斧", "杖"];
const SCORE_CONTEXT = {
  attributes: ATTRIBUTES,
  weaponTypes: WEAPON_TYPES,
};

function createScoreConfig(userConfig) {
  return createActiveScoreConfig(userConfig, SCORE_CONTEXT);
}

Deno.test("ユーザー設定を採点用の形式へ正規化する", () => {
  const config = createScoreConfig({
    unmatchedScore: "-3",
    rules: [
      {
        effect: "攻撃力",
        quality: "Q3",
        attributes: ["水", "火", "不明"],
        weaponTypes: WEAPON_TYPES,
        score: "7",
      },
      { effect: "HP", score: 0 },
      { effect: "", score: 5 },
      { effect: "HP", score: "不正" },
    ],
    combinationRules: [
      {
        effects: [
          { effect: "攻撃力", quality: "Q3" },
          { effect: "HP" },
        ],
        attributes: ["水", "火"],
        weaponTypes: WEAPON_TYPES,
        score: "4",
      },
    ],
  });

  equal(config.unmatchedScore, -3);
  deepStrictEqual(config.userRules, [
    {
      effect: "攻撃力",
      quality: 3,
      attributes: ["火", "水"],
      weaponTypes: undefined,
      score: 7,
    },
  ]);
  deepStrictEqual(config.combinationRules, [
    {
      effects: [
        { effect: "攻撃力", quality: 3 },
        { effect: "HP", quality: undefined },
      ],
      attributes: ["火", "水"],
      weaponTypes: undefined,
      score: 4,
    },
  ]);
});

Deno.test("未指定または不正なunmatchedScoreは0にフォールバックする", () => {
  equal(createScoreConfig(undefined).unmatchedScore, 0);
  equal(
    createScoreConfig({ unmatchedScore: "不正", rules: [] }).unmatchedScore,
    0,
  );
});

Deno.test("採点用設定では不正な採点ルールを無視する", () => {
  const config = createScoreConfig({
    unmatchedScore: 0,
    rules: [
      { effect: "", score: 1 },
      { effect: "攻撃力", score: 0 },
      { effect: "HP", score: "不正" },
    ],
    combinationRules: [
      { effects: [], score: 1 },
      {
        effects: [{ effect: "攻撃力" }, { effect: "攻撃力" }],
        score: 2,
      },
      {
        effects: [{ effect: "攻撃力" }, { effect: "HP" }],
        score: 0,
      },
      {
        effects: [{ effect: "攻撃力" }, { effect: null }],
        score: 3,
      },
    ],
  });

  deepStrictEqual(config.userRules, []);
  deepStrictEqual(config.combinationRules, []);
});

Deno.test("効果・クオリティ・属性・武器種が具体的なルールを優先する", () => {
  const config = createScoreConfig({
    unmatchedScore: 0,
    rules: [
      { effect: "攻撃力", score: 1 },
      { effect: "攻撃力", quality: 3, score: 2 },
      { effect: "攻撃力", quality: 3, attributes: ["火"], score: 3 },
      {
        effect: "攻撃力",
        quality: 3,
        attributes: ["火"],
        weaponTypes: ["剣"],
        score: 4,
      },
    ],
  });

  equal(
    getSkillScore("攻撃力", 3, config, { attribute: "火", weaponType: "剣" }),
    4,
  );
  equal(
    getSkillScore("攻撃力", 3, config, { attribute: "火", weaponType: "斧" }),
    3,
  );
  equal(
    getSkillScore("攻撃力", 3, config, { attribute: "水", weaponType: "斧" }),
    2,
  );
  equal(
    getSkillScore("攻撃力", 2, config, { attribute: "水", weaponType: "斧" }),
    1,
  );
});

Deno.test("同じ条件種別なら対象範囲が狭いルールを優先する", () => {
  const rules = [
    { effect: "攻撃力", quality: 3, attributes: ["火", "水"], score: 4 },
    { effect: "攻撃力", quality: 3, attributes: ["火"], score: 5 },
  ];

  equal(
    findMatchingUserScore(rules, "攻撃力", 3, {
      attribute: "火",
      weaponType: "剣",
    }),
    5,
  );
});

Deno.test("限定度が同じルールは先に並んでいるものを優先する", () => {
  const rules = [
    { effect: "攻撃力", attributes: ["火", "水"], score: 4 },
    { effect: "攻撃力", attributes: ["火", "土"], score: 9 },
  ];

  equal(
    findMatchingUserScore(rules, "攻撃力", 3, {
      attribute: "火",
      weaponType: "剣",
    }),
    4,
  );
});

Deno.test("クオリティ別・一律ルールを優先し、なければ未設定時スコアを使う", () => {
  const config = createScoreConfig({
    unmatchedScore: -4,
    rules: [
      { effect: "攻撃力", quality: 3, score: 3 },
      { effect: "攻撃力", score: 1 },
      { effect: "HP", score: 10 },
    ],
  });

  equal(getSkillScore("攻撃力", 3, config, {}), 3);
  equal(getSkillScore("攻撃力", 2, config, {}), 1);
  equal(getSkillScore("HP", 5, config, {}), 10);
  equal(getSkillScore("未知の効果", 1, config, {}), -4);
  equal(getSkillScore("ディスペルガード", 1, config, {}), -4);
});

Deno.test("複数スキルの個別スコアと合計を計算する", () => {
  const config = createScoreConfig({
    unmatchedScore: 0,
    favoriteBonus: "4",
    rules: [
      { effect: "攻撃力", quality: 3, score: 8 },
      { effect: "HP", score: 10 },
      { effect: "ディスペルガード", score: -2 },
    ],
    combinationRules: [
      {
        effects: [
          { effect: "攻撃力", quality: 3 },
          { effect: "HP" },
        ],
        score: 5,
      },
      {
        effects: [
          { effect: "HP" },
          { effect: "ディスペルガード" },
        ],
        attributes: ["火"],
        weaponTypes: ["剣"],
        score: -1,
      },
      {
        effects: [
          { effect: "攻撃力", quality: 5 },
          { effect: "HP" },
        ],
        score: 20,
      },
    ],
  });
  const effectDefinitions = new Map([
    ["攻撃力", { shortName: "攻撃", qualities: [1, 2, 3, 4, 5] }],
    ["HP", { shortName: "HP", qualities: [1, 2, 3, 4, 5] }],
    ["ディスペルガード", { shortName: "ディスガ", qualities: [1] }],
  ]);
  const artifact = {
    skill1_info: { name: "攻撃力", quality: 3 },
    skill2_info: { name: "HP", skill_quality: "Q5" },
    skill3_info: { name: "ディスペルガード" },
    skill3_quality: 1,
  };

  const details = calculateArtifactScoreDetails(
    artifact,
    config,
    { attribute: "火", weaponType: "剣" },
    effectDefinitions,
    { favorite: true },
  );

  equal(details.total, 24);
  deepStrictEqual(details.skills, [
    {
      name: "攻撃力",
      shortName: "攻撃",
      quality: 3,
      showsQuality: true,
      score: 8,
    },
    {
      name: "HP",
      shortName: "HP",
      quality: 5,
      showsQuality: true,
      score: 10,
    },
    {
      name: "ディスペルガード",
      shortName: "ディスガ",
      quality: 1,
      showsQuality: false,
      score: -2,
    },
  ]);
  deepStrictEqual(details.combinationBonuses, [
    {
      effects: [
        {
          name: "攻撃力",
          shortName: "攻撃",
          quality: 3,
          showsQuality: true,
        },
        {
          name: "HP",
          shortName: "HP",
          quality: undefined,
          showsQuality: false,
        },
      ],
      score: 5,
    },
    {
      effects: [
        {
          name: "HP",
          shortName: "HP",
          quality: undefined,
          showsQuality: false,
        },
        {
          name: "ディスペルガード",
          shortName: "ディスガ",
          quality: undefined,
          showsQuality: false,
        },
      ],
      score: -1,
    },
  ]);
  deepStrictEqual(details.statusBonuses, [
    { label: "お気に入り", score: 4 },
  ]);
});

Deno.test("効果スコアは1件だけ採用し、一致した組み合わせはすべて加算する", () => {
  const config = createScoreConfig({
    unmatchedScore: 0,
    rules: [
      { effect: "攻撃力", score: 1 },
      { effect: "攻撃力", quality: 3, attributes: ["火"], score: 10 },
      { effect: "HP", score: 2 },
    ],
    combinationRules: [
      {
        effects: [{ effect: "攻撃力" }, { effect: "HP" }],
        score: 5,
      },
      {
        effects: [{ effect: "攻撃力" }, { effect: "HP" }],
        attributes: ["火"],
        score: 3,
      },
    ],
  });
  const details = calculateArtifactScoreDetails(
    {
      skill1_info: { name: "攻撃力", quality: 3 },
      skill2_info: { name: "HP", quality: 1 },
    },
    config,
    { attribute: "火", weaponType: "剣" },
  );

  deepStrictEqual(details.skills.map((skill) => skill.score), [10, 2]);
  deepStrictEqual(
    details.combinationBonuses.map((bonus) => bonus.score),
    [5, 3],
  );
  equal(details.total, 20);
});

Deno.test("組み合わせの属性・武器種・クオリティ条件を全て照合する", () => {
  const rules = [
    {
      effects: [{ effect: "攻撃力", quality: 3 }, { effect: "HP" }],
      attributes: ["火"],
      weaponTypes: ["剣"],
      score: 5,
    },
  ];
  const skills = [
    { name: "攻撃力", quality: 3 },
    { name: "HP", quality: 5 },
  ];

  equal(
    findMatchingCombinationBonuses(
      rules,
      skills,
      { attribute: "火", weaponType: "剣" },
    ).length,
    1,
  );
  equal(
    findMatchingCombinationBonuses(
      rules,
      skills,
      { attribute: "水", weaponType: "剣" },
    ).length,
    0,
  );
  equal(
    findMatchingCombinationBonuses(
      rules,
      skills,
      { attribute: "火", weaponType: "斧" },
    ).length,
    0,
  );
  equal(
    findMatchingCombinationBonuses(
      rules,
      [{ name: "攻撃力", quality: 2 }, { name: "HP", quality: 5 }],
      { attribute: "火", weaponType: "剣" },
    ).length,
    0,
  );
});

Deno.test("ツールチップは可変クオリティだけ数字を表示する", () => {
  const details = {
    skills: [
      { shortName: "攻撃", quality: 3, showsQuality: true, score: 8 },
      { shortName: "ディスガ", quality: 1, showsQuality: false, score: -2 },
      { shortName: "未知", quality: 2, showsQuality: true, score: 0 },
    ],
    combinationBonuses: [
      {
        effects: [
          { shortName: "攻撃", quality: 3, showsQuality: true },
          { shortName: "ディスガ", showsQuality: false },
        ],
        score: 5,
      },
    ],
    statusBonuses: [{ label: "お気に入り", score: 4 }],
  };

  deepStrictEqual(createTooltipLines(details), [
    "攻撃 3：+8",
    "ディスガ：-2",
    "未知 2：0",
    "組合せ 攻撃 3＋ディスガ：+5",
    "お気に入り：+4",
  ]);
  deepStrictEqual(createTooltipLines(details, true), [
    "採点保留",
    "攻撃 3",
    "ディスガ",
    "未知 2",
  ]);
});

Deno.test("スコアを高・通常・低の3段階へ分類する", () => {
  const highlight = { highThreshold: 10, lowThreshold: 0 };

  equal(classifyScore(10, highlight), "high");
  equal(classifyScore(20, highlight), "high");
  equal(classifyScore(5, highlight), "normal");
  equal(classifyScore(0, highlight), "low");
  equal(classifyScore(-3, highlight), "low");
  equal(classifyScore("5", highlight), "normal");
  equal(classifyScore("不正", highlight), undefined);
  equal(classifyScore(5, undefined), undefined);
});

Deno.test("属性と武器種の数値コードを名称へ変換する", () => {
  equal(normalizeArtifactValue(1, ATTRIBUTES), "火");
  equal(normalizeArtifactValue("5", WEAPON_TYPES), "杖");
  equal(normalizeArtifactValue("闇", ATTRIBUTES), "闇");
  equal(normalizeArtifactValue(99, ATTRIBUTES), undefined);
  equal(normalizeArtifactValue("不明", ATTRIBUTES), undefined);
  equal(normalizeArtifactValue(null, ATTRIBUTES), undefined);
});

Deno.test("クオリティ情報がない効果も未指定として採点する", () => {
  const details = calculateArtifactScoreDetails(
    { skill1_info: { name: "HP" } },
    createScoreConfig({
      unmatchedScore: 0,
      rules: [{ effect: "HP", score: 10 }],
    }),
    {},
  );

  equal(details.skills[0].quality, undefined);
  equal(details.skills[0].score, 10);
});
