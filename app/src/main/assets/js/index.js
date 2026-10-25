const clock = document.getElementById('clock');
const date = document.getElementById('date');
const message = document.getElementById('message');
const applications = Array.from(document.querySelectorAll('.app'));
const settingsButton = document.getElementById('settingsButton');

const matchesTrack = document.getElementById('matchesList');
const matchesPrimary = document.getElementById('matchesPrimary');
const matchesDuplicate = document.getElementById('matchesDuplicate');

const controls = [...applications, settingsButton];

const TICKER_PX_PER_SECOND = 30;
const TICKER_MIN_SECONDS = 20;
const MATCHES_REFRESH_MS = 60 * 1000;

let selectedIndex = 0;

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  return element;
}

function createMatchItem(match) {
  const status = match.status || 'SCHEDULED';
  const isLive = status === 'LIVE';
  const isFinished = status === 'FINISHED';
  const isScheduled = status === 'SCHEDULED';

  const item = createElement('div', `ticker-item ${status.toLowerCase()}`);

  const statusElement = createElement(
    'span',
    `ticker-status${isLive ? ' live' : ''}`,
    match.statusText || status,
  );

  const homeTeam = createElement('span', 'ticker-team', match.homeTeam);

  const awayTeam = createElement('span', 'ticker-team', match.awayTeam);

  item.appendChild(statusElement);
  item.appendChild(homeTeam);

  if (isScheduled) {
    item.appendChild(createElement('span', 'ticker-versus', 'X'));
  } else {
    item.appendChild(
      createElement('span', 'ticker-score', `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`),
    );
  }

  item.appendChild(awayTeam);

  if (isFinished) {
    item.appendChild(createElement('span', 'ticker-versus', 'FT'));
  }

  return item;
}

function updateTickerSpeed() {
  const groupWidth = matchesPrimary.getBoundingClientRect().width;

  if (!groupWidth) {
    return;
  }

  const seconds = Math.max(groupWidth / TICKER_PX_PER_SECOND, TICKER_MIN_SECONDS);

  matchesTrack.style.animationDuration = `${seconds}s`;
}

function renderMatches(matches) {
  matchesPrimary.replaceChildren();
  matchesDuplicate.replaceChildren();

  if (matches.length === 0) {
    showMatchesError('Nenhuma partida hoje.');
    return;
  }

  matches.forEach((match) => {
    matchesPrimary.appendChild(createMatchItem(match));
    matchesDuplicate.appendChild(createMatchItem(match));
  });

  matchesDuplicate.setAttribute('aria-hidden', 'true');
  matchesPrimary.removeAttribute('aria-hidden');

  matchesTrack.classList.remove('is-static');

  requestAnimationFrame(updateTickerSpeed);
}

function showMatchesError(text) {
  matchesPrimary.replaceChildren();
  matchesDuplicate.replaceChildren();

  matchesPrimary.appendChild(createElement('div', 'ticker-error', text));

  matchesTrack.classList.add('is-static');
  matchesTrack.style.animationDuration = '';
}

async function loadMatches() {
  const apiBaseUrl = window.TVHomeLabConfig?.apiBaseUrl;

  if (!apiBaseUrl) {
    showMatchesError('Backend não configurado.');
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/matches/today`);

    if (!response.ok) {
      throw new Error('Falha ao consultar partidas');
    }

    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Resposta inválida da API');
    }

    renderMatches(result.data);
  } catch (error) {
    showMatchesError('Não foi possível carregar as partidas.');
    console.error('Erro ao carregar partidas:', error);
  }
}

function updateClock() {
  const now = new Date();

  clock.textContent = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  date.textContent = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}

function selectControl(index) {
  selectedIndex = (index + controls.length) % controls.length;

  controls.forEach((control, i) => {
    control.classList.toggle('selected', i === selectedIndex);
  });

  controls[selectedIndex].focus({ preventScroll: true });

  message.textContent = controls[selectedIndex].getAttribute('aria-label');
}

function activateControl() {
  const control = controls[selectedIndex];

  if (control === settingsButton) {
    if (window.Android && typeof window.Android.openSettings === 'function') {
      window.Android.openSettings();
    } else {
      message.textContent = 'Configurações indisponíveis';
    }

    return;
  }

  const appId = control.dataset.app;

  if (window.Android && typeof window.Android.openApp === 'function') {
    window.Android.openApp(appId);
  } else {
    message.textContent = 'Integração Android indisponível';
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    selectControl(selectedIndex + 1);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    selectControl(selectedIndex - 1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateControl();
  }
});

controls.forEach((control, index) => {
  control.addEventListener('focus', () => {
    selectedIndex = index;

    controls.forEach((item, itemIndex) => {
      item.classList.toggle('selected', itemIndex === index);
    });

    message.textContent = control.getAttribute('aria-label');
  });

  control.addEventListener('click', () => {
    selectControl(index);
    activateControl();
  });
});

window.addEventListener('resize', updateTickerSpeed);

updateClock();
setInterval(updateClock, 1000);
loadMatches();
setInterval(loadMatches, MATCHES_REFRESH_MS);
selectControl(0);
