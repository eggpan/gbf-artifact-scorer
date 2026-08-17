(function defineOptionsLocales(globalObject) {
  const ENGLISH_TEXT = new Map(Object.entries({
    "GBF Artifact Scorer 設定": "GBF Artifact Scorer Settings",
    "自分の基準で採点ルールを作り、設定画面の一覧プレビューで重要度を確認できます。設定はこのブラウザに自動保存されます。":
      "Create scoring rules based on your own criteria and review artifact priorities in the list preview. Your settings are saved automatically in this browser.",
    "アーティファクト採点結果": "Artifact Scores",
    "ゲーム内の一覧を開くと、最大20件のスコアを同じ並び順で表示します。":
      "Open the in-game artifact list to show up to 20 scores in the same order.",
    "ゲーム内でアーティファクト一覧を開いてください。":
      "Open the artifact list in the game.",
    "アーティファクトの採点結果": "Artifact scores",
    "選択中の内訳": "Selected Score Breakdown",
    "未選択": "Nothing selected",
    "ゲーム画面でアーティファクトを選択してください。":
      "Select an artifact in the game.",
    "採点ルールを追加": "Add Scoring Rule",
    "編集中": "Editing",
    "条件を指定しない項目は「全て」に適用されます。同じ条件を追加すると、既存の採点ルールを上書きします。":
      "Fields with no conditions apply to all artifacts. Adding identical conditions overwrites the existing scoring rule.",
    "グループ": "Group",
    "全て": "All",
    "グループⅠ": "Group I",
    "グループⅡ": "Group II",
    "グループⅢ": "Group III",
    "効果": "Effect",
    "クオリティ": "Quality",
    "スコア": "Score",
    "0以外": "Non-zero",
    "属性": "Element",
    "武器種": "Weapon Type",
    "コメント（任意）": "Comment (optional)",
    "例：火属性・剣得意のキャラクター向け":
      "Example: For Fire Sabre-specialty characters",
    "追加する": "Add",
    "編集をやめる": "Stop Editing",
    "採点ルール": "Scoring Rules",
    "効果ごとに、指定項目が多く対象範囲が狭い設定を1件だけ適用します。スコア欄は直接変更できます。":
      "For each effect, only the most specific matching rule is applied. Scores can be edited directly in the table.",
    "採点ルールを検索": "Search scoring rules",
    "効果・コメントを検索": "Search effects and comments",
    "＋ 採点ルールを追加": "+ Add Scoring Rule",
    "条件・コメント": "Conditions / Comment",
    "操作": "Actions",
    "採点ルールはまだありません。「採点ルールを追加」から登録してください。":
      "No scoring rules have been added yet. Use Add Scoring Rule to create one.",
    "組み合わせボーナスを追加": "Add Combination Bonus",
    "2つの効果と、それぞれのクオリティを指定します。同じ条件を追加すると既存ボーナスを上書きします。":
      "Select two effects and their qualities. Adding identical conditions overwrites the existing bonus.",
    "効果1": "Effect 1",
    "クオリティ1": "Quality 1",
    "効果2": "Effect 2",
    "クオリティ2": "Quality 2",
    "加算スコア": "Bonus Score",
    "属性（共通条件）": "Element (shared condition)",
    "武器種（共通条件）": "Weapon Type (shared condition)",
    "例：回復向けの組み合わせ": "Example: Healing-oriented combination",
    "組み合わせボーナス": "Combination Bonuses",
    "一致した組み合わせボーナスは、各効果のスコアへすべて加算します。":
      "Every matching combination bonus is added to the effect scores.",
    "＋ ボーナスを追加": "+ Add Bonus",
    "効果の組み合わせ": "Effect Combination",
    "共通条件・コメント": "Shared Conditions / Comment",
    "組み合わせボーナスはまだありません。「ボーナスを追加」から登録してください。":
      "No combination bonuses have been added yet. Use Add Bonus to create one.",
    "表示設定": "Display Settings",
    "設定画面の一覧プレビューに表示するスコアを調整します。":
      "Configure how scores appear in the list preview.",
    "スコアを高・通常・低の3段階で強調表示する":
      "Highlight scores as high, normal, or low",
    "高スコア": "High Score",
    "低スコア": "Low Score",
    "点以上": "or higher",
    "点以下": "or lower",
    "高": "High",
    "通常": "Normal",
    "低": "Low",
    "3段階表示のプレビュー": "Three-level score preview",
    "お気に入りの加算スコア": "Favorite Bonus Score",
    "お気に入りに登録されたアーティファクトへ1回加算します。":
      "Added once to artifacts marked as favorites.",
    "ルール未設定時のスコア": "Score Without a Matching Rule",
    "採点ルールに一致しない効果へ適用します。":
      "Applied to effects that do not match any scoring rule.",
    "設定データ": "Settings Data",
    "JSONでの移行、標準設定への復元、採点ルールの全削除ができます。":
      "Import or export JSON, restore defaults, or delete all scoring rules.",
    "JSONを書き出す": "Export JSON",
    "JSONを読み込む": "Import JSON",
    "標準設定に戻す": "Restore Defaults",
    "採点ルールを全て削除": "Delete All Scoring Rules",
    "固定": "Fixed",
    "全て（一律）": "All (same score)",
    "個別指定": "Exact",
    "範囲指定": "Range",
    "追加フォームを閉じる": "Close Add Form",
    "編集フォームを閉じる": "Close Edit Form",
    "閉じる": "Close",
    "変更を保存": "Save Changes",
    "採点ルールを編集": "Edit Scoring Rule",
    "組み合わせボーナスを編集": "Edit Combination Bonus",
    "指定なし": "None",
    "編集": "Edit",
    "コピー": "Copy",
    "削除": "Delete",
    "お気に入り": "Favorite",
    "不用品": "Unneeded",
    "採点保留": "Pending",
    "データなし": "No data",
    "加点内訳はありません。": "No score breakdown is available.",
    "ゲーム内のアーティファクト一覧と同期しています。":
      "Synced with the in-game artifact list.",
    "ゲーム画面でアーティファクトをクリックすると、その位置を強調します。":
      "Select an artifact in the game to highlight its position here.",
    "検索条件に一致する採点ルールはありません。":
      "No scoring rules match the search query.",
    "Enterまたはフォーカスを外すと保存されます":
      "Press Enter or move focus away to save",
    "保存できませんでした": "Could not save",
    "保存しました": "Saved",
    "効果を選択してください。": "Select an effect.",
    "スコアには数値を入力してください。": "Enter a numeric score.",
    "スコアには0以外の数値を入力してください。": "Enter a non-zero score.",
    "この効果では選択できないクオリティです。":
      "This quality is not available for the selected effect.",
    "同じ条件の採点ルールが既にあります。条件を変更するか、一覧にある既存の採点ルールを編集してください。":
      "A scoring rule with identical conditions already exists. Change the conditions or edit the existing rule.",
    "コピー元または別の採点ルールと同じ条件です。効果・クオリティ・属性・武器種のいずれかを変更してください。":
      "These conditions match the copied or another scoring rule. Change the effect, quality, element, or weapon type.",
    "編集中の採点ルールが見つかりません。一覧から選び直してください。":
      "The scoring rule being edited could not be found. Select it again from the list.",
    "コピー元の採点ルールが見つかりません。一覧からコピーし直してください。":
      "The copied scoring rule could not be found. Copy it again from the list.",
    "コピーした内容を新しい採点ルールとして追加しました。":
      "Added the copied settings as a new scoring rule.",
    "同じ条件の既存の採点ルールを上書きしました。":
      "Overwrote the existing scoring rule with identical conditions.",
    "採点ルールを保存しました。変更は開いている一覧にも反映されます。":
      "Saved the scoring rule. The open list is updated as well.",
    "削除する採点ルールが見つかりませんでした。":
      "The scoring rule to delete could not be found.",
    "採点ルールを削除しました。": "Deleted the scoring rule.",
    "コピーした内容を新しい採点ルールとして追加します。効果または条件を変更してください。":
      "The copied settings will be added as a new scoring rule. Change the effect or conditions.",
    "選択中の採点ルールを変更しています。保存するか、編集をやめてください。":
      "You are editing the selected scoring rule. Save the changes or stop editing.",
    "効果を2つ選択してください。": "Select two effects.",
    "異なる効果を2つ選択してください。": "Select two different effects.",
    "効果1では選択できないクオリティです。":
      "The selected quality is not available for Effect 1.",
    "効果2では選択できないクオリティです。":
      "The selected quality is not available for Effect 2.",
    "加算スコアには数値を入力してください。": "Enter a numeric bonus score.",
    "加算スコアには0以外の数値を入力してください。":
      "Enter a non-zero bonus score.",
    "同じ条件の組み合わせボーナスが既にあります。条件を変更するか、一覧にある既存ボーナスを編集してください。":
      "A combination bonus with identical conditions already exists. Change the conditions or edit the existing bonus.",
    "コピー元または別の組み合わせボーナスと同じ条件です。効果・クオリティ・属性・武器種のいずれかを変更してください。":
      "These conditions match the copied or another combination bonus. Change an effect, quality, element, or weapon type.",
    "編集中の組み合わせボーナスが見つかりません。一覧から選び直してください。":
      "The combination bonus being edited could not be found. Select it again from the list.",
    "コピー元の組み合わせボーナスが見つかりません。一覧からコピーし直してください。":
      "The copied combination bonus could not be found. Copy it again from the list.",
    "コピーした内容を新しい組み合わせボーナスとして追加しました。":
      "Added the copied settings as a new combination bonus.",
    "同じ条件の組み合わせボーナスを上書きしました。":
      "Overwrote the combination bonus with identical conditions.",
    "組み合わせボーナスを保存しました。": "Saved the combination bonus.",
    "削除する組み合わせボーナスが見つかりませんでした。":
      "The combination bonus to delete could not be found.",
    "組み合わせボーナスを削除しました。": "Deleted the combination bonus.",
    "コピーした内容を新しい組み合わせボーナスとして追加します。効果または条件を変更してください。":
      "The copied settings will be added as a new combination bonus. Change an effect or condition.",
    "組み合わせボーナスを追加フォームへコピーしました。":
      "Copied the combination bonus to the add form.",
    "選択中のボーナスを変更しています。保存するか、編集をやめてください。":
      "You are editing the selected bonus. Save the changes or stop editing.",
    "unmatchedScoreには数値を入力してください。":
      "Enter a numeric unmatchedScore.",
    "ルール未設定時のスコアを保存しました。":
      "Saved the score without a matching rule.",
    "お気に入りの加算スコアには数値を入力してください。":
      "Enter a numeric favorite bonus score.",
    "お気に入りの加算スコアを保存しました。": "Saved the favorite bonus score.",
    "スコアの3段階表示を無効にしました。":
      "Disabled three-level score highlighting.",
    "高スコアと低スコアには数値を入力してください。":
      "Enter numeric high and low score thresholds.",
    "高スコアのしきい値は、低スコアのしきい値より大きくしてください。":
      "The high score threshold must be greater than the low score threshold.",
    "スコアの3段階表示を保存しました。":
      "Saved three-level score highlighting.",
    "組み合わせボーナスのスコアを保存しました。":
      "Saved the combination bonus score.",
    "ユーザー設定を書き出しました。": "Exported user settings.",
    "JSONからユーザー設定を読み込みました。":
      "Imported user settings from JSON.",
    "表示設定を保持して、採点ルールを標準設定に戻しました。":
      "Restored the default scoring rules while keeping display settings.",
    "採点ルールを全て削除しました。全効果を0点で表示します。":
      "Deleted all scoring rules. All effects will be displayed with a score of 0.",
    "採点ルールを保存できませんでした": "Could not save the scoring rule",
    "採点ルールを削除できませんでした": "Could not delete the scoring rule",
    "組み合わせボーナスを保存できませんでした":
      "Could not save the combination bonus",
    "組み合わせボーナスを削除できませんでした":
      "Could not delete the combination bonus",
    "ルール未設定時のスコアを保存できませんでした":
      "Could not save the score without a matching rule",
    "お気に入りの加算スコアを保存できませんでした":
      "Could not save the favorite bonus score",
    "3段階表示の設定を保存できませんでした":
      "Could not save the three-level score highlighting settings",
    "スコアを保存できませんでした": "Could not save the score",
    "組み合わせボーナスのスコアを保存できませんでした":
      "Could not save the combination bonus score",
    "JSONから設定を保存できませんでした":
      "Could not save the settings imported from JSON",
    "標準設定を保存できませんでした": "Could not save the default settings",
    "保存済み設定が不正なため、ゲーム画面と設定画面の両方で標準設定を使用します。JSONの再読み込みまたは標準設定への復元ができます。":
      "The saved settings are invalid, so the default settings are being used for both the game and settings pages. Import JSON again or restore the defaults.",
  }));

  const ENGLISH_MESSAGES = {
    initializationFailed: "Could not initialize the settings page: {message}",
    masterLoadFailed: "Could not load the effect master: {status}",
    defaultLoadFailed: "Could not load the default settings: {status}",
    count: "{count} items",
    filteredCount: "{visible} / {total} items",
    itemPosition: "Item {position}",
    selectedPosition: "Item {position} is selected in the game.",
    itemAriaLabel: "Item {position}, {score}{statuses}{selected}",
    scoreValue: "Score {score}",
    selectedSuffix: ", selected in the game",
    statusSeparator: ", ",
    group: "Group {group}",
    effectScore: "Score for {effect}",
    combinationScore: "Bonus score for {effects}",
    exported: "Exported user settings.",
    imported: "Imported user settings from JSON.",
    importFailed: "Could not import JSON: {message}",
  };

  function createOptionsI18n(locale) {
    const normalizedLocale = String(locale ?? "").toLowerCase().startsWith("en")
      ? "en"
      : "ja";

    function translateText(value) {
      if (normalizedLocale !== "en" || typeof value !== "string") return value;
      const direct = ENGLISH_TEXT.get(value);
      if (direct) return direct;
      return translatePattern(value);
    }

    function message(key, values = {}) {
      const template = normalizedLocale === "en"
        ? ENGLISH_MESSAGES[key]
        : undefined;
      if (!template) return values.fallback ?? key;
      return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
    }

    function localizeDocument(root) {
      if (normalizedLocale !== "en") return;
      document.documentElement.lang = "en";
      translateNode(root);
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(translateNode);
          if (mutation.type === "characterData") translateNode(mutation.target);
        }
      });
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    function translateNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const trimmed = text.trim();
        if (!trimmed) return;
        const translated = translateText(trimmed);
        if (translated !== trimmed) {
          node.textContent = text.replace(trimmed, translated);
        }
        return;
      }
      if (!(node instanceof Element) && !(node instanceof Document)) return;
      if (node instanceof Element) translateAttributes(node);
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) translateNode(walker.currentNode);
      if (node instanceof Element) {
        node.querySelectorAll("[placeholder], [aria-label], [title]").forEach(
          translateAttributes,
        );
      }
    }

    function translateAttributes(element) {
      for (const attribute of ["placeholder", "aria-label", "title"]) {
        if (!element.hasAttribute(attribute)) continue;
        const value = element.getAttribute(attribute);
        const translated = translateText(value);
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    }

    return {
      locale: normalizedLocale,
      localizeDocument,
      message,
      translateText,
    };
  }

  function translatePattern(value) {
    let match = value.match(/^(\d+)件$/);
    if (match) return `${match[1]} items`;
    match = value.match(/^(\d+) \/ (\d+)件$/);
    if (match) return `${match[1]} / ${match[2]} items`;
    match = value.match(/^グループ([ⅠⅡⅢ])$/);
    if (match) return `Group ${match[1]}`;
    match = value.match(/^(\d+)番目$/);
    if (match) return `Item ${match[1]}`;
    match = value.match(/^スコア(-?\d+(?:\.\d+)?)$/);
    if (match) return `Score ${match[1]}`;
    match = value.match(/^ゲーム画面で(\d+)番目を選択中です。$/);
    if (match) return `Item ${match[1]} is selected in the game.`;
    match = value.match(/^Q(\d+)以上$/);
    if (match) return `Q${match[1]} or higher`;
    match = value.match(/^Q(\d+)以下$/);
    if (match) return `Q${match[1]} or lower`;
    return value;
  }

  globalObject.GbfArtifactOptionsI18n = { createOptionsI18n };
})(globalThis);
