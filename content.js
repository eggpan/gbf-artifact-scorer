const USER_SCORE_CONFIG_KEY = "userScoreConfig";
const ARTIFACT_LIST_ITEM_SELECTOR =
  ".prt-artifact-list-body > li.prt-artifact-list-item";
const {
  calculateArtifactScoreDetails,
  createActiveScoreConfig,
  createTooltipLines,
  normalizeArtifactValue,
} = globalThis.GbfArtifactScoreCore;
const { resolveUserConfig } = globalThis.GbfArtifactScoreConfigCore;
const {
  createArtifactDisplayItems,
  isArtifactListMessage,
  isArtifactListResponse,
  isRecord,
} = globalThis.GbfArtifactListCore;

let packagedDefaultUserConfig = { unmatchedScore: 0, rules: [] };
let scoreConfigContext = { attributes: [], weaponTypes: [] };
let activeScoreConfig = createActiveScoreConfig(
  undefined,
  scoreConfigContext,
);
let effectDefinitions = new Map();
let lastArtifactListResponse;
let scheduledArtifactPublish;

const configPromise = Promise.all([
  loadExtensionJson("default-user-config.json", "標準設定"),
  loadExtensionJson("effects-master.json", "効果マスタ"),
  chrome.storage.local.get(USER_SCORE_CONFIG_KEY),
])
  .then(([loadedDefaultUserConfig, effectsMaster, stored]) => {
    packagedDefaultUserConfig = loadedDefaultUserConfig;
    scoreConfigContext = createScoreConfigContext(effectsMaster);
    effectDefinitions = createEffectDefinitions(effectsMaster);
    applyStoredUserConfig(stored[USER_SCORE_CONFIG_KEY]);
  })
  .catch((error) => {
    console.error(error);
    activeScoreConfig = createActiveScoreConfig(
      undefined,
      scoreConfigContext,
    );
  });

const artifactListObserver = new MutationObserver((mutations) => {
  if (
    lastArtifactListResponse &&
    mutations.some(mutationTouchesArtifactList)
  ) {
    scheduleArtifactDisplayPublish();
  }
});
artifactListObserver.observe(document, {
  attributes: true,
  attributeFilter: ["class"],
  childList: true,
  subtree: true,
});

globalThis.addEventListener("message", async (event) => {
  if (
    event.source !== globalThis ||
    event.origin !== globalThis.location.origin ||
    !isArtifactListMessage(event.data)
  ) {
    return;
  }

  await configPromise;
  lastArtifactListResponse = event.data.response;
  publishArtifactDisplayState(lastArtifactListResponse, activeScoreConfig);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[USER_SCORE_CONFIG_KEY]) return;

  configPromise.then(() => {
    applyStoredUserConfig(changes[USER_SCORE_CONFIG_KEY].newValue);
    if (lastArtifactListResponse) {
      publishArtifactDisplayState(lastArtifactListResponse, activeScoreConfig);
    }
  });
});

async function loadExtensionJson(filename, label) {
  const response = await fetch(chrome.runtime.getURL(filename));
  if (!response.ok) {
    throw new Error(`${label}を読み込めませんでした: ${response.status}`);
  }
  return response.json();
}

function createScoreConfigContext(effectsMaster) {
  return {
    attributes: Array.isArray(effectsMaster?.attributes)
      ? effectsMaster.attributes
      : [],
    weaponTypes: Array.isArray(effectsMaster?.weaponTypes)
      ? effectsMaster.weaponTypes
      : [],
  };
}

function createEffectDefinitions(effectsMaster) {
  const effects = Array.isArray(effectsMaster?.effects)
    ? effectsMaster.effects
    : [];
  return new Map(
    effects.flatMap((effect) =>
      isRecord(effect) && typeof effect.name === "string"
        ? [[effect.name, effect]]
        : []
    ),
  );
}

function applyStoredUserConfig(storedValue) {
  const resolved = resolveUserConfig(storedValue, packagedDefaultUserConfig, {
    ...scoreConfigContext,
    effectByName: effectDefinitions,
  });
  if (resolved.recoveryError) console.error(resolved.recoveryError);
  activeScoreConfig = createActiveScoreConfig(
    resolved.config,
    scoreConfigContext,
  );
}

function publishArtifactDisplayState(response, scoreConfig) {
  if (!chrome.runtime?.id || !isArtifactListResponse(response)) return;

  const listItems = [...document.querySelectorAll(ARTIFACT_LIST_ITEM_SELECTOR)];
  const displayItems = createArtifactDisplayItems(
    response.list,
    listItems,
    (listItem) => listItem.dataset.id,
    (artifact, listItem) => createDisplayItem(artifact, listItem, scoreConfig),
  );
  if (response.list.length > 0 && displayItems.length === 0) return;

  const state = { items: displayItems };
  const activePosition = listItems.findIndex((item) =>
    item.classList.contains("active")
  );
  const selectedPosition = activePosition >= 0
    ? activePosition + 1
    : displayItems[0]?.position;
  if (displayItems.some((item) => item.position === selectedPosition)) {
    state.selectedPosition = selectedPosition;
  }

  try {
    chrome.runtime.sendMessage({
      type: "artifact_display_state",
      state,
    }).catch((error) => {
      console.error("設定画面へスコアを送信できませんでした。", error);
    });
  } catch (error) {
    console.error("設定画面へスコアを送信できませんでした。", error);
  }
}

function createDisplayItem(artifact, listItem, scoreConfig) {
  const itemInfo = listItem.querySelector(".prt-artifact-list-item-info");
  const favorite = itemInfo?.classList.contains("favorite") === true;
  const scoreDetails = calculateArtifactScoreDetails(
    artifact,
    scoreConfig,
    getArtifactScope(artifact, listItem),
    effectDefinitions,
    { favorite },
  );
  const isPendingScore = String(artifact.rarity) === "4";
  const displayItem = {
    score: isPendingScore ? null : scoreDetails.total,
    details: createTooltipLines(scoreDetails, isPendingScore),
  };
  if (favorite) displayItem.favorite = true;
  if (itemInfo?.classList.contains("unnecessary")) {
    displayItem.unnecessary = true;
  }
  return displayItem;
}

function mutationTouchesArtifactList(mutation) {
  const target = mutation.target;
  if (target instanceof Element && target.closest(".prt-artifact-list-body")) {
    return true;
  }

  return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
    if (!(node instanceof Element)) return false;
    return (
      node.matches(".prt-artifact-list-page, .prt-artifact-list-body") ||
      Boolean(
        node.querySelector(".prt-artifact-list-page, .prt-artifact-list-body"),
      )
    );
  });
}

function scheduleArtifactDisplayPublish() {
  if (scheduledArtifactPublish !== undefined) return;

  scheduledArtifactPublish = globalThis.requestAnimationFrame(() => {
    scheduledArtifactPublish = undefined;
    if (!lastArtifactListResponse) return;
    publishArtifactDisplayState(lastArtifactListResponse, activeScoreConfig);
  });
}

function getArtifactScope(artifact, artifactListItem) {
  const attributeFromIcon = getCodeFromIcon(
    artifactListItem.querySelector('.img-icon-attr[src*="icn_type_"]'),
    /icn_type_(\d+)/,
  );
  const weaponTypeFromIcon = getCodeFromIcon(
    artifactListItem.querySelector('.img-icon-kind[src*="icn_weapon_"]'),
    /icn_weapon_(\d+)/,
  );

  return {
    attribute: normalizeArtifactValue(
      attributeFromIcon ??
        artifact.attribute ??
        artifact.attribute_id ??
        artifact.attributeId ??
        artifact.element ??
        artifact.type,
      scoreConfigContext.attributes,
    ),
    weaponType: normalizeArtifactValue(
      weaponTypeFromIcon ??
        artifact.weapon_type ??
        artifact.weaponType ??
        artifact.weapon_kind ??
        artifact.weaponKind ??
        artifact.kind,
      scoreConfigContext.weaponTypes,
    ),
  };
}

function getCodeFromIcon(image, pattern) {
  return image?.src.match(pattern)?.[1];
}
