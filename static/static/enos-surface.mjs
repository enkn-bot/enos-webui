const SURFACES = {
  chat: {
    key: "chat",
    hostname: "enoschat.duckdns.org",
    title: "ENOS Chat",
    manifest: "/static/manifest-chat.json?v=enos-m14c8",
  },
  desk: {
    key: "desk",
    hostname: "enosdesk.duckdns.org",
    title: "ENOS Desk",
    manifest: "/static/manifest-desk.json?v=enos-m14c8",
  },
  terminal: {
    key: "terminal",
    hostname: "enosterminal.duckdns.org",
    title: "ENOS Terminal",
    manifest: "/static/manifest-terminal.json?v=enos-m14c8",
  },
};

const HOST_TO_SURFACE = new Map(
  Object.values(SURFACES).map((surface) => [surface.hostname, surface.key]),
);

const MIND_TIERS = [
  { id: "enos.subconscious", tier: "subconscious", label: "Subconscious" },
  { id: "enos.mind", tier: "mind", label: "Mind" },
  { id: "enos.deepmind", tier: "deepmind", label: "DeepMind" },
];

const MIND_TIER_ORB_SRC = {
  subconscious: "/static/enos-model-subconscious.svg",
  mind: "/static/enos-model-mind.svg",
  deepmind: "/static/enos-model-deepmind.svg",
};

const TERMINAL_CLOUD_PATH =
  "M12 4C6 4 6 8 6 10C4.33333 10 1 11 1 15C1 19 4.33333 20 6 20H18C19.6667 20 23 19 23 15C23 11 19.6667 10 18 10C18 8 18 4 12 4Z";

const DESK_SIDE_PANE_BUTTON_ID = "enos-desk-side-pane-button";
const LEGACY_DESK_TERMINAL_BUTTON_ID = "enos-desk-terminal-panel-button";
const COMPOSER_MODEL_ORBS_ID = "enos-composer-model-orbs";
const PRIMARY_MODEL_SELECTOR_TRIGGER_ID = "model-selector-0-button";
const COMPOSER_MODEL_DROPDOWN_MAX_WIDTH = 320;
const MODELS_PLAYGROUND_LINK_ID = "enos-models-playground-link";
const SIDEBAR_LOGO_ID = "enos-sidebar-logo";
const SIDEBAR_LOGO_SRC = "/static/favicon.svg?v=enos-20260614-flat-logo-v2";

/* Panel-right icon — exact same as OWUI's native left sidebar toggle so both
   the left sidebar close and the right pane toggle share one identical visual. */
const SIDE_PANE_ICON_SVG = `
  <div class="m-auto self-center p-1.5" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="size-5">
      <path d="M5.75 4.5H18.25C19.7688 4.5 21 5.73122 21 7.25V16.75C21 18.2688 19.7688 19.5 18.25 19.5H5.75C4.23122 19.5 3 18.2688 3 16.75V7.25C3 5.73122 4.23122 4.5 5.75 4.5Z" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M8.75 4.75V19.25" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  </div>`;

function normalizedText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function referencedMindTiers(label) {
  const rawText = String(label || "").toLowerCase();
  const text = normalizedText(label);

  return MIND_TIERS.filter((tier) => {
    const tierLabel = normalizedText(tier.label);
    const labelPattern = new RegExp(`(^|\\s)${escapeRegExp(tierLabel)}(\\s|$)`);
    return labelPattern.test(text) || rawText.includes(tier.id);
  });
}

export function selectedMindTierOrbsFromText(label) {
  return referencedMindTiers(label).map((tier) => ({
    tier: tier.tier,
    label: tier.label,
    src: MIND_TIER_ORB_SRC[tier.tier],
  }));
}

export function composerModelOrbsControlPolicy(orbs) {
  const selected = Array.isArray(orbs) ? orbs.filter(Boolean) : [];
  if (selected.length === 0) return { interactive: false, label: "", displayLabel: "" };
  const labels = selected.map((orb) => orb.label);
  return { interactive: true, label: `Change model: ${labels.join(", ")}`, displayLabel: labels.join(" + ") };
}

export function consumeComposerModelOrbEvent(event) {
  event?.preventDefault?.(); event?.stopPropagation?.(); event?.stopImmediatePropagation?.();
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function composerModelDropdownPlacement(composerRect, dropdownRect = {}, viewport = {}, gap = 4) {
  const viewportWidth = finiteNumber(viewport.width, 1024);
  const viewportHeight = finiteNumber(viewport.height, 768);
  const composerLeft = finiteNumber(composerRect?.left, 0);
  const composerTop = finiteNumber(composerRect?.top, 0);
  const composerBottom = finiteNumber(composerRect?.bottom, composerTop + finiteNumber(composerRect?.height, 32));
  const naturalWidth = finiteNumber(dropdownRect?.width, finiteNumber(composerRect?.width, 320));
  const availableWidth = Math.max(240, viewportWidth - 16);
  const width = Math.min(Math.max(280, naturalWidth), COMPOSER_MODEL_DROPDOWN_MAX_WIDTH, availableWidth);
  const naturalHeight = Math.max(160, finiteNumber(dropdownRect?.height, 320));
  const left = Math.max(8, Math.min(composerLeft, viewportWidth - width - 8));
  const availableAbove = Math.max(0, composerTop - gap - 8);
  const availableBelow = Math.max(0, viewportHeight - composerBottom - gap - 8);
  const opensDown = availableBelow >= Math.min(naturalHeight, 220) || availableBelow >= availableAbove;
  const available = opensDown ? availableBelow : availableAbove;
  const maxHeight = Math.min(naturalHeight, Math.max(160, available));
  const top = opensDown
    ? Math.min(composerBottom + gap, viewportHeight - maxHeight - 8)
    : Math.max(8, composerTop - maxHeight - gap);

  return { position: "fixed", left, top, width, maxHeight, opens: opensDown ? "down" : "up" };
}

export function responseAvatarPolicy(surfaceKey, marker) {
  const text = normalizedText(marker);
  return surfaceKey === "chat" && /assistant-message-profile-image|\/?models\/model\/profile\/image/.test(text)
    ? { visible: false, reason: "chat-hides-response-avatar" }
    : { visible: true, reason: "surface-visible" };
}

export function chatTerminalCloudPolicy(surfaceKey, isTerminalCloud) {
  return surfaceKey === "chat" && isTerminalCloud ? { visible: false, reason: "chat-hides-terminal-cloud" } : { visible: true, reason: "surface-visible" };
}

export function topLeftPlusPolicy(surfaceKey, marker) {
  const text = normalizedText(marker);
  const isCollapsedNewChat =
    text === "new chat" || text === "+ new chat" || text === "new chat +";
  return surfaceKey === "chat" && isCollapsedNewChat ? { visible: false, reason: "chat-hides-top-left-plus" } : { visible: true, reason: "surface-visible" };
}

export function topModelDefaultChromePolicy(surfaceKey, marker) {
  const text = normalizedText(marker);
  return surfaceKey === "chat" && text.includes("set as default")
    ? { visible: false, reason: "chat-hides-top-model-default-chrome" }
    : { visible: true, reason: "surface-visible" };
}

export function modelsPlaygroundNavPolicy(surfaceKey) { return { visible: Boolean(SURFACES[surfaceKey] || surfaceKey), href: "/playground", label: "Models", insertBeforeLabel: "Chat" }; }

export function sidebarLogoPolicy(surfaceKey) {
  return {
    visible: Boolean(SURFACES[surfaceKey] || surfaceKey),
    id: SIDEBAR_LOGO_ID,
    src: SIDEBAR_LOGO_SRC,
    targetId: "sidebar-webui-name",
    dedupeExistingLogo: true,
    dedupeScope: "sidebar-header",
  };
}

function isMindTierPickerContainer(label) {
  return referencedMindTiers(label).length >= 2;
}

function isMindTierControl(label) {
  const text = normalizedText(label);
  const tiers = referencedMindTiers(label);

  if (tiers.length >= 2) return true;
  return tiers.some((tier) => {
    const tierLabel = normalizedText(tier.label);
    return text === tierLabel || text.startsWith(`${tierLabel} `) || text.includes(tier.id);
  });
}

export function getSurfaceForHostname(hostname) {
  return SURFACES[HOST_TO_SURFACE.get(String(hostname || "").toLowerCase())] || SURFACES.chat;
}

export function classifyModelLabel(label, value = "") {
  const rawLabel = String(label || "").trim();
  const rawValue = String(value || "").trim();
  const text = normalizedText(rawLabel);

  // Prefer the stable model id when the DOM exposes it (dropdown options and
  // selector buttons both carry data-value).
  if (rawValue) {
    if (rawValue === "enos.desk") {
      return { kind: "desk-bridge", label: "ENOS Desk", value: rawValue };
    }
    if (/^enos\.desk\./.test(rawValue)) {
      const tier = MIND_TIERS.find((t) => rawValue === `enos.desk.${t.tier}`);
      if (tier) {
        return { kind: "desk-tier", tier: tier.tier, label: tier.label, value: rawValue };
      }
      return { kind: "desk-tier", label: rawLabel, value: rawValue };
    }
  }

  const mindTier = MIND_TIERS.find((tier) => normalizedText(tier.label) === text);
  if (mindTier) {
    return { kind: "mind-tier", tier: mindTier.tier, label: mindTier.label };
  }

  if (text.includes("openai/gpt-4o-mini")) {
    return { kind: "raw-provider", label: rawLabel };
  }

  if (/\benos desk\b/.test(text)) {
    return { kind: "desk-bridge", label: "ENOS Desk" };
  }

  if (/\bm11b\b/.test(text) || /\benos m11\b/.test(text)) {
    return { kind: "terminal-bridge", label: rawLabel };
  }

  return { kind: "unknown", label: rawLabel };
}

export function mindTaxonomyForSurface(surfaceKey) {
  return {
    surface: SURFACES[surfaceKey]?.key || SURFACES.chat.key,
    userFacingTiers: MIND_TIERS.map((tier) => ({ ...tier })),
    transitionalBridge: {
      id: "enos.desk",
      label: "ENOS Desk",
      role: "terminal-capable-desk-bridge",
      visibleUntilReplaced: false,
      userFacingTierReplacementNeeded: false,
      targetReplacementIds: [
        "enos.desk.subconscious",
        "enos.desk.mind",
        "enos.desk.deepmind",
      ],
    },
  };
}

export function modelPolicy(surfaceKey, label, value = "") {
  const classification = classifyModelLabel(label, value);

  // Chat's aggregate mind-tier picker control must stay visible even if its
  // joined text also contains raw provider / bridge labels.  A single row that
  // carries an explicit Desk-tier model id is not that aggregate control.
  if (
    surfaceKey === "chat" &&
    isMindTierControl(label) &&
    (!value || !/^enos\.desk\./.test(value))
  ) {
    return {
      visible: true,
      reason: isMindTierPickerContainer(label) ? "mind-tier-picker-container" : "mind-tier-row",
    };
  }

  if (classification.kind === "raw-provider") {
    return { visible: false, reason: "raw-desk-base-model" };
  }

  // The transitional enos.desk bridge is replaced by terminal-capable tier rows.
  // Hide it on every surface so users only see the sticky Desk/Terminal tiers.
  if (classification.kind === "desk-bridge" || classification.kind === "terminal-bridge") {
    return { visible: false, reason: "desk-bridge-replaced" };
  }

  // Desk tiers are native-tool / terminal capable.  They belong on Desk/Terminal;
  // they must not leak into Chat where the model has no terminal binding.
  if (classification.kind === "desk-tier") {
    return surfaceKey === "chat"
      ? { visible: false, reason: "desk-tier-not-on-chat" }
      : { visible: true, reason: "desk-tier-visible" };
  }

  // Chat mind tiers (enos.subconscious/mind/deepmind) are not terminal-native.
  // On Desk/Terminal they would be broken choices, so keep them hidden there.
  if (classification.kind === "mind-tier" && surfaceKey !== "chat") {
    return { visible: false, reason: "chat-tier-not-on-desk-terminal" };
  }

  return { visible: true, reason: "surface-visible" };
}

export function terminalLabelForSurface(surfaceKey, label) {
  const text = normalizedText(label);
  if (surfaceKey === "chat" && isMindTierControl(label)) return undefined;

  const isTerminalConnection =
    text.includes("enos m11") ||
    text.includes("m11 disposable") ||
    text.includes("disposable workspace");

  if (!isTerminalConnection) return undefined;
  if (surfaceKey === "chat") return null;
  if (surfaceKey === "terminal") return "ENOS Terminal";
  return "ENOS Workspace";
}

export function rightPanelPolicy(surfaceKey, label) {
  const text = normalizedText(label);
  const isRightPanelTab = ["controls", "files", "overview"].includes(text);

  if (surfaceKey === "chat" && isRightPanelTab) {
    return { visible: true, action: "close", reason: "chat-closes-right-panel" };
  }

  return { visible: true, action: "keep", reason: "surface-visible" };
}

export function observerTargetForDocument(document) {
  return document.body || document.documentElement;
}

export function isProductChatRoute(pathname = "/") {
  const path = String(pathname || "/");
  return (
    path === "/" ||
    path === "/c" ||
    path.startsWith("/c/") ||
    path === "/playground" ||
    path.startsWith("/playground/")
  );
}

export function surfaceObserverConfig() {
  // Deliberately NOT observing characterData: a streamed answer (or the
  // Playground's live editor) mutates text on every token, and re-running the
  // full surface pass per character froze the tab. Structural changes
  // (childList/subtree) still re-apply the surface; surface-relevant text is
  // re-read inside those passes.
  return { childList: true, subtree: true };
}

export function createRunCoalescer(run, schedule) {
  // Collapse a burst of mutations into a single scheduled pass. Running
  // applySurface synchronously inside the MutationObserver callback let our own
  // DOM writes re-enter the observer before the browser could paint — an
  // unbounded re-entrant loop that locks the main thread. Scheduling onto the
  // next frame breaks that loop and caps work at one pass per frame.
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      run();
    });
  };
}

export function isTerminalCloudMenuRoot(className, cloudPathD) {
  const classes = String(className || "");
  return (
    /\bitems-center\b/.test(classes) &&
    /\btranslate-x-0\.5\b/.test(classes) &&
    String(cloudPathD || "").trim() === TERMINAL_CLOUD_PATH
  );
}

export function deskSidePaneButtonPolicy(surfaceKey, nativeControlLabel) {
  const isNativeControlsButton = normalizedText(nativeControlLabel) === "controls";
  if (surfaceKey === "desk" && isNativeControlsButton) {
    return { visible: false, action: "keep-native", label: "Controls" };
  }

  return { visible: false, action: "keep-hidden", label: "Controls" };
}

function ensureMeta(document, name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  if (meta.getAttribute("content") === content) return;
  meta.setAttribute("content", content);
}

function setManifest(document, surface) {
  const current = document.querySelector('link[rel="manifest"]');
  if (current) {
    if (current.getAttribute("href") !== surface.manifest) {
      current.setAttribute("href", surface.manifest);
    }
    if (current.getAttribute("crossorigin") !== "use-credentials") {
      current.setAttribute("crossorigin", "use-credentials");
    }
    return;
  }

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = surface.manifest;
  link.setAttribute("crossorigin", "use-credentials");
  document.head.appendChild(link);
}

function markHidden(element, reason) {
  element.dataset.enosSurfaceHidden = reason;
  element.setAttribute("aria-hidden", "true");
}

function unhideIfSurfaceOwned(element) {
  if (!element.dataset.enosSurfaceHidden) return;
  delete element.dataset.enosSurfaceHidden;
  element.removeAttribute("aria-hidden");
}

function findTopModelDefaultChromeRoot(element) {
  const document = element.ownerDocument;
  let root = element;
  let current = element;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (!(current instanceof HTMLElement)) break;
    if (current === document.body || current === document.documentElement) break;
    // Never let the hidden root grow to include the top-right nav controls. The
    // "Set as default" chrome and the temporary-chat button are SIBLINGS in the
    // navbar row, so climbing to their common ancestor would hide temp chat too.
    if (current.querySelector("#temporary-chat-button, #save-temporary-chat-button")) break;

    const text = normalizedText(current.innerText || current.textContent || "");
    if (text.includes("set as default")) {
      root = current;
      if (
        text.includes("+") ||
        current.children.length > 1 ||
        current.querySelector('button[id^="model-selector-"][id$="-button"]')
      ) {
        break;
      }
    }

    current = current.parentElement;
  }

  // Bail if the resolved root still wraps the temp-chat button (e.g. the caller
  // started from the whole navbar row). A tighter match hides the model chrome
  // without sweeping the top-right controls.
  if (root.querySelector && root.querySelector("#temporary-chat-button, #save-temporary-chat-button")) {
    return null;
  }
  return root;
}

function isAssistantContent(element) {
  return Boolean(element.closest(".markdown-prose, .prose, [data-message-id]"));
}

function replaceVisibleText(element, replacement) {
  if (element.dataset.enosSurfaceLabel === replacement) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("svg, code, pre")) return NodeFilter.FILTER_REJECT;
      if (terminalLabelForSurface("desk", node.nodeValue) === undefined) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) node.nodeValue = replacement;
  element.dataset.enosSurfaceLabel = replacement;
}

function findRightPanelRoot(element) {
  const document = element.ownerDocument;
  let current = element.parentElement;

  for (let depth = 0; current && depth < 8; depth += 1) {
    if (!(current instanceof HTMLElement)) {
      current = current.parentElement;
      continue;
    }

    if (current === document.body || current === document.documentElement) {
      return undefined;
    }

    const text = normalizedText(current.innerText || current.textContent || "");
    const hasPanelLabel =
      /\bcontrols\b/.test(text) || /\bfiles\b/.test(text) || /\boverview\b/.test(text);
    const closeButton = current.querySelector('button[aria-label="Close"], [aria-label="Close"]');

    if (hasPanelLabel && closeButton) return current;
    current = current.parentElement;
  }

  return undefined;
}

function requestClosePanel(root) {
  if (root.dataset.enosSurfaceCloseRequested) return;

  const closeButton = root.querySelector('button[aria-label="Close"], [aria-label="Close"]');
  if (!(closeButton instanceof HTMLElement) || typeof closeButton.click !== "function") return;

  root.dataset.enosSurfaceCloseRequested = "true";
  const scheduler =
    root.ownerDocument.defaultView?.requestAnimationFrame ||
    root.ownerDocument.defaultView?.setTimeout ||
    globalThis.setTimeout;

  scheduler(() => closeButton.click(), 0);
}

function suppressRightPanels(document, surface) {
  if (surface.key !== "chat") return;

  const candidates = document.querySelectorAll(
    ["button", "[role='tab']", "[role='button']", "[aria-label]"].join(","),
  );

  for (const element of candidates) {
    if (!(element instanceof HTMLElement)) continue;
    if (isAssistantContent(element)) continue;

    const text = `${element.innerText || ""} ${element.getAttribute("aria-label") || ""}`;
    const policy = rightPanelPolicy(surface.key, text);
    if (policy.action !== "close") continue;

    const panelRoot = findRightPanelRoot(element);
    if (!panelRoot) continue;

    requestClosePanel(panelRoot);
  }
}

function removeModelsPlaygroundNav(document) {
  // The injected "Models" playground link sat alongside OWUI's native playground
  // tabs (Chat / Completions / Images) and read as a conflicting page. ENOS no
  // longer adds it — keep the playground stock. Remove any leftover injection.
  document.getElementById(MODELS_PLAYGROUND_LINK_ID)?.remove();
}

function findSidebarBrandRoot(wordmark) {
  let root = wordmark.parentElement;
  let current = wordmark.parentElement;

  for (let depth = 0; current instanceof HTMLElement && depth < 5; depth += 1) {
    const text = normalizedText(current.innerText || current.textContent || "");
    if (text.includes("new chat") || text.includes("search") || text.includes("workspace")) break;
    root = current;
    current = current.parentElement;
  }

  return root;
}

function isSidebarLogoCandidate(element, policy) {
  const tag = element.tagName?.toLowerCase();
  if (tag !== "img" && tag !== "svg") return false;
  if (element.id === policy.id) return true;

  const marker = normalizedText(
    [
      element.id || "",
      element.getAttribute("class") || "",
      element.getAttribute("src") || "",
      element.getAttribute("alt") || "",
      element.getAttribute("aria-label") || "",
    ].join(" "),
  );

  return /\b(enos|favicon|logo|splash|apple-touch)\b/.test(marker);
}

function isBeforeInDocument(left, right) {
  return Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function ensureSidebarLogo(document, surface) {
  const policy = sidebarLogoPolicy(surface.key);
  if (!policy.visible) return;

  const wordmark = document.getElementById(policy.targetId);
  if (!(wordmark instanceof HTMLElement) || !(wordmark.parentElement instanceof HTMLElement)) return;

  const parent = wordmark.parentElement;
  const brandRoot = findSidebarBrandRoot(wordmark) || parent;
  const logoCandidates = Array.from(brandRoot.querySelectorAll("img, svg")).filter((element) =>
    isSidebarLogoCandidate(element, policy),
  );
  const nativeLogo = logoCandidates.find((element) => element.id !== policy.id);
  let logo = nativeLogo || document.getElementById(policy.id);

  for (const candidate of logoCandidates) {
    if (candidate !== logo) candidate.remove();
  }

  if (logo instanceof Element && brandRoot.contains(logo)) {
    logo.dataset.enosSidebarLogo = "true";
    if (logo instanceof HTMLImageElement && !logo.getAttribute("src")) logo.src = policy.src;
  } else {
    logo = document.createElement("img");
    logo.id = policy.id;
    logo.src = policy.src;
    parent.insertBefore(logo, wordmark);
  }

  if (logo instanceof HTMLImageElement) {
    logo.alt = "";
    logo.decoding = "async";
    logo.loading = "eager";
  }
  if (logo.id !== policy.id && logo instanceof HTMLImageElement) logo.id = policy.id;
  logo.setAttribute("aria-hidden", "true");
  parent.dataset.enosSidebarBrand = "true";

  if (
    logo instanceof HTMLImageElement &&
    logo.parentElement === parent &&
    wordmark.previousElementSibling !== logo
  ) {
    parent.insertBefore(logo, wordmark);
  } else if (!isBeforeInDocument(logo, wordmark)) {
    parent.insertBefore(logo, wordmark);
  }
}

function terminalCloudPathFor(root) {
  return root.querySelector('svg path[d^="M12 4C6 4"]')?.getAttribute("d") || "";
}

function findTerminalCloudMenuRoot(document) {
  const moved = document.querySelector("[data-enos-surface-cloud-header]");
  if (moved instanceof HTMLElement) return moved;

  const candidates = document.querySelectorAll('div[class*="translate-x-0.5"]');
  for (const element of candidates) {
    if (!(element instanceof HTMLElement)) continue;
    if (!element.closest("form")) continue;
    if (!isTerminalCloudMenuRoot(element.getAttribute("class") || "", terminalCloudPathFor(element))) {
      continue;
    }
    return element;
  }

  return undefined;
}

function findTemporaryChatButton(document) {
  return (
    document.getElementById("temporary-chat-button") ||
    document.getElementById("save-temporary-chat-button")
  );
}

function relocateTerminalCloudControl(document) {
  const target = findTemporaryChatButton(document);
  if (!(target instanceof HTMLElement)) return;

  const source = findTerminalCloudMenuRoot(document);
  if (!(source instanceof HTMLElement)) return;

  const headerGroup = target.parentElement;
  if (!(headerGroup instanceof HTMLElement)) return;

  source.dataset.enosSurfaceCloudHeader = "true";
  unhideIfSurfaceOwned(source);
  if (source.parentElement !== headerGroup || source.nextElementSibling !== target) {
    headerGroup.insertBefore(source, target);
  }
}

function nativeControlsLabel(button) {
  return button.getAttribute("aria-label") || button.innerText || "";
}

function findNativeControlsButton(document) {
  const button = document.querySelector('button[aria-label="Controls"]');
  return button instanceof HTMLElement ? button : undefined;
}

function createDeskSidePaneButton(document) {
  const button = document.createElement("button");
  button.id = DESK_SIDE_PANE_BUTTON_ID;
  button.type = "button";
  button.className =
    "cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition";
  button.dataset.enosDeskSidePaneButton = "true";
  button.setAttribute("aria-label", "Desktop");
  button.setAttribute("title", "Desktop");
  button.innerHTML = SIDE_PANE_ICON_SVG;
  button.addEventListener("click", () => {
    const controlsButton = findNativeControlsButton(document);
    if (controlsButton && typeof controlsButton.click === "function") {
      controlsButton.click();
    }
  });
  return button;
}

function ensureDeskSidePaneButton(document, surface) {
  document.getElementById(LEGACY_DESK_TERMINAL_BUTTON_ID)?.remove();
  document.getElementById(DESK_SIDE_PANE_BUTTON_ID)?.remove();
}

function selectedMindTierOrbsFromDocument(document) {
  const selected = new Map();
  const selectorButtons = document.querySelectorAll('button[id^="model-selector-"][id$="-button"]');

  for (const button of selectorButtons) {
    if (!(button instanceof HTMLElement)) continue;

    const text = [
      button.getAttribute("aria-label") || "",
      button.innerText || "",
      button.textContent || "",
    ].join(" ");

    for (const orb of selectedMindTierOrbsFromText(text)) {
      selected.set(orb.tier, orb);
    }
  }

  return MIND_TIERS.map((tier) => selected.get(tier.tier)).filter(Boolean);
}

function composerOrbAnchor(inputMenuButton) {
  let anchor = inputMenuButton;
  let parent = inputMenuButton.parentElement;

  for (let depth = 0; parent && depth < 5; depth += 1) {
    const className = parent.getAttribute("class") || "";
    const isComposerControlRow =
      parent.closest("form") &&
      /\bflex\b/.test(className) &&
      parent.querySelector("#input-menu-button");

    if (isComposerControlRow) {
      return { parent, anchor };
    }

    anchor = parent;
    parent = parent.parentElement;
  }

  return inputMenuButton.parentElement ? { parent: inputMenuButton.parentElement, anchor: inputMenuButton } : null;
}

function findPrimaryModelSelectorButton(document) {
  const button = document.getElementById(PRIMARY_MODEL_SELECTOR_TRIGGER_ID);
  return button instanceof HTMLElement ? button : undefined;
}

function prepareComposerModelSelectorButton(document) {
  const selectorButton = findPrimaryModelSelectorButton(document);
  if (!(selectorButton instanceof HTMLElement)) return undefined;

  selectorButton.dataset.enosComposerModelSelectorTrigger = "true";
  return selectorButton;
}

function findOpenModelDropdown(document) {
  const fields = document.querySelectorAll("input[placeholder], input[aria-label], [role='combobox']");

  for (const field of fields) {
    if (!(field instanceof HTMLElement)) continue;
    const marker = [
      field.getAttribute("placeholder") || "",
      field.getAttribute("aria-label") || "",
      field.innerText || "",
      field.textContent || "",
    ].join(" ");

    if (!normalizedText(marker).includes("search a model")) continue;

    let root = field.parentElement;
    let current = field.parentElement;
    for (let depth = 0; current && depth < 8; depth += 1) {
      if (!(current instanceof HTMLElement)) break;
      if (current === document.body || current === document.documentElement) break;

      const className = current.getAttribute("class") || "";
      const role = normalizedText(current.getAttribute("role") || "");
      if (
        /\b(fixed|absolute|shadow|rounded|z-\d+)\b/.test(className) ||
        ["dialog", "listbox", "menu"].includes(role)
      ) {
        root = current;
      }

      current = current.parentElement;
    }

    return root instanceof HTMLElement ? root : field;
  }

  return undefined;
}

function findOpenAttachMenu(document) {
  for (const element of document.querySelectorAll("div, [role='menu'], [role='dialog']")) {
    if (!(element instanceof HTMLElement)) continue;
    const text = normalizedText(element.innerText || element.textContent || "");
    if (!text.includes("upload files") || !text.includes("reference chats")) continue;

    let root = element;
    let current = element;
    for (let depth = 0; current?.parentElement && depth < 6; depth += 1) {
      const parent = current.parentElement;
      if (parent === document.body || parent === document.documentElement) break;
      const className = parent.getAttribute("class") || "";
      if (/\b(fixed|absolute|shadow|rounded|z-\d+)\b/.test(className)) root = parent;
      current = parent;
    }

    return root;
  }

  return undefined;
}

export function composerModelDropdownAnchorFromRects(clusterRect = {}, formRect) {
  // Anchor the model dropdown to the orb cluster's OWN row — never the whole
  // composer <form>. OWUI's native "+" attach menu hugs the + button; merging in
  // formRect.bottom pushed the model dropdown far below the form on the welcome
  // and main-chat screens (the "much lower than +" gap users kept hitting). The
  // form is only consulted as a horizontal (left) fallback when the cluster has
  // not been measured yet — its height is never borrowed.
  const top = finiteNumber(clusterRect.top, 0);
  const height = finiteNumber(clusterRect.height, 0);
  const bottom = finiteNumber(clusterRect.bottom, top + height);
  const left = finiteNumber(clusterRect.left, finiteNumber(formRect?.left, 0));
  const width = finiteNumber(clusterRect.width, 0);
  return { left, top, bottom, width, height: height || Math.max(0, bottom - top) };
}

function composerModelDropdownAnchorRect(cluster) {
  const clusterRect = cluster.getBoundingClientRect();
  const form = cluster.closest("form");
  const formRect = form instanceof HTMLElement ? form.getBoundingClientRect() : undefined;
  return composerModelDropdownAnchorFromRects(clusterRect, formRect);
}

function positionComposerModelDropdown(document) {
  const cluster = document.getElementById(COMPOSER_MODEL_ORBS_ID);
  if (!(cluster instanceof HTMLElement)) return;

  const dropdown = findOpenModelDropdown(document);
  if (!(dropdown instanceof HTMLElement)) return;

  const viewport = document.defaultView || globalThis;
  const placement = composerModelDropdownPlacement(
    composerModelDropdownAnchorRect(cluster),
    dropdown.getBoundingClientRect(),
    { width: viewport.innerWidth, height: viewport.innerHeight },
  );

  // Align the picker's model rows under the composer orb (the picked model).
  // Cancel the dropdown's constant internal inset to its first row orb so that
  // orb sits at the same x as the composer orb; the inset is fixed, so this
  // settles in one frame without oscillating.
  let left = placement.left;
  const composerOrb = cluster.querySelector("img");
  const rowOrb = dropdown.querySelector("img");
  if (composerOrb instanceof HTMLElement && rowOrb instanceof HTMLElement) {
    const inset = rowOrb.getBoundingClientRect().left - dropdown.getBoundingClientRect().left;
    const aligned = composerOrb.getBoundingClientRect().left - inset;
    const viewportWidth = finiteNumber(viewport.innerWidth, 1024);
    left = Math.max(8, Math.min(aligned, viewportWidth - placement.width - 8));
  }

  dropdown.dataset.enosComposerModelDropdown = placement.opens;
  dropdown.style.position = placement.position;
  dropdown.style.left = `${left}px`;
  dropdown.style.top = `${placement.top}px`;
  dropdown.style.bottom = "auto";
  dropdown.style.width = `${placement.width}px`;
  dropdown.style.maxHeight = `${placement.maxHeight}px`;
  dropdown.style.overflowY = "auto";
  dropdown.style.zIndex = "1000";

  // Tighten the visible model list to the three sticky mind tiers only. OWUI
  // ships a generic picker with a tab-pill filter row (All / External / enos
  // desk / m11b) AND a listbox that, in the "All" view, also leaks the raw
  // provider model and the ENOS Desk bridge. On the chat surface those are
  // meaningless to the user — they want a 3-row picker, no scroll, no pill
  // filter chrome. The listbox rows are filtered here in place; the pill row
  // gets a data-attr so CSS can hide it. Idempotent: re-running on the same
  // open dropdown is a no-op.
  const listbox = dropdown.querySelector("[role='listbox']");
  if (listbox instanceof HTMLElement && listbox.dataset.enosPickerFiltered !== "true") {
    const options = listbox.querySelectorAll("[role='option']");
    for (const option of options) {
      const text = normalizedText(
        [option.getAttribute("aria-label") || "", option.textContent || ""].join(" "),
      );
      const classification = classifyModelLabel(text, option.getAttribute("data-value") || "");
      const surfaceKey = document.documentElement.dataset.enosSurface || "chat";
      const isStickyMind = classification.kind === "mind-tier";
      const isDeskTier = classification.kind === "desk-tier";
      const shouldHide =
        classification.kind === "raw-provider" ||
        classification.kind === "desk-bridge" ||
        classification.kind === "terminal-bridge" ||
        (surfaceKey === "chat" && isDeskTier) ||
        (surfaceKey !== "chat" && isStickyMind);
      if (shouldHide) {
        option.style.display = "none";
      }
    }
    listbox.dataset.enosPickerFiltered = "true";
  }

  // Mark the tab-pill filter row AND the search-bar row so CSS can hide them.
  // The pill row contains the All/External/... button pills. The search row
  // contains the search input + magnifying-glass svg. We detect both by class
  // / attribute signature, not by literal class-name escapes (escapes like
  // `gap-2\.5` are fragile and broke a previous version of this CSS, dropping
  // an entire block).
  for (const row of dropdown.children) {
    if (!(row instanceof HTMLElement)) continue;
    if (row.querySelector("#model-search-input") && row.dataset.enosPickerSearchRow !== "true") {
      row.dataset.enosPickerSearchRow = "true";
      continue;
    }
    const pillButton = row.querySelector('button[aria-pressed]');
    if (
      pillButton &&
      /capitalize/.test(pillButton.className || "") &&
      row.dataset.enosPickerPillRow !== "true"
    ) {
      row.dataset.enosPickerPillRow = "true";
    }
  }

  // Bug: OWUI only writes sessionStorage.selectedModels when chatIdProp !== ''.
  // On the welcome page the user can change the model, but the selection is
  // dropped when the first message creates a chat and initChat falls back to
  // settings/default. Capture the picked model here so the chosen mind tier
  // survives the welcome -> main-chat transition.
  persistComposerModelSelection(document, dropdown);
}

export function persistComposerModelSelection(document, dropdown) {
  if (dropdown.dataset.enosComposerModelPersist === "true") return;
  dropdown.dataset.enosComposerModelPersist = "true";

  dropdown.addEventListener("click", (event) => {
    const target = event.target;
    const option =
      typeof target?.closest === "function"
        ? target.closest("[role='option']")
        : null;
    if (!option || typeof option.getAttribute !== "function") return;
    const value = option.getAttribute("data-value") || "";
    if (!value) return;
    try {
      const selectedModels = [value];
      sessionStorage.selectedModels = JSON.stringify(selectedModels);
    } catch (e) {
      // ignore storage errors
    }
  });
}

function dismissNativeModelDropdown(document) {
  const dropdown = findOpenModelDropdown(document);
  if (dropdown instanceof HTMLElement) dropdown.remove();

  const selectorButton = findPrimaryModelSelectorButton(document);
  selectorButton?.setAttribute("aria-expanded", "false");
}

function dismissComposerModelDropdown(document) {
  const dropdown = findOpenModelDropdown(document);
  if (dropdown instanceof HTMLElement) dropdown.remove();

  const selectorButton = findPrimaryModelSelectorButton(document);
  selectorButton?.setAttribute("aria-expanded", "false");
}

function dismissAttachMenu(document) {
  const view = document.defaultView;
  for (const target of [document.activeElement, document.body, document]) {
    target?.dispatchEvent?.(
      new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
    );
  }

  view?.setTimeout?.(() => {
    const attachMenu = findOpenAttachMenu(document);
    if (attachMenu instanceof HTMLElement) attachMenu.remove();
  }, 0);
}

function ensureAttachMenuDismissesModelDropdown(document, inputMenuButton) {
  if (!(inputMenuButton instanceof HTMLElement) || inputMenuButton.dataset.enosDismissesModelDropdown === "true") return;
  inputMenuButton.dataset.enosDismissesModelDropdown = "true";
  inputMenuButton.addEventListener(
    "pointerdown",
    () => dismissComposerModelDropdown(document),
    { capture: true },
  );
  inputMenuButton.addEventListener(
    "click",
    () => dismissComposerModelDropdown(document),
    { capture: true },
  );
}

function openComposerModelPicker(cluster, selectedOrbs, event) {
  consumeComposerModelOrbEvent(event);
  const { ownerDocument: document } = cluster;
  dismissAttachMenu(document);

  /* Open the native OWUI model dropdown which has search + full model list.
     The MutationObserver picks it up and positionComposerModelDropdown caps
     the width to 560px. */
  const selectorButton = findPrimaryModelSelectorButton(document);
  if (selectorButton instanceof HTMLElement) selectorButton.click();
}

function ensureComposerModelOrbs(document) {
  const inputMenuButton = document.getElementById("input-menu-button");
  const existing = document.getElementById(COMPOSER_MODEL_ORBS_ID);

  if (!(inputMenuButton instanceof HTMLElement)) {
    existing?.remove();
    return;
  }
  ensureAttachMenuDismissesModelDropdown(document, inputMenuButton);

  const orbs = selectedMindTierOrbsFromDocument(document);
  if (orbs.length === 0) {
    existing?.remove();
    return;
  }

  const placement = composerOrbAnchor(inputMenuButton);
  if (!placement) {
    existing?.remove();
    return;
  }

  const { parent, anchor } = placement;
  const cluster = existing instanceof HTMLElement ? existing : document.createElement("div");
  const signature = orbs.map((orb) => orb.tier).join(",");
  const controlPolicy = composerModelOrbsControlPolicy(orbs);
  const labelSignature = controlPolicy.displayLabel;

  cluster.id = COMPOSER_MODEL_ORBS_ID;
  cluster.dataset.enosComposerModelOrbs = signature;
  cluster.setAttribute("aria-label", controlPolicy.label);
  cluster.setAttribute("title", controlPolicy.label);
  cluster.setAttribute("role", controlPolicy.interactive ? "button" : "img");
  cluster.tabIndex = controlPolicy.interactive ? 0 : -1;
  cluster.removeAttribute("aria-hidden");
  cluster.onpointerdown = controlPolicy.interactive ? consumeComposerModelOrbEvent : null;
  cluster.onmousedown = controlPolicy.interactive ? consumeComposerModelOrbEvent : null;
  cluster.onclick = controlPolicy.interactive
    ? (event) => openComposerModelPicker(cluster, orbs, event)
    : null;
  cluster.onkeydown = controlPolicy.interactive
    ? (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        openComposerModelPicker(cluster, orbs, event);
      }
    : null;

  if (cluster.dataset.enosComposerModelOrbsRendered !== `${signature}|${labelSignature}`) {
    const stack = document.createElement("span");
    stack.className = "enos-composer-model-orb-stack";
    stack.setAttribute("aria-hidden", "true");
    stack.replaceChildren(
      ...orbs.map((orb) => {
        const image = document.createElement("img");
        image.src = orb.src;
        image.alt = "";
        image.dataset.enosComposerModelOrb = orb.tier;
        image.decoding = "async";
        image.loading = "eager";
        return image;
      }),
    );

    const label = document.createElement("span");
    label.className = "enos-composer-model-name";
    label.textContent = controlPolicy.displayLabel;

    cluster.replaceChildren(stack, label);
    cluster.dataset.enosComposerModelOrbsRendered = `${signature}|${labelSignature}`;
  }

  if (cluster.parentElement !== parent || anchor.nextElementSibling !== cluster) {
    parent.insertBefore(cluster, anchor.nextSibling);
  }

  prepareComposerModelSelectorButton(document);
  positionComposerModelDropdown(document);
}

function applyInteractivePolicy(document, surface) {
  const candidates = document.querySelectorAll(
    [
      "button",
      "a",
      "[role='button']",
      "[role='option']",
      "[role='menuitem']",
      "[role='tab']",
      "[aria-label]",
    ].join(","),
  );

  for (const element of candidates) {
    if (!(element instanceof HTMLElement)) continue;
    if (isAssistantContent(element)) continue;

    const text = [
      element.innerText || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
    ].join(" ");
    const topDefaultPolicy = topModelDefaultChromePolicy(surface.key, text);
    if (!topDefaultPolicy.visible) {
      const defaultRoot = findTopModelDefaultChromeRoot(element);
      if (defaultRoot instanceof HTMLElement) markHidden(defaultRoot, topDefaultPolicy.reason);
      continue;
    }

    const terminalLabel = terminalLabelForSurface(surface.key, text);

    if (terminalLabel === null) {
      markHidden(element, "chat-hides-terminal");
      continue;
    }

    if (typeof terminalLabel === "string") {
      unhideIfSurfaceOwned(element);
      replaceVisibleText(element, terminalLabel);
      element.dataset.enosSurfaceTerminal = surface.key;
      continue;
    }

    const policy = modelPolicy(surface.key, text, element.getAttribute("data-value") || "");
    if (!policy.visible) {
      markHidden(element, policy.reason);
      continue;
    }

    unhideIfSurfaceOwned(element);
  }
}

function hideTopModelDefaultChrome(document, surface) {
  if (surface.key !== "chat") return;

  for (const element of document.querySelectorAll("div, span, button, a, [role='button']")) {
    if (!(element instanceof HTMLElement)) continue;
    if (isAssistantContent(element) || element.closest("form")) continue;

    const text = normalizedText(
      [
        element.innerText || "",
        element.textContent || "",
        element.getAttribute("aria-label") || "",
        element.getAttribute("title") || "",
      ].join(" "),
    );
    if (!text.includes("set as default") || text.includes("search a model") || text.length > 120) {
      continue;
    }

    const policy = topModelDefaultChromePolicy(surface.key, text);
    if (!policy.visible) {
      const defaultRoot = findTopModelDefaultChromeRoot(element);
      if (defaultRoot instanceof HTMLElement) markHidden(defaultRoot, policy.reason);
    }
  }
}

function resetSurfaceOwnedMutations(document) {
  document.getElementById(COMPOSER_MODEL_ORBS_ID)?.remove();

  for (const element of document.querySelectorAll("[data-enos-surface-hidden]")) {
    if (!(element instanceof HTMLElement)) continue;
    unhideIfSurfaceOwned(element);
  }
}

function removeLegacyComposerModelOrbs(document) {
  // The forked OWUI composer now owns model selection through
  // src/lib/components/enos/ModelPicker.svelte. The older surface-injected
  // orb mirrored #model-selector-0-button and could drift from the real
  // composer state, making model changes look stuck.
  document.getElementById(COMPOSER_MODEL_ORBS_ID)?.remove();
}

function applySurface(document, surface) {
  document.documentElement.dataset.enosSurface = surface.key;
  const isProductRoute = isProductChatRoute(document.location?.pathname || "/");
  document.documentElement.dataset.enosProductRoute = isProductRoute ? "true" : "false";

  if (document.title !== surface.title) {
    document.title = surface.title;
  }
  ensureMeta(document, "application-name", surface.title);
  ensureMeta(document, "apple-mobile-web-app-title", surface.title);
  setManifest(document, surface);
  ensureSidebarLogo(document, surface);

  if (!isProductRoute) {
    resetSurfaceOwnedMutations(document);
    removeModelsPlaygroundNav(document);
    return;
  }

  applyInteractivePolicy(document, surface);
  hideTopModelDefaultChrome(document, surface);
  if (surface.key !== "chat") {
    relocateTerminalCloudControl(document);
  }
  ensureDeskSidePaneButton(document, surface);
  removeLegacyComposerModelOrbs(document);
  removeModelsPlaygroundNav(document);
  suppressRightPanels(document, surface);
}

export function initSurface(windowObject = globalThis.window) {
  if (!windowObject?.document) return undefined;

  const surface = getSurfaceForHostname(windowObject.location.hostname);
  const { document } = windowObject;

  const run = () => applySurface(document, surface);
  const schedule =
    typeof windowObject.requestAnimationFrame === "function"
      ? (callback) => windowObject.requestAnimationFrame(callback)
      : (callback) => windowObject.setTimeout(callback, 16);
  const scheduleRun = createRunCoalescer(run, schedule);
  run();

  const observer = new windowObject.MutationObserver(scheduleRun);
  const observeBody = () => {
    run();
    observer.observe(observerTargetForDocument(document), surfaceObserverConfig());
  };

  if (document.body) {
    observeBody();
  } else {
    windowObject.addEventListener("DOMContentLoaded", observeBody, { once: true });
  }

  return { surface, observer };
}

if (typeof window !== "undefined" && window.document) {
  initSurface(window);
}
