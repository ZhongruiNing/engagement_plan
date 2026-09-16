import { eventConfig, mapConfig } from '../../js/config.js';

let sdkPromise;

function loadMapSdk() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      window._AMapSecurityConfig = mapConfig.serviceHost ? { serviceHost: mapConfig.serviceHost } : {};
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new Error('地图加载超时')), 12000);

      function finish(error) {
        clearTimeout(timer);
        if (error) {
          script.remove();
          sdkPromise = null;
          reject(error);
        } else {
          resolve(window.AMap);
        }
      }

      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(mapConfig.key)}`;
      script.onload = () => window.AMap ? finish() : finish(new Error('地图不可用'));
      script.onerror = () => finish(new Error('地图加载失败'));
      document.head.append(script);
    });
  }
  return sdkPromise;
}

function hasValidLocation(hotel) {
  return Number.isFinite(hotel.longitude)
    && Number.isFinite(hotel.latitude)
    && Math.abs(hotel.longitude) <= 180
    && Math.abs(hotel.latitude) <= 90;
}

function createMapFrame(hotel) {
  const frame = document.createElement('div');
  frame.className = 'map-frame';
  frame.setAttribute('aria-label', `${hotel.name || '酒店'}地图`);
  return frame;
}

function createOpenStreetMapEmbed(hotel) {
  const deltaLongitude = 0.006;
  const deltaLatitude = 0.004;
  const west = (hotel.longitude - deltaLongitude).toFixed(6);
  const south = (hotel.latitude - deltaLatitude).toFixed(6);
  const east = (hotel.longitude + deltaLongitude).toFixed(6);
  const north = (hotel.latitude + deltaLatitude).toFixed(6);
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
    layer: 'mapnik',
    marker: `${hotel.latitude},${hotel.longitude}`,
  });
  const iframe = document.createElement('iframe');
  iframe.className = 'map-embed';
  iframe.title = `${hotel.name || '酒店'}位置地图`;
  iframe.src = `https://www.openstreetmap.org/export/embed.html?${params}`;
  iframe.loading = 'eager';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.setAttribute('allowfullscreen', '');
  return iframe;
}

function renderAmap(frame, AMap, hotel) {
  frame.replaceChildren();
  frame.className = 'map-frame map-frame-amap';
  const canvas = document.createElement('div');
  canvas.className = 'map-canvas';
  frame.append(canvas);
  const map = new AMap.Map(canvas, {
    zoom: 16,
    center: [hotel.longitude, hotel.latitude],
    resizeEnable: true,
  });
  map.add(new AMap.Marker({ position: [hotel.longitude, hotel.latitude], title: hotel.name }));
  return map;
}

export function mountMap(container) {
  let disposed = false;
  let map;
  const hotel = eventConfig.hotel;
  const hasLocation = hasValidLocation(hotel);
  const frame = createMapFrame(hotel);
  const name = document.createElement('p');
  name.className = 'venue-name';
  name.textContent = hotel.name || '酒店位置待确定';
  container.replaceChildren(frame, name);

  if (!hasLocation) {
    const placeholder = document.createElement('div');
    placeholder.className = 'map-placeholder';
    placeholder.textContent = '酒店位置待确定';
    frame.append(placeholder);
    return () => { disposed = true; };
  }

  frame.append(createOpenStreetMapEmbed(hotel));

  // AMap is used when a server-side security proxy is configured. Otherwise the
  // embedded map keeps the public static page useful without exposing the secret.
  if (mapConfig.key && mapConfig.serviceHost) {
    loadMapSdk()
      .then((AMap) => {
        if (!disposed) map = renderAmap(frame, AMap, hotel);
      })
      .catch(() => { /* Keep the embedded map fallback visible. */ });
  }

  return () => {
    disposed = true;
    map?.destroy();
  };
}
