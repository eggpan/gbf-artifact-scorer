import { deepStrictEqual, equal } from "node:assert/strict";
import "../core/artifact-list-core.js";

const {
  MAX_ARTIFACT_DISPLAY_ITEMS,
  createArtifactDisplayItems,
  isArtifactDisplayMessage,
  isArtifactListMessage,
  isArtifactListResponse,
  isRecord,
  normalizeArtifactDisplayState,
  normalizeArtifactId,
  pairArtifactsWithItems,
} = globalThis.GbfArtifactListCore;

const getItemId = (item) => item.id;

Deno.test("アーティファクト一覧のメッセージ形式を検証する", () => {
  const response = { list: [{ id: 1 }, { id: 2 }] };
  equal(isArtifactListResponse(response), true);
  equal(
    isArtifactListMessage({ type: "artifact_list", response }),
    true,
  );
  equal(isArtifactListMessage({ type: "other", response }), false);
  equal(isArtifactListMessage({ type: "artifact_list", response: {} }), false);
  equal(isArtifactListResponse({ list: [null] }), false);
  equal(isArtifactListResponse({ list: [[]] }), false);
  equal(isRecord({}), true);
  equal(isRecord([]), false);
});

Deno.test("DOMの順序が違ってもIDで対応付ける", () => {
  const artifacts = [{ id: 2 }, { id: 1 }];
  const items = [{ id: "1", label: "one" }, { id: "2", label: "two" }];

  const pairs = pairArtifactsWithItems(artifacts, items, getItemId);

  deepStrictEqual(
    pairs.map(({ artifact, item }) => [artifact.id, item.label]),
    [[2, "two"], [1, "one"]],
  );
});

Deno.test("利用可能な別名のIDフィールドも照合する", () => {
  const artifacts = [
    { id: "種類A", artifact_id: 10 },
    { id: "種類B", artifact_id: 20 },
  ];
  const items = [{ id: "20" }, { id: "10" }, { id: "30" }];

  const pairs = pairArtifactsWithItems(artifacts, items, getItemId);

  deepStrictEqual(
    pairs.map(({ artifact, item }) => [artifact.artifact_id, item.id]),
    [[10, "10"], [20, "20"]],
  );
});

Deno.test("IDが使えない場合だけ同じ件数を順番で対応付ける", () => {
  const artifacts = [{ name: "A" }, { name: "B" }];
  const items = [{ id: "1" }, { id: "2" }];

  deepStrictEqual(
    pairArtifactsWithItems(artifacts, items, getItemId).map(
      ({ artifact, item }) => [artifact.name, item.id],
    ),
    [["A", "1"], ["B", "2"]],
  );
  deepStrictEqual(
    pairArtifactsWithItems(artifacts, items.slice(0, 1), getItemId),
    [],
  );
});

Deno.test("完全なIDが食い違う場合は順番で誤対応しない", () => {
  const artifacts = [{ id: 10 }, { id: 20 }];
  const items = [{ id: "30" }, { id: "40" }];

  deepStrictEqual(pairArtifactsWithItems(artifacts, items, getItemId), []);
  equal(normalizeArtifactId(" 10 "), "10");
  equal(normalizeArtifactId(20), "20");
  equal(normalizeArtifactId(null), undefined);
});

Deno.test("不完全または重複したIDでは安全な対応だけを返す", () => {
  deepStrictEqual(pairArtifactsWithItems(undefined, [], getItemId), []);
  deepStrictEqual(pairArtifactsWithItems([], [], getItemId), []);

  const artifactsWithoutIds = [{ name: "A" }, { name: "B" }];
  const itemsWithoutIds = [{ label: "one" }, { label: "two" }];
  deepStrictEqual(
    pairArtifactsWithItems(artifactsWithoutIds, itemsWithoutIds),
    [
      { artifact: artifactsWithoutIds[0], item: itemsWithoutIds[0] },
      { artifact: artifactsWithoutIds[1], item: itemsWithoutIds[1] },
    ],
  );

  const duplicateItems = [{ id: 1 }, { id: 1 }];
  deepStrictEqual(
    pairArtifactsWithItems(artifactsWithoutIds, duplicateItems, getItemId),
    [
      { artifact: artifactsWithoutIds[0], item: duplicateItems[0] },
      { artifact: artifactsWithoutIds[1], item: duplicateItems[1] },
    ],
  );

  const duplicateArtifacts = [{ id: 1 }, { id: 1 }];
  deepStrictEqual(
    pairArtifactsWithItems(
      duplicateArtifacts,
      [{ id: 1 }, { id: 2 }],
      getItemId,
    ),
    [],
  );
});

Deno.test("設定画面用データをゲーム画面の並び順で最大20件作る", () => {
  const items = Array.from(
    { length: MAX_ARTIFACT_DISPLAY_ITEMS + 1 },
    (_, index) => ({ id: String(index + 1) }),
  );
  const artifacts = items.toReversed().map((item) => ({
    id: Number(item.id),
    score: Number(item.id) * 2,
  }));

  const displayItems = createArtifactDisplayItems(
    artifacts,
    items,
    getItemId,
    (artifact) => ({ score: artifact.score }),
  );

  equal(displayItems.length, MAX_ARTIFACT_DISPLAY_ITEMS);
  deepStrictEqual(displayItems[0], { position: 1, score: 2 });
  deepStrictEqual(displayItems.at(-1), { position: 20, score: 40 });
});

Deno.test("設定画面用の表示状態を検証して正規化する", () => {
  const state = normalizeArtifactDisplayState({
    items: [
      {
        position: "2",
        score: "5",
        tier: "high",
        details: ["攻撃力：+5", 10],
        favorite: true,
        unnecessary: "yes",
      },
      { position: 1, score: null },
      { position: 2, score: 99 },
      { position: 21, score: 1 },
    ],
    selectedPosition: "2",
  });

  deepStrictEqual(state, {
    items: [
      { position: 1, score: null },
      {
        position: 2,
        score: 5,
        details: ["攻撃力：+5"],
        favorite: true,
      },
    ],
    selectedPosition: 2,
  });
  equal(
    isArtifactDisplayMessage({ type: "artifact_display_state", state }),
    true,
  );
  equal(isArtifactDisplayMessage({ type: "artifact_display_state" }), false);
});

Deno.test("選択位置がない場合は表示中の先頭アイテムを選択する", () => {
  deepStrictEqual(
    normalizeArtifactDisplayState({
      items: [
        { position: 3, score: 8 },
        { position: 1, score: 2 },
      ],
      selectedPosition: 20,
    }),
    {
      items: [
        { position: 1, score: 2 },
        { position: 3, score: 8 },
      ],
      selectedPosition: 1,
    },
  );
});
