(function defineArtifactScoreCore(globalObject) {
  const {
    compareRulePriority,
    normalizeQuality,
    normalizeRuleScope,
    normalizeScoreHighlight,
  } = globalObject.GbfArtifactScoreConfigCore;

  function createActiveScoreConfig(
    userConfig,
    { attributes = [], weaponTypes = [] } = {},
  ) {
    const userRules = [];
    const combinationRules = [];

    if (Array.isArray(userConfig?.rules)) {
      userConfig.rules.forEach((rule) => {
        const effect = typeof rule.effect === "string"
          ? rule.effect
          : undefined;
        const score = Number(rule.score);
        if (!effect || !Number.isFinite(score) || score === 0) return;

        const quality = rule.quality === null || rule.quality === undefined
          ? undefined
          : normalizeQuality(rule.quality);
        const normalizedAttributes = normalizeRuleScope(
          rule.attributes,
          attributes,
        );
        const normalizedWeaponTypes = normalizeRuleScope(
          rule.weaponTypes,
          weaponTypes,
        );
        userRules.push({
          effect,
          quality,
          attributes: normalizedAttributes,
          weaponTypes: normalizedWeaponTypes,
          score,
        });
      });
    }

    if (Array.isArray(userConfig?.combinationRules)) {
      userConfig.combinationRules.forEach((rule) => {
        const score = Number(rule?.score);
        if (
          !Array.isArray(rule?.effects) ||
          rule.effects.length !== 2 ||
          !Number.isFinite(score) ||
          score === 0
        ) {
          return;
        }

        const effects = rule.effects.flatMap((requirement) => {
          if (typeof requirement?.effect !== "string") return [];
          const quality = requirement.quality === null ||
              requirement.quality === undefined
            ? undefined
            : normalizeQuality(requirement.quality);
          return [{ effect: requirement.effect, quality }];
        });
        if (
          effects.length !== 2 ||
          new Set(effects.map((requirement) => requirement.effect)).size !== 2
        ) {
          return;
        }

        combinationRules.push({
          effects,
          attributes: normalizeRuleScope(rule.attributes, attributes),
          weaponTypes: normalizeRuleScope(rule.weaponTypes, weaponTypes),
          score,
        });
      });
    }

    const userUnmatchedScore = Number(userConfig?.unmatchedScore);
    const userFavoriteBonus = Number(userConfig?.favoriteBonus);

    return {
      userRules,
      combinationRules,
      unmatchedScore: Number.isFinite(userUnmatchedScore)
        ? userUnmatchedScore
        : 0,
      favoriteBonus: Number.isFinite(userFavoriteBonus) ? userFavoriteBonus : 0,
    };
  }

  function calculateArtifactScoreDetails(
    artifact,
    scoreConfig,
    artifactScope,
    effectDefinitions = new Map(),
    { favorite = false, favoriteLabel = "お気に入り" } = {},
  ) {
    const skills = [1, 2, 3, 4].flatMap((skillNumber) => {
      const skillInfo = artifact[`skill${skillNumber}_info`];
      if (!skillInfo) return [];

      const skillQuality = getSkillQuality(artifact, skillInfo, skillNumber);
      const receivedName = typeof skillInfo.name === "string"
        ? skillInfo.name.trim()
        : skillInfo.name;
      const effectDefinition = effectDefinitions.get(receivedName);
      const effectName = effectDefinition?.name ?? receivedName;
      const score = getSkillScore(
        effectName,
        skillQuality,
        scoreConfig,
        artifactScope,
      );
      return [
        {
          name: effectName,
          shortName: effectDefinition?.displayShortName ??
            effectDefinition?.shortName ?? receivedName,
          quality: skillQuality,
          showsQuality: effectDefinition?.qualities?.length !== 1,
          score,
        },
      ];
    });

    const combinationBonuses = findMatchingCombinationBonuses(
      scoreConfig.combinationRules,
      skills,
      artifactScope,
      effectDefinitions,
    );
    const favoriteBonus = Number(scoreConfig?.favoriteBonus);
    const statusBonuses = favorite && Number.isFinite(favoriteBonus) &&
        favoriteBonus !== 0
      ? [{ label: favoriteLabel, score: favoriteBonus }]
      : [];
    return {
      skills,
      combinationBonuses,
      statusBonuses,
      total: [...skills, ...combinationBonuses, ...statusBonuses].reduce(
        (total, item) => total + item.score,
        0,
      ),
    };
  }

  function findMatchingCombinationBonuses(
    rules = [],
    skills = [],
    { attribute, weaponType } = {},
    effectDefinitions = new Map(),
  ) {
    return rules.flatMap((rule) => {
      if (rule.attributes && !rule.attributes.includes(attribute)) return [];
      if (rule.weaponTypes && !rule.weaponTypes.includes(weaponType)) {
        return [];
      }
      const matchesAllEffects = rule.effects.every((requirement) =>
        skills.some((skill) =>
          skill.name === requirement.effect &&
          (requirement.quality === undefined ||
            skill.quality === requirement.quality)
        )
      );
      if (!matchesAllEffects) return [];

      return [{
        effects: rule.effects.map((requirement) => {
          const definition = effectDefinitions.get(requirement.effect);
          return {
            name: requirement.effect,
            shortName: definition?.shortName ?? requirement.effect,
            quality: requirement.quality,
            showsQuality: requirement.quality !== undefined &&
              definition?.qualities?.length !== 1,
          };
        }),
        score: rule.score,
      }];
    });
  }

  function getSkillScore(effect, quality, scoreConfig, artifactScope) {
    const userScore = findMatchingUserScore(
      scoreConfig.userRules,
      effect,
      quality,
      artifactScope,
    );
    const score = userScore ?? scoreConfig.unmatchedScore;

    return Number.isFinite(Number(score)) ? Number(score) : 0;
  }

  function findMatchingUserScore(
    rules,
    effect,
    quality,
    { attribute, weaponType } = {},
  ) {
    let bestMatch;

    rules.forEach((rule) => {
      if (rule.effect !== effect) return;
      if (rule.quality !== undefined && rule.quality !== quality) return;
      if (rule.attributes && !rule.attributes.includes(attribute)) return;
      if (rule.weaponTypes && !rule.weaponTypes.includes(weaponType)) return;

      if (!bestMatch || compareRulePriority(rule, bestMatch) > 0) {
        bestMatch = rule;
      }
    });

    return bestMatch?.score;
  }

  function createTooltipLines(
    scoreDetails,
    isPendingScore = false,
    {
      pendingLabel = "採点保留",
      combinationLabel = "組合せ",
      separator = "：",
      combinationSeparator = "＋",
    } = {},
  ) {
    const skillLines = scoreDetails.skills.map((skill) => {
      const quality = skill.showsQuality && skill.quality
        ? ` ${skill.quality}`
        : "";
      if (isPendingScore) return `${skill.shortName}${quality}`;
      return `${skill.shortName}${quality}${separator}${
        formatSignedScore(skill.score)
      }`;
    });
    if (isPendingScore) return [pendingLabel, ...skillLines];

    const combinationLines = (scoreDetails.combinationBonuses ?? []).map(
      (bonus) => {
        const effects = bonus.effects.map((effect) => {
          const quality = effect.showsQuality && effect.quality
            ? ` ${effect.quality}`
            : "";
          return `${effect.shortName}${quality}`;
        }).join(combinationSeparator);
        return `${combinationLabel} ${effects}${separator}${
          formatSignedScore(bonus.score)
        }`;
      },
    );
    const statusLines = (scoreDetails.statusBonuses ?? []).map((bonus) =>
      `${bonus.label}${separator}${formatSignedScore(bonus.score)}`
    );
    return [...skillLines, ...combinationLines, ...statusLines];
  }

  function classifyScore(score, scoreHighlight) {
    const normalizedScore = Number(score);
    const normalizedHighlight = normalizeScoreHighlight(scoreHighlight);
    if (!Number.isFinite(normalizedScore) || !normalizedHighlight) {
      return undefined;
    }
    if (normalizedScore >= normalizedHighlight.highThreshold) return "high";
    if (normalizedScore <= normalizedHighlight.lowThreshold) return "low";
    return "normal";
  }

  function formatSignedScore(score) {
    return score > 0 ? `+${score}` : String(score);
  }

  function getSkillQuality(artifact, skillInfo, skillNumber) {
    const quality = skillInfo.quality ??
      skillInfo.skill_quality ??
      skillInfo.skillQuality ??
      artifact[`skill${skillNumber}_quality`];

    if (quality === undefined || quality === null) return undefined;
    return normalizeQuality(quality);
  }

  function normalizeArtifactValue(value, names) {
    if (value === undefined || value === null) return undefined;
    const text = String(value);
    if (names.includes(text)) return text;

    const numericValue = Number(text);
    if (Number.isInteger(numericValue) && numericValue >= 1) {
      return names[numericValue - 1];
    }

    return undefined;
  }

  globalObject.GbfArtifactScoreCore = Object.freeze({
    calculateArtifactScoreDetails,
    classifyScore,
    createActiveScoreConfig,
    createTooltipLines,
    findMatchingCombinationBonuses,
    findMatchingUserScore,
    formatSignedScore,
    getSkillScore,
    normalizeArtifactValue,
  });
})(globalThis);
