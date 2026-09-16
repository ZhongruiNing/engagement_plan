import { eventConfig, mapConfig } from '../../js/config.js';
let sdkPromise;
function loadMapSdk() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { serviceHost: mapConfig.serviceHost };
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('地图加载超时')), 12000);
    function finish(error) { clearTimeout(timer); if (error) { script.remove(); sdkPromise = null; reject(error); } else resolve(window.AMap); }
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(mapConfig.key)}`;
    script.onload = () => window.AMap ? finish() : finish(new Error('地图不可用'));
    script.onerror = () => finish(new Error('地图加载失败'));
    document.head.append(script);
  });
  return sdkPromise;
}
export function mountMap(container) {
  let disposed = false, map;
  const hotel = eventConfig.hotel;
  const hasLocation = Number.isFinite(hotel.longitude) && Number.isFinite(hotel.latitude) && Math.abs(hotel.longitude) <= 180 && Math.abs(hotel.latitude) <= 90;
  container.innerHTML = '<div class="map-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span class="map-title"></span><p class="map-message"></p></div>';
  container.querySelector('.map-title').textContent = hotel.name || '酒店位置待确定';
  container.querySelector('.map-message').textContent = hotel.address || '确定后，将在这里与大家分享赴约路线';
  if (hasLocation) {
    const detail = document.createElement('div'); detail.className = 'venue-details';
    const address = document.createElement('span'); address.textContent = hotel.address || hotel.name;
    const link = document.createElement('a'); link.textContent = '在高德地图中查看'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.href = `https://uri.amap.com/marker?position=${hotel.longitude},${hotel.latitude}&name=${encodeURIComponent(hotel.name || '订婚酒店')}&coordinate=gaode&callnative=0`;
    detail.append(address, link); container.append(detail);
  }
  if (hasLocation && mapConfig.key && mapConfig.serviceHost) loadMapSdk().then(AMap => {
    if (disposed) return;
    const canvas = container.firstElementChild; canvas.className = 'map-canvas'; canvas.replaceChildren();
    map = new AMap.Map(canvas, { zoom: 16, center: [hotel.longitude, hotel.latitude], resizeEnable: true });
    map.add(new AMap.Marker({ position: [hotel.longitude, hotel.latitude], title: hotel.name }));
  }).catch(() => { if (!disposed) container.querySelector('.map-message').textContent = '地图暂时未能加载，可通过下方链接查看路线'; });
  return () => { disposed = true; map?.destroy(); };
}
