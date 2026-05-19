(function () {
  const CLIENT_MOCK = {
    recommended_size: "L",
    confidence_score: 85,
    is_demo: true,
    reasoning:
      "Roughly 80% of reviews report this item runs small or snug, especially " +
      "in the shoulders and chest. Based on your Zara benchmark size and fit " +
      "preferences, we recommend sizing up to L for a more comfortable fit.",
  };

  function isZaraProductPage() {
    if (!/zara\.com/i.test(window.location.hostname)) return false;

    const path = window.location.pathname;
    if (/-p\d{4,}/i.test(path)) return true;
    if (/\/product\//i.test(path)) return true;

    const productName = document.querySelector(
      '[data-qa-qualifier="product-name"], [data-qa="product-name"], h1'
    );
    const addToCart = document.querySelector(
      '[data-qa-qualifier="add-to-cart"], [data-qa="add-to-cart"], button[class*="add-to-cart"]'
    );

    return Boolean(productName && addToCart);
  }

  function extractProductId() {
    const match = window.location.pathname.match(/-p(\d{4,})/i);
    if (match) return `zara-${match[1]}`;

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical?.href) {
      const m = canonical.href.match(/-p(\d{4,})/i);
      if (m) return `zara-${m[1]}`;
    }

    const meta = document.querySelector('meta[property="og:url"]');
    if (meta?.content) {
      const m = meta.content.match(/-p(\d{4,})/i);
      if (m) return `zara-${m[1]}`;
    }

    return `zara-${window.location.pathname.replace(/\//g, "-").slice(0, 80)}`;
  }

  function extractProductName() {
    const selectors = [
      '[data-qa-qualifier="product-name"]',
      '[data-qa="product-name"]',
      "h1.product-detail-info__header-name",
      "h1",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return document.title.split("|")[0]?.trim() || "Zara Product";
  }

  function buildProductPayload() {
    return {
      external_product_id: extractProductId(),
      brand: "Zara",
      name: extractProductName(),
      link: window.location.href.split("?")[0],
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
              <p>Analyzing reviews &amp; calculating your fit...</p>
            </div>
            <div id="sizefitai-result" class="sizefitai-result sizefitai-hidden"></div>
            <div id="sizefitai-error" class="sizefitai-error sizefitai-hidden"></div>
          </div>
        </div>
      </aside>
    `;

    document.body.appendChild(root);

    document.getElementById("sizefitai-toggle").addEventListener("click", () => {
      document
        .getElementById("sizefitai-sidebar")
        .classList.toggle("collapsed");
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

    if (badge && recommendation?.is_demo) {
      badge.textContent = "Demo";
    }

    const score = Math.min(
      100,
      Math.max(1, recommendation.confidence_score || 85)
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
        ${escapeHtml(product.brand || "Zara")}
        <strong>${escapeHtml(product.name || extractProductName())}</strong>
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

    const productInfo = buildProductPayload();
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
        product: productInfo,
        recommendation: CLIENT_MOCK,
      });
    }
  }

  function init() {
    if (!isZaraProductPage()) return;
    ensureSidebar();
    fetchRecommendation();
  }

  function handleRefresh() {
    if (!/zara\.com/i.test(window.location.hostname)) return;
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
