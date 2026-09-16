import { eventConfig, mapConfig } from '../../js/config.js';
import venueMapImage from '../../photos/venue-map.png';

let sdkPromise;

function loadMapSdk() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const securityConfig = {};
      if (mapConfig.serviceHost) securityConfig.serviceHost = mapConfig.serviceHost;
      if (mapConfig.securityJsCode) securityConfig.securityJsCode = mapConfig.securityJsCode;
      window._AMapSecurityConfig = securityConfig;
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

function createStaticMapImage(hotel) {
  const image = document.createElement('img');
  image.className = 'map-image';
  image.src = venueMapImage;
  image.alt = `${hotel.name || '酒店'}位置地图`;
  image.loading = 'eager';
  image.decoding = 'async';
  image.addEventListener('error', () => image.replaceWith(createOpenStreetMapEmbed(hotel)), { once: true });
  return image;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|HarmonyOS/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function createAmapMarkerUrl(hotel) {
  const params = new URLSearchParams({
    position: `${hotel.longitude},${hotel.latitude}`,
    name: hotel.name || '酒店位置',
    src: 'engagement_plan',
    coordinate: 'gaode',
    // AMap uses callnative=1 to try the mobile app. When it cannot launch,
    // the same HTTPS URI remains available as the browser fallback.
    callnative: isMobileDevice() ? '1' : '0',
  });
  return `https://uri.amap.com/marker?${params.toString()}`;
}

function createVenueName(hotel, hasLocation) {
  const name = document.createElement(hasLocation ? 'a' : 'p');
  name.className = hasLocation ? 'venue-name venue-name-link' : 'venue-name';
  name.textContent = hotel.name || '酒店位置待确定';
  if (hasLocation) {
    name.href = createAmapMarkerUrl(hotel);
    name.title = '在高德地图中查看酒店位置';
    name.setAttribute('aria-label', `在高德地图中查看${hotel.name || '酒店'}位置`);
  }
  return name;
}

function renderAmap(frame, AMap, hotel) {
  frame.replaceChildren();
  frame.className = 'map-frame map-frame-amap';
  const canvas = document.createElement('div');
  canvas.className = 'map-canvas';
  frame.append(canvas);
  const options = {
    zoom: 16,
    center: [hotel.longitude, hotel.latitude],
    resizeEnable: true,
  };
  if (mapConfig.styleId) options.mapStyle = `amap://styles/${mapConfig.styleId}`;
  const map = new AMap.Map(canvas, options);
  map.add(new AMap.Marker({ position: [hotel.longitude, hotel.latitude], title: hotel.name }));
  return map;
}

export function mountMap(container) {
  let disposed = false;
  let map;
  const hotel = eventConfig.hotel;
  const hasLocation = hasValidLocation(hotel);
  const frame = createMapFrame(hotel);
  const name = createVenueName(hotel, hasLocation);
  container.replaceChildren(frame, name);

  if (!hasLocation) {
    const placeholder = document.createElement('div');
    placeholder.className = 'map-placeholder';
    placeholder.textContent = '酒店位置待确定';
    frame.append(placeholder);
    return () => { disposed = true; };
  }

  // The generated image keeps the custom AMap style visible on the public
  // static page. A configured key upgrades it to an interactive AMap canvas.
  frame.append(createStaticMapImage(hotel));

  // Use AMap when a Web JS API key is available. If the SDK cannot load, the
  // custom-style image remains visible as a resilient fallback.
  if (mapConfig.key) {
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
