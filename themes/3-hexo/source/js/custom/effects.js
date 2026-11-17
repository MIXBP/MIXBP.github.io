/* 点击爱心 + 冬季雪花 */
(function () {
  var HEARTS = ['❤', '💗', '💙', '💚', '🩵'];

  document.addEventListener('click', function (e) {
    for (var i = 0; i < 2; i++) spawnHeart(e.clientX, e.clientY, i);
  }, { passive: true });

  function spawnHeart(x, y, i) {
    var el = document.createElement('span');
    el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
    var size = 11 + Math.random() * 9;
    el.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;user-select:none;'
      + 'font-size:' + size + 'px;left:' + (x - 6 + (i ? 12 : -12) * Math.random()) + 'px;top:' + (y - 12) + 'px;'
      + 'opacity:.95;will-change:transform,opacity;';
    document.body.appendChild(el);
    var drift = (Math.random() * 60 - 30);
    var rise = 50 + Math.random() * 40;
    var anim = el.animate([
      { transform: 'translate(0,0) scale(.5)', opacity: 0.95 },
      { transform: 'translate(' + drift + 'px,-' + rise + 'px) scale(1)', opacity: 0 }
    ], { duration: 850 + Math.random() * 350, easing: 'cubic-bezier(.2,.6,.4,1)' });
    anim.onfinish = function () { el.remove(); };
  }

  /* 雪花: 11/16 ~ 2/28 且非窄屏 */
  var now = new Date(), m = now.getMonth() + 1, d = now.getDate();
  var inWinter = (m === 11 && d >= 16) || m === 12 || m === 1 || m === 2;
  if (!inWinter || window.innerWidth <= 768) return;

  for (var i = 0; i < 16; i++) {
    var f = document.createElement('span');
    f.textContent = '❄';
    f.style.cssText = 'position:fixed;top:0;left:' + (Math.random() * 100) + 'vw;z-index:9998;'
      + 'pointer-events:none;user-select:none;color:#cfe8ff;'
      + 'font-size:' + (8 + Math.random() * 10) + 'px;'
      + 'opacity:' + (0.25 + Math.random() * 0.45) + ';'
      + (Math.random() > 0.7 ? 'filter:blur(1px);' : '');
    document.body.appendChild(f);
    fall(f);
  }

  function fall(f) {
    var dur = (9 + Math.random() * 12) * 1000;
    var drift = Math.random() * 160 - 80;
    f.animate([
      { transform: 'translate(0,-4vh) rotate(0deg)' },
      { transform: 'translate(' + drift + 'px,104vh) rotate(' + (drift > 0 ? 180 : -180) + 'deg)' }
    ], { duration: dur, iterations: Infinity, delay: -Math.random() * dur, easing: 'linear' });
  }
})();
