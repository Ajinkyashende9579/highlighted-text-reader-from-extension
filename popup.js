const defaultSettings = {
  rate: 1,
  pitch: 1,
  volume: 1,
  voiceName: ""
};

const voiceSelect = document.getElementById("voiceSelect");
const rateInput = document.getElementById("rate");
const pitchInput = document.getElementById("pitch");
const volumeInput = document.getElementById("volume");
const customText = document.getElementById("customText");
const statusEl = document.getElementById("status");
const rateValue = document.getElementById("rateValue");
const pitchValue = document.getElementById("pitchValue");
const volumeValue = document.getElementById("volumeValue");

const readSelectionBtn = document.getElementById("readSelection");
const readCustomBtn = document.getElementById("readCustom");
const stopBtn = document.getElementById("stop");

function formatSliderValue(num, suffix = "") {
  return `${num.toFixed(1)}${suffix}`;
}

function setStatus(message, mood = "info") {
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  statusEl.style.borderColor = mood === "error" ? "#ef4444" : "rgba(14, 165, 233, 0.35)";
  statusEl.style.background = mood === "error" ? "#fef2f2" : "#ecfeff";
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.classList.add("hidden");
}

function collectSettings() {
  return {
    rate: Number(rateInput.value),
    pitch: Number(pitchInput.value),
    volume: Number(volumeInput.value),
    voiceName: voiceSelect.value
  };
}

function saveSettings(settings = collectSettings()) {
  chrome.storage.sync.set({ voiceSettings: settings });
}

function loadSettings() {
  chrome.storage.sync.get(["voiceSettings"], (result) => {
    const stored = result.voiceSettings || {};
    const settings = { ...defaultSettings, ...stored };

    populateVoices(settings.voiceName);

    rateInput.value = settings.rate;
    pitchInput.value = settings.pitch;
    volumeInput.value = settings.volume;

    rateValue.textContent = formatSliderValue(Number(settings.rate), "x");
    pitchValue.textContent = formatSliderValue(Number(settings.pitch));
    volumeValue.textContent = formatSliderValue(Number(settings.volume));

    if (settings.voiceName) {
      voiceSelect.value = settings.voiceName;
    }
  });
}

function populateVoices(preferredVoice = "") {
  chrome.tts.getVoices((voices) => {
    voiceSelect.innerHTML = "";

    const seen = new Set();
    voices.forEach((voice) => {
      if (seen.has(voice.voiceName)) return;
      seen.add(voice.voiceName);
      const option = document.createElement("option");
      option.value = voice.voiceName;
      const language = voice.lang ? ` • ${voice.lang}` : "";
      option.textContent = `${voice.voiceName}${language}`;
      voiceSelect.appendChild(option);
    });

    if (!voiceSelect.value && preferredVoice) {
      voiceSelect.value = preferredVoice;
    }
  });
}

function wireVoiceRefresh() {
  populateVoices();
  if (chrome.tts && chrome.tts.onVoicesChanged) {
    chrome.tts.onVoicesChanged.addListener(() => populateVoices(voiceSelect.value));
  }
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

function handleRangeUpdate() {
  rateValue.textContent = formatSliderValue(Number(rateInput.value), "x");
  pitchValue.textContent = formatSliderValue(Number(pitchInput.value));
  volumeValue.textContent = formatSliderValue(Number(volumeInput.value));
  saveSettings();
}

async function handleReadSelection() {
  clearStatus();
  try {
    const options = collectSettings();
    saveSettings(options);
    const response = await sendMessage({ type: "READ_SELECTION", options });
    const message = response?.message || "Reading selected text.";
    setStatus(message);
  } catch (err) {
    setStatus("Could not read the selection. Make sure a tab is active and text is highlighted.", "error");
    console.error(err);
  }
}

async function handleReadCustom() {
  clearStatus();
  const text = customText.value.trim();
  if (!text) {
    setStatus("Add some text to read first.", "error");
    return;
  }
  try {
    const options = collectSettings();
    saveSettings(options);
    const response = await sendMessage({ type: "READ_CUSTOM", text, options });
    const message = response?.message || "Reading your text.";
    setStatus(message);
  } catch (err) {
    setStatus("Could not start reading that text.", "error");
    console.error(err);
  }
}

async function handleStop() {
  clearStatus();
  try {
    await sendMessage({ type: "STOP_TTS" });
    setStatus("Stopped.");
  } catch (err) {
    setStatus("Unable to stop right now.", "error");
    console.error(err);
  }
}

function init() {
  wireVoiceRefresh();
  loadSettings();

  [rateInput, pitchInput, volumeInput, voiceSelect].forEach((el) => {
    el.addEventListener("input", () => saveSettings());
  });

  rateInput.addEventListener("input", handleRangeUpdate);
  pitchInput.addEventListener("input", handleRangeUpdate);
  volumeInput.addEventListener("input", handleRangeUpdate);
  voiceSelect.addEventListener("change", () => saveSettings());

  readSelectionBtn.addEventListener("click", handleReadSelection);
  readCustomBtn.addEventListener("click", handleReadCustom);
  stopBtn.addEventListener("click", handleStop);
}

document.addEventListener("DOMContentLoaded", init);
