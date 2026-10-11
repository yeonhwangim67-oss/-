'use strict';

/* =========================================================
 *  대해적시대 연대기 — 데이터
 * ========================================================= */

const SEASON_SEC = 15;
const YEAR_SEC = 60;
const EVENT_CHANCE = 0.2;
const LORE_CHANCE = 0.15;          // 세계관 이야기 (사건과 별개)
const OLD_AGE = 80;                // 이 나이부터 노환 사망 확률이 생긴다
const OLD_AGE_STEP = 0.005;        // 해마다 0.5%씩 오른다
const EVENT_COOLDOWN = 8;
const NATURAL_HP = { kid: 75, adult: 80 };   // 자연 회복은 여기까지. 그 이상은 휴식·치료 이벤트로만          // 같은 이벤트는 최소 8계절(2년) 뒤에 다시 나온다
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
  EZ:     { name: '쉬움',   dmg: 0.7,  enemy: 0.85, death: 0.6,  badW: 0.7,  goodW: 1.4,  support: 1.5, young: 0.6, kidRegen: 1 },
  NORMAL: { name: '기본',   dmg: 1,    enemy: 1,    death: 1,    badW: 1,    goodW: 1,    support: 1, young: 0.7, kidRegen: 0.75 },
  HARD:   { name: '어려움', dmg: 1.25, enemy: 1.15, death: 1.35, badW: 1.35, goodW: 0.85, support: 0.8, young: 0.85, kidRegen: 0.5 },
  EX:     { name: '극한',   dmg: 1.5,  enemy: 1.3,  death: 1.7,  badW: 1.6,  goodW: 0.7,  support: 0.75, young: 1, kidRegen: 0.25 },
};

/* ---------- 출생지 ----------
 * pirateLand: 사황이 다스리는 섬 (떠돌이 해적선·해군 방문 이벤트 없음) */
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
  { id: 'cocoyasi',   name: '코코야시 마을',      sea: '동쪽 바다',   diff: 'HARD',   tag: '어인 해적단의 지배',
    desc: '귤밭이 펼쳐진 마을. 어인 아론 일당이 매달 목숨값을 뜯어간다.',
    fam: { poor: 5, normal: 3, orphan: 2 } },
  { id: 'shells',     name: '쉘스 타운',          sea: '동쪽 바다',   diff: 'NORMAL', tag: '해군 지부 마을',
    desc: '해군 제153지부가 있는 마을. 지부 대령 부자의 횡포가 심하다.',
    fam: { poor: 3, normal: 4, rich: 1, navy: 3, orphan: 1 }, navyBoost: true },
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
  { id: 'skypiea',    name: '스카이피아',         sea: '하늘섬',     diff: 'NORMAL', tag: '구름 위의 나라',
    desc: '해발 1만 미터 구름 위의 섬. 신을 자처하는 자가 섬을 내려다본다.',
    fam: { poor: 2, normal: 5, rich: 1, orphan: 1 } },
  { id: 'drum',       name: '드럼 섬',            sea: '위대한 항로', diff: 'HARD',   tag: '혹한의 설국',
    desc: '일 년 내내 눈이 내리는 섬. 추위와 폭군의 상처가 남아 있다.',
    fam: { poor: 4, normal: 3, rich: 1, orphan: 2 } },
  { id: 'marineford', name: '마린포드',           sea: '위대한 항로', diff: 'NORMAL', tag: '해군 본부',
    desc: '정의의 깃발이 펄럭이는 해군 본부의 섬. 해군의 길이 활짝 열려 있다.',
    fam: { normal: 4, rich: 1, navy: 6, orphan: 1 }, navyBoost: true },
  { id: 'sabaody',    name: '샤본디 제도',        sea: '위대한 항로', diff: 'HARD',   tag: '인간 경매장',
    desc: '맹그로브 위 비눗방울의 섬. 천룡인과 인간 사냥꾼의 그림자가 짙다.',
    fam: { poor: 3, normal: 3, rich: 1, orphan: 3, pirate: 2 } },
  { id: 'fishman',    name: '어인섬',             sea: '해저 1만 미터', diff: 'NORMAL', tag: '바다 밑의 왕국',
    desc: '거품에 싸인 해저 왕국. 인간에 대한 오랜 원한이 아직 남아 있다.',
    fam: { poor: 3, normal: 4, rich: 1, orphan: 2 } },
  { id: 'wholecake',  name: '홀케이크 아일랜드',  sea: '신세계',     diff: 'EZ',     tag: '과자의 나라',
    desc: '사황 빅 맘의 영토. 과자와 케이크가 넘치는, 겉보기엔 낙원.',
    fam: { normal: 4, rich: 3, poor: 2, pirate: 2 }, foodBonus: 1, pirateLand: true },
  { id: 'zou',        name: '조 (모코모 공국)',    sea: '신세계',     diff: 'EZ',     tag: '코끼리 등 위의 나라',
    desc: '천 년을 걷는 거대 코끼리 등 위, 밍크족의 나라. 정이 많고 평화롭다.',
    fam: { poor: 2, normal: 5, rich: 2 } },
  { id: 'dressrosa',  name: '드레스로자',         sea: '신세계',     diff: 'HARD',   tag: '사랑과 정열의 나라',
    desc: '화려한 나라. 그 이면엔 돈키호테 패밀리의 지배와 장난감의 비밀이 있다.',
    fam: { poor: 3, normal: 3, rich: 2, orphan: 2, pirate: 1 } },
  { id: 'wano',       name: '와노쿠니',           sea: '신세계',     diff: 'HARD',   tag: '쇄국의 나라',
    desc: '사무라이의 나라. 쇼군 오로치의 폭정 아래 백성은 굶주린다.',
    fam: { poor: 6, normal: 2, rich: 1, orphan: 2 } },
  { id: 'elbaf',      name: '엘바프',             sea: '신세계',     diff: 'HARD',   tag: '거인족의 나라',
    desc: '거인 전사들의 섬. 이곳에서는 강자만이 존중받는다.',
    fam: { poor: 3, normal: 4, orphan: 1, pirate: 2 } },
  { id: 'onigashima', name: '오니가시마',         sea: '신세계',     diff: 'EX',     tag: '백수 해적단 본거지',
    desc: '사황 카이도우의 섬. 이곳에서 살아남는 것 자체가 시험이다.',
    fam: { poor: 3, orphan: 5, pirate: 4 }, pirateLand: true },
];

/* ---------- 집안 (가정 형편) ---------- */
const FAMILIES = {
  poor:   { name: '가난한 집',   wealth: 8,  support: 2, born: '가난한 집에서 태어남' },
  normal: { name: '평범한 집',   wealth: 20, support: 3, born: '평범한 집에서 태어남' },
  rich:   { name: '부유한 집',   wealth: 45, support: 4, born: '부유한 집에서 태어남' },
  orphan: { name: '고아',        wealth: 0,  support: 1, born: '부모 없이 고아로 자람' },
  pirate: { name: '해적의 집',   wealth: 12, support: 2, born: '해적의 아이로 태어남' },
  navy:   { name: '해군 집안',   wealth: 25, support: 3, born: '해군 집안에서 태어남' },
  celestial: { name: '천룡인',     wealth: 95, support: 5, born: '천룡인으로 태어남' },
  fallen: { name: '몰락한 천룡인', wealth: 3,  support: 1, born: '몰락한 천룡인' },
};

/* 선택 화면에 나오지 않는 장소 (가문·이벤트로만 간다) */
const EXTRA_PLACES = [
  { id: 'marijoa', name: '성지 마리조아', sea: '레드 라인 꼭대기', diff: 'EZ', tag: '천룡인의 성지',
    desc: '세계 정부 창조주들의 후손, 천룡인이 사는 성지. 지상의 사람들은 이곳을 올려다볼 뿐이다.', fam: { celestial: 1 } },
  { id: 'northvillage', name: '북쪽 바다 외딴 마을', sea: '북쪽 바다', diff: 'HARD', tag: '몰락한 자의 피난처',
    desc: '천룡인을 증오하는 사람들이 사는 가난한 마을. 이곳에 신분을 숨길 곳은 없다.', fam: { poor: 1 } },
];

/* ---------- 가문 (혈통) ----------
 * king: 패왕색 소질 확률 · deathMul/dmgMul: 전투 사망/피해 배율 · pow: 전투력 보너스
 * gain: 스탯 상승 배율 · xp: 기술 숙련 배율 · family: 집안 고정 · places: 출생지별 무작위 가중치 */
const LINEAGES = [
  { id: 'none', name: '평범한 혈통', w: 60,
    desc: '특별할 것 없는 핏줄. 모든 것은 스스로 정한다.' },
  { id: 'd', name: 'D의 일족', w: 4, king: 0.35, deathMul: 0.85, bountyMul: 1.2,
    desc: '이름에 D를 품은 자. 패왕색의 소질이 높고 죽음 앞에서 웃는다. 현상금이 빨리 오른다.' },
  { id: 'vinsmoke', name: '빈스모크 가문', w: 2, family: 'rich', pow: 10, dmgMul: 0.85, gain: { conn: 0.8 },
    desc: '전투 국가 제르마 66의 왕족. 혈통 인자 개조로 강철 같은 몸을 가졌다. 대신 정이 부족하다.' },
  { id: 'kozuki', name: '코즈키 가문', w: 2, xp: { sword: 1.6 }, poneglyph: true, places: { wano: 12 },
    desc: '와노쿠니 옛 쇼군의 핏줄. 검술 숙련이 빠르고 포네그리프를 읽을 수 있다.' },
  { id: 'charlotte', name: '샬롯 가문', w: 2, family: 'rich', foodBonus: 1, gain: { crew: 1.3 }, places: { wholecake: 15 },
    desc: '빅 맘의 수많은 자식 중 하나. 먹을 것이 넘치고 형제가 많아 사람을 모으기 쉽다.' },
  { id: 'nefeltari', name: '네펠타리 왕가', w: 2, family: 'rich', gain: { conn: 1.4, rep: 1.2 }, places: { alabasta: 12 },
    desc: '아라바스타의 왕족. 백성의 신망을 받으며 인맥과 평판이 잘 쌓인다.' },
  { id: 'hero', name: '해군 영웅의 가문', w: 3, family: 'navy', xp: { arm: 1.4 }, meritMul: 1.3, haki: true, places: { marineford: 10, shells: 4 },
    desc: '전설적인 해군 영웅의 피. 일찍 패기에 눈뜨고 무장색이 강하며, 해군에서 공적을 빨리 쌓는다.' },
  { id: 'donquixote', name: '돈키호테 가문', w: 2, family: 'celestial', forcePlace: 'marijoa', king: 0.2, gain: { rep: 0.7 }, places: { dressrosa: 6 },
    desc: '천룡인 가문. 성지 마리조아에서 천룡인으로 태어난다(출생지 선택 무시). 여덟 살에 운명이 바뀐다. 평판이 잘 오르지 않는다.' },
  { id: 'giant', name: '엘바프 전사의 피', w: 2, pow: 8, maxHp: 15, longevity: 0.4, places: { elbaf: 15 },
    desc: '거인족 전사의 피가 섞였다. 체격이 크고 힘이 세며 쉽게 쓰러지지 않는다. 오래 산다.' },
  { id: 'lunarian', name: '루나리아족의 후예', w: 1, deathMul: 0.75, dmgMul: 0.9, gain: { rep: 0.8 },
    desc: '멸족했다던 붉은 땅 위의 민족. 불꽃을 두른 몸은 웬만해선 죽지 않는다. 정부가 노린다.' },
];

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

/* ---------- 기술 ----------
 * 숙련도(xp)가 차면 다음 단계. 필요 숙련 = base + 현재단계 × step
 * pow: 단계당 전투력, bonus: 마지막 단계 추가 전투력 */
const SKILLS = {
  sword:     { name: '검술',   levels: ['검술 입문', '일도류', '이도류', '삼도류', '검호'], base: 10, step: 10, pow: 6, bonus: 10, bonusName: '대검호' },
  rokushiki: { name: '육식',   levels: ['면도', '철괴', '지건', '월보', '람각', '체풍'], base: 12, step: 4, pow: 4, bonus: 12, bonusName: '육왕총' },
  obs:       { name: '견문색', levels: ['견문색 입문', '견문색 숙련', '미래시'], base: 15, step: 15, pow: 5 },
  arm:       { name: '무장색', levels: ['무장색 입문', '무장 경화', '유류 (내부 파괴)'], base: 15, step: 18, pow: 8 },
  king:      { name: '패왕색', levels: ['패왕색 각성', '패왕색 제어', '패왕색 부여'], base: 20, step: 20, pow: 10 },
};
const SKILL_EFFECT = {
  sword: '단계마다 전투력 +6',
  rokushiki: '철괴: 받는 피해 감소 · 월보: 도주/익사 회피 · 체풍: 사망 확률 감소',
  obs: '사망 확률 감소 · 도주 성공률 증가',
  arm: '전투력 크게 증가 · 경화부터 받는 피해 감소',
  king: '약한 적은 싸우지 않고 기절시킨다',
};

/* ---------- 직업 ---------- */
const PIRATE_STAGES = ['해적', '칠무해', '사황', '대해적'];
const NAVY_RANKS = [
  ['잡병', 0], ['상등병', 5], ['조장', 11], ['소위', 19], ['중위', 28], ['대위', 39], ['소령', 51],
  ['중령', 65], ['대령', 82], ['준장', 102], ['소장', 125], ['중장', 155], ['대장', 250], ['원수', 360],
];
const ENEMY_CREWS = ['검은 이빨', '붉은 코', '철퇴', '바다뱀', '해골 깃발', '폭풍 까마귀', '외눈 상어', '황금 갈고리', '피의 장미', '녹슨 닻', '쌍두 독수리', '푸른 불꽃'];
const RANDOM_GIVEN = ['루', '에이', '조로', '나미', '우솝', '로빈', '사보', '마르코', '스모', '코우', '타시기', '페로', '비비', '레베카', '키드', '바질', '히요리', '시라호'];
const HEADLINES = [
  '「신세계에서 사황끼리 충돌, 섬 하나가 사라지다」',
  '「해군 본부, 신형 군함 진수」',
  '「혁명군, 또 한 나라를 해방」',
  '「세계회의 개최 임박, 각국 왕족 마리조아로」',
  '「루키 해적단, 위대한 항로 입성」',
  '「천룡인 피습 사건, 범인은 아직 오리무중」',
  '「바다 열차 신규 노선 개통」',
];

/* ---------- 네임드 해적단 ----------
 * power: 전투력 · kill: 싸울 때 즉사 위험 · crew: 입단 시 선원 보정(승률)
 * perk: 입단 중 이점 (pow, deathMul, dmgMul, bountyMul, gain, foodBonus, escape, hakiOpen) */
const NAMED_CREWS = {
  whitebeard: { name: '흰수염 해적단', boss: '「흰수염」', power: 175, kill: 0.15, crew: 60, tier: '사황',
    perk: { deathMul: 0.75, pow: 10 }, perkText: '「아들」을 지키는 아버지: 사망 확률 ×0.75, 전투력 +10' },
  redhair: { name: '빨간 머리 해적단', boss: '「빨간 머리」', power: 170, kill: 0.12, crew: 50, tier: '사황',
    perk: { pow: 8, gain: { conn: 1.3 }, hakiOpen: true }, perkText: '패기의 해적단: 패기 개방, 인맥 상승 ×1.3, 전투력 +8' },
  bigmom: { name: '빅 맘 해적단', boss: '「빅 맘」', power: 165, kill: 0.15, crew: 60, tier: '사황',
    perk: { pow: 5, foodBonus: 2 }, perkText: '과자의 나라: 매 계절 식량 +2, 전투력 +5' },
  beasts: { name: '백수 해적단', boss: '「백수」', power: 180, kill: 0.2, crew: 60, tier: '사황',
    perk: { pow: 15, dmgMul: 0.85, gain: { rep: 0.7 } }, perkText: '강자의 군단: 전투력 +15, 받는 피해 ×0.85, 평판 상승 ×0.7' },
  blackbeard: { name: '검은수염 해적단', boss: '「검은수염」', power: 160, kill: 0.2, crew: 40, tier: '사황',
    perk: { pow: 8, bountyMul: 1.3, gain: { rep: 0.7 } }, perkText: '어둠의 야심: 현상금 ×1.3, 전투력 +8, 평판 상승 ×0.7' },
  strawhat: { name: '밀짚모자 일당', boss: '「밀짚모자」', power: 150, kill: 0.1, crew: 15, tier: '루키',
    perk: { deathMul: 0.8, bountyMul: 1.5, gain: { conn: 1.3 } }, perkText: '세계를 뒤흔드는 일당: 현상금 ×1.5, 사망 확률 ×0.8, 인맥 ×1.3' },
  heart: { name: '하트 해적단', boss: '「죽음의 외과의」', power: 115, kill: 0.08, crew: 20, tier: '루키',
    perk: { pow: 5, dmgMul: 0.85, natural: 10 }, perkText: '의사 선장: 받는 피해 ×0.85, 자연 회복 상한 +10' },
  kid: { name: '키드 해적단', boss: '「캡틴 키드」', power: 115, kill: 0.1, crew: 20, tier: '루키',
    perk: { pow: 10, bountyMul: 1.3 }, perkText: '난폭한 루키: 전투력 +10, 현상금 ×1.3' },
  hawkins: { name: '호킨스 해적단', boss: '「마술사」', power: 105, kill: 0.3, crew: 20, tier: '루키',
    perk: { deathMul: 0.7, escape: 0.1 }, perkText: '점괘와 짚인형: 사망 확률 ×0.7, 도주 +10%' },
};

/* ---------- 세계관 이야기 (스탯 변화 없음) ---------- */
const LORE = [
  { title: '뉴스 쿠', text: () => `신문 배달 갈매기가 지붕에 신문을 떨어뜨렸다. 1면: ${pick(HEADLINES)}` },
  { title: '빙크스의 술', text: '어디선가 「빙크스의 술을 전하러 가세」 노랫소리가 바람을 타고 들려왔다.' },
  { title: '새 수배서', text: '해군 게시판에 새 수배서가 붙었다. 사진 속 루키들은 하나같이 웃고 있다.' },
  { title: '영상 전전벌레', text: '광장의 영상 전전벌레가 먼 바다의 소식을 비췄다. 사람들이 모여들었다.' },
  { title: '로그 포스', text: '여행자의 로그 포스 바늘이 다음 섬을 가리키며 떨렸다. 위대한 항로에서는 나침반이 듣지 않는다.', cond: () => G.age >= 8 },
  { title: '유령선 목격담', text: '안개 낀 밤바다에서 노래하는 해골이 탄 배를 봤다는 소문이 돈다.' },
  { title: '해적왕의 전설', text: '노인들이 모이면 꼭 골드 로저 이야기다. "그 남자가 마지막에 웃었지."' },
  { title: '하늘에서 떨어진 배', text: '하늘에서 낡은 범선이 떨어져 바다에 처박혔다. 하늘섬이 정말 있는 걸까.' },
  { title: '혁명군의 소문', text: '어느 왕국이 하룻밤 사이에 뒤집혔다는 소문. 사람들은 「혁명가 드래곤」의 이름을 속삭인다.' },
  { title: '천재 과학자', text: '세계 정부의 천재 과학자가 인공 악마의 열매를 만들었다는 소문이 돈다.' },
  { title: '쌍둥이 곶의 고래', text: '레드 라인에 머리를 박는 거대한 고래 이야기를 들었다. 50년째 동료를 기다린다고 한다.' },
  { title: '세계 최강의 남자', text: '「세계 최강의 남자」가 어느 바다를 지나갔다는 소식만으로 해군 지부들이 긴장했다.' },
  { title: '바다 열차', text: '안개 너머로 바다 열차의 기적 소리가 길게 울렸다.', cond: () => G.place.id === 'water7' || G.place.id === 'loguetown' },
  { title: '흘러온 포스터', text: '바다에서 젖은 포스터를 건졌다. 「세계 귀족 마리조아 방문 환영」.', cond: () => G.age >= 6 },
  { title: '공백의 100년', text: '역사를 연구하던 학자가 정부에 끌려갔다는 소문. 이 세상엔 말해선 안 되는 역사가 있다.' },
  { title: '바다의 별', text: '맑은 밤, 수평선 위로 유성이 길게 떨어졌다. 뱃사람들은 그걸 바다의 별이라 불렀다.' },
  { title: '바다의 쓰레기', text: '해안에 해적 깃발 조각이 떠밀려 왔다. 어느 해적단의 마지막일까.' },
  { title: '갈매기 우편', text: '갈매기가 소포를 물고 이 집 저 집 창문을 두드린다. 누군가의 생일 선물인 모양이다.' },
  { title: '고래 떼', text: '수평선 너머로 거대한 고래 떼가 지나갔다. 바다는 생각보다 훨씬 넓다.' },
  { title: '현상금 사냥꾼의 이야기', text: '주점에서 왕년의 현상금 사냥꾼이 「해적 사냥꾼」이라 불리던 검사 이야기를 늘어놓는다.', cond: () => G.age >= 10 },
  { title: '바다왕류의 울음', text: '깊은 밤, 바다 밑에서 거대한 울음소리가 들려왔다. 아무도 잠들지 못했다.' },
  { title: '기록 지침', text: '항구에 정박한 배의 항해사가 「영구 지침」을 자랑하며 보여줬다.', cond: () => G.age >= 8 },
  { title: '해군 기념일', text: '해군 창설 기념일이다. 군함마다 깃발이 걸리고 예포 소리가 울렸다.' },
  { title: '거품 산호', text: '샤본디에서 왔다는 상인이 거품을 뿜는 산호를 팔고 있다.' },
  { title: '이상한 날씨', text: '아침엔 눈이, 점심엔 폭염이, 저녁엔 번개가 쳤다. 위대한 항로의 날씨는 믿을 게 못 된다.', cond: () => G.place.sea !== '동쪽 바다' },
  { title: '세계 지도', text: '벽에 걸린 세계 지도를 들여다봤다. 레드 라인과 위대한 항로가 세상을 넷으로 가르고 있다.' },
  { title: '전설의 대장장이', text: '어떤 칼이든 고칠 수 있다는 늙은 대장장이 이야기를 들었다. 최상대쾌도 12공이라나.' },
  { title: '사이퍼 폴', text: '검은 정장을 입은 사람들이 항구를 서성인다. 정부의 첩보원이라는 소문이다.' },
  { title: '해적 깃발 유행', text: '아이들 사이에 직접 그린 해적 깃발을 흔드는 놀이가 유행이다.' },
  { title: '눈물의 이별', text: '항구에서 어떤 해적이 고향 사람들에게 등을 돌린 채 손만 높이 들어 작별했다.' },
  { title: '밤하늘의 섬', text: '구름 사이로 섬 그림자가 보였다고 다들 수군거린다.' },
  { title: '어인의 노래', text: '바다 너머에서 인어의 노랫소리가 들린다는 어부들의 이야기.' },
  { title: '세계 정부의 공고', text: '「역사의 본문을 해독하는 자는 극형에 처한다」. 오래된 공고문이 아직 붙어 있다.' },
  { title: '해적 사냥 축제', text: '현상금 수배서를 들고 해적 흉내를 내는 이상한 축제가 열렸다.' },
  { title: '바다 열차 사고', text: '바다 열차가 폭풍 속에서 멈춰 섰다는 소식. 승객들은 무사하다고 한다.' },
  { title: '신의 기사단', text: '마리조아에 「신의 기사단」이라는 것이 있다는 소문이 돈다. 본 사람은 없다.' },
  { title: '큰 별이 지다', text: '먼 바다에서 한 시대를 풍미한 해적이 죽었다는 소식이 전해졌다. 사람들은 잔을 들었다.', cond: () => G.age >= 15 },
  { title: '해적의 묘지', text: '이름 없는 해적들의 무덤이 늘어선 언덕을 지났다. 칼과 모자만 남아 있다.', cond: () => G.age >= 12 },
  { title: '술병 속 지도', text: '술병 속 편지에 그려진 섬 지도는 어디에도 없는 모양이다. 장난이겠지.' },
  { title: '해군 영웅의 동상', text: '광장에 해군 영웅의 동상이 세워졌다. 주먹을 불끈 쥔 모습이다.' },
];
