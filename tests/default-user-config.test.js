import { equal, ok } from "node:assert/strict";
import "../core/score-config-core.js";
import defaultUserConfig from "../default-user-config.json" with {
  type: "json",
};
import effectsMaster from "../effects-master.json" with { type: "json" };

const { validateUserConfig } = globalThis.GbfArtifactScoreConfigCore;

Deno.test("標準設定をユーザー設定として読み込める", () => {
  const config = validateUserConfig(defaultUserConfig, {
    effectByName: new Map(
      effectsMaster.effects.map((effect) => [effect.name, effect]),
    ),
    attributes: effectsMaster.attributes,
    weaponTypes: effectsMaster.weaponTypes,
  });

  equal(config.unmatchedScore, 0);
  equal(config.rules.length, defaultUserConfig.rules.length);
  ok(config.rules.length > 0);
  config.rules.forEach((rule) => {
    ok(Number.isFinite(rule.score));
    ok(rule.score !== 0);
  });
});
