import { API_BASE_URL } from "./config.js";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export function createUserProfile(profile) {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function updateUserProfile(userId, profile) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function getUserProfile(userId) {
  return request(`/api/users/${userId}`);
}

export function resolveProduct(product) {
  return request("/api/products/resolve", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function getRecommendation(userId, productId) {
  return request("/api/recommend", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, product_id: productId }),
  });
}
