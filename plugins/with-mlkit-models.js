const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

const NAME = "com.google.mlkit.vision.DEPENDENCIES";

/**
 * ML Kit reads one app-wide list of models to download at install time. Libraries can each declare
 * it (sticker-kit wants `subject_segment`, the dev client `barcode_ui`), and Android cannot merge two
 * different library values. Only the app's own manifest may override them, so this plugin writes the
 * combined list there with `tools:replace`.
 */
module.exports = function withMlkitModels(config, { models = ["barcode_ui", "subject_segment"] } = {}) {
  return withAndroidManifest(config, (result) => {
    const manifest = result.modResults;
    manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application["meta-data"] = (application["meta-data"] ?? []).filter(
      (entry) => entry.$["android:name"] !== NAME,
    );
    application["meta-data"].push({
      $: {
        "android:name": NAME,
        "android:value": models.join(","),
        "tools:replace": "android:value",
      },
    });
    return result;
  });
};
