import { deepStrictEqual, equal, ok } from "node:assert/strict";
import effectsMaster from "../effects-master.json" with { type: "json" };

Deno.test("効果マスタの名前・略称・クオリティが有効で重複していない", () => {
  const names = new Set();

  for (const effect of effectsMaster.effects) {
    ok(typeof effect.name === "string" && effect.name.length > 0);
    ok(!names.has(effect.name), `効果名が重複しています: ${effect.name}`);
    names.add(effect.name);

    ok(typeof effect.shortName === "string" && effect.shortName.length > 0);
    ok([1, 2, 3].includes(effect.skillGroup));
    ok(Array.isArray(effect.qualities) && effect.qualities.length > 0);
    equal(new Set(effect.qualities).size, effect.qualities.length);
    effect.qualities.forEach((quality) => {
      ok(Number.isInteger(quality) && quality >= 1 && quality <= 5);
    });
  }
});

Deno.test("属性・武器種マスタに重複がない", () => {
  equal(
    new Set(effectsMaster.attributes).size,
    effectsMaster.attributes.length,
  );
  equal(
    new Set(effectsMaster.weaponTypes).size,
    effectsMaster.weaponTypes.length,
  );
  deepStrictEqual(effectsMaster.attributes, [
    "火",
    "水",
    "土",
    "風",
    "光",
    "闇",
  ]);
});
