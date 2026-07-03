const floors = [
  { id: 0, name: 'Tầng trệt — Văn phòng', short: 'Văn phòng', desc: 'Bốn máy tính để làm việc và học tập. Làm việc kiếm tiến độ nhưng tốn năng lượng.' },
  { id: 1, name: 'Tầng 1 — Bếp', short: 'Bếp', desc: 'Nấu và ăn sáng. Bếp hiển thị còn đồ ăn hay không.' },
  { id: 2, name: 'Tầng 2 — Phòng ngủ', short: 'Phòng ngủ', desc: 'Ngủ để hồi năng lượng. Nếu cố thức khi kiệt sức, stress tăng nhanh.' },
  { id: 3, name: 'Tầng 3 — Phòng các em gái', short: 'Phòng chị em', desc: 'Hai em gái thỉnh thoảng đi lại hoặc ra khỏi nhà. Chỉ tâm sự được khi họ ở nhà.' },
  { id: 4, name: 'Tầng 4 — Giặt & phơi đồ', short: 'Sân thượng', desc: 'Hai ngày một lần phải giặt đồ. Nếu mưa khi đang phơi, phải lấy đồ vào.' }
];

const sisters = ['Linh', 'Mai'];
let state;

const $ = (id) => document.getElementById(id);

function initialState() {
  return {
    day: 1, minute: 360, floor: 2, energy: 82, hunger: 22, stress: 8,
    food: 3, cookedMeal: false, work: 0, laundryDue: false, laundryDrying: false,
    weather: 'Nắng', gameOver: false,
    sisters: sisters.map((name, index) => ({ name, floor: 3, home: true, awayUntil: 0, seed: index + 1 })),
    logs: ['06:00 — Bạn thức dậy ở phòng ngủ. Việc đầu tiên nên làm là xuống bếp.']
  };
}

function timeText() {
  return `${String(Math.floor(state.minute / 60)).padStart(2, '0')}:${String(state.minute % 60).padStart(2, '0')}`;
}

function addLog(text) {
  state.logs.unshift(`${timeText()} — ${text}`);
  state.logs = state.logs.slice(0, 12);
}

function clampStats() {
  state.energy = Math.max(0, Math.min(100, state.energy));
  state.hunger = Math.max(0, Math.min(100, state.hunger));
  state.stress = Math.max(0, Math.min(100, state.stress));
}

function advance(minutes) {
  state.minute += minutes;
  while (state.minute >= 1440) {
    state.minute -= 1440;
    state.day += 1;
    state.cookedMeal = false;
    state.work = Math.max(0, state.work - 15);
    if (state.day % 2 === 0) state.laundryDue = true;
    addLog(`Sang ngày ${state.day}. Đồ ăn, công việc và đồ giặt lại cần được chú ý.`);
  }

  state.hunger += minutes * 0.11;
  if (state.energy < 18) state.stress += minutes * 0.09;
  if (state.hunger > 82) state.stress += minutes * 0.07;
  updateWorld(minutes);
  clampStats();
  checkGameOver();
}

function updateWorld(minutes) {
  state.weather = (state.day + Math.floor(state.minute / 180)) % 5 === 0 ? 'Mưa' : 'Nắng';
  state.sisters.forEach((s, i) => {
    if (!s.home && state.minute >= s.awayUntil) {
      s.home = true; s.floor = 3; addLog(`${s.name} vừa về nhà.`);
    }
    if (state.minute % (120 + i * 30) < minutes) {
      if (s.home && Math.random() < 0.24) {
        s.home = false; s.awayUntil = Math.min(1430, state.minute + 150 + i * 35); addLog(`${s.name} ra khỏi nhà một lúc.`);
      } else if (s.home) {
        s.floor = [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)];
      }
    }
  });
  if (state.laundryDrying && state.weather === 'Mưa') state.stress += 2;
}

function checkGameOver() {
  if (state.energy <= 0) endGame('Bạn kiệt sức hoàn toàn vì không nghỉ ngơi kịp.');
  if (state.stress >= 100) endGame('Stress vượt mức tối đa. Các hành động rối loạn và bạn không thể tiếp tục.');
}

function endGame(reason) {
  state.gameOver = true;
  $('gameOver').classList.remove('hidden');
  $('gameOver').innerHTML = `<h2>Thua rồi</h2><p>${reason}</p><p>Bạn sống được ${state.day} ngày, đến ${timeText()}.</p>`;
}

function moveTo(floor) {
  if (state.gameOver || floor === state.floor) return;
  const distance = Math.abs(floor - state.floor);
  state.energy -= distance * 2;
  state.stress += state.energy < 15 ? distance * 3 : 0;
  state.floor = floor;
  advance(distance * 5);
  addLog(`Bạn di chuyển đến ${floors[floor].short}.`);
  render();
}

function act(type) {
  if (state.gameOver) return;
  const confused = state.stress > 78 && Math.random() < 0.35;
  if (confused) {
    advance(25); state.energy -= 6; state.stress += 5;
    addLog('Bạn quá stress nên thao tác rối loạn, mất thời gian mà không làm được gì.');
    render(); return;
  }
  actions[type]();
  render();
}

const actions = {
  cook() {
    if (state.floor !== 1 || state.food <= 0) return;
    state.food -= 1; state.cookedMeal = true; state.energy -= 8; state.stress -= 2;
    advance(35); addLog('Bạn nấu một bữa ăn đơn giản trong bếp.');
  },
  eat() {
    if (state.floor !== 1 || !state.cookedMeal) return;
    state.cookedMeal = false; state.hunger -= 48; state.energy += 10; state.stress -= 6;
    advance(20); addLog('Bạn ăn xong và cảm thấy ổn định hơn.');
  },
  work() {
    if (state.floor !== 0) return;
    state.work += 22; state.energy -= 20; state.hunger += 8; state.stress += state.energy < 25 ? 12 : 5;
    advance(90); addLog('Bạn làm việc/học tập trên một trong bốn máy tính.');
  },
  sleep() {
    if (state.floor !== 2) return;
    state.energy += 58; state.hunger += 22; state.stress -= 24;
    advance(240); addLog('Bạn ngủ một giấc để hồi năng lượng.');
  },
  talk() {
    if (state.floor !== 3) return;
    const available = state.sisters.filter((s) => s.home && s.floor === 3);
    if (!available.length) { advance(20); state.stress += 5; addLog('Không có ai trong phòng để tâm sự.'); return; }
    state.stress -= 24; state.energy -= 4;
    advance(45); addLog(`Bạn tâm sự với ${available.map((s) => s.name).join(' và ')}. Stress giảm rõ rệt.`);
  },
  laundry() {
    if (state.floor !== 4 || !state.laundryDue) return;
    state.laundryDue = false; state.laundryDrying = true; state.energy -= 12; state.stress -= 3;
    advance(50); addLog('Bạn giặt đồ và đem phơi trên tầng 4.');
  },
  collectLaundry() {
    if (state.floor !== 4 || !state.laundryDrying) return;
    state.laundryDrying = false; state.energy -= 5; state.stress -= state.weather === 'Mưa' ? 14 : 5;
    advance(20); addLog(state.weather === 'Mưa' ? 'Bạn kịp lấy đồ vào khi trời mưa.' : 'Bạn thu đồ khô vào nhà.');
  },
  buyFood() {
    if (state.floor !== 1) return;
    state.food += 4; state.energy -= 10; state.stress += 3;
    advance(60); addLog('Bạn đi mua thêm thực phẩm cho bếp.');
  }
};

function renderHouse() {
  $('house').innerHTML = floors.map((floor) => {
    const sisterHere = state.sisters.filter((s) => s.home && s.floor === floor.id).map((s) => s.name);
    const badges = [];
    if (floor.id === state.floor) badges.push('<span class="badge">Bạn đang ở đây</span>');
    if (floor.id === 1) badges.push(`<span class="badge ${state.food ? '' : 'bad'}">Đồ ăn: ${state.food}</span>`);
    if (floor.id === 3) badges.push(`<span class="badge">Ở nhà: ${state.sisters.filter((s) => s.home).length}/2</span>`);
    if (floor.id === 4 && state.laundryDue) badges.push('<span class="badge warn">Đến hạn giặt</span>');
    if (floor.id === 4 && state.laundryDrying) badges.push(`<span class="badge ${state.weather === 'Mưa' ? 'bad' : 'warn'}">Đồ đang phơi</span>`);
    sisterHere.forEach((name) => badges.push(`<span class="badge">${name}</span>`));
    return `<article class="floor ${floor.id === state.floor ? 'current' : ''}"><h3>${floor.name}</h3><p>${floor.desc}</p><div class="badges">${badges.join('')}</div><button onclick="moveTo(${floor.id})" ${floor.id === state.floor ? 'disabled' : ''}>Đi tới</button></article>`;
  }).join('');
}

function availableActions() {
  const options = [];
  const anyoneToTalk = state.sisters.some((s) => s.home && s.floor === 3);
  if (state.floor === 1) {
    options.push(['cook', 'Nấu ăn', state.food <= 0]);
    options.push(['eat', 'Ăn bữa đã nấu', !state.cookedMeal]);
    options.push(['buyFood', 'Mua thêm đồ ăn', false]);
  }
  if (state.floor === 0) options.push(['work', 'Làm việc / học tập', false]);
  if (state.floor === 2) options.push(['sleep', 'Ngủ hồi năng lượng', false]);
  if (state.floor === 3) options.push(['talk', 'Tâm sự với chị em', !anyoneToTalk]);
  if (state.floor === 4) {
    options.push(['laundry', 'Giặt và phơi đồ', !state.laundryDue]);
    options.push(['collectLaundry', 'Lấy đồ vào nhà', !state.laundryDrying]);
  }
  return options;
}

function render() {
  $('day').textContent = state.day; $('clock').textContent = timeText(); $('location').textContent = floors[state.floor].short; $('weather').textContent = state.weather;
  [['energy', state.energy], ['hunger', state.hunger], ['stress', state.stress]].forEach(([id, value]) => { $(id).value = value; $(`${id}Text`).textContent = `${Math.round(value)}/100`; });
  renderHouse();
  $('actions').innerHTML = availableActions().map(([id, label, disabled]) => `<button onclick="act('${id}')" ${disabled ? 'disabled' : ''}>${label}</button>`).join('');
  $('log').innerHTML = state.logs.map((item) => `<li>${item}</li>`).join('');
}

function restart() {
  state = initialState();
  $('gameOver').classList.add('hidden');
  render();
}

$('restartBtn').addEventListener('click', restart);
restart();
