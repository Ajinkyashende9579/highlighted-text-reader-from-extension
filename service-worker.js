// This script runs in the background and listens for context menu and keyboard command events.

const MENU_ID = "read-selected-text";
const COMMAND_ID = "read-highlighted-text";
const DEFAULT_SETTINGS = {
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: "en-US",
  voiceName: ""
};

// ----------------------------------------------------------------------
// TTS Speaking Function
// ----------------------------------------------------------------------

function getStoredSettings(callback) {
  chrome.storage.sync.get(["voiceSettings"], (data) => {
    const settings = data.voiceSettings || {};
    callback({ ...DEFAULT_SETTINGS, ...settings });
  });
}

function speakText(text, overrides = {}) {
  if (!text || text.trim().length === 0) return;

  const merged = { ...DEFAULT_SETTINGS, ...overrides };

  chrome.tts.stop();
  chrome.tts.speak(text, {
    rate: merged.rate,
    pitch: merged.pitch,
    volume: merged.volume,
    lang: merged.lang,
    voiceName: merged.voiceName,
    onEvent(event) {
      if (event.type === "error") {
        console.error("TTS Error:", event.errorMessage);
      }
    }
  });
}

// ----------------------------------------------------------------------
// Command Handler: Logic to retrieve and speak text when shortcut is pressed
// ----------------------------------------------------------------------

// Function to execute in the active tab to get the selection
function getSelectionText() {
  return window.getSelection().toString();
}

function fetchSelectionFromActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      callback("");
      return;
    }

    const tabId = tabs[0].id;
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: getSelectionText
      },
      (results) => {
        const selectedText = results && results[0] && results[0].result ? results[0].result : "";
        callback(selectedText);
      }
    );
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === COMMAND_ID) {
    fetchSelectionFromActiveTab((selectedText) => {
      if (!selectedText) {
        console.warn("No text selected or failed to retrieve selection.");
        return;
      }
      getStoredSettings((settings) => speakText(selectedText, settings));
    });
  }
});

// ----------------------------------------------------------------------
// Context Menu Handler: Existing logic for right-click menu
// ----------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Read Selected Text Aloud",
    contexts: ["selection"] 
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_ID) {
    getStoredSettings((settings) => speakText(info.selectionText, settings));
  }
});

console.log("PDF Highlight Reader Service Worker running. Shortcut set to Ctrl+Shift+S (or Cmd+Shift+S).");

// ----------------------------------------------------------------------
// Messaging: handle popup interactions
// ----------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "READ_SELECTION") {
    fetchSelectionFromActiveTab((selectedText) => {
      if (!selectedText) {
        sendResponse({ ok: false, message: "No text selected in the active tab." });
        return;
      }
      speakText(selectedText, message.options);
      sendResponse({ ok: true, message: "Reading your highlighted text." });
    });
    return true;
  }

  if (message.type === "READ_CUSTOM") {
    if (!message.text || !message.text.trim()) {
      sendResponse({ ok: false, message: "Please provide some text to read." });
      return;
    }
    speakText(message.text, message.options);
    sendResponse({ ok: true, message: "Reading your text." });
    return;
  }

  if (message.type === "STOP_TTS") {
    chrome.tts.stop();
    sendResponse({ ok: true, message: "Stopped speaking." });
    return;
  }
});
