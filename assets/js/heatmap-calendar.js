document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('heatmap');
  const src = el.getAttribute('data-src') || 'data/data.json';
  const res = await fetch(src, {cache:'no-cache'});
  const obj = await res.json();
  el.innerHTML = '<pre>'+JSON.stringify(obj, null, 2)+'</pre>';
});
