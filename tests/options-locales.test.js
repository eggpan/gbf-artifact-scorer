import { equal } from "node:assert/strict";
import "../options-locales.js";

const { createOptionsI18n } = globalThis.GbfArtifactOptionsI18n;

Deno.test("英語UIの固定文言と動的な件数を翻訳する", () => {
  const ui = createOptionsI18n("en-US");

  equal(ui.locale, "en");
  equal(ui.translateText("採点ルール"), "Scoring Rules");
  equal(ui.translateText("20件"), "20 items");
  equal(ui.translateText("3 / 10件"), "3 / 10 items");
  equal(
    ui.translateText("ゲーム画面で2番目を選択中です。"),
    "Item 2 is selected in the game.",
  );
  equal(ui.translateText("Q2以上"), "Q2 or higher");
  equal(ui.translateText("Q4以下"), "Q4 or lower");
  equal(ui.translateText("個別指定"), "Exact");
  equal(ui.translateText("範囲指定"), "Range");
  equal(ui.translateText("グループⅡ"), "Group II");
});

Deno.test("日本語UIでは元の文言を維持する", () => {
  const ui = createOptionsI18n("ja-JP");

  equal(ui.locale, "ja");
  equal(ui.translateText("採点ルール"), "採点ルール");
  equal(ui.translateText("20件"), "20件");
});

Deno.test("英語UIは初期HTMLのplaceholder属性を翻訳する", () => {
  const globalNames = [
    "document",
    "Node",
    "NodeFilter",
    "Element",
    "Document",
    "MutationObserver",
  ];
  const originalDescriptors = new Map(
    globalNames.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );

  class FakeElement {
    constructor(attributes = {}) {
      this.attributes = new Map(Object.entries(attributes));
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    getAttribute(name) {
      return this.attributes.get(name);
    }

    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  }

  const placeholder = new FakeElement({
    placeholder: "効果・コメントを検索",
  });

  class FakeDocument {
    nodeType = 9;
    documentElement = { lang: "ja" };

    createTreeWalker() {
      return { nextNode: () => false };
    }

    querySelectorAll() {
      return [placeholder];
    }
  }

  class FakeMutationObserver {
    observe() {}
  }

  const root = new FakeDocument();
  Object.assign(globalThis, {
    document: root,
    Node: { TEXT_NODE: 3 },
    NodeFilter: { SHOW_TEXT: 4 },
    Element: FakeElement,
    Document: FakeDocument,
    MutationObserver: FakeMutationObserver,
  });

  try {
    createOptionsI18n("en-US").localizeDocument(root);
    equal(
      placeholder.getAttribute("placeholder"),
      "Search effects and comments",
    );
    equal(root.documentElement.lang, "en");
  } finally {
    for (const [name, descriptor] of originalDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
