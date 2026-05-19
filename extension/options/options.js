import { API_BASE_URL } from "../shared/config.js";
import { SIZE_OPTIONS_HTML } from "../shared/constants.js";

const STORAGE_SIMPLE = "fitsize_simple_profile";

const form = document.getElementById("profile-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");

document.getElementById("api-url").textContent = API_BASE_URL;
document.getElementById("brand_size").insertAdjacentHTML("beforeend", SIZE_OPTIONS_HTML);

const FIT_MAP = {
  relaxed: {
    tops_fit: "regular",
    bottoms_fit: "straight",
    outerwear_fit: "regular",
  },
  fitted: {
    tops_fit: "tight",
    bottoms_fit: "slim",
    outerwear_fit: "snug",
  },
  oversized: {
    tops_fit: "oversized",
    bottoms_fit: "loose",
    outerwear_fit: "layering",
  },
};

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function getSimpleFormData() {
  const data = new FormData(form);
  return {
    favorite_brand: data.get("favorite_brand"),
    brand_size: data.get("brand_size"),
    fit_preference: data.get("fit_preference"),
  };
}

function toApiPayload(simple) {
  const size = simple.brand_size;
  const brand = simple.favorite_brand;
  const fit = FIT_MAP[simple.fit_preference] || FIT_MAP.fitted;

  const sizes = {
    zara_size: brand === "zara" ? size : "M",
    hm_size: brand === "hm" ? size : "M",
    asos_size: brand === "asos" ? size : "M",
    nike_size: brand === "nike" ? size : "M",
  };

  return {
    name: "FitSize User",
    height_cm: 170,
    weight_kg: 70,
    body_shape: "standard",
    ...sizes,
    ...fit,
  };
}

function inferFitPreference(user) {
  if (user.tops_fit === "oversized") return "oversized";
  if (user.tops_fit === "tight") return "fitted";
  return "relaxed";
}

function inferFavoriteBrand(user) {
  const brands = [
    { key: "zara", size: user.zara_size },
    { key: "hm", size: user.hm_size },
    { key: "asos", size: user.asos_size },
    { key: "nike", size: user.nike_size },
  ];
  const nonDefault = brands.find((b) => b.size && b.size !== "M");
  return nonDefault?.key || "zara";
}

function fillForm(simple, user = null) {
  const brand = simple?.favorite_brand || (user ? inferFavoriteBrand(user) : "zara");
  const size =
    simple?.brand_size ||
    user?.[`${brand}_size`] ||
    user?.zara_size ||
    "M";
  const fitPref =
    simple?.fit_preference || (user ? inferFitPreference(user) : "fitted");

  form.favorite_brand.value = brand;
  form.brand_size.value = size;
  const fitInput = form.querySelector(
    `input[name="fit_preference"][value="${fitPref}"]`
  );
  if (fitInput) fitInput.checked = true;
}

async function loadExistingProfile() {
  const stored = await chrome.storage.sync.get(STORAGE_SIMPLE);
  if (stored[STORAGE_SIMPLE]) {
    fillForm(stored[STORAGE_SIMPLE]);
    setStatus("Profile loaded", "success");
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: "LOAD_PROFILE" });
  if (response?.ok && response.user) {
    fillForm(null, response.user);
    setStatus("Profile loaded from server", "success");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Saving...");

  try {
    const simple = getSimpleFormData();
    const payload = toApiPayload(simple);

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_PROFILE",
      payload,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Save failed");
    }

    await chrome.storage.sync.set({ [STORAGE_SIMPLE]: simple });
    setStatus("You're all set — head to a product page!", "success");
  } catch (err) {
    setStatus(err.message || "Error saving profile", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

loadExistingProfile().catch(() => {
  setStatus("Could not load existing profile", "error");
});
