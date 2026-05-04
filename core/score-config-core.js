(function defineScoreConfigCore(globalObject) {
  function normalizeQuality(quality) {
    const matchedQuality = String(quality).match(/\d+/);
    return matchedQuality ? Number(matchedQuality[0]) : undefined;
  }

  function normalizeRuleScope(value, allowedValues) {
    if (!Array.isArray(value)) return undefined;
    const selected = new Set(
      value.filter((item) => allowedValues.includes(item)),
    );
    const normalized = allowedValues.filter((item) => selected.has(item));
    return normalized.length > 0 && normalized.length < allowedValues.length
      ? normalized
      : undefined;
  }

  function normalizeScoreHighlight(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const highThreshold = Number(value.highThreshold);
    const lowThreshold = Number(value.lowThreshold);
    if (
      !Number.isFinite(highThreshold) ||
      !Number.isFinite(lowThreshold) ||
      lowThreshold >= highThreshold
    ) {
      return undefined;
    }
    return { highThreshold, lowThreshold };
  }

  function validateUserConfig(
    value,
    {
      effectByName = new Map(),
      attributes = [],
      weaponTypes = [],
      omitZeroScores = false,
    } = {},
  ) {
    if (!value || typeof value !== "object") {
      throw new Error("設定全体がオブジェクトではありません。");
    }
    const unmatchedScore = Number(value.unmatchedScore);
    if (!Number.isFinite(unmatchedScore)) {
      throw new Error("unmatchedScoreが数値ではありません。");
    }
    const favoriteBonus = value.favoriteBonus === undefined
      ? 0
      : Number(value.favoriteBonus);
    if (!Number.isFinite(favoriteBonus)) {
      throw new Error("favoriteBonusが数値ではありません。");
    }
    if (!Array.isArray(value.rules)) {
      throw new Error("rulesが配列ではありません。");
    }
    if (
      value.combinationRules !== undefined &&
      !Array.isArray(value.combinationRules)
    ) {
      throw new Error("combinationRulesが配列ではありません。");
    }
    const scoreHighlight = normalizeScoreHighlight(value.scoreHighlight);
    if (value.scoreHighlight !== undefined && !scoreHighlight) {
      throw new Error(
        "scoreHighlightにはlowThresholdより大きいhighThresholdを数値で指定してください。",
      );
    }

    const seenKeys = new Set();
    const rules = value.rules.flatMap((rule, index) => {
      const effect = effectByName.get(rule?.effect);
      const score = Number(rule?.score);
      const requestedQuality = rule?.quality === null ||
          rule?.quality === undefined
        ? undefined
        : Number(rule.quality);

      if (!effect) {
        throw new Error(`${index + 1}件目の効果名がマスタにありません。`);
      }
      if (!Number.isFinite(score)) {
        throw new Error(`${index + 1}件目のスコアが数値ではありません。`);
      }
      if (score === 0) {
        if (omitZeroScores) return [];
        throw new Error(`${index + 1}件目のスコアには0を指定できません。`);
      }
      if (
        requestedQuality !== undefined &&
        !effect.qualities.includes(requestedQuality)
      ) {
        throw new Error(`${index + 1}件目のクオリティが不正です。`);
      }
      const quality = effect.qualities.length === 1
        ? undefined
        : requestedQuality;

      const normalizedAttributes = validateScopeValues(
        rule?.attributes,
        attributes,
        "属性",
        index,
      );
      const normalizedWeaponTypes = validateScopeValues(
        rule?.weaponTypes,
        weaponTypes,
        "武器種",
        index,
      );
      const comment = validateComment(rule?.comment, index);
      const normalizedRule = createRule(
        effect.name,
        quality,
        normalizedAttributes,
        normalizedWeaponTypes,
        score,
        comment,
      );
      const key = getRuleKey(normalizedRule);
      if (seenKeys.has(key)) {
        throw new Error(`${index + 1}件目のルール条件が重複しています。`);
      }
      seenKeys.add(key);
      return [normalizedRule];
    });

    const seenCombinationKeys = new Set();
    const combinationRules = (value.combinationRules ?? []).flatMap(
      (rule, index) => {
        if (!Array.isArray(rule?.effects) || rule.effects.length !== 2) {
          throw new Error(
            `${
              index + 1
            }件目の組み合わせボーナスには効果を2つ指定してください。`,
          );
        }

        const effects = rule.effects.map((requirement, effectIndex) => {
          const effect = effectByName.get(requirement?.effect);
          const requestedQuality = requirement?.quality === null ||
              requirement?.quality === undefined
            ? undefined
            : Number(requirement.quality);
          if (!effect) {
            throw new Error(
              `${index + 1}件目の組み合わせボーナスの効果${
                effectIndex + 1
              }がマスタにありません。`,
            );
          }
          if (
            requestedQuality !== undefined &&
            !effect.qualities.includes(requestedQuality)
          ) {
            throw new Error(
              `${index + 1}件目の組み合わせボーナスの効果${
                effectIndex + 1
              }のクオリティが不正です。`,
            );
          }
          const quality = effect.qualities.length === 1
            ? undefined
            : requestedQuality;
          const requirementValue = { effect: effect.name };
          if (quality !== undefined) requirementValue.quality = quality;
          return requirementValue;
        });
        if (effects[0].effect === effects[1].effect) {
          throw new Error(
            `${
              index + 1
            }件目の組み合わせボーナスには異なる効果を指定してください。`,
          );
        }

        const score = Number(rule?.score);
        if (!Number.isFinite(score)) {
          throw new Error(
            `${
              index + 1
            }件目の組み合わせボーナスのスコアが数値ではありません。`,
          );
        }
        if (score === 0) {
          if (omitZeroScores) return [];
          throw new Error(
            `${
              index + 1
            }件目の組み合わせボーナスのスコアには0を指定できません。`,
          );
        }

        const normalizedRule = createCombinationRule(
          effects,
          validateScopeValues(
            rule?.attributes,
            attributes,
            "組み合わせボーナスの属性",
            index,
          ),
          validateScopeValues(
            rule?.weaponTypes,
            weaponTypes,
            "組み合わせボーナスの武器種",
            index,
          ),
          score,
          validateComment(rule?.comment, index),
        );
        const key = getCombinationRuleKey(normalizedRule);
        if (seenCombinationKeys.has(key)) {
          throw new Error(
            `${index + 1}件目の組み合わせボーナス条件が重複しています。`,
          );
        }
        seenCombinationKeys.add(key);
        return [normalizedRule];
      },
    );

    const config = { unmatchedScore, rules };
    if (favoriteBonus !== 0) config.favoriteBonus = favoriteBonus;
    if (combinationRules.length > 0) config.combinationRules = combinationRules;
    if (scoreHighlight) config.scoreHighlight = scoreHighlight;
    return config;
  }

  function resolveUserConfig(
    storedValue,
    defaultValue,
    {
      effectByName = new Map(),
      attributes = [],
      weaponTypes = [],
    } = {},
  ) {
    const validationOptions = { effectByName, attributes, weaponTypes };
    const defaultConfig = validateUserConfig(defaultValue, validationOptions);

    if (storedValue === undefined) {
      return {
        config: validateUserConfig(defaultConfig, validationOptions),
        defaultConfig,
        source: "default",
        removedZeroScoreCount: 0,
      };
    }

    try {
      const config = validateUserConfig(storedValue, {
        ...validationOptions,
        omitZeroScores: true,
      });
      const removedRuleCount = storedValue.rules.length - config.rules.length;
      const removedCombinationCount =
        (storedValue.combinationRules?.length ?? 0) -
        (config.combinationRules?.length ?? 0);
      return {
        config,
        defaultConfig,
        source: "stored",
        removedZeroScoreCount: removedRuleCount + removedCombinationCount,
      };
    } catch (error) {
      return {
        config: validateUserConfig(defaultConfig, validationOptions),
        defaultConfig,
        source: "default",
        removedZeroScoreCount: 0,
        recoveryError: error,
      };
    }
  }

  function validateScopeValues(value, allowedValues, label, ruleIndex) {
    if (value === undefined || value === null) return undefined;
    if (!Array.isArray(value)) {
      throw new Error(`${ruleIndex + 1}件目の${label}が配列ではありません。`);
    }

    const selected = new Set(value);
    const unknownValue = value.find((item) => !allowedValues.includes(item));
    if (unknownValue !== undefined) {
      throw new Error(
        `${ruleIndex + 1}件目の${label}「${unknownValue}」が不正です。`,
      );
    }

    const normalized = allowedValues.filter((item) => selected.has(item));
    return normalized.length > 0 && normalized.length < allowedValues.length
      ? normalized
      : undefined;
  }

  function validateComment(value, ruleIndex) {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new Error(`${ruleIndex + 1}件目のコメントが文字列ではありません。`);
    }
    if (/[\r\n]/.test(value)) {
      throw new Error(
        `${ruleIndex + 1}件目のコメントには改行を使用できません。`,
      );
    }

    const comment = value.trim();
    if (comment.length > 500) {
      throw new Error(
        `${ruleIndex + 1}件目のコメントが500文字を超えています。`,
      );
    }
    return comment || undefined;
  }

  function createEmptyUserConfig() {
    return { unmatchedScore: 0, rules: [] };
  }

  function createRule(
    effect,
    quality,
    attributes,
    weaponTypes,
    score,
    comment,
  ) {
    const rule = { effect };
    if (comment) rule.comment = comment;
    if (quality !== undefined) rule.quality = quality;
    if (attributes?.length) rule.attributes = attributes;
    if (weaponTypes?.length) rule.weaponTypes = weaponTypes;
    rule.score = score;
    return rule;
  }

  function createCombinationRule(
    effects,
    attributes,
    weaponTypes,
    score,
    comment,
  ) {
    const rule = { effects };
    if (comment) rule.comment = comment;
    if (attributes?.length) rule.attributes = attributes;
    if (weaponTypes?.length) rule.weaponTypes = weaponTypes;
    rule.score = score;
    return rule;
  }

  function getRuleKey(rule) {
    return [
      rule.effect,
      rule.quality ?? "all",
      rule.attributes?.join(",") ?? "all",
      rule.weaponTypes?.join(",") ?? "all",
    ].join("\u0000");
  }

  function getCombinationRuleKey(rule) {
    const effects = rule.effects
      .map((requirement) =>
        `${requirement.effect}:${requirement.quality ?? "all"}`
      )
      .sort((left, right) => left.localeCompare(right, "ja"));
    return [
      effects.join("+"),
      rule.attributes?.join(",") ?? "all",
      rule.weaponTypes?.join(",") ?? "all",
    ].join("\u0000");
  }

  function compareRulePriority(left, right) {
    return compareSpecificity(
      getRuleSpecificity(left),
      getRuleSpecificity(right),
    );
  }

  function getRuleSpecificity(rule) {
    const specifiedConditionCount = Number(rule.quality !== undefined) +
      Number(Boolean(rule.attributes)) +
      Number(Boolean(rule.weaponTypes));
    const selectedValueCount = Number(rule.quality !== undefined) +
      (rule.attributes?.length ?? 0) +
      (rule.weaponTypes?.length ?? 0);
    return [specifiedConditionCount, -selectedValueCount];
  }

  function compareSpecificity(left, right) {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  }

  function compareQuality(left, right) {
    if (left === right) return 0;
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    return left - right;
  }

  function compareScope(left, right) {
    return (left?.join(",") ?? "").localeCompare(
      right?.join(",") ?? "",
      "ja",
    );
  }

  globalObject.GbfArtifactScoreConfigCore = Object.freeze({
    compareQuality,
    compareRulePriority,
    compareScope,
    createCombinationRule,
    createEmptyUserConfig,
    createRule,
    getCombinationRuleKey,
    getRuleKey,
    normalizeQuality,
    normalizeRuleScope,
    normalizeScoreHighlight,
    resolveUserConfig,
    validateUserConfig,
  });
})(globalThis);
