(function defineLocalizationCore(globalObject) {
  function normalizeLocale(locale) {
    return String(locale ?? "").toLowerCase().startsWith("en") ? "en" : "ja";
  }

  function normalizeLookupKey(value) {
    return typeof value === "string" ? value.trim() : value;
  }

  function createMasterLocalization(master, locale = "ja") {
    const normalizedLocale = normalizeLocale(locale);
    const localeData = master?.localizations?.[normalizedLocale] ?? {};
    const effects = Array.isArray(master?.effects) ? master.effects : [];
    const attributes = Array.isArray(master?.attributes)
      ? master.attributes
      : [];
    const weaponTypes = Array.isArray(master?.weaponTypes)
      ? master.weaponTypes
      : [];
    const localizedEffectNames = localeData.effects ?? {};
    const localizedAttributeNames = localeData.attributes ?? {};
    const localizedWeaponTypeNames = localeData.weaponTypes ?? {};

    const effectByName = new Map();
    const effectByGameName = new Map();
    const effectLabels = new Map();
    for (const [index, effect] of effects.entries()) {
      if (!effect || typeof effect.name !== "string") continue;
      const localizedName = localizedEffectNames[effect.name] ?? effect.name;
      const localizedEffect = {
        ...effect,
        index,
        displayName: localizedName,
        displayShortName: normalizedLocale === "ja"
          ? effect.shortName ?? effect.name
          : localizedName,
      };
      localizedEffect.shortName = localizedEffect.displayShortName;
      effectByName.set(effect.name, localizedEffect);
      effectLabels.set(effect.name, localizedName);
      const gameNames = [
        effect.name,
        ...Object.values(master?.localizations ?? {}).map((translation) =>
          translation?.effects?.[effect.name]
        ),
      ].filter((name) => typeof name === "string");
      for (const gameName of gameNames) {
        effectByGameName.set(normalizeLookupKey(gameName), localizedEffect);
      }
    }

    return {
      locale: normalizedLocale,
      effects: effects.map((effect) => effectByName.get(effect.name)),
      attributes,
      weaponTypes,
      effectByName,
      effectByGameName,
      effectLabels,
      attributeLabels: createLabelMap(attributes, localizedAttributeNames),
      weaponTypeLabels: createLabelMap(weaponTypes, localizedWeaponTypeNames),
      attributeByLabel: createCanonicalLookup(
        attributes,
        master?.localizations,
        "attributes",
      ),
      weaponTypeByLabel: createCanonicalLookup(
        weaponTypes,
        master?.localizations,
        "weaponTypes",
      ),
      effectByLabel: createEffectCanonicalLookup(
        effects,
        master?.localizations,
      ),
    };
  }

  function createLabelMap(values, localizedNames) {
    return new Map(
      values.map((value) => [value, localizedNames[value] ?? value]),
    );
  }

  function createCanonicalLookup(values, localizations, field) {
    const lookup = new Map(
      values.map((value) => [normalizeLookupKey(value), value]),
    );
    for (const localeData of Object.values(localizations ?? {})) {
      for (const value of values) {
        const label = localeData?.[field]?.[value];
        if (typeof label === "string") {
          lookup.set(normalizeLookupKey(label), value);
        }
      }
    }
    return lookup;
  }

  function createEffectCanonicalLookup(effects, localizations) {
    const lookup = new Map(
      effects.map((effect) => [normalizeLookupKey(effect.name), effect.name]),
    );
    for (const localeData of Object.values(localizations ?? {})) {
      for (const effect of effects) {
        const label = localeData?.effects?.[effect.name];
        if (typeof label === "string") {
          lookup.set(normalizeLookupKey(label), effect.name);
        }
      }
    }
    return lookup;
  }

  function canonicalizeConfig(value, localization) {
    const config = structuredClone(value);
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return config;
    }
    if (Array.isArray(config.rules)) {
      config.rules = config.rules.map((rule) =>
        canonicalizeRule(rule, localization)
      );
    }
    if (Array.isArray(config.combinationRules)) {
      config.combinationRules = config.combinationRules.map((rule) => {
        const normalized = canonicalizeScope(rule, localization);
        if (Array.isArray(normalized?.effects)) {
          normalized.effects = normalized.effects.map((requirement) => ({
            ...requirement,
            effect: canonicalizeEffectName(requirement?.effect, localization),
          }));
        }
        return normalized;
      });
    }
    return config;
  }

  function canonicalizeRule(rule, localization) {
    const normalized = canonicalizeScope(rule, localization);
    if (normalized && typeof normalized === "object") {
      normalized.effect = canonicalizeEffectName(
        normalized.effect,
        localization,
      );
    }
    return normalized;
  }

  function canonicalizeScope(rule, localization) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return rule;
    const normalized = { ...rule };
    if (Array.isArray(rule.attributes)) {
      normalized.attributes = rule.attributes.map((value) =>
        localization.attributeByLabel.get(normalizeLookupKey(value)) ?? value
      );
    }
    if (Array.isArray(rule.weaponTypes)) {
      normalized.weaponTypes = rule.weaponTypes.map((value) =>
        localization.weaponTypeByLabel.get(normalizeLookupKey(value)) ?? value
      );
    }
    return normalized;
  }

  function canonicalizeEffectName(value, localization) {
    return localization.effectByLabel.get(normalizeLookupKey(value)) ?? value;
  }

  function localizeConfig(value, localization) {
    const config = structuredClone(value);
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return config;
    }
    if (Array.isArray(config.rules)) {
      config.rules = config.rules.map((rule) =>
        localizeRule(rule, localization)
      );
    }
    if (Array.isArray(config.combinationRules)) {
      config.combinationRules = config.combinationRules.map((rule) => {
        const localized = localizeScope(rule, localization);
        if (Array.isArray(localized?.effects)) {
          localized.effects = localized.effects.map((requirement) => ({
            ...requirement,
            effect: localization.effectLabels.get(requirement?.effect) ??
              requirement?.effect,
          }));
        }
        return localized;
      });
    }
    return config;
  }

  function localizeRule(rule, localization) {
    const localized = localizeScope(rule, localization);
    if (localized && typeof localized === "object") {
      localized.effect = localization.effectLabels.get(localized.effect) ??
        localized.effect;
    }
    return localized;
  }

  function localizeScope(rule, localization) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return rule;
    const localized = { ...rule };
    if (Array.isArray(rule.attributes)) {
      localized.attributes = rule.attributes.map((value) =>
        localization.attributeLabels.get(value) ?? value
      );
    }
    if (Array.isArray(rule.weaponTypes)) {
      localized.weaponTypes = rule.weaponTypes.map((value) =>
        localization.weaponTypeLabels.get(value) ?? value
      );
    }
    return localized;
  }

  globalObject.GbfArtifactLocalizationCore = {
    canonicalizeConfig,
    createMasterLocalization,
    localizeConfig,
    normalizeLocale,
    normalizeLookupKey,
  };
})(globalThis);
