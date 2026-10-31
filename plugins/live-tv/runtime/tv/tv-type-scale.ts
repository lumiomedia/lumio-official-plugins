/**
 * TEXTSTORLEKAR OCH LUFT PÅ TV (Jerry 2026-10-31). Godkända live på Mi Box S
 * regel för regel (inställningarna, sidopanelerna, guidens hero och kanallista,
 * källväljaren, Library) och samlade här i stället för i komponenterna: samma
 * komponenter ritar skrivbordet, där storlekarna redan var rätt. Läggs in av
 * TV-skalet bara i TV-läge och gäller bara inom Live TV. Flytta en regel in i
 * sin komponent när den ändå skrivs om.
 */
export const TV_TYPE_SCALE_CSS = String.raw`
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=tab-] { font-size:24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-f]:has(> span[style*="width: 28px"][style*="999px"]) { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) div[style*="font-size: 18px; color: rgba(243, 244, 248, 0.6); margin-top: 4px"] { font-size:22px!important;color:rgba(243,244,248,0.78)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=guide-default-] > div:last-child { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=setting-] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=setting-] span { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=settings-content] { gap:24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=settings-content] > div:has(> [data-testid^=vod-mode-]) { gap:20px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-mode-] { width:400px!important;padding:22px 24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-mode-] > div:first-child { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-mode-] > div:last-child { font-size:19px!important;line-height:1.35!important;margin-top:8px!important;color:rgba(243,244,248,0.72)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-library] { gap:18px!important;margin-top:40px!important;padding-top:36px!important;border-top:1px solid rgba(255,255,255,0.08)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-library-xtream] { padding:18px 24px!important;min-height:84px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-library-xtream] > div:first-child > div:first-child { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-library-xtream] > div:first-child > div:last-child { font-size:19px!important;margin-top:4px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-categories-xtream],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=vod-library-build-] { height:56px!important;min-height:56px!important;padding:0 26px!important;font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-library] > div:last-child { font-size:19px!important;color:rgba(243,244,248,0.7)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] { width:min(880px,100%)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] > div:nth-child(2) { gap:14px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] > div:nth-child(2) > div { height:56px!important;min-height:56px!important;font-size:22px!important;padding:0 26px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] > div:nth-child(3) { padding:8px!important;margin:0 -8px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] { height:72px!important;min-height:72px!important;font-size:23px!important;padding:0 16px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] span { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] span:last-child:not(:nth-child(2)) { font-size:20px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] span span { font-size:19px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] > span:first-child { width:30px!important;height:30px!important;box-sizing:border-box!important;border:2px solid rgba(243,244,248,0.45)!important;border-radius:7px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;line-height:1!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=vod-categories-picker] [data-testid^=vod-picker-] > span[data-testid^=picker-check-] { border:none!important;background:none!important;font-size:24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 19px"] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 17px"] { font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 16px"],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 15px"] { font-size:19px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="height: 48px"][style*="999px"] { height:56px!important;min-height:56px!important;font-size:21px!important;padding:0 26px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="min-height: 64px"] { min-height:80px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=phone-add] > div:nth-child(2) { padding:8px 10px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=phone-add] [style*="word-break: break-all"] { font-size:21px!important;max-width:100%!important;overflow-wrap:anywhere!important;white-space:normal!important;line-height:1.35!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 16px"][style*="font-weight: 400"] { font-size:21px!important;line-height:1.35!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] > [data-scroll] { padding:8px 10px!important;margin:0 -10px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [style*="font-size: 16px"] { font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] > [data-scroll] [style*="height: 64px"] { height:72px!important;min-height:72px!important;font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] > [data-scroll] [style*="height: 64px"] > span:last-child:not(:nth-child(2)) { font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [data-testid^=picker-row-] > span:first-child { width:30px!important;height:30px!important;box-sizing:border-box!important;border:2px solid rgba(243,244,248,0.45)!important;border-radius:7px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [data-testid^=picker-row-] > span[data-testid^=picker-check-] { border:none!important;font-size:24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [style*="height: 40px"][style*="999px"] { height:54px!important;min-height:54px!important;font-size:22px!important;padding:0 24px!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [style*="height: 40px"][style*="999px"][style*="0.05)"] { background:rgba(252,252,255,0.12)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] > div:has(> [style*="height: 40px"][style*="999px"]) { gap:12px!important;padding:6px 4px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [style*="position: fixed"][style*="right: 0px"] [style*="font-size: 17px"][style*="line-height"] { font-size:23px!important;line-height:1.4!important;color:rgba(243,244,248,0.8)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=epg-status-] { font-size:23px!important;padding-top:16px!important;padding-bottom:16px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=epg-status-] [style*="font-size: 16px"] { font-size:21px!important;margin-top:4px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-live-tv-settings-content] [style*="font-size: 18px"] { font-size:22px!important;color:rgba(243,244,248,0.78)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=help-tab] [style*="font-size: 21px"] { font-size:25px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=help-tab] [style*="font-size: 18px"] { font-size:24px!important;line-height:1.5!important;color:rgba(243,244,248,0.82)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=help-tab] > [data-f] { padding-top:22px!important;padding-bottom:22px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-title] { font-size:50px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-time] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-desc] { font-size:24px!important;line-height:1.45!important;color:rgba(243,244,248,0.78)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero] [style*="font-variant-nu"] { font-size:22px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero] [style*="font-variant-nu"] ~ * { font-size:22px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=guide-mode-] { height:50px!important;font-size:21px!important;padding:0 24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-source] { font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-preview] [style*="font-size: 14"] { font-size:18px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-cat] { font-size:21px!important;height:52px!important;padding:0 24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-header] { font-size:17px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-header] * { font-size:17px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=guide-channel-v2] [style*="font-size: 20px"] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=guide-channel-v2] [style*="font-size: 15px"] { font-size:18px!important;margin-top:3px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=logo-plate-number] { font-size:14px!important;padding:1px 6px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-now] [style*="font-size: 20px"] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-now] [style*="font-size: 14px"] { font-size:18px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-card-] [style*="font-size: 14"] { font-size:17px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-card-] [style*="font-size: 15"],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-card-] [style*="margin-left: auto"] { font-size:18px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-card-] [style*="font-size: 20px"] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-card-now] [style*="font-size: 24px"] { font-size:26px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-card-] { padding:22px 24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-cards] { gap:16px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-cards] [style*="font-size: 15px"] { font-size:18px!important;color:rgba(243,244,248,0.6)!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-pagination] { font-size:20px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-show-more] { font-size:21px!important;height:52px!important;min-height:52px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero] { height:340px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-desc] { flex-shrink:0!important;margin-top:6px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero] [data-testid=live-pill] { font-size:14px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=guide-channel-v2],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=list-now] { margin-bottom:4px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-title] { font-size:42px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-category-chips] { margin:0!important;padding:22px 48px 28px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-scroll],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-row],
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-header] { gap:12px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-list-view] > div:has(> [data-testid=list-scroll]) { gap:28px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-header] > div:last-child { margin-left:16px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=list-scroll] { padding:4px!important;margin:-4px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-art] { width:72%!important;-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 42%),linear-gradient(180deg,#000 50%,transparent 100%);-webkit-mask-composite:source-in;mask-composite:intersect }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-hero-art] + div { display:none!important }
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-list-view] [data-f]:focus,
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-list-view] [data-f][data-fcur="1"],
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-shell] [data-v2f][data-f]:focus,
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=guide-shell] [data-v2f][data-f][data-fcur="1"] { outline:none!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=choice-panel] [data-testid^=choice-row-] span { font-size:24px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=choice-panel] [data-testid^=choice-row-] span[style*="font-size: 20px"] { font-size:21px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-kind] ~ div[style*="text-transform: uppercase"] { font-size:20px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-choose-categories] { font-size:23px!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid^=library-kind-][style*="background: rgb(243, 244, 248)"] { background:rgb(var(--accent-500))!important;color:#fff!important }
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-card][data-f]:focus,
:root:not([data-focus-source="pointer"]) [data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-card][data-f][data-fcur="1"] { outline:none!important;box-shadow:none!important }
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-card]:focus > div:first-child::after,
[data-live-tv-tv-root]:not([data-lt-phone="1"]) [data-testid=library-card][data-fcur="1"] > div:first-child::after { content:"";position:absolute;inset:-4px;border:3px solid rgb(var(--accent-500));border-radius:15px;box-shadow:0 0 28px rgb(var(--accent-500) / .45);pointer-events:none;z-index:6 }
`
