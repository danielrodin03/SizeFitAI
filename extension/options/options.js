import { API_BASE_URL } from "../shared/config.js";
import { SIZE_OPTIONS_HTML } from "../shared/constants.js";

const form = document.getElementById("profile-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");

document.getElementById("api-url").textContent = API_BASE_URL;

["zara_size", "hm_size", "asos_size", "nike_size"].forEach((id) => {
  const select = document.getElementById(id);
  select.insertAdjacentHTML("beforeend", SIZE_OPTIONS_HTML);
});

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function getFormData() {
  const data = new FormData(form);
  return {
    name: data.get("name").trim(),
    height_cm: parseFloat(data.get("height_cm")),
    weight_kg: parseFloat(data.get("weight_kg")),
    zara_size: data.get("zara_size"),
    hm_size: data.get("hm_size"),
    asos_size: data.get("asos_size"),
    nike_size: data.get("nike_size"),
    tops_fit: data.get("tops_fit"),
    bottoms_fit: data.get("bottoms_fit"),
    outerwear_fit: data.get("outerwear_fit"),
    body_shape: data.get("body_shape"),
  };
}

function setRadio(name, value) {
  const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function fillForm(user) {
  form.name.value = user.name;
  form.height_cm.value = user.height_cm;
  form.weight_kg.value = user.weight_kg;
  form.zara_size.value = user.zara_size;
  form.hm_size.value = user.hm_size;
  form.asos_size.value = user.asos_size;
  form.nike_size.value = user.nike_size;
  setRadio("tops_fit", user.tops_fit);
  setRadio("bottoms_fit", user.bottoms_fit);
  setRadio("outerwear_fit", user.outerwear_fit);
  setRadio("body_shape", user.body_shape);
}

async function loadExistingProfile() {
  const response = await chrome.runtime.sendMessage({ type: "LOAD_PROFILE" });
  if (response?.ok && response.user) {
    fillForm(response.user);
    setStatus("Profile loaded from server", "success");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Saving...");

  try {
    const payload = getFormData();
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_PROFILE",
      payload,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Save failed");
    }

    setStatus(`Profile saved successfully (ID: ${response.user.id})`, "success");
  } catch (err) {
    setStatus(err.message || "Error saving profile", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

loadExistingProfile().catch(() => {
  setStatus("Could not load existing profile", "error");
});
