importScripts("core/artifact-list-core.js");

const ARTIFACT_DISPLAY_STATE_KEY = "artifactDisplayState";
const {
  isArtifactDisplayMessage,
  normalizeArtifactDisplayState,
} = globalThis.GbfArtifactListCore;

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    !sender.url?.startsWith("https://game.granbluefantasy.jp/") ||
    !isArtifactDisplayMessage(message)
  ) {
    return;
  }

  const state = normalizeArtifactDisplayState(message.state);
  if (!state) return;
  return chrome.storage.session.set({
    [ARTIFACT_DISPLAY_STATE_KEY]: state,
  }).catch((error) => {
    console.error("アーティファクトの表示状態を保存できませんでした。", error);
  });
});
