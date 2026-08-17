import { deepStrictEqual, equal, ok } from "node:assert/strict";
import manifest from "../manifest.json" with { type: "json" };
import englishMessages from "../_locales/en/messages.json" with {
  type: "json",
};
import japaneseMessages from "../_locales/ja/messages.json" with {
  type: "json",
};

Deno.test("拡張機能名・説明・権限を明示する", () => {
  equal(manifest.name, "GBF Artifact Scorer");
  equal(manifest.default_locale, "ja");
  equal(manifest.description, "__MSG_extensionDescription__");
  ok(
    japaneseMessages.extensionDescription.message.includes("自分の基準で採点"),
  );
  ok(
    japaneseMessages.extensionDescription.message.includes(
      "設定画面にスコアを表示",
    ),
  );
  ok(japaneseMessages.extensionDescription.message.includes("非公式"));
  ok(englishMessages.extensionDescription.message.includes("unofficial"));
  equal(manifest.action.default_title, "__MSG_actionTitle__");
  equal(manifest.version, "1.0.1");
  equal(manifest.minimum_chrome_version, "111");
  deepStrictEqual(manifest.permissions, ["storage"]);
});

Deno.test("用途に応じたサイズのアイコンを設定する", () => {
  deepStrictEqual(manifest.icons, {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  });
  deepStrictEqual(manifest.action.default_icon, {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
  });
});

Deno.test("通信監視をMAIN worldで実行しゲームDOMへ要素を追加しない", () => {
  const [bridgeScript, contentScript] = manifest.content_scripts;
  deepStrictEqual(bridgeScript.js, ["artifact-list-xhr-bridge.js"]);
  equal(bridgeScript.world, "MAIN");
  equal(bridgeScript.css, undefined);

  const contentScripts = contentScript.js;
  const localizationCoreIndex = contentScripts.indexOf(
    "core/localization-core.js",
  );
  const configCoreIndex = contentScripts.indexOf("core/score-config-core.js");
  const scoreCoreIndex = contentScripts.indexOf("core/artifact-score-core.js");
  const listCoreIndex = contentScripts.indexOf("core/artifact-list-core.js");
  const contentIndex = contentScripts.indexOf("content.js");

  ok(localizationCoreIndex >= 0);
  ok(configCoreIndex >= 0);
  ok(scoreCoreIndex >= 0);
  ok(listCoreIndex >= 0);
  ok(contentIndex >= 0);
  ok(localizationCoreIndex < configCoreIndex);
  ok(configCoreIndex < scoreCoreIndex);
  ok(scoreCoreIndex < listCoreIndex);
  ok(listCoreIndex < contentIndex);
  equal(contentScript.css, undefined);
});

Deno.test("通信ブリッジと同梱JSONをゲーム画面から読み込める", () => {
  const resources = manifest.web_accessible_resources[0].resources;

  equal(resources.includes("artifact-list-xhr-bridge.js"), false);
  ok(resources.includes("effects-master.json"));
  ok(resources.includes("default-user-config.json"));
});
