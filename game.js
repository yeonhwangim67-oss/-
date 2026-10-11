'use strict';

/* =========================================================
 *  대해적시대 연대기 — 원피스 세계관 텍스트 인생 게임
 *  1분 = 1살, 15초 = 1계절, 계절마다 30% 확률로 이벤트
 * ========================================================= */

const SEASON_SEC = 15;
const YEAR_SEC = 60;
const EVENT_CHANCE = 0.3;
const SEASONS = ['봄', '여름', '가을', '겨울'];
const SPEEDS = [1, 2, 4, 8, 16];

const STATS = [
  { k: 'hp',     label: '체력', min: 0,    max: 100, init: 70, color: 'var(--c-hp)' },
  { k: 'food',   label: '식량', min: 0,    max: 100, init: 30, color: 'var(--c-food)' },
  { k: 'rep',    label: '평판', min: -100, max: 100, init: 0,  color: 'var(--c-rep)' },
  { k: 'conn',   label: '인맥', min: 0,    max: 100, init: 0,  color: 'var(--c-conn)' },
  { k: 'crew',   label: '선원', min: 0,    max: 100, init: 0,  color: 'var(--c-crew)' },
  { k: 'wealth', label: '재산', min: 0,    max: 100, init: 0,  color: 'var(--c-wealth)' },
];
const STAT = Object.fromEntries(STATS.map(s => [s.k, s]));
const EXTRA_LABEL = { train: '단련', merit: '공적' };

/* ---------- 난이도 ---------- */
const DIFF = {
  EZ:     { name: '쉬움',   dmg: 0.7,  enemy: 0.85, death: 0.6,  badW: 0.7,  goodW: 1.4,  support: 1.5 },
  NORMAL: { name: '기본',   dmg: 1,    enemy: 1,    death: 1,    badW: 1,    goodW: 1,    support: 1 },
  HARD:   { name: '어려움', dmg: 1.25, enemy: 1.15, death: 1.35, badW: 1.35, goodW: 0.85, support: 0.8 },
  EX:     { name: '극한',   dmg: 1.5,  enemy: 1.3,  death: 1.7,  badW: 1.6,  goodW: 0.7,  support: 0.75 },
};

/* ---------- 출생지 ---------- */
const PLACES = [
  { id: 'foosha',     name: '후샤 마을',          sea: '동쪽 바다',   diff: 'NORMAL', tag: '시골 항구',
    desc: '풍차가 도는 평화로운 시골 마을. 뒷산 코르보 산에는 산적들이 산다.',
    fam: { poor: 4, normal: 4, rich: 1, orphan: 1, pirate: 1, navy: 1 } },
  { id: 'syrup',      name: '시롭 마을',          sea: '동쪽 바다',   diff: 'EZ',     tag: '한적한 농촌',
    desc: '양치기 소년의 거짓말 말고는 큰일이 없는 조용한 마을.',
    fam: { poor: 2, normal: 5, rich: 2, orphan: 1 } },
  { id: 'baratie',    name: '해상 레스토랑 바라티에', sea: '동쪽 바다', diff: 'EZ',  tag: '먹을 것 풍족',
    desc: '바다 위 레스토랑. 굶을 걱정은 없지만 손님 중엔 해적도 많다.',
    fam: { poor: 2, normal: 4, rich: 1, orphan: 2 }, foodBonus: 1 },
  { id: 'loguetown',  name: '로그타운',           sea: '동쪽 바다',   diff: 'NORMAL', tag: '시작과 끝의 마을',
    desc: '해적왕 골드 로저가 처형된 마을. 위대한 항로로 가는 마지막 관문.',
    fam: { poor: 3, normal: 4, rich: 2, orphan: 1, pirate: 1, navy: 2 } },
  { id: 'graycity',   name: '고아 왕국 그레이 터미널', sea: '동쪽 바다', diff: 'HARD', tag: '쓰레기 산 빈민가',
    desc: '귀족의 쓰레기가 산을 이루는 곳. 이곳의 아이들은 스스로 살아남는다.',
    fam: { poor: 4, normal: 1, orphan: 5, pirate: 2 } },
  { id: 'water7',     name: '워터 세븐',          sea: '위대한 항로', diff: 'EZ',     tag: '조선의 도시',
    desc: '물의 도시. 조선소 일거리가 넘쳐 굶을 일은 드물다.',
    fam: { poor: 2, normal: 5, rich: 2, orphan: 1 } },
  { id: 'alabasta',   name: '아라바스타',         sea: '위대한 항로', diff: 'NORMAL', tag: '사막 왕국',
    desc: '모래의 왕국. 가뭄과 반란의 그림자가 드리운다.',
    fam: { poor: 4, normal: 4, rich: 2, orphan: 1 } },
  { id: 'marineford', name: '마린포드',           sea: '위대한 항로', diff: 'NORMAL', tag: '해군 본부',
    desc: '정의의 깃발이 펄럭이는 해군 본부의 섬. 해군의 길이 활짝 열려 있다.',
    fam: { normal: 4, rich: 1, navy: 6, orphan: 1 }, navyBoost: true },
  { id: 'drum',       name: '드럼 섬',            sea: '위대한 항로', diff: 'HARD',   tag: '혹한의 설국',
    desc: '일 년 내내 눈이 내리는 섬. 추위와 폭군의 상처가 남아 있다.',
    fam: { poor: 4, normal: 3, rich: 1, orphan: 2 } },
  { id: 'wholecake',  name: '홀케이크 아일랜드',  sea: '신세계',     diff: 'EZ',     tag: '과자의 나라',
    desc: '사황 빅 맘의 영토. 과자와 케이크가 넘치는, 겉보기엔 낙원.',
    fam: { normal: 4, rich: 3, poor: 2, pirate: 2 }, foodBonus: 1 },
  { id: 'dressrosa',  name: '드레스로자',         sea: '신세계',     diff: 'HARD',   tag: '사랑과 정열의 나라',
    desc: '화려한 나라. 그 이면엔 돈키호테 패밀리의 지배와 장난감의 비밀이 있다.',
    fam: { poor: 3, normal: 3, rich: 2, orphan: 2, pirate: 1 } },
  { id: 'wano',       name: '와노쿠니',           sea: '신세계',     diff: 'HARD',   tag: '쇄국의 나라',
    desc: '사무라이의 나라. 쇼군 오로치의 폭정 아래 백성은 굶주린다.',
    fam: { poor: 6, normal: 2, rich: 1, orphan: 2 } },
  { id: 'onigashima', name: '오니가시마',         sea: '신세계',     diff: 'EX',     tag: '백수 해적단 본거지',
    desc: '사황 카이도우의 섬. 이곳에서 살아남는 것 자체가 시험이다.',
    fam: { poor: 3, orphan: 5, pirate: 4 } },
];

/* ---------- 집안 ---------- */
const FAMILIES = {
  poor:   { name: '가난한 집',   wealth: 8,  support: 2 },
  normal: { name: '평범한 집',   wealth: 20, support: 3 },
  rich:   { name: '부유한 집',   wealth: 45, support: 4 },
  orphan: { name: '고아',        wealth: 0,  support: 1 },
  pirate: { name: '해적의 핏줄', wealth: 12, support: 2 },
  navy:   { name: '해군 가문',   wealth: 25, support: 3 },
};

/* ---------- 악마의 열매 ---------- */
const FRUIT_TYPES = {
  para:  { name: '초인계', pow: 14, death: 0.6,  w: 5 },
  zoan:  { name: '동물계', pow: 18, death: 0.5,  w: 3 },
  logia: { name: '자연계', pow: 24, death: 0.35, w: 2 },
};
const FRUITS = {
  para:  ['고무고무 열매', '잘린잘린 열매', '꽃꽃 열매', '실실 열매', '수술수술 열매', '흔들흔들 열매', '문문 열매', '가벼워 열매'],
  zoan:  ['사람사람 열매', '소소 열매 모델 기린', '새새 열매 모델 불사조', '물고기물고기 열매 모델 청룡', '개개 열매 모델 늑대', '고양이고양이 열매 모델 표범'],
  logia: ['이글이글 열매', '번쩍번쩍 열매', '얼음얼음 열매', '모래모래 열매', '연기연기 열매', '우르릉 열매', '부글부글 열매'],
};

/* ---------- 직업 ---------- */
const PIRATE_STAGES = ['해적', '칠무해', '사황', '대해적'];
const NAVY_RANKS = [
  ['잡병', 0], ['상등병', 6], ['조장', 14], ['소위', 25], ['중위', 38], ['대위', 52], ['소령', 68],
  ['중령', 86], ['대령', 106], ['준장', 130], ['소장', 156], ['중장', 186], ['대장', 225], ['원수', 270],
];
const ENEMY_CREWS = ['검은 이빨', '붉은 코', '철퇴', '바다뱀', '해골 깃발', '폭풍 까마귀', '외눈 상어', '황금 갈고리', '피의 장미', '흑수염 잔당'];
const RANDOM_NAMES = ['몽키', '포트거스', '로로노아', '빈스모크', '니코', '토니', '트라팔가', '보아', '샬롯', '에드워드', '제벨', '코비', '헬메포', '카타쿠리', '야마토'];
const RANDOM_GIVEN = ['루', '에이', '조로', '나미', '우솝', '로빈', '사보', '마르코', '스모', '코우', '타시기', '페로', '비비', '레베카'];

/* =========================================================
 *  시드 난수
 * ========================================================= */
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

/* =========================================================
 *  상태 & 헬퍼
 * ========================================================= */
let G = null;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (a, b) => a + Math.floor(G.rng() * (b - a + 1));
const P = p => G.rng() < p;
const pick = arr => arr[Math.floor(G.rng() * arr.length)];
function wpick(items, wf) {
  const ws = items.map(wf);
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let x = G.rng() * total;
  for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x < 0) return items[i]; }
  return items[items.length - 1];
}
const D = () => DIFF[G.place.diff];
const job = () => G.job.type;
const isPirate = () => G.job.type === 'pirate';
const isNavy = () => G.job.type === 'navy';
const isCivil = () => G.job.type === 'civil' || (G.job.type === 'none' && G.age >= 18);
const atSea = () => isPirate() || isNavy();

function josa(word, a, b) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xAC00 || c > 0xD7A3) return word + b;
  return word + ((c - 0xAC00) % 28 ? a : b);
}

function add(k, d) {
  d = Math.round(d);
  if (!d) return;
  const def = STAT[k];
  const before = G.stats[k];
  let after = clamp(before + d, def.min, def.max);
  if (k === 'hp' && d > 0) after = Math.min(after, Math.max(before, maxHp()));
  G.stats[k] = after;
  if (after !== before) G.deltas[k] = (G.deltas[k] || 0) + (after - before);
}
function hurt(n) { add('hp', -Math.max(1, Math.round(n * D().dmg))); }
function train(n) { G.train += n; G.deltas.train = (G.deltas.train || 0) + n; }
function maxHp() { return G.age < 50 ? 100 : Math.max(30, Math.round(100 - (G.age - 50) * 1.5)); }
function rec(tag) { if (!G.records.includes(tag)) G.records.push(tag); }
function note(title, text, kind = 'major') { G.notes.push({ title, text, kind }); }

function fmtBounty(man) {
  if (!man) return '없음';
  man = Math.round(man / 100) * 100;
  const eok = Math.floor(man / 10000), rest = man % 10000;
  return `${eok ? eok + '억 ' : ''}${rest ? rest + '만 ' : ''}베리`;
}
function addBounty(base) {
  const gain = Math.round((R(Math.round(base * 0.6), Math.round(base * 1.4)) + G.job.bounty * 0.18) / 100) * 100;
  G.job.bounty += gain;
  return `현상금이 ${fmtBounty(G.job.bounty)}(으)로 올랐다.`;
}
function addMerit(n) {
  G.job.merit = Math.max(0, G.job.merit + n);
  G.deltas.merit = (G.deltas.merit || 0) + n;
  checkRank();
}
function checkRank() {
  while (G.job.rank < NAVY_RANKS.length - 1 && G.job.merit >= NAVY_RANKS[G.job.rank + 1][1]) {
    const next = G.job.rank + 1;
    if (next >= 12 && G.stats.rep < 50) { G.flags.rankBlock = '대장 이상은 평판 50 이상이 필요하다'; break; }
    if (next === 13 && (G.stats.rep < 70 || G.stats.conn < 60)) { G.flags.rankBlock = '원수는 평판 70·인맥 60 이상이 필요하다'; break; }
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

/* ---------- 전투 ---------- */
function power() {
  const s = G.stats;
  let p = s.hp * 0.3 + G.train;
  if (G.fruit) p += FRUIT_TYPES[G.fruit.type].pow;
  if (isPirate()) p += s.crew * 0.25 + G.job.stage * 15;
  if (isNavy()) p += s.crew * 0.2 + G.job.rank * 3;
  return Math.round(p);
}
function winChance(enemy) {
  return clamp(0.5 + (power() - enemy * D().enemy) / 50, 0.05, 0.95);
}
function pirateEnemy(extra = 0) { return Math.round(25 + Math.sqrt(G.job.bounty) / 5 + extra); }
function navyEnemy(extra = 0) { return 20 + G.job.rank * 6 + extra; }

/** 전투: 'win' | 'lose' | 'dead'. 열매가 있으면 죽을 확률 감소 */
function fight(enemy, lethal, foe) {
  if (P(winChance(enemy))) {
    hurt(R(1, 6));
    train(1);
    return 'win';
  }
  const fruitMul = G.fruit ? FRUIT_TYPES[G.fruit.type].death : 1;
  if (lethal > 0 && P(clamp(lethal * D().death * fruitMul, 0, 0.9))) {
    G.deltas.hp = (G.deltas.hp || 0) - G.stats.hp;
    G.stats.hp = 0;
    G.deathCause = `${josa(foe, '과', '와')}의 싸움에서 전사`;
    return 'dead';
  }
  hurt(R(8, 20));
  return 'lose';
}
const DEAD_TEXT = '치명상을 입고 쓰러졌다. 다시는 일어나지 못했다…';

function eatFruit() {
  const type = wpick(Object.keys(FRUIT_TYPES), t => FRUIT_TYPES[t].w);
  const name = pick(FRUITS[type]);
  G.fruit = { name, type };
  rec(`${name} 능력자`);
  return `끔찍한 맛이 혀를 감쌌다. 몸 깊은 곳에서 낯선 힘이 깨어난다 — 「${name}」(${FRUIT_TYPES[type].name}). 대신 바다는 이제 당신을 받아주지 않는다.`;
}

/* =========================================================
 *  이벤트
 *  w: 가중치, tag: good/bad(난이도 보정), cond: 발생 조건
 *  choices 가 있으면 선택 대기, 없으면 run 즉시 실행
 * ========================================================= */
const EVENTS = [
  /* ----- 강제 이벤트 ----- */
  { id: 'tree10', forced: true, title: '열 살의 꿈',
    text: () => '열 살이 된 당신은 항구에 앉아 수평선을 바라본다. 어떤 어른이 되고 싶은가?',
    choices: [
      { t: '해적이 되겠다', run: () => { G.tree = 'pirate'; train(2); rec('해적을 꿈꿈'); return '"언젠가 내 깃발을 올리고 바다를 누빌 거야!" 해적의 테크트리가 열렸다.'; } },
      { t: '해군이 되겠다', run: () => { G.tree = 'navy'; train(2); add('rep', 3); rec('해군을 꿈꿈'); return '"정의를 지키는 해군이 될 거야." 해군의 테크트리가 열렸다.'; } },
      { t: '평범하게 살겠다', run: () => { G.tree = 'civil'; add('wealth', 3); add('conn', 3); rec('평범한 삶을 꿈꿈'); return '바다는 보는 것으로 충분하다. 마을 사람들과 더 가까워졌다.'; } },
    ] },
  { id: 'depart18', forced: true, title: '열여덟, 갈림길',
    text: () => ({
      pirate: '드디어 열여덟. 작은 배 한 척과 직접 그린 깃발이 준비되어 있다.',
      navy: '드디어 열여덟. 해군 모병관이 마을에 도착했다.',
      civil: '드디어 열여덟. 마을을 떠날 수도, 남을 수도 있다.',
    }[G.tree || 'civil']),
    choices: [
      { t: '해적 깃발을 올린다', cond: () => G.tree !== 'navy', run: () => becomePirate(true) },
      { t: '해군에 입대한다', cond: () => G.tree !== 'pirate', run: () => joinNavy(true) },
      { t: '마을에 남는다', run: () => { G.job = { ...G.job, type: 'civil' }; rec('고향에 남음'); return '바다는 언제든 그 자리에 있다. 당분간은 고향에서 일하며 살기로 했다.'; } },
    ] },

  /* ----- 유년기 (0~9) ----- */
  { id: 'c_beach', w: 3, cond: () => G.age >= 3 && G.age < 10, title: '바닷가의 보물',
    run: () => {
      if (P(0.6)) { add('wealth', R(1, 4)); return '파도에 밀려온 반짝이는 조개껍데기와 동전 몇 닢을 주웠다.'; }
      hurt(R(3, 7)); return '바위에서 미끄러져 무릎이 까졌다.';
    } },
  { id: 'c_bully', w: 3, cond: () => G.age >= 5 && G.age < 13, title: '골목대장',
    text: '동네 골목대장이 당신의 간식을 빼앗으려 한다.',
    choices: [
      { t: '맞선다', enemy: 20, run: () => fight(20, 0, '골목대장') === 'win'
          ? (add('rep', 3), '골목대장을 넘어뜨렸다! 아이들 사이에 소문이 퍼졌다.')
          : '흠씬 두들겨 맞았다. 다음엔 지지 않겠다고 다짐한다.' },
      { t: '간식을 나눈다', run: () => { add('food', -2); add('conn', 4); return '나눠 먹다 보니 어느새 친구가 되었다.'; } },
      { t: '도망친다', run: () => '재빨리 골목을 빠져나왔다.' },
    ] },
  { id: 'c_pirateship', w: 2, cond: () => G.age >= 4 && G.age < 14, title: '해적선 입항',
    text: '해골 깃발을 단 해적선이 항구에 들어왔다. 어른들은 문을 걸어 잠갔다.',
    choices: [
      { t: '집에 숨는다', run: () => '창틈으로 지켜보다가 해적선이 떠나는 것을 보았다.' },
      { t: '몰래 구경한다', run: () => {
          if (P(0.55)) { add('conn', 5); G.flags.metPirate = true; rec('해적 선장을 만남');
            return '밀짚모자를 쓴 선장이 웃으며 머리를 쓰다듬었다. "넌 커서 뭐가 될 거냐?" 가슴이 두근거린다.'; }
          hurt(5); return '해적에게 들켜 쫓겨났다.';
        } },
    ] },
  { id: 'c_navyvisit', w: 2, cond: () => G.age >= 4 && G.age < 14, title: '해군 함대 방문',
    run: () => { add('rep', 2); add('conn', 2); G.flags.inspiredNavy = true;
      return '"정의"라고 적힌 하얀 코트를 걸친 장교가 아이들에게 손을 흔들었다. 오래 기억에 남을 장면이다.'; } },
  { id: 'c_sick', w: 2, tag: 'bad', cond: () => G.age < 12, title: '열병',
    run: () => {
      hurt(R(8, 15));
      if (G.stats.wealth >= 10 && P(0.6)) { add('wealth', -5); add('hp', 5); return '심한 열병에 걸렸지만 의사를 불러 무사히 회복했다.'; }
      return '며칠 밤을 앓아누웠다.';
    } },
  { id: 'c_friend', w: 3, tag: 'good', cond: () => G.age >= 4 && G.age < 16, title: '새 친구',
    run: () => { add('conn', R(3, 6)); return '이웃 마을에서 온 아이와 친구가 되었다. 둘은 함께 바다를 누비자고 약속했다.'; } },
  { id: 'c_festival', w: 2, tag: 'good', cond: () => G.age < 18, title: '마을 축제',
    run: () => { add('food', R(4, 8)); add('conn', 2); return '풍어제가 열렸다. 배불리 먹고 늦게까지 춤췄다.'; } },
  { id: 'c_lost', w: 1, tag: 'bad', cond: () => G.age >= 4 && G.age < 10, title: '길을 잃다',
    run: () => {
      if (P(0.4)) { train(3); return '숲에서 길을 잃었다가 이상한 노인을 만나 사흘간 무술을 배웠다.'; }
      hurt(5); add('food', -3); return '숲에서 길을 잃고 하룻밤을 굶었다.';
    } },
  { id: 'c_books', w: 2, cond: () => G.age >= 6 && G.age < 16, title: '오래된 책',
    text: '다락에서 먼지 쌓인 책 꾸러미를 발견했다.',
    choices: [
      { t: '항해술 책을 읽는다', run: () => { train(1); G.flags.navigation = true; return '별을 보고 방향을 읽는 법을 익혔다.'; } },
      { t: '역사책을 읽는다', run: () => { add('conn', 2); G.flags.history = true; return '"공백의 100년"이라는 이상한 단어가 머리에서 떠나지 않는다.'; } },
      { t: '책 따위 덮고 논다', run: () => { add('hp', 4); return '하루 종일 뛰어놀았다.'; } },
    ] },

  /* ----- 소년기 (10~17) ----- */
  { id: 't_pirate_train', w: 4, tag: 'good', cond: () => G.tree === 'pirate' && G.age < 18, title: '몰래 하는 수련',
    run: () => { train(R(2, 4)); add('hp', 2); return pick(['밤마다 절벽에서 바다로 뛰어드는 연습을 했다.', '나무 막대로 검술을 흉내 내며 손바닥이 터졌다.', '어선에 몰래 올라 노 젓는 법을 익혔다.']); } },
  { id: 't_tavern', w: 2, cond: () => G.tree === 'pirate' && G.age < 18, title: '주점의 해적 이야기',
    run: () => { add('conn', 4); return '주점 구석에서 늙은 해적이 위대한 항로와 원피스 이야기를 들려주었다.'; } },
  { id: 't_navy_train', w: 4, tag: 'good', cond: () => G.tree === 'navy' && G.age < 18, title: '해군 지망생 훈련',
    run: () => { train(R(2, 4)); add('rep', 2); return pick(['지부 훈련장 밖에서 병사들의 구령을 따라 했다.', '매일 새벽 모래사장을 달렸다.', '퇴역 해군에게 육식(六式)의 기초를 들었다.']); } },
  { id: 't_report', w: 2, cond: () => G.tree === 'navy' && G.age < 18, title: '수배자 제보',
    run: () => { add('rep', 5); add('wealth', 3); return '수배서와 똑같은 얼굴을 보고 해군 지부에 신고했다. 작은 포상금을 받았다.'; } },
  { id: 't_pickpocket', w: 2, cond: () => G.age >= 10 && G.age < 18, title: '소매치기의 유혹',
    text: '시장에서 술 취한 상인의 두툼한 지갑이 눈에 들어왔다.',
    choices: [
      { t: '슬쩍한다', tag: '위험', run: () => {
          if (P(0.6)) { add('wealth', R(4, 10)); add('rep', -5); return '아무도 눈치채지 못했다.'; }
          add('rep', -10); hurt(5); return '붙잡혀 실컷 얻어맞고 마을에 소문이 났다.';
        } },
      { t: '참는다', run: () => { add('rep', 1); return '양심을 지켰다.'; } },
    ] },
  { id: 't_work', w: 3, tag: 'good', cond: () => G.age >= 10 && G.age < 18, title: '일손 돕기',
    run: () => { add('wealth', R(2, 5)); add('food', 3); return pick(['어부 아저씨의 그물 정리를 도왔다.', '식당에서 설거지를 하고 품삯을 받았다.', '항구에서 짐을 날랐다.']); } },
  { id: 't_bandits', w: 2, tag: 'bad', cond: () => G.age >= 10 && !atSea(), title: '산적의 습격',
    text: '산적들이 마을에 내려와 식량을 내놓으라며 행패를 부린다.',
    choices: [
      { t: '맞서 싸운다', enemy: 30, run: () => {
          const r = fight(30, 0.08, '산적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('rep', 8); train(2); return '산적 두목의 턱을 날려버렸다! 마을 사람들이 환호했다.'; }
          add('food', -5); return '역부족이었다. 산적들은 식량을 챙겨 떠났다.';
        } },
      { t: '숨는다', run: () => { add('food', -R(4, 8)); add('wealth', -R(2, 6)); return '숨어서 지켜볼 수밖에 없었다.'; } },
    ] },
  { id: 't_love', w: 1, once: true, cond: () => G.age >= 13 && G.age < 22, title: '첫사랑',
    text: '항구의 그 사람만 보면 심장이 터질 것 같다.',
    choices: [
      { t: '고백한다', run: () => {
          if (P(0.5)) { add('conn', 5); add('hp', 5); rec('첫사랑 성공'); return '그 사람이 수줍게 고개를 끄덕였다.'; }
          add('hp', -2); return '정중하게 거절당했다. 바닷바람이 유난히 차갑다.';
        } },
      { t: '마음에 묻는다', run: () => '그 마음은 오래도록 추억으로 남았다.' },
    ] },
  { id: 't_seaking', w: 1, tag: 'bad', cond: () => G.age >= 8 && !atSea(), title: '근해의 주인',
    text: '거대한 바다왕이 해안 가까이 모습을 드러냈다!',
    choices: [
      { t: '도망친다', run: () => { if (P(0.8)) return '간신히 도망쳤다.'; hurt(12); return '도망치다 파도에 휩쓸려 크게 다쳤다.'; } },
      { t: '맞선다', enemy: 50, tag: '위험', run: () => {
          const r = fight(50, 0.25, '근해의 주인');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('rep', 10); train(4); rec('근해의 주인 격퇴'); return '단 일격에 바다왕을 쓰러뜨렸다! 모두가 입을 다물지 못했다.'; }
          return '이빨에 스쳐 크게 다쳤지만 살아남았다.';
        } },
    ] },

  /* ----- 공통 ----- */
  { id: 'g_fruit', w: 0.8, cond: () => !G.fruit && G.age >= 6, title: '수상한 열매',
    text: '소용돌이 무늬가 새겨진 기묘한 열매를 발견했다. 악마의 열매일지도 모른다.',
    choices: [
      { t: '먹는다', tag: '열매', run: eatFruit },
      { t: '팔아버린다', run: () => { add('wealth', R(25, 45)); add('conn', 3); return '암시장의 상인이 눈을 빛내며 거금을 내밀었다.'; } },
      { t: '바다에 버린다', run: () => '불길한 느낌에 열매를 바다로 던졌다.' },
    ] },
  { id: 'g_famine', w: 2, tag: 'bad', title: '흉년',
    run: () => { add('food', -R(6, 12)); return '바다도 땅도 인색한 해였다. 먹을 것이 바닥나간다.'; } },
  { id: 'g_rest', w: 2, tag: 'good', title: '평온한 계절',
    run: () => { add('hp', R(3, 8)); return pick(['오랜만에 푹 쉬었다.', '따뜻한 햇볕 아래 낮잠을 잤다.', '아무 일 없는 하루하루가 이어졌다.']); } },
  { id: 'g_accident', w: 1, tag: 'bad', title: '사고',
    run: () => { hurt(R(5, 12)); return pick(['계단에서 굴러떨어졌다.', '돛대에서 떨어진 도르래에 맞았다.', '상한 생선을 먹고 크게 탈이 났다.']); } },
  { id: 'g_treasure', w: 1, cond: () => G.age >= 12, title: '보물 지도',
    text: '낡은 병 속에서 X 표시가 그려진 지도를 찾았다.',
    choices: [
      { t: '찾으러 간다', tag: '위험', run: () => {
          if (P(0.5)) { add('wealth', R(10, 25)); return '동굴 깊은 곳에서 녹슨 상자를 찾았다. 금화가 가득하다!'; }
          hurt(R(6, 14)); return '함정이었다. 빈손으로 상처만 입었다.';
        } },
      { t: '지도를 판다', run: () => { add('wealth', 5); return '호기심 많은 상인에게 지도를 넘겼다.'; } },
    ] },
  { id: 'g_merchant', w: 2, cond: () => G.age >= 12, title: '떠돌이 상인',
    text: '커다란 짐을 진 떠돌이 상인이 말을 건다. "필요한 거 있수?"',
    choices: [
      { t: '식량을 산다', need: '재산 5', cond: () => G.stats.wealth >= 5, run: () => { add('wealth', -5); add('food', 12); return '말린 고기와 쌀을 넉넉히 샀다.'; } },
      { t: '정보를 산다', need: '재산 3', cond: () => G.stats.wealth >= 3, run: () => { add('wealth', -3); add('conn', 4); return '여러 섬의 소문과 사람 이름을 얻었다.'; } },
      { t: '그냥 보낸다', run: () => '상인은 어깨를 으쓱하고 떠났다.' },
    ] },
  { id: 'g_brawl', w: 2, cond: () => G.age >= 16, title: '주점 난투',
    text: '주점에서 시비가 붙었다. 술병이 날아다닌다.',
    choices: [
      { t: '끼어든다', enemy: 32, run: () => {
          const r = fight(32, 0.04, '주정뱅이');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('conn', 3); add('rep', 2); return '난투를 정리하자 주점 주인이 술을 샀다.'; }
          return '술병에 머리를 맞고 기절했다.';
        } },
      { t: '조용히 나간다', run: () => '괜한 싸움에 휘말리지 않았다.' },
    ] },
  { id: 'g_celestial', w: 1, tag: 'bad', cond: () => G.age >= 8, title: '천룡인 행차',
    text: '거품 헬멧을 쓴 천룡인이 노예를 끌고 거리를 지난다. 모두가 엎드렸다.',
    choices: [
      { t: '엎드린다', run: () => { add('hp', -2); return '이를 악물고 땅에 이마를 댔다.'; } },
      { t: '노예를 돕는다', tag: '위험', cond: () => G.age >= 15, run: () => {
          if (P(0.4)) { add('rep', 15); add('conn', 5); rec('천룡인에게 맞섬'); if (isPirate()) return '노예를 풀어주고 사라졌다. ' + addBounty(4000); return '혼란을 틈타 노예를 풀어주었다. 사람들이 당신을 영웅이라 부른다.'; }
          hurt(20);
          if (P(0.12 * D().death)) { G.stats.hp = 0; G.deathCause = '천룡인의 총에 맞아 사망'; return '총성이 울렸다…'; }
          add('rep', 5); return '호위병에게 붙잡혀 죽기 직전까지 맞았다.';
        } },
    ] },
  { id: 'g_gamble', w: 1, cond: () => G.age >= 18, title: '도박장',
    text: '주사위 소리가 요란한 도박장. "한 판 해보슈?"',
    choices: [
      { t: '건다', need: '재산 5', cond: () => G.stats.wealth >= 5, run: () => {
          if (P(0.45)) { add('wealth', R(5, 15)); return '대박이다!'; }
          add('wealth', -R(5, 12)); return '털렸다.';
        } },
      { t: '안 한다', run: () => '돈은 소중하다.' },
    ] },
  { id: 'g_marriage', w: 1, once: true, cond: () => G.age >= 20 && G.age <= 45, title: '인연',
    text: '오랫동안 곁을 지켜준 사람이 있다.',
    choices: [
      { t: '함께하자고 말한다', run: () => { add('conn', 8); add('food', 5); add('hp', 5); rec('결혼'); return '작은 결혼식을 올렸다. 소박하지만 행복한 날이었다.'; } },
      { t: '바다가 먼저다', run: () => { train(1); return '그 사람은 쓸쓸히 웃으며 배웅해 주었다.'; } },
    ] },
  { id: 'g_revolution', w: 0.7, once: true, cond: () => G.age >= 18 && !isNavy(), title: '혁명군의 접촉',
    text: '망토를 쓴 남자가 다가왔다. "세상을 바꾸고 싶지 않나?"',
    choices: [
      { t: '협력한다', run: () => { add('conn', 10); add('rep', -5); G.flags.rev = true; rec('혁명군과 연결'); return '드래곤의 이름을 처음 들었다. 비밀스러운 연락망에 이름이 올랐다.'; } },
      { t: '거절한다', run: () => '남자는 아무 말 없이 사라졌다.' },
    ] },
  { id: 'g_storm', w: 2, tag: 'bad', cond: () => atSea(), title: '폭풍',
    run: () => {
      hurt(R(4, 10)); add('food', -R(3, 7));
      if (P(0.25)) {
        if (G.fruit && !(G.stats.crew >= 5 && P(0.85))) {
          if (P(0.4 * D().death)) { G.stats.hp = 0; G.deathCause = '폭풍 속 바다에 빠져 익사 (능력자)'; return '거센 파도에 휩쓸려 바다에 빠졌다. 열매의 저주로 몸이 굳어 그대로 가라앉았다…'; }
          hurt(15); return '바다에 빠졌다! 힘이 빠져 가라앉던 순간 겨우 끌어올려졌다.';
        }
        if (G.fruit) return '바다에 빠졌지만 동료가 곧장 뛰어들어 건져냈다.';
        return '갑판에서 휩쓸려 떨어졌지만 헤엄쳐 돌아왔다.';
      }
      return '돛이 찢어지고 식량 일부가 바다로 쓸려갔다.';
    } },

  /* ----- 민간인 ----- */
  { id: 'v_work', w: 4, tag: 'good', cond: () => isCivil(), title: '생업',
    run: () => { add('wealth', R(2, 6) + (G.flags.shop ? 3 : 0)); add('food', 2);
      return G.flags.shop ? '가게가 북적였다.' : pick(['고기잡이가 잘 됐다.', '조선소에서 품삯을 받았다.', '밭일을 했다.']); } },
  { id: 'v_shop', w: 1, once: true, cond: () => isCivil() && G.age >= 20 && G.stats.wealth >= 20, title: '가게를 열 기회',
    text: '항구 앞 빈 가게가 싸게 나왔다.',
    choices: [
      { t: '가게를 연다', run: () => { add('wealth', -15); add('conn', 5); G.flags.shop = true; rec('가게 주인'); return '작은 간판을 내걸었다.'; } },
      { t: '지금은 아니다', run: () => '조금 더 모으기로 했다.' },
    ] },
  { id: 'v_pirate_scout', w: 1.5, cond: () => isCivil() && G.age <= 40, title: '해적단의 스카우트',
    text: '항구에 들른 해적 선장이 당신을 눈여겨본다. "우리 배에 타라!"',
    choices: [
      { t: '돛을 올린다', run: () => becomePirate(false) },
      { t: '거절한다', run: () => '선장은 아쉬운 듯 웃으며 떠났다.' },
    ] },
  { id: 'v_navy_recruit', w: 1.5, cond: () => isCivil() && G.age <= 35, title: '해군 모병',
    text: '해군 지부에서 신병을 모집한다는 벽보가 붙었다.',
    choices: [
      { t: '입대한다', run: () => joinNavy(false) },
      { t: '관심 없다', run: () => '벽보를 지나쳤다.' },
    ] },
  { id: 'v_defend', w: 1.5, cond: () => isCivil(), title: '마을을 노리는 해적',
    text: '삼류 해적단이 마을을 약탈하러 왔다.',
    choices: [
      { t: '앞장서 싸운다', enemy: 38, run: () => {
          const r = fight(38, 0.12, '삼류 해적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('rep', 10); add('conn', 4); train(2); return '해적들을 바다로 내던졌다! 마을의 영웅이 되었다.'; }
          add('wealth', -R(3, 8)); return '해적들에게 당했다. 마을도 피해를 입었다.';
        } },
      { t: '재산을 숨긴다', run: () => { add('wealth', -R(1, 4)); return '대부분은 지켰다.'; } },
    ] },

  /* ----- 해적 ----- */
  { id: 'p_recruit', w: 4, tag: 'good', cond: () => isPirate(), title: '동료 영입',
    run: () => { add('crew', R(4, 10) + Math.floor(G.stats.conn / 15)); add('conn', 2);
      return pick(['주점에서 만난 검객이 배에 올랐다.', '난파선에서 구한 생존자들이 동료가 되었다.', '천재 항해사가 합류했다!', '요리사가 따라오겠다고 우겼다.']); } },
  { id: 'p_navy', w: 3, tag: 'bad', cond: () => isPirate(), title: '해군의 추격',
    text: () => `해군 군함이 ${G.crewName}의 뒤를 쫓는다!`,
    choices: [
      { t: '맞서 싸운다', enemy: () => pirateEnemy(), run: () => {
          const r = fight(pirateEnemy(), 0.12, '해군');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('rep', -3); add('crew', R(0, 2)); return '군함을 격침시켰다! ' + addBounty(2000); }
          add('crew', -R(2, 6)); return '대패했다. 동료 몇이 붙잡혔다.';
        } },
      { t: '도주한다', run: () => {
          if (P(0.6 + (G.flags.navigation ? 0.15 : 0))) return '안개 속으로 빠져나갔다.';
          hurt(R(5, 10)); add('crew', -R(1, 4)); return '포격을 맞으며 간신히 도망쳤다.';
        } },
    ] },
  { id: 'p_raid', w: 3, cond: () => isPirate(), title: '약탈의 기회',
    text: '방비가 허술한 부자 마을이 보인다.',
    choices: [
      { t: '약탈한다', run: () => { add('wealth', R(10, 20)); add('food', R(8, 15)); add('rep', -R(8, 15)); return '배가 금은보화와 식량으로 가득 찼다. ' + addBounty(2500); } },
      { t: '그냥 지나친다', run: () => '배는 조용히 지나갔다.' },
      { t: '마을을 지켜준다', enemy: 35, run: () => {
          const r = fight(35, 0.08, '산적단');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('rep', 12); add('conn', 5); add('food', 6); return '마을을 괴롭히던 산적단을 쫓아냈다. 해적인데 이상하게 사랑받는다.'; }
          return '산적단에게 밀려났다.';
        } },
    ] },
  { id: 'p_rival', w: 3, cond: () => isPirate(), title: '라이벌 해적단',
    text: () => `「${pick(ENEMY_CREWS)} 해적단」이 시비를 걸어왔다.`,
    choices: [
      { t: '싸운다', enemy: () => pirateEnemy(5), run: () => {
          const r = fight(pirateEnemy(5), 0.15, '라이벌 해적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('crew', R(2, 6)); add('wealth', R(5, 15)); return '상대 선장을 쓰러뜨리고 깃발을 빼앗았다. ' + addBounty(3000); }
          add('crew', -R(3, 8)); add('wealth', -R(3, 10)); return '패배했다. 보물을 빼앗겼다.';
        } },
      { t: '동맹을 제안한다', run: () => {
          if (P(0.7)) { add('conn', 6); return '술잔을 나누고 동맹을 맺었다.'; }
          add('wealth', -10); add('crew', -2); return '배신당했다! 밤사이 보물이 털렸다.';
        } },
    ] },
  { id: 'p_hunter', w: 2, tag: 'bad', cond: () => isPirate() && G.job.bounty > 0, title: '현상금 사냥꾼',
    run: () => {
      const r = fight(pirateEnemy(-5), 0.1, '현상금 사냥꾼');
      if (r === 'dead') return DEAD_TEXT;
      if (r === 'win') return '당신의 목을 노린 현상금 사냥꾼을 가볍게 돌려보냈다.';
      return '기습을 당해 크게 다쳤다.';
    } },
  { id: 'p_island', w: 2, tag: 'good', cond: () => isPirate(), title: '미지의 섬',
    run: () => { add('food', R(10, 20)); if (P(0.25)) { add('wealth', R(8, 15)); return '열대 과일이 가득한 섬. 고대 유적에서 보물까지 찾았다!'; } return '사냥감이 풍부한 섬에서 식량을 채웠다.'; } },
  { id: 'p_feast', w: 2, tag: 'good', cond: () => isPirate() && G.stats.food >= 10, title: '연회',
    run: () => { add('food', -5); add('hp', 6); add('conn', 2); add('crew', 1); return '밤새 노래하고 마셨다. 선원들의 사기가 하늘을 찌른다.'; } },
  { id: 'p_train', w: 2, tag: 'good', cond: () => isPirate(), title: '선상 수련',
    run: () => { train(R(2, 4)); return pick(['갑판 위에서 동료와 대련했다.', '패기의 감각을 조금 깨우쳤다.', '무거운 닻을 들고 수련했다.']); } },
  { id: 'p_mutiny', w: 4, tag: 'bad', cond: () => isPirate() && G.stats.crew > 5 && (G.stats.food < 10 || G.stats.wealth < 3), title: '선상 반란',
    text: '굶주린 선원들이 술렁인다. "선장을 갈아치우자!"',
    choices: [
      { t: '설득한다', run: () => { if (P(0.3 + G.stats.conn / 150)) { add('rep', 2); return '진심 어린 연설로 반란을 잠재웠다.'; } add('crew', -R(5, 12)); return '설득에 실패했다. 일부가 작은 배를 훔쳐 떠났다.'; } },
      { t: '힘으로 제압한다', enemy: () => 20 + G.stats.crew * 0.5, run: () => {
          const r = fight(20 + G.stats.crew * 0.5, 0.1, '반란 선원');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { add('crew', -R(1, 4)); return '주동자를 바다에 던져버렸다.'; }
          add('crew', -R(8, 15)); return '반란이 성공했다. 겨우 목숨만 건졌다.';
        } },
    ] },
  { id: 'p_poneglyph', w: 5, cond: () => isPirate() && G.job.stage >= 1 && (G.flags.pg || 0) < 4, title: '로드 포네그리프',
    text: () => `${(G.flags.pg || 0) + 1}번째 로드 포네그리프의 행방을 알아냈다. 다른 거물 해적도 노리고 있다.`,
    choices: [
      { t: '쟁탈전을 벌인다', enemy: () => pirateEnemy(), run: () => {
          const r = fight(pirateEnemy(), 0.2, '거물 해적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') return gainPoneglyph('적을 물리치고 붉은 비석의 탁본을 떴다.');
          add('crew', -R(4, 8)); return '빼앗기고 말았다.';
        } },
      { t: '정보상에게 탁본을 산다', need: '재산 30', cond: () => G.stats.wealth >= 30, run: () => { add('wealth', -30); return gainPoneglyph('막대한 돈을 치르고 탁본을 손에 넣었다.'); } },
      { t: '포기한다', run: () => '때가 아니다.' },
    ] },
  { id: 'p_shichi', w: 10, cond: () => isPirate() && G.job.stage === 0 && G.job.bounty >= 30000 && G.stats.crew >= 30
      && !(G.flags.shichiNo && G.age - G.flags.shichiNo < 3), title: '세계정부의 제안',
    text: '세계정부의 사절이 찾아왔다. "왕하칠무해의 자리를 제안한다. 해적질은 묵인하겠다. 단, 소집에는 응해야 한다."',
    choices: [
      { t: '수락한다', run: () => { G.job.stage = 1; add('rep', 25); add('conn', 10); rec('칠무해 임명'); return `${G.name}의 이름이 칠무해 명단에 올랐다. 이제 정부의 개다—하지만 아무도 함부로 건드리지 못한다.`; } },
      { t: '거절한다', run: () => { G.flags.shichiNo = G.age; add('rep', -5); return '사절을 돌려보냈다. ' + addBounty(5000); } },
    ] },
  { id: 'p_yonko', w: 10, cond: () => isPirate() && G.job.stage === 1 && G.job.bounty >= 150000 && G.stats.crew >= 65 && G.stats.conn >= 45
      && !(G.flags.yonkoTry && G.age - G.flags.yonkoTry < 2), title: '신세계의 패권',
    text: '사황 한 명이 쇠약해졌다는 소문이 돈다. 그의 영역을 차지하면 신세계의 왕좌에 오를 수 있다.',
    choices: [
      { t: '전쟁을 건다', enemy: 125, tag: '위험', run: () => {
          G.flags.yonkoTry = G.age;
          const r = fight(125, 0.35, '사황');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { G.job.stage = 2; G.job.bounty = Math.round(G.job.bounty * 1.6); add('crew', 10); add('conn', 8); rec('사황 등극');
            return `세계를 뒤흔든 전쟁 끝에 승리했다. 신문 1면: "새로운 사황 탄생". 현상금 ${fmtBounty(G.job.bounty)}.`; }
          add('crew', -R(10, 20)); return '참패했다. 함대의 절반을 잃고 후퇴했다.';
        } },
      { t: '때를 기다린다', run: () => { G.flags.yonkoTry = G.age; return '아직은 힘을 기를 때다.'; } },
    ] },
  { id: 'p_raftel', w: 12, cond: () => isPirate() && G.job.stage === 2 && G.job.bounty >= 300000 && G.stats.crew >= 80 && G.stats.conn >= 60
      && (G.flags.pg || 0) >= 4 && !(G.flags.raftelTry && G.age - G.flags.raftelTry < 2), title: '최후의 섬',
    text: '네 개의 로드 포네그리프가 가리키는 좌표. 최후의 섬 라프텔이 눈앞이다. 그러나 다른 사황과 해군 대함대가 길을 막는다.',
    choices: [
      { t: '라프텔로 간다', enemy: 150, tag: '위험', run: () => {
          G.flags.raftelTry = G.age;
          const r = fight(150, 0.4, '최후의 적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { G.job.stage = 3; add('wealth', 100); add('conn', 10); rec('해적왕 등극');
            return '섬에 닿았다. 그곳에 있던 것을 보고, 당신과 동료들은 한참을 웃었다. ONE PIECE는 실재했다. 당신은 대해적, 해적왕이다!'; }
          add('crew', -R(10, 20)); return '대함대에 막혀 물러났다. 다음 기회를 노린다.';
        } },
      { t: '아직이다', run: () => { G.flags.raftelTry = G.age; return '준비가 더 필요하다.'; } },
    ] },

  /* ----- 해군 ----- */
  { id: 'n_mission', w: 5, cond: () => isNavy(), title: '해적 토벌 임무',
    text: () => `본부의 명령: 「${pick(ENEMY_CREWS)} 해적단」을 소탕하라.`,
    choices: [
      { t: '정면 돌파', enemy: () => navyEnemy(), run: () => {
          const r = fight(navyEnemy(), 0.12, '해적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { G.job.captures += R(1, 3); addMerit(R(4, 8)); add('rep', 3); return '해적선을 나포하고 선장을 체포했다.'; }
          add('crew', -R(1, 4)); return '해적에게 밀려 작전이 실패했다.';
        } },
      { t: '포위 작전', run: () => {
          if (P(0.5 + G.stats.crew / 200 + G.stats.conn / 300)) { G.job.captures += 1; addMerit(R(3, 6)); add('rep', 2); return '부하들과 함께 퇴로를 끊고 해적단을 일망타진했다.'; }
          return '해적단이 포위망을 빠져나갔다.';
        } },
    ] },
  { id: 'n_patrol', w: 3, tag: 'good', cond: () => isNavy(), title: '순찰 근무',
    run: () => { addMerit(R(1, 2)); add('rep', 1); return pick(['조용한 바다였다.', '표류하던 상선을 구조했다.', '밀수선을 적발했다.']); } },
  { id: 'n_train', w: 2, tag: 'good', cond: () => isNavy(), title: '해군 훈련',
    run: () => { train(R(2, 4)); return pick(['육식 중 「철괴」를 연습했다.', '함상 포격 훈련을 했다.', '무장색 패기의 기초를 익혔다.']); } },
  { id: 'n_bigfish', w: 1.5, cond: () => isNavy() && G.job.rank >= 5, title: '거물 해적 체포',
    text: '억대 현상금의 거물 해적이 근해에 나타났다.',
    choices: [
      { t: '직접 상대한다', enemy: () => navyEnemy(25), tag: '위험', run: () => {
          const r = fight(navyEnemy(25), 0.2, '거물 해적');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { G.job.captures += 1; addMerit(R(12, 20)); add('rep', 8); rec('거물 해적 체포'); return '격전 끝에 거물을 해루석 수갑에 채웠다!'; }
          return '놓쳤다. 상처만 남았다.';
        } },
      { t: '본부에 지원 요청', run: () => { addMerit(R(2, 4)); return '지원 함대와 공을 나눴다.'; } },
    ] },
  { id: 'n_corrupt', w: 1.5, cond: () => isNavy(), title: '상관의 부정',
    text: '상관이 해적과 뒷거래를 하는 장면을 목격했다.',
    choices: [
      { t: '고발한다', run: () => {
          if (P(0.5)) { add('rep', 10); addMerit(5); rec('정의를 관철'); return '상관은 강등되었다. 당신의 이름이 본부에 알려졌다.'; }
          addMerit(-5); add('conn', -5); return '오히려 모함을 받아 한직으로 밀려났다.';
        } },
      { t: '눈감는다', run: () => { add('wealth', 10); add('rep', -8); add('conn', 5); return '입막음 돈을 받았다. 마음이 무겁다.'; } },
    ] },
  { id: 'n_tenryu', w: 1, cond: () => isNavy() && G.job.rank >= 3, title: '천룡인 호위',
    text: '천룡인 호위 임무가 떨어졌다. 그가 지나가던 시민을 쏘려 한다.',
    choices: [
      { t: '명령에 따른다', run: () => { add('conn', 8); add('rep', -6); addMerit(3); return '눈을 감았다. 이것이 정의인가.'; } },
      { t: '시민을 감싼다', run: () => { addMerit(-8); add('rep', 12); return '징계를 받았지만 시민들은 당신을 기억한다.'; } },
    ] },
  { id: 'n_buster', w: 0.6, once: true, cond: () => isNavy() && G.job.rank >= 8, title: '버스터 콜',
    text: '한 섬에 버스터 콜이 발동됐다. 피난선에는 아직 민간인이 있다.',
    choices: [
      { t: '명령대로 포격', run: () => { addMerit(15); add('rep', -15); return '섬은 지도에서 사라졌다.'; } },
      { t: '피난선을 먼저 보호', run: () => { addMerit(5); add('rep', 15); rec('버스터 콜의 양심'); return '명령 위반 직전까지 버티며 피난선을 지켰다.'; } },
    ] },
  { id: 'n_mentor', w: 0.7, once: true, cond: () => isNavy(), title: '영웅의 지도',
    run: () => { train(6); add('conn', 6); rec('영웅에게 사사'); return '전설의 중장이 당신을 눈여겨봤다. "주먹에 사랑을 담아라!" 혹독한 특훈이 시작됐다.'; } },
  { id: 'n_doubt', w: 1, cond: () => isNavy() && G.job.rank >= 2, title: '정의에 대한 의문',
    text: '"절대적 정의"의 이름으로 무고한 이들이 죽어간다. 이 코트를 계속 입어야 할까?',
    choices: [
      { t: '해군을 떠나 해적이 된다', run: () => {
          const keep = Math.floor(G.stats.crew / 3);
          G.stats.crew = keep;
          add('rep', -10); rec('해군 탈영');
          return '정의의 코트를 바다에 던졌다. ' + becomePirate(false, true);
        } },
      { t: '안에서 바꾼다', run: () => { add('rep', 3); return '조직 안에서 싸우기로 했다.'; } },
    ] },

  /* ----- 노년 ----- */
  { id: 'o_retire', w: 2, cond: () => (isPirate() || isNavy()) && G.age >= 55, title: '은퇴의 갈림길',
    text: '몸이 예전 같지 않다. 이제 칼을 내려놓을 때일까.',
    choices: [
      { t: '은퇴한다', run: () => { G.job.prev = jobTitle(); G.job.type = 'retired'; rec('은퇴'); return '마지막으로 바다를 바라보며 일선에서 물러났다.'; } },
      { t: '아직 끝나지 않았다', run: () => { train(1); return '아직 바다가 부른다.'; } },
    ] },
  { id: 'o_heir', w: 1, once: true, cond: () => G.age >= 45, title: '후계자',
    run: () => { add('conn', 5); rec('후계자를 얻음'); return '당신의 뜻을 이을 젊은이가 나타났다. 밀짚모자 같은 것을 맡겨도 좋겠다.'; } },
  { id: 'o_ill', w: 2, tag: 'bad', cond: () => G.age >= 60, title: '노환',
    run: () => { hurt(R(5, 12)); return '옛 상처가 쑤시고 기침이 멎지 않는다.'; } },

  /* ----- 지역 ----- */
  { id: 'pl_foosha', w: 1.5, cond: () => G.place.id === 'foosha' && G.age >= 7 && !atSea(), title: '코르보 산',
    text: '코르보 산에 들어가면 산적 다단이 산다고 한다.',
    choices: [
      { t: '산으로 들어간다', enemy: 25, run: () => {
          const r = fight(25, 0.03, '코르보 산 맹수');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { train(2); add('conn', 3); return '거대한 악어를 잡아 산적들에게 인정받았다.'; }
          return '맹수에게 쫓겨 혼쭐이 났다.';
        } },
      { t: '마을에 있는다', run: () => { add('food', 3); return '마키노 씨의 주점에서 일을 도왔다.'; } },
    ] },
  { id: 'pl_loguetown', w: 1, once: true, cond: () => G.place.id === 'loguetown' && G.age >= 6, title: '처형대',
    run: () => { add('conn', 2); G.flags.roger = true; rec('처형대 앞에서'); return '광장의 처형대 앞에 섰다. "내 보물? 원한다면 주지. 찾아봐라!" — 그 말이 들리는 것 같았다.'; } },
  { id: 'pl_baratie', w: 2, tag: 'good', cond: () => G.place.id === 'baratie' && !atSea(), title: '요리장의 수업',
    run: () => { add('food', 8); train(1); return '붉은 다리 제프에게 요리와 발차기를 동시에 배웠다.'; } },
  { id: 'pl_gray', w: 2, tag: 'bad', cond: () => G.place.id === 'graycity' && !atSea(), title: '쓰레기산의 생존',
    text: '먹을 것이 떨어졌다. 쓰레기산을 뒤지거나 도시로 숨어들어야 한다.',
    choices: [
      { t: '쓰레기산을 뒤진다', run: () => { add('food', R(3, 7)); hurt(4); return '녹슨 철골 사이에서 상한 빵을 찾았다.'; } },
      { t: '귀족 거리로 숨어든다', tag: '위험', run: () => { if (P(0.5)) { add('wealth', R(4, 10)); add('food', 5); return '들키지 않고 빠져나왔다.'; } hurt(12); add('rep', -5); return '경비병에게 붙잡혀 두들겨 맞았다.'; } },
    ] },
  { id: 'pl_water7', w: 2, tag: 'good', cond: () => G.place.id === 'water7' && G.age >= 12 && !atSea(), title: '갈레라 컴퍼니',
    run: () => { add('wealth', R(4, 8)); return '조선소에서 망치질을 하고 두둑한 품삯을 받았다.'; } },
  { id: 'pl_alabasta', w: 2, tag: 'bad', cond: () => G.place.id === 'alabasta' && !atSea(), title: '가뭄',
    run: () => { add('food', -R(5, 10)); hurt(3); return '몇 달째 비가 오지 않는다. 사람들은 댄스 파우더 이야기를 수군거린다.'; } },
  { id: 'pl_marineford', w: 2, tag: 'good', cond: () => G.place.id === 'marineford' && G.age < 18, title: '해군 본부 견학',
    run: () => { train(2); add('rep', 3); G.flags.inspiredNavy = true; return '거대한 본부 요새 안을 구경했다. 대장들의 기운이 피부로 느껴졌다.'; } },
  { id: 'pl_drum', w: 2, tag: 'bad', cond: () => G.place.id === 'drum' && !atSea(), title: '혹한',
    run: () => { hurt(R(4, 9)); add('food', -4); return '눈보라가 몇 주째 그치지 않는다.'; } },
  { id: 'pl_wholecake', w: 2, tag: 'good', cond: () => G.place.id === 'wholecake' && !atSea(), title: '빅 맘의 다과회',
    run: () => {
      add('food', 15);
      if (P(0.12)) { hurt(10); return '다과회에 초대됐지만 빅 맘의 질문에 잘못 대답해 수명을 조금 빼앗겼다…'; }
      return '과자의 섬에서 배 터지게 먹었다.';
    } },
  { id: 'pl_dressrosa', w: 1.5, tag: 'bad', cond: () => G.place.id === 'dressrosa' && G.age >= 10 && !atSea(), title: '장난감의 비밀',
    text: '거리의 장난감 병정이 당신에게 조용히 속삭인다. "나는 원래 사람이었어."',
    choices: [
      { t: '진실을 캔다', tag: '위험', run: () => { if (P(0.4)) { add('conn', 8); rec('드레스로자의 진실'); return '지하 조직과 연결되었다.'; } hurt(15); return '패밀리의 간부에게 들켜 크게 당했다.'; } },
      { t: '모른 척한다', run: () => '못 본 척 지나쳤다.' },
    ] },
  { id: 'pl_wano', w: 2, tag: 'bad', cond: () => G.place.id === 'wano' && !atSea(), title: '오로치의 폭정',
    run: () => { add('food', -R(5, 10)); add('wealth', -R(2, 6)); return '쇼군의 세금이 또 올랐다. 강물마저 독에 물들었다.'; } },
  { id: 'pl_kaido', w: 2, tag: 'bad', cond: () => G.place.id === 'onigashima' && G.age >= 8 && !atSea(), title: '백수 해적단의 징집',
    text: '백수 해적단 간부가 아이들을 모아 「SMILE」 열매를 나눠준다.',
    choices: [
      { t: '복종한다', run: () => { add('food', 6); add('rep', -5); hurt(5); return '혹독한 노역에 끌려갔다.'; } },
      { t: '저항한다', enemy: 60, tag: '위험', run: () => {
          const r = fight(60, 0.3, '백수 해적단');
          if (r === 'dead') return DEAD_TEXT;
          if (r === 'win') { train(4); add('rep', 10); rec('백수 해적단에 저항'); return '간부의 부하를 쓰러뜨리고 산으로 숨었다.'; }
          return '흠씬 두들겨 맞고 끌려갔다.';
        } },
      { t: '도망친다', run: () => { if (P(0.35)) return '동굴로 숨어 위기를 넘겼다.'; hurt(15); return '붙잡혀 채찍질을 당했다.'; } },
    ] },
];
const EV = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/* ---------- 직업 전환 ---------- */
function becomePirate(atDeparture, deserter = false) {
  G.job = { ...G.job, type: 'pirate', stage: 0, bounty: G.job.bounty || 0 };
  G.crewName = `${G.name} 해적단`;
  add('crew', R(1, 4) + (G.flags.metPirate ? 3 : 0) + (G.family.key === 'pirate' ? 3 : 0));
  rec(deserter ? '해적으로 전향' : '해적단 결성');
  if (deserter) { G.job.bounty = 5000; return `「${G.crewName}」를 결성했다. 배신자에게 즉시 ${fmtBounty(G.job.bounty)}의 현상금이 걸렸다.`; }
  if (atDeparture) return `작은 배에 직접 그린 해골 깃발을 올렸다. 「${G.crewName}」의 첫 항해가 시작된다!`;
  return `낡은 배를 사서 깃발을 올렸다. 「${G.crewName}」의 항해가 시작된다!`;
}
function joinNavy(atDeparture) {
  if (G.stats.hp < 40) return '신체검사에서 떨어졌다. 체력을 기르고 다시 도전하자.';
  G.job = { ...G.job, type: 'navy', rank: 0, merit: G.place.navyBoost || G.family.key === 'navy' ? 6 : 0, captures: 0 };
  rec('해군 입대');
  checkRank();
  return atDeparture ? '하얀 수병복을 받았다. 오늘부터 해군 잡병이다.' : '늦깎이 신병이 되었다. 정의의 깃발 아래 새 인생이 시작된다.';
}
function gainPoneglyph(text) {
  G.flags.pg = (G.flags.pg || 0) + 1;
  if (G.flags.pg >= 4) rec('로드 포네그리프 4개 수집');
  return `${text} (로드 포네그리프 ${G.flags.pg}/4)`;
}
function jobTitle() {
  const j = G.job;
  switch (j.type) {
    case 'pirate': return PIRATE_STAGES[j.stage];
    case 'navy': return `해군 ${NAVY_RANKS[j.rank][0]}`;
    case 'civil': return G.flags.shop ? '가게 주인' : '마을 주민';
    case 'retired': return `은퇴한 ${j.prev}`;
    default: return '아직 없음';
  }
}

/* =========================================================
 *  게임 진행
 * ========================================================= */
function newGame({ name, gender, placeId, seed }) {
  const place = PLACES.find(p => p.id === placeId);
  G = {
    seed, rng: makeRng(seed + '|' + placeId), name: '', gender, place,
    time: 0, ticks: 0, age: 0, season: 0,
    stats: Object.fromEntries(STATS.map(s => [s.k, s.init])),
    tree: null, train: 0, fruit: null,
    job: { type: 'none', stage: 0, bounty: 0, rank: 0, merit: 0, captures: 0 },
    crewName: '', records: [], flags: {}, used: {},
    deltas: {}, notes: [], logs: [], queue: [], pending: null,
    speed: G ? G.speed : 1, paused: false, dead: false, deathCause: '',
  };
  G.name = name || pick(RANDOM_GIVEN);
  const famKey = wpick(Object.keys(place.fam), k => place.fam[k]);
  G.family = { key: famKey, ...FAMILIES[famKey] };
  G.stats.wealth = G.family.wealth;
  rec(`${G.family.name}에서 태어남`);
  G.deltas = {};
  log('탄생', `${place.sea} ${place.name}, ${G.family.name}에서 ${josa(G.name, '이', '가')} 태어났다. 대해적시대의 어느 봄날이었다.`, 'major');
}

function log(title, text, kind = '', extra = {}) {
  const deltas = Object.entries(G.deltas).map(([k, v]) => ({ k, v }));
  G.deltas = {};
  G.logs.unshift({ stamp: `${G.age}세 · ${SEASONS[G.season]}`, title, text, kind, deltas, ...extra });
  if (G.logs.length > 300) G.logs.length = 300;
}
function flushNotes() {
  for (const n of G.notes) log(n.title, n.text, n.kind);
  G.notes = [];
}

function upkeep() {
  const s = G.stats, d = D();
  const living = G.age < 18 && G.job.type === 'none';
  let eat = living && G.age < 12 ? 2 : 3;
  if (isPirate()) eat += Math.floor(s.crew / 25);
  add('food', -eat);

  if (living) {
    add('food', Math.round(G.family.support * d.support) + (G.place.foodBonus || 0) + (G.age >= 12 ? 1 : 0));
  } else {
    switch (G.job.type) {
      case 'navy': add('wealth', 1 + Math.floor(G.job.rank / 3)); add('food', 3 + Math.floor(s.crew / 30)); break;
      case 'pirate': add('food', 2 + R(0, 3) + Math.floor(s.crew / 30)); if (P(0.4)) add('wealth', R(1, 3)); break;
      case 'retired': add('food', 2); if (P(0.4)) add('wealth', 1); break;
      default: add('food', 3 + (G.place.foodBonus || 0)); if (P(0.5)) add('wealth', 1);
    }
  }
  if (s.food < 15 && s.wealth >= 4) { add('wealth', -4); add('food', 10); }
  const starving = s.food <= 0;
  if (starving) hurt(6);
  else if (s.food >= 20) add('hp', 1);
  if (G.age >= 50) add('hp', -1);
  G.deltas = {}; // 계절 정산은 로그에 남기지 않는다
  if (starving && !G.flags.starveLogged) log('굶주림', '먹을 것이 없다. 하루하루 몸이 말라간다.', 'bad');
  G.flags.starveLogged = starving;
  if (s.hp <= 0) G.deathCause = G.deathCause || (s.food <= 0 ? '굶주림으로 사망' : '병으로 사망');
}

function onNewYear() {
  G.age++;
  if (G.age === 10) G.queue.push('tree10');
  if (G.age === 18) G.queue.push('depart18');
  if (G.age >= 60) {
    const p = (G.age - 60) * 0.012 + Math.max(0, 50 - G.stats.hp) / 500;
    if (P(p)) { G.stats.hp = 0; G.deathCause = '노환으로 평온하게 눈을 감음'; }
  }
}

function pickEvent() {
  const d = D();
  const pool = EVENTS.filter(e => !e.forced && !(e.once && G.used[e.id]) && (!e.cond || e.cond()));
  return wpick(pool, e => {
    let w = e.w;
    if (e.tag === 'good') w *= d.goodW;
    if (e.tag === 'bad') w *= d.badW;
    if (e.id.startsWith('p_') || e.id.startsWith('n_')) w *= 1.5;
    return w;
  });
}

function startEvent(ev) {
  if (ev.once) G.used[ev.id] = true;
  if (ev.choices) {
    G.pending = { ev, text: typeof ev.text === 'function' ? ev.text() : ev.text };
    // 선택지 텍스트 중 함수형 enemy 는 렌더 시 계산
    return;
  }
  const text = ev.run();
  log(ev.title, text, ev.tag || '');
  flushNotes();
  checkDeath();
}

function choose(i) {
  if (!G || !G.pending) return;
  const { ev, text } = G.pending;
  const c = ev.choices[i];
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
  checkDeath();
  if (G.dead) return;
  if (G.queue.length) { startEvent(EV[G.queue.shift()]); return; }
  if (P(EVENT_CHANCE)) {
    const ev = pickEvent();
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
  const yearProg = (G.time % YEAR_SEC) / YEAR_SEC;
  $('#year-bar').style.width = (yearProg * 100).toFixed(2) + '%';
  let status;
  if (G.dead) status = '인생이 끝났다';
  else if (G.pending) status = '<b>선택 대기 중</b> — 시간이 멈췄다 (1~4 키로 선택)';
  else if (G.paused) status = '일시정지';
  else {
    const left = Math.ceil(((G.ticks + 1) * SEASON_SEC - G.time) / G.speed);
    status = `다음 계절까지 ${left}초 · 이벤트 확률 30%`;
  }
  $('#status-line').innerHTML = status;
  $('#btn-pause').textContent = G.paused ? '재개' : '일시정지';
}

function statRow(def) {
  const v = G.stats[def.k];
  let bar;
  if (def.min < 0) {
    const pct = Math.abs(v) / 2;
    const left = v >= 0 ? 50 : 50 - pct;
    bar = `<div class="stat-bar center"><div style="left:${left}%;width:${pct}%;background:${def.color}"></div></div>`;
  } else {
    bar = `<div class="stat-bar"><div style="left:0;width:${v}%;background:${def.color}"></div></div>`;
  }
  const low = (def.k === 'hp' && v <= 25) || (def.k === 'food' && v <= 10);
  return `<div class="stat${low ? ' low' : ''}"><div class="stat-top"><span>${def.label}</span><b>${v > 0 && def.min < 0 ? '+' : ''}${v}</b></div>${bar}</div>`;
}

function renderSide() {
  const p = G.place, j = G.job;
  let jobSub = '';
  if (j.type === 'none') jobSub = G.tree ? `꿈: ${{ pirate: '해적', navy: '해군', civil: '평범한 삶' }[G.tree]}` : '10살에 꿈을 정한다';
  if (j.type === 'pirate') jobSub = `${esc(G.crewName)}<br>현상금 <b>${fmtBounty(j.bounty)}</b>${j.stage >= 1 ? `<br>로드 포네그리프 ${G.flags.pg || 0}/4` : ''}`;
  if (j.type === 'navy') {
    const next = NAVY_RANKS[j.rank + 1];
    jobSub = `공적 ${j.merit}${next ? ` / 다음 계급 ${next[1]}` : ''} · 체포 ${j.captures}명${G.flags.rankBlock ? `<br><span style="color:var(--d-hard)">${G.flags.rankBlock}</span>` : ''}`;
  }
  const fruit = G.fruit
    ? `<div class="big fruit-name">${esc(G.fruit.name)}</div><div class="sub">${FRUIT_TYPES[G.fruit.type].name} · 전투 사망 확률 ×${FRUIT_TYPES[G.fruit.type].death} · 헤엄 불가</div>`
    : '<div class="big">없음</div><div class="sub">열매를 먹으면 싸움에서 죽을 확률이 줄어든다</div>';

  $('#side').innerHTML = `
    <div class="card"><h3>${esc(G.name)}</h3><div class="sub">${G.gender} · ${G.family.name}</div></div>
    <div class="card">
      <h3>${p.name}</h3>
      <dl class="kv"><dt>위치</dt><dd>${p.sea}</dd><dt>난이도</dt><dd><span class="badge d-${p.diff}">${p.diff}</span> ${DIFF[p.diff].name}</dd><dt>특이점</dt><dd>${p.tag}</dd></dl>
      <p class="desc">${p.desc}</p>
    </div>
    <div class="card"><div class="label">직업</div><div class="big">${jobTitle()}</div><div class="sub" style="margin-top:4px">${jobSub}</div><div class="sub" style="margin-top:6px">전투력 ${power()} · 단련 ${G.train}</div></div>
    <div class="card"><div class="label">악마의 열매</div>${fruit}</div>
    <div class="card">${STATS.map(statRow).join('')}</div>
    <div class="card"><div class="label">기록</div><div class="chips">${G.records.map((r, i) => `<span class="chip${i ? ' gold' : ''}">${esc(r)}</span>`).join('')}</div></div>
    <div class="card"><div class="label">시드</div><span class="seed-val">${esc(G.seed)}</span></div>`;
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
    const { ev, text } = G.pending;
    $('#pending').innerHTML = `<div class="event">
      <p class="eyebrow">${G.age}세 · ${SEASONS[G.season]} — 사건 발생</p>
      <h3>${ev.title}</h3><p>${esc(text)}</p>
      <div class="choices">${ev.choices.map((c, i) => {
        const ok = !c.cond || c.cond();
        let tag = c.tag || '';
        if (c.enemy !== undefined) {
          const e = typeof c.enemy === 'function' ? c.enemy() : c.enemy;
          tag = `⚔ 승산 ${Math.round(winChance(e) * 100)}%` + (c.tag ? ` · ${c.tag}` : '');
        }
        if (!ok) tag = c.need ? `${c.need} 필요` : '조건 미충족';
        return `<button class="choice" data-i="${i}" ${ok ? '' : 'disabled'}><span><span class="key">${i + 1}</span>${c.t}</span><span class="tag${c.tag === '위험' || c.enemy !== undefined ? ' risk' : ''}">${tag}</span></button>`;
      }).join('')}</div></div>`;
  } else {
    $('#pending').innerHTML = '';
  }
  $('#log').innerHTML = G.logs.map(l => `
    <article class="entry ${l.kind}">
      <div class="entry-head"><span class="stamp">${l.stamp}</span><span class="entry-title">${esc(l.title)}</span></div>
      ${l.sit ? `<p class="entry-sit">${esc(l.sit)}</p>` : ''}
      ${l.choice ? `<p class="entry-choice">▸ ${esc(l.choice)}</p>` : ''}
      <p class="entry-text">${esc(l.text)}</p>
      ${deltaChips(l.deltas)}
    </article>`).join('');
}

function renderAll() { renderTop(); renderSide(); renderLog(); }

function showEnd() {
  const j = G.job;
  $('#end-title').textContent = `${G.name}, ${G.age}세에 잠들다`;
  $('#end-cause').textContent = G.deathCause;
  let detail = '';
  if (j.type === 'pirate' || (j.type === 'retired' && j.bounty)) detail = `<dt>현상금</dt><dd>${fmtBounty(j.bounty)}</dd>`;
  if (j.captures) detail += `<dt>체포</dt><dd>${j.captures}명</dd>`;
  $('#end-body').innerHTML = `
    <dl class="kv"><dt>출생</dt><dd>${G.place.name} · ${G.family.name}</dd><dt>최종</dt><dd>${jobTitle()}</dd>${detail}
    <dt>열매</dt><dd>${G.fruit ? G.fruit.name : '없음'}</dd><dt>시드</dt><dd class="seed-val">${esc(G.seed)}</dd></dl>
    <div class="chips">${G.records.map(r => `<span class="chip gold">${esc(r)}</span>`).join('')}</div>`;
  setTimeout(() => $('#end').classList.remove('hidden'), 600);
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

let selPlace = 'foosha';
let selGender = '남성';
let lastStart = null;

function renderPlaces() {
  $('#place-grid').innerHTML = PLACES.map(p => `
    <button type="button" class="place${p.id === selPlace ? ' on' : ''}" data-id="${p.id}">
      <div class="place-top"><span class="place-name">${p.name}</span><span class="badge d-${p.diff}">${p.diff}</span></div>
      <span class="place-sea">${p.sea} · ${p.tag}</span>
      <span class="place-desc">${p.desc}</span>
    </button>`).join('');
}

function begin(opts) {
  lastStart = opts;
  newGame(opts);
  $('#start').classList.add('hidden');
  $('#end').classList.add('hidden');
  $('#game').classList.remove('hidden');
  renderSpeed();
  renderAll();
  window.scrollTo(0, 0);
}

function renderSpeed() {
  $('#speed').innerHTML = SPEEDS.map(s => `<button data-s="${s}" class="${G && G.speed === s ? 'on' : ''}">x${s}</button>`).join('');
}

function init() {
  $('#in-seed').value = newSeed();
  renderPlaces();

  $('#place-grid').addEventListener('click', e => {
    const b = e.target.closest('.place');
    if (!b) return;
    selPlace = b.dataset.id;
    renderPlaces();
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
    begin({ name: $('#in-name').value.trim(), gender: selGender, placeId: selPlace, seed });
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
  document.addEventListener('keydown', e => {
    if (!G || $('#game').classList.contains('hidden') || e.target.tagName === 'INPUT') return;
    if (G.pending && /^[1-4]$/.test(e.key)) { choose(+e.key - 1); e.preventDefault(); }
    else if (e.key === ' ') { G.paused = !G.paused; renderTop(); e.preventDefault(); }
  });

  $('#btn-same').addEventListener('click', () => begin(lastStart));
  $('#btn-new').addEventListener('click', () => {
    $('#end').classList.add('hidden');
    $('#game').classList.add('hidden');
    $('#start').classList.remove('hidden');
    $('#in-seed').value = newSeed();
    G = null;
  });

  requestAnimationFrame(frame);
}

init();

// 디버그/테스트용
window.__game = { get G() { return G; }, tick, choose, EVENTS };
