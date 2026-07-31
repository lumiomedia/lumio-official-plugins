(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // ../lumio-official-plugins/plugins/twitch/runtime/index.tsx
  var runtime_exports = {};
  __export(runtime_exports, {
    TwitchPlugin: () => TwitchPlugin,
    default: () => runtime_default
  });
  var TwitchPlugin = {
    id: "com.lumio.twitch",
    name: { en: "Twitch", sv: "Twitch" },
    version: "1.0.0",
    description: {
      en: "Browse live channels, categories, followed streams, VODs and clips from Twitch.",
      sv: "Bl\xE4ddra bland live-kanaler, kategorier, f\xF6ljda streams, VOD:er och klipp fr\xE5n Twitch."
    },
    preinstalled: true,
    register(_ctx) {
    }
  };
  var runtime_default = TwitchPlugin;

  // ../../../../private/var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build-t45vQA/wrapper-entry.ts
  var plugin = Reflect.get(runtime_exports, "default") ?? Object.values(runtime_exports).find((value) => value && typeof value === "object" && "id" in value && "register" in value);
  if (!plugin) {
    throw new Error("Could not find a Lumio plugin export in runtime entry.");
  }
  globalThis.__lumioPluginRuntimeBundle = plugin;
})();
