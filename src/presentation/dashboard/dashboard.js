const WS_URL = 'ws://localhost:3001';
const API_BASE = 'http://localhost:3000/api';

let ws = null;
let reconnectTimer = null;
const stats = { entries: 0, exits: 0, denied: 0 };
const MAX_EVENTS_DISPLAYED = 50;

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    setConnectionStatus(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.addEventListener('close', () => {
    setConnectionStatus(false);
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  });

  ws.addEventListener('error', () => {
    setConnectionStatus(false);
  });

  ws.addEventListener('message', (event) => {
    try {
      const { topic, payload } = JSON.parse(event.data);
      handleMqttMessage(topic, payload);
    } catch {
      console.warn('Failed to parse WS message');
    }
  });
}

// Topics device/status and device/error are infrastructure events — only update
// the device badge and occupancy, never push to the access events feed.
const ACCESS_TOPICS = ['festival/venue/', 'festival/device/'];
const FEED_TOPICS   = ['festival/venue/'];

function handleMqttMessage(topic, payload) {
  if (!payload || !payload.eventType) return;

  updateDeviceState(payload.state);
  updateOccupancy(payload.currentOccupancy, payload.maxCapacity);

  // Only push access & capacity events to the visible feed (not raw device status)
  const isAccessOrCapacity = typeof topic === 'string' && FEED_TOPICS.some((t) => topic.startsWith(t));
  if (isAccessOrCapacity) {
    appendEvent(payload);
    updateStats(payload.eventType);
  }
}

function setConnectionStatus(connected) {
  const dot = document.getElementById('connection-dot');
  const label = document.getElementById('connection-label');
  dot.className = 'connection-dot' + (connected ? ' connected' : '');
  label.textContent = connected ? 'Connecté' : 'Déconnecté';
}

function updateOccupancy(current, max) {
  if (current === undefined || max === undefined) return;
  const rate = current / max;
  const pct = Math.round(rate * 100);

  document.getElementById('occ-current').textContent = current;
  document.getElementById('occ-max').textContent = `/ ${max}`;
  document.getElementById('occ-rate').textContent = `${pct}%`;

  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;
  fill.className = 'progress-fill';
  if (rate >= 1) fill.classList.add('critical');
  else if (rate >= 0.95) fill.classList.add('warning');
  else if (rate >= 0.8) fill.classList.add('warning');
}

function updateDeviceState(state) {
  if (!state) return;
  const badge = document.getElementById('device-badge');
  badge.className = `device-badge ${state}`;
  badge.querySelector('.badge-text').textContent = state;
}

function appendEvent(payload) {
  const list = document.getElementById('events-list');

  // Remove placeholder text on first real event
  const placeholder = list.querySelector('[data-placeholder]');
  if (placeholder) list.removeChild(placeholder);

  const item = document.createElement('div');
  item.className = 'event-item';

  const time = new Date(payload.timestamp).toLocaleTimeString('fr-FR');
  const noTicketEvents = ['CAPACITY_WARNING', 'CAPACITY_EXCEEDED', 'EXIT'];
  const ticketLabel = payload.ticketId
    ? payload.ticketId
    : noTicketEvents.includes(payload.eventType)
      ? '<span style="color:var(--color-text-muted);font-style:italic">sans billet</span>'
      : '<span style="color:var(--color-text-muted)">—</span>';
  const statusLabel = payload.ticketStatus
    ? ` <span style="opacity:0.7">(${payload.ticketStatus})</span>`
    : '';

  item.innerHTML = `
    <span class="event-type-badge ${payload.eventType}">${payload.eventType}</span>
    <span class="event-ticket">${ticketLabel}${statusLabel}</span>
    <span class="event-time">${time}</span>
  `;

  list.insertBefore(item, list.firstChild);

  const items = list.querySelectorAll('.event-item');
  if (items.length > MAX_EVENTS_DISPLAYED) {
    list.removeChild(items[items.length - 1]);
  }
}

function updateStats(eventType) {
  if (eventType === 'ENTRY') stats.entries++;
  else if (eventType === 'EXIT') stats.exits++;
  else if (eventType === 'DENIED') stats.denied++;

  document.getElementById('stat-entries').textContent = stats.entries;
  document.getElementById('stat-exits').textContent = stats.exits;
  document.getElementById('stat-denied').textContent = stats.denied;
}

async function triggerScenario(scenario) {
  const btn = document.querySelector(`[data-scenario="${scenario}"]`);
  if (btn) btn.classList.add('loading');

  try {
    const url = scenario === 'all'
      ? `${API_BASE}/simulate`
      : `${API_BASE}/simulate/${scenario}`;
    await fetch(url, { method: 'POST' });
  } catch (err) {
    console.error('Simulation error:', err);
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();

  document.querySelectorAll('[data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerScenario(btn.dataset.scenario);
    });
  });
});
