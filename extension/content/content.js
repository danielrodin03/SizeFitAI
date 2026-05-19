(function () {
  const PAGE_TEXT_MAX = 8000;
  const BLOCKED_PREFIXES = [
    "chrome://",
    "chrome-extension://",
    "about:",
    "edge://",
    "moz-extension://",
  ];

  const CLIENT_MOCK = {
    recommended_size: "L",
    confidence_score: 75,
    is_demo: true,
    reasoning:
      "Based on sizing cues found on this page and your fit profile, we recommend " +
      "this size for the best match. Add more detail on the product page for higher confidence.",
  };

  function isSupportedPage() {
    const url = window.location.href;
    if (BLOCKED_PREFIXES.some((p) => url.startsWith(p))) return false;
    return /^https?:\/\//i.test(url);
  }

  function extractPageText() {
    const raw = document.body?.innerText || "";
    const normalized = raw.replace(/\s+/g, " ").trim();
    return normalized.slice(0, PAGE_TEXT_MAX);
  }

  function hashUrl(url) {
    const base = url.split("?")[0].split("#")[0];
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    return `url-${Math.abs(hash).toString(36)}`;
  }

  function titleToProductName() {
    const title = document.title || "";
    const parts = title.split(/[|\-–—]/).map((s) => s.trim());
    const name = parts[0] || title;
    return name.slice(0, 512) || "Product";
  }

  function hostnameToBrandHint() {
    try {
      const host = window.location.hostname.replace(/^www\./, "");
      const segment = host.split(".")[0];
      if (!segment || segment.length < 2) return "";
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    } catch {
      return "";
    }
  }

  async function buildProductPayload() {
    const link = window.location.href.split("?")[0].split("#")[0];
    const pageBrand = hostnameToBrandHint();
    const brand = pageBrand || "Fashion";

    return {
      external_product_id: hashUrl(link),
      brand,
      name: titleToProductName(),
      link,
      page_text: extractPageText(),
    };
  }

  function ensureSidebar() {
    if (document.getElementById("sizefitai-root")) return;

    const root = document.createElement("div");
    root.id = "sizefitai-root";
    root.innerHTML = `
      <aside class="sizefitai-sidebar" id="sizefitai-sidebar">
        <button class="sizefitai-toggle" id="sizefitai-toggle" aria-label="Toggle FitSize AI">FitSize</button>
        <div class="sizefitai-inner">
          <header class="sizefitai-header">
            <div class="sizefitai-logo">FitSize<span>AI</span></div>
            <span class="sizefitai-badge" id="sizefitai-mode-badge">Beta</span>
          </header>
          <div class="sizefitai-product" id="sizefitai-product"></div>
          <div id="sizefitai-content">
            <div class="sizefitai-loader" id="sizefitai-loader">
              <div class="sizefitai-spinner"></div>
              <p>Reading this page &amp; analyzing fit...</p>
            </div>
            <div id="sizefitai-result" class="sizefitai-result sizefitai-hidden"></div>
            <div id="sizefitai-error" class="sizefitai-error sizefitai-hidden"></div>
          </div>
        </div>
      </aside>
    `;

    document.body.appendChild(root);

    document.getElementById("sizefitai-toggle")?.addEventListener("click", () => {
      document.getElementById("sizefitai-sidebar")?.classList.toggle("collapsed");
    });
  }

  function showLoader() {
    ensureSidebar();
    document.getElementById("sizefitai-loader")?.classList.remove("sizefitai-hidden");
    document.getElementById("sizefitai-result")?.classList.add("sizefitai-hidden");
    document.getElementById("sizefitai-error")?.classList.add("sizefitai-hidden");
  }

  function showError(message, showProfileCta = false) {
    ensureSidebar();
    const loader = document.getElementById("sizefitai-loader");
    const result = document.getElementById("sizefitai-result");
    const error = document.getElementById("sizefitai-error");

    loader?.classList.add("sizefitai-hidden");
    result?.classList.add("sizefitai-hidden");
    error?.classList.remove("sizefitai-hidden");

    error.innerHTML = `
      <p>${escapeHtml(message)}</p>
      ${
        showProfileCta
          ? '<button class="sizefitai-cta" id="sizefitai-open-profile">Set up in 60 seconds →</button>'
          : ""
      }
    `;

    if (showProfileCta) {
      document
        .getElementById("sizefitai-open-profile")
        ?.addEventListener("click", () => chrome.runtime.openOptionsPage());
    }
  }

  function showResult(data) {
    ensureSidebar();
    const { recommendation, product } = data;
    const loader = document.getElementById("sizefitai-loader");
    const error = document.getElementById("sizefitai-error");
    const result = document.getElementById("sizefitai-result");
    const badge = document.getElementById("sizefitai-mode-badge");

    loader?.classList.add("sizefitai-hidden");
    error?.classList.add("sizefitai-hidden");
    result?.classList.remove("sizefitai-hidden");

    if (badge) {
      if (recommendation?.is_demo) badge.textContent = "Demo";
      else if (product?.parsed_from_page) badge.textContent = "Live";
      else badge.textContent = "Beta";
    }

    const score = Math.min(
      100,
      Math.max(1, recommendation.confidence_score || 75)
    );

    result.innerHTML = `
      <div class="sizefitai-size-card">
        <div class="sizefitai-size-label">Size Recommend</div>
        <div class="sizefitai-size-value">${escapeHtml(recommendation.recommended_size)}</div>
      </div>
      <div class="sizefitai-confidence">
        <div class="sizefitai-confidence-header">
          <span>Confidence</span>
          <span>${score}%</span>
        </div>
        <div class="sizefitai-confidence-bar">
          <div class="sizefitai-confidence-fill" style="width: 0%"></div>
        </div>
      </div>
      <div class="sizefitai-reasoning">
        <h3>Why this size</h3>
        <p>${escapeHtml(recommendation.reasoning)}</p>
      </div>
    `;

    requestAnimationFrame(() => {
      const fill = result.querySelector(".sizefitai-confidence-fill");
      if (fill) fill.style.width = `${score}%`;
    });

    const productEl = document.getElementById("sizefitai-product");
    if (productEl && product) {
      productEl.innerHTML = `
        ${escapeHtml(product.brand || "")}
        <strong>${escapeHtml(product.name || titleToProductName())}</strong>
      `;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  async function fetchRecommendation() {
    showLoader();

    const productInfo = await buildProductPayload();
    const productEl = document.getElementById("sizefitai-product");
    if (productEl) {
      productEl.innerHTML = `
        ${escapeHtml(productInfo.brand)}
        <strong>${escapeHtml(productInfo.name)}</strong>
      `;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_RECOMMENDATION",
        payload: productInfo,
      });

      if (!response?.ok) {
        if (response?.error === "PROFILE_REQUIRED") {
          showError(response.message, true);
          return;
        }
        throw new Error(response?.message || response?.error || "Error");
      }

      showResult(response);
    } catch (err) {
      if (err.message?.includes("Extension context invalidated")) {
        showError("Reload the extension and refresh this page", false);
        return;
      }

      showResult({
        product: { ...productInfo, parsed_from_page: true },
        recommendation: CLIENT_MOCK,
      });
    }
  }

  function init() {
    if (!isSupportedPage()) return;
    ensureSidebar();
    fetchRecommendation();
  }

  function handleRefresh() {
    if (!isSupportedPage()) return;
    ensureSidebar();
    fetchRecommendation();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "REFRESH_RECOMMENDATION") {
      handleRefresh();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
