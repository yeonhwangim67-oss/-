'use strict';

/* =========================================================
 *  대해적시대 연대기 — 엔진 & UI
 *  (data.js, events.js 다음에 로드)
 * ========================================================= */

/* ---------- 시드 난수 ---------- */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) { return mulberry32(xmur3(String(seed))()); }
function newSeed() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

/* ---------- 상태 & 헬퍼 ---------- */
let G = null;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (a, b) => a + Math.floor(G.rng() * (b - a + 1));
const P = p => G.rng() < p;
const pick = arr => arr[Math.floor(G.rng() * arr.length)];
function wpick(items, wf, rng = G.rng) {
  const ws = items.map(wf);
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x < 0) return items[i]; }
  return items[items.length - 1];
}
const D = () => DIFF[G.place.diff];
const isPirate = () => G.job.type === 'pirate';
const isNavy = () => G.job.type === 'navy';
const isCivil = () => G.job.type === 'civil' || (G.job.type === 'none' && G.age >= 18);
const atSea = () => isPirate() || isNavy();
const findPlace = id => PLACES.concat(EXTRA_PLACES).find(p => p.id === id);
/** 아직 성지에 사는 천룡인인가 */
const isCelestial = () => G.flags.celestial && !G.flags.fallen;
/** 소속 네임드 해적단 */
const myCrew = () => (isPirate() && G.job.crewId ? NAMED_CREWS[G.job.crewId] : null);
/** 가문 + 소속 해적단의 보정 (곱) */
/** 먹은 열매의 고유 능력 (각성하면 각성 능력이 더해진다) */
function fruitPerks() {
  if (!G.fruit) return [];
  const f = FRUITS.find(x => x.name === G.fruit.name);
  return G.fruit.awakened ? [f.perk, f.awaken] : [f.perk];
}
function modSources() {
  const c = myCrew();
  return [G.lineage, c ? c.perk : null, ...fruitPerks()].filter(Boolean);
}
/** 가문 + 소속 해적단 + 열매 능력의 보정 */
function mulMod(key) { return modSources().reduce((m, o) => m * (o[key] || 1), 1); }
function sumMod(key) { return modSources().reduce((m, o) => m + (o[key] || 0), 0); }
const hasMod = key => modSources().some(o => o[key]);

function josa(word, a, b) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return word + b;
  return word + ((c - 0xAC00) % 28 ? a : b);
}

function add(k, d) {
  if (!d) return;
  if (d > 0) {
    const c = myCrew();
    d *= ((G.lineage.gain && G.lineage.gain[k]) || 1) * ((c && c.perk.gain && c.perk.gain[k]) || 1);
  }
  d = Math.round(d);
  if (!d) return;
  const def = STAT[k];
  const before = G.stats[k];
  let after = clamp(before + d, def.min, def.max);
  if (k === 'hp' && d > 0) after = Math.min(after, Math.max(before, maxHp()));
  G.stats[k] = after;
  if (after !== before) G.deltas[k] = (G.deltas[k] || 0) + (after - before);
}
/** 피해: 난이도 배율, 어린 나이엔 덜 다친다 */
function hurt(n) {
  const y = D().young;
  const young = G.age < 10 ? y : G.age < 15 ? (1 + y) / 2 : 1;
  add('hp', -Math.max(1, Math.round(n * D().dmg * young)));
}
function train(n) { G.train += n; G.deltas.train = (G.deltas.train || 0) + n; }
function maxHp() {
  return 100 + (G.lineage.maxHp || 0);
}
/** 이야기 이어가기: min~max 계절 뒤에 후속 이벤트가 찾아온다 */
function later(id, min, max = min) { G.later.push({ id, at: G.ticks + R(min, max) }); }
function rec(tag) { if (!G.records.includes(tag)) G.records.push(tag); }
function note(title, text, kind = 'major') { G.notes.push({ title, text, kind }); }

function fmtBounty(man) {
  if (!man) return '없음';
  man = Math.round(man / 100) * 100;
  const eok = Math.floor(man / 10000), rest = man % 10000;
  return `${eok ? eok + '억 ' : ''}${rest ? rest + '만 ' : ''}베리`;
}
function addBounty(base) {
  const raw = R(Math.round(base * 1.5), Math.round(base * 3.5)) + G.job.bounty * 0.3;
  G.job.bounty += Math.round(raw * mulMod('bountyMul') / 100) * 100;
  return `현상금이 ${fmtBounty(G.job.bounty)}(으)로 올랐다.`;
}
const BOUNTY_MILESTONES = [10000, 30000, 50000, 100000, 200000, 300000, 500000];
function addMerit(n) {
  if (n > 0) n = Math.round(n * (G.lineage.meritMul || 1));
  G.job.merit = Math.max(0, G.job.merit + n);
  G.deltas.merit = (G.deltas.merit || 0) + n;
  checkRank();
}
function checkRank() {
  while (G.job.rank < NAVY_RANKS.length - 1 && G.job.merit >= NAVY_RANKS[G.job.rank + 1][1]) {
    const next = G.job.rank + 1;
    if (next >= 12 && G.stats.rep < 60) { G.flags.rankBlock = '대장 이상은 평판 60 이상이 필요하다'; break; }
    if (next === 13 && (G.stats.rep < 80 || G.stats.conn < 70)) { G.flags.rankBlock = '원수는 평판 80·인맥 70 이상이 필요하다'; break; }
    G.flags.rankBlock = null;
    G.job.rank = next;
    add('crew', 5);
    add('conn', 2);
    const r = NAVY_RANKS[next][0];
    note('진급', `해적 체포의 공을 인정받아 ${josa(r, '으로', '로')} 진급했다.`);
    if (next === 3) rec('해군 장교 임관');
    if (next === 9) rec('해군 장성 진급');
    if (next === 12) rec('해군 대장');
    if (next === 13) rec('해군 원수');
  }
}

/* =========================================================
 *  기술 (육식 · 패기 · 검술)
 * ========================================================= */
const skillNeed = k => SKILLS[k].base + G.skills[k] * SKILLS[k].step;
const skillMax = k => SKILLS[k].levels.length;
function skillName(k) {
  const lv = G.skills[k];
  if (!lv) return '미습득';
  const sk = SKILLS[k];
  if (lv === skillMax(k) && sk.bonusName) return `${sk.levels[lv - 1]} · ${sk.bonusName}`;
  return sk.levels[lv - 1];
}
/** 패기 수련 가능 여부 */
function canHaki() {
  if (G.lineage.haki && G.age >= 10) return true;
  if (G.age < 14) return false;
  const c = myCrew();
  return !!(G.flags.hakiOpen || (c && c.perk.hakiOpen) || (isNavy() && G.job.rank >= 4) || (isPirate() && (G.job.stage >= 1 || G.place.sea === '신세계')));
}
function canRokushiki() { return isNavy() || !!G.flags.rokushiki; }

/** 숙련도 획득. 단계가 오르면 알림 */
function learn(k, xp) {
  const sk = SKILLS[k];
  if (k === 'king' && G.skills.king === 0) return;
  if (k === 'fruit' && !G.fruit) return;
  if (k === 'rokushiki' && !canRokushiki()) G.flags.rokushiki = true;
  if (k === 'sword') G.flags.swordOpen = true;
  if (G.skills[k] >= skillMax(k)) return;
  G.skillXp[k] += xp * ((G.lineage.xp && G.lineage.xp[k]) || 1) * (G.lineage.xpAll || 1);
  while (G.skills[k] < skillMax(k) && G.skillXp[k] >= skillNeed(k)) {
    G.skillXp[k] -= skillNeed(k);
    G.skills[k]++;
    const lv = G.skills[k];
    if (k === 'rokushiki') note('기술 습득', `육식 「${sk.levels[lv - 1]}」을(를) 익혔다! (${lv}/6)`);
    else note('기술 습득', `${sk.name}: 「${sk.levels[lv - 1]}」의 경지에 올랐다!`);
    if (lv === skillMax(k)) {
      G.skillXp[k] = 0;
      if (k === 'rokushiki') { note('기술 습득', '육식의 여섯 기술을 모두 익혔다. 궁극의 일격 「육왕총」이 완성되었다!'); rec('육왕총 완성'); }
      if (k === 'sword') { note('기술 습득', '세상이 당신을 「대검호」라 부르기 시작했다.'); rec('대검호'); }
      if (k === 'obs') rec('미래를 보는 견문색');
      if (k === 'arm') rec('유류 패기');
      if (k === 'king') rec('패왕색 부여');
    }
  }
}
function skillPower() {
  let p = 0;
  for (const k of Object.keys(SKILLS)) {
    const sk = SKILLS[k], lv = G.skills[k];
    p += lv * sk.pow;
    if (lv === skillMax(k) && sk.bonus) p += sk.bonus;
  }
  return p;
}
/** 수련 방향 선택지 */
function focusOptions() {
  const o = [{ k: 'body', name: '체력 단련' }];
  if (G.flags.swordOpen) o.push({ k: 'sword', name: '검술' });
  if (canRokushiki()) o.push({ k: 'rokushiki', name: '육식' });
  if (canHaki()) o.push({ k: 'obs', name: '견문색' }, { k: 'arm', name: '무장색' });
  if (G.skills.king >= 1) o.push({ k: 'king', name: '패왕색' });
  if (G.fruit) o.push({ k: 'fruit', name: '열매 숙련' });
  return o;
}
function currentFocus() {
  return focusOptions().some(o => o.k === G.focus) ? G.focus : 'body';
}

/* ---------- 전투 ---------- */
/** 승률에 쓰이는 실질 선원 수 (소속 해적단 포함) */
function effCrew() {
  const c = myCrew();
  return G.stats.crew + (c ? c.crew : 0);
}
/** 선원 수 보정: 바다에 있을 때만, 많을수록 완만하게 */
function crewPower() { return atSea() ? Math.round(Math.sqrt(effCrew()) * 4) : 0; }
function powerParts() {
  const parts = [
    ['기초', Math.round(G.stats.hp * 0.3 + G.train)],
    ['기술', skillPower()],
    ['선원', crewPower()],
    ['열매', fruitPower()],
    ['혈통·소속', sumMod('pow') - fruitPerks().reduce((m, o) => m + (o.pow || 0), 0)],
    ['지위', isPirate() ? G.job.stage * 15 : isNavy() ? G.job.rank * 3 : 0],
  ];
  return parts.filter(([, v]) => v);
}
/** 열매 전투력: 계통 기본값 × 숙련도 + 열매 고유 능력 */
function fruitPower() {
  if (!G.fruit) return 0;
  const base = FRUIT_TYPES[G.fruit.type].pow * (0.6 + 0.2 * G.skills.fruit);
  return Math.round(base + fruitPerks().reduce((m, o) => m + (o.pow || 0), 0));
}
function power() { return powerParts().reduce((a, [, v]) => a + v, 0); }
function winChance(enemy) {
  return clamp(0.5 + (power() - enemy * D().enemy) / 50 + sumMod('winBonus'), 0.05, 0.95);
}
function escapeChance(base) {
  let p = base + (G.flags.navigation ? 0.1 : 0) + G.skills.obs * 0.05 + sumMod('escape');
  if (G.skills.rokushiki >= 1) p += 0.05;
  if (G.skills.rokushiki >= 4) p += 0.1;
  return clamp(p, 0.05, 0.95);
}
function combatDmgMul() {
  let m = mulMod('dmgMul');
  if (G.skills.rokushiki >= 2) m *= 0.8;   // 철괴
  if (G.skills.arm >= 2) m *= 0.85;        // 무장 경화
  return m;
}
function deathMul() {
  let m = mulMod('deathMul');
  if (G.fruit) m *= FRUIT_TYPES[G.fruit.type].death;
  if (G.skills.obs >= 1) m *= 0.8;
  if (G.skills.obs >= 3) m *= 0.6;          // 미래시
  if (G.skills.rokushiki >= 6) m *= 0.85;   // 체풍
  return m;
}
function pirateEnemy(extra = 0) { return Math.round(25 + Math.sqrt(G.job.bounty) / 5 + extra); }
/** 즉사 확률 (네임드 해적단 등): 열매·견문색으로 줄어든다 */
function killChance(kill) { return clamp(kill * D().death * deathMul(), 0, 0.6); }
function navyEnemy(extra = 0) { return 20 + G.job.rank * 7 + extra; }

/** 전투: 'win' | 'lose' | 'dead'. 열매·견문색·체풍은 죽을 확률을, 철괴·무장색은 피해를 줄인다 */
function fight(enemy, lethal, foe, kill = 0) {
  const ep = enemy * D().enemy;
  if (kill > 0 && P(killChance(kill))) {
    G.deltas.hp = (G.deltas.hp || 0) - G.stats.hp;
    G.stats.hp = 0;
    G.deathCause = `${foe}에게 일격에 쓰러짐`;
    return 'dead';
  }
  if (G.skills.king >= 1 && power() >= ep * 1.3) {
    G.extra.push('패왕색 패기에 적들이 거품을 물고 쓰러졌다.');
    learn('king', 2);
    return 'win';
  }
  if (P(winChance(enemy))) {
    hurt(R(1, 6) * combatDmgMul());
    train(1);
    const f = currentFocus();
    if (f !== 'body') learn(f, 1);
    return 'win';
  }
  // 궁지에 몰린 순간의 각성
  if (G.fruit && !G.fruit.awakened && G.skills.fruit >= 3 && G.age >= 20 && P(0.15)) {
    awakenFruit();
    G.extra.push(`쓰러지기 직전, 열매가 각성했다! 「${fruitData().awakenName}」의 힘으로 전세를 뒤집었다.`);
    return 'win';
  }
  if (lethal > 0 && P(clamp(lethal * D().death * deathMul(), 0, 0.9))) {
    G.deltas.hp = (G.deltas.hp || 0) - G.stats.hp;
    G.stats.hp = 0;
    G.deathCause = `${josa(foe, '과', '와')}의 싸움에서 전사`;
    return 'dead';
  }
  hurt(R(8, 18) * combatDmgMul());
  return 'lose';
}

const fruitData = () => FRUITS.find(x => x.name === G.fruit.name);
function eatFruit() {
  const type = wpick(Object.keys(FRUIT_TYPES), t => FRUIT_TYPES[t].w);
  const f = pick(FRUITS.filter(x => x.type === type));
  G.fruit = { name: f.name, type, awakened: false };
  rec(`${f.name} 능력자`);
  return `끔찍한 맛이 혀를 감쌌다. 몸 깊은 곳에서 낯선 힘이 깨어난다. 「${f.name}」(${FRUIT_TYPES[type].name}): ${f.ability}. 대신 바다는 이제 당신을 받아주지 않는다. (수련 방향에 「열매 숙련」 추가)`;
}
function awakenFruit() {
  G.fruit.awakened = true;
  rec(`${G.fruit.name} 각성`);
}

/* ---------- 직업 전환 ---------- */
function becomePirate(atDeparture, deserter = false) {
  G.job = { ...G.job, type: 'pirate', stage: 0, bounty: G.job.bounty || 0, crewId: null };
  G.crewName = `${G.name} 해적단`;
  add('crew', R(1, 4) + (G.flags.metPirate ? 3 : 0) + (G.family.key === 'pirate' ? 3 : 0));
  rec(deserter ? '해적으로 전향' : '해적단 결성');
  if (deserter) { G.job.bounty = 5000; return `「${G.crewName}」을 결성했다. 배신자에게 곧바로 ${fmtBounty(G.job.bounty)}의 현상금이 걸렸다.`; }
  if (atDeparture) return `작은 배에 직접 그린 해골 깃발을 올렸다. 「${G.crewName}」의 첫 항해가 시작된다!`;
  return `낡은 배를 사서 깃발을 올렸다. 「${G.crewName}」의 항해가 시작된다!`;
}
function joinNavy(atDeparture) {
  if (G.stats.hp < 40) return '신체검사에서 떨어졌다. 체력을 기르고 다시 도전하자.';
  const head = G.place.navyBoost || G.family.key === 'navy' || G.lineage.id === 'hero';
  G.job = { ...G.job, type: 'navy', rank: 0, merit: head ? 6 : 0, captures: 0 };
  rec('해군 입대');
  checkRank();
  return atDeparture ? '하얀 수병복을 받았다. 오늘부터 해군 잡병이다. (수련 방향에 육식 추가)' : '늦깎이 신병이 되었다. 정의의 깃발 아래 새 인생이 시작된다.';
}
/** 네임드 해적단 입단 */
function joinCrew(id) {
  const c = NAMED_CREWS[id];
  G.job = { ...G.job, type: 'pirate', stage: 0, bounty: G.job.bounty || 0, crewId: id };
  G.crewName = c.name;
  rec(`${c.name} 입단`);
  return `${c.boss}의 배에 올랐다. 오늘부터 「${c.name}」의 일원이다. (${c.perkText})`;
}
/** 네임드 해적단 스카우트 선택지 n개 */
function crewOffers(n) {
  const ids = Object.keys(NAMED_CREWS);
  const out = [];
  while (out.length < n && ids.length) out.push(ids.splice(Math.floor(G.rng() * ids.length), 1)[0]);
  return out.map(id => {
    const c = NAMED_CREWS[id];
    return { t: `「${c.name}」에 들어간다`, tag: c.tier, desc: c.perkText, run: () => joinCrew(id) };
  });
}
/** 싸울 네임드 해적단 (내 소속 제외) */
function pickRivalCrew() {
  return pick(Object.keys(NAMED_CREWS).filter(id => id !== G.job.crewId));
}
/** 천룡인 지위 상실 (돈키호테 가문) */
function fallFromGrace(text) {
  G.flags.fallen = true;
  G.place = findPlace('northvillage');
  G.family = { key: 'fallen', ...FAMILIES.fallen };
  add('wealth', -(G.stats.wealth - 3));
  add('food', -10);
  rec('성지에서 추락');
  G.queue.push('ln_dq_hunted');
  return `${text} 천룡인의 특권은 모두 사라졌다.`;
}
function gainPoneglyph(text) {
  G.flags.pg = (G.flags.pg || 0) + 1;
  if (G.flags.pg >= 4) rec('로드 포네그리프 4개 수집');
  return `${text} (로드 포네그리프 ${G.flags.pg}/4)`;
}
function jobTitle() {
  const j = G.job;
  switch (j.type) {
    case 'pirate': return myCrew() ? `${myCrew().name} 대원` : PIRATE_STAGES[j.stage];
    case 'navy': return `해군 ${NAVY_RANKS[j.rank][0]}`;
    case 'civil': return G.flags.shop ? '가게 주인' : '마을 주민';
    case 'retired': return `은퇴한 ${j.prev}`;
    default: return '아직 없음';
  }
}

/* =========================================================
 *  게임 진행
 * ========================================================= */
function newGame({ name, gender, placeId, lineageId, seed }) {
  // 무작위 출생지·가문도 시드로 결정
  const origin = makeRng(seed + '|origin');
  let place = placeId === 'random'
    ? PLACES[Math.floor(origin() * PLACES.length)]
    : findPlace(placeId);
  const lineage = lineageId === 'random'
    ? wpick(LINEAGES, l => l.w + ((l.places && l.places[place.id]) || 0), origin)
    : LINEAGES.find(l => l.id === lineageId);
  if (lineage.forcePlace) place = findPlace(lineage.forcePlace);

  const prevSpeed = G ? G.speed : 1;
  G = {
    seed, rng: makeRng(`${seed}|${place.id}|${lineage.id}`), name: '', gender, place, lineage,
    time: 0, ticks: 0, age: 0, season: 0,
    stats: Object.fromEntries(STATS.map(s => [s.k, s.init])),
    tree: null, train: 0, fruit: null, focus: 'body',
    skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    skillXp: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    job: { type: 'none', stage: 0, bounty: 0, rank: 0, merit: 0, captures: 0 },
    crewName: '', records: [], flags: {}, used: {}, seen: {}, later: [],
    deltas: {}, extra: [], notes: [], logs: [], queue: [], pending: null,
    speed: prevSpeed, paused: false, dead: false, deathCause: '',
    random: { place: placeId === 'random', lineage: lineageId === 'random' },
  };
  G.name = name || pick(RANDOM_GIVEN);
  const famKey = lineage.family || wpick(Object.keys(place.fam), k => place.fam[k]);
  G.family = { key: famKey, ...FAMILIES[famKey] };
  G.stats.wealth = G.family.wealth;
  G.flags.kingInnate = P(lineage.king || 0.03);
  G.flags.celestial = famKey === 'celestial';
  if (lineage.swordOpen) G.flags.swordOpen = true;

  rec(G.family.born);
  if (lineage.id !== 'none') rec(lineage.name);
  const where = `${place.sea} ${place.name}`;
  let text = famKey === 'celestial'
    ? `${where}. 하계의 사람들을 내려다보는 천룡인의 집에서 ${josa(G.name, '이', '가')} 태어났다. 노예들이 고개를 숙였다.`
    : famKey === 'orphan'
    ? `${where}. 부모의 얼굴은 기억나지 않는다. ${josa(G.name, '은', '는')} 고아로 자랐다.`
    : `${where}, ${G.family.name}에서 ${josa(G.name, '이', '가')} 태어났다. 대해적시대의 어느 봄날이었다.`;
  if (lineage.id !== 'none') text += ` ${lineage.name}의 피를 이은 아이였다.`;
  G.deltas = {};
  log('탄생', text, 'major');
}

function log(title, text, kind = '', extra = {}) {
  if (G.extra.length) { text += ' ' + G.extra.join(' '); G.extra = []; }
  const deltas = Object.entries(G.deltas).map(([k, v]) => ({ k, v }));
  G.deltas = {};
  G.logs.unshift({ age: G.age, stamp: `${G.age}세 · ${SEASONS[G.season]}`, title, text, kind, deltas, ...extra });
  if (G.logs.length > 300) G.logs.length = 300;
}
function flushNotes() {
  for (const n of G.notes) log(n.title, n.text, n.kind);
  G.notes = [];
}

/** 계절 정산: 식량 소비/공급, 회복, 노화, 수련 */
function upkeep() {
  const s = G.stats, d = D();
  const living = G.age < 18 && G.job.type === 'none';
  // 식량 소비 (소수점은 계절을 넘어 누적): 아이 1.5, 어른 2.5, 해적은 선원 50명당 +1
  let eat = living && G.age < 12 ? 1.5 : 2.5;
  if (isPirate()) eat += s.crew / 50;
  G.hunger = (G.hunger || 0) + eat;
  const ate = Math.floor(G.hunger);
  G.hunger -= ate;
  add('food', -ate);

  // 식량은 기본적으로 줄어든다. 채우려면 이벤트·선택으로 구해야 한다
  const bonus = (G.place.foodBonus || 0) + sumMod('foodBonus');
  if (living) {
    add('food', Math.max(1, Math.round(G.family.support * d.support) - 1) + bonus);
  } else {
    switch (G.job.type) {
      case 'navy': add('wealth', 1 + Math.floor(G.job.rank / 3)); add('food', 2); if (P(0.25)) add('rep', 1); break;
      case 'pirate': add('food', 1 + R(0, 2) + Math.floor(s.crew / 50) + bonus); if (P(0.4)) add('wealth', R(1, 3)); break;
      case 'retired': add('food', 2 + bonus); if (P(0.4)) add('wealth', 1); break;
      default: add('food', 2 + bonus); if (P(0.5)) add('wealth', 1);
    }
  }
  let bought = false;
  if (s.food < 6 && s.wealth >= 5) { add('wealth', -5); add('food', 8); bought = true; }

  const starving = s.food <= 0;
  if (starving) add('hp', -Math.round((G.age < 15 ? 3 : 5) * d.dmg));
  else if (s.food >= 15) {
    // 자연 회복: 계절마다 조금씩, 자연 상한(아이 75 / 어른 80)까지만
    const cap = Math.min(maxHp(), (G.age < 18 ? NATURAL_HP.kid : NATURAL_HP.adult) + sumMod('natural'));
    G.regen = (G.regen || 0) + (G.age < 18 ? d.kidRegen : 0.5) + (G.flags.medic ? 0.25 : 0);
    const r = Math.floor(G.regen);
    G.regen -= r;
    if (r && s.hp < cap) add('hp', Math.min(r, cap - s.hp));
  }

  // 수련: 매 계절 선택한 방향으로 성장
  if (G.age >= 6) {
    const f = currentFocus();
    if (f === 'body') { if (G.ticks % 2 === 0) G.train += 1; }
    else learn(f, atSea() ? 0.75 : 0.5);
  }

  G.deltas = {}; // 계절 정산은 로그에 남기지 않는다
  if (bought && !G.flags.boughtLogged) log('식량 구입', '식량이 바닥나 재산을 털어 비상식량을 샀다.', 'bad');
  G.flags.boughtLogged = bought;
  if (starving && !G.flags.starveLogged) log('굶주림', '먹을 것이 없다. 하루하루 몸이 말라간다.', 'bad');
  G.flags.starveLogged = starving;
  if (s.hp <= 0) G.deathCause = G.deathCause || (starving ? '굶주림으로 사망' : '병으로 사망');
}

function onNewYear() {
  G.age++;
  if (G.age === 8) { if (isCelestial()) G.queue.push('ln_dq_fall'); G.queue.push('tree8'); }
  if (G.age === 10) G.queue.push('tree10');
  if (G.age === 18 && G.job.type === 'none') G.queue.push('depart18');
  // 해적 활동: 해마다 현상금이 갱신된다 (이름값·선원·지위에 비례)
  if (isPirate()) {
    const before = G.job.bounty;
    const gain = (2500 + G.job.stage * 5000 + G.stats.crew * 30 + Math.min(G.job.bounty, 400000) * 0.07) * mulMod('bountyMul');
    G.job.bounty += Math.round(gain / 100) * 100;
    // 이름이 알려질수록 동료가 모여든다
    add('crew', R(2, 3) + G.job.stage * 2 + Math.min(4, Math.floor(G.job.bounty / 15000)));
    add('conn', 1 + G.job.stage);
    G.deltas = {};
    const hit = BOUNTY_MILESTONES.find(m => before < m && G.job.bounty >= m);
    if (hit) note('현상금 갱신', `새 수배서가 배포됐다. 「${G.name}」 현상금 ${fmtBounty(G.job.bounty)}. 바다가 당신을 주목한다.`);
  }
  // 승급 제안처럼 중요한 이벤트는 조건이 맞으면 확률과 상관없이 찾아온다
  for (const id of ['p_shichi', 'p_yonko', 'p_raftel']) {
    const ev = EVENTS.find(e => e.id === id);
    if (ev.cond() && !G.queue.includes(id)) { if (P(typeof ev.yearly === 'function' ? ev.yearly() : ev.yearly)) G.queue.push(id); break; }
  }
  // 해군 근무 평정: 해마다 계급·체포 실적에 따라 공적이 쌓인다
  if (isNavy() && G.age < 60) {
    const merit = 2 + Math.min(2, Math.floor(G.job.captures / 10));
    addMerit(merit);
    add('rep', 1);
    G.deltas = {};
  }
  // 노화: 80세부터 해마다 노환 사망 확률이 0.5%씩 오른다 (81세 0.5%, 82세 1%, …)
  if (G.age > OLD_AGE) {
    const longevity = mulMod('longevity') * (G.flags.longevity ? 0.25 : 1);
    if (P(OLD_AGE_STEP * (G.age - OLD_AGE) * longevity)) { G.stats.hp = 0; G.deathCause = '노환으로 평온하게 눈을 감음'; }
  }
}

/** 이벤트 선택: 조건 + 가중치 + 재등장 대기(최근에 본 이벤트는 덜 나온다) */
function pickEvent() {
  const d = D();
  const pool = EVENTS.filter(e => {
    if (e.forced || (e.once && G.used[e.id])) return false;
    const seen = G.seen[e.id];
    if (seen !== undefined && G.ticks - seen < (e.cd || EVENT_COOLDOWN)) return false;
    if (e.lore) return false;   // 세계관 이야기는 따로 굴린다
    if (isCelestial() && !e.celestial) return false;
    return !e.cond || e.cond();
  });
  return wpick(pool, e => {
    let w = e.w;
    if (e.tag === 'good') w *= d.goodW;
    if (e.tag === 'bad') w *= d.badW;
    if (/^(p|n)_/.test(e.id)) w *= 2;
    if (e.navyCatch) w *= 1.5;   // 해군의 해적 체포 이벤트는 다른 이벤트보다 잘 나온다
    const seen = G.seen[e.id];
    if (seen !== undefined && G.ticks - seen < 24) w *= 0.5;
    return w;
  });
}

function startEvent(ev) {
  if (ev.once) G.used[ev.id] = true;
  G.seen[ev.id] = G.ticks;
  if (ev.choices) {
    const text = typeof ev.text === 'function' ? ev.text() : ev.text;
    const choices = typeof ev.choices === 'function' ? ev.choices() : ev.choices;
    G.pending = { ev, text, choices };
    return;
  }
  const text = ev.run();
  log(ev.title, text, ev.lore ? 'lore' : (ev.tag || ''));
  flushNotes();
  checkDeath();
}

function choose(i) {
  if (!G || !G.pending) return;
  const { ev, text, choices } = G.pending;
  const c = choices[i];
  if (!c || (c.cond && !c.cond())) return;
  G.pending = null;
  const result = c.run();
  log(ev.title, result, ev.tag || (ev.forced ? 'major' : ''), { sit: text, choice: c.t });
  flushNotes();
  checkDeath();
  renderAll();
}

function checkDeath() {
  if (G.dead) return;
  // 가문 특성: 죽을 상처에서 한 번 버틴다 (노환은 제외)
  if (G.stats.hp <= 0 && G.lineage.lastStand && !G.flags.lastStandUsed && !/노환/.test(G.deathCause || '')) {
    G.flags.lastStandUsed = true;
    G.stats.hp = 15;
    G.deathCause = '';
    rec(G.lineage.id === 'd' ? 'D의 의지' : '불꽃의 부활');
    log(G.lineage.id === 'd' ? 'D의 의지' : '불꽃의 몸',
      G.lineage.id === 'd' ? '모두가 끝났다고 생각한 순간, 당신은 피투성이로 웃으며 일어섰다.' : '쓰러진 몸에서 검은 불꽃이 피어올랐다. 상처가 타오르며 닫혔다.', 'major');
    return;
  }
  if (G.stats.hp <= 0) {
    G.dead = true;
    if (!G.deathCause) G.deathCause = '부상 악화로 사망';
    log('사망', `${G.age}세. ${G.deathCause}.`, 'death');
    showEnd();
  }
}

function tick() {
  G.ticks++;
  G.season = G.ticks % 4;
  if (G.season === 0) onNewYear();
  checkDeath();
  if (G.dead) return;
  upkeep();
  flushNotes();
  checkDeath();
  if (G.dead) return;
  // 예약된 후속 이야기
  const due = G.later.filter(l => l.at <= G.ticks);
  if (due.length) { G.later = G.later.filter(l => l.at > G.ticks); due.forEach(l => G.queue.push(l.id)); }
  // 식량 위기는 확률과 상관없이 찾아온다
  if (G.stats.food < 10 && !isCelestial() && G.age >= 10 && !(G.ticks - (G.seen.g_supply ?? -99) < 8)) G.queue.push('g_supply');
  if (G.queue.length) { const id = G.queue.shift(); startEvent(EVENTS.find(e => e.id === id)); return; }
  if (P(EVENT_CHANCE)) {
    const ev = pickEvent();
    if (ev) startEvent(ev);
  }
  // 세계관 이야기: 사건과 별개로 굴린다 (스탯 변화 없음)
  if (!G.pending && P(LORE_CHANCE)) {
    const pool = EVENTS.filter(e => e.lore && !(G.ticks - (G.seen[e.id] ?? -999) < e.cd) && (!e.cond || e.cond()));
    const ev = pool.length ? pick(pool) : null;
    if (ev) startEvent(ev);
  }
}

/* =========================================================
 *  렌더링
 * ========================================================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderTop() {
  if (!G) return;
  $('#age-num').textContent = G.age;
  $('#season').textContent = SEASONS[G.season];
  $('#year-bar').style.width = ((G.time % YEAR_SEC) / YEAR_SEC * 100).toFixed(2) + '%';
  let status;
  if (G.dead) status = '인생이 끝났다';
  else if (G.pending) status = '<b>선택 대기 중</b> · 시간이 멈췄다 (숫자 키로 선택)';
  else if (G.paused) status = '일시정지';
  else {
    const left = Math.ceil(((G.ticks + 1) * SEASON_SEC - G.time) / G.speed);
    status = `다음 계절까지 ${left}초 · 이벤트 확률 ${Math.round(EVENT_CHANCE * 100)}%`;
  }
  $('#status-line').innerHTML = status;
  $('#btn-pause').textContent = G.paused ? '재개' : '일시정지';
}

function statRow(def) {
  const v = G.stats[def.k];
  let bar;
  if (def.min < 0) {
    const pct = Math.abs(v) / 2;
    bar = `<div class="stat-bar center"><div style="left:${v >= 0 ? 50 : 50 - pct}%;width:${pct}%;background:${def.color}"></div></div>`;
  } else {
    bar = `<div class="stat-bar"><div style="left:0;width:${v}%;background:${def.color}"></div></div>`;
  }
  const low = (def.k === 'hp' && v <= 25) || (def.k === 'food' && v <= 10);
  return `<div class="stat${low ? ' low' : ''}"><div class="stat-top"><span>${def.label}</span><b>${v > 0 && def.min < 0 ? '+' : ''}${v}</b></div>${bar}</div>`;
}

function skillsCard() {
  const opts = focusOptions();
  const focus = currentFocus();
  const shown = Object.keys(SKILLS).filter(k => k !== 'fruit' && (G.skills[k] > 0 || opts.some(o => o.k === k)));
  const rows = shown.map(k => {
    const max = G.skills[k] >= skillMax(k);
    const pct = max ? 100 : Math.min(100, G.skillXp[k] / skillNeed(k) * 100);
    return `<div class="skill">
      <div class="skill-top"><span>${SKILLS[k].name}</span><b>${skillName(k)}</b></div>
      <div class="skill-bar"><div style="width:${pct.toFixed(0)}%"></div></div>
      <div class="skill-eff">${SKILL_EFFECT[k]}</div>
    </div>`;
  }).join('');
  const chips = opts.map(o => `<button class="chip focus-chip${o.k === focus ? ' on' : ''}" data-focus="${o.k}">${o.name}</button>`).join('');
  const hints = [];
  if (!canHaki()) hints.push('패기: 14세 이후 특별한 계기로 개방');
  if (!canRokushiki()) hints.push('육식: 해군 입대 또는 전수자에게 배움');
  return `<div class="card">
    <div class="label">전투력 <span class="power">${power()}</span></div>
    <div class="sub small">${powerParts().map(([k, v]) => `${k} +${v}`).join(' · ')}</div>
    <div class="skills">${rows || '<div class="sub small">아직 익힌 기술이 없다</div>'}</div>
    <div class="label" style="margin-top:14px">수련 방향</div>
    <div class="chips">${chips}</div>
    <div class="sub small" style="margin-top:6px">${G.age < 6 ? '6세부터 매 계절 수련한다' : '매 계절 고른 방향으로 성장한다'}${hints.length ? '<br>' + hints.join('<br>') : ''}</div>
  </div>`;
}

function renderSide() {
  const p = G.place, j = G.job, L = G.lineage;
  let jobSub = '';
  if (j.type === 'none') jobSub = G.tree ? `꿈: ${{ pirate: '해적', navy: '해군', civil: '평범한 삶' }[G.tree]}` : '10살에 꿈을 정한다';
  if (j.type === 'pirate') {
    const c = myCrew();
    jobSub = `${esc(G.crewName)}${c ? ` · ${c.tier}` : ''}<br>현상금 <b>${fmtBounty(j.bounty)}</b>${j.stage >= 1 ? `<br>로드 포네그리프 ${G.flags.pg || 0}/4` : ''}`
      + `<br>선원 보정 +${crewPower()}${c ? ` (소속 해적단 +${c.crew}명)` : ''}`
      + (c ? `<div class="perk">${c.perkText}</div>` : '');
  }
  if (j.type === 'navy') {
    const next = NAVY_RANKS[j.rank + 1];
    jobSub = `공적 ${j.merit}${next ? ` / 다음 계급 ${next[1]}` : ''} · 체포 ${j.captures}명${G.flags.rankBlock ? `<br><span class="warn">${G.flags.rankBlock}</span>` : ''}`;
  }
  let fruit = '<div class="big">없음</div><div class="sub">열매를 먹으면 싸움에서 죽을 확률이 줄어든다. 아주 드물게만 손에 들어온다.</div>';
  if (G.fruit) {
    const f = fruitData();
    const lv = G.skills.fruit, max = lv >= skillMax('fruit');
    const pct = max ? 100 : Math.min(100, G.skillXp.fruit / skillNeed('fruit') * 100);
    fruit = `<div class="big fruit-name">${esc(f.name)}</div>
      <div class="sub">${FRUIT_TYPES[f.type].name} · 사망 확률 ×${FRUIT_TYPES[f.type].death} · 헤엄 불가</div>
      <p class="fruit-ability">${esc(f.ability)}</p>
      <div class="skill" style="margin-top:10px">
        <div class="skill-top"><span>숙련도</span><b>${G.fruit.awakened ? '각성' : SKILLS.fruit.levels[lv - 1] || '입문 전'}</b></div>
        <div class="skill-bar"><div style="width:${G.fruit.awakened ? 100 : pct.toFixed(0)}%"></div></div>
      </div>
      ${G.fruit.awakened
        ? `<p class="fruit-awaken">각성: ${esc(f.awakenName)}. ${esc(f.awakenText)}</p>`
        : `<p class="sub small">${max ? `달인이 되었다. 위기의 순간 또는 계기가 오면 「${esc(f.awakenName)}」으로 각성할 수 있다.` : '수련 방향에서 「열매 숙련」을 고르면 성장한다. 달인이 되면 각성할 수 있다.'}</p>`}`;
  }

  $('#side').innerHTML = `
    <div class="card"><h3>${esc(G.name)}</h3><div class="sub">${G.gender} · ${G.family.name}</div>
      <div class="lineage-line"><span class="chip${L.id !== 'none' ? ' gold' : ''}">${L.name}</span>${G.random.lineage ? '<span class="rand">무작위</span>' : ''}</div>
      <p class="desc">${L.desc}</p>
      <ul class="traits">${L.trait.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="card">
      <h3>${p.name}${G.random.place ? ' <span class="rand">무작위</span>' : ''}</h3>
      <dl class="kv"><dt>위치</dt><dd>${p.sea}</dd><dt>난이도</dt><dd><span class="badge d-${p.diff}">${p.diff}</span> ${DIFF[p.diff].name}</dd><dt>특이점</dt><dd>${p.tag}</dd></dl>
      <p class="desc">${p.desc}</p>
    </div>
    <div class="card"><div class="label">직업</div><div class="big">${jobTitle()}</div><div class="sub" style="margin-top:4px">${jobSub}</div></div>
    <div class="card">${STATS.map(statRow).join('')}</div>
    <div class="card"><div class="label">기록</div><div class="chips">${G.records.map((r, i) => `<span class="chip${i ? ' gold' : ''}">${esc(r)}</span>`).join('')}</div></div>
    <div class="card"><div class="label">시드</div><span class="seed-val">${esc(G.seed)}</span></div>`;

  // 오른쪽 패널: 직접 고르고 키워가는 것들
  $('#panel').innerHTML = `${skillsCard()}
    <div class="card"><div class="label">악마의 열매</div>${fruit}</div>`;
}

function deltaChips(ds) {
  if (!ds || !ds.length) return '';
  return `<div class="deltas">${ds.map(({ k, v }) => {
    const label = STAT[k] ? STAT[k].label : EXTRA_LABEL[k];
    return `<span class="delta ${v > 0 ? 'up' : 'down'}">${label} ${v > 0 ? '+' : ''}${v}</span>`;
  }).join('')}</div>`;
}

function renderLog() {
  if (G.pending) {
    const { ev, text, choices } = G.pending;
    $('#pending').innerHTML = `<div class="event">
      <p class="eyebrow">${G.age}세 · ${SEASONS[G.season]} · 사건 발생</p>
      <h3>${ev.title}</h3><p>${esc(text)}</p>
      <div class="choices">${choices.map((c, i) => {
        const ok = !c.cond || c.cond();
        const baseTag = typeof c.tag === 'function' ? c.tag() : (c.tag || '');
        let tag = baseTag, risk = baseTag === '위험';
        if (c.enemy !== undefined) {
          const e = typeof c.enemy === 'function' ? c.enemy() : c.enemy;
          tag = `⚔ 승산 ${Math.round(winChance(e) * 100)}%` + (c.kill ? ` · 즉사 ${Math.round(killChance(c.kill) * 100)}%` : '') + (baseTag ? ` · ${baseTag}` : '');
          risk = true;
        }
        if (!ok) tag = c.need ? `${c.need} 필요` : '조건 미충족';
        return `<button class="choice" data-i="${i}" ${ok ? '' : 'disabled'}><span><span class="key">${i + 1}</span>${c.t}${c.desc ? `<span class="choice-desc">${c.desc}</span>` : ''}</span><span class="tag${risk ? ' risk' : ''}">${tag}</span></button>`;
      }).join('')}</div></div>`;
  } else {
    $('#pending').innerHTML = '';
  }
  // 해마다 묶어서 보여준다
  let lastAge = null;
  $('#log').innerHTML = G.logs.map(l => {
    const head = l.age !== lastAge ? `<h4 class="year-sep"><span>${l.age}세</span></h4>` : '';
    lastAge = l.age;
    return head + `
    <article class="entry ${l.kind}">
      <div class="entry-head"><span class="stamp">${l.stamp}</span><span class="entry-title">${esc(l.title)}</span></div>
      ${l.sit ? `<p class="entry-sit">${esc(l.sit)}</p>` : ''}
      ${l.choice ? `<p class="entry-choice">▸ ${esc(l.choice)}</p>` : ''}
      <p class="entry-text">${esc(l.text)}</p>
      ${deltaChips(l.deltas)}
    </article>`;
  }).join('');
}

function renderAll() { renderTop(); renderSide(); renderLog(); }

/** 이 인생이 얼마나 드문 선택을 했는지 (rarity.js: 무작위 인생 시뮬레이션 결과) */
function rarityKeys() {
  return [`place:${G.place.id}`, ...G.records, `final:${jobTitle()}`];
}
function fmtPct(p) {
  if (p === undefined) return '0.01% 미만';
  if (p >= 10) return p.toFixed(0) + '%';
  if (p >= 1) return p.toFixed(1) + '%';
  return p.toFixed(2) + '%';
}
function rarityTable() {
  const table = (typeof RARITY !== 'undefined' && RARITY.rates) || {};
  const label = k => k.startsWith('place:') ? `${G.place.name} 출생` : k.startsWith('final:') ? `최종 ${k.slice(6)}` : k;
  const rows = rarityKeys().map(k => ({ k, label: label(k), p: table[k] })).sort((a, b) => (a.p ?? 0) - (b.p ?? 0));
  const rarest = rows[0];
  return `<div class="rarity">
    <div class="label">이 인생이 받은 선택</div>
    ${rarest ? `<p class="rarest">가장 드문 기록: <b>${esc(rarest.label)}</b> · 전체 인생의 ${fmtPct(rarest.p)}</p>` : ''}
    <div class="rarity-list">${rows.map(r => `
      <div class="rarity-row"><span>${esc(r.label)}</span><b>${fmtPct(r.p)}</b>
        <i style="width:${Math.max(1, Math.min(100, r.p ?? 0)).toFixed(1)}%"></i></div>`).join('')}</div>
    <p class="sub small">무작위로 선택한 인생 ${RARITY && RARITY.runs ? RARITY.runs.toLocaleString() : '-'}회 시뮬레이션 기준</p>
  </div>`;
}
function showEnd() {
  const j = G.job;
  $('#end-title').textContent = `${G.name}, ${G.age}세에 잠들다`;
  $('#end-cause').textContent = G.deathCause;
  let detail = '';
  if (j.bounty) detail = `<dt>현상금</dt><dd>${fmtBounty(j.bounty)}</dd>`;
  if (j.captures) detail += `<dt>체포</dt><dd>${j.captures}명</dd>`;
  const skills = Object.keys(SKILLS).filter(k => G.skills[k]).map(k => `${SKILLS[k].name} ${skillName(k)}`).join(', ') || '없음';
  $('#end-body').innerHTML = `
    <dl class="kv"><dt>출생</dt><dd>${G.place.name} · ${G.family.name}</dd><dt>가문</dt><dd>${G.lineage.name}</dd><dt>최종</dt><dd>${jobTitle()}</dd>${detail}
    <dt>전투력</dt><dd>${power()}</dd><dt>기술</dt><dd>${skills}</dd>
    <dt>열매</dt><dd>${G.fruit ? G.fruit.name + (G.fruit.awakened ? ' (각성)' : '') : '없음'}</dd><dt>시드</dt><dd class="seed-val">${esc(G.seed)}</dd></dl>
    ${rarityTable()}`;
  setTimeout(() => { $('#end').hidden = false; }, 600);
}

/* =========================================================
 *  메인 루프 & UI 바인딩
 * ========================================================= */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (G && !G.dead && !G.paused && !G.pending) {
    G.time += dt * G.speed;
    let changed = false;
    while (G.time >= (G.ticks + 1) * SEASON_SEC) {
      tick();
      changed = true;
      if (G.dead || G.pending) { G.time = G.ticks * SEASON_SEC; break; }
    }
    if (changed) { renderSide(); renderLog(); }
  }
  renderTop();
  requestAnimationFrame(frame);
}

let selPlace = 'random';
let selLineage = 'random';
let selGender = '남성';
let lastStart = null;
let pausedBeforeExit = false;

function renderPlaces() {
  const rand = `<button type="button" class="place random${selPlace === 'random' ? ' on' : ''}" data-id="random">
      <div class="place-top"><span class="place-name">무작위 마을</span><span class="badge d-RANDOM">?</span></div>
      <span class="place-sea">${PLACES.length}곳 중 하나</span>
      <span class="place-desc">시드가 태어날 곳을 정한다. 어디서 눈을 뜰지는 아무도 모른다.</span>
    </button>`;
  const sel = selPlace === 'random' ? null : PLACES.find(p => p.id === selPlace);
  updateSummary(sel ? `<b>${sel.name}</b> (${sel.diff})` : '<b>무작위 마을</b>');
  $('#place-grid').innerHTML = rand + PLACES.map(p => `
    <button type="button" class="place${p.id === selPlace ? ' on' : ''}" data-id="${p.id}">
      <div class="place-top"><span class="place-name">${p.name}</span><span class="badge d-${p.diff}">${p.diff}</span></div>
      <span class="place-sea">${p.sea} · ${p.tag}</span>
      <span class="place-desc">${p.desc}</span>
    </button>`).join('');
}
let summaryPlace = '', summaryLineage = '';
function updateSummary(place, lineage) {
  if (place) summaryPlace = place;
  if (lineage) summaryLineage = lineage;
  $('#pick-summary').innerHTML = `출생지 ${summaryPlace} · 가문 ${summaryLineage}`;
}
function renderLineages() {
  const items = [{ id: 'random', name: '무작위', desc: '대부분은 평범한 혈통이지만, 드물게 특별한 피를 타고난다. 출생지에 따라 나오는 가문이 달라진다.' }, ...LINEAGES];
  $('#lineage-grid').innerHTML = items.map(l => `
    <button type="button" class="lineage${l.id === selLineage ? ' on' : ''}" data-id="${l.id}">${l.name}</button>`).join('');
  const L = items.find(l => l.id === selLineage);
  $('#lineage-desc').innerHTML = `${L.desc}${L.trait ? `<span class="trait-line">${L.trait.join(' · ')}</span>` : ''}`;
  updateSummary(null, `<b>${items.find(l => l.id === selLineage).name}</b>`);
}

function begin(opts) {
  lastStart = opts;
  newGame(opts);
  $('#start').hidden = true;
  $('#end').hidden = true;
  $('#confirm').hidden = true;
  $('#game').hidden = false;
  renderSpeed();
  renderAll();
  window.scrollTo(0, 0);
}
function toStart() {
  $('#end').hidden = true;
  $('#confirm').hidden = true;
  $('#game').hidden = true;
  $('#start').hidden = false;
  $('#in-seed').value = newSeed();
  G = null;
  window.scrollTo(0, 0);
}

function renderSpeed() {
  $('#speed').innerHTML = SPEEDS.map(s => `<button data-s="${s}" class="${G && G.speed === s ? 'on' : ''}">x${s}</button>`).join('');
}

function init() {
  $('#in-seed').value = newSeed();
  renderPlaces();
  renderLineages();

  $('#place-grid').addEventListener('click', e => {
    const b = e.target.closest('.place');
    if (!b) return;
    selPlace = b.dataset.id;
    renderPlaces();
  });
  $('#lineage-grid').addEventListener('click', e => {
    const b = e.target.closest('.lineage');
    if (!b) return;
    selLineage = b.dataset.id;
    renderLineages();
  });
  $('#in-gender').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    selGender = b.dataset.v;
    [...$('#in-gender').children].forEach(x => x.classList.toggle('on', x === b));
  });
  $('#btn-reroll').addEventListener('click', () => { $('#in-seed').value = newSeed(); });
  $('#btn-start').addEventListener('click', () => {
    const seed = $('#in-seed').value.trim() || newSeed();
    begin({ name: $('#in-name').value.trim(), gender: selGender, placeId: selPlace, lineageId: selLineage, seed });
  });

  $('#speed').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !G) return;
    G.speed = +b.dataset.s;
    renderSpeed();
  });
  $('#btn-pause').addEventListener('click', () => { if (G) { G.paused = !G.paused; renderTop(); } });
  $('#pending').addEventListener('click', e => {
    const b = e.target.closest('.choice');
    if (b && !b.disabled) choose(+b.dataset.i);
  });
  $('#panel').addEventListener('click', e => {
    const b = e.target.closest('.focus-chip');
    if (!b || !G) return;
    G.focus = b.dataset.focus;
    renderSide();
  });

  // 나가기 (페이지 안에서 확인)
  $('#btn-exit').addEventListener('click', () => {
    if (!G) return;
    if (G.dead) { toStart(); return; }
    pausedBeforeExit = G.paused;
    G.paused = true;
    $('#confirm').hidden = false;
    $('#btn-exit-yes').focus();
  });
  $('#btn-exit-no').addEventListener('click', () => {
    $('#confirm').hidden = true;
    if (G) G.paused = pausedBeforeExit;
  });
  $('#btn-exit-yes').addEventListener('click', toStart);

  document.addEventListener('keydown', e => {
    if (!G || $('#game').hidden || e.target.tagName === 'INPUT') return;
    if (!$('#confirm').hidden) { if (e.key === 'Escape') $('#btn-exit-no').click(); return; }
    if (G.pending && /^[1-5]$/.test(e.key)) { choose(+e.key - 1); e.preventDefault(); }
    else if (e.key === ' ') { G.paused = !G.paused; renderTop(); e.preventDefault(); }
  });

  $('#btn-same').addEventListener('click', () => begin(lastStart));
  $('#btn-new').addEventListener('click', toStart);

  requestAnimationFrame(frame);
}

init();

// 디버그/테스트용
window.__game = { get G() { return G; }, tick, choose, power, renderAll, rarityKeys, jobTitle, eatFruit, awakenFruit, learn, EVENTS };
