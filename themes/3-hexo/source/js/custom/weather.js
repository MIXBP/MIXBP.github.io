/* 天气小组件: ipapi 定位 + open-meteo 天气(均免 key), 缓存 1h, 失败静默 */
(function () {
  var KEY = '3h_weather';
  var chip = document.createElement('div');
  chip.style.cssText = 'position:fixed;right:14px;bottom:292px;z-index:998;'
    + 'padding:6px 12px;border-radius:16px;font-size:12px;cursor:default;'
    + 'background:rgba(45,48,53,.85);color:#e6e8ea;box-shadow:0 2px 8px rgba(0,0,0,.25);'
    + 'backdrop-filter:blur(4px);user-select:none;white-space:nowrap;display:none;';
  chip.title = '当前位置天气 (每小时更新)';
  document.body.appendChild(chip);

  try {
    var c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.ts < 3600e3) return render(c);
  } catch (e) { }

  var done = false;
  setTimeout(function () { if (!done) chip.style.display = 'none'; }, 8000);

  fetch('https://ipapi.co/json/', { timeout: 5000 })
    .then(function (r) { return r.json(); })
    .then(function (g) {
      if (!g || !g.latitude) throw 0;
      return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + g.latitude
        + '&longitude=' + g.longitude + '&current_weather=true&timezone=auto')
        .then(function (r) { return r.json(); })
        .then(function (w) {
          var cw = w.current_weather;
          var data = {
            ts: Date.now(),
            city: (g.city || g.region || '').slice(0, 8),
            temp: Math.round(cw.temperature),
            code: cw.weathercode,
            wind: Math.round(cw.windspeed)
          };
          try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
          done = true;
          render(data);
        });
    })
    .catch(function () { chip.style.display = 'none'; });

  function render(d) {
    var map = {
      0: ['☀️', '晴'], 1: ['🌤', '多云'], 2: ['⛅', '多云'], 3: ['☁️', '阴'],
      45: ['🌫', '雾'], 48: ['🌫', '雾'], 51: ['🌦', '小雨'], 53: ['🌦', '小雨'], 55: ['🌧', '小雨'],
      61: ['🌧', '中雨'], 63: ['🌧', '中雨'], 65: ['⛈', '大雨'],
      71: ['🌨', '小雪'], 73: ['🌨', '中雪'], 75: ['❄️', '大雪'], 77: ['❄️', '雪'],
      80: ['🌦', '阵雨'], 81: ['🌧', '阵雨'], 82: ['⛈', '强阵雨'],
      95: ['⛈', '雷雨'], 96: ['⛈', '雷雨'], 99: ['⛈', '雷雨']
    };
    var w = map[d.code] || ['🌡', ''];
    chip.innerHTML = '<b style="font-size:14px">' + w[0] + '</b> ' + d.temp + '°C ' + w[1]
      + (d.city ? ' · ' + d.city : '');
    chip.style.display = 'block';
  }
})();
