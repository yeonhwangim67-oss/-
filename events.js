'use strict';

/* =========================================================
 *  이벤트
 *  w: 가중치 · tag: good/bad (난이도 보정) · cond: 발생 조건
 *  once: 한 번만 · cd: 재등장 대기(계절, 기본 8)
 *  choices 가 있으면 선택 대기, 없으면 run 즉시 실행
 * ========================================================= */

/** 그 지역에 살고 있는가 (바다에 나가면 지역 이벤트는 끝) */
const home = id => G.place.id === id && !atSea();

/** 오니가시마에 살고 있는가 (탈출하면 섬 이벤트 종료) */
const onOni = () => G.place.id === 'onigashima' && !atSea() && !G.flags.escaped;

const DEAD_TEXT = '치명상을 입고 쓰러졌다…';

/** 결과 문구 헬퍼: fight 결과에 맞는 문장 반환 */
function fightResult(r, win, lose) {
  if (r === 'dead') return DEAD_TEXT;
  return r === 'win' ? win() : lose();
}

/** 훈련 이벤트 공통 선택지 */
function trainingChoices(main) {
  const list = [];
  if (main === 'rokushiki') list.push({ t: '육식 수련', run: () => { learn('rokushiki', R(5, 8)); return pick(['지건으로 강철판을 꿰뚫는 연습을 했다.', '면도로 순식간에 열 걸음을 좁혔다.', '공중을 박차는 월보에 매달렸다.']); } });
  if (main === 'sword') list.push({ t: '검술 수련', run: () => { learn('sword', R(5, 8)); return pick(['폭포를 베는 연습을 했다.', '천 번의 내려베기를 마쳤다.', '동료와 목검으로 대련했다.']); } });
  list.push({ t: '견문색 수련', cond: () => canHaki(), need: '패기 미개방', run: () => { learn('obs', R(4, 7)); return '눈을 가리고 날아오는 돌을 피하는 훈련을 했다.'; } });
  list.push({ t: '무장색 수련', cond: () => canHaki(), need: '패기 미개방', run: () => { learn('arm', R(4, 7)); return '주먹에 검은 기운을 두르는 감각을 붙잡으려 애썼다.'; } });
  list.push({ t: '기초 체력', run: () => { train(R(2, 4)); add('hp', 3); return '무거운 닻을 짊어지고 갑판을 수백 바퀴 돌았다.'; } });
  return list.slice(0, 4);
}

const EVENTS = [
  /* =================== 강제 이벤트 =================== */
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
      { t: '마을에 남는다', run: () => { G.job.type = 'civil'; rec('고향에 남음'); return '바다는 언제든 그 자리에 있다. 당분간은 고향에서 일하며 살기로 했다.'; } },
    ] },

  /* =================== 유년기 (0~9) =================== */
  { id: 'c_beach', w: 2, cond: () => G.age >= 3 && G.age < 10 && G.place.id !== 'skypiea', title: '바닷가에서',
    text: '썰물이 빠진 바닷가. 오늘은 무엇을 하며 놀까?',
    choices: [
      { t: '조개와 동전을 줍는다', run: () => { if (P(0.65)) { add('wealth', R(1, 4)); return pick(['반짝이는 조개껍데기와 동전 몇 닢을 주웠다.', '모래 속에서 녹슨 은화 한 닢을 찾았다.']); } hurt(3); return '바위에서 미끄러져 무릎이 까졌다.'; } },
      { t: '파도와 겨루며 헤엄친다', tag: '위험', run: () => { if (P(0.75)) { train(2); return '파도를 넘으며 팔다리에 힘이 붙었다.'; } hurt(R(4, 7)); return '역류에 휩쓸렸다가 어부에게 건져졌다.'; } },
      { t: '병 속 편지를 찾는다', run: () => { if (P(0.4)) { add('conn', 3); return '머나먼 섬 아이의 편지였다. 답장을 써서 다시 띄워 보냈다.'; } return '빈 병만 잔뜩 주웠다.'; } },
    ] },
  { id: 'c_bully', w: 2, cond: () => G.age >= 5 && G.age < 13, title: '골목대장',
    text: '동네 골목대장이 당신의 간식을 빼앗으려 한다.',
    choices: [
      { t: '맞선다', enemy: 20, run: () => fight(20, 0, '골목대장') === 'win'
          ? (add('rep', 3), '골목대장을 넘어뜨렸다! 아이들 사이에 소문이 퍼졌다.')
          : '흠씬 두들겨 맞았다. 다음엔 지지 않겠다고 다짐한다.' },
      { t: '간식을 나눈다', run: () => { add('food', -2); add('conn', 4); return '나눠 먹다 보니 어느새 친구가 되었다.'; } },
      { t: '도망친다', run: () => '재빨리 골목을 빠져나왔다.' },
    ] },
  { id: 'c_pirateship', w: 2, cond: () => G.age >= 4 && G.age < 14 && !G.place.pirateLand, title: '해적선 입항',
    text: () => G.place.id === 'foosha'
      ? '빨간 머리 선장이 이끄는 해적단이 항구에 닻을 내렸다. 선원들은 마키노 씨의 주점에서 떠들썩하게 마신다.'
      : `「${pick(ENEMY_CREWS)} 해적단」의 깃발을 단 배가 항구에 들어왔다. 어른들은 문을 걸어 잠갔다.`,
    choices: [
      { t: '집에 숨는다', run: () => '창틈으로 지켜보다가 해적선이 떠나는 것을 보았다.' },
      { t: '몰래 구경한다', run: () => {
          if (P(G.place.id === 'foosha' ? 0.8 : 0.5)) { add('conn', 5); G.flags.metPirate = true; rec('해적 선장을 만남');
            return G.place.id === 'foosha'
              ? '선장이 당신을 무릎에 앉히고 바다 이야기를 들려주었다. "넌 커서 뭐가 될 거냐?"'
              : '선장이 껄껄 웃으며 당신의 어깨를 두드렸다. "배짱 좋은 꼬마로군."'; }
          hurt(3); return '해적에게 들켜 쫓겨났다.';
        } },
    ] },
  { id: 'c_navyvisit', w: 1.5, cond: () => G.age >= 4 && G.age < 14 && !G.place.pirateLand, title: '해군 함대 방문',
    text: '"정의"라고 적힌 하얀 코트를 걸친 장교들이 항구에 내렸다.',
    choices: [
      { t: '손을 흔든다', run: () => { add('rep', 2); G.flags.inspiredNavy = true; return '장교가 경례로 답해 주었다. 오래 기억에 남을 장면이다.'; } },
      { t: '이것저것 물어본다', run: () => { add('conn', 3); G.flags.inspiredNavy = true; return '젊은 병사가 귀찮아하면서도 군함 이야기를 들려주었다.'; } },
      { t: '군함에 몰래 올라탄다', tag: '위험', run: () => { if (P(0.5)) { train(2); add('conn', 2); return '갑판을 구경하다 들켰지만 함장이 껄껄 웃으며 포 쏘는 걸 보여줬다.'; } hurt(4); add('rep', -2); return '들켜서 엉덩이를 맞고 쫓겨났다.'; } },
    ] },
  { id: 'c_cold', w: 1.5, tag: 'bad', cond: () => G.age < 12, title: '감기',
    run: () => { hurt(R(2, 4)); return pick(['콧물을 훌쩍이며 며칠을 보냈다.', '비를 맞고 놀다가 감기에 걸렸다.', '기침이 멎지 않아 한동안 집에만 있었다.']); } },
  { id: 'c_fever', w: 0.6, cd: 24, tag: 'bad', cond: () => G.age < 12, title: '열병',
    run: () => {
      hurt(R(5, 9));
      if (G.stats.wealth >= 8 && P(0.7)) { add('wealth', -4); add('hp', 4); return '심한 열이 났지만 의사가 와서 금방 나았다.'; }
      add('hp', 2); return '며칠을 앓았지만 끝내 이겨냈다.';
    } },
  { id: 'c_friend', w: 2, tag: 'good', cond: () => G.age >= 4 && G.age < 16 && !isCelestial(), title: '새 친구',
    text: () => pick(['이웃 마을에서 온 아이가 말을 걸어왔다.', '말수 적은 대장장이 아들이 당신을 따라다닌다.', '거짓말쟁이로 소문난 아이가 같이 놀자고 한다.']),
    choices: [
      { t: '비밀 기지를 함께 만든다', run: () => { add('conn', R(3, 5)); train(1); return '바닷가 동굴에 둘만의 기지를 만들었다.'; } },
      { t: '바다를 누비자고 약속한다', run: () => { add('conn', 4); G.flags.promise = true; return '"언젠가 같이 배를 타자!" 새끼손가락을 걸었다.'; } },
      { t: '누가 더 센지 겨룬다', enemy: 18, run: () => fightResult(fight(18, 0, '친구'),
          () => { add('conn', 3); return '이겼다. 친구는 분해하면서도 웃었다.'; },
          () => { add('conn', 3); return '졌다. 둘이 나란히 누워 하늘을 봤다.'; }) },
    ] },
  { id: 'c_festival', w: 1.5, tag: 'good', cond: () => G.age < 18, title: '마을 축제',
    text: () => pick(['풍어제가 열렸다. 온 마을이 들떠 있다.', '불꽃놀이 축제의 날이다.', '수확제가 열렸다. 광장에 음식 냄새가 가득하다.']),
    choices: [
      { t: '배불리 먹는다', run: () => { add('food', R(5, 9)); add('hp', 3); return '배가 터질 때까지 먹었다.'; } },
      { t: '씨름 대회에 나간다', enemy: 22, run: () => fightResult(fight(22, 0, '동네 씨름꾼'),
          () => { add('rep', 5); add('food', 4); return '우승했다! 상품으로 커다란 고기를 받았다.'; },
          () => '첫판에 모래판에 처박혔다.') },
      { t: '노점 일을 돕는다', run: () => { add('wealth', R(2, 5)); add('conn', 2); return '하루 종일 꼬치를 굽고 용돈을 받았다.'; } },
    ] },
  { id: 'c_lost', w: 1, tag: 'bad', cond: () => G.age >= 4 && G.age < 10, title: '길을 잃다',
    run: () => {
      if (P(0.4)) { train(3); return '숲에서 길을 잃었다가 이상한 노인을 만나 사흘간 몸 쓰는 법을 배웠다.'; }
      hurt(3); add('food', -3); return '숲에서 길을 잃고 하룻밤을 굶었다.';
    } },
  { id: 'c_books', w: 1.5, once: true, celestial: true, cond: () => G.age >= 6 && G.age < 16, title: '오래된 책',
    text: '다락에서 먼지 쌓인 책 꾸러미를 발견했다.',
    choices: [
      { t: '항해술 책을 읽는다', run: () => { train(1); G.flags.navigation = true; rec('항해술을 익힘'); return '별을 보고 방향을 읽는 법을 익혔다. (도주 성공률 상승)'; } },
      { t: '역사책을 읽는다', run: () => { add('conn', 2); G.flags.history = true; return '"공백의 100년"이라는 이상한 단어가 머리에서 떠나지 않는다.'; } },
      { t: '책 따위 덮고 논다', run: () => { add('hp', 4); return '하루 종일 뛰어놀았다.'; } },
    ] },
  { id: 'c_pet', w: 1, once: true, cond: () => G.age >= 4 && G.age < 14, title: '떠돌이 동물',
    text: '다리를 다친 작은 동물이 집 앞에 쓰러져 있다.',
    choices: [
      { t: '데려와 돌본다', run: () => { add('food', -3); add('conn', 3); G.flags.pet = true; rec('작은 친구가 생김'); return '정성껏 돌보자 어디든 졸졸 따라다니게 되었다.'; } },
      { t: '그냥 둔다', run: () => '마음이 쓰였지만 지나쳤다.' },
    ] },
  { id: 'c_fishing', w: 1.5, tag: 'good', cond: () => G.age >= 5 && G.age < 15 && !G.place.pirateLand, title: '낚시',
    text: '낚싯대를 메고 나왔다. 어디로 갈까?',
    choices: [
      { t: '방파제에서 낚는다', run: () => { add('food', R(3, 6)); return pick(['팔뚝만 한 물고기를 낚았다!', '종일 앉아 있다가 마지막에 겨우 한 마리.']); } },
      { t: '쪽배로 먼바다에 나간다', tag: '위험', run: () => { if (P(0.6)) { add('food', R(8, 12)); train(1); return '커다란 참치를 끌어올렸다! 마을 어른들이 놀랐다.'; } hurt(R(4, 8)); return '바다왕류 새끼에게 쪽배가 뒤집혔다.'; } },
      { t: '잡은 걸 시장에 판다', run: () => { add('wealth', R(2, 4)); return '몇 마리 낚아 시장에 팔았다.'; } },
    ] },
  { id: 'c_model', w: 1, cond: () => G.age >= 6 && G.age < 14, title: '모형 배',
    run: () => { add('conn', 2); train(1); return '나뭇조각으로 작은 범선을 만들었다. 언젠가 진짜 배를 만들 거다.'; } },
  { id: 'c_story', w: 1, once: true, cond: () => G.age >= 4 && G.age < 12, title: '할머니의 옛이야기',
    run: () => { G.flags.roger = true; add('conn', 1); return '"옛날에 골드 로저라는 해적이 있었단다. 그는 세상의 모든 것을 손에 넣었지…" 잠이 오지 않는 밤이었다.'; } },
  { id: 'c_rival', w: 1, once: true, cond: () => G.age >= 6 && G.age < 14, title: '라이벌',
    text: '무엇이든 당신과 겨루려 드는 아이가 나타났다.',
    choices: [
      { t: '받아준다', run: () => { G.flags.rival = true; train(2); rec('평생의 라이벌'); return '달리기, 씨름, 수영… 매일 겨뤘다. 언젠가 바다에서 다시 만나자고 약속했다.'; } },
      { t: '무시한다', run: () => '그 아이는 씩씩거리며 떠났다.' },
    ] },
  { id: 'c_newscoo', w: 1, cond: () => G.age >= 6 && G.age < 18, title: '뉴스 쿠',
    run: () => { add('conn', 1); return `신문을 나르는 갈매기가 떨어뜨린 신문 1면: ${pick(HEADLINES)}. 세상은 넓다.`; } },

  /* =================== 소년기 (10~17) =================== */
  { id: 't_pirate_train', w: 3, tag: 'good', cond: () => G.tree === 'pirate' && G.age < 18, title: '몰래 하는 수련',
    text: '해적이 되려면 강해져야 한다. 오늘은 무엇을 할까?',
    choices: [
      { t: '절벽 다이빙', run: () => { train(R(2, 3)); add('hp', 2); return '밤마다 절벽에서 바다로 뛰어드는 연습을 했다.'; } },
      { t: '나무 막대 휘두르기', run: () => { train(2); if (G.flags.swordOpen) learn('sword', 2); return '나무 막대를 휘두르며 손바닥이 터졌다.'; } },
      { t: '어선에서 노 젓기', run: () => { train(1); G.flags.navigation = true; return '어선에 몰래 올라 노 젓는 법과 물길을 익혔다.'; } },
      { t: '해적 이야기 수집', run: () => { add('conn', 4); return '주점을 기웃거리며 해적들의 이름과 섬 이야기를 외웠다.'; } },
    ] },
  { id: 't_tavern', w: 1.5, cond: () => G.tree === 'pirate' && G.age < 18 && !G.place.pirateLand, title: '주점의 해적 이야기',
    run: () => { add('conn', 4); return pick(['주점 구석에서 늙은 해적이 위대한 항로 이야기를 들려주었다.', '술 취한 항해사가 「붉은 흙의 대륙」 너머의 바다 이야기를 했다.', '전직 해적 요리사가 신세계의 섬들을 그려 보였다.']); } },
  { id: 't_navy_train', w: 3, tag: 'good', cond: () => G.tree === 'navy' && G.age < 18, title: '해군 지망생 훈련',
    text: '해군이 되려면 무엇이 필요할까?',
    choices: [
      { t: '새벽 구보', run: () => { train(R(2, 3)); add('hp', 2); return '매일 새벽 모래사장을 달렸다.'; } },
      { t: '목검 훈련', run: () => { train(2); if (G.flags.swordOpen) learn('sword', 2); return '지부 훈련장 밖에서 병사들의 목검 훈련을 따라 했다.'; } },
      { t: '해도 공부', run: () => { G.flags.navigation = true; add('rep', 2); return '해도 읽는 법과 신호기 다루는 법을 익혔다.'; } },
      { t: '지부에서 잔심부름', run: () => { add('conn', 3); add('rep', 2); return '병사들 심부름을 하며 얼굴을 익혔다.'; } },
    ] },
  { id: 't_report', w: 1.5, cond: () => G.tree === 'navy' && G.age < 18, title: '수배자 제보',
    run: () => { add('rep', 5); add('wealth', 3); return '수배서와 똑같은 얼굴을 보고 해군에 신고했다. 작은 포상금을 받았다.'; } },
  { id: 't_dojo', w: 1.5, cond: () => G.age >= 10 && G.age < 18 && G.skills.sword < 2 && !isCelestial(), title: '검술 도장',
    text: () => G.place.id === 'wano' ? '사무라이 도장에서 문하생을 받는다고 한다.' : '마을 검술 도장 앞에서 목검 소리가 울린다.',
    choices: [
      { t: '문하생이 된다', need: '재산 5', cond: () => G.stats.wealth >= 5, run: () => { add('wealth', -5); learn('sword', 9); return '사범이 무뚝뚝하게 목검을 건넸다. "천 번 휘두르고 와라."'; } },
      { t: '담 너머로 엿본다', run: () => { learn('sword', 4); return '담 너머로 동작을 훔쳐보며 나뭇가지를 휘둘렀다.'; } },
      { t: '관심 없다', run: () => '칼은 내 길이 아니다.' },
    ] },
  { id: 't_haki', w: 1.5, once: true, cond: () => G.age >= 13 && !G.flags.hakiOpen, title: '이상한 감각',
    run: () => { G.flags.hakiOpen = true; learn('obs', 4); rec('패기에 눈뜸'); return '뒤에서 날아오는 돌을 보지도 않고 피했다. 사람들의 "목소리"가 들리는 것 같다. (패기 수련 개방)'; } },
  { id: 't_pickpocket', w: 1.5, cond: () => G.age >= 10 && G.age < 18, title: '소매치기의 유혹',
    text: '시장에서 술 취한 상인의 두툼한 지갑이 눈에 들어왔다.',
    choices: [
      { t: '슬쩍한다', tag: '위험', run: () => {
          if (P(0.6)) { add('wealth', R(4, 10)); add('rep', -5); return '아무도 눈치채지 못했다.'; }
          add('rep', -10); hurt(5); return '붙잡혀 실컷 얻어맞고 마을에 소문이 났다.';
        } },
      { t: '상인에게 조심하라고 알린다', run: () => { add('rep', 3); add('conn', 2); if (P(0.4)) { add('wealth', 3); return '상인이 고맙다며 동전을 쥐여주었다.'; } return '상인이 고개를 끄덕였다.'; } },
      { t: '참는다', run: () => { add('rep', 1); return '양심을 지켰다.'; } },
    ] },
  { id: 't_work', w: 2, tag: 'good', cond: () => G.age >= 10 && G.age < 18, title: '일거리',
    text: '마을에 일손이 필요하다는 소식이 들렸다.',
    choices: [
      { t: '어부 그물 정리', run: () => { add('wealth', R(2, 4)); add('food', 4); return '품삯 대신 생선을 넉넉히 받았다.'; } },
      { t: '항구 짐 나르기', run: () => { add('wealth', R(3, 5)); train(1); hurt(2); return '허리가 끊어질 것 같지만 돈은 쏠쏠했다.'; } },
      { t: '대장간 풀무질', run: () => { add('wealth', R(2, 4)); train(1); return '뜨거운 풀무 앞에서 팔뚝이 굵어졌다.'; } },
      { t: '식당 설거지', run: () => { add('wealth', R(2, 3)); add('conn', 2); add('food', 2); return '손님들 이야기를 엿들으며 접시를 닦았다.'; } },
    ] },
  { id: 't_cabinboy', w: 1, once: true, cond: () => G.age >= 12 && G.age < 18 && !G.place.pirateLand, title: '견습 선원',
    text: '상선 선장이 한 철 동안 잡일할 소년을 구한다.',
    choices: [
      { t: '배에 오른다', run: () => { add('wealth', R(5, 9)); G.flags.navigation = true; train(1); rec('견습 선원 경험'); return '돛 줄 매는 법과 별 읽는 법을 배웠다. 바다가 조금 가까워졌다.'; } },
      { t: '집에 있는다', run: () => '다음 기회를 기다리기로 했다.' },
    ] },
  { id: 't_bandits', w: 1.5, tag: 'bad', cond: () => G.age >= 10 && !atSea() && !G.place.pirateLand, title: '산적의 습격',
    text: '산적들이 마을에 내려와 식량을 내놓으라며 행패를 부린다.',
    choices: [
      { t: '맞서 싸운다', enemy: 30, run: () => fightResult(fight(30, 0.06, '산적'),
          () => { add('rep', 8); train(2); return '산적 두목의 턱을 날려버렸다! 마을 사람들이 환호했다.'; },
          () => { add('food', -5); return '역부족이었다. 산적들은 식량을 챙겨 떠났다.'; }) },
      { t: '숨는다', run: () => { add('food', -R(4, 8)); add('wealth', -R(2, 6)); return '숨어서 지켜볼 수밖에 없었다.'; } },
    ] },
  { id: 't_love', w: 1, once: true, cond: () => G.age >= 13 && G.age < 22, title: '첫사랑',
    text: '항구의 그 사람만 보면 심장이 터질 것 같다.',
    choices: [
      { t: '고백한다', run: () => {
          if (P(0.5)) { add('conn', 5); add('hp', 5); rec('첫사랑 성공'); return '그 사람이 수줍게 고개를 끄덕였다.'; }
          return '정중하게 거절당했다. 바닷바람이 유난히 차갑다.';
        } },
      { t: '마음에 묻는다', run: () => '그 마음은 오래도록 추억으로 남았다.' },
    ] },
  { id: 't_seaking', w: 1, tag: 'bad', cond: () => G.age >= 8 && !atSea() && G.place.id !== 'skypiea', title: '근해의 주인',
    text: '거대한 바다왕이 해안 가까이 모습을 드러냈다!',
    choices: [
      { t: '도망친다', run: () => { if (P(0.8)) return '간신히 도망쳤다.'; hurt(10); return '도망치다 파도에 휩쓸려 크게 다쳤다.'; } },
      { t: '맞선다', enemy: 50, tag: '위험', run: () => fightResult(fight(50, 0.2, '근해의 주인'),
          () => { add('rep', 10); train(4); rec('근해의 주인 격퇴'); return '단 일격에 바다왕을 쓰러뜨렸다! 모두가 입을 다물지 못했다.'; },
          () => '이빨에 스쳐 크게 다쳤지만 살아남았다.') },
    ] },

  /* =================== 공통 =================== */
  { id: 'g_fruit', w: 0.1, cd: 60, celestial: true, cond: () => !G.fruit && G.age >= 6, title: '수상한 열매',
    text: '소용돌이 무늬가 새겨진 기묘한 열매를 발견했다. 악마의 열매일지도 모른다.',
    choices: [
      { t: '먹는다', tag: '열매', run: () => eatFruit() },
      { t: '팔아버린다', run: () => { add('wealth', R(25, 45)); add('conn', 3); return '암시장의 상인이 눈을 빛내며 거금을 내밀었다.'; } },
      { t: '바다에 버린다', run: () => '불길한 느낌에 열매를 바다로 던졌다.' },
    ] },
  { id: 'k_awaken', w: 8, once: true, cond: () => G.flags.kingInnate && G.skills.king === 0 && G.age >= 12, title: '패왕색 각성',
    run: () => { G.skills.king = 1; rec('패왕색 각성'); return pick([
      '분노가 터진 순간 주변의 사람들이 거품을 물고 쓰러졌다. 왕의 자질, 패왕색이 깨어났다.',
      '위기 속에서 내지른 고함에 짐승들이 일제히 기절했다. 몸속 깊은 곳의 무언가가 깨어났다.']); } },
  { id: 'g_famine', w: 1.5, tag: 'bad', cond: () => G.age >= 6 && !atSea() && !isCelestial(), title: '흉년',
    text: () => pick(['바다도 땅도 인색한 해다. 먹을 것이 바닥나간다.', '해류가 바뀌어 물고기 떼가 사라졌다.', '병충해로 밭이 망가졌다.']),
    choices: [
      { t: '허리띠를 졸라맨다', run: () => { add('food', -R(6, 10)); return '하루 한 끼로 버텼다.'; } },
      { t: '돈을 주고 식량을 산다', need: '재산 8', cond: () => G.stats.wealth >= 8, run: () => { add('wealth', -8); add('food', -2); return '비싼 값을 치르고 쌀을 구했다.'; } },
      { t: '숲에서 사냥한다', enemy: 25, run: () => fightResult(fight(25, 0.02, '산짐승'),
          () => { add('food', 4); return '멧돼지를 잡아 이웃과 나눴다.'; },
          () => { add('food', -6); return '빈손으로 상처만 입고 돌아왔다.'; }) },
    ] },
  { id: 'g_rest', w: 2, tag: 'good', celestial: true, title: '평온한 계절',
    run: () => { add('hp', R(3, 8)); return pick(['오랜만에 푹 쉬었다.', '따뜻한 햇볕 아래 낮잠을 잤다.', '아무 일 없는 하루하루가 이어졌다.', '좋은 바람이 부는 계절이었다.']); } },
  { id: 'g_accident', w: 1, tag: 'bad', cond: () => G.age >= 8, title: '사고',
    run: () => { hurt(R(4, 10)); return pick(['계단에서 굴러떨어졌다.', '돛대에서 떨어진 도르래에 맞았다.', '상한 생선을 먹고 크게 탈이 났다.', '정체불명의 버섯을 먹고 사흘을 앓았다.']); } },
  { id: 'g_doctor', w: 1, tag: 'good', cond: () => G.age >= 10 && G.stats.hp < 70, title: '떠돌이 의사',
    text: '분홍 모자를 쓴 너구리 같은 의사가 마을에 들렀다.',
    choices: [
      { t: '치료를 받는다', need: '재산 6', cond: () => G.stats.wealth >= 6, run: () => { add('wealth', -6); add('hp', R(15, 25)); return '"나 칭찬해도 하나도 안 기뻐!" 의사는 춤추며 떠났다. 몸이 한결 가볍다.'; } },
      { t: '괜찮다', run: () => '참을 만하다.' },
    ] },
  { id: 'g_treasure', w: 1, cond: () => G.age >= 12, title: '보물 지도',
    text: '낡은 병 속에서 X 표시가 그려진 지도를 찾았다.',
    choices: [
      { t: '혼자 찾으러 간다', tag: '위험', run: () => {
          if (P(0.5)) { add('wealth', R(12, 25)); return '동굴 깊은 곳에서 녹슨 상자를 찾았다. 금화가 가득하다!'; }
          hurt(R(5, 12)); return '함정이었다. 빈손으로 상처만 입었다.';
        } },
      { t: '친구들과 함께 간다', run: () => { add('conn', 3); if (P(0.6)) { add('wealth', R(5, 10)); return '보물을 찾아 사이좋게 나눴다.'; } return '보물은 없었지만 즐거운 모험이었다.'; } },
      { t: '지도를 판다', run: () => { add('wealth', 5); return '호기심 많은 상인에게 지도를 넘겼다.'; } },
    ] },
  { id: 'g_merchant', w: 1.5, cond: () => G.age >= 12, title: '떠돌이 상인',
    text: '커다란 짐을 진 떠돌이 상인이 말을 건다. "필요한 거 있수?"',
    choices: [
      { t: '식량을 산다', need: '재산 5', cond: () => G.stats.wealth >= 5, run: () => { add('wealth', -5); add('food', 12); return '말린 고기와 쌀을 넉넉히 샀다.'; } },
      { t: '정보를 산다', need: '재산 3', cond: () => G.stats.wealth >= 3, run: () => { add('wealth', -3); add('conn', 4); return '여러 섬의 소문과 사람 이름을 얻었다.'; } },
      { t: '약을 산다', need: '재산 6', cond: () => G.stats.wealth >= 6, run: () => { add('wealth', -6); add('hp', R(8, 14)); return '쓴 약초 환을 먹자 몸이 가벼워졌다.'; } },
      { t: '남는 식량을 판다', need: '식량 20', cond: () => G.stats.food >= 20, run: () => { add('food', -10); add('wealth', 5); return '남는 식량을 넘기고 돈을 받았다.'; } },
    ] },
  { id: 'g_brawl', w: 1.5, cond: () => G.age >= 16, title: '주점 난투',
    text: '주점에서 시비가 붙었다. 술병이 날아다닌다.',
    choices: [
      { t: '끼어든다', enemy: 32, run: () => fightResult(fight(32, 0.03, '주정뱅이'),
          () => { add('conn', 3); add('rep', 2); return '난투를 정리하자 주점 주인이 술을 샀다.'; },
          () => '술병에 머리를 맞고 기절했다.') },
      { t: '술값을 내고 말린다', need: '재산 3', cond: () => G.stats.wealth >= 3, run: () => { add('wealth', -3); add('conn', 4); return '"오늘 술은 내가 산다!" 싸움이 웃음으로 끝났다.'; } },
      { t: '구경하며 배운다', run: () => { train(1); return '덩치 큰 놈들이 어떻게 싸우는지 지켜봤다.'; } },
      { t: '조용히 나간다', run: () => '괜한 싸움에 휘말리지 않았다.' },
    ] },
  { id: 'g_celestial', w: 0.8, tag: 'bad', cond: () => G.age >= 8 && !G.place.pirateLand && !G.flags.celestial, title: '천룡인 행차',
    text: '거품 헬멧을 쓴 천룡인이 노예를 끌고 거리를 지난다. 모두가 엎드렸다.',
    choices: [
      { t: '엎드린다', run: () => '이를 악물고 땅에 이마를 댔다.' },
      { t: '노예를 돕는다', tag: '위험', cond: () => G.age >= 15, need: '15세 이상', run: () => {
          if (P(0.4)) { add('rep', 15); add('conn', 5); rec('천룡인에게 맞섬'); if (isPirate()) return '노예를 풀어주고 사라졌다. ' + addBounty(4000); return '혼란을 틈타 노예를 풀어주었다. 사람들이 당신을 영웅이라 부른다.'; }
          hurt(18);
          if (P(0.1 * D().death)) { G.stats.hp = 0; G.deathCause = '천룡인의 총에 맞아 사망'; return '총성이 울렸다…'; }
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
      { t: '협력한다', run: () => { add('conn', 10); add('rep', -5); G.flags.rev = true; rec('혁명군과 연결'); return '비밀스러운 연락망에 이름이 올랐다.'; } },
      { t: '거절한다', run: () => '남자는 아무 말 없이 사라졌다.' },
    ] },
  { id: 'g_hermit', w: 1, once: true, cond: () => G.age >= 16, title: '은둔한 노인',
    text: () => G.place.id === 'sabaody' ? '코팅 장인이라는 안경 쓴 노인이 당신을 빤히 본다. "재미있는 눈을 가졌군."' : '외딴 오두막의 노인이 당신을 빤히 본다. "재미있는 눈을 가졌군."',
    choices: [
      { t: '가르침을 청한다', need: '재산 15', cond: () => G.stats.wealth >= 15, run: () => { add('wealth', -15); G.flags.hakiOpen = true; learn('obs', 10); learn('arm', 10); rec('은둔 고수에게 사사'); return '반년 동안 섬에서 죽을 만큼 굴렀다. 패기란 무엇인지 몸으로 알았다.'; } },
      { t: '술 한잔 대접한다', run: () => { add('conn', 5); G.flags.hakiOpen = true; learn('obs', 3); return '노인이 껄껄 웃으며 "의심하지 않는 것, 그게 힘이다"라고 말했다. (패기 수련 개방)'; } },
    ] },
  { id: 'g_cp_defector', w: 0.7, once: true, cond: () => G.age >= 16 && !isNavy() && !G.flags.rokushiki, title: '전직 첩보원',
    text: '정부를 떠났다는 사내가 은밀히 접근했다. "돈만 내면 육식을 가르쳐 주지."',
    choices: [
      { t: '배운다', need: '재산 20', cond: () => G.stats.wealth >= 20, run: () => { add('wealth', -20); G.flags.rokushiki = true; learn('rokushiki', 12); rec('육식 전수'); return '몸을 강철처럼 단련하는 비밀 체술, 육식의 기초를 배웠다. (수련 방향에 육식 추가)'; } },
      { t: '수상하다', run: () => '사내는 어둠 속으로 사라졌다.' },
    ] },
  { id: 'g_swordsman', w: 1, once: true, cond: () => G.age >= 18 && G.skills.sword >= 2, title: '세계 최강의 검사',
    text: '매의 눈을 가진 검사가 작은 배 위에서 십자가 모양의 검을 닦고 있다.',
    choices: [
      { t: '결투를 신청한다', enemy: 160, tag: '위험', run: () => {
          if (fight(160, 0.08, '세계 최강의 검사') === 'dead') return DEAD_TEXT;
          learn('sword', 15); rec('최강의 검사와 겨룸');
          return '단검 하나에 막혔다. 그러나 검사는 상처를 피해 베었다. "강해져서 다시 와라." 그 한 합이 무엇보다 큰 공부였다.';
        } },
      { t: '지켜보기만 한다', run: () => { learn('sword', 5); return '검을 닦는 손놀림만 보고도 배울 것이 많았다.'; } },
    ] },
  { id: 'g_news', w: 1, cond: () => G.age >= 18, title: '세계 경제 신문',
    run: () => {
      if (isPirate() && G.job.bounty > 0) { add('conn', 2); return `신문 한 귀퉁이에 당신의 수배서가 실렸다. ${fmtBounty(G.job.bounty)}. 주점마다 당신 이야기다.`; }
      add('conn', 1); return `오늘의 1면: ${pick(HEADLINES)}`;
    } },
  { id: 'g_old_friend', w: 1, tag: 'good', cond: () => G.age >= 20, title: '옛 친구',
    run: () => { add('conn', R(3, 6)); add('food', 3); return pick(['어릴 적 친구와 우연히 마주쳤다. 밤새 옛이야기를 했다.', '고향 소식을 전해 듣고 한참을 웃었다.', '옛 친구가 맛있는 걸 잔뜩 싸 들고 찾아왔다.']); } },
  { id: 'g_rival', w: 1.5, cd: 16, cond: () => G.flags.rival && G.age >= 18, title: '라이벌과의 재회',
    text: '어릴 적 라이벌이 몰라보게 강해진 모습으로 나타났다. "약속대로 승부다!"',
    choices: [
      { t: '승부를 받는다', enemy: () => Math.round(power() * 0.95 / D().enemy), run: () => fightResult(fight(Math.round(power() * 0.95 / D().enemy), 0, '라이벌'),
          () => { train(3); add('conn', 3); return '아슬아슬하게 이겼다. 라이벌은 분해하며 웃었다. "다음엔 안 진다!"'; },
          () => { train(3); return '졌다. 분하지만 가슴이 뜨겁다. 더 강해져야 한다.'; }) },
      { t: '술이나 한잔하자', run: () => { add('conn', 5); return '승부는 다음으로 미루고 밤새 마셨다.'; } },
    ] },
  { id: 'g_storm', w: 1.5, tag: 'bad', cond: () => atSea(), title: '폭풍',
    run: () => {
      hurt(R(3, 8)); add('food', -R(3, 6));
      if (P(0.25)) {
        if (G.skills.rokushiki >= 4) return '파도에 휩쓸렸지만 월보로 허공을 박차 갑판으로 돌아왔다.';
        if (hasMod('stormSafe')) return `파도에 휩쓸릴 뻔했지만 「${G.fruit.name}」의 힘으로 바다에 빠지지 않았다.`;
        if (G.fruit && !(G.stats.crew >= 5 && P(0.85))) {
          if (P(0.35 * D().death)) { G.stats.hp = 0; G.deathCause = '폭풍 속 바다에 빠져 익사 (능력자)'; return '거센 파도에 휩쓸려 바다에 빠졌다. 열매의 저주로 몸이 굳어 그대로 가라앉았다…'; }
          hurt(12); return '바다에 빠졌다! 힘이 빠져 가라앉던 순간 겨우 끌어올려졌다.';
        }
        if (G.fruit) return '바다에 빠졌지만 동료가 곧장 뛰어들어 건져냈다.';
        return '갑판에서 휩쓸려 떨어졌지만 헤엄쳐 돌아왔다.';
      }
      return pick(['돛이 찢어지고 식량 일부가 바다로 쓸려갔다.', '번개가 돛대를 때렸다.', '사흘 밤낮으로 폭풍과 싸웠다.']);
    } },
  { id: 'g_seatrain', w: 1, cond: () => atSea(), title: '기묘한 바다',
    run: () => { train(1); return pick(['바다가 갑자기 위로 솟구치는 「녹 업 스트림」을 만났다.', '안개 속에서 거대한 유령선을 보았다.', '바람 한 점 없는 「캄 벨트」를 아슬아슬하게 비껴갔다.', '하늘에서 거대한 배가 떨어졌다.']); } },

  /* =================== 민간인 =================== */
  { id: 'v_work', w: 3, tag: 'good', cond: () => isCivil(), title: '생업',
    text: () => G.flags.shop ? '오늘도 가게 문을 열었다.' : '오늘도 하루가 시작됐다.',
    choices: [
      { t: '열심히 일한다', run: () => { add('wealth', R(3, 6) + (G.flags.shop ? 3 : 0)); hurt(2); return G.flags.shop ? '가게가 북적였다.' : pick(['고기잡이가 잘 됐다.', '조선소에서 품삯을 받았다.', '밭일을 했다.']); } },
      { t: '부업에 손댄다', tag: '위험', run: () => { if (P(0.5)) { add('wealth', R(6, 12)); return '수상한 화물 운반으로 큰돈을 만졌다.'; } add('wealth', -R(2, 6)); add('rep', -3); return '사기를 당했다.'; } },
      { t: '이웃을 돕는다', run: () => { add('conn', 3); add('rep', 2); add('food', 2); return '지붕 고치는 걸 도와주고 저녁을 얻어먹었다.'; } },
      { t: '하루 쉰다', run: () => { add('hp', R(4, 7)); return '모처럼 늦잠을 잤다.'; } },
    ] },
  { id: 'v_shop', w: 1, once: true, cond: () => isCivil() && G.age >= 20 && G.stats.wealth >= 20, title: '가게를 열 기회',
    text: '항구 앞 빈 가게가 싸게 나왔다.',
    choices: [
      { t: '가게를 연다', run: () => { add('wealth', -15); add('conn', 5); G.flags.shop = true; rec('가게 주인'); return '작은 간판을 내걸었다.'; } },
      { t: '지금은 아니다', run: () => '조금 더 모으기로 했다.' },
    ] },
  { id: 'v_pirate_scout', w: 1.2, cond: () => isCivil() && G.age <= 40, title: '해적단의 스카우트',
    text: '항구에 해적선이 들어왔다. 선원들이 쓸 만한 녀석을 찾고 있다.',
    choices: () => [
      ...crewOffers(1),
      { t: '내 배를 사서 깃발을 올린다', run: () => becomePirate(false) },
      { t: '거절한다', run: () => '해적선은 떠났다.' },
    ] },
  { id: 'v_navy_recruit', w: 1.2, cond: () => isCivil() && G.age <= 35 && !G.place.pirateLand, title: '해군 모병',
    text: '해군 지부에서 신병을 모집한다는 벽보가 붙었다.',
    choices: [
      { t: '입대한다', run: () => joinNavy(false) },
      { t: '관심 없다', run: () => '벽보를 지나쳤다.' },
    ] },
  { id: 'v_defend', w: 1.2, cond: () => isCivil() && !G.place.pirateLand, title: '마을을 노리는 해적',
    text: '삼류 해적단이 마을을 약탈하러 왔다.',
    choices: [
      { t: '앞장서 싸운다', enemy: 38, run: () => fightResult(fight(38, 0.1, '삼류 해적'),
          () => { add('rep', 10); add('conn', 4); train(2); return '해적들을 바다로 내던졌다! 마을의 영웅이 되었다.'; },
          () => { add('wealth', -R(3, 8)); return '해적들에게 당했다. 마을도 피해를 입었다.'; }) },
      { t: '재산을 숨긴다', run: () => { add('wealth', -R(1, 4)); return '대부분은 지켰다.'; } },
    ] },
  { id: 'v_apprentice', w: 1, cond: () => isCivil(), title: '제자를 받다',
    run: () => { add('conn', 3); add('rep', 2); return pick(['동네 꼬마가 일을 배우겠다며 따라다닌다.', '마을 아이들에게 헤엄치는 법을 가르쳤다.']); } },

  /* =================== 해적 =================== */
  { id: 'p_recruit', w: 3, tag: 'good', cond: () => isPirate(), title: '동료 영입',
    text: () => pick(['주점에서 만난 검객이 배에 태워 달라고 한다.', '난파선 생존자들이 동료가 되고 싶어 한다.', '해군에서 탈영한 포수가 찾아왔다.', '떠돌이 요리사가 따라오겠다고 우긴다.']),
    choices: [
      { t: '받아들인다', run: () => { add('crew', R(4, 9) + Math.floor(G.stats.conn / 15)); add('conn', 2); return '새 동료들이 배에 올랐다.'; } },
      { t: '실력을 시험한다', enemy: () => Math.round(power() * 0.8 / D().enemy), run: () => fightResult(fight(Math.round(power() * 0.8 / D().enemy), 0, '지원자'),
          () => { add('crew', R(3, 6)); train(1); return '시험을 통과시킨 녀석들만 받았다. 정예가 늘었다.'; },
          () => { add('crew', R(6, 10)); add('rep', -2); return '오히려 지원자에게 졌다. 다 받아줄 수밖에.'; }) },
      { t: '선원 모집 공고를 낸다', need: '재산 10', cond: () => G.stats.wealth >= 10, run: () => { add('wealth', -10); add('crew', R(8, 14)); return '현수막을 걸자 지원자가 줄을 섰다.'; } },
      { t: '거절한다', run: () => '아직 배에 자리가 없다.' },
    ] },
  { id: 'p_navy', w: 3, tag: 'bad', cond: () => isPirate(), title: '해군의 추격',
    text: () => `해군 군함이 「${G.crewName}」의 뒤를 쫓는다!`,
    choices: [
      { t: '맞서 싸운다', enemy: () => pirateEnemy(), run: () => fightResult(fight(pirateEnemy(), 0.1, '해군'),
          () => { add('rep', -3); add('crew', R(0, 2)); return '군함을 격침시켰다! ' + addBounty(2000); },
          () => { add('crew', -R(2, 6)); return '대패했다. 동료 몇이 붙잡혔다.'; }) },
      { t: '도주한다', tag: () => `성공 ${Math.round(escapeChance(0.6) * 100)}%`, run: () => {
          if (P(escapeChance(0.6))) return '안개 속으로 빠져나갔다.';
          hurt(R(5, 10)); add('crew', -R(1, 4)); return '포격을 맞으며 간신히 도망쳤다.';
        } },
      { t: '깃발을 내리고 상선인 척한다', run: () => {
          if (P(0.45 + G.stats.conn / 300)) { add('conn', 1); return '"평범한 상선입니다~" 군함이 그냥 지나갔다.'; }
          add('crew', -R(2, 4)); add('wealth', -R(3, 8)); return '들켰다. 짐을 버리고 겨우 달아났다.';
        } },
    ] },
  { id: 'p_vice', w: 1.5, tag: 'bad', cond: () => isPirate() && G.job.bounty >= 20000, title: '중장의 함대',
    text: '현상금이 오르자 본부가 중장급 함대를 보냈다. 수평선이 군함으로 새하얗다.',
    choices: [
      { t: '정면 돌파', enemy: () => pirateEnemy(20), tag: '위험', run: () => fightResult(fight(pirateEnemy(20), 0.18, '해군 중장'),
          () => { add('crew', R(2, 5)); rec('중장 격파'); return '중장을 쓰러뜨리고 포위망을 뚫었다! ' + addBounty(6000); },
          () => { add('crew', -R(5, 10)); return '함대의 절반을 잃고 겨우 빠져나왔다.'; }) },
      { t: '도주한다', tag: () => `성공 ${Math.round(escapeChance(0.45) * 100)}%`, run: () => {
          if (P(escapeChance(0.45))) return '해류를 타고 포위망 밖으로 빠져나갔다.';
          hurt(R(8, 14)); add('crew', -R(3, 7)); return '포탄 세례를 뚫고 도망쳤다. 피해가 크다.';
        } },
    ] },
  { id: 'p_raid', w: 2.5, cond: () => isPirate(), title: '약탈의 기회',
    text: '방비가 허술한 부자 마을이 보인다.',
    choices: [
      { t: '약탈한다', run: () => { add('wealth', R(10, 20)); add('food', R(8, 15)); add('rep', -R(8, 15)); return '배가 금은보화와 식량으로 가득 찼다. ' + addBounty(2500); } },
      { t: '그냥 지나친다', run: () => '배는 조용히 지나갔다.' },
      { t: '마을을 지켜준다', enemy: 35, run: () => fightResult(fight(35, 0.06, '산적단'),
          () => { add('rep', 12); add('conn', 5); add('food', 6); return '마을을 괴롭히던 산적단을 쫓아냈다. 해적인데 이상하게 사랑받는다.'; },
          () => '산적단에게 밀려났다.') },
    ] },
  { id: 'p_rival', w: 2.5, cond: () => isPirate(), title: '라이벌 해적단',
    text: () => `「${pick(ENEMY_CREWS)} 해적단」이 시비를 걸어왔다.`,
    choices: [
      { t: '싸운다', enemy: () => pirateEnemy(5), run: () => fightResult(fight(pirateEnemy(5), 0.12, '라이벌 해적'),
          () => { add('crew', R(2, 6)); add('wealth', R(5, 15)); return '상대 선장을 쓰러뜨리고 깃발을 빼앗았다. ' + addBounty(3000); },
          () => { add('crew', -R(3, 8)); add('wealth', -R(3, 10)); return '패배했다. 보물을 빼앗겼다.'; }) },
      { t: '동맹을 제안한다', run: () => {
          if (P(0.7)) { add('conn', 6); return '술잔을 나누고 동맹을 맺었다.'; }
          add('wealth', -10); add('crew', -2); return '배신당했다! 밤사이 보물이 털렸다.';
        } },
    ] },
  { id: 'p_hunter', w: 1.5, tag: 'bad', cond: () => isPirate() && G.job.bounty > 0, title: '현상금 사냥꾼',
    text: '복면을 쓴 현상금 사냥꾼이 당신의 수배서를 흔들며 다가온다.',
    choices: [
      { t: '맞선다', enemy: () => pirateEnemy(-5), run: () => fightResult(fight(pirateEnemy(-5), 0.08, '현상금 사냥꾼'),
          () => '현상금 사냥꾼을 가볍게 돌려보냈다.',
          () => '기습을 당해 크게 다쳤다.') },
      { t: '동료로 포섭한다', run: () => { if (P(0.3 + G.stats.conn / 200)) { add('crew', 2); add('conn', 3); return '"이 선장 밑이라면 재밌겠군." 사냥꾼이 칼을 거뒀다.'; } hurt(R(5, 10)); return '말이 끝나기도 전에 칼이 날아왔다.'; } },
      { t: '도망친다', tag: () => `성공 ${Math.round(escapeChance(0.55) * 100)}%`, run: () => { if (P(escapeChance(0.55))) return '시장 인파 속으로 사라졌다.'; hurt(R(4, 8)); return '등에 칼을 맞으며 도망쳤다.'; } },
    ] },
  { id: 'p_island', w: 2, tag: 'good', cond: () => isPirate(), title: '미지의 섬',
    text: () => pick(['지도에 없는 섬이 보인다.', '공룡 울음소리가 들리는 섬에 닿았다.', '눈 덮인 겨울 섬이 나타났다.']),
    choices: [
      { t: '깊숙이 탐험한다', tag: '위험', run: () => { if (P(0.5)) { add('wealth', R(10, 18)); add('food', 5); return '고대 유적에서 보물을 찾았다!'; } hurt(R(5, 10)); add('food', 5); return '괴수에게 쫓겨 도망쳐 나왔다.'; } },
      { t: '식량만 챙긴다', run: () => { add('food', R(10, 18)); return '사냥과 채집으로 창고를 채웠다.'; } },
      { t: '정박해 쉰다', run: () => { add('hp', R(8, 12)); add('crew', 1); return '해변에서 며칠을 푹 쉬었다.'; } },
    ] },
  { id: 'p_sky', w: 0.8, once: true, cond: () => isPirate(), title: '하늘로 가는 해류',
    text: '기록 지침이 하늘을 가리킨다. 녹 업 스트림을 타면 하늘섬에 갈 수 있다는데…',
    choices: [
      { t: '하늘로 간다', tag: '위험', run: () => {
          if (P(0.6)) { add('wealth', R(15, 25)); rec('하늘섬 도달'); return '배가 하늘로 솟구쳤다! 구름 위의 섬에서 황금의 종을 보았다.'; }
          hurt(R(10, 15)); add('crew', -R(1, 3)); return '해류에서 떨어져 바다에 처박혔다.';
        } },
      { t: '바다로 간다', run: () => '하늘은 다음에.' },
    ] },
  { id: 'p_feast', w: 1.5, tag: 'good', cond: () => isPirate() && G.stats.food >= 10, title: '연회',
    text: '오늘은 좋은 날이다. 선원들이 연회를 열자고 조른다.',
    choices: [
      { t: '밤새 퍼마신다', run: () => { add('food', -8); add('hp', 8); add('conn', 2); add('crew', 1); return '「빙크스의 술」을 다 같이 불렀다. 사기가 하늘을 찌른다.'; } },
      { t: '근처 마을 사람들도 부른다', run: () => { add('food', -10); add('rep', 6); add('conn', 4); return '해적과 주민이 함께 춤추는 이상한 밤이었다.'; } },
      { t: '팔씨름 대회를 연다', run: () => { add('food', -4); train(2); add('crew', 1); return '선원들의 실력을 확인했다. 신입 하나가 의외로 강하다.'; } },
      { t: '조촐하게 끝낸다', run: () => { add('food', -2); add('hp', 3); return '내일 항해를 위해 일찍 잤다.'; } },
    ] },
  { id: 'p_quarrel', w: 1.2, cond: () => isPirate() && G.stats.crew >= 10, title: '동료 갈등',
    text: '두 간부가 배의 진로를 놓고 칼을 뽑았다.',
    choices: [
      { t: '선장으로서 중재한다', run: () => { if (P(0.4 + G.stats.conn / 200)) { add('conn', 4); return '양쪽 이야기를 듣고 결론을 냈다. 둘 다 고개를 숙였다.'; } add('crew', -R(2, 4)); return '한쪽이 배를 떠났다.'; } },
      { t: '결투로 정하게 둔다', run: () => { add('crew', -1); train(1); return '결투 끝에 둘은 오히려 친해졌다. 하나는 다쳐서 내렸지만.'; } },
    ] },
  { id: 'p_rescue', w: 1, cond: () => isPirate() && G.stats.crew >= 8, title: '동료 구출',
    text: '동료 한 명이 해군에 붙잡혀 호송선에 실렸다.',
    choices: [
      { t: '구하러 간다', enemy: () => pirateEnemy(5), run: () => fightResult(fight(pirateEnemy(5), 0.12, '호송선 경비'),
          () => { add('conn', 5); add('crew', 2); return '호송선을 습격해 동료를 되찾았다. 선원들의 충성심이 높아졌다. ' + addBounty(2000); },
          () => { add('crew', -2); return '구출에 실패했다.'; }) },
      { t: '포기한다', run: () => { add('crew', -R(2, 5)); add('conn', -3); return '선원들이 수군거린다. 몇이 배를 떠났다.'; } },
    ] },
  { id: 'p_train', w: 2, tag: 'good', cond: () => isPirate(), title: '선상 수련',
    text: '항해가 잔잔하다. 갑판 위에서 무엇을 단련할까?', choices: trainingChoices('sword') },
  { id: 'p_mutiny', w: 4, tag: 'bad', cond: () => isPirate() && G.stats.crew > 5 && (G.stats.food < 10 || G.stats.wealth < 3), title: '선상 반란',
    text: '굶주린 선원들이 술렁인다. "선장을 갈아치우자!"',
    choices: [
      { t: '설득한다', run: () => { if (P(0.3 + G.stats.conn / 150)) { add('rep', 2); return '진심 어린 연설로 반란을 잠재웠다.'; } add('crew', -R(5, 12)); return '설득에 실패했다. 일부가 작은 배를 훔쳐 떠났다.'; } },
      { t: '힘으로 제압한다', enemy: () => 20 + G.stats.crew * 0.5, run: () => fightResult(fight(20 + G.stats.crew * 0.5, 0.08, '반란 선원'),
          () => { add('crew', -R(1, 4)); return '주동자를 바다에 던져버렸다.'; },
          () => { add('crew', -R(8, 15)); return '반란이 성공했다. 겨우 목숨만 건졌다.'; }) },
    ] },
  { id: 'p_poneglyph', w: 5, cond: () => isPirate() && !G.job.crewId && G.job.stage >= 1 && (G.flags.pg || 0) < 4, title: '로드 포네그리프',
    text: () => `${(G.flags.pg || 0) + 1}번째 로드 포네그리프의 행방을 알아냈다. 다른 거물 해적도 노리고 있다.`,
    choices: [
      { t: '쟁탈전을 벌인다', enemy: () => pirateEnemy(), run: () => fightResult(fight(pirateEnemy(), 0.18, '거물 해적'),
          () => gainPoneglyph('적을 물리치고 붉은 비석의 탁본을 떴다.'),
          () => { add('crew', -R(4, 8)); return '빼앗기고 말았다.'; }) },
      { t: '비석을 직접 읽는다', cond: () => G.lineage.poneglyph, need: '코즈키 가문 전용', run: () => {
          if (P(0.7)) return gainPoneglyph('적이 다투는 사이 비석에 몰래 다가가 문자를 읽어냈다.');
          return '들켜서 물러났다.';
        } },
      { t: '정보상에게 탁본을 산다', need: '재산 30', cond: () => G.stats.wealth >= 30, run: () => { add('wealth', -30); return gainPoneglyph('막대한 돈을 치르고 탁본을 손에 넣었다.'); } },
      { t: '포기한다', run: () => '때가 아니다.' },
    ] },
  { id: 'p_shichi', w: 0, yearly: () => (G.job.bounty >= 60000 ? 0.4 : 0.15), cond: () => isPirate() && !G.job.crewId && G.job.stage === 0 && G.job.bounty >= 30000 && G.stats.crew >= 30 && G.stats.conn >= 15
      && G.stats.rep > -40 && !G.flags.shichiNo, title: '세계정부의 제안',
    text: '세계정부의 사절이 찾아왔다. "왕하칠무해의 자리를 제안한다. 해적질은 묵인하겠다. 단, 소집에는 응해야 한다."',
    choices: [
      { t: '수락한다', run: () => { G.job.stage = 1; add('rep', 25); add('conn', 10); G.flags.hakiOpen = true; rec('칠무해 임명'); return `${G.name}의 이름이 칠무해 명단에 올랐다. 정부의 개라는 손가락질도 받지만, 아무도 함부로 건드리지 못한다.`; } },
      { t: '거절한다', run: () => { G.flags.shichiNo = G.age; add('rep', -5); return '사절을 돌려보냈다. 정부는 두 번 묻지 않는다. ' + addBounty(5000); } },
    ] },
  { id: 'p_yonko', w: 0, yearly: 0.15, cond: () => isPirate() && !G.job.crewId && G.job.stage === 1 && G.job.bounty >= 250000 && G.stats.crew >= 65 && G.stats.conn >= 45 && power() >= 140
      && !(G.flags.yonkoTry && G.age - G.flags.yonkoTry < 5), title: '신세계의 패권',
    text: '사황 한 명이 쇠약해졌다는 소문이 돈다. 그의 영역을 차지하면 신세계의 왕좌에 오를 수 있다.',
    choices: [
      { t: '전쟁을 건다', enemy: 165, kill: 0.08, tag: '위험', run: () => {
          G.flags.yonkoTry = G.age;
          return fightResult(fight(165, 0.35, '사황', 0.08),
            () => { G.job.stage = 2; G.job.bounty = Math.round(G.job.bounty * 1.6); add('crew', 10); add('conn', 8); rec('사황 등극');
              return `세계를 뒤흔든 전쟁 끝에 승리했다. 신문 1면: "새로운 사황 탄생". 현상금 ${fmtBounty(G.job.bounty)}.`; },
            () => { add('crew', -R(10, 20)); return '참패했다. 함대의 절반을 잃고 후퇴했다.'; });
        } },
      { t: '때를 기다린다', run: () => { G.flags.yonkoTry = G.age; return '아직은 힘을 기를 때다.'; } },
    ] },
  { id: 'p_raftel', w: 0, yearly: 0.35, cond: () => isPirate() && !G.job.crewId && G.job.stage === 2 && G.job.bounty >= 300000 && G.stats.crew >= 75 && G.stats.conn >= 45
      && (G.flags.pg || 0) >= 4 && !(G.flags.raftelTry && G.age - G.flags.raftelTry < 2), title: '최후의 섬',
    text: '네 개의 로드 포네그리프가 가리키는 좌표. 최후의 섬 라프텔이 눈앞이다. 그러나 다른 사황과 해군 대함대가 길을 막는다.',
    choices: [
      { t: '라프텔로 간다', enemy: 180, tag: '위험', run: () => {
          G.flags.raftelTry = G.age;
          return fightResult(fight(180, 0.35, '최후의 적'),
            () => { G.job.stage = 3; add('wealth', 100); add('conn', 10); rec('해적왕 등극');
              return '섬에 닿았다. 그곳에 있던 것을 보고, 당신과 동료들은 한참을 웃었다. ONE PIECE는 실재했다. 당신은 대해적, 해적왕이다!'; },
            () => { add('crew', -R(10, 20)); return '대함대에 막혀 물러났다. 다음 기회를 노린다.'; });
        } },
      { t: '아직이다', run: () => { G.flags.raftelTry = G.age; return '준비가 더 필요하다.'; } },
    ] },

  /* =================== 해군 =================== */
  { id: 'n_mission', w: 6, navyCatch: true, cond: () => isNavy(), title: '해적 토벌 임무',
    text: () => `본부의 명령: 「${pick(ENEMY_CREWS)} 해적단」을 소탕하라.`,
    choices: [
      { t: '정면 돌파', enemy: () => navyEnemy(), run: () => fightResult(fight(navyEnemy(), 0.1, '해적'),
          () => { G.job.captures += R(1, 3); addMerit(R(4, 8)); add('rep', 3); return '해적선을 나포하고 선장을 체포했다.'; },
          () => { add('crew', -R(1, 4)); return '해적에게 밀려 작전이 실패했다.'; }) },
      { t: '포위 작전', tag: () => `성공 ${Math.round(clamp(0.5 + G.stats.crew / 200 + G.stats.conn / 300, 0, 0.95) * 100)}%`, run: () => {
          if (P(0.5 + G.stats.crew / 200 + G.stats.conn / 300)) { G.job.captures += 1; addMerit(R(3, 6)); add('rep', 2); return '부하들과 함께 퇴로를 끊고 해적단을 일망타진했다.'; }
          return '해적단이 포위망을 빠져나갔다.';
        } },
    ] },
  { id: 'n_patrol', w: 2.5, tag: 'good', cond: () => isNavy(), title: '순찰 근무',
    text: '평범한 순찰 근무다. 어떻게 보낼까?',
    choices: [
      { t: '원칙대로 순찰한다', run: () => { addMerit(R(1, 3)); add('rep', 1); return pick(['밀수선을 적발했다.', '표류하던 상선을 구조했다.', '조용한 바다였다.']); } },
      { t: '항구 정보원을 만난다', run: () => { add('conn', 4); if (P(0.4)) { addMerit(3); return '수배범의 은신처 정보를 얻었다.'; } return '쓸 만한 소문은 없었다.'; } },
      { t: '함상 훈련을 한다', run: () => { train(2); return '부하들과 함께 갑판에서 땀을 흘렸다.'; } },
    ] },
  { id: 'n_rescue', w: 1.2, tag: 'good', cond: () => isNavy(), title: '해난 구조',
    run: () => { add('rep', R(4, 8)); addMerit(2); add('conn', 2); return pick(['침몰하는 여객선에서 승객들을 구해냈다.', '폭풍 속에서 어부 일가를 건져 올렸다.']); } },
  { id: 'n_train', w: 2, tag: 'good', cond: () => isNavy(), title: '해군 특별 훈련',
    text: '오늘은 특별 훈련일이다. 무엇을 집중적으로 단련할까?', choices: trainingChoices('rokushiki') },
  { id: 'n_bigfish', w: 1.5, navyCatch: true, cond: () => isNavy() && G.job.rank >= 5, title: '거물 해적 체포',
    text: '억대 현상금의 거물 해적이 근해에 나타났다.',
    choices: [
      { t: '직접 상대한다', enemy: () => navyEnemy(25), tag: '위험', run: () => fightResult(fight(navyEnemy(25), 0.18, '거물 해적'),
          () => { G.job.captures += 1; addMerit(R(12, 20)); add('rep', 8); rec('거물 해적 체포'); return '격전 끝에 거물을 해루석 수갑에 채웠다!'; },
          () => '놓쳤다. 상처만 남았다.') },
      { t: '본부에 지원 요청', run: () => { addMerit(R(2, 4)); return '지원 함대와 공을 나눴다.'; } },
    ] },
  { id: 'n_nemesis', w: 1.2, cd: 12, navyCatch: true, cond: () => isNavy() && G.job.rank >= 3, title: '숙적',
    text: () => G.flags.nemesis ? `또 「${G.flags.nemesis} 해적단」이다. 몇 번째 추격인지 모르겠다.` : `「${(G.flags.nemesisNext = pick(ENEMY_CREWS))} 해적단」의 선장이 당신의 부하를 다치게 하고 달아났다.`,
    choices: [
      { t: '끝까지 쫓는다', enemy: () => navyEnemy(10), run: () => {
          if (!G.flags.nemesis) G.flags.nemesis = G.flags.nemesisNext;
          return fightResult(fight(navyEnemy(10), 0.12, '숙적'),
            () => { G.job.captures += 1; addMerit(R(8, 12)); rec('숙적 체포'); const n = G.flags.nemesis; G.flags.nemesis = null; return `마침내 「${n} 해적단」 선장에게 수갑을 채웠다.`; },
            () => { train(2); return '또 놓쳤다. 다음엔 반드시.'; });
        } },
      { t: '다른 임무가 먼저다', run: () => { if (!G.flags.nemesis) G.flags.nemesis = G.flags.nemesisNext; return '이를 갈며 수배서를 벽에 붙였다.'; } },
    ] },
  { id: 'n_cp', w: 0.8, once: true, cond: () => isNavy() && G.job.rank >= 3, title: '사이퍼 폴의 스카우트',
    text: '정부 첩보기관 CP의 요원이 은밀히 접근했다. "육식 특훈을 받아볼 생각 없나?"',
    choices: [
      { t: '특훈을 받는다', run: () => { learn('rokushiki', 15); add('conn', 5); rec('CP 특훈 수료'); return '지옥 같은 반년이 지났다. 몸이 무기가 되었다.'; } },
      { t: '거절한다', run: () => { add('rep', 2); return '정의는 그림자 속에 있지 않다.'; } },
    ] },
  { id: 'n_corrupt', w: 1.2, cond: () => isNavy(), title: '상관의 부정',
    text: '상관이 해적과 뒷거래를 하는 장면을 목격했다.',
    choices: [
      { t: '고발한다', run: () => {
          if (P(0.5)) { add('rep', 10); addMerit(5); rec('정의를 관철'); return '상관은 강등되었다. 당신의 이름이 본부에 알려졌다.'; }
          addMerit(-5); add('conn', -5); return '오히려 모함을 받아 한직으로 밀려났다.';
        } },
      { t: '눈감는다', run: () => { add('wealth', 10); add('rep', -4); add('conn', 5); return '입막음 돈을 받았다. 마음이 무겁다.'; } },
    ] },
  { id: 'n_tenryu', w: 1, cond: () => isNavy() && G.job.rank >= 3, title: '천룡인 호위',
    text: '천룡인 호위 임무가 떨어졌다. 그가 지나가던 시민을 쏘려 한다.',
    choices: [
      { t: '명령에 따른다', run: () => { add('conn', 8); addMerit(3); return '눈을 감았다. 이것이 정의인가.'; } },
      { t: '시민을 감싼다', run: () => { addMerit(-4); add('rep', 12); return '징계를 받았지만 시민들은 당신을 기억한다.'; } },
      { t: '천룡인 몰래 시민을 피신시킨다', run: () => { if (P(0.6)) { add('rep', 8); addMerit(2); return '행렬이 오기 전에 골목의 시민들을 모두 대피시켰다.'; } addMerit(-6); add('rep', 6); return '들켰다. 감봉 처분을 받았다.'; } },
    ] },
  { id: 'n_buster', w: 0.6, once: true, cond: () => isNavy() && G.job.rank >= 8, title: '버스터 콜',
    text: '한 섬에 버스터 콜이 발동됐다. 피난선에는 아직 민간인이 있다.',
    choices: [
      { t: '명령대로 포격', run: () => { addMerit(15); add('rep', -6); return '섬은 지도에서 사라졌다.'; } },
      { t: '피난선을 먼저 보호', run: () => { addMerit(5); add('rep', 15); rec('버스터 콜의 양심'); return '명령 위반 직전까지 버티며 피난선을 지켰다.'; } },
    ] },
  { id: 'n_mentor', w: 0.7, once: true, cond: () => isNavy(), title: '영웅의 지도',
    run: () => { train(4); learn('arm', 6); G.flags.hakiOpen = true; add('conn', 6); rec('영웅에게 사사'); return '전설의 중장이 당신을 눈여겨봤다. "주먹에 사랑을 담아라!" 맞으면서 패기를 배웠다.'; } },
  { id: 'n_doubt', w: 1, cond: () => isNavy() && G.job.rank >= 2, title: '정의에 대한 의문',
    text: '"절대적 정의"의 이름으로 무고한 이들이 죽어간다. 이 코트를 계속 입어야 할까?',
    choices: [
      { t: '해군을 떠나 해적이 된다', run: () => {
          G.stats.crew = Math.floor(G.stats.crew / 3);
          G.flags.rokushiki = G.flags.rokushiki || G.skills.rokushiki > 0;
          add('rep', -10); rec('해군 탈영');
          return '정의의 코트를 바다에 던졌다. ' + becomePirate(false, true);
        } },
      { t: '안에서 바꾼다', run: () => { add('rep', 3); return '조직 안에서 싸우기로 했다.'; } },
    ] },

  /* =================== 8살: 스승 =================== */
  { id: 'tree8', forced: true, title: '여덟 살, 첫 스승',
    text: () => isCelestial() ? '성지의 가정교사들이 무엇을 배우고 싶은지 묻는다.' : '여덟 살이 되자 마을 어른들이 무엇을 배우고 싶은지 묻는다. 누구에게 배울까?',
    choices: () => [
      { t: G.place.id === 'wano' ? '사무라이 사범에게 검을 배운다' : '검술 사범에게 배운다', tag: '검술 개방', run: () => { learn('sword', 6); G.focus = 'sword'; rec('검술 사범의 제자'); return '목검을 처음 쥐었다. 사범이 말했다. "검은 마음으로 휘두르는 것이다." (수련 방향: 검술)'; } },
      { t: '무술가에게 권법을 배운다', tag: '단련 +5', run: () => { train(5); G.focus = 'body'; rec('무술가의 제자'); return '매일 바위를 치며 주먹을 단련했다.'; } },
      { t: '항해사에게 바다를 배운다', tag: '항해술', run: () => { G.flags.navigation = true; add('conn', 3); train(1); rec('항해사의 제자'); return '별과 바람과 해류 읽는 법을 배웠다. (도주 성공률 상승)'; } },
      { t: '의사에게 의술을 배운다', tag: '체력', run: () => { G.flags.medic = true; add('hp', 6); add('conn', 2); rec('의사의 제자'); return '약초와 붕대 감는 법을 배웠다. 다쳤을 때 회복이 빨라진다.'; } },
      { t: '아무에게도 안 배운다', run: () => { add('hp', 3); return '아직은 뛰어노는 게 더 좋다.'; } },
    ] },

  /* =================== 천룡인 (돈키호테 가문) =================== */
  { id: 'ln_dq_life', w: 5, cd: 4, celestial: true, cond: () => isCelestial() && G.age >= 3, title: '성지의 나날',
    text: () => pick(['노예가 무릎 꿇고 당신의 신발을 닦는다.', '하계를 내려다보는 정원에서 차를 마신다.', '형이 노예를 걷어차며 웃고 있다.']),
    choices: [
      { t: '당연하다는 듯 군다', run: () => { add('wealth', 2); add('rep', -2); return '천룡인에게 하계의 사람은 사람이 아니다. 그렇게 배웠다.'; } },
      { t: '몰래 노예에게 음식을 준다', run: () => { add('food', -3); add('rep', 3); G.flags.kind = true; return '노예 소녀가 눈물을 글썽이며 빵을 받았다.'; } },
      { t: '하계에 대해 묻는다', run: () => { add('conn', 2); return '"하계는 더럽고 미개한 곳이란다." 어머니는 그렇게만 말했다.'; } },
    ] },
  { id: 'ln_dq_fall', forced: true, title: '성지를 떠나다',
    text: '아버지가 선언했다. "우리는 천룡인의 지위를 버리고 하계에서 사람으로 살겠다." 가족은 성지를 떠나 북쪽 바다의 외딴 마을로 내려왔다.',
    choices: [
      { t: '아버지를 따른다', run: () => fallFromGrace('아버지의 손을 잡고 레드 라인을 내려왔다.') },
      { t: '아버지를 원망한다', run: () => { G.flags.grudge = true; return fallFromGrace('이를 갈며 아버지를 노려봤다. 언젠가 성지로 돌아가겠다.'); } },
    ] },
  { id: 'ln_dq_hunted', forced: true, title: '천룡인 사냥',
    text: '마을 사람들이 당신 가족의 정체를 알아냈다. 횃불을 든 사람들이 집을 둘러쌌다.',
    choices: [
      { t: '맞서 싸운다', enemy: 30, run: () => fightResult(fight(30, 0.05, '성난 마을 사람들'),
          () => { add('rep', -5); train(3); return '몽둥이를 빼앗아 휘둘렀다. 사람들이 물러났지만 증오는 더 깊어졌다.'; },
          () => { hurt(10); return '불타는 집에서 간신히 빠져나왔다.'; }) },
      { t: '도망친다', run: () => { hurt(6); add('food', -5); return '쓰레기 더미 속에 숨어 밤을 지새웠다.'; } },
      { t: '울며 용서를 빈다', run: () => { hurt(8); add('rep', 3); return '"우리가 무슨 잘못을 했나요!" 몇몇이 고개를 돌렸다.'; } },
    ] },
  { id: 'ln_donquixote', w: 0.5, cd: 48, tag: 'bad', cond: () => G.lineage.id === 'donquixote' && G.flags.fallen && G.age >= 12, title: '천룡인의 피',
    text: '누군가 당신이 옛 천룡인이라는 걸 알아챘다. 사람들의 눈빛이 변한다.',
    choices: [
      { t: '정면으로 견딘다', run: () => { hurt(5); add('rep', 3); return '돌을 맞으면서도 고개를 들었다.'; } },
      { t: '이름을 숨기고 떠난다', run: () => { add('conn', -3); return '다른 마을에서 다른 이름으로 살았다.'; } },
      { t: '공포로 입을 막는다', enemy: 35, run: () => fightResult(fight(35, 0.03, '마을 장정'),
          () => { add('rep', -6); train(2); return '아무도 다시는 그 이야기를 꺼내지 않았다.'; },
          () => '오히려 더 크게 당했다.') },
    ] },

  /* =================== 장수 =================== */
  { id: 'g_longevity', w: 0.3, once: true, cond: () => G.age >= 30 && !G.flags.longevity, title: '장수의 비결',
    text: '나이가 140살이 넘었다는 마녀 같은 의사를 만났다. "젊음의 비결 말이냐? 히-히-히!"',
    choices: [
      { t: '비결을 배운다', need: '재산 20', cond: () => G.stats.wealth >= 20, run: () => { add('wealth', -20); G.flags.longevity = true; rec('장수의 비결'); return '독한 술과 약초, 그리고 지독한 잔소리. 노환으로 죽을 확률이 크게 줄었다.'; } },
      { t: '진찰만 받는다', run: () => { add('hp', 15); return '"아직 쓸 만한 몸이구먼." 등짝을 맞고 쫓겨났다.'; } },
    ] },

  /* =================== 식량 =================== */
  { id: 'g_supply', w: 0, cd: 6, cond: () => G.stats.food < 15 && G.age >= 10 && !isCelestial(), title: '식량이 떨어져 간다',
    text: () => atSea() ? '창고가 비어 간다. 다음 섬까지 버틸 수 있을까?' : '부엌 선반이 비어 간다. 뭔가 구해야 한다.',
    choices: () => [
      { t: '돈을 주고 산다', need: '재산 6', cond: () => G.stats.wealth >= 6, run: () => { add('wealth', -6); add('food', 15); return atSea() ? '지나가던 상선에게 식량을 샀다.' : '시장에서 쌀과 말린 고기를 샀다.'; } },
      { t: atSea() ? '바다낚시를 한다' : '사냥과 채집을 나간다', run: () => { if (P(0.7)) { add('food', R(8, 14)); return '먹을 걸 넉넉히 구해 왔다.'; } hurt(R(3, 6)); add('food', R(2, 4)); return '고생만 하고 조금밖에 못 구했다.'; } },
      { t: atSea() ? '상선을 턴다' : '창고에서 훔친다', tag: '위험', cond: () => !isNavy(), need: '해군은 불가', run: () => { add('rep', -6); if (P(0.65)) { add('food', R(12, 18)); return '들키지 않고 식량을 챙겼다.'; } hurt(8); return '들켜서 얻어맞았다.'; } },
      { t: '허리띠를 졸라맨다', run: () => '조금만 더 버텨 보기로 했다.' },
    ] },
  { id: 'p_spoil', w: 1.5, tag: 'bad', cond: () => atSea(), title: '배 위의 사고',
    text: () => pick(['창고를 열자 시큼한 냄새가 났다. 고기가 상했다.', '밤사이 쥐 떼가 식량 창고를 습격했다.', '선원 한 명이 몰래 식량을 빼돌리다 걸렸다.']),
    choices: [
      { t: '상한 건 버린다', run: () => { add('food', -R(5, 9)); return '아깝지만 바다에 버렸다.'; } },
      { t: '아까우니 먹는다', tag: '위험', run: () => { add('food', -2); if (P(0.5)) { hurt(R(5, 10)); return '선원 절반이 배탈로 쓰러졌다.'; } return '다행히 아무도 탈이 나지 않았다.'; } },
      { t: '요리사에게 맡긴다', run: () => { add('food', -R(2, 4)); if (P(0.5)) { add('hp', 3); return '요리사가 기적처럼 맛있는 수프를 만들었다.'; } return '요리사가 한숨을 쉬며 쓸 만한 것만 골라냈다.'; } },
    ] },

  /* =================== 네임드 해적단 =================== */
  { id: 'y_scout', w: 2, cd: 12, cond: () => G.age >= 14 && G.age < 18 && G.job.type === 'none' && G.tree !== 'navy' && !isCelestial(), title: '유명 해적단의 스카우트',
    text: '이름만 들어도 바다가 떨리는 해적단이 섬에 들렀다. 그 배의 간부가 당신을 눈여겨본다. "꼬마, 우리 배에 탈 생각 없나?"',
    choices: () => [...crewOffers(3), { t: '아직은 이르다', run: () => '배가 떠나는 것을 끝까지 지켜보았다.' }] },
  { id: 'p_independent', w: 2, cd: 16, cond: () => isPirate() && G.job.crewId && G.age >= 22, title: '독립의 갈림길',
    text: () => `${myCrew().boss}이(가) 술잔을 건넸다. "네 배를 가질 때가 된 것 같구나."`,
    choices: [
      { t: '내 해적단을 세운다', run: () => { const c = myCrew(); G.job.crewId = null; G.crewName = `${G.name} 해적단`; add('crew', R(5, 12)); add('conn', 8); rec('독립'); return `${c.name}의 축복 속에 자신의 깃발을 올렸다. 이제 칠무해·사황의 길이 열린다.`; } },
      { t: '이 배에 남는다', run: () => { add('conn', 3); return '"이 배가 내 집이다." 동료들이 환호했다.'; } },
    ] },
  { id: 'p_named', w: 1, cd: 16, cond: () => isPirate() && G.age >= 18, title: '거물 해적단과의 조우',
    text: () => { const id = pickRivalCrew(); G.flags.foe = id; const c = NAMED_CREWS[id]; return `수평선에 ${c.boss}의 깃발이 보인다. 「${c.name}」이다.`; },
    choices: () => { const c = NAMED_CREWS[G.flags.foe]; return [
      { t: '싸움을 건다', enemy: c.power, kill: c.kill, tag: '위험', run: () => fightResult(fight(c.power, 0.25, c.boss, c.kill),
          () => { add('crew', R(3, 8)); add('conn', 6); rec(`${c.name} 격파`); return `믿기 힘든 승리! 「${c.name}」을 물리쳤다. ` + addBounty(15000); },
          () => { add('crew', -R(5, 12)); return `${c.boss}의 일격에 함대가 부서졌다. 겨우 살아남았다.`; }) },
      { t: '피해서 돌아간다', tag: () => `성공 ${Math.round(escapeChance(0.6) * 100)}%`, run: () => { if (P(escapeChance(0.6))) return '항로를 틀어 마주치지 않았다.'; hurt(R(8, 15)); add('crew', -R(2, 5)); return '추격당해 포격을 맞았다.'; } },
      { t: '술 한잔 청한다', run: () => { if (P(0.4 + G.stats.conn / 200)) { add('conn', 8); return `${c.boss}이(가) 껄껄 웃으며 술통을 굴려 보냈다. 바다의 거물과 인연이 생겼다.`; } hurt(R(5, 10)); return '"애송이가 감히." 위압감만으로 몸이 굳었다.'; } },
    ]; } },
  { id: 'n_named', w: 1.2, cd: 12, cond: () => isNavy() && G.job.rank >= 4, title: '거물 해적단 토벌령',
    text: () => { const id = pickRivalCrew(); G.flags.foe = id; const c = NAMED_CREWS[id]; return `본부 긴급 명령: 「${c.name}」이 근해에 나타났다. 함대를 이끌고 대응하라.`; },
    choices: () => { const c = NAMED_CREWS[G.flags.foe]; return [
      { t: '정면으로 맞선다', enemy: c.power, kill: c.kill, tag: '위험', run: () => fightResult(fight(c.power, 0.25, c.boss, c.kill),
          () => { G.job.captures += R(3, 8); addMerit(R(20, 30)); add('rep', 15); rec(`${c.name} 토벌`); return `「${c.name}」의 간부들을 체포했다! 해군 역사에 남을 전과다.`; },
          () => { add('crew', -R(5, 10)); return '함대가 괴멸했다. 겨우 살아 돌아왔다.'; }) },
      { t: '민간인 대피를 우선한다', run: () => { add('rep', 10); addMerit(4); return '전투는 피했지만 섬 주민들을 모두 구했다.'; } },
      { t: '증원을 기다린다', run: () => { addMerit(2); return '대장급 증원이 도착할 때까지 거리를 유지했다.'; } },
    ]; } },
  { id: 'n_guard', w: 2, tag: 'good', navyCatch: true, cond: () => isNavy(), title: '마을 수비 임무',
    text: '해적의 습격 예고가 있는 마을에 배치됐다.',
    choices: [
      { t: '마을 앞바다를 지킨다', enemy: () => navyEnemy(-5), run: () => fightResult(fight(navyEnemy(-5), 0.06, '습격 해적'),
          () => { add('rep', 8); addMerit(R(3, 5)); G.job.captures += 1; return '해적선을 막아냈다. 마을 사람들이 꽃다발을 건넸다.'; },
          () => { add('rep', 3); return '피해를 줄이는 데 그쳤지만 주민들은 고마워했다.'; }) },
      { t: '주민들에게 대피 훈련을 시킨다', run: () => { add('rep', 6); add('conn', 3); return '아이들까지 대피로를 외웠다.'; } },
      { t: '마을 청년들을 훈련시킨다', run: () => { add('rep', 4); train(2); return '자경단이 생겼다.'; } },
    ] },

  /* =================== 세계의 큰 사건 =================== */
  { id: 'w_marineford', w: 3, once: true, tag: 'major', cond: () => G.age >= 18, title: '정상전쟁',
    text: '해군 본부가 거물 해적의 공개 처형을 발표했다. 사황의 해적단이 마린포드로 향하고, 칠무해와 해군 대장들이 집결했다. 세계가 숨을 죽였다.',
    choices: () => [
      { t: '해적 편으로 참전한다', cond: () => isPirate(), need: '해적만', enemy: 140, kill: 0.08, tag: '위험', run: () => fightResult(fight(140, 0.3, '해군 대장', 0.08),
          () => { add('conn', 15); add('crew', R(3, 8)); rec('정상전쟁 생존'); return '불과 얼음과 빛이 쏟아지는 전장에서 살아남았다. 세상이 당신의 이름을 기억한다. ' + addBounty(30000); },
          () => { add('crew', -R(8, 15)); rec('정상전쟁 생존'); return '처참한 패배. 그래도 살아서 바다로 돌아왔다.'; }) },
      { t: '해군 방어선을 지킨다', cond: () => isNavy(), need: '해군만', enemy: 140, kill: 0.08, tag: '위험', run: () => fightResult(fight(140, 0.3, '사황 해적단', 0.08),
          () => { addMerit(30); add('rep', 15); rec('정상전쟁 생존'); return '방어선을 끝까지 지켰다. 원수가 직접 당신의 이름을 불렀다.'; },
          () => { addMerit(8); rec('정상전쟁 생존'); return '중상을 입고 후송되었다.'; }) },
      { t: '"이제 그만!" 전쟁을 멈추라 외친다', tag: '위험', cond: () => atSea(), need: '참전자만', run: () => {
          if (P(0.35)) { add('rep', 20); add('conn', 10); rec('전쟁을 멈춘 목소리'); return '당신의 외침에 전장이 한순간 멈췄다. 그 몇 초가 수많은 목숨을 살렸다.'; }
          hurt(20); return '목소리는 포성에 묻혔다.'; } },
      { t: '영상 전전벌레로 지켜본다', run: () => { rec('정상전쟁 목격'); return '광장의 화면 앞에서 모두가 말을 잃었다. 한 시대가 끝나고 있었다.'; } },
    ] },
  { id: 'w_impeldown', w: 2, once: true, tag: 'major', cond: () => G.age >= 20 && atSea(), title: '임펠 다운 대탈옥',
    text: '바다 밑 대감옥 임펠 다운에서 사상 최대의 탈옥이 일어났다. 레벨 6의 흉악범들이 바다로 쏟아져 나온다.',
    choices: () => isNavy() ? [
      { t: '탈옥수를 추격한다', enemy: () => navyEnemy(15), run: () => fightResult(fight(navyEnemy(15), 0.15, '탈옥수'),
          () => { G.job.captures += R(2, 5); addMerit(R(10, 16)); add('rep', 6); return '흉악범 여럿을 다시 감옥에 넣었다.'; },
          () => '탈옥수들의 반격에 크게 다쳤다.') },
      { t: '항구 봉쇄에 집중한다', run: () => { addMerit(5); add('rep', 4); return '민간 항구를 지켜냈다.'; } },
    ] : [
      { t: '탈옥수를 동료로 맞는다', run: () => { add('crew', R(5, 10)); add('rep', -6); return '거친 놈들이 배에 올랐다. ' + addBounty(5000); } },
      { t: '혼란을 틈타 보물을 챙긴다', run: () => { add('wealth', R(10, 20)); return '정부 수송선을 털었다.'; } },
      { t: '엮이지 않는다', run: () => '괴물들과는 거리를 두었다.' },
    ] },
  { id: 'w_wano', w: 2, once: true, tag: 'major', cond: () => G.age >= 20 && (atSea() || G.place.id === 'wano' || G.place.id === 'onigashima'), title: '오니가시마 결전',
    text: '와노쿠니의 사무라이와 해적 동맹이 오니가시마로 쳐들어간다. 상대는 「이 세상에서 가장 강한 생물」의 군단.',
    choices: () => [
      { t: '동맹군에 합류한다', cond: () => !isNavy() && G.job.crewId !== 'beasts', need: '해군·백수 해적단 불가', enemy: 160, kill: 0.15, tag: '위험', run: () => fightResult(fight(160, 0.3, '「백수」', 0.15),
          () => { add('rep', 20); add('conn', 12); rec('오니가시마 결전 승리'); G.flags.escaped = true; return '새벽, 와노쿠니의 하늘에 해가 떴다. 20년 만의 개국이다.' + (isPirate() ? ' ' + addBounty(40000) : ''); },
          () => { hurt(15); return '전장에서 쓰러졌다가 동료에게 업혀 나왔다.'; }) },
      { t: '백수 해적단 편에서 싸운다', cond: () => isPirate(), need: '해적만', enemy: 150, run: () => fightResult(fight(150, 0.25, '동맹군'),
          () => { add('wealth', 20); add('rep', -10); return '침입자들을 막아냈지만 세상은 당신을 악당으로 기억한다. ' + addBounty(15000); },
          () => '동맹군의 기세에 밀려났다.') },
      { t: '해군으로서 사태를 지켜본다', cond: () => isNavy(), need: '해군만', run: () => { addMerit(4); return '결과 보고서를 쓰며 시대가 바뀌는 걸 느꼈다.'; } },
      { t: '바다 건너 소식만 듣는다', run: () => { rec('와노쿠니 개국 목격'); return '「와노쿠니 개국」이라는 신문 1면을 오래 들여다봤다.'; } },
    ] },
  { id: 'w_reverie', w: 1.5, once: true, tag: 'major', cond: () => G.age >= 16, title: '세계회의',
    text: '4년에 한 번, 각국의 왕들이 성지 마리조아에 모인다. 이번 회의에서는 「칠무해 제도 철폐」가 논의된다는 소문이다.',
    choices: [
      { t: '찬성한다', run: () => { if (isPirate() && G.job.stage === 1) return '자기 목줄을 끊는 일에 찬성하다니, 묘한 기분이다.'; return '해적에게 특권 따위 필요 없다.'; } },
      { t: '반대한다', run: () => '칠무해가 없어지면 바다의 균형이 무너진다.' },
      { t: '관심 없다', run: () => '왕들의 회의는 먼 나라 이야기다.' },
    ] },

  /* =================== 해군 (추가) =================== */
  { id: 'n_wanted', w: 3, navyCatch: true, cond: () => isNavy(), title: '수배자 추적',
    text: () => `수배서의 해적 「${pick(['쌍칼', '독사', '외눈', '붉은 수염', '모래폭풍', '철가면'])}」가 이 섬에 숨어들었다는 제보가 들어왔다.`,
    choices: [
      { t: '직접 잠복한다', enemy: () => navyEnemy(-5), run: () => fightResult(fight(navyEnemy(-5), 0.06, '수배범'),
          () => { G.job.captures += 1; addMerit(R(4, 7)); add('rep', 3); return '주점 뒷골목에서 수배범을 덮쳐 수갑을 채웠다.'; },
          () => '수배범이 지붕을 타고 달아났다.') },
      { t: '탐문 수사를 한다', tag: () => `성공 ${Math.round(clamp(0.45 + G.stats.conn / 150, 0, 0.95) * 100)}%`, run: () => {
          if (P(0.45 + G.stats.conn / 150)) { G.job.captures += 1; addMerit(R(3, 5)); add('conn', 2); return '주민들의 증언을 모아 은신처를 찾아냈다.'; }
          add('conn', 1); return '단서가 끊겼다.'; } },
      { t: '현상금 사냥꾼과 손잡는다', run: () => { G.job.captures += 1; addMerit(R(2, 3)); add('rep', -2); add('wealth', -3); return '사냥꾼이 잡아 온 수배범을 넘겨받았다. 공은 반으로 줄었다.'; } },
    ] },
  { id: 'n_port', w: 2.5, navyCatch: true, cond: () => isNavy(), title: '항구 습격',
    text: '해적들이 항구 마을을 습격하고 있다는 긴급 연락이 들어왔다.',
    choices: [
      { t: '전속력으로 출동한다', enemy: () => navyEnemy(), run: () => fightResult(fight(navyEnemy(), 0.1, '습격 해적'),
          () => { G.job.captures += R(2, 4); addMerit(R(5, 9)); add('rep', 6); return '약탈 중이던 해적들을 일망타진했다.'; },
          () => { add('rep', 2); add('crew', -R(1, 3)); return '해적들이 약탈품을 챙겨 도망쳤다.'; }) },
      { t: '퇴로를 먼저 막는다', run: () => { if (P(0.55 + G.stats.crew / 200)) { G.job.captures += R(1, 3); addMerit(R(4, 7)); return '바다 쪽 퇴로를 막자 해적들이 꼼짝없이 갇혔다.'; } add('rep', -2); return '그사이 마을 피해가 커졌다.'; } },
      { t: '주민 구조에 집중한다', run: () => { add('rep', 8); addMerit(2); return '해적은 놓쳤지만 다친 사람은 한 명도 없었다.'; } },
    ] },
  { id: 'n_convoy', w: 2, cond: () => isNavy(), title: '호송 임무',
    text: () => pick(['세계 정부 보물선 호송 명령이 떨어졌다.', '임펠 다운으로 가는 죄수 호송선을 지키라는 명령이다.', '왕족이 탄 여객선을 호위하게 되었다.']),
    choices: [
      { t: '원칙대로 호위한다', run: () => { if (P(0.7)) { addMerit(R(3, 5)); add('conn', 2); return '아무 일 없이 목적지에 도착했다.'; } hurt(R(4, 8)); addMerit(2); return '도중에 해적의 기습을 받았지만 막아냈다.'; } },
      { t: '미끼 배를 띄운다', run: () => { if (P(0.5)) { G.job.captures += R(1, 2); addMerit(R(5, 8)); return '미끼에 걸려든 해적선을 나포했다!'; } addMerit(1); return '해적은 나타나지 않았다.'; } },
      { t: '호송 인원과 친해진다', run: () => { add('conn', 5); addMerit(1); return '긴 항해 동안 여러 사람과 얼굴을 익혔다.'; } },
    ] },
  { id: 'n_recruits', w: 1.5, tag: 'good', cond: () => isNavy() && G.job.rank >= 2, title: '신병 교육',
    text: '새로 배치된 신병들의 교육을 맡게 되었다.',
    choices: [
      { t: '엄하게 단련시킨다', run: () => { add('crew', R(3, 6)); train(1); return '신병들이 이를 악물고 따라왔다. 쓸 만한 부하가 늘었다.'; } },
      { t: '정의가 무엇인지 가르친다', run: () => { add('rep', 4); add('crew', R(2, 4)); return '"우리가 지키는 건 깃발이 아니라 사람이다."'; } },
      { t: '실전에 데려간다', enemy: () => navyEnemy(-10), run: () => fightResult(fight(navyEnemy(-10), 0.04, '잔챙이 해적'),
          () => { add('crew', R(4, 7)); G.job.captures += 1; addMerit(3); return '신병들이 첫 체포를 해냈다.'; },
          () => { add('crew', -1); return '신병 하나가 다쳤다.'; }) },
    ] },
  { id: 'n_rival', w: 1.2, cd: 16, cond: () => isNavy(), title: '동기와의 경쟁',
    text: '같은 해에 입대한 동기가 먼저 진급할 것 같다는 소문이다.',
    choices: [
      { t: '실적으로 이긴다', run: () => { addMerit(R(3, 6)); hurt(R(2, 5)); return '밤낮없이 순찰을 돌았다.'; } },
      { t: '함께 작전을 짠다', run: () => { G.job.captures += 1; addMerit(R(2, 4)); add('conn', 4); return '둘이 손잡고 해적단 하나를 잡았다. 공은 반반.'; } },
      { t: '신경 쓰지 않는다', run: () => { add('hp', 4); return '정의는 경쟁이 아니다.'; } },
    ] },
  { id: 'n_exam', w: 1.5, cond: () => isNavy() && G.job.rank < NAVY_RANKS.length - 1, title: '진급 심사',
    text: () => `${NAVY_RANKS[G.job.rank + 1][0]} 진급 심사가 열린다. 심사관들이 실력을 보겠다고 한다.`,
    choices: [
      { t: '실기 시험을 본다', enemy: () => navyEnemy(5), run: () => fightResult(fight(navyEnemy(5), 0, '시험관'),
          () => { addMerit(R(6, 10)); return '시험관을 쓰러뜨렸다. 심사장이 웅성거렸다.'; },
          () => { addMerit(2); return '아깝게 떨어졌다. 다음 기회를 노린다.'; }) },
      { t: '작전 보고서로 승부한다', run: () => { if (P(0.4 + G.job.captures / 100)) { addMerit(R(5, 8)); return `체포 기록 ${G.job.captures}건이 빼곡한 보고서가 심사관들을 감탄시켰다.`; } addMerit(1); return '보고서가 너무 짧았다.'; } },
      { t: '추천서를 받는다', need: '인맥 20', cond: () => G.stats.conn >= 20, run: () => { addMerit(R(4, 7)); add('conn', -3); return '옛 상관의 추천서가 힘을 썼다.'; } },
    ] },
  { id: 'n_g5', w: 0.8, once: true, cond: () => isNavy() && G.job.rank >= 3, title: 'G-5 지부 전출',
    text: '신세계의 거친 지부 G-5로 전출 명령이 내려왔다. 해적보다 해군이 더 무섭다는 곳이다.',
    choices: [
      { t: '받아들인다', run: () => { train(3); G.job.captures += R(2, 4); addMerit(R(8, 12)); add('rep', -2); G.flags.hakiOpen = true; rec('G-5 근무'); return '험악한 부하들과 함께 신세계의 해적을 쓸어 담았다. 패기에 눈뜬 것도 이때였다.'; } },
      { t: '본부 근무를 요청한다', run: () => { add('conn', 4); return '상관에게 밉보였지만 본부에 남았다.'; } },
    ] },
  { id: 'n_undercover', w: 1, cd: 16, navyCatch: true, cond: () => isNavy() && G.job.rank >= 2, title: '잠입 수사',
    text: '해적들이 모이는 무법 항구에 신분을 숨기고 잠입하라는 명령이다.',
    choices: [
      { t: '해적인 척 잠입한다', tag: '위험', run: () => { if (P(0.55 + G.skills.obs * 0.1)) { G.job.captures += R(2, 5); addMerit(R(8, 12)); return '밀거래 현장을 덮쳐 한꺼번에 체포했다.'; } hurt(R(10, 16)); return '정체가 들통나 집단 폭행을 당했다.'; } },
      { t: '밖에서 감시만 한다', run: () => { addMerit(R(2, 3)); add('conn', 2); return '드나드는 배를 모두 기록해 본부에 넘겼다.'; } },
    ] },

  /* =================== 이어지는 이야기 =================== */
  /* 1. 표류자 */
  { id: 'arc_castaway', w: 1.2, once: true, cond: () => G.age >= 12 && !isCelestial(), title: '표류자',
    text: () => (atSea() ? '갑판 옆으로' : '해변으로') + ' 부서진 나뭇조각에 매달린 사람이 떠밀려 왔다. 아직 숨이 붙어 있다. 품 안에 무언가 묵직한 것이 보인다.',
    choices: [
      { t: '데려가 간호한다', desc: '식량을 나눠야 한다', run: () => {
          add('food', -6); G.flags.castawayWho = pick(['prince', 'shipwright', 'fugitive']); later('arc_castaway2', 8, 16);
          return '사흘 밤낮을 간호하자 그가 눈을 떴다. 이름도 말하지 않고 "이 은혜는 잊지 않겠다"는 말만 남기고 사라졌다.'; } },
      { t: '품 속의 물건을 챙긴다', tag: '평판 하락', run: () => {
          add('wealth', R(6, 12)); add('rep', -4); later('arc_castaway_rev', 12, 24);
          return '금화가 든 주머니였다. 그가 정신을 차리기 전에 자리를 떴다.'; } },
      { t: '해군에 넘긴다', run: () => { add('rep', 3); if (isNavy()) addMerit(2); return '해군이 그를 데려갔다. 수배자였는지 포상금이 나왔다.'; } },
      { t: '못 본 척 지나간다', run: () => '파도 소리만 들렸다.' },
    ] },
  { id: 'arc_castaway2', forced: true, title: '그때의 표류자',
    text: () => ({
      prince: '오래전 당신이 살린 표류자가 찾아왔다. 그는 멸망한 왕국의 왕자였다. "나라를 되찾을 군자금이 필요하다. 함께해 주겠나?"',
      shipwright: '오래전 당신이 살린 표류자가 찾아왔다. 그는 이름난 조선공이었다. "은혜를 갚게 해 주게. 무엇이든 만들어 주지."',
      fugitive: '오래전 당신이 살린 표류자의 얼굴이 수배서에 실렸다. 임펠 다운 탈옥수였다. 그리고 오늘 밤, 그가 문을 두드렸다. "숨겨 줘."',
    }[G.flags.castawayWho]),
    choices: () => ({
      prince: [
        { t: '군자금을 보탠다', need: '재산 10', cond: () => G.stats.wealth >= 10, run: () => { add('wealth', -10); later('arc_castaway3', 16, 32); return '"반드시 갚겠다." 왕자는 깊이 고개를 숙였다.'; } },
        { t: '직접 싸움에 나선다', enemy: 50, tag: '위험', run: () => fightResult(fight(50, 0.12, '찬탈자의 군대'),
            () => { add('conn', 15); add('rep', 10); add('wealth', 20); rec('망국의 은인'); return '찬탈자를 몰아내고 왕자를 왕좌에 앉혔다. 왕국 전체가 당신의 이름을 외쳤다.'; },
            () => '반란은 실패했다. 왕자는 다시 바다로 사라졌다.') },
        { t: '정중히 거절한다', run: () => { add('conn', 3); return '왕자는 쓸쓸히 웃으며 떠났다.'; } },
      ],
      shipwright: [
        { t: '튼튼한 배를 부탁한다', run: () => { G.flags.goodShip = true; rec('명장의 배'); return '폭풍에도 끄떡없는 배가 완성됐다. (도주 성공률 상승)' + (atSea() ? '' : ' 언젠가 바다에 나갈 때 쓰기로 했다.'); } },
        { t: '동료가 되어 달라고 한다', cond: () => isPirate(), need: '해적만', run: () => { add('crew', 3); add('conn', 4); rec('천재 조선공 합류'); return '"좋지! 네 배는 내가 지킨다."'; } },
        { t: '마을 사람들의 배를 고쳐 달라고 한다', run: () => { add('rep', 8); add('conn', 4); return '마을의 낡은 어선들이 새것처럼 바뀌었다.'; } },
      ],
      fugitive: [
        { t: '숨겨 준다', tag: '위험', run: () => { if (P(0.7)) { add('conn', 8); rec('탈옥수의 은인'); return '해군이 마을을 뒤졌지만 그를 찾지 못했다. 그는 바다 너머 어딘가에서 당신에게 빚을 졌다.'; } hurt(12); add('rep', -8); return '들켰다. 해군에게 끌려가 심문을 받았다.'; } },
        { t: '해군에 신고한다', run: () => { add('rep', 5); add('wealth', 10); if (isNavy()) { G.job.captures += 1; addMerit(6); } return '그는 원망 어린 눈으로 끌려갔다.'; } },
        { t: '배를 내주고 떠나보낸다', run: () => { add('wealth', -5); add('conn', 4); return '"살아남아." 짧게 말하고 등을 돌렸다.'; } },
      ],
    }[G.flags.castawayWho]) },
  { id: 'arc_castaway3', forced: true, title: '왕의 편지',
    text: '먼 나라에서 왕의 인장이 찍힌 편지가 도착했다. 그때의 왕자가 마침내 나라를 되찾았다고 한다.',
    choices: [
      { t: '초대에 응한다', run: () => { add('wealth', 30); add('conn', 12); rec('망국의 은인'); return '왕궁 연회의 상석에 앉았다. "이 나라의 은인이다."'; } },
      { t: '편지만 간직한다', run: () => { add('rep', 6); return '답장 대신 바다를 향해 잔을 들었다.'; } },
    ] },
  { id: 'arc_castaway_rev', forced: true, title: '돌아온 표류자',
    text: '언젠가 당신이 금화를 털었던 그 표류자가 나타났다. 이제 그는 칼을 찬 현상금 사냥꾼이다. "기억하나?"',
    choices: [
      { t: '맞서 싸운다', enemy: () => Math.round(power() * 0.9 / D().enemy), run: () => fightResult(fight(Math.round(power() * 0.9 / D().enemy), 0.1, '복수자'),
          () => { add('rep', -3); return '그를 쓰러뜨렸다. 마음 한구석이 무겁다.'; },
          () => '처절하게 당했다. 그는 금화 한 닢을 던지고 떠났다.') },
      { t: '사과하고 돈을 돌려준다', need: '재산 15', cond: () => G.stats.wealth >= 15, run: () => { add('wealth', -15); add('rep', 5); add('conn', 3); return '그는 한참을 노려보다 칼을 거뒀다. "그때 넌 어렸지."'; } },
      { t: '도망친다', run: () => { if (P(escapeChance(0.5))) return '골목으로 사라졌다. 언젠가 또 올 것이다.'; hurt(10); return '등에 칼을 맞았다.'; } },
    ] },

  /* 2. 빚 */
  { id: 'g_loan', w: 0.8, cd: 40, cond: () => G.age >= 18 && G.stats.wealth < 20 && !isCelestial() && !G.flags.debt, title: '사채업자',
    text: '금니를 번쩍이는 사채업자가 다가왔다. "돈이 궁해 보이는구먼. 25만큼 빌려주지. 이자는… 나중에 얘기하고."',
    choices: [
      { t: '빌린다', run: () => { add('wealth', 25); G.flags.debt = true; later('arc_debt', 8, 12); return '두툼한 돈주머니를 받았다. 사채업자가 이를 드러내며 웃었다.'; } },
      { t: '거절한다', run: () => '"마음 바뀌면 찾아오라고."' },
    ] },
  { id: 'arc_debt', forced: true, title: '빚 독촉',
    text: '사채업자가 덩치 셋을 데리고 나타났다. "이자까지 35. 오늘 갚아야겠어."',
    choices: [
      { t: '깨끗이 갚는다', need: '재산 35', cond: () => G.stats.wealth >= 35, run: () => { add('wealth', -35); G.flags.debt = false; return '돈을 던져 주자 그들은 아쉬운 듯 물러났다.'; } },
      { t: '몸으로 갚는다', run: () => { hurt(R(8, 14)); train(2); add('wealth', -Math.min(G.stats.wealth, 10)); G.flags.debt = false; return '반년 동안 그들의 배에서 노예처럼 일했다.'; } },
      { t: '덩치들을 때려눕힌다', enemy: 40, run: () => fightResult(fight(40, 0.05, '사채업자 일당'),
          () => { G.flags.debt = false; add('rep', -3); return '덩치들을 바다에 던졌다. 사채업자는 다시 나타나지 않았다.'; },
          () => { add('wealth', -Math.min(G.stats.wealth, 15)); G.flags.debt = false; return '흠씬 맞고 가진 것을 다 빼앗겼다.'; }) },
      { t: '야반도주한다', run: () => { add('rep', -8); G.flags.debt = false; later('arc_debt', 16, 24); return '밤배를 타고 섬을 떠났다. 그들이 포기할까?'; } },
    ] },

  /* 3. 반쪽 지도 */
  { id: 'g_halfmap', w: 0.8, once: true, cond: () => G.age >= 16 && !isCelestial(), title: '찢어진 지도',
    text: '노점 구석에 반쪽만 남은 보물 지도가 있다. 상인은 "나머지 반쪽을 가진 놈이 어딘가 있을 거요"라며 웃는다.',
    choices: [
      { t: '산다', need: '재산 8', cond: () => G.stats.wealth >= 8, run: () => { add('wealth', -8); later('arc_halfmap', 12, 24); return '반쪽 지도를 품에 넣었다. 섬 하나의 해안선과 붉은 X의 절반.'; } },
      { t: '훔친다', tag: '위험', run: () => { if (P(0.6)) { add('rep', -3); later('arc_halfmap', 12, 24); return '상인이 한눈파는 사이 지도를 챙겼다.'; } hurt(5); add('rep', -6); return '붙잡혀 혼쭐이 났다.'; } },
      { t: '사기라고 생각한다', run: () => '반쪽짜리 지도에 돈을 쓸 바보는 없다.' },
    ] },
  { id: 'arc_halfmap', forced: true, title: '나머지 반쪽',
    text: '주점에서 낯선 사람이 당신의 지도를 흘끗 보더니, 자기 품에서 꼭 맞는 반쪽을 꺼냈다.',
    choices: [
      { t: '동업해서 함께 찾는다', run: () => { if (P(0.6)) { add('wealth', R(25, 40)); add('conn', 5); rec('반쪽 지도의 보물'); return '두 지도를 맞추자 섬이 드러났다. 보물을 사이좋게 나눴다.'; } add('conn', 3); return '보물 상자는 이미 비어 있었다. 대신 좋은 친구가 생겼다.'; } },
      { t: '반쪽을 빼앗는다', enemy: 40, run: () => fightResult(fight(40, 0.06, '지도의 주인'),
          () => { add('wealth', R(35, 50)); add('rep', -6); rec('반쪽 지도의 보물'); return '지도를 빼앗아 혼자 보물을 찾았다. 금화가 산더미다.'; },
          () => { return '오히려 내 반쪽까지 빼앗겼다.'; }) },
      { t: '내 반쪽을 판다', run: () => { add('wealth', 14); return '흥정 끝에 꽤 좋은 값을 받았다.'; } },
    ] },

  /* 4. 부두의 아이 */
  { id: 'g_orphan', w: 0.8, once: true, cond: () => G.age >= 25 && G.age <= 55 && !isCelestial(), title: '부두의 아이',
    text: '부두에서 비쩍 마른 아이가 생선을 훔치다 붙잡혔다. 어른들이 몽둥이를 들었다. 아이가 당신을 바라본다.',
    choices: [
      { t: '아이를 거둔다', desc: '오래 걸리는 선택이다', run: () => { add('food', -5); G.flags.ward = true; later('arc_orphan', 40, 56); rec('아이를 거둠'); return '생선값을 대신 내고 아이의 손을 잡았다. 아이는 말없이 따라왔다.'; } },
      { t: '생선값만 내준다', run: () => { add('wealth', -2); add('rep', 3); return '아이는 꾸벅 인사하고 달아났다.'; } },
      { t: '못 본 척한다', run: () => '등 뒤에서 아이의 울음소리가 들렸다.' },
    ] },
  { id: 'arc_orphan', forced: true, title: '자란 아이',
    text: () => '그때 거둔 아이가 어엿한 어른이 되었다. ' + (isPirate() ? '"선장, 나도 이 배의 정식 선원이 되고 싶어."' : isNavy() ? '"저도 해군이 되겠습니다. 당신처럼요."' : '"이제 제가 은혜를 갚을 차례예요."'),
    choices: [
      { t: '곁에 둔다', run: () => { if (isPirate()) add('crew', 4); if (isNavy()) add('crew', 3); add('conn', 6); add('hp', 5); rec('키운 아이와 함께'); return '아이는 이제 당신의 가장 믿음직한 오른팔이다.'; } },
      { t: '자기 길을 가라고 한다', run: () => { add('rep', 6); add('conn', 4); rec('키운 아이의 독립'); return '"넓은 바다로 가라." 아이는 눈물을 닦으며 자기 배에 올랐다.'; } },
    ] },

  /* 5. 스승의 편지 */
  { id: 'arc_mentor', w: 1.2, once: true, cond: () => G.age >= 20 && G.age <= 45 && G.records.some(r => r.endsWith('의 제자')), title: '스승의 편지',
    text: '어린 시절 스승에게서 편지가 왔다. 떨리는 글씨다. "마을에 해적이 눌러앉았다. 이 늙은이로는 더는 버틸 수 없구나."',
    choices: [
      { t: '당장 돌아간다', enemy: 55, run: () => fightResult(fight(55, 0.1, '마을을 점거한 해적'),
          () => { add('rep', 10); if (G.flags.swordOpen) learn('sword', 10); else train(5); rec('스승을 구함'); return '해적들을 몰아냈다. 스승은 당신의 손을 잡고 마지막 비기를 가르쳐 주었다.'; },
          () => { hurt(8); return '혼자로는 역부족이었다. 스승과 함께 마을 사람들을 피신시켰다.'; }) },
      { t: '돈과 사람을 보낸다', need: '재산 15', cond: () => G.stats.wealth >= 15, run: () => { add('wealth', -15); add('rep', 4); return '고용한 용병들이 마을을 지켜냈다는 답장이 왔다.'; } },
      { t: '해군에 도움을 요청한다', run: () => { if (P(0.5 + G.stats.conn / 200)) { add('conn', 3); return '해군 함선이 마을로 향했다.'; } return '해군은 바쁘다며 답이 없었다. 스승의 소식은 그 뒤로 끊겼다.'; } },
      { t: '답장만 쓴다', run: () => { add('rep', -4); return '펜을 들었다 놓았다를 반복했다.'; } },
    ] },

  /* 6. 수배서 속 옛 친구 */
  { id: 'arc_friend', w: 1, once: true, cond: () => G.age >= 20 && !isCelestial(), title: '수배서 속 얼굴',
    text: '새로 붙은 수배서에서 낯익은 얼굴을 봤다. 어릴 적 함께 바다를 누비자고 약속했던 친구다.',
    choices: [
      { t: '친구를 찾아 나선다', run: () => { later('arc_friend2', 4, 8); return '친구가 마지막으로 목격된 섬의 이름을 메모했다.'; } },
      { t: '해군에 위치를 알린다', run: () => { if (isNavy()) { addMerit(6); G.job.captures += 1; return '정의를 택했다. 친구는 체포됐다.'; } add('wealth', 10); add('conn', -5); return '포상금을 받았다. 쓴맛이 오래 남았다.'; } },
      { t: '수배서를 떼어 간직한다', run: () => '그 녀석, 웃는 얼굴은 그대로다.' },
    ] },
  { id: 'arc_friend2', forced: true, title: '옛 친구와의 재회',
    text: '안개 낀 항구에서 마침내 친구를 찾았다. 그는 해적이 되어 있었다. "오랜만이다. 같이 가자, 그때 약속처럼."',
    choices: [
      { t: '함께 간다', cond: () => !isNavy(), need: '해군 불가', run: () => { if (isPirate()) { add('crew', 5); add('conn', 6); return '옛 친구가 부하들을 이끌고 합류했다. ' + addBounty(3000); } add('conn', 8); return '함께 바다를 누비지는 못했지만 밤새 약속을 다시 나눴다.'; } },
      { t: '자수를 권한다', run: () => { if (P(0.4)) { add('rep', 8); return '친구는 오래 고민하더니 칼을 내려놓았다.'; } add('conn', 2); return '"넌 변했구나." 친구는 웃으며 떠났다.'; } },
      { t: '체포한다', cond: () => isNavy(), need: '해군만', enemy: () => navyEnemy(), run: () => fightResult(fight(navyEnemy(), 0.05, '옛 친구'),
          () => { G.job.captures += 1; addMerit(8); add('hp', -5); rec('친구에게 수갑을 채움'); return '수갑을 채우는 손이 떨렸다.'; },
          () => '친구가 당신을 쓰러뜨리고 떠났다. 일부러 급소는 피했다.') },
      { t: '술 한잔만 하고 헤어진다', run: () => { add('hp', 5); add('conn', 3); return '어린 시절 이야기로 밤을 새웠다.'; } },
    ] },

  /* 7. 전설의 섬 */
  { id: 'g_rumor', w: 1, cd: 40, cond: () => G.age >= 18 && !isCelestial(), title: '전설의 섬',
    text: () => `술 취한 항해사가 「${pick(['황금의 종이 울리는 섬', '거인의 무덤', '무지개 안개 너머의 섬', '바다 밑 신전'])}」 이야기를 한다. 해도에 없는 좌표까지 안다고 한다.`,
    choices: [
      { t: '원정대를 꾸린다', need: '재산 10', cond: () => G.stats.wealth >= 10, run: () => { add('wealth', -10); later('arc_rumor', 3, 6); return '배와 식량을 준비하고 좌표를 따라 출항했다.'; } },
      { t: '좌표를 사서 되판다', run: () => { add('wealth', 4); return '귀가 솔깃한 다른 선원에게 좌표를 팔았다.'; } },
      { t: '헛소리라며 웃어넘긴다', run: () => '전설은 전설일 뿐이다.' },
    ] },
  { id: 'arc_rumor', forced: true, title: '안개 속의 섬',
    text: '며칠을 헤맨 끝에, 안개 속에서 정말로 섬이 나타났다. 해안에는 오래된 신전과 깊은 숲, 그리고 난파선 한 척이 보인다.',
    choices: [
      { t: '신전으로 간다', tag: '위험', run: () => { if (P(0.5)) { add('wealth', R(30, 45)); rec('전설의 섬 발견'); return '신전 깊은 곳에 황금이 쌓여 있었다!'; } hurt(R(12, 18)); return '함정이 작동했다. 무너지는 신전에서 겨우 빠져나왔다.'; } },
      { t: '숲으로 들어간다', run: () => { if (!G.fruit && P(0.1)) return '나무 꼭대기에 소용돌이 무늬 열매가 열려 있었다. 한 입 베어 물었다… ' + eatFruit(); add('food', R(10, 16)); train(2); return '거대한 짐승을 사냥하고 진귀한 과일을 따 왔다.'; } },
      { t: '난파선을 뒤진다', run: () => { add('wealth', R(10, 18)); G.flags.history = true; return '난파선의 항해 일지에서 잃어버린 해적단의 이야기를 읽었다. 금화 몇 상자도 함께.'; } },
      { t: '불길하다, 돌아간다', run: () => { add('hp', 3); return '안개가 걷히자 섬은 온데간데없었다.'; } },
    ] },

  /* =================== 열매 각성 =================== */
  { id: 'k_fruit_awaken', w: 3, once: true, cond: () => G.fruit && !G.fruit.awakened && G.skills.fruit >= 3 && G.age >= 22, title: '열매의 각성',
    text: () => `오랜 수련 끝에 「${G.fruit.name}」의 힘이 몸 깊숙이 녹아드는 것을 느꼈다. 한계 너머의 무언가가 손끝에 닿아 있다.`,
    choices: () => [
      { t: '한계를 넘어선다', desc: fruitData().awakenText, run: () => { awakenFruit(); return `열매가 각성했다! 「${fruitData().awakenName}」. ${fruitData().awakenText}.`; } },
      { t: '아직은 때가 아니다', run: () => { learn('fruit', 0); return '힘을 억눌렀다. 위기의 순간에 저절로 깨어날지도 모른다.'; } },
    ] },
  { id: 'g_fruit_rumor', w: 0.6, cd: 32, cond: () => !G.fruit && G.age >= 16 && !isCelestial(), title: '악마의 열매 경매',
    text: '지하 경매장에 악마의 열매가 나왔다는 소문이다. 시작가부터 어마어마하다.',
    choices: [
      { t: '입찰한다', need: '재산 60', cond: () => G.stats.wealth >= 60, run: () => { add('wealth', -60); if (P(0.6)) return '낙찰받았다! 떨리는 손으로 한 입 베어 물었다… ' + eatFruit(); return '낙찰받은 열매는 정교한 가짜였다. 경매장은 이미 사라졌다.'; } },
      { t: '경매장을 턴다', enemy: 70, tag: '위험', run: () => fightResult(fight(70, 0.15, '경매장 경비'),
          () => { add('rep', -8); if (P(0.5)) return '혼란 속에서 열매 상자를 낚아챘다… ' + eatFruit(); add('wealth', 15); return '열매는 놓쳤지만 금고를 털었다.'; },
          () => '경비들에게 몰매를 맞고 쫓겨났다.') },
      { t: '구경만 한다', run: () => '열매는 어느 거물 해적에게 낙찰됐다.' },
    ] },

  /* =================== 새 지역 =================== */
  { id: 'pl_orange', w: 2, tag: 'bad', cond: () => home('orange') && G.age >= 6, title: '광대 해적단의 습격',
    text: '빨간 코의 광대 선장이 이끄는 해적단이 마을에 대포를 쏘아 댄다. 마을 사람들은 모두 도망쳤다.',
    choices: [
      { t: '숨는다', run: () => { add('wealth', -R(1, 4)); return '지하실에서 포성이 멎기를 기다렸다.'; } },
      { t: '가게를 지키는 개를 돕는다', run: () => { if (P(0.5)) { add('rep', 6); add('conn', 3); return '불길 속에서 개와 함께 주인의 가게를 지켜냈다.'; } hurt(6); return '불똥에 데었지만 개는 무사했다.'; } },
      { t: '광대에게 맞선다', enemy: 35, tag: '위험', run: () => fightResult(fight(35, 0.08, '광대 해적'),
          () => { add('rep', 10); train(2); return '광대 선장의 코를 날려버렸다. 몸이 조각조각 흩어지며 도망쳤다.'; },
          () => '분리된 손에 목이 졸려 기절했다.') },
    ] },
  { id: 'pl_whiskey', w: 2, cond: () => home('whiskey') && G.age >= 8, title: '환영의 마을',
    text: '오늘 밤 해적선이 들어왔다. 마을 어른들이 술잔을 들고 웃으며 환영한다. 그리고 다들 품속의 무기를 확인한다.',
    choices: [
      { t: '현상금 사냥에 따라간다', enemy: 30, run: () => fightResult(fight(30, 0.05, '술 취한 해적'),
          () => { add('wealth', R(5, 10)); train(2); return '술에 곯아떨어진 해적을 묶었다. 내 몫의 현상금이 나왔다.'; },
          () => '깨어난 해적에게 혼쭐이 났다.') },
      { t: '해적들에게 몰래 알린다', run: () => { add('conn', 5); add('rep', -4); return '해적들은 고맙다며 금화를 쥐여 주고 밤바다로 달아났다.'; } },
      { t: '잠이나 잔다', run: () => '오늘도 마을은 시끄럽다.' },
    ] },
  { id: 'pl_whiskey_agent', w: 1, once: true, cond: () => home('whiskey') && G.age >= 16, title: '비밀 조직의 스카우트',
    text: '마을의 "시장"이 조용히 불렀다. "사장님을 위해 일할 요원을 찾고 있다. 번호를 받으면 돈은 넉넉하다."',
    choices: [
      { t: '요원이 된다', run: () => { add('wealth', 20); add('rep', -8); G.flags.agent = true; rec('비밀 조직 요원'); return '「Mr.」 번호가 적힌 명함을 받았다. 누가 사장인지는 아무도 모른다.'; } },
      { t: '거절한다', run: () => '"그렇다면 오늘 밤 일은 잊는 게 좋을 거다."' },
    ] },
  { id: 'pl_littlegarden', w: 2, cond: () => home('littlegarden') && G.age >= 6, title: '거인의 결투',
    text: '화산이 터지자 두 거인이 또 결투를 시작했다. 100년째, 승부는 나지 않았다.',
    choices: [
      { t: '가까이서 지켜본다', run: () => { train(3); return '거인들의 일격에 땅이 갈라졌다. 진짜 전사의 긍지를 봤다.'; } },
      { t: '거인들에게 고기를 가져다준다', run: () => { add('food', -4); add('conn', 5); return '"꼬마, 고맙다! 게기기기기!" 거인들이 웃었다.'; } },
      { t: '공룡 사냥에 나선다', enemy: 32, run: () => fightResult(fight(32, 0.06, '공룡'),
          () => { add('food', 15); return '공룡 한 마리를 잡았다. 한 달은 배부르겠다.'; },
          () => '공룡에게 쫓겨 나무 위에서 밤을 보냈다.') },
    ] },
  { id: 'pl_enies', w: 2, cond: () => home('enieslobby') && G.age >= 8, title: '사법의 섬',
    text: () => G.age < 14 ? '정부 첩보기관이 체술에 재능 있는 아이들을 찾고 있다.' : '정의의 문이 열리고, 죄수 호송선이 안개 속으로 사라졌다.',
    choices: () => G.age < 14 ? [
      { t: '훈련생 선발에 나간다', tag: '육식 개방', run: () => { G.flags.rokushiki = true; learn('rokushiki', 8); hurt(6); rec('첩보원 훈련생'); return '혹독한 훈련이 시작됐다. 몸이 무기가 되는 비밀 체술, 육식을 배웠다.'; } },
      { t: '거부한다', run: () => '어른들의 눈빛이 무서웠다.' },
    ] : [
      { t: '정의를 생각한다', run: () => { add('rep', 2); return '정의란 무엇일까. 저 문 너머의 사람들도 누군가의 가족이다.'; } },
      { t: '죄수의 눈을 마주친다', run: () => { add('conn', 2); return '죄수가 희미하게 웃었다. 그 얼굴이 잊히지 않는다.'; } },
    ] },
  { id: 'pl_thriller', w: 1.5, tag: 'bad', cond: () => home('thriller'), title: '그림자 도둑',
    text: '안개 속에서 기묘한 가위 소리가 들린다. 그림자를 빼앗는 자들이 돌아다닌다.',
    choices: [
      { t: '햇빛 아래 숨는다', run: () => { if (P(0.6)) return '그림자를 지켜냈다.'; hurt(8); return '그림자를 잃을 뻔했다. 온몸에 힘이 빠졌다.'; } },
      { t: '좀비를 쫓아낸다', enemy: 35, run: () => fightResult(fight(35, 0.05, '좀비 병사'),
          () => { train(2); add('rep', 3); return '소금을 입에 넣자 좀비가 그림자를 토해 내고 쓰러졌다.'; },
          () => '좀비들에게 둘러싸여 간신히 빠져나왔다.') },
      { t: '노래하는 해골과 대화한다', run: () => { add('conn', 3); add('hp', 3); return '"요호호호! 팬티를 보여 주시겠어요?" 이상하지만 다정한 해골이었다.'; } },
    ] },
  { id: 'pl_amazon', w: 2.5, cond: () => home('amazonlily') && G.age >= 6, title: '구사 전사의 훈련',
    text: '아마존 릴리의 아이들은 뱀을 활 삼아 패기를 익힌다. 오늘도 훈련장에 함성이 울린다.',
    choices: [
      { t: '견문색 훈련', tag: '패기 개방', run: () => { G.flags.hakiOpen = true; learn('obs', 6); return '눈을 감고 날아오는 화살을 피했다. 세상의 "목소리"가 들린다.'; } },
      { t: '무장색 훈련', tag: '패기 개방', run: () => { G.flags.hakiOpen = true; learn('arm', 6); return '화살 끝에 검은 기운을 실어 바위를 뚫었다.'; } },
      { t: '바다왕류 사냥', enemy: 45, run: () => fightResult(fight(45, 0.06, '바다왕류'),
          () => { add('food', 12); add('rep', 5); return '활 한 발로 바다왕류를 잡았다. 전사들이 환호했다.'; },
          () => '바다왕류에게 배가 뒤집혔다.') },
    ] },
  { id: 'pl_amazon_empress', w: 1, once: true, cond: () => home('amazonlily') && G.age >= 12, title: '뱀 공주의 행차',
    text: '세계에서 가장 아름답다는 황제가 행차한다. 그녀의 눈길이 당신에게 머물렀다.',
    choices: [
      { t: '고개를 숙인다', run: () => { add('conn', 4); return '"좋다. 고개를 들어도 된다." 황제가 지나갔다.'; } },
      { t: '똑바로 바라본다', tag: '위험', run: () => { if (P(0.5)) { add('rep', 8); add('conn', 6); rec('황제의 눈에 듦'); return '"재미있는 녀석이로군." 황제가 처음으로 웃었다.'; } hurt(15); return '눈 깜짝할 사이 돌이 될 뻔했다.'; } },
    ] },
  { id: 'pl_punkhazard', w: 1.5, tag: 'bad', cond: () => home('punkhazard'), title: '독가스 경보',
    text: '연구소에서 독가스가 새어 나왔다. 불과 얼음 사이로 보라색 안개가 번진다.',
    choices: [
      { t: '얼음 쪽으로 도망친다', run: () => { hurt(R(3, 6)); return '혹한 속에서 몸을 웅크리고 버텼다.'; } },
      { t: '불타는 쪽으로 도망친다', run: () => { hurt(R(2, 8)); return '뜨거운 열기 속을 뛰었다.'; } },
      { t: '실험실 아이들을 데리고 나간다', run: () => { hurt(R(6, 10)); add('rep', 10); add('conn', 5); rec('펑크 해저드의 아이들을 구함'); return '사탕으로 아이들을 길들이던 과학자의 실체를 봤다. 아이들 손을 잡고 안개를 빠져나왔다.'; } },
    ] },
  { id: 'pl_punk_escape', w: 1.5, once: true, cond: () => home('punkhazard') && G.age >= 10 && G.age < 18, title: '섬을 떠날 기회',
    text: '해군 함선이 연구소를 조사하러 왔다. 지금이라면 섬을 빠져나갈 수 있다.',
    choices: [
      { t: '해군에 도움을 청한다', run: () => { G.flags.escaped = true; add('rep', 4); G.place = findPlace('marineford'); rec('펑크 해저드 탈출'); return '해군 장교가 코트를 덮어 주었다. 마린포드에서 새 삶이 시작된다.'; } },
      { t: '숨어서 남는다', run: () => '아직은 이 섬을 떠날 수 없다.' },
    ] },
  { id: 'pl_egghead', w: 2, tag: 'good', cond: () => home('egghead') && G.age >= 8, title: '미래섬의 실험',
    text: '천재 과학자가 조수를 찾는다. "자네, 과학에 몸을 바칠 생각 없나?"',
    choices: [
      { t: '실험체가 된다', tag: '위험', run: () => { if (P(0.6)) { train(6); rec('미래섬의 실험체'); return '몸에 이상한 장치를 달았다. 근력이 비약적으로 늘었다.'; } hurt(12); return '실험이 폭발했다. 아프로 머리가 되었다.'; } },
      { t: '조수로 일한다', run: () => { add('wealth', R(6, 10)); add('conn', 4); return '미래 기술을 다루는 법을 배웠다.'; } },
      { t: '로봇과 논다', run: () => { add('hp', 5); return '귀여운 로봇이 하루 종일 따라다녔다.'; } },
    ] },

  /* =================== 노년 =================== */
  { id: 'o_retire', w: 2, cond: () => (isPirate() || isNavy()) && G.age >= 55, title: '은퇴의 갈림길',
    text: '몸이 예전 같지 않다. 이제 칼을 내려놓을 때일까.',
    choices: [
      { t: '은퇴한다', run: () => { G.job.prev = jobTitle(); G.job.type = 'retired'; rec('은퇴'); return '마지막으로 바다를 바라보며 일선에서 물러났다.'; } },
      { t: '아직 끝나지 않았다', run: () => { train(1); return '아직 바다가 부른다.'; } },
    ] },
  { id: 'o_heir', w: 1, once: true, cond: () => G.age >= 45, title: '후계자',
    run: () => { add('conn', 5); rec('후계자를 얻음'); return '당신의 뜻을 이을 젊은이가 나타났다. 가장 아끼던 물건을 맡기며 웃었다. "언젠가 돌려주러 와라."'; } },
  { id: 'o_memoir', w: 1, once: true, cond: () => G.age >= 55, title: '회고',
    run: () => { add('rep', 3); return `밤바다를 보며 지난 세월을 떠올렸다. ${G.records.slice(-3).join(', ')}… 나쁘지 않은 인생이었다.`; } },
  { id: 'o_ill', w: 1.5, tag: 'bad', cond: () => G.age >= 60, title: '노환',
    run: () => { hurt(R(4, 10)); return pick(['옛 상처가 쑤시고 기침이 멎지 않는다.', '눈이 침침해졌다.', '계단 하나 오르기가 버겁다.']); } },

  /* =================== 가문 =================== */
  { id: 'ln_d', w: 2, once: true, cond: () => G.lineage.id === 'd' && G.age >= 12, title: 'D의 이름',
    run: () => { add('conn', 3); rec('D의 의지'); return '낯선 노인이 당신의 이름을 듣고 얼굴이 굳었다. "D는 반드시 다시 폭풍을 부른다…"'; } },
  { id: 'ln_vinsmoke', w: 2, once: true, cond: () => G.lineage.id === 'vinsmoke' && G.age >= 7 && G.age < 15, title: '제르마의 시험',
    text: '아버지가 형제들과의 대련을 명했다. 지는 자는 "실패작"이다.',
    choices: [
      { t: '싸운다', enemy: 35, run: () => fightResult(fight(35, 0, '형제'),
          () => { train(4); rec('제르마의 전사'); return '형제를 쓰러뜨렸다. 아버지는 처음으로 고개를 끄덕였다.'; },
          () => { hurt(5); G.flags.failure = true; return '형제들에게 짓밟혔다. "실패작"이라는 말이 귀에 박혔다.'; }) },
      { t: '거부한다', run: () => { add('conn', -3); G.flags.failure = true; return '싸움을 거부하자 차가운 지하실에 갇혔다.'; } },
    ] },
  { id: 'ln_kozuki', w: 2, once: true, cond: () => G.lineage.id === 'kozuki' && G.age >= 10, title: '선조의 일지',
    run: () => { learn('sword', 8); G.flags.history = true; rec('선조의 일지'); return '오래된 상자에서 선조의 항해 일지와 검술서를 찾았다. 거기엔 「라프텔」이라는 단어가 있었다.'; } },
  { id: 'ln_charlotte', w: 2, cd: 16, cond: () => G.lineage.id === 'charlotte' && G.age >= 5, title: '어머니의 다과회',
    run: () => { add('food', 10); if (P(0.2)) { hurt(6); return '어머니의 식탐 발작이 일어났다. 섬 하나가 흔들렸다.'; } add('conn', 2); return '수십 명의 형제자매와 함께 케이크를 먹었다.'; } },
  { id: 'ln_nefeltari', w: 2, once: true, cond: () => G.lineage.id === 'nefeltari' && G.age >= 12, title: '왕족의 의무',
    text: '백성들 사이에 섞여 그들의 삶을 직접 보고 오라는 명을 받았다.',
    choices: [
      { t: '신분을 숨기고 간다', run: () => { add('conn', 6); add('rep', 6); rec('백성과 함께한 왕족'); return '먼지투성이가 되어 돌아왔다. 백성의 얼굴을 알게 되었다.'; } },
      { t: '궁에 남는다', run: () => { add('wealth', 5); return '궁은 편했다.'; } },
    ] },
  { id: 'ln_hero', w: 2, once: true, cond: () => G.lineage.id === 'hero' && G.age >= 6 && G.age < 16, title: '사랑의 주먹',
    run: () => { hurt(3); train(3); G.flags.hakiOpen = true; learn('arm', 4); rec('할아버지의 특훈'); return '할아버지가 당신을 정글에 던져두고 갔다. "강한 해군이 되어라!" 패기의 기초가 몸에 새겨졌다.'; } },
  { id: 'ln_donquixote', w: 1.5, cd: 16, tag: 'bad', cond: () => G.lineage.id === 'donquixote' && G.age >= 6, title: '천룡인의 피',
    text: '누군가 당신의 출신을 알아챘다. 사람들의 눈빛이 변한다.',
    choices: [
      { t: '정면으로 견딘다', run: () => { hurt(5); add('rep', 3); return '돌을 맞으면서도 고개를 들었다.'; } },
      { t: '이름을 숨기고 떠난다', run: () => { add('conn', -3); return '다른 마을에서 다른 이름으로 살았다.'; } },
    ] },
  { id: 'ln_giant', w: 2, once: true, cond: () => G.lineage.id === 'giant' && G.age >= 12, title: '전사의 의식',
    text: '거인족 전사들이 당신에게 성인식을 치르라고 한다. 바다왕류 한 마리를 혼자 잡아 오는 것이다.',
    choices: [
      { t: '나간다', enemy: 55, run: () => fightResult(fight(55, 0.05, '바다왕류'),
          () => { train(5); add('rep', 6); rec('엘바프의 전사'); return '바다왕류를 어깨에 메고 돌아왔다. 전사들이 땅을 울리며 환호했다.'; },
          () => { train(2); return '실패했다. 하지만 도망치지 않은 것만으로 인정받았다.'; }) },
      { t: '때를 기다린다', run: () => '아직은 이르다.' },
    ] },
  { id: 'ln_lunarian', w: 1, once: true, cond: () => G.lineage.id === 'lunarian' && G.age >= 14, title: '등의 불꽃',
    run: () => { add('rep', -5); rec('불꽃의 날개'); return '분노한 순간 등 뒤에서 검은 날개와 불꽃이 솟았다. 목격자들이 정부에 신고했다.'; } },

  /* =================== 지역 =================== */
  { id: 'pl_foosha', w: 1.5, cond: () => G.place.id === 'foosha' && G.age >= 7 && !atSea(), title: '코르보 산',
    text: '코르보 산에 들어가면 산적 다단 일가가 산다고 한다.',
    choices: [
      { t: '산으로 들어간다', enemy: 25, run: () => fightResult(fight(25, 0.02, '코르보 산 맹수'),
          () => { train(2); add('conn', 3); return '거대한 악어를 잡아 산적들에게 인정받았다.'; },
          () => '맹수에게 쫓겨 혼쭐이 났다.') },
      { t: '마을에 있는다', run: () => { add('food', 3); return '마키노 씨의 주점에서 일을 도왔다.'; } },
    ] },
  { id: 'pl_loguetown', w: 1, once: true, cond: () => G.place.id === 'loguetown' && G.age >= 6, title: '처형대',
    run: () => { add('conn', 2); G.flags.roger = true; rec('처형대 앞에서'); return '광장의 처형대 앞에 섰다. "내 보물? 원한다면 주지. 찾아봐라!" 그 말이 들리는 것 같았다.'; } },
  { id: 'pl_baratie', w: 2, tag: 'good', cond: () => G.place.id === 'baratie' && !atSea(), title: '요리장의 수업',
    run: () => { add('food', 8); train(2); return pick(['붉은 다리의 요리장에게 요리와 발차기를 동시에 배웠다.', '"음식을 남기는 놈은 바다에 던진다!" 오늘도 주방은 전쟁터다.']); } },
  { id: 'pl_cocoyasi', w: 2, tag: 'bad', cond: () => G.place.id === 'cocoyasi' && !atSea(), title: '목숨값',
    text: '어인 해적단이 이번 달 목숨값을 걷으러 왔다. 어른 10만, 아이 5만 베리.',
    choices: [
      { t: '돈을 낸다', need: '재산 4', cond: () => G.stats.wealth >= 4, run: () => { add('wealth', -R(4, 8)); return '이를 악물고 돈을 냈다. 귤밭 너머로 해가 졌다.'; } },
      { t: '맞선다', enemy: 45, tag: '위험', cond: () => G.age >= 12, need: '12세 이상', run: () => fightResult(fight(45, 0.15, '어인 해적'),
          () => { add('rep', 12); rec('어인 해적에 맞섬'); return '어인 졸개를 쓰러뜨렸다! 마을 사람들의 눈빛이 달라졌다.'; },
          () => '어인의 힘은 인간의 열 배였다. 처참하게 당했다.') },
      { t: '숨는다', run: () => { if (P(0.5)) return '귤밭 창고에 숨어 넘겼다.'; hurt(6); add('wealth', -3); return '들켜서 끌려 나왔다.'; } },
    ] },
  { id: 'pl_shells', w: 2, tag: 'bad', cond: () => G.place.id === 'shells' && !atSea(), title: '지부 대령의 횡포',
    text: '도끼 손을 한 대령의 아들이 거리에서 행패를 부린다.',
    choices: [
      { t: '참는다', run: () => { add('wealth', -R(1, 4)); return '고개를 숙이고 지나갔다.'; } },
      { t: '항의한다', run: () => { if (P(0.4)) { add('rep', 8); return '구경꾼들이 편을 들어주었다. 대령의 아들은 꽁무니를 뺐다.'; } hurt(7); return '대령의 부하들에게 끌려가 맞았다.'; } },
    ] },
  { id: 'pl_water7', w: 2, tag: 'good', cond: () => G.place.id === 'water7' && G.age >= 12 && !atSea(), title: '조선소',
    run: () => { add('wealth', R(4, 8)); return pick(['조선소에서 망치질을 하고 두둑한 품삯을 받았다.', '바다 열차가 지나가는 것을 보며 점심을 먹었다.', '아쿠아 라구나 대비 공사에 동원됐다.']); } },
  { id: 'pl_alabasta', w: 2, tag: 'bad', cond: () => G.place.id === 'alabasta' && !atSea(), title: '가뭄',
    run: () => { add('food', -R(4, 8)); hurt(2); return '몇 달째 비가 오지 않는다. 사람들은 수상한 가루 이야기를 수군거린다.'; } },
  { id: 'pl_skypiea', w: 2, cond: () => G.place.id === 'skypiea' && !atSea(), title: '구름 위의 생활',
    run: () => {
      if (P(0.5)) { train(2); return '웨이버를 타고 구름 바다를 달렸다.'; }
      hurt(4); return '「신」의 시련장에 잘못 들어갔다가 번개에 그을렸다.';
    } },
  { id: 'pl_marineford', w: 2, tag: 'good', cond: () => G.place.id === 'marineford' && G.age < 18, title: '해군 본부 견학',
    run: () => { train(2); add('rep', 3); G.flags.inspiredNavy = true; return '거대한 본부 요새 안을 구경했다. 대장들의 기운이 피부로 느껴졌다.'; } },
  { id: 'pl_sabaody', w: 2, tag: 'bad', cond: () => G.place.id === 'sabaody' && !atSea() && !G.flags.celestial, title: '인간 사냥꾼',
    text: '인간 경매장에 팔 "상품"을 찾는 사냥꾼들이 당신을 노린다.',
    choices: [
      { t: '도망친다', run: () => { if (P(0.6)) return '맹그로브 사이로 숨어 빠져나갔다.'; hurt(10); add('wealth', -5); return '붙잡혔다가 가까스로 탈출했다. 가진 것은 모두 빼앗겼다.'; } },
      { t: '싸운다', enemy: 40, run: () => fightResult(fight(40, 0.1, '인간 사냥꾼'),
          () => { add('rep', 6); train(2); return '사냥꾼들을 비눗방울 속에 처박았다.'; },
          () => '사냥꾼들에게 흠씬 두들겨 맞았다.') },
    ] },
  { id: 'pl_fishman', w: 2, cond: () => G.place.id === 'fishman' && !atSea(), title: '어인 공수도',
    text: '어인 공수도 도장에서 "물을 다루는 주먹"을 가르친다.',
    choices: [
      { t: '배운다', run: () => { train(R(3, 5)); return '물의 흐름을 주먹에 싣는 법을 배웠다.'; } },
      { t: '바다의 숲에 간다', run: () => { add('conn', 3); add('rep', 2); return '인간과 어인이 함께 살 날을 꿈꾸던 이의 무덤 앞에 꽃을 놓았다.'; } },
    ] },
  { id: 'pl_drum', w: 2, tag: 'bad', cond: () => G.place.id === 'drum' && !atSea(), title: '혹한',
    run: () => { hurt(R(3, 7)); add('food', -3); return '눈보라가 몇 주째 그치지 않는다.'; } },
  { id: 'pl_wholecake', w: 2, tag: 'good', cond: () => G.place.id === 'wholecake' && !atSea(), title: '과자의 섬',
    run: () => {
      add('food', 12);
      if (P(0.12)) { hurt(8); return '빅 맘의 질문에 잘못 대답해 수명을 조금 빼앗겼다…'; }
      return pick(['과자로 만든 집 지붕을 뜯어 먹었다.', '말하는 나무가 사탕을 나눠주었다.', '초콜릿 강에서 헤엄쳤다.']);
    } },
  { id: 'pl_bigmom_tax', w: 1.5, tag: 'bad', cond: () => G.place.id === 'wholecake' && G.age >= 10 && !atSea(), title: '과자 상납',
    text: '빅 맘 해적단 간부가 이번 달 과자 상납을 걷으러 왔다. 모자라면 수명으로 내야 한다.',
    choices: [
      { t: '식량으로 낸다', need: '식량 10', cond: () => G.stats.food >= 10, run: () => { add('food', -10); return '과자를 몽땅 바쳤다.'; } },
      { t: '수명으로 낸다', run: () => { hurt(8); return '영혼의 일부가 뽑혀 나가는 감각이 들었다.'; } },
    ] },
  { id: 'pl_zou', w: 2, tag: 'good', cond: () => G.place.id === 'zou' && !atSea(), title: '밍크족의 환대',
    run: () => { if (P(0.5)) { add('hp', 6); add('conn', 3); return '털북숭이 이웃들이 「가르츄!」 하며 볼을 비볐다.'; } train(2); return '밍크족 전사에게 「일렉트로」 다루는 법을 구경했다.'; } },
  { id: 'pl_dressrosa', w: 1.5, tag: 'bad', cond: () => G.place.id === 'dressrosa' && G.age >= 10 && !atSea(), title: '장난감의 비밀',
    text: '거리의 장난감 병정이 당신에게 조용히 속삭인다. "나는 원래 사람이었어."',
    choices: [
      { t: '진실을 캔다', tag: '위험', run: () => { if (P(0.4)) { add('conn', 8); rec('드레스로자의 진실'); return '지하 조직과 연결되었다.'; } hurt(12); return '패밀리의 간부에게 들켜 크게 당했다.'; } },
      { t: '모른 척한다', run: () => '못 본 척 지나쳤다.' },
    ] },
  { id: 'pl_colosseum', w: 1, cond: () => G.place.id === 'dressrosa' && G.age >= 16 && !atSea(), title: '콜로세움',
    text: '콜로세움 투기 대회. 우승 상품은 악마의 열매라는 소문이다.',
    choices: [
      { t: '참가한다', enemy: 55, tag: '위험', run: () => fightResult(fight(55, 0.12, '검투사'),
          () => { add('rep', 8); if (!G.fruit && P(0.15)) return '우승했다! 상품으로 받은 열매를… ' + eatFruit(); add('wealth', 15); return '준결승까지 올라 상금을 받았다.'; },
          () => '1회전에서 탈락했다.') },
      { t: '관람만 한다', run: () => { train(1); return '검투사들의 싸움에서 많은 걸 배웠다.'; } },
    ] },
  { id: 'pl_wano', w: 2, tag: 'bad', cond: () => G.place.id === 'wano' && !atSea(), title: '오로치의 폭정',
    run: () => { add('food', -R(4, 8)); add('wealth', -R(2, 5)); return pick(['쇼군의 세금이 또 올랐다.', '공장에서 흘러나온 독으로 강물이 썩었다.', '「오뎅의 바보짓」을 흉내 내며 웃는 자들이 늘었다.']); } },
  { id: 'pl_wano_sword', w: 1.5, cond: () => G.place.id === 'wano' && G.age >= 10 && !atSea(), title: '대장장이의 명검',
    run: () => { learn('sword', 5); return '산속의 늙은 대장장이가 이름 없는 칼 한 자루를 쥐여주었다. "칼이 주인을 고른다."'; } },
  { id: 'pl_elbaf', w: 2, cond: () => G.place.id === 'elbaf' && !atSea(), title: '거인들의 나라',
    run: () => { if (P(0.5)) { train(3); return '거인 아이들과 씨름하다 뼈가 단단해졌다.'; } hurt(4); return '거인의 발에 밟힐 뻔했다.'; } },
  /* 오니가시마 (백수 해적단 본거지) */
  { id: 'pl_oni_draft', w: 1.5, cd: 12, tag: 'bad', cond: () => onOni() && G.age >= 8, title: '백수 해적단의 징집',
    text: '백수 해적단 간부가 섬의 아이들을 모아 「쓸 만한 놈」을 고른다.',
    choices: [
      { t: '복종한다', run: () => { add('food', 6); add('rep', -5); hurt(4); return '혹독한 잡일에 끌려갔지만 끼니는 나왔다.'; } },
      { t: '저항한다', enemy: 55, tag: '위험', run: () => fightResult(fight(55, 0.25, '백수 해적단'),
          () => { train(4); add('rep', 10); rec('백수 해적단에 저항'); return '간부의 부하를 쓰러뜨리고 산으로 숨었다.'; },
          () => '흠씬 두들겨 맞고 끌려갔다.') },
      { t: '도망친다', run: () => { if (P(0.4)) return '동굴로 숨어 위기를 넘겼다.'; hurt(10); return '붙잡혀 채찍질을 당했다.'; } },
    ] },
  { id: 'pl_oni_rage', w: 2.5, tag: 'bad', cond: () => onOni() && G.age >= 5, title: '술 취한 간부',
    run: () => { hurt(R(7, 12)); return pick(['술에 취한 간부가 휘두른 철퇴가 스쳤다.', '간부의 화풀이 대상이 되었다.', '「갑자기」 날아온 졸개에 깔렸다.']); } },
  { id: 'pl_oni_feast', w: 2, tag: 'good', cond: () => onOni(), title: '연회의 남은 음식',
    run: () => { add('food', R(6, 12)); return pick(['해적단 연회가 끝난 뒤 남은 음식을 주워 모았다.', '술에 취한 졸개가 고기를 던져주었다.']); } },
  { id: 'pl_oni_mine', w: 1.5, tag: 'bad', cond: () => onOni() && G.age >= 10, title: '무기 공장',
    run: () => { hurt(R(3, 6)); train(2); add('wealth', 2); return '무기 공장에서 쇳덩이를 날랐다. 몸은 망가지지만 근육은 붙는다.'; } },
  { id: 'pl_oni_beast', w: 1, cond: () => onOni() && G.age >= 12, title: '괴물의 비행',
    run: () => { add('conn', 1); return '하늘을 가르는 푸른 용을 보았다. 섬 전체가 숨을 죽였다. 저것이 「이 세상에서 가장 강한 생물」이다.'; } },
  { id: 'pl_oni_escape', w: 1, once: true, cond: () => onOni() && G.age >= 13 && G.age < 18, title: '탈출의 기회',
    text: '보급선이 경비 없이 정박해 있다. 지금이라면 섬을 빠져나갈 수 있다.',
    choices: [
      { t: '배를 훔친다', tag: '위험', run: () => { if (P(0.5)) { add('rep', 5); train(3); rec('오니가시마 탈출'); G.flags.escaped = true; return '밤바다로 노를 저었다. 등 뒤의 해골 섬이 멀어진다.'; } hurt(15); return '들켰다. 죽지 않은 게 다행이다.'; } },
      { t: '섬에 남는다', run: () => '아직은 때가 아니다.' },
    ] },
];

/* 세계관 이야기 (스탯 변화 없음): LORE 에서 생성 */
LORE.forEach((l, i) => EVENTS.push({
  id: `lore_${i}`, w: 0.25, cd: 60, lore: true, title: l.title,
  cond: l.cond || null,
  run: () => (typeof l.text === 'function' ? l.text() : l.text),
}));
