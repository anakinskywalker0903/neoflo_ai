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

  const timeline = document.getElementById('timeline');
  const feedCount = document.getElementById('feedCount');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const chipRow = document.getElementById('chipRow');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const regenerateSummaryBtn = document.getElementById('regenerateSummaryBtn');
  const todayDate = document.getElementById('todayDate');
  const navCount = document.getElementById('navCount');

  const productivityScore = document.getElementById('productivityScore');
  const gaugeCircle = document.getElementById('gaugeCircle');
  const scoreTag = document.getElementById('scoreTag');
  const scoreSub = document.getElementById('scoreSub');
  const totalActivitiesCount = document.getElementById('totalActivitiesCount');
  const topCategory = document.getElementById('topCategory');
  const topCategorySub = document.getElementById('topCategorySub');
  const topWebsite = document.getElementById('topWebsite');
  const aiSummaryContent = document.getElementById('aiSummaryContent');

  if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

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

  if (regenerateSummaryBtn) {
    regenerateSummaryBtn.addEventListener('click', () => fetchAISummary());
  }

  clearBtn.addEventListener('click', async () => {
    if (confirm('Clear all logged activity? This cannot be undone.')) {
      try {
        await fetch('/api/activities', { method: 'DELETE' });
        loadDashboardData();
      } catch (err) {
        alert('Failed to clear logs: ' + err.message);
      }
    }
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    fetchActivities();
  });

  chipRow.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCat = chip.dataset.cat;
    fetchActivities();
  });

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
      productivityScore.textContent = score;

      // Update SVG gauge ring stroke
      const circumference = 176; // 2 * pi * 28
      const offset = circumference - (circumference * score / 100);
      if (gaugeCircle) {
        gaugeCircle.style.strokeDasharray = `${circumference}`;
        gaugeCircle.style.strokeDashoffset = `${offset}`;
      }

      if (score >= 80) {
        scoreTag.textContent = 'Strong focus day';
        scoreSub.textContent = 'High Productivity';
      } else if (score >= 50) {
        scoreTag.textContent = 'Moderate focus day';
        scoreSub.textContent = 'Balanced Session';
      } else {
        scoreTag.textContent = 'High distraction day';
        scoreSub.textContent = 'Needs Focus';
      }

      totalActivitiesCount.textContent = data.totalActivities || 0;
      if (navCount) navCount.textContent = data.totalActivities || 0;

      // Top category
      if (data.categories && data.categories.length > 0) {
        const top = [...data.categories].sort((a, b) => b.count - a.count)[0];
        topCategory.textContent = top.category;
        topCategorySub.textContent = `${top.count} logged activities`;
      } else {
        topCategory.textContent = 'None';
        topCategorySub.textContent = 'No logs';
      }

      // Top website
      if (data.topDomains && data.topDomains.length > 0) {
        topWebsite.textContent = data.topDomains[0].domain;
      } else {
        topWebsite.textContent = 'None';
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
      aiSummaryContent.innerHTML = `
        <ul class="ai-bullets">
          <li><span class="bnum">✦</span><span>Generating AI Executive Summary with Gemini Vision LLM...</span></li>
        </ul>
      `;
      const res = await fetch('/api/summary/daily');
      const data = await res.json();

      if (data.success && data.summary) {
        const lines = data.summary
          .split('\n')
          .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().match(/^\d+\./))
          .map(l => l.replace(/^[-*\d.]+\s*/, '').trim());

        if (lines.length > 0) {
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
        } else {
          aiSummaryContent.innerHTML = `<p style="font-size:13.5px; color:#cbd5e1; line-height:1.6;">${formatBulletText(data.summary)}</p>`;
        }
      } else {
        aiSummaryContent.innerHTML = '<p style="color:#a6adc4;">No AI summary available yet.</p>';
      }
    } catch (err) {
      aiSummaryContent.innerHTML = `<p style="color:#f43f5e;">Error generating summary: ${err.message}</p>`;
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
    feedCount.textContent = `${activities.length} event${activities.length === 1 ? '' : 's'}`;
    emptyState.classList.toggle('show', activities.length === 0);

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
