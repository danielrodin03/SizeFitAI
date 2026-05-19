const statusEl = document.getElementById("profile-status");

chrome.storage.sync.get("sizefit_user_id", (data) => {
  if (data.sizefit_user_id) {
    statusEl.textContent = `Profile connected (#${data.sizefit_user_id})`;
  } else {
    statusEl.textContent = "No profile yet — set up to get recommendations";
  }
});

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("refresh-page").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "REFRESH_RECOMMENDATION" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/content.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: "REFRESH_RECOMMENDATION" });
  }

  window.close();
});
