// 文章内容图片懒加载：渲染后为没有 loading 属性的 <img> 添加 loading="lazy"
hexo.extend.filter.register('after_post_render', function (data) {
  data.content = data.content.replace(/<img((?:(?!loading=)[^>])*)>/g, '<img loading="lazy"$1>');
  return data;
});
