// ===== YouTube Shorts Auto Controller (Brave/Chrome 安定版) =====

const DEFAULTS = {
  maxShortsCount: 5,
  maxWatchSeconds: 5 * 60,
  shortsCount: 0,
  watchSeconds: 0,
  date: new Date().toDateString(),
};

let overlay;
let timer = null;
let lastPath = location.pathname;
let currentVideoId = null;

function today() {
  return new Date().toDateString();
}

function isShorts() {
  return location.pathname.startsWith("/shorts/");
}

function videoId() {
  return location.pathname.split("/shorts/")[1] || null;
}

function createOverlay() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    background: rgba(0,0,0,.8);
    color: #fff;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 13px;
    z-index: 2147483647;
    pointer-events: none;
  `;
  document.documentElement.appendChild(overlay);
}

function updateOverlay(state) {
  createOverlay();
  const remain = Math.max(0, state.maxWatchSeconds - state.watchSeconds);
  overlay.textContent = `Shorts ${state.shortsCount}/${
    state.maxShortsCount
  } ｜ 残り ${Math.ceil(remain / 60)} 分`;
}

// 安全な storage.set ラッパー。拡張機能コンテキストが無効化された場合の例外を吸収し、
// タイマーを止めてオーバーレイを非表示にする。
function safeStorageSet(obj) {
  // 可能なら background に委譲してストレージ更新を行う
  try {
    if (
      chrome &&
      chrome.runtime &&
      typeof chrome.runtime.sendMessage === "function"
    ) {
      chrome.runtime.sendMessage({ type: "STORE_SET", data: obj }, () => {
        if (chrome.runtime.lastError) {
          // メッセージ送信でエラーが発生した場合はローカルで試みる
          try {
            if (
              chrome &&
              chrome.storage &&
              chrome.storage.local &&
              typeof chrome.storage.local.set === "function"
            ) {
              chrome.storage.local.set(obj);
            }
          } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            if (msg.includes("Extension context invalidated")) {
              console.warn(
                "Extension context invalidated — stopping storage calls."
              );
              stopTimer();
              if (overlay) overlay.style.display = "none";
              return;
            }
            console.error("safeStorageSet fallback error", e);
          }
        }
      });
      return;
    }
  } catch (e) {
    // fallthrough to local set
  }

  // 最終手段でローカルに直接セット（例外は捕捉して処理を止める）
  try {
    if (
      chrome &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.set === "function"
    ) {
      chrome.storage.local.set(obj);
    }
  } catch (e) {
    try {
      const msg = e && e.message ? e.message : String(e);
      if (msg.includes("Extension context invalidated")) {
        console.warn("Extension context invalidated — stopping storage calls.");
        stopTimer();
        if (overlay) overlay.style.display = "none";
        return;
      }
    } catch (_) {}
    console.error("safeStorageSet direct error", e);
  }
}

// 安全に chrome.runtime.sendMessage を呼ぶラッパー
function safeSendMessage(message) {
  try {
    if (
      chrome &&
      chrome.runtime &&
      typeof chrome.runtime.sendMessage === "function"
    ) {
      try {
        chrome.runtime.sendMessage(message, () => {
          // callback が呼ばれた際に lastError を参照しても安全に扱う
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn(
              "safeSendMessage lastError:",
              chrome.runtime.lastError
            );
          }
        });
      } catch (e) {
        // 送信失敗時は黙ってログを出す
        console.error("safeSendMessage send error", e);
      }
    }
  } catch (e) {
    console.warn("safeSendMessage unavailable", e);
  }
}

// ホーム画面に戻ったらカウントをリセットする
function resetIfHome(state) {
  try {
    if (location.pathname === "/") {
      if (state.shortsCount !== 0 || state.watchSeconds !== 0) {
        state.date = today();
        state.shortsCount = 0;
        state.watchSeconds = 0;
        safeStorageSet(state);
      }
    }
  } catch (e) {
    console.error("resetIfHome error", e);
  }
}

function startTimer(state) {
  if (timer) return;
  timer = setInterval(() => {
    if (!isShorts()) return;
    state.watchSeconds++;
    safeStorageSet({ watchSeconds: state.watchSeconds });
    updateOverlay(state);
    if (state.watchSeconds >= state.maxWatchSeconds) {
      safeSendMessage({ type: "LIMIT_REACHED" });
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function handle(state) {
  resetIfHome(state);

  if (!isShorts()) {
    stopTimer();
    if (overlay) overlay.style.display = "none";
    return;
  }

  overlay && (overlay.style.display = "block");

  const vid = videoId();
  if (vid && vid !== currentVideoId) {
    currentVideoId = vid;
    state.shortsCount++;
    safeStorageSet({ shortsCount: state.shortsCount });
    if (state.shortsCount > state.maxShortsCount) {
      safeSendMessage({ type: "LIMIT_REACHED" });
      return;
    }
  }

  updateOverlay(state);
  startTimer(state);
}

try {
  chrome.storage.local.get(DEFAULTS, (state) => {
    handle(state);
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        handle(state);
      }
    }, 500);
  });
} catch (e) {
  console.warn("chrome.storage.local.get failed, falling back to defaults", e);
  handle(DEFAULTS);
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      handle(DEFAULTS);
    }
  }, 500);
}
