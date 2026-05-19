import {
  createUserProfile,
  getRecommendation,
  getUserProfile,
  resolveProduct,
  updateUserProfile,
} from "./shared/api.js";
import { STORAGE_KEYS } from "./shared/config.js";

const CLIENT_MOCK_RECOMMENDATION = {
  recommended_size: "L",
  confidence_score: 85,
  is_demo: true,
  reasoning:
    "Roughly 80% of reviews report this item runs small or snug, especially " +
    "in the shoulders and chest. Based on your Zara benchmark size and " +
    "outerwear fit preference, we recommend sizing up to L for a comfortable fit.",
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    sendResponse({ ok: false, error: err.message || "Unknown error" });
  });
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case "SAVE_PROFILE":
      return saveProfile(message.payload);
    case "LOAD_PROFILE":
      return loadProfile();
    case "GET_RECOMMENDATION":
      return getProductRecommendation(message.payload);
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function saveProfile(payload) {
  const stored = await chrome.storage.sync.get(STORAGE_KEYS.userId);
  let user;

  if (stored[STORAGE_KEYS.userId]) {
    user = await updateUserProfile(stored[STORAGE_KEYS.userId], payload);
  } else {
    user = await createUserProfile(payload);
  }

  await chrome.storage.sync.set({
    [STORAGE_KEYS.userId]: user.id,
    [STORAGE_KEYS.profile]: user,
  });

  return { ok: true, user };
}

async function loadProfile() {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.userId,
    STORAGE_KEYS.profile,
  ]);

  if (!stored[STORAGE_KEYS.userId]) {
    return { ok: true, user: null };
  }

  try {
    const user = await getUserProfile(stored[STORAGE_KEYS.userId]);
    await chrome.storage.sync.set({ [STORAGE_KEYS.profile]: user });
    return { ok: true, user };
  } catch {
    return { ok: true, user: stored[STORAGE_KEYS.profile] || null };
  }
}

async function getProductRecommendation(productInfo) {
  const stored = await chrome.storage.sync.get(STORAGE_KEYS.userId);
  const userId = stored[STORAGE_KEYS.userId];

  if (!userId) {
    return {
      ok: false,
      error: "PROFILE_REQUIRED",
      message: "Please set up your fit profile before getting a recommendation.",
    };
  }

  try {
    const resolved = await resolveProduct(productInfo);

    let recommendation;
    try {
      recommendation = await getRecommendation(userId, resolved.product_id);
    } catch (recErr) {
      console.warn("Recommend API failed, using client mock:", recErr);
      recommendation = CLIENT_MOCK_RECOMMENDATION;
    }

    return {
      ok: true,
      product: resolved,
      recommendation,
    };
  } catch (err) {
    console.warn("Full flow failed, using client mock:", err);
    return {
      ok: true,
      product: {
        brand: productInfo.brand,
        name: productInfo.name,
        demo_reviews_added: true,
      },
      recommendation: CLIENT_MOCK_RECOMMENDATION,
    };
  }
}
