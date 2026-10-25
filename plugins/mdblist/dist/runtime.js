(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj2, key, value) => key in obj2 ? __defProp(obj2, key, { enumerable: true, configurable: true, writable: true, value }) : obj2[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj2, key, value) => __defNormalProp(obj2, typeof key !== "symbol" ? key + "" : key, value);

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/react-shim.ts
  var react_shim_exports = {};
  __export(react_shim_exports, {
    Activity: () => Activity,
    Children: () => Children,
    Component: () => Component,
    Fragment: () => Fragment,
    Profiler: () => Profiler,
    PureComponent: () => PureComponent,
    StrictMode: () => StrictMode,
    Suspense: () => Suspense,
    act: () => act,
    cache: () => cache,
    cacheSignal: () => cacheSignal,
    captureOwnerStack: () => captureOwnerStack,
    cloneElement: () => cloneElement,
    createContext: () => createContext,
    createElement: () => createElement,
    createRef: () => createRef,
    default: () => react_shim_default,
    forwardRef: () => forwardRef,
    isValidElement: () => isValidElement,
    lazy: () => lazy,
    memo: () => memo,
    startTransition: () => startTransition,
    unstable_useCacheRefresh: () => unstable_useCacheRefresh,
    use: () => use,
    useActionState: () => useActionState,
    useCallback: () => useCallback,
    useContext: () => useContext,
    useDebugValue: () => useDebugValue,
    useDeferredValue: () => useDeferredValue,
    useEffect: () => useEffect,
    useEffectEvent: () => useEffectEvent,
    useId: () => useId,
    useImperativeHandle: () => useImperativeHandle,
    useInsertionEffect: () => useInsertionEffect,
    useLayoutEffect: () => useLayoutEffect,
    useMemo: () => useMemo,
    useOptimistic: () => useOptimistic,
    useReducer: () => useReducer,
    useRef: () => useRef,
    useState: () => useState,
    useSyncExternalStore: () => useSyncExternalStore,
    useTransition: () => useTransition,
    version: () => version
  });
  var react, react_shim_default, Activity, Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, act, cache, cacheSignal, captureOwnerStack, cloneElement, createContext, createElement, createRef, forwardRef, isValidElement, lazy, memo, startTransition, unstable_useCacheRefresh, use, useActionState, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useEffectEvent, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useOptimistic, useReducer, useRef, useState, useSyncExternalStore, useTransition, version;
  var init_react_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/react-shim.ts"() {
      react = globalThis.__lumioPluginRuntime?.react ?? globalThis.React;
      react_shim_default = react;
      Activity = react.Activity;
      Children = react.Children;
      Component = react.Component;
      Fragment = react.Fragment;
      Profiler = react.Profiler;
      PureComponent = react.PureComponent;
      StrictMode = react.StrictMode;
      Suspense = react.Suspense;
      act = react.act;
      cache = react.cache;
      cacheSignal = react.cacheSignal;
      captureOwnerStack = react.captureOwnerStack;
      cloneElement = react.cloneElement;
      createContext = react.createContext;
      createElement = react.createElement;
      createRef = react.createRef;
      forwardRef = react.forwardRef;
      isValidElement = react.isValidElement;
      lazy = react.lazy;
      memo = react.memo;
      startTransition = react.startTransition;
      unstable_useCacheRefresh = react.unstable_useCacheRefresh;
      use = react.use;
      useActionState = react.useActionState;
      useCallback = react.useCallback;
      useContext = react.useContext;
      useDebugValue = react.useDebugValue;
      useDeferredValue = react.useDeferredValue;
      useEffect = react.useEffect;
      useEffectEvent = react.useEffectEvent;
      useId = react.useId;
      useImperativeHandle = react.useImperativeHandle;
      useInsertionEffect = react.useInsertionEffect;
      useLayoutEffect = react.useLayoutEffect;
      useMemo = react.useMemo;
      useOptimistic = react.useOptimistic;
      useReducer = react.useReducer;
      useRef = react.useRef;
      useState = react.useState;
      useSyncExternalStore = react.useSyncExternalStore;
      useTransition = react.useTransition;
      version = react.version;
    }
  });

  // lib/stremio/timing.ts
  var init_timing = __esm({
    "lib/stremio/timing.ts"() {
    }
  });

  // ../../node_modules/@tauri-apps/api/external/tslib/tslib.es6.cjs
  var require_tslib_es6 = __commonJS({
    "../../node_modules/@tauri-apps/api/external/tslib/tslib.es6.cjs"(exports) {
      "use strict";
      function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
      }
      function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
      }
      exports.__classPrivateFieldGet = __classPrivateFieldGet;
      exports.__classPrivateFieldSet = __classPrivateFieldSet;
    }
  });

  // ../../node_modules/@tauri-apps/api/core.cjs
  var require_core = __commonJS({
    "../../node_modules/@tauri-apps/api/core.cjs"(exports) {
      "use strict";
      var tslib_es6 = require_tslib_es6();
      var _Channel_onmessage;
      var _Channel_nextMessageIndex;
      var _Channel_pendingMessages;
      var _Channel_messageEndIndex;
      var _Resource_rid;
      var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
      function transformCallback(callback, once = false) {
        return window.__TAURI_INTERNALS__.transformCallback(callback, once);
      }
      var Channel = class {
        constructor(onmessage) {
          _Channel_onmessage.set(this, void 0);
          _Channel_nextMessageIndex.set(this, 0);
          _Channel_pendingMessages.set(this, []);
          _Channel_messageEndIndex.set(this, void 0);
          tslib_es6.__classPrivateFieldSet(this, _Channel_onmessage, onmessage || (() => {
          }), "f");
          this.id = transformCallback((rawMessage) => {
            const index = rawMessage.index;
            if ("end" in rawMessage) {
              if (index == tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
                this.cleanupCallback();
              } else {
                tslib_es6.__classPrivateFieldSet(this, _Channel_messageEndIndex, index, "f");
              }
              return;
            }
            const message = rawMessage.message;
            if (index == tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
              tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
              tslib_es6.__classPrivateFieldSet(this, _Channel_nextMessageIndex, tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              while (tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") in tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
                const message2 = tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
                delete tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                tslib_es6.__classPrivateFieldSet(this, _Channel_nextMessageIndex, tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              }
              if (tslib_es6.__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") === tslib_es6.__classPrivateFieldGet(this, _Channel_messageEndIndex, "f")) {
                this.cleanupCallback();
              }
            } else {
              tslib_es6.__classPrivateFieldGet(this, _Channel_pendingMessages, "f")[index] = message;
            }
          });
        }
        cleanupCallback() {
          window.__TAURI_INTERNALS__.unregisterCallback(this.id);
        }
        set onmessage(handler) {
          tslib_es6.__classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
        }
        get onmessage() {
          return tslib_es6.__classPrivateFieldGet(this, _Channel_onmessage, "f");
        }
        [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageIndex = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), _Channel_messageEndIndex = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
          return `__CHANNEL__:${this.id}`;
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      var PluginListener = class {
        constructor(plugin2, event, channelId) {
          this.plugin = plugin2;
          this.event = event;
          this.channelId = channelId;
        }
        async unregister() {
          return invoke7(`plugin:${this.plugin}|remove_listener`, {
            event: this.event,
            channelId: this.channelId
          });
        }
      };
      async function addPluginListener(plugin2, event, cb) {
        const handler = new Channel(cb);
        try {
          await invoke7(`plugin:${plugin2}|register_listener`, {
            event,
            handler
          });
          return new PluginListener(plugin2, event, handler.id);
        } catch {
          await invoke7(`plugin:${plugin2}|registerListener`, { event, handler });
          return new PluginListener(plugin2, event, handler.id);
        }
      }
      async function checkPermissions(plugin2) {
        return invoke7(`plugin:${plugin2}|check_permissions`);
      }
      async function requestPermissions(plugin2) {
        return invoke7(`plugin:${plugin2}|request_permissions`);
      }
      async function invoke7(cmd, args = {}, options) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
      }
      function convertFileSrc(filePath, protocol = "asset") {
        return window.__TAURI_INTERNALS__.convertFileSrc(filePath, protocol);
      }
      var Resource = class {
        get rid() {
          return tslib_es6.__classPrivateFieldGet(this, _Resource_rid, "f");
        }
        constructor(rid) {
          _Resource_rid.set(this, void 0);
          tslib_es6.__classPrivateFieldSet(this, _Resource_rid, rid, "f");
        }
        /**
         * Destroys and cleans up this resource from memory.
         * **You should not call any method on this object anymore and should drop any reference to it.**
         */
        async close() {
          return invoke7("plugin:resources|close", {
            rid: this.rid
          });
        }
      };
      _Resource_rid = /* @__PURE__ */ new WeakMap();
      function isTauri() {
        return !!(globalThis || window).isTauri;
      }
      exports.Channel = Channel;
      exports.PluginListener = PluginListener;
      exports.Resource = Resource;
      exports.SERIALIZE_TO_IPC_FN = SERIALIZE_TO_IPC_FN;
      exports.addPluginListener = addPluginListener;
      exports.checkPermissions = checkPermissions;
      exports.convertFileSrc = convertFileSrc;
      exports.invoke = invoke7;
      exports.isTauri = isTauri;
      exports.requestPermissions = requestPermissions;
      exports.transformCallback = transformCallback;
    }
  });

  // ../../node_modules/@tauri-apps/api/event.cjs
  var require_event = __commonJS({
    "../../node_modules/@tauri-apps/api/event.cjs"(exports) {
      "use strict";
      var core = require_core();
      exports.TauriEvent = void 0;
      (function(TauriEvent) {
        TauriEvent["WINDOW_RESIZED"] = "tauri://resize";
        TauriEvent["WINDOW_MOVED"] = "tauri://move";
        TauriEvent["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
        TauriEvent["WINDOW_DESTROYED"] = "tauri://destroyed";
        TauriEvent["WINDOW_FOCUS"] = "tauri://focus";
        TauriEvent["WINDOW_BLUR"] = "tauri://blur";
        TauriEvent["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
        TauriEvent["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
        TauriEvent["WINDOW_CREATED"] = "tauri://window-created";
        TauriEvent["WEBVIEW_CREATED"] = "tauri://webview-created";
        TauriEvent["DRAG_ENTER"] = "tauri://drag-enter";
        TauriEvent["DRAG_OVER"] = "tauri://drag-over";
        TauriEvent["DRAG_DROP"] = "tauri://drag-drop";
        TauriEvent["DRAG_LEAVE"] = "tauri://drag-leave";
      })(exports.TauriEvent || (exports.TauriEvent = {}));
      async function _unlisten(event, eventId) {
        window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
        await core.invoke("plugin:event|unlisten", {
          event,
          eventId
        });
      }
      async function listen4(event, handler, options) {
        var _a;
        const target = typeof (options === null || options === void 0 ? void 0 : options.target) === "string" ? { kind: "AnyLabel", label: options.target } : (_a = options === null || options === void 0 ? void 0 : options.target) !== null && _a !== void 0 ? _a : { kind: "Any" };
        return core.invoke("plugin:event|listen", {
          event,
          target,
          handler: core.transformCallback(handler)
        }).then((eventId) => {
          return async () => _unlisten(event, eventId);
        });
      }
      async function once(event, handler, options) {
        return listen4(event, (eventData) => {
          void _unlisten(event, eventData.id);
          handler(eventData);
        }, options);
      }
      async function emit4(event, payload) {
        await core.invoke("plugin:event|emit", {
          event,
          payload
        });
      }
      async function emitTo(target, event, payload) {
        const eventTarget = typeof target === "string" ? { kind: "AnyLabel", label: target } : target;
        await core.invoke("plugin:event|emit_to", {
          target: eventTarget,
          event,
          payload
        });
      }
      exports.emit = emit4;
      exports.emitTo = emitTo;
      exports.listen = listen4;
      exports.once = once;
    }
  });

  // lib/session-host.ts
  function normalizeHost(rawHost) {
    return rawHost.trim().toLowerCase().replace(/\.+$/, "");
  }
  function isLocalAppHost(hostname) {
    const host = normalizeHost(hostname);
    if (!host) return false;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (host === "tauri.localhost" || host.endsWith(".tauri.localhost")) return true;
    return false;
  }
  function isLanClientHost(hostname) {
    return !isLocalAppHost(hostname);
  }
  function isLanClientSession() {
    if (typeof window === "undefined") return false;
    return isLanClientHost(window.location.hostname);
  }
  function isClientSession() {
    return isLanClientSession();
  }
  var init_session_host = __esm({
    "lib/session-host.ts"() {
    }
  });

  // lib/storage-cache-keys.ts
  var init_storage_cache_keys = __esm({
    "lib/storage-cache-keys.ts"() {
    }
  });

  // lib/storage-quota.ts
  var lastEmptyPassAt;
  var init_storage_quota = __esm({
    "lib/storage-quota.ts"() {
      "use client";
      init_app_storage();
      init_storage_cache_keys();
      lastEmptyPassAt = Number.NEGATIVE_INFINITY;
    }
  });

  // lib/app-storage.ts
  function ensureStore() {
    if (store) return store;
    const seeded = /* @__PURE__ */ new Map();
    if (typeof window !== "undefined") {
      const snapshot = window.__lumioNativeStorageSnapshot;
      if (snapshot) {
        if (nativeState === "unknown") nativeState = "durable";
        for (const [key, value] of Object.entries(snapshot)) {
          seeded.set(key, String(value));
        }
      }
      try {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key === null) continue;
          const value = localStorage.getItem(key);
          if (value !== null) seeded.set(key, value);
        }
      } catch {
      }
    }
    if (typeof window !== "undefined") {
      try {
        const snapshot = window.__lumioNativeStorageSnapshot;
        const snapRaw = snapshot?.["app_profiles"];
        const localRaw = seeded.get("app_profiles");
        const revOf = (raw) => {
          if (!raw) return -1;
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return 0;
            const rev = Number(parsed?.rev);
            return Number.isFinite(rev) ? rev : 0;
          } catch {
            return -1;
          }
        };
        if (snapRaw !== void 0 && revOf(snapRaw) > revOf(localRaw)) {
          seeded.set("app_profiles", snapRaw);
          try {
            localStorage.setItem("app_profiles", snapRaw);
          } catch {
          }
        }
      } catch {
      }
    }
    store = seeded;
    return seeded;
  }
  function getItem(key) {
    if (typeof window === "undefined") return null;
    return ensureStore().get(key) ?? null;
  }
  var nativeState, store;
  var init_app_storage = __esm({
    "lib/app-storage.ts"() {
      "use client";
      init_storage_quota();
      init_storage_cache_keys();
      nativeState = "unknown";
      store = null;
    }
  });

  // lib/android-source-cache.ts
  var init_android_source_cache = __esm({
    "lib/android-source-cache.ts"() {
      init_app_storage();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/profile-storage-shim.ts
  var sdk, getActiveProfileId, getScopedStorageItem, setScopedStorageItem, removeScopedStorageItem, onProfileChanged;
  var init_profile_storage_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/profile-storage-shim.ts"() {
      sdk = globalThis.__lumioPluginRuntime?.sdk;
      getActiveProfileId = () => sdk.getActiveProfileId();
      getScopedStorageItem = (baseKey) => sdk.getScopedStorageItem(baseKey);
      setScopedStorageItem = (baseKey, value) => sdk.setScopedStorageItem(baseKey, value);
      removeScopedStorageItem = (baseKey) => sdk.removeScopedStorageItem(baseKey);
      onProfileChanged = (listener) => sdk.onProfileChanged(listener);
    }
  });

  // lib/plugin-state.ts
  function normalizeState(state, fallback) {
    return {
      ...fallback,
      ...state,
      installed: state?.installed ?? fallback.installed,
      active: state?.active ?? fallback.active,
      order: state?.order ?? fallback.order,
      sourceType: state?.sourceType ?? fallback.sourceType,
      runtimeAvailable: state?.runtimeAvailable ?? fallback.runtimeAvailable
    };
  }
  function readAll() {
    if (typeof window === "undefined") return {};
    try {
      const raw = getScopedStorageItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function getPluginPersistedState(pluginId, defaultOrder, defaults = {}) {
    const all = readAll();
    return normalizeState(all[pluginId], {
      installed: true,
      active: true,
      sourceType: "builtin",
      runtimeAvailable: true,
      ...defaults,
      order: defaults.order ?? defaultOrder
    });
  }
  function isPluginEnabled(pluginId, defaultOrder = 0, defaults = {}) {
    const state = getPluginPersistedState(pluginId, defaultOrder, defaults);
    return Boolean(state.installed && state.active);
  }
  var STORAGE_KEY;
  var init_plugin_state = __esm({
    "lib/plugin-state.ts"() {
      "use strict";
      init_profile_storage_shim();
      STORAGE_KEY = "lumio:plugin-state";
    }
  });

  // lib/plugin-registry.ts
  var plugin_registry_exports = {};
  __export(plugin_registry_exports, {
    getAuthCapabilityProviders: () => getAuthCapabilityProviders,
    getBootstraps: () => getBootstraps,
    getBrowsePages: () => getBrowsePages,
    getEpisodeSidebarProviders: () => getEpisodeSidebarProviders,
    getHeroes: () => getHeroes,
    getHomeOverrides: () => getHomeOverrides,
    getHomeRows: () => getHomeRows,
    getHomeSources: () => getHomeSources,
    getInstantPlayProviders: () => getInstantPlayProviders,
    getLibraryFrame: () => getLibraryFrame,
    getLibraryProviders: () => getLibraryProviders,
    getListSource: () => getListSource,
    getListSources: () => getListSources,
    getMainMenuItems: () => getMainMenuItems,
    getManagedAuthConsumers: () => getManagedAuthConsumers,
    getMediaDetailsActions: () => getMediaDetailsActions,
    getMediaDownloadActions: () => getMediaDownloadActions,
    getMediaStreamAvailabilityProviders: () => getMediaStreamAvailabilityProviders,
    getMediaStreamCatalogProviders: () => getMediaStreamCatalogProviders,
    getOverviewStatusProviders: () => getOverviewStatusProviders,
    getPlayableUrlRewriters: () => getPlayableUrlRewriters,
    getPlaybackCapabilityProviders: () => getPlaybackCapabilityProviders,
    getPluginRegistryRevision: () => getPluginRegistryRevision,
    getResumeRefreshProviders: () => getResumeRefreshProviders,
    getSettingsSections: () => getSettingsSections,
    getStreamProviders: () => getStreamProviders,
    getStreamRequestConfigProviders: () => getStreamRequestConfigProviders,
    getSyncIdentityProviders: () => getSyncIdentityProviders,
    getTopbarItems: () => getTopbarItems,
    getTrackers: () => getTrackers,
    hasStreamProviders: () => hasStreamProviders,
    notifyPluginRegistryChanged: () => notifyPluginRegistryChanged,
    registerPlugin: () => registerPlugin,
    replaceMainMenuItems: () => replaceMainMenuItems,
    subscribePluginRegistry: () => subscribePluginRegistry
  });
  function notifyRegistryChanged() {
    registryRevision += 1;
    for (const listener of registryListeners) {
      try {
        listener();
      } catch (error) {
        console.warn("[plugin-registry] listener failed", error);
      }
    }
  }
  function scheduleRegistryNotify() {
    if (registryNotifyScheduled) return;
    registryNotifyScheduled = true;
    queueMicrotask(() => {
      registryNotifyScheduled = false;
      notifyRegistryChanged();
    });
  }
  function makeContext(pluginId) {
    const ctx = {
      registerStreamProvider(provider) {
        if (streamProviders.find((p) => p.id === provider.id)) return;
        streamProviders.push(provider);
      },
      registerLibraryProvider(provider) {
        if (libraryProviders.find((p) => p.id === provider.id)) return;
        libraryProviders.push(provider);
      },
      registerMediaStreamCatalogProvider(provider) {
        if (mediaStreamCatalogProviders.find((entry) => entry.id === provider.id)) return;
        mediaStreamCatalogProviders.push(provider);
      },
      registerMediaStreamAvailabilityProvider(provider) {
        if (mediaStreamAvailabilityProviders.find((entry) => entry.id === provider.id)) return;
        mediaStreamAvailabilityProviders.push(provider);
      },
      registerInstantPlayProvider(provider) {
        if (instantPlayProviders.find((entry) => entry.id === provider.id)) return;
        instantPlayProviders.push(provider);
      },
      registerResumeRefreshProvider(provider) {
        if (resumeRefreshProviders.find((entry) => entry.id === provider.id)) return;
        resumeRefreshProviders.push(provider);
      },
      registerPlayableUrlRewriter(rewriter) {
        if (playableUrlRewriters.find((entry) => entry.id === rewriter.id)) return;
        playableUrlRewriters.push(rewriter);
      },
      registerStreamRequestConfigProvider(provider) {
        if (streamRequestConfigProviders.find((entry) => entry.id === provider.id)) return;
        streamRequestConfigProviders.push(provider);
      },
      registerEpisodeSidebarProvider(provider) {
        if (episodeSidebarProviders.find((p) => p.id === provider.id)) return;
        episodeSidebarProviders.push(provider);
      },
      registerPlaybackCapabilityProvider(provider) {
        if (playbackCapabilityProviders.find((entry) => entry.id === provider.id)) return;
        playbackCapabilityProviders.push(provider);
      },
      registerSyncIdentityProvider(provider) {
        if (syncIdentityProviders.find((entry) => entry.id === provider.id)) return;
        syncIdentityProviders.push(provider);
      },
      registerAuthCapabilityProvider(provider) {
        if (authCapabilityProviders.find((entry) => entry.id === provider.id)) return;
        authCapabilityProviders.push(provider);
      },
      registerTracker(tracker) {
        if (trackers.find((entry) => entry.id === tracker.id)) return;
        trackers.push({ ...tracker, pluginId });
      },
      registerListSource(source) {
        if (listSources.find((entry) => entry.id === source.id)) return;
        listSources.push({ ...source, pluginId });
        scheduleRegistryNotify();
      },
      registerOverviewStatusProvider(provider) {
        if (overviewStatusProviders.find((entry) => entry.id === provider.id)) return;
        overviewStatusProviders.push({ ...provider, pluginId });
      },
      registerSettingsSection(section) {
        if (settingsSections.find((s) => s.id === section.id)) return;
        settingsSections.push({
          ...section,
          pluginId
        });
      },
      registerMediaDetailsAction(action) {
        if (mediaDetailsActions.find((entry) => entry.id === action.id)) return;
        mediaDetailsActions.push(action);
      },
      registerMediaDownloadAction(action) {
        if (mediaDownloadActions.find((entry) => entry.id === action.id)) return;
        mediaDownloadActions.push(action);
      },
      registerHomeRow(row) {
        if (homeRows.find((r) => r.id === row.id)) return;
        homeRows.push(row);
      },
      registerHomeSource(source) {
        if (homeSources.find((entry) => entry.id === source.id)) return;
        homeSources.push(source);
      },
      registerBootstrap(bootstrap) {
        if (bootstraps.find((entry) => entry.id === bootstrap.id)) return;
        bootstraps.push({ ...bootstrap, pluginId });
      },
      registerHero(hero) {
        if (heroes.find((entry) => entry.id === hero.id)) return;
        heroes.push(hero);
      },
      registerHomeOverride(homeOverride) {
        if (homeOverrides.find((entry) => entry.id === homeOverride.id)) return;
        homeOverrides.push({
          ...homeOverride,
          pluginId
        });
      },
      registerLibraryFrame(frame) {
        if (libraryFrames.find((entry) => entry.id === frame.id)) return;
        libraryFrames.push({ ...frame, pluginId });
        scheduleRegistryNotify();
      },
      registerBrowsePage(page) {
        if (browsePages.find((entry) => entry.id === page.id)) return;
        browsePages.push(page);
      },
      registerMainMenuItem(item) {
        if (mainMenuItems.find((entry) => entry.id === item.id)) return;
        mainMenuItems.push(item);
      },
      registerTopbarItem(item) {
        if (topbarItems.find((entry) => entry.id === item.id)) return;
        topbarItems.push(item);
      },
      registerManagedAuthConsumer(consumer) {
        if (managedAuthConsumers.find((entry) => entry.id === consumer.id)) return;
        managedAuthConsumers.push(consumer);
      }
    };
    for (const key of Object.keys(ctx)) {
      const original = ctx[key];
      if (typeof original === "function" && String(key).startsWith("register")) {
        ;
        ctx[key] = (...args) => {
          ;
          original.apply(ctx, args);
          scheduleRegistryNotify();
        };
      }
    }
    return ctx;
  }
  function registerPlugin(plugin2, options = {}) {
    if (registeredPluginIds.has(plugin2.id)) return;
    registeredPluginIds.add(plugin2.id);
    const ctx = makeContext(plugin2.id);
    if (options.suppressStreamContributions) {
      const noop = () => {
      };
      ctx.registerStreamProvider = noop;
      ctx.registerPlaybackCapabilityProvider = noop;
      ctx.registerMediaStreamAvailabilityProvider = noop;
      ctx.registerInstantPlayProvider = noop;
      ctx.registerResumeRefreshProvider = noop;
      ctx.registerEpisodeSidebarProvider = noop;
    }
    plugin2.register(ctx);
    notifyRegistryChanged();
  }
  function getStreamProviders() {
    return streamProviders;
  }
  function getLibraryProviders() {
    return libraryProviders;
  }
  function getMediaStreamCatalogProviders() {
    return mediaStreamCatalogProviders;
  }
  function getMediaStreamAvailabilityProviders() {
    return mediaStreamAvailabilityProviders;
  }
  function getInstantPlayProviders() {
    return instantPlayProviders;
  }
  function getResumeRefreshProviders() {
    return [...resumeRefreshProviders].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  function getPlayableUrlRewriters() {
    return [...playableUrlRewriters].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  function getStreamRequestConfigProviders() {
    return [...streamRequestConfigProviders].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
  function getEpisodeSidebarProviders() {
    return episodeSidebarProviders;
  }
  function getPlaybackCapabilityProviders() {
    return playbackCapabilityProviders;
  }
  function getSyncIdentityProviders() {
    return syncIdentityProviders;
  }
  function getOverviewStatusProviders() {
    return [...overviewStatusProviders].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
  function getAuthCapabilityProviders() {
    return authCapabilityProviders;
  }
  function getTrackers() {
    return trackers;
  }
  function getListSources() {
    return listSources.filter((source) => !source.pluginId || isPluginEnabled(source.pluginId, 0, { installed: true, active: true }));
  }
  function getListSource(id) {
    return getListSources().find((source) => source.id === id) ?? null;
  }
  function getSettingsSections() {
    return settingsSections;
  }
  function getMediaDetailsActions() {
    return mediaDetailsActions;
  }
  function getMediaDownloadActions() {
    return mediaDownloadActions;
  }
  function getHomeRows() {
    return homeRows;
  }
  function getHomeSources() {
    return homeSources;
  }
  function getBootstraps() {
    return bootstraps.filter((entry) => !entry.pluginId || isPluginEnabled(entry.pluginId, 0, { installed: true, active: true }));
  }
  function getHeroes() {
    return heroes;
  }
  function getLibraryFrame(id) {
    return libraryFrames.find((entry) => entry.id === id) ?? null;
  }
  function getHomeOverrides() {
    return homeOverrides;
  }
  function getBrowsePages() {
    return browsePages;
  }
  function getMainMenuItems() {
    return mainMenuItems;
  }
  function replaceMainMenuItems(owner, items2) {
    const previous = new Set(ownedMainMenuItemIds.get(owner) ?? []);
    for (let index = mainMenuItems.length - 1; index >= 0; index -= 1) {
      if (previous.has(mainMenuItems[index].id)) mainMenuItems.splice(index, 1);
    }
    for (const item of items2) {
      if (!mainMenuItems.find((entry) => entry.id === item.id)) mainMenuItems.push(item);
    }
    ownedMainMenuItemIds.set(owner, items2.map((item) => item.id));
    notifyRegistryChanged();
  }
  function getTopbarItems() {
    return topbarItems;
  }
  function getManagedAuthConsumers() {
    return managedAuthConsumers;
  }
  function hasStreamProviders() {
    return streamProviders.length > 0;
  }
  function getPluginRegistryRevision() {
    return registryRevision;
  }
  function subscribePluginRegistry(listener) {
    registryListeners.add(listener);
    return () => {
      registryListeners.delete(listener);
    };
  }
  function notifyPluginRegistryChanged() {
    notifyRegistryChanged();
  }
  var streamProviders, libraryProviders, mediaStreamCatalogProviders, mediaStreamAvailabilityProviders, instantPlayProviders, resumeRefreshProviders, playableUrlRewriters, streamRequestConfigProviders, episodeSidebarProviders, playbackCapabilityProviders, syncIdentityProviders, authCapabilityProviders, overviewStatusProviders, settingsSections, mediaDownloadActions, mediaDetailsActions, homeRows, homeSources, bootstraps, heroes, homeOverrides, libraryFrames, browsePages, mainMenuItems, topbarItems, managedAuthConsumers, trackers, listSources, registeredPluginIds, registryRevision, registryListeners, registryNotifyScheduled, ownedMainMenuItemIds;
  var init_plugin_registry = __esm({
    "lib/plugin-registry.ts"() {
      "use strict";
      init_plugin_state();
      streamProviders = [];
      libraryProviders = [];
      mediaStreamCatalogProviders = [];
      mediaStreamAvailabilityProviders = [];
      instantPlayProviders = [];
      resumeRefreshProviders = [];
      playableUrlRewriters = [];
      streamRequestConfigProviders = [];
      episodeSidebarProviders = [];
      playbackCapabilityProviders = [];
      syncIdentityProviders = [];
      authCapabilityProviders = [];
      overviewStatusProviders = [];
      settingsSections = [];
      mediaDownloadActions = [];
      mediaDetailsActions = [];
      homeRows = [];
      homeSources = [];
      bootstraps = [];
      heroes = [];
      homeOverrides = [];
      libraryFrames = [];
      browsePages = [];
      mainMenuItems = [];
      topbarItems = [];
      managedAuthConsumers = [];
      trackers = [];
      listSources = [];
      registeredPluginIds = /* @__PURE__ */ new Set();
      registryRevision = 0;
      registryListeners = /* @__PURE__ */ new Set();
      registryNotifyScheduled = false;
      ownedMainMenuItemIds = /* @__PURE__ */ new Map();
    }
  });

  // lib/tauri-mpv.ts
  function detectTauriEnv() {
    if (typeof window === "undefined") return false;
    const maybeTauriWindow = window;
    if (maybeTauriWindow.__TAURI_INTERNALS__ || maybeTauriWindow.__TAURI__) {
      return true;
    }
    const userAgent2 = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (userAgent2.includes("Tauri")) return true;
    const host = window.location.hostname;
    const port = window.location.port;
    return isLocalAppHost(host) && port === "3011";
  }
  var import_core, import_event, isTauriEnv, hasTauriIpc, isDesktopTauriEnv;
  var init_tauri_mpv = __esm({
    "lib/tauri-mpv.ts"() {
      "use strict";
      "use client";
      init_timing();
      import_core = __toESM(require_core());
      import_event = __toESM(require_event());
      init_react_shim();
      init_session_host();
      init_android_source_cache();
      init_plugin_registry();
      isTauriEnv = detectTauriEnv();
      hasTauriIpc = typeof window !== "undefined" && Boolean(
        window.__TAURI_INTERNALS__ || window.__TAURI__
      );
      isDesktopTauriEnv = isTauriEnv && hasTauriIpc && !(typeof navigator !== "undefined" && /android/i.test(navigator.userAgent));
    }
  });

  // lib/platform-os.ts
  function hasTauriIpc2() {
    if (typeof window === "undefined") return false;
    const w = window;
    return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
  }
  function userAgent() {
    return typeof navigator !== "undefined" ? navigator.userAgent : "";
  }
  function isDesktopTauri() {
    return hasTauriIpc2() && !/android/i.test(userAgent());
  }
  function isWindowsDesktop() {
    return isDesktopTauri() && /Windows/.test(userAgent());
  }
  var init_platform_os = __esm({
    "lib/platform-os.ts"() {
    }
  });

  // lib/locales/en.ts
  var en;
  var init_en = __esm({
    "lib/locales/en.ts"() {
      en = {
        // Nav
        calendar: "Calendar",
        releases: "Releases",
        settings: "Settings",
        lastWatched: "Continue watching",
        nextEpisodesTitle: "Next episode",
        nextEpisodesTab: "Next episode",
        nextEpisodesEmpty: "Nothing new to watch next. Finish an episode of a series and the next one shows up here.",
        homeSourceNextEpisodes: "Next episode",
        watchHistory: "History",
        startNextSource: "The source didn\u2019t respond \u2014 trying the next\u2026",
        startNextSourceNamed: "The source didn\u2019t respond \u2014 trying {stream}\u2026",
        startNextSourceWaiting: "The source didn\u2019t respond \u2014 waiting for more sources\u2026",
        startSlateNext: "The source sent no film \u2014 trying {stream}\u2026",
        startCancel: "Cancel",
        startNoSourceTitle: "No source started",
        startNoSourceDesc: "We tried {n} sources. Pick one yourself or try again.",
        startPickSource: "Choose source",
        startRetry: "Try again",
        barcodes: "Barcodes",
        barcodeKicker: "Library",
        barcodeFilterAll: "All",
        barcodeFilterPartial: "In progress",
        barcodeFilterDone: "Finished",
        barcodeViewGrid: "Grid",
        barcodeViewList: "Strips",
        barcodeViewRing: "Rings",
        barcodeViewShelf: "Shelf",
        barcodeShelfStyle: "Shelf style",
        barcodeShelfSpines: "Spines",
        barcodeShelfPoster: "Poster",
        barcodeShelfRing: "Ring",
        barcodeShelfPortrait: "Portrait",
        barcodePosterPortrait: "Portrait",
        barcodeSearch: "Search",
        barcodeSort: "Sort",
        barcodeSortRecent: "Recent",
        barcodeSortTitle: "Title",
        barcodeSortYear: "Year",
        barcodePage: "Page {p} of {n}",
        barcodePrev: "Previous",
        barcodeNext: "Next",
        barcodeNoMatches: "No matches",
        barcodeSetShelfStyle: "Default shelf style",
        barcodeSetShelfPaper: "Shelf paper",
        barcodePaperLightShort: "Light",
        barcodePaperDarkShort: "Dark",
        barcodeResume: "Resume",
        barcodeResumeFrom: "Resume from {t}",
        barcodePlayAgain: "Play again",
        barcodeStartOver: "Start over",
        barcodeShare: "Share",
        barcodeShareSoFar: "Share so far",
        barcodeShareTitle: "Share {title}",
        barcodeShareImage: "Image",
        barcodeShareStory: "Story",
        barcodeShareWallpaper: "Wallpaper",
        barcodeSharePoster: "Poster",
        barcodePosterCredits: "Credits",
        barcodePosterTitleCard: "Title card",
        barcodePosterRing: "Ring",
        barcodePaperLight: "Light paper",
        barcodePaperDark: "Dark paper",
        barcodePosterDirectedBy: "Directed by",
        barcodePosterWrittenBy: "Written by",
        barcodePosterStarring: "Starring",
        barcodePosterMusicBy: "Music by",
        barcodePosterCinematographyBy: "Cinematography by",
        barcodePosterEditedBy: "Edited by",
        barcodePosterCreditLine: "{label} {name}",
        barcodeShareTitleYear: "Title and year",
        barcodeShareCopy: "Copy image",
        barcodeShareSave: "Save PNG",
        barcodeShareSaved: "Saved as PNG",
        barcodeShareCopied: "Image copied",
        barcodeShareSaveFailed: "Couldn't save the image",
        barcodeShareCopyFailed: "Couldn't copy the image",
        barcodeShareCopyShort: "Copy",
        barcodeShareSend: "Share image",
        barcodeShareFailed: "Couldn't share the image",
        barcodeShareToPhone: "Share to your phone",
        barcodeShareToPhoneDesc: "Scan with your phone to save the image or share it on.",
        barcodeShareNoLan: "This device has no network address the phone can reach.",
        barcodeShareDone: "Done",
        barcodeYouAreHere: "You are here \xB7 {t}",
        barcodePlayFrom: "Play from {t}",
        barcodeNotWatched: "not watched",
        barcodeClickHint: "Click the strip to play from there",
        barcodeTapHint: "Tap the strip to play from there",
        barcodeStatusPartial: "{p}% watched \xB7 resume {t}",
        barcodeStatusPartialShort: "{p}% \xB7 {t}",
        barcodeStatusPartialNoResume: "{p}% watched",
        barcodePlay: "Play",
        barcodeDetailPartialNoResume: "{y} \xB7 {r} \xB7 {p}% watched",
        barcodeStatusDone: "Finished \xB7 {d}",
        barcodeDetailKickerPartial: "Barcode \xB7 in progress",
        barcodeDetailKickerDone: "Barcode \xB7 finished",
        barcodeDetailPartial: "{y} \xB7 {r} \xB7 {p}% watched \xB7 stopped at {t}",
        barcodeDetailDone: "{y} \xB7 {r} \xB7 finished {d}",
        barcodeEmptyTitle: "No barcodes yet",
        barcodeEmptyDesc: "They're created automatically while you watch a film.",
        barcodeOffTitle: "Barcodes aren't being created right now",
        barcodeTurnOn: "Turn on",
        barcodeClose: "Close",
        barcodeRecording: "Recording barcode",
        barcodePaused: "Barcode paused",
        barcodeOff: "Barcode off",
        barcodeStripControl: "Barcode strip",
        barcodeDelete: "Delete barcode",
        barcodeMarkDone: "Mark as finished",
        barcodeMarkInProgress: "Mark as in progress",
        barcodeDeleteConfirm: "Delete this barcode? This can\u2019t be undone.",
        settingsPageBarcodes: "Movie barcodes",
        barcodeGroupCreate: "Creation and the player",
        barcodeGroupLook: "Appearance",
        barcodeGroupShare: "Sharing and storage",
        barcodeSetEnabled: "Create barcode while I watch",
        barcodeSetEnabledDesc: "One stripe is saved at a time during playback.",
        barcodeSetStrip: "Show strip above the seek bar",
        barcodeSetStripDesc: "Shows what you've watched so far, in colour, in the player.",
        barcodeSetResolution: "Resolution",
        barcodeSetResolutionDesc: "Applies to new barcodes.",
        barcodeSetResolutionOption: "{n} stripes",
        barcodeSetScope: "Applies to",
        barcodeSetScopeMovies: "Movies",
        barcodeSetScopeAll: "Movies and episodes",
        barcodeSetView: "Default library view",
        barcodeSetUnseen: "Unwatched part",
        barcodeUnseenHatch: "Hatched",
        barcodeUnseenDim: "Dimmed",
        barcodeUnseenEmpty: "Empty",
        barcodeSetTexture: "Stripe texture",
        barcodeSetTextureDesc: "Smooth softens the stripes in shelf view.",
        barcodeTextureRough: "Rough",
        barcodeTextureSmooth: "Smooth",
        barcodeSetShareTitle: "Include title and year on shared images",
        barcodeSetSaved: "Saved barcodes",
        barcodeSetSavedDesc: "{n} films \xB7 {mb} MB",
        barcodeClear: "Clear",
        barcodeClearConfirm: "Clear all barcodes? This can't be undone.",
        popularStreaming: "On Streaming",
        popularOnTv: "Series",
        popularCinema: "In theaters",
        popularTrendingMovies: "Movies",
        popularTrailers: "Trailers",
        popularLiveTv: "Live TV",
        // Tomlägets vägledning (lib/utils/no-results-guidance.ts). Modulen hade
        // ingen språktillgång alls och var därför hårdkodad engelska mitt i en
        // svensk ruta — t trådas nu in från media-grid.tsx.
        noResultsNothingMatched: "Nothing matched the current filter combination.",
        noResultsFoundCandidates: "We found {count} candidates, but none matched all of your filters at the same time.",
        noResultsNoCastMatch: "We could not find a clear cast match for that query with the current filters.",
        noResultsNoTitleMatch: "We could not find a clear title match for that query with the current filters.",
        noResultsTipSpellingCast: "Check the spelling or try a full cast name with fewer extra words.",
        noResultsTipSpellingTitle: "Check the spelling or try a shorter title, such as the main word only.",
        noResultsTipProviders: "Remove a streaming provider or try searching without provider filters to widen the results.",
        noResultsTipKeywords: "Remove a keyword or try searching without keywords to surface more candidates.",
        noResultsTipLanguages: "Remove an original language or add more languages if you want broader results.",
        noResultsTipRatingTmdb: "Lower the minimum TMDb rating or widen the rating range to include more titles.",
        noResultsTipRating: "Lower the minimum rating or widen the rating range to include more titles.",
        noResultsTipYears: "Widen the year range by a few years to give the search more room.",
        noResultsTipMediaType: "Switch from movies only or series only to both if you want more matches faster.",
        noResultsTipGenres: "Remove one genre or try fewer genres at the same time.",
        noResultsTipClearAll: "Clear the filters and start broader, then narrow the search step by step.",
        m3uUrls: "M3U Playlist URLs",
        m3uUrlsDesc: "Enter one M3U URL per line. Channels are stored in your browser.",
        m3uUrlsPlaceholder: "https://example.com/playlist.m3u",
        m3uFetchList: "Fetch list",
        m3uFetchListDone: "List fetched",
        m3uFetchListError: "Could not fetch list",
        liveTvLists: "Live TV",
        liveTvCreateList: "Create list",
        liveTvListName: "List name",
        liveTvNoLists: "No channel lists yet.",
        liveTvNoListsHint: "Add an M3U playlist under Settings \u2192 Live TV, then your channels show up here.",
        liveTvNoMatchHint: "Try a shorter search, or pick another category.",
        liveTvAddToList: "Add to active list",
        liveTvRemoveFromList: "Remove from active list",
        liveTvDeleteList: "Delete list",
        liveTvSelectListFirst: "Select a list first",
        liveTvHomeSource: "Live TV source",
        liveTvAllChannels: "All channels",
        liveTvFavourites: "Favourites",
        m3uNoUrl: "No M3U URL configured. Add one in Settings.",
        liveTvEmptyEyebrow: "LIVE TV",
        liveTvEmptyTitle: "Connect a playlist to get started.",
        liveTvEmptyBody: "Connect any IPTV provider. Channels are sorted by category, EPG is pulled automatically when your provider supplies it, and playback runs through native mpv.",
        liveTvEmptyCta: "Connect a provider",
        liveTvFeatureListsTitle: "Channel lists",
        liveTvFeatureListsDesc: "Build your own lists and pin favorite channels to the top.",
        liveTvFeatureEpgTitle: "Live EPG",
        liveTvFeatureEpgDesc: "Now-playing and upcoming guide when your provider supplies it.",
        liveTvFeatureMpvTitle: "Native mpv",
        liveTvFeatureMpvDesc: "HEVC, HDR and multichannel audio, plus real subtitle and audio menus.",
        liveTvFeatureLocalTitle: "Local only",
        liveTvFeatureLocalDesc: "Playlist links are stored on this device. Nothing leaves your machine.",
        m3uLoading: "Loading channels\u2026",
        m3uError: "Failed to load channels.",
        m3uChannels: "channels",
        m3uSearch: "Search channels\u2026",
        m3uNoResults: "No channels match your search.",
        // Hero
        subtitle: "Search movies, series, or cast in Sweden.",
        brandTagline: "Movie & Series Finder",
        myFiles: "My Files",
        trending: "Trending",
        homeTrendingSubtitle: "Across movies and series this week",
        popularMoviesTitle: "Popular movies",
        popularMoviesSubtitle: "The most popular movies right now",
        popularSeriesTitle: "Popular series",
        popularSeriesSubtitle: "The most popular series right now",
        showAllTrending: "Show all trending",
        showAllMovies: "Show all movies",
        showAllSeries: "Show all series",
        searchPlaceholder: "Search titles or cast names",
        searchInLibrary: "Search in {name}",
        searchInYourLibrary: "Search your library",
        searchTitlePlaceholder: "Search title",
        sampleData: "Sample data",
        tmdbLive: "TMDb live",
        castSearch: "Cast search",
        titleSearch: "Title search",
        showingCastResults: "Showing cast results",
        showingTitleResults: "Showing title results.",
        for: "for",
        // Recently watched
        recentlyStreamed: "Recently streamed",
        lastWatchedTitle: "Last Watched",
        continueWhereLeftOff: "Continue where you left off",
        showAll: "Show all",
        all: "All",
        close: "Close",
        trailerLabel: "Trailer",
        closeTrailer: "Close trailer",
        liveTvStreamError: "Could not load stream.",
        liveTvStreamErrorHelp: "The stream may be geo-blocked, offline, or unsupported.",
        allCategories: "All categories",
        activeFiltersTitle: "Active filters",
        activeFiltersHintPrefix: "Provider availability is scoped to Sweden (",
        activeFiltersHintSuffix: "), and multiple selected chips match any of the chosen labels, not all of them at once.",
        streamProviderGlobalDefaults: "Stream provider defaults",
        streamProviderApiKey: "API key",
        streamProviderApiKeyPlaceholder: "Your API key",
        streamProviderApiKeyPerSource: "API key (per provider)",
        streamProviderUsingGlobalKey: "Using global API key",
        apiKeyLabel: "API key",
        streamProviderDefaultQualityFilter: "Default quality filter (exclude)",
        streamProviderDefaultLanguages: "Default languages",
        streamProviderDefaultSource: "Default stream provider",
        streamProviderDefaultMaxResults: "Default max results per quality",
        streamProviderQualityFilter: "Quality filter (exclude)",
        streamProviderLanguages: "Languages",
        streamProviderSources: "Providers (empty = all)",
        streamProviderSelectQualities: "Select qualities",
        streamProviderSelectLanguages: "Select languages",
        streamProviderSelectSources: "Select providers",
        streamProviderMaxResults: "Max results",
        streamProviderMaxSize: "Max size (MB, 0 = no limit)",
        streamProviderSelection: "Stream provider",
        streamProviderCustomUrl: "Custom URL",
        streamProviderNoUrl: "No URL set",
        streamProviderAddComet: "+ Comet",
        streamProviderAddJackettio: "+ Jackettio",
        // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
        streamProviderAddAiostreams: "+ AIOStreams",
        // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
        aiostreamsOpenConfig: "Open the configurator",
        // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
        aiostreamsManifestLabel: "Manifest URL",
        // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
        streamProviderAddCustom: "+ Custom URL",
        useGlobal: "Use global",
        clearFilters: "Clear filters",
        moviesOnly: "Movies only",
        seriesOnly: "Series only",
        titleLabel: "Title",
        ratingLabel: "Rating",
        ratingLabelTmdb: "TMDb",
        noStreamsYet: "Nothing streamed yet.",
        noScrapersEnabled: "No stream providers enabled.",
        streamNotCached: "Stream not cached \u2014 try another",
        streamUnreachable: "Stream URL unreachable \u2014 try another",
        downloadTimeout: "Download timeout \u2014 try another stream",
        openToContinue: "\u2014 open to continue",
        timeLeft: "left",
        resume: "Resume",
        resumeStarting: "Starting\u2026",
        resumeFetchingLink: "Fetching fresh link\u2026",
        listenedAt: "at",
        streamAvailable: "Cached",
        streamDeviceUnsupported: "unsupported",
        streamDeviceUnsupportedHint: "This device lacks a decoder for this stream (lossless audio, Dolby Vision, 4K or HDR) \u2014 expect no sound, no picture, or no playback.",
        streamDownload: "Download",
        startingMovie: "Starting movie...",
        findingMovie: "Finding movie...",
        findingStreams: "Finding streams...",
        startingEpisode: "Starting episode...",
        sourceNotResponding: "Couldn't start the movie \u2014 the source isn't responding.",
        // Media card / details
        movie: "Movie",
        series: "Series",
        audiobook: "Audiobook",
        synopsis: "Synopsis",
        genres: "Genres",
        filterProviders: "Services",
        streamingIn: "Streaming in Sweden",
        noProviders: "No streaming providers found",
        tmdbRating: "Rating",
        tmdbVoteAverage: "TMDb vote average",
        cast: "Cast",
        keywords: "Keywords",
        showLess: "Show less",
        recommendations: "Recommendations",
        follow: "Follow",
        following: "Following \u2713",
        movieWatchlistAdd: "My list",
        movieWatchlistAdded: "My list \u2713",
        moreInfo: "More info",
        watchTrailer: "Watch Trailer",
        shuffleEpisodes: "Shuffle",
        shuffleEpisodesOn: "Shuffle on",
        openOnImdb: "Open on IMDb",
        seasons: "Seasons:",
        matchedOnTitle: "Matched on title:",
        localFallback: "Local fallback",
        // Streams
        streams: "Streams",
        rdStreams: "Stream provider streams",
        configureRd: "Configure your stream provider API key in Settings.",
        loadingSeasons: "Loading seasons\u2026",
        loadingEpisodes: "Loading episodes\u2026",
        noSeasons: "No seasons found.",
        epPlaying: "Playing",
        epNext: "Next",
        epWatched: "watched",
        epRemaining: "{time} left",
        seasonLabel: "Season",
        noEpisodes: "No episodes found.",
        notAiredYet: "Not aired yet",
        nextAirs: "Next",
        noOverview: "No description available.",
        cached: "Cached",
        notCached: "not cached (will download)",
        play: "Play",
        noStreamsAvailable: "No streams",
        noStreamYet: "No stream yet",
        addAndPlay: "Add & Play",
        searchingStreams: "Searching for streams\u2026",
        allSources: "All sources",
        tvSearchTypeTab: "Type",
        tvSearchSpace: "Space",
        tvSearchSystemKeyboard: "System keyboard",
        tvSearchDelete: "Delete",
        sourcesStillSearching: "Still searching:",
        sourceFilter: "Source",
        sourcesNoAnswer: "No answer from:",
        noStreams: "No streams found.",
        allFiltered: "All streams filtered by quality settings.",
        preparingPlayback: "Preparing playback\u2026",
        downloading: "Downloading\u2026",
        downloadingFile: "Downloading file...",
        queued: "Queued on stream provider\u2026",
        selectingFiles: "Selecting files\u2026",
        addingToRd: "Adding to stream provider\u2026",
        unrestrictingLinks: "Unrestricting links\u2026",
        selectFile: "Select file to play:",
        noVideoFiles: "No video files detected.",
        markWatched: "Mark as watched",
        markUnwatched: "Mark as unwatched",
        watched: "\u2713 Watched",
        watchedQ: "Watched?",
        markAllWatched: "Mark all as watched",
        hideManual: "Hide manual input",
        go: "Go",
        tryAgain: "Try again",
        cancel: "Cancel",
        copyLink: "Copy link",
        copyStreamUrl: "Copy stream URL",
        copied: "Copied \u2713",
        moreActions: "More actions",
        copyStreamLink: "Copy stream link",
        downloadThisVideo: "Download this video",
        openInVlc: "Play in VLC",
        tvModeGroupTitle: "TV mode",
        tvModeUseTitle: "Use TV mode",
        tvRowsIntro: "Every segment has its own rows in TV mode. The starting point mirrors your normal home page, so nothing changes until you change it here.",
        tvAddRow: "Add row",
        tvAddRowAll: "Every row can be picked.",
        tvSegmentProviders: "services",
        tvSearchAlphaTab: "A\u2013Z",
        tvSearchBefore1990: "Before 1990",
        tvSearchEmpty: "Type or pick a letter to search.",
        tvSearchNoHits: "No matches. Try a shorter search.",
        tvSearchHistory: "Search history",
        tvSearchHistoryHint: "Or pick something from your search history.",
        tvSearchHitsFor: "Hits for",
        pairUnknownDevice: "Unknown device",
        pairTooManyTries: "Too many attempts \u2014 wait a moment.",
        pairBadCode: "Wrong or expired code.",
        pairUnstable: "The connection is unstable right now \u2014 try again shortly.",
        pairTitle: "Pair this device with Lumio",
        pairIntro: "Create an invite code in Lumio on your computer (Settings \u2192 Remote access) and enter it here.",
        watchUnknownTitle: "Unknown title",
        watchWaiting: "Waiting for playback\u2026",
        lanLocalAddrTip: "This .local address keeps working even when the computer\u2019s IP address changes. On iPhone: open the link in Safari and choose Share \u2192 Add to Home Screen for fullscreen.",
        bugStepsHeading: "**Steps to reproduce:**",
        pluginsHostOnly: "Plugin management happens on the host in LAN mode.",
        calFetchFailed: "Could not fetch data.",
        nothingYet: "Nothing to show yet.",
        bugEnvLabel: "Environment:",
        appUpdateAndroidInstaller: "Opening the system installer \u2014 confirm the install there.",
        tvSegmentMovies: "movies",
        tvSegmentSeries: "series",
        tvSegmentAll: "everything",
        tvMirrorsHome: "Mirrors your normal home page. Change anything here and the segment gets its own rows.",
        tvMirrorsHomeLimited: "Mirrors your normal home page, limited to {type}. Change anything here and the segment gets its own rows.",
        tvAddRowLimited: "Only rows that belong to {type} are offered.",
        tvRemoveRow: "Remove",
        raAlwaysVlc: "Always open in VLC",
        dtMinutesShort: "{n}m",
        epLayoutTitle: "Details page layout",
        epLayoutDesc: "Vertical stacks episodes, streams and recommendations in lists you scroll down through. Side-scrolling puts them in rows of cards you swipe sideways. Applies to both movies and series.",
        epLayoutList: "Vertical",
        epLayoutCards: "Side-scrolling",
        epLayoutToggleTitle: "Switch layout: vertical or side-scrolling",
        detailsLayoutToggleTitle: "Switch layout: vertical or side-scrolling",
        detailsTrailers: "Trailers",
        homeBubble: "Home",
        daPlacementTitle: "Action buttons",
        daPlacementDesc: "Where Follow, Watched, Trailer and Sources sit on the details page.",
        daPlacementHeader: "Top right",
        daPlacementInline: "Next to Play",
        dtSeasonOne: "1 season",
        dtSeasonsN: "{n} seasons",
        settingsDetailsEyebrow: "Details page",
        sideMenuTitle: "Side menu",
        menuChipTitle: "Menu pill (TV style)",
        menuChipDesc: "The TV mode menu pill in the top-left corner, with search inside the menu. Replaces the top bar on desktop and mobile.",
        menuPillPlaceTitle: "Menu pill position",
        menuPillPlaceDesc: "Pick a corner, or hold the pill until it wiggles and drag it anywhere. It snaps to the nearest edge and keeps the height you dropped it at.",
        menuPillTopLeft: "Top left",
        menuPillTopRight: "Top right",
        menuPillBottomLeft: "Bottom left",
        menuPillBottomRight: "Bottom right",
        vlcToggleOn: "VLC on",
        vlcToggleOff: "VLC off",
        vlcToggleTitle: "Open streams directly in VLC",
        openInExternalPrefix: "Play in",
        openInExternalPlayer: "Open in external player",
        externalPlayerToggle: "External player",
        externalPlayerApp: "External player",
        externalPlayerPick: "Choose\u2026",
        licensesTitle: "Licenses",
        appUpdateTitle: "App update",
        appUpdateDesc: "Check if a newer Lumio version is available.",
        appUpdateCheck: "Check for update",
        appUpdateCheckFailed: "Could not fetch update information",
        appUpdateAvailable: "Update available:",
        appUpdateCurrent: "current",
        appUpdateUpToDate: "You are on the latest version",
        appUpdateInstall: "Download & install",
        appUpdatePromptTitle: "Update available",
        appUpdatePromptBody: "Lumio {version} is ready to install. Update now?",
        appUpdateNotesTitle: "What\u2019s new",
        appUpdatePromptInstall: "Update now",
        appUpdatePromptInstalling: "Updating\u2026",
        appUpdateDownloading: "Downloading update",
        appUpdateInstallingStep: "Installing the update \u2013 Lumio will restart",
        appUpdatePromptLater: "Not now",
        appUpdateRestarting: "Update installed \u2014 Lumio is restarting\u2026",
        appUpdateInstallerStarted: "Installing the update \u2014 Lumio closes and opens again on the new version\u2026",
        appUpdateDmgOpened: "The installer was downloaded and opened \u2014 drag Lumio to Applications.",
        appUpdateDmgOpenedWindows: "The installer was downloaded and started \u2014 follow it to update Lumio.",
        appUpdateBrowserStarted: "The download started in the browser \u2014 open the APK to install.",
        licensesDesc: "Open-source components and services Lumio is built on.",
        licensesIntro: "Lumio bundles the following open-source software. GPL-licensed components include a pointer to their source code.",
        remoteAccessTitle: "Remote access",
        remoteAccessDesc: "Reach your library from outside your home network over an encrypted peer-to-peer connection.",
        remoteConnectionTitle: "Remote connection",
        remoteExternalTitle: "Outside the home network",
        remoteExternalDesc: "Reach your library away from home. Requires an open router port and a public IP address (won't work behind CGNAT).",
        remoteGuestMenuTitle: "Let remote guests open the menu",
        remoteGuestMenuDesc: "Remote (not LAN) devices get the settings gear and main menu. Off by default.",
        remoteLanTitle: "Home network (LAN)",
        remoteLanDesc: "Stream to other devices on the same home network.",
        externalPlayerAppDesc: 'App used by "Play in \u2026" (macOS app name, e.g. VLC or IINA). Android shows the system app chooser.',
        externalPlayerAppDescWindows: `App used by "Play in \u2026": VLC, or the path to another player's .exe.`,
        preparingDownload: "Preparing download...",
        downloadComplete: "Download complete",
        downloadFailed: "Download failed",
        backToStreams: "Back to streams",
        instantPlay: "instant play",
        continueFrom: "Continue:",
        retry: "Retry",
        // Audiobook
        audiobooks: "Audiobook",
        resumeAudiobook: "Resume audiobook",
        searchingAudiobooks: "Searching for audiobooks\u2026",
        noAudiobooks: "No audiobooks found for",
        dismiss: "Dismiss",
        // Filters
        filters: "Filters",
        showResults: "Show results",
        refine: "Refine",
        reset: "Reset",
        // Filterraden (design_handoff_filterrad, variant 5a).
        filterClearGroup: "Clear",
        filterDone: "Done",
        filterCatalogsLine: "{n} active catalogs under {type}",
        filterActiveLine: "{n} active filters",
        filterActiveLineOne: "1 active filter",
        filterKeywordPlaceholder: "Keyword",
        type: "Type",
        movieGenres: "Movie genres",
        seriesGenres: "TV genres",
        moreFilters: "More filters",
        year: "Year",
        rating: "Rating",
        languages: "Languages",
        originalLanguage: "Original language",
        noLanguagesSelected: "No original languages selected yet.",
        languageSearchPlaceholder: "Search languages, for example Swedish, Danish, or en",
        languageSearchHelper: "Search by language name or code. Multiple selections mean the title can match any of the chosen original languages.",
        noLanguageMatches: "No language matches for",
        noKeywordsSelected: "No keywords selected yet.",
        keywordsPlaceholderTmdb: "Keyword",
        keywordsPlaceholderCatalog: "Keyword",
        clearSearch: "Clear search",
        keywordsHelperTmdb: "Type at least 2 characters. Use the arrow keys and Enter to select faster. You can only add keywords that exist in TMDb.",
        keywordsHelperCatalog: "Type at least 2 characters. Use the arrow keys and Enter to select faster. You can only add keywords that exist in the catalog.",
        searchingKeywords: "Searching keywords...",
        noKeywordMatches: "No keyword matches for",
        add: "Add",
        selected: "selected",
        sortBy: "Sort by",
        sortMostPopular: "Most popular",
        sortMostRelevant: "Most relevant",
        sortHighestRating: "Highest rating",
        sortHighestTmdb: "Highest TMDb rating",
        sortNewest: "Newest to Oldest",
        sortOldest: "Oldest to Newest",
        // Bläddra-raden under heron på Filmer/Serier (Jerry 2026-10-10), lib/browse-summary.ts
        browseHeading: "Browse",
        browseSummary: "Showing {scope} on {services}, {sort}",
        browseKindMovies: "movies",
        browseKindSeries: "series",
        browseKindTitles: "titles",
        browseKindAnime: "anime",
        browseScopeAll: "all {kind}",
        browseScopeGenres: "{genres} {kind}",
        browseScopeManyGenres: "{n} genres of {kind}",
        browseGenresAnd: " and ",
        browseYearFrom: "from {year}",
        browseYearTo: "up to {year}",
        browseYearRange: "from {min}\u2013{max}",
        browseRatedAtLeast: "rated {n}+",
        browseEveryService: "every service",
        browseManyServices: "{n} services",
        browseSortPopular: "most popular first",
        browseSortRelevant: "most relevant first",
        browseSortRating: "highest rated first",
        browseSortNewest: "newest first",
        browseSortOldest: "oldest first",
        // Bläddra-raden i biblioteksläget (Jerry 2026-10-10)
        browseSummaryLibrary: "Showing {scope} in {services}, {sort}",
        browseYourLibrary: "your library",
        browseManySources: "{n} sources",
        browseSortAdded: "recently added first",
        browseSortTitle: "by title A\u2013Z",
        sortRecentlyAdded: "Recently added",
        sortTitleAZ: "Title A\u2013Z",
        filterSource: "Source",
        // Results
        aboutResults: "About",
        results: "results",
        resultsTryThis: "Try this",
        page: "Page",
        of: "of",
        previous: "Previous",
        next: "Next",
        showingPagedResults: "Showing paged results from the strongest available matches.",
        usingFallback: "Using sample fallback",
        sampleCatalog: "Sample catalog",
        noResults: "No matches",
        // Subtitle menu
        subtitleLanguages: "Subtitle Languages",
        subtitleVariants: "Subtitles Variants",
        subtitleSettings: "Subtitles Settings",
        subtitleLoadFile: "Open subtitle file\u2026",
        subtitleExternalGroup: "Own file",
        subtitleEmbeddedTrack: "Embedded track",
        subtitleFileUnsupported: "This format can only be shown by the built-in player on Mac (mpv). Use .srt or .vtt here.",
        subtitleFileUnsupportedWindows: "This format can only be shown by the built-in player (mpv). Use .srt or .vtt here.",
        subtitleFileLoadFailed: "Could not load the subtitle file. {message}",
        selectLanguage: "Select a language",
        on: "On",
        off: "Off",
        delay: "Delay",
        subtitleAutoSync: "Auto-sync",
        subtitleAutoSyncAnalyzing: "Analyzing...",
        subtitleAutoSyncApplied: "Applied offset",
        subtitleAlignedToReference: "Synced against a subtitle matching your file",
        subtitleHashMatch: "Matches your file",
        subtitleAlignedToAudio: "Synced against the full audio track",
        vpSecondarySubFailed: "Could not load the second subtitle",
        vpSecondarySubMissing: "No {lang} subtitle found",
        learningModeTitle: "Learning mode",
        learningModeHint: "Show a second subtitle language under the main one",
        subtitleSlotPrimary: "Main",
        subtitleSlotSecondary: "Second",
        subtitleSecondaryEmbeddedUnsupported: "Not supported on Android yet",
        shortcutsSecondarySubtitleCycle: "Cycle second subtitle (learning mode)",
        secondarySubtitleLanguage: "Second subtitle language",
        secondarySubtitleLanguageDesc: "Shown under the main subtitle when learning mode is on",
        secondarySubtitleColor: "Second subtitle colour",
        secondarySubtitleColorDesc: "Colour of the second line in learning mode",
        castTitle: "Play on another device",
        castScanning: "Looking for devices\u2026",
        castNoDevices: "No Chromecast or DLNA devices found.",
        castPreparing: "Preparing stream\u2026",
        castPrepareFailed: "Failed \u2014 tap to retry",
        castRescan: "Search again",
        castScanFailed: "Could not search for devices.",
        castFailed: "The device would not accept playback.",
        castPlayingOn: "Playing on",
        castStop: "Stop casting",
        castPause: "Pause",
        castResume: "Resume",
        castPairTitle: "Pair with Apple TV",
        castPairPrompt: "Enter the code shown on your TV",
        castPairConfirm: "Pair",
        castPairing: "Pairing\u2026",
        castPairFailed: "Pairing failed. Try again.",
        subtitleAutoSyncNoReference: "Not certain enough from audio alone. Add an OpenSubtitles API key in Settings to sync against a subtitle matching your file.",
        subtitleAutoSyncFailed: "Could not auto-sync subtitles",
        subtitleAutoSyncDriftApplied: "drift corrected ({rate}s/min)",
        subtitleAutoSyncNoMatch: "Could not find a reliable subtitle match",
        subtitleAutoSyncNeedsGroq: "Add a Groq API key in Settings first",
        subtitleAutoSyncNeedsSubtitle: "Pick a subtitle track first",
        subtitleAutoSyncNotEnoughSpeech: "Try again during a scene with more dialogue",
        size: "Size",
        verticalPosition: "Vertical Position",
        subtitlesLabel: "Subtitles",
        subtitleProvider: "OpenSubtitles v3",
        undo: "Undo",
        audio: "Audio",
        audioLanguage: "Audio language",
        currentAudioOutput: "Current audio output",
        audioTrackCommentary: "Commentary",
        info: "Info",
        actor: "Actor",
        readMore: "Read more",
        readLess: "Read less",
        knownFor: "Known for",
        credits: "Credits",
        gender: "Gender",
        birth: "Birth",
        bornIn: "Born in:",
        alsoKnownAs: "Also known as:",
        noBiography: "No biography available on TMDb.",
        soundtrack: "Soundtrack",
        soundtrackLoadError: "Could not load soundtrack",
        noSoundtrackFound: "No soundtrack found on Spotify",
        searchOnSpotify: "Search on Spotify",
        searching: "Searching\u2026",
        instantPlayTitle: "Instant play",
        zappFindTitle: "Find a movie",
        // Settings
        settingsTitle: "Settings",
        settingsDesc: "Configure integrations for this app.",
        profilesTitle: "Profiles",
        profilesDesc: "Everyone who uses this device gets their own watch history, avatar, color, and optional PIN. Switch anytime.",
        profileEditTitle: "Edit profile",
        profileAvatarLabel: "Avatar",
        profileColorLabel: "Color",
        profileNoAvatar: "No avatar (initial)",
        profileSharedSettingsTitle: "Settings for this profile",
        profileShareWithAll: "Share settings with all profiles",
        profileShareWithAllDesc: "One set of preferences everyone on this device uses. Watch history and lists stay personal.",
        profileIndependentSettings: "Use independent settings for this profile",
        profileIndependentSettingsDesc: "This profile keeps its own preferences, separate from everyone else.",
        profilePrimaryBadge: "Primary",
        profileLockedBadge: "Locked",
        profileEditAction: "Edit",
        profileWhoIsWatching: "Who's watching?",
        profileCustomizeAction: "Customize",
        profileAddTile: "Add",
        profileAvatar: "Avatar",
        profileAvatarHint: "Picked from the bundled catalogue.",
        profileNoAvatarHint: "Shows the initial instead.",
        profileColor: "Colour",
        profilePinRemoveEnterCurrent: "Enter the current PIN to remove it",
        profilesStripHint: "Add a profile for someone else and everyone keeps their own Continue Watching, watch history, and progress.",
        settingsGroupOverview: "OVERVIEW",
        settingsGroupAccount: "ACCOUNT",
        settingsGroupStreaming: "STREAMING",
        settingsGroupPlayback: "PLAYBACK",
        settingsGroupAppearance: "APPEARANCE",
        settingsGroupPlugins: "PLUGINS",
        settingsGroupNotifications: "NOTIFICATIONS",
        webhooksTitle: "Webhooks & rules",
        webhooksDesc: "Send a ping to Discord or Telegram when something happens. Each rule runs on its own.",
        webhooksWhereTitle: "Where notifications go",
        webhooksUrlLabel: "Discord or Telegram URL",
        webhooksUrlDesc: "A Discord webhook URL, or a Telegram bot URL with chat_id (https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>).",
        webhooksTest: "Test",
        webhooksTestOk: "Sent!",
        webhooksTestFailed: "Test failed",
        webhooksTestMessage: "Lumio: webhook works \u{1F389}",
        webhooksWhatTitle: "What gets sent",
        webhooksSourceCalendar: "My release calendar",
        webhooksSourceCalendarDesc: "Titles you watch in the release calendar, the day they premiere.",
        webhooksSourceTrakt: "My Trakt lists",
        webhooksSourceTraktDesc: "New titles appearing in lists you follow on Trakt.",
        webhooksSourceTraktNeedsAuth: "Requires a connected Trakt account.",
        webhooksTypesTitle: "Media types",
        webhooksTypesLabel: "Filter by type",
        webhooksTypesDesc: "Applied after the sources are merged.",
        webhooksTypeAll: "Everything",
        webhooksRunNow: "Run rules now",
        webhooksRunSent: "Sent {n} notification(s)",
        webhooksRunNothing: "Nothing new to send",
        webhooksScheduleHint: "Rules run automatically shortly after launch and every 6 hours while the app is open.",
        settingsGroupSystem: "SYSTEM",
        settingsPageTvMode: "TV mode",
        tvKeyboardModeLabel: "Keyboard on TV",
        tvKeyboardModeDesc: "Automatic uses Lumio\u2019s own keys for search and filters, and the system keyboard for long or secret fields \u2014 where you can type from your phone, use voice or a password manager.",
        tvKeyboardModeAuto: "Automatic",
        tvKeyboardModeLumio: "Lumio\u2019s own",
        tvKeyboardModeSystem: "System",
        tvHintModeLabel: "Help text in settings",
        tvHintModeDesc: "A switch, a segment and a slider already show where the row stands \u2014 a sentence below them that repeats it is a second line to read from ten feet away.",
        tvHintModeNever: "Never",
        tvHintModeValue: "Where it adds something",
        tvHintModeAlways: "Always",
        // Raden över klockan när den har något att säga (lib/tv-greeting.ts).
        tvGreetingResume: "{minutes} min left of {title}",
        tvGreetingResumeEpisode: "{minutes} min left of {title} {episode}",
        tvGreetingReleaseToday: "{title} is out now",
        tvGreetingReleaseTomorrow: "{title} arrives tomorrow",
        tvGreetingReleaseSoon: "{title} arrives in {days} days",
        // Korta former när meddelandet inte ryms bredvid snabbmenyn (tv-clock.tsx).
        tvGreetingResumeShort: "{minutes} min left \xB7 {title}",
        tvGreetingReleaseTodayShort: "Out now \xB7 {title}",
        tvGreetingReleaseTomorrowShort: "Tomorrow \xB7 {title}",
        tvGreetingReleaseSoonShort: "In {days} days \xB7 {title}",
        tvGreetingNight: "Still up",
        settingsPageOverview: "Overview",
        settingsPageAccount: "Account & profiles",
        settingsPageLibrary: "Library & metadata",
        settingsPageTracking: "Tracking services",
        settingsPageSources: "Sources & catalogs",
        settingsPageServers: "Server & network",
        settingsPagePlayer: "Player & quality",
        settingsPageHome: "Home & appearance",
        settingsPageBinge: "Binge!",
        settingsPageCinema: "Movie night",
        cinemaButton: "Movie night",
        cinemaButtonAsk: "Movie night \u2026",
        cinemaEyebrow: "Movie night",
        cinemaSheetPreviews: "Previews",
        cinemaSheetPreviewsHint: "Current films, plus one from your watchlist",
        cinemaGrain: "Film grain",
        cinemaGrainOff: "Off",
        cinemaGrainLight: "Light",
        cinemaGrainHeavy: "Heavy",
        cinemaLeader: "Countdown 3-2-1",
        cinemaLightsOut: "Lights out",
        cinemaIntroTitle: "{n} trailers from your watchlist",
        cinemaIntroTitleOne: "1 trailer from your watchlist",
        cinemaIntroTitleMixed: "{n} previews",
        cinemaIntroTitleMixedOne: "1 preview",
        cinemaTrailerMetaTrending: "Trailer {i} of {n} \xB7 popular right now",
        cinemaIntroThen: "then {title}",
        cinemaTrailerMeta: "Trailer {i} of {n} \xB7 from your watchlist",
        cinemaAddNextNight: "+ Next movie night",
        cinemaAddedNextNight: "Saved for next movie night",
        cinemaSkip: "Skip \u203A",
        cinemaToFilm: "To the film \xBB",
        cinemaPreviewSample: "Sample film",
        cinemaGroupMode: "Mode",
        cinemaEnabled: "Movie night mode",
        cinemaEnabledDesc: "Adds a Movie night button next to Play on film pages. The lights go down, current trailers, then the film.",
        cinemaSummaryEyebrow: "How the evening goes",
        cinemaSummaryOff: "Off \u2014 the button is hidden",
        cinemaSummaryTrailers: "{n} trailers",
        cinemaSummaryOneTrailer: "1 trailer",
        cinemaSummaryNoTrailers: "no trailers",
        cinemaSummaryRoom: "auditorium",
        cinemaSummaryFull: "full screen",
        cinemaSummaryLeader: "3-2-1",
        cinemaSummaryGrain: "film grain {level}",
        cinemaPreviewBtn: "Preview",
        cinemaGroupPreviews: "Previews",
        cinemaTrailerCount: "Number of trailers",
        cinemaTrailerCountDesc: "0 jumps straight to the countdown.",
        cinemaTrailerLength: "Length per trailer",
        cinemaTrailerLengthDesc: "Shortens long trailers.",
        cinemaLengthFull: "Full",
        cinemaSkipSeen: "Skip trailers you have already seen",
        cinemaAskBefore: "Ask before starting",
        cinemaAskBeforeDesc: "Shows the small sheet. Off: Movie night starts right away with the values here.",
        cinemaGroupRoom: "The auditorium",
        cinemaRoomView: "Auditorium view",
        cinemaRoomViewDesc: "Screen and seat rows during the previews. Off: trailers in full screen.",
        cinemaRoomViewPhoneDesc: "Applies to TV and computer. The phone always shows full screen.",
        cinemaGrainDesc: "Over the countdown and the first seconds of the film.",
        cinemaEnabledTvHint: "Adds Movie night next to Play on the film page.",
        cinemaRoomViewTvHint: "Screen and seat rows. Off: trailers in full screen.",
        cinemaRatingCard: "Age rating card",
        cinemaRatingCardDesc: "Shown before the film when it has an age rating.",
        cinemaLightsOn: "Lights up at the credits",
        cinemaLightsOnDesc: "The interface fades back in when the film ends.",
        cinemaGroupTry: "Try it",
        cinemaPreviewTv: "Preview movie night",
        cinemaRatingEyebrow: "Age rating",
        cinemaRatingFrom: "Ages {age}+",
        cinemaLightsUp: "Lights up",
        cinemaTurnPhone: "Turn your phone",
        cinemaTurnPhoneHint: "Tap to start anyway",
        cinemaPhoneHint: "On the phone, trailers play in full screen in landscape.",
        cinemaTrailersShort: "Trailers",
        cinemaHoldOkHint: "HOLD OK for menu \xB7 \u25B8 skip",
        cinemaAbort: "Cancel movie night",
        cinemaMinutes: "{h} h {m} min",
        settingsPageCustomPages: "Custom pages",
        settingsPageTheme: "Theme & scale",
        trailersEnabledLabel: "Show trailers",
        trailersEnabledHint: 'Trailers come from YouTube. On some networks YouTube blocks them ("Sign in to confirm you\u2019re not a bot") \u2014 turn this off to hide every trailer instead of hitting a dead player.',
        trailersOffTitle: "Trailers are turned off",
        trailersOffBody: 'Turn "Show trailers" back on under Settings \u2192 Home & appearance \u2192 Hero banner.',
        heroTrailerLabel: "Play trailer in hero",
        heroTrailerHint: "After a few seconds on a title, a muted trailer fades in behind the content.",
        playerLayoutTitle: "Player layout",
        plTabControls: "Controls",
        plTabTimeVolume: "Time & volume",
        plTabOverlays: "Overlays",
        plControlsEyebrow: "Controls",
        plEdit: "Edit",
        plAppliesInstantly: "Changes apply instantly",
        plResetPage: "Reset page to default",
        plTimeFormatDesc: "What the clock labels show on the seek bar.",
        plVolumeTitle: "Volume control",
        plVolumeDesc: "How the volume widget renders in the control row.",
        plVolSlider: "Slider",
        plVolSliderDesc: "A horizontal slider next to the speaker.",
        plVolStepper: "Stepper",
        plVolStepperDesc: "\u2212/+ buttons with a percentage readout.",
        plVolIcon: "Icon only",
        plVolIconDesc: "Just the speaker \u2014 click toggles mute.",
        plEditorEyebrow: "Layout editor",
        plEditorClickHint: "Click any control in the preview to move or hide it.",
        plEditorSummary: "{visible} visible, {hidden} hidden.",
        plEditorOpen: "Edit layout",
        plEditorSave: "Save",
        plEditorDiscard: "Discard",
        plEditorDiscardConfirm: "Discard unsaved layout changes?",
        plEditorHidden: "Hidden",
        plEditorHiddenEmpty: "Nothing hidden \u2014 click a control and use the eye to hide it.",
        plEditorControl: "Control",
        plEditorOrder: "Order",
        plEditorFixedPlace: "Has a fixed place in this layout \u2014 it can only be hidden.",
        plEditorLayoutDesktop: "Desktop",
        plEditorLayoutTv: "TV",
        plEditorLayoutLandscape: "Phone, landscape",
        plEditorLayoutPortrait: "Phone, portrait",
        plEditorVisible: "Visible",
        plTimeFormatTitle: "Time format on the seek bar",
        plTimeElapsedTotal: "Elapsed and total",
        plTimeElapsedTotalDesc: "22:22 / 1:47:00 \u2014 today's look.",
        plTimeRemaining: "Remaining only",
        plTimeRemainingDesc: "A single -1:24:38 label counting down.",
        plTimeElapsedOnly: "Elapsed only",
        plTimeElapsedOnlyDesc: "A single 22:22 label.",
        playerLayoutDesc: "Which controls the player bar shows, and in what order.",
        playerLayoutHint: "Changes apply immediately. The spacer splits the left and right control groups; Play/Pause cannot be hidden.",
        plPlayPause: "Play/Pause",
        plSeekBack: "Seek back 10s",
        plSeekForward: "Seek forward 10s",
        plSeek: "Timeline",
        plTime: "Time display",
        plSpacer: "Spacer (left/right split)",
        plSegmentBadges: "Intro/outro badges",
        plEndsAt: "Ends {time}",
        plGearTitle: "Settings",
        plGearSkipIntros: "Skip intros & recaps",
        plSpeedNormal: "Normal",
        plChapters: "Chapters",
        plChapterN: "Chapter {n}",
        plCreditsChapter: "Credits",
        shortcutsSaveMoment: "Keep this moment",
        clipTitle: "Clip",
        clipNew: "New clip",
        clipZoomed: "Zoomed \xB7 4 min",
        clipShare: "Share clip",
        clipShareSection: "Share",
        clipCopyLink: "Copy link",
        clipCopyImage: "Copy image",
        clipSaveFile: "Save file",
        clipSaveMoment: "Save to moments",
        clipFrom: "From {time}",
        clipSendTo: "Send to {phone}",
        clipPhoneGone: "The phone is no longer connected",
        clipShowQr: "Show QR code for the link",
        clipTvNote: "The TV only sends the in and out times. The phone renders and shares.",
        clipTvCancel: "Cancel with Back",
        clipTvStill: "Still \xB7 preview in the picture",
        clipScanQr: "Scan with your phone",
        clipTvBackCloses: "Back closes",
        clipSentTo: "Sent to {phone} \xB7 {len} s",
        clipFrame: "Frame {time}",
        clipLoopChip: "Loop \xB7 {len} s",
        clipTvKeys: "\u2190 \u2192 \xB11 s \xB7 hold 5 s \xB7 OK next \xB7 Back cancels",
        clipMomentSavedAt: "Moment saved \xB7 {time}",
        clipSavePhotos: "Save to Photos",
        clipCancel: "Cancel clip",
        clipShareNow: "Share now",
        clipTileLink: "Link",
        clipTileSave: "Save",
        clipTileMoment: "Moment",
        clipSavedPhotos: "Saved to Photos",
        clipSaveNeedsAndroid10: "Saving to Photos needs Android 10 \u2014 share it instead",
        clipNewWithLength: "New clip \xB7 {len}",
        clipRenderingIndeterminate: "Creating clip \u2026",
        clipFormatStill: "Image",
        clipRendering: "Creating clip \xB7 {pct} %",
        clipFailed: "The clip couldn't be created",
        clipLinkCopied: "Link copied",
        clipImageCopied: "Image copied",
        clipSaved: "Clip saved",
        clipClose: "Close clip",
        shortcutsClip: "Clip",
        plMoments: "Moments",
        plMomentKeep: "Keep this moment",
        plMomentJump: "Jump",
        plMomentRemove: "Remove moment",
        plMomentsClear: "Clear moments",
        plMomentsEmpty: "No moments yet",
        plMomentSaved: "Moment kept at {time}",
        plMomentExists: "There's a moment at {time} already",
        plMomentUnavailable: "Moments can't be kept for this source",
        plMute: "Mute",
        plVolume: "Volume slider",
        plAudioDelay: "Audio delay",
        plNextEpisode: "Next episode",
        plSwitchStream: "Switch stream",
        plStreams: "Streams",
        plSleepTimer: "Sleep timer",
        plSleepShort: "Sleep",
        plSleepOff: "Off",
        plSleepMinutes: "{n} min",
        plSleepEnd: "End of episode or film",
        plSleepStillThere: "Are you still there?",
        plSleepStillThereBody: "The sleep timer paused playback. Move or press anything to keep watching.",
        plCompanions: "Who's watching",
        plWhoWatches: "Who's watching with you?",
        plCompanionsJustMe: "Just me",
        plCompanionsShort: "With",
        audioDelayTitle: "Audio delay",
        audioDelayHint: "Adjust lip sync. A positive value plays audio later.",
        btAudioAutoOffset: "Compensate for Bluetooth latency",
        btAudioAutoOffsetDesc: "Wireless audio arrives 100\u2013300 ms late depending on codec. Added to your own delay when the output is wireless.",
        plFullscreen: "Fullscreen",
        plPip: "Picture-in-picture",
        plPipMobileOnly: "Phone only",
        plShow: "Show",
        plHide: "Hide",
        settingsTabTheme: "Theme",
        themeScaleTitle: "Theme & scale",
        appTheme: "Theme",
        appThemeDesc: "Background tone across the whole app.",
        themeMidnight: "Midnight",
        themeMidnightDesc: "Deep blue background.",
        themePitchDesc: "Default. Near-black for OLED and dark rooms.",
        themeSystemDesc: "Switches with the macOS appearance setting.",
        themeSystemDescWindows: "Switches with the Windows light/dark setting.",
        accentColor: "Accent color",
        profileSharedTab: "Shared settings",
        settingsTabSync: "Sync",
        plTabBehavior: "Behavior",
        settingsPageLang: "Language",
        bugEyebrow: "Report a bug",
        bugTitle: "Report a bug",
        bugHint: "A specific summary lands faster than a long paragraph. Steps to reproduce help most of all.",
        bugSummaryLabel: "What broke?",
        bugSummaryDesc: "One sentence about what went wrong.",
        bugSummaryPlaceholder: "The player freezes when I\u2026",
        bugStepsLabel: "Steps to reproduce",
        bugStepsDesc: "What did you do right before it happened?",
        bugStepsPlaceholder: "1. Open\u2026\n2. Press\u2026\n3. \u2026",
        bugCopyReport: "Copy report",
        bugCopyNote: "Version and platform are attached automatically \u2014 paste it wherever you report.",
        bugNoSummary: "Bug report",
        bugLogEyebrow: "Player log",
        bugLogTitle: "Export the player log",
        bugLogHint: "If a stream or the player misbehaves, attach this file to the report.",
        bugLogExport: "Download log",
        bugLogError: "Could not read the log.",
        advTitle: "Advanced",
        advTabMaintenance: "Maintenance",
        advTabAbout: "About",
        advBackupEyebrow: "Backup & restore",
        advBackupTitle: "Your entire setup in one file",
        advBackupHint: "Profiles, settings, watchlists, history \u2014 everything. Restore it on a new computer or keep it as insurance.",
        advExport: "Export backup",
        advImport: "Restore from file",
        advRestoreConfirm: "Restore the backup? Current values are overwritten and the app reloads.",
        advBackupError: "Could not read the backup file.",
        advDownloadsEyebrow: "Downloads",
        advDownloadsTitle: "Download folder",
        advDownloadsHint: "Where the player saves videos. When set, the folder picker is skipped.",
        advDownloadsUnset: "Ask every time",
        advDownloadsAppManaged: "Downloads are saved in the app and appear under My files.",
        settingsFolderPickerUnavailable: "Choosing a folder is not available on this device.",
        advDownloadsPick: "Choose folder",
        advDownloadsClear: "Clear",
        advOnboardingEyebrow: "Onboarding",
        advOnboardingTitle: "Replay the walkthrough",
        advOnboardingHint: "Runs the first-start guide again for this profile.",
        advOnboardingReplay: "Replay onboarding",
        advAboutEyebrow: "About",
        advAboutHint: "Version and platform \u2014 handy when reporting a bug.",
        advAboutVersion: "Version",
        advLegalEyebrow: "Legal",
        advLegalP1: "Lumio is an independent media client. It is not affiliated with, endorsed by, sponsored by, or in any way associated with any streaming service, plugin or addon author, or trademark holder referenced inside the app. All names, logos and brand references are property of their respective owners and are used only for compatibility and identification.",
        advLegalP2: "Lumio itself does not host, distribute, or index any media. All streams come from third-party sources, addons, or services that you configure yourself. You are responsible for what you choose to play and for complying with the laws of your jurisdiction.",
        advAboutPlatform: "Platform",
        advAboutDisplay: "Display",
        subStyleEyebrow: "Subtitle style",
        subStyleTitle: "How subtitles look",
        subStyleHint: "Size, position and colors during playback \u2014 live preview below.",
        langMetaEyebrow: "Metadata",
        langMetaTitle: "App & metadata language",
        langMetaHint: "What language the interface and the title information use.",
        langAppLanguage: "App language",
        langAppLanguageDesc: "The interface language of Lumio itself.",
        langMetadataLanguage: "Metadata language",
        langRegion: "Region",
        langRegionDesc: "The country that sets availability \u2014 which streaming services and release dates apply.",
        langMetadataLanguageDesc: "Titles, overviews and taglines from TMDb display in this language when a translation exists.",
        langBehaviorGroup: "AUTO-SELECTION",
        subtitlesOffByDefault: "Start with subtitles off",
        subtitlesOffByDefaultDesc: "Subtitles are still found and listed in the CC menu \u2014 they just never turn on by themselves.",
        trackBlockWords: "Never auto-select tracks containing",
        trackBlockWordsDesc: "Comma-separated words. Matching subtitle tracks are skipped during auto-selection; manual picks still work.",
        trackBlockWordsPlaceholder: "commentary, descriptive",
        vtTabLabel: "Video tuning",
        vtEyebrow: "Video tuning",
        playButtonMode: "Play button behavior",
        playButtonModeDesc: "Instant starts the best stream right away; Manual opens the stream list so you pick source and quality.",
        playModeInstant: "Instant",
        playModeManual: "Manual picker",
        showStreamQuality: "Stream quality in player",
        showStreamQualityDesc: "Shows what is actually playing (resolution \xB7 codec) under the title.",
        rtEyebrow: "Rendering",
        rtTitle: "Quality & HDR",
        rtHint: "How the desktop engine decodes and scales the picture.",
        rtProfile: "Quality profile",
        rtProfileDesc: "Light spares weak machines, Max uses high-quality scalers and debanding (needs a decent GPU).",
        rtProfileLight: "Light",
        rtProfileBalanced: "Balanced",
        rtProfileMax: "Max",
        rtToneMapping: "HDR tone-mapping",
        rtToneMappingDesc: "How HDR material maps to your display. Try hable or bt.2390 if HDR looks washed out.",
        rtInverseTm: "Inverse tone-mapping",
        rtInverseTmDesc: "Expands SDR material toward HDR on capable displays.",
        rtHwdec: "Hardware acceleration",
        rtHwdecDesc: "GPU decoding \u2014 easier on the battery and CPU. Turn off only when troubleshooting.",
        allowSoftwareDecoding: "Allow software decoding",
        allowSoftwareDecodingDesc: "Lets the phone or TV box decode video in software when its hardware can't. Can play files the hardware can't, but may stutter on weak devices.",
        dv7AsHdr10: "Play Dolby Vision profile 7 as HDR10",
        dv7AsHdr10Desc: "Plays the HDR10 base layer of Dolby Vision profile 7 (UHD Blu-ray remuxes) instead of Dolby Vision. Avoids wrong colours (green or purple tints, oversaturated skin) on devices that decode profile 7 poorly. Auto turns it on for Nvidia Shield.",
        dv7AsHdr10Auto: "Auto",
        dv7AsHdr10On: "On",
        dv7AsHdr10Off: "Off",
        androidSourceCache: "Cache streams",
        androidSourceCacheDesc: "Downloads the film ahead to storage through the app. Can help on unstable connections, but costs processing power and can make weak TV boxes stutter. Off: the player streams directly, like most players.",
        rtEngineNote: "Requires the built-in desktop engine (mpv).",
        atEyebrow: "Audio tuning",
        atTitle: "Shape the sound",
        atHint: "Without touching your system EQ. Applies on the built-in desktop engine; the browser player leaves audio untouched.",
        atNormalize: "Normalize loudness",
        atNormalizeDesc: "Evens out quiet dialogue and loud action scenes.",
        atBass: "Bass boost",
        atBassDesc: "A +6 dB low shelf for thin speakers.",
        atVoice: "Voice clarity",
        atVoiceDesc: "Lifts the dialogue range so voices cut through.",
        atDownmix: "Downmix surround to stereo",
        atDownmixDesc: "Folds 5.1/7.1 down to two channels \u2014 laptop speakers and headphones.",
        atEngineNote: "Requires the built-in desktop engine (mpv). Night mode composes on top.",
        vtTitle: "Picture adjustments",
        vtScopeLabel: "Applies to",
        vtScopeFilm: "Just this film",
        vtScopeAll: "All films",
        vtActive: "On",
        vtHint: "Applies live to an open player and to every playback that follows.",
        vtBrightness: "Brightness",
        vtContrast: "Contrast",
        vtSaturation: "Saturation",
        vtGamma: "Gamma (midtones)",
        vtSharpen: "Sharpen",
        vtPresetStandard: "Standard",
        vtPresetBrighter: "Brighter",
        vtPresetVivid: "Vivid",
        vtPresetCinema: "Cinema dark",
        vtPresetSharp: "Sharp",
        vtPresetLabel: "Preset",
        vtEngineNote: "Gamma and sharpen require the built-in desktop engine; the browser player applies the rest.",
        sfTabSafety: "Safety",
        sfDisplayEyebrow: "Display",
        sfDisplayHint: "Release types that never show up in the stream list.",
        sfDisplayOffNote: "Turn on a filter level above to choose what gets hidden.",
        deviceNoDolbyVision: "This device cannot decode Dolby Vision \u2014 pick a non-DV version of the stream.",
        deviceNoAudioDecoder: "This device cannot decode the lossless audio track (TrueHD/DTS-HD) \u2014 playing with another track, or without sound. Pick an AC3/EAC3/AAC version for audio.",
        deviceFormatUnsupported: "This device cannot decode that video format \u2014 try another version.",
        plTabNextEp: "Next episode",
        plNextEpHint: "Autoplay, the popup and outro behavior between episodes.",
        langAudioSubTab: "Audio & subtitles",
        langAudioSubTitle: "Audio & subtitle defaults",
        langAudioSubHint: "Preferred languages and how subtitles look in the player.",
        spoilersHint: "What gets blurred until you choose to reveal it.",
        profileCreateDone: "Done \u2014 switch to the profile",
        libContentEyebrow: "Content filters",
        libContentTitle: "What may appear on Home",
        libContentHint: "Watched and unreleased titles can be kept out of the catalog rows.",
        libCardsEyebrow: "Card badges",
        // Profilsidan enligt wireframen: WHO IS WATCHING NOW + ett redigeringskort.
        profilesWatchingEyebrow: "Who is watching now",
        profilesDeviceEyebrow: "On this device",
        profileColorDesc: "Used for the avatar ring and the initial.",
        profileAvatarDesc: "621 avatars in the built-in catalog. Without one the profile shows its initial.",
        profilePinNoneDesc: "Optional \u2014 four digits. No PIN set.",
        profilePinSetDesc: "Optional \u2014 four digits. A PIN is set.",
        profileChooseAvatar: "Choose avatar",
        profileResetDesc: "History, watchlist and settings for {name} are removed. The Trakt account is untouched.",
        // Förhandsvisningen av posterkortet: den ritar det RIKTIGA kortet, så
        // texterna här är bara innehållet i exemplet.
        settingsPreviewEyebrow: "Preview",
        posterPreviewTitle: "The Long Winter",
        posterPreviewGenreA: "Drama",
        posterPreviewGenreB: "Thriller",
        libCardsTitle: "Poster card badges",
        libCardsHint: "Tags and markers shown on poster cards across Home and grids.",
        profilesEyebrow: "Profiles",
        tvActiveProfile: "Active profile",
        tvManageProfiles: "Manage profiles",
        tvNotSet: "Not set",
        tvBackCloses: "Back closes and leaves focus on the row.",
        tvBackDiscards: "Back closes without saving.",
        tvKeyDone: "Done",
        tvQrScanHint: "Scan with your phone \u2014 nothing is typed with the remote.",
        profileSwitching: "Switching profiles",
        profileColorTenFixed: "Ten fixed colors",
        set: "Set",
        paste: "Paste",
        profileAvatarShowAll: "Show all avatars",
        srcCatalogs: "Catalogs",
        srcLibrary: "Library",
        srcStremioAddons: "Stremio addons",
        srcCatalogsWord: "catalogs",
        srcCatalogsNote: "Catalogs from the community \u2014 add community addons that expose catalogs. Each catalog becomes selectable as the source of its own home row.",
        srcAddAddon: "Add addon",
        srcAddAddonHint: "Paste the addon manifest URL. Example: \u2026/manifest.json",
        srcLibraryNote: "Pick a folder with video files. Lumio matches file names against TMDb and shows them in a library of its own.",
        srcLibraryPathNote: "The path is read automatically when Lumio starts.",
        pluginsCheckUpdates: "Check for updates",
        pluginsFindNew: "Find new plugins",
        pluginsMarketplace: "Official marketplace",
        pluginsAddSource: "Add plugin source",
        pluginsAddSourceHint: "GitHub repo or local ZIP file.",
        pluginsSources: "Plugin sources",
        pluginsSourcesNote: "External sources you have added yourself are listed here.",
        pluginsSourceType: "Source type",
        spoilPrevNextTitle: "S02E04 \xB7 The Long Way Down",
        spoilPrevNextDesc: "Kim meets her brother at the station and is forced to pick a side.",
        spoilPrevNextTag: "Next episode",
        spoilPrevNextTagKept: "Next episode \u2014 always visible",
        spoilPrevUnseenTitle: "S02E05 \xB7 What Comes After",
        spoilPrevUnseenDesc: "The aftermath forces a decision nobody is ready for.",
        spoilPrevUnseenTag: "Unseen",
        spoilPrevUnseenTagHidden: "Unseen \u2014 hidden",
        access: "Access",
        lanStreaming: "LAN streaming",
        accessType: "Access type",
        accessTypeDesc: "LAN = other devices on your home network. Remote = a direct link in to the computer.",
        cornerTopRight: "Top right",
        cornerTopLeft: "Top left",
        cornerBottomRight: "Bottom right",
        cornerBottomLeft: "Bottom left",
        hpTrailersColumns: "Columns",
        check: "Check",
        disabledWord: "Disabled",
        pluginsCheckUpdate: "Check for update",
        pluginsCatalogEntry: "Catalog entry",
        pluginsRowMenu: "Row menu",
        pluginsPluginId: "Plugin id",
        pluginsOfficial: "Official",
        pluginsRemovable: "Removable",
        pluginsPriorityOrder: "Priority order",
        pluginsPriorityOrderDesc: "Decides which source is asked first.",
        pluginsSignedOfficial: "Signed and listed in the official marketplace.",
        pluginsNotSigned: "Not signed by Lumio.",
        pluginsRuntimeDownloaded: "Runtime downloaded from the maker repo on install.",
        pluginsBundledWithApp: "Bundled with the app.",
        yes: "Yes",
        no: "No",
        view: "View",
        pluginsManageHint: "Enable, disable or reorder. Each plugin has its own menu with version, source and removal.",
        pluginsEnabled: "Enabled",
        pluginsOpenRepo: "Open repo",
        pluginsUninstall: "Uninstall",
        pluginsBundled: "bundled",
        pluginsThirdParty: "third-party",
        pluginsBundledCannotRemove: "Bundled plugins ship with Lumio and can only be turned off, not removed.",
        tvModeUse: "Use TV mode",
        tvModeUseDesc: "Bigger hit areas, remote-control focus and the side menu. On automatically on a TV. The view reloads when you change this.",
        tvModeAuto: "Auto",
        remoteSessionModeLabel: "Remote and LAN sessions",
        remoteSessionModeDesc: "Which UI browser sessions served by this app get. Auto inherits the TV mode choice above plus the device\u2019s own detection; Desktop and TV force one mode.",
        remoteSessionModeDesktop: "Desktop",
        remoteSessionModeTv: "TV",
        tvMenuPlacementTitle: "Menu placement",
        tvClockHiddenTitle: "Hide the clock",
        tvClockHiddenHint: "The greeting, time and date in the top right corner. Hidden here; nothing else changes.",
        tvMenuChipHiddenTitle: "Hide the Menu pill",
        tvMenuChipHiddenHint: "The menu stays and still opens with \u25C2 or \u25B4 from the content.",
        tvMenuPlacementHint: "Where the menu sits. The content is the same either way.",
        tvMenuPlacementTop: "Top",
        tvMenuPlacementSide: "Side",
        tvSegmentsEyebrow: "Rows per segment",
        tvSegmentLabel: "Segment",
        tvSegmentDesc: "Each segment has its own rows in TV mode. It starts out mirroring your normal home screen, so nothing changes until you change it here.",
        tvSegmentUntouched: "Mirrors your normal home screen. Change anything here and this segment gets rows of its own.",
        tvRowLayout: "Layout",
        tvRowShared: "Shared",
        tvAddRowDesc: "Only rows that belong to this segment are offered.",
        tvRemoveRowBody: "The row disappears from this segment. Your desktop home screen is untouched, and you can add the row back.",
        profileRequirePin: "Require PIN when switching profiles",
        profileRequirePinDesc: "Optional four-digit code per profile. Without it anyone switches instantly.",
        profileStartFrom: "Start new profiles from",
        profileStartFromDesc: "What a new profile inherits when created.",
        profileStartFromCurrent: "Everything as it looks now",
        profileStartFromDefaults: "Default settings",
        trackingSyncEyebrow: "What gets synced",
        trackingSyncHint: "How Lumio and Trakt exchange playback and list changes.",
        trackingCommunityEyebrow: "Community",
        trackingCommunityHint: "Public content from other Trakt users on your detail pages.",
        profileSharedHint: "Applies to the whole settings panel, not just this page.",
        profileSharedNoProfile: "The device runs in shared mode until a profile exists \u2014 then each profile makes its own choice.",
        profileSharedEyebrow: "Settings per profile",
        fontPair: "Typography",
        fontPairDesc: "Font pairing for interface and headings.",
        cardRadius: "Poster corner radius",
        cardRadiusDesc: "Rounding on poster cards across home and grids.",
        cardRadiusSquare: "Square",
        tsTitle: "Your themes",
        tsNew: "New theme",
        tsImport: "Import",
        tsImportFailed: "Could not read the theme file.",
        tsEmpty: "No custom themes yet \u2014 create one and the whole app previews it live while you edit.",
        tsUnnamed: "Unnamed theme",
        tsActive: "Active",
        tsUse: "Use",
        tsExport: "Export",
        tsDelete: "Delete",
        tsNamePlaceholder: "Theme name",
        tsCssPlaceholder: "Custom CSS (optional) \u2014 injected while the theme is active",
        tsLivePreview: "The app previews your edits live.",
        tsBg: "Background",
        tsSurface: "Surface",
        tsElevated: "Elevated",
        tsBorder: "Border",
        tsAccent: "Accent",
        accentColorDesc: "Buttons, highlights and the seek bar across the app.",
        themePitch: "Pitch black",
        themeSystem: "Follow system",
        uiScale: "Interface scale",
        uiScaleDesc: "Scales the entire interface. Useful on 4K and ultrawide screens.",
        fullCastTitle: "Full cast & crew",
        fullCastOpen: "Cast",
        dsLayoutTitle: "Streams",
        dsLayoutDesc: "Where the stream list sits on the details page.",
        dsLayoutSidebar: "Side panel",
        dsLayoutInline: "Below the content",
        heroCast: "Cast",
        newSeasonBadge: "New season",
        homeCardShape: "Card shape",
        homeCardShapeDesc: "Poster cards or wide backdrop cards on the home rows.",
        homeRowTitle: "Row name",
        homeRowTitleDesc: "Your own heading for this row. Empty = the name the source provides.",
        homeRowTitleDefault: "From the source",
        homeRowSpoilers: "Spoiler guard",
        homeRowSpoilersDesc: "Follow the spoiler settings on this row. Off shows episode titles and stills unmasked \u2014 useful where you have already watched, like Continue watching.",
        cardShapePoster: "Poster",
        cardShapeLandscape: "Landscape",
        homeExpandCards: "Expand card on focus",
        homeCardVhs: "VHS cases",
        homeCardVhsAuto: "Follow Theme & scale",
        homeCardVhsOn: "Turn on focus",
        homeCardVhsShelf: "Turned on the shelf",
        homeCardVhsOff: "Off",
        homeExpandCardsHint: "The card in focus widens into a backdrop with logo and facts. Portrait cards only.",
        qrAddonOpen: "Add via phone",
        qrAddonTitle: "Scan with your phone",
        qrAddonHint: "Open the page, paste a Stremio manifest URL and send \u2014 it installs right here.",
        qrAddonNoLan: "No LAN address found \u2014 connect the device to your network.",
        qrAddonInstallFailed: "Could not install the addon.",
        qrAddonInstalled: "{name} installed",
        stremioAddonConfigRequired: "This addon must be configured first \u2014 open its configure page in a browser, pick your options, and paste the personal manifest URL it gives you.",
        fullCastCastTab: "Cast",
        fullCastCrewTab: "Crew",
        fullCastSearch: "Search cast & crew",
        fullCastSortBilling: "Billing order",
        fullCastSortName: "Name",
        fullCastSortPopularity: "Popularity",
        fullCastKeyCrew: "Key crew",
        fullCastStills: "Stills",
        fullCastNoMatches: "No one matches the search.",
        fullCastCounter: "{cast} cast \xB7 {crew} crew",
        fullCastEpisodes: "{n} ep",
        personCredits: "Credits",
        personSortedByPopularity: "Sorted by popularity",
        tvFontScale: "Text size",
        tvFontScaleDesc: "Scales all text in TV mode without changing the layout.",
        tvMenuVariantTitle: "Menu style",
        tvMenuVariantHint: "The pill opens the menu when you want it; the rail stays along the left edge.",
        tvMenuVariantPill: "Pill",
        tvMenuVariantRail: "Rail",
        tvButtonScale: "Button size",
        tvButtonScaleDesc: "Size of the buttons on the home hero and the details page (Play, My list, Follow \u2026) in TV mode.",
        tvMenuScale: "Menu size",
        tvMenuScaleDesc: "Scales the side menu \u2014 icons and labels \u2014 in TV mode.",
        menuScale: "Menu scale",
        cornerScale: "Corner menu size",
        cornerScaleDesc: "Scales the icons in the top-right corner. Per device \u2014 never mirrored to remote sessions.",
        menuScaleDesc: "Scales only the side menu \u2014 icons and labels \u2014 independently of the interface scale.",
        reduceMotion: "Reduce motion",
        reduceMotionDesc: "Turns off animations and soft transitions throughout the app.",
        cardSheen: "Shine on cards",
        cardSheenDesc: "A soft light sweeps across a card when you point at it or select it.",
        vhsCards: "VHS cases",
        vhsCardsDesc: "Cards turn like a VHS case and show the title on the spine: when you point at or select them, or all the time like a shelf, straightening up when selected.",
        vhsModeOff: "Off",
        vhsModeFocus: "Turn on focus",
        vhsModeShelf: "Turned on the shelf",
        performanceMode: "Performance mode",
        performanceModeDesc: "For weaker TV boxes: removes blur and shadows behind menus and cards, and stops the hero trailer from playing by itself. Nothing disappears from the interface.",
        heroActionsExpanded: "Always show action labels",
        heroActionsExpandedDesc: "On the hero and on a title\u2019s details page, the icon buttons next to Play keep their names visible instead of revealing them on hover.",
        settingsPagePluginManage: "Manage plugins",
        settingsTabStatus: "Status",
        settingsTabQuick: "Quick settings",
        settingsTabProviders: "Providers",
        settingsTabAccounts: "Accounts",
        settingsTabApiKeys: "API keys",
        settingsTabAddons: "Addons",
        settingsTabSourcesMain: "Sources & addons",
        settingsTabFolders: "Folders & WebDAV",
        settingsTabScrapers: "Scrapers",
        settingsTabPlugins: "Plugins",
        cardTagNew: "New",
        showCardTags: "Show tags on cards",
        showCardTagsDesc: "Marks titles released in the last 30 days. Needs a known release date, so older catalogue items are never tagged.",
        traktCommentsTitle: "COMMENTS FROM TRAKT",
        traktCommentsTab: "Comments",
        showRecommendations: "Show recommendations on detail pages",
        showRecommendationsDesc: "The row of similar titles under a movie or series.",
        traktCommentSpoiler: "Contains a spoiler \u2014 click to reveal",
        showTraktComments: "Show comments on detail pages",
        traktScrobble: "Real-time scrobbling",
        traktScrobbleDesc: "Report playback to Trakt live \u2014 start, pause and stop land in your Trakt history as they happen.",
        traktTwoWaySync: "Two-way sync",
        traktTwoWaySyncDesc: "Every 15 minutes, watchlist changes and watched titles are merged in both directions.",
        traktConflictRule: "First-sync conflict rule",
        traktConflictRuleDesc: "What to do when the two sides differ and no earlier sync can tell additions from removals.",
        traktConflictMerge: "Merge (keep both)",
        traktConflictTrakt: "Trakt wins",
        traktConflictLocal: "This device wins",
        showTraktCommentsDesc: "Public Trakt comments under movies and series, and a button to write your own. Spoiler-marked ones stay hidden until you click them. Trakt only accepts comments in English.",
        showTraktCommentsNeedsTrakt: "Requires a connected Trakt account (Tracking \u2192 Trakt).",
        traktCommentsConnectHint: "Connect Trakt under Settings \u2192 Tracking to see comments.",
        traktCommentWrite: "Write a comment",
        traktCommentPlaceholder: "What did you think?",
        traktCommentEnglishHint: "Trakt only accepts comments in English, at least 5 words. Spoilers must be marked.",
        traktCommentWords: "{n} words",
        traktCommentSpoilerToggle: "Contains spoilers",
        traktCommentSend: "Post",
        traktCommentLooksSwedish: "This looks like Swedish \u2014 Trakt removes comments that are not in English and can suspend the account.",
        traktCommentSendAnyway: "Post anyway",
        traktCommentBanned: "Trakt has disabled commenting for this account.",
        traktCommentRateLimited: "Wait a moment before posting again.",
        traktCommentReviewNote: "From 200 words this is posted as a review.",
        traktCommentFailed: "The comment could not be posted.",
        shortcutsBindableTitle: "KEYS (CLICK TO CHANGE)",
        shortcutsTracks: "Tracks",
        shortcutsGlobal: "Global",
        shortcutsSubtitleCycle: "Cycle subtitle track",
        shortcutsSubtitleDelayBack: "Subtitle delay \u22120.1 s",
        shortcutsSubtitleDelayForward: "Subtitle delay +0.1 s",
        shortcutsPressKey: "Press a key\u2026",
        shortcutsReset: "Reset to default",
        shortcutsConflict: "That key is already used by {name}. Pick another one.",
        shortcutsBindableHint: "Esc always closes the player and cannot be rebound. Bindings are stored per profile.",
        settingsTabLocalFiles: "Local files",
        settingsTabThisComputer: "This computer",
        settingsTabStorage: "Storage",
        settingsTabHome: "Home",
        /* Underfliken på sidan Hem & utseende: layout, navigering, hero, visning —
           val som gäller fler sidor än Hem, därför inte 'Hem'. */
        settingsTabAppearance: "Appearance",
        settingsTabZapp: "Zapp",
        settingsSearchPlaceholder: "Search settings",
        settingsNyBadge: "NEW",
        ovKickerDone: "DONE",
        ovKickerAction: "ACTION",
        ovTraktTitle: "Trakt",
        ovTraktConnectedDesc: "Connected \u2014 playback and lists sync.",
        ovTraktMissingDesc: "Not connected \u2014 watch state stays on this device.",
        ovFfmpegTitle: "Video tools missing on this device",
        ovFfmpegMissingDesc: "No ffmpeg for this processor \u2014 casting, chapters and subtitle sync are off.",
        ovOpenTracking: "Open Tracking services",
        ovTmdbTitle: "TMDb key",
        ovTmdbOkDesc: "Saved \u2014 catalogs and title logos load.",
        ovTmdbDefaultDesc: "Built-in key in use \u2014 your own gives a higher quota.",
        ovTmdbMissingDesc: "Missing \u2014 Home loses its catalog rows.",
        ovOpenLibrary: "Open Library & metadata",
        appLanguageDesc: "Language of the app interface. Stored per profile.",
        settingsPageFilters: "Stream filters",
        sfLevelTitle: "FILTERING LEVEL",
        sfLevelStrict: "Strict",
        sfLevelStrictDesc: "Rejects suspicious file extensions, wrong year or episode, season packs on episode searches, trailers/samples and cams.",
        sfLevelBalanced: "Balanced",
        sfLevelBalancedDesc: "Follows the rules below \u2014 protection against cams and screeners, no extra heuristics.",
        sfLevelOff: "Off",
        sfLevelOffDesc: "No filtering. Every stream from every source shows, even obvious junk.",
        sfTogglesTitle: "RULES",
        sfHideCam: "Hide cams",
        sfHideTs: "Hide telesync/telecine",
        sfHideScr: "Hide screeners",
        sfHideBelow720p: "Hide below 720p",
        sfForcedByStrict: "Always on at the Strict level.",
        settingsAutosaved: "Changes saved",
        settingsAutosaveError: "Some changes could not be saved",
        profileName: "Profile name",
        profileNamePlaceholder: "For example Family or Kids",
        createProfile: "Create profile",
        newProfileHeading: "New profile",
        profileSourceLabel: "Start the profile from",
        profileSourceBaseline: "Everything as it is now",
        profilePinLabel: "PIN",
        profilePinOptionalLabel: "PIN (optional)",
        profilePinEnterTitle: "Enter PIN for {name}",
        slLockWith: "Lock with\u2026",
        slEyebrow: "{title} \xB7 Series lock",
        slCreateTitle: "Lock this series with\u2026",
        slCreateLead: "None of you sees the next episode until the others have seen the previous one.",
        slYou: "You",
        slHasPin: "Has PIN",
        slNoPin: "No PIN",
        slMode: "Mode",
        slTogether: "Together",
        slTogetherHint: "You watch it together. An episode that counts as watched is marked for everyone, whichever profile was on.",
        slSolo: "Separately",
        slSoloHint: "Everyone watches on their own profile. Whoever is ahead waits for the others.",
        slPinToggle: "Require PIN for Watch anyway",
        slPinOff: "Off: anyone can choose Watch anyway right away.",
        slPinOn: "Whoever chooses Watch anyway enters their profile PIN.",
        slPinNone: "None of the selected profiles has a PIN.",
        slPinPartialOne: "{names} has no PIN and can watch anyway without a code.",
        slPinPartialMany: "{names} have no PIN and can watch anyway without a code.",
        slPosMe: "You're on {code}",
        slPosOther: "{name} is on {code}",
        slPosMeNotStarted: "You haven't started",
        slPosOtherNotStarted: "{name} hasn't started",
        slWaitOne: "You'll wait until {name} has seen {code}.",
        slWaitMany: "{ahead} will wait until {name} has caught up to {code}.",
        slOthersWait: "{names} will wait until you've seen {code}.",
        slSame: "You're on the same episode, {code}. Good start.",
        slConfirm: "Lock series",
        slCreatedTogether: "{title} is locked with {names}. You're watching it together.",
        slCreatedSolo: "{title} is locked with {names}. You'll wait for each other.",
        slMarker: "Locked with {names} \xB7 {mode}",
        slManage: "Manage lock",
        slParticipants: "Participants",
        slSeenCode: "Seen {code}",
        slNotStarted: "Not started",
        slRemoveMember: "Remove",
        slAddMember: "+ {name}",
        slHistoryEntry: "{name} \xB7 {code} \xB7 {when}",
        slHistoryEmpty: "Nobody has watched ahead yet.",
        slDone: "Done",
        slRemoveLock: "Remove lock",
        slRemoveTitle: "Remove the lock?",
        slRemoveText: "You'll each watch at your own pace again. Nothing you've watched changes.",
        slKeep: "Keep the lock",
        slRemoveLastTitle: "Remove {name}?",
        slRemoveLastText: "A lock needs at least two. Removing {name} ends the lock on {title} and you'll watch at your own pace again.",
        slRemovedToast: "The lock is removed. You're back to your own pace.",
        slLockedTitle: "{code} is locked",
        slLockedTextOne: "{names} hasn't seen {code} yet.",
        slLockedTextMany: "{names} haven't seen {code} yet.",
        slWatchAnyway: "Watch anyway",
        slFootnote: "{names} will see that you watched ahead.",
        slFootnotePin: "Watch anyway needs your PIN.",
        slFootnoteNoPin: "You don't have a PIN, so no code is needed.",
        slPinTitle: "Enter PIN for {name}",
        slPinSubtitle: "to watch {code} anyway",
        slContinueWaiting: "Waiting for {names} \xB7 {code}",
        slContinueMetaLocked: "Series \xB7 {code} \xB7 Locked",
        slNextLocked: "Next episode is locked. Waiting for {names}",
        slClose: "Close",
        slTogetherToast: "{code} marked as watched for {names}.",
        slUnlockedToastOne: "{names} has seen {code}. You can carry on.",
        slUnlockedToastMany: "{names} have seen {code}. You can carry on.",
        slPlayCode: "Play {code}",
        slAheadToast: "{name} watched {code} before you.",
        slOkay: "Okay",
        slOwnOverrideToast: "You watched {code} before {names}. {names} will see it.",
        slWaitingForYouOne: "{names} is waiting for you. {next} opens when you've seen {code}.",
        slWaitingForYouMany: "{names} are waiting for you. {next} opens when you've seen {code}.",
        slEndedOne: "The lock on {title} has ended. {names} is no longer in the app, and a lock needs at least two. You're watching at your own pace now.",
        slEndedMany: "The lock on {title} has ended. {names} are no longer in the app, and a lock needs at least two. You're watching at your own pace now.",
        slNewSeasonOne: "{code} is waiting for {names}. Season {season} starts when {names} has seen {requires}.",
        slNewSeasonMany: "{code} is waiting for {names}. Season {season} starts when {names} have seen {requires}.",
        slFinishedTitle: "Finished together",
        slFinishedText: "You've seen all {count} episodes. The lock isn't needed anymore.",
        slMyLocksTitle: "Series locks",
        slMyLocksLead: "Series you've locked with others",
        slMyLocksEmpty: "Lock a series from its details page with Lock with\u2026",
        slStatusWaiting: "You're waiting for {names}",
        slStatusCanContinue: "You can carry on",
        slStatusInStep: "You're in step",
        slStatusWaitedOnOne: "{names} is waiting for you",
        slStatusWaitedOnMany: "{names} are waiting for you",
        slRowSeenAll: "Seen by everyone",
        slRowMissingOne: "{names} hasn't seen it",
        slRowMissingMany: "{names} haven't seen it",
        slRowNext: "Up next",
        slRowNextSeenByOne: "Up next \xB7 {names} has seen it",
        slRowNextSeenByMany: "Up next \xB7 {names} have seen it",
        slRowWaiting: "Waiting for {names}",
        slRowLocked: "Locked",
        slRowAheadOfYou: "{names} watched before you",
        slRowOverrideMineOne: "You watched anyway \xB7 {names} hasn't seen it",
        slRowOverrideMineMany: "You watched anyway \xB7 {names} haven't seen it",
        slGroupMoreOne: "1 more episode waiting",
        slGroupMoreMany: "{count} more episodes waiting",
        slGroupMoreHint: "Open one at a time, in step with {names}.",
        slGroupSeason: "All of season {season} is waiting",
        slGroupSeasonHint: "Opens one episode at a time after {code}, in step with {names}.",
        slShow: "Show",
        slHide: "Hide",
        slAnd: "and",
        profilePinSetTitle: "Choose a PIN for {name}",
        profilePinCurrentTitle: "Enter the current PIN for {name}",
        profilePinRemoveTitle: "Enter PIN to remove the lock for {name}",
        profilePinConfirm: "Enter the code again to confirm",
        profilePinWrong: "Wrong PIN",
        profilePinMismatch: "The codes did not match \u2014 start over",
        profilePinFormatError: "PIN must be exactly 4 digits",
        profilePinSet: "Set PIN",
        profilePinChange: "Change PIN",
        profilePinRemove: "Remove PIN",
        profileSourceEmpty: "Empty, like a new install",
        profileSourceProfile: "A copy of",
        deleteProfileKeepData: "Keep the data when deleting",
        deleteProfileKeepHint: "Deleting {name} keeps its data as the starting point. Unticked, the data is removed and the app falls back to what it held before profiles.",
        deleteProfile: "Delete profile",
        resetProfile: "Reset profile",
        activeProfile: "Active profile",
        switchProfile: "Switch profile",
        profileSwitcher: "Profile",
        streamProviderTitle: "Stream provider",
        configure: "Configure",
        customScraper: "Custom",
        rdApiKeyLabel: "Stream provider API key",
        streamProviderManifestPlaceholder: "Paste manifest URL here...",
        customManifestPlaceholder: "https://your-stream-provider.example.com/manifest.json",
        hevcTitle: "HEVC / H.265 Codec",
        hevcDesc: "Required to play MKV/HEVC streams in the browser. Installs the Microsoft HEVC Video Extension via PowerShell.",
        installHevc: "Install HEVC Codec",
        installed: "Installed",
        checking: "Checking\u2026",
        installing: "Installing\u2026",
        hevcRestart: "Restart your browser for the codec to take effect.",
        tmdbApiToken: "API Token (Bearer)",
        tmdbApiKey: "API Key (v3)",
        language: "Language",
        region: "Region",
        tmdbEnvNote: "",
        tmdbDefaultHint: "Using bundled default \u2014 fill in to override.",
        homekitTitle: "HomeKit",
        homekitDesc: "Expose Lumio as its own HomeKit accessory and manage pairing from here.",
        homekitEnableAccessory: "Enable HomeKit accessory",
        name: "Name",
        homekitStatusLabel: "Status",
        homekitNotConnected: "Not connected",
        homekitDisabled: "Disabled",
        homekitReady: "Ready for pairing",
        homekitNotPublished: "Not published",
        homekitStatusFetchError: "Could not fetch HomeKit status",
        homekitServerError: "Could not contact HomeKit server",
        homekitActionFailed: "HomeKit operation failed",
        homekitResetInfo: "Pairing reset and a new HomeKit identity created. Restart Lumio before adding it in the Home app -- the network advertisement only refreshes on startup.",
        homekitPublishedInfo: "Accessory published. Add it in the Home app.",
        homekitSavedInfo: "Saved. The changes are live \u2014 no restart needed.",
        homekitSaveFailed: "Could not save the settings.",
        homekitEventRules: "Event rules",
        movieStarts: "Movie starts",
        moviePaused: "Movie pauses",
        videoClosed: "Video closes",
        openGuide: "Open guide",
        closeGuide: "Close guide",
        startPairing: "Publish accessory",
        resetPairing: "Reset pairing",
        refreshStatus: "Refresh status",
        starting: "Publishing...",
        resetting: "Resetting...",
        homekitGuideTitle: "HomeKit guide",
        homekitGuideStep1: "Press Start pairing.",
        homekitGuideStep2: "Add the accessory in the Home app and enter the PIN code from the field above.",
        homekitGuideStep3: "Name the switches the same as the event rules.",
        homekitGuideStep4: "Create one automation per switch with the trigger Turns on.",
        homekitGuideStep5: "Choose your lights and set brightness/scene for each event.",
        homekitSwitchesToUse: "Switches to use",
        homekitSwitchesList: "Movie starts, Movie pauses, Video closes",
        groqTitle: "Groq AI Search",
        groqDescPrefix: "Enable AI search with natural language.",
        spotifyTitle: "Spotify",
        localFilesTitle: "Local files",
        localFilesDesc: "Choose a folder with video files. Lumio matches filenames to TMDb and shows them in a separate library.",
        chooseFolder: "Choose folder",
        removeFolder: "Remove folder",
        playbackTitle: "Playback",
        playbackDesc: "Settings for video playback.",
        homeSectionsTitle: "Homepage",
        homeSectionsDesc: "Choose order, layout and card count for each homepage section. Up to 3 custom sections are supported.",
        homeBackgroundTitle: "Homepage background",
        homeBackgroundDesc: "Use your own image URLs instead of the random homepage backdrop.",
        homeBackgroundPlaceholder: "https://example.com/background-1.jpg\nhttps://example.com/background-2.jpg",
        uploadImages: "Upload images",
        enabled: "Enabled",
        uploadedImage: "Uploaded image",
        localUploadStored: "Saved locally in Lumio",
        remove: "Remove",
        drag: "Drag",
        moveUp: "Move up",
        moveDown: "Move down",
        moveUpShort: "Up",
        moveDownShort: "Down",
        homeRowRecent: "Last watched",
        homeRowTrending: "Trending",
        homeRowMovies: "Popular movies",
        homeRowSeries: "Popular series",
        homeRowTrailers: "Trailers",
        homeRowVod: "Video on demand",
        homeRowBinge: "Binge!",
        bingeStart: "Start binge",
        bingeEmpty: "Add series to this list to start a binge",
        bingeDeleteList: "Delete list",
        bingeRenameList: "Rename the list",
        bingeManageLists: "Manage lists",
        bingeStreamIndex: "Episode {n} of the stream",
        bingeZapOn: "Zap onward",
        bingeStayInSeries: "Stay in this series",
        bingeNextUp: "Next in your binge",
        bingeOneMoreSame: "One more of the same",
        bingeQueueTitle: "Up next",
        bingeQueueReshuffles: "The queue is reshuffled after every episode",
        bingeReshuffle: "Shuffle again",
        bingeResolving: "Finding a stream\u2026",
        bingePicking: "Picking a series\u2026",
        bingeListEmpty: "Nothing in this list has an episode left to play.",
        bingeSectionEyebrow: "BINGE!",
        bingeSectionTitle: "How the stream picks",
        bingeSectionHint: "Binge respects the player settings you already have for skipping intros and advancing at the credits.",
        bingeEpisodePickDesc: "How the stream picks an episode from each series.",
        bingePickNextUnseenShort: "Next unseen",
        bingePickRandomShort: "Random episode",
        bingePickRandomUnseenShort: "Random, never seen",
        bingeAutoChain: "Chain onward automatically",
        bingeAutoChainDesc: "The next series starts when the episode ends.",
        bingeAvoidRepeat: "Never two episodes from the same series in a row",
        bingeAvoidRepeatDesc: "Applies when the list has at least three series.",
        bingeIncludeWatchlist: "Include the watchlist",
        bingeIncludeWatchlistDesc: "Series you follow join the stream without being saved to the list.",
        bingeSkipWatched: "Skip watched material",
        bingeSkipWatchedDesc: "Episodes marked as watched are never drawn.",
        cpMetricPages: "Own pages",
        cpMetricRows: "Rows in page",
        cpNoPageOpen: "No page open",
        cpGeneratorEyebrow: "GENERATOR",
        cpGeneratorTitle: "Create a page from a theme",
        cpGeneratorPlaceholder: "Star Wars, 80s, Netflix\u2026",
        cpGenerate: "Generate",
        cpTemplate_franchise: "Franchise",
        cpTemplate_decade: "Decade",
        cpTemplate_mood: "Mood",
        cpTemplate_streaming: "Streaming service",
        cpTemplate_network: "Network (TMDb id)",
        cpTemplate_director: "Director (TMDb id)",
        cpTemplate_actor: "Actor (TMDb id)",
        cpTemplate_collection: "Collection (TMDb id)",
        cpTemplate_trakt: "Trakt list (id)",
        cpPagesEyebrow: "PAGES",
        cpPageName: "Page name",
        cpAddFilter: "+ Add filter",
        cpRemoveFilter: "Remove filter",
        cpNoFilters: "No filters \u2014 the row is the widest question there is.",
        cpAllFiltersSet: "Every filter is already set.",
        cpRemovePage: "Remove page",
        cpRemovePageBody: "The page and its rows are deleted. Rows on other pages that opened it fall back to the results grid.",
        cpRowActive: "Row active",
        cpTemplatesEyebrow: "TEMPLATES",
        cpTemplateNeedsTheme: "Needs a theme",
        cpPagesTitle: "Your pages",
        cpNoPages: "No pages yet. Write a theme above and generate one.",
        cpNoRows: "This page has no rows yet.",
        cpRowCount: "{n} rows",
        cpUseAsStart: "Open the app on this page",
        cpUseAsStartDesc: "The app starts here instead of the home view. The home view stays in the side menu.",
        cpRowTitle: "Row name",
        cpRowMediaType: "Type",
        cpRowSort: "Sort",
        cpRowLayout: "Layout",
        cpRowRuntime: "Runtime (min)",
        cpRowCertification: "Age rating + country",
        cpFrom: "From",
        cpTo: "To",
        cpRowShowAll: "Show all opens",
        cpEmptyPage: "Empty page",
        cpAddRow: "+ Add row",
        cpRowSource: "Source",
        cpSourceDiscover: "TMDb search (discover)",
        cpSourceManual: "Hand-picked titles",
        cpManualEyebrow: "HAND-PICKED",
        cpManualSearch: "Search for a title to add\u2026",
        cpSourceTrakt: "Trakt list",
        cpSourceCollection: "TMDb collection",
        cpSourceContinue: "Continue watching",
        cpSourceWatchlist: "Watchlist",
        cpRowTitleQuery: "Title contains",
        cpRowKeywords: "Keywords (TMDb tags)",
        cpRowKeywordsHint: "star wars, space opera",
        cpRowGenres: "Genres",
        cpRowYears: "Year",
        cpRowRatingMin: "Rating from",
        cpRowPeople: "People",
        cpRowIdHint: "e.g. 1893",
        cpRowCollectionId: "Collection (TMDb id)",
        cpRowTraktList: "Trakt list (id or slug)",
        cpRowShowAllLabel: "Show all says",
        cpRowShowAllLabelHint: "Empty = the usual wording.",
        cpProviderHint: "Streaming service needs an exact name: {list}",
        cpInMenu: "In menu",
        cpMetricInMenu: "In the side menu",
        cpSearchPerson: "Search for an actor or director\u2026",
        cpSearchCompany: "Search for a studio\u2026",
        cpSearchCollection: "Search for a collection, e.g. Star Wars\u2026",
        cpRowCollection: "Collection",
        cpNoEntity: "Nothing found by that name.",
        cpEnterToAdd: "Enter",
        cpPickSuggestion: "Pick one of the suggestions \u2014 typing alone does not filter.",
        cpNoKeyword: "No TMDb keyword by that name. A person is filtered with People, not Keywords.",
        cpPreviewEyebrow: "IN THE ROW",
        cpPreviewCount: "{n} shown",
        cpPreviewSpares: "{n} spare",
        cpLoadMore: "Load more",
        cpEmptyVotes: "No hits \u2014 the vote floor is too high for this narrow a filter. Remove the Votes chip.",
        cpPreviewEmpty: "No hits. Loosen a filter, or check that the keyword is a real TMDb keyword.",
        cpPin: "Pin to the front",
        cpUnpin: "Unpin",
        cpExclude: "Leave out of the row",
        cpInclude: "Put back in the row",
        cpOnlyMovies: "People and age rating only exist for films, so the row shows films.",
        cpOnlySeries: "Network only exists for series, so the row shows series.",
        cpImpossibleMix: "People/age rating (films) and network (series) cannot be combined \u2014 the row will be empty.",
        cpFilterEyebrow: "TMDB FILTERS",
        cpCallLabel: "CALL",
        cpHits: "{n} hits",
        cpRowCardShape: "Card shape",
        cpShapePoster: "Poster 2:3",
        cpShapeLandscape: "Landscape 16:9",
        cpCountCards: "{n} cards",
        cpRowCardCount: "Count",
        cpFieldYear: "Year",
        cpFieldRating: "Rating",
        cpFieldVotes: "Votes",
        cpFieldLanguages: "Language",
        cpFieldCompanies: "Studio",
        cpFieldNetworks: "Network (TMDb id)",
        cpFieldProviders: "Service",
        cpFieldCertCountry: "Country",
        cpShowAllGrid: "The results grid",
        cpShowAllNone: "No link",
        cpTypeAll: "Film & series",
        cpTypeMovie: "Film",
        cpTypeSeries: "Series",
        cpSortRelevance: "Relevance",
        cpSortRating: "Highest rated",
        cpSortNewest: "Newest",
        cpSortOldest: "Oldest",
        cpLayoutSlider: "Slider",
        cpLayoutGrid: "Grid",
        settingsTabCustomPages: "My pages",
        bingeAutoNewEpisodes: "New episodes",
        bingeEpisodeRun: "Episodes in a row from the same series",
        bingeEpisodeRunDesc: "How long the stream stays with one series before moving on.",
        bingeRunOne: "One, then switch",
        bingeRunCount: "A set number",
        bingeRunAll: "The whole series",
        bingeEpisodesPerSeries: "Episodes per series before switching \u2014 {n}",
        bingeEpisodesPerSeriesDesc: "How many episodes in a row from the same series.",
        bingeDefaultList: "Default list",
        bingeDefaultListDesc: "The list that starts when you have not picked one.",
        bingeDefaultListAuto: "First list with series",
        bingeManageListsDesc: "Build your lists and pick which series belong to them.",
        bingeOpen: "Open",
        bingeAutoWatchlist: "Followed series",
        bingeAutoInProgress: "Half-watched",
        bingeYourLists: "Your lists",
        bingeNewList: "+ New binge list",
        bingeNewListName: "New list",
        bingeListSeries: "{series} series",
        bingeAutoMeta: "Auto \xB7 {series} series",
        bingeAddSeries: "Add series",
        bingeDoneAdding: "Done",
        bingeStartList: "Binge the list",
        bingeAddToList: "Add to list",
        bingeRemoveFromList: "Remove from list",
        bingeEpisodePick: "Episode choice",
        bingePickNextUnseen: "The stream plays the next unseen episode of each series.",
        bingePickRandom: "The stream plays a random episode, seen or not.",
        bingePickRandomUnseen: "The stream plays a random episode you have never seen.",
        bingeStartHint: "random episode",
        bingeListMeta: "{name} \xB7 {series} series",
        homeRowLiveTv: "Live TV",
        homeRowTraktCollection: "Watchlist",
        homeRowCustom1: "Custom section 1",
        homeRowCustomN: "Custom section {n}",
        hpAddCustomRow: "Add row",
        hpRemoveCustomRow: "Remove row",
        homeRowCustom2: "Custom section 2",
        homeRowCustom3: "Custom section 3",
        homeSearchTitle: "Homepage search",
        homeSearchDesc: "Show or hide the large search field on the homepage.",
        homeSearchToggleLabel: "Hide search field on homepage",
        homeTopMenuTitle: "Top menu",
        homeTopMenuDesc: "Choose which top buttons to show and change their order.",
        homeTopMenuSettingsShortcut: "Settings can always be opened with Cmd+, on Mac or Ctrl+, on other keyboards.",
        homeMainMenuTitle: "Homepage menu",
        homeMainMenuDesc: "Choose which menu buttons to show and change their order with up and down.",
        profileSelector: "Profile selector",
        alwaysVisible: "Always visible",
        collapseSection: "Collapse section",
        expandSection: "Expand section",
        homeSource: "Source",
        homeSourceMovies: "Movies",
        homeSourceSeries: "Series",
        homeSourceSeriesWatchlist: "New episodes",
        homeSourceSeriesWatchlistSubtitle: "Watchlist",
        homeSourceMovieWatchlist: "My list",
        homeSourceTraktCollection: "Watchlist",
        homeWatchlistList: "List",
        homeWatchlistType: "Type",
        pluginYoutubeNotConnected: "Not connected",
        pluginYoutubeConnection: "Connection",
        pluginYoutubeConnectionNote: "This plugin uses your own Google Desktop Client ID and YouTube Data API key.",
        pluginYoutubeClientId: "Google OAuth Client ID",
        pluginYoutubeApiKey: "YouTube API Key",
        pluginYoutubeOwnAppTitle: "How to create your own app",
        pluginYoutubeOwnAppStep1: "1. Create a Google Cloud project.",
        pluginYoutubeOwnAppStep2: "2. Enable YouTube Data API v3.",
        pluginYoutubeOwnAppStep3: "3. Configure the OAuth consent screen.",
        pluginYoutubeOwnAppStep4: "4. Create an OAuth Client ID for Desktop app.",
        pluginYoutubeOwnAppStep5: "5. Create an API key restricted to YouTube Data API v3.",
        pluginYoutubeOwnAppStep6: "6. Paste the client ID and API key here, then reconnect YouTube.",
        pluginYoutubeOwnAppNote: "For private use you do not need your own domain. For localhost/browser development you can also create a Web application client, but normal plugin use should rely on a Desktop app client.",
        pluginYoutubeVideoOptions: "Video options",
        pluginYoutubeHero: "Hero",
        pluginYoutubeHeroHelp: "Uses the latest followed video as the Home hero. Once opened, that video stays hidden until a newer one appears.",
        pluginYoutubeKeepHero: "Keep hero visible",
        pluginYoutubeKeepHeroHelp: "Keeps the latest YouTube hero visible after opening it, and only replaces it when a newer video appears during startup warmup.",
        pluginYoutubeHideShorts: "Hide shorts",
        pluginYoutubeHideShortsHelp: "Hides short-form YouTube videos from grids when duration data is available.",
        pluginYoutubeConnect: "Connect YouTube",
        pluginYoutubeConnecting: "Connecting\u2026",
        pluginYoutubeRefresh: "Refresh",
        pluginYoutubeRefreshing: "Refreshing\u2026",
        pluginYoutubeReconnect: "Reconnect",
        pluginYoutubeDisconnect: "Disconnect",
        pluginYoutubeDisconnecting: "Disconnecting\u2026",
        pluginYoutubeClearCache: "Clear cache",
        pluginYoutubeConnectError: "Could not connect YouTube.",
        pluginYoutubeDisconnectError: "Could not disconnect YouTube.",
        pluginYoutubeLoadError: "Failed to load YouTube data.",
        pluginYoutubeRowLoadError: "Failed to load YouTube row.",
        pluginYoutubeFollowingPage: "Following",
        pluginYoutubeChannelsPage: "Channels",
        pluginYoutubePlaylistsPage: "Playlists",
        pluginYoutubeChannelPage: "Channel",
        pluginYoutubePlaylistPage: "Playlist",
        pluginYoutubeFollowingSubtitle: "Latest videos from channels you follow.",
        pluginYoutubeChannelsSubtitle: "Search for new channels and manage who you follow.",
        pluginYoutubePlaylistsSubtitle: "Your saved YouTube playlists.",
        pluginYoutubeChannelSubtitle: "Latest videos from this channel.",
        pluginYoutubePlaylistSubtitle: "Playlist videos",
        pluginYoutubeMatchingChannels: "Matching channels",
        pluginYoutubeYourSubscriptions: "Your subscriptions",
        pluginYoutubeSearchChannels: "Search channels",
        pluginYoutubeSetupPrompt: "Add your Google Desktop Client ID and YouTube API key in the YouTube plugin settings to get started.",
        pluginYoutubeConnectPrompt: "Connect YouTube in Settings to browse your subscriptions, channels and playlists.",
        pluginYoutubeLoading: "Loading your YouTube data\u2026",
        pluginYoutubePlaylistBadge: "Playlist",
        pluginYoutubeChannelBadge: "Channel",
        pluginYoutubeVideoBadge: "Video",
        pluginYoutubeVideos: "videos",
        pluginYoutubeUnfollow: "Unfollow",
        pluginYoutubeOpenFeed: "Open feed",
        pluginYoutubeFollowingRow: "YouTube following",
        plexConnect: "Connect Plex",
        plexDisconnect: "Disconnect",
        plexWaiting: "Waiting\u2026",
        plexRequestFailed: "Plex request failed.",
        plexNoServers: "No Plex servers found.",
        plexChooseServer: "Server",
        plexRefreshLibraries: "Refresh libraries",
        plexRefreshingLibrariesButton: "Refreshing\u2026",
        plexRefreshLibrariesDone: "Libraries refreshed.",
        plexRefreshLibrariesEmpty: "No libraries found for this server.",
        plexRefreshLibrariesFailed: "Could not refresh libraries.",
        plexSignedInAs: "Connected as",
        plexSignedInFallback: "Plex user",
        plexChooseProfile: "Profile",
        plexProfilePin: "Profile PIN",
        plexProfilePinPlaceholder: "Enter Plex profile PIN",
        plexRefreshingProfiles: "Refreshing profiles\u2026",
        plexApplyProfile: "Apply profile",
        plexProfileApplied: "Profile applied.",
        plexChooseLibraries: "Libraries",
        plexNoLibraries: "No libraries found.",
        plexOpenLinkAndCode: "Open the link and enter the code",
        pluginSectionIntro: "Manage installed plugins, browse the official marketplace and add plugin sources from GitHub or ZIP files.",
        pluginRestartRequired: "Restart required for plugin changes to fully apply.",
        pluginRestartNow: "Restart now",
        pluginInstalledTitle: "Installed plugins",
        addonsNavLabel: "Addons",
        addonsOverviewHeader: "OVERVIEW",
        addonsAddHeader: "ADD ADDON",
        addonsInstalledHeader: "INSTALLED ADDONS",
        addonsStatAddons: "Addons",
        addonsStatActive: "Active",
        addonsUrlPlaceholder: "Addon URL",
        addonsAddButton: "Add Addon",
        addonsEmptyState: "No addons installed. Paste a repository URL above to add one.",
        addonsInvalidUrl: "Enter a GitHub repository URL or marketplace.json URL.",
        addonsGroupSources: "SOURCES",
        addonsGroupCatalogs: "CATALOGS",
        addonsGroupDiscovery: "DISCOVERY",
        pluginSubEnable: "ENABLE PLUGINS",
        pluginSubInstalled: "INSTALLED PLUGINS",
        pluginSubAvailable: "AVAILABLE PLUGINS",
        pluginPreinstalled: "Pre-installed",
        pluginOfficialBadge: "Official",
        pluginManualSourceBadge: "Manual source",
        pluginInactiveBadge: "Inactive",
        pluginUpdateAvailable: "Update available",
        pluginMetadataOnly: "Metadata only",
        pluginRepoLabel: "Repo",
        pluginManifestLabel: "Manifest",
        pluginUpdateNotice: "A newer plugin version is available in the marketplace source.",
        pluginActiveState: "Active",
        pluginInactiveState: "Inactive",
        pluginDeactivate: "Deactivate",
        pluginActivate: "Activate",
        pluginUninstall: "Uninstall",
        pluginMarketplaceTitle: "Official marketplace",
        pluginMarketplaceIntro: "Install official Lumio plugins from the shared marketplace repository.",
        pluginMarketplaceFallback: "Using fallback marketplace data",
        pluginMarketplaceLive: "Live manifest",
        pluginMarketplaceStatic: "Fallback manifest",
        pluginMarketplaceChecked: "Checked",
        pluginCheckUpdates: "Check updates",
        pluginBundledRuntime: "Bundled runtime",
        pluginSharedRepoSuffix: "in shared marketplace repo",
        pluginInstall: "Install",
        pluginNoReadmePreview: "No README preview available.",
        pluginNoChangelogPreview: "No changelog preview available.",
        pluginAllOfficialInstalled: "All official marketplace plugins are installed.",
        pluginAddSourceTitle: "Add plugin source",
        pluginAddSourceIntro: "Add a GitHub repository that contains a Lumio plugin marketplace manifest, or upload a plugin ZIP. Discovered plugins will appear below as installable options.",
        pluginGithubRepoUrl: "GitHub repo URL",
        pluginAddGithubSource: "Add GitHub source",
        pluginChooseReleaseZip: "Choose a release ZIP",
        pluginChooseReleaseZipHelp: "This repository has multiple release ZIPs. Pick which asset Lumio should inspect.",
        pluginUploadZipTitle: "Upload plugin ZIP",
        pluginUploadZipHelp: "Import a plugin ZIP directly, for example a downloaded stream provider package or a zipped plugin repository. You can also drag and drop a ZIP here.",
        pluginUploadZip: "Upload ZIP",
        pluginLastZipPreview: "Last ZIP preview",
        pluginSourceHelp: "GitHub sources should ideally expose a root marketplace.json. If that is missing, Lumio also tries the latest GitHub release ZIP automatically. ZIP imports can contain either a marketplace.json or one or more plugin.json files.",
        pluginAddedSources: "Added sources",
        pluginGithubSourceBadge: "GitHub source",
        pluginZipSourceBadge: "ZIP source",
        pluginAddedAt: "Added",
        pluginRemoveSource: "Remove source",
        pluginReleaseAssets: "Release assets",
        pluginFilesFound: "Files found",
        pluginInstallAllFromSource: "Install all from source",
        pluginAllSourceInstalled: "All plugins from this source are already installed.",
        pluginRuntimeAvailable: "Runtime available",
        pluginMetadataOnlyNow: "Metadata only for now",
        open: "Open",
        clear: "Clear",
        homeSourceLiveTvLists: "Live TV lists",
        homeSourceVodLibrary: "Video on demand",
        homeSourceBingeLibrary: "Binge library",
        homeSourceMyFiles: "My files",
        homeSourceRecentlyWatched: "History",
        historySearchPlaceholder: "Search history",
        homeSourceRecentlyWatchedSubtitle: "Recently seen",
        homeSourceCriticsPicks: "Critics' Picks",
        homeSourceDecade2010s: "Defining the 2010s",
        homeSourceDecade1990s: "Essential 90s",
        homeSourceDecade1980s: "80s Classics",
        homeSourceDecade1970s: "70s Cinema",
        homeSourceJapaneseCinema: "Japanese Cinema",
        homeSourceKoreanCinema: "Korean Cinema",
        homeSourceFrenchCinema: "French Cinema",
        homeSourceKdrama: "K-Drama",
        tvSegmentAnime: "Anime",
        tvBackAgainToExit: "Press Back again to exit",
        tvHeroFeatured: "Featured",
        tvHeroMyList: "My list",
        tvHeroPagerDot: "Featured title {n} of {total}",
        tvHeroRuntimeHm: "{h} h {m} min",
        tvHeroRuntimeM: "{m} min",
        tvHeroStreamsN: "{n} streams",
        // TV-skalets rader. Hintraden ("HÅLL ▸ snabbspola" m.fl.) togs bort:
        // förklarande text i varje bild är inte information man behöver mer än
        // en gång. Positionsräknaren behöver ingen nyckel.
        tvGenreRowTitle: "Genres",
        tvRowFailed: "Could not be loaded",
        tvRowNoRenderer: "Not available in TV mode yet",
        tvQuickPlay: "Play",
        tvQuickSource: "Source: {source} \u203A",
        tvQuickMarkWatched: "Mark as watched",
        tvQuickUnmarkWatched: "Mark as unwatched",
        tvQuickMoreInfo: "More info",
        tvQuickShowAllRow: "Show all in this row",
        tvQuickFollow: "Follow",
        tvQuickUnfollow: "Unfollow",
        tvQuickTrailer: "Trailer",
        tvMenuChip: "Menu",
        tvMenuSearch: "Search",
        tvSearchFilters: "Search & filters",
        tvClockMorning: "Good morning",
        tvClockDay: "Hello",
        tvClockEvening: "Good evening",
        tvClockNight: "Good night",
        tvMenuSources: "Libraries and sources",
        tvQuickRemoveContinue: "Remove from Continue watching",
        tvCollectionHint: "Film collection \u2014 press OK to browse the movies in release order.",
        tvProviderHint: "Streaming service \u2014 press OK to see the movies and series available on {name}, sorted by popularity.",
        tvCollectionSummary: "{count} films ({years}): {titles}",
        homeSourceAnimeSeries: "Anime Series",
        homeSourceMoodComfort: "Comfort Watch",
        homeSourceMoodMind: "Mind Benders",
        homeSourceMoodAfterDark: "After Dark",
        homeSourceMoodDateNight: "Date Night",
        homeSourceMoodAdrenaline: "Adrenaline Rush",
        homeSourceMoodLaugh: "Laugh Out Loud",
        homeSourceMoodHeist: "Heists & Cons",
        homeSourceMoodSpace: "Into the Stars",
        homeSourceMoodFantasy: "Sword & Sorcery",
        homeSourceMoodTrueCrime: "True Crime",
        homeSourceMoodSlowBurn: "Slow-Burn Dramas",
        homeSourceMoodWar: "War Stories",
        homeSourceMoodWestern: "Saddle Up",
        homeSourceMoodHistory: "History Buff",
        homeSourceMoodWhodunit: "Whodunit",
        homeSourceNetworkNetflix: "Netflix Originals",
        homeSourceNetworkHbo: "From HBO",
        homeSourceNetworkApple: "Apple TV+",
        homeSourceNetworkAmc: "AMC",
        homeSourceNetworkFx: "FX",
        homeSourceNetworkDisney: "Disney+ Originals",
        homeSourceNetworkPrime: "Prime Video",
        homeSourcePrestigeDrama: "Prestige Drama",
        homeSourceMoment: "Right now (changes with the moment)",
        homeSourceComingUp: "Calendar",
        comingUpTitle: "Coming up",
        comingUpSubtitle: "From series you follow \xB7 {n}",
        comingUpAvailableOne: "1 episode available now",
        comingUpAvailableMany: "{n} episodes available now",
        comingUpNothingNew: "nothing new right now",
        comingUpOpenCalendar: "Open calendar",
        comingUpMissed: "Missed",
        comingUpToday: "Today",
        comingUpTomorrow: "Tomorrow",
        comingUpEpisodesCount: "{n} episodes",
        comingUpInDays: "in {n} days",
        comingUpPillAvailable: "Available",
        comingUpPillMissedAvailable: "Missed \xB7 Available",
        comingUpPillTonight: "Tonight {time}",
        comingUpPillWatched: "Watched",
        comingUpTagPremiere: "Premiere",
        comingUpTagFinale: "Finale",
        comingUpShowMissedSetting: "Show missed episodes in Coming up",
        comingUpShowMissedHint: "Episodes from yesterday you haven't watched yet.",
        homeSourceMomentMovies: "Right now \xB7 Movies",
        homeSourceMomentSeries: "Right now \xB7 Series",
        homeSourceAnimeMovies: "Anime Movies",
        homeSourceAnimeTopSeries: "Top Rated Anime",
        homeSourceStreamingServices: "Streaming",
        homeSourceStudios: "Studios",
        liveTvList: "Live TV list",
        liveTvChooseList: "Choose a Live TV list",
        homeMenuPremiereStar: "Premieres",
        traktTitle: "Trakt",
        traktDesc: "Sign in with Trakt to sync watched TV episodes, watchlists, and your collection with Lumio.",
        traktSignedInAs: "Signed in as",
        traktSignedInFallback: "Trakt user",
        traktSyncDesc: "Sync pulls data from Trakt into Lumio and also pushes your local Lumio watchlists and watched episodes back to Trakt.",
        traktImportData: "Sync Trakt data",
        traktImporting: "Syncing...",
        traktImportDone: "Trakt sync complete",
        traktDisconnect: "Disconnect",
        traktConnect: "Sign in with Trakt",
        traktWaiting: "Waiting for Trakt...",
        traktOpenLinkAndCode: "Open the link and enter the code",
        traktStartLoginFailed: "Failed to start Trakt login",
        traktLoginFailed: "Trakt login failed",
        traktImportFailed: "Failed to sync with Trakt",
        // Deliberately calm and not an error: the entries work everywhere in Lumio,
        // only the Trakt mirror is incomplete. The calendar reads TMDB, not Trakt.
        traktMirrorIncomplete: "Trakt would not accept every item",
        traktMirrorIncompleteBody: "Your Trakt watchlist is full, so {count} item(s) live only on this device. Everything works normally in Lumio \u2014 the calendar reads TMDB and is unaffected. Trakt announced a 250-item limit for free accounts, but their API still enforces 100; Lumio retries automatically, so the items sync themselves once Trakt raises it. To make room now, remove items from your watchlist on trakt.tv or upgrade to VIP.",
        traktMirrorLocalOnly: "On this device only",
        ovOpenSubsTitle: "Subtitles",
        ovOpenSubsOkDesc: "OpenSubtitles key saved \u2014 subtitle search is available.",
        ovOpenSubsMissingDesc: "No key \u2014 subtitle search is limited.",
        ovGroqTitle: "AI features",
        ovGroqOkDesc: "Groq key saved.",
        ovGroqMissingDesc: "No Groq key \u2014 AI features are off.",
        ovSpotifyTitle: "Music",
        ovSpotifyOkDesc: "Spotify credentials saved.",
        ovSpotifyMissingDesc: "No credentials \u2014 soundtracks unavailable.",
        ovOpenSettings: "Open settings",
        traktAutoRemoveMovies: "Remove watched movies from the watchlist",
        traktAutoRemoveMoviesHint: "A film you have seen leaves the list automatically \u2014 and frees a slot on Trakt.",
        traktAutoUnfollowSeries: "Unfollow series you have finished",
        traktAutoUnfollowSeriesHint: "Removes a series only when it has ended and you have watched the last episode. Ongoing series are never removed. Your watch history is kept, so a revived show can come back.",
        // Named per operation: a 420 on history and a 420 on the watchlist are
        // different caps with different fixes, and a bare code taught us nothing.
        traktHistoryRefused: "Trakt would not accept your watch history",
        traktHistoryRefusedBody: "Your watchlist synced fine \u2014 this only affects watch history. Trakt caps history at 100,000 plays. Your local history is intact and Lumio is unaffected.",
        traktRejectedBy: "Rejected by Trakt",
        traktCopyCode: "Copy code",
        traktCodeCopied: "Copied",
        traktOpenActivationPage: "Open trakt.tv/activate",
        traktStepOpen: "Open the link \u2014 it opens in your browser, Lumio stays open.",
        traktStepEnterCode: "Sign in to Trakt and enter the code above.",
        traktStepComeBack: "Come back here \u2014 we detect the approval automatically.",
        traktWaitingForApproval: "Waiting for your approval...",
        traktImportPhaseWatched: "Importing watched history from Trakt...",
        traktImportPhaseWatchlist: "Importing watchlists from Trakt...",
        traktImportSummary: "Imported {count} watched titles, {shows} shows and {movies} movies from your watchlist.",
        traktImportBackgroundHint: "A large Trakt account takes a moment \u2014 keep setting up, this runs in the background.",
        traktNetworkRetrying: "Could not reach Trakt \u2014 retrying...",
        traktNetworkUnreachable: "Could not reach Trakt. Check your network or DNS (auth.trakt.tv) and try again.",
        traktNetworkTimeout: "Trakt did not answer in time. Check your connection and try again.",
        traktCodeExpired: "The code expired. Start the sign-in again.",
        traktCodeInvalid: "The code is no longer valid. Start the sign-in again.",
        traktCodeAlreadyUsed: "This code has already been used. Start the sign-in again.",
        traktLoginDenied: "The sign-in was denied on Trakt.",
        traktConnected: "Trakt is connected",
        pluginDotActive: "Plugin active",
        pluginDotInactive: "Plugin inactive",
        pluginDotNotConnected: "Not connected",
        homeSourceCinemaMovies: "In theatres now",
        homeSubCinemaMovies: "Playing in cinemas right now",
        homeSourceTopRatedMovies: "Top rated movies",
        homeSourceTopRatedSeries: "Top rated series",
        homeSourceReleaseRecentMovies: "New releases",
        homeSubReleaseRecentMovies: "Fresh movie releases from cinema and streaming",
        homeSourceReleaseRecentSeries: "Newly released series",
        homeSubReleaseRecentSeries: "Series with fresh premieres and new episodes",
        homeSourceReleaseUpcomingMovies: "Upcoming movies",
        homeSubReleaseUpcomingMovies: "Premieres on the way to cinema and streaming",
        homeSourceReleaseUpcomingSeries: "Upcoming series",
        homeSubReleaseUpcomingSeries: "Season premieres and new series on the way",
        homeSourceStreamingMovies: "Trending movies in streaming",
        homeSubStreamingMovies: "The most-watched movies in streaming right now",
        homeSourceStreamingSeries: "Trending series in streaming",
        homeSubStreamingSeries: "The series everyone is streaming right now",
        homeSubTraktRecommendations: "Based on your watch history",
        homeSubTraktRecommendationsMovies: "Recommended movies based on your watch history",
        homeSubTraktRecommendationsSeries: "Recommended series based on your watch history",
        homeSubMovieWatchlist: "Movies you saved to watch",
        homeSubTrailers: "The latest trailers and teasers",
        homeSourceAiringTodaySeries: "Airing today",
        homeSourceTraktRecommendations: "Recommended for you",
        homeSourceTraktRecommendationsMovies: "Recommended for you \xB7 Movies",
        homeSourceTraktRecommendationsSeries: "Recommended for you \xB7 Series",
        homeSourceTopPicksSeries: "Top series",
        homeTopPicksSeriesSubtitle: "Curated top series",
        homeSourceFilmCollections: "Film collections",
        collectionsBackLabel: "Collections",
        collectionEmptyItems: "No titles right now",
        collectionRowsTitle: "Collection rows",
        collectionRowsDesc: "Rows of cards that unfold into their own titles, like Film collections \u2014 but yours.",
        collectionRowsEyebrow: "YOUR ROWS",
        collectionRowsNone: "No collection rows yet.",
        collectionRowNew: "New collection row",
        collectionRowEmpty: "Empty row",
        collectionRowName: "Row heading",
        collectionsInRow: "Collections in row",
        collectionCount: "{n} collections",
        collectionNew: "New collection",
        collectionAdd: "Add collection",
        collectionName: "Card text",
        collectionCoverTitle: "Cover",
        collectionCoverAuto: "From the titles",
        collectionCoverSuggested: "Suggestions",
        collectionCoverUrl: "Paste an image or GIF link",
        collectionCoverUseUrl: "Use link",
        collectionCoverUpload: "Upload file",
        collectionCoverDevice: "From this device",
        collectionCoverTooLarge: "The file is {size} MB, the limit is {max} MB.",
        collectionCover_auto: "auto cover",
        collectionCover_pinned: "chosen image",
        collectionCover_url: "linked image",
        collectionCover_asset: "own file",
        homeSourceCollectionRowGroup: "My collection rows",
        homeSourcePageRowGroup: "From my pages",
        collectionRemove: "Remove collection",
        collectionRemoveBody: "The card disappears from the row. The titles are not affected.",
        collectionRowRemove: "Remove collection row",
        collectionRowRemoveBody: "The row and all its collections are removed. Home rows that use it show a placeholder.",
        collectionCoverSuggestedEmpty: "No suggestions yet \u2014 the collection has no titles with images.",
        collectionHeroSummary: "{count} titles \xB7 {years} \xB7 {titles}",
        collectionHeroHint: "Collection \u2014 press OK to see its titles.",
        collectionHeroBackdrop: "Background on TV",
        collectionHeroBackdropHint: "Animated covers are often low resolution \u2014 the titles give a sharp background.",
        collectionHeroBackdrop_titles: "From the titles",
        collectionHeroBackdrop_cover: "The cover",
        collectionDescription: "Description",
        collectionDescriptionHint: "Shown on TV when the card has focus. Leave empty to summarise the titles instead.",
        collectionCoverFrame: "Still image",
        collectionCoverFrameHint: "The frame the card rests on when it is not playing.",
        collectionCoverFrameChoose: "Choose still image",
        collectionCoverFramesNone: "No frames to choose from \u2014 the cover is not animated, or it could not be read.",
        rowRefMissing: "This row no longer exists",
        rowRefRemove: "Remove row",
        collectionsHeroActive: "Featured on Home",
        homeAiringTodaySubtitle: "New episodes today on your streaming services",
        airingTodayProvidersLabel: "Streaming services",
        homeLayout: "Layout",
        homeLayoutSlider: "Slider",
        homeLayoutGrid: "Grid",
        homeLayoutFull: "Show all",
        homeCount: "Cards",
        homeCountDesc: "Maximum cards shown in this section.",
        homeSliderGlobal: "Slider cards",
        homeSliderGlobalDesc: "How many cards a slider shows at most on wide screens.",
        homeSliderOverride: "Slider override",
        homeSliderDisplay: "Display",
        homeSliderUseGlobal: "Global value",
        homeFullModeNote: "Only one section can use Show all. Last watched can still stay above as a slider.",
        pinChannel: "Pin channel",
        unpinChannel: "Unpin channel",
        aspectRatio: "Aspect ratio",
        aspectRatioDesc: "Choose how the video should fit in the player.",
        cropZoom: "Zoom / crop",
        cropZoomOff: "Off",
        cropZoomCrop: "Crop",
        cropZoomZoom: "Zoom",
        cropZoomZoomPlus: "Zoom +",
        rememberAspectRatio: "Remember aspect ratio",
        rememberAspectRatioDesc: "Uses your chosen aspect ratio as the default for new movies and episodes.",
        matchFrameRate: "Match frame rate",
        matchFrameRateDesc: "Switches the TV to the frame rate of what you watch, so motion stops juddering. The screen goes black for a moment when it switches.",
        scrubPreviews: "Seek bar previews (experimental)",
        scrubPreviewsDesc: "Show a picture of the scene while you scrub. For streams without library thumbnails the picture is decoded from the stream itself, so it uses some data. Off by default.",
        scrubPreviewsPrepare: "Prepare previews before the film starts",
        scrubPreviewsPrepareDesc: "The film waits at the start while the timeline previews are made, then starts by itself (at most three minutes). Start now skips the wait.",
        scrubPrepareTitle: "Preparing previews",
        scrubPrepareStart: "Start now",
        scrubPreviewsFast: "Fast previews (powerful box)",
        scrubPreviewsFastDesc: "Builds the previews faster while the film plays, using a second hardware decoder. For powerful boxes: if playback drops a frame, the film switches back to the safe mode by itself.",
        matchResolution: "Match resolution too",
        matchResolutionDesc: "Switches the TV to the resolution of the film (a 1080p film plays in 1080p mode) instead of letting the TV upscale it. Films and episodes only. Most TVs upscale well on their own.",
        matchFrameRateOff: "Off",
        matchFrameRateVod: "Films and series",
        matchFrameRateAll: "Live TV too",
        autoSkipIntro: "Auto-skip intro",
        autoSkipIntroDesc: "When enabled, intros are skipped automatically. When disabled, a Skip intro button is shown if IntroDB has a match.",
        resumePromptEyebrow: "CONTINUE OR START OVER",
        resumePromptBody: "You stopped at {time}. Continue from there, or start from the beginning?",
        resumePromptResume: "Continue from {time}",
        resumePromptRestart: "Start over",
        askResumeOrRestart: "Ask: resume or start over",
        askResumeOrRestartDesc: "Show a prompt when you press Play on something partially watched instead of resuming silently.",
        seriesNameFirst: "Series name first in the player",
        seriesNameFirstDesc: "Leads the player header with the series name instead of the episode code.",
        heroRotationLabel: "Change title every",
        heroRotationDesc: "How often the hero banner rotates on its own. Off means it only changes when you swipe.",
        heroRotationNever: "Never",
        nextEpPopupAuto: "Auto",
        creditsRecommendations: "Recommendations during the credits",
        creditsRecommendationsDesc: "When the credits start, the picture shrinks to a corner window and the next title is shown. Applies to films and season finales \u2014 never mid-season.",
        statsHudMenuLabel: "Statistics",
        playbackSpeedMenuLabel: "Speed",
        stripSdhTitle: "Hide hearing-impaired text",
        stripSdhHint: "Removes [sounds], (sighs), \u266A lyrics and speaker names from subtitles.",
        appUpdateChannel: "Update channel",
        appUpdateChannelStable: "Stable",
        appUpdateChannelBeta: "Beta",
        appUpdateChannelHint: "Beta gets test builds before they are released to everyone.",
        exitOnCloseTitle: "Quit fully on close",
        exitOnCloseHint: "Android/TV: end the process when you leave the app instead of keeping it in the background. Frees memory on small boxes.",
        exitAppAction: "Quit Lumio",
        exitAppTitle: "Quit Lumio?",
        exitAppConfirm: "Quit",
        quizMenuLabel: "Film quiz",
        couchMenuLabel: "Couch mode",
        couchOpenButton: "Open Couch mode",
        couchOpenHint: "Control your TV or computer running Lumio from this phone. Both must be on the same wifi.",
        quizLobbyTitle: "Who knows their movies?",
        quizLobbyIntro: "Scan the code with your phone to join. The questions come from movies you have watched.",
        quizOrGoTo: "Or go to",
        quizPlayers: "Players",
        quizWaitingMore: "Waiting for more \u2026",
        quizSourcesLabel: "Questions from",
        quizSourceSeen: "Watched movies",
        quizSourceList: "My list",
        quizSourceColl: "Whole collections",
        quizStart: "Start quiz",
        quizBuilding: "Building questions \xB7 %s movies",
        quizTooFew: "Too few movies. Watch or save at least four.",
        quizTooFewGenre: "Too few seen {genre} titles. Try another genre.",
        quizRateLimited: "TMDB is busy, try again in a moment.",
        quizLanOff: "Phones can only reach this screen when LAN streaming is on in Settings.",
        quizCode: "Code",
        quizQuestionOf: "Question %1 of %2",
        quizAnswered: "%1 of %2 have answered",
        quizAnswerShown: "Answer shown",
        quizShowAnswer: "Show answer",
        quizStanding: "Standings",
        quizFinalStanding: "Final standings",
        quizStandingAfter: "Standings after question %s",
        quizNextQuestion: "Next question",
        quizPlayAgain: "Play again",
        quizExit: "Quit",
        quizCancelTitle: "Cancel the quiz?",
        quizCloseTitle: "Close Film quiz?",
        quizCancelBody: "Players will be disconnected and the standings are not saved.",
        quizKeepPlaying: "Keep playing",
        quizKindStill: "Still",
        quizKindClip: "Clip",
        quizKindTagline: "Tagline",
        quizKindAltTitle: "Foreign title",
        quizKindCast: "Cast",
        quizKindSort: "Collection",
        quizPromptStill: "Which movie?",
        quizPromptClip: "Which movie is this clip from?",
        quizPromptTagline: "Which movie has this tagline?",
        quizPromptAltTitle: "Which movie is this?",
        quizPromptCast: "Who was not in it?",
        quizPromptSort: "Sort the collection, oldest first",
        quizSortOnPhone: "Sort on your phone, oldest first.",
        quizAllRight: "All correct: %s",
        quizNobodyRight: "Nobody got the order right",
        quizAudioOnly: "Audio only",
        quizShowVideo: "Show video",
        quizLangDE: "German title",
        quizLangFR: "French title",
        quizLangSE: "Swedish title",
        quizKeyHints: "\u2191 \u2193 \u2190 \u2192 Move \xB7 OK Select \xB7 \u27F5 Back",
        quizCreateFailed: "Could not start the quiz. Try again in a moment.",
        quizClose: "Close",
        quizBankError: "Could not build questions. Check the connection and try again.",
        matchMenuLabel: "Film Match",
        matchLobbyTitle: "What are we watching?",
        matchLobbyIntro: "Scan the code and swipe on your phone. When everyone says yes to the same film, it starts.",
        matchPlayers: "Players",
        matchPaired: "paired",
        matchGuest: "Guest",
        matchRoundLabel: "This round",
        matchRoundDefault: "20 films from My List and similar titles",
        matchStart: "Go",
        matchStartOnPhone: "or press Go on {owner} phone",
        matchMinTwo: "At least two players",
        matchRoundEyebrow: "Round %1 \xB7 %2 films",
        matchOngoing: "In progress",
        matchSwipeTitle: "Swipe on your phones",
        matchSwipeIntro: "When everyone says yes to the same film, it's a match. Nobody sees anyone else's answers.",
        matchNoMatchYet: "No match yet",
        matchDoneOf: "%1 of %2 have swiped them all",
        matchPlayerLeft: "Left",
        matchEyebrow: "Match",
        matchYouChose: "You chose",
        matchIt: "It's a match!",
        matchAllYes: "Everyone said yes",
        matchPickedBy: "{name} picked \xB7 %1 of %2 said yes",
        matchStartsIn: "Starting in",
        matchPreparing: "Getting the stream ready \u2026",
        matchReady: "Ready",
        matchPlayNow: "Play now",
        matchNotThis: "Not this one",
        matchStarting: "Starting \u2026",
        matchNone: "No matches this time",
        matchTop3Intro: "These are the films most of you said yes to. {name} picks on the phone, or pick here.",
        matchTop3IntroHost: "These are the films most of you said yes to. Pick one here.",
        matchRank1: "Most yes",
        matchRank2: "Second",
        matchRank3: "Third",
        matchVotes: "%1 of %2 said yes",
        matchNewRound: "New round",
        matchCouldNotStart: "Couldn't start",
        matchNoSource: "Couldn't find a source for {film}",
        matchBackToCards: "Back to the cards in %1 s",
        matchEndedTitle: "Film Match ended",
        matchEndedBody: "The phones have been disconnected from the room.",
        matchNewMatch: "New Film Match",
        matchCloseTitle: "Close Film Match?",
        matchCloseBody: "The phones will be disconnected from the room.",
        matchKeepGoing: "Keep going",
        matchCreateFailed: "Could not start Film Match. Try again in a moment.",
        matchDeckEmpty: "Found no films \u2014 add films to My List and try again.",
        matchJoinTitle: "What's your name?",
        matchJoin: "Join",
        matchWaitingFor: "Waiting for {name} to start",
        matchUndo: "Undo",
        matchLeft: "You left Film Match",
        // Tippa matchen (TV:ns vyer 2c–2f)
        tipLobbyOverline: "PREDICT THE MATCH \xB7 {league}",
        tipKickoff: "Kick-off {time}",
        tipIn: "in {n} min",
        tipScan: "Scan with the camera, or open Couch mode",
        tipInSofa: "On the couch",
        tipCount: "{n} of {m} have predicted",
        tipHasTipped: "\u2713 Predicted",
        tipTipping: "Predicting \u2026",
        tipLobbyHint: "Predictions lock at kick-off. The score is not shown if spoiler protection is on.",
        tipLockNow: "Lock now",
        tipCancel: "Cancel",
        tipPill: "Predict",
        tipPillAgain: "Press down again",
        tipManageOverline: "PREDICT THE MATCH",
        tipShowLobby: "Show lobby",
        tipRow: "PREDICTIONS",
        tipFinal: "FULL TIME",
        tipExact: "EXACT SCORE",
        tipWinner: "RIGHT WINNER",
        tipClosest: "CLOSEST OF THE REST",
        tipDone: "Done",
        tipSeason: "Season",
        tipSeasonOverline: "COUCH SEASON \xB7 {n} MATCHES",
        tipNewSeason: "New season",
        tipNewSeasonConfirm: "Press again for a new season",
        tipColName: "NAME",
        tipColExact: "EXACT",
        tipColWinner: "WINNER",
        tipColTonight: "TONIGHT",
        tipColPoints: "POINTS",
        tipExactSub: "predicted {tip} \xB7 3 pts",
        tipWon: "{team} won",
        tipDraw: "Draw",
        tipOneOff: "one goal off",
        tipNOff: "{n} goals off",
        tipPlusOne: "+1 pt",
        tipNobody: "Nobody",
        tipWhyExact: "Exact score",
        tipWhyWinner: "Right winner",
        tipWhyWinnerClosest: "Right winner \xB7 closest",
        tipWhyClosest: "Closest",
        tipWhyWrong: "Wrong winner",
        tipCreateFailed: "Could not start Predict the match. Try again in a moment.",
        matchEnded: "Film Match ended on the TV",
        creditsFinishedSeason: "Season %s is over",
        creditsNextSeason: "Season %s",
        creditsFinishedTitle: "You finished",
        creditsSeriesEnded: "The series has ended",
        creditsBackToFilm: "Back to the film",
        creditsRemaining: "Left",
        creditsSectionEyebrow: "Playback",
        creditsSectionTitle: "When a film or series ends",
        creditsSectionHint: "What the player does once the credits start.",
        creditsThreshold: "Credits start",
        creditsThresholdDesc: "How far before the end the credits view opens when the file has no detected credits marker. Later is safer \u2014 too early covers the ending.",
        minutesBeforeEnd: "min before the end",
        creditsRecommendationsTv: "Recommendations after series",
        creditsRecommendationsTvDesc: "Only when the season has ended and no next season exists.",
        creditsThresholdTv: "Threshold for series",
        creditsThresholdTvDesc: "Only when the season has ended and no next season exists.",
        advanceAtOutro: "Skip the credits and go straight to the next episode",
        advanceAtOutroDesc: "When an outro is detected, the next episode starts immediately instead of showing the next-episode card. Episodes without a detected outro still show the card.",
        stayFullscreenOnClose: "Stay fullscreen when the player closes",
        stayFullscreenOnCloseDesc: "The window keeps fullscreen instead of dropping back to windowed mode.",
        showTitleOnStart: "Show title when playback starts",
        showTitleOnStartDesc: "The title fades in for a few seconds and then disappears.",
        controlsHideAfter: "Hide player controls after",
        controlsHideAfterDesc: "How long the playback controls stay on screen after you touch or move. TV keeps a five-second floor.",
        controlsHideNever: "Never",
        hideSkipButtonAfter: "Hide the Skip button after",
        hideSkipButtonAfterDesc: "The button hides itself so a false intro match does not sit on screen all episode.",
        hideUnreleasedHome: "Hide unreleased titles on Home",
        hideUnreleasedHomeDesc: "Titles whose release year is still in the future are left out of Home rows.",
        hideWatchedMoviesHome: "Hide watched movies on Home",
        hideWatchedMoviesHomeDesc: "Exclude movies marked as watched from Home grids and sliders.",
        stillWatching: "Still watching?",
        stillWatchingDesc: "For TV series only. Pause playback after the chosen time without control interaction, once at least 3 episodes have played in the same session.",
        stillWatchingMaxMinutes: "Still watching max time",
        stillWatchingMaxMinutesDesc: "Default matches Netflix timing: 90 minutes. Prompt appears only for TV series after at least 3 episodes.",
        stillWatchingContinue: "Continue watching",
        stillWatchingExit: "Close player",
        spoilersGroupTitle: "SPOILERS",
        spoilerBlurEnabled: "Blur spoilers",
        spoilerBlurEnabledDesc: "Hides spoiler-prone episode details in episode lists until you have watched them. Hover an episode to peek.",
        spoilerBlurThumbnails: "Blur thumbnails",
        spoilerBlurTitles: "Blur titles",
        spoilerBlurDescriptions: "Blur descriptions",
        spoilerBlurDetailImages: "Blur episode images on detail page",
        spoilerBlurDetailImagesDesc: "Blurs episode stills on the details page until you hover to reveal.",
        spoilerKeepNextVisible: "Keep the next episode visible",
        spoilerKeepNextVisibleDesc: "Leave the episode you are up to clear and only blur the ones after it.",
        spoilerBlurStreamBackdrop: "Blur stream backdrop",
        spoilerBlurStreamBackdropDesc: "Adds a blurred glass effect behind the stream picker panel.",
        spoilerHoverToPeek: "Hover to peek",
        spoilerPreviewTitle1: "The Last Stand",
        spoilerPreviewSynopsis1: "With the city surrounded, an unlikely alliance forms as a long-buried secret finally comes to light.",
        spoilerPreviewTitle2: "No Way Out",
        spoilerPreviewSynopsis2: "Loyalties shatter as the survivors realize the enemy has been among them all along.",
        autoplayMaxStreamSize: "Max stream size",
        autoplayMaxStreamSizeDesc: "Optional limit in GB for auto-play attempts. Empty means no size cap.",
        autoplayMaxResolution: "Max resolution for auto-play",
        autoplayMaxResolutionDesc: "Skip sources above this resolution when auto-playing. Sources with an unknown resolution are still allowed.",
        autoplayMaxResolutionUnlimited: "Unlimited",
        preferEmbeddedSubtitles: "Prefer embedded subtitles",
        preferEmbeddedSubtitlesDesc: "When picking subtitles automatically, try tracks embedded in the video first \u2014 they are always in sync.",
        peekSeasonWord: "season",
        peekSeasonsWord: "seasons",
        peekOpenDetails: "More info",
        cardPeek: "Hover preview on cards",
        cardPeekDesc: "Rest the pointer on a poster to expand a preview with backdrop, genres and description.",
        engineGroupTitle: "ENGINE",
        engineAuto: "Auto",
        engineStreams: "Engine for streams",
        engineStreamsDesc: "Auto uses the native engine (mpv) in the app. HTML5 forces the browser player \u2014 useful when mpv misbehaves with a source.",
        engineLocal: "Engine for local files",
        engineLocalDesc: "Playback engine for files from your library folders.",
        rtInterpolation: "Motion interpolation",
        rtInterpolationDesc: "Resample video to your display\u2019s refresh rate for smoother pans. Uses more GPU.",
        rtAnime4k: "Anime4K upscaling",
        rtAnime4kDesc: "Shader-based upscaling tuned for anime. Downloads the shader pack (~1 MB) on first use.",
        rtBuffer: "Large buffer for unstable connections",
        rtBufferDesc: "Read ahead ~5\xD7 more of the stream at the cost of RAM. Helps sources that stall in bursts.",
        advMpvConfTitle: "Raw mpv.conf",
        advMpvConfHint: "One property=value per line, applied to the player after all managed settings. For power users.",
        advMpvConfNote: "Applies on the next playback start. Invalid lines are ignored.",
        extraSubtitleLanguages: "More subtitle languages",
        extraSubtitleLanguagesDesc: "Ordered list of language codes tried after the default and fallback, comma-separated.",
        forcedSubtitlesWhenAudioMatches: "Forced subtitles when audio matches",
        forcedSubtitlesWhenAudioMatchesDesc: "When subtitles are turned off because the audio is already in your language, still show forced tracks (foreign dialogue, signs).",
        upgradeSubtitleWhenBetter: "Upgrade subtitles when better ones load",
        upgradeSubtitleWhenBetterDesc: "Swap to a higher-priority subtitle if one arrives after playback starts. Manual picks are never overridden.",
        ipDescRpdb: "Posters with the rating burned in, on every card. Free key at ratingposterdb.com.",
        ipDescMdblist: "Aggregated scores from Trakt, Letterboxd and more on the details page. Uses your MDBList login, or a free key.",
        ipRpdbHint: "With a key set, card posters swap to RPDB rated posters (IMDb-keyed).",
        ipMdblistHint: "Shown as extra badges next to the year on the details page.",
        ipMdblistViaLogin: "Uses your MDBList login (Tracking services \u2192 Accounts) \u2014 no key needed.",
        ipMdblistLoginHint: "Easier: connect MDBList under Tracking services \u2192 Accounts, then no key is needed.",
        hpListChoose: "Choose a list",
        hpListCategory: "Category",
        hpListPasteLabel: "Or paste a link or id",
        hpListLookup: "Find",
        hpListNotFound: "Couldn't find that list",
        hpListLoadError: "Couldn't load your lists",
        ratingBadgePosition: "Rating badge position",
        ratingBadgePositionDesc: "Which corner of the poster the score badge sits in.",
        badgePosTr: "Top right",
        badgePosTl: "Top left",
        badgePosBr: "Bottom right",
        badgePosBl: "Bottom left",
        hideCardTitles: "Hide titles under posters",
        hideCardTitlesDesc: "Show only the artwork \u2014 no title or meta line under the cards.",
        posterScale: "Poster size",
        posterScaleDesc: "Global card size on home rows: compact fits more, large shows fewer but bigger.",
        posterScaleCompact: "Compact",
        posterScaleStandard: "Standard",
        posterScaleLarge: "Large",
        sbTitle: "Seek bar",
        sbDesc: "Style, height and color of the timeline in the player.",
        sbStyleLabel: "Style",
        sbStyleFlat: "Flat",
        sbStyleGlass: "Glass",
        sbStylePinstripe: "Pinstripe",
        sbHeightLabel: "Height",
        sbHeightSlim: "Slim",
        sbHeightStandard: "Standard",
        sbHeightChunky: "Chunky",
        sbColorLabel: "Color",
        sbColorAccent: "Accent",
        sbColorWhite: "White",
        sbColorRed: "Red",
        sbColorAmber: "Amber",
        sbDotLabel: "Drag dot",
        sbDotDesc: "Show the round handle on the seek bar.",
        detailsTrailerLabel: "Trailer on the details page",
        detailsTrailerHint: "After 2.5 s on a details page, the backdrop fades into the muted trailer.",
        ipSourceEnabled: "Use this source",
        vtLiveNote: "Applies live and saves to Settings",
        introDebugReady: "IntroDB ready",
        introDebugLoading: "IntroDB loading",
        introDebugFound: "Intro found",
        introDebugMissing: "No intro match",
        /* Ytor som låg med hårdkodad svenska: startsplashen, fjärranslutningen,
           felgränserna och två Suspense-etiketter. De visades på svenska även för
           en engelsk profil. */
        advBackupSavedTitle: "Settings copy saved",
        advBackupOpenOnOtherDevice: "Open this address on the other device, download the file, and press Import there.",
        dailyPosterTitle: "Poster of the day",
        dailyPosterHint: "Your lock screen shows a poster from your watchlist, changed every morning at 6.",
        dailyPosterToggleTitle: "Poster of the day on the lock screen",
        dailyPosterToggleDesc: "A quiet morning notification opens the title. When you turn it off, the lock screen shows your home screen wallpaper \u2014 the previous lock screen image can\u2019t be restored. Some manufacturers (Xiaomi, Oppo) may override the lock screen.",
        dailyPosterOn: "On",
        dailyPosterOff: "Off",
        dailyPosterRunNowTitle: "Change now",
        dailyPosterRunNowDesc: "Pick the next poster right away.",
        dailyPosterRunNow: "Change now",
        dailyPosterQueued: "The lock screen changes in a moment.",
        dailyPosterEmpty: "Your watchlist has no titles with a poster yet.",
        dailyPosterError: "Could not change: {e}",
        dailyPosterNotAllowed: "This phone doesn\u2019t let apps change the wallpaper (manufacturer or work policy).",
        dailyPosterNotificationTitle: "Poster of the day",
        dailyPosterChannelName: "Poster of the day",
        hapticsTitle: "Feel the bass",
        hapticsHint: "Your phone vibrates with the film\u2019s bass hits.",
        hapticsHostToggleTitle: "Allow Feel the bass from a phone",
        hapticsHostToggleDesc: "Phones on the same Wi-Fi can connect with a code shown here.",
        hapticsHostOn: "On",
        hapticsHostOff: "Off",
        hapticsHostPortError: "Could not start: {e}",
        hapticsHostDevicesTitle: "Paired phones",
        hapticsHostNoDevices: "No phones paired yet.",
        hapticsHostRemove: "Remove",
        hapticsHostPairTitle: "Pair a phone",
        hapticsHostPairDesc: "Open for two minutes, then tap Connect on the phone. Nothing on the network can pair while this is closed.",
        hapticsHostPairOpen: "Pair phone",
        hapticsHostPairCancel: "Cancel",
        hapticsPairWaiting: "Waiting for a phone\u2026 Tap Connect under Feel the bass on the phone.",
        hapticsReceiverNotOpen: "Tap \u201CPair phone\u201D under Feel the bass on {name} first.",
        hapticsReceiverHostGone: "{name} has not been reachable for 15 minutes \u2014 stopped.",
        hapticsPairCodeTitle: "{name} wants to feel the bass",
        hapticsPairCodeDesc: "Enter this code on the phone",
        hapticsConnectedNotice: "Bass is felt in {name}",
        hapticsReceiverSearching: "Looking for Lumio on your Wi-Fi\u2026",
        hapticsReceiverNone: "No Lumio found. Turn on \u201CAllow Feel the bass from a phone\u201D on the computer or TV.",
        hapticsReceiverConnect: "Connect",
        hapticsReceiverDisconnect: "Disconnect",
        hapticsReceiverForget: "Forget",
        hapticsReceiverCodePrompt: "Enter the code shown on {name}",
        hapticsReceiverCodeWrong: "Wrong code \u2014 {n} tries left",
        hapticsReceiverCodeExpired: "The code expired. Try again.",
        hapticsReceiverBusy: "Another phone is pairing right now. Try again in a moment.",
        hapticsReceiverStrength: "Strength",
        hapticsReceiverSensitivity: "Sensitivity",
        hapticsReceiverSensitivityHint: "How easily a boom counts. Higher catches quieter bass \u2014 and more of it.",
        hapticsSensitivity_low: "Low",
        hapticsSensitivity_normal: "Normal",
        hapticsSensitivity_high: "High",
        hapticsSensitivity_max: "Max",
        hapticsReceiverSync: "Earlier / later",
        hapticsReceiverSyncHint: "Drag while the film plays until the vibration lands with the boom.",
        hapticsReceiverPlaying: "Playing on {name}",
        hapticsReceiverPaused: "Paused on {name}",
        hapticsReceiverPassthrough: "Audio goes straight to the receiver \u2014 the bass can\u2019t be felt.",
        hapticsReceiverNoAudio: "This audio track can\u2019t be analysed.",
        hapticsReceiverRemoved: "{name} has removed this phone.",
        hapticsReceiverHostOff: "{name} has turned off Feel the bass.",
        hapticsNotifFeeling: "Feeling the bass from {name}",
        hapticsNotifReconnecting: "Reconnecting\u2026",
        hapticsNotifStop: "Stop",
        advTransferTitle: "Move settings to another device",
        advTransferHint: "Copy everything you have set up here \u2014 sources, keys, layout, lists \u2014 to another Lumio on the same Wi-Fi. Settings that belong to a particular device, like TV mode, audio output, gestures and autoplay limits, stay where they are.",
        advTransferReceiveTitle: "Receive from another device",
        advTransferReceiveDesc: "Start here on the device that should get the settings. It shows a code and becomes visible to other Lumio devices on the network for ten minutes.",
        advTransferReceiveStart: "Receive",
        advTransferReceiveStop: "Stop",
        advTransferReceiveWaiting: "Waiting\u2026 On the other device, open Settings \u2192 Profiles \u2192 Send to another device, pick this one and enter the code:",
        advTransferReceiveIpHint: "If this device does not show up in the list, enter its address manually:",
        advTransferReceived: "Settings received \u2014 restarting\u2026",
        advTransferSendTitle: "Send to another device",
        advTransferSendDesc: "Start here on the device that has the settings. Press Receive on the other device first, then pick it below and enter the code it shows.",
        advTransferSendOpen: "Send\u2026",
        advTransferDevices: "Devices on the network",
        advTransferNoDevices: "No device found yet. Make sure the other device has pressed Receive and is on the same Wi-Fi \u2014 or enter its address below.",
        advTransferRefresh: "Search again",
        advTransferManualIp: "Address (e.g. 192.168.1.20)",
        advTransferCode: "Code shown on the other device",
        advTransferSend: "Send settings",
        advTransferSending: "Sending\u2026",
        advTransferSent: "Sent. The other device is restarting with your settings.",
        advTransferFailed: "Could not send",
        advTransferWrongCode: "Wrong code. Attempts left: {n}.",
        syncWebdavTitle: "Cloud sync (WebDAV)",
        syncWebdavHint: "Sync your settings and watch progress to a WebDAV server you already have \u2014 Nextcloud, ownCloud, Koofr, a NAS, or anything else that speaks WebDAV. Nothing is hosted by Lumio; you bring your own storage.",
        syncWebdavServerLabel: "Server address",
        syncWebdavServerPlaceholder: "https://your-server/remote.php/dav/files/you/lumio/",
        syncWebdavUsernameLabel: "Username",
        syncWebdavPasswordLabel: "Password",
        syncWebdavPasswordHint: "For Nextcloud or ownCloud, use an app password instead of your account password.",
        syncWebdavProviderCustom: "Other server",
        syncWebdavServerPlaceholderNextcloud: "https://your-server/remote.php/dav/files/you/",
        syncWebdavHintKoofr: "Sign in with your Koofr email and an app password from Preferences \u2192 Password \u2192 App passwords. Your account password will not work.",
        syncWebdavHintNextcloud: "The address is under Settings \u2192 Personal \u2192 Security \u2192 WebDAV. Use your username and an app password, not your account password.",
        syncWebdavHintCustom: "Enter the WebDAV address your provider gives you, including the full path to the folder the file should live in.",
        syncWebdavErrorAuth: "The server rejected the username or password. For most providers you need an app password, not your account password.",
        syncWebdavErrorPath: "The server could not find that address. Check the path \u2014 the folder has to exist already.",
        syncWebdavConnect: "Connect",
        syncWebdavConnecting: "Connecting\u2026",
        syncWebdavConnected: "Connected to {url}",
        syncWebdavDisconnect: "Disconnect",
        syncWebdavSyncNow: "Sync now",
        syncWebdavSyncing: "Syncing\u2026",
        syncWebdavSynced: "Synced just now",
        syncWebdavError: "Could not reach the server. Check the address, username and password.",
        appStarting: "Starting Lumio",
        // Splashens statusrad, tre steg i samma slot (se BootSpinner).
        splashStatusLibrary: "Loading your library",
        splashStatusAlmost: "Almost there",
        remoteConnecting: "Connecting to Lumio at home\u2026",
        clientStartFailed: "The client could not start",
        clientStartFailedHint: "This is the actual error from the app, not a generic fallback.",
        loadingPlayer: "Loading player\u2026",
        loadingAudioPlayer: "Loading audio player\u2026",
        syncFailed: "Sync failed",
        genericError: "Error",
        dlDone: "Done",
        introFound: "Intro",
        /* Korta etiketter i telefonens kontrollrad — brickan är 62 px och pillret
           ska rymmas i en rullande rad, så namnen är avsiktligt kortare än de
           fullständiga (som ligger kvar som titel och i Mer-menyn). */
        plShortEpisodes: "Episodes",
        plShortPicture: "Picture",
        plShortWiki: "Wiki",
        plShortMusic: "Music",
        plShortZoom: "Zoom",
        plShortCast: "Cast",
        plShortPip: "PiP",
        plShortFullscreen: "Fullscreen",
        plShortMore: "More",
        recapFound: "Recap",
        outroFound: "Outro",
        introDebugAutoOn: "Auto-skip on",
        introDebugAutoOff: "Auto-skip off",
        aspectAuto: "Auto",
        aspectContain: "Fit",
        aspectFill: "Fill",
        aspect16_9: "16:9",
        aspect4_3: "4:3",
        audioMode: "Audio mode",
        audioModeDesc: "Choose between maximum compatibility or the best possible multichannel audio in proxy playback.",
        audioModeCompatible: "Compatible",
        audioModeCompatibleDesc: "Safest playback. Proxy audio is encoded to stereo AAC.",
        audioModeBest: "Best possible",
        audioModeBestDesc: "Keeps multichannel audio in the proxy when possible. Tauri/mpv continues to use the original track directly.",
        nightMode: "Night mode / DRC",
        nightModeDesc: "Reduces loud peaks and makes dialogue easier to hear at lower volume.",
        nightModeOff: "Off",
        nightModeMild: "Mild night mode",
        nightModeStrong: "Strong night mode",
        dvColorLabel: "Dolby Vision",
        dvColorAuto: "Vivid (auto)",
        dvColorOff: "Off",
        nightModeMenuLabel: "Night mode",
        nightModeMenuMild: "Mild",
        nightModeMenuStrong: "Strong",
        onboardingIntegrationsEyebrow: "Integrations",
        onboardingIntegrationsTitle: "Make Lumio even better",
        onboardingIntegrationsDesc: "Optional connections that enhance the experience \u2014 nothing here is required. Everything is configured later under Settings \u2192 Integrations.",
        onboardingIntTrakt: "Sync watched history and watchlists. Sign in with a code right here.",
        onboardingTraktInlineHint: "Sign in without leaving setup: the link opens in your browser, setup stays exactly where it is.",
        onboardingIntSpotify: "Soundtrack playback on detail pages. Create a free app for client ID/secret.",
        onboardingIntGroq: "AI search. Create a free API key.",
        onboardingKeySave: "Save",
        onboardingKeyActive: "Active",
        onboardingKeyShow: "Show",
        onboardingKeyHide: "Hide",
        onboardingKeyWhere: "Where do I find the key?",
        onboardingKeyGroq: "Groq API key",
        onboardingKeyOpenSubtitles: "OpenSubtitles API key",
        onboardingKeySpotifyId: "Spotify Client ID",
        onboardingKeySpotifySecret: "Spotify Client Secret",
        onboardingKeyOptional: "All of these are optional and can be added later under Settings \u2192 API keys \u2014 the same fields, the same values.",
        onboardingIntOpenSubtitles: "Works without an account. With one, files are matched by hash for better subtitles.",
        defaultSubtitleLanguage: "Default subtitles language",
        defaultSubtitleLanguageDesc: "Selected automatically when subtitles are available.",
        fallbackSubtitleLanguage: "Fallback subtitles language",
        fallbackSubtitleLanguageDesc: "Used only if the primary subtitle language is not available.",
        defaultAudioTrack: "Default audio track",
        defaultAudioTrackDesc: "Tries to choose the language automatically when multiple audio tracks exist.",
        disableSubtitlesWhenAudioMatches: "Turn off subtitles when audio matches",
        disableSubtitlesWhenAudioMatchesDesc: "If your selected default audio language is found, subtitles stay off by default.",
        subtitleAutoSyncSetting: "Sync subtitles automatically",
        subtitleAutoSyncHint: "Lines up downloaded subtitles with this file when it can be sure. Your own delay always wins.",
        subtitleAutoSyncGroup: "Auto-sync",
        subtitleSyncFastReadAhead: "Faster sync (uses more data)",
        subtitleSyncFastReadAheadHint: "Reads up to 6 minutes of audio ahead instead of 3, so subtitles sync sooner in hard scenes like songs and music. Uses more mobile data. Never affects playback.",
        subtitleAutoSyncAppliedOffset: "Subtitles synced ({offset})",
        subtitleAutoSyncSwapped: "Switched to a better-synced version of the same subtitles",
        subtitleAutoSyncSwappedEmbedded: "Switched to the subtitles built into this file",
        subtitleAutoSyncOtherEdit: "These subtitles seem to be from a different version of the film. Switch to the file\u2019s own {lang} subtitles?",
        subtitleAutoSyncOtherEditSwitch: "Switch",
        subtitleAutoSyncOtherEditKeep: "Keep",
        playerStarvedLighter: "The connection can\u2019t keep up with this version. Lighter: {stream}",
        playerStarvedSwitch: "Switch",
        subtitleLanguageDetected: "language detected",
        subtitleForced: "Forced",
        subtitleSdh: "SDH",
        subtitleAutoSyncUndo: "Undo",
        subtitleAutoSyncNoReferenceInFile: "Auto-sync: nothing in this file to sync against",
        subtitleAutoSyncNoFit: "Auto-sync: these subtitles don't match this file",
        subtitleAutoSyncAmbiguous: "Auto-sync: couldn't tell for sure \u2014 left as is",
        subtitleAutoSyncChecking: "Auto-sync: checking\u2026",
        subtitleAutoSyncNoTextTracks: "Auto-sync: this file has no text subtitles to sync against",
        subtitleAutoSyncReadingTracks: "Auto-sync: reading the file's subtitles\u2026",
        subtitleAutoSyncFetchFailed: "Auto-sync: couldn't fetch the subtitles \u2014 left as is",
        subtitleAutoSyncRefined: "Subtitle sync refined ({offset})",
        subtitleSize: "Subtitle size",
        subtitleSizeDesc: "Used by default for new movies and episodes.",
        subtitleVerticalPositionDesc: "How high above the controls bar the subtitles are placed.",
        subtitleOpacity: "Opacity",
        subtitleOpacityDesc: "Applies to the whole subtitle including the background.",
        subtitleTextColor: "Subtitle color",
        subtitleTextColorDesc: "Default color for subtitles.",
        subtitleBackgroundColor: "Subtitle background color",
        subtitleBackgroundColorDesc: "Transparent matches the current style.",
        subtitleOutlineColor: "Subtitle outline color",
        subtitleOutlineColorDesc: "Used for the text outline/shadow.",
        resetSubtitleAppearance: "Reset subtitle appearance",
        resetSubtitleAppearanceDesc: "Restores size, position, opacity, colors, background, and outline to defaults.",
        subtitlePreviewText: "This is how your subtitles\nwill look",
        subtitlePreviewCaption: "Preview of the default look",
        subtitleFont: "Font",
        subtitleFontDesc: "Easier-to-read fonts for subtitles. Picking one also widens the letter spacing, which helps the most. Picture-based subtitles (PGS/VobSub from Blu-ray and DVD) keep their own look.",
        subtitleFontDefault: "Standard",
        subtitleFontAtkinson: "Atkinson Hyperlegible (recommended)",
        subtitleFontOpenDyslexic: "OpenDyslexic",
        subtitleLetterSpacing: "Letter spacing",
        subtitleLetterSpacingDesc: "The setting that helps most with dyslexia: letters that sit close together crowd each other. Wider or Widest is a good start.",
        subtitleLineSpacing: "Line spacing",
        subtitleLineSpacingDesc: "Space between the lines of a two-line subtitle. In the desktop app it only applies in learning mode \u2014 the built-in player cannot change it.",
        subtitleSpacingNormal: "Normal",
        subtitleSpacingWide: "Wide",
        subtitleSpacingWider: "Wider",
        subtitleSpacingWidest: "Widest",
        subtitleBold: "Bold text",
        subtitleBoldDesc: "Turned off when you pick an easier-to-read font, which reads better at normal weight.",
        skipIntro: "Skip intro",
        originalFirst: "Original / first",
        noFallback: "No fallback",
        autoplayNextEpisode: "Auto-play next episode",
        autoplayNextEpisodeDesc: "Preloads the next episode and plays it automatically at the end of the series.",
        showPopup: "Show popup",
        showPopupDesc: "How many seconds before the end the next-episode card is shown.",
        preloadBeforePopup: "Preload before popup",
        preloadBeforePopupDesc: "How many seconds before the popup we start fetching the next episode.",
        seconds: "seconds",
        rdApiKey: "Stream provider API key",
        rdApiPlaceholder: "Your stream provider API key",
        rdApiNote: "Stored only in your browser (localStorage).",
        streamQuality: "Stream quality filters",
        streamQualityDesc: "Hide low-quality or undesirable stream sources.",
        hideCam: "Hide CAM / CAMRIP",
        hideCamDesc: "Filmed in cinema \u2014 very low quality",
        hideTs: "Hide TeleSync / TeleCine (TS/TC)",
        hideTsDesc: "Low-quality pre-release copies",
        hideScr: "Hide Screener (SCR)",
        hideScrDesc: "DVD/streaming screener copies",
        hideBelow720p: "Hide below 720p",
        hideBelow720pDesc: "480p, 360p and lower resolutions",
        clearCache: "Clear cache",
        clearing: "Clearing\u2026",
        cleared: "Cleared \u2014 restart server",
        settingsNavAppearance: "Home & Appearance",
        homePosterAppearanceTitle: "Poster appearance",
        homePosterAppearanceDesc: "Controls which visual labels are shown on home posters.",
        homePosterGenreChipsToggleLabel: "Show category chips on posters",
        settingsNavSources: "Sources & Catalogs",
        settingsNavIntegrations: "Integrations",
        stremioAddonsTitle: "Stremio addons",
        stremioAddonsDesc: "Install community addons that expose catalogs (anime, public domain, your trakt list, \u2026). Each catalog becomes selectable as a custom home row source.",
        stremioAddonsEmpty: "No Stremio addons installed yet.",
        stremioAddonAdd: "Add",
        stremioAddonAdding: "Fetching\u2026",
        stremioAddonAdded: "Installed {{name}}",
        stremioAddonNoCatalog: "This addon doesn't expose any catalogs.",
        stremioAddonFetchFailed: "Could not fetch the manifest.",
        stremioAddonOneCatalog: "catalog",
        stremioAddonManyCatalogs: "catalogs",
        stremioAddonsHelpFromUrl: "Paste the addon manifest URL. Example: {{url}}/manifest.json",
        shortcutsTitle: "Shortcuts",
        shortcutsGeneral: "General",
        shortcutsPlayer: "Player",
        shortcutsNavigateMenus: "Navigate Between Menus",
        shortcutsGoToSearch: "Go to Search",
        shortcutsToggleFullscreen: "Toggle Fullscreen",
        shortcutsExitGoBack: "Exit / Go Back",
        shortcutsPlayPause: "Play / Pause",
        shortcutsSeekForward: "Seek Forward 10s",
        shortcutsSeekBackward: "Seek Backward 10s",
        shortcutsMute: "Toggle Mute",
        save: "Save",
        checkKey: "Check Key",
        testingConnection: "Testing connection\u2026",
        enterApiKeyFirst: "Enter an API key first.",
        connectedAs: "Connected as",
        // Calendar
        seriesCalendar: "Series Calendar",
        today: "Today",
        followSeries: "Follow a series to see episodes here",
        noEpisodesDay: "No episodes this day.",
        openStreams: "Open Streams",
        more: "more",
        // Media type chips
        both: "Both",
        movies: "Movies",
        // Release calendar
        releaseCalendar: "Release Calendar",
        recent: "Recent",
        upcoming: "Upcoming",
        allServices: "All services",
        premiere: "Premiere",
        newBadge: "New",
        newPremiere: "New premiere",
        loadMore: "Load more",
        allLanguages: "All languages",
        hideFilters: "Hide filters",
        sort: "Sort",
        // Watchlist
        addToWatchlist: "Add to watchlist",
        removeFromWatchlist: "Remove from watchlist",
        watchlistNewPremieres: "Watchlist \u2013 new premieres",
        watchlistAllLists: "Watchlist",
        watchlistNewEpisodes: "New episodes",
        watchlistContinueHere: "Continue here",
        watchlistEmpty: "No starred titles yet.",
        watchlistEmptyHint: "Star titles in the release calendar to follow premieres.",
        // Tomläget när BÅDA listorna är tomma: texten måste täcka båda vägarna in,
        // för då finns inget chip kvar som förklarar skillnaden.
        tvListsEmpty: "Nothing saved yet.",
        tvListsEmptyHint: "Follow a series or star a title to find it here.",
        tvSegmentEmpty: "No rows here yet.",
        tvSegmentEmptyHint: "Add rows for this page in Settings \u2014 under Home page rows, or TV mode on a TV.",
        continueEmpty: "Nothing started yet.",
        continueEmptyHint: "Titles you start playing show up here so you can pick up where you left off.",
        seriesWatchlistEmpty: "No followed series yet.",
        seriesWatchlistEmptyHint: "Follow a series from its detail page and new episodes show up here.",
        noMoviesInListYetHint: "Add movies to My list from any detail page to save them here.",
        watchlistConnectTraktHint: "Connect Trakt in Settings to sync this list across devices.",
        watchlistConnectTraktCta: "Connect Trakt",
        watchlistNoNewEpisodes: "No new episodes right now.",
        newEpisodeBadge: "New ep",
        seriesNewCount: "{{n}} new",
        // Date presets
        days7: "7 days",
        days30: "30 days",
        days60: "60 days",
        days90: "90 days",
        thisYear: "This year",
        dateFrom: "From",
        // Settings
        spotifyDesc: "Used to display soundtracks in the details panel. Create an app at developer.spotify.com and copy the Client ID and Client Secret.",
        clearCacheDesc: "Clear app cache and build artifacts if something behaves oddly.",
        // Soundtrack
        openOnSpotify: "Open on Spotify",
        // First-run onboarding
        onboardingSkip: "Skip",
        onboardingBack: "Back",
        onboardingNext: "Next",
        onboardingStart: "Get started",
        onboardingInstalling: "Installing\u2026",
        onboardingStep: "Step",
        onboardingGoToStep: "Go to step",
        onboardingLanguageLabel: "Language",
        onboardingWelcomeEyebrow: "WELCOME",
        onboardingWelcomeTitle: "Welcome to Lumio",
        onboardingWelcomeDesc: "Your media player and hub for movies and series \u2014 play your own library and keep everything you follow in one place.",
        onboardingLanguageEyebrow: "Language",
        onboardingLanguageTitle: "Choose your language.",
        onboardingLanguageDesc: "Pick the app language and your preferred subtitle language. You can change both at any time in Settings.",
        onboardingAppLanguageLabel: "App language",
        onboardingLanguageHint: "Subtitles in your preferred language are selected automatically when available, with the fallback used when the primary is missing.",
        onboardingPluginsEyebrow: "PLUGINS",
        onboardingPluginsTitle: "Choose your plugins",
        onboardingPluginsDesc: "Tick the plugins you want active. Built-in plugins are enabled right away and fetch their latest runtime when online; community plugins are fetched from their developer. Everything can be added or removed later under Settings \u2192 Plugins.",
        onboardingBundledBadge: "Built in",
        onboardingInstalledBadge: "Already active",
        onboardingOfficialGroup: "Official",
        onboardingExternalGroup: "External",
        onboardingThirdParty: "Third-party",
        onboardingExternalDisclaimer: "External plugins are developed and maintained by their respective developers \u2014 not by Lumio. They are fetched from the developer's own repository and used at your own risk.",
        onboardingSyncEyebrow: "SYNC",
        onboardingSyncTitle: "Already using Lumio?",
        onboardingSyncDesc: "Bring over sources, keys, layout and lists from another device or from your own WebDAV storage. Nothing to bring? Press Next.",
        onboardingSyncReceiveDesc: "Same Wi-Fi. This device shows a code you enter on the other one.",
        onboardingSyncWebdavDesc: "Nextcloud, ownCloud, Koofr, a NAS \u2014 your own storage. Keeps devices in sync from now on.",
        onboardingSyncVisible: "Visible on the network \xB7 {time} left",
        onboardingSyncReceivedFrom: "Settings received from {device}",
        onboardingSyncReceivedGeneric: "Settings received",
        onboardingSyncReceivedDesc: "Sources, keys, layout and lists are in place. Device-specific settings like TV mode and autoplay limits stay as they are. Plugins are pre-ticked in the next step.",
        onboardingSyncFoot: "All of this is also under Settings \u2192 Profiles.",
        onboardingSyncBadgeReceived: "Received",
        onboardingSyncBadgeConnected: "Connected",
        onboardingPluginsFromSync: "Pre-ticked from your other device",
        onboardingPerfSuggested: "Suggested",
        onboardingRailWelcome: "Welcome",
        onboardingRailLanguage: "Language",
        onboardingRailSync: "Sync",
        onboardingRailPlugins: "Plugins",
        onboardingRailIntegrations: "Integrations",
        onboardingRailPerformance: "Performance",
        onboardingRailControl: "Ready",
        onboardingSumLang: "Language",
        onboardingSumSync: "Sync",
        onboardingSumPlugins: "Plugins",
        onboardingSumTrakt: "Trakt",
        onboardingSumNone: "Not set",
        onboardingSumSkipped: "Skipped",
        onboardingSumReceivedFrom: "Received from {device}",
        onboardingSumReceived: "Received from another device",
        onboardingSumWillEnable: "{names} will be enabled",
        onboardingHintMove: "Move",
        onboardingHintSelect: "Select",
        onboardingHintBack: "Previous step",
        onboardingHintBackKey: "BACK",
        onboardingControlEyebrow: "READY",
        onboardingControlTitle: "You are in control",
        onboardingControlDesc: "Customise the start page, filters, language and layout exactly the way you want before you begin.",
        streamsLayoutTitle: "Where streams are shown",
        streamsLayoutDesc: "In the side panel, or as a section on the page above Recommendations. Series get streams under each episode.",
        streamsLayoutSidebar: "Side panel",
        streamsLayoutInline: "On the page",
        tvStreamsLayoutCards: "Side-scrolling",
        tvTypeWithRemote: "type",
        tvTypeKeyHint: "Type the key with the remote. It is saved when you press Done and is never shown on screen.",
        streamSizeSmall: "Small",
        streamSizeMedium: "Medium",
        streamSizeLarge: "Large",
        tvStreamsLayoutHint: "Side-scrolling: streams sit on the page as a row of cards. Side panel: a Streams button next to Play opens the list.",
        castCountTitle: "Cast members shown",
        castCountDesc: "How many of the cast appear on the details page. Phones page them eight at a time; desktop scrolls.",
        gestTabLabel: "Gestures",
        gestTitle: "Swipe gestures",
        gestHint: "What a swipe does in the player. Phone and tablet only.",
        gestLeftTitle: "Swipe up/down, left half",
        gestLeftDesc: "Drag vertically on the left side of the picture.",
        gestRightTitle: "Swipe up/down, right half",
        gestRightDesc: "Drag vertically on the right side of the picture.",
        gestHorizontalTitle: "Swipe left/right",
        gestHorizontalDesc: "Drag sideways anywhere on the picture to scrub.",
        gestBrightnessTargetTitle: "Brightness controls",
        gestBrightnessTargetDesc: "Screen brightness dims the whole display and saves battery. Picture brightness lifts black levels and can reveal detail in dark scenes.",
        gestActionBrightness: "Brightness",
        gestActionVolume: "Volume",
        gestActionSeek: "Scrub",
        gestActionNone: "Nothing",
        gestTargetScreen: "Screen brightness",
        gestTargetVideo: "Picture brightness",
        gestDoubleTapTitle: "Double-tap at the edge",
        gestDoubleTapDesc: "Skip back or forward by tapping twice near the left or right edge.",
        gestDoubleTapOff: "Off",
        gestHoldSpeedTitle: "Hold to fast-forward",
        gestHoldSpeedDesc: "Press and hold anywhere to play at double speed; release to return to normal.",
        externalDisplayVideoOnlyTitle: "External display: video only there",
        externalDisplayVideoOnlyDesc: "With glasses or an HDMI screen connected, the video plays only on the external display. The phone goes dark and shows the controls when you tap \u2014 less glare, longer battery.",
        externalDisplayPlayingThere: "Playing on the external display",
        onboardingPerfEyebrow: "Performance",
        onboardingPerfTitle: "Matched to your device",
        onboardingPerfDesc: "We measured this device and set a ceiling for what autoplay may pick on its own. You can raise it now, or change it any time under Playback.",
        onboardingPerfWhy: "Big remuxes are 40\u201375 GB with audio and video formats a phone or TV box often cannot decode. Autoplay then spends its attempts on files that were never going to play \u2014 a minute of waiting, and a black screen at the end.",
        onboardingPerfCapLabel: "Largest stream autoplay may pick",
        onboardingPerfUnlimited: "No limit",
        onboardingPerfLater: "This only sets the starting point. Nothing is blocked \u2014 you can always pick any stream yourself from the list.",
        onboardingPerfNetMeasuring: "Measuring your connection speed\u2026",
        onboardingPerfNetResult: "Connection \u2248 {mbps} Mbit/s \u2014 the suggested ceiling follows it.",
        onboardingPerfNetFailed: "Could not measure the connection; the suggestion is based on the device alone.",
        onboardingWillInstall: "{count} plugin(s) will be enabled \u2014 latest runtime fetched \u2014 when you finish.",
        onboardingInstallFailed: "{names} could not be installed right now \u2014 you can find them under Settings \u2192 Plugins.",
        onboardingOpenAppNow: "Open Lumio",
        startupOfflineNote: "No connection to TMDb \u2014 rows are empty until it is reachable. Settings, Plex, Jellyfin and Live TV work as usual.",
        onboardingInstallProgress: "Enabling plugins and fetching latest runtimes {done} / {total}",
        onboardingInstallQueued: "Queued",
        onboardingInstallWorking: "Enabling \xB7 fetching latest\u2026",
        onboardingInstallDone: "Done",
        onboardingInstallError: "Failed",
        onboardingInstallBackground: "This continues in the background \u2014 you can open Lumio right away and check Settings \u2192 Plugins later.",
        onboardingServicesEyebrow: "SERVICES",
        onboardingServicesTitle: "Connect services",
        onboardingServicesDesc: "Lumio uses TMDb for movie and series metadata. Create a free account at themoviedb.org and paste your API token (Bearer) here \u2014 all artwork and details are fetched with it. More integrations can be configured later under Settings \u2192 Integrations.",
        onboardingTmdbLabel: "TMDb API token (Bearer)",
        onboardingTmdbPlaceholder: "Paste your token here",
        onboardingTmdbSaved: "Saved \u2014 the token is stored on this device.",
        onboardingTmdbSaveFailed: "Could not save the token \u2014 try again under Settings \u2192 Integrations.",
        onboardingTmdbSkipHint: "Without a token no movie or series content can be loaded. You can add it later under Settings \u2192 Integrations.",
        showOnboardingAgain: "Show the intro again",
        // Settings → Plugins tab
        ptCannotConnect: "Could not connect \u2014 check Integrations",
        ptWorksNormally: "Working normally",
        ptDisabled: "Disabled",
        ptMoveUp: "Move up",
        ptMoveDown: "Move down",
        ptMore: "More",
        ptCheckUpdate: "Check for update",
        ptOpenRepo: "Open repo",
        ptUninstall: "Uninstall",
        ptOfficialMarketplace: "Official marketplace",
        ptLiveManifest: "Live manifest",
        ptAll: "All",
        ptOf: "of",
        ptInstalledWord: "installed",
        ptSearching: "Checking\u2026",
        ptCheckUpdates: "Check for updates",
        ptAddSourceTitle: "Add plugin source",
        ptAddSourceSubtitle: "GitHub repo or local ZIP file",
        ptUploading: "Uploading\u2026",
        ptZipFile: "ZIP file",
        ptAdding: "Adding\u2026",
        ptAdd: "Add",
        ptSyncing: "Syncing\u2026",
        ptSync: "Sync",
        ptRemove: "Remove",
        ptReleaseNeedsZip: "This release requires a manual ZIP selection.",
        ptManifestFetchError: "Unknown error while fetching the manifest.",
        ptZipReadError: "Could not read the ZIP file.",
        ptStatInstalled: "Installed",
        ptStatActive: "Active",
        ptStatIssues: "With issues",
        ptStatSources: "Plugin sources",
        ptManageTitle: "Manage & order",
        ptManageHint: "Enable, disable or drag to change priority order.",
        ptNonePlugins: "No plugins installed yet.",
        ptAvailableTitle: "Available",
        ptAvailableHint: "Known plugins that are not installed. External plugins are fetched from each developer's own repository and are not maintained by Lumio.",
        ptInstalling: "Installing\u2026",
        ptInstall: "Install",
        ptFindNewTitle: "Find new plugins",
        ptFindNewHint: "Official marketplace and your own sources.",
        ptSourcesTitle: "GitHub repos providing plugins",
        ptSourcesHint: "External sources you have added yourself are listed here.",
        ptNoSources: "No sources added yet. Add a GitHub repo above to get started.",
        ptInstalledBadge: "Installed",
        ptInstallFailed: "Could not install the plugin.",
        ptSourceReaddZip: "Add the ZIP file again to install",
        ptUpdating: "Checking for the latest version\u2026",
        ptUpdatedTo: "Updated to {version} \u2014 restart to apply.",
        ptUpToDate: "Already on the latest version.",
        ptUpdateFailed: "Update failed: {reason}",
        aiSearchTitle: "AI search",
        sssEpisodeInfo: "Show episode info",
        // Zapp player
        zpStartFailed: "Zapp failed to start. Please try again.",
        zpStartTimeout: "Start timeout. Source did not start in time, try again.",
        zpNoMovieFound: "No movie found.",
        zpFetchTimeout: "Timeout \u2013 could not fetch movies from TMDB. Try again.",
        zpFoundOpening: "Found it, opening details...",
        zpNoMovieRetry: "No movie found \u2013 try again!",
        zpConnectProvider: "Connect a stream provider in Settings first.",
        zpNoPlayableStream: "No playable stream found. Try again.",
        zpQueueAddError: "Could not add to the stream provider queue.",
        zpNoSourceYetOpening: "No playable source yet, opening details...",
        zpStreamTimeout: "Timeout \u2013 could not fetch the stream.",
        // Media details panel
        mdpCloseMobileMenu: "Close mobile menu",
        mdpCloseMenu: "Close menu",
        mdpShowMenu: "Show menu",
        mdpHideEpisodes: "Hide episodes",
        mdpShowEpisodes: "Show episodes",
        mdpHideStreams: "Hide streams",
        mdpShowStreams: "Show streams",
        mdpCloseSidebar: "Close sidebar",
        // Sources panel (Källor)
        kpTabCatalogs: "Catalogs",
        kpTabLibrary: "Library",
        kpCatalogsSuffix: "catalogs",
        kpProvidedCatalogs: "Provided catalogs",
        kpMetricActiveAddons: "Active addons",
        sourcesEmptyTitle: "No sources yet",
        coreStreamsHidden: "{count} streams hidden by quality filters",
        coreStreamsSelectEpisode: "Pick an episode to see its streams.",
        coreStreamsSource: "Source",
        streamSourceAllSources: "All sources",
        streamSourceVod: "VOD",
        streamSourceCloud: "Cloud",
        streamSourceEpisodeCount: "{n}/{total} ep",
        streamSourceSeriesHint: "Applies to every episode in this series",
        streamSourceSeriesMenuTitle: "Source \xB7 all episodes",
        streamSourceFallback: "E{episode} isn't in {source} \u2014 showing {fallback}",
        coreStreamsCached: "Cached",
        coreStreamsLoading: "Checking sources\u2026",
        streamNotServingMedia: "The source did not deliver playable media. Try another stream.",
        libraryServerUnreachable: "Could not get a playback address from {source}. Check that the server is running.",
        libraryRowSuffix: "in your library",
        libraryModeTab: "Library",
        libraryModeChip: "Library mode",
        libraryTabRowsCaption: "Rows per library:",
        libraryModeTitle: "Library mode",
        libraryModeHint: "When a library is the home page, every row is filtered to what you own. Rows with nothing indexed are hidden; the count shows how many titles each row can offer right now.",
        libraryUseAsHome: "Use as home page",
        libraryUseAsHomeHint: "Tick one or more libraries. Home page, details page, search and Zapp are then fed only from them, together. Stream sources stay hidden while it is on.",
        librarySourcesTitle: "Indexed libraries",
        localLibraryTitle: "Local folders",
        localLibraryHint: "Each folder becomes its own library with a menu entry, like Plex or Jellyfin. Files are matched against TMDB by name: \u201CTitle (Year).mkv\u201D for movies, \u201CSeries/Season 01/Series S01E04.mkv\u201D for episodes.",
        localLibraryAdd: "Add folder",
        localLibraryRemove: "Remove",
        localLibraryUpdate: "Update",
        localLibraryRebuild: "Rebuild",
        localLibraryBuild: "Build index",
        localLibraryEmpty: "No folders yet.",
        localLibraryScanning: "Indexing\u2026 {done}",
        localLibraryNotIndexed: "Not indexed yet",
        webdavLibraryTitle: "Network folders (WebDAV)",
        webdavLibraryHint: "A folder on a WebDAV server becomes its own library with a menu entry, just like a local folder. Files are matched against TMDB by name and stream through the app \u2014 the password stays on this device.",
        webdavLibraryAdd: "Add folder",
        webdavLibraryUrl: "Server address",
        webdavLibraryUsername: "Username",
        webdavLibraryPassword: "Password",
        webdavLibraryPasswordKeep: "Unchanged",
        webdavLibraryName: "Name in the menu",
        webdavLibraryNamePlaceholder: "Taken from the address if left empty",
        webdavLibraryTest: "Test",
        webdavLibraryTestOk: "Connection works",
        webdavLibrarySave: "Save and index",
        webdavLibraryCancel: "Cancel",
        webdavLibraryEdit: "Edit",
        webdavLibraryEmpty: "No network folders yet.",
        webdavLibraryListing: "Listing folders\u2026 {done}/{total}",
        webdavLibraryErrAuth: "The server rejected the username or password.",
        webdavLibraryErrNotFound: "The folder was not found on the server.",
        webdavLibraryErrNetwork: "Could not reach the server.",
        webdavLibraryErrNotWebdav: "The address answered, but not as a WebDAV folder.",
        webdavLibraryErrUrl: "Enter a full address starting with http:// or https://, without username or password in it.",
        webdavLibraryErrTooLarge: "The folder is too large to list in one go. Point the address at a subfolder.",
        webdavLibraryErrUpstream: "The server answered with an error. Try again in a while.",
        webdavLibraryErrLocalOnly: "Network folders can only be changed on the device running Lumio.",
        libraryRowUnmatched: "Not identified",
        librarySourceNotIndexed: "Not indexed yet \u2014 build the index in the plugin's settings.",
        libraryModeOff: "No library is set as the home page. Turn it on under the library plugin's settings.",
        libraryRowIndexed: "{count} indexed",
        libraryMetricTitles: "Titles",
        librarySearchPlaceholder: "Search your library",
        librarySearchMinChars: "Type at least two characters to search your library.",
        libraryBackToHome: "Back to Home",
        continueLayoutRows: "Rows",
        continueLayoutGrid: "Grid",
        /* Settings → Display → Continue watching */
        cwSectionHint: "The view has two modes, switched with the button next to the filter. Each mode has its own card format and count.",
        cwFramesTitle: "Scene preview on hover",
        cwFramesDesc: "Saves a frame when you pause or leave a title and shows it when you hover over the card (or focus it on TV).",
        cwModeRows: "Side-scrolling rows",
        cwModeRowsDesc: "All, Series and Movies as rows you swipe sideways.",
        cwModeGrid: "Grid",
        cwModeGridDesc: "Everything in one grid you scroll down through.",
        cwFormatLabel: "Card format",
        cwFormatPortrait: "Portrait",
        cwFormatLandscape: "Landscape",
        libraryVersionsTitle: "Versions in your library",
        libraryNotInLibrary: "Not in your library",
        libraryEpisodeNotInLibrary: "This episode is not in your library",
        libraryRowNotLoaded: "not loaded yet",
        libraryRowRecent: "Recently added to your library",
        libraryRowMovies: "Movies in your library",
        tvLibraryTabRowsLabel: "Library tab",
        tvLibraryTabRowsDesc: "Edit the rows of a library in the menu instead of a page above.",
        tvLibraryTabRowsNone: "None",
        libraryRowSeries: "Series in your library",
        libraryTabRowsFollowHome: "This library shows the home screen rows until you change them here.",
        libraryTabRowsUntouched: "Showing the recommended rows for this library. Your changes take over once you edit.",
        libraryRowContinue: "Library progress in Last watched",
        libraryRowUnseen: "Unseen favourites",
        libraryRowGenre: "Genre",
        libraryScanIndicatorTitle: "Scanning your library: {name}",
        libraryScanIndicatorProgress: "{done} of {total} titles",
        libraryScanIndicatorSoFar: "{done} titles so far",
        libraryScanIndicatorHint: "Sorting, filters and library rows appear when it is done.",
        libraryScanUnreachable: "{name} is not responding \u2013 will try again later",
        plexIndexTitle: "Library index",
        plexIndexDesc: "Lumio indexes your Plex libraries locally so the home page, recommendations and Zapp can run entirely on what you own.",
        plexIndexEmpty: "No index yet.",
        plexIndexStatus: "{titles} titles \xB7 {unmatched} unmatched",
        plexIndexLastSync: "Last synced",
        plexIndexRunning: "{done} titles",
        plexIndexBuild: "Build index",
        plexIndexRebuild: "Rebuild",
        plexIndexUpdate: "Update",
        plexIndexClear: "Remove index",
        plexIndexUseAsHome: "Use Plex as the home page",
        plexIndexUseAsHomeDesc: "Hero, rows, recommendations and Zapp come from your library only. Everything shown is playable.",
        sourcesEmptyBody: "Lumio finds streams through sources you add yourself. Paste a source's manifest URL below \u2014 it usually ends in /manifest.json. Lumio does not host, index or recommend any source.",
        sourceAddInvalid: "That URL did not return a valid manifest. Check the address and try again.",
        kpMetricActiveAddonsSub: "installed",
        kpMetricTotalCatalogs: "Total catalogs",
        kpMetricTotalCatalogsSub: "from all sources",
        kpMetricUsableRows: "Usable in rows",
        kpMetricUsableRowsSub: "as custom sources",
        kpStremioEyebrow: "Stremio addons",
        kpCommunityTitle: "Catalogs from the community",
        kpCommunityHint: "Add community addons that expose catalogs. Each catalog becomes selectable as the source of its own home row.",
        kpManifestHint: "Paste the addon manifest URL. Example: \u2026/manifest.json",
        kpLocalFilesEyebrow: "Local files",
        kpLibraryTitle: "My own library",
        kpLibraryHint: "Pick a folder with video files. Lumio matches file names against TMDb and shows them in a library of its own.",
        kpFolderLabel: "Folder",
        kpFolderPlaceholder: "/Users/your-name/Movies",
        kpBrowse: "Browse",
        kpStorageAccessTitle: "Storage access",
        kpStorageAccessHint: "Android needs all-files access before Lumio can read a folder you type here. Grant it once in system settings.",
        kpStorageAccessAction: "Open settings",
        kpStorageAccessGranted: "Granted",
        kpFolderScanFailed: "Could not read that folder",
        kpPathHint: "The path is read automatically when Lumio starts. Files are matched against TMDb in the background.",
        // Integrations panel
        ipCatAll: "All",
        ipCatNetwork: "Network",
        ipDescTmdb: "Movies, series, posters and metadata. Required for most of Lumio.",
        ipDescGroq: 'Enables natural-language AI search. "Show cozy winter movies from the 90s" works.',
        ipDescSpotify: "Used to show soundtracks in the details panel. Create an app at developer.spotify.com.",
        ipDescLan: "Share Lumio with other devices on the same network via a local web address.",
        ipHide: "Hide",
        ipShow: "Show",
        ipTmdbTokenLabel: "API token (Bearer)",
        ipTmdbTokenHintDefault: "A default token is configured in the environment \u2014 set your own for a higher quota.",
        ipTmdbTokenHint: "Used for the v4 API. Required for large lookups.",
        ipTmdbKeyLabel: "API key (v3)",
        ipTmdbKeyHint: "Backwards compatibility for older catalogs.",
        ipSecretStored: "A key is saved. Type a new one to replace it, or remove it to fall back to the built-in key.",
        ipSecretStoredPlaceholder: "Saved \u2014 type to replace",
        ipSecretRemove: "Remove saved key",
        ipGroqKeyHint: "Get one from console.groq.com \u2014 the free tier is plenty for Lumio.",
        ipSaved: "Saved",
        ipSaveError: "Could not save",
        ipSaving: "Saving\u2026",
        ipUnsavedChanges: "Unsaved changes",
        ipNoUnsavedChanges: "No unsaved changes",
        ipLanEnable: "Enable LAN Streaming",
        ipLanEnableDesc: "Makes Lumio reachable from other devices on your network",
        ipLanModeLabel: "Mode \u2014 what other devices see",
        ipLanModeApp: "Entire app",
        ipLanModePlayback: "Playback only",
        ipLanLocalUrl: "Local URL",
        ipLanFetchingIp: "Fetching IP address\u2026",
        ipCopy: "Copy",
        ipLanRestartWarning: "Requires restarting Lumio to take effect. macOS may ask whether to allow incoming connections \u2014 click",
        ipLanRestartWarningWindows: "Requires restarting Lumio to take effect. Windows Defender Firewall may ask whether Lumio may communicate on your networks \u2014 click",
        ipLanAllow: "Allow",
        ipLanAllowWindows: "Allow access",
        ipConnected: "Connected",
        ipInactive: "Inactive",
        ipMetricConnected: "Connected services",
        ipMetricOfCount: "of {count}",
        ipMetricCategories: "Categories",
        ipMetricCategoriesSub: "metadata, AI, music, network",
        ipLanStatus: "LAN status",
        ipOff: "Off",
        ipExternalEyebrow: "External services",
        ipSectionTitle: "Connected APIs and network",
        ipSectionHint: "Click a service to view or change its settings.",
        // Home panel (Hem)
        hpTabHero: "Hero & background",
        hpTabDisplay: "Display",
        hpGenreAll: "All categories",
        hpGenreAction: "Action",
        hpGenreAdventure: "Adventure",
        hpGenreAnimation: "Animation",
        hpGenreComedy: "Comedy",
        hpGenreCrime: "Crime",
        hpGenreDocumentary: "Documentary",
        hpGenreDrama: "Drama",
        hpGenreFamily: "Family",
        hpGenreFantasy: "Fantasy",
        hpGenreHistory: "History",
        hpGenreHorror: "Horror",
        hpGenreMusic: "Music",
        hpGenreMystery: "Mystery",
        hpGenreRomance: "Romance",
        hpGenreSciFi: "Sci-Fi",
        hpGenreThriller: "Thriller",
        hpGenreWar: "War",
        hpGenreWestern: "Western",
        hpGenreActionAdventure: "Action & Adventure",
        hpGenreKids: "Kids",
        hpGenreReality: "Reality",
        hpGenreSciFiFantasy: "Sci-Fi & Fantasy",
        hpGenreWarPolitics: "War & Politics",
        hpHeroMediaTypeLabel: "Content",
        hpHeroMediaTypeMovies: "Movies",
        hpHeroMediaTypeSeries: "Series",
        hpHeroMediaTypeMixed: "Movies & series",
        hpRowDensityTitle: "Row density",
        hpRowDensityHint: "How tightly Home rows are stacked, and how large their headings are.",
        hpRowDensityLabel: "Density",
        hpRowHeadingLabel: "Heading size",
        hpDensityCompact: "Compact",
        hpDensityNormal: "Normal",
        hpDensityAiry: "Airy",
        hpLayoutSlider: "Carousel",
        hpLayoutGrid: "Show all",
        hpLayoutFull: "Large banner",
        hpMetricActiveRows: "Active rows",
        hpMetricCustomRows: "Custom rows",
        hpMetricSliderMax: "Slider cards max",
        hpMetricSliderMaxSub: "global",
        hpRowsEyebrow: "Home page \xB7 Rows",
        hpRowsTitle: "What appears on the home screen",
        hpRowsHint: "Click a row to fine-tune layout, count and source. Use the arrows to change the order.",
        hpRowsTvNote: "TV mode has its own rows per segment \u2014 Home, Movies and Series. Set them under TV mode; these desktop rows are left untouched.",
        hpRowsSectionHint: "Home is the start screen. Movies, Series and Trending are the pages the chips under the search bar open \u2014 TV mode shares the Movies and Series lists.",
        hpSegmentUntouchedNote: "This page shows the recommended rows until you change something here.",
        hpSegmentReset: "Reset to recommended rows",
        hpCustomBadge: "custom",
        hpCardsCount: "{count} cards",
        hpMoveUp: "Move up",
        hpMoveDown: "Move down",
        hpSourceLabel: "Source",
        hpCardCountLabel: "Number of cards",
        hpMobileRowsLabel: "Rows on phone",
        hpMobileRowsAuto: "Auto",
        hpPopularStreaming: "Popular streaming",
        hpListLabel: "List",
        hpAllChannels: "All channels",
        hpFavourites: "Favourites",
        hpAllPlaylists: "All playlists",
        hpBingeDefaultList: "Default binge list",
        hpTraktListLabel: "Trakt list",
        hpMyCollection: "My collection",
        hpWideLayoutEyebrow: "Wide layout",
        hpSliderCardsTitle: "Slider cards",
        hpSliderCardsHint: "How many cards a slider shows at most, globally.",
        hpSliderCardsRowLabel: "Slider cards",
        hpSliderCardsGlobalOption: "Global ({count})",
        ipDescOpenSubtitles: "Deeper subtitle search via your own OpenSubtitles API key (free at opensubtitles.com \u2192 API consumers). Without a key, only the community catalog is searched.",
        tgSectionEyebrow: "Trailers page",
        tgColumnsLabel: "Columns",
        tgColumnsHint: "How many columns the trailer grid shows.",
        hpAlwaysShown: "Always shown",
        hpTopMenuEyebrow: "Top menu",
        hpTopButtonsTitle: "Top buttons",
        hpTopButtonsHint: "Choose which buttons appear in the top row next to the profile picker, and in what order. Applies to the menu row layout \u2014 the menu pill has its own panel.",
        hpTopButtonsPillNote: "The menu pill is on, and it replaces the top row \u2014 these buttons are not shown.",
        hpMenuOrderGlassNote: "The glass card draws its rows and tiles in fixed groups, so order and the divider have no effect on phones. Switch to the side menu under Display to arrange them.",
        rowViewNext: "View next",
        schedulePanelTitle: "Your schedule",
        scheduleTabMenu: "Menu",
        scheduleTabSchedule: "Schedule",
        scheduleOnlyAiringDays: "Only days with episodes are shown.",
        scheduleYear: "Year",
        scheduleMonth: "Month",
        scheduleSummary: "{days} airing days \xB7 {episodes} episodes",
        scheduleEpisodeCount: "{count} episodes",
        scheduleEpisodeCountOne: "1 episode",
        scheduleEmptyMonth: "Nothing airs this month from the series you follow.",
        scheduleEmptyWatchlist: "Follow a series and its episodes show up here.",
        scheduleFailed: "Could not fetch the schedule.",
        scheduleRetry: "Try again",
        scheduleSettingTitle: "Schedule panel",
        scheduleSettingDesc: "A second column beside the menu with upcoming episodes from the series you follow.",
        hpMenuDividerRow: "Divider",
        mobileMenuDesignTitle: "Menu design on phones",
        mobileMenuDesignDesc: "The same pill opens the menu either way \u2014 this chooses how it is drawn.",
        mobileMenuDesignGlass: "Glass card",
        mobileMenuDesignList: "Side menu",
        hpTvMenuEyebrow: "TV mode",
        hpTvMenuTitle: "TV menu",
        hpTvMenuHint: "Choose which items the TV side menu shows and in what order. Search, Home, Profiles and Settings always stay at the top.",
        hpProfilePicker: "Profile picker",
        hpSettingsShortcutHint: "Settings can always be opened with",
        hpHomeMenuEyebrow: "Home page menu",
        hpSideButtonsTitle: "Side buttons",
        hpSideButtonsHint: "Choose which menu buttons appear and change their order.",
        hpLivePreviewEyebrow: "Live preview",
        hpLivePreviewTitle: "How it looks on the home screen",
        hpLivePreviewHint: "Quick sketch of the top and side menus with your choices.",
        hpPreviewTitle: "Preview",
        hpPreviewOverview: "A short example description of the movie showing how the summary, rating and buttons render in the hero banner on the home page.",
        hpPreviewPlay: "Play",
        hpPreviewMyList: "My list",
        hpPreviewMoreInfo: "More info",
        hpNoMoviesMatched: "No movies matched",
        hpHeroEyebrow: "Hero banner",
        hpHeroTitle: "The star at the top",
        hpHeroHint: "Shows a random movie at the top of the home page. Requires custom background to be off.",
        hpHeroActive: "Hero active",
        hpHeroOff: "Hero off",
        hpRightNow: "Right now",
        hpEnableHero: "Enable hero banner",
        hpEnableHeroDisabledHint: "Disabled \u2013 turn off custom background first",
        hpEnableHeroHint: "Show a random movie at the top of the home page",
        cpHeroLabel: "Hero",
        cpHeroMix: "Mixed from the page\u2019s rows",
        cpHeroFixed: "A fixed title",
        cpHeroOff: "Off",
        cpHeroOnly: "Only: {row}",
        cpHeroRowN: "Row {n}",
        pluginUpdatedOne: "{name} updated to {version}",
        pluginUpdatedMany: "{n} plugins updated",
        pluginUpdatedWhatsNew: "What\u2019s new",
        pluginUpdatedLess: "Less",
        pluginUpdatedClose: "OK",
        pluginUpdateNoticeLabel: "Show a notice when a plugin updates",
        pluginUpdateNoticeHint: "Plugins update by themselves in the background. With this on, Lumio says which one and what changed, once per update.",
        heroPageMinRatingShort: "Minimum rating (IMDb)",
        heroPageTitle: "Hero per page",
        heroPageHint: "Choose where the hero on Home, Movies and Series takes its titles from: Discover with its own category and minimum rating, or one of the page\u2019s rows or a collection \u2014 then the whole hero comes from there.",
        heroPagePageLabel: "Page",
        heroPageHome: "Home",
        heroPageMovies: "Movies",
        heroPageSeries: "Series",
        heroPageSourceLabel: "Source",
        heroPageSourceDiscover: "Discover",
        heroPageSourceRow: "A row or collection",
        heroPageAppSetting: "As the hero setting above",
        heroPageMinRatingApp: "Minimum rating (IMDb) \u2014 as above",
        heroPageRowLabel: "Row or collection",
        heroPageRowNone: "Choose\u2026",
        heroPageRowsHeader: "Rows on the page",
        heroPageCollectionsHeader: "Collections",
        heroPageMoreRowsHeader: "More row types",
        hpCategoryLabel: "Category",
        hpMinRatingImdb: "Minimum rating (IMDb) \u2014 {value}",
        hpPersistentHero: "Persistent hero",
        hpPersistentHeroHint: "The hero stays visible while you filter and navigate",
        hpKeepStartupMovie: "Keep the same movie between sessions",
        hpKeepStartupMovieHint: "On app start, show the last hero again instead of rotating to a new one",
        hpRefreshHeroNow: "Refresh hero now",
        hpBackgroundEyebrow: "Background",
        hpBackgroundTitle: "Home page background",
        hpBackgroundHint: "Use your own image URLs or uploaded images instead of a random background. Turns off the hero banner while active.",
        hpUseOwnImages: "Use your own images",
        hpUseOwnImagesOnHint: "The hero banner is disabled while this is on",
        hpUseOwnImagesOffHint: "Random background from your library",
        hpBackgroundUrlsPlaceholder: "https://example.com/background-1.jpg\nhttps://example.com/background-2.jpg",
        hpOneUrlPerLine: "One URL per line. Images rotate randomly on every visit to the home page.",
        hpBackgroundCopyTitle: "Heading",
        hpBackgroundCopySubtitle: "Subtitle",
        hpBackgroundCopyHint: "Shown over your own background images, in the same place and style as the hero text. Leave empty for no text.",
        hpUploadedAlt: "Uploaded {num}",
        hpUploadedImage: "Uploaded image {num}",
        hpStoredLocally: "Stored locally in your profile",
        hpUpload: "Upload",
        hpHomeEyebrow: "Home page",
        hpSearchFieldTitle: "Search field",
        startPageTitle: "Start page",
        startPageHint: "The page the app opens on when it starts. Applies to this kind of device (TV, computer or phone). If the page is no longer available, the app opens on Home.",
        startPageGroupBuiltIn: "Built-in",
        startPageGroupPages: "Custom pages",
        startPageGroupPlugins: "Plugins",
        hpTopSlotTitle: "Top row",
        hpTopSlotHint: "What sits at the top centre: a search field, the quick menu or nothing. Movies, Series and the other filter pages always show their filters in a Browse row under the hero.",
        qmEyebrow: "Quick menu",
        qmShow: "Show quick menu",
        qmStyle: "Style",
        qmStyleHint: "Horizon and Sentence scroll and hold up to 10 items. The others hold 7.",
        qmScrollsTen: "Scrolls \xB7 up to 10 items",
        qmUpToSix: "Up to 7 items",
        qmItems: "Items",
        qmItemsHint: "Pages in the quick menu, in order.",
        qmItemsPanelHint: "OK on an item to move or remove it.",
        qmAddPage: "Add page",
        qmSlotsLeft: "{n} slots left",
        qmFull: "{style} holds 7. Horizon and Sentence hold 10.",
        qmHiddenWarn: "{n} items are hidden with {style}. Pick a scrolling style or remove items.",
        qmHidden: "Hidden",
        qmReset: "Reset to default",
        qmOffTitle: "Off",
        qmOffHint: "Turn it on by choosing Quick menu under Top row.",
        qmUse: "Use quick menu",
        qmStyleCurrent: "Style: {style}",
        qmStyleWhere: "Change the style, or switch to search or filters, under Top row.",
        hpTopSlotQuick: "Quick menu",
        qmStyle_horizon: "Horizon",
        qmStyle_initials: "Initials",
        qmStyle_constellation: "Constellation",
        qmStyle_dark: "Dusk",
        "qmStyle_focus-depth": "Depth of field",
        qmStyle_sentence: "Sentence",
        qmStyle_viewfinder: "Viewfinder",
        qmStyle_tracking: "Tracking",
        qmStyle_numbers: "Number keys",
        qmStyle_italic: "Italic",
        qmSentenceLead: "Show me",
        qmSentence_search: "to search",
        qmSentence_movies: "movies",
        qmSentence_series: "series",
        qmSentence_continue: "where I left off",
        qmSentence_live: "live TV",
        qmSentence_home: "home",
        qmSentence_anime: "anime",
        qmSentence_streaming: "streaming",
        qmSentence_watchlist: "my watchlist",
        qmSentence_calendar: "the calendar",
        qmSentence_releases: "new releases",
        qmSourceBuiltIn: "Built-in",
        qmSourceCustomPage: "Custom page",
        qmSourcePlugin: "Plugin",
        qmPositionOf: "Position {i} of {n}",
        qmHiddenWith: "hidden with {style}",
        qmDone: "Done",
        qmGroupFilters: "Filters",
        qmGroupSearch: "Search",
        qmGroupOther: "Other",
        qmNew: "New",
        qmUpTo10: "up to 10",
        qmResetHint: "Restores the default items for this menu. The style stays.",
        qmSectionHint: "Shortcuts centred at the top of the home screen.",
        qmItemsCount: "{n} of {max}",
        qmHiddenCount: "{n} hidden",
        hpTopSlotFilterPages: "Filters where they apply",
        hpTopSlotFilterAll: "Filters on every page",
        hpTopSlotSearch: "Search field",
        hpTopSlotNone: "Nothing",
        hpSearchFieldHint: "Show or hide the large search field at the top of the home page.",
        hpSearchStaysHint: "Search remains available in the top menu",
        hpSearchTopChosenHint: "The search field sits in the top row (see Top row above), so the large field is hidden.",
        hpSearchMoviesSeries: "Search movies, series\u2026",
        hpPosterEyebrow: "Poster appearance",
        hpPosterTitle: "Labels on posters",
        hpPosterHint: "Control which visual labels appear on posters on the home page.",
        hpShowGenreChips: "Show category chips",
        hpShowGenreChipsHint: "Genre labels at the bottom of the poster",
        hpShowImdbRating: "Show IMDb rating",
        hpShowImdbRatingHint: "Rating as a badge in the corner",
        hpShowYear: "Show year",
        hpShowYearHint: "Release year next to the title",
        hpProgressLine: "Progress bar",
        hpProgressLineHint: "Always shown on Continue watching cards",
        hpZappTitle: "Random movie plugin",
        hpZappHint: "Minimum rating for random movies. Zapp! only picks movies with at least this rating from TMDb.",
        hpMinRating: "Minimum rating \u2014 {value}",
        hpPosterKindMovie: "MOVIE",
        hpPosterTitleSample: "Movie title",
        // Series seasons section
        sssSeasons: "Seasons",
        sssPrevSeasons: "Previous seasons",
        sssMoreSeasons: "More seasons",
        sssSeasonN: "Season {num}",
        sssEpisodesWord: "episodes",
        sssEpisodesShort: "ep",
        sssMarkSeasonUnwatchedTitle: "Mark whole season unwatched",
        sssMarkSeasonWatchedTitle: "Mark whole season watched",
        sssSeasonWatched: "Season watched",
        sssMarkSeasonWatched: "Mark season watched",
        sssEpisodesLoadError: "Could not load episodes right now.",
        sssSeasonsLoadError: "Could not load seasons right now.",
        detailsCastLoadError: "Could not load the cast right now.",
        detailsRecommendationsLoadError: "Could not load recommendations right now.",
        detailsCommentsLoadError: "Could not load comments right now.",
        sssPlayEpisodeCode: "Play {code}",
        sssPlayEpisode: "Play episode",
        // Series calendar
        scLoading: "Loading\u2026",
        scPrevMonth: "Previous month",
        scNextMonth: "Next month",
        scFollowing: "Following",
        scUnfollow: "Stop following",
        scCloseDayPanel: "Close day panel",
        scCloseStreamDetails: "Close stream details",
        // Video player
        vpSubTimeout: "Subtitles took too long to load. Try again.",
        vpSubNetwork: "Could not connect to the subtitle source.",
        vpSubHttp: "The subtitle service responded with an error.",
        vpSubLoadFailed: "Could not load subtitle.",
        vpSubDownloadTimeout: "Subtitle download took too long. Try again.",
        vpWrongEpisodeWarning: "The source delivered {found}, not {wanted}. Pick another stream.",
        vpSubMpvFailedWith: "Could not load subtitle in mpv: {message}",
        vpSubMpvFailed: "Could not load subtitle in mpv.",
        vpNoSubsFound: "No subtitles were found for this title.",
        vpDownloadStartFailed: "Could not start the download",
        // Media explorer
        meAddGroqKeyFirst: "Add a Groq API key in Settings first.",
        meStremioNoStreams: "The Stremio addon returned no streams for this content.",
        meStremioUnreachable: "Could not reach the Stremio addon.",
        createList: "Create list",
        createListFailed: "Could not create the list",
        listNamePlaceholder: "List name",
        creating: "Creating\u2026",
        createAction: "Create",
        assignToList: "Assign to list",
        noMoviesInListYet: "No movies in your list yet.",
        download: "Download",
        pickStreamToDownload: "Pick a stream to download",
        closeDownload: "Close download",
        preparing: "Preparing\u2026",
        fetchingShort: "Fetching\u2026",
        done: "Done",
        downloadFailedRetry: "Download failed, try again",
        noPlayableStream: "No playable stream found",
        resolveLinkFailed: "Could not resolve the download link",
        fetchStreamsFailed: "Could not fetch streams",
        noStreamsFound: "No streams found",
        startDownloadFailed: "Could not start the download",
        folderPickFailed: "Folder selection failed",
        prepareDownloadFailed: "Could not prepare the download",
        downloadJobLost: "Lost contact with the download job",
        unexpectedServerResponse: "Unexpected response from the server",
        seriesPlural: "Series",
        playNow: "Play now",
        nextOnSeries: "Next on",
        episodeNumber: "Episode {n}",
        startingIn: "Starting in {seconds}s",
        startingSoon: "Starting soon",
        noStarredTitles: "No starred titles yet.",
        starTitlesHint: "Star titles in the release calendar to follow their premieres.",
        watchlist: "Watchlist",
        editFile: "Edit file",
        movieTitlePlaceholder: "Movie title\u2026",
        pickFile: "Pick file",
        describeMoviePlaceholder: "Describe the movie\u2026",
        genresPlaceholder: "Action, Drama\u2026",
        backdropUrl: "Backdrop URL",
        posterUrl: "Poster URL",
        fetchFromTmdb: "Fetch from TMDb",
        pickCorrectMovie: "Pick the right movie",
        noResultsFound: "No results found.",
        searchFailed: "Search failed.",
        edit: "Edit",
        editMetadata: "Edit metadata",
        ownFiles: "Own files",
        localBadge: "Local",
        noFolderSelected: "No folder selected. Pick a folder in Settings.",
        readFolderFailed: "Could not read folder: {error}",
        fileReadError: "Error while reading files.",
        noVideoFilesFound: "No video files found in the folder.",
        back: "Back",
        backToHome: "Back to home",
        pageLoadFailed: "The page could not be loaded",
        pluginError: "Plugin error",
        fetchingStream: "Fetching stream\u2026",
        loadingDetails: "Loading details\u2026",
        loadingFileInfo: "Loading file info\u2026",
        loadingZapp: "Loading Zapp\u2026",
        loadingCalendar: "Loading calendar\u2026",
        loadingLiveTvPlugin: "Loading Live TV plugin\u2026",
        saving: "Saving\u2026",
        openExternalPlayerFailed: "Could not open the external player",
        pressToStart: "Press to start",
        activeLabel: "Active",
        clearActorSearch: "Clear cast search",
        nothingToShowYet: "Nothing to show yet.",
        liveTvGuideTitle: "TV guide",
        liveTvGuideNoLists: "No Live TV list yet.",
        liveTvGuideNoEpgSource: "No EPG source is connected to this Live TV list.",
        liveTvGuideLoading: "Loading guide data\u2026",
        liveTvGuideFetchFailed: "The EPG source could not be fetched: {errors}",
        liveTvGuideNoProgrammes: "The EPG source was fetched but contained no programmes.",
        liveTvGuideNoMatches: "EPG loaded ({channels} channels), but none of the channels in the list matched.",
        liveTvGuideNoProgrammesInWindow: "EPG loaded ({channels} channels, {matched} matched), but no programmes fall within the time window.",
        liveTvFilterChannel: "Filter channel",
        liveTvSelectChannel: "Select a channel",
        liveTvSelectedChannel: "Selected channel",
        liveTvNow: "Now",
        liveTvLater: "Later",
        liveTvRemaining: "{time} left",
        liveTvOnChannel: "on {channel}",
        liveTvPause: "Pause",
        liveTvPaused: "Paused",
        liveTvPlaying: "Playing",
        liveTvFullscreen: "Fullscreen",
        liveTvExitFullscreen: "Exit fullscreen",
        liveTvGuide: "Guide",
        liveTvOpenGuide: "Open TV guide",
        liveTvVolume: "Volume",
        liveTvMute: "Mute",
        liveTvUnmute: "Unmute",
        liveTvLiveBadge: "Live",
        liveTvPlaybackFailed: "Playback failed.",
        liveTvHlsUnsupported: "This browser does not support HLS playback.",
        liveTvStreamErrorDetails: "Stream error: {details}",
        liveTvMpvStartFailed: "The stream did not start in MPV. Close the player and try again, or try another channel.",
        liveTvRefreshing: "Refreshing\u2026",
        liveTvFavorites: "Favorites",
        liveTvCreateListDesc: "Create your own channel row for Live TV.",
        liveTvHomeOverrideDesc: "Replaces the regular Home rows with the Live TV view but keeps the hero and the rest of the start page.",
        liveTvEpgSources: "EPG sources",
        liveTvEpgSourceStats: "{channels} channels \xB7 {programmes} programmes",
        liveTvEpgUrlPlaceholder: "XMLTV URL (e.g. https://epgshare01.online/epgshare01/epg_ripper_SE1.xml.gz)",
        liveTvNoEpgSourcesPrefix: "No EPG sources yet.",
        liveTvXtreamTitle: "Xtream login",
        liveTvXtreamDesc: "For providers that use an Xtream Codes login (server, username, password) instead of an M3U link.",
        liveTvXtreamServer: "Server URL",
        liveTvXtreamUsername: "Username",
        liveTvXtreamPassword: "Password",
        liveTvXtreamConnect: "Log in & fetch",
        liveTvXtreamConnecting: "Logging in\u2026",
        liveTvXtreamDone: "Fetched",
        liveTvXtreamAuthFailed: "Login rejected \u2014 check the username and password.",
        liveTvXtreamError: "Could not reach the panel. Check the server URL.",
        liveTvXtreamExpires: "Expires",
        liveTvXtreamCategories: "Categories",
        liveTvXtreamAllCategories: "All categories",
        liveTvXtreamSearchCategories: "Search categories",
        liveTvXtreamApplyCategories: "Update channels",
        liveTvXtreamRemove: "Remove",
        liveTvXtreamCapped: "Showing the first {max} of {total} channels \u2014 narrow the selection with categories.",
        liveTvFetchEpgForChannel: "Fetch EPG for this channel",
        liveTvNoEpg: "No EPG",
        liveTvNoGuideAvailable: "No guide available",
        liveTvNoGuideForChannel: "No guide data available for this channel.",
        liveTvPreviousChannel: "Previous channel",
        liveTvNextChannel: "Next channel",
        homeOverrideAlreadySet: "A custom home page is already set. Unselect it first before choosing another plugin.",
        homeOverrideUseAsHome: "Use as home page",
        plexHomeOverrideDesc: "Replaces the normal home rows with the Plex view, but keeps the hero and the rest of the home page.",
        youtubeHomeOverrideDesc: "Replaces the normal home rows with the YouTube view, but keeps the hero and the rest of the home page.",
        refresh: "Refresh",
        refreshing: "Refreshing\u2026",
        homekitAccessoryIdLabel: "Accessory ID (MAC format)",
        homekitPinLabel: "PIN",
        homekitPairingCodeLabel: "Pairing code",
        homekitPairingCodeHint: "Add it in the Home app on your iPhone: Add Accessory -> More options -> Lumio Cinema Sync, then enter this code.",
        homekitEventRulesHint: "Each switch is a trigger. Build an automation per switch in the Home app to decide what happens.",
        homekitSetupIdLabel: "Setup ID",
        homekitPortLabel: "Port",
        plexCacheCleared: "Plex cache cleared. Open Plex again to fetch new images.",
        plexClearCache: "Clear Plex cache",
        plexLoading: "Loading Plex",
        plexLoadingDesc: "Fetching titles from your selected Plex libraries.",
        plexLoadFailed: "Could not load titles from Plex.",
        plexNoTitles: "No Plex titles",
        plexNoTitlesDesc: "No Plex titles were found in the selected libraries.",
        plexStaleResults: "Showing the latest Plex results. The refresh failed.",
        plexNotConnected: "Plex not connected",
        pluginYoutubeRequestFailed: "YouTube request failed.",
        pluginYoutubeQuotaExceeded: "The YouTube API quota is used up for now. Try again later, or reduce the number of YouTube loads.",
        pluginYoutubeSessionExpired: "YouTube session expired. Reconnect in Settings.",
        pluginYoutubeChannelLoadFailed: "Could not load your YouTube channel.",
        pluginYoutubeChannelPlaylistLoadFailed: "Could not load this channel playlist.",
        pluginYoutubeBrowserOnly: "Google sign-in is only available in the browser.",
        pluginYoutubeIdentityServicesLoadFailed: "Failed to load Google Identity Services.",
        pluginYoutubeIdentityServicesInitFailed: "Could not initialize Google sign-in.",
        pluginYoutubeDesktopLoginStartFailed: "Could not start desktop YouTube login.",
        pluginYoutubeLoginSessionExpired: "YouTube login session expired. Start the connection again.",
        pluginYoutubeLoginFailed: "YouTube login failed.",
        pluginYoutubeLoginTimedOut: "YouTube login timed out before Lumio received the session.",
        pluginYoutubeMissingClientId: "Add a Google OAuth client ID first.",
        pluginYoutubeMissingPlaylistId: "Playlist ID is missing.",
        pluginYoutubeMissingChannelId: "Channel ID is missing.",
        ptNeedsNewerApp: "A newer app version is required for this update.",
        ptScanSummary: "{updated} updated, {uptodate} already current, {failed} failed.",
        ptScanNoUpdates: "All plugins are on the latest version.",
        // Profile page (profilsida)
        profKicker: "Lumio \xB7 Profile",
        profYourProfile: "Your profile",
        profSince: "Since {date} \xB7 {movies} films \xB7 {series} series",
        profSwitch: "Switch profile",
        profViewProfile: "View profile",
        profMyProfile: "My profile",
        profTabOverview: "Overview",
        profTabGalaxy: "Taste galaxy",
        profTabDiary: "Film diary",
        profTabHunt: "Filmography hunt",
        profTabWrapped: "Wrapped",
        profTvHelp: "\u25C0 \u25B2 \u25BC \u25B6 Move \xB7 OK Select \xB7 Back Close",
        profEmptyFirstStar: "Watch your first film and the first star lights up.",
        profGalaxyLine: "{stars} stars, {constellations} constellations and {zones} dark zones",
        profGalaxyDesc: "Every film you've seen is a star. Directors form constellations.",
        profViewingN: "Viewing {n}",
        profSecondViewing: "Second time",
        profDiaryList: "Diary",
        profDiaryBook: "Autobiography",
        profDiaryNote: "Written from what you watch in Lumio.",
        profDiaryEmpty: "Nothing here yet.",
        profApprox: "Approximate",
        profChapters: "Chapters",
        profChKicker: "Chapter {n} \xB7 {year}",
        profChKickerOngoing: "Chapter {n} \xB7 {year} (ongoing)",
        profChShort: "{n}. {year}",
        profChTitles: "You watched {n} titles, about {h} hours.",
        profChTop: "{title} was the one you came back to \u2013 {n} times.",
        profChLate: "{p} % of your evenings started after ten.",
        profChDirector: "{name} was your director of the year, with {n} films.",
        profChTitleNight: "The year of late nights",
        profChTitleDirector: "The year of {name}",
        profChTitleRewatch: "The year of {title}",
        profChTitleDefault: "A year in film",
        profHuntEmpty: "See two films by the same director to start a hunt.",
        profHuntKicker: "Filmography",
        profHuntSeen: "You've seen {seen}/{total} {name}",
        profHuntMissing: "{n} left to find.",
        profHuntAllSeen: "You've seen them all.",
        profHuntMakeRow: "Make a row",
        profHuntMakeCollection: "Make a collection",
        profHuntRowName: "{name} \u2013 still to see",
        profHuntHomeRowMade: 'Row "{name}" added to your home screen.',
        profHuntRowMade: 'Row "{name}" created \u2013 add it to your home screen from Settings.',
        profHuntRowFailed: "Couldn't create the row \u2013 you may have too many rows.",
        profHuntNew: "+ Hunt a new director",
        profHuntSearchPh: "Search director",
        profHuntDocs: "+ Documentaries",
        profHuntShorts: "+ Short films",
        profBadgeFirst: "First step",
        profBadgeHalf: "Halfway",
        profBadgeAlmost: "Almost there",
        profBadgeComplete: "Complete",
        profBadgeInOrder: "In order",
        profWrappedTeaser: "{h} hours.\nAnd more.",
        profWrappedKicker: "Lumio Wrapped {year}",
        profWrappedPlay: "Play your year \u2192",
        profMoreAboutYou: "More about you",
        profClose: "Close",
        profModColor: "Colour year",
        profModColorLine: "Your year as a strip of film colours.",
        profModSlept: "Fell asleep",
        profModSleptLine: "Everything you drifted off to.",
        profModCouch: "Couch buddies",
        profModCouchLine: "Who you watch with, and what you agree on.",
        profModClock: "Watch clock",
        profModClockLine: "When in the week you watch.",
        profModCapsule: "Time capsule",
        profModCapsuleLine: "Seal a film for your future self.",
        profModRecords: "Records",
        profModRecordsLine: "Longest marathon, latest night and more.",
        profModAbandoned: "Abandoned",
        profModAbandonedLine: "Films you gave up on early.",
        profModQuiz: "Quiz profile",
        profModQuizLine: "What you watch vs what you know.",
        profModBack: "\u2190 Profile",
        profModColorTitle: "Your year as a single strip",
        profModColorDesc: "Every stripe is a film's barcode, in the order you watched. Pick a month to see which films gave the colour.",
        profModColorNote: "From your barcodes",
        profModSleptTitle: "Films you fell asleep to",
        profModSleptDesc: "The sleep timer knows exactly where you drifted off. Continue from there, or start over when you're more awake.",
        profModSleptNote: "From the sleep timer",
        profModCouchTitle: "Who you watch with",
        profModCouchDesc: "Taste match per profile and picks that suit you both, based on what you've watched together and apart.",
        profModCouchNote: `From "Who's watching?"`,
        profModClockTitle: "When you watch",
        profModClockDesc: "Weekday against time of day for everything you started. Pick a day to see your habits.",
        profModClockNote: "From start times in the diary",
        profModCapsuleTitle: "Send a film to the future",
        profModCapsuleDesc: "Pick a film today. Lumio brings it back in a few years, together with today's diary page.",
        profModCapsuleNote: "Opens on the home screen",
        profModRecordsTitle: "Your personal records",
        profModRecordsDesc: "Longest marathon, latest night and more. New records are marked when they fall.",
        profModRecordsNote: "From the diary",
        profModAbandonedTitle: "Films you gave up on",
        profModAbandonedDesc: "Everything you left under 20 %. Give them a second chance, or let go for good.",
        profModAbandonedNote: "From the diary",
        profSleptSummary: "You fall asleep most often on {day}, on average {m} minutes in.",
        profSleptTopGenre: "{genre} accounts for {n} of {total} naps.",
        profSleptWhen: "{date} \xB7 fell asleep {time}",
        profSleptResume: "Continue {time}",
        profSleptRestart: "Start over",
        profSleptRemove: "Remove",
        profSleptEmpty: "The list is empty. You woke up for everything.",
        profAbandonedCount: "{n} films left under 20 %.",
        profAbandonedWhen: "Stopped at {p} % \xB7 {date}",
        profAbandonedRetry: "Second chance",
        profAbandonedAdded: "In Continue watching",
        profAbandonedLetGo: "Let go",
        profAbandonedDismissRow: "Remove {title} from the list",
        profAbandonedEmpty: "Nothing abandoned. You finish what you start.",
        profModQuizTitle: "What you know, vs what you watch",
        profModQuizDesc: "Your film quiz results per genre, against how much you actually watch the genre.",
        profModQuizNote: "From the film quiz",
        profPrevNoCapsule: "No capsule yet",
        profPrevOpens: "Opens",
        profPrevTogether: "{n} films together",
        profPrevEmpty: "Nothing here yet",
        profHm: "{h} h {m} min",
        profMin: "{m} min",
        profRecMarathon: "Longest marathon",
        profRecLatestNight: "Latest night",
        profRecMostInDay: "Most films in a day",
        profRecLongestFilm: "Longest film",
        profRecMostRewatched: "Most rewatched",
        profRecStreak: "Longest streak",
        profRecStreakValue: "{n} days",
        profDayPl0: "Mondays",
        profDayPl1: "Tuesdays",
        profDayPl2: "Wednesdays",
        profDayPl3: "Thursdays",
        profDayPl4: "Fridays",
        profDayPl5: "Saturdays",
        profDayPl6: "Sundays",
        profColorMonthCount: "{month}: {n} films",
        profColorMoodRecord: "The year's record month",
        profColorMoodDark: "The year's darkest month",
        profColorMoodBright: "The year's brightest month",
        profColorUseBg: "Use as profile background",
        profColorRemoveBg: "Remove profile background",
        profColorBgSet: "The strip is now behind your profile.",
        profColorExport: "Export as image",
        profColorShareTitle: "Colour year {year}",
        profColorFilms: "{n} films",
        profColorEmpty: "No movies watched this year yet.",
        profColorNoBarcodeNote: "Grey stripes = films without a barcode yet. Play them in Lumio to fill in the colour.",
        profShareSaved: "Image saved.",
        profShareFailed: "Couldn't create the image.",
        profShareNoLan: "No network address found for the phone.",
        profShareScan: "Scan with your phone to save the image.",
        profClockTopTime: "Top time",
        profClockFilms: "Films",
        profClockUsual: "Usually",
        profClockBigNight: "The week's big night.",
        profClockWith: "Usually with {name}.",
        profClockEmpty: "Start a few films and the clock fills in.",
        profRecNew: "New",
        profRecMarathonHow: "{n} in a row from {title}, {date}",
        profRecNightHow: "{title}, {date}",
        profRecStreakHow: "in a row, until {date}",
        profRecEmpty: "Records appear once you have a few evenings behind you.",
        profPrevMatch: "taste match with {name}",
        profCouchUsual: "Usually: {day} {time}",
        profCouchDisagree: "Disagree most on: {genre}",
        profCouchTonight: "Tonight's film for you both",
        profCouchReasonBoth: "On both watchlists",
        profCouchReasonRec: "Like {title}",
        profCouchStart: "Start an evening together",
        profCouchSolo: "Add another profile to see who you watch with.",
        profCouchHint: "Pick who's watching when you start a film, and this fills in.",
        profCouchNoPicks: "No shared picks yet.",
        profQuizLegendWatch: "Share of your watching",
        profQuizLegendRight: "Right answers in the quiz",
        profQuizStart: "Quiz: {genre}",
        profQuizSummary: "You know most about {best}, though you watch {watched} the most.",
        profQuizSummarySame: "You know {best} best \u2014 and watch it the most.",
        profQuizWeak: "{weak} is your weak spot.",
        profQuizEmpty: "Play a round of the film quiz and your results show up here.",
        profCapStep1: "1 \xB7 Pick a film",
        profCapStep2: "2 \xB7 When should it open?",
        profCapYears: "{n} yr",
        profCapLine: "{title} opens {date}.",
        profCapSeal: "Seal the capsule",
        profCapSealing: "Sealing\u2026",
        profCapSealed: "Sealed. See you {date}.",
        profCapAnother: "Seal another",
        profCapYours: "Your capsules",
        profCapOpens: "Opens {date}",
        profCapOpened: "Opened {date}",
        profCapNone: "No capsules yet.",
        profCapNoFilms: "Finish a film first \u2014 then you can send it forward.",
        profCapDueKicker: "Time capsule \xB7 opened today",
        profCapDueLine: "You sealed {title} on {date}.",
        profCapOpen: "Open",
        profDiaryAsleep: "Fell asleep {time} \xB7 {p} %",
        profGxDirectors: "Directors",
        profGxGenres: "Genres",
        profGxWhole: "\u2190 Whole galaxy",
        profGxExplore: "Explore",
        profGxPickTitle: "Pick a star or a dark zone",
        profGxPickBody: "Constellations are directors you've followed for a long time. Dashed circles are genres you've hardly watched.",
        profGxStar: "Star",
        profGxSeenTimes: "Seen {n} times \xB7 last {date}",
        profGxSeenOnce: "Seen once \xB7 {date}",
        profGxNextStar: "Next star \u2192",
        profGxDetails: "Details",
        profGxHunt: "Filmography hunt",
        profGxDarkZone: "Dark zone",
        profGxZoneBetween: "{n} seen. Lies between {a} and {b}.",
        profGxZoneNear: "{n} seen. Lies next to {a}.",
        profGxZoneEdge: "{n} seen. An unexplored corner.",
        profGxOkHint: "on the zone to fly there",
        profGxFly: "Fly there",
        profGxLightFirst: "Light the first stars",
        profGxLoading: "Looking for films\u2026",
        profGxNoSuggestions: "No suggestions right now. Try again later.",
        profGxPlay: "Play",
        profGxConstellations: "Constellations",
        profGxZones: "Dark zones",
        settingsPageProfilePage: "Profile page",
        settingsPagePairedPhones: "Paired phones",
        couchEyebrow: "COUCH MODE",
        couchTitle: "Phones that control Lumio",
        couchHint: "Your phone becomes a remote, shows info about what's playing and sends ratings to the profile's Trakt. Home network only.",
        couchPairNew: "Pair new phone",
        couchColPhone: "PHONE",
        couchColProfile: "PROFILE",
        couchColLastSeen: "LAST CONNECTED",
        couchBadgePwa: "PWA",
        couchBadgeAndroid: "ANDROID APP",
        couchSubPwa: "iPhone \xB7 launched from the home screen",
        couchSubAndroid: "Lumio for Android \xB7 Feel the bass",
        couchRemove: "Remove",
        couchCancel: "Cancel",
        couchRemoveConfirm: "Remove {name}? The phone stops working right away and has to be paired again with a new code.",
        couchFootnote: "The profile decides whose Trakt account ratings and history go to. Feel the bass is only available on phones with Lumio for Android.",
        couchHapticsTitle: "Feel the bass",
        couchHapticsHint: "The phone vibrates in time with the film's bass hits. Moved here from Playback.",
        couchHapticsSensHint: "How faint the bass hits that count.",
        couchHapticsStrength: "Strength",
        couchHapticsSync: "Early / late",
        couchHapticsSyncHint: "Shift the vibration if it arrives too early or too late.",
        couchHapticsLegacy: "Re-pair with Couch mode to control Feel the bass here",
        couchHapticsLiveHint: "Strength and timing apply when Couch mode is open on the phone.",
        couchEmptyTitle: "No phones paired yet",
        couchDialogInstr: "**Scan with the phone camera** and open the page \u2014 on iPhone, add it to the Home Screen. **Lumio app on Android:** open Couch mode, pick this computer and enter the code.",
        couchWaiting: "Waiting for the phone \u2026",
        couchClosesIn: "Closes in {time}",
        couchNewCode: "New code",
        couchPaired: "{name} is paired",
        couchPairedSub: "Profile {profile} \xB7 closes by itself",
        couchExpiredTitle: "The code has expired",
        couchExpiredBody: "The code window is only open for two minutes so nobody else on the network can pair. Get a new code and try again.",
        couchNewBadge: "New",
        couchPortError: "Port 3012 is busy: {error}",
        couchBundleMissing: "The phone page is missing from this app build.",
        couchTvPairHint: "Shows a code and a QR code for two minutes",
        couchTvEyebrow: "PHONES",
        couchTvSubAndroid: "Android app \xB7 Profile {profile}",
        couchTvSubPwa: "iPhone \xB7 Profile {profile}",
        couchTvNoProfile: "no profile",
        couchTvDetailSub: "{kind} \xB7 Last connected: {when}",
        couchTvKindAndroid: "Android app",
        couchTvKindPwa: "iPhone",
        couchTvCodeLabel: "CODE",
        couchTvCodeInstr: "iPhone: scan the QR code. Android: enter the code in the app.",
        couchTvWaiting: "Waiting for the phone",
        couchTvClosesIn: "Closes in {time}",
        couchTvClose: "Close",
        couchTvTrakt: "Trakt: {user}",
        couchTvNoTrakt: "No Trakt",
        couchTvRemovePhone: "Remove the phone",
        couchTvRemoveTitle: "Remove {name}?",
        couchTvRemoveBody: "The phone stops working right away and has to be paired again with a new code. Ratings already sent to Trakt stay.",
        couchTvEmptyHint: "No phones paired yet",
        ppWeatherGroup: "Weather in the diary",
        ppWeatherToggle: "Record the weather",
        ppWeatherToggleDesc: "When a film ends, Lumio looks up the current weather for your town once (Open-Meteo, no account). Off: no lookups at all.",
        ppWeatherPlace: "Town",
        ppWeatherNoPlace: "No town chosen yet.",
        ppWeatherSearchPh: "e.g. Gothenburg",
        ppWeatherSearch: "Search",
        ppWeatherSearching: "Searching\u2026",
        ppWeatherNoResults: "No town found.",
        ppWeatherFailed: "The search failed. Check the connection and try again.",
        ppWeatherCredit: "Weather data by Open-Meteo.com (CC BY 4.0).",
        profWrKicker: "Lumio Wrapped \xB7 {year}",
        profWrSoFar: "so far this year",
        profWrPrev: "Previous",
        profWrNext: "Next",
        profWrNotEnough: "Wrapped needs at least 10 sessions in {year}. Keep watching!",
        profWrIntroTitle: "Your year\nin film.",
        profWrIntroBody: "{n} stars later. Tap to begin.",
        profWrIntroBodyTv: "{n} stars later. Press \u25B6 to begin.",
        profWrGuessKicker: "Guess first",
        profWrGuessQ: "Which genre did you watch most this year?",
        profWrGuessRight: "Spot on. {genre}, with {h} hours.",
        profWrGuessWrong: "Close. It was {genre}, with {h} hours.",
        profWrNoGenres: "Not enough genre data yet.",
        profWrHoursKicker: "You watched",
        profWrHoursUnit: "hours",
        profWrDays: "= {n} days on the sofa",
        profWrInterstellar: "= {n} Interstellars in a row",
        profWrEpisodes: "= {n} episodes of a half-hour show",
        profWrGenreKicker: "Genre ranking",
        profWrGenreWon: "{genre} won.",
        profWrHoursShort: "{h} h",
        profWrGoldenKicker: "Golden hour",
        profWrGoldenBody: "The time you most often pressed play.",
        profWrStarsKicker: "Your stars",
        profWrStarsTitle: "The actors you saw most.",
        profWrStarsNone: "Not enough cast data yet.",
        profWrStarsFilms: "{n} films",
        profWrRewatchKicker: "Most rewatched",
        profWrRewatchNone: "No rewatches this year \u2014 always something new.",
        profWrSleepTitle: "You fell asleep {n} times.",
        profWrSleepNone: "You stayed awake all year.",
        profWrBuddyTitle: "You and {name} watched {n} films together.",
        profWrBuddyNone: "Mostly you and the screen this year.",
        profWrPersKicker: "Your film personality",
        profWrTraitNight: "Night owl",
        profWrTraitNightValue: "starts {time}",
        profWrTraitGenre: "Genre loyal",
        profWrTraitGenreValue: "{p} % {genre}",
        profWrTraitRewatch: "Rewatcher",
        profWrTraitRewatchValue: "{n} rewatches",
        profWrTraitNap: "Dozer",
        profWrTraitNapValue: "at {p} %",
        profWrShareTitle: "Share your year.",
        profWrShare: "Share",
        profWrReplay: "Play again",
        profWrCardHours: "total",
        profWrCardGenre: "top genre",
        profWrCardTitle: "most played",
        profWrCardNaps: "naps",
        profWrBNight: "The night owl",
        profWrBRewatch: "The rewatcher",
        profWrBNap: "The nap master",
        profWrBMarathon: "The marathoner",
        profWrBExplorer: "The explorer",
        profWrAScifi: "from outer space",
        profWrADrama: "with a big heart",
        profWrAHorror: "from the dark",
        profWrAComedy: "who laughs first",
        profWrAAnimation: "with a drawn soul",
        profWrADocumentary: "who wants to know",
        profWrAThriller: "on the edge",
        profWrAAction: "at full speed",
        profWrARomance: "in rose-tinted glasses",
        profWrACrime: "from the underworld",
        profWrAFantasy: "from the fairy realm",
        profWrAOther: "without a map",
        langFilesTitle: "Translation",
        langFilesDesc: "Export the language to fix texts or translate into your own language, then import the file. Corrections go on top of the built-in language; a new language appears in the list.",
        langExport: "Export",
        langImport: "Import",
        langExportDone: "Language file saved.",
        langImportNotJson: "That file is not a Lumio language file.",
        langImportFailed: "Could not import: {reason}",
        langImportDone: "{n} texts imported, {skipped} skipped (placeholders did not match English).",
        langResetOverrides: "Reset corrections ({n})",
        langOverridesReset: "Your corrections are removed.",
        langRemoveCustom: "Remove this language",
        langMetadataFollowApp: "Same as the app ({locale})",
        bugLogPhoneTitle: "Get the log on your phone",
        bugLogPhoneHint: "Scan with a phone or computer on the same network. The log downloads straight from this device while Lumio is running.",
        srcStreamSourceOnly: "Stream source",
        srcStreamSourceOnlyHint: "Lumio asks this source for links on every title, but it has no catalogs. Remove it to stop its links from appearing.",
        tvRowsTab: "Rows",
        tvInterfaceEyebrow: "TV interface",
        // TV editor: collection rows & custom pages
        tvEdTitlesSummary: "{pinned} pinned \xB7 {hidden} hidden",
        tvEdTitlesHiddenOne: "1 hidden",
        tvEdTitlesPinnedOne: "1 pinned",
        tvEdTitlesNone: "No changes",
        tvEdStarterDecades: "Decades",
        tvEdStarterFranchises: "Film series",
        tvEdStarterHolidays: "Holidays",
        tvEdStarterServices: "By service",
        tvEdStarterLibrary: "From my library",
        tvEdStarterEmpty: "Empty row",
        tvEdStarterDecadeCard: "{d}s",
        tvEdStarterHalloween: "Halloween",
        tvEdStarterChristmas: "Christmas",
        tvEdPageStarterEmpty: "Empty page",
        tvEdPageStarterTheme: "From a theme",
        tvEdPageStarterMood: "Mood page",
        tvEdPageStarterLibrary: "From my library",
        tvEdHintMove: "Move",
        tvEdHintOk: "Select",
        tvEdHintBack: "Back one step",
        tvEdLegendHere: "= where you are",
        tvEdLegendSelected: "= selected",
        tvEdMoveModeHint: "Move mode: \u25C0 \u25B6 moves, OK drops",
        tvEdMoveModeHintVertical: "Move mode: \u25B2 \u25BC moves, OK drops",
        tvEdDone: "Done",
        tvEdKeyBack: "Back",
        tvEdNewRowSub: "Name \u2192 card \u2192 done. Three steps, no submenus.",
        tvEdNewPage: "New page",
        tvEdNewPageSub: "Name \u2192 rows \u2192 done. Same way as collection rows.",
        tvEdPagesEyebrow: "YOUR PAGES",
        tvEdShownOn: "Shown on: {where}",
        tvEdShownNowhere: "Not shown anywhere",
        tvEdHome: "Home",
        tvEdNoRowsYet: "No rows yet",
        tvEdSoon: "Coming soon",
        tvEdNewRowCrumb: "New collection row \xB7 step 1 of 2",
        tvEdNewRowTitle: "What should the row be called?",
        tvEdNewRowPlaceholder: "e.g. Movie nights, My favourites \u2026",
        tvEdNewRowHelp: "Type with the remote or your phone \u2014 or pick a start below and cards are filled in for you.",
        tvEdNewRowHint: "Step 1 of 2: name",
        tvEdStartFrom: "Start from",
        tvEdStarterDecadesDesc: "One card per decade, 70s to 10s",
        tvEdStarterFranchisesDesc: "Star Wars, Alien, James Bond \u2026",
        tvEdStarterHolidaysDesc: "Halloween and Christmas, ready-made filters",
        tvEdStarterServicesDesc: "Netflix, Max, Disney+",
        tvEdStarterEmptyDesc: "Build it yourself, card by card",
        tvEdContinueBuild: "Continue \u2192 build cards",
        tvEdRowsFull: "You already have {max} rows \u2014 remove one first.",
        tvEdShownOnLabel: "Shown on:",
        tvEdNowhere: "nowhere",
        tvEdRowPreview: "This is how the row looks \xB7 {n} / {max} cards",
        tvEdAddCard: "Add card",
        tvEdRowHelp: "Go to a card and press {ok} to change its content, image and where it leads. {hold} to move the card with \u25C0 \u25B6.",
        tvEdRowHelpOk: "OK",
        tvEdRowHelpHold: "Hold OK",
        tvEdRowHint: "Hold OK on a card to move it",
        tvEdMovingCard: "Moving \u2026 \u25C0 \u25B6 \xB7 OK = drop",
        tvEdRemoveRow: "Remove row",
        tvEdPlacementCrumb: "Shown on",
        tvEdPlacementTitle: "Where should the row appear?",
        tvEdPlacementNote: "Pick one or more. Same row everywhere \u2014 change it here and it changes there.",
        tvEdPlacementHomeSub: "Last on Home",
        tvEdPlacementPageSub: "Custom page",
        tvEdPlacementHint: "Tick with OK",
        tvEdPlacementFull: "Home is full \u2014 remove a row there first.",
        tvEdCardCrumb: "Card {n} of {m}",
        tvEdCardHint: "Three questions per card",
        tvEdCardName: "Card name",
        tvEdCardCount: "\u2248 {n} titles \xB7 {summary}",
        tvEdCardOkLabel: "When you press OK on the card:",
        tvEdCardOkExpand: "The titles unfold in the row",
        tvEdCardOkPage: 'Opens the page "{page}"',
        tvEdQContent: "Content",
        tvEdQContentSub: "Which movies and series should be in the card?",
        tvEdQImage: "Image",
        tvEdQImageSub: "Pick a suggestion, auto or your own image",
        tvEdImageTitle: "2 \xB7 Image",
        tvEdImageText: "The suggestions come from the titles in the card.",
        tvEdImageHint: "Pick a cover for the card",
        tvEdImageAuto: "Auto",
        tvEdImageDevice: "From device",
        tvEdImageCustomUrl: "Own image link",
        tvEdImageStill: "Rest frame",
        tvEdImageFirstFrame: "First frame",
        tvEdQLink: "Where does the card lead?",
        tvEdQLinkSub: "Unfold the titles or open a custom page",
        tvEdQMore: "More",
        tvEdQMoreSub: "Description in the hero and hero background",
        tvEdLinkExpandShort: "Unfold",
        tvEdMoreCustomDesc: "Own description",
        tvEdMoreAuto: "Auto",
        tvEdCardDone: "Done \u2192 back to the row",
        tvEdRemoveCard: "Remove",
        tvEdMoreTitle: "4 \xB7 More",
        tvEdMoreHint: "Empty = automatic",
        tvEdDescPlaceholder: "Empty = summarised automatically (count, years, titles)",
        tvEdHeroTitlesSub: "A random title from the card, stays put during the visit",
        tvEdHeroCoverSub: "Same image as on the card",
        tvEdLinkTitle: "3 \xB7 Where does the card lead?",
        tvEdLinkHint: "Default: unfold",
        tvEdLinkHintPage: "OK on the card opens the chosen page",
        tvEdLinkExpand: "Unfold the titles in the row",
        tvEdLinkExpandSub: "Default. The titles show right below the card, like Film collections.",
        tvEdLinkPage: "Open a custom page",
        tvEdLinkPageSub: "The card becomes a shortcut to one of your pages.",
        tvEdLinkWhichPage: "Which page?",
        tvEdLinkNewPage: "+ New page with the card's titles",
        tvEdLinkPagesFull: "You already have 20 pages \u2014 remove one first.",
        tvEdContentFrom: "Where do the titles come from?",
        tvEdContentHint: "The card on the left updates right away",
        tvEdFilterDecade: "Decade",
        tvEdTabType: "Type",
        tvEdTabGenre: "Genre",
        tvEdTabDecade: "Decade",
        tvEdTabService: "Service",
        tvEdTabSort: "Sort",
        tvEdTabRating: "Rating",
        tvEdTabLanguage: "Language",
        tvEdTabMore: "More",
        tvEdTabAll: "All",
        tvEdTabAny: "Any",
        tvEdSourceSummary: "Source: {source}",
        tvEdSourceSummarySub: "OK shows every source",
        tvEdFilterTabsHint: "OK on a tab shows its choices",
        tvEdSourceNoteManual: `Hand-picked titles are added on the desktop (the card's content in Settings). Here you can pin or remove them under "Titles in the card".`,
        tvEdSourceNoteWatchlist: "The titles come from your watchlist and update automatically.",
        tvEdSourceNoteTrakt: "The titles come from your Trakt collection.",
        tvEdSourceNoteCollection: "Shows a whole TMDb collection (e.g. a film series). Enter the collection's id below.",
        tvEdSourceNoteContinue: "Shows what you have started watching.",
        tvEdTitlesStation: "Titles in the card \xB7 pin or hide",
        tvEdTitlesCardTitle: "Titles in the card",
        tvEdTitlesCycle: "OK cycles: shown \u2192 **pinned first** \u2192 **hidden** \u2192 shown",
        tvEdTitlesHint: "OK cycles shown / pinned / hidden",
        tvEdTitlePinned: "Pinned",
        tvEdTitleHidden: "Hidden",
        tvEdTitlesEmpty: "No titles to show yet.",
        tvEdSrcDiscover: "Filter (genre, year \u2026)",
        tvEdSrcManual: "Hand-pick titles",
        tvEdSrcWatchlist: "Watchlist",
        tvEdSrcCollection: "Film series (TMDb)",
        tvEdSrcTrakt: "Trakt collection",
        tvEdSrcContinue: "Continue watching",
        tvEdShowAllLanguages: "Show all languages",
        tvEdShowFewerLanguages: "Show fewer languages",
        tvEdDecadeCustom: "Custom: {range}",
        tvEdStarterThemeDesc: "The name becomes the theme: movies, series, top rated, trailers",
        tvEdStarterThemeNeedsName: "Type a name first \u2014 it becomes the theme",
        tvEdNewPageCrumb: "New page \xB7 step 1 of 2",
        tvEdNewPageTitle: "What should the page be called?",
        tvEdNewPagePlaceholder: "e.g. Star Wars, Friday night \u2026",
        tvEdNewPageHelp: "Pick a start and rows are filled in for you \u2014 everything can be changed later.",
        tvEdPageStarterEmptyDesc: "Add rows yourself",
        tvEdPageStarterThemeDesc: "The name becomes the theme: movies, series and similar",
        tvEdContinueBuildRows: "Continue \u2192 build rows",
        tvEdPagesFull: "You already have {max} pages \u2014 remove one first.",
        tvEdPageSettingsLabel: "Page settings:",
        tvEdNotInMenu: "Not in menu",
        tvEdHeroShort: "Hero: {v}",
        tvEdHeroShortTitles: "titles",
        tvEdHeroShortRow: "one row",
        tvEdHeroShortCollection: "collection",
        tvEdHeroShortFixed: "fixed title",
        tvEdPagePreview: "How the page looks \xB7 {n} rows",
        tvEdShapePosterShort: "Poster",
        tvEdShapeWideShort: "Wide",
        tvEdCountShort: "{n} pcs",
        tvEdRowHiddenTag: "Hidden",
        tvEdShowAllTo: "Show all \u2192 {page}",
        tvEdPageHelp: "Press {ok} on a row to choose its source, look and where it leads. {hold} to move it with \u25B2 \u25BC.",
        tvEdPageHint: "Hold OK on a row to move it",
        tvEdMovingRow: "Moving \u2026 \u25B2 \u25BC \xB7 OK = drop",
        tvEdPageSettingsTitle: "Page settings",
        tvEdPageSettingsCrumb: "Settings",
        tvEdPageSettingsHint: "Applies to the whole page",
        tvEdGroupInMenu: "Show in menu",
        tvEdGroupStart: "Use as start page",
        tvEdGroupHero: "Page hero",
        tvEdInMenuYesSub: "The page gets its own entry in the menu",
        tvEdInMenuNoSub: "Reached only through links and \u201CShow all\u201D",
        tvEdStartNoSub: "The normal home page shows when the app opens",
        tvEdStartYesSub: "The app opens on this page",
        tvEdHeroTitles: "Titles from the page",
        tvEdHeroPageTitlesSub: "Browses the page\u2019s titles",
        tvEdHeroRow: "One row \u2026",
        tvEdHeroRowSub: "Only titles from one of the page\u2019s rows",
        tvEdHeroCollection: "A collection \u2026",
        tvEdHeroCollectionSub: "The titles in one collection card",
        tvEdHeroFixedSub: "Chosen on the computer",
        tvEdHeroOffDesktopNote: "Off only applies on desktop \u2014 TV shows the page\u2019s titles.",
        tvEdHeroNoCollections: "No collection rows yet.",
        tvEdPRowCrumb: "Row {n} of {m}",
        tvEdPRowHint: "Three questions per row",
        tvEdPRowName: "Row title",
        tvEdQSource: "Source",
        tvEdQSourceSub: "Home rows, filters or your collection rows",
        tvEdQLook: "Look",
        tvEdQLookSub: "Card shape and number of titles",
        tvEdQShowAll: 'Where does "Show all" lead?',
        tvEdQShowAllSub: "Nowhere, or one of your pages",
        tvEdQPRowMoreSub: "Row on/off, pin or hide titles",
        tvEdShowAllNone: "None",
        tvEdRowShown: "Shown",
        tvEdTitlesChanged: "changed titles",
        tvEdPRowDone: "Done \u2192 back to the page",
        tvEdRemovePRowBody: "The row disappears from this page. Rows on other pages that point to it show that it is gone.",
        tvEdPreviewShowAll: "Show all:",
        tvEdShowAllNoneLong: "None \u2014 the row ends there",
        tvEdSourceHint: "Pick a group at the top, then a source",
        tvEdGroupPopular: "Popular",
        tvEdGroupMood: "Mood",
        tvEdGroupServices: "Services",
        tvEdGroupMine: "Mine",
        tvEdGroupOwn: "Custom",
        tvEdGroupCollectionRows: "My collection rows",
        tvEdGroupPageRows: "From my pages",
        tvEdNoCollectionRows: "You have no collection rows yet \u2014 create one under {where}.",
        tvEdNoOtherPageRows: "Your other pages have no rows yet.",
        tvEdSourceNoteManualRow: "Hand-picked titles are added on the desktop. Here you can pin or remove them under More \u203A Titles in the row.",
        tvEdLookHint: "The preview updates right away",
        tvEdGroupShape: "Card shape",
        tvEdShapePosterSub: "Portrait 2:3",
        tvEdShapeWideSub: "Landscape 16:9",
        tvEdGroupCount: "Number of titles",
        tvEdGridNote: "Grid \u2014 changed on the desktop",
        tvEdShowAllHint: "Default: no link",
        tvEdShowAllNoLink: "No link",
        tvEdShowAllNoLinkSub: "Default. The row shows its titles and ends there.",
        tvEdShowAllPage: '"Show all" opens a page',
        tvEdShowAllPageSub: "The title gets an arrow \u2014 OK on it opens the page.",
        tvEdShowAllNewPage: "+ New page with the row's content",
        tvEdShowAllLabel: "Link text",
        tvEdPRowMoreHint: "Hidden rows stay",
        tvEdGroupRowOnPage: "The row on the page",
        tvEdRowShownSub: "The row is visible on the page",
        tvEdRowHiddenSub: "The row stays but isn't shown",
        tvEdGroupTitles: "Titles",
        tvEdTitlesRowStation: "Titles in the row \xB7 pin or hide",
        tvEdTitlesRowTitle: "Titles in the row",
        tvEdTitlesRefNote: "The titles come from the row this one points to \u2014 pin or hide them there.",
        tvEdTemplateEyebrow: "Template for the theme"
      };
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/jsx-runtime-shim.ts
  var runtime, Fragment2, jsx, jsxs, jsxDEV;
  var init_jsx_runtime_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/jsx-runtime-shim.ts"() {
      runtime = globalThis.__lumioPluginRuntime?.jsxRuntime;
      Fragment2 = runtime.Fragment;
      jsx = runtime.jsx;
      jsxs = runtime.jsxs;
      jsxDEV = runtime.jsxDEV;
    }
  });

  // lib/i18n.tsx
  function isBuiltinLang(value) {
    return typeof value === "string" && BUILTIN_LANGS.includes(value);
  }
  function isCustomLang(value) {
    return typeof value === "string" && /^x-[a-z0-9-]{1,32}$/.test(value);
  }
  function loaded() {
    if (typeof window === "undefined") return null;
    return window.__lumioLang ?? null;
  }
  function baseLang(lang) {
    if (isBuiltinLang(lang)) return lang;
    const current2 = loaded();
    return current2?.lang === lang && current2.base ? current2.base : "en";
  }
  function lookup(lang, key) {
    const current2 = loaded();
    const pack = lang !== "en" && current2?.lang === lang ? current2.pack : null;
    const base = en;
    if (isWindowsDesktop()) {
      const variant = pack?.[`${key}Windows`] ?? base[`${key}Windows`];
      if (variant) return variant;
    }
    return pack?.[key] ?? en[key];
  }
  function readStoredLang() {
    if (typeof window === "undefined") return DEFAULT_LANG;
    try {
      const scoped = getScopedStorageItem(STORAGE_KEY2);
      const legacy = getItem(STORAGE_KEY2);
      const value = scoped ?? legacy;
      if (isBuiltinLang(value) || isCustomLang(value)) return value;
    } catch {
    }
    return DEFAULT_LANG;
  }
  function useLang() {
    const ctx = useContext(LangContext);
    const detached = ctx === detachedLangContextValue;
    const [detachedLang, setDetachedLang] = useState(() => readStoredLang());
    const [packRevision, setPackRevision] = useState(0);
    useEffect(() => {
      if (!detached || typeof window === "undefined") return;
      const sync = () => setDetachedLang(readStoredLang());
      sync();
      const repack = () => setPackRevision((value) => value + 1);
      window.addEventListener(LANG_CHANGED_EVENT, sync);
      window.addEventListener(LANG_PACK_EVENT, repack);
      const offProfile = onProfileChanged(sync);
      return () => {
        window.removeEventListener(LANG_CHANGED_EVENT, sync);
        window.removeEventListener(LANG_PACK_EVENT, repack);
        offProfile();
      };
    }, [detached]);
    const detachedValue = useMemo(() => ({
      lang: detachedLang,
      setLang: (l) => {
        setScopedStorageItem(STORAGE_KEY2, l);
        setDetachedLang(l);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(LANG_CHANGED_EVENT));
        }
      },
      t: (key) => lookup(detachedLang, key)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [detachedLang, packRevision]);
    if (!detached) return ctx;
    return detachedValue;
  }
  var BUILTIN_LANGS, detachedLangContextValue, LangContext, LANG_CHANGED_EVENT, STORAGE_KEY2, DEFAULT_LANG, LANG_PACK_EVENT;
  var init_i18n = __esm({
    "lib/i18n.tsx"() {
      "use strict";
      "use client";
      init_app_storage();
      init_react_shim();
      init_profile_storage_shim();
      init_platform_os();
      init_en();
      init_jsx_runtime_shim();
      BUILTIN_LANGS = ["en", "sv", "de", "fr", "es"];
      detachedLangContextValue = {
        lang: "en",
        setLang: () => {
        },
        t: (key) => en[key]
      };
      LangContext = createContext(detachedLangContextValue);
      LANG_CHANGED_EVENT = "lumio-app-lang-changed";
      STORAGE_KEY2 = "app_lang";
      DEFAULT_LANG = "en";
      LANG_PACK_EVENT = "lumio-lang-pack-changed";
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/tv-focus-shim.ts
  var init_tv_focus_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/tv-focus-shim.ts"() {
    }
  });

  // lib/parallel-ranges.ts
  var init_parallel_ranges = __esm({
    "lib/parallel-ranges.ts"() {
      init_app_storage();
    }
  });

  // lib/subtitle-legibility.ts
  var HELVETICA_WIN_EM, ASS_SIZE_FACTOR;
  var init_subtitle_legibility = __esm({
    "lib/subtitle-legibility.ts"() {
      HELVETICA_WIN_EM = 1.175;
      ASS_SIZE_FACTOR = {
        default: 1,
        atkinson: 1.24 / HELVETICA_WIN_EM,
        opendyslexic: 2.136 / HELVETICA_WIN_EM
      };
    }
  });

  // lib/playback-settings.ts
  var init_playback_settings = __esm({
    "lib/playback-settings.ts"() {
      "use strict";
      init_app_storage();
      init_profile_storage_shim();
      init_subtitle_legibility();
    }
  });

  // lib/android-direct-stream.ts
  var FINAL_URL_TTL_MS;
  var init_android_direct_stream = __esm({
    "lib/android-direct-stream.ts"() {
      FINAL_URL_TTL_MS = 30 * 60 * 1e3;
    }
  });

  // lib/tauri-native-player.ts
  var isAndroidTauriEnv;
  var init_tauri_native_player = __esm({
    "lib/tauri-native-player.ts"() {
      "use strict";
      init_parallel_ranges();
      init_timing();
      init_react_shim();
      init_tauri_mpv();
      init_playback_settings();
      init_android_source_cache();
      init_android_direct_stream();
      isAndroidTauriEnv = isTauriEnv && typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    }
  });

  // lib/player-layout.ts
  var DESKTOP_CHROME_QUERY;
  var init_player_layout = __esm({
    "lib/player-layout.ts"() {
      "use client";
      init_profile_storage_shim();
      DESKTOP_CHROME_QUERY = "(min-width: 768px) and (min-height: 520px)";
    }
  });

  // lib/pip.ts
  function notify() {
    for (const fn of listeners) fn();
  }
  function isTvDocument() {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-tv") === "1";
  }
  function backend() {
    if (backendOverride) return backendOverride;
    if (typeof window === "undefined" || isTvDocument()) return "none";
    if (isAndroidTauriEnv) return "droid";
    if (!isClientSession()) return "none";
    if (typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_CHROME_QUERY).matches) return "none";
    return "web";
  }
  function setActive(next) {
    if (active === next) return;
    active = next;
    if (typeof document !== "undefined" && backend() === "droid") {
      if (next) document.documentElement.setAttribute("data-pip", "on");
      else document.documentElement.removeAttribute("data-pip");
    }
    notify();
  }
  function onNative(msg) {
    const reg = current;
    if (!reg) return false;
    if (msg.mode === "on") {
      setActive(true);
      return true;
    }
    if (msg.mode === "off") {
      setActive(false);
      return true;
    }
    if (msg.mode === "closed") {
      setActive(false);
      reg.actions.onClosed();
      return true;
    }
    switch (msg.action) {
      case "prev":
        reg.actions.onPrev();
        return true;
      case "next":
        reg.actions.onNext();
        return true;
      case "playPause":
        reg.actions.onPlayPause();
        return true;
    }
    return false;
  }
  var backendOverride, current, active, listeners;
  var init_pip = __esm({
    "lib/pip.ts"() {
      "use strict";
      "use client";
      init_react_shim();
      init_tauri_native_player();
      init_session_host();
      init_player_layout();
      backendOverride = null;
      current = null;
      active = false;
      listeners = /* @__PURE__ */ new Set();
      if (typeof window !== "undefined") {
        ;
        window.__lumioPip = onNative;
      }
    }
  });

  // lib/library/mode.ts
  var init_mode = __esm({
    "lib/library/mode.ts"() {
      "use client";
      init_react_shim();
      init_profile_storage_shim();
    }
  });

  // lib/library/ids.ts
  var init_ids = __esm({
    "lib/library/ids.ts"() {
      "use strict";
      "use client";
      init_react_shim();
      init_mode();
    }
  });

  // lib/library/client.ts
  var init_client = __esm({
    "lib/library/client.ts"() {
      "use client";
      init_ids();
      init_mode();
    }
  });

  // lib/tv-scene.ts
  var init_tv_scene = __esm({
    "lib/tv-scene.ts"() {
      "use strict";
      "use client";
    }
  });

  // lib/local-episode-files.ts
  var init_local_episode_files = __esm({
    "lib/local-episode-files.ts"() {
    }
  });

  // lib/local-files-storage.ts
  var init_local_files_storage = __esm({
    "lib/local-files-storage.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/library/local-folders.ts
  var init_local_folders = __esm({
    "lib/library/local-folders.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      init_local_files_storage();
    }
  });

  // lib/library/local-folder-provider.ts
  var MISS_TTL_MS;
  var init_local_folder_provider = __esm({
    "lib/library/local-folder-provider.ts"() {
      "use strict";
      "use client";
      init_local_episode_files();
      init_profile_storage_shim();
      init_local_folders();
      MISS_TTL_MS = 7 * 24 * 60 * 6e4;
    }
  });

  // lib/library/name-match.ts
  var init_name_match = __esm({
    "lib/library/name-match.ts"() {
      "use strict";
      "use client";
      init_local_folder_provider();
    }
  });

  // lib/library/scan.ts
  var init_scan = __esm({
    "lib/library/scan.ts"() {
      "use client";
      init_client();
      init_ids();
      init_name_match();
    }
  });

  // components/tv/tv-scene-box.tsx
  var init_tv_scene_box = __esm({
    "components/tv/tv-scene-box.tsx"() {
      "use client";
      init_react_shim();
      init_tv_focus_shim();
      init_tv_scene();
      init_jsx_runtime_shim();
    }
  });

  // lib/key-hold.ts
  var init_key_hold = __esm({
    "lib/key-hold.ts"() {
      "use strict";
    }
  });

  // lib/tv-hold.ts
  var init_tv_hold = __esm({
    "lib/tv-hold.ts"() {
      "use strict";
      init_key_hold();
    }
  });

  // lib/custom-themes.ts
  var init_custom_themes = __esm({
    "lib/custom-themes.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/appearance-settings.ts
  var init_appearance_settings = __esm({
    "lib/appearance-settings.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      init_custom_themes();
    }
  });

  // lib/plugin-storage.ts
  var init_plugin_storage = __esm({
    "lib/plugin-storage.ts"() {
      "use strict";
      "use client";
      init_app_storage();
      init_profile_storage_shim();
    }
  });

  // lib/plugin-assets.ts
  var init_plugin_assets = __esm({
    "lib/plugin-assets.ts"() {
      "use strict";
      "use client";
    }
  });

  // lib/home-background-settings.ts
  var init_home_background_settings = __esm({
    "lib/home-background-settings.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/home-override-settings.ts
  var init_home_override_settings = __esm({
    "lib/home-override-settings.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/spoiler-settings.ts
  var init_spoiler_settings = __esm({
    "lib/spoiler-settings.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/trakt-storage.ts
  function getTraktAuth() {
    if (typeof window === "undefined") return null;
    try {
      const raw = getScopedStorageItem(AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "number") {
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: parsed.expiresAt,
        scope: typeof parsed.scope === "string" ? parsed.scope : "",
        tokenType: typeof parsed.tokenType === "string" ? parsed.tokenType : "bearer",
        username: typeof parsed.username === "string" ? parsed.username : null,
        name: typeof parsed.name === "string" ? parsed.name : null
      };
    } catch {
      return null;
    }
  }
  var AUTH_KEY;
  var init_trakt_storage = __esm({
    "lib/trakt-storage.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      init_spoiler_settings();
      AUTH_KEY = "trakt_auth";
    }
  });

  // lib/movie-watchlist.ts
  function normalizeTmdbId(tmdbId) {
    return tmdbId.replace(/^movie-/, "");
  }
  function read() {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(getScopedStorageItem(KEY) ?? "[]");
      const deduped = [];
      for (const entry of parsed) {
        const normalizedEntry = {
          ...entry,
          tmdbId: normalizeTmdbId(entry.tmdbId)
        };
        const existingIndex = deduped.findIndex(
          (candidate) => candidate.tmdbId === normalizedEntry.tmdbId || candidate.imdbId && normalizedEntry.imdbId && candidate.imdbId === normalizedEntry.imdbId
        );
        if (existingIndex >= 0) {
          deduped[existingIndex] = {
            ...deduped[existingIndex],
            ...normalizedEntry,
            imdbId: normalizedEntry.imdbId ?? deduped[existingIndex].imdbId ?? null,
            posterUrl: normalizedEntry.posterUrl ?? deduped[existingIndex].posterUrl,
            monitorForStreams: normalizedEntry.monitorForStreams ?? deduped[existingIndex].monitorForStreams
          };
        } else {
          deduped.push(normalizedEntry);
        }
      }
      return deduped;
    } catch {
      return [];
    }
  }
  function write(entries) {
    setScopedStorageItem(KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  }
  function emitMutation(mutation) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT, { detail: mutation }));
    }
  }
  function getMovieWatchlist() {
    return read();
  }
  function addMovieWatchlistEntries(entries, options) {
    if (entries.length === 0) return;
    let list = read();
    const added = [];
    for (const entry of entries) {
      const normalizedEntry = { ...entry, tmdbId: normalizeTmdbId(entry.tmdbId) };
      list = list.filter(
        (e) => e.tmdbId !== normalizedEntry.tmdbId && !(normalizedEntry.imdbId && e.imdbId && e.imdbId === normalizedEntry.imdbId)
      );
      const nextEntry = { ...normalizedEntry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
      list.push(nextEntry);
      added.push(nextEntry);
    }
    write(list);
    for (const entry of added) {
      emitMutation({ action: "add", entry, source: options?.source ?? "local" });
    }
  }
  function removeFromMovieWatchlist(tmdbId, options) {
    const normalizedTmdbId = normalizeTmdbId(tmdbId);
    const existing = read().find((entry) => entry.tmdbId === normalizedTmdbId) ?? null;
    write(read().filter((e) => e.tmdbId !== normalizedTmdbId));
    if (existing) {
      emitMutation({
        action: "remove",
        entry: existing,
        source: options?.source ?? "local"
      });
    }
  }
  function onMovieWatchlistMutation(listener) {
    if (typeof window === "undefined") return () => {
    };
    const handler = (event) => {
      const detail = event.detail;
      if (detail) listener(detail);
    };
    window.addEventListener(DETAIL_EVENT, handler);
    return () => window.removeEventListener(DETAIL_EVENT, handler);
  }
  var KEY, EVENT, DETAIL_EVENT;
  var init_movie_watchlist = __esm({
    "lib/movie-watchlist.ts"() {
      "use strict";
      init_profile_storage_shim();
      KEY = "movie_watchlist";
      EVENT = "lumio-movie-watchlist-changed";
      DETAIL_EVENT = "lumio-movie-watchlist-mutated";
    }
  });

  // lib/watchlist.ts
  function read2() {
    if (typeof window === "undefined") return [];
    try {
      const raw = getScopedStorageItem(KEY2) ?? getScopedStorageItem(LEGACY_KEY) ?? "[]";
      const parsed = JSON.parse(raw);
      const deduped = [];
      for (const entry of parsed) {
        const existingIndex = deduped.findIndex(
          (candidate) => candidate.tmdbId === entry.tmdbId || candidate.imdbId && entry.imdbId && candidate.imdbId === entry.imdbId
        );
        if (existingIndex >= 0) {
          deduped[existingIndex] = {
            ...deduped[existingIndex],
            ...entry,
            imdbId: entry.imdbId ?? deduped[existingIndex].imdbId ?? null,
            posterUrl: entry.posterUrl ?? deduped[existingIndex].posterUrl
          };
        } else {
          deduped.push(entry);
        }
      }
      return deduped;
    } catch {
      return [];
    }
  }
  function write2(entries) {
    setScopedStorageItem(KEY2, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT2));
    }
  }
  function emitMutation2(mutation) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT2, { detail: mutation }));
    }
  }
  function getWatchlist() {
    return read2();
  }
  function addWatchlistEntries(entries, options) {
    if (entries.length === 0) return;
    let list = read2();
    const added = [];
    for (const entry of entries) {
      const sameAs = (e) => e.tmdbId === entry.tmdbId || Boolean(entry.imdbId && e.imdbId && e.imdbId === entry.imdbId);
      list = list.filter((e) => !sameAs(e));
      const nextEntry = { ...entry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
      list.push(nextEntry);
      added.push(nextEntry);
    }
    write2(list);
    for (const entry of added) {
      emitMutation2({ action: "add", entry, source: options?.source ?? "local" });
    }
  }
  function removeFromWatchlist(tmdbId, options) {
    const existing = read2().find((entry) => entry.tmdbId === tmdbId) ?? null;
    write2(read2().filter((e) => e.tmdbId !== tmdbId));
    if (existing) {
      emitMutation2({
        action: "remove",
        entry: existing,
        source: options?.source ?? "local"
      });
    }
  }
  function onWatchlistMutation(listener) {
    if (typeof window === "undefined") return () => {
    };
    const handler = (event) => {
      const detail = event.detail;
      if (detail) listener(detail);
    };
    window.addEventListener(DETAIL_EVENT2, handler);
    return () => window.removeEventListener(DETAIL_EVENT2, handler);
  }
  var KEY2, LEGACY_KEY, EVENT2, DETAIL_EVENT2;
  var init_watchlist = __esm({
    "lib/watchlist.ts"() {
      "use strict";
      init_profile_storage_shim();
      KEY2 = "watchlist_items";
      LEGACY_KEY = "rd_watchlist";
      EVENT2 = "lumio-watchlist-changed";
      DETAIL_EVENT2 = "lumio-watchlist-mutated";
    }
  });

  // lib/watched-episodes.ts
  function epKey(tmdbId, season, episode) {
    return `${tmdbId}-S${season}E${episode}`;
  }
  function parseStored(raw) {
    try {
      const parsed = JSON.parse(raw);
      const out = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.trim().length > 0) out[key] = value;
        else if (value) out[key] = true;
      }
      return out;
    } catch {
      return {};
    }
  }
  function readShared() {
    if (typeof window === "undefined") return {};
    const raw = getScopedStorageItem(KEY3) ?? "{}";
    if (parsedCache && parsedCache.raw === raw) return parsedCache.data;
    const data = parseStored(raw);
    parsedCache = { raw, data };
    return data;
  }
  function read3() {
    return { ...readShared() };
  }
  function write3(data) {
    const raw = JSON.stringify(data);
    setScopedStorageItem(KEY3, raw);
    parsedCache = { raw, data };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT3));
    }
  }
  function timestampOf(value) {
    return typeof value === "string" ? value : void 0;
  }
  function parseEpKey(key) {
    const match = key.match(/^(.+)-S(\d+)E(\d+)$/);
    if (!match) return null;
    return { tmdbId: match[1], season: Number(match[2]), episode: Number(match[3]) };
  }
  function getWatchedEpisodes() {
    return Object.entries(readShared()).map(([key, value]) => {
      const parsed = parseEpKey(key);
      if (!parsed) return null;
      return { ...parsed, watchedAt: timestampOf(value) };
    }).filter((entry) => Boolean(entry));
  }
  function addWatchedEpisodes(episodes, options) {
    const data = read3();
    const source = options?.source ?? "local";
    const added = [];
    for (const episode of episodes) {
      const key = epKey(episode.tmdbId, episode.season, episode.episode);
      if (data[key]) continue;
      const value = episode.watchedAt ?? (source !== "local" ? true : (/* @__PURE__ */ new Date()).toISOString());
      data[key] = value;
      added.push({ episode, value });
    }
    if (added.length === 0) return 0;
    write3(data);
    if (typeof window !== "undefined") {
      for (const { episode, value } of added) {
        window.dispatchEvent(new CustomEvent(DETAIL_EVENT3, {
          detail: {
            tmdbId: episode.tmdbId,
            imdbId: episode.imdbId ?? null,
            season: episode.season,
            episode: episode.episode,
            watched: true,
            source,
            watchedAt: timestampOf(value)
          }
        }));
      }
    }
    return added.length;
  }
  function onWatchedEpisodeMutation(listener) {
    if (typeof window === "undefined") return () => {
    };
    const handler = (event) => {
      const detail = event.detail;
      if (detail) listener(detail);
    };
    window.addEventListener(DETAIL_EVENT3, handler);
    return () => window.removeEventListener(DETAIL_EVENT3, handler);
  }
  var KEY3, EVENT3, DETAIL_EVENT3, parsedCache;
  var init_watched_episodes = __esm({
    "lib/watched-episodes.ts"() {
      "use strict";
      init_profile_storage_shim();
      KEY3 = "watched_episodes";
      EVENT3 = "lumio-watched-episodes-changed";
      DETAIL_EVENT3 = "lumio-watched-episode-mutated";
      parsedCache = null;
    }
  });

  // lib/watched-movies.ts
  function normalizeId(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  function normalizeTitle(value) {
    if (typeof value !== "string") return null;
    const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalized.length > 0 ? normalized : null;
  }
  function normalizeYear(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function readEntries() {
    if (typeof window === "undefined") return [];
    try {
      const raw = getScopedStorageItem(KEY_WATCHED_MOVIES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry) => Boolean(entry) && typeof entry === "object").map((entry) => ({
        tmdbId: normalizeId(typeof entry.tmdbId === "string" ? entry.tmdbId : null),
        imdbId: normalizeId(typeof entry.imdbId === "string" ? entry.imdbId : null),
        title: typeof entry.title === "string" ? entry.title : null,
        year: normalizeYear(typeof entry.year === "number" ? entry.year : null),
        posterUrl: typeof entry.posterUrl === "string" ? entry.posterUrl : null,
        watchedAt: typeof entry.watchedAt === "string" && entry.watchedAt.trim().length > 0 ? entry.watchedAt : (/* @__PURE__ */ new Date()).toISOString()
      })).filter((entry) => Boolean(entry.tmdbId || entry.imdbId || normalizeTitle(entry.title) && entry.year != null));
    } catch {
      return [];
    }
  }
  function writeEntries(entries) {
    if (typeof window === "undefined") return;
    setScopedStorageItem(KEY_WATCHED_MOVIES, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_WATCHED_MOVIES_CHANGED, {
      detail: {
        action: "add",
        entry: entries[0] ?? { watchedAt: (/* @__PURE__ */ new Date()).toISOString() },
        source: "local",
        entries
      }
    }));
  }
  function sameMovie(entry, target) {
    const entryTmdbId = normalizeId(entry.tmdbId);
    const entryImdbId = normalizeId(entry.imdbId);
    const entryTitle = normalizeTitle(entry.title);
    const entryYear = normalizeYear(entry.year);
    const targetTmdbId = normalizeId(target.tmdbId);
    const targetImdbId = normalizeId(target.imdbId);
    const targetTitle = normalizeTitle(target.title);
    const targetYear = normalizeYear(target.year);
    return Boolean(
      entryTmdbId && targetTmdbId && entryTmdbId === targetTmdbId || entryImdbId && targetImdbId && entryImdbId === targetImdbId
    ) || Boolean(
      entryTitle && targetTitle && entryYear != null && targetYear != null && entryTitle === targetTitle && entryYear === targetYear
    );
  }
  function getWatchedMovies() {
    return readEntries();
  }
  function addWatchedMovies(movies, options) {
    if (typeof window === "undefined") return 0;
    const current2 = readEntries();
    const added = [];
    for (const movie of movies) {
      const tmdbId = normalizeId(movie.tmdbId);
      const imdbId = normalizeId(movie.imdbId);
      const title = movie.title ?? null;
      const year = normalizeYear(movie.year);
      if (!tmdbId && !imdbId && !(normalizeTitle(title) && year != null)) continue;
      const target = { tmdbId, imdbId, title, year };
      if (current2.some((entry) => sameMovie(entry, target))) continue;
      if (added.some((entry) => sameMovie(entry, target))) continue;
      added.push({
        tmdbId,
        imdbId,
        title,
        year,
        posterUrl: movie.posterUrl ?? null,
        watchedAt: movie.watchedAt ?? (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (added.length === 0) return 0;
    const next = [...added.slice().reverse(), ...current2];
    writeEntries(next);
    const source = options?.source ?? "local";
    for (const entry of added) {
      window.dispatchEvent(new CustomEvent(DETAIL_EVENT_WATCHED_MOVIE_MUTATED, {
        detail: { action: "add", entry, source, entries: next }
      }));
    }
    return added.length;
  }
  function onWatchedMovieMutation(listener) {
    if (typeof window === "undefined") return () => {
    };
    const handle = (event) => {
      const detail = event.detail;
      if (detail) listener(detail);
    };
    window.addEventListener(DETAIL_EVENT_WATCHED_MOVIE_MUTATED, handle);
    return () => window.removeEventListener(DETAIL_EVENT_WATCHED_MOVIE_MUTATED, handle);
  }
  var KEY_WATCHED_MOVIES, EVENT_WATCHED_MOVIES_CHANGED, DETAIL_EVENT_WATCHED_MOVIE_MUTATED;
  var init_watched_movies = __esm({
    "lib/watched-movies.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      KEY_WATCHED_MOVIES = "watched_movies";
      EVENT_WATCHED_MOVIES_CHANGED = "lumio-watched-movies-changed";
      DETAIL_EVENT_WATCHED_MOVIE_MUTATED = "lumio-watched-movie-mutated";
    }
  });

  // lib/trakt-watchlist-limit.ts
  var LIMIT_BACKOFF_MS;
  var init_trakt_watchlist_limit = __esm({
    "lib/trakt-watchlist-limit.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      LIMIT_BACKOFF_MS = 24 * 60 * 6e4;
    }
  });

  // lib/watchlist-item-cache.ts
  var init_watchlist_item_cache = __esm({
    "lib/watchlist-item-cache.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/trakt-sync.ts
  var init_trakt_sync = __esm({
    "lib/trakt-sync.ts"() {
      "use strict";
      "use client";
      init_trakt_storage();
      init_movie_watchlist();
      init_watchlist();
      init_watched_episodes();
      init_watched_movies();
      init_trakt_watchlist_limit();
      init_watchlist_item_cache();
    }
  });

  // lib/watchlist-merge.ts
  function planWatchlistSync(local, remote, snapshotIds, conflictRule, options) {
    const keepLocal = options?.keepLocal === true;
    const localById = new Map(local.map((e) => [e.tmdbId, e]));
    const remoteById = new Map(remote.map((e) => [e.tmdbId, e]));
    const plan = { pushAdds: [], pushRemoves: [], localAdds: [], localRemoveIds: [], nextIds: [] };
    const asRemoteEntry = (e) => ({
      tmdbId: e.tmdbId,
      imdbId: e.imdbId ?? null,
      title: e.title,
      posterUrl: e.posterUrl ?? null
    });
    if (snapshotIds === null) {
      for (const [id, entry] of localById) {
        if (remoteById.has(id)) continue;
        if (conflictRule === "trakt" && !keepLocal) plan.localRemoveIds.push(id);
        else plan.pushAdds.push(asRemoteEntry(entry));
      }
      for (const [id, entry] of remoteById) {
        if (localById.has(id)) continue;
        if (conflictRule === "local") plan.pushRemoves.push(entry);
        else plan.localAdds.push(entry);
      }
    } else {
      const snap = new Set(snapshotIds);
      for (const [id, entry] of localById) {
        if (remoteById.has(id)) continue;
        if (snap.has(id) && !keepLocal) plan.localRemoveIds.push(id);
        else plan.pushAdds.push(asRemoteEntry(entry));
      }
      for (const [id, entry] of remoteById) {
        if (localById.has(id)) continue;
        if (snap.has(id)) plan.pushRemoves.push(entry);
        else plan.localAdds.push(entry);
      }
    }
    const removedLocally = new Set(plan.localRemoveIds);
    const pushedRemoves = new Set(plan.pushRemoves.map((e) => e.tmdbId));
    const next = /* @__PURE__ */ new Set();
    for (const id of localById.keys()) if (!removedLocally.has(id)) next.add(id);
    for (const e of plan.localAdds) next.add(e.tmdbId);
    for (const id of remoteById.keys()) if (!pushedRemoves.has(id) && !removedLocally.has(id)) next.add(id);
    plan.nextIds = [...next];
    return plan;
  }
  var init_watchlist_merge = __esm({
    "lib/watchlist-merge.ts"() {
      "use strict";
    }
  });

  // lib/mutation-source.ts
  function isUserMutation(source) {
    return source === "local";
  }
  var init_mutation_source = __esm({
    "lib/mutation-source.ts"() {
      "use strict";
      "use client";
    }
  });

  // lib/rating-sources.ts
  var init_rating_sources = __esm({
    "lib/rating-sources.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/open-external.ts
  async function openAndroidUrl(url) {
    try {
      const response = await fetch("/api/native-player", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cmd: "openUrl", url })
      });
      if (!response.ok) return false;
      const payload = await response.json();
      return payload?.ok === true;
    } catch {
      return false;
    }
  }
  async function openExternalUrl(url) {
    if (!url) return;
    if (isAndroidTauri) {
      if (await openAndroidUrl(url)) return;
      console.warn("[open-external] Android intent failed, not falling back to window.open", url);
      return;
    }
    if (isTauriEnv) {
      try {
        const { invoke: invoke7 } = await Promise.resolve().then(() => __toESM(require_core()));
        await invoke7("open_external_url", { url });
        return;
      } catch {
      }
    }
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
  var isAndroidTauri;
  var init_open_external = __esm({
    "lib/open-external.ts"() {
      "use strict";
      "use client";
      init_tauri_mpv();
      isAndroidTauri = isTauriEnv && typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    }
  });

  // ../../node_modules/qrcode.react/lib/esm/index.js
  function generatePath(modules, margin = 0) {
    const ops = [];
    modules.forEach(function(row, y) {
      let start = null;
      row.forEach(function(cell, x) {
        if (!cell && start !== null) {
          ops.push(
            `M${start + margin} ${y + margin}h${x - start}v1H${start + margin}z`
          );
          start = null;
          return;
        }
        if (x === row.length - 1) {
          if (!cell) {
            return;
          }
          if (start === null) {
            ops.push(`M${x + margin},${y + margin} h1v1H${x + margin}z`);
          } else {
            ops.push(
              `M${start + margin},${y + margin} h${x + 1 - start}v1H${start + margin}z`
            );
          }
          return;
        }
        if (cell && start === null) {
          start = x;
        }
      });
    });
    return ops.join("");
  }
  function excavateModules(modules, excavation) {
    return modules.slice().map((row, y) => {
      if (y < excavation.y || y >= excavation.y + excavation.h) {
        return row;
      }
      return row.map((cell, x) => {
        if (x < excavation.x || x >= excavation.x + excavation.w) {
          return cell;
        }
        return false;
      });
    });
  }
  function getImageSettings(cells, size, margin, imageSettings) {
    if (imageSettings == null) {
      return null;
    }
    const numCells = cells.length + margin * 2;
    const defaultSize = Math.floor(size * DEFAULT_IMG_SCALE);
    const scale = numCells / size;
    const w = (imageSettings.width || defaultSize) * scale;
    const h = (imageSettings.height || defaultSize) * scale;
    const x = imageSettings.x == null ? cells.length / 2 - w / 2 : imageSettings.x * scale;
    const y = imageSettings.y == null ? cells.length / 2 - h / 2 : imageSettings.y * scale;
    const opacity = imageSettings.opacity == null ? 1 : imageSettings.opacity;
    let excavation = null;
    if (imageSettings.excavate) {
      let floorX = Math.floor(x);
      let floorY = Math.floor(y);
      let ceilW = Math.ceil(w + x - floorX);
      let ceilH = Math.ceil(h + y - floorY);
      excavation = { x: floorX, y: floorY, w: ceilW, h: ceilH };
    }
    const crossOrigin = imageSettings.crossOrigin;
    return { x, y, h, w, excavation, opacity, crossOrigin };
  }
  function getMarginSize(includeMargin, marginSize) {
    if (marginSize != null) {
      return Math.max(Math.floor(marginSize), 0);
    }
    return includeMargin ? SPEC_MARGIN_SIZE : DEFAULT_MARGIN_SIZE;
  }
  function useQRCode({
    value,
    level,
    minVersion,
    includeMargin,
    marginSize,
    imageSettings,
    size,
    boostLevel
  }) {
    let qrcode = react_shim_default.useMemo(() => {
      const values = Array.isArray(value) ? value : [value];
      const segments = values.reduce((accum, v) => {
        accum.push(...qrcodegen_default.QrSegment.makeSegments(v));
        return accum;
      }, []);
      return qrcodegen_default.QrCode.encodeSegments(
        segments,
        ERROR_LEVEL_MAP[level],
        minVersion,
        void 0,
        void 0,
        boostLevel
      );
    }, [value, level, minVersion, boostLevel]);
    const { cells, margin, numCells, calculatedImageSettings } = react_shim_default.useMemo(() => {
      let cells2 = qrcode.getModules();
      const margin2 = getMarginSize(includeMargin, marginSize);
      const numCells2 = cells2.length + margin2 * 2;
      const calculatedImageSettings2 = getImageSettings(
        cells2,
        size,
        margin2,
        imageSettings
      );
      return {
        cells: cells2,
        margin: margin2,
        numCells: numCells2,
        calculatedImageSettings: calculatedImageSettings2
      };
    }, [qrcode, size, imageSettings, includeMargin, marginSize]);
    return {
      qrcode,
      margin,
      cells,
      numCells,
      calculatedImageSettings
    };
  }
  var __defProp2, __getOwnPropSymbols, __hasOwnProp2, __propIsEnum, __defNormalProp2, __spreadValues, __objRest, qrcodegen, qrcodegen_default, ERROR_LEVEL_MAP, DEFAULT_SIZE, DEFAULT_LEVEL, DEFAULT_BGCOLOR, DEFAULT_FGCOLOR, DEFAULT_INCLUDEMARGIN, DEFAULT_MINVERSION, SPEC_MARGIN_SIZE, DEFAULT_MARGIN_SIZE, DEFAULT_IMG_SCALE, SUPPORTS_PATH2D, QRCodeCanvas, QRCodeSVG;
  var init_esm = __esm({
    "../../node_modules/qrcode.react/lib/esm/index.js"() {
      init_react_shim();
      __defProp2 = Object.defineProperty;
      __getOwnPropSymbols = Object.getOwnPropertySymbols;
      __hasOwnProp2 = Object.prototype.hasOwnProperty;
      __propIsEnum = Object.prototype.propertyIsEnumerable;
      __defNormalProp2 = (obj2, key, value) => key in obj2 ? __defProp2(obj2, key, { enumerable: true, configurable: true, writable: true, value }) : obj2[key] = value;
      __spreadValues = (a, b) => {
        for (var prop in b || (b = {}))
          if (__hasOwnProp2.call(b, prop))
            __defNormalProp2(a, prop, b[prop]);
        if (__getOwnPropSymbols)
          for (var prop of __getOwnPropSymbols(b)) {
            if (__propIsEnum.call(b, prop))
              __defNormalProp2(a, prop, b[prop]);
          }
        return a;
      };
      __objRest = (source, exclude) => {
        var target = {};
        for (var prop in source)
          if (__hasOwnProp2.call(source, prop) && exclude.indexOf(prop) < 0)
            target[prop] = source[prop];
        if (source != null && __getOwnPropSymbols)
          for (var prop of __getOwnPropSymbols(source)) {
            if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
              target[prop] = source[prop];
          }
        return target;
      };
      ((qrcodegen2) => {
        const _QrCode = class _QrCode2 {
          /*-- Constructor (low level) and fields --*/
          // Creates a new QR Code with the given version number,
          // error correction level, data codeword bytes, and mask number.
          // This is a low-level API that most users should not use directly.
          // A mid-level API is the encodeSegments() function.
          constructor(version3, errorCorrectionLevel, dataCodewords, msk) {
            this.version = version3;
            this.errorCorrectionLevel = errorCorrectionLevel;
            this.modules = [];
            this.isFunction = [];
            if (version3 < _QrCode2.MIN_VERSION || version3 > _QrCode2.MAX_VERSION)
              throw new RangeError("Version value out of range");
            if (msk < -1 || msk > 7)
              throw new RangeError("Mask value out of range");
            this.size = version3 * 4 + 17;
            let row = [];
            for (let i = 0; i < this.size; i++)
              row.push(false);
            for (let i = 0; i < this.size; i++) {
              this.modules.push(row.slice());
              this.isFunction.push(row.slice());
            }
            this.drawFunctionPatterns();
            const allCodewords = this.addEccAndInterleave(dataCodewords);
            this.drawCodewords(allCodewords);
            if (msk == -1) {
              let minPenalty = 1e9;
              for (let i = 0; i < 8; i++) {
                this.applyMask(i);
                this.drawFormatBits(i);
                const penalty = this.getPenaltyScore();
                if (penalty < minPenalty) {
                  msk = i;
                  minPenalty = penalty;
                }
                this.applyMask(i);
              }
            }
            assert(0 <= msk && msk <= 7);
            this.mask = msk;
            this.applyMask(msk);
            this.drawFormatBits(msk);
            this.isFunction = [];
          }
          /*-- Static factory functions (high level) --*/
          // Returns a QR Code representing the given Unicode text string at the given error correction level.
          // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
          // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
          // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
          // ecl argument if it can be done without increasing the version.
          static encodeText(text, ecl) {
            const segs = qrcodegen2.QrSegment.makeSegments(text);
            return _QrCode2.encodeSegments(segs, ecl);
          }
          // Returns a QR Code representing the given binary data at the given error correction level.
          // This function always encodes using the binary segment mode, not any text mode. The maximum number of
          // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
          // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
          static encodeBinary(data, ecl) {
            const seg = qrcodegen2.QrSegment.makeBytes(data);
            return _QrCode2.encodeSegments([seg], ecl);
          }
          /*-- Static factory functions (mid level) --*/
          // Returns a QR Code representing the given segments with the given encoding parameters.
          // The smallest possible QR Code version within the given range is automatically
          // chosen for the output. Iff boostEcl is true, then the ECC level of the result
          // may be higher than the ecl argument if it can be done without increasing the
          // version. The mask number is either between 0 to 7 (inclusive) to force that
          // mask, or -1 to automatically choose an appropriate mask (which may be slow).
          // This function allows the user to create a custom sequence of segments that switches
          // between modes (such as alphanumeric and byte) to encode text in less space.
          // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
          static encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true) {
            if (!(_QrCode2.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= _QrCode2.MAX_VERSION) || mask < -1 || mask > 7)
              throw new RangeError("Invalid value");
            let version3;
            let dataUsedBits;
            for (version3 = minVersion; ; version3++) {
              const dataCapacityBits2 = _QrCode2.getNumDataCodewords(version3, ecl) * 8;
              const usedBits = QrSegment.getTotalBits(segs, version3);
              if (usedBits <= dataCapacityBits2) {
                dataUsedBits = usedBits;
                break;
              }
              if (version3 >= maxVersion)
                throw new RangeError("Data too long");
            }
            for (const newEcl of [_QrCode2.Ecc.MEDIUM, _QrCode2.Ecc.QUARTILE, _QrCode2.Ecc.HIGH]) {
              if (boostEcl && dataUsedBits <= _QrCode2.getNumDataCodewords(version3, newEcl) * 8)
                ecl = newEcl;
            }
            let bb = [];
            for (const seg of segs) {
              appendBits(seg.mode.modeBits, 4, bb);
              appendBits(seg.numChars, seg.mode.numCharCountBits(version3), bb);
              for (const b of seg.getData())
                bb.push(b);
            }
            assert(bb.length == dataUsedBits);
            const dataCapacityBits = _QrCode2.getNumDataCodewords(version3, ecl) * 8;
            assert(bb.length <= dataCapacityBits);
            appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
            appendBits(0, (8 - bb.length % 8) % 8, bb);
            assert(bb.length % 8 == 0);
            for (let padByte = 236; bb.length < dataCapacityBits; padByte ^= 236 ^ 17)
              appendBits(padByte, 8, bb);
            let dataCodewords = [];
            while (dataCodewords.length * 8 < bb.length)
              dataCodewords.push(0);
            bb.forEach((b, i) => dataCodewords[i >>> 3] |= b << 7 - (i & 7));
            return new _QrCode2(version3, ecl, dataCodewords, mask);
          }
          /*-- Accessor methods --*/
          // Returns the color of the module (pixel) at the given coordinates, which is false
          // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
          // If the given coordinates are out of bounds, then false (light) is returned.
          getModule(x, y) {
            return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
          }
          // Modified to expose modules for easy access
          getModules() {
            return this.modules;
          }
          /*-- Private helper methods for constructor: Drawing function modules --*/
          // Reads this object's version field, and draws and marks all function modules.
          drawFunctionPatterns() {
            for (let i = 0; i < this.size; i++) {
              this.setFunctionModule(6, i, i % 2 == 0);
              this.setFunctionModule(i, 6, i % 2 == 0);
            }
            this.drawFinderPattern(3, 3);
            this.drawFinderPattern(this.size - 4, 3);
            this.drawFinderPattern(3, this.size - 4);
            const alignPatPos = this.getAlignmentPatternPositions();
            const numAlign = alignPatPos.length;
            for (let i = 0; i < numAlign; i++) {
              for (let j = 0; j < numAlign; j++) {
                if (!(i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0))
                  this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
              }
            }
            this.drawFormatBits(0);
            this.drawVersion();
          }
          // Draws two copies of the format bits (with its own error correction code)
          // based on the given mask and this object's error correction level field.
          drawFormatBits(mask) {
            const data = this.errorCorrectionLevel.formatBits << 3 | mask;
            let rem = data;
            for (let i = 0; i < 10; i++)
              rem = rem << 1 ^ (rem >>> 9) * 1335;
            const bits = (data << 10 | rem) ^ 21522;
            assert(bits >>> 15 == 0);
            for (let i = 0; i <= 5; i++)
              this.setFunctionModule(8, i, getBit(bits, i));
            this.setFunctionModule(8, 7, getBit(bits, 6));
            this.setFunctionModule(8, 8, getBit(bits, 7));
            this.setFunctionModule(7, 8, getBit(bits, 8));
            for (let i = 9; i < 15; i++)
              this.setFunctionModule(14 - i, 8, getBit(bits, i));
            for (let i = 0; i < 8; i++)
              this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
            for (let i = 8; i < 15; i++)
              this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
            this.setFunctionModule(8, this.size - 8, true);
          }
          // Draws two copies of the version bits (with its own error correction code),
          // based on this object's version field, iff 7 <= version <= 40.
          drawVersion() {
            if (this.version < 7)
              return;
            let rem = this.version;
            for (let i = 0; i < 12; i++)
              rem = rem << 1 ^ (rem >>> 11) * 7973;
            const bits = this.version << 12 | rem;
            assert(bits >>> 18 == 0);
            for (let i = 0; i < 18; i++) {
              const color = getBit(bits, i);
              const a = this.size - 11 + i % 3;
              const b = Math.floor(i / 3);
              this.setFunctionModule(a, b, color);
              this.setFunctionModule(b, a, color);
            }
          }
          // Draws a 9*9 finder pattern including the border separator,
          // with the center module at (x, y). Modules can be out of bounds.
          drawFinderPattern(x, y) {
            for (let dy = -4; dy <= 4; dy++) {
              for (let dx = -4; dx <= 4; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                const xx = x + dx;
                const yy = y + dy;
                if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
                  this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
              }
            }
          }
          // Draws a 5*5 alignment pattern, with the center module
          // at (x, y). All modules must be in bounds.
          drawAlignmentPattern(x, y) {
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++)
                this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
            }
          }
          // Sets the color of a module and marks it as a function module.
          // Only used by the constructor. Coordinates must be in bounds.
          setFunctionModule(x, y, isDark) {
            this.modules[y][x] = isDark;
            this.isFunction[y][x] = true;
          }
          /*-- Private helper methods for constructor: Codewords and masking --*/
          // Returns a new byte string representing the given data with the appropriate error correction
          // codewords appended to it, based on this object's version and error correction level.
          addEccAndInterleave(data) {
            const ver = this.version;
            const ecl = this.errorCorrectionLevel;
            if (data.length != _QrCode2.getNumDataCodewords(ver, ecl))
              throw new RangeError("Invalid argument");
            const numBlocks = _QrCode2.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
            const blockEccLen = _QrCode2.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
            const rawCodewords = Math.floor(_QrCode2.getNumRawDataModules(ver) / 8);
            const numShortBlocks = numBlocks - rawCodewords % numBlocks;
            const shortBlockLen = Math.floor(rawCodewords / numBlocks);
            let blocks = [];
            const rsDiv = _QrCode2.reedSolomonComputeDivisor(blockEccLen);
            for (let i = 0, k = 0; i < numBlocks; i++) {
              let dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
              k += dat.length;
              const ecc = _QrCode2.reedSolomonComputeRemainder(dat, rsDiv);
              if (i < numShortBlocks)
                dat.push(0);
              blocks.push(dat.concat(ecc));
            }
            let result = [];
            for (let i = 0; i < blocks[0].length; i++) {
              blocks.forEach((block, j) => {
                if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
                  result.push(block[i]);
              });
            }
            assert(result.length == rawCodewords);
            return result;
          }
          // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
          // data area of this QR Code. Function modules need to be marked off before this is called.
          drawCodewords(data) {
            if (data.length != Math.floor(_QrCode2.getNumRawDataModules(this.version) / 8))
              throw new RangeError("Invalid argument");
            let i = 0;
            for (let right = this.size - 1; right >= 1; right -= 2) {
              if (right == 6)
                right = 5;
              for (let vert = 0; vert < this.size; vert++) {
                for (let j = 0; j < 2; j++) {
                  const x = right - j;
                  const upward = (right + 1 & 2) == 0;
                  const y = upward ? this.size - 1 - vert : vert;
                  if (!this.isFunction[y][x] && i < data.length * 8) {
                    this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
                    i++;
                  }
                }
              }
            }
            assert(i == data.length * 8);
          }
          // XORs the codeword modules in this QR Code with the given mask pattern.
          // The function modules must be marked and the codeword bits must be drawn
          // before masking. Due to the arithmetic of XOR, calling applyMask() with
          // the same mask value a second time will undo the mask. A final well-formed
          // QR Code needs exactly one (not zero, two, etc.) mask applied.
          applyMask(mask) {
            if (mask < 0 || mask > 7)
              throw new RangeError("Mask value out of range");
            for (let y = 0; y < this.size; y++) {
              for (let x = 0; x < this.size; x++) {
                let invert;
                switch (mask) {
                  case 0:
                    invert = (x + y) % 2 == 0;
                    break;
                  case 1:
                    invert = y % 2 == 0;
                    break;
                  case 2:
                    invert = x % 3 == 0;
                    break;
                  case 3:
                    invert = (x + y) % 3 == 0;
                    break;
                  case 4:
                    invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
                    break;
                  case 5:
                    invert = x * y % 2 + x * y % 3 == 0;
                    break;
                  case 6:
                    invert = (x * y % 2 + x * y % 3) % 2 == 0;
                    break;
                  case 7:
                    invert = ((x + y) % 2 + x * y % 3) % 2 == 0;
                    break;
                  default:
                    throw new Error("Unreachable");
                }
                if (!this.isFunction[y][x] && invert)
                  this.modules[y][x] = !this.modules[y][x];
              }
            }
          }
          // Calculates and returns the penalty score based on state of this QR Code's current modules.
          // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
          getPenaltyScore() {
            let result = 0;
            for (let y = 0; y < this.size; y++) {
              let runColor = false;
              let runX = 0;
              let runHistory = [0, 0, 0, 0, 0, 0, 0];
              for (let x = 0; x < this.size; x++) {
                if (this.modules[y][x] == runColor) {
                  runX++;
                  if (runX == 5)
                    result += _QrCode2.PENALTY_N1;
                  else if (runX > 5)
                    result++;
                } else {
                  this.finderPenaltyAddHistory(runX, runHistory);
                  if (!runColor)
                    result += this.finderPenaltyCountPatterns(runHistory) * _QrCode2.PENALTY_N3;
                  runColor = this.modules[y][x];
                  runX = 1;
                }
              }
              result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * _QrCode2.PENALTY_N3;
            }
            for (let x = 0; x < this.size; x++) {
              let runColor = false;
              let runY = 0;
              let runHistory = [0, 0, 0, 0, 0, 0, 0];
              for (let y = 0; y < this.size; y++) {
                if (this.modules[y][x] == runColor) {
                  runY++;
                  if (runY == 5)
                    result += _QrCode2.PENALTY_N1;
                  else if (runY > 5)
                    result++;
                } else {
                  this.finderPenaltyAddHistory(runY, runHistory);
                  if (!runColor)
                    result += this.finderPenaltyCountPatterns(runHistory) * _QrCode2.PENALTY_N3;
                  runColor = this.modules[y][x];
                  runY = 1;
                }
              }
              result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * _QrCode2.PENALTY_N3;
            }
            for (let y = 0; y < this.size - 1; y++) {
              for (let x = 0; x < this.size - 1; x++) {
                const color = this.modules[y][x];
                if (color == this.modules[y][x + 1] && color == this.modules[y + 1][x] && color == this.modules[y + 1][x + 1])
                  result += _QrCode2.PENALTY_N2;
              }
            }
            let dark = 0;
            for (const row of this.modules)
              dark = row.reduce((sum, color) => sum + (color ? 1 : 0), dark);
            const total = this.size * this.size;
            const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
            assert(0 <= k && k <= 9);
            result += k * _QrCode2.PENALTY_N4;
            assert(0 <= result && result <= 2568888);
            return result;
          }
          /*-- Private helper functions --*/
          // Returns an ascending list of positions of alignment patterns for this version number.
          // Each position is in the range [0,177), and are used on both the x and y axes.
          // This could be implemented as lookup table of 40 variable-length lists of integers.
          getAlignmentPatternPositions() {
            if (this.version == 1)
              return [];
            else {
              const numAlign = Math.floor(this.version / 7) + 2;
              const step = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
              let result = [6];
              for (let pos = this.size - 7; result.length < numAlign; pos -= step)
                result.splice(1, 0, pos);
              return result;
            }
          }
          // Returns the number of data bits that can be stored in a QR Code of the given version number, after
          // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
          // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
          static getNumRawDataModules(ver) {
            if (ver < _QrCode2.MIN_VERSION || ver > _QrCode2.MAX_VERSION)
              throw new RangeError("Version number out of range");
            let result = (16 * ver + 128) * ver + 64;
            if (ver >= 2) {
              const numAlign = Math.floor(ver / 7) + 2;
              result -= (25 * numAlign - 10) * numAlign - 55;
              if (ver >= 7)
                result -= 36;
            }
            assert(208 <= result && result <= 29648);
            return result;
          }
          // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
          // QR Code of the given version number and error correction level, with remainder bits discarded.
          // This stateless pure function could be implemented as a (40*4)-cell lookup table.
          static getNumDataCodewords(ver, ecl) {
            return Math.floor(_QrCode2.getNumRawDataModules(ver) / 8) - _QrCode2.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * _QrCode2.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
          }
          // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
          // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
          static reedSolomonComputeDivisor(degree) {
            if (degree < 1 || degree > 255)
              throw new RangeError("Degree out of range");
            let result = [];
            for (let i = 0; i < degree - 1; i++)
              result.push(0);
            result.push(1);
            let root = 1;
            for (let i = 0; i < degree; i++) {
              for (let j = 0; j < result.length; j++) {
                result[j] = _QrCode2.reedSolomonMultiply(result[j], root);
                if (j + 1 < result.length)
                  result[j] ^= result[j + 1];
              }
              root = _QrCode2.reedSolomonMultiply(root, 2);
            }
            return result;
          }
          // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
          static reedSolomonComputeRemainder(data, divisor) {
            let result = divisor.map((_) => 0);
            for (const b of data) {
              const factor = b ^ result.shift();
              result.push(0);
              divisor.forEach((coef, i) => result[i] ^= _QrCode2.reedSolomonMultiply(coef, factor));
            }
            return result;
          }
          // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
          // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
          static reedSolomonMultiply(x, y) {
            if (x >>> 8 != 0 || y >>> 8 != 0)
              throw new RangeError("Byte out of range");
            let z = 0;
            for (let i = 7; i >= 0; i--) {
              z = z << 1 ^ (z >>> 7) * 285;
              z ^= (y >>> i & 1) * x;
            }
            assert(z >>> 8 == 0);
            return z;
          }
          // Can only be called immediately after a light run is added, and
          // returns either 0, 1, or 2. A helper function for getPenaltyScore().
          finderPenaltyCountPatterns(runHistory) {
            const n = runHistory[1];
            assert(n <= this.size * 3);
            const core = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
            return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
          }
          // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
          finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, runHistory) {
            if (currentRunColor) {
              this.finderPenaltyAddHistory(currentRunLength, runHistory);
              currentRunLength = 0;
            }
            currentRunLength += this.size;
            this.finderPenaltyAddHistory(currentRunLength, runHistory);
            return this.finderPenaltyCountPatterns(runHistory);
          }
          // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
          finderPenaltyAddHistory(currentRunLength, runHistory) {
            if (runHistory[0] == 0)
              currentRunLength += this.size;
            runHistory.pop();
            runHistory.unshift(currentRunLength);
          }
        };
        _QrCode.MIN_VERSION = 1;
        _QrCode.MAX_VERSION = 40;
        _QrCode.PENALTY_N1 = 3;
        _QrCode.PENALTY_N2 = 3;
        _QrCode.PENALTY_N3 = 40;
        _QrCode.PENALTY_N4 = 10;
        _QrCode.ECC_CODEWORDS_PER_BLOCK = [
          // Version: (note that index 0 is for padding, and is set to an illegal value)
          //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
          [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
          // Low
          [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
          // Medium
          [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
          // Quartile
          [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
          // High
        ];
        _QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
          // Version: (note that index 0 is for padding, and is set to an illegal value)
          //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
          [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
          // Low
          [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
          // Medium
          [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
          // Quartile
          [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
          // High
        ];
        let QrCode = _QrCode;
        qrcodegen2.QrCode = _QrCode;
        function appendBits(val, len, bb) {
          if (len < 0 || len > 31 || val >>> len != 0)
            throw new RangeError("Value out of range");
          for (let i = len - 1; i >= 0; i--)
            bb.push(val >>> i & 1);
        }
        function getBit(x, i) {
          return (x >>> i & 1) != 0;
        }
        function assert(cond) {
          if (!cond)
            throw new Error("Assertion error");
        }
        const _QrSegment = class _QrSegment2 {
          /*-- Constructor (low level) and fields --*/
          // Creates a new QR Code segment with the given attributes and data.
          // The character count (numChars) must agree with the mode and the bit buffer length,
          // but the constraint isn't checked. The given bit buffer is cloned and stored.
          constructor(mode, numChars, bitData) {
            this.mode = mode;
            this.numChars = numChars;
            this.bitData = bitData;
            if (numChars < 0)
              throw new RangeError("Invalid argument");
            this.bitData = bitData.slice();
          }
          /*-- Static factory functions (mid level) --*/
          // Returns a segment representing the given binary data encoded in
          // byte mode. All input byte arrays are acceptable. Any text string
          // can be converted to UTF-8 bytes and encoded as a byte mode segment.
          static makeBytes(data) {
            let bb = [];
            for (const b of data)
              appendBits(b, 8, bb);
            return new _QrSegment2(_QrSegment2.Mode.BYTE, data.length, bb);
          }
          // Returns a segment representing the given string of decimal digits encoded in numeric mode.
          static makeNumeric(digits) {
            if (!_QrSegment2.isNumeric(digits))
              throw new RangeError("String contains non-numeric characters");
            let bb = [];
            for (let i = 0; i < digits.length; ) {
              const n = Math.min(digits.length - i, 3);
              appendBits(parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
              i += n;
            }
            return new _QrSegment2(_QrSegment2.Mode.NUMERIC, digits.length, bb);
          }
          // Returns a segment representing the given text string encoded in alphanumeric mode.
          // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
          // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
          static makeAlphanumeric(text) {
            if (!_QrSegment2.isAlphanumeric(text))
              throw new RangeError("String contains unencodable characters in alphanumeric mode");
            let bb = [];
            let i;
            for (i = 0; i + 2 <= text.length; i += 2) {
              let temp = _QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
              temp += _QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
              appendBits(temp, 11, bb);
            }
            if (i < text.length)
              appendBits(_QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
            return new _QrSegment2(_QrSegment2.Mode.ALPHANUMERIC, text.length, bb);
          }
          // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
          // The result may use various segment modes and switch modes to optimize the length of the bit stream.
          static makeSegments(text) {
            if (text == "")
              return [];
            else if (_QrSegment2.isNumeric(text))
              return [_QrSegment2.makeNumeric(text)];
            else if (_QrSegment2.isAlphanumeric(text))
              return [_QrSegment2.makeAlphanumeric(text)];
            else
              return [_QrSegment2.makeBytes(_QrSegment2.toUtf8ByteArray(text))];
          }
          // Returns a segment representing an Extended Channel Interpretation
          // (ECI) designator with the given assignment value.
          static makeEci(assignVal) {
            let bb = [];
            if (assignVal < 0)
              throw new RangeError("ECI assignment value out of range");
            else if (assignVal < 1 << 7)
              appendBits(assignVal, 8, bb);
            else if (assignVal < 1 << 14) {
              appendBits(2, 2, bb);
              appendBits(assignVal, 14, bb);
            } else if (assignVal < 1e6) {
              appendBits(6, 3, bb);
              appendBits(assignVal, 21, bb);
            } else
              throw new RangeError("ECI assignment value out of range");
            return new _QrSegment2(_QrSegment2.Mode.ECI, 0, bb);
          }
          // Tests whether the given string can be encoded as a segment in numeric mode.
          // A string is encodable iff each character is in the range 0 to 9.
          static isNumeric(text) {
            return _QrSegment2.NUMERIC_REGEX.test(text);
          }
          // Tests whether the given string can be encoded as a segment in alphanumeric mode.
          // A string is encodable iff each character is in the following set: 0 to 9, A to Z
          // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
          static isAlphanumeric(text) {
            return _QrSegment2.ALPHANUMERIC_REGEX.test(text);
          }
          /*-- Methods --*/
          // Returns a new copy of the data bits of this segment.
          getData() {
            return this.bitData.slice();
          }
          // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
          // the given version. The result is infinity if a segment has too many characters to fit its length field.
          static getTotalBits(segs, version3) {
            let result = 0;
            for (const seg of segs) {
              const ccbits = seg.mode.numCharCountBits(version3);
              if (seg.numChars >= 1 << ccbits)
                return Infinity;
              result += 4 + ccbits + seg.bitData.length;
            }
            return result;
          }
          // Returns a new array of bytes representing the given string encoded in UTF-8.
          static toUtf8ByteArray(str4) {
            str4 = encodeURI(str4);
            let result = [];
            for (let i = 0; i < str4.length; i++) {
              if (str4.charAt(i) != "%")
                result.push(str4.charCodeAt(i));
              else {
                result.push(parseInt(str4.substring(i + 1, i + 3), 16));
                i += 2;
              }
            }
            return result;
          }
        };
        _QrSegment.NUMERIC_REGEX = /^[0-9]*$/;
        _QrSegment.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/;
        _QrSegment.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
        let QrSegment = _QrSegment;
        qrcodegen2.QrSegment = _QrSegment;
      })(qrcodegen || (qrcodegen = {}));
      ((qrcodegen2) => {
        let QrCode;
        ((QrCode2) => {
          const _Ecc = class _Ecc {
            // The QR Code can tolerate about 30% erroneous codewords
            /*-- Constructor and fields --*/
            constructor(ordinal, formatBits) {
              this.ordinal = ordinal;
              this.formatBits = formatBits;
            }
          };
          _Ecc.LOW = new _Ecc(0, 1);
          _Ecc.MEDIUM = new _Ecc(1, 0);
          _Ecc.QUARTILE = new _Ecc(2, 3);
          _Ecc.HIGH = new _Ecc(3, 2);
          let Ecc = _Ecc;
          QrCode2.Ecc = _Ecc;
        })(QrCode = qrcodegen2.QrCode || (qrcodegen2.QrCode = {}));
      })(qrcodegen || (qrcodegen = {}));
      ((qrcodegen2) => {
        let QrSegment;
        ((QrSegment2) => {
          const _Mode = class _Mode {
            /*-- Constructor and fields --*/
            constructor(modeBits, numBitsCharCount) {
              this.modeBits = modeBits;
              this.numBitsCharCount = numBitsCharCount;
            }
            /*-- Method --*/
            // (Package-private) Returns the bit width of the character count field for a segment in
            // this mode in a QR Code at the given version number. The result is in the range [0, 16].
            numCharCountBits(ver) {
              return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
            }
          };
          _Mode.NUMERIC = new _Mode(1, [10, 12, 14]);
          _Mode.ALPHANUMERIC = new _Mode(2, [9, 11, 13]);
          _Mode.BYTE = new _Mode(4, [8, 16, 16]);
          _Mode.KANJI = new _Mode(8, [8, 10, 12]);
          _Mode.ECI = new _Mode(7, [0, 0, 0]);
          let Mode = _Mode;
          QrSegment2.Mode = _Mode;
        })(QrSegment = qrcodegen2.QrSegment || (qrcodegen2.QrSegment = {}));
      })(qrcodegen || (qrcodegen = {}));
      qrcodegen_default = qrcodegen;
      ERROR_LEVEL_MAP = {
        L: qrcodegen_default.QrCode.Ecc.LOW,
        M: qrcodegen_default.QrCode.Ecc.MEDIUM,
        Q: qrcodegen_default.QrCode.Ecc.QUARTILE,
        H: qrcodegen_default.QrCode.Ecc.HIGH
      };
      DEFAULT_SIZE = 128;
      DEFAULT_LEVEL = "L";
      DEFAULT_BGCOLOR = "#FFFFFF";
      DEFAULT_FGCOLOR = "#000000";
      DEFAULT_INCLUDEMARGIN = false;
      DEFAULT_MINVERSION = 1;
      SPEC_MARGIN_SIZE = 4;
      DEFAULT_MARGIN_SIZE = 0;
      DEFAULT_IMG_SCALE = 0.1;
      SUPPORTS_PATH2D = (function() {
        try {
          new Path2D().addPath(new Path2D());
        } catch (e) {
          return false;
        }
        return true;
      })();
      QRCodeCanvas = react_shim_default.forwardRef(
        function QRCodeCanvas2(props, forwardedRef) {
          const _a = props, {
            value,
            size = DEFAULT_SIZE,
            level = DEFAULT_LEVEL,
            bgColor = DEFAULT_BGCOLOR,
            fgColor = DEFAULT_FGCOLOR,
            includeMargin = DEFAULT_INCLUDEMARGIN,
            minVersion = DEFAULT_MINVERSION,
            boostLevel,
            marginSize,
            imageSettings
          } = _a, extraProps = __objRest(_a, [
            "value",
            "size",
            "level",
            "bgColor",
            "fgColor",
            "includeMargin",
            "minVersion",
            "boostLevel",
            "marginSize",
            "imageSettings"
          ]);
          const _b = extraProps, { style } = _b, otherProps = __objRest(_b, ["style"]);
          const imgSrc = imageSettings == null ? void 0 : imageSettings.src;
          const _canvas = react_shim_default.useRef(null);
          const _image = react_shim_default.useRef(null);
          const setCanvasRef = react_shim_default.useCallback(
            (node) => {
              _canvas.current = node;
              if (typeof forwardedRef === "function") {
                forwardedRef(node);
              } else if (forwardedRef) {
                forwardedRef.current = node;
              }
            },
            [forwardedRef]
          );
          const [isImgLoaded, setIsImageLoaded] = react_shim_default.useState(false);
          const { margin, cells, numCells, calculatedImageSettings } = useQRCode({
            value,
            level,
            minVersion,
            boostLevel,
            includeMargin,
            marginSize,
            imageSettings,
            size
          });
          react_shim_default.useEffect(() => {
            if (_canvas.current != null) {
              const canvas = _canvas.current;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                return;
              }
              let cellsToDraw = cells;
              const image = _image.current;
              const haveImageToRender = calculatedImageSettings != null && image !== null && image.complete && image.naturalHeight !== 0 && image.naturalWidth !== 0;
              if (haveImageToRender) {
                if (calculatedImageSettings.excavation != null) {
                  cellsToDraw = excavateModules(
                    cells,
                    calculatedImageSettings.excavation
                  );
                }
              }
              const pixelRatio = window.devicePixelRatio || 1;
              canvas.height = canvas.width = size * pixelRatio;
              const scale = size / numCells * pixelRatio;
              ctx.scale(scale, scale);
              ctx.fillStyle = bgColor;
              ctx.fillRect(0, 0, numCells, numCells);
              ctx.fillStyle = fgColor;
              if (SUPPORTS_PATH2D) {
                ctx.fill(new Path2D(generatePath(cellsToDraw, margin)));
              } else {
                cells.forEach(function(row, rdx) {
                  row.forEach(function(cell, cdx) {
                    if (cell) {
                      ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
                    }
                  });
                });
              }
              if (calculatedImageSettings) {
                ctx.globalAlpha = calculatedImageSettings.opacity;
              }
              if (haveImageToRender) {
                ctx.drawImage(
                  image,
                  calculatedImageSettings.x + margin,
                  calculatedImageSettings.y + margin,
                  calculatedImageSettings.w,
                  calculatedImageSettings.h
                );
              }
            }
          });
          react_shim_default.useEffect(() => {
            setIsImageLoaded(false);
          }, [imgSrc]);
          const canvasStyle = __spreadValues({ height: size, width: size }, style);
          let img = null;
          if (imgSrc != null) {
            img = /* @__PURE__ */ react_shim_default.createElement(
              "img",
              {
                src: imgSrc,
                key: imgSrc,
                style: { display: "none" },
                onLoad: () => {
                  setIsImageLoaded(true);
                },
                ref: _image,
                crossOrigin: calculatedImageSettings == null ? void 0 : calculatedImageSettings.crossOrigin
              }
            );
          }
          return /* @__PURE__ */ react_shim_default.createElement(react_shim_default.Fragment, null, /* @__PURE__ */ react_shim_default.createElement(
            "canvas",
            __spreadValues({
              style: canvasStyle,
              height: size,
              width: size,
              ref: setCanvasRef,
              role: "img"
            }, otherProps)
          ), img);
        }
      );
      QRCodeCanvas.displayName = "QRCodeCanvas";
      QRCodeSVG = react_shim_default.forwardRef(
        function QRCodeSVG2(props, forwardedRef) {
          const _a = props, {
            value,
            size = DEFAULT_SIZE,
            level = DEFAULT_LEVEL,
            bgColor = DEFAULT_BGCOLOR,
            fgColor = DEFAULT_FGCOLOR,
            includeMargin = DEFAULT_INCLUDEMARGIN,
            minVersion = DEFAULT_MINVERSION,
            boostLevel,
            title,
            marginSize,
            imageSettings
          } = _a, otherProps = __objRest(_a, [
            "value",
            "size",
            "level",
            "bgColor",
            "fgColor",
            "includeMargin",
            "minVersion",
            "boostLevel",
            "title",
            "marginSize",
            "imageSettings"
          ]);
          const { margin, cells, numCells, calculatedImageSettings } = useQRCode({
            value,
            level,
            minVersion,
            boostLevel,
            includeMargin,
            marginSize,
            imageSettings,
            size
          });
          let cellsToDraw = cells;
          let image = null;
          if (imageSettings != null && calculatedImageSettings != null) {
            if (calculatedImageSettings.excavation != null) {
              cellsToDraw = excavateModules(
                cells,
                calculatedImageSettings.excavation
              );
            }
            image = /* @__PURE__ */ react_shim_default.createElement(
              "image",
              {
                href: imageSettings.src,
                height: calculatedImageSettings.h,
                width: calculatedImageSettings.w,
                x: calculatedImageSettings.x + margin,
                y: calculatedImageSettings.y + margin,
                preserveAspectRatio: "none",
                opacity: calculatedImageSettings.opacity,
                crossOrigin: calculatedImageSettings.crossOrigin
              }
            );
          }
          const fgPath = generatePath(cellsToDraw, margin);
          return /* @__PURE__ */ react_shim_default.createElement(
            "svg",
            __spreadValues({
              height: size,
              width: size,
              viewBox: `0 0 ${numCells} ${numCells}`,
              ref: forwardedRef,
              role: "img"
            }, otherProps),
            !!title && /* @__PURE__ */ react_shim_default.createElement("title", null, title),
            /* @__PURE__ */ react_shim_default.createElement(
              "path",
              {
                fill: bgColor,
                d: `M0,0 h${numCells}v${numCells}H0z`,
                shapeRendering: "crispEdges"
              }
            ),
            /* @__PURE__ */ react_shim_default.createElement("path", { fill: fgColor, d: fgPath, shapeRendering: "crispEdges" }),
            image
          );
        }
      );
      QRCodeSVG.displayName = "QRCodeSVG";
    }
  });

  // lib/playback-start-gate.ts
  function waitForStartIdle() {
    if (holders === 0 && !launchHeld) return Promise.resolve();
    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  }
  var holders, waiters, launchHeld;
  var init_playback_start_gate = __esm({
    "lib/playback-start-gate.ts"() {
      "use strict";
      holders = 0;
      waiters = [];
      launchHeld = false;
    }
  });

  // lib/watchlist-auto-remove.ts
  var FULL_SWEEP_INTERVAL_MS;
  var init_watchlist_auto_remove = __esm({
    "lib/watchlist-auto-remove.ts"() {
      "use strict";
      "use client";
      init_watchlist();
      init_watched_movies();
      init_watched_episodes();
      init_profile_storage_shim();
      FULL_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1e3;
    }
  });

  // lib/trakt-device-login.tsx
  var init_trakt_device_login = __esm({
    "lib/trakt-device-login.tsx"() {
      "use strict";
      "use client";
      init_react_shim();
      init_i18n();
      init_open_external();
      init_trakt_storage();
      init_jsx_runtime_shim();
    }
  });

  // lib/async-utils.ts
  var init_async_utils = __esm({
    "lib/async-utils.ts"() {
    }
  });

  // lib/media-stream/filters.ts
  var init_filters = __esm({
    "lib/media-stream/filters.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/media-stream/availability-throttle.ts
  var RATE_LIMIT_COOLDOWN_MS;
  var init_availability_throttle = __esm({
    "lib/media-stream/availability-throttle.ts"() {
      "use client";
      init_playback_start_gate();
      RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1e3;
    }
  });

  // lib/media-stream/addon-url.ts
  var init_addon_url = __esm({
    "lib/media-stream/addon-url.ts"() {
    }
  });

  // lib/media-stream/config.ts
  var SCRAPER_PRESETS, DEFAULT_SCRAPER_URL;
  var init_config = __esm({
    "lib/media-stream/config.ts"() {
      init_addon_url();
      init_app_storage();
      init_profile_storage_shim();
      SCRAPER_PRESETS = [
        {
          id: "torrentio",
          name: "Torrentio",
          url: "https://torrentio.strem.fun",
          type: "torrentio",
          description: "Publik scraper, stabil och snabb. Kr\xE4ver Real-Debrid API-nyckel.",
          configUrl: "https://torrentio.strem.fun/configure"
        },
        {
          id: "comet",
          name: "Comet",
          url: "",
          type: "preconfigured",
          description: "Snabb scraper med bra tr\xE4ffar. Kr\xE4ver konfiguration med RD-nyckel.",
          configUrl: "https://comet.elfhosted.com"
        },
        {
          id: "jackettio",
          name: "Jackettio",
          url: "",
          type: "preconfigured",
          description: "Jackett-baserad scraper med breda indexers. Kr\xE4ver Real-Debrid eller AllDebrid.",
          configUrl: "https://jackettio.elfhosted.com/configure"
        },
        {
          id: "aiostreams",
          name: "AIOStreams",
          url: "",
          type: "preconfigured",
          description: "Aggregerar m\xE5nga addons och debrid-tj\xE4nster bakom en enda konfiguration.",
          configUrl: "https://aiostreams-nightly.fortheweak.cloud/stremio/configure"
        }
      ];
      DEFAULT_SCRAPER_URL = SCRAPER_PRESETS[0].url;
    }
  });

  // lib/media-stream/core-addons.ts
  var init_core_addons = __esm({
    "lib/media-stream/core-addons.ts"() {
      "use client";
      init_addon_url();
      init_profile_storage_shim();
      init_config();
    }
  });

  // lib/stremio/source-request.ts
  var init_source_request = __esm({
    "lib/stremio/source-request.ts"() {
      init_addon_url();
    }
  });

  // lib/series-watchlist-feed.ts
  var STREAM_CACHE_TTL_MS, STREAM_CACHE_POSITIVE_TTL_MS, SERIES_STATUS_CACHE_TTL_MS, FAILED_CHECK_RETRY_MS;
  var init_series_watchlist_feed = __esm({
    "lib/series-watchlist-feed.ts"() {
      "use strict";
      init_mode();
      init_async_utils();
      init_plugin_registry();
      init_plugin_state();
      init_profile_storage_shim();
      init_filters();
      init_plugin_sdk();
      init_availability_throttle();
      init_core_addons();
      init_source_request();
      init_watched_episodes();
      STREAM_CACHE_TTL_MS = 30 * 60 * 1e3;
      STREAM_CACHE_POSITIVE_TTL_MS = 6 * 60 * 60 * 1e3;
      SERIES_STATUS_CACHE_TTL_MS = 15 * 60 * 1e3;
      FAILED_CHECK_RETRY_MS = 5 * 60 * 1e3;
    }
  });

  // lib/release-watchlist-feed.ts
  var STREAM_CACHE_TTL_MS2, STREAM_CACHE_POSITIVE_TTL_MS2, FAILED_CHECK_RETRY_MS2;
  var init_release_watchlist_feed = __esm({
    "lib/release-watchlist-feed.ts"() {
      "use strict";
      init_mode();
      init_async_utils();
      init_plugin_registry();
      init_plugin_state();
      init_profile_storage_shim();
      init_filters();
      init_plugin_sdk();
      init_availability_throttle();
      init_core_addons();
      init_source_request();
      STREAM_CACHE_TTL_MS2 = 30 * 60 * 1e3;
      STREAM_CACHE_POSITIVE_TTL_MS2 = 6 * 60 * 60 * 1e3;
      FAILED_CHECK_RETRY_MS2 = 5 * 60 * 1e3;
    }
  });

  // lib/utils/search-text.ts
  var init_search_text = __esm({
    "lib/utils/search-text.ts"() {
    }
  });

  // lib/utils/filter-media.ts
  var init_filter_media = __esm({
    "lib/utils/filter-media.ts"() {
      "use strict";
      init_search_text();
    }
  });

  // lib/utils/languages.ts
  var init_languages = __esm({
    "lib/utils/languages.ts"() {
      "use strict";
      init_search_text();
    }
  });

  // components/results/results-loading-indicator.tsx
  var init_results_loading_indicator = __esm({
    "components/results/results-loading-indicator.tsx"() {
      init_jsx_runtime_shim();
    }
  });

  // components/results/results-state.tsx
  var init_results_state = __esm({
    "components/results/results-state.tsx"() {
      "use client";
      init_i18n();
      init_jsx_runtime_shim();
    }
  });

  // lib/pagination-range.ts
  var init_pagination_range = __esm({
    "lib/pagination-range.ts"() {
    }
  });

  // components/ui/simple-pagination.tsx
  var init_simple_pagination = __esm({
    "components/ui/simple-pagination.tsx"() {
      "use client";
      init_pagination_range();
      init_jsx_runtime_shim();
    }
  });

  // components/results/results-pagination.tsx
  var init_results_pagination = __esm({
    "components/results/results-pagination.tsx"() {
      "use client";
      init_simple_pagination();
      init_react_shim();
      init_jsx_runtime_shim();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/auth-capabilities-shim.ts
  function notifyAuthCapabilitiesChanged() {
    return sdk2.notifyAuthCapabilitiesChanged();
  }
  var sdk2;
  var init_auth_capabilities_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/auth-capabilities-shim.ts"() {
      sdk2 = globalThis.__lumioPluginRuntime?.sdk;
    }
  });

  // lib/plugin-hls.ts
  var init_plugin_hls = __esm({
    "lib/plugin-hls.ts"() {
      "use strict";
    }
  });

  // lib/player-frame-id.ts
  var init_player_frame_id = __esm({
    "lib/player-frame-id.ts"() {
      "use strict";
    }
  });

  // lib/video-surfaces-html.ts
  var init_video_surfaces_html = __esm({
    "lib/video-surfaces-html.ts"() {
      "use strict";
      init_plugin_hls();
      init_player_frame_id();
      init_tauri_mpv();
    }
  });

  // lib/video-surfaces-mpv.ts
  var import_core2, import_event2;
  var init_video_surfaces_mpv = __esm({
    "lib/video-surfaces-mpv.ts"() {
      "use strict";
      import_core2 = __toESM(require_core());
      import_event2 = __toESM(require_event());
    }
  });

  // lib/video-surfaces-droid.ts
  var init_video_surfaces_droid = __esm({
    "lib/video-surfaces-droid.ts"() {
      "use strict";
      init_tauri_native_player();
    }
  });

  // lib/transparent-webview.ts
  var init_transparent_webview = __esm({
    "lib/transparent-webview.ts"() {
      "use strict";
    }
  });

  // lib/video-surfaces.ts
  var init_video_surfaces = __esm({
    "lib/video-surfaces.ts"() {
      "use strict";
      init_tauri_mpv();
      init_tauri_native_player();
      init_video_surfaces_html();
      init_video_surfaces_mpv();
      init_video_surfaces_droid();
      init_transparent_webview();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/video-surfaces-shim.ts
  var init_video_surfaces_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/video-surfaces-shim.ts"() {
      init_video_surfaces();
    }
  });

  // lib/utils/scroll-lock.ts
  var init_scroll_lock = __esm({
    "lib/utils/scroll-lock.ts"() {
      "use strict";
    }
  });

  // lib/autoplay-settings.ts
  var init_autoplay_settings = __esm({
    "lib/autoplay-settings.ts"() {
      "use strict";
      init_profile_storage_shim();
    }
  });

  // lib/zapp-settings.ts
  var init_zapp_settings = __esm({
    "lib/zapp-settings.ts"() {
      "use strict";
      init_profile_storage_shim();
    }
  });

  // lib/zapp-runtime.ts
  var init_zapp_runtime = __esm({
    "lib/zapp-runtime.ts"() {
      "use strict";
      "use client";
    }
  });

  // lib/open-item-runtime.ts
  var init_open_item_runtime = __esm({
    "lib/open-item-runtime.ts"() {
      "use strict";
      "use client";
    }
  });

  // components/player/player-control-icons.tsx
  var init_player_control_icons = __esm({
    "components/player/player-control-icons.tsx"() {
      "use client";
      init_jsx_runtime_shim();
    }
  });

  // lib/trickplay-identity.ts
  var init_trickplay_identity = __esm({
    "lib/trickplay-identity.ts"() {
    }
  });

  // lib/dual-subtitles.ts
  var init_dual_subtitles = __esm({
    "lib/dual-subtitles.ts"() {
    }
  });

  // lib/playback-speed-store.ts
  var init_playback_speed_store = __esm({
    "lib/playback-speed-store.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // ../../node_modules/react-dom/cjs/react-dom.production.js
  var require_react_dom_production = __commonJS({
    "../../node_modules/react-dom/cjs/react-dom.production.js"(exports) {
      "use strict";
      var React = (init_react_shim(), __toCommonJS(react_shim_exports));
      function formatProdErrorMessage(code) {
        var url = "https://react.dev/errors/" + code;
        if (1 < arguments.length) {
          url += "?args[]=" + encodeURIComponent(arguments[1]);
          for (var i = 2; i < arguments.length; i++)
            url += "&args[]=" + encodeURIComponent(arguments[i]);
        }
        return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      function noop() {
      }
      var Internals = {
        d: {
          f: noop,
          r: function() {
            throw Error(formatProdErrorMessage(522));
          },
          D: noop,
          C: noop,
          L: noop,
          m: noop,
          X: noop,
          S: noop,
          M: noop
        },
        p: 0,
        findDOMNode: null
      };
      var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
      function createPortal$1(children, containerInfo, implementation) {
        var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
        return {
          $$typeof: REACT_PORTAL_TYPE,
          key: null == key ? null : "" + key,
          children,
          containerInfo,
          implementation
        };
      }
      var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
      function getCrossOriginStringAs(as, input) {
        if ("font" === as) return "";
        if ("string" === typeof input)
          return "use-credentials" === input ? input : "";
      }
      exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
      exports.createPortal = function(children, container) {
        var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
        if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
          throw Error(formatProdErrorMessage(299));
        return createPortal$1(children, container, null, key);
      };
      exports.flushSync = function(fn) {
        var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
        try {
          if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
        } finally {
          ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
        }
      };
      exports.preconnect = function(href, options) {
        "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
      };
      exports.prefetchDNS = function(href) {
        "string" === typeof href && Internals.d.D(href);
      };
      exports.preinit = function(href, options) {
        if ("string" === typeof href && options && "string" === typeof options.as) {
          var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
          "style" === as ? Internals.d.S(
            href,
            "string" === typeof options.precedence ? options.precedence : void 0,
            {
              crossOrigin,
              integrity,
              fetchPriority
            }
          ) : "script" === as && Internals.d.X(href, {
            crossOrigin,
            integrity,
            fetchPriority,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0
          });
        }
      };
      exports.preinitModule = function(href, options) {
        if ("string" === typeof href)
          if ("object" === typeof options && null !== options) {
            if (null == options.as || "script" === options.as) {
              var crossOrigin = getCrossOriginStringAs(
                options.as,
                options.crossOrigin
              );
              Internals.d.M(href, {
                crossOrigin,
                integrity: "string" === typeof options.integrity ? options.integrity : void 0,
                nonce: "string" === typeof options.nonce ? options.nonce : void 0
              });
            }
          } else null == options && Internals.d.M(href);
      };
      exports.preload = function(href, options) {
        if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
          var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
          Internals.d.L(href, as, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0,
            type: "string" === typeof options.type ? options.type : void 0,
            fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
            referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
            imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
            imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
            media: "string" === typeof options.media ? options.media : void 0
          });
        }
      };
      exports.preloadModule = function(href, options) {
        if ("string" === typeof href)
          if (options) {
            var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
            Internals.d.m(href, {
              as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
              crossOrigin,
              integrity: "string" === typeof options.integrity ? options.integrity : void 0
            });
          } else Internals.d.m(href);
      };
      exports.requestFormReset = function(form) {
        Internals.d.r(form);
      };
      exports.unstable_batchedUpdates = function(fn, a) {
        return fn(a);
      };
      exports.useFormState = function(action, initialState, permalink) {
        return ReactSharedInternals.H.useFormState(action, initialState, permalink);
      };
      exports.useFormStatus = function() {
        return ReactSharedInternals.H.useHostTransitionStatus();
      };
      exports.version = "19.2.5";
    }
  });

  // ../../node_modules/react-dom/index.js
  var require_react_dom = __commonJS({
    "../../node_modules/react-dom/index.js"(exports, module) {
      "use strict";
      function checkDCE() {
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
          return;
        }
        if (false) {
          throw new Error("^_^");
        }
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
        } catch (err) {
          console.error(err);
        }
      }
      if (true) {
        checkDCE();
        module.exports = require_react_dom_production();
      } else {
        module.exports = null;
      }
    }
  });

  // ../../node_modules/@tauri-apps/api/dpi.cjs
  var require_dpi = __commonJS({
    "../../node_modules/@tauri-apps/api/dpi.cjs"(exports) {
      "use strict";
      var core = require_core();
      var LogicalSize = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.width = args[0].Logical.width;
              this.height = args[0].Logical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the logical size to a physical one.
         * @example
         * ```typescript
         * import { LogicalSize } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = new LogicalSize(400, 500);
         * const physical = size.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalSize(this.width * scaleFactor, this.height * scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var PhysicalSize = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.width = args[0].Physical.width;
              this.height = args[0].Physical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the physical size to a logical one.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = await appWindow.innerSize(); // PhysicalSize
         * const logical = size.toLogical(factor);
         * ```
         */
        toLogical(scaleFactor) {
          return new LogicalSize(this.width / scaleFactor, this.height / scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var Size = class {
        constructor(size) {
          this.size = size;
        }
        toLogical(scaleFactor) {
          return this.size instanceof LogicalSize ? this.size : this.size.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.size instanceof PhysicalSize ? this.size : this.size.toPhysical(scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.size.type}`]: {
              width: this.size.width,
              height: this.size.height
            }
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var LogicalPosition = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.x = args[0].Logical.x;
              this.y = args[0].Logical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the logical position to a physical one.
         * @example
         * ```typescript
         * import { LogicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new LogicalPosition(400, 500);
         * const physical = position.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalPosition(this.x * scaleFactor, this.y * scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var PhysicalPosition = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.x = args[0].Physical.x;
              this.y = args[0].Physical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the physical position to a logical one.
         * @example
         * ```typescript
         * import { PhysicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new PhysicalPosition(400, 500);
         * const physical = position.toLogical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toLogical(scaleFactor) {
          return new LogicalPosition(this.x / scaleFactor, this.y / scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      var Position = class {
        constructor(position) {
          this.position = position;
        }
        toLogical(scaleFactor) {
          return this.position instanceof LogicalPosition ? this.position : this.position.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.position instanceof PhysicalPosition ? this.position : this.position.toPhysical(scaleFactor);
        }
        [core.SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.position.type}`]: {
              x: this.position.x,
              y: this.position.y
            }
          };
        }
        toJSON() {
          return this[core.SERIALIZE_TO_IPC_FN]();
        }
      };
      exports.LogicalPosition = LogicalPosition;
      exports.LogicalSize = LogicalSize;
      exports.PhysicalPosition = PhysicalPosition;
      exports.PhysicalSize = PhysicalSize;
      exports.Position = Position;
      exports.Size = Size;
    }
  });

  // ../../node_modules/@tauri-apps/api/image.cjs
  var require_image = __commonJS({
    "../../node_modules/@tauri-apps/api/image.cjs"(exports) {
      "use strict";
      var core = require_core();
      var Image2 = class _Image extends core.Resource {
        /**
         * Creates an Image from a resource ID. For internal use only.
         *
         * @ignore
         */
        constructor(rid) {
          super(rid);
        }
        /** Creates a new Image using RGBA data, in row-major order from top to bottom, and with specified width and height. */
        static async new(rgba, width, height) {
          return core.invoke("plugin:image|new", {
            rgba: transformImage(rgba),
            width,
            height
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided bytes by inferring the file format.
         * If the format is known, prefer [@link Image.fromPngBytes] or [@link Image.fromIcoBytes].
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromBytes(bytes) {
          return core.invoke("plugin:image|from_bytes", {
            bytes: transformImage(bytes)
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided path.
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromPath(path) {
          return core.invoke("plugin:image|from_path", { path }).then((rid) => new _Image(rid));
        }
        /** Returns the RGBA data for this image, in row-major order from top to bottom.  */
        async rgba() {
          return core.invoke("plugin:image|rgba", {
            rid: this.rid
          }).then((buffer) => new Uint8Array(buffer));
        }
        /** Returns the size of this image.  */
        async size() {
          return core.invoke("plugin:image|size", { rid: this.rid });
        }
      };
      function transformImage(image) {
        const ret = image == null ? null : typeof image === "string" ? image : image instanceof Image2 ? image.rid : image;
        return ret;
      }
      exports.Image = Image2;
      exports.transformImage = transformImage;
    }
  });

  // ../../node_modules/@tauri-apps/api/window.cjs
  var require_window = __commonJS({
    "../../node_modules/@tauri-apps/api/window.cjs"(exports) {
      "use strict";
      var dpi = require_dpi();
      var event = require_event();
      var core = require_core();
      var image = require_image();
      exports.UserAttentionType = void 0;
      (function(UserAttentionType) {
        UserAttentionType[UserAttentionType["Critical"] = 1] = "Critical";
        UserAttentionType[UserAttentionType["Informational"] = 2] = "Informational";
      })(exports.UserAttentionType || (exports.UserAttentionType = {}));
      var CloseRequestedEvent = class {
        constructor(event2) {
          this._preventDefault = false;
          this.event = event2.event;
          this.id = event2.id;
        }
        preventDefault() {
          this._preventDefault = true;
        }
        isPreventDefault() {
          return this._preventDefault;
        }
      };
      exports.ProgressBarStatus = void 0;
      (function(ProgressBarStatus) {
        ProgressBarStatus["None"] = "none";
        ProgressBarStatus["Normal"] = "normal";
        ProgressBarStatus["Indeterminate"] = "indeterminate";
        ProgressBarStatus["Paused"] = "paused";
        ProgressBarStatus["Error"] = "error";
      })(exports.ProgressBarStatus || (exports.ProgressBarStatus = {}));
      function getCurrentWindow3() {
        return new Window(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
          // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
          skip: true
        });
      }
      async function getAllWindows() {
        return core.invoke("plugin:window|get_all_windows").then((windows) => windows.map((w) => new Window(w, {
          // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
          skip: true
        })));
      }
      var localTauriEvents = ["tauri://created", "tauri://error"];
      var Window = class {
        /**
         * Creates a new Window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const appWindow = new Window('my-label');
         * appWindow.once('tauri://created', function () {
         *  // window successfully created
         * });
         * appWindow.once('tauri://error', function (e) {
         *  // an error happened creating the window
         * });
         * ```
         *
         * @param label The unique window label. Must be alphanumeric: `a-zA-Z-/:_`.
         * @returns The {@link Window} instance to communicate with the window.
         */
        constructor(label, options = {}) {
          var _a;
          this.label = label;
          this.listeners = /* @__PURE__ */ Object.create(null);
          if (!(options === null || options === void 0 ? void 0 : options.skip)) {
            core.invoke("plugin:window|create", {
              options: {
                ...options,
                parent: typeof options.parent === "string" ? options.parent : (_a = options.parent) === null || _a === void 0 ? void 0 : _a.label,
                label
              }
            }).then(async () => this.emit("tauri://created")).catch(async (e) => this.emit("tauri://error", e));
          }
        }
        /**
         * Gets the Window associated with the given label.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const mainWindow = Window.getByLabel('main');
         * ```
         *
         * @param label The window label.
         * @returns The Window instance to communicate with the window or null if the window doesn't exist.
         */
        static async getByLabel(label) {
          var _a;
          return (_a = (await getAllWindows()).find((w) => w.label === label)) !== null && _a !== void 0 ? _a : null;
        }
        /**
         * Get an instance of `Window` for the current window.
         */
        static getCurrent() {
          return getCurrentWindow3();
        }
        /**
         * Gets a list of instances of `Window` for all available windows.
         */
        static async getAll() {
          return getAllWindows();
        }
        /**
         *  Gets the focused window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const focusedWindow = Window.getFocusedWindow();
         * ```
         *
         * @returns The Window instance or `undefined` if there is not any focused window.
         */
        static async getFocusedWindow() {
          for (const w of await getAllWindows()) {
            if (await w.isFocused()) {
              return w;
            }
          }
          return null;
        }
        /**
         * Listen to an emitted event on this window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().listen<string>('state-changed', (event) => {
         *   console.log(`Got error: ${payload}`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async listen(event$1, handler) {
          if (this._handleTauriEvent(event$1, handler)) {
            return () => {
              const listeners2 = this.listeners[event$1];
              listeners2.splice(listeners2.indexOf(handler), 1);
            };
          }
          return event.listen(event$1, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Listen to an emitted event on this window only once.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().once<null>('initialized', (event) => {
         *   console.log(`Window initialized!`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async once(event$1, handler) {
          if (this._handleTauriEvent(event$1, handler)) {
            return () => {
              const listeners2 = this.listeners[event$1];
              listeners2.splice(listeners2.indexOf(handler), 1);
            };
          }
          return event.once(event$1, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Emits an event to all {@link EventTarget|targets}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emit(event$1, payload) {
          if (localTauriEvents.includes(event$1)) {
            for (const handler of this.listeners[event$1] || []) {
              handler({
                event: event$1,
                id: -1,
                payload
              });
            }
            return;
          }
          return event.emit(event$1, payload);
        }
        /**
         * Emits an event to all {@link EventTarget|targets} matching the given target.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('main', 'window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         * @param target Label of the target Window/Webview/WebviewWindow or raw {@link EventTarget} object.
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emitTo(target, event$1, payload) {
          if (localTauriEvents.includes(event$1)) {
            for (const handler of this.listeners[event$1] || []) {
              handler({
                event: event$1,
                id: -1,
                payload
              });
            }
            return;
          }
          return event.emitTo(target, event$1, payload);
        }
        /** @ignore */
        _handleTauriEvent(event2, handler) {
          if (localTauriEvents.includes(event2)) {
            if (!(event2 in this.listeners)) {
              this.listeners[event2] = [handler];
            } else {
              this.listeners[event2].push(handler);
            }
            return true;
          }
          return false;
        }
        // Getters
        /**
         * The scale factor that can be used to map physical pixels to logical pixels.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const factor = await getCurrentWindow().scaleFactor();
         * ```
         *
         * @returns The window's monitor scale factor.
         */
        async scaleFactor() {
          return core.invoke("plugin:window|scale_factor", {
            label: this.label
          });
        }
        /**
         * The position of the top-left hand corner of the window's client area relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().innerPosition();
         * ```
         *
         * @returns The window's inner position.
         */
        async innerPosition() {
          return core.invoke("plugin:window|inner_position", {
            label: this.label
          }).then((p) => new dpi.PhysicalPosition(p));
        }
        /**
         * The position of the top-left hand corner of the window relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().outerPosition();
         * ```
         *
         * @returns The window's outer position.
         */
        async outerPosition() {
          return core.invoke("plugin:window|outer_position", {
            label: this.label
          }).then((p) => new dpi.PhysicalPosition(p));
        }
        /**
         * The physical size of the window's client area.
         * The client area is the content of the window, excluding the title bar and borders.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().innerSize();
         * ```
         *
         * @returns The window's inner size.
         */
        async innerSize() {
          return core.invoke("plugin:window|inner_size", {
            label: this.label
          }).then((s) => new dpi.PhysicalSize(s));
        }
        /**
         * The physical size of the entire window.
         * These dimensions include the title bar and borders. If you don't want that (and you usually don't), use inner_size instead.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().outerSize();
         * ```
         *
         * @returns The window's outer size.
         */
        async outerSize() {
          return core.invoke("plugin:window|outer_size", {
            label: this.label
          }).then((s) => new dpi.PhysicalSize(s));
        }
        /**
         * Gets the window's current fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const fullscreen = await getCurrentWindow().isFullscreen();
         * ```
         *
         * @returns Whether the window is in fullscreen mode or not.
         */
        async isFullscreen() {
          return core.invoke("plugin:window|is_fullscreen", {
            label: this.label
          });
        }
        /**
         * Gets the window's current minimized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimized = await getCurrentWindow().isMinimized();
         * ```
         */
        async isMinimized() {
          return core.invoke("plugin:window|is_minimized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximized = await getCurrentWindow().isMaximized();
         * ```
         *
         * @returns Whether the window is maximized or not.
         */
        async isMaximized() {
          return core.invoke("plugin:window|is_maximized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current focus state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const focused = await getCurrentWindow().isFocused();
         * ```
         *
         * @returns Whether the window is focused or not.
         */
        async isFocused() {
          return core.invoke("plugin:window|is_focused", {
            label: this.label
          });
        }
        /**
         * Gets the window's current decorated state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const decorated = await getCurrentWindow().isDecorated();
         * ```
         *
         * @returns Whether the window is decorated or not.
         */
        async isDecorated() {
          return core.invoke("plugin:window|is_decorated", {
            label: this.label
          });
        }
        /**
         * Gets the window's current resizable state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const resizable = await getCurrentWindow().isResizable();
         * ```
         *
         * @returns Whether the window is resizable or not.
         */
        async isResizable() {
          return core.invoke("plugin:window|is_resizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native maximize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximizable = await getCurrentWindow().isMaximizable();
         * ```
         *
         * @returns Whether the window's native maximize button is enabled or not.
         */
        async isMaximizable() {
          return core.invoke("plugin:window|is_maximizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native minimize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimizable = await getCurrentWindow().isMinimizable();
         * ```
         *
         * @returns Whether the window's native minimize button is enabled or not.
         */
        async isMinimizable() {
          return core.invoke("plugin:window|is_minimizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native close button state.
         *
         * #### Platform-specific
         *
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const closable = await getCurrentWindow().isClosable();
         * ```
         *
         * @returns Whether the window's native close button is enabled or not.
         */
        async isClosable() {
          return core.invoke("plugin:window|is_closable", {
            label: this.label
          });
        }
        /**
         * Gets the window's current visible state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const visible = await getCurrentWindow().isVisible();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isVisible() {
          return core.invoke("plugin:window|is_visible", {
            label: this.label
          });
        }
        /**
         * Gets the window's current title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const title = await getCurrentWindow().title();
         * ```
         */
        async title() {
          return core.invoke("plugin:window|title", {
            label: this.label
          });
        }
        /**
         * Gets the window's current theme.
         *
         * #### Platform-specific
         *
         * - **macOS:** Theme was introduced on macOS 10.14. Returns `light` on macOS 10.13 and below.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const theme = await getCurrentWindow().theme();
         * ```
         *
         * @returns The window theme.
         */
        async theme() {
          return core.invoke("plugin:window|theme", {
            label: this.label
          });
        }
        /**
         * Whether the window is configured to be always on top of other windows or not.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isAlwaysOnTop() {
          return core.invoke("plugin:window|is_always_on_top", {
            label: this.label
          });
        }
        // Setters
        /**
         * Centers the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().center();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async center() {
          return core.invoke("plugin:window|center", {
            label: this.label
          });
        }
        /**
         *  Requests user attention to the window, this has no effect if the application
         * is already focused. How requesting for user attention manifests is platform dependent,
         * see `UserAttentionType` for details.
         *
         * Providing `null` will unset the request for user attention. Unsetting the request for
         * user attention might not be done automatically by the WM when the window receives input.
         *
         * #### Platform-specific
         *
         * - **macOS:** `null` has no effect.
         * - **Linux:** Urgency levels have the same effect.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().requestUserAttention();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async requestUserAttention(requestType) {
          let requestType_ = null;
          if (requestType) {
            if (requestType === exports.UserAttentionType.Critical) {
              requestType_ = { type: "Critical" };
            } else {
              requestType_ = { type: "Informational" };
            }
          }
          return core.invoke("plugin:window|request_user_attention", {
            label: this.label,
            value: requestType_
          });
        }
        /**
         * Updates the window resizable flag.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setResizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setResizable(resizable) {
          return core.invoke("plugin:window|set_resizable", {
            label: this.label,
            value: resizable
          });
        }
        /**
         * Enable or disable the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async setEnabled(enabled) {
          return core.invoke("plugin:window|set_enabled", {
            label: this.label,
            value: enabled
          });
        }
        /**
         * Whether the window is enabled or disabled.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async isEnabled() {
          return core.invoke("plugin:window|is_enabled", {
            label: this.label
          });
        }
        /**
         * Sets whether the window's native maximize button is enabled or not.
         * If resizable is set to false, this setting is ignored.
         *
         * #### Platform-specific
         *
         * - **macOS:** Disables the "zoom" button in the window titlebar, which is also used to enter fullscreen mode.
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaximizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaximizable(maximizable) {
          return core.invoke("plugin:window|set_maximizable", {
            label: this.label,
            value: maximizable
          });
        }
        /**
         * Sets whether the window's native minimize button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinimizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinimizable(minimizable) {
          return core.invoke("plugin:window|set_minimizable", {
            label: this.label,
            value: minimizable
          });
        }
        /**
         * Sets whether the window's native close button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux:** GTK+ will do its best to convince the window manager not to show a close button. Depending on the system, this function may not have any effect when called on a window that is already visible
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setClosable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setClosable(closable) {
          return core.invoke("plugin:window|set_closable", {
            label: this.label,
            value: closable
          });
        }
        /**
         * Sets the window title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setTitle('Tauri');
         * ```
         *
         * @param title The new title
         * @returns A promise indicating the success or failure of the operation.
         */
        async setTitle(title) {
          return core.invoke("plugin:window|set_title", {
            label: this.label,
            value: title
          });
        }
        /**
         * Maximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().maximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async maximize() {
          return core.invoke("plugin:window|maximize", {
            label: this.label
          });
        }
        /**
         * Unmaximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unmaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unmaximize() {
          return core.invoke("plugin:window|unmaximize", {
            label: this.label
          });
        }
        /**
         * Toggles the window maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().toggleMaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async toggleMaximize() {
          return core.invoke("plugin:window|toggle_maximize", {
            label: this.label
          });
        }
        /**
         * Minimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().minimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async minimize() {
          return core.invoke("plugin:window|minimize", {
            label: this.label
          });
        }
        /**
         * Unminimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unminimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unminimize() {
          return core.invoke("plugin:window|unminimize", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to true.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().show();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async show() {
          return core.invoke("plugin:window|show", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to false.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().hide();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async hide() {
          return core.invoke("plugin:window|hide", {
            label: this.label
          });
        }
        /**
         * Closes the window.
         *
         * Note this emits a closeRequested event so you can intercept it. To force window close, use {@link Window.destroy}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().close();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async close() {
          return core.invoke("plugin:window|close", {
            label: this.label
          });
        }
        /**
         * Destroys the window. Behaves like {@link Window.close} but forces the window close instead of emitting a closeRequested event.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().destroy();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async destroy() {
          return core.invoke("plugin:window|destroy", {
            label: this.label
          });
        }
        /**
         * Whether the window should have borders and bars.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setDecorations(false);
         * ```
         *
         * @param decorations Whether the window should have borders and bars.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setDecorations(decorations) {
          return core.invoke("plugin:window|set_decorations", {
            label: this.label,
            value: decorations
          });
        }
        /**
         * Whether or not the window should have shadow.
         *
         * #### Platform-specific
         *
         * - **Windows:**
         *   - `false` has no effect on decorated window, shadows are always ON.
         *   - `true` will make undecorated window have a 1px white border,
         * and on Windows 11, it will have a rounded corners.
         * - **Linux:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setShadow(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setShadow(enable) {
          return core.invoke("plugin:window|set_shadow", {
            label: this.label,
            value: enable
          });
        }
        /**
         * Set window effects.
         */
        async setEffects(effects) {
          return core.invoke("plugin:window|set_effects", {
            label: this.label,
            value: effects
          });
        }
        /**
         * Clear any applied effects if possible.
         */
        async clearEffects() {
          return core.invoke("plugin:window|set_effects", {
            label: this.label,
            value: null
          });
        }
        /**
         * Whether the window should always be on top of other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnTop(true);
         * ```
         *
         * @param alwaysOnTop Whether the window should always be on top of other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnTop(alwaysOnTop) {
          return core.invoke("plugin:window|set_always_on_top", {
            label: this.label,
            value: alwaysOnTop
          });
        }
        /**
         * Whether the window should always be below other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnBottom(true);
         * ```
         *
         * @param alwaysOnBottom Whether the window should always be below other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnBottom(alwaysOnBottom) {
          return core.invoke("plugin:window|set_always_on_bottom", {
            label: this.label,
            value: alwaysOnBottom
          });
        }
        /**
         * Prevents the window contents from being captured by other apps.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setContentProtected(true);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setContentProtected(protected_) {
          return core.invoke("plugin:window|set_content_protected", {
            label: this.label,
            value: protected_
          });
        }
        /**
         * Resizes the window with a new inner size.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSize(size) {
          return core.invoke("plugin:window|set_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : new dpi.Size(size)
          });
        }
        /**
         * Sets the window minimum inner size. If the `size` argument is not provided, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinSize(new PhysicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinSize(size) {
          return core.invoke("plugin:window|set_min_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : size ? new dpi.Size(size) : null
          });
        }
        /**
         * Sets the window maximum inner size. If the `size` argument is undefined, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaxSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaxSize(size) {
          return core.invoke("plugin:window|set_max_size", {
            label: this.label,
            value: size instanceof dpi.Size ? size : size ? new dpi.Size(size) : null
          });
        }
        /**
         * Sets the window inner size constraints.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSizeConstraints({ minWidth: 300 });
         * ```
         *
         * @param constraints The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSizeConstraints(constraints) {
          function logical(pixel) {
            return pixel ? { Logical: pixel } : null;
          }
          return core.invoke("plugin:window|set_size_constraints", {
            label: this.label,
            value: {
              minWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minWidth),
              minHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minHeight),
              maxWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxWidth),
              maxHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxHeight)
            }
          });
        }
        /**
         * Sets the window outer position.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setPosition(new LogicalPosition(600, 500));
         * ```
         *
         * @param position The new position, in logical or physical pixels.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setPosition(position) {
          return core.invoke("plugin:window|set_position", {
            label: this.label,
            value: position instanceof dpi.Position ? position : new dpi.Position(position)
          });
        }
        /**
         * Sets the window fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFullscreen(true);
         * ```
         *
         * @param fullscreen Whether the window should go to fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFullscreen(fullscreen) {
          return core.invoke("plugin:window|set_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * On macOS, Toggles a fullscreen mode that doesn’t require a new macOS space. Returns a boolean indicating whether the transition was successful (this won’t work if the window was already in the native fullscreen).
         * This is how fullscreen used to work on macOS in versions before Lion. And allows the user to have a fullscreen window without using another space or taking control over the entire monitor.
         *
         * On other platforms, this is the same as {@link Window.setFullscreen}.
         *
         * @param fullscreen Whether the window should go to simple fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSimpleFullscreen(fullscreen) {
          return core.invoke("plugin:window|set_simple_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * Bring the window to front and focus.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocus();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocus() {
          return core.invoke("plugin:window|set_focus", {
            label: this.label
          });
        }
        /**
         * Sets whether the window can be focused.
         *
         * #### Platform-specific
         *
         * - **macOS**: If the window is already focused, it is not possible to unfocus it after calling `set_focusable(false)`.
         *   In this case, you might consider calling {@link Window.setFocus} but it will move the window to the back i.e. at the bottom in terms of z-order.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocusable(true);
         * ```
         *
         * @param focusable Whether the window can be focused.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocusable(focusable) {
          return core.invoke("plugin:window|set_focusable", {
            label: this.label,
            value: focusable
          });
        }
        /**
         * Sets the window icon.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIcon('/tauri/awesome.png');
         * ```
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @param icon Icon bytes or path to the icon file.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIcon(icon) {
          return core.invoke("plugin:window|set_icon", {
            label: this.label,
            value: image.transformImage(icon)
          });
        }
        /**
         * Whether the window icon should be hidden from the taskbar or not.
         *
         * #### Platform-specific
         *
         * - **macOS:** Unsupported.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSkipTaskbar(true);
         * ```
         *
         * @param skip true to hide window icon, false to show it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSkipTaskbar(skip) {
          return core.invoke("plugin:window|set_skip_taskbar", {
            label: this.label,
            value: skip
          });
        }
        /**
         * Grabs the cursor, preventing it from leaving the window.
         *
         * There's no guarantee that the cursor will be hidden. You should
         * hide it by yourself if you want so.
         *
         * #### Platform-specific
         *
         * - **Linux:** Unsupported.
         * - **macOS:** This locks the cursor in a fixed location, which looks visually awkward.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorGrab(true);
         * ```
         *
         * @param grab `true` to grab the cursor icon, `false` to release it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorGrab(grab) {
          return core.invoke("plugin:window|set_cursor_grab", {
            label: this.label,
            value: grab
          });
        }
        /**
         * Modifies the cursor's visibility.
         *
         * #### Platform-specific
         *
         * - **Windows:** The cursor is only hidden within the confines of the window.
         * - **macOS:** The cursor is hidden as long as the window has input focus, even if the cursor is
         *   outside of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorVisible(false);
         * ```
         *
         * @param visible If `false`, this will hide the cursor. If `true`, this will show the cursor.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorVisible(visible) {
          return core.invoke("plugin:window|set_cursor_visible", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Modifies the cursor icon of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorIcon('help');
         * ```
         *
         * @param icon The new cursor icon.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorIcon(icon) {
          return core.invoke("plugin:window|set_cursor_icon", {
            label: this.label,
            value: icon
          });
        }
        /**
         * Sets the window background color.
         *
         * #### Platform-specific:
         *
         * - **Windows:** alpha channel is ignored.
         * - **iOS / Android:** Unsupported.
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.1.0
         */
        async setBackgroundColor(color) {
          return core.invoke("plugin:window|set_background_color", { color });
        }
        /**
         * Changes the position of the cursor in window coordinates.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorPosition(new LogicalPosition(600, 300));
         * ```
         *
         * @param position The new cursor position.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorPosition(position) {
          return core.invoke("plugin:window|set_cursor_position", {
            label: this.label,
            value: position instanceof dpi.Position ? position : new dpi.Position(position)
          });
        }
        /**
         * Changes the cursor events behavior.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIgnoreCursorEvents(true);
         * ```
         *
         * @param ignore `true` to ignore the cursor events; `false` to process them as usual.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIgnoreCursorEvents(ignore) {
          return core.invoke("plugin:window|set_ignore_cursor_events", {
            label: this.label,
            value: ignore
          });
        }
        /**
         * Starts dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startDragging() {
          return core.invoke("plugin:window|start_dragging", {
            label: this.label
          });
        }
        /**
         * Starts resize-dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startResizeDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startResizeDragging(direction) {
          return core.invoke("plugin:window|start_resize_dragging", {
            label: this.label,
            value: direction
          });
        }
        /**
         * Sets the badge count. It is app wide and not specific to this window.
         *
         * #### Platform-specific
         *
         * - **Windows**: Unsupported. Use @{linkcode Window.setOverlayIcon} instead.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeCount(5);
         * ```
         *
         * @param count The badge count. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeCount(count) {
          return core.invoke("plugin:window|set_badge_count", {
            label: this.label,
            value: count
          });
        }
        /**
         * Sets the badge cont **macOS only**.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeLabel("Hello");
         * ```
         *
         * @param label The badge label. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeLabel(label) {
          return core.invoke("plugin:window|set_badge_label", {
            label: this.label,
            value: label
          });
        }
        /**
         * Sets the overlay icon. **Windows only**
         * The overlay icon can be set for every window.
         *
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         *
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setOverlayIcon("/tauri/awesome.png");
         * ```
         *
         * @param icon Icon bytes or path to the icon file. Use `undefined` to remove the overlay icon.
         * @return A promise indicating the success or failure of the operation.
         */
        async setOverlayIcon(icon) {
          return core.invoke("plugin:window|set_overlay_icon", {
            label: this.label,
            value: icon ? image.transformImage(icon) : void 0
          });
        }
        /**
         * Sets the taskbar progress state.
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Progress bar is app-wide and not specific to this window.
         * - **Linux**: Only supported desktop environments with `libunity` (e.g. GNOME).
         *
         * @example
         * ```typescript
         * import { getCurrentWindow, ProgressBarStatus } from '@tauri-apps/api/window';
         * await getCurrentWindow().setProgressBar({
         *   status: ProgressBarStatus.Normal,
         *   progress: 50,
         * });
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async setProgressBar(state) {
          return core.invoke("plugin:window|set_progress_bar", {
            label: this.label,
            value: state
          });
        }
        /**
         * Sets whether the window should be visible on all workspaces or virtual desktops.
         *
         * #### Platform-specific
         *
         * - **Windows / iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setVisibleOnAllWorkspaces(visible) {
          return core.invoke("plugin:window|set_visible_on_all_workspaces", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Sets the title bar style. **macOS only**.
         *
         * @since 2.0.0
         */
        async setTitleBarStyle(style) {
          return core.invoke("plugin:window|set_title_bar_style", {
            label: this.label,
            value: style
          });
        }
        /**
         * Set window theme, pass in `null` or `undefined` to follow system theme
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Theme is app-wide and not specific to this window.
         * - **iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setTheme(theme) {
          return core.invoke("plugin:window|set_theme", {
            label: this.label,
            value: theme
          });
        }
        // Listeners
        /**
         * Listen to window resize.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onResized(({ payload: size }) => {
         *  console.log('Window resized', size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onResized(handler) {
          return this.listen(event.TauriEvent.WINDOW_RESIZED, (e) => {
            e.payload = new dpi.PhysicalSize(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window move.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onMoved(({ payload: position }) => {
         *  console.log('Window moved', position);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onMoved(handler) {
          return this.listen(event.TauriEvent.WINDOW_MOVED, (e) => {
            e.payload = new dpi.PhysicalPosition(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window close requested. Emitted when the user requests to closes the window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * import { confirm } from '@tauri-apps/api/dialog';
         * const unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
         *   const confirmed = await confirm('Are you sure?');
         *   if (!confirmed) {
         *     // user did not confirm closing the window; let's prevent it
         *     event.preventDefault();
         *   }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onCloseRequested(handler) {
          return this.listen(event.TauriEvent.WINDOW_CLOSE_REQUESTED, async (event2) => {
            const evt = new CloseRequestedEvent(event2);
            await handler(evt);
            if (!evt.isPreventDefault()) {
              await this.destroy();
            }
          });
        }
        /**
         * Listen to a file drop event.
         * The listener is triggered when the user hovers the selected files on the webview,
         * drops the files or cancels the operation.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/webview";
         * const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
         *  if (event.payload.type === 'over') {
         *    console.log('User hovering', event.payload.position);
         *  } else if (event.payload.type === 'drop') {
         *    console.log('User dropped', event.payload.paths);
         *  } else {
         *    console.log('File drop cancelled');
         *  }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onDragDropEvent(handler) {
          const unlistenDrag = await this.listen(event.TauriEvent.DRAG_ENTER, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "enter",
                paths: event2.payload.paths,
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenDragOver = await this.listen(event.TauriEvent.DRAG_OVER, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "over",
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenDrop = await this.listen(event.TauriEvent.DRAG_DROP, (event2) => {
            handler({
              ...event2,
              payload: {
                type: "drop",
                paths: event2.payload.paths,
                position: new dpi.PhysicalPosition(event2.payload.position)
              }
            });
          });
          const unlistenCancel = await this.listen(event.TauriEvent.DRAG_LEAVE, (event2) => {
            handler({ ...event2, payload: { type: "leave" } });
          });
          return () => {
            unlistenDrag();
            unlistenDrop();
            unlistenDragOver();
            unlistenCancel();
          };
        }
        /**
         * Listen to window focus change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
         *  console.log('Focus changed, window is focused? ' + focused);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onFocusChanged(handler) {
          const unlistenFocus = await this.listen(event.TauriEvent.WINDOW_FOCUS, (event2) => {
            handler({ ...event2, payload: true });
          });
          const unlistenBlur = await this.listen(event.TauriEvent.WINDOW_BLUR, (event2) => {
            handler({ ...event2, payload: false });
          });
          return () => {
            unlistenFocus();
            unlistenBlur();
          };
        }
        /**
         * Listen to window scale change. Emitted when the window's scale factor has changed.
         * The following user actions can cause DPI changes:
         * - Changing the display's resolution.
         * - Changing the display's scale factor (e.g. in Control Panel on Windows).
         * - Moving the window to a display with a different scale factor.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onScaleChanged(({ payload }) => {
         *  console.log('Scale changed', payload.scaleFactor, payload.size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onScaleChanged(handler) {
          return this.listen(event.TauriEvent.WINDOW_SCALE_FACTOR_CHANGED, handler);
        }
        /**
         * Listen to the system theme change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
         *  console.log('New theme: ' + theme);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onThemeChanged(handler) {
          return this.listen(event.TauriEvent.WINDOW_THEME_CHANGED, handler);
        }
      };
      var BackgroundThrottlingPolicy;
      (function(BackgroundThrottlingPolicy2) {
        BackgroundThrottlingPolicy2["Disabled"] = "disabled";
        BackgroundThrottlingPolicy2["Throttle"] = "throttle";
        BackgroundThrottlingPolicy2["Suspend"] = "suspend";
      })(BackgroundThrottlingPolicy || (BackgroundThrottlingPolicy = {}));
      var ScrollBarStyle;
      (function(ScrollBarStyle2) {
        ScrollBarStyle2["Default"] = "default";
        ScrollBarStyle2["FluentOverlay"] = "fluentOverlay";
      })(ScrollBarStyle || (ScrollBarStyle = {}));
      exports.Effect = void 0;
      (function(Effect) {
        Effect["AppearanceBased"] = "appearanceBased";
        Effect["Light"] = "light";
        Effect["Dark"] = "dark";
        Effect["MediumLight"] = "mediumLight";
        Effect["UltraDark"] = "ultraDark";
        Effect["Titlebar"] = "titlebar";
        Effect["Selection"] = "selection";
        Effect["Menu"] = "menu";
        Effect["Popover"] = "popover";
        Effect["Sidebar"] = "sidebar";
        Effect["HeaderView"] = "headerView";
        Effect["Sheet"] = "sheet";
        Effect["WindowBackground"] = "windowBackground";
        Effect["HudWindow"] = "hudWindow";
        Effect["FullScreenUI"] = "fullScreenUI";
        Effect["Tooltip"] = "tooltip";
        Effect["ContentBackground"] = "contentBackground";
        Effect["UnderWindowBackground"] = "underWindowBackground";
        Effect["UnderPageBackground"] = "underPageBackground";
        Effect["Mica"] = "mica";
        Effect["Blur"] = "blur";
        Effect["Acrylic"] = "acrylic";
        Effect["Tabbed"] = "tabbed";
        Effect["TabbedDark"] = "tabbedDark";
        Effect["TabbedLight"] = "tabbedLight";
      })(exports.Effect || (exports.Effect = {}));
      exports.EffectState = void 0;
      (function(EffectState) {
        EffectState["FollowsWindowActiveState"] = "followsWindowActiveState";
        EffectState["Active"] = "active";
        EffectState["Inactive"] = "inactive";
      })(exports.EffectState || (exports.EffectState = {}));
      function mapMonitor(m) {
        return m === null ? null : {
          name: m.name,
          scaleFactor: m.scaleFactor,
          position: new dpi.PhysicalPosition(m.position),
          size: new dpi.PhysicalSize(m.size),
          workArea: {
            position: new dpi.PhysicalPosition(m.workArea.position),
            size: new dpi.PhysicalSize(m.workArea.size)
          }
        };
      }
      async function currentMonitor() {
        return core.invoke("plugin:window|current_monitor").then(mapMonitor);
      }
      async function primaryMonitor() {
        return core.invoke("plugin:window|primary_monitor").then(mapMonitor);
      }
      async function monitorFromPoint(x, y) {
        return core.invoke("plugin:window|monitor_from_point", {
          x,
          y
        }).then(mapMonitor);
      }
      async function availableMonitors() {
        return core.invoke("plugin:window|available_monitors").then((ms) => ms.map(mapMonitor));
      }
      async function cursorPosition() {
        return core.invoke("plugin:window|cursor_position").then((v) => new dpi.PhysicalPosition(v));
      }
      exports.LogicalPosition = dpi.LogicalPosition;
      exports.LogicalSize = dpi.LogicalSize;
      exports.PhysicalPosition = dpi.PhysicalPosition;
      exports.PhysicalSize = dpi.PhysicalSize;
      exports.CloseRequestedEvent = CloseRequestedEvent;
      exports.Window = Window;
      exports.availableMonitors = availableMonitors;
      exports.currentMonitor = currentMonitor;
      exports.cursorPosition = cursorPosition;
      exports.getAllWindows = getAllWindows;
      exports.getCurrentWindow = getCurrentWindow3;
      exports.monitorFromPoint = monitorFromPoint;
      exports.primaryMonitor = primaryMonitor;
    }
  });

  // components/window-controls.tsx
  var import_react_dom, import_core3, import_window, INTERACTIVE_SELECTOR, EDGE, CORNER, HANDLES;
  var init_window_controls = __esm({
    "components/window-controls.tsx"() {
      init_react_shim();
      import_react_dom = __toESM(require_react_dom());
      import_core3 = __toESM(require_core());
      import_window = __toESM(require_window());
      init_platform_os();
      init_jsx_runtime_shim();
      INTERACTIVE_SELECTOR = [
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        "label",
        "summary",
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="slider"]',
        '[contenteditable=""]',
        '[contenteditable="true"]',
        "[data-no-window-drag]",
        ".lumio-window-controls"
      ].join(",");
      EDGE = 6;
      CORNER = 12;
      HANDLES = [
        { edge: "n", cursor: "ns-resize", style: { top: 0, left: CORNER, right: CORNER, height: EDGE / 1.5 } },
        { edge: "s", cursor: "ns-resize", style: { bottom: 0, left: CORNER, right: CORNER, height: EDGE } },
        { edge: "w", cursor: "ew-resize", style: { left: 0, top: CORNER, bottom: CORNER, width: EDGE } },
        { edge: "e", cursor: "ew-resize", style: { right: 0, top: CORNER, bottom: CORNER, width: EDGE } },
        { edge: "nw", cursor: "nwse-resize", style: { top: 0, left: 0, width: CORNER, height: CORNER / 2 } },
        { edge: "ne", cursor: "nesw-resize", style: { top: 0, right: 0, width: CORNER, height: CORNER / 2 } },
        { edge: "sw", cursor: "nesw-resize", style: { bottom: 0, left: 0, width: CORNER, height: CORNER } },
        { edge: "se", cursor: "nwse-resize", style: { bottom: 0, right: 0, width: CORNER, height: CORNER } }
      ];
    }
  });

  // lib/library/source-provider.ts
  var init_source_provider = __esm({
    "lib/library/source-provider.ts"() {
      "use strict";
      "use client";
      init_plugin_registry();
      init_client();
    }
  });

  // lib/library/progress.ts
  var TITLE_TTL_MS;
  var init_progress = __esm({
    "lib/library/progress.ts"() {
      "use client";
      init_client();
      init_mode();
      init_source_provider();
      TITLE_TTL_MS = 5 * 6e4;
    }
  });

  // lib/sync/webdav-credentials.ts
  var init_webdav_credentials = __esm({
    "lib/sync/webdav-credentials.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/continue-frames.ts
  var init_continue_frames = __esm({
    "lib/continue-frames.ts"() {
      "use client";
      init_profile_storage_shim();
      init_player_frame_id();
      init_webdav_credentials();
    }
  });

  // lib/playback-availability.ts
  var init_playback_availability = __esm({
    "lib/playback-availability.ts"() {
      init_core_addons();
    }
  });

  // lib/video-progress.ts
  function sanitizeEntry(entry) {
    return {
      ...entry,
      tmdbId: typeof entry.tmdbId === "string" && entry.tmdbId.trim().length > 0 ? entry.tmdbId.trim() : entry.id.match(/^(?:movie|tv)-(\d+)$/)?.[1] ?? null,
      imdbId: typeof entry.imdbId === "string" && entry.imdbId.trim().length > 0 ? entry.imdbId.trim() : null
    };
  }
  function read4() {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(getScopedStorageItem(KEY4) ?? "[]");
    } catch {
      return [];
    }
  }
  function watchedAtMs(entry) {
    const ts = Date.parse(entry.watchedAt ?? "");
    return Number.isFinite(ts) ? ts : 0;
  }
  function sortByWatchedAtDesc(entries) {
    return [...entries].sort((a, b) => watchedAtMs(b) - watchedAtMs(a));
  }
  function readHistory() {
    if (typeof window === "undefined") return [];
    try {
      const raw = getScopedStorageItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (parsed.length > 0) return parsed;
      const seed = read4();
      if (seed.length > 0) {
        const seenKeys = /* @__PURE__ */ new Set();
        const dedupedSeed = [];
        for (const entry of seed) {
          const key = entry.type === "tv" ? entry.id : `${entry.id}::${entry.season ?? ""}:${entry.episode ?? ""}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          dedupedSeed.push(sanitizeEntry(entry));
        }
        const seededEntries = dedupedSeed.slice(0, HISTORY_MAX);
        setScopedStorageItem(HISTORY_KEY, JSON.stringify(seededEntries));
        return seededEntries;
      }
      return [];
    } catch {
      return [];
    }
  }
  function writeHistory(entries) {
    setScopedStorageItem(HISTORY_KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
  }
  function historyDedupeKey(entry) {
    return entry.type === "tv" ? entry.id : `${entry.id}::${entry.season ?? ""}:${entry.episode ?? ""}`;
  }
  function appendHistoryEntry(entry) {
    const sanitized = sanitizeEntry(entry);
    const incomingKey = historyDedupeKey(sanitized);
    const current2 = readHistory();
    const previous = current2.find((existing) => historyDedupeKey(existing) === incomingKey);
    const winner = previous && watchedAtMs(previous) > watchedAtMs(sanitized) ? {
      ...previous,
      posterUrl: previous.posterUrl ?? sanitized.posterUrl ?? null,
      backdropUrl: previous.backdropUrl ?? sanitized.backdropUrl ?? null
    } : sanitized;
    const filtered = current2.filter((existing) => historyDedupeKey(existing) !== incomingKey);
    const next = sortByWatchedAtDesc([winner, ...filtered]).slice(0, HISTORY_MAX);
    writeHistory(next);
  }
  function flushHistoryMirror() {
    const mirror = historyMirror;
    if (!mirror?.pending) return;
    if (mirror.timer) clearTimeout(mirror.timer);
    const entry = mirror.pending;
    mirror.pending = null;
    mirror.timer = null;
    mirror.at = Date.now();
    appendHistoryEntry(entry);
  }
  var EVENT4, KEY4, HISTORY_KEY, HISTORY_EVENT, HISTORY_MAX, historyMirror;
  var init_video_progress = __esm({
    "lib/video-progress.ts"() {
      init_progress();
      init_profile_storage_shim();
      init_continue_frames();
      init_watched_episodes();
      init_playback_availability();
      EVENT4 = "lumio-stream-progress-changed";
      if (typeof window !== "undefined") {
        void Promise.resolve().then(() => (init_plugin_registry(), plugin_registry_exports)).then(({ subscribePluginRegistry: subscribePluginRegistry2 }) => {
          subscribePluginRegistry2(() => {
            window.dispatchEvent(new CustomEvent(EVENT4));
            window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
          });
        }).catch(() => {
        });
      }
      KEY4 = "stream_progress_list";
      HISTORY_KEY = "stream_history_list";
      HISTORY_EVENT = "lumio-stream-history-changed";
      HISTORY_MAX = 200;
      historyMirror = null;
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", flushHistoryMirror);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") flushHistoryMirror();
        });
      }
    }
  });

  // lib/watch-journal/types.ts
  function viewingKey(s) {
    return `${s.mediaId}|${s.season ?? ""}|${s.episode ?? ""}`;
  }
  function isCompleteAt(pos, duration) {
    return duration > 0 && pos / duration >= COMPLETE_RATIO;
  }
  var COMPLETE_RATIO, VIEWING_DEDUPE_WINDOW_MS;
  var init_types = __esm({
    "lib/watch-journal/types.ts"() {
      "use strict";
      COMPLETE_RATIO = 0.9;
      VIEWING_DEDUPE_WINDOW_MS = 36 * 36e5;
    }
  });

  // lib/watch-journal/recorder-core.ts
  function defaultCompanions(last2, nowMs) {
    if (!last2 || last2.ids.length === 0) return [];
    return nowMs - last2.endedAtMs <= COMPANIONS_WINDOW_MS ? [...last2.ids] : [];
  }
  function createRecorder(deps) {
    let open2 = null;
    let openKey = "";
    let lastTickMs = 0;
    let lastPos = 0;
    let lastPersistMs = null;
    let chosen = null;
    let chosenAtMs = 0;
    function choiceFor(nowMs) {
      if (chosen && nowMs - chosenAtMs <= COVIEWER_CHOICE_TTL_MS) return [...chosen];
      chosen = null;
      return deps.defaultCoViewers?.() ?? [];
    }
    function close() {
      if (open2 && open2.played >= MIN_PLAYED_S) deps.persist({ ...open2 }, true);
      open2 = null;
      openKey = "";
    }
    function finish() {
      close();
      chosen = null;
    }
    function tick(input, final = false) {
      if (input.type === "audiobook" || !(input.duration > 0)) return;
      const nowMs = deps.now();
      const key = viewingKey(input);
      if (open2 && (openKey !== key || nowMs - lastTickMs > SESSION_GAP_MS)) close();
      const iso = new Date(nowMs).toISOString();
      if (!open2) {
        open2 = {
          id: deps.newId(),
          profileId: deps.profileId(),
          mediaId: input.mediaId,
          tmdbId: input.tmdbId,
          type: input.type,
          ...input.season != null ? { season: input.season } : {},
          ...input.episode != null ? { episode: input.episode } : {},
          title: input.title,
          posterUrl: input.posterUrl ?? null,
          year: input.year ?? null,
          startedAt: iso,
          endedAt: iso,
          updatedAt: iso,
          startPos: input.position,
          endPos: input.position,
          duration: input.duration,
          played: 0,
          completed: isCompleteAt(input.position, input.duration),
          coViewers: choiceFor(nowMs)
        };
        openKey = key;
        lastPos = input.position;
        lastPersistMs = null;
      } else {
        const advance = input.position - lastPos;
        if (advance > 0 && advance <= MAX_TICK_ADVANCE_S) open2.played += advance;
        lastPos = input.position;
        open2.endPos = input.position;
        open2.duration = input.duration;
        open2.endedAt = iso;
        open2.updatedAt = iso;
        if (isCompleteAt(input.position, input.duration)) open2.completed = true;
      }
      lastTickMs = nowMs;
      if (chosen) chosenAtMs = nowMs;
      if (open2.played < MIN_PLAYED_S) {
        if (final) finish();
        return;
      }
      if (final) {
        finish();
        return;
      }
      if (lastPersistMs === null || nowMs - lastPersistMs >= PERSIST_EVERY_MS) {
        lastPersistMs = nowMs;
        deps.persist({ ...open2 }, false);
      }
    }
    function setCoViewers(ids2) {
      const nowMs = deps.now();
      chosen = [...new Set(ids2)];
      chosenAtMs = nowMs;
      if (open2) {
        open2.coViewers = [...chosen];
        open2.updatedAt = new Date(nowMs).toISOString();
      }
    }
    function coViewers() {
      return open2 ? [...open2.coViewers] : choiceFor(deps.now());
    }
    function markAsleep(pos, atMs) {
      if (!open2) return false;
      open2.fellAsleep = { at: new Date(atMs).toISOString(), pos };
      open2.updatedAt = new Date(deps.now()).toISOString();
      return true;
    }
    return { tick, current: () => open2, setCoViewers, coViewers, markAsleep };
  }
  var SESSION_GAP_MS, MIN_PLAYED_S, PERSIST_EVERY_MS, MAX_TICK_ADVANCE_S, COVIEWER_CHOICE_TTL_MS, COMPANIONS_WINDOW_MS;
  var init_recorder_core = __esm({
    "lib/watch-journal/recorder-core.ts"() {
      "use strict";
      init_types();
      SESSION_GAP_MS = 30 * 6e4;
      MIN_PLAYED_S = 60;
      PERSIST_EVERY_MS = 6e4;
      MAX_TICK_ADVANCE_S = 10;
      COVIEWER_CHOICE_TTL_MS = 5 * 6e4;
      COMPANIONS_WINDOW_MS = 12 * 36e5;
    }
  });

  // lib/watch-journal/store.ts
  function emit() {
    version2++;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(JOURNAL_CHANGED_EVENT));
  }
  function scheduleIdle(fn) {
    const ric = typeof window !== "undefined" ? window.requestIdleCallback : void 0;
    if (ric) ric(fn, { timeout: 5e3 });
    else setTimeout(fn, 0);
  }
  async function put(s) {
    try {
      const r = await fetch(`/api/journal?profile=${encodeURIComponent(s.profileId)}&id=${encodeURIComponent(s.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s)
      });
      return r.ok;
    } catch {
      return false;
    }
  }
  async function flushJournal() {
    flushQueued = false;
    const batch = [...pending.values()];
    pending.clear();
    let anyFailed = false;
    for (const s of batch) {
      const ok = await put(s);
      if (!ok) {
        anyFailed = true;
        if (!pending.has(s.id)) pending.set(s.id, s);
      }
    }
    if (anyFailed && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void flushJournal();
      }, RETRY_MS);
    }
  }
  function upsertSession(s) {
    pending.set(s.id, { ...s });
    if (s.profileId === loadedFor) {
      sessions.set(s.id, { ...s });
      emit();
    }
    if (!flushQueued) {
      flushQueued = true;
      scheduleIdle(() => {
        void flushJournal();
      });
    }
  }
  var JOURNAL_CHANGED_EVENT, JOURNAL_SYNC_WORTHY_EVENT, sessions, pending, loadedFor, version2, flushQueued, RETRY_MS, retryTimer;
  var init_store = __esm({
    "lib/watch-journal/store.ts"() {
      "use strict";
      init_profile_storage_shim();
      JOURNAL_CHANGED_EVENT = "lumio-watch-journal-changed";
      JOURNAL_SYNC_WORTHY_EVENT = "lumio-journal-sync-worthy";
      sessions = /* @__PURE__ */ new Map();
      pending = /* @__PURE__ */ new Map();
      loadedFor = null;
      version2 = 0;
      flushQueued = false;
      RETRY_MS = 3e4;
      retryTimer = null;
    }
  });

  // lib/watch-journal/player-open.ts
  function isPlayerOpen() {
    return open;
  }
  var open;
  var init_player_open = __esm({
    "lib/watch-journal/player-open.ts"() {
      init_react_shim();
      open = false;
    }
  });

  // lib/watch-journal/weather.ts
  function getWeatherPrefs() {
    try {
      const raw = getScopedStorageItem(WEATHER_PREFS_KEY);
      if (!raw) return OFF;
      const p = JSON.parse(raw);
      const place = p.place && typeof p.place.lat === "number" && typeof p.place.lon === "number" ? p.place : null;
      return { enabled: p.enabled === true, place };
    } catch {
      return OFF;
    }
  }
  function forecastUrl(lat, lon) {
    return `${FORECAST_URL}?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=weather_code,temperature_2m`;
  }
  function parseForecast(json) {
    const c = json?.current;
    if (!c || typeof c.weather_code !== "number" || typeof c.temperature_2m !== "number") return null;
    return { code: c.weather_code, tempC: c.temperature_2m };
  }
  function schedule(ms) {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void drain();
    }, ms);
  }
  async function drain() {
    const nowMs = Date.now();
    for (let i = pending2.length - 1; i >= 0; i--) {
      if (nowMs - Date.parse(pending2[i].endedAt) > WEATHER_MAX_AGE_MS) pending2.splice(i, 1);
    }
    if (pending2.length === 0) return;
    if (isPlayerOpen()) {
      schedule(WEATHER_RETRY_MS);
      return;
    }
    const prefs2 = getWeatherPrefs();
    if (!prefs2.enabled || !prefs2.place) {
      pending2.length = 0;
      return;
    }
    let weather = null;
    try {
      const r = await fetch(forecastUrl(prefs2.place.lat, prefs2.place.lon));
      if (r.ok) weather = parseForecast(await r.json());
    } catch {
    }
    if (!weather) {
      schedule(WEATHER_RETRY_MS * 5);
      return;
    }
    const iso = (/* @__PURE__ */ new Date()).toISOString();
    for (const s of pending2.splice(0)) upsertSession({ ...s, weather, updatedAt: iso });
  }
  function queueSessionWeather(s) {
    const prefs2 = getWeatherPrefs();
    if (!prefs2.enabled || !prefs2.place || s.weather || s.seeded) return;
    if (!pending2.some((p) => p.id === s.id)) pending2.push(s);
    schedule(0);
  }
  var WEATHER_PREFS_KEY, FORECAST_URL, WEATHER_RETRY_MS, WEATHER_MAX_AGE_MS, OFF, pending2, timer;
  var init_weather = __esm({
    "lib/watch-journal/weather.ts"() {
      "use strict";
      init_i18n();
      init_profile_storage_shim();
      init_player_open();
      init_store();
      WEATHER_PREFS_KEY = "profile_weather_v1";
      FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
      WEATHER_RETRY_MS = 6e4;
      WEATHER_MAX_AGE_MS = 3 * 36e5;
      OFF = { enabled: false, place: null };
      pending2 = [];
      timer = null;
    }
  });

  // lib/watch-journal/recorder.ts
  function loadLast() {
    try {
      const raw = getScopedStorageItem(LAST_COMPANIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      last = parsed && Array.isArray(parsed.ids) && typeof parsed.endedAtMs === "number" ? { ids: parsed.ids.filter((x) => typeof x === "string"), endedAtMs: parsed.endedAtMs } : null;
    } catch {
      last = null;
    }
  }
  function newId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  var LAST_COMPANIONS_KEY, last, recorder;
  var init_recorder = __esm({
    "lib/watch-journal/recorder.ts"() {
      init_profile_storage_shim();
      init_recorder_core();
      init_store();
      init_weather();
      LAST_COMPANIONS_KEY = "journal_last_companions_v1";
      last = null;
      if (typeof window !== "undefined") {
        scheduleIdle(loadLast);
        window.addEventListener("lumio-profile-changed", () => {
          last = null;
          scheduleIdle(loadLast);
        });
      }
      recorder = createRecorder({
        now: () => Date.now(),
        newId,
        profileId: () => getActiveProfileId() ?? "default",
        persist: (s, final) => {
          upsertSession(s);
          if (!final) return;
          if (typeof window !== "undefined") window.dispatchEvent(new Event(JOURNAL_SYNC_WORTHY_EVENT));
          scheduleIdle(() => queueSessionWeather(s));
          if (s.profileId !== (getActiveProfileId() ?? "default")) return;
          const record = { ids: [...s.coViewers], endedAtMs: Date.parse(s.endedAt) };
          last = record;
          scheduleIdle(() => {
            try {
              setScopedStorageItem(LAST_COMPANIONS_KEY, JSON.stringify(record));
            } catch {
            }
          });
        },
        defaultCoViewers: () => defaultCompanions(last, Date.now())
      });
    }
  });

  // lib/avatars/catalog.ts
  var PROFILE_COLORS;
  var init_catalog = __esm({
    "lib/avatars/catalog.ts"() {
      PROFILE_COLORS = [
        "#7dd3fc",
        "#60a5fa",
        "#a78bfa",
        "#f472b6",
        "#fb7185",
        "#fb923c",
        "#fbbf24",
        "#a3e635",
        "#34d399",
        "#22d3ee"
      ];
    }
  });

  // components/ui/profile-avatar.tsx
  var DEFAULT_COLOR;
  var init_profile_avatar = __esm({
    "components/ui/profile-avatar.tsx"() {
      "use client";
      init_catalog();
      init_jsx_runtime_shim();
      DEFAULT_COLOR = PROFILE_COLORS[0];
    }
  });

  // lib/sleep-timer.ts
  var init_sleep_timer = __esm({
    "lib/sleep-timer.ts"() {
    }
  });

  // lib/barcode/barcode-samplers.ts
  var init_barcode_samplers = __esm({
    "lib/barcode/barcode-samplers.ts"() {
      "use strict";
      init_tauri_mpv();
      init_tauri_native_player();
    }
  });

  // lib/barcode/barcode-settings.ts
  function pick(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }
  function bool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }
  function getBarcodeSettings() {
    const d = DEFAULT_BARCODE_SETTINGS;
    let raw = {};
    try {
      const stored = getScopedStorageItem(KEY5);
      if (stored) raw = JSON.parse(stored) ?? {};
    } catch {
      raw = {};
    }
    return {
      enabled: bool(raw.enabled, d.enabled),
      showStripInPlayer: bool(raw.showStripInPlayer, d.showStripInPlayer),
      columns: pick(raw.columns, COLUMNS, d.columns),
      scope: pick(raw.scope, ["movies", "movies+episodes"], d.scope),
      unseenStyle: pick(raw.unseenStyle, UNSEEN, d.unseenStyle),
      shareIncludeTitle: bool(raw.shareIncludeTitle, d.shareIncludeTitle),
      libraryView: raw[SHELF_MIGRATED] === true ? pick(raw.libraryView, VIEWS, d.libraryView) : "shelf",
      stripeTexture: raw[ROUGH_MIGRATED] === true ? pick(raw.stripeTexture, TEXTURES, d.stripeTexture) : "rough",
      posterStyle: pick(raw.posterStyle, ["credits", "titleCard", "ring", "portrait"], d.posterStyle),
      posterPaper: pick(raw.posterPaper, ["light", "dark"], d.posterPaper),
      shelfStyle: pick(raw.shelfStyle, ["spines", "poster", "ring", "portrait"], d.shelfStyle),
      librarySort: pick(raw.librarySort, ["recent", "title", "year"], d.librarySort),
      shelfPaper: pick(raw.shelfPaper, ["light", "dark"], d.shelfPaper)
    };
  }
  function onBarcodeSettingsChanged(listener) {
    if (typeof window === "undefined") return () => {
    };
    window.addEventListener(BARCODE_SETTINGS_CHANGED_EVENT, listener);
    window.addEventListener("lumio-profile-changed", listener);
    return () => {
      window.removeEventListener(BARCODE_SETTINGS_CHANGED_EVENT, listener);
      window.removeEventListener("lumio-profile-changed", listener);
    };
  }
  var KEY5, BARCODE_SETTINGS_CHANGED_EVENT, DEFAULT_BARCODE_SETTINGS, COLUMNS, UNSEEN, VIEWS, TEXTURES, SHELF_MIGRATED, ROUGH_MIGRATED;
  var init_barcode_settings = __esm({
    "lib/barcode/barcode-settings.ts"() {
      init_profile_storage_shim();
      KEY5 = "barcode_settings_v1";
      BARCODE_SETTINGS_CHANGED_EVENT = "lumio-barcode-settings-changed";
      DEFAULT_BARCODE_SETTINGS = {
        enabled: false,
        showStripInPlayer: true,
        columns: 160,
        scope: "movies",
        unseenStyle: "hatch",
        shareIncludeTitle: true,
        libraryView: "shelf",
        stripeTexture: "rough",
        posterStyle: "credits",
        posterPaper: "light",
        shelfStyle: "spines",
        librarySort: "recent",
        shelfPaper: "light"
      };
      COLUMNS = [120, 160, 320];
      UNSEEN = ["hatch", "dim", "empty"];
      VIEWS = ["grid", "list", "ring", "shelf"];
      TEXTURES = ["rough", "smooth"];
      SHELF_MIGRATED = "shelfDefaultApplied";
      ROUGH_MIGRATED = "roughDefaultApplied";
    }
  });

  // lib/barcode/barcode-id.ts
  var init_barcode_id = __esm({
    "lib/barcode/barcode-id.ts"() {
      "use strict";
    }
  });

  // lib/barcode/barcode-model.ts
  function columnIndex(t, duration, n) {
    if (!(duration > 0) || !Number.isFinite(t) || t < 0 || n <= 0) return -1;
    return Math.min(n - 1, Math.floor(t / duration * n));
  }
  function hasBogusEnd(b) {
    return b.endAt != null && !(b.endAt > 0);
  }
  function tailFrom(b) {
    if (b.endAt == null || hasBogusEnd(b) || !(b.duration > 0)) return null;
    return Math.min(b.colors.length, Math.max(0, Math.ceil(b.endAt / b.duration * b.colors.length - 1e-9)));
  }
  function coverage(b) {
    const end = b.endAt != null && !hasBogusEnd(b) && b.duration ? tailFrom({ colors: b.colors, duration: b.duration, endAt: b.endAt }) ?? b.colors.length : b.colors.length;
    if (end === 0) return 0;
    let filled = 0;
    for (let i = 0; i < end; i++) if (b.colors[i]) filled++;
    return filled / end;
  }
  function isComplete(b) {
    return Boolean(b.completedAt) && !hasBogusEnd(b) || coverage(b) >= COMPLETE_THRESHOLD;
  }
  function displayColumns(b) {
    const n = b.colors.length;
    if (!isComplete(b) || n === 0) return { colors: b.colors, tail: tailFrom(b), scale: 1 };
    let end = tailFrom(b) ?? n;
    while (end > 0 && !b.colors[end - 1]) end--;
    if (end <= 0 || end >= n) return { colors: b.colors, tail: end >= n ? null : tailFrom(b), scale: 1 };
    return { colors: b.colors.slice(0, end), tail: null, scale: n / end };
  }
  var COMPLETE_THRESHOLD;
  var init_barcode_model = __esm({
    "lib/barcode/barcode-model.ts"() {
      COMPLETE_THRESHOLD = 0.99;
    }
  });

  // lib/barcode/barcode-sampler.ts
  var init_barcode_sampler = __esm({
    "lib/barcode/barcode-sampler.ts"() {
      "use strict";
      init_barcode_model();
    }
  });

  // lib/barcode/barcode-store.ts
  function profileParam() {
    return encodeURIComponent(getActiveProfileId() ?? "default");
  }
  function emit2() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(BARCODES_CHANGED_EVENT));
  }
  function resetBarcodeCache() {
    items.clear();
    dirty.clear();
    lastWrite.clear();
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    loadedFor2 = null;
    loading = null;
  }
  function loadBarcodes() {
    const profile = profileParam();
    if (loadedFor2 === profile) return Promise.resolve(listBarcodes());
    if (loadedFor2 !== null) resetBarcodeCache();
    if (loading) return loading;
    loading = (async () => {
      try {
        const response = await fetch(`/api/barcodes?profile=${profile}`);
        const data = response.ok ? await response.json() : { items: [] };
        for (const b of data.items ?? []) if (!items.has(b.id)) items.set(b.id, b);
      } catch {
      }
      loadedFor2 = profile;
      loading = null;
      emit2();
      return listBarcodes();
    })();
    return loading;
  }
  function listBarcodes() {
    return [...items.values()];
  }
  function getBarcode(id) {
    return items.get(id) ?? null;
  }
  function onBarcodesChanged(listener) {
    if (typeof window === "undefined") return () => {
    };
    const onProfile = () => {
      resetBarcodeCache();
      void loadBarcodes();
      listener();
    };
    window.addEventListener(BARCODES_CHANGED_EVENT, listener);
    window.addEventListener("lumio-profile-changed", onProfile);
    return () => {
      window.removeEventListener(BARCODES_CHANGED_EVENT, listener);
      window.removeEventListener("lumio-profile-changed", onProfile);
    };
  }
  var BARCODES_CHANGED_EVENT, items, loadedFor2, loading, dirty, lastWrite, timers;
  var init_barcode_store = __esm({
    "lib/barcode/barcode-store.ts"() {
      "use strict";
      init_profile_storage_shim();
      init_barcode_model();
      BARCODES_CHANGED_EVENT = "lumio-barcodes-changed";
      items = /* @__PURE__ */ new Map();
      loadedFor2 = null;
      loading = null;
      dirty = /* @__PURE__ */ new Set();
      lastWrite = /* @__PURE__ */ new Map();
      timers = /* @__PURE__ */ new Map();
    }
  });

  // lib/utils/fetch-client.ts
  var init_fetch_client = __esm({
    "lib/utils/fetch-client.ts"() {
    }
  });

  // lib/services/api-json-cache.ts
  var DEFAULT_TTL_MS;
  var init_api_json_cache = __esm({
    "lib/services/api-json-cache.ts"() {
      init_tv_focus_shim();
      init_plugin_sdk();
      init_fetch_client();
      DEFAULT_TTL_MS = 2 * 6e4;
    }
  });

  // lib/services/wiki-request-cache.ts
  var WIKI_TTL_MS;
  var init_wiki_request_cache = __esm({
    "lib/services/wiki-request-cache.ts"() {
      init_api_json_cache();
      WIKI_TTL_MS = 5 * 6e4;
    }
  });

  // lib/barcode/barcode-poster.ts
  var init_barcode_poster = __esm({
    "lib/barcode/barcode-poster.ts"() {
      "use strict";
      init_wiki_request_cache();
      init_i18n();
    }
  });

  // lib/barcode/barcode-meta.ts
  var chain;
  var init_barcode_meta = __esm({
    "lib/barcode/barcode-meta.ts"() {
      init_barcode_poster();
      init_barcode_store();
      chain = Promise.resolve();
    }
  });

  // lib/barcode/barcode-player-status.ts
  var init_barcode_player_status = __esm({
    "lib/barcode/barcode-player-status.ts"() {
      "use strict";
    }
  });

  // lib/barcode/use-barcode-recorder.ts
  var init_use_barcode_recorder = __esm({
    "lib/barcode/use-barcode-recorder.ts"() {
      init_react_shim();
      init_barcode_samplers();
      init_barcode_settings();
      init_barcode_id();
      init_barcode_sampler();
      init_barcode_store();
      init_barcode_meta();
      init_barcode_player_status();
    }
  });

  // lib/barcode/barcode-gradient.ts
  function pct(v) {
    return `${Number(v.toFixed(4))}%`;
  }
  function unseenColor(unseen, shape, i) {
    if (unseen === "dim") return DIM;
    if (unseen === "empty") return EMPTY;
    return shape === "ring" ? RING_HATCH[i % 2] : "transparent";
  }
  function barcodeBackground(colors, unseen, shape, tailFrom2 = null) {
    const n = colors.length;
    const underlay = unseen === "hatch" && shape !== "ring" ? HATCH_UNDERLAY : null;
    if (n === 0) return { background: EMPTY, underlay };
    const stops = [];
    let runColor = "";
    let runStart = 0;
    for (let i = 0; i <= n; i++) {
      const color = i < n ? colors[i] ?? (tailFrom2 != null && i >= tailFrom2 ? TAIL : unseenColor(unseen, shape, i)) : "";
      if (i === n || color !== runColor) {
        if (i > 0) stops.push(`${runColor} ${pct(runStart / n * 100)} ${pct(i / n * 100)}`);
        runColor = color;
        runStart = i;
      }
    }
    const head = shape === "ring" ? "conic-gradient(from 0deg," : `linear-gradient(${shape === "v" ? "180deg" : "90deg"},`;
    return { background: `${head}${stops.join(",")})`, underlay };
  }
  function cachedBarcodeBackground(key, colors, unseen, shape, tailFrom2 = null) {
    const hit = cache2.get(key);
    if (hit) return hit;
    const value = barcodeBackground(colors, unseen, shape, tailFrom2);
    if (cache2.size >= CACHE_MAX) cache2.delete(cache2.keys().next().value);
    cache2.set(key, value);
    return value;
  }
  var HATCH_UNDERLAY, DIM, EMPTY, TAIL, RING_HATCH, cache2, CACHE_MAX;
  var init_barcode_gradient = __esm({
    "lib/barcode/barcode-gradient.ts"() {
      HATCH_UNDERLAY = "repeating-linear-gradient(135deg,#1c1d23 0 3px,#111216 3px 7px)";
      DIM = "#1a1b22";
      EMPTY = "#141519";
      TAIL = "#0b0b0d";
      RING_HATCH = ["#1b1c22", "#111216"];
      cache2 = /* @__PURE__ */ new Map();
      CACHE_MAX = 400;
    }
  });

  // lib/barcode/barcode-library-model.ts
  function formatClock(seconds, withHours = seconds >= 3600) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor(s % 3600 / 60);
    const sec = s % 60;
    return withHours ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }
  var pad;
  var init_barcode_library_model = __esm({
    "lib/barcode/barcode-library-model.ts"() {
      init_barcode_model();
      init_i18n();
      pad = (n) => String(n).padStart(2, "0");
    }
  });

  // components/barcodes/barcode-strip.tsx
  function BarcodeStrip({ barcode, unseen, shape = "h", className = "", style, resumePct: rawResumePct, markerWidth = 2, children, onPointer, trimCredits = false }) {
    const shown = trimCredits && !onPointer ? displayColumns(barcode) : { colors: barcode.colors, tail: tailFrom(barcode), scale: 1 };
    const key = `${barcode.id}|${barcode.updatedAt}|${unseen}|${shape}|${shown.colors.length}`;
    const { background, underlay } = cachedBarcodeBackground(key, shown.colors, unseen, shape, shown.tail);
    const scaledResume = rawResumePct == null ? null : rawResumePct * shown.scale;
    const resumePct = scaledResume != null && scaledResume <= 1 ? scaledResume : null;
    const vertical = shape === "v";
    const pctOf = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const v = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
      return Math.min(1, Math.max(0, v));
    };
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: `relative overflow-hidden ${className}`,
        style: { ...style, background: underlay ?? void 0 },
        onPointerMove: onPointer ? (e) => onPointer.onMove(pctOf(e)) : void 0,
        onPointerLeave: onPointer ? () => onPointer.onMove(null) : void 0,
        onClick: onPointer ? (e) => onPointer.onPick(pctOf(e)) : void 0,
        children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0", style: { background } }),
          resumePct != null && /* @__PURE__ */ jsx(
            "div",
            {
              className: "pointer-events-none absolute bg-white",
              style: vertical ? { left: 0, right: 0, top: `calc(${resumePct * 100}% - ${markerWidth / 2}px)`, height: markerWidth } : { top: 0, bottom: 0, left: `calc(${resumePct * 100}% - ${markerWidth / 2}px)`, width: markerWidth }
            }
          ),
          children
        ]
      }
    );
  }
  var init_barcode_strip = __esm({
    "components/barcodes/barcode-strip.tsx"() {
      "use client";
      init_barcode_gradient();
      init_barcode_model();
      init_jsx_runtime_shim();
    }
  });

  // components/player/player-barcode-strip.tsx
  var CHIP_MS, PlayerBarcodeStrip;
  var init_player_barcode_strip = __esm({
    "components/player/player-barcode-strip.tsx"() {
      "use client";
      init_react_shim();
      init_i18n();
      init_barcode_model();
      init_barcode_gradient();
      init_barcode_settings();
      init_barcode_store();
      init_barcode_library_model();
      init_barcode_strip();
      init_jsx_runtime_shim();
      CHIP_MS = 5e3;
      PlayerBarcodeStrip = memo(function PlayerBarcodeStrip2({ state, duration, tv, hoverable }) {
        const { t } = useLang();
        const [barcode, setBarcode] = useState(() => state.id ? getBarcode(state.id) : null);
        const [unseen, setUnseen] = useState(() => getBarcodeSettings().unseenStyle);
        const [hover, setHover] = useState(null);
        const [chipUntil, setChipUntil] = useState(0);
        useEffect(() => {
          if (!state.id) return;
          const id = state.id;
          const read5 = () => setBarcode(getBarcode(id));
          read5();
          return onBarcodesChanged(read5);
        }, [state.id]);
        useEffect(() => onBarcodeSettingsChanged(() => setUnseen(getBarcodeSettings().unseenStyle)), []);
        useEffect(() => {
          if (!state.status) return;
          setChipUntil(Date.now() + CHIP_MS);
          const timer2 = setTimeout(() => setChipUntil(0), CHIP_MS);
          return () => clearTimeout(timer2);
        }, [state.status]);
        const shown = useMemo(() => {
          if (barcode) return barcode;
          if (!state.id || !state.recording) return null;
          const columns = getBarcodeSettings().columns;
          return { id: state.id, tmdbId: null, title: "", year: null, posterUrl: null, duration, columns, colors: new Array(columns).fill(null), updatedAt: "empty" };
        }, [barcode, state.id, state.recording, duration]);
        if (!state.showStrip || !shown) return null;
        const d = shown.duration > 0 ? shown.duration : duration;
        const hoverColor = hover != null ? shown.colors[columnIndex(hover * d, d, shown.columns)] : null;
        const chipText = state.status === "recording" ? t("barcodeRecording") : state.status === "paused" ? t("barcodePaused") : state.status === "off" ? t("barcodeOff") : null;
        const onMove = (e) => {
          if (!hoverable) return;
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
        };
        return /* @__PURE__ */ jsxs(
          "div",
          {
            "data-player-barcode-strip": "",
            className: `absolute inset-x-0 ${tv ? "bottom-[calc(100%+8px)] h-3" : "bottom-[calc(100%+6px)] h-2"}`,
            onPointerMove: onMove,
            onPointerLeave: () => setHover(null),
            children: [
              /* @__PURE__ */ jsx(BarcodeStrip, { barcode: shown, unseen, className: "h-full rounded-[2px]" }),
              chipText && chipUntil > 0 && /* @__PURE__ */ jsx("span", { className: "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[rgb(var(--player-accent)/0.40)] bg-black/60 px-[11px] py-[5px] text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--player-accent))]", children: chipText }),
              hover != null && d > 0 && /* @__PURE__ */ jsxs(Fragment2, { children: [
                /* @__PURE__ */ jsx("span", { className: "pointer-events-none absolute -bottom-[14px] w-px bg-white", style: { left: `${hover * 100}%`, top: 0 } }),
                /* @__PURE__ */ jsxs(
                  "span",
                  {
                    className: "pointer-events-none absolute bottom-[calc(100%+8px)] z-20 flex -translate-x-1/2 flex-col items-center gap-1",
                    style: { left: `clamp(65px, ${hover * 100}%, calc(100% - 65px))` },
                    children: [
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: "block h-14 w-[130px] rounded-[6px] border border-[rgba(233,233,237,.2)]",
                          style: hoverColor ? { background: `linear-gradient(180deg, color-mix(in srgb, ${hoverColor} 88%, white) 0%, ${hoverColor} 100%)`, backgroundColor: hoverColor } : { background: HATCH_UNDERLAY }
                        }
                      ),
                      /* @__PURE__ */ jsx("span", { className: "rounded-full bg-black/85 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white", children: formatClock(hover * d, d >= 3600) })
                    ]
                  }
                )
              ] })
            ]
          }
        );
      });
    }
  });

  // components/results/details-meta-row.tsx
  var init_details_meta_row = __esm({
    "components/results/details-meta-row.tsx"() {
      "use client";
      init_i18n();
      init_jsx_runtime_shim();
    }
  });

  // lib/core-streams/stream-utils.ts
  var SIZE_UNITS;
  var init_stream_utils = __esm({
    "lib/core-streams/stream-utils.ts"() {
      "use client";
      init_profile_storage_shim();
      SIZE_UNITS = {
        kb: 1e3,
        mb: 1e3 ** 2,
        gb: 1e3 ** 3,
        tb: 1e3 ** 4,
        kib: 1024,
        mib: 1024 ** 2,
        gib: 1024 ** 3,
        tib: 1024 ** 4
      };
    }
  });

  // lib/player-title-block.ts
  var init_player_title_block = __esm({
    "lib/player-title-block.ts"() {
      init_stream_utils();
      init_playback_settings();
    }
  });

  // lib/tv-shell/hero-text.ts
  var init_hero_text = __esm({
    "lib/tv-shell/hero-text.ts"() {
    }
  });

  // lib/player-title-meta.ts
  var init_player_title_meta = __esm({
    "lib/player-title-meta.ts"() {
      init_api_json_cache();
      init_rating_sources();
      init_hero_text();
      init_watchlist_item_cache();
    }
  });

  // components/player/player-title-block.tsx
  var CHIP_CLASS, FORMAT_CHIP_CLASS, LANGUAGE_CHIP_CLASS;
  var init_player_title_block2 = __esm({
    "components/player/player-title-block.tsx"() {
      "use client";
      init_react_shim();
      init_details_meta_row();
      init_i18n();
      init_player_title_block();
      init_player_title_meta();
      init_jsx_runtime_shim();
      CHIP_CLASS = "vp-chip inline-flex items-center gap-[0.35em] whitespace-nowrap rounded-md border px-2 py-0.5 text-xs leading-snug";
      FORMAT_CHIP_CLASS = `${CHIP_CLASS} border-white/[0.2] bg-black/35 font-semibold text-slate-100`;
      LANGUAGE_CHIP_CLASS = `${CHIP_CLASS} border-white/[0.14] bg-black/25 font-medium text-slate-300`;
    }
  });

  // lib/android-media-keys.ts
  var init_android_media_keys = __esm({
    "lib/android-media-keys.ts"() {
      "use client";
      init_key_hold();
    }
  });

  // lib/core-streams/lookup.ts
  var FRESH_SOURCE_MS;
  var init_lookup = __esm({
    "lib/core-streams/lookup.ts"() {
      "use client";
      init_core_addons();
      init_addon_url();
      init_plugin_sdk();
      init_async_utils();
      init_stream_utils();
      init_mode();
      FRESH_SOURCE_MS = 10 * 6e4;
    }
  });

  // lib/core-streams/prepare.ts
  var init_prepare = __esm({
    "lib/core-streams/prepare.ts"() {
      "use strict";
      init_filters();
      init_stream_utils();
    }
  });

  // lib/core-streams/playback.ts
  var SLATE_MIN_BYTES, DIRECT_START_MAX_AGE_MS;
  var init_playback = __esm({
    "lib/core-streams/playback.ts"() {
      "use client";
      init_profile_storage_shim();
      init_session_host();
      init_lookup();
      init_prepare();
      init_stream_utils();
      SLATE_MIN_BYTES = 256 * 1024;
      DIRECT_START_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1e3;
    }
  });

  // lib/resume-playback.ts
  var init_resume_playback = __esm({
    "lib/resume-playback.ts"() {
      init_timing();
      init_plugin_registry();
      init_android_direct_stream();
      init_session_host();
      init_playback_settings();
      init_stream_utils();
      init_playback();
    }
  });

  // lib/subtitle-autopick.ts
  var init_subtitle_autopick = __esm({
    "lib/subtitle-autopick.ts"() {
    }
  });

  // lib/trakt-scrobble.ts
  var init_trakt_scrobble = __esm({
    "lib/trakt-scrobble.ts"() {
      "use client";
      init_trakt_storage();
    }
  });

  // lib/scrobble-fanout.ts
  var init_scrobble_fanout = __esm({
    "lib/scrobble-fanout.ts"() {
      "use client";
      init_plugin_registry();
      init_plugin_state();
      init_trakt_scrobble();
    }
  });

  // lib/video-tuning.ts
  var init_video_tuning = __esm({
    "lib/video-tuning.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/audio-tuning.ts
  var init_audio_tuning = __esm({
    "lib/audio-tuning.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // components/player/player-tuning-panel.tsx
  var init_player_tuning_panel = __esm({
    "components/player/player-tuning-panel.tsx"() {
      "use client";
      init_react_shim();
      init_i18n();
      init_tv_focus_shim();
      init_video_tuning();
      init_audio_tuning();
      init_tauri_native_player();
      init_jsx_runtime_shim();
    }
  });

  // lib/haptics-filter.ts
  var init_haptics_filter = __esm({
    "lib/haptics-filter.ts"() {
    }
  });

  // lib/haptics-host.ts
  var init_haptics_host = __esm({
    "lib/haptics-host.ts"() {
      "use client";
      init_react_shim();
      init_app_storage();
    }
  });

  // lib/core-streams/source-groups.ts
  var init_source_groups = __esm({
    "lib/core-streams/source-groups.ts"() {
      init_stream_utils();
    }
  });

  // lib/core-streams/lighter-stream.ts
  var init_lighter_stream = __esm({
    "lib/core-streams/lighter-stream.ts"() {
      init_source_groups();
      init_stream_utils();
    }
  });

  // lib/player-menu-anchor.ts
  var init_player_menu_anchor = __esm({
    "lib/player-menu-anchor.ts"() {
    }
  });

  // lib/download-target.ts
  var import_core4;
  var init_download_target = __esm({
    "lib/download-target.ts"() {
      import_core4 = __toESM(require_core());
      init_tauri_mpv();
      init_tauri_native_player();
      init_playback_settings();
      init_session_host();
    }
  });

  // lib/vlc-deep-link.ts
  var init_vlc_deep_link = __esm({
    "lib/vlc-deep-link.ts"() {
      init_app_storage();
      init_platform_os();
    }
  });

  // lib/spotify-settings.ts
  var init_spotify_settings = __esm({
    "lib/spotify-settings.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/services/soundtrack-request-cache.ts
  var SOUNDTRACK_TTL_MS;
  var init_soundtrack_request_cache = __esm({
    "lib/services/soundtrack-request-cache.ts"() {
      init_fetch_client();
      init_spotify_settings();
      SOUNDTRACK_TTL_MS = 10 * 60 * 1e3;
    }
  });

  // lib/services/media-prefetch-cache.ts
  var PREFETCH_TTL_MS;
  var init_media_prefetch_cache = __esm({
    "lib/services/media-prefetch-cache.ts"() {
      init_fetch_client();
      init_wiki_request_cache();
      init_soundtrack_request_cache();
      init_api_json_cache();
      init_core_addons();
      PREFETCH_TTL_MS = 5 * 6e4;
    }
  });

  // lib/opensubtitles-settings.ts
  var init_opensubtitles_settings = __esm({
    "lib/opensubtitles-settings.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/opensubtitles/os-client.ts
  var init_os_client = __esm({
    "lib/opensubtitles/os-client.ts"() {
      init_opensubtitles_settings();
    }
  });

  // components/results/person-banner.tsx
  var init_person_banner = __esm({
    "components/results/person-banner.tsx"() {
      "use client";
      init_react_shim();
      init_tv_focus_shim();
      init_i18n();
      init_api_json_cache();
      init_fetch_client();
      init_jsx_runtime_shim();
    }
  });

  // components/results/person-sidebar-panel.tsx
  var init_person_sidebar_panel = __esm({
    "components/results/person-sidebar-panel.tsx"() {
      "use client";
      init_react_shim();
      init_person_banner();
      init_tv_focus_shim();
      init_i18n();
      init_jsx_runtime_shim();
    }
  });

  // components/player/player-wiki-panel.tsx
  var init_player_wiki_panel = __esm({
    "components/player/player-wiki-panel.tsx"() {
      "use client";
      init_react_shim();
      init_person_sidebar_panel();
      init_tv_focus_shim();
      init_fetch_client();
      init_wiki_request_cache();
      init_jsx_runtime_shim();
    }
  });

  // components/player/player-soundtrack-panel.tsx
  var init_player_soundtrack_panel = __esm({
    "components/player/player-soundtrack-panel.tsx"() {
      "use client";
      init_react_shim();
      init_tv_scene();
      init_i18n();
      init_tv_focus_shim();
      init_fetch_client();
      init_soundtrack_request_cache();
      init_jsx_runtime_shim();
    }
  });

  // components/player/player-episodes-panel.tsx
  var init_player_episodes_panel = __esm({
    "components/player/player-episodes-panel.tsx"() {
      "use client";
      init_react_shim();
      init_i18n();
      init_tv_focus_shim();
      init_jsx_runtime_shim();
    }
  });

  // components/player/player-streams-panel.tsx
  var init_player_streams_panel = __esm({
    "components/player/player-streams-panel.tsx"() {
      "use client";
      init_react_shim();
      init_i18n();
      init_tv_focus_shim();
      init_stream_utils();
      init_jsx_runtime_shim();
    }
  });

  // lib/couch/host-trakt.ts
  var init_host_trakt = __esm({
    "lib/couch/host-trakt.ts"() {
      "use strict";
      init_app_storage();
      init_profile_storage_shim();
    }
  });

  // lib/couch/sport-protocol.ts
  var init_sport_protocol = __esm({
    "lib/couch/sport-protocol.ts"() {
      "use strict";
    }
  });

  // lib/couch/host-bridge.ts
  var init_host_bridge = __esm({
    "lib/couch/host-bridge.ts"() {
      init_host_trakt();
      init_sport_protocol();
    }
  });

  // lib/couch/player-snapshot.ts
  var init_player_snapshot = __esm({
    "lib/couch/player-snapshot.ts"() {
      init_stream_utils();
      init_sleep_timer();
    }
  });

  // lib/homekit-client.ts
  var init_homekit_client = __esm({
    "lib/homekit-client.ts"() {
      "use client";
    }
  });

  // lib/continue-frame-capture.ts
  var init_continue_frame_capture = __esm({
    "lib/continue-frame-capture.ts"() {
      "use client";
      init_continue_frames();
      init_tauri_mpv();
      init_tauri_native_player();
    }
  });

  // lib/use-continue-frame-capture.ts
  var init_use_continue_frame_capture = __esm({
    "lib/use-continue-frame-capture.ts"() {
      "use client";
      init_react_shim();
      init_continue_frames();
      init_continue_frame_capture();
      init_tauri_native_player();
    }
  });

  // lib/playback/playback-session-client.ts
  var init_playback_session_client = __esm({
    "lib/playback/playback-session-client.ts"() {
      init_plugin_sdk();
    }
  });

  // lib/keyboard-shortcuts.ts
  var SHORTCUT_COMMANDS, DEFAULTS;
  var init_keyboard_shortcuts = __esm({
    "lib/keyboard-shortcuts.ts"() {
      init_profile_storage_shim();
      SHORTCUT_COMMANDS = [
        { id: "playPause", category: "player", defaultKey: " ", labelKey: "shortcutsPlayPause" },
        { id: "seekBack", category: "player", defaultKey: "ArrowLeft", labelKey: "shortcutsSeekBackward" },
        { id: "seekForward", category: "player", defaultKey: "ArrowRight", labelKey: "shortcutsSeekForward" },
        { id: "mute", category: "player", defaultKey: "m", labelKey: "shortcutsMute" },
        { id: "fullscreen", category: "player", defaultKey: "f", labelKey: "shortcutsToggleFullscreen" },
        { id: "saveMoment", category: "player", defaultKey: "b", labelKey: "shortcutsSaveMoment" },
        { id: "clip", category: "player", defaultKey: "c", labelKey: "shortcutsClip" },
        { id: "subtitleCycle", category: "tracks", defaultKey: "s", labelKey: "shortcutsSubtitleCycle" },
        { id: "secondarySubtitleCycle", category: "tracks", defaultKey: "d", labelKey: "shortcutsSecondarySubtitleCycle" },
        { id: "subtitleDelayBack", category: "tracks", defaultKey: "z", labelKey: "shortcutsSubtitleDelayBack" },
        { id: "subtitleDelayForward", category: "tracks", defaultKey: "x", labelKey: "shortcutsSubtitleDelayForward" },
        { id: "focusSearch", category: "global", defaultKey: "0", labelKey: "shortcutsGoToSearch" }
      ];
      DEFAULTS = SHORTCUT_COMMANDS.reduce(
        (acc, command) => ({ ...acc, [command.id]: command.defaultKey }),
        {}
      );
    }
  });

  // lib/player-reveal-hold.ts
  var CINEMA_REVEAL_HOLD_MAX_MS;
  var init_player_reveal_hold = __esm({
    "lib/player-reveal-hold.ts"() {
      CINEMA_REVEAL_HOLD_MAX_MS = 20 * 6e4;
    }
  });

  // lib/core-streams/start-watchdog.ts
  var SILENT_RELOAD_AFTER_AUDIO_MS, DEFAULT_START_BUDGETS;
  var init_start_watchdog = __esm({
    "lib/core-streams/start-watchdog.ts"() {
      SILENT_RELOAD_AFTER_AUDIO_MS = 3e3;
      DEFAULT_START_BUDGETS = { resolvingMs: 8e3, openingMs: 2e4, audioOnlyMs: SILENT_RELOAD_AFTER_AUDIO_MS + 4e3 };
    }
  });

  // lib/player-silent-start.ts
  var init_player_silent_start = __esm({
    "lib/player-silent-start.ts"() {
      init_start_watchdog();
    }
  });

  // components/player/credits-recommendations.tsx
  var COVER_W, COVER_H, COVER_OFFSET_X, COVER_OFFSET_Y, PIP_INSET, PIP_TOP;
  var init_credits_recommendations = __esm({
    "components/player/credits-recommendations.tsx"() {
      init_react_shim();
      init_i18n();
      init_jsx_runtime_shim();
      COVER_W = "max(100vw, 177.78vh)";
      COVER_H = "max(100vh, 56.25vw)";
      COVER_OFFSET_X = `calc((${COVER_W} - 100vw) / 2)`;
      COVER_OFFSET_Y = `calc((${COVER_H} - 100vh) / 2)`;
      PIP_INSET = "clamp(0.75rem, 2vw, 2rem)";
      PIP_TOP = `max(${PIP_INSET}, calc(env(safe-area-inset-top) + 0.5rem), calc(var(--android-inset-top, 0px) + 0.5rem))`;
    }
  });

  // lib/title-logo-cache.ts
  var LOGO_CACHE_TTL_MS, LOGO_NEGATIVE_CACHE_TTL_MS;
  var init_title_logo_cache = __esm({
    "lib/title-logo-cache.ts"() {
      LOGO_CACHE_TTL_MS = 12 * 60 * 60 * 1e3;
      LOGO_NEGATIVE_CACHE_TTL_MS = 45 * 1e3;
    }
  });

  // lib/gesture-settings.ts
  var init_gesture_settings = __esm({
    "lib/gesture-settings.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/lan-streaming-settings.ts
  var init_lan_streaming_settings = __esm({
    "lib/lan-streaming-settings.ts"() {
      "use client";
    }
  });

  // lib/subtitle-delay-store.ts
  var init_subtitle_delay_store = __esm({
    "lib/subtitle-delay-store.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/subtitle-sync/client.ts
  var init_client2 = __esm({
    "lib/subtitle-sync/client.ts"() {
    }
  });

  // lib/subtitle-sync/health.ts
  var init_health = __esm({
    "lib/subtitle-sync/health.ts"() {
    }
  });

  // lib/subtitle-sync/plan.ts
  var init_plan = __esm({
    "lib/subtitle-sync/plan.ts"() {
      "use strict";
      init_playback_settings();
    }
  });

  // lib/subtitle-sync/loop.ts
  var init_loop = __esm({
    "lib/subtitle-sync/loop.ts"() {
      init_plan();
    }
  });

  // lib/subtitle-sync/opt-out.ts
  var init_opt_out = __esm({
    "lib/subtitle-sync/opt-out.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/subtitle-sync/user-delay.ts
  var init_user_delay = __esm({
    "lib/subtitle-sync/user-delay.ts"() {
      init_plan();
    }
  });

  // lib/subtitle-sync/diag.ts
  var init_diag = __esm({
    "lib/subtitle-sync/diag.ts"() {
      init_plan();
      init_user_delay();
    }
  });

  // components/player/use-subtitle-auto-sync.ts
  var init_use_subtitle_auto_sync = __esm({
    "components/player/use-subtitle-auto-sync.ts"() {
      "use strict";
      init_react_shim();
      init_android_source_cache();
      init_subtitle_delay_store();
      init_playback_settings();
      init_client2();
      init_health();
      init_loop();
      init_plan();
      init_opt_out();
      init_user_delay();
      init_diag();
    }
  });

  // lib/subtitle-sync/other-edit.ts
  function createOwnTrackOffers() {
    const offered = /* @__PURE__ */ new Set();
    const choices = /* @__PURE__ */ new Map();
    const key = (file, subId) => `${file}|${subId}`;
    return {
      shouldOffer: (file, subId) => !offered.has(key(file, subId)),
      markOffered: (file, subId) => {
        offered.add(key(file, subId));
      },
      decide: (file, subId, choice) => {
        offered.add(key(file, subId));
        choices.set(key(file, subId), choice);
      },
      choice: (file, subId) => choices.get(key(file, subId)) ?? null
    };
  }
  var ownTrackOffers;
  var init_other_edit = __esm({
    "lib/subtitle-sync/other-edit.ts"() {
      init_plan();
      ownTrackOffers = createOwnTrackOffers();
    }
  });

  // components/player/use-embedded-track-languages.ts
  var init_use_embedded_track_languages = __esm({
    "components/player/use-embedded-track-languages.ts"() {
      "use strict";
      "use client";
      init_react_shim();
      init_client2();
      init_plan();
    }
  });

  // lib/subtitle-sync/mpv-swap.ts
  var init_mpv_swap = __esm({
    "lib/subtitle-sync/mpv-swap.ts"() {
    }
  });

  // lib/tauri-avplayer.ts
  var import_core5;
  var init_tauri_avplayer = __esm({
    "lib/tauri-avplayer.ts"() {
      "use client";
      import_core5 = __toESM(require_core());
      init_tauri_mpv();
      init_platform_os();
    }
  });

  // lib/binge-session.ts
  var init_binge_session = __esm({
    "lib/binge-session.ts"() {
      "use client";
    }
  });

  // lib/binge-runtime.ts
  var init_binge_runtime = __esm({
    "lib/binge-runtime.ts"() {
      "use client";
    }
  });

  // components/tv/sidebar-icons.tsx
  var PROVIDER_MENU_ICON_PATHS, SIDEBAR_ICON_PATHS;
  var init_sidebar_icons = __esm({
    "components/tv/sidebar-icons.tsx"() {
      "use client";
      PROVIDER_MENU_ICON_PATHS = {
        // Plex: vinkeln i en rundad ram, som märket.
        plex: "M4 3h5.5l6.5 9-6.5 9H4l6.5-9z"
      };
      SIDEBAR_ICON_PATHS = {
        // Blixt.
        zapp: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
        /*
            Shuffle — handoffens enda nyritade ikon, delad av chip-raden och TV-rälsen.
            Designen ger fem SEPARATA paths; här måste de rymmas i EN d-sträng.
        
            Den fjärde skrevs `m15 15 6 6` (relativ). Som eget element utgår den från
            origo, men som delpath nummer fyra skulle den räknas från föregående
            delpaths slutpunkt (16,21) och hamna utanför rutan. Därför absolut:
            M15 15L21 21 — samma streck, samma plats.
          */
        binge: "M16 3h5v5 M4 20 21 3 M21 16v5h-5 M15 15L21 21 M4 4l5 5",
        // Plex: samma märke som PROVIDER_MENU_ICON_PATHS, så railen och chip-raden
        // visar SAMMA form. Utan posten fick Plex en reservform ur teckensumman.
        plex: PROVIDER_MENU_ICON_PATHS.plex,
        // Mapp.
        my_files: "M3 7h6l2 2h10v10H3zM3 7V5h6l2 2",
        // Kurva uppåt.
        trending: "M3 17l6-6 4 4 8-8M21 7v5h-5",
        // Filmklappa.
        trailers: "M3 8h18v12H3zM3 8l2-4h14l-2 4M8 8l2-4M14 8l2-4",
        // Staplade rader (historik) med liten klocka i hörnet.
        recent_history: "M3 6h14M3 12h16M3 18h12M19 14a2 2 0 1 0 4 0a2 2 0 0 0-4 0M19 15v-1.5M19 16l1 1",
        // Vertikala streck (movie barcode).
        barcodes: "M4 5v14M7.5 5v14M10 5v14M13.5 5v14M16 5v14M20 5v14",
        // Filmrulle (Biokväll): yttre ring, fyra hål och navet. Delas av filmsidans
        // knapp, inställningssidan och TV-ytorna.
        cinema: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 6.4a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2M12 14.4a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2M6.4 12a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M14.4 12a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0",
        // Stjärna — bevakningslistan HETER stjärnlistan, så formen är dess egen och
        // inte en tillfällighet. Den ligger här i stället för att falla igenom till
        // reservformen nedan, som numera aldrig ger en stjärna.
        watchlist_star: "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z",
        // Boll — Sport som eget menyval (Live TV-pluginets sida `live-tv-sport`):
        // ring, femhörning i mitten och fem sömmar ut mot kanten.
        "live-tv-sport": "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8l3.8 2.76-1.45 4.47h-4.7L8.2 10.76zM12 8V3M15.8 10.76l4.75-1.54M14.35 15.23l2.94 4.04M9.65 15.23l-2.94 4.04M8.2 10.76 3.45 9.22"
      };
    }
  });

  // components/binge/binge-zap-button.tsx
  var init_binge_zap_button = __esm({
    "components/binge/binge-zap-button.tsx"() {
      "use client";
      init_react_shim();
      init_i18n();
      init_binge_session();
      init_binge_runtime();
      init_sidebar_icons();
      init_jsx_runtime_shim();
    }
  });

  // lib/series-locks.ts
  var init_series_locks = __esm({
    "lib/series-locks.ts"() {
      "use client";
      init_app_storage();
      init_profile_storage_shim();
    }
  });

  // lib/series-lock-gate.ts
  var init_series_lock_gate = __esm({
    "lib/series-lock-gate.ts"() {
    }
  });

  // lib/series-lock-runtime.ts
  var init_series_lock_runtime = __esm({
    "lib/series-lock-runtime.ts"() {
      "use client";
      init_react_shim();
      init_app_storage();
      init_profile_storage_shim();
      init_watched_episodes();
      init_series_locks();
      init_series_lock_gate();
    }
  });

  // lib/player-status-line.ts
  var init_player_status_line = __esm({
    "lib/player-status-line.ts"() {
    }
  });

  // lib/moment-link.ts
  var init_moment_link = __esm({
    "lib/moment-link.ts"() {
    }
  });

  // components/player/clip/clip-share-button.tsx
  var init_clip_share_button = __esm({
    "components/player/clip/clip-share-button.tsx"() {
      "use client";
      init_react_shim();
      init_player_control_icons();
      init_jsx_runtime_shim();
    }
  });

  // lib/clip/clip-state.ts
  var init_clip_state = __esm({
    "lib/clip/clip-state.ts"() {
    }
  });

  // components/player/clip/clip-panel.tsx
  var init_clip_panel = __esm({
    "components/player/clip/clip-panel.tsx"() {
      "use client";
      init_clip_share_button();
      init_player_control_icons();
      init_clip_state();
      init_jsx_runtime_shim();
    }
  });

  // components/player/clip/clip-trimmer.tsx
  var init_clip_trimmer = __esm({
    "components/player/clip/clip-trimmer.tsx"() {
      "use client";
      init_react_shim();
      init_clip_state();
      init_jsx_runtime_shim();
    }
  });

  // lib/clip/clip-loop.ts
  var init_clip_loop = __esm({
    "lib/clip/clip-loop.ts"() {
    }
  });

  // components/player/clip/clip-phone-panels.tsx
  var init_clip_phone_panels = __esm({
    "components/player/clip/clip-phone-panels.tsx"() {
      "use client";
      init_clip_panel();
      init_clip_share_button();
      init_player_control_icons();
      init_clip_state();
      init_jsx_runtime_shim();
    }
  });

  // components/player/clip/clip-tv-panel.tsx
  var init_clip_tv_panel = __esm({
    "components/player/clip/clip-tv-panel.tsx"() {
      "use client";
      init_esm();
      init_clip_panel();
      init_player_control_icons();
      init_clip_state();
      init_jsx_runtime_shim();
    }
  });

  // lib/clip/clip-offer.ts
  var init_clip_offer = __esm({
    "lib/clip/clip-offer.ts"() {
      init_tauri_mpv();
    }
  });

  // lib/couch/host-api.ts
  var init_host_api = __esm({
    "lib/couch/host-api.ts"() {
      init_i18n();
    }
  });

  // lib/device-transfer.ts
  var init_device_transfer = __esm({
    "lib/device-transfer.ts"() {
      "use client";
      init_app_storage();
      init_platform_os();
    }
  });

  // lib/clip/clip-export.ts
  var init_clip_export = __esm({
    "lib/clip/clip-export.ts"() {
      "use client";
      init_tauri_mpv();
      init_tauri_native_player();
    }
  });

  // lib/player-chapters.ts
  var init_player_chapters = __esm({
    "lib/player-chapters.ts"() {
      init_i18n();
    }
  });

  // lib/player-moments.ts
  var init_player_moments = __esm({
    "lib/player-moments.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/debug-log-queue.ts
  var init_debug_log_queue = __esm({
    "lib/debug-log-queue.ts"() {
      "use client";
    }
  });

  // components/player/video-player-modal.tsx
  var import_react_dom2, import_core6, import_window2;
  var init_video_player_modal = __esm({
    "components/player/video-player-modal.tsx"() {
      "use strict";
      "use client";
      init_player_control_icons();
      init_trickplay_identity();
      init_playback_settings();
      init_playback_settings();
      init_playback_settings();
      init_subtitle_legibility();
      init_dual_subtitles();
      init_playback_speed_store();
      init_react_shim();
      init_timing();
      import_react_dom2 = __toESM(require_react_dom());
      import_core6 = __toESM(require_core());
      import_window2 = __toESM(require_window());
      init_transparent_webview();
      init_platform_os();
      init_window_controls();
      init_video_progress();
      init_recorder();
      init_profile_storage_shim();
      init_profile_avatar();
      init_sleep_timer();
      init_player_open();
      init_use_barcode_recorder();
      init_barcode_settings();
      init_player_barcode_strip();
      init_player_title_block2();
      init_player_title_block();
      init_tauri_native_player();
      init_playback_settings();
      init_android_media_keys();
      init_resume_playback();
      init_subtitle_autopick();
      init_watched_episodes();
      init_watched_movies();
      init_scrobble_fanout();
      init_player_layout();
      init_player_tuning_panel();
      init_video_tuning();
      init_audio_tuning();
      init_haptics_filter();
      init_haptics_host();
      init_playback_settings();
      init_scroll_lock();
      init_i18n();
      init_lighter_stream();
      init_stream_utils();
      init_tv_focus_shim();
      init_tv_scene();
      init_player_menu_anchor();
      init_download_target();
      init_session_host();
      init_pip();
      init_vlc_deep_link();
      init_fetch_client();
      init_wiki_request_cache();
      init_media_prefetch_cache();
      init_os_client();
      init_player_wiki_panel();
      init_player_soundtrack_panel();
      init_player_episodes_panel();
      init_player_streams_panel();
      init_host_bridge();
      init_player_snapshot();
      init_homekit_client();
      init_plugin_sdk();
      init_use_continue_frame_capture();
      init_playback_session_client();
      init_playback_settings();
      init_keyboard_shortcuts();
      init_playback_settings();
      init_autoplay_settings();
      init_player_reveal_hold();
      init_player_silent_start();
      init_credits_recommendations();
      init_ids();
      init_title_logo_cache();
      init_open_item_runtime();
      init_gesture_settings();
      init_tauri_native_player();
      init_playback_settings();
      init_lan_streaming_settings();
      init_use_subtitle_auto_sync();
      init_other_edit();
      init_use_embedded_track_languages();
      init_subtitle_delay_store();
      init_user_delay();
      init_diag();
      init_mpv_swap();
      init_tauri_mpv();
      init_tauri_native_player();
      init_tauri_avplayer();
      init_app_storage();
      init_binge_zap_button();
      init_series_lock_runtime();
      init_player_status_line();
      init_moment_link();
      init_clip_panel();
      init_clip_trimmer();
      init_clip_state();
      init_key_hold();
      init_clip_loop();
      init_clip_phone_panels();
      init_clip_tv_panel();
      init_clip_offer();
      init_host_api();
      init_device_transfer();
      init_tauri_native_player();
      init_clip_export();
      init_player_chapters();
      init_player_moments();
      init_debug_log_queue();
      init_jsx_runtime_shim();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/video-player-modal-shim.ts
  var init_video_player_modal_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/video-player-modal-shim.ts"() {
      init_react_shim();
      init_video_player_modal();
    }
  });

  // lib/stremio/addons-storage.ts
  var init_addons_storage = __esm({
    "lib/stremio/addons-storage.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/stremio/manifest.ts
  var init_manifest = __esm({
    "lib/stremio/manifest.ts"() {
    }
  });

  // lib/stremio/install-addon.ts
  var init_install_addon = __esm({
    "lib/stremio/install-addon.ts"() {
      init_core_addons();
      init_addons_storage();
      init_manifest();
    }
  });

  // lib/stremio/addon-inbox.ts
  var init_addon_inbox = __esm({
    "lib/stremio/addon-inbox.ts"() {
      init_install_addon();
    }
  });

  // components/tv/tv-auto-stations.tsx
  var init_tv_auto_stations = __esm({
    "components/tv/tv-auto-stations.tsx"() {
      "use client";
      init_react_shim();
      init_jsx_runtime_shim();
    }
  });

  // lib/tv-metrics.ts
  var tvBox, TV_SETTINGS_SIDE_TEXT_COL_PX, TV_SETTINGS_SIDE_PAD_LEFT_PX, TV_SETTINGS_SIDE_PAD_RIGHT_PX, TV_SETTINGS_SIDE_LIST_PX;
  var init_tv_metrics = __esm({
    "lib/tv-metrics.ts"() {
      tvBox = (px) => `calc(${px}px * var(--ui-scale, 1))`;
      TV_SETTINGS_SIDE_TEXT_COL_PX = 416;
      TV_SETTINGS_SIDE_PAD_LEFT_PX = 40;
      TV_SETTINGS_SIDE_PAD_RIGHT_PX = 36;
      TV_SETTINGS_SIDE_LIST_PX = TV_SETTINGS_SIDE_TEXT_COL_PX + TV_SETTINGS_SIDE_PAD_LEFT_PX + TV_SETTINGS_SIDE_PAD_RIGHT_PX;
    }
  });

  // lib/tv-tab-heading.tsx
  var TvTabHeadingContext;
  var init_tv_tab_heading = __esm({
    "lib/tv-tab-heading.tsx"() {
      "use client";
      init_react_shim();
      init_jsx_runtime_shim();
      TvTabHeadingContext = createContext(null);
    }
  });

  // lib/settings-heading.ts
  var init_settings_heading = __esm({
    "lib/settings-heading.ts"() {
      "use client";
    }
  });

  // components/settings/redesigned/primitives.tsx
  function Icon({
    name,
    size = 18,
    color,
    style,
    fill: fill3
  }) {
    const path = ICON_PATHS[name];
    if (!path) return null;
    return /* @__PURE__ */ jsx(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: fill3 || "none",
        stroke: color || "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        style,
        "aria-hidden": "true",
        children: path
      }
    );
  }
  function Switch({
    checked,
    onChange,
    disabled
  }) {
    return /* @__PURE__ */ jsx(
      "span",
      {
        role: "switch",
        "aria-checked": checked,
        onClick: () => !disabled && onChange && onChange(!checked),
        style: {
          display: "inline-flex",
          alignItems: "center",
          width: 36,
          height: 22,
          borderRadius: 999,
          background: checked ? TOKENS.accent : TOKENS.surface3,
          padding: 2,
          cursor: disabled ? "default" : "pointer",
          transition: "background .15s ease",
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1
        },
        children: /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#fff",
              transform: `translateX(${checked ? 14 : 0}px)`,
              transition: "transform .15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,.4)"
            }
          }
        )
      }
    );
  }
  function PillBtn({
    children,
    onClick,
    variant = "ghost",
    size = "md",
    disabled,
    icon,
    type,
    style,
    title
  }) {
    const sizes = {
      sm: { padding: "6px 10px", fontSize: TYPE.small },
      md: { padding: "9px 14px", fontSize: TYPE.body },
      lg: { padding: "11px 18px", fontSize: TYPE.body }
    };
    const variants = {
      ghost: {
        background: "transparent",
        border: `1px solid ${TOKENS.borderStrong}`,
        color: TOKENS.text
      },
      primary: {
        background: TOKENS.orange,
        border: `1px solid ${TOKENS.orange}`,
        color: "#1A0E07",
        fontWeight: 600
      },
      accent: {
        background: TOKENS.accentSoft,
        border: `1px solid ${TOKENS.accent}`,
        color: "#fff"
      },
      danger: {
        background: "transparent",
        border: `1px solid rgba(255,90,106,.4)`,
        color: TOKENS.red
      }
    };
    return /* @__PURE__ */ jsxs(
      "button",
      {
        type: type || "button",
        onClick,
        disabled,
        title,
        style: {
          ...sizes[size],
          ...variants[variant],
          borderRadius: 8,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: variants[variant].fontWeight || 500,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          transition: "transform .08s, filter .12s",
          ...style
        },
        onMouseDown: (e) => {
          if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
        },
        onMouseUp: (e) => {
          ;
          e.currentTarget.style.transform = "scale(1)";
        },
        onMouseLeave: (e) => {
          ;
          e.currentTarget.style.transform = "scale(1)";
        },
        children: [
          icon ? /* @__PURE__ */ jsx(Icon, { name: icon, size: 14 }) : null,
          children
        ]
      }
    );
  }
  function Card({
    children,
    padding = 16,
    style
  }) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          background: "var(--st-box)",
          borderRadius: 10,
          padding,
          marginBottom: 10,
          ...style
        },
        children
      }
    );
  }
  var import_react_dom3, TOKENS, TYPE, inputStyle, monoFont, eyebrowStyle, ICON_PATHS;
  var init_primitives = __esm({
    "components/settings/redesigned/primitives.tsx"() {
      "use client";
      init_react_shim();
      init_tv_tab_heading();
      init_settings_heading();
      import_react_dom3 = __toESM(require_react_dom());
      init_jsx_runtime_shim();
      TOKENS = {
        bg: "var(--tk-bg)",
        surface0: "var(--tk-surface0)",
        surface1: "var(--tk-surface1)",
        surface2: "var(--tk-surface2)",
        surface3: "var(--tk-surface3)",
        border: "var(--tk-border)",
        borderStrong: "var(--tk-border-strong)",
        text: "#EAEEF6",
        textDim: "#9AA5BC",
        textMute: "#6B7691",
        accent: "var(--color-accent)",
        accentSoft: "rgb(var(--accent-500) / 0.22)",
        mint: "#3CD6A3",
        orange: "#FF8B5A",
        red: "#FF5A6A",
        cyan: "#5FD3E8",
        warn: "#F3C969"
      };
      TYPE = {
        /** Sifferbrickor och räknare. */
        micro: "var(--st-micro)",
        /** ÅTGÄRD/KLART, eyebrow, versala etiketter. */
        label: "var(--st-label)",
        /** Hjälptext under en rad. */
        small: "var(--st-small)",
        /** Radtitlar, länkar, fältvärden — skalans mittpunkt. */
        body: "var(--st-body)",
        /** Korttitel. */
        h3: "var(--st-h3)",
        /** Sektionsrubrik. */
        h2: "var(--st-h2)",
        /** Sidrubrik. */
        h1: "var(--st-h1)"
      };
      inputStyle = {
        width: "100%",
        minHeight: 44,
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${TOKENS.border}`,
        background: TOKENS.surface0,
        color: TOKENS.text,
        fontSize: TYPE.body,
        outline: "none",
        boxSizing: "border-box"
      };
      monoFont = "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      eyebrowStyle = {
        fontSize: TYPE.label,
        fontWeight: 600,
        letterSpacing: "0.14em",
        color: TOKENS.textMute,
        textTransform: "uppercase"
      };
      ICON_PATHS = {
        sparkle: /* @__PURE__ */ jsx(Fragment2, { children: /* @__PURE__ */ jsx("path", { d: "M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" }) }),
        database: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("ellipse", { cx: "12", cy: "5.5", rx: "7.5", ry: "2.5" }),
          /* @__PURE__ */ jsx("path", { d: "M4.5 5.5v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-6" }),
          /* @__PURE__ */ jsx("path", { d: "M4.5 11.5v6c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-6" })
        ] }),
        layers: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("path", { d: "M12 3 3 8l9 5 9-5-9-5z" }),
          /* @__PURE__ */ jsx("path", { d: "M3 13l9 5 9-5" }),
          /* @__PURE__ */ jsx("path", { d: "M3 18l9 5 9-5" })
        ] }),
        plug: /* @__PURE__ */ jsx(Fragment2, { children: /* @__PURE__ */ jsx("path", { d: "M9 2v4M15 2v4M7 6h10v6a5 5 0 0 1-10 0V6zM12 17v5" }) }),
        close: /* @__PURE__ */ jsx(Fragment2, { children: /* @__PURE__ */ jsx("path", { d: "M6 6l12 12M18 6 6 18" }) }),
        search: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "6.5" }),
          /* @__PURE__ */ jsx("path", { d: "m20 20-4-4" })
        ] }),
        chevDown: /* @__PURE__ */ jsx("path", { d: "M6 9l6 6 6-6" }),
        chevUp: /* @__PURE__ */ jsx("path", { d: "M6 15l6-6 6 6" }),
        chevRight: /* @__PURE__ */ jsx("path", { d: "M9 6l6 6-6 6" }),
        drag: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "9", cy: "6", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ jsx("circle", { cx: "9", cy: "12", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ jsx("circle", { cx: "9", cy: "18", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ jsx("circle", { cx: "15", cy: "6", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ jsx("circle", { cx: "15", cy: "12", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ jsx("circle", { cx: "15", cy: "18", r: "1", fill: "currentColor" })
        ] }),
        plus: /* @__PURE__ */ jsx("path", { d: "M12 5v14M5 12h14" }),
        check: /* @__PURE__ */ jsx("path", { d: "M5 13l4 4L19 7" }),
        image: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
          /* @__PURE__ */ jsx("circle", { cx: "9", cy: "10", r: "1.6" }),
          /* @__PURE__ */ jsx("path", { d: "m3 17 5-5 5 5 3-3 5 5" })
        ] }),
        film: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
          /* @__PURE__ */ jsx("path", { d: "M7 4v16M17 4v16M3 9h4M3 14h4M17 9h4M17 14h4" })
        ] }),
        tv: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "13", rx: "2" }),
          /* @__PURE__ */ jsx("path", { d: "M8 21h8M12 18v3" })
        ] }),
        list: /* @__PURE__ */ jsx(Fragment2, { children: /* @__PURE__ */ jsx("path", { d: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" }) }),
        star: /* @__PURE__ */ jsx("path", { d: "M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.9L12 16.6 6.8 19.3l1-5.9L3.5 9.2l5.9-.9L12 3z" }),
        trending: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("path", { d: "M3 17l6-6 4 4 8-8" }),
          /* @__PURE__ */ jsx("path", { d: "M14 7h7v7" })
        ] }),
        clock: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
          /* @__PURE__ */ jsx("path", { d: "M12 7v5l3 2" })
        ] }),
        folder: /* @__PURE__ */ jsx("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" }),
        history: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("path", { d: "M3 12a9 9 0 1 0 3-6.7L3 8" }),
          /* @__PURE__ */ jsx("path", { d: "M3 3v5h5M12 8v5l3 2" })
        ] }),
        zap: /* @__PURE__ */ jsx("path", { d: "M13 2 4 14h7l-1 8 9-12h-7l1-8z" }),
        youtube: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "2.5", y: "6", width: "19", height: "12", rx: "3" }),
          /* @__PURE__ */ jsx("path", { d: "M10.5 9.5v5l4-2.5z", fill: "currentColor", stroke: "none" })
        ] }),
        cog: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3" }),
          /* @__PURE__ */ jsx("path", { d: "M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" })
        ] }),
        upload: /* @__PURE__ */ jsx("path", { d: "M12 16V4M6 10l6-6 6 6M4 20h16" }),
        refresh: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("path", { d: "M3 12a9 9 0 0 1 15.5-6.3L21 8" }),
          /* @__PURE__ */ jsx("path", { d: "M21 3v5h-5" }),
          /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 0 1-15.5 6.3L3 16" }),
          /* @__PURE__ */ jsx("path", { d: "M3 21v-5h5" })
        ] }),
        globe: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
          /* @__PURE__ */ jsx("path", { d: "M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" })
        ] }),
        calendar: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }),
          /* @__PURE__ */ jsx("path", { d: "M3 9h18M8 3v4M16 3v4" })
        ] }),
        eye: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" }),
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3" })
        ] }),
        bookmark: /* @__PURE__ */ jsx("path", { d: "M6 4h12v17l-6-3.5L6 21z" }),
        award: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "9", r: "6" }),
          /* @__PURE__ */ jsx("path", { d: "m8.5 14-1.5 7 5-2.5L17 21l-1.5-7" })
        ] }),
        grid: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
          /* @__PURE__ */ jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
          /* @__PURE__ */ jsx("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
          /* @__PURE__ */ jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" })
        ] }),
        carousel: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "6", y: "6", width: "12", height: "12", rx: "1.5" }),
          /* @__PURE__ */ jsx("path", { d: "M3 8v8M21 8v8" })
        ] }),
        rows: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "4", rx: "1" }),
          /* @__PURE__ */ jsx("rect", { x: "3", y: "11", width: "18", height: "2", rx: "1" }),
          /* @__PURE__ */ jsx("rect", { x: "3", y: "15", width: "18", height: "4", rx: "1" })
        ] }),
        showcase: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "3", y: "6", width: "9", height: "12", rx: "1.5" }),
          /* @__PURE__ */ jsx("rect", { x: "14", y: "6", width: "3", height: "5", rx: "0.7" }),
          /* @__PURE__ */ jsx("rect", { x: "18", y: "6", width: "3", height: "5", rx: "0.7" }),
          /* @__PURE__ */ jsx("rect", { x: "14", y: "13", width: "3", height: "5", rx: "0.7" }),
          /* @__PURE__ */ jsx("rect", { x: "18", y: "13", width: "3", height: "5", rx: "0.7" })
        ] }),
        play: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
          /* @__PURE__ */ jsx("path", { d: "M10 8l6 4-6 4z", fill: "currentColor", stroke: "none" })
        ] }),
        trash: /* @__PURE__ */ jsx("path", { d: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" }),
        user: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "8", r: "3.5" }),
          /* @__PURE__ */ jsx("path", { d: "M4.5 20a7.5 7.5 0 0 1 15 0" })
        ] }),
        keyboard: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "2.5", y: "6", width: "19", height: "12", rx: "2" }),
          /* @__PURE__ */ jsx("path", { d: "M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12" })
        ] }),
        warning: /* @__PURE__ */ jsx("path", { d: "M10.3 3.86l-8.61 14.92A2 2 0 0 0 3.44 22h17.12a2 2 0 0 0 1.74-3.22L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" }),
        copy: /* @__PURE__ */ jsxs(Fragment2, { children: [
          /* @__PURE__ */ jsx("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2" }),
          /* @__PURE__ */ jsx("path", { d: "M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" })
        ] })
      };
    }
  });

  // lib/tv-keyboard-settings.ts
  var init_tv_keyboard_settings = __esm({
    "lib/tv-keyboard-settings.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // lib/tv-hint-mode.ts
  var init_tv_hint_mode = __esm({
    "lib/tv-hint-mode.ts"() {
      "use client";
      init_profile_storage_shim();
    }
  });

  // components/tv/tv-settings-rows.tsx
  var TV, ROW_STYLE;
  var init_tv_settings_rows = __esm({
    "components/tv/tv-settings-rows.tsx"() {
      "use client";
      init_esm();
      init_addon_inbox();
      init_react_shim();
      init_tv_auto_stations();
      init_tv_metrics();
      init_primitives();
      init_tv_keyboard_settings();
      init_tv_hint_mode();
      init_i18n();
      init_jsx_runtime_shim();
      TV = {
        bg: "#161826",
        surface: "#232532",
        text: "#e9e9ed",
        accent: "var(--color-accent)",
        accent100: "var(--color-accent-100)",
        accent200: "var(--color-accent-200)",
        accent300: "var(--color-accent-300)",
        accent700: "var(--color-accent-700)",
        accent800: "var(--color-accent-800)",
        accent900: "var(--color-accent-900)",
        neutral100: "#f3f5fe",
        neutral300: "#cfd3e5",
        neutral400: "#b2b6ca",
        neutral500: "#9397ab",
        neutral600: "#75798c",
        neutral700: "#595d6c",
        neutral800: "#3f424d",
        neutral900: "#292b31",
        /** Sidlistans grund: en ton mörkare än innehållet, så kolumnerna skiljs utan linje. */
        sideBg: "#12131e",
        /** Segmenthylsans botten — samma ton som sidlistan. */
        segTrack: "#12131e",
        danger: "#e0776a",
        dotDone: "#57c08a",
        dotAction: "#e0b060",
        shadowLg: "0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65)"
      };
      ROW_STYLE = {
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: `${tvBox(22)} ${tvBox(30)}`,
        /* 52 → 64 → 84. Höjden följer titeln (nu 30 px): en rad som inte växer med
           texten ser trängd ut på tre meters håll. minHeight, inte height — texten
           får ta mer plats om textstorleken skruvas upp. */
        minHeight: tvBox(84),
        borderRadius: 10,
        background: TV.neutral900,
        border: `1px solid ${TV.neutral800}`,
        cursor: "pointer",
        width: "100%",
        textAlign: "left"
      };
    }
  });

  // components/results/full-cast-page.tsx
  var init_full_cast_page = __esm({
    "components/results/full-cast-page.tsx"() {
      "use strict";
      "use client";
      init_react_shim();
      init_i18n();
      init_tv_focus_shim();
      init_wiki_request_cache();
      init_api_json_cache();
      init_person_banner();
      init_tv_settings_rows();
      init_jsx_runtime_shim();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/full-cast-page-shim.ts
  var init_full_cast_page_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/full-cast-page-shim.ts"() {
      init_react_shim();
      init_full_cast_page();
    }
  });

  // lib/spoilers.ts
  var init_spoilers = __esm({
    "lib/spoilers.ts"() {
    }
  });

  // components/series-lock/copy.ts
  var init_copy = __esm({
    "components/series-lock/copy.ts"() {
      "use client";
      init_react_shim();
      init_profile_storage_shim();
    }
  });

  // components/player/next-episode-card.tsx
  var init_next_episode_card = __esm({
    "components/player/next-episode-card.tsx"() {
      "use strict";
      "use client";
      init_react_shim();
      init_i18n();
      init_tv_focus_shim();
      init_autoplay_settings();
      init_spoiler_settings();
      init_spoilers();
      init_profile_storage_shim();
      init_profile_avatar();
      init_copy();
      init_jsx_runtime_shim();
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/next-episode-card-shim.ts
  var init_next_episode_card_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/next-episode-card-shim.ts"() {
      init_react_shim();
      init_next_episode_card();
    }
  });

  // lib/plugin-sdk.ts
  function waitForStartIdle2() {
    const host = typeof window !== "undefined" ? window.__lumioPluginRuntime?.sdk?.waitForStartIdle : void 0;
    return host ? host() : waitForStartIdle();
  }
  function canImportPlaybackPositions() {
    return typeof window !== "undefined" && typeof window.__lumioPluginRuntime?.sdk?.importPlaybackPositions === "function";
  }
  function importPlaybackPositions(source, items2) {
    const host = typeof window !== "undefined" ? window.__lumioPluginRuntime?.sdk?.importPlaybackPositions : void 0;
    return host ? host(source, items2) : null;
  }
  function resolvePluginText(text, lang) {
    if (typeof text === "string") return text;
    return text[lang] ?? text[baseLang(lang)] ?? text.en ?? text.sv ?? "";
  }
  var init_plugin_sdk = __esm({
    "lib/plugin-sdk.ts"() {
      init_tauri_mpv();
      init_i18n();
      init_platform_os();
      init_timing();
      init_profile_storage_shim();
      init_i18n();
      init_tv_focus_shim();
      init_pip();
      init_plugin_registry();
      init_client();
      init_mode();
      init_profile_storage_shim();
      init_tv_scene();
      init_scan();
      init_tv_scene_box();
      init_tv_focus_shim();
      init_tv_hold();
      init_tv_hold();
      init_tv_hold();
      init_tv_scene();
      init_appearance_settings();
      init_plugin_storage();
      init_plugin_assets();
      init_home_background_settings();
      init_home_override_settings();
      init_trakt_storage();
      init_trakt_sync();
      init_trakt_watchlist_limit();
      init_watchlist();
      init_movie_watchlist();
      init_watchlist_merge();
      init_mutation_source();
      init_rating_sources();
      init_open_external();
      init_esm();
      init_playback_start_gate();
      init_watchlist_auto_remove();
      init_trakt_device_login();
      init_playback_settings();
      init_series_watchlist_feed();
      init_watched_movies();
      init_release_watchlist_feed();
      init_filter_media();
      init_languages();
      init_results_loading_indicator();
      init_results_state();
      init_results_pagination();
      init_simple_pagination();
      init_auth_capabilities_shim();
      init_tauri_mpv();
      init_tauri_native_player();
      init_video_surfaces_shim();
      init_scroll_lock();
      init_watched_episodes();
      init_autoplay_settings();
      init_zapp_settings();
      init_zapp_runtime();
      init_open_item_runtime();
      init_video_player_modal_shim();
      init_full_cast_page_shim();
      init_next_episode_card_shim();
      init_plugin_hls();
      init_primitives();
      init_player_frame_id();
      init_playback_settings();
    }
  });

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/index.ts
  var runtime_exports = {};
  __export(runtime_exports, {
    MdblistPlugin: () => MdblistPlugin
  });
  init_react_shim();
  init_plugin_sdk();

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/host.ts
  init_plugin_sdk();

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/api.ts
  var PROXY = "/api/plugins/mdblist/call";
  var DEFAULT_PAUSE_S = 60;
  var MAX_PAGES = 50;
  function createMdblistApi(deps) {
    let pausedUntil = 0;
    async function call(method, path, opts) {
      const now = deps.now();
      if (now < pausedUntil) {
        return { ok: false, status: 429, retryAfter: Math.ceil((pausedUntil - now) / 1e3), error: "paused" };
      }
      const auth = await deps.getAuth();
      if (!auth) return { ok: false, status: 0, retryAfter: null, error: "not connected" };
      const payload = { ...auth, method, path };
      if (opts?.query) payload.query = opts.query;
      if (opts?.body !== void 0) payload.body = opts.body;
      try {
        const response = await deps.fetchImpl(PROXY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json().catch(() => null);
        if (response.ok) return { ok: true, data: json?.data ?? null };
        const retryAfter = typeof json?.retryAfter === "number" ? json.retryAfter : null;
        if (response.status === 429) {
          pausedUntil = deps.now() + (retryAfter ?? DEFAULT_PAUSE_S) * 1e3;
          deps.onPause?.(pausedUntil);
          deps.log(`429 p\xE5 ${method} ${path} \u2014 pausar MDBList i ${retryAfter ?? DEFAULT_PAUSE_S} s`);
        } else {
          deps.log(`${method} ${path}: HTTP ${response.status} ${json?.error ?? ""}`.trim());
        }
        return { ok: false, status: response.status, retryAfter, error: json?.error ?? `HTTP ${response.status}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        deps.log(`${method} ${path}: n\xE4tverksfel \u2014 ${message}`);
        return { ok: false, status: 0, retryAfter: null, error: message };
      }
    }
    async function getAllPages(path, query = {}) {
      const merged = {};
      let next = {};
      let complete = false;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await call("GET", path, { query: { ...query, ...next } });
        if (!result.ok) return result;
        const data = result.data;
        if (Array.isArray(data)) {
          ;
          (merged.items ?? (merged.items = [])).push(...data);
          complete = true;
          break;
        }
        if (!data || typeof data !== "object") {
          complete = true;
          break;
        }
        for (const [key, value] of Object.entries(data)) {
          if (key === "pagination" || !Array.isArray(value)) continue;
          (merged[key] ?? (merged[key] = [])).push(...value);
        }
        const pagination = data.pagination;
        if (pagination?.next_cursor) {
          next = { cursor: pagination.next_cursor };
        } else if (pagination?.has_more) {
          const limit = pagination.limit ?? Number(query.limit ?? 0);
          if (!limit) {
            complete = true;
            break;
          }
          next = { offset: (pagination.offset ?? 0) + limit };
        } else {
          complete = true;
          break;
        }
      }
      if (!complete) {
        deps.log(`${path}: fler \xE4n ${MAX_PAGES} sidor \u2014 avbryter hellre \xE4n returnerar en halv lista`);
        return { ok: false, status: 0, retryAfter: null, error: "too many pages" };
      }
      return { ok: true, data: merged };
    }
    return {
      call,
      getAllPages,
      pausedUntil: () => pausedUntil,
      hasAuth: deps.hasAuth ?? (() => true)
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/payloads.ts
  function toIds(tmdbId, imdbId) {
    const ids2 = {};
    const tmdb = tmdbId != null && /^\d+$/.test(tmdbId) ? Number(tmdbId) : null;
    if (tmdb != null) ids2.tmdb = tmdb;
    if (imdbId && /^tt\d+$/.test(imdbId)) ids2.imdb = imdbId;
    return ids2.tmdb != null || ids2.imdb != null ? ids2 : null;
  }
  function buildScrobblePayload(event) {
    const ids2 = toIds(event.tmdbId, event.imdbId);
    if (!ids2) return null;
    if (event.mediaType === "movie") return { movie: { ids: ids2 }, progress: event.progress };
    if (event.season == null || event.episode == null) return null;
    return {
      show: { ids: ids2, season: { number: event.season, episode: { number: event.episode } } },
      progress: event.progress
    };
  }
  function buildWatchedPayload(items2) {
    const movies = [];
    const shows = /* @__PURE__ */ new Map();
    for (const item of items2) {
      if (item.kind === "movie") {
        const ids2 = toIds(item.tmdbId, item.imdbId);
        if (ids2) movies.push({ ids: ids2, watched_at: item.watchedAt });
        continue;
      }
      if (!toIds(item.tmdbId, null)) continue;
      const seasons = shows.get(item.tmdbId) ?? /* @__PURE__ */ new Map();
      const episodes = seasons.get(item.season) ?? [];
      episodes.push({ number: item.episode, watched_at: item.watchedAt });
      seasons.set(item.season, episodes);
      shows.set(item.tmdbId, seasons);
    }
    return {
      movies,
      shows: [...shows.entries()].map(([tmdbId, seasons]) => ({
        ids: { tmdb: Number(tmdbId) },
        seasons: [...seasons.entries()].map(([number, episodes]) => ({ number, episodes }))
      }))
    };
  }
  function buildWatchlistPayload(entries, mediaType) {
    const ids2 = entries.map((entry) => toIds(entry.tmdbId, entry.imdbId)).filter((x) => x != null);
    return mediaType === "show" ? { shows: ids2 } : { movies: ids2 };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/bridge.ts
  var FLUSH_MS = 3e3;
  var RETRY_MS2 = 6e4;
  function startBridge(deps) {
    const queue = /* @__PURE__ */ new Map();
    let timer2 = null;
    let flushing = false;
    const toRemote = (e) => ({ tmdbId: e.tmdbId, imdbId: e.imdbId ?? null, title: e.title, posterUrl: null });
    const watchedKey = (p) => p.kind === "episode" ? `e:${p.tmdbId}:${p.season}:${p.episode}` : `m:${p.tmdbId ?? p.imdbId}`;
    function arm(ms) {
      if (timer2 != null) deps.cancel(timer2);
      timer2 = deps.schedule(() => {
        void flush2();
      }, ms);
    }
    function enqueue(key, pending3) {
      queue.set(key, pending3);
      arm(FLUSH_MS);
    }
    async function flush2() {
      timer2 = null;
      if (flushing) {
        arm(FLUSH_MS);
        return;
      }
      flushing = true;
      const batch = new Map(queue);
      queue.clear();
      const retry = [];
      const send = async (path, body, entries, what, critical) => {
        const result = await deps.api.call("POST", path, { body });
        if (result.ok) return;
        if (critical) {
          deps.log(`brygga: ${what} misslyckades (${result.error}) \u2014 f\xF6rs\xF6ker igen`);
          retry.push(...entries);
        } else {
          deps.log(`brygga: ${what} misslyckades (${result.error}) \u2014 n\xE4sta synk tar det`);
        }
      };
      try {
        const pick3 = (kind, add) => [...batch].filter(([, p]) => p.kind === kind && p.add === add);
        for (const kind of ["show", "movie"]) {
          for (const add of [true, false]) {
            const entries = pick3(kind, add);
            if (entries.length === 0) continue;
            const list = entries.map(([, p]) => p.entry);
            await send(
              add ? "/watchlist/items/add" : "/watchlist/items/remove",
              buildWatchlistPayload(list, kind),
              entries,
              `${kind === "show" ? "serier" : "filmer"} ${add ? "+" : "-"}`,
              !add
            );
          }
        }
        for (const add of [true, false]) {
          const entries = pick3("watched", add);
          if (entries.length === 0) continue;
          const pushes = entries.map(([, p]) => p.push);
          await send(add ? "/sync/watched" : "/sync/watched/remove", buildWatchedPayload(pushes), entries, `sedda ${add ? "+" : "-"}`, !add);
        }
      } finally {
        flushing = false;
      }
      for (const [key, pending3] of retry) if (!queue.has(key)) queue.set(key, pending3);
      if (queue.size > 0) {
        const wait = Math.max(retry.length > 0 ? RETRY_MS2 : FLUSH_MS, deps.api.pausedUntil() - deps.now());
        arm(wait);
      }
    }
    const offs = [
      deps.subscribe.onShow((m) => {
        if (!deps.isUserMutation(m.source) || !deps.prefs.isOn("watchlist")) return;
        enqueue(`s:${m.entry.tmdbId}`, { kind: "show", add: m.action === "add", entry: toRemote(m.entry) });
      }),
      deps.subscribe.onMovie((m) => {
        if (!deps.isUserMutation(m.source) || !deps.prefs.isOn("watchlist")) return;
        enqueue(`f:${m.entry.tmdbId}`, { kind: "movie", add: m.action === "add", entry: toRemote(m.entry) });
      }),
      deps.subscribe.onEpisodeWatched((m) => {
        if (!deps.isUserMutation(m.source) || !deps.prefs.isOn("watched")) return;
        const push = { kind: "episode", tmdbId: m.tmdbId, season: m.season, episode: m.episode, watchedAt: m.watchedAt ?? new Date(deps.now()).toISOString() };
        enqueue(watchedKey(push), { kind: "watched", add: m.watched, push });
      }),
      deps.subscribe.onMovieWatched((m) => {
        if (!deps.isUserMutation(m.source) || !deps.prefs.isOn("watched")) return;
        const push = { kind: "movie", tmdbId: m.entry.tmdbId ?? null, imdbId: m.entry.imdbId ?? null, watchedAt: m.entry.watchedAt };
        enqueue(watchedKey(push), { kind: "watched", add: m.action === "add", push });
      })
    ];
    return () => {
      if (timer2 != null) deps.cancel(timer2);
      queue.clear();
      for (const off of offs) off();
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/_shared/tracker-kit/device-auth.ts
  var DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
  var REFRESH_MARGIN_MS = 24 * 60 * 6e4;
  var REFRESH_BACKOFF_MS = 5 * 6e4;
  var DEFAULT_INTERVAL_S = 5;
  var DEFAULT_EXPIRES_S = 300;
  var DEFAULT_TOKEN_LIFETIME_S = 30 * 24 * 60 * 60;
  var str = (v) => typeof v === "string" && v ? v : null;
  var num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
  function createDeviceAuth(deps) {
    const scopeNow = () => deps.scopeId?.() ?? "";
    let state = { phase: "idle" };
    let timer2 = null;
    let generation = 0;
    let refreshing = null;
    let authEpoch = 0;
    let lastRefreshFailAt = -Infinity;
    const listeners2 = /* @__PURE__ */ new Set();
    const set = (next) => {
      state = next;
      for (const listener of listeners2) listener();
    };
    const tokenFrom = (data, previousRefresh) => {
      const accessToken = str(data.access_token);
      if (!accessToken) return null;
      return {
        accessToken,
        refreshToken: str(data.refresh_token) ?? previousRefresh ?? "",
        expiresAt: deps.now() + num(data.expires_in, DEFAULT_TOKEN_LIFETIME_S) * 1e3
      };
    };
    function stopTimer() {
      if (timer2 != null) deps.cancel(timer2);
      timer2 = null;
    }
    async function poll(run, deviceCode, intervalS, expiresAt, scope) {
      timer2 = null;
      if (run !== generation) return;
      if (scopeNow() !== scope) {
        cancel();
        return;
      }
      if (deps.now() >= expiresAt) {
        deps.log("enhetskod: gick ut utan godk\xE4nnande");
        set({ ...state, phase: "expired" });
        return;
      }
      const reply = await deps.transport.token({ grant_type: DEVICE_GRANT, device_code: deviceCode, client_id: deps.clientId });
      if (run !== generation) return;
      if (scopeNow() !== scope) {
        cancel();
        return;
      }
      const token = tokenFrom(reply.data);
      const rejected = token ? deps.acceptToken?.(reply.data) ?? null : null;
      if (token && rejected) {
        deps.log(`enhetskod: token avvisad \u2014 ${rejected}`);
        void deps.transport.revoke({ token: token.accessToken, client_id: deps.clientId }).catch(() => null);
        set({ phase: "error", error: rejected });
        return;
      }
      if (token) {
        deps.writeToken(token);
        deps.log("enhetskod: godk\xE4nd, token sparad");
        set({ ...state, phase: "checking" });
        try {
          await deps.onConnected?.();
        } finally {
          if (run === generation) set({ phase: "done" });
        }
        return;
      }
      const error = str(reply.data.error);
      if (error === "expired_token") {
        set({ ...state, phase: "expired" });
        return;
      }
      if (error === "access_denied") {
        set({ ...state, phase: "denied" });
        return;
      }
      const nextInterval = error === "slow_down" ? intervalS + 5 : intervalS;
      timer2 = deps.schedule(() => {
        void poll(run, deviceCode, nextInterval, expiresAt, scope);
      }, nextInterval * 1e3);
    }
    async function start() {
      stopTimer();
      generation += 1;
      const run = generation;
      set({ phase: "waiting" });
      const reply = await deps.transport.device({ client_id: deps.clientId, scope: deps.scope });
      if (run !== generation) return;
      const deviceCode = str(reply.data.device_code);
      const userCode = str(reply.data.user_code);
      if (!deviceCode || !userCode) {
        const error = str(reply.data.error_description) ?? str(reply.data.error) ?? `HTTP ${reply.status}`;
        deps.log(`enhetskod: kunde inte starta \u2014 ${error}`);
        set({ phase: "error", error });
        return;
      }
      const verificationUri = str(reply.data.verification_uri) ?? deps.fallbackVerificationUri ?? null;
      if (!verificationUri) {
        deps.log("enhetskod: svaret saknar verification_uri");
        set({ phase: "error", error: "verification_uri" });
        return;
      }
      const intervalS = num(reply.data.interval, DEFAULT_INTERVAL_S);
      const expiresAt = deps.now() + num(reply.data.expires_in, DEFAULT_EXPIRES_S) * 1e3;
      set({
        phase: "waiting",
        userCode,
        verificationUri,
        verificationUriComplete: str(reply.data.verification_uri_complete) ?? `${verificationUri}?user_code=${encodeURIComponent(userCode)}`,
        expiresAt
      });
      const scope = scopeNow();
      timer2 = deps.schedule(() => {
        void poll(run, deviceCode, intervalS, expiresAt, scope);
      }, intervalS * 1e3);
    }
    function cancel() {
      stopTimer();
      generation += 1;
      set({ phase: "idle" });
    }
    async function refresh(token) {
      const scope = scopeNow();
      const epoch = authEpoch;
      const reply = await deps.transport.token({ grant_type: "refresh_token", refresh_token: token.refreshToken, client_id: deps.clientId });
      if (epoch !== authEpoch || scopeNow() !== scope) return null;
      const next = tokenFrom(reply.data, token.refreshToken);
      if (next) {
        deps.writeToken(next);
        deps.log("token f\xF6rnyad");
        return next.accessToken;
      }
      if (str(reply.data.error) === "invalid_grant") {
        const stored = deps.readToken();
        if (stored && stored.refreshToken !== token.refreshToken) {
          deps.log("token: f\xF6rnyad p\xE5 en annan enhet \u2014 anv\xE4nder den");
          return stored.accessToken;
        }
        deps.log("token: f\xF6rnyelsen avvisades (invalid_grant) \u2014 kopplar fr\xE5n");
        deps.writeToken(null);
        return null;
      }
      lastRefreshFailAt = deps.now();
      deps.log(`token: f\xF6rnyelsen misslyckades (HTTP ${reply.status}) \u2014 nytt f\xF6rs\xF6k om 5 min`);
      return deps.now() < token.expiresAt ? token.accessToken : null;
    }
    async function getAccessToken() {
      const token = deps.readToken();
      if (!token) return null;
      if (token.expiresAt - deps.now() > REFRESH_MARGIN_MS) return token.accessToken;
      if (deps.now() - lastRefreshFailAt < REFRESH_BACKOFF_MS) {
        return deps.now() < token.expiresAt ? token.accessToken : null;
      }
      refreshing ?? (refreshing = refresh(token).finally(() => {
        refreshing = null;
      }));
      return refreshing;
    }
    async function forceRefresh() {
      const token = deps.readToken();
      if (!token || deps.now() - lastRefreshFailAt < REFRESH_BACKOFF_MS) return null;
      refreshing ?? (refreshing = refresh(token).finally(() => {
        refreshing = null;
      }));
      return refreshing;
    }
    async function disconnect2() {
      authEpoch += 1;
      const token = deps.readToken();
      if (token) {
        await deps.transport.revoke({ token: token.accessToken, client_id: deps.clientId }).catch(() => null);
      }
      deps.writeToken(null);
      cancel();
    }
    return {
      start,
      cancel,
      disconnect: disconnect2,
      getAccessToken,
      forceRefresh,
      hasToken: () => deps.readToken() != null,
      state: () => state,
      subscribe(listener) {
        listeners2.add(listener);
        return () => {
          listeners2.delete(listener);
        };
      }
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/list-ref.ts
  function parseListRef(input) {
    const text = input.trim();
    if (/^\d+$/.test(text)) return { kind: "id", id: text };
    const match = text.match(/^(?:https?:\/\/)?(?:www\.)?mdblist\.com\/lists\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/);
    return match ? { kind: "slug", user: match[1], slug: match[2] } : null;
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/parse.ts
  var isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
  var str2 = (v) => typeof v === "string" && v.trim() ? v : null;
  var idStr = (v) => typeof v === "number" && Number.isFinite(v) ? String(v) : typeof v === "string" && /^\d+$/.test(v) ? v : null;
  function parseUser(data) {
    if (!isObj(data)) return { username: null, supporter: false, accountKey: null };
    const username = str2(data.username) ?? str2(data.user_name) ?? str2(data.name);
    const id = idStr(data.user_id);
    return {
      username,
      supporter: data.is_supporter === true,
      accountKey: id ? `id:${id}` : username ? `user:${username}` : null
    };
  }
  function parseActivities(data) {
    const out = {};
    if (!isObj(data)) return out;
    for (const [key, value] of Object.entries(data)) {
      if (key !== "server_time" && key.endsWith("_at") && typeof value === "string") out[key] = value;
    }
    return out;
  }
  var watchedAtOf = (entry) => str2(entry.watched_at) ?? str2(entry.last_watched_at);
  function parseWatched(pages) {
    const movies = [];
    for (const entry of pages.movies ?? []) {
      if (!isObj(entry)) continue;
      const ids2 = isObj(entry.movie) && isObj(entry.movie.ids) ? entry.movie.ids : {};
      const tmdbId = idStr(ids2.tmdb);
      const imdbId = str2(ids2.imdb);
      if (!tmdbId && !imdbId) continue;
      movies.push({ tmdbId, imdbId, watchedAt: watchedAtOf(entry) });
    }
    const episodes = [];
    for (const entry of pages.episodes ?? []) {
      if (!isObj(entry) || !isObj(entry.episode)) continue;
      const ep = entry.episode;
      const show = isObj(ep.show) ? ep.show : isObj(entry.show) ? entry.show : {};
      const showIds = isObj(show.ids) ? show.ids : {};
      const tmdbId = idStr(showIds.tmdb);
      if (!tmdbId || typeof ep.season !== "number" || typeof ep.number !== "number") continue;
      episodes.push({ tmdbId, season: ep.season, episode: ep.number, watchedAt: watchedAtOf(entry) });
    }
    return { movies, episodes };
  }
  function parseMediaItems(pages) {
    const raw = [...pages.items ?? [], ...pages.movies ?? [], ...pages.shows ?? []];
    const ranked = raw.filter(isObj).map((entry, index) => ({ entry, index, rank: typeof entry.rank === "number" ? entry.rank : Number.MAX_SAFE_INTEGER })).sort((a, b) => a.rank - b.rank || a.index - b.index);
    const out = [];
    for (const { entry } of ranked) {
      const ids2 = isObj(entry.ids) ? entry.ids : {};
      const tmdbId = idStr(entry.id) ?? idStr(entry.tmdb_id) ?? idStr(ids2.tmdb);
      if (!tmdbId) continue;
      const kind = str2(entry.mediatype) ?? str2(entry.media_type) ?? str2(entry.type);
      out.push({
        mediaType: kind === "show" || kind === "tv" || kind === "series" ? "tv" : "movie",
        tmdbId,
        imdbId: str2(entry.imdb_id) ?? str2(ids2.imdb),
        title: str2(entry.title) ?? tmdbId
      });
    }
    return out;
  }
  function parseWatchlist(pages) {
    const shows = [];
    const movies = [];
    for (const item of parseMediaItems(pages)) {
      const entry = { tmdbId: item.tmdbId, imdbId: item.imdbId, title: item.title, posterUrl: null };
      if (item.mediaType === "tv") shows.push(entry);
      else movies.push(entry);
    }
    return { shows, movies };
  }
  function parseLists(data) {
    const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.lists) ? data.lists : isObj(data) ? [data] : [];
    return list.filter(isObj).flatMap((entry) => {
      const id = idStr(entry.id);
      const name = str2(entry.name);
      if (!id || !name) return [];
      return [{
        id,
        name,
        description: str2(entry.description),
        itemCount: typeof entry.items === "number" ? entry.items : null,
        owner: str2(entry.user_name) ?? str2(entry.username),
        dynamic: entry.dynamic === true
      }];
    });
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/strings.ts
  var S = {
    pluginName: {
      en: "MDBList",
      sv: "MDBList",
      de: "MDBList",
      fr: "MDBList",
      es: "MDBList"
    },
    listSourceLabel: {
      en: "MDBList list",
      sv: "MDBList-lista",
      de: "MDBList-Liste",
      fr: "Liste MDBList",
      es: "Lista de MDBList"
    },
    groupMine: {
      en: "My lists",
      sv: "Mina listor",
      de: "Meine Listen",
      fr: "Mes listes",
      es: "Mis listas"
    },
    groupLiked: {
      en: "Liked lists",
      sv: "Gillade listor",
      de: "Gemochte Listen",
      fr: "Listes aim\xE9es",
      es: "Listas que te gustan"
    },
    groupTop: {
      en: "Popular lists",
      sv: "Popul\xE4ra listor",
      de: "Beliebte Listen",
      fr: "Listes populaires",
      es: "Listas populares"
    },
    groupCurated: {
      en: "Curated lists",
      sv: "Kurerade listor",
      de: "Kuratierte Listen",
      fr: "Listes s\xE9lectionn\xE9es",
      es: "Listas seleccionadas"
    },
    groupOfficial: {
      en: "Official lists",
      sv: "Officiella listor",
      de: "Offizielle Listen",
      fr: "Listes officielles",
      es: "Listas oficiales"
    },
    myWatchlist: {
      en: "My watchlist",
      sv: "Min watchlist",
      de: "Meine Merkliste",
      fr: "Ma liste",
      es: "Mi lista"
    },
    description: {
      en: "Scrobble playback, sync watched titles and watchlists, and show MDBList lists as rows.",
      sv: "Scrobbla uppspelning, synka sedda titlar och watchlist, och visa MDBList-listor som rader.",
      de: "Wiedergabe scrobbeln, Gesehenes und Merkliste synchronisieren und MDBList-Listen als Reihen anzeigen.",
      fr: "Scrobblez la lecture, synchronisez les titres vus et Ma liste, et affichez les listes MDBList sous forme de rang\xE9es.",
      es: "Registra la reproducci\xF3n, sincroniza los t\xEDtulos vistos y tu lista, y muestra las listas de MDBList como filas."
    },
    // Anslutning (enhetskod — ingen API-nyckel; den hör till betygen)
    connectedAs: {
      en: "Connected as {name}",
      sv: "Ansluten som {name}",
      de: "Verbunden als {name}",
      fr: "Connect\xE9 en tant que {name}",
      es: "Conectado como {name}"
    },
    connected: {
      en: "Connected",
      sv: "Ansluten",
      de: "Verbunden",
      fr: "Connect\xE9",
      es: "Conectado"
    },
    connectedBody: {
      en: "Scrobble, watched titles and watchlist go through your account.",
      sv: "Scrobble, sedda och watchlist g\xE5r via ditt konto.",
      de: "Scrobbeln, Gesehenes und Merkliste laufen \xFCber dein Konto.",
      fr: "Le scrobble, les titres vus et Ma liste passent par votre compte.",
      es: "El scrobble, los vistos y tu lista pasan por tu cuenta."
    },
    badKey: {
      en: "Login no longer valid",
      sv: "Inloggningen g\xE4ller inte l\xE4ngre",
      de: "Anmeldung nicht mehr g\xFCltig",
      fr: "Connexion plus valide",
      es: "Inicio de sesi\xF3n no v\xE1lido"
    },
    badKeyBody: {
      en: "MDBList no longer accepts the login. Sync is paused \u2014 connect again.",
      sv: "MDBList godk\xE4nner inte l\xE4ngre inloggningen. Synken st\xE5r still \u2014 anslut igen.",
      de: "MDBList akzeptiert die Anmeldung nicht mehr. Die Synchronisierung ist pausiert \u2014 verbinde dich erneut.",
      fr: "MDBList n\u2019accepte plus la connexion. La synchro est en pause \u2014 reconnectez-vous.",
      es: "MDBList ya no acepta el inicio de sesi\xF3n. La sincronizaci\xF3n est\xE1 en pausa: vuelve a conectar."
    },
    notConnected: {
      en: "Not connected",
      sv: "Inte ansluten",
      de: "Nicht verbunden",
      fr: "Non connect\xE9",
      es: "No conectado"
    },
    notConnectedBody: {
      en: "Connect your MDBList account to send playback, watched titles and watchlist there.",
      sv: "Anslut ditt MDBList-konto f\xF6r att skicka uppspelning, sedda titlar och watchlist dit.",
      de: "Verbinde dein MDBList-Konto, um Wiedergabe, Gesehenes und Merkliste dorthin zu senden.",
      fr: "Connectez votre compte MDBList pour y envoyer la lecture, les titres vus et Ma liste.",
      es: "Conecta tu cuenta de MDBList para enviar all\xED la reproducci\xF3n, los vistos y tu lista."
    },
    offline: {
      en: "Couldn't reach MDBList",
      sv: "Kunde inte n\xE5 MDBList",
      de: "MDBList nicht erreichbar",
      fr: "MDBList est injoignable",
      es: "No se pudo conectar con MDBList"
    },
    checking: {
      en: "Checking\u2026",
      sv: "Kontrollerar\u2026",
      de: "Wird gepr\xFCft\u2026",
      fr: "V\xE9rification\u2026",
      es: "Comprobando\u2026"
    },
    badgeConnected: {
      en: "CONNECTED",
      sv: "ANSLUTEN",
      de: "VERBUNDEN",
      fr: "CONNECT\xC9",
      es: "CONECTADO"
    },
    badgeBadKey: {
      en: "LOGGED OUT",
      sv: "UTLOGGAD",
      de: "ABGEMELDET",
      fr: "D\xC9CONNECT\xC9",
      es: "SESI\xD3N CERRADA"
    },
    badgeNotConnected: {
      en: "NOT CONNECTED",
      sv: "EJ ANSLUTEN",
      de: "NICHT VERBUNDEN",
      fr: "NON CONNECT\xC9",
      es: "NO CONECTADO"
    },
    connect: {
      en: "Connect with MDBList",
      sv: "Anslut med MDBList",
      de: "Mit MDBList verbinden",
      fr: "Se connecter \xE0 MDBList",
      es: "Conectar con MDBList"
    },
    onboardingConnected: {
      en: "Connected. Your history and watchlist sync as soon as you finish setup.",
      sv: "Ansluten. Historik och watchlist synkas direkt n\xE4r du \xE4r klar med guiden.",
      de: "Verbunden. Dein Verlauf und deine Merkliste werden synchronisiert, sobald du die Einrichtung abgeschlossen hast.",
      fr: "Connect\xE9. Votre historique et Ma liste se synchronisent d\xE8s que la configuration est termin\xE9e.",
      es: "Conectado. Tu historial y tu lista se sincronizan en cuanto termines la configuraci\xF3n."
    },
    onboardingHint: {
      en: "Scrobble playback and sync watched titles and your watchlist with MDBList. Lists from MDBList can become rows on Home.",
      sv: "Scrobbla uppspelning och synka sedda titlar och watchlist med MDBList. Listor fr\xE5n MDBList kan bli rader p\xE5 startsidan.",
      de: "Wiedergabe scrobbeln und Gesehenes sowie deine Merkliste mit MDBList synchronisieren. Listen von MDBList k\xF6nnen zu Reihen auf der Startseite werden.",
      fr: "Scrobblez la lecture et synchronisez les titres vus et Ma liste avec MDBList. Les listes MDBList peuvent devenir des rang\xE9es sur l\u2019accueil.",
      es: "Registra la reproducci\xF3n y sincroniza los t\xEDtulos vistos y tu lista con MDBList. Las listas de MDBList pueden convertirse en filas en Inicio."
    },
    disconnect: {
      en: "Disconnect",
      sv: "Koppla fr\xE5n",
      de: "Trennen",
      fr: "D\xE9connecter",
      es: "Desconectar"
    },
    // Enhetskoden
    deviceTitle: {
      en: "Connect MDBList",
      sv: "Anslut MDBList",
      de: "MDBList verbinden",
      fr: "Connecter MDBList",
      es: "Conectar MDBList"
    },
    deviceIntro: {
      en: "Scan the code with your phone, or go to the address and enter the code. Approve on mdblist.com.",
      sv: "Skanna koden med telefonen, eller g\xE5 till adressen och skriv in koden. Godk\xE4nn p\xE5 mdblist.com.",
      de: "Scanne den Code mit deinem Handy oder \xF6ffne die Adresse und gib den Code ein. Best\xE4tige auf mdblist.com.",
      fr: "Scannez le code avec votre t\xE9l\xE9phone, ou ouvrez l\u2019adresse et saisissez le code. Validez sur mdblist.com.",
      es: "Escanea el c\xF3digo con el m\xF3vil, o ve a la direcci\xF3n e introduce el c\xF3digo. Aprueba en mdblist.com."
    },
    deviceScanHint: {
      en: "Scan, or go to mdblist.com/oauth/device",
      sv: "Skanna, eller g\xE5 till mdblist.com/oauth/device",
      de: "Scannen oder mdblist.com/oauth/device \xF6ffnen",
      fr: "Scannez, ou ouvrez mdblist.com/oauth/device",
      es: "Escanea, o ve a mdblist.com/oauth/device"
    },
    deviceCode: {
      en: "Code",
      sv: "Kod",
      de: "Code",
      fr: "Code",
      es: "C\xF3digo"
    },
    deviceWaiting: {
      en: "Waiting for approval \xB7 closes in {time}",
      sv: "V\xE4ntar p\xE5 godk\xE4nnande \xB7 st\xE4ngs om {time}",
      de: "Warte auf Best\xE4tigung \xB7 l\xE4uft ab in {time}",
      fr: "En attente de validation \xB7 expire dans {time}",
      es: "Esperando aprobaci\xF3n \xB7 caduca en {time}"
    },
    deviceChecking: {
      en: "Checking who approved\u2026",
      sv: "Fr\xE5gar MDBList vem som godk\xE4nde\u2026",
      de: "Pr\xFCfe, wer best\xE4tigt hat\u2026",
      fr: "V\xE9rification de l\u2019autorisation\u2026",
      es: "Comprobando qui\xE9n ha aprobado\u2026"
    },
    deviceExpired: {
      en: "The code has expired",
      sv: "Koden har g\xE5tt ut",
      de: "Der Code ist abgelaufen",
      fr: "Le code a expir\xE9",
      es: "El c\xF3digo ha caducado"
    },
    deviceDenied: {
      en: "The connection was declined",
      sv: "Anslutningen nekades",
      de: "Die Verbindung wurde abgelehnt",
      fr: "La connexion a \xE9t\xE9 refus\xE9e",
      es: "Se rechaz\xF3 la conexi\xF3n"
    },
    deviceError: {
      en: "Couldn't start the connection",
      sv: "Kunde inte starta anslutningen",
      de: "Verbindung konnte nicht gestartet werden",
      fr: "Impossible de lancer la connexion",
      es: "No se pudo iniciar la conexi\xF3n"
    },
    deviceNewCode: {
      en: "Show a new code",
      sv: "Visa ny kod",
      de: "Neuen Code anzeigen",
      fr: "Afficher un nouveau code",
      es: "Mostrar c\xF3digo nuevo"
    },
    cancel: {
      en: "Cancel",
      sv: "Avbryt",
      de: "Abbrechen",
      fr: "Annuler",
      es: "Cancelar"
    },
    // API-nyckeln
    // Vad som synkas
    whatSyncs: {
      en: "WHAT SYNCS",
      sv: "VAD SOM SYNKAS",
      de: "WAS SYNCHRONISIERT WIRD",
      fr: "CE QUI EST SYNCHRONIS\xC9",
      es: "QU\xC9 SE SINCRONIZA"
    },
    connectFirst: {
      en: "Connect MDBList under Accounts to choose what syncs.",
      sv: "Anslut MDBList under Konton f\xF6r att v\xE4lja vad som synkas.",
      de: "Verbinde MDBList unter Konten, um auszuw\xE4hlen, was synchronisiert wird.",
      fr: "Connectez MDBList dans Comptes pour choisir ce qui est synchronis\xE9.",
      es: "Conecta MDBList en Cuentas para elegir qu\xE9 se sincroniza."
    },
    scrobble: {
      en: "Scrobble playback",
      sv: "Scrobbla uppspelning",
      de: "Wiedergabe scrobbeln",
      fr: "Scrobbler la lecture",
      es: "Registrar reproducci\xF3n (scrobble)"
    },
    scrobbleHint: {
      en: "Start, pause and stop are sent to MDBList while you watch \u2014 the same moments as for Trakt.",
      sv: "Start, paus och stopp skickas till MDBList medan du tittar, samma tillf\xE4llen som f\xF6r Trakt.",
      de: "Start, Pause und Stopp werden beim Schauen an MDBList gesendet \u2014 dieselben Momente wie bei Trakt.",
      fr: "Lecture, pause et arr\xEAt sont envoy\xE9s \xE0 MDBList pendant que vous regardez \u2014 aux m\xEAmes moments que pour Trakt.",
      es: "El inicio, la pausa y la parada se env\xEDan a MDBList mientras ves algo, en los mismos momentos que con Trakt."
    },
    scrobbleHintTv: {
      en: "Start, pause and stop are sent to MDBList.",
      sv: "Start, paus och stopp skickas till MDBList.",
      de: "Start, Pause und Stopp werden an MDBList gesendet.",
      fr: "Lecture, pause et arr\xEAt sont envoy\xE9s \xE0 MDBList.",
      es: "El inicio, la pausa y la parada se env\xEDan a MDBList."
    },
    syncWatched: {
      en: "Sync watched",
      sv: "Synka sedda",
      de: "Gesehenes synchronisieren",
      fr: "Synchroniser les vus",
      es: "Sincronizar vistos"
    },
    syncWatchedHint: {
      en: "Watched movies and episodes are merged both ways. A title is only unmarked on MDBList when you unmark it here.",
      sv: "Sedda filmer och avsnitt sl\xE5s ihop \xE5t b\xE5da h\xE5llen. En titel avmarkeras p\xE5 MDBList bara n\xE4r du avmarkerar den h\xE4r.",
      de: "Gesehene Filme und Folgen werden in beide Richtungen abgeglichen. Ein Titel wird bei MDBList nur zur\xFCckgesetzt, wenn du ihn hier zur\xFCcksetzt.",
      fr: "Les films et \xE9pisodes vus sont fusionn\xE9s dans les deux sens. Un titre n\u2019est d\xE9coch\xE9 sur MDBList que si vous le d\xE9cochez ici.",
      es: "Las pel\xEDculas y episodios vistos se combinan en ambos sentidos. Un t\xEDtulo solo se desmarca en MDBList si lo desmarcas aqu\xED."
    },
    syncWatchedHintTv: {
      en: "Watched movies and episodes are merged both ways.",
      sv: "Sedda filmer och avsnitt sl\xE5s ihop \xE5t b\xE5da h\xE5llen.",
      de: "Gesehene Filme und Folgen werden in beide Richtungen abgeglichen.",
      fr: "Les films et \xE9pisodes vus sont fusionn\xE9s dans les deux sens.",
      es: "Las pel\xEDculas y episodios vistos se combinan en ambos sentidos."
    },
    syncWatchlist: {
      en: "Sync watchlist",
      sv: "Synka watchlist",
      de: "Merkliste synchronisieren",
      fr: "Synchroniser Ma liste",
      es: "Sincronizar mi lista"
    },
    syncWatchlistHint: {
      en: "Followed series and the movie watchlist are kept the same in Lumio and on MDBList.",
      sv: "F\xF6ljda serier och filmwatchlisten h\xE5lls lika i Lumio och p\xE5 MDBList.",
      de: "Gefolgte Serien und die Film-Merkliste sind in Lumio und bei MDBList gleich.",
      fr: "Les s\xE9ries suivies et la liste de films sont identiques dans Lumio et sur MDBList.",
      es: "Las series seguidas y la lista de pel\xEDculas son iguales en Lumio y en MDBList."
    },
    syncWatchlistHintTv: {
      en: "Followed series and the movie watchlist are kept the same.",
      sv: "F\xF6ljda serier och filmwatchlisten h\xE5lls lika.",
      de: "Gefolgte Serien und die Film-Merkliste bleiben gleich.",
      fr: "Les s\xE9ries suivies et la liste de films restent identiques.",
      es: "Las series seguidas y la lista de pel\xEDculas se mantienen iguales."
    },
    // Synkstatus
    lastSync: {
      en: "Last synced {time} \xB7 {changes}",
      sv: "Senast synkad {time} \xB7 {changes}",
      de: "Zuletzt synchronisiert {time} \xB7 {changes}",
      fr: "Derni\xE8re synchro {time} \xB7 {changes}",
      es: "\xDAltima sincronizaci\xF3n {time} \xB7 {changes}"
    },
    changesNone: {
      en: "no changes",
      sv: "inga \xE4ndringar",
      de: "keine \xC4nderungen",
      fr: "aucun changement",
      es: "sin cambios"
    },
    changesOne: {
      en: "1 change",
      sv: "1 \xE4ndring",
      de: "1 \xC4nderung",
      fr: "1 changement",
      es: "1 cambio"
    },
    changesMany: {
      en: "{n} changes",
      sv: "{n} \xE4ndringar",
      de: "{n} \xC4nderungen",
      fr: "{n} changements",
      es: "{n} cambios"
    },
    neverSynced: {
      en: "Not synced yet",
      sv: "Inte synkad \xE4n",
      de: "Noch nicht synchronisiert",
      fr: "Pas encore synchronis\xE9",
      es: "A\xFAn sin sincronizar"
    },
    syncingLong: {
      en: "Syncing with MDBList\u2026",
      sv: "Synkar med MDBList\u2026",
      de: "Synchronisiere mit MDBList\u2026",
      fr: "Synchronisation avec MDBList\u2026",
      es: "Sincronizando con MDBList\u2026"
    },
    syncing: {
      en: "Syncing\u2026",
      sv: "Synkar\u2026",
      de: "Synchronisiere\u2026",
      fr: "Synchronisation\u2026",
      es: "Sincronizando\u2026"
    },
    syncAuto: {
      en: "Syncs on its own every 15 minutes and when you change a toggle.",
      sv: "Synkar av sig sj\xE4lv var 15:e minut och n\xE4r du \xE4ndrar ett reglage.",
      de: "Synchronisiert automatisch alle 15 Minuten und wenn du einen Schalter \xE4nderst.",
      fr: "Se synchronise automatiquement toutes les 15 minutes et quand vous modifiez un r\xE9glage.",
      es: "Se sincroniza solo cada 15 minutos y cuando cambias un interruptor."
    },
    syncNow: {
      en: "Sync now",
      sv: "Synka nu",
      de: "Jetzt synchronisieren",
      fr: "Synchroniser",
      es: "Sincronizar ahora"
    },
    pausedUntil: {
      en: "Paused until {time} \u2014 MDBList limits how often apps may call it",
      sv: "Pausat till {time}, MDBList begr\xE4nsar antalet anrop",
      de: "Pausiert bis {time} \u2014 MDBList begrenzt die Anzahl der Abrufe",
      fr: "En pause jusqu\u2019\xE0 {time} \u2014 MDBList limite le nombre de requ\xEAtes",
      es: "En pausa hasta las {time} \u2014 MDBList limita el n\xFAmero de llamadas"
    },
    pausedBody: {
      en: "Lumio sends nothing to MDBList until the pause is over. Scrobble and sync then resume on their own.",
      sv: "Lumio skickar inget till MDBList f\xF6rr\xE4n pausen \xE4r slut. Scrobble och synk forts\xE4tter sedan av sig sj\xE4lva.",
      de: "Lumio sendet nichts an MDBList, bis die Pause vorbei ist. Scrobbeln und Synchronisieren laufen danach von selbst weiter.",
      fr: "Lumio n\u2019envoie rien \xE0 MDBList tant que la pause n\u2019est pas termin\xE9e. Le scrobble et la synchro reprennent ensuite d\u2019eux-m\xEAmes.",
      es: "Lumio no env\xEDa nada a MDBList hasta que termine la pausa. El scrobble y la sincronizaci\xF3n se reanudan solos."
    },
    traktTip: {
      en: "If Trakt sync is on at mdblist.com you don't need to turn on the same thing here \u2014 it gives double plays in Trakt.",
      sv: "Har du Trakt-synk p\xE5slagen p\xE5 mdblist.com beh\xF6ver du inte sl\xE5 p\xE5 samma sak h\xE4r, det ger dubbla visningar i Trakt.",
      de: "Wenn die Trakt-Synchronisierung auf mdblist.com aktiv ist, musst du hier nicht dasselbe einschalten \u2014 sonst wird doppelt bei Trakt gez\xE4hlt.",
      fr: "Si la synchro Trakt est activ\xE9e sur mdblist.com, inutile d\u2019activer la m\xEAme chose ici : cela cr\xE9e des doublons dans Trakt.",
      es: "Si la sincronizaci\xF3n con Trakt est\xE1 activada en mdblist.com, no hace falta activarla aqu\xED: genera reproducciones duplicadas en Trakt."
    },
    // TV
    tvAccount: {
      en: "Account",
      sv: "Konto",
      de: "Konto",
      fr: "Compte",
      es: "Cuenta"
    },
    tvIntro: {
      en: "How Lumio and MDBList exchange playback, watched titles and watchlist.",
      sv: "Hur Lumio och MDBList utbyter uppspelning, sedda titlar och watchlist.",
      de: "Wie Lumio und MDBList Wiedergabe, Gesehenes und Merkliste austauschen.",
      fr: "Comment Lumio et MDBList \xE9changent la lecture, les titres vus et Ma liste.",
      es: "C\xF3mo intercambian Lumio y MDBList la reproducci\xF3n, los vistos y tu lista."
    },
    tvConnectHint: {
      en: "Shows a code and a QR code. Approve on mdblist.com.",
      sv: "Visar en kod och en QR-kod. Godk\xE4nn p\xE5 mdblist.com.",
      de: "Zeigt einen Code und einen QR-Code. Best\xE4tige auf mdblist.com.",
      fr: "Affiche un code et un QR code. Validez sur mdblist.com.",
      es: "Muestra un c\xF3digo y un c\xF3digo QR. Aprueba en mdblist.com."
    },
    tvConnectedHint: {
      en: "Follows along to your other devices via sync.",
      sv: "F\xF6ljer med till dina andra enheter via synken.",
      de: "Wird \xFCber die Synchronisierung auf deine anderen Ger\xE4te \xFCbertragen.",
      fr: "Suit sur vos autres appareils via la synchro.",
      es: "Se traslada a tus otros dispositivos mediante la sincronizaci\xF3n."
    }
  };
  function pick2(text, lang) {
    const value = lang ? text[lang] : void 0;
    return value ?? text.en;
  }
  function fill2(text, values) {
    return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }
  function fillBoth(text, values) {
    return {
      en: fill2(text.en, values),
      sv: fill2(text.sv, values),
      de: fill2(text.de, values),
      fr: fill2(text.fr, values),
      es: fill2(text.es, values)
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/list-source.ts
  var FRESH_MS = 6 * 60 * 6e4;
  var WATCHLIST_ID = "watchlist";
  function itemsPath(id) {
    if (id === WATCHLIST_ID) return "/watchlist/items";
    if (id.startsWith("official:")) return `/lists/official/${id.slice("official:".length)}/items`;
    return `/lists/${id}/items`;
  }
  var LISTS_KEY = "mdblist_lists_cache";
  var itemsKey = (id) => `mdblist_list_items_${id}`;
  function createListSource(deps) {
    const remember = (lists) => {
      const known = new Map((deps.readJson(LISTS_KEY) ?? []).map((l) => [l.id, l]));
      for (const list of lists) known.set(list.id, list);
      deps.writeJson(LISTS_KEY, [...known.values()]);
    };
    async function fetchItems(id) {
      const result = await deps.api.getAllPages(itemsPath(id), { limit: 200 });
      if (!result.ok) {
        deps.log(`lista ${id}: ${result.error}`);
        return null;
      }
      const items2 = parseMediaItems(result.data).map((item) => ({ ...item, posterUrl: null }));
      deps.writeJson(itemsKey(id), { fetchedAt: deps.now(), items: items2 });
      return items2;
    }
    return {
      /**
       * Listorna i väljarens kategorier, i MDBList-menyns ordning. En kategori
       * som inte svarar faller bort; de andra visas ändå. Fem läsningar — bara
       * när väljaren öppnas.
       */
      async listLists() {
        const categories = [
          { id: "mine", label: S.groupMine, path: "/lists/user" },
          { id: "liked", label: S.groupLiked, path: "/lists/liked", query: { limit: 50 } },
          { id: "top", label: S.groupTop, path: "/lists/top", query: { limit: 30 } },
          { id: "curated", label: S.groupCurated, path: "/lists/curated", query: { limit: 30 } },
          { id: "official", label: S.groupOfficial, path: "/lists/official" }
        ];
        const results = await Promise.all(categories.map(async (category) => {
          const result = await deps.api.call("GET", category.path, category.query ? { query: category.query } : void 0);
          if (!result.ok) {
            deps.log(`listor (${category.id}): ${result.error}`);
            return [];
          }
          const group = { id: category.id, label: category.label };
          if (category.id === "official") {
            const slugs = /* @__PURE__ */ new Map();
            for (const entry of Array.isArray(result.data) ? result.data : []) {
              const { id, slug } = entry ?? {};
              if ((typeof id === "number" || typeof id === "string") && typeof slug === "string") slugs.set(String(id), slug);
            }
            return parseLists(result.data).flatMap((list) => {
              const slug = slugs.get(list.id);
              return slug ? [{ ...list, id: `official:${slug}`, group }] : [];
            });
          }
          return parseLists(result.data).map((list) => ({ ...list, group }));
        }));
        const watchlist = {
          id: WATCHLIST_ID,
          name: pick2(S.myWatchlist, deps.lang?.()),
          description: null,
          itemCount: null,
          owner: null,
          dynamic: true,
          group: { id: "mine", label: S.groupMine }
        };
        const lists = [watchlist, ...results.flat()];
        remember(lists);
        return lists;
      },
      /** Ur cache direkt; äldre än 6 h hämtas om i bakgrunden. En saknad lista är tom. */
      async loadList(id) {
        const cached = deps.readJson(itemsKey(id));
        if (cached) {
          if (deps.now() - cached.fetchedAt > FRESH_MS) void fetchItems(id);
          return cached.items;
        }
        return await fetchItems(id) ?? [];
      },
      async resolveListRef(input) {
        const ref = parseListRef(input);
        if (!ref) return null;
        const path = ref.kind === "id" ? `/lists/${ref.id}` : `/lists/${ref.user}/${ref.slug}`;
        const result = await deps.api.call("GET", path);
        if (!result.ok) return null;
        const found = parseLists(result.data)[0] ?? null;
        if (found) remember([found]);
        return found;
      },
      describeList(id) {
        return (deps.readJson(LISTS_KEY) ?? []).find((l) => l.id === id) ?? null;
      }
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/_shared/tracker-kit/prefs.ts
  function prefKeys(prefix) {
    return {
      scrobble: `${prefix}_scrobble_enabled`,
      watched: `${prefix}_sync_watched_enabled`,
      watchlist: `${prefix}_sync_watchlist_enabled`
    };
  }
  function createPrefs(storage, onChange, prefix) {
    const keys2 = prefKeys(prefix);
    return {
      isOn: (kind) => storage.get(keys2[kind]) === "1",
      setOn: (kind, on) => {
        storage.set(keys2[kind], on ? "1" : "0");
        onChange();
      }
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/_shared/tracker-kit/playback.ts
  var obj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  var num2 = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  var str3 = (v) => typeof v === "string" && v.trim() ? v : null;
  var ids = (v) => {
    const o = obj(v);
    if (!o) return null;
    return { tmdb: num2(o.tmdb) ?? null, imdb: str3(o.imdb) };
  };
  function playbackRows(payload) {
    if (Array.isArray(payload)) return payload.map(obj).filter((r) => r !== null);
    const o = obj(payload);
    if (!o) return [];
    const out = [];
    for (const key of ["playback", "items", "movies", "episodes", "shows", "tv_shows"]) {
      const bucket = o[key];
      if (Array.isArray(bucket)) out.push(...bucket.map(obj).filter((r) => r !== null));
    }
    return out;
  }
  function normalizePlaybackRow(row) {
    const progress = num2(row.progress);
    if (progress == null) return null;
    const movie = obj(row.movie);
    const pausedAt = str3(row.paused_at) ?? str3(row.watched_at) ?? str3(row.progress_at);
    if (movie || row.type === "movie") {
      const m = movie ?? row;
      return {
        id: num2(row.id),
        progress,
        paused_at: pausedAt,
        type: "movie",
        movie: { title: str3(m.title), year: num2(m.year), runtime: num2(m.runtime), ids: ids(m.ids) }
      };
    }
    const show = obj(row.show);
    if (!show) return null;
    const episode = obj(row.episode) ?? {};
    return {
      id: num2(row.id),
      progress,
      paused_at: pausedAt,
      type: "episode",
      show: { title: str3(show.title), year: num2(show.year), runtime: num2(show.runtime), ids: ids(show.ids) },
      episode: {
        season: num2(episode.season) ?? num2(row.season),
        number: num2(episode.number) ?? num2(episode.episode) ?? num2(row.episode),
        runtime: num2(episode.runtime)
      }
    };
  }
  async function pullPlayback(deps) {
    if (!deps.enabled || !deps.importer) return 0;
    const result = await deps.fetch();
    if (!result.ok) {
      deps.log(`forts\xE4tt titta: h\xE4mtningen misslyckades (${result.error})`);
      return 0;
    }
    const rows = playbackRows(result.data).map(normalizePlaybackRow).filter((r) => r !== null);
    const pending3 = deps.importer(rows);
    if (!pending3) return 0;
    const { applied } = await pending3;
    deps.log(`forts\xE4tt titta: ${rows.length} pausade hos tj\xE4nsten, ${applied} inlagda`);
    return applied;
  }

  // ../../../lumio-official-plugins-langs/plugins/_shared/tracker-kit/scheduler.ts
  var INITIAL_DELAY_MS = 5e4;
  var FIRST_SYNC_DELAY_MS = 5e3;
  var INTERVAL_MS = 15 * 6e4;
  function startScheduler(deps) {
    const first = deps.neverSynced?.() ?? false;
    const initial = first ? setTimeout(() => {
      void deps.run({ pushWatched: true, reason: "f\xF6rsta synk" });
    }, FIRST_SYNC_DELAY_MS) : setTimeout(() => {
      void deps.run({ pushWatched: false, reason: "start" });
    }, INITIAL_DELAY_MS);
    const interval = setInterval(() => {
      void deps.run({ pushWatched: true, reason: "intervall" });
    }, deps.intervalMs ?? INTERVAL_MS);
    const offs = [
      deps.onKeyChanged(() => {
        void deps.run({ pushWatched: false, reason: "ny nyckel" });
      }),
      deps.onPrefsChanged(() => {
        void deps.run({ pushWatched: false, reason: "\xE4ndrade reglage" });
      }),
      deps.onProfileChanged(() => {
        void deps.run({ pushWatched: false, reason: "profilbyte" });
      })
    ];
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      for (const off of offs) off();
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/_shared/tracker-kit/status.ts
  function createStatus(initial) {
    let state = {
      connection: "none",
      username: null,
      supporter: false,
      accountKey: null,
      lastSyncAt: null,
      lastChanges: 0,
      pausedUntil: 0,
      syncing: false,
      ...initial
    };
    const listeners2 = /* @__PURE__ */ new Set();
    return {
      get: () => state,
      set(patch) {
        state = { ...state, ...patch };
        for (const listener of listeners2) listener();
      },
      subscribe(listener) {
        listeners2.add(listener);
        return () => {
          listeners2.delete(listener);
        };
      }
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/sync-engine.ts
  var SNAPSHOT_KEY = "mdblist_sync_snapshot";
  var SNAPSHOT_VERSION = 2;
  var WATCHED_PUSH_LIMIT_PER_RUN = 100;
  var WATCHED_BATCH = 100;
  var FULL_RUN_EVERY_MS = 24 * 60 * 6e4;
  var EMPTY_REMOTE_GUARD = 15;
  var UNCONFIRMED_MAX_ATTEMPTS = 2;
  var UNCONFIRMED_COOLDOWN_MS = 7 * 24 * 60 * 6e4;
  var GATE_KEYS = {
    watched: ["watched_at", "season_watched_at", "episode_watched_at"],
    watchlist: ["watchlisted_at"]
  };
  var SyncAbort = class extends Error {
    constructor(result) {
      super(result.error);
      __publicField(this, "result", result);
    }
  };
  var ScopeChanged = class extends Error {
  };
  function must(result) {
    if (!result.ok) throw new SyncAbort(result);
    return result.data;
  }
  var episodeKey = (tmdbId, season, episode) => `e:${tmdbId}:${season}:${episode}`;
  var movieKeys = (m) => [m.tmdbId ? `m:tmdb:${m.tmdbId}` : null, m.imdbId ? `m:imdb:${m.imdbId}` : null].filter((k) => k != null);
  function hashKeys(keys2) {
    let sum = 0;
    for (const key of keys2) {
      let h = 0;
      for (let i = 0; i < key.length; i += 1) h = Math.imul(h, 31) + key.charCodeAt(i) | 0;
      sum = (sum + (h >>> 0)) % 4294967296;
    }
    return `${keys2.length}:${sum}`;
  }
  function localWatchedKeys(host) {
    return [
      ...host.getWatchedEpisodes().map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
      ...host.getWatchedMovies().map((m) => movieKeys(m)[0]).filter((k) => k != null)
    ];
  }
  function readSnapshot(host, accountKey) {
    const snap = host.readJson(SNAPSHOT_KEY);
    if (!snap || snap.version !== SNAPSHOT_VERSION) return null;
    if (snap.accountKey !== accountKey) {
      host.log("synk: snapshoten h\xF6r till ett annat MDBList-konto \u2014 b\xF6rjar om som f\xF6rsta synk");
      return null;
    }
    return snap;
  }
  var running = /* @__PURE__ */ new Set();
  async function runMdblistSync(deps, opts) {
    const { host, api: api2, prefs: prefs2 } = deps;
    const skip = (reason) => {
      host.log(`synk (${opts.reason}): avst\xE5r \u2014 ${reason}`);
      return { status: "skipped", reason };
    };
    await host.waitForStartIdle();
    const scope = host.scopeId() ?? "";
    if (running.has(scope)) return skip("en k\xF6rning p\xE5g\xE5r redan");
    const wantWatched = prefs2.isOn("watched");
    const wantWatchlist = prefs2.isOn("watchlist");
    if (!wantWatched && !wantWatchlist) return skip("inga reglage p\xE5slagna");
    if (!api2.hasAuth()) return skip("inte ansluten");
    if (api2.pausedUntil() > host.now()) return skip("MDBList har bett oss v\xE4nta (429)");
    const accountKey = host.accountKey();
    if (!accountKey) return skip("kontot \xE4r inte bekr\xE4ftat \xE4n");
    const guard = () => {
      if ((host.scopeId() ?? "") !== scope) throw new ScopeChanged();
    };
    running.add(scope);
    try {
      const activities = parseActivities(must(await api2.call("GET", "/sync/last_activities")));
      const snapshot = readSnapshot(host, accountKey);
      const changed = (keys2) => !snapshot || keys2.some((key) => snapshot.activities[key] !== activities[key]);
      const localShows = host.getShows();
      const localMovies = host.getMovies();
      const sameSet = (a, b) => a.length === b.length && a.every((id) => b.includes(id));
      const newlyOn = (kind) => !snapshot || !snapshot.syncedKinds[kind];
      const watchlistDue = wantWatchlist && (newlyOn("watchlist") || changed(GATE_KEYS.watchlist) || !sameSet(localShows.map((e) => e.tmdbId), snapshot?.shows ?? []) || !sameSet(localMovies.map((e) => e.tmdbId), snapshot?.movies ?? []));
      const localHash = hashKeys(localWatchedKeys(host));
      const watchedDue = wantWatched && (newlyOn("watched") || changed(GATE_KEYS.watched) || opts.pushWatched && (snapshot?.watchedPending === true || localHash !== snapshot?.watchedHash));
      const fullDue = !snapshot || Math.abs(host.now() - snapshot.fullAt) > FULL_RUN_EVERY_MS;
      if (!watchlistDue && !watchedDue && !fullDue) {
        host.log(`synk (${opts.reason}): inget nytt \u2014 ett anrop`);
        return { status: "unchanged" };
      }
      const doWatchlist = wantWatchlist && (watchlistDue || fullDue);
      const doWatched = wantWatched && (watchedDue || fullDue);
      let changes = 0;
      let nextShows = snapshot?.shows ?? [];
      let nextMovies = snapshot?.movies ?? [];
      if (doWatchlist) {
        const remote = parseWatchlist(must(await api2.getAllPages("/watchlist/items", { limit: 100 })));
        const snapCount = (snapshot?.shows.length ?? 0) + (snapshot?.movies.length ?? 0);
        if (remote.shows.length + remote.movies.length === 0 && snapCount > EMPTY_REMOTE_GUARD) {
          host.log(`watchlist: MDBList svarade tomt men snapshoten har ${snapCount} \u2014 hoppar \xF6ver, raderar inget`);
        } else {
          const showPlan = host.planWatchlistSync(localShows, remote.shows, snapshot?.shows ?? null, "merge", { keepLocal: true });
          const moviePlan = host.planWatchlistSync(localMovies, remote.movies, snapshot?.movies ?? null, "merge");
          let pushed = false;
          for (const [kind, plan] of [["show", showPlan], ["movie", moviePlan]]) {
            if (plan.pushAdds.length) {
              must(await api2.call("POST", "/watchlist/items/add", { body: buildWatchlistPayload(plan.pushAdds, kind) }));
              pushed = true;
            }
            if (plan.pushRemoves.length) {
              must(await api2.call("POST", "/watchlist/items/remove", { body: buildWatchlistPayload(plan.pushRemoves, kind) }));
              pushed = true;
            }
            guard();
            if (plan.localAdds.length) (kind === "show" ? host.addShows : host.addMovies)(plan.localAdds);
            for (const id of plan.localRemoveIds) (kind === "show" ? host.removeShow : host.removeMovie)(id);
            changes += plan.pushAdds.length + plan.pushRemoves.length + plan.localAdds.length + plan.localRemoveIds.length;
            host.log(`watchlist ${kind}: upp +${plan.pushAdds.length}/-${plan.pushRemoves.length}, ner +${plan.localAdds.length}/-${plan.localRemoveIds.length}`);
          }
          const confirmed = pushed ? parseWatchlist(must(await api2.getAllPages("/watchlist/items", { limit: 100 }))) : remote;
          const confirmedShows = new Set(confirmed.shows.map((e) => e.tmdbId));
          const confirmedMovies = new Set(confirmed.movies.map((e) => e.tmdbId));
          nextShows = showPlan.nextIds.filter((id) => confirmedShows.has(id));
          nextMovies = moviePlan.nextIds.filter((id) => confirmedMovies.has(id));
        }
      }
      let watchedPending = snapshot?.watchedPending ?? false;
      const unconfirmed = { ...snapshot?.unconfirmed ?? {} };
      if (doWatched) {
        const remote = parseWatched(must(await api2.getAllPages("/sync/watched", { limit: 1e3 })));
        const remoteKeys = /* @__PURE__ */ new Set([
          ...remote.episodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
          ...remote.movies.flatMap((m) => movieKeys(m))
        ]);
        for (const key of Object.keys(unconfirmed)) if (remoteKeys.has(key)) delete unconfirmed[key];
        const localEpisodes = host.getWatchedEpisodes();
        const localMovieList = host.getWatchedMovies();
        const localKeys = /* @__PURE__ */ new Set([
          ...localEpisodes.map((e) => episodeKey(e.tmdbId, e.season, e.episode)),
          ...localMovieList.flatMap((m) => movieKeys(m))
        ]);
        guard();
        const newEpisodes = remote.episodes.filter((ep) => !localKeys.has(episodeKey(ep.tmdbId, ep.season, ep.episode))).map((ep) => ({ tmdbId: ep.tmdbId, season: ep.season, episode: ep.episode, watchedAt: ep.watchedAt }));
        const newMovies = remote.movies.filter((movie) => !movieKeys(movie).some((key) => localKeys.has(key)));
        if (newEpisodes.length) host.markEpisodesWatched(newEpisodes);
        if (newMovies.length) host.markMoviesWatched(newMovies);
        const pulled = newEpisodes.length + newMovies.length;
        changes += pulled;
        const now = host.now();
        const blocked = (key) => {
          const entry = unconfirmed[key];
          return entry != null && entry.attempts >= UNCONFIRMED_MAX_ATTEMPTS && now - entry.lastAt < UNCONFIRMED_COOLDOWN_MS;
        };
        const candidates = [
          ...localEpisodes.flatMap((e) => {
            const key = episodeKey(e.tmdbId, e.season, e.episode);
            if (!e.watchedAt || remoteKeys.has(key) || blocked(key)) return [];
            return [{ key, push: { kind: "episode", tmdbId: e.tmdbId, season: e.season, episode: e.episode, watchedAt: e.watchedAt } }];
          }),
          ...localMovieList.flatMap((m) => {
            const keys2 = movieKeys(m);
            if (keys2.length === 0 || !m.watchedAt || keys2.some((k) => remoteKeys.has(k)) || blocked(keys2[0])) return [];
            return [{ key: keys2[0], push: { kind: "movie", tmdbId: m.tmdbId ?? null, imdbId: m.imdbId ?? null, watchedAt: m.watchedAt } }];
          })
        ];
        if (opts.pushWatched) {
          const batch = candidates.slice(0, WATCHED_PUSH_LIMIT_PER_RUN);
          for (let i = 0; i < batch.length; i += WATCHED_BATCH) {
            must(await api2.call("POST", "/sync/watched", { body: buildWatchedPayload(batch.slice(i, i + WATCHED_BATCH).map((c) => c.push)) }));
          }
          for (const { key } of batch) {
            const prev = unconfirmed[key];
            unconfirmed[key] = { attempts: (prev?.attempts ?? 0) + 1, lastAt: now };
          }
          changes += batch.length;
          watchedPending = candidates.length > batch.length;
          host.log(`sedda: h\xE4mtade ${pulled} nya, skickade ${batch.length}${watchedPending ? `, ${candidates.length - batch.length} v\xE4ntar` : ""}`);
        } else {
          watchedPending = candidates.length > 0;
          host.log(`sedda: h\xE4mtade ${pulled} nya (bara h\xE4mtning${watchedPending ? `, ${candidates.length} v\xE4ntar p\xE5 att skickas` : ""})`);
        }
      }
      guard();
      host.writeJson(SNAPSHOT_KEY, {
        version: SNAPSHOT_VERSION,
        accountKey,
        shows: nextShows,
        movies: nextMovies,
        // De FÖRSTA stämplarna: en ändring på mdblist.com under körningen syns
        // då nästa gång. Våra egna skrivningar kostar som mest en extra hämtning.
        activities,
        syncedKinds: { watched: wantWatched, watchlist: wantWatchlist },
        watchedHash: hashKeys(localWatchedKeys(host)),
        watchedPending,
        unconfirmed,
        fullAt: fullDue ? host.now() : snapshot?.fullAt ?? host.now(),
        syncedAt: host.now()
      });
      host.log(`synk (${opts.reason}) klar: ${changes} \xE4ndringar`);
      return { status: "done", changes };
    } catch (error) {
      if (error instanceof ScopeChanged) {
        host.log(`synk (${opts.reason}) AVBRUTEN: profilen byttes mitt i k\xF6rningen \u2014 inget mer skrivs`);
        return { status: "skipped", reason: "profilbyte" };
      }
      if (error instanceof SyncAbort) {
        const authFailed = error.result.status === 401;
        host.log(`synk (${opts.reason}) AVBRUTEN: ${error.result.error} \u2014 snapshot or\xF6rd, samma diff f\xF6rs\xF6ks igen`);
        return { status: "failed", error: error.result.error, authFailed };
      }
      const message = error instanceof Error ? error.message : String(error);
      host.log(`synk (${opts.reason}) AVBRUTEN: ${message}`);
      return { status: "failed", error: message, authFailed: false };
    } finally {
      running.delete(scope);
    }
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/tracker.ts
  var DUPLICATE_WINDOW_MS = 5e3;
  function createScrobbler(deps) {
    let lastKey = "";
    let lastAt = -Infinity;
    return async (event) => {
      if (!deps.prefs.isOn("scrobble") || !deps.api.hasAuth()) return;
      const body = buildScrobblePayload(event);
      if (!body) return;
      const key = `${event.action}:${event.tmdbId ?? event.imdbId}:${event.season ?? ""}:${event.episode ?? ""}:${Math.round(event.progress)}`;
      const now = deps.now();
      if (key === lastKey && now - lastAt < DUPLICATE_WINDOW_MS) return;
      lastKey = key;
      lastAt = now;
      const result = await deps.api.call("POST", `/scrobble/${event.action}`, { body });
      deps.log(`scrobble ${event.action} ${event.mediaType} ${event.tmdbId ?? event.imdbId} @ ${Math.round(event.progress)}%: ${result.ok ? "ok" : result.error}`);
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/host.ts
  var MDBLIST_CLIENT_ID = "COMQozk02g5TQOKSNLV3Xwccb675R0c1SycYHM0j";
  var PREFS_EVENT = "lumio-mdblist-prefs-changed";
  var AUTH_EVENT = "lumio-mdblist-auth-changed";
  var TOKEN_KEY = "mdblist_oauth";
  var LAST_SYNC_KEY = "mdblist_last_sync";
  function log(message) {
    void fetch(`/api/debug-log?msg=${encodeURIComponent(`[mdblist] ${message}`)}`).catch(() => {
    });
  }
  var readJson = (key) => {
    try {
      const raw = getScopedStorageItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  var writeJson = (key, value) => setScopedStorageItem(key, JSON.stringify(value));
  var emit3 = (name) => window.dispatchEvent(new CustomEvent(name));
  var listen3 = (name, listener) => {
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  };
  var prefs = createPrefs(
    { get: (k) => getScopedStorageItem(k), set: (k, v) => setScopedStorageItem(k, v) },
    () => emit3(PREFS_EVENT),
    "mdblist"
  );
  var onPrefsChanged = (listener) => listen3(PREFS_EVENT, listener);
  var onAuthChanged = (listener) => listen3(AUTH_EVENT, listener);
  var prefsSnapshot = () => ({
    scrobble: prefs.isOn("scrobble"),
    watched: prefs.isOn("watched"),
    watchlist: prefs.isOn("watchlist")
  });
  var lastSync = readJson(LAST_SYNC_KEY);
  var status = createStatus(lastSync ? { lastSyncAt: lastSync.at, lastChanges: lastSync.changes } : {});
  async function oauth(endpoint, form) {
    try {
      const response = await fetch("/api/plugins/mdblist/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, form })
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data };
    } catch {
      return { status: 0, data: {} };
    }
  }
  var device = createDeviceAuth({
    transport: {
      device: (form) => oauth("device-authorization", form),
      token: (form) => oauth("token", form),
      revoke: (form) => oauth("revoke_token", form)
    },
    scope: "write",
    fallbackVerificationUri: "https://mdblist.com/oauth/device/",
    readToken: () => readJson(TOKEN_KEY),
    writeToken: (token) => {
      if (token) writeJson(TOKEN_KEY, token);
      else removeScopedStorageItem(TOKEN_KEY);
      emit3(AUTH_EVENT);
    },
    now: () => Date.now(),
    schedule: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (handle) => window.clearTimeout(handle),
    clientId: MDBLIST_CLIENT_ID,
    log,
    onConnected: () => checkConnection(),
    scopeId: () => getActiveProfileId()
  });
  async function disconnect() {
    await device.disconnect();
    removeScopedStorageItem(SNAPSHOT_KEY);
    await checkConnection();
  }
  var hasAuth = () => device.hasToken();
  var api = createMdblistApi({
    fetchImpl: (...args) => fetch(...args),
    getAuth: async () => {
      const token = await device.getAccessToken();
      return token ? { accessToken: token } : null;
    },
    hasAuth,
    now: () => Date.now(),
    log,
    onPause: (until) => status.set({ pausedUntil: until })
  });
  var scrobbler = createScrobbler({ api, prefs, now: () => Date.now(), log });
  var listSource = createListSource({ api, readJson, writeJson, now: () => Date.now(), log, lang: () => readStoredLang() });
  var isTraktConnected = () => Boolean(getTraktAuth());
  var syncHost = {
    getShows: () => getWatchlist(),
    getMovies: () => getMovieWatchlist(),
    addShows: (entries) => addWatchlistEntries(entries, { source: "tracker" }),
    removeShow: (id) => removeFromWatchlist(id, { source: "tracker" }),
    addMovies: (entries) => addMovieWatchlistEntries(entries.map((e) => ({ ...e, monitorForStreams: false })), { source: "tracker" }),
    removeMovie: (id) => removeFromMovieWatchlist(id, { source: "tracker" }),
    getWatchedEpisodes: () => getWatchedEpisodes(),
    getWatchedMovies: () => getWatchedMovies(),
    markEpisodesWatched: (episodes) => {
      addWatchedEpisodes(episodes, { source: "tracker" });
    },
    markMoviesWatched: (movies) => {
      addWatchedMovies(movies, { source: "tracker" });
    },
    planWatchlistSync: (local, remote, snap, rule, opts) => planWatchlistSync(local, remote, snap, rule, opts),
    readJson,
    writeJson,
    waitForStartIdle: () => waitForStartIdle2(),
    log,
    now: () => Date.now(),
    accountKey: () => status.get().accountKey,
    scopeId: () => getActiveProfileId()
  };
  async function checkConnection() {
    if (!hasAuth()) {
      status.set({ connection: "none", username: null, supporter: false, accountKey: null });
      return;
    }
    const scope = getActiveProfileId();
    const previous = status.get().connection;
    if (previous === "none" || previous === "bad-key") status.set({ connection: "checking" });
    const result = await api.call("GET", "/user");
    if (getActiveProfileId() !== scope) return;
    if (result.ok) {
      const user = parseUser(result.data);
      status.set({ connection: "ok", username: user.username, supporter: user.supporter, accountKey: user.accountKey });
    } else if (result.status === 401) {
      status.set({ connection: "bad-key", username: null, supporter: false, accountKey: null });
    } else if (result.status === 429) {
      status.set({ connection: previous === "checking" ? "ok" : previous, pausedUntil: api.pausedUntil() });
    } else {
      status.set({ connection: "offline" });
    }
  }
  async function syncNow(opts) {
    status.set({ syncing: true });
    const out = await runMdblistSync({ host: syncHost, api, prefs }, opts);
    const patch = { syncing: false, pausedUntil: api.pausedUntil() };
    if (out.status === "done" || out.status === "unchanged") {
      patch.lastSyncAt = Date.now();
      patch.lastChanges = out.status === "done" ? out.changes : 0;
      writeJson(LAST_SYNC_KEY, { at: patch.lastSyncAt, changes: patch.lastChanges });
    }
    if (out.status === "failed" && out.authFailed) patch.connection = "bad-key";
    status.set(patch);
    if (out.status === "done" || out.status === "unchanged") {
      await pullPlayback({
        enabled: prefs.isOn("watched") && api.hasAuth() && api.pausedUntil() <= Date.now(),
        importer: canImportPlaybackPositions() ? (items2) => importPlaybackPositions("mdblist", items2) : null,
        fetch: async () => {
          const result = await api.call("GET", "/sync/playback");
          return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
        },
        log
      }).catch((error) => log(`forts\xE4tt titta: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  var tickListeners = /* @__PURE__ */ new Set();
  var ticker = null;
  device.subscribe(() => {
    const waiting = device.state().phase === "waiting";
    if (waiting && ticker == null) {
      ticker = window.setInterval(() => {
        for (const l of tickListeners) l();
      }, 1e3);
    } else if (!waiting && ticker != null) {
      window.clearInterval(ticker);
      ticker = null;
    }
  });
  var onTick = (listener) => {
    tickListeners.add(listener);
    return () => {
      tickListeners.delete(listener);
    };
  };
  function startBackground() {
    void checkConnection();
    const offAuthCheck = onAuthChanged(() => {
      void checkConnection();
    });
    const offProfileCheck = onProfileChanged(() => {
      device.cancel();
      status.set({ connection: "none", username: null, supporter: false, accountKey: null });
      restartBridge();
      void checkConnection();
    });
    const stopScheduler = startScheduler({
      run: (opts) => syncNow(opts),
      neverSynced: () => hasAuth() && status.get().lastSyncAt == null,
      onKeyChanged: (l) => onAuthChanged(l),
      onPrefsChanged: (l) => onPrefsChanged(l),
      onProfileChanged: (l) => onProfileChanged(l)
    });
    const makeBridge = () => startBridge({
      subscribe: {
        onShow: (l) => onWatchlistMutation(l),
        onMovie: (l) => onMovieWatchlistMutation(l),
        onEpisodeWatched: (l) => onWatchedEpisodeMutation(l),
        onMovieWatched: (l) => onWatchedMovieMutation(l)
      },
      api,
      prefs,
      isUserMutation,
      log,
      now: () => Date.now(),
      schedule: (fn, ms) => window.setTimeout(fn, ms),
      cancel: (h) => window.clearTimeout(h)
    });
    let stopBridge = makeBridge();
    function restartBridge() {
      stopBridge();
      stopBridge = makeBridge();
    }
    return () => {
      offAuthCheck();
      offProfileCheck();
      stopScheduler();
      stopBridge();
      device.cancel();
    };
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/rows.ts
  var clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  function countdown(msLeft) {
    const s = Math.max(0, Math.ceil(msLeft / 1e3));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function isConnected(view) {
    return view.hasAuth && view.status.connection !== "bad-key";
  }
  function connectionTitle(status2, hasAuth2) {
    if (!hasAuth2) return S.notConnected;
    if (status2.connection === "bad-key") return S.badKey;
    if (status2.connection === "offline") return S.offline;
    if (status2.connection === "checking") return S.checking;
    return status2.username ? fillBoth(S.connectedAs, { name: status2.username }) : S.connected;
  }
  function changesText(n) {
    if (n === 0) return S.changesNone;
    if (n === 1) return S.changesOne;
    return fillBoth(S.changesMany, { n });
  }
  function syncText(status2, now) {
    if (status2.pausedUntil > now) return fillBoth(S.pausedUntil, { time: clock(status2.pausedUntil) });
    if (status2.syncing) return S.syncingLong;
    if (!status2.lastSyncAt) return S.neverSynced;
    const changes = changesText(status2.lastChanges);
    const time = clock(status2.lastSyncAt);
    const out = {};
    for (const l of ["en", "sv", "de", "fr", "es"]) out[l] = fill2(S.lastSync[l], { time, changes: changes[l] });
    return out;
  }
  function deviceRows(view, actions) {
    const { device: device2 } = view;
    switch (device2.phase) {
      case "waiting":
        if (!device2.userCode) return [{ t: "note", text: S.checking }];
        return [
          { t: "qr", label: S.deviceCode, hint: S.deviceScanHint, value: device2.userCode, url: device2.verificationUriComplete },
          { t: "note", text: fillBoth(S.deviceWaiting, { time: countdown((device2.expiresAt ?? view.now) - view.now) }) },
          { t: "action", label: S.cancel, run: actions.cancelConnect }
        ];
      case "checking":
        return [{ t: "note", text: S.deviceChecking }];
      case "expired":
      case "denied":
      case "error":
        return [
          { t: "note", text: device2.phase === "expired" ? S.deviceExpired : device2.phase === "denied" ? S.deviceDenied : S.deviceError },
          { t: "action", label: S.deviceNewCode, run: actions.connect }
        ];
      default:
        return [];
    }
  }
  function buildTvRows(view, actions) {
    const rows = [{ t: "eyebrow", label: S.tvAccount }];
    const flow = deviceRows(view, actions);
    if (flow.length > 0) return [...rows, ...flow];
    if (!isConnected(view)) {
      rows.push({
        t: "action",
        label: S.connect,
        hint: view.status.connection === "bad-key" ? S.badKeyBody : S.tvConnectHint,
        value: view.status.connection === "bad-key" ? S.badKey : void 0,
        danger: view.status.connection === "bad-key",
        run: actions.connect
      });
      return rows;
    }
    rows.push({ t: "action", label: S.pluginName, hint: S.tvConnectedHint, value: connectionTitle(view.status, view.hasAuth) });
    if (view.viaOauth) {
      rows.push({
        t: "action",
        label: S.disconnect,
        danger: true,
        run: actions.disconnect,
        confirm: { title: S.disconnect, body: S.notConnectedBody, confirmLabel: S.disconnect }
      });
    }
    const paused = view.status.pausedUntil > view.now;
    rows.push(
      { t: "eyebrow", label: S.whatSyncs },
      { t: "toggle", label: S.scrobble, hint: S.scrobbleHintTv, value: view.prefs.scrobble, set: (v) => actions.setPref("scrobble", v) },
      { t: "toggle", label: S.syncWatched, hint: S.syncWatchedHintTv, value: view.prefs.watched, set: (v) => actions.setPref("watched", v) },
      { t: "toggle", label: S.syncWatchlist, hint: S.syncWatchlistHintTv, value: view.prefs.watchlist, set: (v) => actions.setPref("watchlist", v) },
      { t: "note", text: syncText(view.status, view.now) }
    );
    if (!paused) {
      rows.push({ t: "action", label: S.syncNow, value: view.status.syncing ? S.syncing : void 0, run: actions.syncNow });
    }
    if (view.traktConnected && (view.prefs.scrobble || view.prefs.watched)) rows.push({ t: "note", text: S.traktTip });
    return rows;
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/onboarding-card.tsx
  init_react_shim();
  init_plugin_sdk();

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/settings-section.tsx
  init_react_shim();
  init_plugin_sdk();
  init_jsx_runtime_shim();
  var MINT = "#3CD6A3";
  var RED = "#FF5A6A";
  function useLive() {
    const [, rerender] = useState(0);
    const bump = () => rerender((n) => n + 1);
    useEffect(() => {
      const offs = [status.subscribe(bump), device.subscribe(bump), onTick(bump), onProfileChanged(bump)];
      return () => {
        for (const off of offs) off();
      };
    }, []);
    const pausedUntil = status.get().pausedUntil;
    useEffect(() => {
      const left = pausedUntil - Date.now();
      if (left <= 0) return;
      const timer2 = window.setTimeout(bump, left + 50);
      return () => window.clearTimeout(timer2);
    }, [pausedUntil]);
    return bump;
  }
  function MdblistSettingsSection() {
    const { lang } = useLang();
    const tx = (text) => resolvePluginText(text, lang);
    useLive();
    const state = status.get();
    const flow = device.state();
    const authed = hasAuth();
    const ok = authed && state.connection === "ok";
    const badge = !authed ? { text: S.badgeNotConnected, bg: "rgba(255,255,255,.06)", fg: "#8b8e99" } : state.connection === "bad-key" ? { text: S.badgeBadKey, bg: "rgba(255,90,106,.14)", fg: RED } : { text: S.badgeConnected, bg: "rgba(60,214,163,.14)", fg: MINT };
    const body = !authed ? S.notConnectedBody : state.connection === "bad-key" ? S.badKeyBody : S.connectedBody;
    return /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 14.5, fontWeight: 600, color: TOKENS.text }, children: tx(connectionTitle(state, authed)) }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: 12.5, lineHeight: 1.5, color: TOKENS.textMute, maxWidth: "62ch", marginTop: 4 }, children: [
            ok && state.supporter ? "MDBList Supporter \xB7 " : "",
            tx(body)
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 10, fontWeight: 600, letterSpacing: ".08em", padding: "3px 7px", borderRadius: 4, background: badge.bg, color: badge.fg, whiteSpace: "nowrap" }, children: tx(badge.text) })
      ] }),
      /* @__PURE__ */ jsx(DeviceFlow, { tx }),
      flow.phase === "idle" || flow.phase === "done" ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
        !device.hasToken() || state.connection === "bad-key" ? /* @__PURE__ */ jsx(PillBtn, { variant: "accent", onClick: () => {
          void device.start();
        }, children: tx(S.connect) }) : null,
        device.hasToken() ? /* @__PURE__ */ jsx(PillBtn, { onClick: () => {
          void disconnect();
        }, children: tx(S.disconnect) }) : null
      ] }) : null
    ] }) }) });
  }
  function MdblistSyncSection() {
    const { lang } = useLang();
    const tx = (text) => resolvePluginText(text, lang);
    const bump = useLive();
    const state = status.get();
    const authed = hasAuth();
    const connected = authed && state.connection !== "bad-key";
    const ok = connected && state.connection === "ok";
    const on = prefsSnapshot();
    const paused = state.pausedUntil > Date.now();
    const toggle = (kind) => (value) => {
      prefs.setOn(kind, value);
      bump();
    };
    return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
      !connected ? /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: TOKENS.textDim }, children: tx(S.connectFirst) }) : null,
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--st-box)", borderRadius: 10, padding: "0 18px" }, children: [
        /* @__PURE__ */ jsx(ToggleRow, { first: true, title: tx(S.scrobble), hint: tx(S.scrobbleHint), checked: on.scrobble, disabled: !ok, onChange: toggle("scrobble") }),
        /* @__PURE__ */ jsx(ToggleRow, { title: tx(S.syncWatched), hint: tx(S.syncWatchedHint), checked: on.watched, disabled: !ok, onChange: toggle("watched") }),
        /* @__PURE__ */ jsx(ToggleRow, { title: tx(S.syncWatchlist), hint: tx(S.syncWatchlistHint), checked: on.watchlist, disabled: !ok, onChange: toggle("watchlist") })
      ] }) }),
      connected && paused ? /* @__PURE__ */ jsxs("div", { style: { padding: "10px 14px", borderRadius: 12, border: `1px solid ${TOKENS.warn}`, background: "rgba(243,201,105,.08)" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 13, fontWeight: 600, color: TOKENS.warn }, children: tx(syncText(state, Date.now())) }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12, lineHeight: 1.5, color: TOKENS.textDim, marginTop: 2 }, children: tx(S.pausedBody) })
      ] }) : ok ? /* @__PURE__ */ jsx(Card, { padding: "14px 18px", children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 14.5, color: "#e8e8ec" }, children: tx(syncText(state, Date.now())) }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: 12.5, color: TOKENS.textMute, marginTop: 2 }, children: tx(S.syncAuto) })
        ] }),
        /* @__PURE__ */ jsx(
          PillBtn,
          {
            icon: "refresh",
            onClick: () => {
              void syncNow({ pushWatched: true, reason: "Synka nu" });
            },
            disabled: state.syncing || !on.watched && !on.watchlist,
            children: tx(state.syncing ? S.syncing : S.syncNow)
          }
        )
      ] }) }) : null,
      ok && isTraktConnected() && (on.watched || on.scrobble) ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,.035)" }, children: [
        /* @__PURE__ */ jsx(Icon, { name: "warning", size: 16, color: TOKENS.textDim }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12.5, color: TOKENS.textDim }, children: tx(S.traktTip) })
      ] }) : null
    ] });
  }
  function DeviceFlow({ tx }) {
    const flow = device.state();
    if (flow.phase === "idle" || flow.phase === "done") return null;
    if (flow.phase === "checking" || flow.phase === "waiting" && !flow.userCode) {
      return /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: TOKENS.textDim }, children: tx(S.deviceChecking) });
    }
    if (flow.phase !== "waiting") {
      const text = flow.phase === "expired" ? S.deviceExpired : flow.phase === "denied" ? S.deviceDenied : S.deviceError;
      return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: 13, color: flow.phase === "expired" ? TOKENS.textDim : RED }, children: tx(text) }),
        /* @__PURE__ */ jsx(PillBtn, { variant: "accent", onClick: () => {
          void device.start();
        }, children: tx(S.deviceNewCode) }),
        /* @__PURE__ */ jsx(PillBtn, { onClick: () => device.cancel(), children: tx(S.cancel) })
      ] });
    }
    const left = (flow.expiresAt ?? Date.now()) - Date.now();
    return /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("div", { style: { background: "#f4f4f6", borderRadius: 10, padding: 12, lineHeight: 0 }, children: /* @__PURE__ */ jsx(QRCodeSVG, { value: flow.verificationUriComplete ?? "", size: 148 }) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12.5, color: TOKENS.textMute, maxWidth: "44ch" }, children: tx(S.deviceIntro) }),
        /* @__PURE__ */ jsx("div", { style: { ...eyebrowStyle }, children: tx(S.deviceCode) }),
        /* @__PURE__ */ jsx("div", { style: { fontFamily: monoFont, fontSize: 26, letterSpacing: ".12em", color: TOKENS.text }, children: flow.userCode }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: flow.verificationUriComplete,
            onClick: (e) => {
              e.preventDefault();
              void openExternalUrl(flow.verificationUriComplete ?? "");
            },
            style: { color: TOKENS.accent, fontSize: 13, cursor: "pointer" },
            children: [
              (flow.verificationUri ?? "https://mdblist.com/oauth/device/").replace(/^https?:\/\//, ""),
              " \u2197"
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 12.5, color: TOKENS.textDim }, children: tx(fillBoth(S.deviceWaiting, { time: countdown(left) })) }),
          /* @__PURE__ */ jsx(PillBtn, { onClick: () => device.cancel(), children: tx(S.cancel) })
        ] })
      ] })
    ] });
  }
  function ToggleRow({ title, hint, checked, disabled, onChange, first }) {
    const row = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
      padding: "17px 0",
      borderTop: first ? "none" : "1px solid var(--st-line)",
      opacity: disabled ? 0.5 : 1
    };
    return /* @__PURE__ */ jsxs("div", { style: row, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 14.5, color: "#e8e8ec" }, children: title }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 13, lineHeight: 1.5, color: "#8b8e99", maxWidth: "62ch", marginTop: 4 }, children: hint })
      ] }),
      /* @__PURE__ */ jsx(Switch, { checked, disabled, onChange })
    ] });
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/onboarding-card.tsx
  init_jsx_runtime_shim();
  function MdblistOnboardingCard({ init }) {
    const { lang } = useLang();
    const tx = (text) => resolvePluginText(text, lang);
    useLive();
    useEffect(() => {
      if (hasAuth()) void checkConnection();
    }, []);
    const state = status.get();
    const flow = device.state();
    const connected = hasAuth() && state.connection !== "bad-key";
    const busy = flow.phase === "waiting" || flow.phase === "checking";
    const finished = flow.phase === "expired" || flow.phase === "denied" || flow.phase === "error";
    return /* @__PURE__ */ jsxs("div", { className: "onb-panel", "data-size": "sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "onb-row", children: [
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("p", { className: "onb-card-title", children: "MDBList" }),
          /* @__PURE__ */ jsx("p", { className: "onb-hint", style: { marginTop: "calc(2 * var(--u))" }, children: tx(connected ? S.onboardingConnected : S.onboardingHint) })
        ] }),
        connected ? /* @__PURE__ */ jsx("p", { className: "onb-status", style: { color: "var(--onb-ok)", fontWeight: 500 }, children: tx(connectionTitle(state, true)) }) : /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "onb-btn",
            "data-size": "sm",
            disabled: busy,
            onClick: () => {
              void device.start();
            },
            ...init && !busy ? { "data-init": "" } : {},
            children: tx(busy ? S.checking : finished ? S.deviceNewCode : S.connect)
          }
        )
      ] }),
      !connected && flow.phase === "waiting" && flow.userCode ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "calc(16 * var(--u))", alignItems: "center", flexWrap: "wrap", marginTop: "calc(12 * var(--u))" }, children: [
        /* @__PURE__ */ jsx("div", { style: { background: "#f4f4f6", borderRadius: 10, padding: 10, lineHeight: 0 }, children: /* @__PURE__ */ jsx(QRCodeSVG, { value: flow.verificationUriComplete ?? "", size: 132 }) }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "calc(6 * var(--u))", minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("p", { className: "onb-hint", children: tx(S.deviceIntro) }),
          /* @__PURE__ */ jsx("p", { style: { fontFamily: monoFont, fontSize: "calc(26 * var(--u))", letterSpacing: ".12em", margin: 0 }, children: flow.userCode }),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: flow.verificationUriComplete,
              onClick: (e) => {
                e.preventDefault();
                void openExternalUrl(flow.verificationUriComplete ?? "");
              },
              className: "onb-status",
              style: { cursor: "pointer" },
              children: [
                (flow.verificationUri ?? "https://mdblist.com/oauth/device/").replace(/^https?:\/\//, ""),
                " \u2197"
              ]
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "onb-small-note", children: tx(fillBoth(S.deviceWaiting, { time: countdown((flow.expiresAt ?? Date.now()) - Date.now()) })) })
        ] })
      ] }) : null,
      !connected && finished ? /* @__PURE__ */ jsx("p", { className: "onb-status", style: { marginTop: "calc(8 * var(--u))", color: "var(--onb-danger)" }, children: tx(flow.phase === "expired" ? S.deviceExpired : flow.phase === "denied" ? S.deviceDenied : S.deviceError) }) : null
    ] });
  }

  // ../../../lumio-official-plugins-langs/plugins/mdblist/runtime/index.ts
  function getStatus() {
    const state = status.get();
    const base = { canConnect: true, requiresUserGesture: true, supportsSilentReconnect: false };
    if (!hasAuth()) return { ...base, state: "disconnected", canDisconnect: false };
    if (state.connection === "bad-key") return { ...base, state: "error", canDisconnect: device.hasToken(), detail: S.badKey };
    return { ...base, state: "connected", canDisconnect: device.hasToken(), accountLabel: state.username ?? "MDBList" };
  }
  var authProvider = {
    id: "mdblist-auth",
    pluginId: "com.lumio.mdblist",
    label: S.pluginName,
    getStatus,
    async disconnect() {
      await disconnect();
    },
    async trySilentReconnect() {
      return hasAuth() ? "success" : "needs_user_action";
    }
  };
  function MdblistBootstrap() {
    useEffect(() => {
      const stop = startBackground();
      const offStatus = status.subscribe(() => notifyAuthCapabilitiesChanged());
      return () => {
        stop();
        offStatus();
      };
    }, []);
    return null;
  }
  var MdblistPlugin = {
    id: "com.lumio.mdblist",
    name: S.pluginName,
    version: "0.1.0",
    description: S.description,
    preinstalled: true,
    // Kortet i onboardingens Integrationer-steg — läses ur bunten före installationen.
    onboarding: { Card: MdblistOnboardingCard },
    register(ctx) {
      ctx.registerAuthCapabilityProvider(authProvider);
      ctx.registerBootstrap({ id: "mdblist-background", Mount: MdblistBootstrap });
      ctx.registerTracker?.({ id: "mdblist", label: S.pluginName, scrobble: scrobbler });
      ctx.registerListSource?.({ id: "mdblist", label: S.listSourceLabel, ...listSource });
      ctx.registerSettingsSection({
        id: "mdblist",
        label: S.pluginName,
        Section: MdblistSettingsSection,
        rows: () => buildTvRows(
          {
            status: status.get(),
            prefs: prefsSnapshot(),
            hasAuth: hasAuth(),
            viaOauth: device.hasToken(),
            device: device.state(),
            traktConnected: isTraktConnected(),
            now: Date.now()
          },
          {
            setPref: (kind, on) => prefs.setOn(kind, on),
            syncNow: () => {
              void syncNow({ pushWatched: true, reason: "Synka nu (TV)" });
            },
            connect: () => {
              void device.start();
            },
            cancelConnect: () => device.cancel(),
            disconnect: () => {
              void disconnect();
            }
          }
        ),
        subscribe: (listener) => {
          const offs = [status.subscribe(listener), device.subscribe(listener), onTick(listener), onAuthChanged(listener), onProfileChanged(listener)];
          return () => {
            for (const off of offs) off();
          };
        }
      });
      ctx.registerSettingsSection({
        id: "mdblist-sync",
        label: S.pluginName,
        Section: MdblistSyncSection
      });
    }
  };

  // ../../../../../../private/var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/wrapper-entry.ts
  var plugin = Reflect.get(runtime_exports, "default") ?? Object.values(runtime_exports).find((value) => value && typeof value === "object" && "id" in value && "register" in value);
  if (!plugin) {
    throw new Error("Could not find a Lumio plugin export in runtime entry.");
  }
  globalThis.__lumioPluginRuntimeBundle = plugin;
})();
/*! Bundled license information:

qrcode.react/lib/esm/index.js:
  (**
   * @license QR Code generator library (TypeScript)
   * Copyright (c) Project Nayuki.
   * SPDX-License-Identifier: MIT
   *)
  (**
   * @license qrcode.react
   * Copyright (c) Paul O'Shannessy
   * SPDX-License-Identifier: ISC
   *)

react-dom/cjs/react-dom.production.js:
  (**
   * @license React
   * react-dom.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
