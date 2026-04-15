/* === Nutrition Agent Dashboard === */

const REPO_RAW = 'https://raw.githubusercontent.com/baranesyea/nutritionagent/main';

const MEAL_LABELS = {
  breakfast: 'בוקר',
  lunch: 'צהריים',
  snack: 'נשנוש',
  dinner: 'ערב'
};

const LOG_ICONS = {
  deviation: { icon: '⚠️', cls: 'deviation' },
  correction: { icon: '🔄', cls: 'correction' },
  system: { icon: '🤖', cls: 'system' },
  weight: { icon: '⚖️', cls: 'weight' }
};

// State
let state = {
  profile: null,
  menu: null,
  balance: null,
  log: null,
  shoppingList: null,
  mealPrep: null,
  currentDay: null,
  activeSection: 'status'
};

// ── Fetch helpers ──────────────────────────────────────────────────

async function fetchJSON(path) {
  const url = `${REPO_RAW}/${path}?t=${Date.now()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

async function loadAll() {
  try {
    const [profile, menu, balance, log, shopping, prep] = await Promise.allSettled([
      fetchJSON('knowledge/profile.json'),
      fetchJSON('data/current-week/menu.json'),
      fetchJSON('data/current-week/balance.json'),
      fetchJSON('data/current-week/log.json'),
      fetchJSON('data/current-week/shopping-list.json'),
      fetchJSON('data/current-week/meal-prep.json')
    ]);
    state.profile = profile.value || null;
    state.menu = menu.value || null;
    state.balance = balance.value || null;
    state.log = log.value || null;
    state.shoppingList = shopping.value || null;
    state.mealPrep = prep.value || null;
  } catch (e) {
    console.error('Load error:', e);
  }
}

// ── Date helpers ───────────────────────────────────────────────────

function todayISO() {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysRemaining(weekEnd) {
  const end = new Date(weekEnd + 'T23:59:59');
  const now = new Date();
  const diff = Math.ceil((end - now) / 86400000);
  return Math.max(0, diff);
}

// ── Render helpers ─────────────────────────────────────────────────

function pct(actual, planned) {
  if (!planned) return 0;
  return Math.min(100, Math.round((actual / planned) * 100));
}

function progressRow(label, actual, planned, unit, cls) {
  const p = pct(actual, planned);
  const isOver = actual > planned;
  return `
    <div class="progress-row">
      <div class="progress-label">
        <span class="name">${label}</span>
        <span class="values">${actual.toLocaleString()}${unit} / ${planned.toLocaleString()}${unit}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${isOver ? 'over' : cls}" style="width:${p}%"></div>
      </div>
    </div>`;
}

function macroPill(label, val, cls) {
  return `<span class="macro-pill ${cls}">${label}: ${val}</span>`;
}

// ── Section: Weekly Status ─────────────────────────────────────────

function renderStatus() {
  const el = document.getElementById('sec-status');
  if (!state.balance || !state.menu) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">📊</div><p>טוען נתונים...</p></div></div>`;
    return;
  }

  const b = state.balance;
  const weekly = state.profile ? state.profile.weekly_targets : { calories: 13510, protein_g: 1351, carbs_g: 1351, fat_g: 301 };
  const actual = b.weekly_actual;
  const remaining = b.weekly_remaining;
  const daysLeft = daysRemaining(b.week_end);

  // Status badge
  const calPct = pct(actual.calories, weekly.calories);
  const protPct = pct(actual.protein, weekly.protein_g);
  let statusClass = 'on-track', statusText = '✅ על המסלול';
  if (actual.calories > weekly.calories * 1.05) { statusClass = 'off-track'; statusText = '🔴 חריגה שבועית'; }
  else if (actual.calories > weekly.calories * 0.97) { statusClass = 'warning'; statusText = '⚠️ קרוב ליעד'; }

  el.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="status-badge ${statusClass}">${statusText}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-bottom:16px;">
          ${b.week_start ? formatDate(b.week_start) : ''} – ${b.week_end ? formatDate(b.week_end) : ''}
          &nbsp;|&nbsp; ${daysLeft} ימים נותרו
        </div>
        ${progressRow('קלוריות', actual.calories, weekly.calories, '', 'calories')}
        ${progressRow('חלבון', actual.protein, weekly.protein_g, 'g', 'protein')}
        <div class="stats-grid">
          <div class="stat-box">
            <div class="val" style="color:var(--primary)">${remaining.calories.toLocaleString()}</div>
            <div class="lbl">קלוריות נותרו</div>
          </div>
          <div class="stat-box">
            <div class="val" style="color:var(--blue)">${remaining.protein}g</div>
            <div class="lbl">חלבון נותר</div>
          </div>
          <div class="stat-box">
            <div class="val">${daysLeft > 0 ? Math.round(remaining.calories / daysLeft) : 0}</div>
            <div class="lbl">קל' ליום נותר</div>
          </div>
          <div class="stat-box">
            <div class="val">${daysLeft > 0 ? Math.round(remaining.protein / daysLeft) : 0}g</div>
            <div class="lbl">חלבון ליום נותר</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">מאקרוס נאכלו השבוע</div>
        ${progressRow('פחמימות', actual.carbs || 0, weekly.carbs_g, 'g', 'protein')}
        ${progressRow('שומן', actual.fat || 0, weekly.fat_g, 'g', 'calories')}
      </div>
    </div>`;
}

// ── Section: Daily Menu ────────────────────────────────────────────

function renderMenu() {
  const el = document.getElementById('sec-menu');
  if (!state.menu || !state.menu.days || !state.menu.days.length) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">🍽️</div><p>אין תפריט לשבוע זה עדיין</p></div></div>`;
    return;
  }

  const today = todayISO();
  const days = state.menu.days;

  // Find today's index or first day
  let currentIdx = days.findIndex(d => d.date === today);
  if (currentIdx === -1) {
    // Find nearest upcoming day
    currentIdx = days.findIndex(d => d.date >= today);
    if (currentIdx === -1) currentIdx = 0;
  }
  if (state.currentDay === null) state.currentDay = currentIdx;

  const tabsHtml = days.map((d, i) => {
    const isToday = d.date === today;
    return `<button class="day-tab ${i === state.currentDay ? 'active' : ''} ${isToday ? 'today' : ''}"
      onclick="selectDay(${i})">${d.day_name}<br><span style="font-size:0.65rem;opacity:0.7">${formatDate(d.date)}</span></button>`;
  }).join('');

  el.innerHTML = `<div class="container"><div class="day-tabs">${tabsHtml}</div><div id="day-content"></div></div>`;
  renderDayContent(state.currentDay);
}

function selectDay(idx) {
  state.currentDay = idx;
  document.querySelectorAll('.day-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  renderDayContent(idx);
}

function renderDayContent(idx) {
  const day = state.menu.days[idx];
  const el = document.getElementById('day-content');
  if (!day) return;

  const mealOrder = ['breakfast', 'lunch', 'snack', 'dinner'];
  const mealsHtml = mealOrder.map(key => {
    const meal = day.meals[key];
    if (!meal || !meal.name) return '';
    const ingr = meal.ingredients ? meal.ingredients.map(i => `<li>${i.item} — ${i.amount}</li>`).join('') : '';
    const m = meal.macros || {};
    return `
      <div class="meal-card">
        <div class="meal-header">
          <span class="meal-name">${meal.name}</span>
          <span class="meal-time-label">${MEAL_LABELS[key]}</span>
        </div>
        ${ingr ? `<ul class="meal-ingredients">${ingr}</ul>` : ''}
        <div class="meal-macros">
          ${macroPill(m.calories + ' קל\'', '', 'cal').replace("''", '')}
          ${macroPill('חלבון', m.protein + 'g', 'prot')}
          ${macroPill('פחמימות', m.carbs + 'g', 'carb')}
          ${macroPill('שומן', m.fat + 'g', 'fat')}
        </div>
        ${meal.notes ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:8px;">💡 ${meal.notes}</div>` : ''}
      </div>`;
  }).join('');

  const t = day.daily_totals || {};
  const prepBadge = day.is_prep_day ? `<div class="prep-day-badge">🍳 יום Meal Prep</div>` : '';

  el.innerHTML = `
    ${prepBadge}
    ${mealsHtml}
    <div class="day-total-bar">
      <span class="label">סה"כ יום</span>
      <span class="value">${t.calories || 0} קל' | ${t.protein || 0}g חלבון</span>
    </div>`;
}

// Fix macro pill rendering
function macroPill(label, val, cls) {
  if (cls === 'cal') return `<span class="macro-pill cal">${label}</span>`;
  return `<span class="macro-pill ${cls}">${label} ${val}</span>`;
}

// ── Section: Shopping List ─────────────────────────────────────────

const SHOPPING_KEY = 'nutrition-shopping-checked';

function getChecked() {
  try { return JSON.parse(localStorage.getItem(SHOPPING_KEY) || '{}'); } catch { return {}; }
}

function setChecked(obj) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(obj));
}

function renderShopping() {
  const el = document.getElementById('sec-shopping');
  if (!state.shoppingList || !state.shoppingList.categories) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">🛒</div><p>אין רשימת קניות</p></div></div>`;
    return;
  }

  const checked = getChecked();
  const cats = state.shoppingList.categories;
  let html = '<div class="container"><div class="card">';

  for (const [catName, items] of Object.entries(cats)) {
    html += `<div class="category-title">${catName}</div>`;
    items.forEach((item, itemIdx) => {
      const key = `${catName}-${itemIdx}`;
      const isChecked = !!checked[key];
      html += `
        <label class="shopping-item ${isChecked ? 'checked' : ''}" onclick="toggleItem('${key}', this)">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()">
          <span class="item-name">${item.item}</span>
          <span class="item-amount">${item.amount}</span>
        </label>`;
    });
  }

  html += `</div>
    <button class="clear-btn" onclick="clearChecked()">נקה סימונים</button>
  </div>`;
  el.innerHTML = html;
}

function toggleItem(key, labelEl) {
  const checked = getChecked();
  checked[key] = !checked[key];
  setChecked(checked);
  labelEl.classList.toggle('checked', checked[key]);
  const cb = labelEl.querySelector('input[type=checkbox]');
  if (cb) cb.checked = checked[key];
}

function clearChecked() {
  localStorage.removeItem(SHOPPING_KEY);
  renderShopping();
}

// ── Section: Meal Prep ────────────────────────────────────────────

function renderMealPrep() {
  const el = document.getElementById('sec-prep');
  if (!state.mealPrep || !state.mealPrep.sessions || !state.mealPrep.sessions.length) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">🍳</div><p>אין סשני Meal Prep</p></div></div>`;
    return;
  }

  const sessions = state.mealPrep.sessions;
  let html = '<div class="container">';

  sessions.forEach(s => {
    const coversText = s.covers_days ? `מכסה: ${s.covers_days.map(formatDate).join(', ')}` : '';
    const tasksHtml = (s.tasks || []).map(t => `
      <div class="prep-task">
        <div class="task-num">${t.order}</div>
        <div class="task-body">
          <div class="task-name">${t.task}</div>
          ${t.quantity ? `<div class="task-qty">${t.quantity}</div>` : ''}
          ${t.note ? `<div class="task-note">${t.note}</div>` : ''}
        </div>
        ${t.duration_minutes ? `<div class="task-duration">${t.duration_minutes} דק'</div>` : ''}
      </div>`).join('');

    html += `
      <div class="card session-card">
        <div class="session-header">
          <span class="session-title">סשן ${s.session_number} — ${s.day_name}</span>
          <span class="session-meta">~${s.estimated_total_minutes} דק'</span>
        </div>
        <div class="covers-label">${coversText}</div>
        ${tasksHtml}
      </div>`;
  });

  html += '</div>';
  el.innerHTML = html;
}

// ── Section: Log ──────────────────────────────────────────────────

function renderLog() {
  const el = document.getElementById('sec-log');
  if (!state.log || !state.log.entries || !state.log.entries.length) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">📋</div><p>אין ערכים בלוג</p></div></div>`;
    return;
  }

  const entries = [...state.log.entries].reverse();
  const entriesHtml = entries.map(e => {
    const iconData = LOG_ICONS[e.type] || { icon: '📌', cls: 'system' };
    return `
      <div class="log-entry">
        <div class="log-icon ${iconData.cls}">${iconData.icon}</div>
        <div class="log-body">
          <div class="log-message">${e.message}</div>
          ${e.timestamp ? `<div class="log-time">${formatDateTime(e.timestamp)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `<div class="container"><div class="card">${entriesHtml}</div></div>`;
}

// ── Section: Balance ──────────────────────────────────────────────

function renderBalance() {
  const el = document.getElementById('sec-balance');
  if (!state.balance || !state.balance.days) {
    el.innerHTML = `<div class="container"><div class="empty-state"><div class="icon">⚖️</div><p>אין נתוני מאזן</p></div></div>`;
    return;
  }

  const days = state.balance.days;
  const planned = state.balance.weekly_planned || {};
  const actual = state.balance.weekly_actual || {};

  const rowsHtml = days.map(d => {
    const dev = d.deviation ? d.deviation.calories : 0;
    const devStr = dev === 0 ? '—' : (dev > 0 ? `+${dev}` : `${dev}`);
    const devCls = dev > 0 ? 'dev-positive' : (dev < 0 ? 'dev-negative' : '');
    const statusMap = { on_track: { txt: '✅', cls: 'on-track' }, deviation: { txt: '⚠️', cls: 'deviation' }, pending: { txt: '—', cls: 'pending' } };
    const st = statusMap[d.status] || statusMap.pending;
    return `
      <tr>
        <td>${d.day_name}<br><span style="font-size:0.7rem;color:var(--muted)">${formatDate(d.date)}</span></td>
        <td>${d.planned ? d.planned.calories : 0}</td>
        <td>${d.actual && d.actual.calories ? d.actual.calories : '—'}</td>
        <td class="${devCls}">${devStr}</td>
        <td><span class="day-status ${st.cls}">${st.txt}</span></td>
      </tr>`;
  }).join('');

  // Mini bar chart — weekly calories per day
  const maxCal = Math.max(...days.map(d => Math.max(d.planned ? d.planned.calories : 0, d.actual ? d.actual.calories : 0)));
  const chartHtml = days.map(d => {
    const act = d.actual ? d.actual.calories : 0;
    const w = act > 0 ? Math.round((act / maxCal) * 100) : 0;
    return `
      <div class="mini-chart-row">
        <div class="mini-chart-label">${d.day_name}</div>
        <div class="mini-chart-bar"><div class="mini-chart-fill" style="width:${w}%"></div></div>
        <div class="mini-chart-val">${act > 0 ? act : '—'}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="container">
      <div class="card">
        <div class="card-title">טבלת מאזן שבועי</div>
        <table class="balance-table">
          <thead><tr><th>יום</th><th>מתוכנן</th><th>בפועל</th><th>הפרש</th><th>סטטוס</th></tr></thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td>סה"כ</td>
              <td>${(planned.calories || 0).toLocaleString()}</td>
              <td>${(actual.calories || 0).toLocaleString()}</td>
              <td class="${actual.calories > planned.calories ? 'dev-positive' : 'dev-negative'}">
                ${actual.calories ? (actual.calories - planned.calories > 0 ? '+' : '') + (actual.calories - planned.calories) : '—'}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title">קלוריות ביום</div>
        <div class="mini-chart">${chartHtml}</div>
      </div>
    </div>`;
}

// ── Navigation ────────────────────────────────────────────────────

const SECTIONS = ['status', 'menu', 'shopping', 'prep', 'log', 'balance'];

function showSection(name) {
  state.activeSection = name;
  SECTIONS.forEach(s => {
    document.getElementById(`sec-${s}`).classList.toggle('active', s === name);
    document.getElementById(`tab-${s}`).classList.toggle('active', s === name);
  });
  renderSection(name);
}

function renderSection(name) {
  const renderers = {
    status: renderStatus,
    menu: renderMenu,
    shopping: renderShopping,
    prep: renderMealPrep,
    log: renderLog,
    balance: renderBalance
  };
  if (renderers[name]) renderers[name]();
}

// ── Init ──────────────────────────────────────────────────────────

async function init() {
  // Update header date
  const weekLabel = document.getElementById('week-label');
  if (weekLabel) weekLabel.textContent = 'טוען...';

  await loadAll();

  // Update week label
  if (state.menu && state.menu.week_start && state.menu.week_end) {
    if (weekLabel) {
      weekLabel.textContent = `${formatDate(state.menu.week_start)} – ${formatDate(state.menu.week_end)}`;
    }
  }

  // Update last updated
  const lastUpEl = document.getElementById('last-updated');
  if (lastUpEl && state.balance && state.balance.updated_at) {
    lastUpEl.textContent = `עודכן: ${formatDateTime(state.balance.updated_at)}`;
  }

  // Show default section
  showSection('status');
}

document.addEventListener('DOMContentLoaded', init);

// Expose to global for onclick handlers
window.selectDay = selectDay;
window.toggleItem = toggleItem;
window.clearChecked = clearChecked;
window.showSection = showSection;
