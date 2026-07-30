// VisionPulse AI Service Worker (Manifest V3)

const DEFAULT_SETTINGS = {
  isTrackingActive: true,
  captureInterval: 30, // seconds
  backendUrl: 'http://localhost:5000',
  storeImages: false,
  blacklistedDomains: ['bank', 'paypal', '1password', 'auth', 'login', 'checkout']
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[VisionPulse Worker] Extension installed successfully.');
  const current = await chrome.storage.local.get(null);
  if (!current.backendUrl) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
  }
  setupAlarm(DEFAULT_SETTINGS.captureInterval);
});

// Setup alarm for periodic capture
function setupAlarm(intervalSeconds) {
  chrome.alarms.clear('visionpulse_capture_alarm', () => {
    chrome.alarms.create('visionpulse_capture_alarm', {
      periodInMinutes: intervalSeconds / 60
    });
    console.log(`[VisionPulse Worker] Capture alarm scheduled every ${intervalSeconds} seconds.`);
  });
}

// Alarm listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'visionpulse_capture_alarm') {
    const settings = await chrome.storage.local.get(['isTrackingActive']);
    if (settings.isTrackingActive !== false) {
      await captureAndAnalyzeActiveTab();
    }
  }
});

// Core tab screenshot & analysis logic
async function captureAndAnalyzeActiveTab() {
  try {
    const settings = await chrome.storage.local.get([
      'backendUrl',
      'storeImages',
      'blacklistedDomains',
      'isTrackingActive'
    ]);

    if (settings.isTrackingActive === false) return { success: false, reason: 'Tracking is paused' };

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.url || activeTab.url.startsWith('chrome://')) {
      return { success: false, reason: 'Chrome internal tab or invalid URL' };
    }

    const url = activeTab.url;
    const title = activeTab.title || '';
    const blacklists = settings.blacklistedDomains || DEFAULT_SETTINGS.blacklistedDomains;

    // Check domain blacklist
    const isBlacklisted = blacklists.some(domain => url.toLowerCase().includes(domain.toLowerCase()));
    if (isBlacklisted) {
      console.log(`[VisionPulse Worker] Skipped capture on blacklisted domain: ${url}`);
      return { success: false, reason: 'Blacklisted domain for privacy' };
    }

    // Capture tab screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 80 });

    const backendUrl = settings.backendUrl || DEFAULT_SETTINGS.backendUrl;
    
    // Post to backend API
    const response = await fetch(`${backendUrl}/api/activity/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        pageUrl: url,
        pageTitle: title,
        timestamp: new Date().toISOString(),
        storeImage: Boolean(settings.storeImages)
      })
    });

    const data = await response.json();

    if (data.success && data.activity) {
      await chrome.storage.local.set({
        lastActivity: data.activity,
        lastCaptureTime: new Date().toISOString(),
        lastStatus: 'Active'
      });
    }

    return data;
  } catch (error) {
    console.error('[VisionPulse Worker] Capture error:', error.message);
    await chrome.storage.local.set({ lastStatus: `Error: ${error.message}` });
    return { success: false, error: error.message };
  }
}

// Handle incoming messages from Popup / Options UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_CAPTURE') {
    captureAndAnalyzeActiveTab().then(sendResponse);
    return true; // Async response
  }

  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set(message.settings).then(() => {
      if (message.settings.captureInterval) {
        setupAlarm(message.settings.captureInterval);
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(null).then(sendResponse);
    return true;
  }
});
