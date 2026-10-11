// 희귀도 표(rarity.js) 생성기
// 출생지·가문 무작위, 모든 선택을 무작위로 고른 인생을 N번 시뮬레이션해서
// 각 기록이 전체 인생 중 몇 %에서 나왔는지 계산한다.
// 사용법: node tools/gen-rarity.js [횟수]   (playwright + chromium 필요)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const RUNS = Number(process.argv[2] || 3000);
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'index.html'));
  const counts = await page.evaluate(RUNS => {
    const counts = {};
    // 시뮬레이션 전용 난수 (게임 시드와 무관)
    let x = 12345;
    const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
    document.querySelector('.place[data-id="random"]').click();
    document.querySelector('.lineage[data-id="random"]').click();
    for (let r = 0; r < RUNS; r++) {
      document.querySelector('#in-seed').value = 'R' + r;
      document.querySelector('#btn-start').click();
      const g = window.__game;
      let n = 0;
      while (!g.G.dead && n < 2000) {
        g.tick(); n++;
        const G = g.G;
        if (n % 20 === 0) {
          const opts = ['body', 'sword', 'rokushiki', 'obs', 'arm', 'king'];
          G.focus = opts[Math.floor(rnd() * opts.length)];
        }
        if (G.pending) {
          const ok = G.pending.choices.map((c, i) => (!c.cond || c.cond()) ? i : -1).filter(i => i >= 0);
          g.choose(ok[Math.floor(rnd() * ok.length)]);
        }
      }
      for (const k of new Set(g.rarityKeys())) counts[k] = (counts[k] || 0) + 1;
      document.querySelector('#end').hidden = true;
    }
    return counts;
  }, RUNS);
  await browser.close();

  const rates = {};
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) rates[k] = Math.round(v / RUNS * 10000) / 100;
  const out = `'use strict';\n// tools/gen-rarity.js 로 생성 (무작위 인생 ${RUNS}회). 직접 고치지 말 것.\nconst RARITY = ${JSON.stringify({ runs: RUNS, rates }, null, 1)};\n`;
  fs.writeFileSync(path.join(root, 'rarity.js'), out);
  console.log(`rarity.js: ${Object.keys(rates).length}개 기록, ${RUNS}회`);
})();
