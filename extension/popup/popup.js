document.addEventListener('DOMContentLoaded', async () => {
  const trackingToggle = document.getElementById('trackingToggle');
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');
  const intervalSelect = document.getElementById('intervalSelect');
  const captureBtn = document.getElementById('captureBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const optionsLink = document.getElementById('optionsLink');

  // Load current settings & status
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (data) => {
    if (!data) return;

    // Toggle status
    const isActive = data.isTrackingActive !== false;
    trackingToggle.checked = isActive;
    updateStatusPill(isActive);

    // Interval
    if (data.captureInterval) {
      intervalSelect.value = String(data.captureInterval);
    }

    // Last activity render
    if (data.lastActivity) {
      renderLastActivity(data.lastActivity, data.lastCaptureTime);
    }
  });

  // Toggle tracking listener
  trackingToggle.addEventListener('change', (e) => {
    const isTrackingActive = e.target.checked;
    updateStatusPill(isTrackingActive);

    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { isTrackingActive }
    });
  });

  // Change interval listener
  intervalSelect.addEventListener('change', (e) => {
    const captureInterval = Number(e.target.value);
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { captureInterval }
    });
  });

  // Capture Now Button
  captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<span>⚡</span> Analyzing Screen...';

    chrome.runtime.sendMessage({ type: 'TRIGGER_CAPTURE' }, (response) => {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span>📸</span> Capture & Analyze Now';

      if (response && response.success && response.activity) {
        renderLastActivity(response.activity, new Date().toISOString());
      } else if (response && response.reason) {
        alert(`Capture Note: ${response.reason}`);
      }
    });
  });

  // Open Dashboard
  dashboardBtn.addEventListener('click', () => {
    chrome.storage.local.get(['backendUrl'], (settings) => {
      const url = settings.backendUrl || 'http://localhost:5000';
      chrome.tabs.create({ url });
    });
  });

  // Open Options
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function updateStatusPill(isActive) {
    if (isActive) {
      statusPill.classList.remove('paused');
      statusText.textContent = 'Active';
    } else {
      statusPill.classList.add('paused');
      statusText.textContent = 'Paused';
    }
  }

  function renderLastActivity(activity, captureTime) {
    const websiteDomain = document.getElementById('websiteDomain');
    const activityTitle = document.getElementById('activityTitle');
    const activitySummary = document.getElementById('activitySummary');
    const categoryTag = document.getElementById('categoryTag');
    const confidenceScore = document.getElementById('confidenceScore');
    const productivityScore = document.getElementById('productivityScore');
    const lastTime = document.getElementById('lastTime');

    if (websiteDomain) websiteDomain.textContent = activity.domain || activity.website || 'browser';
    if (activityTitle) activityTitle.textContent = activity.activity || 'Active Tab';
    if (activitySummary) activitySummary.textContent = activity.summary || 'Processing screen content...';
    
    if (categoryTag) {
      categoryTag.textContent = activity.category || 'Other';
      categoryTag.className = `category-tag category-${(activity.category || 'other').toLowerCase()}`;
    }

    if (confidenceScore) {
      confidenceScore.textContent = `${Math.round((activity.confidence || 0.95) * 100)}%`;
    }

    if (productivityScore) {
      const score = activity.productivity_score ?? 0;
      productivityScore.textContent = score > 0 ? '+1 Productive' : score < 0 ? '-1 Distraction' : '0 Neutral';
    }

    if (lastTime && captureTime) {
      const date = new Date(captureTime);
      lastTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
});
