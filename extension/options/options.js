document.addEventListener('DOMContentLoaded', () => {
  const backendUrl = document.getElementById('backendUrl');
  const blacklistedDomains = document.getElementById('blacklistedDomains');
  const saveBtn = document.getElementById('saveBtn');
  const statusMessage = document.getElementById('statusMessage');

  chrome.storage.local.get(['backendUrl', 'blacklistedDomains'], (data) => {
    if (data.backendUrl) backendUrl.value = data.backendUrl;
    if (data.blacklistedDomains) {
      blacklistedDomains.value = Array.isArray(data.blacklistedDomains) 
        ? data.blacklistedDomains.join(', ') 
        : data.blacklistedDomains;
    }
  });

  saveBtn.addEventListener('click', () => {
    const url = backendUrl.value.trim();
    const domains = blacklistedDomains.value
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    chrome.storage.local.set({
      backendUrl: url,
      blacklistedDomains: domains
    }, () => {
      statusMessage.textContent = 'Settings saved successfully!';
      setTimeout(() => { statusMessage.textContent = ''; }, 3000);
    });
  });
});
