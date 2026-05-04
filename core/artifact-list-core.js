(function defineArtifactListCore(globalObject) {
  const ARTIFACT_ID_FIELDS = ["id", "artifact_id", "artifactId"];
  const MAX_ARTIFACT_DISPLAY_ITEMS = 20;

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isArtifactListResponse(response) {
    return isRecord(response) &&
      Array.isArray(response.list) &&
      response.list.every(isRecord);
  }

  function isArtifactListMessage(data) {
    return isRecord(data) &&
      data.type === "artifact_list" &&
      isArtifactListResponse(data.response);
  }

  function pairArtifactsWithItems(artifacts, items, getItemId) {
    if (!Array.isArray(artifacts) || !Array.isArray(items)) return [];

    const idPairing = pairArtifactsById(artifacts, items, getItemId);
    if (idPairing.status === "matched") return idPairing.pairs;
    if (idPairing.status === "conflict") return [];

    if (artifacts.length !== items.length) return [];
    return artifacts.map((artifact, index) => ({
      artifact,
      item: items[index],
    }));
  }

  function createArtifactDisplayItems(
    artifacts,
    items,
    getItemId,
    createDisplayItem,
  ) {
    if (typeof createDisplayItem !== "function") return [];

    const allItems = Array.isArray(items) ? items : [];
    const visibleItems = allItems.slice(0, MAX_ARTIFACT_DISPLAY_ITEMS);
    const positions = new Map(
      visibleItems.map((item, index) => [item, index + 1]),
    );

    return pairArtifactsWithItems(artifacts, allItems, getItemId)
      .flatMap(({ artifact, item }) => {
        const position = positions.get(item);
        if (position === undefined) return [];
        const displayItem = createDisplayItem(artifact, item, position);
        return isRecord(displayItem) ? [{ ...displayItem, position }] : [];
      })
      .sort((left, right) => left.position - right.position);
  }

  function normalizeArtifactDisplayState(value) {
    if (!isRecord(value) || !Array.isArray(value.items)) return undefined;

    const positions = new Set();
    const items = value.items.flatMap((item) => {
      if (!isRecord(item)) return [];
      const position = Number(item.position);
      const score = item.score === null ? null : Number(item.score);
      if (
        !Number.isInteger(position) ||
        position < 1 ||
        position > MAX_ARTIFACT_DISPLAY_ITEMS ||
        positions.has(position) ||
        (score !== null && !Number.isFinite(score))
      ) {
        return [];
      }

      positions.add(position);
      const normalized = { position, score };
      if (Array.isArray(item.details)) {
        const details = item.details
          .filter((line) => typeof line === "string")
          .slice(0, 20)
          .map((line) => line.slice(0, 500));
        if (details.length > 0) normalized.details = details;
      }
      if (item.favorite === true) normalized.favorite = true;
      if (item.unnecessary === true) normalized.unnecessary = true;
      return [normalized];
    }).sort((left, right) => left.position - right.position);

    const selectedPosition = Number(value.selectedPosition);
    const normalized = { items };
    if (
      Number.isInteger(selectedPosition) &&
      selectedPosition >= 1 &&
      selectedPosition <= MAX_ARTIFACT_DISPLAY_ITEMS &&
      positions.has(selectedPosition)
    ) {
      normalized.selectedPosition = selectedPosition;
    } else if (items.length > 0) {
      normalized.selectedPosition = items[0].position;
    }
    return normalized;
  }

  function isArtifactDisplayMessage(data) {
    return isRecord(data) &&
      data.type === "artifact_display_state" &&
      normalizeArtifactDisplayState(data.state) !== undefined;
  }

  function pairArtifactsById(artifacts, items, getItemId) {
    if (artifacts.length === 0) {
      return { status: "matched", pairs: [] };
    }
    if (typeof getItemId !== "function") return { status: "unavailable" };

    const itemsById = new Map();
    for (const item of items) {
      const id = normalizeArtifactId(getItemId(item));
      if (id === undefined || itemsById.has(id)) {
        return { status: "unavailable" };
      }
      itemsById.set(id, item);
    }

    let hasCompleteIdField = false;
    for (const field of ARTIFACT_ID_FIELDS) {
      const artifactIds = artifacts.map((artifact) =>
        normalizeArtifactId(artifact?.[field])
      );
      if (artifactIds.some((id) => id === undefined)) continue;
      hasCompleteIdField = true;
      if (new Set(artifactIds).size !== artifactIds.length) continue;

      const pairs = artifactIds.map((id, index) => ({
        artifact: artifacts[index],
        item: itemsById.get(id),
      }));
      if (pairs.every(({ item }) => item !== undefined)) {
        return { status: "matched", pairs };
      }
    }

    return { status: hasCompleteIdField ? "conflict" : "unavailable" };
  }

  function normalizeArtifactId(value) {
    if (typeof value !== "string" && typeof value !== "number") {
      return undefined;
    }
    const id = String(value).trim();
    return id || undefined;
  }

  globalObject.GbfArtifactListCore = Object.freeze({
    MAX_ARTIFACT_DISPLAY_ITEMS,
    createArtifactDisplayItems,
    isArtifactDisplayMessage,
    isArtifactListMessage,
    isArtifactListResponse,
    isRecord,
    normalizeArtifactDisplayState,
    normalizeArtifactId,
    pairArtifactsWithItems,
  });
})(globalThis);
