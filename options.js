const USER_SCORE_CONFIG_KEY = "userScoreConfig";
const ARTIFACT_DISPLAY_STATE_KEY = "artifactDisplayState";
const ui = globalThis.GbfArtifactOptionsI18n.createOptionsI18n(
  chrome.i18n.getUILanguage(),
);
ui.localizeDocument(document);
const {
  canonicalizeConfig,
  createMasterLocalization,
  localizeConfig,
} = globalThis.GbfArtifactLocalizationCore;
const {
  createCombinationRule,
  createEmptyUserConfig,
  createRule,
  getCombinationRuleKey,
  getRuleKey,
  normalizeScoreHighlight,
  resolveUserConfig,
  validateUserConfig,
} = globalThis.GbfArtifactScoreConfigCore;
const { classifyScore } = globalThis.GbfArtifactScoreCore;
const {
  clearScoreRules: createClearedScoreConfig,
  copyCombinationRule,
  copyRule,
  deleteCombinationRule,
  deleteRule,
  formatCombinationSummary,
  formatEffectRequirement,
  formatRuleQualityCondition,
  formatRuleSummary,
  matchesRuleSearch,
  restoreDefaultScoreSettings,
  sortConfig,
  toRomanNumeral,
  updateCombinationRuleScore,
  updateRuleScore,
  upsertCombinationRule,
  upsertRule,
} = globalThis.GbfArtifactScoreConfigEditorCore;
const {
  MAX_ARTIFACT_DISPLAY_ITEMS,
  normalizeArtifactDisplayState,
} = globalThis.GbfArtifactListCore;

const elements = {
  artifactDisplayCount: getRequiredElement("#artifact-display-count"),
  artifactDisplayGrid: getRequiredElement("#artifact-display-grid"),
  artifactDisplayDetailsEmpty: getRequiredElement(
    "#artifact-display-details-empty",
  ),
  artifactDisplayDetailsList: getRequiredElement(
    "#artifact-display-details-list",
  ),
  artifactDisplayDetailsPosition: getRequiredElement(
    "#artifact-display-details-position",
  ),
  artifactDisplayDetailsTotal: getRequiredElement(
    "#artifact-display-details-total",
  ),
  artifactDisplaySelection: getRequiredElement(
    "#artifact-display-selection",
  ),
  artifactDisplayStatus: getRequiredElement("#artifact-display-status"),
  rulePanel: getRequiredElement("#rule-panel"),
  toggleRuleForm: getRequiredElement("#toggle-rule-form"),
  ruleFormTitle: getRequiredElement("#rule-form-title"),
  ruleFormDescription: getRequiredElement("#rule-form-description"),
  editIndicator: getRequiredElement("#edit-indicator"),
  ruleForm: getRequiredElement("#rule-form"),
  groupSelect: getRequiredElement("#group-select"),
  effectSelect: getRequiredElement("#effect-select"),
  qualitySelect: getRequiredElement("#quality-select"),
  attributeOptions: getRequiredElement("#attribute-options"),
  weaponTypeOptions: getRequiredElement("#weapon-type-options"),
  commentInput: getRequiredElement("#comment-input"),
  scoreInput: getRequiredElement("#score-input"),
  submitRule: getRequiredElement("#submit-rule"),
  cancelEdit: getRequiredElement("#cancel-edit"),
  ruleFormMessage: getRequiredElement("#rule-form-message"),
  rulesBody: getRequiredElement("#rules-body"),
  ruleSearch: getRequiredElement("#rule-search"),
  emptyRules: getRequiredElement("#empty-rules"),
  ruleCount: getRequiredElement("#rule-count"),
  combinationPanel: getRequiredElement("#combination-panel"),
  toggleCombinationForm: getRequiredElement("#toggle-combination-form"),
  combinationFormTitle: getRequiredElement("#combination-form-title"),
  combinationFormDescription: getRequiredElement(
    "#combination-form-description",
  ),
  combinationEditIndicator: getRequiredElement("#combination-edit-indicator"),
  combinationForm: getRequiredElement("#combination-form"),
  combinationEffect1: getRequiredElement("#combination-effect-1"),
  combinationQuality1: getRequiredElement("#combination-quality-1"),
  combinationEffect2: getRequiredElement("#combination-effect-2"),
  combinationQuality2: getRequiredElement("#combination-quality-2"),
  combinationAttributeOptions: getRequiredElement(
    "#combination-attribute-options",
  ),
  combinationWeaponTypeOptions: getRequiredElement(
    "#combination-weapon-type-options",
  ),
  combinationScore: getRequiredElement("#combination-score"),
  combinationComment: getRequiredElement("#combination-comment"),
  submitCombination: getRequiredElement("#submit-combination"),
  cancelCombinationEdit: getRequiredElement("#cancel-combination-edit"),
  combinationFormMessage: getRequiredElement("#combination-form-message"),
  combinationBody: getRequiredElement("#combination-body"),
  emptyCombinations: getRequiredElement("#empty-combinations"),
  combinationCount: getRequiredElement("#combination-count"),
  enableScoreHighlight: getRequiredElement("#enable-score-highlight"),
  scoreHighlightControls: getRequiredElement("#score-highlight-controls"),
  highScoreThreshold: getRequiredElement("#high-score-threshold"),
  lowScoreThreshold: getRequiredElement("#low-score-threshold"),
  highScorePreview: getRequiredElement("#high-score-preview"),
  normalScorePreview: getRequiredElement("#normal-score-preview"),
  lowScorePreview: getRequiredElement("#low-score-preview"),
  scoreHighlightMessage: getRequiredElement("#score-highlight-message"),
  favoriteBonus: getRequiredElement("#favorite-bonus"),
  unmatchedScore: getRequiredElement("#unmatched-score"),
  exportJson: getRequiredElement("#export-json"),
  importJson: getRequiredElement("#import-json"),
  resetDefaultConfig: getRequiredElement("#reset-default-config"),
  clearScoreRules: getRequiredElement("#clear-score-rules"),
  statusMessage: getRequiredElement("#status-message"),
};

const state = {
  effects: [],
  effectByName: new Map(),
  attributes: [],
  weaponTypes: [],
  defaultConfig: createEmptyUserConfig(),
  config: createEmptyUserConfig(),
  editKey: null,
  ruleCopySourceKey: null,
  combinationEditKey: null,
  combinationCopySourceKey: null,
  artifactDisplayState: { items: [] },
  localization: null,
};
const inlineScoreFeedbackTimers = new WeakMap();
const DEFAULT_SCORE_HIGHLIGHT = { highThreshold: 10, lowThreshold: 0 };
let configWriteQueue = Promise.resolve();

function getRequiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`必須要素が見つかりません: ${selector}`);
  return element;
}

function handleArtifactDisplayStorageChange(changes, areaName) {
  if (areaName !== "session" || !changes[ARTIFACT_DISPLAY_STATE_KEY]) return;

  state.artifactDisplayState = normalizeArtifactDisplayState(
    changes[ARTIFACT_DISPLAY_STATE_KEY].newValue,
  ) ?? { items: [] };
  renderArtifactDisplay();
}

function renderArtifactDisplay() {
  const displayState = normalizeArtifactDisplayState(
    state.artifactDisplayState,
  ) ?? { items: [] };
  const itemsByPosition = new Map(
    displayState.items.map((item) => [item.position, item]),
  );

  elements.artifactDisplayGrid.replaceChildren();
  for (let position = 1; position <= MAX_ARTIFACT_DISPLAY_ITEMS; position++) {
    const item = itemsByPosition.get(position);
    const cell = document.createElement("div");
    cell.className = "artifact-display-cell";
    cell.setAttribute("role", "listitem");
    if (!item) cell.classList.add("empty");
    const tier = item?.score === null
      ? undefined
      : classifyScore(item?.score, state.config.scoreHighlight);
    if (tier) cell.dataset.scoreTier = tier;
    if (displayState.selectedPosition === position) {
      cell.classList.add("selected");
      cell.setAttribute("aria-current", "true");
    }

    const positionLabel = document.createElement("span");
    positionLabel.className = "artifact-display-position";
    positionLabel.textContent = String(position);
    const score = document.createElement("strong");
    score.className = "artifact-display-score";
    score.textContent = item ? item.score === null ? "—" : item.score : "";
    cell.append(positionLabel, score);

    const itemStatuses = [];
    if (item?.favorite) {
      const label = ui.locale === "en" ? "Favorite" : "お気に入り";
      itemStatuses.push(label);
      cell.append(createArtifactStatusBadge("favorite", "★", label));
    }
    if (item?.unnecessary) {
      const label = ui.locale === "en" ? "Unneeded" : "不用品";
      itemStatuses.push(label);
      cell.append(
        createArtifactStatusBadge(
          "unnecessary",
          ui.locale === "en" ? "Unneeded" : "不用品",
          label,
        ),
      );
    }

    const scoreLabel = item
      ? item.score === null
        ? ui.locale === "en" ? "Pending" : "採点保留"
        : ui.locale === "en"
        ? `Score ${item.score}`
        : `スコア${item.score}`
      : ui.locale === "en"
      ? "No data"
      : "データなし";
    const separator = ui.locale === "en" ? ", " : "、";
    const selectedLabel = displayState.selectedPosition === position
      ? `${separator}${
        ui.locale === "en" ? "selected in the game" : "ゲーム画面で選択中"
      }`
      : "";
    const statusLabel = itemStatuses.length > 0
      ? `${separator}${itemStatuses.join(separator)}`
      : "";
    cell.setAttribute(
      "aria-label",
      ui.locale === "en"
        ? `Item ${position}, ${scoreLabel}${statusLabel}${selectedLabel}`
        : `${position}番目、${scoreLabel}${statusLabel}${selectedLabel}`,
    );
    if (item?.details?.length) cell.title = item.details.join("\n");
    elements.artifactDisplayGrid.append(cell);
  }

  elements.artifactDisplayCount.textContent = `${displayState.items.length}件`;
  elements.artifactDisplayStatus.textContent = displayState.items.length > 0
    ? "ゲーム内のアーティファクト一覧と同期しています。"
    : "ゲーム内でアーティファクト一覧を開いてください。";
  elements.artifactDisplaySelection.textContent = displayState.selectedPosition
    ? `ゲーム画面で${displayState.selectedPosition}番目を選択中です。`
    : "ゲーム画面でアーティファクトをクリックすると、その位置を強調します。";
  elements.artifactDisplaySelection.classList.toggle(
    "active",
    displayState.selectedPosition !== undefined,
  );
  renderArtifactDisplayDetails(displayState, itemsByPosition);
}

function renderArtifactDisplayDetails(displayState, itemsByPosition) {
  const item = itemsByPosition.get(displayState.selectedPosition);
  elements.artifactDisplayDetailsList.replaceChildren();
  if (!item) {
    elements.artifactDisplayDetailsPosition.textContent = "未選択";
    elements.artifactDisplayDetailsTotal.textContent = "—";
    elements.artifactDisplayDetailsEmpty.textContent =
      "ゲーム画面でアーティファクトを選択してください。";
    elements.artifactDisplayDetailsEmpty.hidden = false;
    return;
  }

  const statuses = [
    item.favorite ? ui.locale === "en" ? "Favorite" : "お気に入り" : undefined,
    item.unnecessary ? ui.locale === "en" ? "Unneeded" : "不用品" : undefined,
  ].filter(Boolean);
  elements.artifactDisplayDetailsPosition.textContent = [
    ui.locale === "en" ? `Item ${item.position}` : `${item.position}番目`,
    ...statuses,
  ].join(ui.locale === "en" ? " / " : "・");
  elements.artifactDisplayDetailsTotal.textContent = item.score === null
    ? "—"
    : String(item.score);

  const details = item.details ?? [];
  elements.artifactDisplayDetailsEmpty.textContent = "加点内訳はありません。";
  elements.artifactDisplayDetailsEmpty.hidden = details.length > 0;
  details.forEach((detail) => {
    const listItem = document.createElement("li");
    listItem.textContent = detail;
    elements.artifactDisplayDetailsList.append(listItem);
  });
}

function createArtifactStatusBadge(type, text, label) {
  const badge = document.createElement("span");
  badge.className = `artifact-display-status-badge ${type}`;
  badge.textContent = text;
  badge.title = label;
  badge.setAttribute("aria-hidden", "true");
  return badge;
}

initialize().catch((error) => {
  console.error(error);
  showStatus(
    ui.locale === "en"
      ? `Could not initialize the settings page: ${error.message}`
      : `設定画面を初期化できませんでした: ${error.message}`,
    true,
  );
});
chrome.storage.onChanged.addListener(handleArtifactDisplayStorageChange);

async function initialize() {
  let initializationWarning;
  let initializationWarningIsError = false;
  const [masterResponse, defaultResponse, stored, storedDisplay] = await Promise
    .all([
      fetch("effects-master.json"),
      fetch("default-user-config.json"),
      chrome.storage.local.get(USER_SCORE_CONFIG_KEY),
      chrome.storage.session.get(ARTIFACT_DISPLAY_STATE_KEY),
    ]);

  if (!masterResponse.ok) {
    throw new Error(
      ui.locale === "en"
        ? `Could not load the effect master: ${masterResponse.status}`
        : `効果マスタを読み込めませんでした: ${masterResponse.status}`,
    );
  }
  if (!defaultResponse.ok) {
    throw new Error(
      ui.locale === "en"
        ? `Could not load the default settings: ${defaultResponse.status}`
        : `標準設定を読み込めませんでした: ${defaultResponse.status}`,
    );
  }

  const master = await masterResponse.json();
  state.localization = createMasterLocalization(
    master,
    chrome.i18n.getUILanguage(),
  );
  state.effects = state.localization.effects;
  state.attributes = state.localization.attributes;
  state.weaponTypes = state.localization.weaponTypes;
  state.effectByName = state.localization.effectByName;
  const defaultValue = await defaultResponse.json();
  const configContext = {
    effectByName: state.effectByName,
    attributes: state.attributes,
    weaponTypes: state.weaponTypes,
  };

  const storedConfig = stored[USER_SCORE_CONFIG_KEY];
  const resolvedConfig = resolveUserConfig(
    storedConfig,
    defaultValue,
    configContext,
  );
  state.defaultConfig = resolvedConfig.defaultConfig;
  state.config = resolvedConfig.config;
  state.artifactDisplayState = normalizeArtifactDisplayState(
    storedDisplay[ARTIFACT_DISPLAY_STATE_KEY],
  ) ?? { items: [] };
  if (resolvedConfig.recoveryError) {
    console.error(resolvedConfig.recoveryError);
    initializationWarning =
      "保存済み設定が不正なため、ゲーム画面と設定画面の両方で標準設定を使用します。JSONの再読み込みまたは標準設定への復元ができます。";
    initializationWarningIsError = true;
  } else if (resolvedConfig.removedZeroScoreCount > 0) {
    await chrome.storage.local.set({
      [USER_SCORE_CONFIG_KEY]: structuredClone(state.config),
    });
    initializationWarning = ui.locale === "en"
      ? `Removed ${resolvedConfig.removedZeroScoreCount} zero-point settings.`
      : `${resolvedConfig.removedZeroScoreCount}件の0点設定を削除しました。`;
  }

  state.config = sortConfig(state.config, state.effectByName);
  renderArtifactDisplay();
  renderScoreHighlightSettings();
  elements.unmatchedScore.value = state.config.unmatchedScore;
  elements.favoriteBonus.value = state.config.favoriteBonus ?? 0;
  renderEffectOptions();
  renderQualityOptions();
  renderScopeOptions(elements.attributeOptions, state.attributes);
  renderScopeOptions(elements.weaponTypeOptions, state.weaponTypes);
  renderRules();
  resetCombinationForm();
  renderCombinations();
  bindEvents();
  if (initializationWarning) {
    showStatus(initializationWarning, initializationWarningIsError);
  }
}

function bindEvents() {
  elements.toggleRuleForm.addEventListener("click", toggleRuleForm);
  elements.ruleSearch.addEventListener("input", renderRules);
  elements.ruleSearch.addEventListener("keydown", handleRuleSearchKeydown);
  elements.groupSelect.addEventListener("change", () => {
    renderEffectOptions();
    renderQualityOptions();
  });
  elements.effectSelect.addEventListener(
    "change",
    () => renderQualityOptions(),
  );
  elements.attributeOptions.addEventListener("change", handleScopeChange);
  elements.weaponTypeOptions.addEventListener("change", handleScopeChange);
  elements.ruleForm.addEventListener("submit", handleRuleSubmit);
  elements.ruleForm.addEventListener("input", clearRuleFormMessage);
  elements.ruleForm.addEventListener("change", clearRuleFormMessage);
  elements.cancelEdit.addEventListener("click", resetRuleForm);
  elements.rulesBody.addEventListener("click", handleRuleAction);
  elements.rulesBody.addEventListener("change", handleInlineScoreChange);
  elements.rulesBody.addEventListener("keydown", handleInlineScoreKeydown);
  elements.toggleCombinationForm.addEventListener(
    "click",
    toggleCombinationForm,
  );
  elements.combinationEffect1.addEventListener(
    "change",
    () =>
      renderCombinationQualityOptions(
        elements.combinationEffect1,
        elements.combinationQuality1,
      ),
  );
  elements.combinationEffect2.addEventListener(
    "change",
    () =>
      renderCombinationQualityOptions(
        elements.combinationEffect2,
        elements.combinationQuality2,
      ),
  );
  elements.combinationAttributeOptions.addEventListener(
    "change",
    handleScopeChange,
  );
  elements.combinationWeaponTypeOptions.addEventListener(
    "change",
    handleScopeChange,
  );
  elements.combinationForm.addEventListener(
    "submit",
    handleCombinationSubmit,
  );
  elements.combinationForm.addEventListener(
    "input",
    clearCombinationFormMessage,
  );
  elements.combinationForm.addEventListener(
    "change",
    clearCombinationFormMessage,
  );
  elements.cancelCombinationEdit.addEventListener(
    "click",
    resetCombinationForm,
  );
  elements.combinationBody.addEventListener(
    "click",
    handleCombinationAction,
  );
  elements.combinationBody.addEventListener(
    "change",
    handleInlineCombinationScoreChange,
  );
  elements.combinationBody.addEventListener(
    "keydown",
    handleInlineCombinationScoreKeydown,
  );
  elements.enableScoreHighlight.addEventListener(
    "change",
    handleScoreHighlightToggle,
  );
  [elements.highScoreThreshold, elements.lowScoreThreshold].forEach((input) => {
    input.addEventListener("input", () => {
      clearScoreHighlightMessage();
      renderScoreHighlightPreview();
    });
    input.addEventListener("change", handleScoreHighlightThresholdChange);
  });
  elements.unmatchedScore.addEventListener(
    "change",
    handleUnmatchedScoreChange,
  );
  elements.favoriteBonus.addEventListener(
    "change",
    handleFavoriteBonusChange,
  );
  elements.exportJson.addEventListener("click", exportJson);
  elements.importJson.addEventListener("change", importJson);
  elements.resetDefaultConfig.addEventListener("click", restoreDefaultConfig);
  elements.clearScoreRules.addEventListener("click", clearScoreRules);
}

function toggleRuleForm() {
  if (!elements.rulePanel.hidden) {
    resetRuleForm();
    return;
  }

  resetCombinationForm();
  resetRuleForm({ collapse: false });
  elements.effectSelect.focus({ preventScroll: true });
}

function setRulePanelOpen(open) {
  elements.rulePanel.hidden = !open;
  elements.toggleRuleForm.setAttribute("aria-expanded", String(open));
  elements.toggleRuleForm.textContent = open
    ? state.editKey === null ? "追加フォームを閉じる" : "編集フォームを閉じる"
    : "＋ 採点ルールを追加";
}

function handleRuleSearchKeydown(event) {
  if (event.key !== "Escape" || !elements.ruleSearch.value) return;
  elements.ruleSearch.value = "";
  renderRules();
}

function toggleCombinationForm() {
  if (!elements.combinationPanel.hidden) {
    resetCombinationForm();
    return;
  }

  resetRuleForm();
  resetCombinationForm({ collapse: false });
  elements.combinationEffect1.focus({ preventScroll: true });
}

function setCombinationPanelOpen(open) {
  elements.combinationPanel.hidden = !open;
  elements.toggleCombinationForm.setAttribute("aria-expanded", String(open));
  elements.toggleCombinationForm.textContent = open
    ? state.combinationEditKey === null
      ? "追加フォームを閉じる"
      : "編集フォームを閉じる"
    : "＋ ボーナスを追加";
}

function renderEffectOptions(selectedEffect) {
  const group = Number(elements.groupSelect.value) || null;
  const candidates = group
    ? state.effects.filter((effect) => effect.skillGroup === group)
    : state.effects;

  elements.effectSelect.replaceChildren();

  if (group) {
    candidates.forEach((effect) => {
      elements.effectSelect.append(
        createOption(effect.name, effect.displayName),
      );
    });
  } else {
    [1, 2, 3].forEach((skillGroup) => {
      const optionGroup = document.createElement("optgroup");
      optionGroup.label = `グループ${toRomanNumeral(skillGroup)}`;
      candidates
        .filter((effect) => effect.skillGroup === skillGroup)
        .forEach((effect) => {
          optionGroup.append(createOption(effect.name, effect.displayName));
        });
      elements.effectSelect.append(optionGroup);
    });
  }

  if (selectedEffect && state.effectByName.has(selectedEffect)) {
    elements.effectSelect.value = selectedEffect;
  }
}

function renderQualityOptions(selectedRule) {
  renderQualitySelect(
    elements.effectSelect,
    elements.qualitySelect,
    selectedRule,
    true,
  );
}

function renderCombinationEffectOptions(select, selectedEffect) {
  select.replaceChildren();
  [1, 2, 3].forEach((skillGroup) => {
    const optionGroup = document.createElement("optgroup");
    optionGroup.label = `グループ${toRomanNumeral(skillGroup)}`;
    state.effects
      .filter((effect) => effect.skillGroup === skillGroup)
      .forEach((effect) => {
        optionGroup.append(createOption(effect.name, effect.displayName));
      });
    select.append(optionGroup);
  });

  if (selectedEffect && state.effectByName.has(selectedEffect)) {
    select.value = selectedEffect;
  }
}

function renderCombinationQualityOptions(
  effectSelect,
  qualitySelect,
  selectedQuality,
) {
  renderQualitySelect(effectSelect, qualitySelect, selectedQuality, false);
}

function renderQualitySelect(
  effectSelect,
  qualitySelect,
  selectedCondition,
  allowRanges,
) {
  const effect = state.effectByName.get(effectSelect.value);
  qualitySelect.replaceChildren();

  if (!effect) {
    qualitySelect.disabled = true;
    return;
  }

  if (effect.qualities.length === 1) {
    qualitySelect.append(createOption("", "固定"));
    qualitySelect.disabled = true;
    return;
  }

  qualitySelect.append(createOption("", "全て（一律）"));
  if (allowRanges) {
    const exactGroup = document.createElement("optgroup");
    exactGroup.label = "個別指定";
    effect.qualities.forEach((quality) => {
      exactGroup.append(createOption(`exact:${quality}`, `Q${quality}`));
    });
    const rangeGroup = document.createElement("optgroup");
    rangeGroup.label = "範囲指定";
    const rangeBoundaries = effect.qualities.slice(1, -1);
    rangeBoundaries.forEach((quality) => {
      rangeGroup.append(
        createOption(`min:${quality}`, `Q${quality}以上`),
      );
    });
    rangeBoundaries.forEach((quality) => {
      rangeGroup.append(
        createOption(`max:${quality}`, `Q${quality}以下`),
      );
    });
    qualitySelect.append(exactGroup, rangeGroup);
  } else {
    effect.qualities.forEach((quality) => {
      qualitySelect.append(createOption(String(quality), `Q${quality}`));
    });
  }
  qualitySelect.disabled = false;

  if (allowRanges) {
    qualitySelect.value = getQualitySelectValue(selectedCondition);
  } else if (selectedCondition !== undefined && selectedCondition !== null) {
    qualitySelect.value = String(selectedCondition);
  } else {
    qualitySelect.value = "";
  }
}

function getQualitySelectValue(rule) {
  if (rule?.quality !== undefined) return `exact:${rule.quality}`;
  if (rule?.qualityMin !== undefined) return `min:${rule.qualityMin}`;
  if (rule?.qualityMax !== undefined) return `max:${rule.qualityMax}`;
  return "";
}

function parseQualitySelectValue(value) {
  if (!value) return {};
  const [type, rawQuality] = value.split(":");
  const quality = Number(rawQuality);
  if (type === "exact") return { quality };
  if (type === "min") return { qualityMin: quality };
  if (type === "max") return { qualityMax: quality };
  return {};
}

function renderScopeOptions(container, choices, selectedValues) {
  const selected = new Set(selectedValues ?? []);
  container.replaceChildren(
    createScopeOption("全て", "", selected.size === 0, true),
    ...choices.map((choice) =>
      createScopeOption(getScopeLabel(choice), choice, selected.has(choice))
    ),
  );
}

function createScopeOption(label, value, checked, isAll = false) {
  const wrapper = document.createElement("label");
  wrapper.className = "scope-option";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = value;
  input.checked = checked;
  if (isAll) input.dataset.all = "true";

  const text = document.createElement("span");
  text.textContent = label;
  wrapper.append(input, text);
  return wrapper;
}

function handleScopeChange(event) {
  const changed = event.target.closest('input[type="checkbox"]');
  if (!changed) return;

  const container = event.currentTarget;
  const allOption = container.querySelector('input[data-all="true"]');
  const specificOptions = [
    ...container.querySelectorAll('input:not([data-all="true"])'),
  ];

  if (changed === allOption && changed.checked) {
    specificOptions.forEach((option) => {
      option.checked = false;
    });
    return;
  }

  if (changed !== allOption && changed.checked) {
    allOption.checked = false;
  }

  if (!specificOptions.some((option) => option.checked)) {
    allOption.checked = true;
  }
}

function getSelectedScopeValues(container) {
  const specificOptions = [
    ...container.querySelectorAll('input:not([data-all="true"])'),
  ];
  const selectedValues = [
    ...container.querySelectorAll('input:not([data-all="true"]):checked'),
  ].map((option) => option.value);
  return selectedValues.length === specificOptions.length ? [] : selectedValues;
}

async function handleRuleSubmit(event) {
  event.preventDefault();
  clearRuleFormMessage();
  const effect = state.effectByName.get(elements.effectSelect.value);
  const score = Number(elements.scoreInput.value);

  if (!effect) {
    showRuleFormError("効果を選択してください。");
    return;
  }
  if (!Number.isFinite(score)) {
    showRuleFormError("スコアには数値を入力してください。");
    return;
  }
  if (score === 0) {
    showRuleFormError("スコアには0以外の数値を入力してください。");
    return;
  }

  const qualityCondition = parseQualitySelectValue(
    elements.qualitySelect.value,
  );
  const quality = qualityCondition.quality;

  const selectedQuality = quality ?? qualityCondition.qualityMin ??
    qualityCondition.qualityMax;
  if (
    selectedQuality !== undefined &&
    !effect.qualities.includes(selectedQuality)
  ) {
    showRuleFormError("この効果では選択できないクオリティです。");
    return;
  }

  const attributes = getSelectedScopeValues(elements.attributeOptions);
  const weaponTypes = getSelectedScopeValues(elements.weaponTypeOptions);
  const comment = elements.commentInput.value.trim();
  const rule = createRule(
    effect.name,
    quality,
    attributes,
    weaponTypes,
    score,
    comment,
    qualityCondition,
  );
  const editingKey = state.editKey;
  const copySourceKey = state.ruleCopySourceKey;
  const result = await commitConfig(
    (config) =>
      copySourceKey === null
        ? upsertRule(config, rule, editingKey, state.effectByName)
        : copyRule(config, rule, copySourceKey, state.effectByName),
    "採点ルールを保存できませんでした",
  );
  if (!result) return;
  if (result.status === "conflict") {
    showRuleFormError(
      copySourceKey === null
        ? "同じ条件の採点ルールが既にあります。条件を変更するか、一覧にある既存の採点ルールを編集してください。"
        : "コピー元または別の採点ルールと同じ条件です。効果・クオリティ・属性・武器種のいずれかを変更してください。",
    );
    return;
  }
  if (result.status === "missing") {
    showRuleFormError(
      copySourceKey === null
        ? "編集中の採点ルールが見つかりません。一覧から選び直してください。"
        : "コピー元の採点ルールが見つかりません。一覧からコピーし直してください。",
    );
    renderRules();
    return;
  }

  if (state.editKey === editingKey) resetRuleForm();
  else renderRules();
  showStatus(
    result.status === "copied"
      ? "コピーした内容を新しい採点ルールとして追加しました。"
      : result.status === "overwritten"
      ? "同じ条件の既存の採点ルールを上書きしました。"
      : "採点ルールを保存しました。変更は開いている一覧にも反映されます。",
  );
}

async function handleRuleAction(event) {
  const button = event.target.closest("button[data-rule-key]");
  if (!button) return;

  const ruleKey = decodeKey(button.dataset.ruleKey);
  const rule = state.config.rules.find((candidate) =>
    getRuleKey(candidate) === ruleKey
  );
  if (!rule) return;

  if (button.dataset.action === "delete") {
    if (
      !globalThis.confirm(
        ui.locale === "en"
          ? `Delete ${
            formatLocalizedRuleSummary(rule)
          }?\nThis action cannot be undone.`
          : `${
            formatLocalizedRuleSummary(rule)
          }を削除しますか？\nこの操作は元に戻せません。`,
      )
    ) {
      return;
    }

    const result = await commitConfig(
      (config) => deleteRule(config, ruleKey, state.effectByName),
      "採点ルールを削除できませんでした",
    );
    if (!result) return;
    if (result.status === "missing") {
      renderRules();
      showStatus("削除する採点ルールが見つかりませんでした。", true);
      return;
    }
    if (
      state.editKey === ruleKey ||
      state.ruleCopySourceKey === ruleKey
    ) {
      resetRuleForm();
    } else {
      renderRules();
    }
    showStatus("採点ルールを削除しました。");
    return;
  }

  if (button.dataset.action === "copy") {
    resetCombinationForm();
    resetRuleForm({ collapse: false });
    state.ruleCopySourceKey = ruleKey;
    elements.ruleFormDescription.textContent =
      "コピーした内容を新しい採点ルールとして追加します。効果または条件を変更してください。";
    elements.cancelEdit.hidden = false;
    populateRuleForm(rule);
    elements.ruleForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.effectSelect.focus({ preventScroll: true });
    showStatus(
      ui.locale === "en"
        ? `Copied the ${getEffectLabel(rule.effect)} settings to the add form.`
        : `${rule.effect}の設定を追加フォームへコピーしました。`,
    );
    return;
  }

  resetCombinationForm();
  state.ruleCopySourceKey = null;
  state.editKey = ruleKey;
  clearRuleFormMessage();
  setRulePanelOpen(true);
  elements.rulePanel.classList.add("editing");
  elements.ruleFormTitle.textContent = "採点ルールを編集";
  elements.ruleFormDescription.textContent =
    "選択中の採点ルールを変更しています。保存するか、編集をやめてください。";
  elements.editIndicator.hidden = false;
  populateRuleForm(rule);
  elements.submitRule.textContent = "変更を保存";
  elements.cancelEdit.textContent = "編集をやめる";
  elements.cancelEdit.hidden = false;
  renderRules();
  elements.ruleForm.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.scoreInput.focus({ preventScroll: true });
  elements.scoreInput.select();
}

function populateRuleForm(rule) {
  const effect = state.effectByName.get(rule.effect);
  elements.groupSelect.value = String(effect.skillGroup);
  renderEffectOptions(rule.effect);
  renderQualityOptions(rule);
  renderScopeOptions(
    elements.attributeOptions,
    state.attributes,
    rule.attributes,
  );
  renderScopeOptions(
    elements.weaponTypeOptions,
    state.weaponTypes,
    rule.weaponTypes,
  );
  elements.commentInput.value = rule.comment ?? "";
  elements.scoreInput.value = rule.score;
}

async function handleCombinationSubmit(event) {
  event.preventDefault();
  clearCombinationFormMessage();

  const effect1 = state.effectByName.get(elements.combinationEffect1.value);
  const effect2 = state.effectByName.get(elements.combinationEffect2.value);
  if (!effect1 || !effect2) {
    showCombinationFormError("効果を2つ選択してください。");
    return;
  }
  if (effect1.name === effect2.name) {
    showCombinationFormError("異なる効果を2つ選択してください。");
    return;
  }

  const quality1 = getSelectedQuality(elements.combinationQuality1);
  const quality2 = getSelectedQuality(elements.combinationQuality2);
  if (quality1 !== undefined && !effect1.qualities.includes(quality1)) {
    showCombinationFormError("効果1では選択できないクオリティです。");
    return;
  }
  if (quality2 !== undefined && !effect2.qualities.includes(quality2)) {
    showCombinationFormError("効果2では選択できないクオリティです。");
    return;
  }

  const score = Number(elements.combinationScore.value);
  if (!Number.isFinite(score)) {
    showCombinationFormError("加算スコアには数値を入力してください。");
    return;
  }
  if (score === 0) {
    showCombinationFormError("加算スコアには0以外の数値を入力してください。");
    return;
  }

  const effects = [
    createEffectRequirement(effect1.name, quality1),
    createEffectRequirement(effect2.name, quality2),
  ];
  const rule = createCombinationRule(
    effects,
    getSelectedScopeValues(elements.combinationAttributeOptions),
    getSelectedScopeValues(elements.combinationWeaponTypeOptions),
    score,
    elements.combinationComment.value.trim(),
  );
  const editingKey = state.combinationEditKey;
  const copySourceKey = state.combinationCopySourceKey;
  const result = await commitConfig(
    (config) =>
      copySourceKey === null
        ? upsertCombinationRule(
          config,
          rule,
          editingKey,
          state.effectByName,
        )
        : copyCombinationRule(
          config,
          rule,
          copySourceKey,
          state.effectByName,
        ),
    "組み合わせボーナスを保存できませんでした",
  );
  if (!result) return;
  if (result.status === "conflict") {
    showCombinationFormError(
      copySourceKey === null
        ? "同じ条件の組み合わせボーナスが既にあります。条件を変更するか、一覧にある既存ボーナスを編集してください。"
        : "コピー元または別の組み合わせボーナスと同じ条件です。効果・クオリティ・属性・武器種のいずれかを変更してください。",
    );
    return;
  }
  if (result.status === "missing") {
    showCombinationFormError(
      copySourceKey === null
        ? "編集中の組み合わせボーナスが見つかりません。一覧から選び直してください。"
        : "コピー元の組み合わせボーナスが見つかりません。一覧からコピーし直してください。",
    );
    renderCombinations();
    return;
  }

  if (state.combinationEditKey === editingKey) resetCombinationForm();
  else renderCombinations();
  showStatus(
    result.status === "copied"
      ? "コピーした内容を新しい組み合わせボーナスとして追加しました。"
      : result.status === "overwritten"
      ? "同じ条件の組み合わせボーナスを上書きしました。"
      : "組み合わせボーナスを保存しました。",
  );
}

async function handleCombinationAction(event) {
  const button = event.target.closest("button[data-combination-key]");
  if (!button) return;

  const ruleKey = decodeKey(button.dataset.combinationKey);
  const rule = state.config.combinationRules?.find((candidate) =>
    getCombinationRuleKey(candidate) === ruleKey
  );
  if (!rule) return;

  if (button.dataset.action === "delete") {
    if (
      !globalThis.confirm(
        ui.locale === "en"
          ? `Delete ${
            formatLocalizedCombinationSummary(rule)
          }?\nThis action cannot be undone.`
          : `${
            formatLocalizedCombinationSummary(rule)
          }を削除しますか？\nこの操作は元に戻せません。`,
      )
    ) {
      return;
    }

    const result = await commitConfig(
      (config) => deleteCombinationRule(config, ruleKey, state.effectByName),
      "組み合わせボーナスを削除できませんでした",
    );
    if (!result) return;
    if (result.status === "missing") {
      renderCombinations();
      showStatus("削除する組み合わせボーナスが見つかりませんでした。", true);
      return;
    }
    if (
      state.combinationEditKey === ruleKey ||
      state.combinationCopySourceKey === ruleKey
    ) {
      resetCombinationForm();
    } else {
      renderCombinations();
    }
    showStatus("組み合わせボーナスを削除しました。");
    return;
  }

  if (button.dataset.action === "copy") {
    resetRuleForm();
    resetCombinationForm({ collapse: false });
    state.combinationCopySourceKey = ruleKey;
    elements.combinationFormDescription.textContent =
      "コピーした内容を新しい組み合わせボーナスとして追加します。効果または条件を変更してください。";
    elements.cancelCombinationEdit.hidden = false;
    populateCombinationForm(rule);
    elements.combinationForm.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    elements.combinationEffect1.focus({ preventScroll: true });
    showStatus("組み合わせボーナスを追加フォームへコピーしました。");
    return;
  }

  resetRuleForm();
  state.combinationCopySourceKey = null;
  state.combinationEditKey = ruleKey;
  clearCombinationFormMessage();
  setCombinationPanelOpen(true);
  elements.combinationPanel.classList.add("editing");
  elements.combinationFormTitle.textContent = "組み合わせボーナスを編集";
  elements.combinationFormDescription.textContent =
    "選択中のボーナスを変更しています。保存するか、編集をやめてください。";
  elements.combinationEditIndicator.hidden = false;
  populateCombinationForm(rule);
  elements.submitCombination.textContent = "変更を保存";
  elements.cancelCombinationEdit.textContent = "編集をやめる";
  elements.cancelCombinationEdit.hidden = false;
  renderCombinations();
  elements.combinationForm.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  elements.combinationScore.focus({ preventScroll: true });
  elements.combinationScore.select();
}

function populateCombinationForm(rule) {
  renderCombinationEffectOptions(
    elements.combinationEffect1,
    rule.effects[0].effect,
  );
  renderCombinationEffectOptions(
    elements.combinationEffect2,
    rule.effects[1].effect,
  );
  renderCombinationQualityOptions(
    elements.combinationEffect1,
    elements.combinationQuality1,
    rule.effects[0].quality,
  );
  renderCombinationQualityOptions(
    elements.combinationEffect2,
    elements.combinationQuality2,
    rule.effects[1].quality,
  );
  renderScopeOptions(
    elements.combinationAttributeOptions,
    state.attributes,
    rule.attributes,
  );
  renderScopeOptions(
    elements.combinationWeaponTypeOptions,
    state.weaponTypes,
    rule.weaponTypes,
  );
  elements.combinationScore.value = rule.score;
  elements.combinationComment.value = rule.comment ?? "";
}

function getSelectedQuality(select) {
  return select.value === "" ? undefined : Number(select.value);
}

function createEffectRequirement(effect, quality) {
  const requirement = { effect };
  if (quality !== undefined) requirement.quality = quality;
  return requirement;
}

async function handleUnmatchedScoreChange() {
  const score = Number(elements.unmatchedScore.value);
  if (!Number.isFinite(score)) {
    elements.unmatchedScore.value = state.config.unmatchedScore;
    showStatus("unmatchedScoreには数値を入力してください。", true);
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: { ...config, unmatchedScore: score },
    }),
    "ルール未設定時のスコアを保存できませんでした",
  );
  if (!result) {
    elements.unmatchedScore.value = state.config.unmatchedScore;
    return;
  }
  showStatus("ルール未設定時のスコアを保存しました。");
}

async function handleFavoriteBonusChange() {
  const score = Number(elements.favoriteBonus.value);
  if (!Number.isFinite(score)) {
    elements.favoriteBonus.value = state.config.favoriteBonus ?? 0;
    showStatus("お気に入りの加算スコアには数値を入力してください。", true);
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: withFavoriteBonus(config, score),
    }),
    "お気に入りの加算スコアを保存できませんでした",
  );
  if (!result) {
    elements.favoriteBonus.value = state.config.favoriteBonus ?? 0;
    return;
  }
  showStatus("お気に入りの加算スコアを保存しました。");
}

function withFavoriteBonus(config, score) {
  const nextConfig = { ...config };
  if (score === 0) delete nextConfig.favoriteBonus;
  else nextConfig.favoriteBonus = score;
  return nextConfig;
}

async function handleScoreHighlightToggle() {
  const enabled = elements.enableScoreHighlight.checked;
  setScoreHighlightControlsEnabled(enabled);

  if (enabled) {
    await saveScoreHighlightSettings();
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: withScoreHighlight(config, undefined),
    }),
    "3段階表示の設定を保存できませんでした",
  );
  if (!result) {
    renderScoreHighlightSettings();
    return;
  }
  clearScoreHighlightMessage();
  renderArtifactDisplay();
  showStatus("スコアの3段階表示を無効にしました。");
}

async function handleScoreHighlightThresholdChange() {
  if (!elements.enableScoreHighlight.checked) return;
  await saveScoreHighlightSettings();
}

async function saveScoreHighlightSettings() {
  const highValue = elements.highScoreThreshold.value.trim();
  const lowValue = elements.lowScoreThreshold.value.trim();
  const highThreshold = Number(highValue);
  const lowThreshold = Number(lowValue);

  if (
    highValue === "" ||
    lowValue === "" ||
    !Number.isFinite(highThreshold) ||
    !Number.isFinite(lowThreshold)
  ) {
    showScoreHighlightError("高スコアと低スコアには数値を入力してください。");
    return;
  }

  const scoreHighlight = normalizeScoreHighlight({
    highThreshold,
    lowThreshold,
  });
  if (!scoreHighlight) {
    showScoreHighlightError(
      "高スコアのしきい値は、低スコアのしきい値より大きくしてください。",
    );
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: withScoreHighlight(config, scoreHighlight),
    }),
    "3段階表示の設定を保存できませんでした",
  );
  if (!result) {
    renderScoreHighlightSettings();
    return;
  }
  clearScoreHighlightMessage();
  renderScoreHighlightPreview();
  renderArtifactDisplay();
  showStatus("スコアの3段階表示を保存しました。");
}

function renderScoreHighlightSettings() {
  const scoreHighlight = state.config.scoreHighlight;
  const enabled = scoreHighlight !== undefined;
  elements.enableScoreHighlight.checked = enabled;
  elements.highScoreThreshold.value = String(
    scoreHighlight?.highThreshold ?? DEFAULT_SCORE_HIGHLIGHT.highThreshold,
  );
  elements.lowScoreThreshold.value = String(
    scoreHighlight?.lowThreshold ?? DEFAULT_SCORE_HIGHLIGHT.lowThreshold,
  );
  setScoreHighlightControlsEnabled(enabled);
  clearScoreHighlightMessage();
  renderScoreHighlightPreview();
}

function setScoreHighlightControlsEnabled(enabled) {
  elements.scoreHighlightControls.hidden = !enabled;
  elements.highScoreThreshold.disabled = !enabled;
  elements.lowScoreThreshold.disabled = !enabled;
}

function renderScoreHighlightPreview() {
  const highThreshold = parsePreviewScore(elements.highScoreThreshold.value);
  const lowThreshold = parsePreviewScore(elements.lowScoreThreshold.value);
  elements.highScorePreview.textContent = formatPreviewScore(highThreshold);
  elements.lowScorePreview.textContent = formatPreviewScore(lowThreshold);
  elements.normalScorePreview.textContent = Number.isFinite(highThreshold) &&
      Number.isFinite(lowThreshold)
    ? formatPreviewScore((highThreshold + lowThreshold) / 2)
    : "—";
}

function parsePreviewScore(value) {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function formatPreviewScore(score) {
  if (!Number.isFinite(score)) return "—";
  return String(Number(score.toFixed(2)));
}

function withScoreHighlight(config, scoreHighlight) {
  const nextConfig = { ...config };
  if (scoreHighlight) nextConfig.scoreHighlight = { ...scoreHighlight };
  else delete nextConfig.scoreHighlight;
  return nextConfig;
}

function showScoreHighlightError(message) {
  elements.scoreHighlightMessage.textContent = ui.translateText(message);
  elements.scoreHighlightMessage.hidden = false;
}

function clearScoreHighlightMessage() {
  elements.scoreHighlightMessage.textContent = "";
  elements.scoreHighlightMessage.hidden = true;
}

async function handleInlineScoreChange(event) {
  const input = event.target.closest("input[data-rule-score-key]");
  if (!input) return;

  const ruleKey = decodeKey(input.dataset.ruleScoreKey);
  const rule = state.config.rules.find((candidate) =>
    getRuleKey(candidate) === ruleKey
  );
  if (!rule) return;

  const score = Number(input.value);
  if (!Number.isFinite(score) || score === 0) {
    input.value = rule.score;
    showInlineScoreFeedback(input, true);
    showStatus("スコアには0以外の数値を入力してください。", true);
    input.focus();
    input.select();
    return;
  }
  if (score === rule.score) return;

  const result = await commitConfig(
    (config) => updateRuleScore(config, ruleKey, score, state.effectByName),
    "スコアを保存できませんでした",
  );
  if (!result || result.status === "missing") {
    const currentRule = state.config.rules.find((candidate) =>
      getRuleKey(candidate) === ruleKey
    );
    if (currentRule) input.value = currentRule.score;
    showInlineScoreFeedback(input, true);
    return;
  }
  if (
    state.editKey === ruleKey ||
    state.ruleCopySourceKey === ruleKey
  ) {
    elements.scoreInput.value = score;
  }
  showInlineScoreFeedback(input, false);
  showStatus(
    ui.locale === "en"
      ? `Saved the score for ${getEffectLabel(rule.effect)}.`
      : `${rule.effect}のスコアを保存しました。`,
  );
}

function handleInlineScoreKeydown(event) {
  handleQuickScoreKeydown(
    event,
    "ruleScoreKey",
    (key) => state.config.rules.find((rule) => getRuleKey(rule) === key),
  );
}

function renderRules() {
  elements.rulesBody.replaceChildren();
  const searchQuery = elements.ruleSearch.value.trim();
  const visibleRules = state.config.rules
    .filter((rule) =>
      matchesRuleSearch(rule, searchQuery, state.effectByName) ||
      matchesLocalizedRuleSearch(rule, searchQuery)
    );

  elements.ruleCount.textContent = searchQuery
    ? `${visibleRules.length} / ${state.config.rules.length}件`
    : `${state.config.rules.length}件`;
  elements.emptyRules.hidden = visibleRules.length > 0;
  elements.emptyRules.textContent = state.config.rules.length === 0
    ? "採点ルールはまだありません。「採点ルールを追加」から登録してください。"
    : "検索条件に一致する採点ルールはありません。";

  visibleRules.forEach((rule) => {
    const effect = state.effectByName.get(rule.effect);
    const ruleKey = getRuleKey(rule);
    const row = document.createElement("tr");
    if (ruleKey === state.editKey) {
      row.classList.add("editing-row");
      row.setAttribute("aria-current", "true");
    }
    row.append(
      createCell(toRomanNumeral(effect.skillGroup), "group-cell"),
      createCell(getEffectLabel(rule.effect), "effect-cell"),
      createConditionsCell(rule),
      createScoreCell(rule, ruleKey),
      createActionCell(ruleKey),
    );
    elements.rulesBody.append(row);
  });
}

function matchesLocalizedRuleSearch(rule, searchQuery) {
  const query = searchQuery.toLocaleLowerCase(ui.locale);
  if (!query) return true;
  return [
    getEffectLabel(rule.effect),
    formatLocalizedRuleQualityCondition(rule),
    ...(rule.attributes ?? []).map(getAttributeLabel),
    ...(rule.weaponTypes ?? []).map(getWeaponTypeLabel),
  ].some((value) => value.toLocaleLowerCase(ui.locale).includes(query));
}

function resetRuleForm({ collapse = true } = {}) {
  state.editKey = null;
  state.ruleCopySourceKey = null;
  clearRuleFormMessage();
  setRulePanelOpen(!collapse);
  elements.rulePanel.classList.remove("editing");
  elements.ruleFormTitle.textContent = "採点ルールを追加";
  elements.ruleFormDescription.textContent =
    "条件を指定しない項目は「全て」に適用されます。同じ条件を追加すると、既存の採点ルールを上書きします。";
  elements.editIndicator.hidden = true;
  elements.submitRule.textContent = "追加する";
  elements.cancelEdit.textContent = "閉じる";
  elements.cancelEdit.hidden = collapse;
  elements.commentInput.value = "";
  elements.scoreInput.value = "";
  renderEffectOptions();
  renderQualityOptions();
  renderScopeOptions(elements.attributeOptions, state.attributes);
  renderScopeOptions(elements.weaponTypeOptions, state.weaponTypes);
  renderRules();
}

function showRuleFormError(message) {
  elements.ruleFormMessage.textContent = ui.translateText(message);
  elements.ruleFormMessage.hidden = false;
}

function clearRuleFormMessage() {
  elements.ruleFormMessage.textContent = "";
  elements.ruleFormMessage.hidden = true;
}

function resetCombinationForm({ collapse = true } = {}) {
  state.combinationEditKey = null;
  state.combinationCopySourceKey = null;
  clearCombinationFormMessage();
  setCombinationPanelOpen(!collapse);
  elements.combinationPanel.classList.remove("editing");
  elements.combinationFormTitle.textContent = "組み合わせボーナスを追加";
  elements.combinationFormDescription.textContent =
    "2つの効果と、それぞれのクオリティを指定します。同じ条件を追加すると既存ボーナスを上書きします。";
  elements.combinationEditIndicator.hidden = true;
  elements.submitCombination.textContent = "追加する";
  elements.cancelCombinationEdit.textContent = "閉じる";
  elements.cancelCombinationEdit.hidden = collapse;
  elements.combinationScore.value = "";
  elements.combinationComment.value = "";

  renderCombinationEffectOptions(elements.combinationEffect1);
  renderCombinationEffectOptions(
    elements.combinationEffect2,
    state.effects[1]?.name,
  );
  renderCombinationQualityOptions(
    elements.combinationEffect1,
    elements.combinationQuality1,
  );
  renderCombinationQualityOptions(
    elements.combinationEffect2,
    elements.combinationQuality2,
  );
  renderScopeOptions(
    elements.combinationAttributeOptions,
    state.attributes,
  );
  renderScopeOptions(
    elements.combinationWeaponTypeOptions,
    state.weaponTypes,
  );
  renderCombinations();
}

function showCombinationFormError(message) {
  elements.combinationFormMessage.textContent = ui.translateText(message);
  elements.combinationFormMessage.hidden = false;
}

function clearCombinationFormMessage() {
  elements.combinationFormMessage.textContent = "";
  elements.combinationFormMessage.hidden = true;
}

function renderCombinations() {
  const combinationRules = state.config.combinationRules ?? [];
  elements.combinationBody.replaceChildren();
  elements.combinationCount.textContent = `${combinationRules.length}件`;
  elements.emptyCombinations.hidden = combinationRules.length > 0;

  combinationRules.forEach((rule) => {
    const ruleKey = getCombinationRuleKey(rule);
    const row = document.createElement("tr");
    if (ruleKey === state.combinationEditKey) {
      row.classList.add("editing-row");
      row.setAttribute("aria-current", "true");
    }
    row.append(
      createCombinationEffectsCell(rule),
      createConditionsCell(rule),
      createCombinationScoreCell(rule, ruleKey),
      createCombinationActionCell(ruleKey),
    );
    elements.combinationBody.append(row);
  });
}

function createCombinationEffectsCell(rule) {
  const cell = document.createElement("td");
  cell.className = "combination-effects-cell";
  const list = document.createElement("div");
  list.className = "combination-effect-list";

  rule.effects.forEach((requirement, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "combination-separator";
      separator.textContent = "＋";
      list.append(separator);
    }
    const item = document.createElement("span");
    item.className = "combination-effect-item";
    item.textContent = formatLocalizedEffectRequirement(requirement);
    list.append(item);
  });
  cell.append(list);
  return cell;
}

function createCombinationScoreCell(rule, ruleKey) {
  return createQuickScoreCell(
    rule.score,
    "combinationScoreKey",
    ruleKey,
    ui.locale === "en"
      ? `Bonus score for ${
        rule.effects.map(formatLocalizedEffectRequirement).join(" and ")
      }`
      : `${rule.effects.map(formatEffectRequirement).join("と")}の加算スコア`,
  );
}

function createCombinationActionCell(ruleKey) {
  return createRowActionCell("combinationKey", ruleKey);
}

async function handleInlineCombinationScoreChange(event) {
  const input = event.target.closest("input[data-combination-score-key]");
  if (!input) return;

  const ruleKey = decodeKey(input.dataset.combinationScoreKey);
  const rule = state.config.combinationRules?.find((candidate) =>
    getCombinationRuleKey(candidate) === ruleKey
  );
  if (!rule) return;

  const score = Number(input.value);
  if (!Number.isFinite(score) || score === 0) {
    input.value = rule.score;
    showInlineScoreFeedback(input, true);
    showStatus("加算スコアには0以外の数値を入力してください。", true);
    input.focus();
    input.select();
    return;
  }
  if (score === rule.score) return;

  const result = await commitConfig(
    (config) =>
      updateCombinationRuleScore(
        config,
        ruleKey,
        score,
        state.effectByName,
      ),
    "組み合わせボーナスのスコアを保存できませんでした",
  );
  if (!result || result.status === "missing") {
    const currentRule = state.config.combinationRules?.find((candidate) =>
      getCombinationRuleKey(candidate) === ruleKey
    );
    if (currentRule) input.value = currentRule.score;
    showInlineScoreFeedback(input, true);
    return;
  }
  if (
    state.combinationEditKey === ruleKey ||
    state.combinationCopySourceKey === ruleKey
  ) {
    elements.combinationScore.value = score;
  }
  showInlineScoreFeedback(input, false);
  showStatus("組み合わせボーナスのスコアを保存しました。");
}

function handleInlineCombinationScoreKeydown(event) {
  handleQuickScoreKeydown(
    event,
    "combinationScoreKey",
    (key) =>
      state.config.combinationRules?.find((rule) =>
        getCombinationRuleKey(rule) === key
      ),
  );
}

async function commitConfig(createUpdate, failureMessage) {
  const operation = configWriteQueue.then(async () => {
    const update = createUpdate(state.config);
    if (update.status === "conflict" || update.status === "missing") {
      return update;
    }

    const nextConfig = structuredClone(update.config);
    await chrome.storage.local.set({
      [USER_SCORE_CONFIG_KEY]: nextConfig,
    });
    state.config = nextConfig;
    return { ...update, config: nextConfig };
  });
  configWriteQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  try {
    return await operation;
  } catch (error) {
    console.error(error);
    showStatus(`${ui.translateText(failureMessage)}: ${error.message}`, true);
    return null;
  }
}

function exportJson() {
  const exportedConfig = localizeConfig(state.config, state.localization);
  const blob = new Blob([`${JSON.stringify(exportedConfig, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "gbf-artifact-scorer-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
  showStatus("ユーザー設定を書き出しました。");
}

async function importJson(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;

  try {
    const importedValue = canonicalizeConfig(
      JSON.parse(await file.text()),
      state.localization,
    );
    const imported = validateUserConfig(importedValue, {
      effectByName: state.effectByName,
      attributes: state.attributes,
      weaponTypes: state.weaponTypes,
    });
    if (!confirmImportReplacement(imported)) return;

    const result = await commitConfig(
      () => ({
        status: "updated",
        config: sortConfig(imported, state.effectByName),
      }),
      "JSONから設定を保存できませんでした",
    );
    if (!result) return;
    refreshConfigScreen();
    showStatus("JSONからユーザー設定を読み込みました。");
  } catch (error) {
    showStatus(
      ui.locale === "en"
        ? `Could not import JSON: ${error.message}`
        : `JSONを読み込めませんでした: ${error.message}`,
      true,
    );
  }
}

function confirmImportReplacement(imported) {
  const currentCombinationCount = state.config.combinationRules?.length ?? 0;
  const importedCombinationCount = imported.combinationRules?.length ?? 0;
  const message = ui.locale === "en"
    ? [
      "Replace the current settings with the imported JSON settings?",
      "",
      `Scoring rules: ${state.config.rules.length} → ${imported.rules.length}`,
      `Combination bonuses: ${currentCombinationCount} → ${importedCombinationCount}`,
      "",
      "Display settings, the score without a matching rule, and the favorite bonus will also be replaced.",
      "This action cannot be undone.",
    ]
    : [
      "JSONの設定で現在の設定を置き換えますか？",
      "",
      `採点ルール: ${state.config.rules.length}件 → ${imported.rules.length}件`,
      `組み合わせボーナス: ${currentCombinationCount}件 → ${importedCombinationCount}件`,
      "",
      "表示設定、ルール未設定時のスコア、お気に入り加点も置き換わります。",
      "この操作は元に戻せません。",
    ];
  return globalThis.confirm(message.join("\n"));
}

async function restoreDefaultConfig() {
  if (
    !globalThis.confirm(
      ui.locale === "en"
        ? "Discard the current scoring rules and restore the bundled defaults?\nDisplay settings will be kept."
        : "現在の採点ルールを破棄して、同梱の標準設定に戻しますか？\n表示設定は保持されます。",
    )
  ) {
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: sortConfig(
        restoreDefaultScoreSettings(config, state.defaultConfig),
        state.effectByName,
      ),
    }),
    "標準設定を保存できませんでした",
  );
  if (!result) return;
  refreshConfigScreen();
  showStatus("表示設定を保持して、採点ルールを標準設定に戻しました。");
}

async function clearScoreRules() {
  if (
    !globalThis.confirm(
      ui.locale === "en"
        ? "Delete all effect scoring rules and combination bonuses?\nDisplay settings will be kept."
        : "効果ごとの採点ルールと組み合わせボーナスを全て削除しますか？\n表示設定は保持されます。",
    )
  ) {
    return;
  }

  const result = await commitConfig(
    (config) => ({
      status: "updated",
      config: createClearedScoreConfig(config),
    }),
    "採点ルールを削除できませんでした",
  );
  if (!result) return;
  refreshConfigScreen();
  showStatus("採点ルールを全て削除しました。全効果を0点で表示します。");
}

function refreshConfigScreen() {
  renderScoreHighlightSettings();
  elements.unmatchedScore.value = state.config.unmatchedScore;
  elements.favoriteBonus.value = state.config.favoriteBonus ?? 0;
  resetRuleForm();
  resetCombinationForm();
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function createCell(text, className) {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function createScoreCell(rule, ruleKey) {
  return createQuickScoreCell(
    rule.score,
    "ruleScoreKey",
    ruleKey,
    `${getEffectLabel(rule.effect)}のスコア`,
  );
}

function createQuickScoreCell(score, keyDataAttribute, key, label) {
  const cell = document.createElement("td");
  cell.className = "score-cell";

  const control = document.createElement("div");
  control.className = "quick-score-control";

  const input = document.createElement("input");
  input.className = "quick-score-input";
  input.type = "number";
  input.step = "any";
  input.value = score;
  input.dataset[keyDataAttribute] = encodeKey(key);
  input.setAttribute("aria-label", label);
  input.title = "Enterまたはフォーカスを外すと保存されます";

  const status = document.createElement("span");
  status.className = "quick-score-status";
  status.setAttribute("aria-live", "polite");
  control.append(input, status);
  cell.append(control);
  return cell;
}

function handleQuickScoreKeydown(event, keyDataAttribute, findRule) {
  const input = event.target.closest(
    `input[data-${toKebabCase(keyDataAttribute)}]`,
  );
  if (!input) return;

  if (event.key === "Enter") {
    event.preventDefault();
    input.blur();
    return;
  }
  if (event.key === "Escape") {
    const rule = findRule(decodeKey(input.dataset[keyDataAttribute]));
    if (rule) input.value = rule.score;
    input.blur();
  }
}

function showInlineScoreFeedback(input, isError) {
  const status = input.parentElement.querySelector(".quick-score-status");
  const previousTimer = inlineScoreFeedbackTimers.get(input);
  if (previousTimer) clearTimeout(previousTimer);

  input.classList.toggle("saved", !isError);
  input.classList.toggle("invalid", isError);
  status.textContent = isError ? "!" : "✓";
  status.setAttribute(
    "aria-label",
    isError ? "保存できませんでした" : "保存しました",
  );

  const timer = setTimeout(() => {
    input.classList.remove("saved", "invalid");
    status.textContent = "";
    status.removeAttribute("aria-label");
    inlineScoreFeedbackTimers.delete(input);
  }, 1400);
  inlineScoreFeedbackTimers.set(input, timer);
}

function createConditionsCell(rule) {
  const cell = document.createElement("td");
  cell.className = "conditions-cell";

  const conditions = document.createElement("div");
  conditions.className = "condition-list";
  const conditionItems = [];
  const qualityCondition = formatLocalizedRuleQualityCondition(rule);
  if (qualityCondition) {
    conditionItems.push(createConditionItem("Q", qualityCondition.slice(1)));
  }
  if (rule.attributes?.length) {
    conditionItems.push(
      createConditionItem(
        "属性",
        rule.attributes.map(getAttributeLabel).join("・"),
      ),
    );
  }
  if (rule.weaponTypes?.length) {
    conditionItems.push(
      createConditionItem(
        "武器種",
        rule.weaponTypes.map(getWeaponTypeLabel).join("・"),
      ),
    );
  }
  if (conditionItems.length > 0) {
    conditions.append(...conditionItems);
  } else {
    const empty = document.createElement("span");
    empty.className = "condition-empty";
    empty.textContent = "指定なし";
    conditions.append(empty);
  }
  cell.append(conditions);

  if (rule.comment) {
    const comment = document.createElement("p");
    comment.className = "rule-comment";
    comment.textContent = rule.comment;
    cell.append(comment);
  }

  return cell;
}

function createConditionItem(label, value) {
  const item = document.createElement("span");
  item.className = "condition-item";

  const labelElement = document.createElement("span");
  labelElement.className = "condition-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.textContent = value;
  item.append(labelElement, valueElement);
  return item;
}

function getEffectLabel(effectName) {
  return state.localization?.effectLabels.get(effectName) ?? effectName;
}

function formatLocalizedEffectRequirement(requirement) {
  const name = getEffectLabel(requirement.effect);
  return requirement.quality === undefined
    ? name
    : `${name} Q${requirement.quality}`;
}

function formatLocalizedRuleSummary(rule) {
  if (ui.locale !== "en") return formatRuleSummary(rule);
  const conditions = [];
  const qualityCondition = formatLocalizedRuleQualityCondition(rule);
  if (qualityCondition) conditions.push(qualityCondition);
  if (rule.attributes?.length) {
    conditions.push(
      `Element ${rule.attributes.map(getAttributeLabel).join(" / ")}`,
    );
  }
  if (rule.weaponTypes?.length) {
    conditions.push(
      `Weapon Type ${rule.weaponTypes.map(getWeaponTypeLabel).join(" / ")}`,
    );
  }
  return `“${getEffectLabel(rule.effect)}” (${
    conditions.join("; ") || "No conditions"
  }, score ${rule.score})`;
}

function formatLocalizedRuleQualityCondition(rule) {
  if (ui.locale !== "en") return formatRuleQualityCondition(rule);
  if (rule.quality !== undefined) return `Q${rule.quality}`;
  if (rule.qualityMin !== undefined) return `Q${rule.qualityMin} or higher`;
  if (rule.qualityMax !== undefined) return `Q${rule.qualityMax} or lower`;
  return "";
}

function formatLocalizedCombinationSummary(rule) {
  if (ui.locale !== "en") return formatCombinationSummary(rule);
  const effects = rule.effects.map(formatLocalizedEffectRequirement).join(
    " + ",
  );
  const conditions = [];
  if (rule.attributes?.length) {
    conditions.push(
      `Element ${rule.attributes.map(getAttributeLabel).join(" / ")}`,
    );
  }
  if (rule.weaponTypes?.length) {
    conditions.push(
      `Weapon Type ${rule.weaponTypes.map(getWeaponTypeLabel).join(" / ")}`,
    );
  }
  return `“${effects}” (${
    conditions.join("; ") || "No conditions"
  }, bonus score ${rule.score})`;
}

function getAttributeLabel(attribute) {
  return state.localization?.attributeLabels.get(attribute) ?? attribute;
}

function getWeaponTypeLabel(weaponType) {
  return state.localization?.weaponTypeLabels.get(weaponType) ?? weaponType;
}

function getScopeLabel(value) {
  return getAttributeLabel(value) !== value
    ? getAttributeLabel(value)
    : getWeaponTypeLabel(value);
}

function createActionCell(ruleKey) {
  return createRowActionCell("ruleKey", ruleKey);
}

function createRowActionCell(keyDataAttribute, key) {
  const cell = document.createElement("td");
  cell.className = "action-cell";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(
    createRowButton("編集", "edit", keyDataAttribute, key),
    createRowButton("コピー", "copy", keyDataAttribute, key),
    createRowButton("削除", "delete", keyDataAttribute, key, "delete"),
  );
  cell.append(actions);
  return cell;
}

function createRowButton(
  label,
  action,
  keyDataAttribute,
  key,
  extraClass = "",
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-button ${extraClass}`.trim();
  button.dataset.action = action;
  button.dataset[keyDataAttribute] = encodeKey(key);
  button.textContent = label;
  return button;
}

function encodeKey(key) {
  return encodeURIComponent(key);
}

function decodeKey(key) {
  return decodeURIComponent(key);
}

function toKebabCase(value) {
  return value.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function showStatus(message, isError = false) {
  elements.statusMessage.textContent = ui.translateText(message);
  elements.statusMessage.classList.toggle("error", isError);
}
