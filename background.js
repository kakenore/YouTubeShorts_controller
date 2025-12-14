chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "LIMIT_REACHED" && sender.tab?.id) {
    chrome.tabs.update(sender.tab.id, { url: "https://www.youtube.com/" });
  }
  if (msg.type === "STORE_SET" && msg.data) {
    try {
      chrome.storage.local.set(msg.data, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "background storage.set error",
            chrome.runtime.lastError
          );
        }
      });
    } catch (e) {
      console.error("background STORE_SET exception", e);
    }
  }
});
