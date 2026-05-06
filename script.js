/* ============================================================
   GovAssist AI — script.js
   Pure JavaScript: no frameworks, no bundler, just fetch API
   ============================================================ */

// ── DOM References ──────────────────────────────────────────
const messagesEl   = document.getElementById('messages');
const chatInput    = document.getElementById('chatInput');
const sendBtn      = document.getElementById('sendBtn');
const profileBtn   = document.getElementById('profileBtn');
const profilePanel = document.getElementById('profilePanel');
const overlay      = document.getElementById('overlay');
const closeProfile = document.getElementById('closeProfile');
const saveProfile  = document.getElementById('saveProfile');
const topicChips   = document.getElementById('topicChips');
const chatWindow   = document.getElementById('chatWindow');
const emptyState   = document.getElementById('emptyState');
const toast        = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// History sidebar elements
const historySidebar       = document.getElementById('historySidebar');
const historyToggleBtn    = document.getElementById('historyToggleBtn');
const closeHistorySidebar = document.getElementById('closeHistorySidebar');
const historyList         = document.getElementById('historyList');
const historyOverlay      = document.getElementById('historyOverlay');
const newChatBtn          = document.getElementById('newChatBtn');

// Language selector elements
const languageToggleBtn  = document.getElementById('languageToggleBtn');
const languageDropdown  = document.getElementById('languageDropdown');
const languageLabel     = document.getElementById('languageLabel');
const languageOptions   = document.querySelectorAll('.language-option');

// Theme toggle elements
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Profile form fields
const profileName       = document.getElementById('profileName');
const profileAge        = document.getElementById('profileAge');
const profileIncome     = document.getElementById('profileIncome');
const profileOccupation = document.getElementById('profileOccupation');
const profileState      = document.getElementById('profileState');

// ── State ────────────────────────────────────────────────────
let userProfile = {};
let isWaiting   = false;
let currentSessionId = null;
let currentSessionMessages = [];
let chatHistory = {};
let currentLanguage = getCurrentLanguage();
let currentTheme = getCurrentTheme();

// ── Keyword → Topic chip detection ──────────────────────────
const KEYWORD_MAP = {
  farmer: 'Agriculture', kisan: 'Agriculture', farming: 'Agriculture', crop: 'Agriculture',
  health: 'Health', hospital: 'Health', medical: 'Health', doctor: 'Health', sick: 'Health',
  house: 'Housing', home: 'Housing', housing: 'Housing', loan: 'Housing', shelter: 'Housing',
  education: 'Education', school: 'Education', student: 'Education', scholarship: 'Education',
  job: 'Employment', work: 'Employment', employment: 'Employment', labour: 'Employment',
  business: 'Finance', mudra: 'Finance', bank: 'Finance', savings: 'Finance',
};

const CATEGORY_ICONS = {
  agriculture: '🌿',
  health:      '❤',
  housing:     '🏠',
  employment:  '💼',
  education:   '📚',
  finance:     '💰',
};

// ── Helpers ──────────────────────────────────────────────────
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showToast(message, duration = 2000) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function copyToClipboard(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(label);
  }).catch(() => {
    showToast('Failed to copy');
  });
}

function setWaiting(val) {
  isWaiting = val;
  sendBtn.disabled = val || !chatInput.value.trim();
  chatInput.disabled = val;
}

// ── Render topic chips while typing ─────────────────────────
chatInput.addEventListener('input', () => {
  sendBtn.disabled = !chatInput.value.trim() || isWaiting;
  renderTopicChips(chatInput.value);
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function renderTopicChips(text) {
  const words = text.toLowerCase().split(/\W+/);
  const found = new Set();
  words.forEach(w => { if (KEYWORD_MAP[w]) found.add(KEYWORD_MAP[w]); });

  topicChips.innerHTML = '';
  if (found.size === 0) return;

  const label = document.createElement('span');
  label.className = 'topic-chip-label';
  label.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> You might be asking about:';
  topicChips.appendChild(label);

  found.forEach(topic => {
    const chip = document.createElement('span');
    chip.className = 'topic-chip';
    chip.textContent = topic;
    topicChips.appendChild(chip);
  });
}

// ── Build message bubble HTML ─────────────────────────────────
function renderBotText(text) {
  // Handle line breaks and basic formatting
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('- ') || line.match(/^[•*]\s/)) {
        return `<div class="list-item">${line.replace(/^[-•*]\s/, '')}</div>`;
      }
      // Bold **text**
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return line ? `<p>${line}</p>` : '';
    })
    .join('');
}

function createMessageEl(role, text, schemes) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const content = document.createElement('div');
  content.className = 'message-content';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = role === 'user'
    ? `<p>${escapeHtml(text)}</p>`
    : renderBotText(text);

  content.appendChild(bubble);

  // Render scheme cards below bot message
  if (schemes && schemes.length > 0) {
    const label = document.createElement('div');
    label.className = 'scheme-cards-label';
    label.textContent = t('schemes.label');
    content.appendChild(label);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'scheme-cards';
    schemes.forEach(scheme => cardsContainer.appendChild(createSchemeCard(scheme)));
    content.appendChild(cardsContainer);
  }

  row.appendChild(content);
  return row;
}

function createSchemeCard(scheme) {
  const cat = (scheme.category || '').toLowerCase();
  const badgeClass = `badge-${cat}`;
  const icon = CATEGORY_ICONS[cat] || '📄';

  const maxIncome = scheme.eligibility?.maxIncome;
  const maxIncomeLabel = t('schemes.maxIncome');
  const metaTags = maxIncome
    ? `<span class="scheme-tag">${maxIncomeLabel}${Number(maxIncome).toLocaleString('en-IN')}</span>`
    : '';

  const card = document.createElement('div');
  card.className = 'scheme-card';
  
  const schemeText = `${scheme.name}\n${scheme.description}\n\nBenefits: ${scheme.benefits}`;
  
  const copyBtnText = t('schemes.copy');
  const applyBtnText = t('schemes.applyNow');
  const benefitsLabel = t('schemes.benefits');
  
  card.innerHTML = `
    <div class="scheme-card-body">
      <div class="scheme-card-top">
        <div class="scheme-name">${escapeHtml(scheme.name)}</div>
        <span class="scheme-badge ${badgeClass}">${icon} ${capitalize(scheme.category)}</span>
      </div>
      <p class="scheme-desc">${escapeHtml(scheme.description)}</p>
      <div class="scheme-benefits">
        <div class="scheme-benefits-label">${benefitsLabel}</div>
        <div class="scheme-benefits-text">${escapeHtml(scheme.benefits)}</div>
      </div>
      ${metaTags ? `<div class="scheme-meta">${metaTags}</div>` : ''}
    </div>
    <div class="scheme-card-footer">
      <button class="copy-btn" data-scheme="${escapeHtml(schemeText)}" title="${copyBtnText}">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        ${copyBtnText}
      </button>
      ${scheme.applicationUrl ? `
      <a class="apply-btn" href="${escapeHtml(scheme.applicationUrl)}" target="_blank" rel="noopener">
        ${applyBtnText}
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>` : ''}
    </div>
  `;
  
  const copyBtn = card.querySelector('.copy-btn');
  copyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const copiedMsg = t('schemes.schemeDetailsCopied');
    copyToClipboard(schemeText, copiedMsg);
    copyBtn.classList.add('copied');
    setTimeout(() => copyBtn.classList.remove('copied'), 1500);
  });
  
  return card;
}

function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row bot typing-row';
  row.id = 'typing-indicator';
  row.innerHTML = `
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  messagesEl.appendChild(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ── Branding logo shown before first message ──────────────────
function showBranding() {
  const el = document.createElement('div');
  el.id = 'branding-logo';
  el.className = 'branding-logo';
  el.innerHTML = `
    <div class="brand-emblem">
      <span class="brand-ashoka">🔵</span>
    </div>
    <div class="brand-name">GovAssist AI</div>
  `;
  messagesEl.appendChild(el);
}

// ── Send message ─────────────────────────────────────────────
async function sendMessage(overrideText) {
  const logo = document.getElementById('branding-logo');
  if (logo) logo.remove();
  
  if (emptyState) emptyState.classList.add('hidden');

  const text = overrideText || chatInput.value.trim();
  if (!text || isWaiting) return;

  // Initialize session if needed
  if (!currentSessionId) {
    currentSessionId = generateSessionId();
  }

  // Render user bubble
  const userEl = createMessageEl('user', text, null);
  messagesEl.appendChild(userEl);
  currentSessionMessages.push({ role: 'user', text: text });
  
  chatInput.value = '';
  topicChips.innerHTML = '';
  scrollToBottom();

  // Show typing
  setWaiting(true);
  showTypingIndicator();

  try {
    const body = { message: text };
    if (Object.keys(userProfile).length > 0) body.userProfile = userProfile;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    removeTypingIndicator();
    const botEl = createMessageEl('bot', data.reply, data.matchedSchemes);
    messagesEl.appendChild(botEl);
    currentSessionMessages.push({ role: 'bot', text: data.reply, schemes: data.matchedSchemes || null });
    saveToHistory();
  } catch (err) {
    removeTypingIndicator();
    const errorMsg = "I'm having trouble connecting right now. Please try again.";
    messagesEl.appendChild(createMessageEl('bot', errorMsg, null));
    currentSessionMessages.push({ role: 'bot', text: errorMsg, schemes: null });
    saveToHistory();
  } finally {
    setWaiting(false);
    scrollToBottom();
    chatInput.focus();
  }
}

sendBtn.addEventListener('click', () => sendMessage());

// ── Profile panel ─────────────────────────────────────────────
function openProfile() {
  profilePanel.classList.add('open');
  overlay.classList.add('active');
  // Restore saved profile values
  profileName.value       = userProfile.name       || '';
  profileAge.value        = userProfile.age        || '';
  profileIncome.value     = userProfile.income     || '';
  profileOccupation.value = userProfile.occupation || '';
  profileState.value      = userProfile.state      || '';
}

function closeProfilePanel() {
  profilePanel.classList.remove('open');
  overlay.classList.remove('active');
}

function saveProfileData() {
  userProfile = {
    name:       profileName.value.trim()       || undefined,
    age:        profileAge.value               ? parseInt(profileAge.value)    : undefined,
    income:     profileIncome.value            ? parseInt(profileIncome.value) : undefined,
    occupation: profileOccupation.value        || undefined,
    state:      profileState.value             || undefined,
  };
  // Strip undefined keys
  Object.keys(userProfile).forEach(k => userProfile[k] === undefined && delete userProfile[k]);
  closeProfilePanel();

  // Update Profile button label to show name if available
  if (userProfile.name) {
    profileBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      ${escapeHtml(userProfile.name.split(' ')[0])}`;
  }
}

profileBtn.addEventListener('click', openProfile);
closeProfile.addEventListener('click', closeProfilePanel);
saveProfile.addEventListener('click', saveProfileData);
overlay.addEventListener('click', closeProfilePanel);

// ── Chat History Management ─────────────────────────────────
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function saveToHistory() {
  if (currentSessionId && currentSessionMessages.length > 0) {
    const firstUserMsg = currentSessionMessages.find(m => m.role === 'user')?.text || 'New Chat';
    const title = firstUserMsg.substring(0, 50) + (firstUserMsg.length > 50 ? '...' : '');
    
    chatHistory[currentSessionId] = {
      id: currentSessionId,
      title: title,
      timestamp: new Date().toISOString(),
      messages: currentSessionMessages,
    };
    
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }
}

function loadHistoryFromStorage() {
  const stored = localStorage.getItem('chatHistory');
  if (stored) {
    try {
      chatHistory = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load history:', e);
      chatHistory = {};
    }
  }
  renderHistoryList();
}

function renderHistoryList() {
  const sessions = Object.values(chatHistory).sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  if (sessions.length === 0) {
    historyList.innerHTML = '<p class="history-empty">No chat history yet</p>';
    return;
  }
  
  historyList.innerHTML = sessions.map(session => `
    <div class="history-item ${session.id === currentSessionId ? 'active' : ''}" data-session-id="${session.id}">
      <div class="history-item-content">
        <div class="history-item-title">${escapeHtml(session.title)}</div>
        <div class="history-item-subtitle">
          <span class="history-item-date">${formatDate(session.timestamp)}</span>
        </div>
      </div>
      <button class="history-item-delete" data-session-id="${session.id}" aria-label="Delete this chat" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  `).join('');
  
  // Add click handlers for history items
  historyList.querySelectorAll('.history-item').forEach(item => {
    const contentArea = item.querySelector('.history-item-content');
    contentArea.addEventListener('click', () => {
      const sessionId = item.dataset.sessionId;
      loadSession(sessionId);
      closeHistoryPanel();
    });
  });

  // Add click handlers for delete buttons
  historyList.querySelectorAll('.history-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.dataset.sessionId;
      deleteSession(sessionId);
    });
  });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function startNewSession() {
  saveToHistory();
  currentSessionId = generateSessionId();
  currentSessionMessages = [];
  messagesEl.innerHTML = '';
  showBranding();
  if (emptyState) emptyState.classList.remove('hidden');
  topicChips.innerHTML = '';
  chatInput.value = '';
  chatInput.focus();
  renderHistoryList();
  showToast('New chat session started');
}

function loadSession(sessionId) {
  const session = chatHistory[sessionId];
  if (!session) return;
  
  saveToHistory();
  currentSessionId = sessionId;
  currentSessionMessages = [...session.messages];
  
  messagesEl.innerHTML = '';
  if (emptyState) emptyState.classList.add('hidden');
  
  currentSessionMessages.forEach(msg => {
    if (msg.role === 'user') {
      messagesEl.appendChild(createMessageEl('user', msg.text, null));
    } else {
      messagesEl.appendChild(createMessageEl('bot', msg.text, msg.schemes || null));
    }
  });
  
  scrollToBottom();
  renderHistoryList();
}

function deleteSession(sessionId) {
  if (confirm('Are you sure you want to delete this chat?')) {
    delete chatHistory[sessionId];
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    renderHistoryList();
    
    // If deleted session was active, start new session
    if (sessionId === currentSessionId) {
      startNewSession();
    }
    
    showToast('Chat deleted');
  }
}

function deleteAllHistory() {
  if (confirm('Are you sure you want to delete ALL chat history? This cannot be undone.')) {
    chatHistory = {};
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    renderHistoryList();
    startNewSession();
    showToast('All chat history deleted');
  }
}

function toggleHistorySidebar() {
  historySidebar.classList.toggle('open');
  historyOverlay.classList.toggle('active');
}

function closeHistoryPanel() {
  historySidebar.classList.remove('open');
  historyOverlay.classList.remove('active');
}

historyToggleBtn.addEventListener('click', toggleHistorySidebar);
closeHistorySidebar.addEventListener('click', closeHistoryPanel);
historyOverlay.addEventListener('click', closeHistoryPanel);
newChatBtn.addEventListener('click', startNewSession);

// Delete all history button
const deleteAllHistoryBtn = document.getElementById('deleteAllHistoryBtn');
if (deleteAllHistoryBtn) {
  deleteAllHistoryBtn.addEventListener('click', deleteAllHistory);
}

// ── Language Management ────────────────────────────────────────
function updateLanguageUI() {
  currentLanguage = getCurrentLanguage();
  
  // Update language label
  languageLabel.textContent = currentLanguage === 'en' ? 'EN' : 'हि';
  
  // Update active language option
  languageOptions.forEach(option => {
    option.classList.toggle('active', option.dataset.lang === currentLanguage);
  });
  
  // Update all translatable elements
  updateAllTranslations();
  
  // Update placeholder text
  chatInput.placeholder = t('chat.placeholder');
  profileName.placeholder = t('profile.namePlaceholder');
  profileAge.placeholder = t('profile.agePlaceholder');
  profileIncome.placeholder = t('profile.incomePlaceholder');
  
  // Update suggestion buttons with correct language
  updateSuggestedQuestions();
}

function updateAllTranslations() {
  // Update elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key);
    
    if (el.tagName === 'OPTION') {
      el.textContent = text;
    } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  });
  
  // Update header
  document.querySelector('.header-title').textContent = t('header.title');
  document.querySelector('.header-subtitle').textContent = t('header.subtitle');
  
  // Update occupation options
  const occupationOptions = {
    '': t('profile.occupationPlaceholder'),
    'farmer': t('profile.farmer'),
    'laborer': t('profile.laborer'),
    'student': t('profile.student'),
    'salaried': t('profile.salaried'),
    'business': t('profile.business'),
    'unemployed': t('profile.unemployed'),
    'other': t('profile.other'),
  };
  
  profileOccupation.querySelectorAll('option').forEach(option => {
    const value = option.value;
    if (occupationOptions[value]) {
      option.textContent = occupationOptions[value];
    }
  });
}

function updateSuggestedQuestions() {
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    const key = btn.dataset.questionKey;
    if (key) {
      const text = t(key);
      // Extract emoji and append the translated text
      const emoji = btn.textContent.split(' ')[0];
      btn.textContent = `${emoji} ${text}`;
    }
  });
}

function toggleLanguageDropdown() {
  languageDropdown.classList.toggle('show');
}

function closeLanguageDropdown() {
  languageDropdown.classList.remove('show');
}

languageToggleBtn.addEventListener('click', toggleLanguageDropdown);

languageOptions.forEach(option => {
  option.addEventListener('click', () => {
    const lang = option.dataset.lang;
    if (setLanguage(lang)) {
      updateLanguageUI();
      closeLanguageDropdown();
      showToast(lang === 'en' ? 'Language changed to English' : 'भाषा हिंदी में बदल गई');
    }
  });
});

// Close language dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.language-selector')) {
    closeLanguageDropdown();
  }
});

// ── Theme Management ─────────────────────────────────────────
function getCurrentTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
  }
}

function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
}

// Initialize theme on page load
setTheme(currentTheme);

// Theme toggle button
themeToggleBtn.addEventListener('click', toggleTheme);

// ── Speech Recognition ───────────────────────────────────────
const micBtn = document.getElementById('micBtn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let isListening = false;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = currentLanguage === 'en' ? 'en-IN' : 'hi-IN';

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    micBtn.setAttribute('aria-label', 'Stop recording');
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      }
    }

    // Only update input with final recognized text (replace current input)
    if (finalTranscript.trim()) {
      chatInput.value = finalTranscript.trim();
      sendBtn.disabled = !chatInput.value.trim() || isWaiting;
      renderTopicChips(chatInput.value);
    }
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('listening');
    micBtn.setAttribute('aria-label', 'Start speech recognition');
  };

  recognition.onerror = (event) => {
    isListening = false;
    micBtn.classList.remove('listening');
    let errorMsg = 'Speech recognition error';
    
    switch (event.error) {
      case 'no-speech':
        errorMsg = 'No speech detected. Please try again.';
        break;
      case 'network':
        errorMsg = 'Network error. Please check your connection.';
        break;
      case 'not-allowed':
        errorMsg = 'Microphone permission denied.';
        break;
      default:
        errorMsg = `Speech recognition error: ${event.error}`;
    }
    
    showToast(errorMsg);
  };

  // Microphone button click handler
  micBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (isListening) {
      recognition.stop();
    } else {
      chatInput.focus();
      recognition.start();
    }
  });
} else {
  // Fallback: disable microphone button if not supported
  micBtn.style.display = 'none';
  console.warn('Speech Recognition API not supported in this browser');
}

// Update language for speech recognition when language changes
function updateSpeechRecognitionLanguage() {
  if (recognition) {
    recognition.lang = currentLanguage === 'en' ? 'en-IN' : 'hi-IN';
  }
}

// Override original setLanguage to also update speech recognition language
const originalSetLanguage = window.setLanguage;
window.setLanguage = function(lang) {
  const result = originalSetLanguage(lang);
  updateSpeechRecognitionLanguage();
  return result;
};


function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Init ──────────────────────────────────────────────────────
loadHistoryFromStorage();
updateLanguageUI();
currentSessionId = generateSessionId();
showBranding();
chatInput.focus();

// Add event listeners for suggested questions
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const question = btn.getAttribute('data-question');
    chatInput.value = question;
    sendBtn.disabled = false;
    sendMessage(question);
  });
});
