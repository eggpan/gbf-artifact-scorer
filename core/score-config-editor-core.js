(function defineScoreConfigEditorCore(globalObject) {
  const {
    compareQualityCondition,
    compareRulePriority,
    compareScope,
    createEmptyUserConfig,
    getCombinationRuleKey,
    getRuleKey,
  } = globalObject.GbfArtifactScoreConfigCore;

  function sortRules(rules, effectByName) {
    return [...rules].sort((left, right) => {
      const leftEffect = effectByName.get(left.effect);
      const rightEffect = effectByName.get(right.effect);
      return (
        leftEffect.skillGroup - rightEffect.skillGroup ||
        leftEffect.index - rightEffect.index ||
        -compareRulePriority(left, right) ||
        compareQualityCondition(left, right) ||
        compareScope(left.attributes, right.attributes) ||
        compareScope(left.weaponTypes, right.weaponTypes)
      );
    });
  }

  function sortCombinationRules(rules) {
    return [...rules].sort((left, right) =>
      getCombinationRuleKey(left).localeCompare(
        getCombinationRuleKey(right),
        "ja",
      )
    );
  }

  function sortConfig(config, effectByName) {
    const sorted = {
      ...config,
      rules: sortRules(config.rules, effectByName),
    };
    if (config.combinationRules?.length) {
      sorted.combinationRules = sortCombinationRules(config.combinationRules);
    } else {
      delete sorted.combinationRules;
    }
    return sorted;
  }

  function upsertRule(config, rule, editingKey, effectByName) {
    const key = getRuleKey(rule);
    const rules = [...config.rules];
    const existingIndex = rules.findIndex((candidate) =>
      getRuleKey(candidate) === key
    );

    if (editingKey !== null) {
      const editingIndex = rules.findIndex((candidate) =>
        getRuleKey(candidate) === editingKey
      );
      if (editingIndex < 0) return { status: "missing", config };
      if (existingIndex >= 0 && existingIndex !== editingIndex) {
        return { status: "conflict", config };
      }
      rules[editingIndex] = rule;
      return {
        status: "updated",
        config: sortConfig({ ...config, rules }, effectByName),
      };
    }

    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
      return {
        status: "overwritten",
        config: sortConfig({ ...config, rules }, effectByName),
      };
    }

    rules.push(rule);
    return {
      status: "added",
      config: sortConfig({ ...config, rules }, effectByName),
    };
  }

  function copyRule(config, rule, sourceKey, effectByName) {
    if (
      !config.rules.some((candidate) => getRuleKey(candidate) === sourceKey)
    ) {
      return { status: "missing", config };
    }
    if (
      config.rules.some((candidate) =>
        getRuleKey(candidate) === getRuleKey(rule)
      )
    ) {
      return { status: "conflict", config };
    }

    return {
      status: "copied",
      config: sortConfig(
        { ...config, rules: [...config.rules, rule] },
        effectByName,
      ),
    };
  }

  function deleteRule(config, key, effectByName) {
    const rules = config.rules.filter((rule) => getRuleKey(rule) !== key);
    if (rules.length === config.rules.length) {
      return { status: "missing", config };
    }
    return {
      status: "deleted",
      config: sortConfig({ ...config, rules }, effectByName),
    };
  }

  function updateRuleScore(config, key, score, effectByName) {
    let updated = false;
    const rules = config.rules.map((rule) => {
      if (getRuleKey(rule) !== key) return rule;
      updated = true;
      return { ...rule, score };
    });
    if (!updated) return { status: "missing", config };
    return {
      status: "updated",
      config: sortConfig({ ...config, rules }, effectByName),
    };
  }

  function upsertCombinationRule(config, rule, editingKey, effectByName) {
    const key = getCombinationRuleKey(rule);
    const rules = [...(config.combinationRules ?? [])];
    const existingIndex = rules.findIndex((candidate) =>
      getCombinationRuleKey(candidate) === key
    );

    if (editingKey !== null) {
      const editingIndex = rules.findIndex((candidate) =>
        getCombinationRuleKey(candidate) === editingKey
      );
      if (editingIndex < 0) return { status: "missing", config };
      if (existingIndex >= 0 && existingIndex !== editingIndex) {
        return { status: "conflict", config };
      }
      rules[editingIndex] = rule;
      return {
        status: "updated",
        config: sortConfig(
          { ...config, combinationRules: rules },
          effectByName,
        ),
      };
    }

    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
      return {
        status: "overwritten",
        config: sortConfig(
          { ...config, combinationRules: rules },
          effectByName,
        ),
      };
    }

    rules.push(rule);
    return {
      status: "added",
      config: sortConfig(
        { ...config, combinationRules: rules },
        effectByName,
      ),
    };
  }

  function copyCombinationRule(config, rule, sourceKey, effectByName) {
    const rules = config.combinationRules ?? [];
    if (
      !rules.some((candidate) => getCombinationRuleKey(candidate) === sourceKey)
    ) {
      return { status: "missing", config };
    }
    if (
      rules.some((candidate) =>
        getCombinationRuleKey(candidate) === getCombinationRuleKey(rule)
      )
    ) {
      return { status: "conflict", config };
    }

    return {
      status: "copied",
      config: sortConfig(
        { ...config, combinationRules: [...rules, rule] },
        effectByName,
      ),
    };
  }

  function deleteCombinationRule(config, key, effectByName) {
    const currentRules = config.combinationRules ?? [];
    const rules = currentRules.filter((rule) =>
      getCombinationRuleKey(rule) !== key
    );
    if (rules.length === currentRules.length) {
      return { status: "missing", config };
    }

    const nextConfig = { ...config };
    if (rules.length > 0) nextConfig.combinationRules = rules;
    else delete nextConfig.combinationRules;
    return {
      status: "deleted",
      config: sortConfig(nextConfig, effectByName),
    };
  }

  function updateCombinationRuleScore(config, key, score, effectByName) {
    let updated = false;
    const rules = (config.combinationRules ?? []).map((rule) => {
      if (getCombinationRuleKey(rule) !== key) return rule;
      updated = true;
      return { ...rule, score };
    });
    if (!updated) return { status: "missing", config };
    return {
      status: "updated",
      config: sortConfig(
        { ...config, combinationRules: rules },
        effectByName,
      ),
    };
  }

  function clearScoreRules(config) {
    return copyDisplaySettings(config, createEmptyUserConfig());
  }

  function restoreDefaultScoreSettings(config, defaultConfig) {
    const restored = {
      unmatchedScore: defaultConfig.unmatchedScore,
      rules: defaultConfig.rules.map(cloneRule),
    };
    if (defaultConfig.combinationRules?.length) {
      restored.combinationRules = defaultConfig.combinationRules.map(
        cloneCombinationRule,
      );
    }
    return copyDisplaySettings(config, restored);
  }

  function copyDisplaySettings(source, target) {
    const result = { ...target };
    if (source.scoreHighlight) {
      result.scoreHighlight = { ...source.scoreHighlight };
    }
    return result;
  }

  function cloneRule(rule) {
    return {
      ...rule,
      ...(rule.attributes && { attributes: [...rule.attributes] }),
      ...(rule.weaponTypes && { weaponTypes: [...rule.weaponTypes] }),
    };
  }

  function cloneCombinationRule(rule) {
    return {
      ...cloneRule(rule),
      effects: rule.effects.map((effect) => ({ ...effect })),
    };
  }

  function matchesRuleSearch(rule, searchQuery, effectByName) {
    const query = searchQuery.trim().toLocaleLowerCase("ja");
    if (!query) return true;

    const effect = effectByName.get(rule.effect);
    return [
      rule.effect,
      rule.comment,
      formatRuleQualityCondition(rule),
      rule.attributes?.join(" "),
      rule.weaponTypes?.join(" "),
      effect ? `グループ${toRomanNumeral(effect.skillGroup)}` : "",
    ].some((value) => value?.toLocaleLowerCase("ja").includes(query));
  }

  function formatEffectRequirement(requirement) {
    return requirement.quality === undefined
      ? requirement.effect
      : `${requirement.effect} Q${requirement.quality}`;
  }

  function formatRuleSummary(rule) {
    const conditions = [];
    const qualityCondition = formatRuleQualityCondition(rule);
    if (qualityCondition) conditions.push(qualityCondition);
    if (rule.attributes?.length) {
      conditions.push(`属性 ${rule.attributes.join("・")}`);
    }
    if (rule.weaponTypes?.length) {
      conditions.push(`武器種 ${rule.weaponTypes.join("・")}`);
    }
    return `「${rule.effect}」（${
      conditions.join(" / ") || "指定なし"
    }、スコア ${rule.score}）`;
  }

  function formatRuleQualityCondition(rule) {
    if (rule.quality !== undefined) return `Q${rule.quality}`;
    if (rule.qualityMin !== undefined) return `Q${rule.qualityMin}以上`;
    if (rule.qualityMax !== undefined) return `Q${rule.qualityMax}以下`;
    return "";
  }

  function formatCombinationSummary(rule) {
    const effects = rule.effects.map(formatEffectRequirement).join(" ＋ ");
    const conditions = [];
    if (rule.attributes?.length) {
      conditions.push(`属性 ${rule.attributes.join("・")}`);
    }
    if (rule.weaponTypes?.length) {
      conditions.push(`武器種 ${rule.weaponTypes.join("・")}`);
    }
    return `「${effects}」（${
      conditions.join(" / ") || "指定なし"
    }、加算スコア ${rule.score}）`;
  }

  function toRomanNumeral(group) {
    return ["", "Ⅰ", "Ⅱ", "Ⅲ"][group];
  }

  globalObject.GbfArtifactScoreConfigEditorCore = Object.freeze({
    clearScoreRules,
    copyCombinationRule,
    copyRule,
    deleteCombinationRule,
    deleteRule,
    formatCombinationSummary,
    formatEffectRequirement,
    formatRuleSummary,
    formatRuleQualityCondition,
    matchesRuleSearch,
    restoreDefaultScoreSettings,
    sortCombinationRules,
    sortConfig,
    sortRules,
    toRomanNumeral,
    updateCombinationRuleScore,
    updateRuleScore,
    upsertCombinationRule,
    upsertRule,
  });
})(globalThis);
