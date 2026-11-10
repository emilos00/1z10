const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'public');
const rooms = new Map();
const ROUND_SECONDS = 35;
const MAX_PLAYERS = 10;

const BANK = [
  { c:'Astronomia', q:'Który księżyc Saturna ma gęstą atmosferę złożoną głównie z azotu?', a:['Enceladus','Tytan','Japet','Rea'], k:1 },
  { c:'Historia', q:'Pokój westfalski z 1648 roku zakończył przede wszystkim który konflikt?', a:['Wojnę trzydziestoletnią','Wojnę stuletnią','Wojnę o sukcesję hiszpańską','Wojnę północną'], k:0 },
  { c:'Nauka', q:'Jaka jest jednostka indukcyjności elektrycznej w układzie SI?', a:['Tesla','Henr','Weber','Farad'], k:1 },
  { c:'Literatura', q:'Kto jest autorem powieści „Imię róży”?', a:['Italo Calvino','Umberto Eco','Primo Levi','Alberto Moravia'], k:1 },
  { c:'Geografia', q:'Które państwo jest całkowicie otoczone przez Republikę Południowej Afryki?', a:['Eswatini','Lesotho','Botswana','Namibia'], k:1 },
  { c:'Sztuka', q:'W którym muzeum znajduje się obraz „Guernica” Picassa?', a:['Prado','Reina Sofía','Luwr','Muzeum Thyssen-Bornemisza'], k:1 },
  { c:'Biologia', q:'Które organellum komórkowe odpowiada głównie za modyfikację i sortowanie białek?', a:['Aparat Golgiego','Rybosom','Lizosom','Centrosom'], k:0 },
  { c:'Muzyka', q:'Ile symfonii skomponował Ludwig van Beethoven?', a:['7','8','9','11'], k:2 },
  { c:'Matematyka', q:'Jaka jest suma kątów wewnętrznych dwunastokąta?', a:['1620°','1800°','1980°','2160°'], k:1 },
  { c:'Chemia', q:'Który pierwiastek ma liczbę atomową 74?', a:['Tantal','Wolfram','Ren','Osm'], k:1 },
  { c:'Historia', q:'Kto był pierwszym sekretarzem generalnym ONZ?', a:['Dag Hammarskjöld','Trygve Lie','U Thant','Kurt Waldheim'], k:1 },
  { c:'Geografia', q:'Która cieśnina łączy Morze Czarne z Morzem Marmara?', a:['Dardanele','Bosfor','Kerczeńska','Sycylijska'], k:1 },
  { c:'Fizyka', q:'Jak nazywa się granica, po przekroczeniu której nic, nawet światło, nie może uciec z czarnej dziury?', a:['Horyzont zdarzeń','Osobliwość','Dysk akrecyjny','Granica Roche’a'], k:0 },
  { c:'Języki', q:'Który język należy do rodziny ugrofińskiej?', a:['Litewski','Węgierski','Bułgarski','Albański'], k:1 },
  { c:'Ekonomia', q:'Jak nazywa się sytuacja, w której ogólny poziom cen spada przez dłuższy czas?', a:['Dezinflacja','Deflacja','Stagflacja','Recesja'], k:1 },
  { c:'Biologia', q:'Ile par chromosomów ma typowa ludzka komórka somatyczna?', a:['22','23','24','46'], k:1 },
  { c:'Kino', q:'Kto wyreżyserował film „Rashomon” z 1950 roku?', a:['Yasujirō Ozu','Akira Kurosawa','Kenji Mizoguchi','Masaki Kobayashi'], k:1 },
  { c:'Geografia', q:'Które z tych jezior jest najgłębsze?', a:['Tanganika','Bajkał','Morze Kaspijskie','Wiktorii'], k:1 },
  { c:'Technologia', q:'Który język programowania stworzył Guido van Rossum?', a:['Ruby','Python','Perl','Lua'], k:1 },
  { c:'Historia', q:'W którym roku upadł Konstantynopol, kończąc istnienie Cesarstwa Bizantyjskiego?', a:['1204','1389','1453','1492'], k:2 },
  { c:'Astronomia', q:'Która planeta obraca się wokół własnej osi w kierunku przeciwnym do większości planet Układu Słonecznego?', a:['Mars','Wenus','Jowisz','Neptun'], k:1 },
  { c:'Sztuka', q:'Z jakiego kraju pochodził kompozytor Edvard Grieg?', a:['Szwecja','Dania','Norwegia','Finlandia'], k:2 },
  { c:'Chemia', q:'Jaki jest symbol chemiczny antymonu?', a:['Am','An','Sb','At'], k:2 },
  { c:'Literatura', q:'Kto napisał „Sto lat samotności”?', a:['Jorge Luis Borges','Mario Vargas Llosa','Gabriel García Márquez','Julio Cortázar'], k:2 },
  { c:'Matematyka', q:'Ile wynosi logarytm dziesiętny z 1000?', a:['2','3','10','100'], k:1 },
  { c:'Geografia', q:'Która rzeka przepływa przez Budapeszt?', a:['Ren','Łaba','Dunaj','Dniepr'], k:2 },
  { c:'Biologia', q:'Jak nazywa się proces, w którym RNA powstaje na matrycy DNA?', a:['Translacja','Transkrypcja','Replikacja','Mutacja'], k:1 },
  { c:'Historia', q:'Który władca zjednoczył Górny i Dolny Egipt według tradycyjnych przekazów?', a:['Ramzes II','Echnaton','Menes','Tutanchamon'], k:2 },
  { c:'Fizyka', q:'Jaka jest w przybliżeniu prędkość światła w próżni?', a:['30 000 km/s','150 000 km/s','300 000 km/s','3 000 000 km/s'], k:2 },
  { c:'Kultura', q:'Który dramat Szekspira rozpoczyna się słowami „Ktoś tu jest?” w polskim przekładzie?', a:['Makbet','Hamlet','Król Lear','Otello'], k:1 }
];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':'*' });
  res.end(JSON.stringify(body));
}
function cleanName(value) {
  return String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20);
}
function publicRoom(room, playerId) {
  const me = room.players.find(p => p.id === playerId) || null;
  const q = room.phase === 'question' || room.phase === 'reveal' ? room.questions[room.round] : null;
  return {
    code:room.code, hostId:room.hostId, phase:room.phase, round:room.round,
    deadline:room.deadline, players:room.players.map(p => ({ id:p.id, name:p.name, score:p.score, connected:p.lastSeen > Date.now()-15000, answered:!!room.responses[p.id] })),
    me:me ? { id:me.id, name:me.name, score:me.score, answer:room.responses[me.id]?.answer ?? null } : null,
    question:q ? { category:q.c, text:q.q, choices:q.a, correct:room.phase === 'reveal' ? q.k : null } : null,
    results:room.phase === 'reveal' ? room.players.map(p => {
      const response = room.responses[p.id];
      return { id:p.id, answer:response?.answer ?? null, correct:!!response?.correct, points:response?.points || 0, elapsed:response?.elapsed ?? null };
    }) : null,
    host:playerId === room.hostId, roundSeconds:ROUND_SECONDS
  };
}
function reveal(room) {
  if (room.phase !== 'question') return;
  const q = room.questions[room.round];
  for (const p of room.players) {
    const r = room.responses[p.id];
    if (!r) continue;
    r.correct = r.answer === q.k;
    r.elapsed = Math.max(0, r.at - room.questionStartedAt);
    r.points = r.correct ? Math.max(100, 1000 - Math.floor(r.elapsed / 1000) * 25) : 0;
    p.score += r.points;
  }
  room.phase = 'reveal';
}
function startRound(room) {
  room.responses = {};
  room.questionStartedAt = Date.now();
  room.deadline = room.questionStartedAt + ROUND_SECONDS * 1000;
  room.phase = 'question';
}
function roomCode() {
  let code;
  do { code = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
  return code;
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' });
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok:true });
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 10000) return json(res, 413, { error:'Za duże żądanie.' }); }
    let data;
    try { data = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error:'Nieprawidłowe dane.' }); }

    if (url.pathname === '/api/create') {
      const name = cleanName(data.name);
      if (!name) return json(res, 400, { error:'Wpisz swoje imię lub nick.' });
      const code = roomCode(), id = crypto.randomUUID();
      const room = { code, hostId:id, phase:'lobby', round:-1, deadline:null, players:[{id,name,score:0,lastSeen:Date.now()}], questions:[], responses:{}, createdAt:Date.now() };
      rooms.set(code, room);
      return json(res, 200, { room:publicRoom(room,id) });
    }
    if (url.pathname === '/api/join') {
      const code = String(data.code || '').trim().toUpperCase(), name = cleanName(data.name), room = rooms.get(code);
      if (!room) return json(res, 404, { error:'Nie znaleziono pokoju. Sprawdź kod i spróbuj ponownie.' });
      if (!name) return json(res, 400, { error:'Wpisz swoje imię lub nick.' });
      if (room.phase !== 'lobby') return json(res, 409, { error:'Ta gra już się rozpoczęła.' });
      if (room.players.length >= MAX_PLAYERS) return json(res, 409, { error:'Pokój jest pełny (maksymalnie 10 graczy).' });
      const id = crypto.randomUUID(); room.players.push({id,name,score:0,lastSeen:Date.now()});
      return json(res, 200, { room:publicRoom(room,id) });
    }
    const code = String(data.code || '').trim().toUpperCase(), room = rooms.get(code);
    if (!room) return json(res, 404, { error:'Pokój już nie istnieje.' });
    const player = room.players.find(p => p.id === data.playerId);
    if (!player) return json(res, 403, { error:'Nie należysz do tego pokoju. Dołącz ponownie.' });
    player.lastSeen = Date.now();

    if (url.pathname === '/api/state') {
      if (room.phase === 'question' && Date.now() >= room.deadline) reveal(room);
      return json(res, 200, { room:publicRoom(room, player.id) });
    }
    if (url.pathname === '/api/start') {
      if (player.id !== room.hostId) return json(res, 403, { error:'Tylko gospodarz może rozpocząć grę.' });
      if (room.phase !== 'lobby') return json(res, 409, { error:'Gra została już rozpoczęta.' });
      if (room.players.length < 2) return json(res, 409, { error:'Poczekaj, aż dołączy przynajmniej jeden znajomy.' });
      room.questions = [...BANK].sort(() => Math.random() - .5).slice(0,10);
      room.players.forEach(p => p.score = 0);
      room.round = 0; startRound(room);
      return json(res, 200, { room:publicRoom(room, player.id) });
    }
    if (url.pathname === '/api/answer') {
      if (room.phase !== 'question') return json(res, 409, { error:'Nie można teraz odpowiedzieć.' });
      const answer = Number(data.answer);
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) return json(res, 400, { error:'Wybierz jedną z odpowiedzi.' });
      if (room.responses[player.id]) return json(res, 409, { error:'Ta odpowiedź została już zapisana.' });
      room.responses[player.id] = { answer, at:Date.now() };
      if (room.players.every(p => room.responses[p.id])) reveal(room);
      return json(res, 200, { room:publicRoom(room, player.id) });
    }
    if (url.pathname === '/api/next') {
      if (player.id !== room.hostId) return json(res, 403, { error:'Tylko gospodarz może przejść dalej.' });
      if (room.phase !== 'reveal') return json(res, 409, { error:'Najpierw zakończcie pytanie.' });
      if (room.round >= 9) room.phase = 'finished';
      else { room.round++; startRound(room); }
      return json(res, 200, { room:publicRoom(room, player.id) });
    }
    if (url.pathname === '/api/leave') {
      room.players = room.players.filter(p => p.id !== player.id);
      delete room.responses[player.id];
      if (room.players.length === 0) rooms.delete(code);
      else {
        if (room.hostId === player.id) room.hostId = room.players[0].id;
        if (room.phase === 'question' && room.players.every(p => room.responses[p.id])) reveal(room);
      }
      return json(res, 200, { ok:true });
    }
    return json(res, 404, { error:'Nieznana akcja.' });
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(ROOT + path.sep)) return json(res, 403, { error:'Brak dostępu.' });
  fs.readFile(file, (err, content) => {
    if (err) return json(res, 404, { error:'Nie znaleziono strony.' });
    const ext = path.extname(file);
    const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
    res.writeHead(200, { 'Content-Type':types[ext] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(content);
  });
}

http.createServer((req,res) => handler(req,res).catch(err => {
  console.error(err);
  if (!res.headersSent) json(res, 500, { error:'Wystąpił błąd serwera.' });
  else res.end();
})).listen(PORT, '0.0.0.0', () => console.log(`Wielki Quiz działa na porcie ${PORT}`));

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [code,room] of rooms) if (room.createdAt < cutoff) rooms.delete(code);
}, 5 * 60 * 1000).unref();
