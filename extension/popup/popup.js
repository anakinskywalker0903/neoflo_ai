document.addEventListener('DOMContentLoaded', async () => {
  const trackingToggle = document.getElementById('trackingToggle');
  const statusPill = document.getElementById('statusPill');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const intervalSelect = document.getElementById('intervalSelect');
  const captureBtn = document.getElementById('captureBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');

  // Load status
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (data) => {
    if (!data) return;

    const isActive = data.isTrackingActive !== false;
    trackingToggle.checked = isActive;
    updateStatusPill(isActive);

    if (data.captureInterval) {
      intervalSelect.value = String(data.captureInterval);
    }

    if (data.lastActivity) {
      renderLastActivity(data.lastActivity);
    }
  });

  // Toggle listener
  trackingToggle.addEventListener('change', (e) => {
    const isActive = e.target.checked;
    updateStatusPill(isActive);

    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { isTrackingActive: isActive }
    });
  });

  // Interval listener
  intervalSelect.addEventListener('change', (e) => {
    const captureInterval = Number(e.target.value);
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { captureInterval }
    });
  });

  // Capture Button listener
  captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    captureBtn.innerHTML = `
      <span class="btn-icon">⚡</span>
      <span>Analyzing Screen...</span>
    `;

    chrome.runtime.sendMessage({ type: 'TRIGGER_CAPTURE' }, (response) => {
      captureBtn.disabled = false;
      captureBtn.innerHTML = `
        <span class="btn-icon">📸</span>
        <span>Capture & Analyze Now</span>
      `;

      if (response && response.success && response.activity) {
        renderLastActivity(response.activity);
      } else if (response && response.reason) {
        alert(`Note: ${response.reason}`);
      }
    });
  });

  // Dashboard Button listener
  dashboardBtn.addEventListener('click', () => {
    chrome.storage.local.get(['backendUrl'], (settings) => {
      const url = settings.backendUrl || 'http://localhost:5000';
      chrome.tabs.create({ url });
    });
  });

  function updateStatusPill(isActive) {
    if (isActive) {
      statusPill.className = 'status-pill active';
      statusText.textContent = 'Active';
    } else {
      statusPill.className = 'status-pill paused';
      statusText.textContent = 'Paused';
    }
  }

  function renderLastActivity(activity) {
    const websiteDomain = document.getElementById('websiteDomain');
    const categoryTag = document.getElementById('categoryTag');
    const activityTitle = document.getElementById('activityTitle');
    const activitySummary = document.getElementById('activitySummary');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceScore = document.getElementById('confidenceScore');

    if (websiteDomain) websiteDomain.textContent = activity.domain || activity.website || 'browser';
    if (activityTitle) activityTitle.textContent = activity.activity || 'Active Tab';
    if (activitySummary) activitySummary.textContent = `"${activity.summary || 'Analyzing screen content...'}"`;

    if (categoryTag) {
      categoryTag.textContent = activity.category || 'Other';
    }

    const confPct = Math.round((activity.confidence || 0.95) * 100);
    if (confidenceBar) confidenceBar.style.width = `${confPct}%`;
    if (confidenceScore) confidenceScore.textContent = `${confPct}% CONF`;
  }
});
