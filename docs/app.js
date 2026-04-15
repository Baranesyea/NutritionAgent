/* === Nutrition Agent Dashboard === */

const REPO_RAW = 'https://raw.githubusercontent.com/baranesyea/nutritionagent/main';
const REPO_API = 'https://api.github.com/repos/baranesyea/nutritionagent';
const REPO_OWNER = 'baranesyea';
const REPO_NAME = 'nutritionagent';
const PAT_KEY = 'nutrition-gh-token';

// ── Human-readable quantity hints ─────────────────────────────────

const QUANTITY_HINTS = [
  { match: ['שיבולת שועל'],                  g: { 30:'3 כפות', 40:'4 כפות', 50:'½ כוס' } },
  { match: ['יוגורט חלבון', 'יוגורט'],       g: { 100:'½ גביע', 170:'גביע', 200:'גביע גדול', 250:'גביע גדול+' } },
  { match: ['קוטג'],                          g: { 100:'½ גביע', 200:'גביע' } },
  { match: ['אבקת חלבון'],                    g: { 15:'כף גדושה', 20:'כף וחצי', 25:'2 כפות', 30:'2 כפות גדושות' } },
  { match: ['שמן זית'],                       g: { 3:'כפית', 5:'כפית', 8:'כף', 10:'כף', 15:'כף+כפית' }, ml: { 3:'כפית', 5:'כפית', 10:'כף' } },
  { match: ['דבש'],                           g: { 5:'כפית', 10:'כף' } },
  { match: ['חזה עוף'],                       g: { 150:'חזה קטן', 180:'חזה בינוני', 200:'חזה בינוני', 250:'חזה גדול' } },
  { match: ['ירך עוף'],                       g: { 180:'ירך בינונית', 200:'ירך בינונית', 220:'ירך גדולה' } },
  { match: ['בשר טחון'],                      g: { 150:'כדור גדול', 200:'2 כדורים גדולים' } },
  { match: ['טונה'],                          g: { 80:'קופסא', 160:'2 קופסאות' } },
  { match: ['סלמון'],                         g: { 150:'פילה קטן', 200:'פילה בינוני' } },
  { match: ['מושט', 'דניס', 'דג לבן'],       g: { 200:'פילה בינוני', 250:'פילה גדול' } },
  { match: ['אורז'],                          g: { 80:'½ כוס יבש', 120:'¾ כוס מבושל', 130:'¾ כוס מבושל', 160:'כוס מבושל', 180:'כוס+ מבושל' } },
  { match: ['פסטה'],                          g: { 80:'קומץ יבש', 140:'¾ כוס מבושל', 150:'כוס מבושל' } },
  { match: ['קינואה'],                        g: { 150:'¾ כוס מבושל', 180:'כוס מבושל' } },
  { match: ['קוסקוס'],                        g: { 100:'½ כוס', 150:'¾ כוס מבושל' } },
  { match: ['עדשים'],                         g: { 50:'¼ כוס מבושל', 60:'⅓ כוס מבושל', 80:'½ כוס מבושל' } },
  { match: ['לחם מלא'],                       g: { 30:'פרוסה', 60:'2 פרוסות', 70:'2 פרוסות' } },
  { match: ['בטטה'],                          g: { 200:'בטטה בינונית', 250:'בטטה גדולה' } },
  { match: ['תפוחי אדמה', 'תפו"א'],          g: { 200:'2 קטנים', 220:'2 בינוניים', 250:'2 בינוניים', 280:'2 גדולים' } },
  { match: ['פירות יער'],                     g: { 80:'½ כוס', 100:'¾ כוס' } },
  { match: ['ברוקולי'],                       g: { 100:'כוס', 120:'כוס גדושה' } },
  { match: ['שקדים', 'קשיו'],                 g: { 30:'חופן' } },
  { match: ['אגוזי מלך'],                     g: { 5:'3-4 אגוזים', 10:'5-6 אגוזים', 15:'8 אגוזים' } },
  { match: ['חמאת בוטנים'],                   g: { 15:'כף', 20:'כף גדושה', 30:'2 כפות' } },
  { match: ['טחינה'],                         g: { 15:'כף', 20:'כף גדושה', 30:'2 כפות' } },
  { match: ['חלב סויה'],                      g: { 200:'כוס' }, ml: { 200:'כוס' } },
  { match: ['רוטב עגבניות'],                  g: { 100:'½ כוס', 120:'½ כוס' } },
  { match: ['חומוס'],                         g: { 40:'2 כפות', 60:'3 כפות' } },
];

function humanize(itemName, amount) {
  const mG  = amount.match(/^(\d+(?:\.\d+)?)g$/);
  const mMl = amount.match(/^(\d+(?:\.\d+)?)ml$/);
  if (!mG && !mMl) return null;
  const val  = parseFloat(mG ? mG[1] : mMl[1]);
  const unit = mG ? 'g' : 'ml';
  for (const entry of QUANTITY_HINTS) {
    if (entry.match.some(k => itemName.includes(k))) {
      const table = (unit === 'ml' && entry.ml) ? entry.ml : entry.g;
      if (!table) continue;
      if (table[val]) return table[val];
      const nearest = Object.keys(table).map(Number).sort((a, b) => Math.abs(a - val) - Math.abs(b - val))[0];
      if (Math.abs(nearest - val) <= 25) return table[nearest];
    }
  }
  return null;
}

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
    const ingr = meal.ingredients ? meal.ingredients.map(i => {
      const hint = humanize(i.item, i.amount);
      return `<li>${i.item} — ${i.amount}${hint ? ` <span class="qty-hint">(${hint})</span>` : ''}</li>`;
    }).join('') : '';
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
    <div class="list-actions">
      <button class="copy-btn" onclick="copyChecked()">📋 העתק מסומנים</button>
      <button class="clear-btn" onclick="clearChecked()">נקה סימונים</button>
    </div>
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

function copyChecked() {
  const checked = getChecked();
  const cats = state.shoppingList.categories;
  const lines = [];
  for (const [catName, items] of Object.entries(cats)) {
    items.forEach((item, idx) => {
      if (checked[`${catName}-${idx}`]) lines.push(`${item.item} — ${item.amount}`);
    });
  }
  if (!lines.length) { showToast('לא סומנו פריטים'); return; }
  const text = lines.join('\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast(`הועתקו ${lines.length} פריטים ✓`));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast(`הועתקו ${lines.length} פריטים ✓`);
  }
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
    const isEditable = e.source === 'dashboard' && e.processed === false;
    const cal = e.estimated_calories ? ` <span style="color:var(--amber)">(~${e.estimated_calories} קל')</span>` : '';
    const editedBadge = e.edited_at ? ` <span style="color:var(--muted);font-size:0.7rem">(נערך)</span>` : '';
    const actions = isEditable ? `
      <div class="log-actions">
        <button class="log-btn" onclick="editLogEntry('${e.timestamp}')" title="ערוך">✏️</button>
        <button class="log-btn" onclick="deleteLogEntry('${e.timestamp}')" title="מחק">🗑️</button>
      </div>` : '';
    const lockedBadge = e.processed ? ` <span class="log-locked" title="טופל על ידי הסוכן">🔒</span>` : '';
    return `
      <div class="log-entry">
        <div class="log-icon ${iconData.cls}">${iconData.icon}</div>
        <div class="log-body">
          <div class="log-message">${e.message}${cal}${editedBadge}${lockedBadge}</div>
          ${e.timestamp ? `<div class="log-time">${formatDateTime(e.timestamp)}</div>` : ''}
        </div>
        ${actions}
      </div>`;
  }).join('');

  el.innerHTML = `<div class="container"><div class="card">${entriesHtml}</div></div>`;
}

// ── Edit / Delete log entries ─────────────────────────────────────

let editingTimestamp = null;

function editLogEntry(timestamp) {
  const entry = state.log.entries.find(e => e.timestamp === timestamp);
  if (!entry) return;
  if (entry.processed) { showToast('לא ניתן לערוך — הדיווח כבר טופל'); return; }
  editingTimestamp = timestamp;
  openReportModal();
  document.getElementById('report-text').value = entry.message.replace(/^ערן דיווח: /, '');
  document.getElementById('report-cal').value = entry.estimated_calories || '';
  const titleEl = document.querySelector('#report-modal .modal-title');
  if (titleEl) titleEl.textContent = 'עריכת דיווח';
  const btn = document.getElementById('report-btn-submit');
  if (btn) btn.textContent = 'שמור שינויים';
}

async function deleteLogEntry(timestamp) {
  if (!getToken()) { openTokenModal(() => deleteLogEntry(timestamp)); return; }
  if (!confirm('למחוק את הדיווח?')) return;
  try {
    const file = await githubGetFile('data/current-week/log.json');
    const current = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))));
    const entry = current.entries.find(e => e.timestamp === timestamp);
    if (entry && entry.processed) { showToast('לא ניתן למחוק — הדיווח כבר טופל'); return; }
    current.entries = current.entries.filter(e => e.timestamp !== timestamp);
    await githubPutFile('data/current-week/log.json', current, file.sha, `🗑️ Delete user note`);
    state.log = current;
    renderLog();
    showToast('הדיווח נמחק');
  } catch (e) {
    showToast('שגיאה: ' + e.message);
  }
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

// ── GitHub API — Write ────────────────────────────────────────────

function getToken() { return localStorage.getItem(PAT_KEY) || ''; }
function saveToken(t) { localStorage.setItem(PAT_KEY, t.trim()); }

async function githubGetFile(path) {
  const r = await fetch(`${REPO_API}/contents/${path}`, {
    headers: { Authorization: `token ${getToken()}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) throw new Error(`GitHub GET failed: ${r.status}`);
  return r.json(); // { content (base64), sha }
}

async function githubPutFile(path, contentObj, sha, message) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));
  const r = await fetch(`${REPO_API}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${getToken()}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, content: encoded, sha })
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `GitHub PUT failed: ${r.status}`);
  }
  return r.json();
}

async function appendToLog(entry) {
  const file = await githubGetFile('data/current-week/log.json');
  const current = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))));
  current.entries.push(entry);
  await githubPutFile(
    'data/current-week/log.json',
    current,
    file.sha,
    `📝 User note: ${entry.date}`
  );
}

// ── Token Modal ───────────────────────────────────────────────────

function openTokenModal(afterSave) {
  const existing = getToken();
  const modal = document.getElementById('token-modal');
  document.getElementById('token-input').value = existing;
  modal.classList.add('open');
  window._afterTokenSave = afterSave || null;
}

function closeTokenModal() {
  document.getElementById('token-modal').classList.remove('open');
}

function saveTokenAndContinue() {
  const val = document.getElementById('token-input').value.trim();
  if (!val) { alert('נא להזין מפתח'); return; }
  saveToken(val);
  closeTokenModal();
  const cb = window._afterTokenSave;
  if (cb) cb();
}

// ── Report Modal ──────────────────────────────────────────────────

function openReportModal(isNew) {
  if (!getToken()) {
    openTokenModal(() => openReportModal(true));
    return;
  }
  if (isNew) {
    editingTimestamp = null;
    document.getElementById('report-text').value = '';
    document.getElementById('report-cal').value = '';
    const titleEl = document.querySelector('#report-modal .modal-title');
    if (titleEl) titleEl.textContent = 'דיווח לסוכן';
  }
  document.getElementById('report-error').textContent = '';
  document.getElementById('report-btn-submit').disabled = false;
  if (!editingTimestamp) document.getElementById('report-btn-submit').textContent = 'שלח לסוכן';
  document.getElementById('report-modal').classList.add('open');
  document.getElementById('report-text').focus();
}

function closeReportModal() {
  document.getElementById('report-modal').classList.remove('open');
}

async function submitReport() {
  const text = document.getElementById('report-text').value.trim();
  const cal = parseInt(document.getElementById('report-cal').value) || null;
  const errEl = document.getElementById('report-error');
  const btn = document.getElementById('report-btn-submit');

  if (!text) { errEl.textContent = 'נא לכתוב מה אכלת'; return; }

  btn.disabled = true;
  btn.textContent = 'שומר...';
  errEl.textContent = '';

  try {
    const file = await githubGetFile('data/current-week/log.json');
    const current = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))));

    if (editingTimestamp) {
      // Edit existing entry
      const idx = current.entries.findIndex(e => e.timestamp === editingTimestamp);
      if (idx < 0) throw new Error('הדיווח לא נמצא');
      if (current.entries[idx].processed) throw new Error('הדיווח כבר טופל ולא ניתן לערוך אותו');
      current.entries[idx].message = `ערן דיווח: ${text}`;
      if (cal) current.entries[idx].estimated_calories = cal;
      else delete current.entries[idx].estimated_calories;
      current.entries[idx].edited_at = new Date().toISOString();
      await githubPutFile('data/current-week/log.json', current, file.sha, `✏️ Edit user note`);
    } else {
      // New entry
      const now = new Date();
      current.entries.push({
        timestamp: now.toISOString(),
        type: 'deviation',
        source: 'dashboard',
        processed: false,
        message: `ערן דיווח: ${text}`,
        date: now.toLocaleDateString('sv-SE'),
        ...(cal ? { estimated_calories: cal } : {})
      });
      await githubPutFile('data/current-week/log.json', current, file.sha, `📝 User note`);
    }

    state.log = current;
    const wasEditing = !!editingTimestamp;
    editingTimestamp = null;
    closeReportModal();
    showToast(wasEditing ? 'הדיווח עודכן' : 'הדיווח נשמר — הסוכן יתחשב בזה');
    if (state.activeSection === 'log') renderLog();
  } catch (e) {
    errEl.textContent = e.message.includes('401') || e.message.includes('403')
      ? 'מפתח שגוי — לחץ על ⚙️ לעדכון'
      : `שגיאה: ${e.message}`;
    btn.disabled = false;
    btn.textContent = editingTimestamp ? 'שמור שינויים' : 'שלח לסוכן';
  }
}

// ── Toast ─────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Expose to global for onclick handlers
window.selectDay = selectDay;
window.toggleItem = toggleItem;
window.clearChecked = clearChecked;
window.showSection = showSection;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.openTokenModal = openTokenModal;
window.closeTokenModal = closeTokenModal;
window.saveTokenAndContinue = saveTokenAndContinue;
window.editLogEntry = editLogEntry;
window.deleteLogEntry = deleteLogEntry;
window.copyChecked = copyChecked;
