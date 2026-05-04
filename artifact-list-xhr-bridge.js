(function installArtifactListXhrBridge() {
  const INSTALLATION_FLAG = Symbol.for(
    "gbf-artifact-scorer.artifact-list-xhr-bridge",
  );
  if (globalThis[INSTALLATION_FLAG]) return;

  Object.defineProperty(globalThis, INSTALLATION_FLAG, {
    configurable: false,
    value: true,
  });

  const requestInfo = new WeakMap();
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (_method, url) {
    const normalizedUrl = normalizeUrl(url);
    requestInfo.set(this, {
      url: normalizedUrl,
      isArtifactList: isArtifactListUrl(normalizedUrl),
    });
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    const info = requestInfo.get(this);
    if (info?.isArtifactList) {
      this.addEventListener(
        "loadend",
        () => postArtifactListResponse(this, info),
        { once: true },
      );
    }
    return originalSend.apply(this, arguments);
  };

  function normalizeUrl(url) {
    try {
      return new URL(String(url), globalThis.location.href).href;
    } catch {
      return String(url ?? "");
    }
  }

  function isArtifactListUrl(url) {
    try {
      return new URL(url).pathname.includes("/rest/artifact/list/");
    } catch {
      return url.includes("/rest/artifact/list/");
    }
  }

  function postArtifactListResponse(request, info) {
    const status = Number(request.status);
    if (!Number.isFinite(status) || status < 200 || status >= 300) return;

    const response = readJsonResponse(request);
    if (!isRecord(response) || !Array.isArray(response.list)) return;

    globalThis.postMessage(
      {
        type: "artifact_list",
        url: info.url,
        status,
        response,
      },
      globalThis.location.origin,
    );
  }

  function readJsonResponse(request) {
    try {
      if (request.responseType === "json") return request.response;
      if (request.responseType === "" || request.responseType === "text") {
        return JSON.parse(request.responseText);
      }
    } catch {
      // 通信先の応答がJSONでない場合は、ゲーム側の処理を妨げず無視する。
    }
    return undefined;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
})();
