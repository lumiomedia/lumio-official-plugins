(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
          return invoke6(`plugin:${this.plugin}|remove_listener`, {
            event: this.event,
            channelId: this.channelId
          });
        }
      };
      async function addPluginListener(plugin2, event, cb) {
        const handler = new Channel(cb);
        try {
          await invoke6(`plugin:${plugin2}|register_listener`, {
            event,
            handler
          });
          return new PluginListener(plugin2, event, handler.id);
        } catch {
          await invoke6(`plugin:${plugin2}|registerListener`, { event, handler });
          return new PluginListener(plugin2, event, handler.id);
        }
      }
      async function checkPermissions(plugin2) {
        return invoke6(`plugin:${plugin2}|check_permissions`);
      }
      async function requestPermissions(plugin2) {
        return invoke6(`plugin:${plugin2}|request_permissions`);
      }
      async function invoke6(cmd, args = {}, options) {
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
          return invoke6("plugin:resources|close", {
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
      exports.invoke = invoke6;
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
      async function listen3(event, handler, options) {
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
        return listen3(event, (eventData) => {
          void _unlisten(event, eventData.id);
          handler(eventData);
        }, options);
      }
      async function emit3(event, payload) {
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
      exports.emit = emit3;
      exports.emitTo = emitTo;
      exports.listen = listen3;
      exports.once = once;
    }
  });

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
  var init_session_host = __esm({
    "lib/session-host.ts"() {
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
    getLibraryProviders: () => getLibraryProviders,
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
        bootstraps.push(bootstrap);
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
    return bootstraps;
  }
  function getHeroes() {
    return heroes;
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
  var streamProviders, libraryProviders, mediaStreamCatalogProviders, mediaStreamAvailabilityProviders, instantPlayProviders, resumeRefreshProviders, playableUrlRewriters, streamRequestConfigProviders, episodeSidebarProviders, playbackCapabilityProviders, syncIdentityProviders, authCapabilityProviders, overviewStatusProviders, settingsSections, mediaDownloadActions, mediaDetailsActions, homeRows, homeSources, bootstraps, heroes, homeOverrides, browsePages, mainMenuItems, topbarItems, managedAuthConsumers, registeredPluginIds, registryRevision, registryListeners, registryNotifyScheduled, ownedMainMenuItemIds;
  var init_plugin_registry = __esm({
    "lib/plugin-registry.ts"() {
      "use strict";
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
      browsePages = [];
      mainMenuItems = [];
      topbarItems = [];
      managedAuthConsumers = [];
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
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (userAgent.includes("Tauri")) return true;
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
      init_plugin_registry();
      isTauriEnv = detectTauriEnv();
      hasTauriIpc = typeof window !== "undefined" && Boolean(
        window.__TAURI_INTERNALS__ || window.__TAURI__
      );
      isDesktopTauriEnv = isTauriEnv && hasTauriIpc && !(typeof navigator !== "undefined" && /android/i.test(navigator.userAgent));
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

  // lib/storage-quota.ts
  var init_storage_quota = __esm({
    "lib/storage-quota.ts"() {
      "use client";
      init_app_storage();
    }
  });

  // lib/app-storage.ts
  function ensureStore() {
    if (store) return store;
    const seeded = /* @__PURE__ */ new Map();
    if (typeof window !== "undefined") {
      const snapshot = window.__lumioNativeStorageSnapshot;
      if (snapshot) {
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
  var store;
  var init_app_storage = __esm({
    "lib/app-storage.ts"() {
      "use client";
      init_storage_quota();
      store = null;
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
  function readStoredLang() {
    if (typeof window === "undefined") return DEFAULT_LANG;
    try {
      const scoped = getScopedStorageItem(STORAGE_KEY);
      const legacy = getItem(STORAGE_KEY);
      const value = scoped ?? legacy;
      if (value === "sv" || value === "en") return value;
    } catch {
    }
    return DEFAULT_LANG;
  }
  function useLang() {
    const ctx = useContext(LangContext);
    const detached = ctx === detachedLangContextValue;
    const [detachedLang, setDetachedLang] = useState(() => readStoredLang());
    useEffect(() => {
      if (!detached || typeof window === "undefined") return;
      const sync = () => setDetachedLang(readStoredLang());
      sync();
      window.addEventListener(LANG_CHANGED_EVENT, sync);
      const offProfile = onProfileChanged(sync);
      return () => {
        window.removeEventListener(LANG_CHANGED_EVENT, sync);
        offProfile();
      };
    }, [detached]);
    const detachedValue = useMemo(() => ({
      lang: detachedLang,
      setLang: (l) => {
        setScopedStorageItem(STORAGE_KEY, l);
        setDetachedLang(l);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(LANG_CHANGED_EVENT));
        }
      },
      t: (key) => strings[detachedLang][key] ?? strings.en[key]
    }), [detachedLang]);
    if (!detached) return ctx;
    return detachedValue;
  }
  var strings, detachedLangContextValue, LangContext, LANG_CHANGED_EVENT, STORAGE_KEY, DEFAULT_LANG;
  var init_i18n = __esm({
    "lib/i18n.tsx"() {
      "use strict";
      "use client";
      init_app_storage();
      init_react_shim();
      init_profile_storage_shim();
      init_jsx_runtime_shim();
      strings = {
        en: {
          // Nav
          calendar: "Calendar",
          releases: "Releases",
          settings: "Settings",
          lastWatched: "Continue watching",
          watchHistory: "History",
          startNextSource: "The source didn\u2019t respond \u2014 trying the next\u2026",
          startNextSourceNamed: "The source didn\u2019t respond \u2014 trying {stream}\u2026",
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
          sceneReleases: "Scene Releases",
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
          streamDeviceUnsupportedHint: "This device lacks a decoder for this stream (lossless audio or Dolby Vision) \u2014 expect no sound, or no playback.",
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
          sideMenuDesc: "A floating icon rail on the left instead of the horizontal menu. Search moves into the rail. Desktop only.",
          sideMenuLockedByPill: "Turned off while the menu pill is on \u2014 the pill is the menu then.",
          sideMenuOn: "Side menu",
          menuChipTitle: "Menu pill (TV style)",
          menuChipDesc: "The TV mode menu pill in the top-left corner, with search inside the menu. Replaces the side menu and the top bar on desktop, and the top bar on mobile.",
          menuPillPlaceTitle: "Menu pill position",
          menuPillPlaceDesc: "Pick a corner, or hold the pill until it wiggles and drag it anywhere. It snaps to the nearest edge and keeps the height you dropped it at.",
          menuPillTopLeft: "Top left",
          menuPillTopRight: "Top right",
          menuPillBottomLeft: "Bottom left",
          menuPillBottomRight: "Bottom right",
          sideMenuOff: "Horizontal menu",
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
          appUpdatePromptLater: "Not now",
          appUpdateRestarting: "Update installed \u2014 Lumio is restarting\u2026",
          appUpdateDmgOpened: "The installer was downloaded and opened \u2014 drag Lumio to Applications.",
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
          subtitleAnchorApplied: "Synced from your tap",
          subtitleAnchorDrift: "drift corrected too",
          subtitleManualSync: "Sync by ear",
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
          subtitleManualSyncTapPrompt: "Press when you hear a line you recognise",
          subtitleManualSyncTapButton: "I hear it now",
          subtitleManualSyncPickPrompt: "Which line did you just hear?",
          subtitleManualSyncSecondHint: "Repeat this later in the film to also correct drift.",
          subtitleManualSyncNoCues: "No subtitle lines near this point.",
          subtitleManualSyncApplying: "Applying your sync\u2026",
          subtitleManualSyncRefining: "Fine-tuning against the audio\u2026",
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
          cancel2: "Cancel",
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
          langRegionDesc: "Country code for availability \u2014 which streaming services and release dates apply.",
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
          traktAutoUnfollowSeriesHint: "Removes a series once you have watched its final season in full. Your watch history is kept, so a revived show can come back.",
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
          ipDescMdblist: "Aggregated scores from Trakt, Letterboxd and more on the details page. Free key at mdblist.com.",
          ipRpdbHint: "With a key set, card posters swap to RPDB rated posters (IMDb-keyed).",
          ipMdblistHint: "Shown as extra badges next to the year on the details page.",
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
          hapticsReceiverNone: "No Lumio found. Turn on \u201CAllow Feel the bass from a phone\u201D on the Mac or TV.",
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
          subtitlePreviewText: "This is how your subtitles will look",
          subtitlePreviewCaption: "Preview of the default look",
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
          ipLanAllow: "Allow",
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
          hpTopSlotTitle: "Top row",
          hpTopSlotHint: "What sits at the top centre: the filter row or a search field. Filters always win on pages that have them, so the two can never share the spot.",
          hpTopSlotFilterPages: "Filters where they apply",
          hpTopSlotFilterAll: "Filters on every page",
          hpTopSlotSearch: "Search field",
          hpTopSlotNone: "Nothing (filters sit above the grid)",
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
          profWrAOther: "without a map"
        },
        sv: {
          // Nav
          calendar: "Kalender",
          releases: "Releases",
          settings: "Inst\xE4llningar",
          lastWatched: "Forts\xE4tt titta",
          watchHistory: "Historik",
          startNextSource: "K\xE4llan svarade inte \u2014 provar n\xE4sta\u2026",
          startNextSourceNamed: "K\xE4llan svarade inte \u2014 provar {stream}\u2026",
          startSlateNext: "K\xE4llan skickade ingen film \u2014 provar {stream}\u2026",
          startCancel: "Avbryt",
          startNoSourceTitle: "Ingen k\xE4lla startade",
          startNoSourceDesc: "Vi provade {n} k\xE4llor. V\xE4lj en sj\xE4lv eller f\xF6rs\xF6k igen.",
          startPickSource: "V\xE4lj k\xE4lla",
          startRetry: "F\xF6rs\xF6k igen",
          barcodes: "Barcodes",
          barcodeKicker: "Bibliotek",
          barcodeFilterAll: "Alla",
          barcodeFilterPartial: "P\xE5g\xE5ende",
          barcodeFilterDone: "Klara",
          barcodeViewGrid: "Rutn\xE4t",
          barcodeViewList: "Remsor",
          barcodeViewRing: "Ringar",
          barcodeViewShelf: "Hylla",
          barcodeShelfStyle: "Hyllans stil",
          barcodeShelfSpines: "Ryggar",
          barcodeShelfPoster: "Affisch",
          barcodeShelfRing: "Ring",
          barcodeShelfPortrait: "St\xE5ende",
          barcodePosterPortrait: "St\xE5ende",
          barcodeSearch: "S\xF6k",
          barcodeSort: "Sortera",
          barcodeSortRecent: "Senast",
          barcodeSortTitle: "Titel",
          barcodeSortYear: "\xC5r",
          barcodePage: "Sida {p} av {n}",
          barcodePrev: "F\xF6reg\xE5ende",
          barcodeNext: "N\xE4sta",
          barcodeNoMatches: "Inga tr\xE4ffar",
          barcodeSetShelfStyle: "Hyllans standardstil",
          barcodeSetShelfPaper: "Hyllans papper",
          barcodePaperLightShort: "Ljust",
          barcodePaperDarkShort: "M\xF6rkt",
          barcodeResume: "Forts\xE4tt",
          barcodeResumeFrom: "Forts\xE4tt fr\xE5n {t}",
          barcodePlayAgain: "Spela igen",
          barcodeStartOver: "B\xF6rja om",
          barcodeShare: "Dela",
          barcodeShareSoFar: "Dela hittills",
          barcodeShareTitle: "Dela {title}",
          barcodeShareImage: "Bild",
          barcodeShareStory: "Story",
          barcodeShareWallpaper: "Tapet",
          barcodeSharePoster: "Affisch",
          barcodePosterCredits: "F\xF6rtexter",
          barcodePosterTitleCard: "Titelkort",
          barcodePosterRing: "Ring",
          barcodePaperLight: "Ljust papper",
          barcodePaperDark: "M\xF6rkt papper",
          barcodePosterDirectedBy: "Regi",
          barcodePosterWrittenBy: "Manus",
          barcodePosterStarring: "I rollerna",
          barcodePosterMusicBy: "Musik",
          barcodePosterCinematographyBy: "Foto",
          barcodePosterEditedBy: "Klippning",
          barcodePosterCreditLine: "{label}: {name}",
          barcodeShareTitleYear: "Titel och \xE5r",
          barcodeShareCopy: "Kopiera bild",
          barcodeShareSave: "Spara PNG",
          barcodeShareSaved: "Sparad som PNG",
          barcodeShareCopied: "Bild kopierad",
          barcodeShareSaveFailed: "Kunde inte spara bilden",
          barcodeShareCopyFailed: "Kunde inte kopiera bilden",
          barcodeShareCopyShort: "Kopiera",
          barcodeShareSend: "Dela bild",
          barcodeShareFailed: "Kunde inte dela bilden",
          barcodeShareToPhone: "Dela till telefonen",
          barcodeShareToPhoneDesc: "Skanna med telefonen f\xF6r att spara bilden eller dela den vidare.",
          barcodeShareNoLan: "Enheten har ingen n\xE4tverksadress som telefonen kan n\xE5.",
          barcodeShareDone: "Klar",
          barcodeYouAreHere: "Du \xE4r h\xE4r \xB7 {t}",
          barcodePlayFrom: "Spela fr\xE5n {t}",
          barcodeNotWatched: "inte sett",
          barcodeClickHint: "Klicka i remsan f\xF6r att spela d\xE4rifr\xE5n",
          barcodeTapHint: "Tryck i remsan f\xF6r att spela d\xE4rifr\xE5n",
          barcodeStatusPartial: "{p} % sett \xB7 forts\xE4tt {t}",
          barcodeStatusPartialShort: "{p} % \xB7 {t}",
          barcodeStatusPartialNoResume: "{p} % sett",
          barcodePlay: "Spela",
          barcodeDetailPartialNoResume: "{y} \xB7 {r} \xB7 sett {p} %",
          barcodeStatusDone: "Klar \xB7 {d}",
          barcodeDetailKickerPartial: "Barcode \xB7 p\xE5g\xE5ende",
          barcodeDetailKickerDone: "Barcode \xB7 klar",
          barcodeDetailPartial: "{y} \xB7 {r} \xB7 sett {p} % \xB7 stannade p\xE5 {t}",
          barcodeDetailDone: "{y} \xB7 {r} \xB7 klar {d}",
          barcodeEmptyTitle: "Inga barcodes \xE4n",
          barcodeEmptyDesc: "De skapas automatiskt n\xE4r du tittar p\xE5 en film.",
          barcodeOffTitle: "Barcodes skapas inte just nu",
          barcodeTurnOn: "Sl\xE5 p\xE5",
          barcodeClose: "St\xE4ng",
          barcodeRecording: "Barcode spelas in",
          barcodePaused: "Barcode pausad",
          barcodeOff: "Barcode av",
          barcodeStripControl: "Barcode-remsa",
          barcodeDelete: "Ta bort barcode",
          barcodeMarkDone: "Markera som klar",
          barcodeMarkInProgress: "Markera som p\xE5g\xE5ende",
          barcodeDeleteConfirm: "Ta bort barcoden? Det g\xE5r inte att \xE5ngra.",
          settingsPageBarcodes: "Movie barcodes",
          barcodeGroupCreate: "Skapande och spelaren",
          barcodeGroupLook: "Utseende",
          barcodeGroupShare: "Delning och lagring",
          barcodeSetEnabled: "Skapa barcode medan jag tittar",
          barcodeSetEnabledDesc: "Ett streck sparas i taget under uppspelning.",
          barcodeSetStrip: "Visa remsa ovanf\xF6r seekbaren",
          barcodeSetStripDesc: "Visar det du sett hittills, i f\xE4rg, i spelaren.",
          barcodeSetResolution: "Uppl\xF6sning",
          barcodeSetResolutionDesc: "G\xE4ller nya barcodes.",
          barcodeSetResolutionOption: "{n} streck",
          barcodeSetScope: "G\xE4ller f\xF6r",
          barcodeSetScopeMovies: "Filmer",
          barcodeSetScopeAll: "Filmer och avsnitt",
          barcodeSetView: "Standardvy i biblioteket",
          barcodeSetUnseen: "Ej sedd del",
          barcodeUnseenHatch: "Streckad",
          barcodeUnseenDim: "Nedtonad",
          barcodeUnseenEmpty: "Tom",
          barcodeSetTexture: "Strecktextur",
          barcodeSetTextureDesc: "Mjuk mjukar upp strecken i hyllvyn.",
          barcodeTextureRough: "Grov",
          barcodeTextureSmooth: "Mjuk",
          barcodeSetShareTitle: "Ta med titel och \xE5r p\xE5 delade bilder",
          barcodeSetSaved: "Sparade barcodes",
          barcodeSetSavedDesc: "{n} filmer \xB7 {mb} MB",
          barcodeClear: "Rensa",
          barcodeClearConfirm: "Rensa alla barcodes? Det g\xE5r inte att \xE5ngra.",
          popularStreaming: "P\xE5 Streaming",
          popularOnTv: "Serier",
          popularCinema: "P\xE5 bio",
          popularTrendingMovies: "Filmer",
          popularTrailers: "Trailers",
          popularLiveTv: "Live TV",
          noResultsNothingMatched: "Ingenting matchade den nuvarande filterkombinationen.",
          noResultsFoundCandidates: "Vi hittade {count} kandidater, men ingen matchade alla dina filter samtidigt.",
          noResultsNoCastMatch: "Vi hittade ingen tydlig sk\xE5despelartr\xE4ff f\xF6r s\xF6kningen med de nuvarande filtren.",
          noResultsNoTitleMatch: "Vi hittade ingen tydlig titeltr\xE4ff f\xF6r s\xF6kningen med de nuvarande filtren.",
          noResultsTipSpellingCast: "Kontrollera stavningen eller prova ett fullst\xE4ndigt sk\xE5despelarnamn med f\xE4rre extra ord.",
          noResultsTipSpellingTitle: "Kontrollera stavningen eller prova en kortare titel, till exempel bara huvudordet.",
          noResultsTipProviders: "Ta bort en streamingtj\xE4nst eller s\xF6k utan tj\xE4nstefilter f\xF6r att bredda tr\xE4ffarna.",
          noResultsTipKeywords: "Ta bort ett nyckelord eller s\xF6k utan nyckelord f\xF6r att f\xE5 fram fler kandidater.",
          noResultsTipLanguages: "Ta bort ett originalspr\xE5k, eller l\xE4gg till fler spr\xE5k om du vill ha bredare tr\xE4ffar.",
          noResultsTipRatingTmdb: "S\xE4nk l\xE4gsta TMDb-betyg eller vidga betygsspannet f\xF6r att f\xE5 med fler titlar.",
          noResultsTipRating: "S\xE4nk l\xE4gsta betyg eller vidga betygsspannet f\xF6r att f\xE5 med fler titlar.",
          noResultsTipYears: "Vidga \xE5rsspannet med n\xE5gra \xE5r f\xF6r att ge s\xF6kningen mer utrymme.",
          noResultsTipMediaType: "Byt fr\xE5n bara filmer eller bara serier till b\xE5da om du vill hitta fler snabbare.",
          noResultsTipGenres: "Ta bort en genre eller prova f\xE4rre genrer samtidigt.",
          noResultsTipClearAll: "Rensa filtren och b\xF6rja bredare, och smalna sedan av s\xF6kningen steg f\xF6r steg.",
          m3uUrls: "M3U-spellistor",
          m3uUrlsDesc: "Ange en M3U-l\xE4nk per rad.",
          m3uUrlsPlaceholder: "https://exempel.se/spellista.m3u",
          m3uFetchList: "H\xE4mta lista",
          m3uFetchListDone: "Listan h\xE4mtad",
          m3uFetchListError: "Kunde inte h\xE4mta listan",
          liveTvLists: "Live TV",
          liveTvCreateList: "Skapa lista",
          liveTvListName: "Listnamn",
          liveTvNoLists: "Inga kanallistor \xE4nnu.",
          liveTvNoListsHint: "L\xE4gg till en M3U-spellista under Inst\xE4llningar \u2192 Live TV, s\xE5 dyker kanalerna upp h\xE4r.",
          liveTvNoMatchHint: "Prova en kortare s\xF6kning, eller v\xE4lj en annan kategori.",
          liveTvAddToList: "L\xE4gg till i aktiv lista",
          liveTvRemoveFromList: "Ta bort fr\xE5n aktiv lista",
          liveTvDeleteList: "Radera lista",
          liveTvSelectListFirst: "V\xE4lj en lista f\xF6rst",
          liveTvHomeSource: "K\xE4lla f\xF6r Live TV",
          liveTvAllChannels: "Alla kanaler",
          liveTvFavourites: "Favoriter",
          m3uNoUrl: "Ingen M3U-l\xE4nk konfigurerad. L\xE4gg till en i Inst\xE4llningar.",
          liveTvEmptyEyebrow: "LIVE TV",
          liveTvEmptyTitle: "Anslut en spellista f\xF6r att komma ig\xE5ng.",
          liveTvEmptyBody: "Anslut valfri IPTV-leverant\xF6r. Kanaler sorteras per kategori, EPG h\xE4mtas automatiskt n\xE4r din leverant\xF6r erbjuder det, och uppspelningen sker via inbyggd mpv.",
          liveTvEmptyCta: "Anslut en leverant\xF6r",
          liveTvFeatureListsTitle: "Kanallistor",
          liveTvFeatureListsDesc: "Bygg egna listor och f\xE4st favoritkanaler h\xF6gst upp.",
          liveTvFeatureEpgTitle: "Live-EPG",
          liveTvFeatureEpgDesc: "Visar nu och h\xE4rn\xE4st n\xE4r din leverant\xF6r erbjuder tabl\xE5data.",
          liveTvFeatureMpvTitle: "Inbyggd mpv",
          liveTvFeatureMpvDesc: "HEVC, HDR och flerkanalsljud, plus riktiga undertext- och ljudmenyer.",
          liveTvFeatureLocalTitle: "Bara lokalt",
          liveTvFeatureLocalDesc: "Spellistl\xE4nkar sparas p\xE5 den h\xE4r enheten. Inget l\xE4mnar din dator.",
          m3uLoading: "Laddar kanaler\u2026",
          m3uError: "Kunde inte ladda kanaler.",
          m3uChannels: "kanaler",
          m3uSearch: "S\xF6k kanaler\u2026",
          m3uNoResults: "Inga kanaler matchar din s\xF6kning.",
          // Hero
          subtitle: "S\xF6k filmer, serier eller sk\xE5despelare i Sverige.",
          brandTagline: "Film- & serieguiden",
          myFiles: "Mina filer",
          trending: "Trendar",
          homeTrendingSubtitle: "Bland filmer och serier den h\xE4r veckan",
          popularMoviesTitle: "Popul\xE4ra filmer",
          popularMoviesSubtitle: "De popul\xE4raste filmerna just nu",
          popularSeriesTitle: "Popul\xE4ra serier",
          popularSeriesSubtitle: "De popul\xE4raste serierna just nu",
          showAllTrending: "Visa alla trender",
          showAllMovies: "Visa alla filmer",
          showAllSeries: "Visa alla serier",
          searchPlaceholder: "S\xF6k titlar eller sk\xE5despelarnamn",
          searchTitlePlaceholder: "S\xF6k titel",
          sampleData: "Exempeldata",
          tmdbLive: "TMDb live",
          castSearch: "Sk\xE5despelars\xF6kning",
          titleSearch: "Titels\xF6kning",
          showingCastResults: "Visar sk\xE5despelarresultat",
          showingTitleResults: "Visar titelresultat.",
          for: "f\xF6r",
          // Recently watched
          recentlyStreamed: "Senast streamade",
          lastWatchedTitle: "Senast sett",
          continueWhereLeftOff: "Forts\xE4tt d\xE4r du slutade",
          showAll: "Visa alla",
          all: "Alla",
          close: "St\xE4ng",
          trailerLabel: "Trailer",
          closeTrailer: "St\xE4ng trailer",
          liveTvStreamError: "Kunde inte ladda str\xF6mmen.",
          liveTvStreamErrorHelp: "Str\xF6mmen kan vara geoblockerad, offline eller ej st\xF6dd.",
          allCategories: "Alla kategorier",
          sceneReleases: "Scene-releaser",
          activeFiltersTitle: "Aktiva filter",
          activeFiltersHintPrefix: "Tillg\xE4nglighet f\xF6r tj\xE4nster \xE4r begr\xE4nsad till Sverige (",
          activeFiltersHintSuffix: "), och flera valda chips matchar valfritt av etiketterna, inte alla samtidigt.",
          streamProviderGlobalDefaults: "Globala standarder f\xF6r stream providers",
          streamProviderApiKey: "API-nyckel",
          streamProviderApiKeyPlaceholder: "Din API-nyckel",
          streamProviderApiKeyPerSource: "API-nyckel (per provider)",
          streamProviderUsingGlobalKey: "Anv\xE4nder global API-nyckel",
          apiKeyLabel: "API-nyckel",
          streamProviderDefaultQualityFilter: "Standard kvalitetsfilter (uteslut)",
          streamProviderDefaultLanguages: "Standard spr\xE5k",
          streamProviderDefaultSource: "Standard stream provider",
          streamProviderDefaultMaxResults: "Standard maxresultat per kvalitet",
          streamProviderQualityFilter: "Kvalitetsfilter (uteslut)",
          streamProviderLanguages: "Spr\xE5k",
          streamProviderSources: "Leverant\xF6rer (tomt = alla)",
          streamProviderSelectQualities: "V\xE4lj kvaliteter",
          streamProviderSelectLanguages: "V\xE4lj spr\xE5k",
          streamProviderSelectSources: "V\xE4lj leverant\xF6rer",
          streamProviderMaxResults: "Maxresultat",
          streamProviderMaxSize: "Maxstorlek (MB, 0 = ingen gr\xE4ns)",
          streamProviderSelection: "Streamleverant\xF6r",
          streamProviderCustomUrl: "Egen URL",
          streamProviderNoUrl: "Ingen URL angiven",
          streamProviderAddComet: "+ Comet",
          streamProviderAddJackettio: "+ Jackettio",
          // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
          streamProviderAddAiostreams: "+ AIOStreams",
          // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
          aiostreamsOpenConfig: "\xD6ppna konfiguratorn",
          // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
          aiostreamsManifestLabel: "Manifest-URL",
          // boundary-exempt: pluginets UI-sträng, bundlas av pluginet; tas bort när pluginet bär egna strängar
          streamProviderAddCustom: "+ Egen URL",
          useGlobal: "Anv\xE4nd globalt",
          clearFilters: "Rensa filter",
          moviesOnly: "Endast filmer",
          seriesOnly: "Endast serier",
          titleLabel: "Titel",
          ratingLabel: "Betyg",
          ratingLabelTmdb: "TMDb",
          noStreamsYet: "Inget streamat \xE4n.",
          noScrapersEnabled: "Inga stream providers \xE4r aktiverade.",
          streamNotCached: "Streamen \xE4r inte cachad \u2014 prova en annan",
          streamUnreachable: "Stream-URL svarar inte \u2014 prova en annan",
          downloadTimeout: "Nedladdningen tog f\xF6r l\xE5ng tid \u2014 prova en annan stream",
          openToContinue: "\u2014 \xF6ppna f\xF6r att forts\xE4tta",
          timeLeft: "kvar",
          resume: "Forts\xE4tt",
          resumeStarting: "Startar\u2026",
          resumeFetchingLink: "H\xE4mtar ny l\xE4nk\u2026",
          listenedAt: "vid",
          streamAvailable: "Cachad",
          streamDeviceUnsupported: "st\xF6ds ej",
          streamDeviceUnsupportedHint: "Enheten saknar avkodare f\xF6r den h\xE4r str\xF6mmen (f\xF6rlustfritt ljud eller Dolby Vision) \u2014 r\xE4kna med inget ljud, eller ingen uppspelning.",
          streamDownload: "Ladda ned",
          startingMovie: "Startar film...",
          findingMovie: "Hittar film...",
          findingStreams: "H\xE4mtar streams...",
          startingEpisode: "Startar avsnitt...",
          sourceNotResponding: "Kunde inte starta filmen \u2014 k\xE4llan svarar inte.",
          // Media card / details
          movie: "Film",
          series: "Serie",
          audiobook: "Ljudbok",
          synopsis: "Handling",
          genres: "Genrer",
          filterProviders: "Tj\xE4nster",
          streamingIn: "Streaming i Sverige",
          noProviders: "Inga streamingtj\xE4nster hittades",
          tmdbRating: "Betyg",
          tmdbVoteAverage: "TMDb genomsnittsbetyg",
          cast: "Sk\xE5despelare",
          keywords: "Nyckelord",
          showLess: "Visa mindre",
          recommendations: "Rekommendationer",
          follow: "F\xF6lj",
          following: "F\xF6ljer \u2713",
          movieWatchlistAdd: "Min lista",
          movieWatchlistAdded: "Min lista \u2713",
          moreInfo: "Mer info",
          watchTrailer: "Se trailer",
          openOnImdb: "\xD6ppna p\xE5 IMDb",
          seasons: "S\xE4songer:",
          matchedOnTitle: "Matchad p\xE5 titel:",
          localFallback: "Lokal reserv",
          // Streams
          streams: "Str\xF6mmar",
          rdStreams: "Str\xF6mmar fr\xE5n stream provider",
          configureRd: "Konfigurera din API-nyckel f\xF6r stream provider i Inst\xE4llningar.",
          loadingSeasons: "Laddar s\xE4songer\u2026",
          loadingEpisodes: "Laddar avsnitt\u2026",
          noSeasons: "Inga s\xE4songer hittades.",
          epPlaying: "Spelas",
          epNext: "N\xE4sta",
          epWatched: "sedd",
          epRemaining: "{time} kvar",
          seasonLabel: "S\xE4song",
          noEpisodes: "Inga avsnitt hittades.",
          notAiredYet: "Ej s\xE4nda",
          nextAirs: "N\xE4sta",
          noOverview: "Ingen beskrivning tillg\xE4nglig.",
          cached: "Cachad",
          notCached: "ej cachad (laddas ned)",
          play: "Spela",
          noStreamsAvailable: "Inga streams",
          noStreamYet: "Ingen stream \xE4n",
          addAndPlay: "L\xE4gg till & Spela",
          searchingStreams: "S\xF6ker str\xF6mmar\u2026",
          allSources: "Alla k\xE4llor",
          tvSearchTypeTab: "Skriv",
          tvSearchSpace: "Mellanslag",
          tvSearchDelete: "Radera",
          sourcesStillSearching: "S\xF6ker fortfarande:",
          sourceFilter: "K\xE4lla",
          sourcesNoAnswer: "Inget svar fr\xE5n:",
          noStreams: "Inga str\xF6mmar hittades.",
          allFiltered: "Alla str\xF6mmar filtrerade bort av kvalitetsinst\xE4llningar.",
          preparingPlayback: "F\xF6rbereder uppspelning\u2026",
          downloading: "Laddar ned\u2026",
          downloadingFile: "Laddar ner fil...",
          queued: "I k\xF6 hos stream provider\u2026",
          selectingFiles: "V\xE4ljer filer\u2026",
          addingToRd: "L\xE4gger till hos stream provider\u2026",
          unrestrictingLinks: "Avbegr\xE4nsar l\xE4nkar\u2026",
          selectFile: "V\xE4lj fil att spela:",
          noVideoFiles: "Inga videofiler hittades.",
          markWatched: "Markera som sedd",
          markUnwatched: "Markera som osedd",
          watched: "\u2713 Sedd",
          watchedQ: "Sedd?",
          markAllWatched: "Markera alla som sedda",
          hideManual: "D\xF6lj manuell inmatning",
          go: "K\xF6r",
          tryAgain: "F\xF6rs\xF6k igen",
          cancel: "Avbryt",
          copyLink: "Kopiera l\xE4nk",
          copyStreamUrl: "Kopiera stream-URL",
          copied: "Kopierat \u2713",
          moreActions: "Fler val",
          copyStreamLink: "Kopiera streaml\xE4nk",
          downloadThisVideo: "Ladda ner videon",
          openInVlc: "Spela i VLC",
          tvModeGroupTitle: "TV-l\xE4ge",
          tvModeUseTitle: "Anv\xE4nd TV-l\xE4ge",
          tvRowsIntro: "Varje segment har egna rader i TV-l\xE4get. Utg\xE5ngsl\xE4get speglar din vanliga startsida, s\xE5 inget \xE4ndras f\xF6rr\xE4n du g\xF6r det h\xE4r.",
          tvAddRow: "L\xE4gg till rad",
          tvAddRowAll: "Alla rader kan v\xE4ljas.",
          tvSegmentProviders: "tj\xE4nster",
          tvSearchAlphaTab: "A\u2013\xD6",
          tvSearchBefore1990: "F\xF6re 1990",
          tvSearchEmpty: "Skriv eller v\xE4lj en bokstav f\xF6r att s\xF6ka.",
          tvSearchNoHits: "Inga tr\xE4ffar. Prova en kortare s\xF6kning.",
          tvSearchHistory: "S\xF6khistorik",
          tvSearchHistoryHint: "Eller ta n\xE5got ur din s\xF6khistorik.",
          tvSearchHitsFor: "Tr\xE4ffar f\xF6r",
          pairUnknownDevice: "Ok\xE4nd enhet",
          pairTooManyTries: "F\xF6r m\xE5nga f\xF6rs\xF6k \u2014 v\xE4nta en stund.",
          pairBadCode: "Fel eller utg\xE5ngen kod.",
          pairUnstable: "Anslutningen \xE4r ostadig just nu \u2014 f\xF6rs\xF6k igen om en stund.",
          pairTitle: "Para den h\xE4r enheten med Lumio",
          pairIntro: "Skapa en inbjudningskod i Lumio p\xE5 datorn (Inst\xE4llningar \u2192 Fj\xE4rr\xE5tkomst) och ange den h\xE4r.",
          watchUnknownTitle: "Ok\xE4nd titel",
          watchWaiting: "V\xE4ntar p\xE5 uppspelning\u2026",
          lanLocalAddrTip: "Den h\xE4r .local-adressen forts\xE4tter fungera \xE4ven n\xE4r datorns IP-adress \xE4ndras. P\xE5 iPhone: \xF6ppna l\xE4nken i Safari och v\xE4lj Dela \u2192 L\xE4gg till p\xE5 hemsk\xE4rmen f\xF6r helsk\xE4rm.",
          bugStepsHeading: "**Steg f\xF6r att \xE5terskapa:**",
          pluginsHostOnly: "Plugin-hantering g\xF6rs p\xE5 hosten i LAN-l\xE4ge.",
          calFetchFailed: "Kunde inte h\xE4mta data.",
          nothingYet: "Inget att visa \xE4n.",
          bugEnvLabel: "Milj\xF6:",
          appUpdateAndroidInstaller: "\xD6ppnar systemets installerare \u2014 bekr\xE4fta installationen d\xE4r.",
          tvSegmentMovies: "film",
          tvSegmentSeries: "serier",
          tvSegmentAll: "allt",
          tvMirrorsHome: "Speglar din vanliga startsida. \xC4ndrar du n\xE5got h\xE4r f\xE5r segmentet egna rader.",
          tvMirrorsHomeLimited: "Speglar din vanliga startsida, begr\xE4nsad till {type}. \xC4ndrar du n\xE5got h\xE4r f\xE5r segmentet egna rader.",
          tvAddRowLimited: "Bara rader som h\xF6r till {type} erbjuds.",
          tvRemoveRow: "Ta bort",
          raAlwaysVlc: "\xD6ppna alltid i VLC",
          dtMinutesShort: "{n} min",
          epLayoutTitle: "Detaljsidans layout",
          epLayoutDesc: "St\xE5ende l\xE4gger avsnitt, str\xF6mmar och rekommendationer i listor du rullar ned\xE5t i. Liggande l\xE4gger dem i rader med kort du bl\xE4ddrar i sidled. G\xE4ller b\xE5de filmer och serier.",
          epLayoutList: "St\xE5ende",
          epLayoutCards: "Liggande",
          epLayoutToggleTitle: "Byt layout: st\xE5ende eller liggande",
          detailsLayoutToggleTitle: "Byt layout: st\xE5ende eller liggande",
          detailsTrailers: "Trailers",
          homeBubble: "Hem",
          daPlacementTitle: "\xC5tg\xE4rdsknappar",
          daPlacementDesc: "Var F\xF6lj, Sedd, Trailer och K\xE4llor sitter p\xE5 detaljsidan.",
          daPlacementHeader: "Uppe till h\xF6ger",
          daPlacementInline: "Bredvid Spela",
          dtSeasonOne: "1 s\xE4song",
          dtSeasonsN: "{n} s\xE4songer",
          settingsDetailsEyebrow: "Detaljsidan",
          sideMenuTitle: "Sidomeny",
          sideMenuDesc: "En flytande ikonrad till v\xE4nster i st\xE4llet f\xF6r den horisontella menyn. S\xF6ket flyttar in i raden. Endast skrivbord.",
          sideMenuLockedByPill: "Avst\xE4ngt s\xE5 l\xE4nge menypillret \xE4r p\xE5 \u2014 d\xE5 \xE4r pillret menyn.",
          sideMenuOn: "Sidomeny",
          menuChipTitle: "Menypill (TV-stil)",
          menuChipDesc: "TV-l\xE4gets menypill uppe till v\xE4nster, med s\xF6k inne i menyn. Ers\xE4tter sidomenyn och toppraden p\xE5 skrivbord, och toppraden p\xE5 mobil.",
          menuPillPlaceTitle: "Menypillrets placering",
          menuPillPlaceDesc: "V\xE4lj ett h\xF6rn, eller h\xE5ll in pillret tills det skakar och dra det dit du vill. Det dras till n\xE4rmaste kant och beh\xE5ller h\xF6jden du sl\xE4ppte p\xE5.",
          menuPillTopLeft: "Uppe till v\xE4nster",
          menuPillTopRight: "Uppe till h\xF6ger",
          menuPillBottomLeft: "Nere till v\xE4nster",
          menuPillBottomRight: "Nere till h\xF6ger",
          sideMenuOff: "Horisontell meny",
          vlcToggleOn: "VLC p\xE5",
          vlcToggleOff: "VLC av",
          vlcToggleTitle: "\xD6ppna streams direkt i VLC",
          openInExternalPrefix: "Spela i",
          openInExternalPlayer: "\xD6ppna i extern spelare",
          externalPlayerToggle: "Extern spelare",
          externalPlayerApp: "Extern spelare",
          externalPlayerPick: "V\xE4lj\u2026",
          licensesTitle: "Licenser",
          appUpdateTitle: "Appuppdatering",
          appUpdateDesc: "Kolla om en nyare Lumio-version finns.",
          appUpdateCheck: "S\xF6k uppdatering",
          appUpdateCheckFailed: "Kunde inte h\xE4mta uppdateringsinformation",
          appUpdateAvailable: "Uppdatering finns:",
          appUpdateCurrent: "nuvarande",
          appUpdateUpToDate: "Du har senaste versionen",
          appUpdateInstall: "H\xE4mta & installera",
          appUpdatePromptTitle: "Uppdatering finns",
          appUpdatePromptBody: "Lumio {version} \xE4r redo att installeras. Uppdatera nu?",
          appUpdateNotesTitle: "Nyheter i den h\xE4r versionen",
          appUpdatePromptInstall: "Uppdatera nu",
          appUpdatePromptInstalling: "Uppdaterar\u2026",
          appUpdatePromptLater: "Inte nu",
          appUpdateRestarting: "Uppdateringen installerad \u2014 Lumio startar om\u2026",
          appUpdateDmgOpened: "Installeraren laddades ner och \xF6ppnades \u2014 dra Lumio till Program.",
          appUpdateBrowserStarted: "Nedladdningen startade i webbl\xE4saren \u2014 \xF6ppna APK:n f\xF6r att installera.",
          licensesDesc: "\xD6ppen k\xE4llkod och tj\xE4nster som Lumio bygger p\xE5.",
          licensesIntro: "Lumio buntar f\xF6ljande programvara med \xF6ppen k\xE4llkod. GPL-licensierade komponenter har h\xE4nvisning till k\xE4llkoden.",
          remoteAccessTitle: "Fj\xE4rr\xE5tkomst",
          remoteAccessDesc: "N\xE5 ditt bibliotek utanf\xF6r hemn\xE4tverket via en krypterad peer-to-peer-anslutning.",
          remoteConnectionTitle: "Fj\xE4rranslutning",
          remoteExternalTitle: "Utanf\xF6r hemn\xE4tet",
          remoteExternalDesc: "N\xE5 biblioteket utanf\xF6r hemmet. Kr\xE4ver en \xF6ppen port i routern och en publik IP-adress (fungerar inte bakom CGNAT).",
          remoteGuestMenuTitle: "L\xE5t fj\xE4rrg\xE4ster \xF6ppna menyn",
          remoteGuestMenuDesc: "Fj\xE4rranslutna enheter (ej LAN) f\xE5r kugghjulet och huvudmenyn. Av som standard.",
          remoteLanTitle: "Hemn\xE4tverket (LAN)",
          remoteLanDesc: "Str\xF6mma till andra enheter p\xE5 samma n\xE4tverk hemma.",
          externalPlayerAppDesc: 'App som "Spela i \u2026" anv\xE4nder (macOS-appnamn, t.ex. VLC eller IINA). Android visar systemets appv\xE4ljare.',
          preparingDownload: "F\xF6rbereder nedladdning...",
          downloadComplete: "Nedladdning klar",
          downloadFailed: "Nedladdning misslyckades",
          backToStreams: "Tillbaka till str\xF6mmar",
          instantPlay: "spelas direkt",
          continueFrom: "Forts\xE4tt:",
          retry: "F\xF6rs\xF6k igen",
          // Audiobook
          audiobooks: "Ljudbok",
          resumeAudiobook: "Forts\xE4tt lyssna",
          searchingAudiobooks: "S\xF6ker ljudb\xF6cker\u2026",
          noAudiobooks: "Inga ljudb\xF6cker hittades f\xF6r",
          dismiss: "St\xE4ng",
          // Filters
          filters: "Filter",
          showResults: "Visa resultat",
          refine: "F\xF6rfina",
          reset: "\xC5terst\xE4ll",
          // Filterraden (design_handoff_filterrad, variant 5a).
          filterClearGroup: "Rensa",
          filterDone: "Klar",
          filterCatalogsLine: "{n} aktiva kataloger under {type}",
          filterActiveLine: "{n} aktiva filter",
          filterActiveLineOne: "1 aktivt filter",
          filterKeywordPlaceholder: "Nyckelord",
          type: "Typ",
          movieGenres: "Filmgenrer",
          seriesGenres: "TV-genrer",
          moreFilters: "Fler filter",
          year: "\xC5r",
          rating: "Betyg",
          languages: "Spr\xE5k",
          originalLanguage: "Originalspr\xE5k",
          noLanguagesSelected: "Inga originalspr\xE5k valda \xE4nnu.",
          languageSearchPlaceholder: "S\xF6k spr\xE5k, t.ex. svenska, danska eller en",
          languageSearchHelper: "S\xF6k p\xE5 spr\xE5knamn eller kod. Flera val inneb\xE4r att titeln kan matcha n\xE5got av de valda originalspr\xE5ken.",
          noLanguageMatches: "Inga spr\xE5ktr\xE4ffar f\xF6r",
          noKeywordsSelected: "Inga nyckelord valda \xE4nnu.",
          keywordsPlaceholderTmdb: "Keyword",
          keywordsPlaceholderCatalog: "Keyword",
          clearSearch: "Rensa s\xF6kning",
          keywordsHelperTmdb: "Skriv minst 2 tecken. Anv\xE4nd piltangenterna och Enter f\xF6r att v\xE4lja snabbare. Du kan bara l\xE4gga till nyckelord som finns i TMDb.",
          keywordsHelperCatalog: "Skriv minst 2 tecken. Anv\xE4nd piltangenterna och Enter f\xF6r att v\xE4lja snabbare. Du kan bara l\xE4gga till nyckelord som finns i katalogen.",
          searchingKeywords: "S\xF6ker nyckelord...",
          noKeywordMatches: "Inga nyckelordstr\xE4ffar f\xF6r",
          add: "L\xE4gg till",
          selected: "valda",
          sortBy: "Sortera",
          sortMostPopular: "Mest popul\xE4ra",
          sortMostRelevant: "Mest relevant",
          sortHighestRating: "H\xF6gst betyg",
          sortHighestTmdb: "H\xF6gst TMDb-betyg",
          sortNewest: "Nyast till \xE4ldst",
          sortOldest: "\xC4ldst till nyast",
          // Results
          aboutResults: "Ungef\xE4r",
          results: "resultat",
          resultsTryThis: "Prova det h\xE4r",
          page: "Sida",
          of: "av",
          previous: "F\xF6reg\xE5ende",
          next: "N\xE4sta",
          showingPagedResults: "Visar sidade resultat fr\xE5n de starkaste tr\xE4ffarna.",
          usingFallback: "Anv\xE4nder exempeldata",
          sampleCatalog: "Exempelkatalog",
          noResults: "Inga tr\xE4ffar",
          // Subtitle menu
          subtitleLanguages: "Undertextspr\xE5k",
          subtitleVariants: "Undertextvarianter",
          subtitleSettings: "Undertextinst\xE4llningar",
          subtitleLoadFile: "\xD6ppna undertextfil\u2026",
          subtitleExternalGroup: "Egen fil",
          subtitleEmbeddedTrack: "Inb\xE4ddat sp\xE5r",
          subtitleFileUnsupported: "Det h\xE4r formatet kan bara den inbyggda spelaren p\xE5 Mac (mpv) visa. Anv\xE4nd .srt eller .vtt h\xE4r.",
          subtitleFileLoadFailed: "Kunde inte l\xE4sa in undertextfilen. {message}",
          selectLanguage: "V\xE4lj ett spr\xE5k",
          on: "P\xE5",
          off: "Av",
          delay: "F\xF6rdr\xF6jning",
          subtitleAutoSync: "Auto-sync",
          subtitleAutoSyncAnalyzing: "Analyserar...",
          subtitleAutoSyncApplied: "La p\xE5 offset",
          subtitleAlignedToReference: "Synkad mot en undertext som matchar din fil",
          subtitleHashMatch: "Matchar din fil",
          subtitleAlignedToAudio: "Synkad mot hela ljudsp\xE5ret",
          subtitleAnchorApplied: "Synkad fr\xE5n din markering",
          subtitleAnchorDrift: "drift korrigerad ocks\xE5",
          subtitleManualSync: "Synka p\xE5 geh\xF6r",
          vpSecondarySubFailed: "Kunde inte ladda andraspr\xE5ket",
          vpSecondarySubMissing: "Inget undertextsp\xE5r p\xE5 {lang} hittades",
          learningModeTitle: "Inl\xE4rningsl\xE4ge",
          learningModeHint: "Visa ett andra undertextspr\xE5k under huvudtexten",
          subtitleSlotPrimary: "Huvud",
          subtitleSlotSecondary: "Andra",
          subtitleSecondaryEmbeddedUnsupported: "St\xF6ds inte \xE4nnu p\xE5 Android",
          shortcutsSecondarySubtitleCycle: "Byt andraspr\xE5k (inl\xE4rningsl\xE4ge)",
          secondarySubtitleLanguage: "Andraspr\xE5k f\xF6r undertexter",
          secondarySubtitleLanguageDesc: "Visas under huvudtexten n\xE4r inl\xE4rningsl\xE4get \xE4r p\xE5",
          secondarySubtitleColor: "Andraspr\xE5kets f\xE4rg",
          secondarySubtitleColorDesc: "F\xE4rg p\xE5 den andra raden i inl\xE4rningsl\xE4get",
          subtitleManualSyncTapPrompt: "Tryck n\xE4r du h\xF6r en replik du k\xE4nner igen",
          subtitleManualSyncTapButton: "Jag h\xF6r den nu",
          subtitleManualSyncPickPrompt: "Vilken rad h\xF6rde du nyss?",
          subtitleManualSyncSecondHint: "G\xF6r om det senare i filmen f\xF6r att \xE4ven r\xE4tta driften.",
          subtitleManualSyncNoCues: "Inga undertextrader n\xE4ra den h\xE4r punkten.",
          subtitleManualSyncApplying: "Till\xE4mpar din synkning\u2026",
          subtitleManualSyncRefining: "Finjusterar mot ljudet\u2026",
          castTitle: "Spela p\xE5 annan enhet",
          castScanning: "S\xF6ker efter enheter\u2026",
          castNoDevices: "Inga Chromecast- eller DLNA-enheter hittades.",
          castPreparing: "F\xF6rbereder str\xF6m\u2026",
          castPrepareFailed: "Misslyckades \u2014 klicka f\xF6r nytt f\xF6rs\xF6k",
          castRescan: "S\xF6k igen",
          castScanFailed: "Kunde inte s\xF6ka efter enheter.",
          castFailed: "Enheten accepterade inte uppspelningen.",
          castPlayingOn: "Spelar p\xE5",
          castStop: "Sluta casta",
          castPause: "Pausa",
          castResume: "Forts\xE4tt",
          castPairTitle: "Parkoppla med Apple TV",
          castPairPrompt: "Ange koden som visas p\xE5 din TV",
          castPairConfirm: "Parkoppla",
          castPairing: "Parkopplar\u2026",
          castPairFailed: "Parkopplingen misslyckades. F\xF6rs\xF6k igen.",
          cancel2: "Avbryt",
          subtitleAutoSyncNoReference: "Inte s\xE4ker nog utifr\xE5n bara ljudet. L\xE4gg in en OpenSubtitles API-nyckel i Inst\xE4llningar f\xF6r att synka mot en undertext som matchar din fil.",
          subtitleAutoSyncFailed: "Kunde inte auto-synca undertexterna",
          subtitleAutoSyncDriftApplied: "drift korrigerad ({rate}s/min)",
          subtitleAutoSyncNoMatch: "Kunde inte hitta en tillr\xE4ckligt bra matchning",
          subtitleAutoSyncNeedsGroq: "L\xE4gg till en Groq API-nyckel i inst\xE4llningar f\xF6rst",
          subtitleAutoSyncNeedsSubtitle: "V\xE4lj ett undertextsp\xE5r f\xF6rst",
          subtitleAutoSyncNotEnoughSpeech: "F\xF6rs\xF6k igen i en scen med mer dialog",
          size: "Storlek",
          verticalPosition: "Vertikal position",
          subtitlesLabel: "Undertexter",
          subtitleProvider: "OpenSubtitles v3",
          undo: "\xC5ngra",
          audio: "Ljud",
          audioLanguage: "Ljudspr\xE5k",
          currentAudioOutput: "Aktuellt ljudl\xE4ge",
          info: "Info",
          actor: "Sk\xE5dis",
          readMore: "L\xE4s mer",
          readLess: "Visa mindre",
          knownFor: "K\xE4nd f\xF6r",
          credits: "Medverkande",
          gender: "K\xF6n",
          birth: "F\xF6dd",
          bornIn: "F\xF6dd i:",
          alsoKnownAs: "\xC4ven k\xE4nd som:",
          noBiography: "Ingen biografi finns p\xE5 TMDb.",
          soundtrack: "Soundtrack",
          soundtrackLoadError: "Kunde inte ladda soundtrack",
          noSoundtrackFound: "Inget soundtrack hittades p\xE5 Spotify",
          searchOnSpotify: "S\xF6k p\xE5 Spotify",
          searching: "S\xF6ker\u2026",
          instantPlayTitle: "Direktspelning",
          zappFindTitle: "Hitta film",
          // Settings
          settingsTitle: "Inst\xE4llningar",
          settingsDesc: "Konfigurera integrationer f\xF6r den h\xE4r appen.",
          profilesTitle: "Profiler",
          profilesDesc: "Alla som anv\xE4nder den h\xE4r enheten f\xE5r egen tittarhistorik, avatar, f\xE4rg och valfri PIN. Byt n\xE4r som helst.",
          profileEditTitle: "Redigera profil",
          profileAvatarLabel: "Avatar",
          profileColorLabel: "F\xE4rg",
          profileNoAvatar: "Ingen avatar (initial)",
          profileSharedSettingsTitle: "Inst\xE4llningar f\xF6r denna profil",
          profileShareWithAll: "Dela inst\xE4llningar med alla profiler",
          profileShareWithAllDesc: "En upps\xE4ttning inst\xE4llningar som alla p\xE5 den h\xE4r enheten anv\xE4nder. Tittarhistorik och listor f\xF6rblir personliga.",
          profileIndependentSettings: "Egna inst\xE4llningar f\xF6r denna profil",
          profileIndependentSettingsDesc: "Profilen beh\xE5ller sina egna inst\xE4llningar, separat fr\xE5n alla andra.",
          profilePrimaryBadge: "Prim\xE4r",
          profileLockedBadge: "L\xE5st",
          profileEditAction: "Redigera",
          profileWhoIsWatching: "Vem tittar?",
          profileCustomizeAction: "Anpassa",
          profileAddTile: "L\xE4gg till",
          profileAvatar: "Avatar",
          profileAvatarHint: "V\xE4ljs ur den medf\xF6ljande katalogen.",
          profileNoAvatarHint: "Visar initialen i st\xE4llet.",
          profileColor: "F\xE4rg",
          profilePinRemoveEnterCurrent: "Ange nuvarande PIN f\xF6r att ta bort den",
          profilesStripHint: "L\xE4gg till en profil f\xF6r n\xE5gon annan s\xE5 beh\xE5ller alla sitt eget Forts\xE4tt titta, sin historik och sina framsteg.",
          settingsGroupOverview: "\xD6VERSIKT",
          settingsGroupAccount: "KONTO",
          settingsGroupStreaming: "STR\xD6MNING",
          settingsGroupPlayback: "UPPSPELNING",
          settingsGroupAppearance: "UTSEENDE",
          settingsGroupPlugins: "PLUGINS",
          settingsGroupNotifications: "AVISERINGAR",
          webhooksTitle: "Webhooks & regler",
          webhooksDesc: "Skicka en ping till Discord eller Telegram n\xE4r n\xE5got h\xE4nder. Varje regel k\xF6rs f\xF6r sig.",
          webhooksWhereTitle: "Vart aviseringar g\xE5r",
          webhooksUrlLabel: "Discord- eller Telegram-URL",
          webhooksUrlDesc: "En Discord-webhook-URL, eller en Telegram-bot-URL med chat_id (https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>).",
          webhooksTest: "Testa",
          webhooksTestOk: "Skickat!",
          webhooksTestFailed: "Testet misslyckades",
          webhooksTestMessage: "Lumio: webhooken funkar \u{1F389}",
          webhooksWhatTitle: "Vad som skickas",
          webhooksSourceCalendar: "Min releasekalender",
          webhooksSourceCalendarDesc: "Titlar du bevakar i releasekalendern, samma dag de har premi\xE4r.",
          webhooksSourceTrakt: "Mina Trakt-listor",
          webhooksSourceTraktDesc: "Nya titlar som dyker upp i listor du f\xF6ljer p\xE5 Trakt.",
          webhooksSourceTraktNeedsAuth: "Kr\xE4ver ett anslutet Trakt-konto.",
          webhooksTypesTitle: "Mediatyper",
          webhooksTypesLabel: "Filtrera efter typ",
          webhooksTypesDesc: "G\xE4ller efter att k\xE4llorna slagits samman.",
          webhooksTypeAll: "Allt",
          webhooksRunNow: "K\xF6r reglerna nu",
          webhooksRunSent: "Skickade {n} avisering(ar)",
          webhooksRunNothing: "Inget nytt att skicka",
          webhooksScheduleHint: "Reglerna k\xF6rs automatiskt strax efter start och var 6:e timme medan appen \xE4r ig\xE5ng.",
          settingsGroupSystem: "SYSTEM",
          settingsPageTvMode: "TV-l\xE4ge",
          tvKeyboardModeLabel: "Tangentbord p\xE5 TV",
          tvKeyboardModeDesc: "Automatiskt anv\xE4nder Lumios egna tangenter f\xF6r s\xF6k och filter, och systemets tangentbord f\xF6r l\xE5nga eller hemliga f\xE4lt \u2014 d\xE4r kan du skriva fr\xE5n telefonen, anv\xE4nda r\xF6sten eller en l\xF6senordshanterare.",
          tvKeyboardModeAuto: "Automatiskt",
          tvKeyboardModeLumio: "Lumios eget",
          tvKeyboardModeSystem: "Systemets",
          tvHintModeLabel: "Hj\xE4lptext i inst\xE4llningarna",
          tvHintModeDesc: "En switch, ett segment och ett reglage visar redan var raden st\xE5r \u2014 en mening under dem som upprepar det \xE4r en andra rad att l\xE4sa p\xE5 tio fots avst\xE5nd.",
          tvHintModeNever: "Aldrig",
          tvHintModeValue: "D\xE4r den tillf\xF6r n\xE5got",
          tvHintModeAlways: "Alltid",
          tvGreetingResume: "{minutes} min kvar av {title}",
          tvGreetingResumeEpisode: "{minutes} min kvar av {title} {episode}",
          tvGreetingReleaseToday: "{title} finns nu",
          tvGreetingReleaseTomorrow: "{title} sl\xE4pps imorgon",
          tvGreetingReleaseSoon: "{title} sl\xE4pps om {days} dagar",
          tvGreetingNight: "Fortfarande vaken",
          settingsPageOverview: "\xD6versikt",
          settingsPageAccount: "Konto & profiler",
          settingsPageLibrary: "Bibliotek & metadata",
          settingsPageTracking: "Sp\xE5rningstj\xE4nster",
          settingsPageSources: "K\xE4llor & kataloger",
          settingsPageServers: "Server & n\xE4tverk",
          settingsPagePlayer: "Spelare & kvalitet",
          settingsPageHome: "Hem & utseende",
          settingsPageBinge: "Binge!",
          settingsPageCinema: "Biokv\xE4ll",
          cinemaButton: "Biokv\xE4ll",
          cinemaButtonAsk: "Biokv\xE4ll \u2026",
          cinemaEyebrow: "Biokv\xE4ll",
          cinemaSheetPreviews: "F\xF6rhandsvisning",
          cinemaSheetPreviewsHint: "Aktuella filmer, plus en ur bevakningslistan",
          cinemaGrain: "Filmkorn",
          cinemaGrainOff: "Av",
          cinemaGrainLight: "L\xE4tt",
          cinemaGrainHeavy: "Mycket",
          cinemaLeader: "Nedr\xE4kning 3-2-1",
          cinemaLightsOut: "Sl\xE4ck ljuset",
          cinemaIntroTitle: "{n} trailers ur din bevakningslista",
          cinemaIntroTitleOne: "1 trailer ur din bevakningslista",
          cinemaIntroTitleMixed: "{n} f\xF6rhandsvisningar",
          cinemaIntroTitleMixedOne: "1 f\xF6rhandsvisning",
          cinemaTrailerMetaTrending: "Trailer {i} av {n} \xB7 aktuell just nu",
          cinemaIntroThen: "sedan {title}",
          cinemaTrailerMeta: "Trailer {i} av {n} \xB7 fr\xE5n din bevakningslista",
          cinemaAddNextNight: "+ N\xE4sta biokv\xE4ll",
          cinemaAddedNextNight: "Sparad till n\xE4sta biokv\xE4ll",
          cinemaSkip: "Hoppa \xF6ver \u203A",
          cinemaToFilm: "Till filmen \xBB",
          cinemaPreviewSample: "Exempelfilm",
          cinemaGroupMode: "L\xE4ge",
          cinemaEnabled: "Biokv\xE4llsl\xE4ge",
          cinemaEnabledDesc: "L\xE4gger till knappen Biokv\xE4ll bredvid Spela p\xE5 filmsidor. Ljuset sl\xE4cks, aktuella trailers, sedan filmen.",
          cinemaSummaryEyebrow: "S\xE5 h\xE4r blir kv\xE4llen",
          cinemaSummaryOff: "Avst\xE4ngt \u2014 knappen visas inte",
          cinemaSummaryTrailers: "{n} trailers",
          cinemaSummaryOneTrailer: "1 trailer",
          cinemaSummaryNoTrailers: "inga trailers",
          cinemaSummaryRoom: "salong",
          cinemaSummaryFull: "helbild",
          cinemaSummaryLeader: "3-2-1",
          cinemaSummaryGrain: "filmkorn {level}",
          cinemaPreviewBtn: "F\xF6rhandsgranska",
          cinemaGroupPreviews: "F\xF6rhandsvisning",
          cinemaTrailerCount: "Antal trailers",
          cinemaTrailerCountDesc: "0 hoppar direkt till nedr\xE4kningen.",
          cinemaTrailerLength: "L\xE4ngd per trailer",
          cinemaTrailerLengthDesc: "Kortar l\xE5nga trailers.",
          cinemaLengthFull: "Hela",
          cinemaSkipSeen: "Hoppa \xF6ver trailers du redan sett",
          cinemaAskBefore: "Fr\xE5ga f\xF6re start",
          cinemaAskBeforeDesc: "Visar det lilla arket. Av: Biokv\xE4ll startar direkt med v\xE4rdena h\xE4r.",
          cinemaGroupRoom: "Salongen",
          cinemaRoomView: "Salongsvy",
          cinemaRoomViewDesc: "Duk och stolsrad under f\xF6rhandsvisningen. Av: trailers i helbild.",
          cinemaRoomViewPhoneDesc: "G\xE4ller TV och dator. Telefonen visar alltid helbild.",
          cinemaGrainDesc: "\xD6ver nedr\xE4kningen och filmens f\xF6rsta sekunder.",
          cinemaEnabledTvHint: "L\xE4gger till Biokv\xE4ll bredvid Spela p\xE5 filmsidan.",
          cinemaRoomViewTvHint: "Duk och stolsrad. Av: trailers i helbild.",
          cinemaRatingCard: "\xC5ldersgr\xE4nsskylt",
          cinemaRatingCardDesc: "Visas f\xF6re filmen n\xE4r \xE5ldersgr\xE4ns finns.",
          cinemaLightsOn: "T\xE4nd ljuset vid eftertexterna",
          cinemaLightsOnDesc: "Gr\xE4nssnittet tonar tillbaka n\xE4r filmen \xE4r slut.",
          cinemaGroupTry: "Prova",
          cinemaPreviewTv: "F\xF6rhandsgranska biokv\xE4ll",
          cinemaRatingEyebrow: "\xC5ldersgr\xE4ns",
          cinemaRatingFrom: "Fr\xE5n {age} \xE5r",
          cinemaLightsUp: "Ljuset t\xE4nds",
          cinemaTurnPhone: "V\xE4nd telefonen",
          cinemaTurnPhoneHint: "Tryck f\xF6r att starta \xE4nd\xE5",
          cinemaPhoneHint: "P\xE5 telefon spelas trailers i helbild i liggande l\xE4ge.",
          cinemaTrailersShort: "Trailers",
          cinemaHoldOkHint: "H\xC5LL OK f\xF6r meny \xB7 \u25B8 hoppa \xF6ver",
          cinemaAbort: "Avbryt biokv\xE4ll",
          cinemaMinutes: "{h} tim {m} min",
          settingsPageCustomPages: "Egna sidor",
          settingsPageTheme: "Tema & skala",
          trailersEnabledLabel: "Visa trailers",
          trailersEnabledHint: 'Trailers kommer fr\xE5n YouTube. P\xE5 vissa n\xE4tverk blockerar YouTube dem ("Logga in f\xF6r att bekr\xE4fta att du inte \xE4r en robot") \u2014 st\xE4ng av det h\xE4r f\xF6r att g\xF6mma alla trailers i st\xE4llet f\xF6r att m\xF6tas av en d\xF6d spelare.',
          trailersOffTitle: "Trailers \xE4r avst\xE4ngda",
          trailersOffBody: 'Sl\xE5 p\xE5 "Visa trailers" igen under Inst\xE4llningar \u2192 Hem & utseende \u2192 Hero-banner.',
          heroTrailerLabel: "Spela trailer i heron",
          heroTrailerHint: "Efter n\xE5gra sekunder p\xE5 en titel tonas en ljudl\xF6s trailer in bakom inneh\xE5llet.",
          playerLayoutTitle: "Spelarlayout",
          plTabControls: "Kontroller",
          plTabTimeVolume: "Tid & volym",
          plTabOverlays: "\xD6verl\xE4gg",
          plControlsEyebrow: "Kontroller",
          plEdit: "Redigera",
          plAppliesInstantly: "\xC4ndringar sparas direkt",
          plResetPage: "\xC5terst\xE4ll sidan till standard",
          plTimeFormatDesc: "Vad klockm\xE4rkena p\xE5 s\xF6kraden visar.",
          plVolumeTitle: "Volymkontroll",
          plVolumeDesc: "Hur volymwidgeten visas i kontrollraden.",
          plVolSlider: "Skjutreglage",
          plVolSliderDesc: "Ett horisontellt reglage bredvid h\xF6gtalaren.",
          plVolStepper: "Steg",
          plVolStepperDesc: "\u2212/+-knappar med procentvisning.",
          plVolIcon: "Bara ikon",
          plVolIconDesc: "Bara h\xF6gtalaren \u2014 klick v\xE4xlar ljud av.",
          plEditorEyebrow: "Layoutredigerare",
          plEditorClickHint: "Klicka p\xE5 en kontroll i f\xF6rhandsvisningen f\xF6r att flytta eller d\xF6lja den.",
          plEditorSummary: "{visible} synliga, {hidden} dolda.",
          plEditorOpen: "Redigera layouten",
          plEditorSave: "Spara",
          plEditorDiscard: "\xC5ngra",
          plEditorDiscardConfirm: "Sl\xE4ng osparade layout\xE4ndringar?",
          plEditorHidden: "Dolda",
          plEditorHiddenEmpty: "Inget dolt \u2014 klicka p\xE5 en kontroll och anv\xE4nd \xF6gat f\xF6r att d\xF6lja den.",
          plEditorControl: "Kontroll",
          plEditorOrder: "Ordning",
          plEditorVisible: "Synlig",
          plTimeFormatTitle: "Tidsformat p\xE5 s\xF6kraden",
          plTimeElapsedTotal: "F\xF6rfluten och total",
          plTimeElapsedTotalDesc: "22:22 / 1:47:00 \u2014 dagens utseende.",
          plTimeRemaining: "Bara kvar",
          plTimeRemainingDesc: "En enda -1:24:38-etikett som r\xE4knar ner.",
          plTimeElapsedOnly: "Bara f\xF6rfluten",
          plTimeElapsedOnlyDesc: "En enda 22:22-etikett.",
          playerLayoutDesc: "Vilka kontroller spelarens rad visar, och i vilken ordning.",
          playerLayoutHint: "\xC4ndringar g\xE4ller direkt. Mellanrummet delar v\xE4nster och h\xF6ger kontrollgrupp; Spela/Pausa kan inte d\xF6ljas.",
          plPlayPause: "Spela/Pausa",
          plSeekBack: "Spola bak\xE5t 10s",
          plSeekForward: "Spola fram\xE5t 10s",
          plSeek: "Tidslinje",
          plTime: "Tidsvisning",
          plSpacer: "Mellanrum (v\xE4nster/h\xF6ger-delning)",
          plSegmentBadges: "Intro/outro-m\xE4rken",
          plMute: "Ljud av",
          plVolume: "Volymreglage",
          plAudioDelay: "Ljudf\xF6rdr\xF6jning",
          plNextEpisode: "N\xE4sta avsnitt",
          plSwitchStream: "Byt str\xF6m",
          plStreams: "Str\xF6mmar",
          plSleepTimer: "S\xF6mntimer",
          plSleepShort: "S\xF6mn",
          plSleepOff: "Av",
          plSleepMinutes: "{n} min",
          plSleepEnd: "Slutet av avsnittet/filmen",
          plSleepStillThere: "\xC4r du kvar?",
          plSleepStillThereBody: "S\xF6mntimern pausade. R\xF6r musen eller tryck p\xE5 n\xE5got f\xF6r att titta vidare.",
          plCompanions: "Vem tittar med",
          plWhoWatches: "Vem tittar med?",
          plCompanionsJustMe: "Bara jag",
          plCompanionsShort: "Med",
          audioDelayTitle: "Ljudf\xF6rdr\xF6jning",
          audioDelayHint: "Justera l\xE4ppsynk. Positivt v\xE4rde spelar ljudet senare.",
          btAudioAutoOffset: "Kompensera f\xF6r Bluetooth-latens",
          btAudioAutoOffsetDesc: "Tr\xE5dl\xF6st ljud kommer 100\u2013300 ms f\xF6r sent beroende p\xE5 kodek. L\xE4ggs p\xE5 din egen f\xF6rdr\xF6jning n\xE4r utg\xE5ngen \xE4r tr\xE5dl\xF6s.",
          plFullscreen: "Helsk\xE4rm",
          plShow: "Visa",
          plHide: "D\xF6lj",
          settingsTabTheme: "Tema",
          themeScaleTitle: "Tema & skala",
          appTheme: "Tema",
          appThemeDesc: "Bakgrundston i hela appen.",
          themeMidnight: "Midnatt",
          themeMidnightDesc: "Djupbl\xE5 bakgrund.",
          themePitchDesc: "Standard. N\xE4stan svart f\xF6r OLED och m\xF6rka rum.",
          themeSystemDesc: "Byter med macOS utseende-inst\xE4llning.",
          accentColor: "Accentf\xE4rg",
          profileSharedTab: "Delade inst\xE4llningar",
          settingsTabSync: "Synk",
          plTabBehavior: "Beteende",
          settingsPageLang: "Spr\xE5k",
          bugEyebrow: "Rapportera en bugg",
          bugTitle: "Rapportera en bugg",
          bugHint: "En specifik sammanfattning landar snabbare \xE4n ett l\xE5ngt stycke. Steg f\xF6r att \xE5terskapa hj\xE4lper mest av allt.",
          bugSummaryLabel: "Vad gick s\xF6nder?",
          bugSummaryDesc: "En mening om vad som gick fel.",
          bugSummaryPlaceholder: "Spelaren fryser n\xE4r jag\u2026",
          bugStepsLabel: "Steg f\xF6r att \xE5terskapa",
          bugStepsDesc: "Vad gjorde du precis innan det h\xE4nde?",
          bugStepsPlaceholder: "1. \xD6ppna\u2026\n2. Tryck\u2026\n3. \u2026",
          bugCopyReport: "Kopiera rapporten",
          bugCopyNote: "Version och plattform bifogas automatiskt \u2014 klistra in d\xE4r du rapporterar.",
          bugNoSummary: "Buggrapport",
          bugLogEyebrow: "Spelarlogg",
          bugLogTitle: "Exportera spelarloggen",
          bugLogHint: "Om en str\xF6m eller spelaren beter sig fel, bifoga den h\xE4r filen i rapporten.",
          bugLogExport: "Ladda ner logg",
          bugLogError: "Kunde inte l\xE4sa loggen.",
          advTitle: "Avancerat",
          advTabMaintenance: "Underh\xE5ll",
          advTabAbout: "Om",
          advBackupEyebrow: "Backup & \xE5terst\xE4llning",
          advBackupTitle: "Hela din setup i en fil",
          advBackupHint: "Profiler, inst\xE4llningar, watchlists, historik \u2014 allt. \xC5terst\xE4ll p\xE5 en ny dator eller ha som f\xF6rs\xE4kring.",
          advExport: "Exportera backup",
          advImport: "\xC5terst\xE4ll fr\xE5n fil",
          advRestoreConfirm: "\xC5terst\xE4lla backupen? Nuvarande v\xE4rden skrivs \xF6ver och appen laddas om.",
          advBackupError: "Kunde inte l\xE4sa backupfilen.",
          advDownloadsEyebrow: "Nedladdningar",
          advDownloadsTitle: "Nedladdningsmapp",
          advDownloadsHint: "Var spelaren sparar video. N\xE4r satt hoppas mappv\xE4ljaren \xF6ver.",
          advDownloadsUnset: "Fr\xE5ga varje g\xE5ng",
          advDownloadsAppManaged: "Nedladdningar sparas i appen och visas under Mina filer.",
          settingsFolderPickerUnavailable: "Att v\xE4lja mapp g\xE5r inte p\xE5 den h\xE4r enheten.",
          advDownloadsPick: "V\xE4lj mapp",
          advDownloadsClear: "Rensa",
          advOnboardingEyebrow: "Onboarding",
          advOnboardingTitle: "Spela upp guiden igen",
          advOnboardingHint: "K\xF6r f\xF6rstag\xE5ngsguiden igen f\xF6r den h\xE4r profilen.",
          advOnboardingReplay: "Spela upp onboardingen",
          advAboutEyebrow: "Om",
          advAboutHint: "Version och plattform \u2014 bra att ha vid buggrapport.",
          advAboutVersion: "Version",
          advLegalEyebrow: "Juridiskt",
          advLegalP1: "Lumio \xE4r en frist\xE5ende mediaklient. Den \xE4r inte ansluten till, godk\xE4nd av, sponsrad av eller p\xE5 n\xE5got s\xE4tt associerad med n\xE5gon streamingtj\xE4nst, plugin- eller addon-utvecklare eller varum\xE4rkesinnehavare som refereras i appen. Alla namn, logotyper och varum\xE4rken tillh\xF6r sina respektive \xE4gare och anv\xE4nds enbart f\xF6r kompatibilitet och identifiering.",
          advLegalP2: "Lumio varken lagrar, distribuerar eller indexerar n\xE5got medieinneh\xE5ll. Alla str\xF6mmar kommer fr\xE5n tredjepartsk\xE4llor, addons eller tj\xE4nster som du sj\xE4lv konfigurerar. Du ansvarar f\xF6r vad du v\xE4ljer att spela upp och f\xF6r att f\xF6lja lagarna i din jurisdiktion.",
          advAboutPlatform: "Plattform",
          advAboutDisplay: "Sk\xE4rm",
          subStyleEyebrow: "Undertextstil",
          subStyleTitle: "Hur undertexter ser ut",
          subStyleHint: "Storlek, position och f\xE4rger under uppspelning \u2014 f\xF6rhandsvisning nedan.",
          langMetaEyebrow: "Metadata",
          langMetaTitle: "App- & metadataspr\xE5k",
          langMetaHint: "Vilket spr\xE5k gr\xE4nssnittet och titelinformationen anv\xE4nder.",
          langAppLanguage: "Appspr\xE5k",
          langAppLanguageDesc: "Spr\xE5ket i sj\xE4lva Lumio-gr\xE4nssnittet.",
          langMetadataLanguage: "Metadataspr\xE5k",
          langRegion: "Region",
          langRegionDesc: "Landskod f\xF6r tillg\xE4nglighet \u2014 vilka streamingtj\xE4nster och releasedatum som g\xE4ller.",
          langMetadataLanguageDesc: "Titlar, beskrivningar och taglines fr\xE5n TMDb visas p\xE5 detta spr\xE5k n\xE4r \xF6vers\xE4ttning finns.",
          langBehaviorGroup: "AUTOVAL",
          subtitlesOffByDefault: "Starta med undertexter av",
          subtitlesOffByDefaultDesc: "Undertexter hittas och listas fortfarande i CC-menyn \u2014 de sl\xE5s bara aldrig p\xE5 av sig sj\xE4lva.",
          trackBlockWords: "V\xE4lj aldrig sp\xE5r som inneh\xE5ller",
          trackBlockWordsDesc: "Kommaseparerade ord. Matchande undertextsp\xE5r hoppas \xF6ver vid autoval; manuella val funkar \xE4nd\xE5.",
          trackBlockWordsPlaceholder: "commentary, descriptive",
          vtTabLabel: "Bildjustering",
          vtEyebrow: "Bildjustering",
          playButtonMode: "Play-knappens beteende",
          playButtonModeDesc: "Direkt startar b\xE4sta str\xF6mmen p\xE5 en g\xE5ng; Manuell \xF6ppnar str\xF6mlistan s\xE5 du v\xE4ljer k\xE4lla och kvalitet.",
          playModeInstant: "Direkt",
          playModeManual: "Manuell v\xE4ljare",
          showStreamQuality: "Str\xF6mkvalitet i spelaren",
          showStreamQualityDesc: "Visar vad som faktiskt spelas (uppl\xF6sning \xB7 codec) under titeln.",
          rtEyebrow: "Rendering",
          rtTitle: "Kvalitet & HDR",
          rtHint: "Hur desktop-motorn avkodar och skalar bilden.",
          rtProfile: "Kvalitetsprofil",
          rtProfileDesc: "L\xE4tt skonar svaga maskiner, Max anv\xE4nder h\xF6gkvalitativa skalare och debanding (kr\xE4ver hyfsad GPU).",
          rtProfileLight: "L\xE4tt",
          rtProfileBalanced: "Balanserad",
          rtProfileMax: "Max",
          rtToneMapping: "HDR-tone-mapping",
          rtToneMappingDesc: "Hur HDR-material mappas till din sk\xE4rm. Prova hable eller bt.2390 om HDR ser urblekt ut.",
          rtInverseTm: "Omv\xE4nd tone-mapping",
          rtInverseTmDesc: "Expanderar SDR-material mot HDR p\xE5 kapabla sk\xE4rmar.",
          rtHwdec: "H\xE5rdvaruacceleration",
          rtHwdecDesc: "GPU-avkodning \u2014 sn\xE4llare mot batteri och CPU. St\xE4ng bara av vid fels\xF6kning.",
          rtEngineNote: "Kr\xE4ver den inbyggda desktop-motorn (mpv).",
          atEyebrow: "Ljudjustering",
          atTitle: "Forma ljudet",
          atHint: "Utan att r\xF6ra systemets EQ. G\xE4ller den inbyggda desktop-motorn; webbspelaren l\xE4mnar ljudet or\xF6rt.",
          atNormalize: "Normalisera ljudstyrka",
          atNormalizeDesc: "J\xE4mnar ut tyst dialog och h\xF6ga actionscener.",
          atBass: "Basboost",
          atBassDesc: "En +6 dB l\xE5g-shelf f\xF6r tunna h\xF6gtalare.",
          atVoice: "R\xF6stklarhet",
          atVoiceDesc: "Lyfter dialogregistret s\xE5 r\xF6ster sk\xE4r igenom.",
          atDownmix: "Mixa ner surround till stereo",
          atDownmixDesc: "F\xE4ller ihop 5.1/7.1 till tv\xE5 kanaler \u2014 laptoph\xF6gtalare och h\xF6rlurar.",
          atEngineNote: "Kr\xE4ver den inbyggda desktop-motorn (mpv). Nattl\xE4get l\xE4ggs ovanp\xE5.",
          vtTitle: "Bildjusteringar",
          vtHint: "G\xE4ller live i en \xF6ppen spelare och f\xF6r all uppspelning fram\xE5t.",
          vtBrightness: "Ljusstyrka",
          vtContrast: "Kontrast",
          vtSaturation: "M\xE4ttnad",
          vtGamma: "Gamma (mellantoner)",
          vtSharpen: "Sk\xE4rpa",
          vtPresetStandard: "Standard",
          vtPresetBrighter: "Ljusare",
          vtPresetVivid: "Levande",
          vtPresetCinema: "Bio-m\xF6rkt",
          vtPresetSharp: "Skarp",
          vtEngineNote: "Gamma och sk\xE4rpa kr\xE4ver den inbyggda desktop-motorn; webbspelaren till\xE4mpar resten.",
          sfTabSafety: "S\xE4kerhet",
          sfDisplayEyebrow: "Visning",
          sfDisplayHint: "Sl\xE4pptyper som aldrig dyker upp i str\xF6mlistan.",
          sfDisplayOffNote: "Sl\xE5 p\xE5 en filterniv\xE5 ovan f\xF6r att v\xE4lja vad som d\xF6ljs.",
          deviceNoDolbyVision: "Enheten kan inte avkoda Dolby Vision \u2014 v\xE4lj en version utan DV.",
          deviceNoAudioDecoder: "Enheten kan inte avkoda det f\xF6rlustfria ljudsp\xE5ret (TrueHD/DTS-HD) \u2014 spelar med annat sp\xE5r, eller utan ljud. V\xE4lj en AC3/EAC3/AAC-version f\xF6r ljud.",
          deviceFormatUnsupported: "Enheten kan inte avkoda det videoformatet \u2014 prova en annan version.",
          plTabNextEp: "N\xE4sta avsnitt",
          plNextEpHint: "Autoplay, popupen och outro-beteendet mellan avsnitt.",
          langAudioSubTab: "Ljud & undertext",
          langAudioSubTitle: "Standard f\xF6r ljud & undertext",
          langAudioSubHint: "F\xF6redragna spr\xE5k och hur undertexter ser ut i spelaren.",
          spoilersHint: "Vad som blurras tills du v\xE4ljer att visa det.",
          profileCreateDone: "Klart \u2014 byt till profilen",
          libContentEyebrow: "Inneh\xE5llsfilter",
          libContentTitle: "Vad som f\xE5r synas p\xE5 Hem",
          libContentHint: "Sedda och ej sl\xE4ppta titlar kan h\xE5llas borta fr\xE5n katalograderna.",
          libCardsEyebrow: "Kortm\xE4rkning",
          profilesWatchingEyebrow: "Vem tittar nu",
          profilesDeviceEyebrow: "P\xE5 den h\xE4r enheten",
          profileColorDesc: "Anv\xE4nds till avatarens ring och initialen.",
          profileAvatarDesc: "621 avatarer i den inbyggda katalogen. Utan en visar profilen sin initial.",
          profilePinNoneDesc: "Valfri \u2014 fyra siffror. Ingen PIN satt.",
          profilePinSetDesc: "Valfri \u2014 fyra siffror. En PIN \xE4r satt.",
          profileChooseAvatar: "V\xE4lj avatar",
          profileResetDesc: "Historik, bevakning och inst\xE4llningar f\xF6r {name} tas bort. Trakt-kontot r\xF6rs inte.",
          settingsPreviewEyebrow: "F\xF6rhandsvisning",
          posterPreviewTitle: "Den l\xE5nga vintern",
          posterPreviewGenreA: "Drama",
          posterPreviewGenreB: "Thriller",
          libCardsTitle: "M\xE4rken p\xE5 posterkort",
          libCardsHint: "Taggar och mark\xF6rer som visas p\xE5 posterkort p\xE5 Hem och i rutn\xE4t.",
          profilesEyebrow: "Profiler",
          tvActiveProfile: "Aktiv profil",
          tvManageProfiles: "Hantera profiler",
          tvNotSet: "Ej angivet",
          tvBackCloses: "Bak\xE5t st\xE4nger och l\xE4mnar fokus p\xE5 raden.",
          tvBackDiscards: "Bak\xE5t st\xE4nger utan att spara.",
          tvKeyDone: "Klar",
          tvQrScanHint: "Skanna med telefonen \u2014 inget skrivs med fj\xE4rrkontrollen.",
          profileSwitching: "Profilbyte",
          profileColorTenFixed: "Tio fasta f\xE4rger",
          set: "Ange",
          paste: "Klistra in",
          profileAvatarShowAll: "Visa alla avatarer",
          srcCatalogs: "Kataloger",
          srcLibrary: "Bibliotek",
          srcStremioAddons: "Stremio-addons",
          srcCatalogsWord: "kataloger",
          srcCatalogsNote: "Kataloger fr\xE5n communityn \u2014 l\xE4gg till addons som exponerar kataloger. Varje katalog g\xE5r att v\xE4lja som k\xE4lla f\xF6r en egen rad p\xE5 startsidan.",
          srcAddAddon: "L\xE4gg till addon",
          srcAddAddonHint: "Klistra in addonens manifest-URL. Exempel: \u2026/manifest.json",
          srcLibraryNote: "V\xE4lj en mapp med videofiler. Lumio matchar filnamnen mot TMDb och visar dem i ett eget bibliotek.",
          srcLibraryPathNote: "S\xF6kv\xE4gen l\xE4ses automatiskt n\xE4r Lumio startar.",
          pluginsCheckUpdates: "S\xF6k uppdateringar",
          pluginsFindNew: "Hitta nya plugins",
          pluginsMarketplace: "Officiell marknadsplats",
          pluginsAddSource: "L\xE4gg till plugink\xE4lla",
          pluginsAddSourceHint: "GitHub-repo eller lokal ZIP-fil.",
          pluginsSources: "Plugink\xE4llor",
          pluginsSourcesNote: "Externa k\xE4llor du lagt till sj\xE4lv listas h\xE4r.",
          pluginsSourceType: "K\xE4lltyp",
          spoilPrevNextTitle: "S02E04 \xB7 The Long Way Down",
          spoilPrevNextDesc: "Kim m\xF6ter sin bror p\xE5 stationen och tvingas v\xE4lja sida.",
          spoilPrevNextTag: "N\xE4sta avsnitt",
          spoilPrevNextTagKept: "N\xE4sta avsnitt \u2014 alltid synligt",
          spoilPrevUnseenTitle: "S02E05 \xB7 What Comes After",
          spoilPrevUnseenDesc: "Efterspelet tvingar fram ett beslut ingen \xE4r redo f\xF6r.",
          spoilPrevUnseenTag: "Osedd",
          spoilPrevUnseenTagHidden: "Osedd \u2014 dold",
          access: "\xC5tkomst",
          lanStreaming: "LAN-str\xF6mning",
          accessType: "\xC5tkomsttyp",
          accessTypeDesc: "LAN = andra enheter i hemman\xE4tet. Fj\xE4rr = en direkt l\xE4nk in till datorn.",
          cornerTopRight: "Uppe till h\xF6ger",
          cornerTopLeft: "Uppe till v\xE4nster",
          cornerBottomRight: "Nere till h\xF6ger",
          cornerBottomLeft: "Nere till v\xE4nster",
          hpTrailersColumns: "Kolumner",
          check: "S\xF6k",
          disabledWord: "Avst\xE4ngd",
          pluginsCheckUpdate: "S\xF6k uppdatering",
          pluginsCatalogEntry: "Katalogpost",
          pluginsRowMenu: "Radmeny",
          pluginsPluginId: "Plugin-id",
          pluginsOfficial: "Officiell",
          pluginsRemovable: "Kan tas bort",
          pluginsPriorityOrder: "Prioritetsordning",
          pluginsPriorityOrderDesc: "Avg\xF6r vilken k\xE4lla som fr\xE5gas f\xF6rst.",
          pluginsSignedOfficial: "Signerad och listad i den officiella marknadsplatsen.",
          pluginsNotSigned: "Inte signerad av Lumio.",
          pluginsRuntimeDownloaded: "Runtime h\xE4mtas fr\xE5n makarens repo vid installation.",
          pluginsBundledWithApp: "Buntad med appen.",
          yes: "Ja",
          no: "Nej",
          view: "Vy",
          pluginsManageHint: "Sl\xE5 p\xE5, st\xE4ng av eller \xE4ndra ordning. Varje plugin har en egen meny med version, k\xE4lla och borttagning.",
          pluginsEnabled: "Aktiverad",
          pluginsOpenRepo: "\xD6ppna repo",
          pluginsUninstall: "Avinstallera",
          pluginsBundled: "buntad",
          pluginsThirdParty: "tredjepart",
          pluginsBundledCannotRemove: "Buntade plugins f\xF6ljer med Lumio och kan bara st\xE4ngas av, inte tas bort.",
          tvModeUse: "Anv\xE4nd TV-l\xE4ge",
          tvModeUseDesc: "St\xF6rre tr\xE4ffytor, fokusnavigering med fj\xE4rrkontroll och sidomeny. Sl\xE5s p\xE5 automatiskt p\xE5 en TV. Vyn laddas om n\xE4r du \xE4ndrar det h\xE4r.",
          tvModeAuto: "Auto",
          remoteSessionModeLabel: "Fj\xE4rr- och LAN-sessioner",
          remoteSessionModeDesc: "Vilket gr\xE4nssnitt webbl\xE4sarsessioner mot den h\xE4r appen f\xE5r. Auto \xE4rver TV-l\xE4gesvalet ovan plus enhetens egen detektering; Skrivbord och TV tvingar ett l\xE4ge.",
          remoteSessionModeDesktop: "Skrivbord",
          remoteSessionModeTv: "TV",
          tvMenuPlacementTitle: "Menyns placering",
          tvClockHiddenTitle: "D\xF6lj klockan",
          tvClockHiddenHint: "H\xE4lsningen, tiden och datumet i \xF6vre h\xF6gra h\xF6rnet. D\xF6ljs h\xE4r; inget annat p\xE5verkas.",
          tvMenuChipHiddenTitle: "D\xF6lj menypillret",
          tvMenuChipHiddenHint: "Menyn finns kvar och \xF6ppnas som vanligt med \u25C2 eller \u25B4 fr\xE5n inneh\xE5llet.",
          tvMenuPlacementHint: "Var menyn sitter. Inneh\xE5llet \xE4r detsamma i b\xE5da l\xE4gena.",
          tvMenuPlacementTop: "Topp",
          tvMenuPlacementSide: "Sida",
          tvSegmentsEyebrow: "Rader per segment",
          tvSegmentLabel: "Segment",
          tvSegmentDesc: "Varje segment har egna rader i TV-l\xE4get. Utg\xE5ngsl\xE4get speglar din vanliga startsida, s\xE5 inget \xE4ndras f\xF6rr\xE4n du g\xF6r det h\xE4r.",
          tvSegmentUntouched: "Speglar din vanliga startsida. \xC4ndrar du n\xE5got h\xE4r f\xE5r segmentet egna rader.",
          tvRowLayout: "Layout",
          tvRowShared: "Delad",
          tvAddRowDesc: "Bara rader som h\xF6r till det h\xE4r segmentet erbjuds.",
          tvRemoveRowBody: "Raden f\xF6rsvinner ur det h\xE4r segmentet. Din startsida p\xE5 datorn \xE4r or\xF6rd, och du kan l\xE4gga tillbaka raden.",
          profileRequirePin: "Kr\xE4v PIN vid profilbyte",
          profileRequirePinDesc: "Valfri fyrsiffrig kod per profil. Utan PIN byter vem som helst profil direkt.",
          profileStartFrom: "Starta nya profiler fr\xE5n",
          profileStartFromDesc: "Vad en ny profil \xE4rver n\xE4r den skapas.",
          profileStartFromCurrent: "Allt som det ser ut nu",
          profileStartFromDefaults: "Standardinst\xE4llningar",
          trackingSyncEyebrow: "Vad som synkas",
          trackingSyncHint: "Hur Lumio och Trakt utbyter uppspelning och list\xE4ndringar.",
          trackingCommunityEyebrow: "Community",
          trackingCommunityHint: "Publikt inneh\xE5ll fr\xE5n andra Trakt-anv\xE4ndare p\xE5 dina detaljsidor.",
          profileSharedHint: "G\xE4ller hela inst\xE4llningspanelen, inte bara den h\xE4r sidan.",
          profileSharedNoProfile: "Enheten k\xF6r i delat l\xE4ge tills en profil finns \u2014 sedan g\xF6r varje profil sitt eget val.",
          profileSharedEyebrow: "Inst\xE4llningar per profil",
          fontPair: "Typografi",
          fontPairDesc: "Typsnittspar f\xF6r gr\xE4nssnitt och rubriker.",
          cardRadius: "H\xF6rnradie p\xE5 posterkort",
          cardRadiusDesc: "Rundning p\xE5 posterkort p\xE5 hem och i rutn\xE4t.",
          cardRadiusSquare: "Fyrkantig",
          tsTitle: "Dina teman",
          tsNew: "Nytt tema",
          tsImport: "Importera",
          tsImportFailed: "Kunde inte l\xE4sa temafilen.",
          tsEmpty: "Inga egna teman \xE4nnu \u2014 skapa ett s\xE5 f\xF6rhandsvisas hela appen live medan du redigerar.",
          tsUnnamed: "Namnl\xF6st tema",
          tsActive: "Aktivt",
          tsUse: "Anv\xE4nd",
          tsExport: "Exportera",
          tsDelete: "Ta bort",
          tsNamePlaceholder: "Temanamn",
          tsCssPlaceholder: "Egen CSS (valfritt) \u2014 injiceras medan temat \xE4r aktivt",
          tsLivePreview: "Appen f\xF6rhandsvisar dina \xE4ndringar live.",
          tsBg: "Bakgrund",
          tsSurface: "Yta",
          tsElevated: "Upph\xF6jd",
          tsBorder: "Kant",
          tsAccent: "Accent",
          accentColorDesc: "Knappar, markeringar och s\xF6kraden i hela appen.",
          themePitch: "Kolsvart",
          themeSystem: "F\xF6lj systemet",
          uiScale: "Gr\xE4nssnittsskala",
          uiScaleDesc: "Skalar hela gr\xE4nssnittet. Bra p\xE5 4K- och ultrawide-sk\xE4rmar.",
          fullCastTitle: "Rollista & team",
          fullCastOpen: "Rollista",
          dsLayoutTitle: "Str\xF6mmar",
          dsLayoutDesc: "Var str\xF6mlistan ligger p\xE5 detaljsidan.",
          dsLayoutSidebar: "Sidopanel",
          dsLayoutInline: "Under inneh\xE5llet",
          heroCast: "Rollista",
          newSeasonBadge: "Ny s\xE4song",
          homeCardShape: "Kortform",
          homeCardShapeDesc: "St\xE5ende affischkort eller liggande breda kort p\xE5 hemraderna.",
          homeRowTitle: "Radnamn",
          homeRowTitleDesc: "Din egen rubrik f\xF6r raden. Tom = namnet k\xE4llan ger.",
          homeRowTitleDefault: "Fr\xE5n k\xE4llan",
          homeRowSpoilers: "Spoilerskydd",
          homeRowSpoilersDesc: "F\xF6lj spoilerinst\xE4llningarna p\xE5 den h\xE4r raden. Av visar avsnittstitlar och bilder omaskerade \u2014 bra d\xE4r du redan sett, som Forts\xE4tt titta.",
          cardShapePoster: "St\xE5ende",
          cardShapeLandscape: "Liggande",
          qrAddonOpen: "L\xE4gg till via mobilen",
          qrAddonTitle: "Skanna med mobilen",
          qrAddonHint: "\xD6ppna sidan, klistra in en Stremio-manifest-URL och skicka \u2014 den installeras direkt h\xE4r.",
          qrAddonNoLan: "Ingen LAN-adress hittad \u2014 anslut enheten till n\xE4tverket.",
          qrAddonInstallFailed: "Kunde inte installera addonen.",
          qrAddonInstalled: "{name} installerad",
          stremioAddonConfigRequired: "Addonen m\xE5ste konfigureras f\xF6rst \u2014 \xF6ppna dess konfigurationssida i en webbl\xE4sare, g\xF6r dina val och klistra in den personliga manifest-URL du f\xE5r d\xE4r.",
          fullCastCastTab: "Roller",
          fullCastCrewTab: "Team",
          fullCastSearch: "S\xF6k i rollista & team",
          fullCastSortBilling: "Rollordning",
          fullCastSortName: "Namn",
          fullCastSortPopularity: "Popularitet",
          fullCastKeyCrew: "Nyckelpersoner",
          fullCastStills: "Stillbilder",
          fullCastNoMatches: "Ingen matchar s\xF6kningen.",
          fullCastCounter: "{cast} roller \xB7 {crew} i teamet",
          fullCastEpisodes: "{n} avsnitt",
          personCredits: "Filmografi",
          personSortedByPopularity: "Sorterat p\xE5 popularitet",
          tvFontScale: "Textstorlek",
          tvFontScaleDesc: "Skalar all text i TV-l\xE4get utan att \xE4ndra layouten.",
          tvMenuVariantTitle: "Menyform",
          tvMenuVariantHint: "Pillret \xF6ppnar menyn n\xE4r du vill; listen st\xE5r kvar l\xE4ngs v\xE4nsterkanten.",
          tvMenuVariantPill: "Pillret",
          tvMenuVariantRail: "Ikonlist",
          tvButtonScale: "Knappstorlek",
          tvButtonScaleDesc: "Storleken p\xE5 knapparna i startsidans hero och p\xE5 detaljsidan (Spela, Min lista, F\xF6lj \u2026) i TV-l\xE4get.",
          tvMenuScale: "Menystorlek",
          tvMenuScaleDesc: "Skalar sidomenyn \u2014 ikoner och etiketter \u2014 i TV-l\xE4get.",
          menuScale: "Menyskalning",
          cornerScale: "H\xF6rnmenyns storlek",
          cornerScaleDesc: "Skalar ikonerna i \xF6vre h\xF6gra h\xF6rnet. Per enhet \u2014 speglas aldrig till fj\xE4rrsessioner.",
          menuScaleDesc: "Skalar bara sidomenyn \u2014 ikoner och etiketter \u2014 oberoende av gr\xE4nssnittsskalan.",
          reduceMotion: "Minska r\xF6relse",
          reduceMotionDesc: "St\xE4nger av animationer och mjuka \xF6verg\xE5ngar i hela appen.",
          performanceMode: "Prestandal\xE4ge",
          performanceModeDesc: "F\xF6r svagare tv-boxar: tar bort osk\xE4rpa och skuggor bakom menyer och kort, och l\xE5ter inte heron spela trailern av sig sj\xE4lv. Inget f\xF6rsvinner ur gr\xE4nssnittet.",
          heroActionsExpanded: "Visa alltid \xE5tg\xE4rdernas namn",
          heroActionsExpandedDesc: "P\xE5 heron och p\xE5 en titels detaljsida h\xE5ller ikonknapparna vid Spela sina namn synliga i st\xE4llet f\xF6r att f\xE4lla ut dem vid hovring.",
          settingsPagePluginManage: "Hantera plugins",
          settingsTabStatus: "Status",
          settingsTabQuick: "Snabbinst\xE4llningar",
          settingsTabProviders: "Leverant\xF6rer",
          settingsTabAccounts: "Konton",
          settingsTabApiKeys: "API-nycklar",
          settingsTabAddons: "Addons",
          settingsTabSourcesMain: "K\xE4llor & addons",
          settingsTabScrapers: "Scrapers",
          settingsTabPlugins: "Plugins",
          cardTagNew: "Nyhet",
          showCardTags: "Visa taggar p\xE5 kort",
          showCardTagsDesc: "M\xE4rker titlar som sl\xE4ppts de senaste 30 dagarna. Kr\xE4ver k\xE4nt releasedatum, s\xE5 \xE4ldre katalogtitlar taggas aldrig.",
          traktCommentsTitle: "KOMMENTARER FR\xC5N TRAKT",
          traktCommentsTab: "Kommentarer",
          showRecommendations: "Visa rekommendationer p\xE5 detaljsidor",
          showRecommendationsDesc: "Raden med liknande titlar under en film eller serie.",
          traktCommentSpoiler: "Inneh\xE5ller spoiler \u2014 klicka f\xF6r att visa",
          showTraktComments: "Visa kommentarer p\xE5 detaljsidor",
          traktScrobble: "Realtidsscrobbling",
          traktScrobbleDesc: "Rapportera uppspelning till Trakt live \u2014 start, paus och stopp hamnar i din Trakt-historik direkt.",
          traktTwoWaySync: "Tv\xE5v\xE4gssynk",
          traktTwoWaySyncDesc: "Var 15:e minut sl\xE5s watchlist-\xE4ndringar och sedda titlar ihop i b\xE5da riktningarna.",
          traktConflictRule: "Konfliktregel vid f\xF6rsta synken",
          traktConflictRuleDesc: "Vad som g\xE4ller n\xE4r sidorna skiljer sig och ingen tidigare synk kan skilja tillagt fr\xE5n borttaget.",
          traktConflictMerge: "Sl\xE5 ihop (beh\xE5ll b\xE5da)",
          traktConflictTrakt: "Trakt vinner",
          traktConflictLocal: "Den h\xE4r enheten vinner",
          showTraktCommentsDesc: "Publika Trakt-kommentarer under filmer och serier, och en knapp f\xF6r att skriva egna. Spoilerm\xE4rkta d\xF6ljs tills du klickar p\xE5 dem. Trakt tar bara emot kommentarer p\xE5 engelska.",
          showTraktCommentsNeedsTrakt: "Kr\xE4ver ett anslutet Trakt-konto (Sp\xE5rning \u2192 Trakt).",
          traktCommentsConnectHint: "Anslut Trakt under Inst\xE4llningar \u2192 Sp\xE5rning f\xF6r att se kommentarer.",
          traktCommentWrite: "Skriv kommentar",
          traktCommentPlaceholder: "Vad tyckte du?",
          traktCommentEnglishHint: "Trakt tar bara emot kommentarer p\xE5 engelska, minst 5 ord. Spoilers m\xE5ste markeras.",
          traktCommentWords: "{n} ord",
          traktCommentSpoilerToggle: "Inneh\xE5ller spoilers",
          traktCommentSend: "Skicka",
          traktCommentLooksSwedish: "Det h\xE4r ser ut som svenska \u2014 Trakt tar bort kommentarer p\xE5 andra spr\xE5k \xE4n engelska och kan st\xE4nga av kontot.",
          traktCommentSendAnyway: "Skicka \xE4nd\xE5",
          traktCommentBanned: "Trakt har st\xE4ngt av kommentering f\xF6r det h\xE4r kontot.",
          traktCommentRateLimited: "V\xE4nta en stund innan du skickar igen.",
          traktCommentReviewNote: "Fr\xE5n 200 ord publiceras det som en recension.",
          traktCommentFailed: "Kommentaren kunde inte skickas.",
          shortcutsBindableTitle: "TANGENTER (KLICKA F\xD6R ATT \xC4NDRA)",
          shortcutsTracks: "Sp\xE5r",
          shortcutsGlobal: "Globalt",
          shortcutsSubtitleCycle: "Byt undertextsp\xE5r",
          shortcutsSubtitleDelayBack: "Undertextf\xF6rdr\xF6jning \u22120,1 s",
          shortcutsSubtitleDelayForward: "Undertextf\xF6rdr\xF6jning +0,1 s",
          shortcutsPressKey: "Tryck en tangent\u2026",
          shortcutsReset: "\xC5terst\xE4ll till standard",
          shortcutsConflict: "Tangenten anv\xE4nds redan av {name}. V\xE4lj en annan.",
          shortcutsBindableHint: "Esc st\xE4nger alltid spelaren och kan inte bindas om. Bindningarna sparas per profil.",
          settingsTabLocalFiles: "Egna filer",
          settingsTabThisComputer: "Den h\xE4r datorn",
          settingsTabStorage: "Lagring",
          settingsTabHome: "Hem",
          settingsTabAppearance: "Utseende",
          settingsTabZapp: "Zapp",
          settingsSearchPlaceholder: "S\xF6k inst\xE4llningar",
          settingsNyBadge: "NY",
          ovKickerDone: "KLART",
          ovKickerAction: "\xC5TG\xC4RD",
          ovTraktTitle: "Trakt",
          ovTraktConnectedDesc: "Ansluten \u2014 visningar och listor synkas.",
          ovTraktMissingDesc: "Inte ansluten \u2014 tittarstatus stannar p\xE5 den h\xE4r enheten.",
          ovFfmpegTitle: "Videoverktyg saknas p\xE5 den h\xE4r enheten",
          ovFfmpegMissingDesc: "Ingen ffmpeg f\xF6r processorn \u2014 casting, kapitel och undertextsynk \xE4r av.",
          ovOpenTracking: "\xD6ppna Sp\xE5rningstj\xE4nster",
          ovTmdbTitle: "TMDb-nyckel",
          ovTmdbOkDesc: "Sparad \u2014 kataloger och titellogotyper h\xE4mtas.",
          ovTmdbDefaultDesc: "Standardnyckel anv\xE4nds \u2014 egen nyckel ger h\xF6gre kvot.",
          ovTmdbMissingDesc: "Saknas \u2014 Hem tappar sina katalograder.",
          ovOpenLibrary: "\xD6ppna Bibliotek & metadata",
          appLanguageDesc: "Spr\xE5k i appens gr\xE4nssnitt. Sparas per profil.",
          settingsPageFilters: "Str\xF6mfilter",
          sfLevelTitle: "FILTRERINGSNIV\xC5",
          sfLevelStrict: "Strikt",
          sfLevelStrictDesc: "Avvisar misst\xE4nkta fil\xE4ndelser, fel \xE5r eller avsnitt, s\xE4songspaket vid avsnittss\xF6kningar, trailers/samples och cams.",
          sfLevelBalanced: "Balanserad",
          sfLevelBalancedDesc: "F\xF6ljer reglerna nedan \u2014 skydd mot cams och screeners, inga extra heuristiker.",
          sfLevelOff: "Av",
          sfLevelOffDesc: "Ingen filtrering. Varje str\xF6m fr\xE5n varje k\xE4lla visas, \xE4ven uppenbart skr\xE4p.",
          sfTogglesTitle: "REGLER",
          sfHideCam: "D\xF6lj cams",
          sfHideTs: "D\xF6lj telesync/telecine",
          sfHideScr: "D\xF6lj screeners",
          sfHideBelow720p: "D\xF6lj under 720p",
          sfForcedByStrict: "Alltid p\xE5 i niv\xE5n Strikt.",
          settingsAutosaved: "\xC4ndringar sparade",
          settingsAutosaveError: "Vissa \xE4ndringar kunde inte sparas",
          profileName: "Profilnamn",
          profileNamePlaceholder: "Till exempel Familj eller Barn",
          createProfile: "Skapa profil",
          newProfileHeading: "Ny profil",
          profileSourceLabel: "Starta profilen fr\xE5n",
          profileSourceBaseline: "Allt som det ser ut nu",
          profilePinLabel: "PIN",
          profilePinOptionalLabel: "PIN (valfritt)",
          profilePinEnterTitle: "Ange PIN f\xF6r {name}",
          profilePinSetTitle: "V\xE4lj PIN f\xF6r {name}",
          profilePinCurrentTitle: "Ange nuvarande PIN f\xF6r {name}",
          profilePinRemoveTitle: "Ange PIN f\xF6r att ta bort l\xE5set f\xF6r {name}",
          profilePinConfirm: "Ange koden igen f\xF6r att bekr\xE4fta",
          profilePinWrong: "Fel PIN-kod",
          profilePinMismatch: "Koderna matchade inte \u2014 b\xF6rja om",
          profilePinFormatError: "PIN m\xE5ste vara exakt 4 siffror",
          profilePinSet: "S\xE4tt PIN",
          profilePinChange: "\xC4ndra PIN",
          profilePinRemove: "Ta bort PIN",
          profileSourceEmpty: "Tomt, som en ny installation",
          profileSourceProfile: "En kopia av",
          deleteProfileKeepData: "Beh\xE5ll datan vid borttagning",
          deleteProfileKeepHint: "Tar du bort {name} beh\xE5lls dess data som utg\xE5ngsl\xE4ge. Utan kryss tas datan bort och appen \xE5terg\xE5r till det som fanns f\xF6re profiler.",
          deleteProfile: "Ta bort profil",
          resetProfile: "Nollst\xE4ll profil",
          activeProfile: "Aktiv profil",
          switchProfile: "Byt profil",
          profileSwitcher: "Profil",
          streamProviderTitle: "Streamleverant\xF6r",
          configure: "Konfigurera",
          customScraper: "Anpassad",
          rdApiKeyLabel: "API-nyckel f\xF6r stream provider",
          streamProviderManifestPlaceholder: "Klistra in manifest-URL h\xE4r...",
          customManifestPlaceholder: "https://din-stream-provider.example.com/manifest.json",
          hevcTitle: "HEVC / H.265-kodek",
          hevcDesc: "Kr\xE4vs f\xF6r att spela MKV/HEVC-str\xF6mmar i webbl\xE4saren. Installerar Microsoft HEVC-videotill\xE4gget via PowerShell.",
          installHevc: "Installera HEVC-kodek",
          installed: "Installerad",
          checking: "Kontrollerar\u2026",
          installing: "Installerar\u2026",
          hevcRestart: "Starta om webbl\xE4saren f\xF6r att kodeken ska aktiveras.",
          tmdbApiToken: "API-token (Bearer)",
          tmdbApiKey: "API-nyckel (v3)",
          language: "Spr\xE5k",
          region: "Region",
          tmdbEnvNote: "",
          tmdbDefaultHint: "Anv\xE4nder inbyggd standardnyckel \u2014 fyll i f\xF6r att \xF6verstyra.",
          homekitTitle: "HomeKit",
          homekitDesc: "Bygg in Lumio som ett eget HomeKit-tillbeh\xF6r och styr pairing h\xE4rifr\xE5n.",
          homekitEnableAccessory: "Aktivera HomeKit-tillbeh\xF6r",
          name: "Namn",
          homekitStatusLabel: "Status",
          homekitNotConnected: "Inte ansluten",
          homekitDisabled: "Avst\xE4ngd",
          homekitReady: "Redo f\xF6r pairing",
          homekitNotPublished: "Ej publicerad",
          homekitStatusFetchError: "Kunde inte h\xE4mta HomeKit-status",
          homekitServerError: "Kunde inte kontakta HomeKit-servern",
          homekitActionFailed: "HomeKit-operation misslyckades",
          homekitResetInfo: "Pairing nollst\xE4lld och ny HomeKit-identitet skapad. Starta om Lumio innan du l\xE4gger till det i Home-appen \u2014 n\xE4tverksposten uppdateras bara vid start.",
          homekitPublishedInfo: "Tillbeh\xF6ret \xE4r publicerat. L\xE4gg till det i Home-appen.",
          homekitSavedInfo: "Sparat. \xC4ndringarna g\xE4ller direkt \u2014 ingen omstart beh\xF6vs.",
          homekitSaveFailed: "Kunde inte spara inst\xE4llningarna.",
          homekitEventRules: "Event-regler",
          movieStarts: "Film startar",
          moviePaused: "Film pausas",
          videoClosed: "Video st\xE4ngs",
          openGuide: "\xD6ppna guide",
          closeGuide: "St\xE4ng guide",
          startPairing: "Publicera tillbeh\xF6r",
          resetPairing: "Nollst\xE4ll pairing",
          refreshStatus: "Uppdatera status",
          starting: "Publicerar...",
          resetting: "Nollst\xE4ller...",
          homekitGuideTitle: "HomeKit-guide",
          homekitGuideStep1: "Tryck p\xE5 Starta pairing.",
          homekitGuideStep2: "L\xE4gg till tillbeh\xF6ret i Hem-appen och ange PIN-koden fr\xE5n f\xE4ltet ovan.",
          homekitGuideStep3: "D\xF6p switcharna till samma namn som event-reglerna.",
          homekitGuideStep4: "Skapa en automation per switch med triggern Sl\xE5s p\xE5.",
          homekitGuideStep5: "V\xE4lj dina lampor och st\xE4ll in ljusstyrka/scen f\xF6r varje event.",
          homekitSwitchesToUse: "Switchar att anv\xE4nda",
          homekitSwitchesList: "Film startar, Film pausas, Video st\xE4ngs",
          groqTitle: "Groq AI Search",
          groqDescPrefix: "Aktiverar AI-s\xF6kning med naturligt spr\xE5k.",
          spotifyTitle: "Spotify",
          localFilesTitle: "Lokala filer",
          localFilesDesc: "V\xE4lj en mapp med videofiler. Lumio matchar filnamn mot TMDb och visar dem i ett eget bibliotek.",
          chooseFolder: "V\xE4lj mapp",
          removeFolder: "Ta bort mapp",
          playbackTitle: "Uppspelning",
          playbackDesc: "Inst\xE4llningar f\xF6r videouppspelning.",
          homeSectionsTitle: "Startsida",
          homeSectionsDesc: "V\xE4lj ordning, layout och antal kort f\xF6r varje rad p\xE5 startsidan. Upp till 3 egna sektioner st\xF6ds.",
          homeBackgroundTitle: "Bakgrund p\xE5 startsidan",
          homeBackgroundDesc: "Anv\xE4nd egna bild-URL:er i st\xE4llet f\xF6r den slumpade bakgrunden.",
          homeBackgroundPlaceholder: "https://exempel.se/bakgrund-1.jpg\nhttps://exempel.se/bakgrund-2.jpg",
          uploadImages: "Ladda upp bilder",
          enabled: "Aktiverad",
          uploadedImage: "Uppladdad bild",
          localUploadStored: "Sparas lokalt i Lumio",
          remove: "Ta bort",
          drag: "Dra",
          moveUp: "Flytta upp",
          moveDown: "Flytta ner",
          moveUpShort: "Upp",
          moveDownShort: "Ner",
          homeRowRecent: "Senast sett",
          homeRowTrending: "Trendar",
          homeRowMovies: "Popul\xE4ra filmer",
          homeRowSeries: "Popul\xE4ra serier",
          homeRowTrailers: "Trailers",
          homeRowLiveTv: "Live TV",
          homeRowVod: "Video on demand",
          homeRowBinge: "Binge!",
          bingeStart: "Starta binge",
          bingeEmpty: "L\xE4gg till serier i listan f\xF6r att kunna binga",
          bingeDeleteList: "Radera listan",
          bingeRenameList: "Byt namn p\xE5 listan",
          bingeManageLists: "Hantera listor",
          bingeStreamIndex: "Avsnitt {n} av str\xF6mmen",
          bingeZapOn: "Zappa vidare",
          bingeStayInSeries: "Stanna i serien",
          bingeNextUp: "N\xE4sta i din binge",
          bingeOneMoreSame: "Ett till av samma",
          bingeQueueTitle: "Sedan i k\xF6n",
          bingeQueueReshuffles: "K\xF6n slumpas om vid varje avsnitt",
          bingeReshuffle: "Blanda om",
          bingeResolving: "Letar str\xF6m\u2026",
          bingePicking: "Drar en serie\u2026",
          bingeListEmpty: "Inget i listan har n\xE5got avsnitt kvar att spela.",
          bingeSectionEyebrow: "BINGE!",
          bingeSectionTitle: "Hur str\xF6mmen v\xE4ljer",
          bingeSectionHint: "Binge respekterar spelarens befintliga inst\xE4llningar f\xF6r hoppa \xF6ver intro och avancera vid eftertexter.",
          bingeEpisodePickDesc: "Hur str\xF6mmen v\xE4ljer avsnitt ur varje serie.",
          bingePickNextUnseenShort: "N\xE4sta osedda",
          bingePickRandomShort: "Slumpat avsnitt",
          bingePickRandomUnseenShort: "Slumpat, aldrig sett",
          bingeAutoChain: "Kedja vidare automatiskt",
          bingeAutoChainDesc: "N\xE4sta serie startar n\xE4r avsnittet tar slut.",
          bingeAvoidRepeat: "Aldrig tv\xE5 avsnitt fr\xE5n samma serie i rad",
          bingeAvoidRepeatDesc: "G\xE4ller om listan har minst tre serier.",
          bingeIncludeWatchlist: "Ta med bevakningslistan",
          bingeIncludeWatchlistDesc: "Serier du bevakar l\xE4ggs till i str\xF6mmen utan att sparas i listan.",
          bingeSkipWatched: "Hoppa \xF6ver sett material",
          bingeSkipWatchedDesc: "Avsnitt markerade som sedda dras aldrig.",
          cpMetricPages: "Egna sidor",
          cpMetricRows: "Rader i sidan",
          cpNoPageOpen: "Ingen sida \xF6ppen",
          cpGeneratorEyebrow: "GENERATOR",
          cpGeneratorTitle: "Skapa en sida fr\xE5n ett tema",
          cpGeneratorPlaceholder: "Star Wars, 80-tal, Netflix\u2026",
          cpGenerate: "Generera",
          cpTemplate_franchise: "Filmserie",
          cpTemplate_decade: "\xC5rtionde",
          cpTemplate_mood: "St\xE4mning",
          cpTemplate_streaming: "Streamingtj\xE4nst",
          cpTemplate_network: "N\xE4tverk (TMDb-id)",
          cpTemplate_director: "Regiss\xF6r (TMDb-id)",
          cpTemplate_actor: "Sk\xE5despelare (TMDb-id)",
          cpTemplate_collection: "Samling (TMDb-id)",
          cpTemplate_trakt: "Trakt-lista (id)",
          cpPagesEyebrow: "SIDOR",
          cpPageName: "Sidans namn",
          cpAddFilter: "+ L\xE4gg till filter",
          cpRemoveFilter: "Ta bort filtret",
          cpNoFilters: "Inga filter \u2014 raden \xE4r den bredaste fr\xE5gan som finns.",
          cpAllFiltersSet: "Alla filter \xE4r redan satta.",
          cpRemovePage: "Ta bort sidan",
          cpRemovePageBody: "Sidan och dess rader raderas. Rader p\xE5 andra sidor som \xF6ppnade den faller tillbaka p\xE5 tr\xE4ffrutn\xE4tet.",
          cpRowActive: "Raden aktiv",
          cpTemplatesEyebrow: "MALLAR",
          cpTemplateNeedsTheme: "Kr\xE4ver ett tema",
          cpPagesTitle: "Dina sidor",
          cpNoPages: "Inga sidor \xE4n. Skriv ett tema ovan och generera en.",
          cpNoRows: "Den h\xE4r sidan har inga rader \xE4n.",
          cpRowCount: "{n} rader",
          cpUseAsStart: "\xD6ppna appen p\xE5 den h\xE4r sidan",
          cpUseAsStartDesc: "Appen startar h\xE4r i st\xE4llet f\xF6r hemvyn. Hemvyn ligger kvar i sidomenyn.",
          cpRowTitle: "Radnamn",
          cpRowMediaType: "Typ",
          cpRowSort: "Sortering",
          cpRowLayout: "Layout",
          cpRowRuntime: "Speltid (min)",
          cpRowCertification: "\xC5ldersgr\xE4ns + land",
          cpFrom: "Fr\xE5n",
          cpTo: "Till",
          cpRowShowAll: "Visa alla \xF6ppnar",
          cpEmptyPage: "Tom sida",
          cpAddRow: "+ L\xE4gg till rad",
          cpRowSource: "K\xE4lla",
          cpSourceDiscover: "TMDb-s\xF6kning (discover)",
          cpSourceManual: "Handplockade titlar",
          cpManualEyebrow: "HANDPLOCKAT",
          cpManualSearch: "S\xF6k en titel att l\xE4gga till\u2026",
          cpSourceTrakt: "Trakt-lista",
          cpSourceCollection: "TMDb-samling",
          cpSourceContinue: "Forts\xE4tt titta",
          cpSourceWatchlist: "Att se",
          cpRowTitleQuery: "Titeln inneh\xE5ller",
          cpRowKeywords: "Nyckelord (TMDb-taggar)",
          cpRowKeywordsHint: "star wars, rymdopera",
          cpRowGenres: "Genrer",
          cpRowYears: "\xC5r",
          cpRowRatingMin: "Betyg fr\xE5n",
          cpRowPeople: "Personer",
          cpRowIdHint: "t.ex. 1893",
          cpRowCollectionId: "Samling (TMDb-id)",
          cpRowTraktList: "Trakt-lista (id eller slug)",
          cpRowShowAllLabel: "Visa alla heter",
          cpRowShowAllLabelHint: "Tomt = den vanliga texten.",
          cpProviderHint: "Streamingtj\xE4nst kr\xE4ver ett exakt namn: {list}",
          cpInMenu: "I menyn",
          cpMetricInMenu: "I sidomenyn",
          cpSearchPerson: "S\xF6k sk\xE5despelare eller regiss\xF6r\u2026",
          cpSearchCompany: "S\xF6k studio\u2026",
          cpSearchCollection: "S\xF6k en samling, t.ex. Star Wars\u2026",
          cpRowCollection: "Samling",
          cpNoEntity: "Hittade ingen med det namnet.",
          cpEnterToAdd: "Enter",
          cpPickSuggestion: "V\xE4lj ett av f\xF6rslagen \u2014 att bara skriva filtrerar inte.",
          cpNoKeyword: "Inget TMDb-nyckelord heter s\xE5. En person filtreras med Personer, inte med Nyckelord.",
          cpPreviewEyebrow: "I RADEN",
          cpPreviewCount: "{n} visas",
          cpPreviewSpares: "{n} i reserv",
          cpLoadMore: "H\xE4mta fler",
          cpEmptyVotes: "Inga tr\xE4ffar \u2014 r\xF6stgolvet \xE4r f\xF6r h\xF6gt f\xF6r ett s\xE5 smalt filter. Ta bort Votes-chipet.",
          cpPreviewEmpty: "Inga tr\xE4ffar. L\xE4tta p\xE5 ett filter, eller kolla att nyckelordet \xE4r ett riktigt TMDb-nyckelord.",
          cpPin: "F\xE4st \xF6verst",
          cpUnpin: "Lossa",
          cpExclude: "Utanf\xF6r raden",
          cpInclude: "Tillbaka i raden",
          cpOnlyMovies: "Person och \xE5ldersgr\xE4ns finns bara f\xF6r film, s\xE5 raden visar filmer.",
          cpOnlySeries: "N\xE4tverk finns bara f\xF6r serier, s\xE5 raden visar serier.",
          cpImpossibleMix: "Person/\xE5ldersgr\xE4ns (film) och n\xE4tverk (serier) g\xE5r inte att kombinera \u2014 raden blir tom.",
          cpFilterEyebrow: "TMDB-FILTER",
          cpCallLabel: "ANROP",
          cpHits: "{n} tr\xE4ffar",
          cpRowCardShape: "Kortform",
          cpShapePoster: "Affisch 2:3",
          cpShapeLandscape: "Liggande 16:9",
          cpCountCards: "{n} kort",
          cpRowCardCount: "Antal",
          cpFieldYear: "\xC5r",
          cpFieldRating: "Betyg",
          cpFieldVotes: "R\xF6ster",
          cpFieldLanguages: "Spr\xE5k",
          cpFieldCompanies: "Studio",
          cpFieldNetworks: "N\xE4tverk (TMDb-id)",
          cpFieldProviders: "Tj\xE4nst",
          cpFieldCertCountry: "Land",
          cpShowAllGrid: "Tr\xE4ffrutn\xE4tet",
          cpShowAllNone: "Ingen l\xE4nk",
          cpTypeAll: "Film & serier",
          cpTypeMovie: "Film",
          cpTypeSeries: "Serier",
          cpSortRelevance: "Relevans",
          cpSortRating: "H\xF6gst betyg",
          cpSortNewest: "Nyast",
          cpSortOldest: "\xC4ldst",
          cpLayoutSlider: "Karusell",
          cpLayoutGrid: "Rutn\xE4t",
          settingsTabCustomPages: "Mina sidor",
          bingeAutoNewEpisodes: "Nya avsnitt",
          bingeEpisodeRun: "Avsnitt i rad ur samma serie",
          bingeEpisodeRunDesc: "Hur l\xE4nge str\xF6mmen stannar i en serie innan den byter.",
          bingeRunOne: "Ett, sedan byte",
          bingeRunCount: "Ett best\xE4mt antal",
          bingeRunAll: "Hela serien",
          bingeEpisodesPerSeries: "Avsnitt per serie innan byte \u2014 {n}",
          bingeEpisodesPerSeriesDesc: "Hur m\xE5nga avsnitt i rad ur samma serie.",
          bingeDefaultList: "Standardlista",
          bingeDefaultListDesc: "Listan som startar n\xE4r du inte valt n\xE5gon.",
          bingeDefaultListAuto: "F\xF6rsta listan med serier",
          bingeManageListsDesc: "Bygg dina listor och v\xE4lj vilka serier som ing\xE5r.",
          bingeOpen: "\xD6ppna",
          bingeAutoWatchlist: "Bevakade serier",
          bingeAutoInProgress: "Halvtittat",
          bingeYourLists: "Dina listor",
          bingeNewList: "+ Ny binge-lista",
          bingeNewListName: "Ny lista",
          bingeListSeries: "{series} serier",
          bingeAutoMeta: "Auto \xB7 {series} serier",
          bingeAddSeries: "L\xE4gg till serie",
          bingeDoneAdding: "Klar",
          bingeStartList: "Binga listan",
          bingeAddToList: "L\xE4gg till i listan",
          bingeRemoveFromList: "Ta bort ur listan",
          bingeEpisodePick: "Avsnittsval",
          bingePickNextUnseen: "Str\xF6mmen spelar n\xE4sta osedda avsnitt ur varje serie.",
          bingePickRandom: "Str\xF6mmen spelar ett slumpat avsnitt, sett eller inte.",
          bingePickRandomUnseen: "Str\xF6mmen spelar ett slumpat avsnitt du aldrig sett.",
          bingeStartHint: "slumpat avsnitt",
          bingeListMeta: "{name} \xB7 {series} serier",
          homeRowTraktCollection: "Watchlist",
          homeRowCustom1: "Egen rad 1",
          homeRowCustomN: "Egen rad {n}",
          hpAddCustomRow: "L\xE4gg till rad",
          hpRemoveCustomRow: "Ta bort rad",
          homeRowCustom2: "Egen rad 2",
          homeRowCustom3: "Egen rad 3",
          homeSearchTitle: "S\xF6kf\xE4lt p\xE5 startsidan",
          homeSearchDesc: "Visa eller d\xF6lj det stora s\xF6kf\xE4ltet p\xE5 startsidan.",
          homeSearchToggleLabel: "D\xF6lj s\xF6kf\xE4lt p\xE5 startsidan",
          homeTopMenuTitle: "\xD6vre meny",
          homeTopMenuDesc: "V\xE4lj vilka \xF6vre knappar som ska visas och \xE4ndra ordningen.",
          homeTopMenuSettingsShortcut: "Inst\xE4llningar kan alltid \xF6ppnas med Cmd+, p\xE5 Mac eller Ctrl+, p\xE5 andra tangentbord.",
          homeMainMenuTitle: "Startsidans meny",
          homeMainMenuDesc: "V\xE4lj vilka menyknappar som ska visas och \xE4ndra ordningen med upp och ner.",
          profileSelector: "Profilv\xE4ljare",
          alwaysVisible: "Visas alltid",
          collapseSection: "Kollapsa sektion",
          expandSection: "Expandera sektion",
          homeSource: "K\xE4lla",
          homeSourceMovies: "Filmer",
          homeSourceSeries: "Serier",
          homeSourceSeriesWatchlist: "Nya avsnitt",
          homeSourceSeriesWatchlistSubtitle: "Watchlist",
          homeSourceMovieWatchlist: "Min lista",
          homeSourceTraktCollection: "Watchlist",
          homeWatchlistList: "Lista",
          homeWatchlistType: "Typ",
          pluginYoutubeNotConnected: "Inte ansluten",
          pluginYoutubeConnection: "Anslutning",
          pluginYoutubeConnectionNote: "Det h\xE4r pluginet anv\xE4nder ditt eget Google Desktop Client ID och din YouTube Data API-nyckel.",
          pluginYoutubeClientId: "Google OAuth Client ID",
          pluginYoutubeApiKey: "YouTube API-nyckel",
          pluginYoutubeOwnAppTitle: "S\xE5 skapar du din egen app",
          pluginYoutubeOwnAppStep1: "1. Skapa ett Google Cloud-projekt.",
          pluginYoutubeOwnAppStep2: "2. Aktivera YouTube Data API v3.",
          pluginYoutubeOwnAppStep3: "3. Konfigurera OAuth consent screen.",
          pluginYoutubeOwnAppStep4: "4. Skapa ett OAuth Client ID f\xF6r Desktop app.",
          pluginYoutubeOwnAppStep5: "5. Skapa en API-nyckel begr\xE4nsad till YouTube Data API v3.",
          pluginYoutubeOwnAppStep6: "6. Klistra in client ID och API-nyckel h\xE4r och anslut YouTube igen.",
          pluginYoutubeOwnAppNote: "F\xF6r privat bruk beh\xF6ver du ingen egen dom\xE4n. F\xF6r localhost/webbutveckling kan du ocks\xE5 skapa en Web application client, men vanlig pluginanv\xE4ndning ska anv\xE4nda en Desktop app client.",
          pluginYoutubeVideoOptions: "Videoalternativ",
          pluginYoutubeHero: "Hero",
          pluginYoutubeHeroHelp: "Anv\xE4nder den senaste videon fr\xE5n kanaler du f\xF6ljer som hero p\xE5 startsidan. N\xE4r den \xF6ppnas d\xF6ljs den tills en nyare video dyker upp.",
          pluginYoutubeKeepHero: "Beh\xE5ll hero",
          pluginYoutubeKeepHeroHelp: "Beh\xE5ller den senaste YouTube-heron synlig \xE4ven efter att du \xF6ppnat den, och byter bara n\xE4r en nyare video dyker upp vid uppstart/warmup.",
          pluginYoutubeHideShorts: "D\xF6lj shorts",
          pluginYoutubeHideShortsHelp: "D\xF6ljer korta YouTube-videor fr\xE5n grids n\xE4r durationsdata finns tillg\xE4nglig.",
          pluginYoutubeConnect: "Anslut YouTube",
          pluginYoutubeConnecting: "Ansluter\u2026",
          pluginYoutubeRefresh: "Uppdatera",
          pluginYoutubeRefreshing: "Uppdaterar\u2026",
          pluginYoutubeReconnect: "Anslut igen",
          pluginYoutubeDisconnect: "Koppla fr\xE5n",
          pluginYoutubeDisconnecting: "Kopplar fr\xE5n\u2026",
          pluginYoutubeClearCache: "Rensa cache",
          pluginYoutubeConnectError: "Kunde inte ansluta YouTube.",
          pluginYoutubeDisconnectError: "Kunde inte koppla fr\xE5n YouTube.",
          pluginYoutubeLoadError: "Kunde inte ladda YouTube-data.",
          pluginYoutubeRowLoadError: "Kunde inte ladda YouTube-raden.",
          pluginYoutubeFollowingPage: "F\xF6ljer",
          pluginYoutubeChannelsPage: "Kanaler",
          pluginYoutubePlaylistsPage: "Spellistor",
          pluginYoutubeChannelPage: "Kanal",
          pluginYoutubePlaylistPage: "Spellista",
          pluginYoutubeFollowingSubtitle: "Senaste videorna fr\xE5n kanaler du f\xF6ljer.",
          pluginYoutubeChannelsSubtitle: "S\xF6k efter nya kanaler och hantera vilka du f\xF6ljer.",
          pluginYoutubePlaylistsSubtitle: "Dina sparade YouTube-spellistor.",
          pluginYoutubeChannelSubtitle: "Senaste videorna fr\xE5n den h\xE4r kanalen.",
          pluginYoutubePlaylistSubtitle: "Videor i spellistan",
          pluginYoutubeMatchingChannels: "Matchande kanaler",
          pluginYoutubeYourSubscriptions: "Dina prenumerationer",
          pluginYoutubeSearchChannels: "S\xF6k kanaler",
          pluginYoutubeSetupPrompt: "L\xE4gg in ditt Google Desktop Client ID och din YouTube API-nyckel i YouTube-pluginets inst\xE4llningar f\xF6r att komma ig\xE5ng.",
          pluginYoutubeConnectPrompt: "Anslut YouTube i inst\xE4llningarna f\xF6r att bl\xE4ddra bland dina prenumerationer, kanaler och spellistor.",
          pluginYoutubeLoading: "Laddar din YouTube-data\u2026",
          pluginYoutubePlaylistBadge: "Spellista",
          pluginYoutubeChannelBadge: "Kanal",
          pluginYoutubeVideoBadge: "Video",
          pluginYoutubeVideos: "videor",
          pluginYoutubeUnfollow: "Avf\xF6lj",
          pluginYoutubeOpenFeed: "\xD6ppna fl\xF6de",
          pluginYoutubeFollowingRow: "YouTube f\xF6ljer",
          plexConnect: "Anslut Plex",
          plexDisconnect: "Koppla fr\xE5n",
          plexWaiting: "V\xE4ntar\u2026",
          plexRequestFailed: "Plex-f\xF6rfr\xE5gan misslyckades.",
          plexNoServers: "Inga Plex-servrar hittades.",
          plexChooseServer: "Server",
          plexRefreshLibraries: "Uppdatera bibliotek",
          plexRefreshingLibrariesButton: "Uppdaterar\u2026",
          plexRefreshLibrariesDone: "Bibliotek uppdaterade.",
          plexRefreshLibrariesEmpty: "Inga bibliotek hittades f\xF6r den h\xE4r servern.",
          plexRefreshLibrariesFailed: "Kunde inte uppdatera bibliotek.",
          plexSignedInAs: "Ansluten som",
          plexSignedInFallback: "Plex-anv\xE4ndare",
          plexChooseProfile: "Profil",
          plexProfilePin: "Profil-PIN",
          plexProfilePinPlaceholder: "Ange Plex profil-PIN",
          plexRefreshingProfiles: "Uppdaterar profiler\u2026",
          plexApplyProfile: "Anv\xE4nd profil",
          plexProfileApplied: "Profilen \xE4r uppdaterad.",
          plexChooseLibraries: "Bibliotek",
          plexNoLibraries: "Inga bibliotek hittades.",
          plexOpenLinkAndCode: "\xD6ppna l\xE4nken och ange koden",
          pluginSectionIntro: "Hantera installerade plugins, bl\xE4ddra i den officiella marketplace-listan och l\xE4gg till plugin-k\xE4llor fr\xE5n GitHub eller ZIP-filer.",
          pluginRestartRequired: "Omstart kr\xE4vs f\xF6r att plugin\xE4ndringar ska sl\xE5 igenom helt.",
          pluginRestartNow: "Starta om nu",
          pluginInstalledTitle: "Installerade plugins",
          addonsNavLabel: "Addons",
          addonsOverviewHeader: "\xD6VERSIKT",
          addonsAddHeader: "L\xC4GG TILL ADDON",
          addonsInstalledHeader: "INSTALLERADE ADDONS",
          addonsStatAddons: "Addons",
          addonsStatActive: "Aktiva",
          addonsUrlPlaceholder: "Addon-URL",
          addonsAddButton: "L\xE4gg till addon",
          addonsEmptyState: "Inga addons installerade. Klistra in en repo-URL ovan f\xF6r att l\xE4gga till.",
          addonsInvalidUrl: "Ange en GitHub-repo-URL eller marketplace.json-URL.",
          addonsGroupSources: "K\xC4LLOR",
          addonsGroupCatalogs: "KATALOGER",
          addonsGroupDiscovery: "UPPT\xC4CK",
          pluginSubEnable: "AKTIVERA PLUGINS",
          pluginSubInstalled: "INSTALLERADE PLUGINS",
          pluginSubAvailable: "TILLG\xC4NGLIGA PLUGINS",
          pluginPreinstalled: "F\xF6rinstallerad",
          pluginOfficialBadge: "Officiell",
          pluginManualSourceBadge: "Manuell k\xE4lla",
          pluginInactiveBadge: "Inaktiv",
          pluginUpdateAvailable: "Uppdatering finns",
          pluginMetadataOnly: "Endast metadata",
          pluginRepoLabel: "Repo",
          pluginManifestLabel: "Manifest",
          pluginUpdateNotice: "En nyare pluginversion finns i marketplace-k\xE4llan.",
          pluginActiveState: "Aktiv",
          pluginInactiveState: "Inaktiv",
          pluginDeactivate: "Inaktivera",
          pluginActivate: "Aktivera",
          pluginUninstall: "Avinstallera",
          pluginMarketplaceTitle: "Officiell marketplace",
          pluginMarketplaceIntro: "Installera officiella Lumio-plugins fr\xE5n det delade marketplace-repot.",
          pluginMarketplaceFallback: "Anv\xE4nder fallback-data f\xF6r marketplace",
          pluginMarketplaceLive: "Live-manifest",
          pluginMarketplaceStatic: "Fallback-manifest",
          pluginMarketplaceChecked: "Kontrollerad",
          pluginCheckUpdates: "S\xF6k uppdateringar",
          pluginBundledRuntime: "Bundlad runtime",
          pluginSharedRepoSuffix: "i delat marketplace-repo",
          pluginInstall: "Installera",
          pluginNoReadmePreview: "Ingen README-f\xF6rhandsvisning tillg\xE4nglig.",
          pluginNoChangelogPreview: "Ingen changelog-f\xF6rhandsvisning tillg\xE4nglig.",
          pluginAllOfficialInstalled: "Alla officiella marketplace-plugins \xE4r installerade.",
          pluginAddSourceTitle: "L\xE4gg till plugin-k\xE4lla",
          pluginAddSourceIntro: "L\xE4gg till ett GitHub-repo som inneh\xE5ller ett Lumio-pluginmanifest, eller ladda upp en plugin-ZIP. Uppt\xE4ckta plugins visas nedan som installerbara val.",
          pluginGithubRepoUrl: "GitHub repo-URL",
          pluginAddGithubSource: "L\xE4gg till GitHub-k\xE4lla",
          pluginChooseReleaseZip: "V\xE4lj en release-ZIP",
          pluginChooseReleaseZipHelp: "Det h\xE4r repot har flera release-ZIP-filer. V\xE4lj vilken asset Lumio ska inspektera.",
          pluginUploadZipTitle: "Ladda upp plugin-ZIP",
          pluginUploadZipHelp: "Importera en plugin-ZIP direkt, till exempel ett nedladdat stream provider-paket eller ett zippat pluginrepo. Du kan ocks\xE5 dra och sl\xE4ppa en ZIP h\xE4r.",
          pluginUploadZip: "Ladda upp ZIP",
          pluginLastZipPreview: "Senaste ZIP-f\xF6rhandsvisning",
          pluginSourceHelp: "GitHub-k\xE4llor b\xF6r helst exponera en marketplace.json i roten. Om den saknas f\xF6rs\xF6ker Lumio ocks\xE5 automatiskt inspektera den senaste GitHub release-ZIP-filen. ZIP-importer kan inneh\xE5lla antingen en marketplace.json eller en eller flera plugin.json-filer.",
          pluginAddedSources: "Tillagda k\xE4llor",
          pluginGithubSourceBadge: "GitHub-k\xE4lla",
          pluginZipSourceBadge: "ZIP-k\xE4lla",
          pluginAddedAt: "Tillagd",
          pluginRemoveSource: "Ta bort k\xE4lla",
          pluginReleaseAssets: "Release-assets",
          pluginFilesFound: "Hittade filer",
          pluginInstallAllFromSource: "Installera alla fr\xE5n k\xE4llan",
          pluginAllSourceInstalled: "Alla plugins fr\xE5n den h\xE4r k\xE4llan \xE4r redan installerade.",
          pluginRuntimeAvailable: "Runtime tillg\xE4nglig",
          pluginMetadataOnlyNow: "Endast metadata just nu",
          open: "\xD6ppna",
          clear: "Rensa",
          homeSourceLiveTvLists: "Live TV-listor",
          homeSourceVodLibrary: "Video on demand",
          homeSourceBingeLibrary: "Bingebibliotek",
          homeSourceMyFiles: "Mina filer",
          homeSourceRecentlyWatched: "Historik",
          historySearchPlaceholder: "S\xF6k i historiken",
          homeSourceRecentlyWatchedSubtitle: "Nyligen sett",
          homeSourceCriticsPicks: "Kritikerfavoriter",
          homeSourceDecade2010s: "Tiotalets b\xE4sta",
          homeSourceDecade1990s: "Nittiotalsklassiker",
          homeSourceDecade1980s: "\xC5ttiotalsklassiker",
          homeSourceDecade1970s: "Sjuttiotalsfilm",
          homeSourceJapaneseCinema: "Japansk film",
          homeSourceKoreanCinema: "Koreansk film",
          homeSourceFrenchCinema: "Fransk film",
          homeSourceKdrama: "K-drama",
          tvSegmentAnime: "Anime",
          tvBackAgainToExit: "Tryck Back igen f\xF6r att avsluta",
          tvHeroFeatured: "Utvalt",
          tvHeroMyList: "Min lista",
          tvHeroPagerDot: "Utvald titel {n} av {total}",
          tvHeroRuntimeHm: "{h} h {m} min",
          tvHeroRuntimeM: "{m} min",
          tvHeroStreamsN: "{n} str\xF6mmar",
          tvGenreRowTitle: "Genrer",
          tvRowFailed: "Kunde inte h\xE4mtas",
          tvRowNoRenderer: "Finns inte i TV-l\xE4get \xE4nnu",
          tvQuickPlay: "Spela",
          tvQuickMarkWatched: "Markera som sedd",
          tvQuickUnmarkWatched: "Markera som osedd",
          tvQuickMoreInfo: "Mer info",
          tvQuickShowAllRow: "Visa alla i raden",
          tvQuickFollow: "F\xF6lj",
          tvQuickUnfollow: "Sluta f\xF6lja",
          tvQuickTrailer: "Trailer",
          tvMenuChip: "Menu",
          tvMenuSearch: "S\xF6k",
          tvSearchFilters: "S\xF6k & filter",
          tvClockMorning: "God morgon",
          tvClockDay: "Hej",
          tvClockEvening: "God kv\xE4ll",
          tvClockNight: "God natt",
          tvMenuSources: "Bibliotek och k\xE4llor",
          tvQuickRemoveContinue: "Ta bort fr\xE5n Forts\xE4tt titta",
          tvCollectionHint: "Filmsamling \u2014 tryck OK f\xF6r att se filmerna i premi\xE4rordning.",
          tvProviderHint: "Streamingtj\xE4nst \u2014 tryck OK f\xF6r att se filmer och serier som finns p\xE5 {name}, sorterade efter popularitet.",
          tvCollectionSummary: "{count} filmer ({years}): {titles}",
          homeSourceAnimeSeries: "Animeserier",
          homeSourceMoodComfort: "Mysfilm",
          homeSourceMoodMind: "Tanken\xF6tter",
          homeSourceMoodAfterDark: "Efter m\xF6rkrets inbrott",
          homeSourceMoodDateNight: "Mysig kv\xE4ll",
          homeSourceMoodAdrenaline: "Adrenalin",
          homeSourceMoodLaugh: "Skratta h\xF6gt",
          homeSourceMoodHeist: "Kupper och bedr\xE4gerier",
          homeSourceMoodSpace: "Ut i rymden",
          homeSourceMoodFantasy: "Sv\xE4rd och magi",
          homeSourceMoodTrueCrime: "Sanna brott",
          homeSourceMoodSlowBurn: "L\xE5ngsamma dramer",
          homeSourceMoodWar: "Krigsber\xE4ttelser",
          homeSourceMoodWestern: "V\xE4stern",
          homeSourceMoodHistory: "Historiskt",
          homeSourceMoodWhodunit: "Vem gjorde det",
          homeSourceNetworkNetflix: "Netflix Originals",
          homeSourceNetworkHbo: "Fr\xE5n HBO",
          homeSourceNetworkApple: "Apple TV+",
          homeSourceNetworkAmc: "AMC",
          homeSourceNetworkFx: "FX",
          homeSourceNetworkDisney: "Disney+ Originals",
          homeSourceNetworkPrime: "Prime Video",
          homeSourcePrestigeDrama: "Prestigedrama",
          homeSourceAnimeMovies: "Animefilmer",
          homeSourceAnimeTopSeries: "H\xF6gst betygsatt anime",
          homeSourceStreamingServices: "Streaming",
          homeSourceStudios: "Studios",
          liveTvList: "Live TV-lista",
          liveTvChooseList: "V\xE4lj en Live TV-lista",
          homeMenuPremiereStar: "Premi\xE4rer",
          traktTitle: "Trakt",
          traktDesc: "Logga in med Trakt f\xF6r att synka sedda serieavsnitt, listor och din samling med Lumio.",
          traktSignedInAs: "Inloggad som",
          traktSignedInFallback: "Trakt-anv\xE4ndare",
          traktSyncDesc: "Synk h\xE4mtar data fr\xE5n Trakt till Lumio och skickar ocks\xE5 upp dina lokala Lumio-listor och sedda avsnitt till Trakt.",
          traktImportData: "Synka Trakt-data",
          traktImporting: "Synkar...",
          traktImportDone: "Trakt-synk klar",
          traktDisconnect: "Koppla fr\xE5n",
          traktConnect: "Logga in med Trakt",
          traktWaiting: "V\xE4ntar p\xE5 Trakt...",
          traktOpenLinkAndCode: "\xD6ppna l\xE4nken och skriv in koden",
          traktStartLoginFailed: "Kunde inte starta Trakt-inloggning",
          traktLoginFailed: "Trakt-inloggning misslyckades",
          traktImportFailed: "Kunde inte synka med Trakt",
          traktMirrorIncomplete: "Trakt tog inte emot alla poster",
          traktMirrorIncompleteBody: "Din bevakningslista hos Trakt \xE4r full, s\xE5 {count} poster finns bara p\xE5 den h\xE4r enheten. Allt fungerar normalt i Lumio \u2014 kalendern h\xE4mtar sin data fr\xE5n TMDB och p\xE5verkas inte. Trakt har annonserat ett tak p\xE5 250 poster f\xF6r gratiskonton, men deras API till\xE4mpar fortfarande 100. Lumio f\xF6rs\xF6ker igen automatiskt, s\xE5 posterna synkar sig sj\xE4lva n\xE4r Trakt h\xF6jer taket. Vill du frig\xF6ra plats nu kan du ta bort poster i bevakningslistan p\xE5 trakt.tv eller uppgradera till VIP.",
          traktMirrorLocalOnly: "Bara p\xE5 den h\xE4r enheten",
          ovOpenSubsTitle: "Undertexter",
          ovOpenSubsOkDesc: "OpenSubtitles-nyckel sparad \u2014 undertexts\xF6kning fungerar.",
          ovOpenSubsMissingDesc: "Ingen nyckel \u2014 undertexts\xF6kningen \xE4r begr\xE4nsad.",
          ovGroqTitle: "AI-funktioner",
          ovGroqOkDesc: "Groq-nyckel sparad.",
          ovGroqMissingDesc: "Ingen Groq-nyckel \u2014 AI-funktioner \xE4r av.",
          ovSpotifyTitle: "Musik",
          ovSpotifyOkDesc: "Spotify-uppgifter sparade.",
          ovSpotifyMissingDesc: "Inga uppgifter \u2014 soundtracks otillg\xE4ngliga.",
          ovOpenSettings: "\xD6ppna inst\xE4llningar",
          traktAutoRemoveMovies: "Ta bort sedda filmer fr\xE5n bevakningslistan",
          traktAutoRemoveMoviesHint: "En film du sett l\xE4mnar listan automatiskt \u2014 och frig\xF6r en plats hos Trakt.",
          traktAutoUnfollowSeries: "Avf\xF6lj serier du sett klart",
          traktAutoUnfollowSeriesHint: "Tar bort en serie n\xE4r du sett hela sista s\xE4songen. Din sedda-historik beh\xE5lls, s\xE5 en \xE5terupplivad serie kan komma tillbaka.",
          traktHistoryRefused: "Trakt tog inte emot din sedd-historik",
          traktHistoryRefusedBody: "Bevakningslistan synkade som den ska \u2014 det h\xE4r g\xE4ller bara sedd-historiken. Trakt har ett tak p\xE5 100 000 uppspelningar. Din lokala historik \xE4r intakt och Lumio p\xE5verkas inte.",
          traktRejectedBy: "Avvisat av Trakt",
          traktCopyCode: "Kopiera kod",
          traktCodeCopied: "Kopierad",
          traktOpenActivationPage: "\xD6ppna trakt.tv/activate",
          traktStepOpen: "\xD6ppna l\xE4nken \u2014 den \xF6ppnas i webbl\xE4saren, Lumio ligger kvar.",
          traktStepEnterCode: "Logga in p\xE5 Trakt och skriv in koden ovan.",
          traktStepComeBack: "Kom tillbaka hit \u2014 vi uppt\xE4cker godk\xE4nnandet automatiskt.",
          traktWaitingForApproval: "V\xE4ntar p\xE5 ditt godk\xE4nnande...",
          traktImportPhaseWatched: "Importerar sedd historik fr\xE5n Trakt...",
          traktImportPhaseWatchlist: "Importerar listor fr\xE5n Trakt...",
          traktImportSummary: "Importerade {count} sedda titlar, {shows} serier och {movies} filmer fr\xE5n dina listor.",
          traktImportBackgroundHint: "Ett stort Trakt-konto tar en stund \u2014 forts\xE4tt g\xE4rna, det h\xE4r k\xF6r i bakgrunden.",
          traktNetworkRetrying: "Kunde inte n\xE5 Trakt \u2014 f\xF6rs\xF6ker igen...",
          traktNetworkUnreachable: "Kunde inte n\xE5 Trakt. Kontrollera n\xE4tverk eller DNS (auth.trakt.tv) och f\xF6rs\xF6k igen.",
          traktNetworkTimeout: "Trakt svarade inte i tid. Kontrollera anslutningen och f\xF6rs\xF6k igen.",
          traktCodeExpired: "Koden har g\xE5tt ut. Starta inloggningen igen.",
          traktCodeInvalid: "Koden \xE4r inte l\xE4ngre giltig. Starta inloggningen igen.",
          traktCodeAlreadyUsed: "Koden \xE4r redan anv\xE4nd. Starta inloggningen igen.",
          traktLoginDenied: "Inloggningen nekades p\xE5 Trakt.",
          traktConnected: "Trakt \xE4r anslutet",
          pluginDotActive: "Plugin aktiv",
          pluginDotInactive: "Plugin inaktiv",
          pluginDotNotConnected: "Inte ansluten",
          homeSourceCinemaMovies: "P\xE5 bio nu",
          homeSubCinemaMovies: "G\xE5r p\xE5 bio just nu",
          homeSourceTopRatedMovies: "H\xF6gst betyg filmer",
          homeSourceTopRatedSeries: "H\xF6gst betyg serier",
          homeSourceReleaseRecentMovies: "Nya sl\xE4pp",
          homeSubReleaseRecentMovies: "F\xE4rska filmsl\xE4pp fr\xE5n bio och streaming",
          homeSourceReleaseRecentSeries: "Nysl\xE4ppta serier",
          homeSubReleaseRecentSeries: "Serier med f\xE4rska premi\xE4rer och nya avsnitt",
          homeSourceReleaseUpcomingMovies: "Kommande filmer",
          homeSubReleaseUpcomingMovies: "Premi\xE4rer p\xE5 v\xE4g till bio och streaming",
          homeSourceReleaseUpcomingSeries: "Kommande serier",
          homeSubReleaseUpcomingSeries: "S\xE4songspremi\xE4rer och nya serier p\xE5 v\xE4g",
          homeSourceStreamingMovies: "Trendande filmer p\xE5 streaming",
          homeSubStreamingMovies: "De mest sedda filmerna p\xE5 streaming just nu",
          homeSourceStreamingSeries: "Trendande serier p\xE5 streaming",
          homeSubStreamingSeries: "Serierna alla streamar just nu",
          homeSubTraktRecommendations: "Utifr\xE5n din tittarhistorik",
          homeSubTraktRecommendationsMovies: "Rekommenderade filmer utifr\xE5n din tittarhistorik",
          homeSubTraktRecommendationsSeries: "Rekommenderade serier utifr\xE5n din tittarhistorik",
          homeSubMovieWatchlist: "Filmer du sparat att se",
          homeSubTrailers: "De senaste trailrarna och teasrarna",
          homeSourceAiringTodaySeries: "Visas idag",
          homeSourceTraktRecommendations: "Rekommenderat f\xF6r dig",
          homeSourceTraktRecommendationsMovies: "Rekommenderat f\xF6r dig \xB7 Filmer",
          homeSourceTraktRecommendationsSeries: "Rekommenderat f\xF6r dig \xB7 Serier",
          homeSourceTopPicksSeries: "Toppserier",
          homeTopPicksSeriesSubtitle: "Kurerade toppserier",
          homeSourceFilmCollections: "Filmserier",
          collectionsBackLabel: "Filmserier",
          collectionEmptyItems: "Inga titlar just nu",
          collectionRowsTitle: "Samlingsrader",
          collectionRowsDesc: "Rader av kort som f\xE4lls ut till sina egna titlar, som Filmserier \u2014 fast dina.",
          collectionRowsEyebrow: "DINA RADER",
          collectionRowsNone: "Inga samlingsrader \xE4n.",
          collectionRowNew: "Ny samlingsrad",
          collectionRowEmpty: "Tom rad",
          collectionRowName: "Radrubrik",
          collectionsInRow: "Samlingar i raden",
          collectionCount: "{n} samlingar",
          collectionNew: "Ny samling",
          collectionAdd: "L\xE4gg till samling",
          collectionName: "Text p\xE5 kortet",
          collectionCoverTitle: "Omslag",
          collectionCoverAuto: "Ur titlarna",
          collectionCoverSuggested: "F\xF6rslag",
          collectionCoverUrl: "Klistra in en bild- eller GIF-l\xE4nk",
          collectionCoverUseUrl: "Anv\xE4nd l\xE4nken",
          collectionCoverUpload: "Ladda upp fil",
          collectionCoverDevice: "Fr\xE5n den h\xE4r enheten",
          collectionCoverTooLarge: "Filen \xE4r {size} MB, taket \xE4r {max} MB.",
          collectionCover_auto: "autoomslag",
          collectionCover_pinned: "vald bild",
          collectionCover_url: "l\xE4nkad bild",
          collectionCover_asset: "egen fil",
          homeSourceCollectionRowGroup: "Mina samlingsrader",
          homeSourcePageRowGroup: "Fr\xE5n mina sidor",
          collectionRemove: "Ta bort samlingen",
          collectionRemoveBody: "Kortet f\xF6rsvinner ur raden. Titlarna p\xE5verkas inte.",
          collectionRowRemove: "Ta bort samlingsraden",
          collectionRowRemoveBody: "Raden och alla dess samlingar tas bort. Hemrader som anv\xE4nder den visar en platsh\xE5llare.",
          collectionCoverSuggestedEmpty: "Inga f\xF6rslag \xE4n \u2014 samlingen har inga titlar med bild.",
          collectionHeroSummary: "{count} titlar \xB7 {years} \xB7 {titles}",
          collectionHeroHint: "Samling \u2014 tryck OK f\xF6r att se titlarna.",
          collectionHeroBackdrop: "Bakgrund p\xE5 TV",
          collectionHeroBackdropHint: "R\xF6rliga omslag har ofta l\xE5g uppl\xF6sning \u2014 titlarna ger en skarp bakgrund.",
          collectionHeroBackdrop_titles: "Fr\xE5n titlarna",
          collectionHeroBackdrop_cover: "Omslaget",
          collectionDescription: "Beskrivning",
          collectionDescriptionHint: "Visas p\xE5 TV n\xE4r kortet har fokus. L\xE4mna tomt s\xE5 sammanfattas titlarna i st\xE4llet.",
          collectionCoverFrame: "Stillbild",
          collectionCoverFrameHint: "Rutan kortet st\xE5r p\xE5 n\xE4r det inte spelar.",
          collectionCoverFrameChoose: "V\xE4lj stillbild",
          collectionCoverFramesNone: "Inga rutor att v\xE4lja bland \u2014 omslaget \xE4r inte r\xF6rligt, eller gick inte att l\xE4sa.",
          rowRefMissing: "Raden finns inte l\xE4ngre",
          rowRefRemove: "Ta bort raden",
          collectionsHeroActive: "Visas p\xE5 startsidan",
          homeAiringTodaySubtitle: "Nya avsnitt idag p\xE5 dina streamingtj\xE4nster",
          airingTodayProvidersLabel: "Streamingtj\xE4nster",
          homeLayout: "Layout",
          homeLayoutSlider: "Karusell",
          homeLayoutGrid: "Rutn\xE4t",
          homeLayoutFull: "Visa allt",
          homeCount: "Kort",
          homeCountDesc: "Max antal kort som visas i den h\xE4r raden.",
          homeSliderGlobal: "Sliderkort",
          homeSliderGlobalDesc: "Hur m\xE5nga kort en slider max visar p\xE5 bred layout.",
          homeSliderOverride: "Egen karusellinst\xE4llning",
          homeSliderDisplay: "Visning",
          homeSliderUseGlobal: "Globalt v\xE4rde",
          homeFullModeNote: "Bara en sektion kan anv\xE4nda Visa allt. Senast sett kan fortfarande ligga kvar ovanf\xF6r som slider.",
          pinChannel: "Pinna kanal",
          unpinChannel: "Avpinna kanal",
          aspectRatio: "Bildformat",
          aspectRatioDesc: "V\xE4lj hur videon ska placeras i spelaren.",
          cropZoom: "Zoom / besk\xE4r",
          cropZoomOff: "Av",
          cropZoomCrop: "Besk\xE4r",
          cropZoomZoom: "Zoom",
          cropZoomZoomPlus: "Zoom +",
          rememberAspectRatio: "Kom ih\xE5g bildformat",
          rememberAspectRatioDesc: "Anv\xE4nder ditt valda bildformat som standard f\xF6r nya filmer och avsnitt.",
          autoSkipIntro: "Auto-skippa intro",
          autoSkipIntroDesc: "Om det \xE4r p\xE5slaget hoppas intro \xF6ver automatiskt. Om det \xE4r av visas en Skippa intro-knapp n\xE4r IntroDB har en tr\xE4ff.",
          resumePromptEyebrow: "FORTS\xC4TT ELLER B\xD6RJA OM",
          resumePromptBody: "Du slutade vid {time}. Forts\xE4tt d\xE4r, eller b\xF6rja fr\xE5n b\xF6rjan?",
          resumePromptResume: "Forts\xE4tt fr\xE5n {time}",
          resumePromptRestart: "B\xF6rja om",
          askResumeOrRestart: "Fr\xE5ga: \xE5teruppta eller b\xF6rja om",
          askResumeOrRestartDesc: "Visa en fr\xE5ga n\xE4r du trycker Spela p\xE5 n\xE5got delvis sett i st\xE4llet f\xF6r att \xE5terupptas direkt.",
          seriesNameFirst: "Seriens namn f\xF6rst i spelaren",
          seriesNameFirstDesc: "Leder spelarens rubrik med serienamnet i st\xE4llet f\xF6r avsnittskoden.",
          heroRotationLabel: "Byt titel varje",
          heroRotationDesc: "Hur ofta hero-bannern roterar av sig sj\xE4lv. Av betyder att den bara byter n\xE4r du swipar.",
          heroRotationNever: "Aldrig",
          nextEpPopupAuto: "Auto",
          creditsRecommendations: "Rekommendationer vid eftertexterna",
          creditsRecommendationsDesc: "N\xE4r eftertexterna b\xF6rjar krymper bilden till ett h\xF6rnf\xF6nster och n\xE4sta titel visas. G\xE4ller filmer och s\xE4songsavslut \u2014 aldrig mitt i en s\xE4song.",
          statsHudMenuLabel: "Statistik",
          playbackSpeedMenuLabel: "Hastighet",
          stripSdhTitle: "D\xF6lj h\xF6rselskadetext",
          stripSdhHint: "Tar bort [ljud], (suckar), \u266A s\xE5ngtext och talarnamn ur undertexterna.",
          appUpdateChannel: "Uppdateringskanal",
          appUpdateChannelStable: "Stabil",
          appUpdateChannelBeta: "Beta",
          appUpdateChannelHint: "Beta f\xE5r testbyggen innan de sl\xE4pps till alla.",
          exitOnCloseTitle: "Avsluta helt vid st\xE4ngning",
          exitOnCloseHint: "Android/TV: avsluta processen n\xE4r du l\xE4mnar appen i st\xE4llet f\xF6r att l\xE5ta den ligga i bakgrunden. Frig\xF6r minne p\xE5 sm\xE5 boxar.",
          exitAppAction: "Avsluta Lumio",
          exitAppTitle: "Avsluta Lumio?",
          exitAppConfirm: "Avsluta",
          quizMenuLabel: "Filmquiz",
          quizLobbyTitle: "Vem kan sin film?",
          quizLobbyIntro: "Skanna koden med telefonen f\xF6r att vara med. Fr\xE5gorna kommer ur filmer ni har sett.",
          quizOrGoTo: "Eller g\xE5 till",
          quizPlayers: "Spelare",
          quizWaitingMore: "V\xE4ntar p\xE5 fler \u2026",
          quizSourcesLabel: "Fr\xE5gor ur",
          quizSourceSeen: "Sedda filmer",
          quizSourceList: "Min lista",
          quizSourceColl: "Hela samlingar",
          quizStart: "Starta quiz",
          quizBuilding: "Bygger fr\xE5gor \xB7 %s filmer",
          quizTooFew: "F\xF6r f\xE5 filmer. Se eller spara minst fyra.",
          quizTooFewGenre: "F\xF6r f\xE5 sedda {genre}-titlar. Prova en annan genre.",
          quizRateLimited: "TMDB \xE4r upptaget, f\xF6rs\xF6k om en stund.",
          quizLanOff: "Telefoner n\xE5r den h\xE4r sk\xE4rmen bara n\xE4r LAN-str\xF6mning \xE4r p\xE5 i inst\xE4llningarna.",
          quizCode: "Kod",
          quizQuestionOf: "Fr\xE5ga %1 av %2",
          quizAnswered: "%1 av %2 har svarat",
          quizAnswerShown: "Svaret visas",
          quizShowAnswer: "Visa svar",
          quizStanding: "St\xE4llning",
          quizFinalStanding: "Slutst\xE4llning",
          quizStandingAfter: "St\xE4llning efter fr\xE5ga %s",
          quizNextQuestion: "N\xE4sta fr\xE5ga",
          quizPlayAgain: "Spela igen",
          quizExit: "Avsluta",
          quizCancelTitle: "Avbryta quizet?",
          quizCloseTitle: "St\xE4nga Filmquiz?",
          quizCancelBody: "Spelarna kopplas fr\xE5n och st\xE4llningen sparas inte.",
          quizKeepPlaying: "Forts\xE4tt spela",
          quizKindStill: "Stillbild",
          quizKindClip: "Klipp",
          quizKindTagline: "Tagline",
          quizKindAltTitle: "Utl\xE4ndsk titel",
          quizKindCast: "Sk\xE5despelare",
          quizKindSort: "Samling",
          quizPromptStill: "Vilken film?",
          quizPromptClip: "Vilken film \xE4r klippet ur?",
          quizPromptTagline: "Vilken film har den h\xE4r taglinen?",
          quizPromptAltTitle: "Vilken film \xE4r det h\xE4r?",
          quizPromptCast: "Vem var inte med?",
          quizPromptSort: "Sortera samlingen, \xE4ldst f\xF6rst",
          quizSortOnPhone: "Sortera p\xE5 telefonen, \xE4ldst f\xF6rst.",
          quizAllRight: "Helt r\xE4tt: %s",
          quizNobodyRight: "Ingen fick ordningen r\xE4tt",
          quizAudioOnly: "Bara ljud",
          quizShowVideo: "Visa bild",
          quizLangDE: "Tysk titel",
          quizLangFR: "Fransk titel",
          quizLangSE: "Svensk titel",
          quizKeyHints: "\u2191 \u2193 \u2190 \u2192 Flytta \xB7 OK V\xE4lj \xB7 \u27F5 Tillbaka",
          quizCreateFailed: "Kunde inte starta quizet. F\xF6rs\xF6k igen om en stund.",
          quizClose: "St\xE4ng",
          quizBankError: "Kunde inte bygga fr\xE5gor. Kontrollera anslutningen och f\xF6rs\xF6k igen.",
          creditsFinishedSeason: "S\xE4song %s \xE4r slut",
          creditsNextSeason: "S\xE4song %s",
          creditsFinishedTitle: "Du s\xE5g klart",
          creditsSeriesEnded: "Serien \xE4r slut",
          creditsBackToFilm: "Tillbaka till filmen",
          creditsRemaining: "Kvar",
          creditsSectionEyebrow: "Uppspelning",
          creditsSectionTitle: "N\xE4r en film eller serie tar slut",
          creditsSectionHint: "Vad spelaren g\xF6r n\xE4r eftertexterna b\xF6rjar.",
          creditsThreshold: "Eftertexterna b\xF6rjar",
          creditsThresholdDesc: "Hur l\xE5ngt f\xF6re slutet eftertextvyn \xF6ppnas n\xE4r filen saknar detekterad mark\xF6r. Senare \xE4r s\xE4krare \u2014 f\xF6r tidigt t\xE4cker slutet.",
          minutesBeforeEnd: "min f\xF6re slutet",
          creditsRecommendationsTv: "Rekommendationer efter serier",
          creditsRecommendationsTvDesc: "Bara n\xE4r s\xE4songen \xE4r slut och ingen n\xE4sta s\xE4song finns.",
          creditsThresholdTv: "Tr\xF6skel f\xF6r serier",
          creditsThresholdTvDesc: "Bara n\xE4r s\xE4songen \xE4r slut och ingen n\xE4sta s\xE4song finns.",
          advanceAtOutro: "Hoppa \xF6ver eftertexterna och g\xE5 direkt till n\xE4sta avsnitt",
          advanceAtOutroDesc: "N\xE4r ett outro hittas startar n\xE4sta avsnitt direkt i st\xE4llet f\xF6r att kortet visas. Avsnitt utan detekterat outro visar kortet som vanligt.",
          stayFullscreenOnClose: "Stanna i helsk\xE4rm n\xE4r spelaren st\xE4ngs",
          stayFullscreenOnCloseDesc: "F\xF6nstret beh\xE5ller helsk\xE4rm i st\xE4llet f\xF6r att falla tillbaka till f\xF6nsterl\xE4ge.",
          showTitleOnStart: "Visa titel n\xE4r uppspelningen startar",
          showTitleOnStartDesc: "Titeln tonar in n\xE5gra sekunder och f\xF6rsvinner sedan.",
          controlsHideAfter: "G\xF6m spelarkontrollerna efter",
          controlsHideAfterDesc: "Hur l\xE4nge kontrollerna ligger kvar efter att du r\xF6rt sk\xE4rmen. TV beh\xE5ller ett golv p\xE5 fem sekunder.",
          controlsHideNever: "Aldrig",
          hideSkipButtonAfter: "D\xF6lj Skippa-knappen efter",
          hideSkipButtonAfterDesc: "Knappen f\xF6rsvinner av sig sj\xE4lv s\xE5 en felaktig introtr\xE4ff inte ligger kvar hela avsnittet.",
          hideUnreleasedHome: "D\xF6lj ej sl\xE4ppta titlar p\xE5 Hem",
          hideUnreleasedHomeDesc: "Titlar med release\xE5r i framtiden visas inte i Hems rader.",
          hideWatchedMoviesHome: "D\xF6lj sedda filmer p\xE5 startsidan",
          hideWatchedMoviesHomeDesc: "Exkludera filmer som markerats som sedda fr\xE5n startsidans gridar och sliders.",
          stillWatching: "Tittar du fortfarande?",
          stillWatchingDesc: "G\xE4ller bara TV-serier. Pausar uppspelningen efter vald tid utan kontrollinteraktion, n\xE4r minst 3 avsnitt har spelats i samma session.",
          stillWatchingMaxMinutes: "Max tid f\xF6r fortfarande tittar",
          stillWatchingMaxMinutesDesc: "Standard matchar Netflix-tiden: 90 minuter. Prompten visas bara f\xF6r TV-serier efter minst 3 avsnitt.",
          stillWatchingContinue: "Forts\xE4tt titta",
          stillWatchingExit: "St\xE4ng spelaren",
          spoilersGroupTitle: "SPOILERS",
          spoilerBlurEnabled: "Sudda spoilers",
          spoilerBlurEnabledDesc: "D\xF6ljer spoilerk\xE4nsliga avsnittsdetaljer i avsnittslistor tills du har sett dem. Hovra \xF6ver ett avsnitt f\xF6r att kika.",
          spoilerBlurThumbnails: "Sudda miniatyrer",
          spoilerBlurTitles: "Sudda titlar",
          spoilerBlurDescriptions: "Sudda beskrivningar",
          spoilerBlurDetailImages: "Sudda avsnittsbilder p\xE5 detaljsidan",
          spoilerBlurDetailImagesDesc: "Suddar avsnittsstillbilder p\xE5 detaljsidan tills du hovrar f\xF6r att visa.",
          spoilerKeepNextVisible: "H\xE5ll n\xE4sta avsnitt synligt",
          spoilerKeepNextVisibleDesc: "L\xE4mnar avsnittet du \xE4r p\xE5 tydligt och suddar bara de som kommer efter.",
          spoilerBlurStreamBackdrop: "Sudda streambakgrund",
          spoilerBlurStreamBackdropDesc: "L\xE4gger en suddig glaseffekt bakom streamv\xE4ljarpanelen.",
          spoilerHoverToPeek: "Hovra f\xF6r att kika",
          spoilerPreviewTitle1: "The Last Stand",
          spoilerPreviewSynopsis1: "Med staden omringad formas en ov\xE4ntad allians n\xE4r en l\xE4nge begravd hemlighet till slut kommer fram.",
          spoilerPreviewTitle2: "No Way Out",
          spoilerPreviewSynopsis2: "Lojaliteter krossas n\xE4r de \xF6verlevande inser att fienden har funnits mitt ibland dem hela tiden.",
          autoplayMaxStreamSize: "Max storlek per stream",
          autoplayMaxStreamSizeDesc: "Valfri gr\xE4ns i GB f\xF6r autoplay-f\xF6rs\xF6k. L\xE4mna tomt f\xF6r ingen storleksgr\xE4ns.",
          autoplayMaxResolution: "H\xF6gsta uppl\xF6sning f\xF6r autoplay",
          autoplayMaxResolutionDesc: "Hoppa \xF6ver k\xE4llor \xF6ver den h\xE4r uppl\xF6sningen vid autoplay. K\xE4llor med ok\xE4nd uppl\xF6sning till\xE5ts \xE4nd\xE5.",
          autoplayMaxResolutionUnlimited: "Obegr\xE4nsat",
          preferEmbeddedSubtitles: "F\xF6redra inb\xE4ddade undertexter",
          preferEmbeddedSubtitlesDesc: "Vid automatiskt undertextval pr\xF6vas sp\xE5r inb\xE4ddade i videon f\xF6rst \u2014 de \xE4r alltid i synk.",
          peekSeasonWord: "s\xE4song",
          peekSeasonsWord: "s\xE4songer",
          peekOpenDetails: "Mer info",
          cardPeek: "Hover-f\xF6rhandsvisning p\xE5 kort",
          cardPeekDesc: "Vila pekaren p\xE5 en poster f\xF6r att f\xE4lla ut en f\xF6rhandsvisning med bakgrundsbild, genrer och beskrivning.",
          engineGroupTitle: "MOTOR",
          engineAuto: "Auto",
          engineStreams: "Motor f\xF6r str\xF6mmar",
          engineStreamsDesc: "Auto anv\xE4nder den inbyggda motorn (mpv) i appen. HTML5 tvingar webbl\xE4sarspelaren \u2014 bra n\xE4r mpv strular med en k\xE4lla.",
          engineLocal: "Motor f\xF6r lokala filer",
          engineLocalDesc: "Uppspelningsmotor f\xF6r filer fr\xE5n dina biblioteksmappar.",
          rtInterpolation: "R\xF6relseinterpolation",
          rtInterpolationDesc: "Samplar om videon till sk\xE4rmens uppdateringsfrekvens f\xF6r j\xE4mnare panoreringar. Drar mer GPU.",
          rtAnime4k: "Anime4K-uppskalning",
          rtAnime4kDesc: "Shaderbaserad uppskalning anpassad f\xF6r anime. H\xE4mtar shaderpaketet (~1 MB) vid f\xF6rsta anv\xE4ndningen.",
          rtBuffer: "Stor buffert f\xF6r instabil lina",
          rtBufferDesc: "L\xE4ser in ~5\xD7 mer av str\xF6mmen i f\xF6rv\xE4g p\xE5 bekostnad av RAM. Hj\xE4lper k\xE4llor som hackar i skov.",
          advMpvConfTitle: "R\xE5 mpv.conf",
          advMpvConfHint: "En property=value per rad, appliceras p\xE5 spelaren efter alla hanterade inst\xE4llningar. F\xF6r powerusers.",
          advMpvConfNote: "G\xE4ller fr\xE5n n\xE4sta uppspelningsstart. Ogiltiga rader ignoreras.",
          extraSubtitleLanguages: "Fler undertextspr\xE5k",
          extraSubtitleLanguagesDesc: "Ordnad lista med spr\xE5kkoder som pr\xF6vas efter standard och reserv, kommaseparerad.",
          forcedSubtitlesWhenAudioMatches: "Forcerade undertexter vid matchande ljud",
          forcedSubtitlesWhenAudioMatchesDesc: "N\xE4r undertexter st\xE4ngs av f\xF6r att ljudet redan \xE4r p\xE5 ditt spr\xE5k visas \xE4nd\xE5 forcerade sp\xE5r (utl\xE4ndsk dialog, skyltar).",
          upgradeSubtitleWhenBetter: "Uppgradera undertext n\xE4r b\xE4ttre laddas",
          upgradeSubtitleWhenBetterDesc: "Byt till en h\xF6gre prioriterad undertext om en dyker upp efter uppspelningsstart. Manuella val skrivs aldrig \xF6ver.",
          ipDescRpdb: "Posters med betyget inbr\xE4nt, p\xE5 varje kort. Gratis nyckel p\xE5 ratingposterdb.com.",
          ipDescMdblist: "Aggregerade betyg fr\xE5n Trakt, Letterboxd m.fl. p\xE5 detaljsidan. Gratis nyckel p\xE5 mdblist.com.",
          ipRpdbHint: "Med nyckel satt byts kortens posters till RPDB:s betygsposters (IMDb-nycklade).",
          ipMdblistHint: "Visas som extra badges bredvid \xE5rtalet p\xE5 detaljsidan.",
          ratingBadgePosition: "Betygsbadgens position",
          ratingBadgePositionDesc: "Vilket h\xF6rn av postern betygsbadgen sitter i.",
          badgePosTr: "Uppe till h\xF6ger",
          badgePosTl: "Uppe till v\xE4nster",
          badgePosBr: "Nere till h\xF6ger",
          badgePosBl: "Nere till v\xE4nster",
          hideCardTitles: "D\xF6lj titlar under posters",
          hideCardTitlesDesc: "Visa bara artwork \u2014 ingen titel eller metarad under korten.",
          posterScale: "Posterstorlek",
          posterScaleDesc: "Global kortstorlek p\xE5 hemraderna: kompakt f\xE5r plats med fler, stor visar f\xE4rre men st\xF6rre.",
          posterScaleCompact: "Kompakt",
          posterScaleStandard: "Standard",
          posterScaleLarge: "Stor",
          sbTitle: "Seek bar",
          sbDesc: "Stil, h\xF6jd och f\xE4rg p\xE5 tidslinjen i spelaren.",
          sbStyleLabel: "Stil",
          sbStyleFlat: "Platt",
          sbStyleGlass: "Glas",
          sbStylePinstripe: "Kritstreck",
          sbHeightLabel: "H\xF6jd",
          sbHeightSlim: "Tunn",
          sbHeightStandard: "Standard",
          sbHeightChunky: "Tjock",
          sbColorLabel: "F\xE4rg",
          sbColorAccent: "Accent",
          sbColorWhite: "Vit",
          sbColorRed: "R\xF6d",
          sbColorAmber: "B\xE4rnsten",
          sbDotLabel: "Dragpunkt",
          sbDotDesc: "Visa den runda handtagspunkten p\xE5 seekbaren.",
          detailsTrailerLabel: "Trailer p\xE5 detaljsidan",
          detailsTrailerHint: "Efter 2,5 s p\xE5 en detaljsida tonar bakgrundsbilden \xF6ver i den ljudl\xF6sa trailern.",
          ipSourceEnabled: "Anv\xE4nd den h\xE4r k\xE4llan",
          vtLiveNote: "Sl\xE5r igenom direkt och sparas i Inst\xE4llningar",
          introDebugReady: "IntroDB klar",
          introDebugLoading: "IntroDB laddar",
          introDebugFound: "Intro hittat",
          introDebugMissing: "Ingen introtr\xE4ff",
          advBackupSavedTitle: "Kopia av inst\xE4llningarna sparad",
          advBackupOpenOnOtherDevice: "\xD6ppna adressen p\xE5 den andra enheten, h\xE4mta filen och tryck Importera d\xE4r.",
          hapticsTitle: "K\xE4nn basen",
          hapticsHint: "Telefonen vibrerar i takt med filmens bassm\xE4llar.",
          hapticsHostToggleTitle: "Till\xE5t K\xE4nn basen fr\xE5n telefon",
          hapticsHostToggleDesc: "Telefoner p\xE5 samma Wi-Fi kan ansluta med en kod som visas h\xE4r.",
          hapticsHostOn: "P\xE5",
          hapticsHostOff: "Av",
          hapticsHostPortError: "Kunde inte starta: {e}",
          hapticsHostDevicesTitle: "Parkopplade telefoner",
          hapticsHostNoDevices: "Inga telefoner parkopplade \xE4n.",
          hapticsHostRemove: "Ta bort",
          hapticsHostPairTitle: "Parkoppla telefon",
          hapticsHostPairDesc: "\xD6ppnas i tv\xE5 minuter, tryck sedan Anslut p\xE5 telefonen. Medan det \xE4r st\xE4ngt kan ingen p\xE5 n\xE4tet parkoppla.",
          hapticsHostPairOpen: "Parkoppla telefon",
          hapticsHostPairCancel: "Avbryt",
          hapticsPairWaiting: "V\xE4ntar p\xE5 en telefon\u2026 Tryck Anslut under K\xE4nn basen p\xE5 telefonen.",
          hapticsReceiverNotOpen: "Tryck f\xF6rst \u201DParkoppla telefon\u201D under K\xE4nn basen p\xE5 {name}.",
          hapticsReceiverHostGone: "{name} har inte g\xE5tt att n\xE5 p\xE5 15 minuter \u2014 avslutat.",
          hapticsPairCodeTitle: "{name} vill k\xE4nna basen",
          hapticsPairCodeDesc: "Skriv den h\xE4r koden i telefonen",
          hapticsConnectedNotice: "Basen k\xE4nns i {name}",
          hapticsReceiverSearching: "Letar efter Lumio p\xE5 ditt Wi-Fi\u2026",
          hapticsReceiverNone: "Ingen Lumio hittades. Sl\xE5 p\xE5 \u201DTill\xE5t K\xE4nn basen fr\xE5n telefon\u201D p\xE5 Macen eller TV:n.",
          hapticsReceiverConnect: "Anslut",
          hapticsReceiverDisconnect: "Koppla ner",
          hapticsReceiverForget: "Gl\xF6m",
          hapticsReceiverCodePrompt: "Skriv koden som visas p\xE5 {name}",
          hapticsReceiverCodeWrong: "Fel kod \u2014 {n} f\xF6rs\xF6k kvar",
          hapticsReceiverCodeExpired: "Koden gick ut. F\xF6rs\xF6k igen.",
          hapticsReceiverBusy: "En annan telefon parkopplar just nu. F\xF6rs\xF6k igen om en stund.",
          hapticsReceiverStrength: "Styrka",
          hapticsReceiverSensitivity: "K\xE4nslighet",
          hapticsReceiverSensitivityHint: "Hur l\xE4tt en sm\xE4ll r\xE4knas. H\xF6gre tar med svagare bas \u2014 och mer av den.",
          hapticsSensitivity_low: "L\xE5g",
          hapticsSensitivity_normal: "Normal",
          hapticsSensitivity_high: "H\xF6g",
          hapticsSensitivity_max: "Max",
          hapticsReceiverSync: "F\xF6re / efter",
          hapticsReceiverSyncHint: "Dra medan filmen g\xE5r tills vibrationen kommer samtidigt med sm\xE4llen.",
          hapticsReceiverPlaying: "Spelar p\xE5 {name}",
          hapticsReceiverPaused: "Pausad p\xE5 {name}",
          hapticsReceiverPassthrough: "Ljudet g\xE5r direkt till receivern \u2014 basen kan inte k\xE4nnas.",
          hapticsReceiverNoAudio: "Det h\xE4r ljudsp\xE5ret g\xE5r inte att analysera.",
          hapticsReceiverRemoved: "{name} har tagit bort den h\xE4r telefonen.",
          hapticsReceiverHostOff: "{name} har st\xE4ngt av K\xE4nn basen.",
          hapticsNotifFeeling: "K\xE4nner basen fr\xE5n {name}",
          hapticsNotifReconnecting: "\xC5teransluter\u2026",
          hapticsNotifStop: "St\xE4ng",
          advTransferTitle: "Flytta inst\xE4llningar till en annan enhet",
          advTransferHint: "Kopiera allt du st\xE4llt in h\xE4r \u2014 k\xE4llor, nycklar, layout, listor \u2014 till en annan Lumio p\xE5 samma wifi. Inst\xE4llningar som h\xF6r till en viss enhet, som TV-l\xE4ge, ljudutg\xE5ng, gester och autospelningens gr\xE4nser, stannar d\xE4r de \xE4r.",
          advTransferReceiveTitle: "Ta emot fr\xE5n annan enhet",
          advTransferReceiveDesc: "B\xF6rja h\xE4r p\xE5 enheten som ska f\xE5 inst\xE4llningarna. Den visar en kod och blir synlig f\xF6r andra Lumio-enheter p\xE5 n\xE4tet i tio minuter.",
          advTransferReceiveStart: "Ta emot",
          advTransferReceiveStop: "Avbryt",
          advTransferReceiveWaiting: "V\xE4ntar\u2026 \xD6ppna Inst\xE4llningar \u2192 Profiler \u2192 Skicka till annan enhet p\xE5 den andra enheten, v\xE4lj den h\xE4r och skriv koden:",
          advTransferReceiveIpHint: "Syns inte den h\xE4r enheten i listan, skriv in adressen manuellt:",
          advTransferReceived: "Inst\xE4llningar mottagna \u2014 startar om\u2026",
          advTransferSendTitle: "Skicka till annan enhet",
          advTransferSendDesc: "B\xF6rja h\xE4r p\xE5 enheten som har inst\xE4llningarna. Tryck Ta emot p\xE5 den andra enheten f\xF6rst, v\xE4lj den sedan nedan och skriv koden den visar.",
          advTransferSendOpen: "Skicka\u2026",
          advTransferDevices: "Enheter p\xE5 n\xE4tet",
          advTransferNoDevices: "Ingen enhet hittad \xE4n. Kontrollera att den andra enheten tryckt Ta emot och \xE4r p\xE5 samma wifi \u2014 eller skriv in dess adress nedan.",
          advTransferRefresh: "S\xF6k igen",
          advTransferManualIp: "Adress (t.ex. 192.168.1.20)",
          advTransferCode: "Koden som visas p\xE5 den andra enheten",
          advTransferSend: "Skicka inst\xE4llningar",
          advTransferSending: "Skickar\u2026",
          advTransferSent: "Skickat. Den andra enheten startar om med dina inst\xE4llningar.",
          advTransferFailed: "Kunde inte skicka",
          advTransferWrongCode: "Fel kod. F\xF6rs\xF6k kvar: {n}.",
          syncWebdavTitle: "Molnsynk (WebDAV)",
          syncWebdavHint: "Synka dina inst\xE4llningar och tittade-status till en WebDAV-server du redan har \u2014 Nextcloud, ownCloud, Koofr, en NAS eller n\xE5got annat som pratar WebDAV. Inget hostas av Lumio; du tar med din egen lagring.",
          syncWebdavServerLabel: "Serveradress",
          syncWebdavServerPlaceholder: "https://din-server/remote.php/dav/files/du/lumio/",
          syncWebdavUsernameLabel: "Anv\xE4ndarnamn",
          syncWebdavPasswordLabel: "L\xF6senord",
          syncWebdavPasswordHint: "Anv\xE4nd ett app-l\xF6senord i st\xE4llet f\xF6r kontol\xF6senordet om servern \xE4r Nextcloud eller ownCloud.",
          syncWebdavProviderCustom: "Annan server",
          syncWebdavServerPlaceholderNextcloud: "https://din-server/remote.php/dav/files/du/",
          syncWebdavHintKoofr: "Logga in med din Koofr-e-post och ett app-l\xF6senord fr\xE5n Inst\xE4llningar \u2192 L\xF6senord \u2192 App-l\xF6senord. Kontol\xF6senordet fungerar inte.",
          syncWebdavHintNextcloud: "Adressen hittar du under Inst\xE4llningar \u2192 Personligt \u2192 S\xE4kerhet \u2192 WebDAV. Anv\xE4nd ditt anv\xE4ndarnamn och ett app-l\xF6senord, inte kontol\xF6senordet.",
          syncWebdavHintCustom: "Skriv in WebDAV-adressen du f\xE5tt av din leverant\xF6r, med hela s\xF6kv\xE4gen till mappen filen ska ligga i.",
          syncWebdavErrorAuth: "Servern avvisade anv\xE4ndarnamnet eller l\xF6senordet. Hos de flesta leverant\xF6rer kr\xE4vs ett app-l\xF6senord, inte kontol\xF6senordet.",
          syncWebdavErrorPath: "Servern hittade inte adressen. Kontrollera s\xF6kv\xE4gen \u2014 mappen m\xE5ste finnas sedan tidigare.",
          syncWebdavConnect: "Anslut",
          syncWebdavConnecting: "Ansluter\u2026",
          syncWebdavConnected: "Ansluten till {url}",
          syncWebdavDisconnect: "Koppla fr\xE5n",
          syncWebdavSyncNow: "Synka nu",
          syncWebdavSyncing: "Synkar\u2026",
          syncWebdavSynced: "Synkad nyss",
          syncWebdavError: "Kunde inte n\xE5 servern. Kontrollera adress, anv\xE4ndarnamn och l\xF6senord.",
          appStarting: "Startar Lumio",
          splashStatusLibrary: "Laddar ditt bibliotek",
          splashStatusAlmost: "N\xE4stan klart",
          remoteConnecting: "Ansluter till Lumio hemma\u2026",
          clientStartFailed: "Klienten kunde inte starta korrekt",
          clientStartFailedHint: "Det h\xE4r \xE4r det faktiska felmeddelandet fr\xE5n appen, inte en generisk reserv.",
          loadingPlayer: "Laddar spelare\u2026",
          loadingAudioPlayer: "Laddar ljudspelare\u2026",
          syncFailed: "Fel vid synk",
          genericError: "Fel",
          dlDone: "Klar",
          introFound: "Intro",
          plShortEpisodes: "Avsnitt",
          plShortPicture: "Bild",
          plShortWiki: "Wiki",
          plShortMusic: "Musik",
          plShortZoom: "Zoom",
          plShortCast: "Casta",
          plShortFullscreen: "Fullsk\xE4rm",
          plShortMore: "Mer",
          recapFound: "Recap",
          outroFound: "Outro",
          introDebugAutoOn: "Auto-skip p\xE5",
          introDebugAutoOff: "Auto-skip av",
          aspectAuto: "Auto",
          aspectContain: "Anpassa",
          aspectFill: "Fyll",
          aspect16_9: "16:9",
          aspect4_3: "4:3",
          audioMode: "Ljudl\xE4ge",
          audioModeDesc: "V\xE4lj mellan maximal kompatibilitet eller b\xE4sta m\xF6jliga flerkanal i proxyspelning.",
          audioModeCompatible: "Kompatibel",
          audioModeCompatibleDesc: "S\xE4krast uppspelning. Proxyljud kodas till stereo AAC.",
          audioModeBest: "B\xE4sta m\xF6jliga",
          audioModeBestDesc: "Beh\xE5ller flerkanal i proxy n\xE4r m\xF6jligt. Tauri/mpv forts\xE4tter anv\xE4nda originalsp\xE5ret direkt.",
          nightMode: "Nattl\xE4ge / DRC",
          nightModeDesc: "D\xE4mpar h\xF6ga toppar och g\xF6r dialog l\xE4ttare att h\xF6ra p\xE5 l\xE5g volym.",
          nightModeOff: "Av",
          nightModeMild: "Mild nattl\xE4ge",
          nightModeStrong: "Stark nattl\xE4ge",
          dvColorLabel: "Dolby Vision",
          dvColorAuto: "Vivid (auto)",
          dvColorOff: "Av",
          nightModeMenuLabel: "Nattl\xE4ge",
          nightModeMenuMild: "Mild",
          nightModeMenuStrong: "Stark",
          onboardingIntegrationsEyebrow: "Integrationer",
          onboardingIntegrationsTitle: "G\xF6r Lumio \xE4nnu b\xE4ttre",
          onboardingIntegrationsDesc: "Valfria kopplingar som f\xF6rb\xE4ttrar upplevelsen \u2014 inget h\xE4r \xE4r n\xF6dv\xE4ndigt. Allt st\xE4lls in senare under Inst\xE4llningar \u2192 Integrationer.",
          onboardingIntTrakt: "Synka sedda titlar och bevakningslistor. Logga in med en kod direkt h\xE4r.",
          onboardingTraktInlineHint: "Logga in utan att l\xE4mna installationen: l\xE4nken \xF6ppnas i webbl\xE4saren och installationen st\xE5r kvar d\xE4r den \xE4r.",
          onboardingIntSpotify: "Soundtrack-uppspelning p\xE5 detaljsidor. Skapa en gratis app f\xF6r client ID/secret.",
          onboardingIntGroq: "AI-s\xF6kning. Skapa en gratis API-nyckel.",
          onboardingKeySave: "Spara",
          onboardingKeyActive: "Aktiverad",
          onboardingKeyShow: "Visa",
          onboardingKeyHide: "D\xF6lj",
          onboardingKeyWhere: "Var hittar jag nyckeln?",
          onboardingKeyGroq: "Groq API-nyckel",
          onboardingKeyOpenSubtitles: "OpenSubtitles API-nyckel",
          onboardingKeySpotifyId: "Spotify Client ID",
          onboardingKeySpotifySecret: "Spotify Client Secret",
          onboardingKeyOptional: "Allt h\xE4r \xE4r frivilligt och kan l\xE4ggas in senare under Inst\xE4llningar \u2192 API-nycklar \u2014 samma f\xE4lt, samma v\xE4rden.",
          onboardingIntOpenSubtitles: "Fungerar utan konto. Med konto matchas filen p\xE5 hash och ger tr\xE4ffs\xE4krare undertexter.",
          defaultSubtitleLanguage: "Standard spr\xE5k f\xF6r textning",
          defaultSubtitleLanguageDesc: "V\xE4ljs automatiskt n\xE4r undertexter finns tillg\xE4ngliga.",
          fallbackSubtitleLanguage: "Sekund\xE4rt spr\xE5k f\xF6r textning",
          fallbackSubtitleLanguageDesc: "Anv\xE4nds bara om det prim\xE4ra undertextspr\xE5ket inte finns.",
          defaultAudioTrack: "Standard ljudsp\xE5r",
          defaultAudioTrackDesc: "F\xF6rs\xF6ker v\xE4lja spr\xE5k automatiskt n\xE4r flera ljudsp\xE5r finns.",
          disableSubtitlesWhenAudioMatches: "St\xE4ng av textning n\xE4r ljudspr\xE5ket matchar",
          disableSubtitlesWhenAudioMatchesDesc: "Om ditt valda standardspr\xE5k f\xF6r ljud hittas, h\xE5lls textningen av som standard.",
          subtitleSize: "Textstorlek",
          subtitleSizeDesc: "Anv\xE4nds som standard f\xF6r nya filmer och avsnitt.",
          subtitleVerticalPositionDesc: "Hur h\xF6gt \xF6ver kontrollbaren textningen placeras.",
          subtitleOpacity: "Opacitet",
          subtitleOpacityDesc: "G\xE4ller hela undertexten inklusive bakgrund.",
          subtitleTextColor: "Textf\xE4rg",
          subtitleTextColorDesc: "Standardf\xE4rg f\xF6r undertexten.",
          subtitleBackgroundColor: "Bakgrundsf\xE4rg",
          subtitleBackgroundColorDesc: "Transparent motsvarar dagens stil.",
          subtitleOutlineColor: "Konturf\xE4rg",
          subtitleOutlineColorDesc: "Anv\xE4nds f\xF6r textens outline/skugga.",
          resetSubtitleAppearance: "\xC5terst\xE4ll textutseende",
          resetSubtitleAppearanceDesc: "\xC5terst\xE4ller storlek, position, opacitet, f\xE4rger, bakgrund och kontur till standard.",
          subtitlePreviewText: "S\xE5 h\xE4r kommer din textning att se ut",
          subtitlePreviewCaption: "F\xF6rhandsvisning av standardutseende",
          skipIntro: "Skippa intro",
          originalFirst: "Original / f\xF6rsta",
          noFallback: "Ingen fallback",
          autoplayNextEpisode: "Auto-spela n\xE4sta avsnitt",
          autoplayNextEpisodeDesc: "Laddar n\xE4sta avsnitt i f\xF6rv\xE4g och spelar det automatiskt vid seriens slut.",
          showPopup: "Visa popup",
          showPopupDesc: "Hur m\xE5nga sekunder f\xF6re slutet n\xE4sta-avsnitt-kortet visas.",
          preloadBeforePopup: "F\xF6rladda innan popup",
          preloadBeforePopupDesc: "Hur m\xE5nga sekunder f\xF6re popup vi b\xF6rjar h\xE4mta n\xE4sta avsnitt.",
          seconds: "sekunder",
          rdApiKey: "API-nyckel f\xF6r stream provider",
          rdApiPlaceholder: "Din API-nyckel f\xF6r stream provider",
          rdApiNote: "Nyckeln lagras bara i din webbl\xE4sare (localStorage).",
          streamQuality: "Kvalitetsfilter f\xF6r str\xF6mmar",
          streamQualityDesc: "D\xF6lj l\xE5gkvalitets- eller o\xF6nskade str\xF6mk\xE4llor.",
          hideCam: "D\xF6lj CAM / CAMRIP",
          hideCamDesc: "Filmad p\xE5 bio \u2014 mycket l\xE5g kvalitet",
          hideTs: "D\xF6lj TeleSync / TeleCine (TS/TC)",
          hideTsDesc: "L\xE5gkvalitets f\xF6rhandsutgivningskopior",
          hideScr: "D\xF6lj Screener (SCR)",
          hideScrDesc: "DVD/streaming screenerkopiyor",
          hideBelow720p: "D\xF6lj under 720p",
          hideBelow720pDesc: "480p, 360p och l\xE4gre uppl\xF6sningar",
          clearCache: "Rensa cache",
          clearing: "Rensar\u2026",
          cleared: "Rensat \u2014 starta om servern",
          settingsNavAppearance: "Hem & Utseende",
          homePosterAppearanceTitle: "Posterutseende",
          homePosterAppearanceDesc: "Styr vilka visuella etiketter som visas p\xE5 posters p\xE5 startsidan.",
          homePosterGenreChipsToggleLabel: "Visa kategori-chips p\xE5 posters",
          settingsNavSources: "K\xE4llor & Kataloger",
          settingsNavIntegrations: "Integrationer",
          stremioAddonsTitle: "Stremio-addons",
          stremioAddonsDesc: "L\xE4gg till community-addons som exponerar kataloger (anime, public domain, din trakt-lista, \u2026). Varje katalog blir valbar som k\xE4lla f\xF6r en custom home-row.",
          stremioAddonsEmpty: "Inga Stremio-addons installerade \xE4n.",
          stremioAddonAdd: "L\xE4gg till",
          stremioAddonAdding: "H\xE4mtar\u2026",
          stremioAddonAdded: "Installerade {{name}}",
          stremioAddonNoCatalog: "Denna addon exponerar inga kataloger.",
          stremioAddonFetchFailed: "Kunde inte h\xE4mta manifestet.",
          stremioAddonOneCatalog: "katalog",
          stremioAddonManyCatalogs: "kataloger",
          stremioAddonsHelpFromUrl: "Klistra in addon-manifest-URL:en. Exempel: {{url}}/manifest.json",
          shortcutsTitle: "Kortkommandon",
          shortcutsGeneral: "Allm\xE4nt",
          shortcutsPlayer: "Spelare",
          shortcutsNavigateMenus: "Navigera mellan menyer",
          shortcutsGoToSearch: "G\xE5 till s\xF6kning",
          shortcutsToggleFullscreen: "Helsk\xE4rm av/p\xE5",
          shortcutsExitGoBack: "St\xE4ng / Tillbaka",
          shortcutsPlayPause: "Spela / Paus",
          shortcutsSeekForward: "Spola fram 10s",
          shortcutsSeekBackward: "Spola tillbaka 10s",
          shortcutsMute: "St\xE4ng av ljud",
          save: "Spara",
          checkKey: "Kontrollera nyckel",
          testingConnection: "Testar anslutning\u2026",
          enterApiKeyFirst: "Ange en API-nyckel f\xF6rst.",
          connectedAs: "Ansluten som",
          // Calendar
          seriesCalendar: "Seriekalender",
          today: "Idag",
          followSeries: "F\xF6lj en serie f\xF6r att se avsnitt h\xE4r",
          noEpisodesDay: "Inga avsnitt den h\xE4r dagen.",
          openStreams: "\xD6ppna str\xF6mmar",
          more: "till",
          // Media type chips
          both: "B\xE5da",
          movies: "Filmer",
          // Release calendar
          releaseCalendar: "Releasekalender",
          recent: "Nyligen",
          upcoming: "Kommande",
          allServices: "Alla tj\xE4nster",
          premiere: "Premi\xE4r",
          newBadge: "Ny",
          newPremiere: "Ny premi\xE4r",
          loadMore: "Ladda mer",
          allLanguages: "Alla spr\xE5k",
          hideFilters: "D\xF6lj filter",
          sort: "Sortera",
          // Watchlist
          addToWatchlist: "L\xE4gg till i watchlist",
          removeFromWatchlist: "Ta bort fr\xE5n watchlist",
          watchlistNewPremieres: "Watchlist \u2013 nya premi\xE4rer",
          watchlistAllLists: "Watchlist",
          watchlistNewEpisodes: "Nya avsnitt",
          watchlistContinueHere: "Forts\xE4tt d\xE4r",
          watchlistEmpty: "Inga stj\xE4rnm\xE4rkta titlar \xE4n.",
          watchlistEmptyHint: "Stj\xE4rnm\xE4rk titlar i releasekalendern f\xF6r att f\xF6lja premi\xE4rer.",
          tvListsEmpty: "Inget sparat \xE4n.",
          tvListsEmptyHint: "F\xF6lj en serie eller stj\xE4rnm\xE4rk en titel f\xF6r att hitta den h\xE4r.",
          tvSegmentEmpty: "Inga rader h\xE4r \xE4n.",
          tvSegmentEmptyHint: "L\xE4gg till rader f\xF6r den h\xE4r sidan i Inst\xE4llningar \u2014 under startsidans rader, eller TV-l\xE4ge p\xE5 en TV.",
          continueEmpty: "Inget p\xE5b\xF6rjat \xE4n.",
          continueEmptyHint: "Titlar du b\xF6rjar spela hamnar h\xE4r, s\xE5 du kan forts\xE4tta d\xE4r du slutade.",
          seriesWatchlistEmpty: "Inga f\xF6ljda serier \xE4n.",
          seriesWatchlistEmptyHint: "F\xF6lj en serie fr\xE5n dess detaljsida s\xE5 dyker nya avsnitt upp h\xE4r.",
          noMoviesInListYetHint: "L\xE4gg till filmer i Min lista fr\xE5n valfri detaljsida f\xF6r att spara dem h\xE4r.",
          watchlistConnectTraktHint: "Anslut Trakt i Inst\xE4llningar f\xF6r att synka listan mellan enheter.",
          watchlistConnectTraktCta: "Anslut Trakt",
          watchlistNoNewEpisodes: "Inga nya avsnitt just nu.",
          newEpisodeBadge: "Nytt avsnitt",
          seriesNewCount: "{{n}} nya",
          // Date presets
          days7: "7 dagar",
          days30: "30 dagar",
          days60: "60 dagar",
          days90: "90 dagar",
          thisYear: "I \xE5r",
          dateFrom: "Fr\xE5n",
          // Settings
          spotifyDesc: "Anv\xE4nds f\xF6r att visa soundtracks i detaljpanelen. Skapa en app p\xE5 developer.spotify.com och kopiera Client ID och Client Secret.",
          clearCacheDesc: "Rensa app-cache och byggartefakter om n\xE5got beter sig konstigt.",
          // Soundtrack
          openOnSpotify: "\xD6ppna p\xE5 Spotify",
          // First-run onboarding
          onboardingSkip: "Hoppa \xF6ver",
          onboardingBack: "Tillbaka",
          onboardingNext: "N\xE4sta",
          onboardingStart: "Kom ig\xE5ng",
          onboardingInstalling: "Installerar\u2026",
          onboardingStep: "Steg",
          onboardingGoToStep: "G\xE5 till steg",
          onboardingLanguageLabel: "Spr\xE5k",
          onboardingWelcomeEyebrow: "V\xC4LKOMMEN",
          onboardingWelcomeTitle: "V\xE4lkommen till Lumio",
          onboardingWelcomeDesc: "Din mediaspelare och hub f\xF6r film och serier \u2014 spela upp ditt eget bibliotek och samla allt du f\xF6ljer p\xE5 ett st\xE4lle.",
          onboardingLanguageEyebrow: "Spr\xE5k",
          onboardingLanguageTitle: "V\xE4lj ditt spr\xE5k.",
          onboardingLanguageDesc: "V\xE4lj appens spr\xE5k och ditt f\xF6redragna undertextspr\xE5k. B\xE5da kan \xE4ndras n\xE4r som helst i Inst\xE4llningar.",
          onboardingAppLanguageLabel: "Appspr\xE5k",
          onboardingLanguageHint: "Undertexter p\xE5 ditt f\xF6redragna spr\xE5k v\xE4ljs automatiskt n\xE4r de finns, och reservspr\xE5ket anv\xE4nds n\xE4r det prim\xE4ra saknas.",
          onboardingPluginsEyebrow: "TILL\xC4GG",
          onboardingPluginsTitle: "V\xE4lj dina till\xE4gg",
          onboardingPluginsDesc: "Bocka f\xF6r de till\xE4gg du vill ha aktiva. Inbyggda till\xE4gg aktiveras direkt och h\xE4mtar senaste runtime n\xE4r n\xE4tet finns; till\xE4gg fr\xE5n communityn h\xE4mtas fr\xE5n utvecklaren. Allt g\xE5r att l\xE4gga till eller ta bort senare under Inst\xE4llningar \u2192 Plugins.",
          onboardingBundledBadge: "Inbyggt",
          onboardingInstalledBadge: "Redan aktivt",
          onboardingOfficialGroup: "Officiella",
          onboardingExternalGroup: "Externa",
          onboardingThirdParty: "Tredjepart",
          onboardingExternalDisclaimer: "Externa till\xE4gg utvecklas och underh\xE5lls av respektive utvecklare \u2014 inte av Lumio. De h\xE4mtas fr\xE5n utvecklarens egna kodf\xF6rr\xE5d och anv\xE4nds p\xE5 eget ansvar.",
          onboardingSyncEyebrow: "SYNK",
          onboardingSyncTitle: "Har du redan Lumio?",
          onboardingSyncDesc: "H\xE4mta k\xE4llor, nycklar, layout och listor fr\xE5n en annan enhet eller fr\xE5n din egen WebDAV-lagring. Inget att h\xE4mta? Tryck N\xE4sta.",
          onboardingSyncReceiveDesc: "Samma wifi. Den h\xE4r enheten visar en kod som du skriver in p\xE5 den andra.",
          onboardingSyncWebdavDesc: "Nextcloud, ownCloud, Koofr, en NAS \u2014 din egen lagring. H\xE5ller enheterna i synk fram\xF6ver.",
          onboardingSyncVisible: "Synlig p\xE5 n\xE4tet \xB7 {time} kvar",
          onboardingSyncReceivedFrom: "Inst\xE4llningar mottagna fr\xE5n {device}",
          onboardingSyncReceivedGeneric: "Inst\xE4llningar mottagna",
          onboardingSyncReceivedDesc: "K\xE4llor, nycklar, layout och listor \xE4r p\xE5 plats. Enhetsberoende inst\xE4llningar som TV-l\xE4ge och autospelningens gr\xE4nser stannar som de \xE4r. Till\xE4ggen \xE4r f\xF6rbockade i n\xE4sta steg.",
          onboardingSyncFoot: "Allt h\xE4r finns ocks\xE5 under Inst\xE4llningar \u2192 Profiler.",
          onboardingSyncBadgeReceived: "Mottaget",
          onboardingSyncBadgeConnected: "Ansluten",
          onboardingPluginsFromSync: "F\xF6rbockade fr\xE5n din andra enhet",
          onboardingPerfSuggested: "F\xF6rslag",
          onboardingRailWelcome: "V\xE4lkommen",
          onboardingRailLanguage: "Spr\xE5k",
          onboardingRailSync: "Synk",
          onboardingRailPlugins: "Till\xE4gg",
          onboardingRailIntegrations: "Integrationer",
          onboardingRailPerformance: "Prestanda",
          onboardingRailControl: "Klart",
          onboardingSumLang: "Spr\xE5k",
          onboardingSumSync: "Synk",
          onboardingSumPlugins: "Till\xE4gg",
          onboardingSumTrakt: "Trakt",
          onboardingSumNone: "Inte valt",
          onboardingSumSkipped: "Hoppades \xF6ver",
          onboardingSumReceivedFrom: "Mottaget fr\xE5n {device}",
          onboardingSumReceived: "Mottaget fr\xE5n annan enhet",
          onboardingSumWillEnable: "{names} aktiveras",
          onboardingHintMove: "Flytta",
          onboardingHintSelect: "V\xE4lj",
          onboardingHintBack: "F\xF6reg\xE5ende steg",
          onboardingHintBackKey: "BAK\xC5T",
          onboardingControlEyebrow: "KLART",
          onboardingControlTitle: "Du har full kontroll",
          onboardingControlDesc: "Anpassa startsidan, filter, spr\xE5k och utseende precis som du vill ha det innan du b\xF6rjar.",
          streamsLayoutTitle: "Var str\xF6mmarna visas",
          streamsLayoutDesc: "I sidopanelen, eller som en sektion p\xE5 sidan ovanf\xF6r Rekommendationer. Serier f\xE5r str\xF6mmarna under varje avsnitt.",
          streamsLayoutSidebar: "Sidopanel",
          streamsLayoutInline: "P\xE5 sidan",
          tvStreamsLayoutCards: "Rullande",
          tvTypeWithRemote: "skriv",
          tvTypeKeyHint: "Skriv in nyckeln med fj\xE4rrkontrollen. Den sparas n\xE4r du trycker Klar och visas aldrig p\xE5 sk\xE4rmen.",
          streamSizeSmall: "Liten",
          streamSizeMedium: "Mellan",
          streamSizeLarge: "Stor",
          tvStreamsLayoutHint: "Rullande: str\xF6mmarna ligger p\xE5 sidan som en rad kort. Sidopanel: en Str\xF6mmar-knapp bredvid Spela \xF6ppnar listan.",
          castCountTitle: "Antal sk\xE5despelare",
          castCountDesc: "Hur m\xE5nga ur ensemblen som visas p\xE5 detaljsidan. Telefonen visar dem i sidor om \xE5tta; skrivbordet rullar.",
          gestTabLabel: "Gester",
          gestTitle: "Svepgester",
          gestHint: "Vad ett svep g\xF6r i spelaren. Endast telefon och surfplatta.",
          gestLeftTitle: "Svep upp/ner, v\xE4nster halva",
          gestLeftDesc: "Dra lodr\xE4tt p\xE5 bildens v\xE4nstra sida.",
          gestRightTitle: "Svep upp/ner, h\xF6ger halva",
          gestRightDesc: "Dra lodr\xE4tt p\xE5 bildens h\xF6gra sida.",
          gestHorizontalTitle: "Svep i sidled",
          gestHorizontalDesc: "Dra \xE5t sidan var som helst p\xE5 bilden f\xF6r att spola.",
          gestBrightnessTargetTitle: "Ljusstyrkan styr",
          gestBrightnessTargetDesc: "Sk\xE4rmens ljus d\xE4mpar hela displayen och sparar batteri. Bildens ljus lyfter svartniv\xE5n och kan gr\xE4va fram detaljer i m\xF6rka scener.",
          gestActionBrightness: "Ljusstyrka",
          gestActionVolume: "Volym",
          gestActionSeek: "Spola",
          gestActionNone: "Ingenting",
          gestTargetScreen: "Sk\xE4rmens ljus",
          gestTargetVideo: "Bildens ljus",
          gestDoubleTapTitle: "Dubbeltryck vid kanten",
          gestDoubleTapDesc: "Hoppa bak\xE5t eller fram\xE5t genom att trycka tv\xE5 g\xE5nger n\xE4ra v\xE4nster eller h\xF6ger kant.",
          gestDoubleTapOff: "Av",
          gestHoldSpeedTitle: "H\xE5ll f\xF6r snabbspolning",
          gestHoldSpeedDesc: "H\xE5ll fingret nedtryckt f\xF6r dubbel hastighet; sl\xE4pp f\xF6r att \xE5terg\xE5.",
          externalDisplayVideoOnlyTitle: "Extern sk\xE4rm: videon bara d\xE4r",
          externalDisplayVideoOnlyDesc: "Med glas\xF6gon eller en HDMI-sk\xE4rm ansluten spelas videon bara p\xE5 den externa sk\xE4rmen. Telefonen sl\xE4cks och visar kontrollerna n\xE4r du trycker \u2014 mindre bl\xE4ndning, l\xE4ngre batteri.",
          externalDisplayPlayingThere: "Spelas p\xE5 den externa sk\xE4rmen",
          onboardingPerfEyebrow: "Prestanda",
          onboardingPerfTitle: "Anpassat efter din enhet",
          onboardingPerfDesc: "Vi m\xE4tte den h\xE4r enheten och satte ett tak f\xF6r vad autospelningen f\xE5r v\xE4lja p\xE5 egen hand. Du kan h\xF6ja det nu, eller \xE4ndra det n\xE4r som helst under Uppspelning.",
          onboardingPerfWhy: "Stora remuxar \xE4r 40\u201375 GB med ljud- och bildformat som en telefon eller TV-box ofta inte kan avkoda. Autospelningen l\xE4gger d\xE5 sina f\xF6rs\xF6k p\xE5 filer som aldrig skulle g\xE5 att spela \u2014 en minuts v\xE4ntan, och svart sk\xE4rm p\xE5 slutet.",
          onboardingPerfCapLabel: "St\xF6rsta str\xF6m autospelningen f\xE5r v\xE4lja",
          onboardingPerfUnlimited: "Ingen gr\xE4ns",
          onboardingPerfLater: "Det h\xE4r s\xE4tter bara utg\xE5ngsl\xE4get. Ingenting sp\xE4rras \u2014 du kan alltid v\xE4lja vilken str\xF6m du vill sj\xE4lv ur listan.",
          onboardingPerfNetMeasuring: "M\xE4ter anslutningens hastighet\u2026",
          onboardingPerfNetResult: "Anslutning \u2248 {mbps} Mbit/s \u2014 f\xF6rslaget f\xF6ljer den.",
          onboardingPerfNetFailed: "Anslutningen gick inte att m\xE4ta; f\xF6rslaget bygger bara p\xE5 enheten.",
          onboardingWillInstall: "{count} till\xE4gg aktiveras \u2014 senaste runtime h\xE4mtas \u2014 n\xE4r du \xE4r klar.",
          onboardingInstallFailed: "{names} kunde inte installeras just nu \u2014 du hittar dem under Inst\xE4llningar \u2192 Plugins.",
          onboardingOpenAppNow: "\xD6ppna Lumio",
          startupOfflineNote: "Ingen kontakt med TMDb \u2014 raderna \xE4r tomma tills den svarar. Inst\xE4llningar, Plex, Jellyfin och Live TV fungerar som vanligt.",
          onboardingInstallProgress: "Aktiverar till\xE4gg och h\xE4mtar senaste runtime {done} / {total}",
          onboardingInstallQueued: "I k\xF6",
          onboardingInstallWorking: "Aktiverar \xB7 h\xE4mtar senaste\u2026",
          onboardingInstallDone: "Klar",
          onboardingInstallError: "Misslyckades",
          onboardingInstallBackground: "Det h\xE4r forts\xE4tter i bakgrunden \u2014 du kan \xF6ppna Lumio direkt och titta under Inst\xE4llningar \u2192 Plugins senare.",
          onboardingServicesEyebrow: "TJ\xC4NSTER",
          onboardingServicesTitle: "Anslut tj\xE4nster",
          onboardingServicesDesc: "Lumio anv\xE4nder TMDb f\xF6r metadata om filmer och serier. Skapa ett gratis konto p\xE5 themoviedb.org och klistra in din API-token (Bearer) h\xE4r \u2014 alla omslag och detaljer h\xE4mtas med den. Fler integrationer kan konfigureras senare under Inst\xE4llningar \u2192 Integrationer.",
          onboardingTmdbLabel: "TMDb API-token (Bearer)",
          onboardingTmdbPlaceholder: "Klistra in din token h\xE4r",
          onboardingTmdbSaved: "Sparad \u2014 token lagras p\xE5 den h\xE4r enheten.",
          onboardingTmdbSaveFailed: "Kunde inte spara token \u2014 f\xF6rs\xF6k igen under Inst\xE4llningar \u2192 Integrationer.",
          onboardingTmdbSkipHint: "Utan token kan inget film- och serieinneh\xE5ll h\xE4mtas. Du kan l\xE4gga till den senare under Inst\xE4llningar \u2192 Integrationer.",
          showOnboardingAgain: "Visa introduktionen igen",
          // Settings → Plugins tab
          ptCannotConnect: "Kunde inte ansluta \u2014 kontrollera Integrationer",
          ptWorksNormally: "Fungerar normalt",
          ptDisabled: "Inaktiverad",
          ptMoveUp: "Flytta upp",
          ptMoveDown: "Flytta ner",
          ptMore: "Mer",
          ptCheckUpdate: "S\xF6k uppdatering",
          ptOpenRepo: "\xD6ppna repo",
          ptUninstall: "Avinstallera",
          ptOfficialMarketplace: "Officiell marketplace",
          ptLiveManifest: "Live-manifest",
          ptAll: "Alla",
          ptOf: "av",
          ptInstalledWord: "installerade",
          ptSearching: "S\xF6ker\u2026",
          ptCheckUpdates: "S\xF6k uppdateringar",
          ptAddSourceTitle: "L\xE4gg till plugin-k\xE4lla",
          ptAddSourceSubtitle: "GitHub-repo eller lokal ZIP-fil",
          ptUploading: "Laddar upp\u2026",
          ptZipFile: "ZIP-fil",
          ptAdding: "L\xE4gger till\u2026",
          ptAdd: "L\xE4gg till",
          ptSyncing: "Synkar\u2026",
          ptSync: "Synka",
          ptRemove: "Ta bort",
          ptReleaseNeedsZip: "Denna release kr\xE4ver ett manuellt ZIP-val.",
          ptManifestFetchError: "Ok\xE4nt fel vid h\xE4mtning av manifest.",
          ptZipReadError: "Kunde inte l\xE4sa ZIP-filen.",
          ptStatInstalled: "Installerade",
          ptStatActive: "Aktiva",
          ptStatIssues: "Med problem",
          ptStatSources: "Plugin-k\xE4llor",
          ptManageTitle: "Hantera & ordna",
          ptManageHint: "Aktivera, inaktivera eller dra f\xF6r att \xE4ndra prioriteringsordning.",
          ptNonePlugins: "Inga plugins installerade \xE4n.",
          ptAvailableTitle: "Tillg\xE4ngliga",
          ptAvailableHint: "K\xE4nda plugins som inte \xE4r installerade. Externa plugins h\xE4mtas fr\xE5n respektive utvecklares kodf\xF6rr\xE5d och underh\xE5lls inte av Lumio.",
          ptInstalling: "Installerar\u2026",
          ptInstall: "Installera",
          ptFindNewTitle: "Hitta nya plugins",
          ptFindNewHint: "Officiell marketplace och egna k\xE4llor.",
          ptSourcesTitle: "GitHub-repos som tillhandah\xE5ller plugins",
          ptSourcesHint: "H\xE4r listas de externa k\xE4llor du sj\xE4lv har lagt till.",
          ptNoSources: "Inga egna k\xE4llor tillagda \xE4n. L\xE4gg till ett GitHub-repo ovan f\xF6r att b\xF6rja.",
          ptInstalledBadge: "Installerad",
          ptInstallFailed: "Kunde inte installera pluginet.",
          ptSourceReaddZip: "L\xE4gg till ZIP-filen igen f\xF6r att installera",
          ptUpdating: "H\xE4mtar senaste versionen\u2026",
          ptUpdatedTo: "Uppdaterad till {version} \u2014 starta om f\xF6r att aktivera.",
          ptUpToDate: "Redan senaste versionen.",
          ptUpdateFailed: "Uppdateringen misslyckades: {reason}",
          aiSearchTitle: "AI-s\xF6kning",
          sssEpisodeInfo: "Visa avsnittsinfo",
          // Zapp player
          zpStartFailed: "Zapp kunde inte starta. F\xF6rs\xF6k igen.",
          zpStartTimeout: "Start timeout. K\xE4llan svarar inte, prova igen.",
          zpNoMovieFound: "Ingen film hittades.",
          zpFetchTimeout: "Timeout \u2013 kunde inte h\xE4mta filmer fr\xE5n TMDB. F\xF6rs\xF6k igen.",
          zpFoundOpening: "Hittade filmen, \xF6ppnar info...",
          zpNoMovieRetry: "Hittade ingen film \u2013 f\xF6rs\xF6k igen!",
          zpConnectProvider: "Koppla upp en stream provider i Inst\xE4llningar f\xF6rst.",
          zpNoPlayableStream: "Hittade ingen spelbar stream f\xF6r filmen. Prova igen.",
          zpQueueAddError: "Kunde inte l\xE4gga till i stream provider-k\xF6n.",
          zpNoSourceYetOpening: "Ingen spelbar k\xE4lla \xE4nnu, \xF6ppnar info...",
          zpStreamTimeout: "Timeout \u2013 kunde inte h\xE4mta stream.",
          // Media details panel
          mdpCloseMobileMenu: "St\xE4ng mobilmeny",
          mdpCloseMenu: "St\xE4ng meny",
          mdpShowMenu: "Visa meny",
          mdpHideEpisodes: "D\xF6lj avsnitt",
          mdpShowEpisodes: "Visa avsnitt",
          mdpHideStreams: "D\xF6lj streams",
          mdpShowStreams: "Visa streams",
          mdpCloseSidebar: "St\xE4ng sidopanel",
          // Sources panel (Källor)
          kpTabCatalogs: "Kataloger",
          kpTabLibrary: "Bibliotek",
          kpCatalogsSuffix: "kataloger",
          kpProvidedCatalogs: "Tillhandah\xE5llna kataloger",
          kpMetricActiveAddons: "Aktiva addons",
          sourcesEmptyTitle: "Inga k\xE4llor \xE4n",
          coreStreamsHidden: "{count} str\xF6mmar dolda av kvalitetsfilter",
          coreStreamsSelectEpisode: "V\xE4lj ett avsnitt f\xF6r att se dess str\xF6mmar.",
          coreStreamsSource: "K\xE4lla",
          coreStreamsCached: "Cachad",
          coreStreamsLoading: "Fr\xE5gar k\xE4llorna\u2026",
          streamNotServingMedia: "K\xE4llan levererade ingen spelbar media. Prova en annan str\xF6m.",
          libraryServerUnreachable: "Fick ingen uppspelningsadress fr\xE5n {source}. Kontrollera att servern \xE4r ig\xE5ng.",
          libraryRowSuffix: "i ditt bibliotek",
          libraryModeTab: "Bibliotek",
          libraryModeChip: "Biblioteksl\xE4ge",
          libraryTabRowsCaption: "Rader per bibliotek:",
          libraryModeTitle: "Biblioteksl\xE4ge",
          libraryModeHint: "N\xE4r ett bibliotek \xE4r startsida filtreras varje rad mot det du \xE4ger. Rader utan indexerat inneh\xE5ll g\xF6ms; siffran visar hur m\xE5nga titlar raden kan visa just nu.",
          libraryUseAsHome: "Anv\xE4nd som startsida",
          libraryUseAsHomeHint: "Bocka i ett eller flera bibliotek. Startsida, detaljsida, s\xF6k och Zapp matas d\xE5 bara ur dem, tillsammans. Str\xF6mk\xE4llorna h\xE5lls dolda s\xE5 l\xE4nge det \xE4r p\xE5.",
          librarySourcesTitle: "Indexerade bibliotek",
          localLibraryTitle: "Lokala mappar",
          localLibraryHint: "Varje mapp blir ett eget bibliotek med egen menying\xE5ng, som Plex eller Jellyfin. Filerna matchas mot TMDB via namnet: \u201DTitel (\xC5r).mkv\u201D f\xF6r filmer, \u201DSerie/Season 01/Serie S01E04.mkv\u201D f\xF6r avsnitt.",
          localLibraryAdd: "L\xE4gg till mapp",
          localLibraryRemove: "Ta bort",
          localLibraryUpdate: "Uppdatera",
          localLibraryRebuild: "Bygg om",
          localLibraryBuild: "Bygg index",
          localLibraryEmpty: "Inga mappar \xE4nnu.",
          localLibraryScanning: "Indexerar\u2026 {done}",
          localLibraryNotIndexed: "Inte indexerad \xE4nnu",
          webdavLibraryTitle: "N\xE4tverksmappar (WebDAV)",
          webdavLibraryHint: "En mapp p\xE5 en WebDAV-server blir ett eget bibliotek med egen menying\xE5ng, precis som en lokal mapp. Filerna matchas mot TMDB via namnet och str\xF6mmas genom appen \u2014 l\xF6senordet stannar p\xE5 den h\xE4r enheten.",
          webdavLibraryAdd: "L\xE4gg till mapp",
          webdavLibraryUrl: "Serveradress",
          webdavLibraryUsername: "Anv\xE4ndarnamn",
          webdavLibraryPassword: "L\xF6senord",
          webdavLibraryPasswordKeep: "Of\xF6r\xE4ndrat",
          webdavLibraryName: "Namn i menyn",
          webdavLibraryNamePlaceholder: "H\xE4mtas fr\xE5n adressen om det l\xE4mnas tomt",
          webdavLibraryTest: "Testa",
          webdavLibraryTestOk: "Anslutningen fungerar",
          webdavLibrarySave: "Spara och indexera",
          webdavLibraryCancel: "Avbryt",
          webdavLibraryEdit: "\xC4ndra",
          webdavLibraryEmpty: "Inga n\xE4tverksmappar \xE4nnu.",
          webdavLibraryListing: "Listar mappar\u2026 {done}/{total}",
          webdavLibraryErrAuth: "Servern godk\xE4nde inte anv\xE4ndarnamnet eller l\xF6senordet.",
          webdavLibraryErrNotFound: "Mappen finns inte p\xE5 servern.",
          webdavLibraryErrNetwork: "Kunde inte n\xE5 servern.",
          webdavLibraryErrNotWebdav: "Adressen svarade, men inte som en WebDAV-mapp.",
          webdavLibraryErrUrl: "Skriv en hel adress som b\xF6rjar med http:// eller https://, utan anv\xE4ndarnamn eller l\xF6senord i den.",
          webdavLibraryErrTooLarge: "Mappen \xE4r f\xF6r stor f\xF6r att listas i ett svep. Peka adressen mot en undermapp.",
          webdavLibraryErrUpstream: "Servern svarade med ett fel. F\xF6rs\xF6k igen om en stund.",
          webdavLibraryErrLocalOnly: "N\xE4tverksmappar kan bara \xE4ndras p\xE5 enheten som k\xF6r Lumio.",
          libraryRowUnmatched: "Ej identifierade",
          librarySourceNotIndexed: "Inte indexerat \xE4nnu \u2014 bygg indexet i pluginets inst\xE4llningar.",
          libraryModeOff: "Inget bibliotek \xE4r startsida. Sl\xE5 p\xE5 det under bibliotekspluginets inst\xE4llningar.",
          libraryRowIndexed: "{count} indexerade",
          libraryMetricTitles: "Titlar",
          librarySearchPlaceholder: "S\xF6k i ditt bibliotek",
          librarySearchMinChars: "Skriv minst tv\xE5 tecken f\xF6r att s\xF6ka i biblioteket.",
          libraryBackToHome: "Tillbaka till Hem",
          continueLayoutRows: "Rader",
          continueLayoutGrid: "Rutn\xE4t",
          cwSectionHint: "Vyn har tv\xE5 l\xE4gen som du v\xE4xlar med knappen bredvid filtret. Varje l\xE4ge har sitt eget kortformat och antal.",
          cwModeRows: "Rullande rader",
          cwModeRowsDesc: "Alla, Serier och Filmer som rader du bl\xE4ddrar i sidled.",
          cwModeGrid: "Rutn\xE4t",
          cwModeGridDesc: "Allt i ett rutn\xE4t du rullar ned\xE5t i.",
          cwFormatLabel: "Kortformat",
          cwFormatPortrait: "St\xE5ende",
          cwFormatLandscape: "Liggande",
          libraryVersionsTitle: "Versioner i ditt bibliotek",
          libraryNotInLibrary: "Finns inte i ditt bibliotek",
          libraryEpisodeNotInLibrary: "Avsnittet finns inte i ditt bibliotek",
          libraryRowNotLoaded: "inte laddad \xE4nnu",
          libraryRowRecent: "Nyligen tillagt i biblioteket",
          libraryRowMovies: "Filmer i biblioteket",
          tvLibraryTabRowsLabel: "Biblioteksflik",
          tvLibraryTabRowsDesc: "Redigera raderna f\xF6r ett bibliotek i menyn i st\xE4llet f\xF6r en sida ovan.",
          tvLibraryTabRowsNone: "Ingen",
          libraryRowSeries: "Serier i biblioteket",
          libraryTabRowsFollowHome: "Biblioteket visar startsidans rader tills du \xE4ndrar dem h\xE4r.",
          libraryTabRowsUntouched: "Visar de rekommenderade raderna f\xF6r biblioteket. Dina \xE4ndringar tar \xF6ver n\xE4r du redigerar.",
          libraryRowContinue: "Bibliotekets progress i Senast sedda",
          libraryRowUnseen: "Osedda favoriter",
          libraryRowGenre: "Genre",
          plexIndexTitle: "Biblioteksindex",
          plexIndexDesc: "Lumio indexerar dina Plex-bibliotek lokalt s\xE5 att startsidan, rekommendationerna och Zapp kan bygga helt p\xE5 det du \xE4ger.",
          plexIndexEmpty: "Inget index \xE4nnu.",
          plexIndexStatus: "{titles} titlar \xB7 {unmatched} omatchade",
          plexIndexLastSync: "Senast synkat",
          plexIndexRunning: "{done} titlar",
          plexIndexBuild: "Bygg index",
          plexIndexRebuild: "Bygg om",
          plexIndexUpdate: "Uppdatera",
          plexIndexClear: "Ta bort index",
          plexIndexUseAsHome: "Anv\xE4nd Plex som startsida",
          plexIndexUseAsHomeDesc: "Hj\xE4lte, rader, rekommendationer och Zapp kommer bara fr\xE5n ditt bibliotek. Allt som visas g\xE5r att spela.",
          sourcesEmptyBody: "Lumio hittar str\xF6mmar via k\xE4llor du sj\xE4lv l\xE4gger till. Klistra in k\xE4llans manifest-URL nedan \u2014 den slutar oftast p\xE5 /manifest.json. Lumio varken lagrar, indexerar eller rekommenderar n\xE5gon k\xE4lla.",
          sourceAddInvalid: "Den URL:en gav inget giltigt manifest. Kontrollera adressen och f\xF6rs\xF6k igen.",
          kpMetricActiveAddonsSub: "installerade",
          kpMetricTotalCatalogs: "Totalt kataloger",
          kpMetricTotalCatalogsSub: "fr\xE5n alla k\xE4llor",
          kpMetricUsableRows: "Anv\xE4ndbara i rader",
          kpMetricUsableRowsSub: "som custom-k\xE4llor",
          kpStremioEyebrow: "Stremio-addons",
          kpCommunityTitle: "Kataloger fr\xE5n community",
          kpCommunityHint: "L\xE4gg till community-addons som exponerar kataloger. Varje katalog blir valbar som k\xE4lla f\xF6r en egen home-row.",
          kpManifestHint: "Klistra in addon-manifest-URL:en. Exempel: \u2026/manifest.json",
          kpLocalFilesEyebrow: "Lokala filer",
          kpLibraryTitle: "Mitt eget bibliotek",
          kpLibraryHint: "V\xE4lj en mapp med videofiler. Lumio matchar filnamn mot TMDb och visar dem i ett eget bibliotek.",
          kpFolderLabel: "Mapp",
          kpFolderPlaceholder: "/Users/ditt-namn/Movies",
          kpBrowse: "Bl\xE4ddra",
          kpStorageAccessTitle: "Lagrings\xE5tkomst",
          kpStorageAccessHint: "Android kr\xE4ver \xE5tkomst till alla filer innan Lumio kan l\xE4sa en mapp du skriver in h\xE4r. Sl\xE5 p\xE5 den en g\xE5ng i systeminst\xE4llningarna.",
          kpStorageAccessAction: "\xD6ppna inst\xE4llningar",
          kpStorageAccessGranted: "Beviljad",
          kpFolderScanFailed: "Kunde inte l\xE4sa mappen",
          kpPathHint: "S\xF6kv\xE4gen l\xE4ses automatiskt n\xE4r Lumio startar. Filer matchas mot TMDb i bakgrunden.",
          // Integrations panel
          ipCatAll: "Alla",
          ipCatNetwork: "N\xE4tverk",
          ipDescTmdb: "Filmer, serier, postrar och metadata. Kr\xE4vs f\xF6r det mesta i Lumio.",
          ipDescGroq: 'Aktiverar AI-s\xF6kning med naturligt spr\xE5k. "Visa mysiga vinterfilmer fr\xE5n 90-talet" funkar.',
          ipDescSpotify: "Anv\xE4nds f\xF6r att visa soundtracks i detaljpanelen. Skapa en app p\xE5 developer.spotify.com.",
          ipDescLan: "Dela Lumio med andra enheter i samma n\xE4tverk via en lokal webbadress.",
          ipHide: "D\xF6lj",
          ipShow: "Visa",
          ipTmdbTokenLabel: "API-token (Bearer)",
          ipTmdbTokenHintDefault: "En standardtoken \xE4r konfigurerad i milj\xF6n \u2014 s\xE4tt en egen f\xF6r h\xF6gre quota.",
          ipTmdbTokenHint: "Anv\xE4nds f\xF6r v4 API. Kr\xE4vs f\xF6r stora uppslag.",
          ipTmdbKeyLabel: "API-nyckel (v3)",
          ipTmdbKeyHint: "Bak\xE5tkompatibilitet f\xF6r \xE4ldre kataloger.",
          ipSecretStored: "En nyckel \xE4r sparad. Skriv en ny f\xF6r att byta, eller ta bort den f\xF6r att falla tillbaka p\xE5 den inbyggda.",
          ipSecretStoredPlaceholder: "Sparad \u2014 skriv f\xF6r att byta",
          ipSecretRemove: "Ta bort sparad nyckel",
          ipGroqKeyHint: "H\xE4mta fr\xE5n console.groq.com \u2014 kostnadsfri tier r\xE4cker bra f\xF6r Lumio.",
          ipSaved: "Sparad",
          ipSaveError: "Kunde inte spara",
          ipSaving: "Sparar\u2026",
          ipUnsavedChanges: "Osparade \xE4ndringar",
          ipNoUnsavedChanges: "Inga osparade \xE4ndringar",
          ipLanEnable: "Aktivera LAN Streaming",
          ipLanEnableDesc: "G\xF6r Lumio \xE5tkomlig f\xF6r andra enheter p\xE5 ditt n\xE4tverk",
          ipLanModeLabel: "L\xE4ge \u2014 vad andra enheter ser",
          ipLanModeApp: "Hela appen",
          ipLanModePlayback: "Bara uppspelning",
          ipLanLocalUrl: "Lokal URL",
          ipLanFetchingIp: "H\xE4mtar IP-adress\u2026",
          ipCopy: "Kopiera",
          ipLanRestartWarning: "Kr\xE4ver omstart av Lumio f\xF6r att aktiveras. macOS kan fr\xE5ga om du vill till\xE5ta inkommande anslutningar \u2014 klicka",
          ipLanAllow: "Till\xE5t",
          ipConnected: "Ansluten",
          ipInactive: "Inaktiv",
          ipMetricConnected: "Anslutna tj\xE4nster",
          ipMetricOfCount: "av {count}",
          ipMetricCategories: "Kategorier",
          ipMetricCategoriesSub: "metadata, AI, music, n\xE4tverk",
          ipLanStatus: "LAN-status",
          ipOff: "Avst\xE4ngd",
          ipExternalEyebrow: "Externa tj\xE4nster",
          ipSectionTitle: "Anslutna API:er och n\xE4tverk",
          ipSectionHint: "Klicka p\xE5 en tj\xE4nst f\xF6r att se eller \xE4ndra inst\xE4llningar.",
          // Home panel (Hem)
          hpTabHero: "Hero & bakgrund",
          hpTabDisplay: "Visning",
          hpGenreAll: "Alla kategorier",
          hpGenreAction: "Action",
          hpGenreAdventure: "\xC4ventyr",
          hpGenreAnimation: "Animerat",
          hpGenreComedy: "Komedi",
          hpGenreCrime: "Kriminal",
          hpGenreDocumentary: "Dokument\xE4r",
          hpGenreDrama: "Drama",
          hpGenreFamily: "Familj",
          hpGenreFantasy: "Fantasy",
          hpGenreHistory: "Historia",
          hpGenreHorror: "Skr\xE4ck",
          hpGenreMusic: "Musik",
          hpGenreMystery: "Mystery",
          hpGenreRomance: "Romantik",
          hpGenreSciFi: "Sci-Fi",
          hpGenreThriller: "Thriller",
          hpGenreWar: "Krig",
          hpGenreWestern: "Western",
          hpGenreActionAdventure: "Action & \xE4ventyr",
          hpGenreKids: "Barn",
          hpGenreReality: "Reality",
          hpGenreSciFiFantasy: "Sci-fi & fantasy",
          hpGenreWarPolitics: "Krig & politik",
          hpHeroMediaTypeLabel: "Inneh\xE5ll",
          hpHeroMediaTypeMovies: "Filmer",
          hpHeroMediaTypeSeries: "Serier",
          hpHeroMediaTypeMixed: "Filmer & serier",
          hpRowDensityTitle: "Radt\xE4thet",
          hpRowDensityHint: "Hur t\xE4tt Hems rader ligger och hur stora deras rubriker \xE4r.",
          hpRowDensityLabel: "T\xE4thet",
          hpRowHeadingLabel: "Rubrikstorlek",
          hpDensityCompact: "Kompakt",
          hpDensityNormal: "Normal",
          hpDensityAiry: "Luftig",
          hpLayoutSlider: "Karusell",
          hpLayoutGrid: "Visa allt",
          hpLayoutFull: "Stor banner",
          hpMetricActiveRows: "Aktiva rader",
          hpMetricCustomRows: "Egna rader",
          hpMetricSliderMax: "Sliderkort max",
          hpMetricSliderMaxSub: "globalt",
          hpRowsEyebrow: "Startsidan \xB7 Rader",
          hpRowsTitle: "Vad visas p\xE5 hem-sk\xE4rmen",
          hpRowsHint: "Klicka p\xE5 en rad f\xF6r att finjustera layout, antal och k\xE4lla. Anv\xE4nd pilarna f\xF6r att \xE4ndra ordning.",
          hpRowsTvNote: "TV-l\xE4get har egna rader per segment \u2014 Hem, Film och Serier. St\xE4ll in dem under TV-l\xE4ge; skrivbordets rader h\xE4r l\xE4mnas or\xF6rda.",
          hpRowsSectionHint: "Hem \xE4r startsidan. Film, Serier och Trendar \xE4r sidorna som knapparna under s\xF6kf\xE4ltet \xF6ppnar \u2014 TV-l\xE4get delar Film- och Serielistorna.",
          hpSegmentUntouchedNote: "Sidan visar de rekommenderade raderna tills du \xE4ndrar n\xE5got h\xE4r.",
          hpSegmentReset: "\xC5terst\xE4ll till rekommenderade rader",
          hpCustomBadge: "egen",
          hpCardsCount: "{count} kort",
          hpMoveUp: "Flytta upp",
          hpMoveDown: "Flytta ner",
          hpSourceLabel: "K\xE4lla",
          hpCardCountLabel: "Antal kort",
          hpMobileRowsLabel: "Rader p\xE5 telefon",
          hpMobileRowsAuto: "Auto",
          hpPopularStreaming: "Popul\xE4ra streaming",
          hpListLabel: "Lista",
          hpAllChannels: "Alla kanaler",
          hpFavourites: "Favoriter",
          hpAllPlaylists: "Alla spellistor",
          hpBingeDefaultList: "Standardlistan f\xF6r binge",
          hpTraktListLabel: "Trakt-lista",
          hpMyCollection: "Min samling",
          hpWideLayoutEyebrow: "Bred layout",
          hpSliderCardsTitle: "Sliderkort",
          hpSliderCardsHint: "Hur m\xE5nga kort en slider max visar globalt.",
          hpSliderCardsRowLabel: "Sliderkort",
          hpSliderCardsGlobalOption: "Global ({count})",
          ipDescOpenSubtitles: "Djupare undertexts\xF6kning via egen OpenSubtitles API-nyckel (gratis p\xE5 opensubtitles.com \u2192 API consumers). Utan nyckel s\xF6ks bara community-katalogen.",
          tgSectionEyebrow: "Trailersidan",
          tgColumnsLabel: "Kolumner",
          tgColumnsHint: "Hur m\xE5nga kolumner trailer-griden visar.",
          hpAlwaysShown: "Visas alltid",
          hpTopMenuEyebrow: "\xD6vre meny",
          hpTopButtonsTitle: "Topp-knappar",
          hpTopButtonsHint: "V\xE4lj vilka knappar som visas i toppraden bredvid profilv\xE4ljaren, och i vilken ordning. G\xE4ller menyradsl\xE4get \u2014 menypillret har en egen panel.",
          hpTopButtonsPillNote: "Menypillret \xE4r p\xE5 och ers\xE4tter toppraden \u2014 de h\xE4r knapparna visas inte.",
          hpMenuOrderGlassNote: "Glaskortet ritar sina rader och brickor i fasta grupper, s\xE5 ordningen och skiljelinjen har ingen verkan p\xE5 telefon. Byt till sidomenyn under Utseende f\xF6r att ordna dem.",
          rowViewNext: "Visa n\xE4sta",
          schedulePanelTitle: "Ditt schema",
          scheduleTabMenu: "Meny",
          scheduleTabSchedule: "Schema",
          scheduleOnlyAiringDays: "Bara dagar med avsnitt visas.",
          scheduleYear: "\xC5r",
          scheduleMonth: "M\xE5nad",
          scheduleSummary: "{days} s\xE4ndningsdagar \xB7 {episodes} avsnitt",
          scheduleEpisodeCount: "{count} avsnitt",
          scheduleEpisodeCountOne: "1 avsnitt",
          scheduleEmptyMonth: "Inget s\xE4nds den h\xE4r m\xE5naden av serierna du f\xF6ljer.",
          scheduleEmptyWatchlist: "F\xF6lj en serie s\xE5 dyker dess avsnitt upp h\xE4r.",
          scheduleFailed: "Schemat gick inte att h\xE4mta.",
          scheduleRetry: "F\xF6rs\xF6k igen",
          scheduleSettingTitle: "Schemapanel",
          scheduleSettingDesc: "En andra kolumn bredvid menyn med kommande avsnitt ur serierna du f\xF6ljer.",
          hpMenuDividerRow: "Avdelare",
          mobileMenuDesignTitle: "Menyns utseende p\xE5 telefon",
          mobileMenuDesignDesc: "Samma pill \xF6ppnar menyn i b\xE5da fallen \u2014 det h\xE4r v\xE4ljer hur den ritas.",
          mobileMenuDesignGlass: "Glaskort",
          mobileMenuDesignList: "Sidomeny",
          hpTvMenuEyebrow: "TV-l\xE4get",
          hpTvMenuTitle: "TV-menyn",
          hpTvMenuHint: "V\xE4lj vilka poster TV-sidomenyn visar och i vilken ordning. S\xF6k, Hem, Profiler och Inst\xE4llningar ligger alltid kvar \xF6verst.",
          hpProfilePicker: "Profilv\xE4ljare",
          hpSettingsShortcutHint: "Inst\xE4llningar kan alltid \xF6ppnas med",
          hpHomeMenuEyebrow: "Startsidans meny",
          hpSideButtonsTitle: "Sidoknappar",
          hpSideButtonsHint: "V\xE4lj vilka menyknappar som visas och \xE4ndra ordningen.",
          hpLivePreviewEyebrow: "Live preview",
          hpLivePreviewTitle: "S\xE5 h\xE4r ser det ut p\xE5 hemsk\xE4rmen",
          hpLivePreviewHint: "Snabbskiss av topp- och sidomenyn med dina val.",
          hpPreviewTitle: "F\xF6rhandsvisning",
          hpPreviewOverview: "En kort exempelbeskrivning av filmen som visar hur sammanfattning, betyg och knappar renderas i hero-bannern p\xE5 startsidan.",
          hpPreviewPlay: "Spela",
          hpPreviewMyList: "Min lista",
          hpPreviewMoreInfo: "Mer info",
          hpNoMoviesMatched: "Inga filmer matchade",
          hpHeroEyebrow: "Hero-banner",
          hpHeroTitle: "Stj\xE4rnan h\xF6gst upp",
          hpHeroHint: "Visar en slumpm\xE4ssig film h\xF6gst upp p\xE5 startsidan. Kr\xE4ver att egen bakgrund \xE4r avst\xE4ngd.",
          hpHeroActive: "Hero aktiv",
          hpHeroOff: "Hero av",
          hpRightNow: "Just nu",
          hpEnableHero: "Aktivera hero-banner",
          hpEnableHeroDisabledHint: "Inaktiverat \u2013 st\xE4ng av egen bakgrund f\xF6rst",
          hpEnableHeroHint: "Visa en slumpm\xE4ssig film h\xF6gst upp p\xE5 startsidan",
          hpCategoryLabel: "Kategori",
          hpMinRatingImdb: "Minimumbetyg (IMDb) \u2014 {value}",
          hpPersistentHero: "Persistent hero",
          hpPersistentHeroHint: "Heron ligger kvar n\xE4r du filtrerar och navigerar",
          hpKeepStartupMovie: "Beh\xE5ll samma film mellan sessioner",
          hpKeepStartupMovieHint: "Vid appstart visas senaste heron igen i st\xE4llet f\xF6r att rotera fram en ny",
          hpRefreshHeroNow: "Refresh hero nu",
          hpBackgroundEyebrow: "Bakgrund",
          hpBackgroundTitle: "Bakgrund p\xE5 startsidan",
          hpBackgroundHint: "Anv\xE4nd egna bild-URL:er eller uppladdade bilder ist\xE4llet f\xF6r slumpad bakgrund. St\xE4nger av hero-banner n\xE4r aktiv.",
          hpUseOwnImages: "Anv\xE4nd egna bilder",
          hpUseOwnImagesOnHint: "Hero-banner \xE4r inaktiverad medan detta \xE4r p\xE5",
          hpUseOwnImagesOffHint: "Slumpm\xE4ssig bakgrund fr\xE5n ditt bibliotek",
          hpBackgroundUrlsPlaceholder: "https://exempel.se/bakgrund-1.jpg\nhttps://exempel.se/bakgrund-2.jpg",
          hpOneUrlPerLine: "En URL per rad. Bilder roteras slumpvist vid varje bes\xF6k p\xE5 startsidan.",
          hpBackgroundCopyTitle: "Rubrik",
          hpBackgroundCopySubtitle: "Undertitel",
          hpBackgroundCopyHint: "Visas \xF6ver dina egna bakgrundsbilder, p\xE5 samma plats och i samma stil som herons text. Tomt = ingen text.",
          hpUploadedAlt: "Uppladdad {num}",
          hpUploadedImage: "Uppladdad bild {num}",
          hpStoredLocally: "Sparas lokalt i din profil",
          hpUpload: "Ladda upp",
          hpHomeEyebrow: "Startsida",
          hpSearchFieldTitle: "S\xF6kf\xE4lt",
          hpTopSlotTitle: "Toppraden",
          hpTopSlotHint: "Vad som st\xE5r h\xF6gst upp i mitten: filterraden eller ett s\xF6kf\xE4lt. Filtret vinner alltid p\xE5 sidor som har filter, s\xE5 de tv\xE5 kan aldrig dela platsen.",
          hpTopSlotFilterPages: "Filter d\xE4r de h\xF6r hemma",
          hpTopSlotFilterAll: "Filter p\xE5 alla sidor",
          hpTopSlotSearch: "S\xF6kf\xE4lt",
          hpTopSlotNone: "Ingenting (filtren ligger vid rutn\xE4tet)",
          hpSearchFieldHint: "Visa eller d\xF6lj det stora s\xF6kf\xE4ltet h\xF6gst upp p\xE5 startsidan.",
          hpSearchStaysHint: "S\xF6kfunktionen finns kvar i topp-menyn",
          hpSearchTopChosenHint: "S\xF6kf\xE4ltet ligger i toppraden (se Toppraden ovan), s\xE5 det stora f\xE4ltet \xE4r dolt.",
          hpSearchMoviesSeries: "S\xF6k filmer, serier\u2026",
          hpPosterEyebrow: "Posterutseende",
          hpPosterTitle: "Etiketter p\xE5 posters",
          hpPosterHint: "Styr vilka visuella etiketter som visas p\xE5 posters p\xE5 startsidan.",
          hpShowGenreChips: "Visa kategori-chips",
          hpShowGenreChipsHint: "Genre-etiketter nederst p\xE5 postern",
          hpShowImdbRating: "Visa IMDb-betyg",
          hpShowImdbRatingHint: "Betyg som badge i h\xF6rnet",
          hpShowYear: "Visa \xE5rtal",
          hpShowYearHint: "Premi\xE4r\xE5r vid titeln",
          hpProgressLine: "F\xF6rloppslinje",
          hpProgressLineHint: "Visas alltid p\xE5 Forts\xE4tt titta-kort",
          hpZappTitle: "Slumpfilm-plugin",
          hpZappHint: "Minimumbetyg f\xF6r slumpm\xE4ssiga filmer. Zapp! v\xE4ljer bara filmer med minst detta betyg fr\xE5n TMDb.",
          hpMinRating: "Minimumbetyg \u2014 {value}",
          hpPosterKindMovie: "FILM",
          hpPosterTitleSample: "Filmtitel",
          // Series seasons section
          sssSeasons: "S\xE4songer",
          sssPrevSeasons: "F\xF6reg\xE5ende s\xE4songer",
          sssMoreSeasons: "Fler s\xE4songer",
          sssSeasonN: "S\xE4song {num}",
          sssEpisodesWord: "avsnitt",
          sssMarkSeasonUnwatchedTitle: "Markera hela s\xE4songen som osedd",
          sssMarkSeasonWatchedTitle: "Markera hela s\xE4songen som sedd",
          sssSeasonWatched: "S\xE4songen sedd",
          sssMarkSeasonWatched: "Markera s\xE4song sedd",
          sssEpisodesLoadError: "Kunde inte ladda avsnitt just nu.",
          sssSeasonsLoadError: "Kunde inte ladda s\xE4songer just nu.",
          detailsCastLoadError: "Kunde inte ladda sk\xE5despelarna just nu.",
          detailsRecommendationsLoadError: "Kunde inte ladda rekommendationer just nu.",
          detailsCommentsLoadError: "Kunde inte ladda kommentarer just nu.",
          sssPlayEpisodeCode: "Spela {code}",
          sssPlayEpisode: "Spela avsnitt",
          // Series calendar
          scLoading: "Laddar\u2026",
          scPrevMonth: "F\xF6reg\xE5ende m\xE5nad",
          scNextMonth: "N\xE4sta m\xE5nad",
          scFollowing: "F\xF6ljer",
          scUnfollow: "Sluta f\xF6lja",
          scCloseDayPanel: "St\xE4ng dagspanel",
          scCloseStreamDetails: "St\xE4ng streamdetaljer",
          // Video player
          vpSubTimeout: "Undertexter tog f\xF6r l\xE5ng tid att ladda. F\xF6rs\xF6k igen.",
          vpSubNetwork: "Kunde inte ansluta till undertextk\xE4llan.",
          vpSubHttp: "Undertexttj\xE4nsten svarade med fel.",
          vpSubLoadFailed: "Kunde inte ladda undertext.",
          vpSubDownloadTimeout: "Undertextladdning tog f\xF6r l\xE5ng tid. F\xF6rs\xF6k igen.",
          vpWrongEpisodeWarning: "K\xE4llan levererade {found}, inte {wanted}. V\xE4lj en annan str\xF6m.",
          vpSubMpvFailedWith: "Kunde inte ladda undertext i mpv: {message}",
          vpSubMpvFailed: "Kunde inte ladda undertext i mpv.",
          vpNoSubsFound: "Inga undertexter hittades f\xF6r den h\xE4r titeln.",
          vpDownloadStartFailed: "Kunde inte starta nedladdning",
          // Media explorer
          meAddGroqKeyFirst: "L\xE4gg till Groq API-nyckel i inst\xE4llningarna f\xF6rst.",
          meStremioNoStreams: "Inga streams returnerades fr\xE5n Stremio-addonen f\xF6r det h\xE4r inneh\xE5llet.",
          meStremioUnreachable: "Kunde inte n\xE5 Stremio-addonen.",
          createList: "Skapa lista",
          createListFailed: "Kunde inte skapa listan",
          listNamePlaceholder: "Listnamn",
          creating: "Skapar\u2026",
          createAction: "Skapa",
          assignToList: "Tilldela till lista",
          noMoviesInListYet: "Inga filmer i min lista \xE4n.",
          download: "Ladda ner",
          pickStreamToDownload: "V\xE4lj stream att ladda ner",
          closeDownload: "St\xE4ng nedladdning",
          preparing: "F\xF6rbereder\u2026",
          fetchingShort: "H\xE4mtar\u2026",
          done: "Klar",
          downloadFailedRetry: "Nedladdningen misslyckades, f\xF6rs\xF6k igen",
          noPlayableStream: "Ingen spelbar stream hittades",
          resolveLinkFailed: "Kunde inte l\xF6sa nedladdningsl\xE4nk",
          fetchStreamsFailed: "Kunde inte h\xE4mta streams",
          noStreamsFound: "Inga streams hittades",
          startDownloadFailed: "Kunde inte starta nedladdning",
          folderPickFailed: "Mappval misslyckades",
          prepareDownloadFailed: "Kunde inte f\xF6rbereda nedladdning",
          downloadJobLost: "Tappade kontakt med nedladdningsjobbet",
          unexpectedServerResponse: "Ov\xE4ntat svar fr\xE5n servern",
          seriesPlural: "Serier",
          playNow: "Spela nu",
          nextOnSeries: "H\xE4rn\xE4st i",
          episodeNumber: "Avsnitt {n}",
          startingIn: "Startar om {seconds}s",
          startingSoon: "Startar snart",
          noStarredTitles: "Inga stj\xE4rnm\xE4rkta titlar \xE4n.",
          starTitlesHint: "Stj\xE4rnm\xE4rk titlar i releasekalendern f\xF6r att f\xF6lja premi\xE4rer.",
          watchlist: "Watchlist",
          editFile: "Redigera fil",
          movieTitlePlaceholder: "Filmtitel\u2026",
          pickFile: "V\xE4lj fil",
          describeMoviePlaceholder: "Beskriv filmen\u2026",
          genresPlaceholder: "Action, Drama\u2026",
          backdropUrl: "Bakgrundsbild URL",
          posterUrl: "Affisch-URL",
          fetchFromTmdb: "H\xE4mta fr\xE5n TMDb",
          pickCorrectMovie: "V\xE4lj r\xE4tt film",
          noResultsFound: "Inga resultat hittades.",
          searchFailed: "S\xF6kning misslyckades.",
          edit: "Redigera",
          editMetadata: "Redigera metadata",
          ownFiles: "Egna filer",
          localBadge: "Lokal",
          noFolderSelected: "Ingen mapp vald. V\xE4lj en mapp i inst\xE4llningarna.",
          readFolderFailed: "Kunde inte l\xE4sa mapp: {error}",
          fileReadError: "Fel vid inl\xE4sning av filer.",
          noVideoFilesFound: "Inga videofiler hittades i mappen.",
          back: "Tillbaka",
          backToHome: "Tillbaka till startsidan",
          pageLoadFailed: "Sidan kunde inte laddas",
          pluginError: "Plugin-fel",
          fetchingStream: "H\xE4mtar stream\u2026",
          loadingDetails: "Laddar detaljer\u2026",
          loadingFileInfo: "Laddar filinfo\u2026",
          loadingZapp: "Laddar Zapp\u2026",
          loadingCalendar: "Laddar kalender\u2026",
          loadingLiveTvPlugin: "Laddar Live TV-plugin\u2026",
          saving: "Sparar\u2026",
          openExternalPlayerFailed: "Kunde inte \xF6ppna extern spelare",
          pressToStart: "Tryck f\xF6r att starta",
          activeLabel: "Aktiv",
          clearActorSearch: "Rensa sk\xE5despelars\xF6k",
          nothingToShowYet: "Inget att visa \xE4n.",
          liveTvGuideTitle: "TV-tabl\xE5",
          liveTvGuideNoLists: "Ingen Live TV-lista finns \xE4nnu.",
          liveTvGuideNoEpgSource: "Ingen EPG-k\xE4lla \xE4r kopplad till den h\xE4r Live TV-listan.",
          liveTvGuideLoading: "H\xE4mtar guidedata\u2026",
          liveTvGuideFetchFailed: "EPG-k\xE4llan kunde inte h\xE4mtas: {errors}",
          liveTvGuideNoProgrammes: "EPG-k\xE4llan h\xE4mtades men inneh\xF6ll inga program.",
          liveTvGuideNoMatches: "EPG h\xE4mtad ({channels} kanaler), men inga av listans kanaler matchade.",
          liveTvGuideNoProgrammesInWindow: "EPG h\xE4mtad ({channels} kanaler, {matched} matchade), men inga program ligger i tidsf\xF6nstret.",
          liveTvFilterChannel: "Filtrera kanal",
          liveTvSelectChannel: "V\xE4lj en kanal",
          liveTvSelectedChannel: "Vald kanal",
          liveTvNow: "Nu",
          liveTvLater: "Senare",
          liveTvRemaining: "{time} kvar",
          liveTvOnChannel: "p\xE5 {channel}",
          liveTvPause: "Pausa",
          liveTvPaused: "Pausad",
          liveTvPlaying: "Spelar",
          liveTvFullscreen: "Helsk\xE4rm",
          liveTvExitFullscreen: "Avsluta helsk\xE4rm",
          liveTvGuide: "Tabl\xE5",
          liveTvOpenGuide: "\xD6ppna TV-tabl\xE5",
          liveTvVolume: "Volym",
          liveTvMute: "Ljud av",
          liveTvUnmute: "Ljud p\xE5",
          liveTvLiveBadge: "Direkt",
          liveTvPlaybackFailed: "Uppspelningen misslyckades.",
          liveTvHlsUnsupported: "Den h\xE4r webbl\xE4saren st\xF6der inte HLS-uppspelning.",
          liveTvStreamErrorDetails: "Streamfel: {details}",
          liveTvMpvStartFailed: "Streamen startade inte i MPV. St\xE4ng spelaren och f\xF6rs\xF6k igen, eller testa en annan kanal.",
          liveTvRefreshing: "Uppdaterar\u2026",
          liveTvFavorites: "Favoriter",
          liveTvCreateListDesc: "Skapa en egen kanalrad f\xF6r Live TV.",
          liveTvHomeOverrideDesc: "Ers\xE4tter vanliga Home-rader med Live TV-vyn men beh\xE5ller hero och resten av startsidan.",
          liveTvEpgSources: "EPG-k\xE4llor",
          liveTvEpgSourceStats: "{channels} kanaler \xB7 {programmes} program",
          liveTvEpgUrlPlaceholder: "XMLTV-URL (t.ex. https://epgshare01.online/epgshare01/epg_ripper_SE1.xml.gz)",
          liveTvNoEpgSourcesPrefix: "Inga EPG-k\xE4llor \xE4nnu.",
          liveTvXtreamTitle: "Xtream-inloggning",
          liveTvXtreamDesc: "F\xF6r leverant\xF6rer med Xtream Codes-inloggning (server, anv\xE4ndarnamn, l\xF6senord) i st\xE4llet f\xF6r M3U-l\xE4nk.",
          liveTvXtreamServer: "Server-URL",
          liveTvXtreamUsername: "Anv\xE4ndarnamn",
          liveTvXtreamPassword: "L\xF6senord",
          liveTvXtreamConnect: "Logga in & h\xE4mta",
          liveTvXtreamConnecting: "Loggar in\u2026",
          liveTvXtreamDone: "H\xE4mtat",
          liveTvXtreamAuthFailed: "Inloggningen nekades \u2014 kontrollera anv\xE4ndarnamn och l\xF6senord.",
          liveTvXtreamError: "Kunde inte n\xE5 panelen. Kontrollera server-URL:en.",
          liveTvXtreamExpires: "G\xE5r ut",
          liveTvXtreamCategories: "Kategorier",
          liveTvXtreamAllCategories: "Alla kategorier",
          liveTvXtreamSearchCategories: "S\xF6k kategorier",
          liveTvXtreamApplyCategories: "Uppdatera kanaler",
          liveTvXtreamRemove: "Ta bort",
          liveTvXtreamCapped: "Visar de f\xF6rsta {max} av {total} kanalerna \u2014 avgr\xE4nsa med kategorier.",
          liveTvFetchEpgForChannel: "H\xE4mta EPG f\xF6r kanalen",
          liveTvNoEpg: "Ingen EPG",
          liveTvNoGuideAvailable: "Ingen tabl\xE5 tillg\xE4nglig",
          liveTvNoGuideForChannel: "Ingen guidedata tillg\xE4nglig f\xF6r den h\xE4r kanalen.",
          liveTvPreviousChannel: "F\xF6reg\xE5ende kanal",
          liveTvNextChannel: "N\xE4sta kanal",
          homeOverrideAlreadySet: "En egen startsida \xE4r redan vald. Avmarkera den f\xF6rst innan du v\xE4ljer en annan plugin.",
          homeOverrideUseAsHome: "Anv\xE4nd som startsida",
          plexHomeOverrideDesc: "Ers\xE4tter de vanliga hemraderna med Plex-vyn men beh\xE5ller hero och resten av startsidan.",
          youtubeHomeOverrideDesc: "Ers\xE4tter de vanliga hemraderna med YouTube-vyn men beh\xE5ller hero och resten av startsidan.",
          refresh: "Uppdatera",
          refreshing: "Uppdaterar\u2026",
          homekitAccessoryIdLabel: "Tillbeh\xF6rs-ID (MAC-format)",
          homekitPinLabel: "PIN",
          homekitPairingCodeLabel: "Parningskod",
          homekitPairingCodeHint: "L\xE4gg till det i Home-appen p\xE5 din iPhone: L\xE4gg till tillbeh\xF6r -> Fler alternativ -> Lumio Cinema Sync, och ange sedan koden.",
          homekitEventRulesHint: "Varje brytare \xE4r en utl\xF6sare. Bygg en automation per brytare i Home-appen f\xF6r att best\xE4mma vad som ska h\xE4nda.",
          homekitSetupIdLabel: "Setup ID",
          homekitPortLabel: "Port",
          plexCacheCleared: "Plex-cachen \xE4r rensad. \xD6ppna Plex igen f\xF6r att h\xE4mta nya bilder.",
          plexClearCache: "Rensa Plex-cache",
          plexLoading: "Laddar Plex",
          plexLoadingDesc: "H\xE4mtar titlar fr\xE5n dina valda Plex-bibliotek.",
          plexLoadFailed: "Kunde inte l\xE4sa in titlar fr\xE5n Plex.",
          plexNoTitles: "Inga Plex-titlar",
          plexNoTitlesDesc: "Inga Plex-titlar hittades i de valda biblioteken.",
          plexStaleResults: "Visar de senaste Plex-resultaten. Uppdateringen misslyckades.",
          plexNotConnected: "Plex \xE4r inte anslutet",
          pluginYoutubeRequestFailed: "YouTube-f\xF6rfr\xE5gan misslyckades.",
          pluginYoutubeQuotaExceeded: "YouTube API-kvoten \xE4r slut f\xF6r tillf\xE4llet. F\xF6rs\xF6k igen senare eller minska antalet YouTube-laddningar.",
          pluginYoutubeSessionExpired: "YouTube-sessionen har g\xE5tt ut. \xC5teranslut i Inst\xE4llningar.",
          pluginYoutubeChannelLoadFailed: "Kunde inte l\xE4sa in din YouTube-kanal.",
          pluginYoutubeChannelPlaylistLoadFailed: "Kunde inte l\xE4sa in kanalens spellista.",
          pluginYoutubeBrowserOnly: "Google-inloggning \xE4r bara tillg\xE4nglig i webbl\xE4saren.",
          pluginYoutubeIdentityServicesLoadFailed: "Kunde inte l\xE4sa in Google Identity Services.",
          pluginYoutubeIdentityServicesInitFailed: "Kunde inte starta Google-inloggningen.",
          pluginYoutubeDesktopLoginStartFailed: "Kunde inte starta YouTube-inloggningen p\xE5 datorn.",
          pluginYoutubeLoginSessionExpired: "YouTube-inloggningen har g\xE5tt ut. Starta anslutningen igen.",
          pluginYoutubeLoginFailed: "YouTube-inloggningen misslyckades.",
          pluginYoutubeLoginTimedOut: "YouTube-inloggningen tog f\xF6r l\xE5ng tid \u2013 Lumio fick aldrig n\xE5gon session.",
          pluginYoutubeMissingClientId: "L\xE4gg till ett Google OAuth-klient-ID f\xF6rst.",
          pluginYoutubeMissingPlaylistId: "Spellistans ID saknas.",
          pluginYoutubeMissingChannelId: "Kanalens ID saknas.",
          ptNeedsNewerApp: "Uppdateringen kr\xE4ver en nyare version av appen.",
          ptScanSummary: "{updated} uppdaterade, {uptodate} redan aktuella, {failed} misslyckades.",
          ptScanNoUpdates: "Alla plugins \xE4r p\xE5 senaste versionen.",
          // Profilsidan
          profKicker: "Lumio \xB7 Profil",
          profYourProfile: "Din profil",
          profSince: "Sedan {date} \xB7 {movies} filmer \xB7 {series} serier",
          profSwitch: "Byt profil",
          profViewProfile: "Visa profil",
          profMyProfile: "Min profil",
          profTabOverview: "\xD6versikt",
          profTabGalaxy: "Smakgalaxen",
          profTabDiary: "Filmdagbok",
          profTabHunt: "Filmografijakt",
          profTabWrapped: "Wrapped",
          profTvHelp: "\u25C0 \u25B2 \u25BC \u25B6 Flytta \xB7 OK V\xE4lj \xB7 Bak\xE5t St\xE4ng",
          profEmptyFirstStar: "Titta p\xE5 din f\xF6rsta film s\xE5 t\xE4nds f\xF6rsta stj\xE4rnan.",
          profGalaxyLine: "{stars} stj\xE4rnor, {constellations} stj\xE4rnbilder och {zones} m\xF6rka zoner",
          profGalaxyDesc: "Varje film du sett \xE4r en stj\xE4rna. Regiss\xF6rer bildar stj\xE4rnbilder.",
          profViewingN: "G\xE5ng {n}",
          profSecondViewing: "Andra g\xE5ngen",
          profDiaryList: "Dagbok",
          profDiaryBook: "Sj\xE4lvbiografi",
          profDiaryNote: "Skrivs utifr\xE5n vad du tittar p\xE5 i Lumio.",
          profDiaryEmpty: "H\xE4r st\xE5r ingenting \xE4n.",
          profApprox: "Ungef\xE4rligt",
          profChapters: "Kapitel",
          profChKicker: "Kapitel {n} \xB7 {year}",
          profChKickerOngoing: "Kapitel {n} \xB7 {year} (p\xE5g\xE5r)",
          profChShort: "{n}. {year}",
          profChTitles: "Du s\xE5g {n} titlar, ungef\xE4r {h} timmar.",
          profChTop: "{title} var den du \xE5terv\xE4nde till \u2013 {n} g\xE5nger.",
          profChLate: "{p} % av kv\xE4llarna b\xF6rjade efter tio.",
          profChDirector: "{name} var \xE5rets regiss\xF6r, med {n} filmer.",
          profChTitleNight: "\xC5ret med de sena kv\xE4llarna",
          profChTitleDirector: "\xC5ret med {name}",
          profChTitleRewatch: "\xC5ret med {title}",
          profChTitleDefault: "Ett \xE5r i film",
          profHuntEmpty: "Se tv\xE5 filmer av samma regiss\xF6r s\xE5 b\xF6rjar en jakt.",
          profHuntKicker: "Filmografi",
          profHuntSeen: "Du har sett {seen}/{total} {name}",
          profHuntMissing: "{n} kvar att hitta.",
          profHuntAllSeen: "Du har sett alla.",
          profHuntMakeRow: "G\xF6r en rad",
          profHuntMakeCollection: "G\xF6r en samling",
          profHuntRowName: "{name} \u2013 kvar att se",
          profHuntHomeRowMade: 'Raden "{name}" finns nu p\xE5 startsidan.',
          profHuntRowMade: 'Raden "{name}" \xE4r skapad \u2013 l\xE4gg till den p\xE5 startsidan via Inst\xE4llningar.',
          profHuntRowFailed: "Raden gick inte att skapa \u2013 du kanske har f\xF6r m\xE5nga rader.",
          profHuntNew: "+ Jaga en ny regiss\xF6r",
          profHuntSearchPh: "S\xF6k regiss\xF6r",
          profHuntDocs: "+ Dokument\xE4rer",
          profHuntShorts: "+ Kortfilmer",
          profBadgeFirst: "F\xF6rsta steget",
          profBadgeHalf: "Halvv\xE4gs",
          profBadgeAlmost: "N\xE4stan d\xE4r",
          profBadgeComplete: "Komplett",
          profBadgeInOrder: "I ordning",
          profWrappedTeaser: "{h} timmar.\nOch mer.",
          profWrappedKicker: "Lumio Wrapped {year}",
          profWrappedPlay: "Spela upp ditt \xE5r \u2192",
          profMoreAboutYou: "Mer om dig",
          profClose: "St\xE4ng",
          profModColor: "F\xE4rg\xE5ret",
          profModColorLine: "Ditt \xE5r som en remsa av filmf\xE4rger.",
          profModSlept: "Somnade-listan",
          profModSleptLine: "Allt du somnade till.",
          profModCouch: "Soffkompisar",
          profModCouchLine: "Vem du tittar med, och vad ni \xE4r \xF6verens om.",
          profModClock: "Tittarklockan",
          profModClockLine: "N\xE4r i veckan du tittar.",
          profModCapsule: "Tidskapseln",
          profModCapsuleLine: "F\xF6rsegla en film till ditt framtida jag.",
          profModRecords: "Rekordtavlan",
          profModRecordsLine: "L\xE4ngsta maraton, senaste natten och mer.",
          profModAbandoned: "\xD6vergivna",
          profModAbandonedLine: "Filmer du gav upp tidigt.",
          profModQuiz: "Quizprofilen",
          profModQuizLine: "Vad du tittar p\xE5 mot vad du kan.",
          profModBack: "\u2190 Profil",
          profModColorTitle: "Ditt \xE5r som en enda remsa",
          profModColorDesc: "Varje strimma \xE4r en films barcode, i den ordning du s\xE5g dem. V\xE4lj en m\xE5nad f\xF6r att se vilka filmer som gav f\xE4rgen.",
          profModColorNote: "Fr\xE5n dina barcodes",
          profModSleptTitle: "Filmer du somnade till",
          profModSleptDesc: "S\xF6mntimern vet exakt var du slocknade. Forts\xE4tt d\xE4rifr\xE5n, eller b\xF6rja om n\xE4r du \xE4r piggare.",
          profModSleptNote: "Fr\xE5n s\xF6mntimern",
          profModCouchTitle: "Vem du tittar med",
          profModCouchDesc: "Smakmatch per profil och f\xF6rslag som passar er b\xE5da, baserat p\xE5 vad ni sett tillsammans och var f\xF6r sig.",
          profModCouchNote: 'Fr\xE5n "Vem tittar med?"',
          profModClockTitle: "N\xE4r du tittar",
          profModClockDesc: "Veckodag mot klockslag f\xF6r allt du startat. V\xE4lj en dag f\xF6r att se dina vanor.",
          profModClockNote: "Fr\xE5n starttiderna i dagboken",
          profModCapsuleTitle: "Skicka en film till framtiden",
          profModCapsuleDesc: "V\xE4lj en film i dag. Lumio f\xF6resl\xE5r den igen om n\xE5gra \xE5r, tillsammans med dagens dagbokssida.",
          profModCapsuleNote: "\xD6ppnas p\xE5 startsidan",
          profModRecordsTitle: "Dina personliga rekord",
          profModRecordsDesc: "L\xE4ngsta maraton, senaste kv\xE4llen och mer. Nya rekord markeras n\xE4r de sl\xE5s.",
          profModRecordsNote: "Fr\xE5n dagboken",
          profModAbandonedTitle: "Filmer du gav upp",
          profModAbandonedDesc: "Allt du l\xE4mnat under 20 %. Ge dem en andra chans eller sl\xE4pp taget f\xF6r gott.",
          profModAbandonedNote: "Fr\xE5n dagboken",
          profSleptSummary: "Du somnar oftast p\xE5 {day}, i snitt {m} minuter in.",
          profSleptTopGenre: "{genre} st\xE5r f\xF6r {n} av {total} tupplurar.",
          profSleptWhen: "{date} \xB7 somnade {time}",
          profSleptResume: "Forts\xE4tt {time}",
          profSleptRestart: "B\xF6rja om",
          profSleptRemove: "Ta bort",
          profSleptEmpty: "Listan \xE4r tom. Du har vaknat till allt.",
          profAbandonedCount: "{n} filmer l\xE4mnade under 20 %.",
          profAbandonedWhen: "Slutade vid {p} % \xB7 {date}",
          profAbandonedRetry: "Andra chans",
          profAbandonedAdded: "I Forts\xE4tt titta",
          profAbandonedLetGo: "Sl\xE4pp taget",
          profAbandonedDismissRow: "Ta bort {title} fr\xE5n listan",
          profAbandonedEmpty: "Inget \xF6vergivet. Du ser klart det du b\xF6rjar p\xE5.",
          profModQuizTitle: "Vad du kan, mot vad du ser",
          profModQuizDesc: "Dina resultat i filmquizet per genre, j\xE4mf\xF6rt med hur mycket du faktiskt tittar p\xE5 genren.",
          profModQuizNote: "Fr\xE5n filmquizet",
          profPrevNoCapsule: "Ingen kapsel \xE4n",
          profPrevOpens: "\xD6ppnas",
          profPrevTogether: "{n} filmer tillsammans",
          profPrevEmpty: "Inget h\xE4r \xE4n",
          profHm: "{h} h {m} min",
          profMin: "{m} min",
          profRecMarathon: "L\xE4ngsta maraton",
          profRecLatestNight: "Senaste kv\xE4llen",
          profRecMostInDay: "Flest filmer p\xE5 en dag",
          profRecLongestFilm: "L\xE4ngsta film",
          profRecMostRewatched: "Flest omtittningar",
          profRecStreak: "L\xE4ngsta svit",
          profRecStreakValue: "{n} dagar",
          profDayPl0: "m\xE5ndagar",
          profDayPl1: "tisdagar",
          profDayPl2: "onsdagar",
          profDayPl3: "torsdagar",
          profDayPl4: "fredagar",
          profDayPl5: "l\xF6rdagar",
          profDayPl6: "s\xF6ndagar",
          profColorMonthCount: "{month}: {n} filmer",
          profColorMoodRecord: "\xC5rets rekordm\xE5nad",
          profColorMoodDark: "\xC5rets m\xF6rkaste m\xE5nad",
          profColorMoodBright: "\xC5rets ljusaste m\xE5nad",
          profColorUseBg: "Anv\xE4nd som profilbakgrund",
          profColorRemoveBg: "Ta bort profilbakgrund",
          profColorBgSet: "Remsan ligger nu bakom din profil.",
          profColorExport: "Exportera som bild",
          profColorShareTitle: "F\xE4rg\xE5ret {year}",
          profColorFilms: "{n} filmer",
          profColorEmpty: "Inga sedda filmer i \xE5r \xE4n.",
          profColorNoBarcodeNote: "Gr\xE5 strimmor = filmer utan barcode \xE4n. Spela dem i Lumio s\xE5 fylls f\xE4rgen i.",
          profShareSaved: "Bilden \xE4r sparad.",
          profShareFailed: "Bilden gick inte att skapa.",
          profShareNoLan: "Hittade ingen n\xE4tverksadress f\xF6r telefonen.",
          profShareScan: "Skanna med telefonen f\xF6r att spara bilden.",
          profClockTopTime: "Topptimme",
          profClockFilms: "Filmer",
          profClockUsual: "Oftast",
          profClockBigNight: "Veckans stora kv\xE4ll.",
          profClockWith: "Oftast med {name}.",
          profClockEmpty: "Starta n\xE5gra filmer s\xE5 fylls klockan i.",
          profRecNew: "Nytt",
          profRecMarathonHow: "{n} i rad fr\xE5n {title}, {date}",
          profRecNightHow: "{title}, {date}",
          profRecStreakHow: "i rad, till {date}",
          profRecEmpty: "Rekorden dyker upp n\xE4r du har n\xE5gra kv\xE4llar bakom dig.",
          profPrevMatch: "smakmatch med {name}",
          profCouchUsual: "Oftast: {day} {time}",
          profCouchDisagree: "Oenigast om: {genre}",
          profCouchTonight: "Kv\xE4llens film f\xF6r er b\xE5da",
          profCouchReasonBoth: "P\xE5 b\xE5da listorna",
          profCouchReasonRec: "Liknar {title}",
          profCouchStart: "Starta en kv\xE4ll ihop",
          profCouchSolo: "L\xE4gg till en profil till s\xE5 ser du vem du tittar med.",
          profCouchHint: "V\xE4lj vem som tittar med n\xE4r du startar en film, s\xE5 fylls det h\xE4r i.",
          profCouchNoPicks: "Inga gemensamma f\xF6rslag \xE4n.",
          profQuizLegendWatch: "Andel av ditt tittande",
          profQuizLegendRight: "R\xE4tt svar i quizet",
          profQuizStart: "Quiz: {genre}",
          profQuizSummary: "Du kan mest om {best}, fast du tittar mest p\xE5 {watched}.",
          profQuizSummarySame: "Du kan {best} b\xE4st \u2014 och tittar mest p\xE5 det.",
          profQuizWeak: "{weak} \xE4r din svaga punkt.",
          profQuizEmpty: "Spela en runda filmquiz s\xE5 dyker resultaten upp h\xE4r.",
          profCapStep1: "1 \xB7 V\xE4lj en film",
          profCapStep2: "2 \xB7 N\xE4r ska den \xF6ppnas?",
          profCapYears: "{n} \xE5r",
          profCapLine: "{title} \xF6ppnas {date}.",
          profCapSeal: "F\xF6rslut kapseln",
          profCapSealing: "F\xF6rsluter\u2026",
          profCapSealed: "F\xF6rseglad. Vi ses {date}.",
          profCapAnother: "F\xF6rsegla en till",
          profCapYours: "Dina kapslar",
          profCapOpens: "\xD6ppnas {date}",
          profCapOpened: "\xD6ppnad {date}",
          profCapNone: "Inga kapslar \xE4n.",
          profCapNoFilms: "Se klart en film f\xF6rst \u2014 sedan kan du skicka den fram\xE5t.",
          profCapDueKicker: "Tidskapseln \xB7 \xF6ppnad i dag",
          profCapDueLine: "Du f\xF6rseglade {title} den {date}.",
          profCapOpen: "\xD6ppna",
          profDiaryAsleep: "Somnade {time} \xB7 {p} %",
          profGxDirectors: "Regiss\xF6rer",
          profGxGenres: "Genrer",
          profGxWhole: "\u2190 Hela galaxen",
          profGxExplore: "Utforska",
          profGxPickTitle: "V\xE4lj en stj\xE4rna eller en m\xF6rk zon",
          profGxPickBody: "Stj\xE4rnbilder \xE4r regiss\xF6rer du f\xF6ljt l\xE4nge. Streckade cirklar \xE4r genrer du n\xE4stan aldrig tittat p\xE5.",
          profGxStar: "Stj\xE4rna",
          profGxSeenTimes: "Sedd {n} g\xE5nger \xB7 senast {date}",
          profGxSeenOnce: "Sedd en g\xE5ng \xB7 {date}",
          profGxNextStar: "N\xE4sta stj\xE4rna \u2192",
          profGxDetails: "Detaljer",
          profGxHunt: "Filmografijakt",
          profGxDarkZone: "M\xF6rk zon",
          profGxZoneBetween: "{n} sedda. Ligger mellan {a} och {b}.",
          profGxZoneNear: "{n} sedda. Ligger intill {a}.",
          profGxZoneEdge: "{n} sedda. Ett outforskat h\xF6rn.",
          profGxOkHint: "p\xE5 zonen f\xF6r att flyga dit",
          profGxFly: "Flyg dit",
          profGxLightFirst: "T\xE4nd de f\xF6rsta stj\xE4rnorna",
          profGxLoading: "Letar filmer\u2026",
          profGxNoSuggestions: "Inga f\xF6rslag just nu. F\xF6rs\xF6k igen senare.",
          profGxPlay: "Spela",
          profGxConstellations: "Stj\xE4rnbilder",
          profGxZones: "M\xF6rka zoner",
          settingsPageProfilePage: "Profilsida",
          ppWeatherGroup: "V\xE4der i dagboken",
          ppWeatherToggle: "Spara v\xE4dret",
          ppWeatherToggleDesc: "N\xE4r en film slutar h\xE4mtar Lumio v\xE4dret f\xF6r din ort en g\xE5ng (Open-Meteo, inget konto). Av: inga uppslag alls.",
          ppWeatherPlace: "Ort",
          ppWeatherNoPlace: "Ingen ort vald \xE4n.",
          ppWeatherSearchPh: "t.ex. G\xF6teborg",
          ppWeatherSearch: "S\xF6k",
          ppWeatherSearching: "S\xF6ker\u2026",
          ppWeatherNoResults: "Ingen ort hittades.",
          ppWeatherFailed: "S\xF6kningen misslyckades. Kontrollera anslutningen och f\xF6rs\xF6k igen.",
          ppWeatherCredit: "V\xE4derdata fr\xE5n Open-Meteo.com (CC BY 4.0).",
          profWrKicker: "Lumio Wrapped \xB7 {year}",
          profWrSoFar: "hittills i \xE5r",
          profWrPrev: "F\xF6reg\xE5ende",
          profWrNext: "N\xE4sta",
          profWrNotEnough: "Wrapped beh\xF6ver minst 10 sessioner under {year}. Forts\xE4tt titta!",
          profWrIntroTitle: "Ditt \xE5r\ni film.",
          profWrIntroBody: "{n} stj\xE4rnor senare. Tryck f\xF6r att b\xF6rja.",
          profWrIntroBodyTv: "{n} stj\xE4rnor senare. Tryck \u25B6 f\xF6r att b\xF6rja.",
          profWrGuessKicker: "Gissa f\xF6rst",
          profWrGuessQ: "Vilken genre tittade du mest p\xE5 i \xE5r?",
          profWrGuessRight: "Helt r\xE4tt. {genre}, med {h} timmar.",
          profWrGuessWrong: "N\xE4ra. Det blev {genre}, med {h} timmar.",
          profWrNoGenres: "Inte tillr\xE4ckligt med genredata \xE4n.",
          profWrHoursKicker: "Du tittade i",
          profWrHoursUnit: "timmar",
          profWrDays: "= {n} dygn i soffan",
          profWrInterstellar: "= {n} Interstellar i rad",
          profWrEpisodes: "= {n} avsnitt av en halvtimmesserie",
          profWrGenreKicker: "Genretopplistan",
          profWrGenreWon: "{genre} vann.",
          profWrHoursShort: "{h} tim",
          profWrGoldenKicker: "Gyllene timmen",
          profWrGoldenBody: "Klockslaget d\xE5 du oftast tryckte p\xE5 play.",
          profWrStarsKicker: "Dina stj\xE4rnor",
          profWrStarsTitle: "Sk\xE5despelarna du s\xE5g mest.",
          profWrStarsNone: "Inte tillr\xE4ckligt med rollistor \xE4n.",
          profWrStarsFilms: "{n} filmer",
          profWrRewatchKicker: "Mest omsedda",
          profWrRewatchNone: "Inga omtittningar i \xE5r \u2014 alltid n\xE5got nytt.",
          profWrSleepTitle: "{n} g\xE5nger somnade du.",
          profWrSleepNone: "Du h\xF6ll dig vaken hela \xE5ret.",
          profWrBuddyTitle: "Du och {name} s\xE5g {n} filmer ihop.",
          profWrBuddyNone: "Mest du och sk\xE4rmen i \xE5r.",
          profWrPersKicker: "Din filmpersonlighet",
          profWrTraitNight: "Nattuggla",
          profWrTraitNightValue: "startar {time}",
          profWrTraitGenre: "Genretrogen",
          profWrTraitGenreValue: "{p} % {genre}",
          profWrTraitRewatch: "Omtittare",
          profWrTraitRewatchValue: "{n} omtittningar",
          profWrTraitNap: "Somnar",
          profWrTraitNapValue: "vid {p} %",
          profWrShareTitle: "Dela ditt \xE5r.",
          profWrShare: "Dela",
          profWrReplay: "Spela igen",
          profWrCardHours: "totalt",
          profWrCardGenre: "toppgenre",
          profWrCardTitle: "mest spelad",
          profWrCardNaps: "tupplurar",
          profWrBNight: "Nattugglan",
          profWrBRewatch: "Omtittaren",
          profWrBNap: "Tupplursm\xE4staren",
          profWrBMarathon: "Maratonl\xF6paren",
          profWrBExplorer: "Uppt\xE4ckaren",
          profWrAScifi: "fr\xE5n rymden",
          profWrADrama: "med hj\xE4rtat utanp\xE5",
          profWrAHorror: "fr\xE5n m\xF6rkret",
          profWrAComedy: "som skrattar f\xF6rst",
          profWrAAnimation: "med tecknad sj\xE4l",
          profWrADocumentary: "som vill veta",
          profWrAThriller: "p\xE5 helsp\xE4nn",
          profWrAAction: "i full fart",
          profWrARomance: "med rosa glas\xF6gon",
          profWrACrime: "fr\xE5n undre v\xE4rlden",
          profWrAFantasy: "fr\xE5n sagolandet",
          profWrAOther: "utan karta"
        }
      };
      detachedLangContextValue = {
        lang: "en",
        setLang: () => {
        },
        t: (key) => strings.en[key]
      };
      LangContext = createContext(detachedLangContextValue);
      LANG_CHANGED_EVENT = "lumio-app-lang-changed";
      STORAGE_KEY = "app_lang";
      DEFAULT_LANG = "en";
    }
  });

  // ../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/tv-focus-shim.ts
  var init_tv_focus_shim = __esm({
    "../../../../../../var/folders/lc/1hd2j0b57z10tx5mflylq4r80000gp/T/lumio-plugin-build/tv-focus-shim.ts"() {
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

  // lib/tv-hold.ts
  var init_tv_hold = __esm({
    "lib/tv-hold.ts"() {
      "use strict";
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
  function emitChanged() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  }
  function setTraktAuth(auth) {
    if (typeof window === "undefined") return;
    if (!auth) {
      removeScopedStorageItem(AUTH_KEY);
      emitChanged();
      return;
    }
    setScopedStorageItem(AUTH_KEY, JSON.stringify(auth));
    emitChanged();
  }
  function clearTraktAuth() {
    setTraktAuth(null);
  }
  function onTraktAuthChanged(listener) {
    if (typeof window === "undefined") return () => {
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }
  var AUTH_KEY, EVENT;
  var init_trakt_storage = __esm({
    "lib/trakt-storage.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      init_spoiler_settings();
      AUTH_KEY = "trakt_auth";
      EVENT = "lumio-trakt-auth-changed";
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
      window.dispatchEvent(new CustomEvent(EVENT2));
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
  function addToMovieWatchlist(entry, options) {
    const normalizedEntry = {
      ...entry,
      tmdbId: normalizeTmdbId(entry.tmdbId)
    };
    const list = read().filter(
      (e) => e.tmdbId !== normalizedEntry.tmdbId && !(normalizedEntry.imdbId && e.imdbId && e.imdbId === normalizedEntry.imdbId)
    );
    const nextEntry = { ...normalizedEntry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
    write([...list, nextEntry]);
    emitMutation({
      action: "add",
      entry: nextEntry,
      source: options?.source ?? "local"
    });
  }
  var KEY, EVENT2, DETAIL_EVENT;
  var init_movie_watchlist = __esm({
    "lib/movie-watchlist.ts"() {
      init_profile_storage_shim();
      KEY = "movie_watchlist";
      EVENT2 = "lumio-movie-watchlist-changed";
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
      window.dispatchEvent(new CustomEvent(EVENT3));
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
  function addToWatchlist(entry, options) {
    const list = read2().filter(
      (e) => e.tmdbId !== entry.tmdbId && !(entry.imdbId && e.imdbId && e.imdbId === entry.imdbId)
    );
    const nextEntry = { ...entry, addedAt: (/* @__PURE__ */ new Date()).toISOString() };
    write2([...list, nextEntry]);
    emitMutation2({
      action: "add",
      entry: nextEntry,
      source: options?.source ?? "local"
    });
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
  var KEY2, LEGACY_KEY, EVENT3, DETAIL_EVENT2;
  var init_watchlist = __esm({
    "lib/watchlist.ts"() {
      "use strict";
      init_profile_storage_shim();
      KEY2 = "watchlist_items";
      LEGACY_KEY = "rd_watchlist";
      EVENT3 = "lumio-watchlist-changed";
      DETAIL_EVENT2 = "lumio-watchlist-mutated";
    }
  });

  // lib/watched-episodes.ts
  function epKey(tmdbId, season, episode) {
    return `${tmdbId}-S${season}E${episode}`;
  }
  function read3() {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(getScopedStorageItem(KEY3) ?? "{}");
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
  function write3(data) {
    setScopedStorageItem(KEY3, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT4));
    }
  }
  function timestampOf(value) {
    return typeof value === "string" ? value : void 0;
  }
  function getWatchedForSeries(tmdbId) {
    const data = read3();
    const prefix = `${tmdbId}-`;
    return new Set(Object.keys(data).filter((k) => k.startsWith(prefix)));
  }
  function parseEpKey(key) {
    const match = key.match(/^(.+)-S(\d+)E(\d+)$/);
    if (!match) return null;
    return { tmdbId: match[1], season: Number(match[2]), episode: Number(match[3]) };
  }
  function getWatchedEpisodes() {
    return Object.entries(read3()).map(([key, value]) => {
      const parsed = parseEpKey(key);
      if (!parsed) return null;
      return { ...parsed, watchedAt: timestampOf(value) };
    }).filter((entry) => Boolean(entry));
  }
  function applyRemoteWatchedEpisodes(remote, options) {
    const data = read3();
    const remoteKeys = /* @__PURE__ */ new Set();
    let added = 0;
    let removed = 0;
    for (const episode of remote) {
      const key = epKey(episode.tmdbId, episode.season, episode.episode);
      remoteKeys.add(key);
      const next = episode.watchedAt ?? data[key] ?? true;
      if (data[key] === next) continue;
      data[key] = next;
      added += 1;
    }
    for (const [key, value] of Object.entries(data)) {
      if (remoteKeys.has(key)) continue;
      const parsed = parseEpKey(key);
      if (!parsed) continue;
      if (options?.keepLocal?.({ ...parsed, watchedAt: timestampOf(value) })) continue;
      delete data[key];
      removed += 1;
    }
    if (added > 0 || removed > 0) write3(data);
    return { added, removed };
  }
  var KEY3, EVENT4;
  var init_watched_episodes = __esm({
    "lib/watched-episodes.ts"() {
      "use strict";
      init_profile_storage_shim();
      KEY3 = "watched_episodes";
      EVENT4 = "lumio-watched-episodes-changed";
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
  function applyRemoteWatchedMovies(remote, options) {
    if (typeof window === "undefined") return { kept: 0, removed: 0 };
    const current = readEntries();
    const next = [];
    for (const movie of remote) {
      const tmdbId = normalizeId(movie.tmdbId);
      const imdbId = normalizeId(movie.imdbId);
      const title = movie.title ?? null;
      const year = normalizeYear(movie.year);
      if (!tmdbId && !imdbId && !(normalizeTitle(title) && year != null)) continue;
      if (next.some((entry) => sameMovie(entry, { tmdbId, imdbId, title, year }))) continue;
      const existing = current.find((entry) => sameMovie(entry, { tmdbId, imdbId, title, year }));
      next.push({
        tmdbId,
        imdbId,
        title,
        year,
        posterUrl: movie.posterUrl ?? existing?.posterUrl ?? null,
        watchedAt: movie.watchedAt ?? existing?.watchedAt ?? (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    let removed = 0;
    for (const entry of current) {
      if (next.some((kept) => sameMovie(kept, entry))) continue;
      if (options?.keepLocal?.(entry)) {
        next.push(entry);
        continue;
      }
      removed += 1;
    }
    writeEntries(next);
    return { kept: next.length, removed };
  }
  var KEY_WATCHED_MOVIES, EVENT_WATCHED_MOVIES_CHANGED;
  var init_watched_movies = __esm({
    "lib/watched-movies.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      KEY_WATCHED_MOVIES = "watched_movies";
      EVENT_WATCHED_MOVIES_CHANGED = "lumio-watched-movies-changed";
    }
  });

  // lib/trakt-watchlist-limit.ts
  function readTraktLimitState() {
    try {
      const raw = getScopedStorageItem(LIMIT_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.at !== "number") return null;
      return {
        at: parsed.at,
        retryAfter: typeof parsed.retryAfter === "number" ? parsed.retryAfter : 0,
        unsyncedShows: Array.isArray(parsed.unsyncedShows) ? parsed.unsyncedShows.filter((v) => typeof v === "string") : [],
        unsyncedMovies: Array.isArray(parsed.unsyncedMovies) ? parsed.unsyncedMovies.filter((v) => typeof v === "string") : [],
        reported: parsed.reported
      };
    } catch {
      return null;
    }
  }
  function recordTraktLimitHit(mediaType, refusedIds) {
    const previous = readTraktLimitState();
    const now = Date.now();
    try {
      setScopedStorageItem(LIMIT_STATE_KEY, JSON.stringify({
        at: now,
        retryAfter: now + LIMIT_BACKOFF_MS,
        unsyncedShows: mediaType === "show" ? [...refusedIds] : previous?.unsyncedShows ?? [],
        unsyncedMovies: mediaType === "movie" ? [...refusedIds] : previous?.unsyncedMovies ?? [],
        reported: previous?.reported
      }));
    } catch {
    }
  }
  function clearTraktLimitHit(mediaType) {
    const previous = readTraktLimitState();
    if (!previous) return;
    const unsyncedShows = mediaType === "show" ? [] : previous.unsyncedShows;
    const unsyncedMovies = mediaType === "movie" ? [] : previous.unsyncedMovies;
    try {
      if (unsyncedShows.length === 0 && unsyncedMovies.length === 0) {
        setScopedStorageItem(LIMIT_STATE_KEY, "");
        return;
      }
      setScopedStorageItem(LIMIT_STATE_KEY, JSON.stringify({
        ...previous,
        unsyncedShows,
        unsyncedMovies
      }));
    } catch {
    }
  }
  function getTraktLimitSummary() {
    const state = readTraktLimitState();
    if (!state) {
      return { hit: false, unsyncedShows: 0, unsyncedMovies: 0, total: 0, limit: null, used: null };
    }
    const unsyncedShows = state.unsyncedShows.length;
    const unsyncedMovies = state.unsyncedMovies.length;
    return {
      hit: unsyncedShows + unsyncedMovies > 0,
      unsyncedShows,
      unsyncedMovies,
      total: unsyncedShows + unsyncedMovies,
      limit: readReportedWatchlistLimit(state.reported),
      used: null
    };
  }
  function readReportedWatchlistLimit(reported) {
    if (!reported || typeof reported !== "object") return null;
    const root = reported;
    const candidates = [
      root.watchlist?.item_count,
      root.list?.item_count,
      root.item_count
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
        return candidate;
      }
    }
    return null;
  }
  var LIMIT_STATE_KEY, LIMIT_BACKOFF_MS;
  var init_trakt_watchlist_limit = __esm({
    "lib/trakt-watchlist-limit.ts"() {
      "use strict";
      "use client";
      init_profile_storage_shim();
      LIMIT_STATE_KEY = "trakt_watchlist_limit";
      LIMIT_BACKOFF_MS = 24 * 60 * 6e4;
    }
  });

  // lib/watchlist-item-cache.ts
  function buildKey(tmdbId, type) {
    return `${type}:${tmdbId}`;
  }
  function read4() {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(getScopedStorageItem(KEY4) ?? "{}");
    } catch {
      return {};
    }
  }
  function write4(cache3) {
    setScopedStorageItem(KEY4, JSON.stringify(cache3));
  }
  function cacheWatchlistItems(items2) {
    if (typeof window === "undefined" || items2.length === 0) return;
    const cache3 = read4();
    let changed = false;
    for (const { tmdbId, item } of items2) {
      if (!tmdbId || !item) continue;
      cache3[buildKey(tmdbId, item.type)] = item;
      changed = true;
    }
    if (changed) write4(cache3);
  }
  var KEY4;
  var init_watchlist_item_cache = __esm({
    "lib/watchlist-item-cache.ts"() {
      init_profile_storage_shim();
      KEY4 = "watchlist_item_cache";
    }
  });

  // lib/trakt-sync.ts
  async function readTraktError(response, fallback) {
    try {
      const payload = await response.clone().json();
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  }
  async function isLimitPayload(response) {
    try {
      const payload = await response.clone().json();
      return payload.limitExceeded === true;
    } catch {
      return false;
    }
  }
  function isTraktAccountLimitError(error) {
    return error instanceof TraktAccountLimitError;
  }
  async function accountLimitErrorFor(response, operation, mediaType, refusedIds, message) {
    if (response.status !== 420 && !await isLimitPayload(response)) return null;
    logTraktSync(
      `${operation}: AVVISAT AV TRAKT (420) f\xF6r ${refusedIds.length || "ok\xE4nt antal"} poster. Operationen var ${operation}${mediaType ? `/${mediaType}` : ""} \u2014 inte n\xE5gon annan. Datan finns kvar lokalt. Orsak: ${message}`
    );
    return new TraktAccountLimitError(operation, mediaType, refusedIds, message);
  }
  async function traktPost(input, init) {
    const response = await fetch(input, init);
    if (response.status === 401) {
      const payload = await response.clone().json().catch(() => null);
      if (payload?.authExpired) clearTraktAuth();
    }
    return response;
  }
  function applyAuthUpdate(nextAuth) {
    if (!nextAuth) return getTraktAuth();
    const merged = {
      accessToken: nextAuth.accessToken,
      refreshToken: nextAuth.refreshToken,
      expiresAt: nextAuth.expiresAt,
      scope: nextAuth.scope ?? "",
      tokenType: nextAuth.tokenType ?? "bearer",
      username: nextAuth.username ?? null,
      name: nextAuth.name ?? null
    };
    const current = getTraktAuth();
    if (current?.accessToken === merged.accessToken) return merged;
    setTraktAuth(merged);
    return merged;
  }
  function watchedEpisodeKey(entry) {
    return `${entry.imdbId ? `imdb:${entry.imdbId}` : `tmdb:${entry.tmdbId ?? ""}`}:S${entry.season}E${entry.episode}`;
  }
  function watchedMovieKey(entry) {
    if (entry.imdbId) return `imdb:${entry.imdbId}`;
    if (entry.tmdbId) return `tmdb:${entry.tmdbId}`;
    return `title:${entry.title ?? ""}:${entry.year ?? ""}`;
  }
  function sameWatchlistEntry(left, right) {
    return Boolean(
      left.tmdbId && right.tmdbId && left.tmdbId === right.tmdbId || left.imdbId && right.imdbId && left.imdbId === right.imdbId
    );
  }
  function scheduleWatchlistPrefetch(entries) {
    if (typeof window === "undefined" || entries.length === 0) return;
    const uniqueEntries = Array.from(
      new Map(
        entries.filter((entry) => entry.tmdbId).map((entry) => [`${entry.type}:${entry.tmdbId}`, entry])
      ).values()
    );
    window.setTimeout(() => {
      void prefetchWatchlistItems(uniqueEntries);
    }, TRAKT_WATCHLIST_PREFETCH_DELAY_MS);
  }
  async function prefetchWatchlistItems(entries) {
    for (let start = 0; start < entries.length; start += TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE) {
      const batch = entries.slice(start, start + TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE);
      const updates = await Promise.all(
        batch.map(async (entry) => {
          try {
            const response = await fetch(`/api/item?tmdbId=${entry.tmdbId}&type=${entry.type}`);
            if (!response.ok) return { tmdbId: entry.tmdbId, item: null };
            const payload = await response.json();
            return { tmdbId: entry.tmdbId, item: payload.item ?? null };
          } catch {
            return { tmdbId: entry.tmdbId, item: null };
          }
        })
      );
      cacheWatchlistItems(updates);
    }
  }
  function clearPendingTraktSync() {
    pendingShowEntries.clear();
    pendingMovieEntries.clear();
    pendingWatchedEpisodes.clear();
    pendingWatchedMovies.clear();
    if (autoSyncTimer && typeof window !== "undefined") {
      window.clearTimeout(autoSyncTimer);
    }
    autoSyncTimer = null;
    autoSyncBackoffUntil = 0;
  }
  async function fetchTraktProfile() {
    const auth = getTraktAuth();
    if (!auth) return null;
    const response = await traktPost("/api/trakt/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) return auth;
    const payload = await response.json();
    if (!payload.auth) return auth;
    return applyAuthUpdate({
      accessToken: payload.auth.accessToken,
      refreshToken: payload.auth.refreshToken,
      expiresAt: payload.auth.expiresAt,
      scope: payload.auth.scope,
      tokenType: payload.auth.tokenType,
      username: payload.profile?.username ?? payload.auth?.username ?? null,
      name: payload.profile?.name ?? payload.auth?.name ?? null
    });
  }
  function logTraktSync(message) {
    if (typeof window === "undefined") return;
    void fetch(`/api/debug-log?msg=${encodeURIComponent(`[trakt-sync] ${message}`)}`).catch(() => {
    });
  }
  async function importTraktWatched() {
    const auth = getTraktAuth();
    if (!auth) return 0;
    const startedAt = Date.now();
    const response = await traktPost("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth, action: "import" })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to import watched episodes from Trakt"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    const remoteEpisodes = payload.episodes ?? [];
    const remoteMovies = payload.movies ?? [];
    const fetchedAt = Date.now();
    const episodeResult = applyRemoteWatchedEpisodes(remoteEpisodes, {
      keepLocal: () => true
    });
    const movieResult = applyRemoteWatchedMovies(remoteMovies, {
      keepLocal: () => true
    });
    logTraktSync(
      `watched: ${remoteEpisodes.length} avsnitt (+${episodeResult.added}/-${episodeResult.removed}), ${remoteMovies.length} filmer (-${movieResult.removed}) \u2014 h\xE4mtning ${((fetchedAt - startedAt) / 1e3).toFixed(1)}s, skrivning ${((Date.now() - fetchedAt) / 1e3).toFixed(1)}s`
    );
    return remoteEpisodes.length + remoteMovies.length;
  }
  async function fetchTraktWatchedSnapshot() {
    const auth = getTraktAuth();
    if (!auth) return null;
    const response = await traktPost("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth, action: "import" })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return { episodes: payload.episodes ?? [], movies: payload.movies ?? [] };
  }
  async function markTraktEpisodesWatched(input) {
    const auth = getTraktAuth();
    if (!auth || input.length === 0) return false;
    const response = await traktPost("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: "mark_watched",
        episodes: input
      })
    });
    if (!response.ok) {
      const message = await readTraktError(response, "Failed to push watched episodes to Trakt");
      const limit = await accountLimitErrorFor(response, "history", null, [], message);
      if (limit) throw limit;
      logTraktSync(`history push (avsnitt): MISSLYCKADES (${response.status}) \u2014 ${message}`);
      throw new Error(message);
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function markTraktMoviesWatched(input) {
    const auth = getTraktAuth();
    if (!auth || input.length === 0) return false;
    const response = await traktPost("/api/trakt/sync/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: "mark_watched",
        movies: input
      })
    });
    if (!response.ok) {
      const message = await readTraktError(response, "Failed to push watched movies to Trakt");
      const limit = await accountLimitErrorFor(response, "history", null, [], message);
      if (limit) throw limit;
      logTraktSync(`history push (filmer): MISSLYCKADES (${response.status}) \u2014 ${message}`);
      throw new Error(message);
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function importTraktWatchlist() {
    const auth = getTraktAuth();
    if (!auth) {
      logTraktSync("watchlist pull: avst\xE5r \u2014 ingen Trakt-auth");
      return { shows: 0, movies: 0, snapshot: { shows: [], movies: [] }, localOnly: { shows: 0, movies: 0 } };
    }
    const startedAt = Date.now();
    const response = await traktPost("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to import Trakt watchlist"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    const remoteShows = payload.shows ?? [];
    const remoteMovies = payload.movies ?? [];
    const localShows = getWatchlist();
    const localMovies = getMovieWatchlist();
    const localOnlyShows = localShows.filter(
      (localEntry) => !remoteShows.some((remoteEntry) => sameWatchlistEntry(localEntry, remoteEntry))
    );
    const localOnlyMovies = localMovies.filter(
      (localEntry) => !remoteMovies.some((remoteEntry) => sameWatchlistEntry(localEntry, remoteEntry))
    );
    let addedShows = 0;
    for (const show of remoteShows) {
      if (localShows.some((localEntry) => sameWatchlistEntry(localEntry, show))) continue;
      addToWatchlist(show, { source: "trakt" });
      addedShows += 1;
    }
    let addedMovies = 0;
    for (const movie of remoteMovies) {
      if (localMovies.some((localEntry) => sameWatchlistEntry(localEntry, movie))) continue;
      addToMovieWatchlist({
        ...movie,
        monitorForStreams: false
      }, { source: "trakt" });
      addedMovies += 1;
    }
    scheduleWatchlistPrefetch([
      ...remoteShows.map((entry) => ({ tmdbId: entry.tmdbId, type: "tv" })),
      ...remoteMovies.map((entry) => ({ tmdbId: entry.tmdbId, type: "movie" }))
    ]);
    logTraktSync(
      `watchlist pull: trakt=${remoteShows.length}s/${remoteMovies.length}f, lokalt=${localShows.length}s/${localMovies.length}f, nya lokalt=+${addedShows}s/+${addedMovies}f, endast lokalt (ska pushas upp)=${localOnlyShows.length}s/${localOnlyMovies.length}f${localOnlyShows.length > 0 ? ` [${localOnlyShows.map((e) => e.tmdbId).join(",").slice(0, 200)}]` : ""} \u2014 ${((Date.now() - startedAt) / 1e3).toFixed(1)}s`
    );
    return {
      shows: remoteShows.length,
      movies: remoteMovies.length,
      snapshot: {
        shows: remoteShows,
        movies: remoteMovies
      },
      localOnly: {
        shows: localOnlyShows.length,
        movies: localOnlyMovies.length
      }
    };
  }
  async function fetchTraktWatchlistSnapshot() {
    const auth = getTraktAuth();
    if (!auth) return { shows: [], movies: [] };
    const response = await traktPost("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth })
    });
    if (!response.ok) {
      throw new Error(await readTraktError(response, "Failed to fetch Trakt watchlist snapshot"));
    }
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return {
      shows: payload.shows ?? [],
      movies: payload.movies ?? []
    };
  }
  async function syncTraktWatchlistItems(input) {
    const auth = getTraktAuth();
    if (!auth || input.entries.length === 0) {
      logTraktSync(
        `watchlist ${input.action} ${input.mediaType}: avst\xE5r \u2014 ${!auth ? "ingen Trakt-auth" : "tom lista"}`
      );
      return false;
    }
    const response = await traktPost("/api/trakt/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth,
        action: input.action,
        mediaType: input.mediaType,
        entries: input.entries
      })
    });
    if (!response.ok) {
      const message = await readTraktError(response, "Failed to sync watchlist items to Trakt");
      const refusedIds = input.entries.map((entry) => entry.tmdbId).filter((id) => Boolean(id));
      const limit = await accountLimitErrorFor(response, "watchlist", input.mediaType, refusedIds, message);
      if (limit) {
        if (input.action === "add") recordTraktLimitHit(input.mediaType, refusedIds);
        throw limit;
      }
      logTraktSync(
        `watchlist ${input.action} ${input.mediaType}: MISSLYCKADES (${response.status}) f\xF6r ${input.entries.length} poster \u2014 ${message}`
      );
      throw new Error(message);
    }
    logTraktSync(
      `watchlist ${input.action} ${input.mediaType}: skickade ${input.entries.length} poster, Trakt svarade OK`
    );
    if (input.action === "add") clearTraktLimitHit(input.mediaType);
    const payload = await response.json();
    applyAuthUpdate(payload.auth);
    return true;
  }
  async function syncLocalDataToTrakt(remoteSnapshot) {
    const auth = getTraktAuth();
    if (!auth) {
      logTraktSync("push: avst\xE5r \u2014 ingen Trakt-auth");
      return { shows: 0, movies: 0, watchedEpisodes: 0, watchedMovies: 0 };
    }
    clearTraktLimitHit("show");
    clearTraktLimitHit("movie");
    const remote = remoteSnapshot ?? await fetchTraktWatchlistSnapshot();
    const shows = getWatchlist().filter((entry) => Boolean(entry.tmdbId || entry.imdbId));
    const movies = getMovieWatchlist().filter((entry) => Boolean(entry.tmdbId || entry.imdbId));
    const missingShows = shows.filter((entry) => !remote.shows.some((remoteEntry) => sameWatchlistEntry(entry, remoteEntry)));
    const missingMovies = movies.filter((entry) => !remote.movies.some((remoteEntry) => sameWatchlistEntry(entry, remoteEntry)));
    logTraktSync(
      `watchlist push: lokalt=${shows.length}s/${movies.length}f, trakt=${remote.shows.length}s/${remote.movies.length}f, saknas hos trakt=${missingShows.length}s/${missingMovies.length}f${missingShows.length > 0 ? ` [${missingShows.map((e) => e.tmdbId).join(",").slice(0, 200)}]` : ""}${missingShows.length === 0 && missingMovies.length === 0 ? " \u2014 inget att pusha" : ""}`
    );
    const pushWatchlist = async (mediaType, entries) => {
      if (entries.length === 0) return true;
      try {
        return await syncTraktWatchlistItems({ mediaType, action: "add", entries });
      } catch (error) {
        if (isTraktAccountLimitError(error)) return false;
        throw error;
      }
    };
    const syncedShows = await pushWatchlist("show", missingShows);
    const syncedMovies = await pushWatchlist("movie", missingMovies);
    if (missingShows.length > 0 || missingMovies.length > 0) {
      const confirmed = await fetchTraktWatchlistSnapshot().catch(() => null);
      if (!confirmed) {
        logTraktSync("watchlist push: kunde inte l\xE4sa tillbaka listan \u2014 pushen \xE4r OBEKR\xC4FTAD");
      } else {
        const confirmedShows = new Set(confirmed.shows.map((entry) => entry.tmdbId));
        const confirmedMovies = new Set(confirmed.movies.map((entry) => entry.tmdbId));
        const rejectedShows = missingShows.filter((entry) => !confirmedShows.has(entry.tmdbId));
        const rejectedMovies = missingMovies.filter((entry) => !confirmedMovies.has(entry.tmdbId));
        logTraktSync(
          `watchlist push verifierad: trakt har nu ${confirmed.shows.length}s/${confirmed.movies.length}f, bekr\xE4ftade ${missingShows.length - rejectedShows.length}/${missingShows.length}s och ${missingMovies.length - rejectedMovies.length}/${missingMovies.length}f${rejectedShows.length > 0 ? `, AVVISADE serier=[${rejectedShows.map((e) => `${e.tmdbId}:${e.title}`).join(", ").slice(0, 300)}]` : ""}${rejectedMovies.length > 0 ? `, AVVISADE filmer=[${rejectedMovies.map((e) => `${e.tmdbId}:${e.title}`).join(", ").slice(0, 300)}]` : ""}`
        );
      }
    }
    const watchedRemote = await fetchTraktWatchedSnapshot();
    if (!watchedRemote) {
      logTraktSync("watched push: avst\xE5r \u2014 kunde inte l\xE4sa sedd-historik fr\xE5n Trakt");
      return {
        shows: syncedShows ? missingShows.length : 0,
        movies: syncedMovies ? missingMovies.length : 0,
        watchedEpisodes: 0,
        watchedMovies: 0
      };
    }
    const remoteEpisodeKeys = new Set(watchedRemote.episodes.map((entry) => watchedEpisodeKey(entry)));
    const remoteMovieKeys = new Set(watchedRemote.movies.map((entry) => watchedMovieKey(entry)));
    const watchedEpisodes = getWatchedEpisodes().filter((entry) => Boolean(entry.tmdbId) && !remoteEpisodeKeys.has(watchedEpisodeKey(entry))).slice(0, TRAKT_WATCHED_PUSH_LIMIT);
    const watchedMovies = getWatchedMovies().filter((entry) => Boolean(entry.tmdbId || entry.imdbId) && !remoteMovieKeys.has(watchedMovieKey(entry))).slice(0, TRAKT_WATCHED_PUSH_LIMIT);
    logTraktSync(
      `watched push: lokalt=${getWatchedEpisodes().length} avsnitt/${getWatchedMovies().length} filmer, trakt=${watchedRemote.episodes.length}/${watchedRemote.movies.length}, pushar ${watchedEpisodes.length}/${watchedMovies.length} (tak ${TRAKT_WATCHED_PUSH_LIMIT} per k\xF6rning)`
    );
    const pushHistory = async (push) => {
      try {
        return await push();
      } catch (error) {
        if (isTraktAccountLimitError(error)) return false;
        throw error;
      }
    };
    const syncedWatchedEpisodes = watchedEpisodes.length > 0 ? await pushHistory(() => markTraktEpisodesWatched(watchedEpisodes)) : true;
    const syncedWatchedMovies = watchedMovies.length > 0 ? await pushHistory(() => markTraktMoviesWatched(watchedMovies)) : true;
    autoSyncBackoffUntil = 0;
    return {
      shows: syncedShows ? missingShows.length : 0,
      movies: syncedMovies ? missingMovies.length : 0,
      watchedEpisodes: syncedWatchedEpisodes ? watchedEpisodes.length : 0,
      watchedMovies: syncedWatchedMovies ? watchedMovies.length : 0
    };
  }
  var TraktAccountLimitError, pendingShowEntries, pendingMovieEntries, pendingWatchedEpisodes, pendingWatchedMovies, autoSyncTimer, autoSyncBackoffUntil, TRAKT_WATCHLIST_PREFETCH_DELAY_MS, TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE, TRAKT_WATCHED_PUSH_LIMIT;
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
      TraktAccountLimitError = class extends Error {
        constructor(operation, mediaType, refusedIds, message) {
          super(message);
          __publicField(this, "limitExceeded", true);
          __publicField(this, "refusedIds");
          __publicField(this, "mediaType");
          /// WHICH operation Trakt refused. The whole reason this field exists: a 420
          /// from `/sync/history` used to surface in the Trakt settings section as a
          /// bare "Trakt request failed (420)", which read as a refused watchlist push.
          /// The two have completely different causes, different caps, and different
          /// advice for the user.
          __publicField(this, "operation");
          this.name = "TraktAccountLimitError";
          this.operation = operation;
          this.mediaType = mediaType;
          this.refusedIds = refusedIds;
        }
      };
      pendingShowEntries = /* @__PURE__ */ new Map();
      pendingMovieEntries = /* @__PURE__ */ new Map();
      pendingWatchedEpisodes = /* @__PURE__ */ new Map();
      pendingWatchedMovies = /* @__PURE__ */ new Map();
      autoSyncTimer = null;
      autoSyncBackoffUntil = 0;
      TRAKT_WATCHLIST_PREFETCH_DELAY_MS = 250;
      TRAKT_WATCHLIST_PREFETCH_BATCH_SIZE = 6;
      TRAKT_WATCHED_PUSH_LIMIT = 200;
    }
  });

  // lib/watchlist-auto-remove.ts
  function isAutoRemoveWatchedMoviesEnabled() {
    if (typeof window === "undefined") return false;
    return getScopedStorageItem(KEY_ENABLED) !== "false";
  }
  function setAutoRemoveWatchedMoviesEnabled(enabled) {
    setScopedStorageItem(KEY_ENABLED, enabled ? "true" : "false");
    if (enabled) sweepWatchedMoviesFromWatchlist();
  }
  function isAutoUnfollowFinishedSeriesEnabled() {
    if (typeof window === "undefined") return false;
    return getScopedStorageItem(KEY_UNFOLLOW_SERIES) === "true";
  }
  function setAutoUnfollowFinishedSeriesEnabled(enabled) {
    setScopedStorageItem(KEY_UNFOLLOW_SERIES, enabled ? "true" : "false");
    if (enabled) void sweepFinishedSeriesFromWatchlist();
  }
  async function hasWatchedFinalSeason(tmdbId) {
    try {
      const response = await fetch(`/api/tv-info?tmdbId=${tmdbId}`);
      if (!response.ok) return false;
      const info = await response.json();
      const aired = (info.seasons ?? []).filter((s) => s.season_number > 0 && s.episode_count > 0);
      if (aired.length === 0) return false;
      const final = aired.reduce((a, b) => b.season_number > a.season_number ? b : a);
      const watched = getWatchedForSeries(tmdbId);
      for (let episode = 1; episode <= final.episode_count; episode += 1) {
        if (!watched.has(`${tmdbId}-S${final.season_number}E${episode}`)) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  async function sweepFinishedSeriesFromWatchlist() {
    if (typeof window === "undefined") return 0;
    if (!isAutoUnfollowFinishedSeriesEnabled()) return 0;
    const removed = [];
    for (const entry of getWatchlist()) {
      if (await hasWatchedFinalSeason(entry.tmdbId)) {
        removeFromWatchlist(entry.tmdbId);
        removed.push(entry.title);
      }
    }
    if (removed.length > 0) {
      void fetch(
        `/api/debug-log?msg=${encodeURIComponent(
          `[watchlist-auto-remove] avf\xF6ljde ${removed.length} genomsedda serier: ${removed.slice(0, 10).join(", ")}`
        )}`
      ).catch(() => {
      });
    }
    return removed.length;
  }
  function normalizeTitle2(value) {
    if (typeof value !== "string") return null;
    const normalized = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalized.length > 0 ? normalized : null;
  }
  function isSameMovie(watchlistEntry, watched) {
    if (!watched.tmdbId || watched.tmdbId !== watchlistEntry.tmdbId) return false;
    const a = normalizeTitle2(watchlistEntry.title);
    const b = normalizeTitle2(watched.title);
    if (!a || !b) return true;
    return a === b;
  }
  function sweepWatchedMoviesFromWatchlist() {
    if (typeof window === "undefined") return 0;
    if (!isAutoRemoveWatchedMoviesEnabled()) return 0;
    const watched = getWatchedMovies();
    if (watched.length === 0) return 0;
    const removed = [];
    for (const entry of getWatchlist()) {
      if (watched.some((w) => isSameMovie(entry, w))) {
        removeFromWatchlist(entry.tmdbId);
        removed.push(entry.title);
      }
    }
    if (removed.length > 0) {
      void fetch(
        `/api/debug-log?msg=${encodeURIComponent(
          `[watchlist-auto-remove] tog bort ${removed.length} sedda filmer: ${removed.slice(0, 10).join(", ")}`
        )}`
      ).catch(() => {
      });
    }
    return removed.length;
  }
  var KEY_ENABLED, KEY_UNFOLLOW_SERIES;
  var init_watchlist_auto_remove = __esm({
    "lib/watchlist-auto-remove.ts"() {
      "use strict";
      "use client";
      init_watchlist();
      init_watched_movies();
      init_watched_episodes();
      init_profile_storage_shim();
      KEY_ENABLED = "auto_remove_watched_movies";
      KEY_UNFOLLOW_SERIES = "auto_unfollow_finished_series";
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
        const { invoke: invoke6 } = await Promise.resolve().then(() => __toESM(require_core()));
        await invoke6("open_external_url", { url });
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
      "use client";
      init_tauri_mpv();
      isAndroidTauri = isTauriEnv && typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    }
  });

  // lib/trakt-device-login.tsx
  function traktActivationUrl(verificationUrl) {
    return (verificationUrl || DEFAULT_VERIFICATION_URL).trim().replace(/\/+$/, "");
  }
  function waitForNextPoll(ms) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      let done = false;
      let timer2 = setTimeout(() => finish(), ms);
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer2);
        document.removeEventListener("visibilitychange", wake);
        window.removeEventListener("focus", wake);
        resolve();
      };
      const wake = () => {
        if (done) return;
        if (document.visibilityState === "hidden") return;
        const elapsed = Date.now() - startedAt;
        if (elapsed >= WAKE_MIN_DELAY_MS) {
          finish();
          return;
        }
        clearTimeout(timer2);
        timer2 = setTimeout(() => finish(), WAKE_MIN_DELAY_MS - elapsed);
      };
      document.addEventListener("visibilitychange", wake);
      window.addEventListener("focus", wake);
    });
  }
  function useTraktDeviceLogin(options = {}) {
    const { t } = useLang();
    const [phase, setPhase] = useState("idle");
    const [userCode, setUserCode] = useState("");
    const [verificationUrl, setVerificationUrl] = useState("");
    const [noticeKey, setNoticeKey] = useState(null);
    const [errorKey, setErrorKey] = useState(null);
    const runRef = useRef(0);
    const onConnectedRef = useRef(options.onConnected);
    onConnectedRef.current = options.onConnected;
    useEffect(() => {
      return () => {
        runRef.current += 1;
      };
    }, []);
    const cancel = useCallback(() => {
      runRef.current += 1;
      setPhase("idle");
      setUserCode("");
      setVerificationUrl("");
      setNoticeKey(null);
      setErrorKey(null);
    }, []);
    const start = useCallback(() => {
      const run = ++runRef.current;
      const alive = () => runRef.current === run;
      setPhase("starting");
      setUserCode("");
      setVerificationUrl("");
      setNoticeKey(null);
      setErrorKey(null);
      const fail = (key) => {
        if (!alive()) return;
        runRef.current += 1;
        setErrorKey(key);
        setNoticeKey(null);
        setPhase("error");
      };
      void (async () => {
        let payload;
        try {
          const response = await fetch("/api/trakt/device/start", { method: "POST" });
          payload = await response.json();
          if (!response.ok || !payload.device_code || !payload.user_code) {
            fail(payload.code ? networkErrorKey(payload.code) : "traktStartLoginFailed");
            return;
          }
        } catch {
          fail("traktStartLoginFailed");
          return;
        }
        if (!alive()) return;
        const deviceCode = payload.device_code;
        const baseIntervalMs = Math.max(MIN_POLL_INTERVAL_MS, (payload.interval ?? 5) * 1e3);
        const deadline = Date.now() + (payload.expires_in ?? DEFAULT_EXPIRES_IN_S) * 1e3;
        setUserCode(payload.user_code);
        setVerificationUrl(payload.verification_url || DEFAULT_VERIFICATION_URL);
        setPhase("waiting");
        let delay = baseIntervalMs;
        let networkFailures = 0;
        while (alive()) {
          await waitForNextPoll(delay);
          if (!alive()) return;
          if (Date.now() > deadline) {
            fail("traktCodeExpired");
            return;
          }
          let status = 0;
          let body = {};
          try {
            const response = await fetch("/api/trakt/device/poll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ deviceCode })
            });
            status = response.status;
            body = await response.json().catch(() => ({}));
          } catch {
            status = 0;
          }
          if (!alive()) return;
          if (status === 200 && body.ok && body.auth) {
            runRef.current += 1;
            setTraktAuth(body.auth);
            setUserCode("");
            setVerificationUrl("");
            setNoticeKey(null);
            setErrorKey(null);
            setPhase("idle");
            try {
              await onConnectedRef.current?.(body.auth);
            } catch {
            }
            return;
          }
          if (status === 0 || status === 502 || status === 503 || status === 504) {
            networkFailures += 1;
            if (networkFailures >= MAX_NETWORK_FAILURES) {
              fail(networkErrorKey(body.code));
              return;
            }
            setNoticeKey("traktNetworkRetrying");
            delay = Math.min(delay * 2, MAX_POLL_INTERVAL_MS);
            continue;
          }
          networkFailures = 0;
          switch (status) {
            case 400:
              setNoticeKey(null);
              delay = baseIntervalMs;
              continue;
            case 429:
              setNoticeKey(null);
              delay = Math.min(Math.round(delay * 1.5) + 1e3, MAX_POLL_INTERVAL_MS);
              continue;
            case 404:
              fail("traktCodeInvalid");
              return;
            case 409:
              fail("traktCodeAlreadyUsed");
              return;
            case 410:
              fail("traktCodeExpired");
              return;
            case 418:
              fail("traktLoginDenied");
              return;
            default:
              fail("traktLoginFailed");
              return;
          }
        }
      })();
    }, []);
    return {
      phase,
      userCode,
      verificationUrl,
      activationUrl: traktActivationUrl(verificationUrl),
      notice: noticeKey ? t(noticeKey) : "",
      error: errorKey ? t(errorKey) : "",
      start,
      cancel
    };
  }
  function networkErrorKey(code) {
    return code === "trakt_timeout" ? "traktNetworkTimeout" : "traktNetworkUnreachable";
  }
  async function copyToClipboard(value) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
    }
    try {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "true");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }
  function TraktDeviceCodePanel({
    userCode,
    verificationUrl,
    notice,
    waiting = true
  }) {
    const { t } = useLang();
    const [copied, setCopied] = useState(false);
    const activationUrl = traktActivationUrl(verificationUrl);
    return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-[0.18em] text-emerald-300", children: t("traktOpenLinkAndCode") }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => void openExternalUrl(activationUrl),
          className: "mt-2 w-full rounded-full bg-emerald-400/20 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-400/30 sm:w-auto",
          children: t("traktOpenActivationPage")
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "mt-1 break-all text-[11px] text-slate-300/70", children: activationUrl }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-semibold tracking-[0.22em] text-emerald-200", children: userCode }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => {
              void copyToClipboard(userCode).then((ok) => {
                if (!ok) return;
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2e3);
              });
            },
            className: "rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/30 hover:text-white",
            children: copied ? t("traktCodeCopied") : t("traktCopyCode")
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("ol", { className: "mt-3 space-y-1 text-[12px] leading-5 text-slate-200/85", children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "1. ",
          t("traktStepOpen")
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "2. ",
          t("traktStepEnterCode")
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "3. ",
          t("traktStepComeBack")
        ] })
      ] }),
      waiting ? /* @__PURE__ */ jsxs("p", { className: "mt-3 flex items-center gap-2 text-[12px] text-emerald-200", children: [
        /* @__PURE__ */ jsx("span", { className: "inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300", "aria-hidden": true }),
        t("traktWaitingForApproval")
      ] }) : null,
      notice ? /* @__PURE__ */ jsx("p", { className: "mt-2 text-[12px] text-amber-200/90", children: notice }) : null
    ] });
  }
  var DEFAULT_VERIFICATION_URL, MIN_POLL_INTERVAL_MS, MAX_POLL_INTERVAL_MS, DEFAULT_EXPIRES_IN_S, MAX_NETWORK_FAILURES, WAKE_MIN_DELAY_MS;
  var init_trakt_device_login = __esm({
    "lib/trakt-device-login.tsx"() {
      "use strict";
      "use client";
      init_react_shim();
      init_i18n();
      init_open_external();
      init_trakt_storage();
      init_jsx_runtime_shim();
      DEFAULT_VERIFICATION_URL = "https://auth.trakt.tv/activate";
      MIN_POLL_INTERVAL_MS = 3e3;
      MAX_POLL_INTERVAL_MS = 3e4;
      DEFAULT_EXPIRES_IN_S = 600;
      MAX_NETWORK_FAILURES = 6;
      WAKE_MIN_DELAY_MS = 2e3;
    }
  });

  // lib/playback-settings.ts
  var init_playback_settings = __esm({
    "lib/playback-settings.ts"() {
      "use strict";
      init_app_storage();
      init_profile_storage_shim();
    }
  });

  // lib/async-utils.ts
  var init_async_utils = __esm({
    "lib/async-utils.ts"() {
    }
  });

  // lib/plugin-state.ts
  var init_plugin_state = __esm({
    "lib/plugin-state.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/media-stream/filters.ts
  var init_filters = __esm({
    "lib/media-stream/filters.ts"() {
      init_profile_storage_shim();
    }
  });

  // lib/playback-start-gate.ts
  var init_playback_start_gate = __esm({
    "lib/playback-start-gate.ts"() {
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

  // lib/tauri-native-player.ts
  var isAndroidTauriEnv;
  var init_tauri_native_player = __esm({
    "lib/tauri-native-player.ts"() {
      "use strict";
      init_react_shim();
      init_tauri_mpv();
      isAndroidTauriEnv = isTauriEnv && typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
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
      function getCurrentWindow2() {
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
          return getCurrentWindow2();
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
              const listeners = this.listeners[event$1];
              listeners.splice(listeners.indexOf(handler), 1);
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
              const listeners = this.listeners[event$1];
              listeners.splice(listeners.indexOf(handler), 1);
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
      exports.getCurrentWindow = getCurrentWindow2;
      exports.monitorFromPoint = monitorFromPoint;
      exports.primaryMonitor = primaryMonitor;
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

  // lib/playback-availability.ts
  var init_playback_availability = __esm({
    "lib/playback-availability.ts"() {
      init_core_addons();
    }
  });

  // lib/video-progress.ts
  var EVENT5, HISTORY_EVENT;
  var init_video_progress = __esm({
    "lib/video-progress.ts"() {
      init_progress();
      init_profile_storage_shim();
      init_watched_episodes();
      init_playback_availability();
      EVENT5 = "lumio-stream-progress-changed";
      if (typeof window !== "undefined") {
        void Promise.resolve().then(() => (init_plugin_registry(), plugin_registry_exports)).then(({ subscribePluginRegistry: subscribePluginRegistry2 }) => {
          subscribePluginRegistry2(() => {
            window.dispatchEvent(new CustomEvent(EVENT5));
            window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
          });
        }).catch(() => {
        });
      }
      HISTORY_EVENT = "lumio-stream-history-changed";
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
    function setCoViewers(ids) {
      const nowMs = deps.now();
      chosen = [...new Set(ids)];
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
    const prefs = getWeatherPrefs();
    if (!prefs.enabled || !prefs.place) {
      pending2.length = 0;
      return;
    }
    let weather = null;
    try {
      const r = await fetch(forecastUrl(prefs.place.lat, prefs.place.lon));
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
    const prefs = getWeatherPrefs();
    if (!prefs.enabled || !prefs.place || s.weather || s.seeded) return;
    if (!pending2.some((p) => p.id === s.id)) pending2.push(s);
    schedule(0);
  }
  var WEATHER_PREFS_KEY, FORECAST_URL, WEATHER_RETRY_MS, WEATHER_MAX_AGE_MS, OFF, pending2, timer;
  var init_weather = __esm({
    "lib/watch-journal/weather.ts"() {
      "use strict";
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
        enabled: true,
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
      "use strict";
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

  // lib/android-media-keys.ts
  var init_android_media_keys = __esm({
    "lib/android-media-keys.ts"() {
      "use client";
    }
  });

  // lib/resume-playback.ts
  var init_resume_playback = __esm({
    "lib/resume-playback.ts"() {
      init_plugin_registry();
      init_session_host();
    }
  });

  // lib/trakt-scrobble.ts
  var init_trakt_scrobble = __esm({
    "lib/trakt-scrobble.ts"() {
      "use client";
      init_trakt_storage();
    }
  });

  // lib/player-layout.ts
  var init_player_layout = __esm({
    "lib/player-layout.ts"() {
      "use client";
      init_profile_storage_shim();
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

  // lib/download-target.ts
  var import_core3;
  var init_download_target = __esm({
    "lib/download-target.ts"() {
      import_core3 = __toESM(require_core());
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

  // lib/homekit-client.ts
  var init_homekit_client = __esm({
    "lib/homekit-client.ts"() {
      "use client";
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

  // lib/tauri-avplayer.ts
  var import_core4;
  var init_tauri_avplayer = __esm({
    "lib/tauri-avplayer.ts"() {
      "use client";
      import_core4 = __toESM(require_core());
      init_tauri_mpv();
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
        watchlist_star: "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z"
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

  // components/player/video-player-modal.tsx
  var import_react_dom, import_core5, import_window;
  var init_video_player_modal = __esm({
    "components/player/video-player-modal.tsx"() {
      "use strict";
      "use client";
      init_player_control_icons();
      init_playback_settings();
      init_playback_settings();
      init_dual_subtitles();
      init_playback_speed_store();
      init_react_shim();
      init_timing();
      import_react_dom = __toESM(require_react_dom());
      import_core5 = __toESM(require_core());
      import_window = __toESM(require_window());
      init_transparent_webview();
      init_video_progress();
      init_recorder();
      init_profile_storage_shim();
      init_profile_avatar();
      init_sleep_timer();
      init_player_open();
      init_use_barcode_recorder();
      init_barcode_settings();
      init_player_barcode_strip();
      init_tauri_native_player();
      init_playback_settings();
      init_android_media_keys();
      init_resume_playback();
      init_watched_episodes();
      init_watched_movies();
      init_trakt_scrobble();
      init_player_layout();
      init_player_tuning_panel();
      init_video_tuning();
      init_audio_tuning();
      init_haptics_filter();
      init_haptics_host();
      init_playback_settings();
      init_scroll_lock();
      init_i18n();
      init_tv_focus_shim();
      init_download_target();
      init_session_host();
      init_vlc_deep_link();
      init_fetch_client();
      init_wiki_request_cache();
      init_media_prefetch_cache();
      init_os_client();
      init_player_wiki_panel();
      init_player_soundtrack_panel();
      init_player_episodes_panel();
      init_player_streams_panel();
      init_homekit_client();
      init_plugin_sdk();
      init_playback_session_client();
      init_playback_settings();
      init_keyboard_shortcuts();
      init_playback_settings();
      init_autoplay_settings();
      init_player_reveal_hold();
      init_credits_recommendations();
      init_ids();
      init_title_logo_cache();
      init_open_item_runtime();
      init_gesture_settings();
      init_tauri_native_player();
      init_playback_settings();
      init_lan_streaming_settings();
      init_subtitle_delay_store();
      init_tauri_mpv();
      init_tauri_native_player();
      init_tauri_avplayer();
      init_app_storage();
      init_binge_zap_button();
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
      __defNormalProp2 = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
          static toUtf8ByteArray(str) {
            str = encodeURI(str);
            let result = [];
            for (let i = 0; i < str.length; i++) {
              if (str.charAt(i) != "%")
                result.push(str.charCodeAt(i));
              else {
                result.push(parseInt(str.substring(i + 1, i + 3), 16));
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
  var tvBox;
  var init_tv_metrics = __esm({
    "lib/tv-metrics.ts"() {
      tvBox = (px) => `calc(${px}px * var(--ui-scale, 1))`;
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
    fill
  }) {
    const path = ICON_PATHS[name];
    if (!path) return null;
    return /* @__PURE__ */ jsx(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: fill || "none",
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
  function Checkbox({
    checked,
    onChange,
    disabled,
    label,
    hint,
    right
  }) {
    return /* @__PURE__ */ jsxs(
      "label",
      {
        style: {
          display: "flex",
          alignItems: hint ? "flex-start" : "center",
          gap: 12,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.55 : 1,
          userSelect: "none"
        },
        children: [
          /* @__PURE__ */ jsxs(
            "span",
            {
              onClick: (e) => {
                e.preventDefault();
                if (!disabled && onChange) onChange(!checked);
              },
              style: { display: "flex", alignItems: hint ? "flex-start" : "center", gap: 12, flex: 1, minWidth: 0 },
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    style: {
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: checked ? TOKENS.accent : TOKENS.surface2,
                      border: `1.5px solid ${checked ? TOKENS.accent : TOKENS.borderStrong}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all .14s ease",
                      flexShrink: 0,
                      marginTop: hint ? 2 : 0
                    },
                    children: checked ? /* @__PURE__ */ jsx(Icon, { name: "check", size: 14, color: TOKENS.surface0 }) : null
                  }
                ),
                label ? /* @__PURE__ */ jsxs("span", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 2 }, children: [
                  /* @__PURE__ */ jsx("span", { style: { fontSize: TYPE.body, color: TOKENS.text, fontWeight: 500 }, children: label }),
                  hint ? /* @__PURE__ */ jsx("span", { style: { fontSize: TYPE.small, color: TOKENS.textMute, lineHeight: 1.4 }, children: hint }) : null
                ] }) : null
              ]
            }
          ),
          right
        ]
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
  var import_react_dom2, TOKENS, TYPE, inputStyle, eyebrowStyle, ICON_PATHS;
  var init_primitives = __esm({
    "components/settings/redesigned/primitives.tsx"() {
      "use client";
      init_react_shim();
      init_tv_tab_heading();
      init_settings_heading();
      import_react_dom2 = __toESM(require_react_dom());
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
  var init_plugin_sdk = __esm({
    "lib/plugin-sdk.ts"() {
      init_tauri_mpv();
      init_timing();
      init_profile_storage_shim();
      init_i18n();
      init_tv_focus_shim();
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
      init_home_override_settings();
      init_trakt_storage();
      init_trakt_sync();
      init_trakt_watchlist_limit();
      init_watchlist();
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

  // ../../../lumio-official-plugins/.worktrees/release-0.1.617/plugins/trakt/runtime/index.ts
  var runtime_exports = {};
  __export(runtime_exports, {
    TraktPlugin: () => TraktPlugin
  });

  // ../../../lumio-official-plugins/.worktrees/release-0.1.617/plugins/trakt/runtime/trakt-auth-capability-provider.ts
  init_plugin_sdk();
  function getStatus() {
    const auth = getTraktAuth();
    if (!auth?.accessToken || !auth.refreshToken) {
      return {
        state: "disconnected",
        canConnect: true,
        canDisconnect: false,
        requiresUserGesture: true,
        supportsSilentReconnect: false
      };
    }
    const accountLabel = auth.name || auth.username || "Trakt";
    return {
      state: "connected",
      canConnect: true,
      canDisconnect: true,
      requiresUserGesture: true,
      supportsSilentReconnect: true,
      accountLabel
    };
  }
  var traktAuthCapabilityProvider = {
    id: "trakt-auth",
    pluginId: "com.lumio.trakt",
    label: { en: "Trakt", sv: "Trakt" },
    getStatus,
    async disconnect() {
      clearTraktAuth();
    },
    async trySilentReconnect() {
      return getTraktAuth() ? "success" : "needs_user_action";
    }
  };

  // ../../../lumio-official-plugins/.worktrees/release-0.1.617/plugins/trakt/runtime/trakt-settings-section.tsx
  init_react_shim();
  init_plugin_sdk();
  init_plugin_sdk();
  init_jsx_runtime_shim();
  function TraktSettingsSection() {
    const { t } = useLang();
    const [traktAuth, setTraktAuthState] = useState(() => getTraktAuth());
    const [traktImportState, setTraktImportState] = useState("idle");
    const [traktImportError, setTraktImportError] = useState("");
    const [limitSummary, setLimitSummary] = useState(() => getTraktLimitSummary());
    const [historyRefused, setHistoryRefused] = useState(false);
    const [autoRemoveMovies, setAutoRemoveMovies] = useState(() => isAutoRemoveWatchedMoviesEnabled());
    const [autoUnfollowSeries, setAutoUnfollowSeries] = useState(() => isAutoUnfollowFinishedSeriesEnabled());
    const login = useTraktDeviceLogin({
      onConnected: async () => {
        setTraktAuthState(getTraktAuth());
        notifyAuthCapabilitiesChanged();
        await fetchTraktProfile();
        setTraktAuthState(getTraktAuth());
        await importTraktWatched();
        await importTraktWatchlist();
      }
    });
    useEffect(() => {
      const sync = () => setTraktAuthState(getTraktAuth());
      sync();
      const stopAuth = onTraktAuthChanged(sync);
      const stopProfile = onProfileChanged(sync);
      return () => {
        stopAuth();
        stopProfile();
      };
    }, []);
    async function handleTraktImport() {
      setTraktImportError("");
      setHistoryRefused(false);
      setTraktImportState("importing");
      try {
        clearPendingTraktSync();
        const watchlistResult = await importTraktWatchlist();
        await syncLocalDataToTrakt(watchlistResult.snapshot);
        await importTraktWatched();
        setTraktAuthState(getTraktAuth());
        setTraktImportState("done");
        window.setTimeout(() => {
          setTraktImportState((current) => current === "done" ? "idle" : current);
        }, 2500);
      } catch (error) {
        setTraktAuthState(getTraktAuth());
        if (isTraktAccountLimitError(error)) {
          setTraktImportState("done");
          if (error.operation === "history") setHistoryRefused(true);
          return;
        }
        setTraktImportState("error");
        setTraktImportError(error instanceof Error ? error.message : t("traktImportFailed"));
      } finally {
        setLimitSummary(getTraktLimitSummary());
      }
    }
    function handleTraktDisconnect() {
      login.cancel();
      clearTraktAuth();
      setTraktAuthState(null);
      setTraktImportState("idle");
      setTraktImportError("");
      notifyAuthCapabilitiesChanged();
    }
    const busy = login.phase === "starting" || login.phase === "waiting";
    const warning = (title, body) => /* @__PURE__ */ jsxs("div", { style: { padding: "10px 14px", borderRadius: 12, border: `1px solid ${TOKENS.warn}`, background: "rgba(243,201,105,0.08)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 13, fontWeight: 600, color: TOKENS.warn }, children: title }),
      /* @__PURE__ */ jsx("div", { style: { marginTop: 4, fontSize: 12, lineHeight: 1.5, color: TOKENS.textDim }, children: body })
    ] });
    return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
      traktAuth ? /* @__PURE__ */ jsxs(Fragment2, { children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs("div", { style: { fontSize: 14.5, fontWeight: 600, color: TOKENS.text }, children: [
            t("traktSignedInAs"),
            " ",
            traktAuth.name || traktAuth.username || t("traktSignedInFallback")
          ] }),
          /* @__PURE__ */ jsx("p", { style: { margin: "4px 0 12px", fontSize: 12, lineHeight: 1.5, color: TOKENS.textMute }, children: t("traktSyncDesc") }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [
            /* @__PURE__ */ jsx(PillBtn, { variant: "accent", onClick: () => void handleTraktImport(), disabled: traktImportState === "importing", children: traktImportState === "importing" ? t("traktImporting") : t("traktImportData") }),
            /* @__PURE__ */ jsx(PillBtn, { variant: "danger", onClick: handleTraktDisconnect, children: t("traktDisconnect") })
          ] }),
          traktImportState === "done" ? /* @__PURE__ */ jsx("p", { style: { margin: "10px 0 0", fontSize: 12, color: TOKENS.mint }, children: t("traktImportDone") }) : null,
          historyRefused ? /* @__PURE__ */ jsx("div", { style: { marginTop: 12 }, children: warning(t("traktHistoryRefused"), t("traktHistoryRefusedBody")) }) : null,
          limitSummary.hit ? /* @__PURE__ */ jsx("div", { style: { marginTop: 12 }, children: warning(t("traktMirrorIncomplete"), t("traktMirrorIncompleteBody").replace("{count}", String(limitSummary.total))) }) : null
        ] }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: autoRemoveMovies,
              onChange: (value) => {
                setAutoRemoveWatchedMoviesEnabled(value);
                setAutoRemoveMovies(value);
              },
              label: t("traktAutoRemoveMovies"),
              hint: t("traktAutoRemoveMoviesHint")
            }
          ),
          /* @__PURE__ */ jsx(
            Checkbox,
            {
              checked: autoUnfollowSeries,
              onChange: (value) => {
                setAutoUnfollowFinishedSeriesEnabled(value);
                setAutoUnfollowSeries(value);
              },
              label: t("traktAutoUnfollowSeries"),
              hint: t("traktAutoUnfollowSeriesHint")
            }
          )
        ] }) })
      ] }) : /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
        /* @__PURE__ */ jsx(PillBtn, { variant: "accent", onClick: login.start, disabled: busy, style: { alignSelf: "flex-start" }, children: busy ? t("traktWaiting") : t("traktConnect") }),
        login.userCode ? /* @__PURE__ */ jsx(
          TraktDeviceCodePanel,
          {
            userCode: login.userCode,
            verificationUrl: login.verificationUrl,
            notice: login.notice,
            waiting: login.phase === "waiting"
          }
        ) : null
      ] }) }),
      login.error ? /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: 13, color: TOKENS.red }, children: login.error }) : null,
      traktImportError ? /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: 13, color: TOKENS.red }, children: traktImportError }) : null
    ] });
  }

  // ../../../lumio-official-plugins/.worktrees/release-0.1.617/plugins/trakt/runtime/index.ts
  var TraktPlugin = {
    id: "com.lumio.trakt",
    name: { en: "Trakt", sv: "Trakt" },
    version: "0.1.1",
    description: {
      en: "Sync watched history, watchlists and collection data with Trakt.",
      sv: "Synka sedda titlar, listor och samling med Trakt."
    },
    preinstalled: true,
    register(ctx) {
      ctx.registerAuthCapabilityProvider(traktAuthCapabilityProvider);
      ctx.registerSettingsSection({
        id: "trakt",
        label: { en: "Trakt", sv: "Trakt" },
        Section: TraktSettingsSection
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
*/
