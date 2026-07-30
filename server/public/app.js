document.addEventListener('DOMContentLoaded', () => {
  let activeCat = 'all';
  let searchQuery = '';

  const NC = {
    coding: '#8b5cf6',
    learning: '#06b6d4',
    meetings: '#6366f1',
    distractions: '#f59e0b',
    utility: '#10b981',
    other: '#64748b'
  };

  const CATLABEL = {
    coding: 'Coding 💻',
    learning: 'Learning 🧠',
    meetings: 'Meetings 📹',
    distractions: 'Distractions 🎮',
    utility: 'Utility 🛠️',
    other: 'Other 📌'
  };

  // Nav Elements
  const navLinks = document.querySelectorAll('.nav-link');
  const tabViews = document.querySelectorAll('.tab-view');
  const pageTitle = document.getElementById('pageTitle');

  // Timeline View Elements
  const timeline = document.getElementById('timeline');
  const feedCount = document.getElementById('feedCount');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const chipRow = document.getElementById('chipRow');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const privacyWipeBtn = document.getElementById('privacyWipeBtn');
  const regenerateSummaryBtn = document.getElementById('regenerateSummaryBtn');
  const fullSummaryRegenBtn = document.getElementById('fullSummaryRegenBtn');
  const todayDate = document.getElementById('todayDate');
  const navCount = document.getElementById('navCount');

  // Metric Elements
  const productivityScore = document.getElementById('productivityScore');
  const gaugeCircle = document.getElementById('gaugeCircle');
  const scoreTag = document.getElementById('scoreTag');
  const scoreSub = document.getElementById('scoreSub');
  const totalActivitiesCount = document.getElementById('totalActivitiesCount');
  const topCategory = document.getElementById('topCategory');
  const topCategorySub = document.getElementById('topCategorySub');
  const topWebsite = document.getElementById('topWebsite');
  const aiSummaryContent = document.getElementById('aiSummaryContent');
  const fullSummaryOverview = document.getElementById('fullSummaryOverview');

  // Analytics Elements
  const analyticsCodingCount = document.getElementById('analyticsCodingCount');
  const analyticsLearningCount = document.getElementById('analyticsLearningCount');
  const analyticsDistractionsCount = document.getElementById('analyticsDistractionsCount');
  const analyticsUtilityCount = document.getElementById('analyticsUtilityCount');
  const analyticsDomainsTable = document.getElementById('analyticsDomainsTable');
  const topDomainsCount = document.getElementById('topDomainsCount');

  if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Multi-Tab Navigation Handler
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;

      navLinks.forEach(l => l.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      link.classList.add('active');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');

      // Update Page Title
      if (targetId === 'viewTimeline') pageTitle.textContent = 'Personal Productivity Timeline';
      if (targetId === 'viewSummary') pageTitle.textContent = 'AI Executive Work Summary';
      if (targetId === 'viewAnalytics') pageTitle.textContent = 'Category Analytics & Time Distribution';
      if (targetId === 'viewPrivacy') pageTitle.textContent = 'Privacy & Security Safeguards';
    });
  });

  // Initial Load
  loadDashboardData();

  // Listeners
  refreshBtn.addEventListener('click', () => {
    refreshBtn.style.opacity = '0.5';
    setTimeout(() => {
      refreshBtn.style.opacity = '1';
      loadDashboardData();
    }, 300);
  });

  if (regenerateSummaryBtn) regenerateSummaryBtn.addEventListener('click', () => fetchAISummary());
  if (fullSummaryRegenBtn) fullSummaryRegenBtn.addEventListener('click', () => fetchAISummary());

  const handleWipe = async () => {
    if (confirm('Permanently clear all activity logs? This cannot be undone.')) {
      try {
        await fetch('/api/activities', { method: 'DELETE' });
        loadDashboardData();
      } catch (err) {
        alert('Failed to clear logs: ' + err.message);
      }
    }
  };

  if (clearBtn) clearBtn.addEventListener('click', handleWipe);
  if (privacyWipeBtn) privacyWipeBtn.addEventListener('click', handleWipe);

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      fetchActivities();
    });
  }

  if (chipRow) {
    chipRow.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCat = chip.dataset.cat;
      fetchActivities();
    });
  }

  function loadDashboardData() {
    fetchStats();
    fetchActivities();
    fetchAISummary();
  }

  // 1. Fetch Stats
  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!data.success) return;

      const score = data.productivityScore || 75;
      if (productivityScore) productivityScore.textContent = score;

      const circumference = 176;
      const offset = circumference - (circumference * score / 100);
      if (gaugeCircle) {
        gaugeCircle.style.strokeDasharray = `${circumference}`;
        gaugeCircle.style.strokeDashoffset = `${offset}`;
      }

      if (scoreTag) {
        scoreTag.textContent = score >= 80 ? 'Strong focus day' : score >= 50 ? 'Moderate focus day' : 'High distraction day';
      }

      if (totalActivitiesCount) totalActivitiesCount.textContent = data.totalActivities || 0;
      if (navCount) navCount.textContent = data.totalActivities || 0;

      // Category breakdown for Analytics tab
      let codingCount = 0, learningCount = 0, distractionCount = 0, utilityCount = 0;
      if (data.categories) {
        data.categories.forEach(c => {
          if (c.category === 'Coding') codingCount = c.count;
          if (c.category === 'Learning') learningCount = c.count;
          if (c.category === 'Distractions') distractionCount = c.count;
          if (c.category === 'Utility') utilityCount = c.count;
        });

        const top = [...data.categories].sort((a, b) => b.count - a.count)[0];
        if (topCategory) topCategory.textContent = top ? top.category : 'None';
        if (topCategorySub) topCategorySub.textContent = top ? `${top.count} logged activities` : 'No logs';
      }

      if (analyticsCodingCount) analyticsCodingCount.textContent = codingCount;
      if (analyticsLearningCount) analyticsLearningCount.textContent = learningCount;
      if (analyticsDistractionsCount) analyticsDistractionsCount.textContent = distractionCount;
      if (analyticsUtilityCount) analyticsUtilityCount.textContent = utilityCount;

      // Top Domains
      if (data.topDomains) {
        if (topWebsite) topWebsite.textContent = data.topDomains[0]?.domain || 'None';
        if (topDomainsCount) topDomainsCount.textContent = `${data.topDomains.length} domains tracked`;

        if (analyticsDomainsTable) {
          analyticsDomainsTable.innerHTML = data.topDomains.map(d => `
            <tr>
              <td><strong>${escapeHtml(d.domain)}</strong></td>
              <td><span class="t-cat ${(d.category || 'other').toLowerCase()}">${escapeHtml(d.category || 'Other')}</span></td>
              <td>${d.count} events logged</td>
              <td><strong style="color:var(--emerald);">+ Positive Focus</strong></td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  // 2. Fetch Activities Stream
  async function fetchActivities() {
    try {
      let url = '/api/activities?limit=100';
      if (activeCat !== 'all') {
        url += `&category=${encodeURIComponent(activeCat.charAt(0).toUpperCase() + activeCat.slice(1))}`;
      }
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) return;

      renderTimelineItems(data.activities || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }

  // 3. Fetch AI Daily Summary
  async function fetchAISummary() {
    try {
      if (aiSummaryContent) {
        aiSummaryContent.innerHTML = `
          <ul class="ai-bullets">
            <li><span class="bnum">✦</span><span>Generating AI Executive Summary with Gemini Vision LLM...</span></li>
          </ul>
        `;
      }

      const res = await fetch('/api/summary/daily');
      const data = await res.json();

      if (data.success && data.summary) {
        const lines = data.summary
          .split('\n')
          .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().match(/^\d+\./))
          .map(l => l.replace(/^[-*\d.]+\s*/, '').trim());

        if (lines.length > 0) {
          if (aiSummaryContent) {
            aiSummaryContent.innerHTML = `
              <ul class="ai-bullets">
                ${lines.map((line, idx) => `
                  <li>
                    <span class="bnum">0${idx + 1}</span>
                    <span>${formatBulletText(line)}</span>
                  </li>
                `).join('')}
              </ul>
            `;
          }
          if (fullSummaryOverview) {
            fullSummaryOverview.innerHTML = lines.map(line => `<p style="margin-bottom:8px;">- ${formatBulletText(line)}</p>`).join('');
          }
        } else {
          if (aiSummaryContent) aiSummaryContent.innerHTML = `<p style="font-size:13.5px; color:#cbd5e1; line-height:1.6;">${formatBulletText(data.summary)}</p>`;
          if (fullSummaryOverview) fullSummaryOverview.innerHTML = formatBulletText(data.summary);
        }
      }
    } catch (err) {
      if (aiSummaryContent) aiSummaryContent.innerHTML = `<p style="color:#f43f5e;">Error generating summary: ${err.message}</p>`;
    }
  }

  function formatBulletText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  }

  function confColor(c) {
    if (c >= 90) return '#10b981';
    if (c >= 80) return '#06b6d4';
    return '#f59e0b';
  }

  function renderTimelineItems(activities) {
    if (feedCount) feedCount.textContent = `${activities.length} event${activities.length === 1 ? '' : 's'}`;
    if (emptyState) emptyState.classList.toggle('show', activities.length === 0);

    if (timeline) {
      timeline.innerHTML = activities.map((act, i) => {
        const catKey = (act.category || 'other').toLowerCase();
        const color = NC[catKey] || '#64748b';
        const label = CATLABEL[catKey] || act.category || 'Other';
        const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const confPct = Math.round((act.confidence || 0.9) * 100);
        const cc = confColor(confPct);
        const dash = 2 * Math.PI * 10;
        const offset = dash - (dash * confPct / 100);

        return `
          <div class="t-item" style="animation-delay: ${i * 0.04}s">
            <div class="t-node-wrap">
              <div class="t-node" style="--nc: ${color}"></div>
            </div>
            <div class="t-body">
              <div class="t-top">
                <span class="t-time">${timeStr}</span>
                <span class="t-domain">${escapeHtml(act.domain || act.website)}</span>
                <span class="t-cat ${catKey}">${label}</span>
              </div>
              <div class="t-desc"><b>${escapeHtml(act.activity)}</b> — ${escapeHtml(act.summary || '')}</div>
              <div class="t-conf">
                <div class="conf-ring">
                  <svg width="26" height="26" viewBox="0 0 26 26">
                    <circle class="bg" cx="13" cy="13" r="10"/>
                    <circle class="fg" cx="13" cy="13" r="10" stroke="${cc}" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"/>
                  </svg>
                </div>
                <span class="conf-label">${confPct}% confidence</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
