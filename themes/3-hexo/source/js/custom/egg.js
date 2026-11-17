/* CTF 彩蛋: 控制台 flag + Konami 秘技礼花 */
(function () {
  console.log('%cMIXBP%c欢迎来到控制台, fellow CTFer 👾',
    'font-size:22px;font-weight:bold;color:#309E85;text-shadow:1px 1px 0 #1b1c1f',
    'font-size:12px;color:#999;padding:0 8px');
  console.log('%cflag{c0ngra7s_y0u_f1nd_th3_h1dd3n_c0ns0l3}',
    'font-size:13px;color:#e06c75;background:#242629;padding:6px 10px;border-radius:4px');
  console.log('%c提示: 这只博客里还藏着一个老式秘技, 试试在页面上输入 ↑↑↓↓←→←→BA',
    'color:#6a737d;font-size:12px');

  var SEQ = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var pos = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    pos = (k === SEQ[pos]) ? pos + 1 : (k === SEQ[0] ? 1 : 0);
    if (pos === SEQ.length) { pos = 0; party(); }
  });

  function party() {
    loadConfetti(function (confetti) {
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors: ['#309E85', '#03A6FF', '#e6c07b', '#e06c75'] });
      var end = Date.now() + 2200;
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: ['#309E85', '#03A6FF'] });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: ['#e6c07b', '#e06c75'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      console.log('%c🉐 秘技达成! 恭喜通关 1990', 'font-size:14px;color:#e6c07b');
    });
  }

  function loadConfetti(cb) {
    if (window.confetti) return cb(window.confetti);
    var s = document.createElement('script');
    s.src = '/cdn/confetti/canvas-confetti.min.js';
    s.onload = function () { cb(window.confetti); };
    document.head.appendChild(s);
  }
})();
