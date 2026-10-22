const clock = document.getElementById('clock');
const date = document.getElementById('date');
const message = document.getElementById('message');
const applications = Array.from(document.querySelectorAll('.app'));
const settingsButton = document.getElementById('settingsButton');
const controls = [...applications, settingsButton];

let selectedIndex = 0;

// Mock JSON com os jogos de futebol do dia
const mockMatches = [
  {
    status: 'LIVE',
    statusText: "AO VIVO • 72'",
    homeTeam: 'Flamengo',
    homeScore: 2,
    awayTeam: 'Palmeiras',
    awayScore: 1,
  },
  {
    status: 'SCHEDULED',
    statusText: 'HOJE • 21:30',
    homeTeam: 'Grêmio',
    homeScore: '-',
    awayTeam: 'Internacional',
    awayScore: '-',
  },
  {
    status: 'FINISHED',
    statusText: 'FINALIZADO',
    homeTeam: 'Real Madrid',
    homeScore: 3,
    awayTeam: 'Barcelona',
    awayScore: 1,
  },
];

function renderMatches() {
  const container = document.getElementById('matchesList');
  container.innerHTML = '';

  mockMatches.forEach((match) => {
    const isLive = match.status === 'LIVE';
    const cardHTML = `
      <div class="match-card ${isLive ? 'live' : ''}">
        <div class="match-status">${match.statusText}</div>
        <div class="teams">
          <div class="team">
            <span class="team-name">${match.homeTeam}</span>
            <span class="score">${match.homeScore}</span>
          </div>
          <div class="team">
            <span class="team-name">${match.awayTeam}</span>
            <span class="score">${match.awayScore}</span>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHTML);
  });
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

// Inicializações
updateClock();
setInterval(updateClock, 1000);
renderMatches();
selectControl(0);
