/* 天气小组件: sohu IP 定位(国内友好) -> open-meteo 天气(免 key)
   失败回退默认城市(不带城市名) | 缓存 1h | 点击 chip 可手动换城市 */
(function () {
  var KEY = '3h_weather';
  var DEFAULT_CITY = '上海'; /* 自动定位失败时的兜底城市(不显示城市名) */
  var chip = document.createElement('div');
  chip.style.cssText = 'position:fixed;right:14px;bottom:346px;z-index:998;'
    + 'padding:6px 12px;border-radius:16px;font-size:12px;cursor:pointer;'
    + 'background:rgba(45,48,53,.85);color:#e6e8ea;box-shadow:0 2px 8px rgba(0,0,0,.25);'
    + 'backdrop-filter:blur(4px);user-select:none;white-space:nowrap;display:none;';
  chip.title = '当前位置天气 (每小时更新)\n点击可查询其他城市';
  document.body.appendChild(chip);

  chip.addEventListener('click', function () {
    var city = prompt('查询城市天气 (中文城市名, 留空取消):', '');
    if (!city) return;
    city = city.trim().replace(/市$/, '');
    if (!city) return;
    localStorage.removeItem(KEY);
    load(city, true);
  });

  function cached() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.ts < 3600e3) return c;
    } catch (e) { }
    return null;
  }

  function boot() {
    var c = cached();
    if (c) return render(c.data, c.label);
    load('', false);
  }

  function load(city, manual) {
    getCity(city, manual).then(function (loc) {
      if (!loc) throw 0;
      return geocode(loc.city).then(function (g) {
        return forecast(g.lat, g.lon).then(function (w) {
          var data = { ts: Date.now(), city: loc.auto ? loc.city : '', temp: w.temp, code: w.code };
          try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
          render(data, loc.auto ? loc.city : '');
        });
      });
    }).catch(function () { chip.style.display = 'none'; });
  }

  /* 定位: sohu script 标签(无 CORS/国内快); 手动模式跳过定位直接用输入城市 */
  function getCity(city, manual) {
    if (manual && city) return Promise.resolve({ city: city, auto: true });
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      var timer = setTimeout(function () { resolve(null); }, 4000);
      s.onload = function () {
        clearTimeout(timer);
        try {
          var sn = window.returnCitySN;
          var name = ((sn && sn.cname) || '').trim().replace(/^中国/, '').replace(/^.*?省/, '').replace(/市$/, '').trim();
          resolve(name && name !== '未知' ? { city: name, auto: true } : null);
        } catch (e) { resolve(null); }
        s.remove();
      };
      s.onerror = function () { clearTimeout(timer); resolve(null); };
      s.src = 'https://pv.sohu.com/cityjson?ie=utf-8&t=' + Date.now();
      document.head.appendChild(s);
    }).then(function (loc) {
      return loc || { city: DEFAULT_CITY, auto: false };
    });
  }

  function geocode(city) {
    return fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city)
      + '&count=1&language=zh&format=json')
      .then(function (r) { return r.json(); })
      .then(function (g) {
        if (!g.results || !g.results.length) throw 0;
        return { lat: g.results[0].latitude, lon: g.results[0].longitude };
      });
  }

  function forecast(lat, lon) {
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat
      + '&longitude=' + lon + '&current_weather=true&timezone=auto')
      .then(function (r) { return r.json(); })
      .then(function (w) {
        return {
          temp: Math.round(w.current_weather.temperature),
          code: w.current_weather.weathercode
        };
      });
  }

  function render(d, cityLabel) {
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
      + (cityLabel ? ' · ' + cityLabel : '');
    chip.style.display = 'block';
  }

  boot();
})();
