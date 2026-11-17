/* 天气小组件: 搜狐IP定位(国内友好) -> open-meteo 天气(均免 key), 缓存 1h, 失败静默 */
(function () {
  var KEY = '3h_weather';
  var chip = document.createElement('div');
  chip.style.cssText = 'position:fixed;right:14px;bottom:346px;z-index:998;'
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
  setTimeout(function () { if (!done) chip.style.display = 'none'; }, 10000);

  locate()
    .then(function (loc) {
      if (!loc) throw 0;
      return (loc.lat ? Promise.resolve(loc) : geocode(loc.city))
        .then(function (loc2) { return forecast(loc2); })
        .then(function (w) {
          var data = { ts: Date.now(), city: loc.city, temp: w.temp, code: w.code, wind: w.wind };
          try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { }
          done = true;
          render(data);
        });
    })
    .catch(function () { chip.style.display = 'none'; });

  /* 1) 搜狐 IP 接口: script 标签方式无 CORS 问题, 返回 returnCitySN.cname 如 "北京市" */
  function locate() {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      var timer = setTimeout(function () { resolve(null); }, 4000);
      s.onload = function () {
        clearTimeout(timer);
        try {
          var sn = window.returnCitySN;
          var name = ((sn && sn.cname) || '').trim().replace(/^中国/, '').replace(/^.*?省/, '').replace(/市$/, '').trim();
          resolve(name && name !== '未知' ? { city: name.slice(0, 6) } : null);
        } catch (e) { resolve(null); }
        s.remove();
      };
      s.onerror = function () { clearTimeout(timer); resolve(null); };
      s.src = 'https://pv.sohu.com/cityjson?ie=utf-8&t=' + Date.now();
      document.head.appendChild(s);
    }).then(function (loc) {
      if (loc) return loc;
      /* 2) 回退: ipapi.co (国外) */
      return fetch('https://ipapi.co/json/').then(function (r) { return r.json(); }).then(function (g) {
        if (!g || !g.latitude) throw 0;
        return { city: (g.city || '').slice(0, 6), lat: g.latitude, lon: g.longitude };
      });
    });
  }

  /* 城市名 -> 经纬度 (open-meteo geocoding) */
  function geocode(city) {
    return fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city)
      + '&count=1&language=zh&format=json')
      .then(function (r) { return r.json(); })
      .then(function (g) {
        if (!g.results || !g.results.length) throw 0;
        return { city: city, lat: g.results[0].latitude, lon: g.results[0].longitude };
      });
  }

  /* 经纬度 -> 当前天气 */
  function forecast(loc) {
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat
      + '&longitude=' + loc.lon + '&current_weather=true&timezone=auto')
      .then(function (r) { return r.json(); })
      .then(function (w) {
        return {
          temp: Math.round(w.current_weather.temperature),
          code: w.current_weather.weathercode,
          wind: Math.round(w.current_weather.windspeed)
        };
      });
  }

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
