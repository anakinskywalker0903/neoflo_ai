document.addEventListener('DOMContentLoaded', () => {
  let currentCategory = 'ALL';
  let searchQuery = '';

  const timelineFeed = document.getElementById('timelineFeed');
  const productivityScore = document.getElementById('productivityScore');
  const scoreBar = document.getElementById('scoreBar');
  const scoreTag = document.getElementById('scoreTag');
  const totalActivitiesCount = document.getElementById('totalActivitiesCount');
  const topCategory = document.getElementById('topCategory');
  const topCategorySub = document.getElementById('topCategorySub');
  const topWebsite = document.getElementById('topWebsite');
  const aiSummaryContent = document.getElementById('aiSummaryContent');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const regenerateSummaryBtn = document.getElementById('regenerateSummaryBtn');
  const showingCount = document.getElementById('showingCount');
  const categoryFilterContainer = document.getElementById('categoryFilterContainer');

  // Initial Load
  loadDashboardData();

  // Event Listeners
  refreshBtn.addEventListener('click', () => loadDashboardData());
  regenerateSummaryBtn.addEventListener('click', () => fetchAISummary());

  clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all activity logs? This cannot be undone.')) {
      try {
        await fetch('/api/activities', { method: 'DELETE' });
        loadDashboardData();
      } catch (err) {
        alert('Failed to clear logs: ' + err.message);
      }
    }
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    fetchActivities();
  });

  categoryFilterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-chip')) {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-category');
      fetchActivities();
    }
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
      productivityScore.innerHTML = `${score}<span class="score-unit">/100</span>`;
      scoreBar.style.width = `${score}%`;

      if (score >= 80) {
        scoreTag.textContent = 'High Focus';
        scoreTag.className = 'score-tag positive';
      } else if (score >= 50) {
        scoreTag.textContent = 'Moderate Focus';
        scoreTag.className = 'score-tag';
      } else {
        scoreTag.textContent = 'High Distraction';
        scoreTag.className = 'score-tag warning';
      }

      totalActivitiesCount.textContent = data.totalActivities || 0;

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
      if (currentCategory !== 'ALL') url += `&category=${encodeURIComponent(currentCategory)}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) return;

      renderTimelineItems(data.activities || []);
      showingCount.textContent = `Showing ${data.activities.length} of ${data.total} logged activities`;
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }

  // 3. Fetch AI Daily Executive Summary
  async function fetchAISummary() {
    try {
      aiSummaryContent.innerHTML = '<div class="skeleton-loader">✨ Generating AI Executive Work Summary...</div>';
      const res = await fetch('/api/summary/daily');
      const data = await res.json();

      if (data.success && data.summary) {
        // Format markdown bullet points into HTML
        const html = data.summary
          .replace(/### (.*?)\n/g, '<h4 style="color:#38bdf8; margin-bottom:8px;">$1</h4>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/- (.*?)\n/g, '<li>$1</li>');

        aiSummaryContent.innerHTML = html.includes('<li>') ? `<ul>${html}</ul>` : `<p>${html}</p>`;
      } else {
        aiSummaryContent.innerHTML = '<p>No summary available yet.</p>';
      }
    } catch (err) {
      aiSummaryContent.innerHTML = `<p style="color:#ef4444;">Error generating AI summary: ${err.message}</p>`;
    }
  }

  // Render Timeline Nodes
  function renderTimelineItems(activities) {
    if (activities.length === 0) {
      timelineFeed.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #94a3b8;">
          <p style="font-size: 24px; margin-bottom: 8px;">📭</p>
          <p>No activity events found for the selected filter.</p>
        </div>
      `;
      return;
    }

    timelineFeed.innerHTML = activities.map(act => {
      const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const catClass = (act.category || 'other').toLowerCase();
      const scoreTag = act.productivity_score > 0 ? '+1 Productive' : act.productivity_score < 0 ? '-1 Distraction' : '0 Neutral';

      return `
        <div class="timeline-item">
          <div class="timeline-time">${timeStr}</div>
          <div class="timeline-node"></div>
          <div class="timeline-card">
            <div class="card-top">
              <div class="card-domain-badge">
                <span class="domain-name">${escapeHtml(act.domain || act.website)}</span>
                <span class="cat-badge cat-${catClass}">${escapeHtml(act.category || 'Other')}</span>
              </div>
              <span style="font-size: 11px; color: #94a3b8;">Conf: ${Math.round((act.confidence || 0.9) * 100)}%</span>
            </div>
            <div class="card-activity">${escapeHtml(act.activity)}</div>
            <div class="card-summary">${escapeHtml(act.summary || '')}</div>
            <div class="card-footer-meta">
              <span>Impact: <strong>${scoreTag}</strong></span>
              <span>Website: ${escapeHtml(act.website)}</span>
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
