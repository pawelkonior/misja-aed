import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import {
  accessLabel,
  asset,
  DEMO_POSITION,
  DEMO_TARGET,
  distance,
  loadPoints,
  loadApproachPhotos,
  meters,
  nearby,
  routePhotos,
  routeProgress,
  stepText,
  walkingRoute,
} from './core';
import type {
  AedTarget,
  GeoPoint,
  MapSession,
  NavigationPayload,
  MapOptions,
  RouteState,
} from './types';

const icons = {
  heart:
    '<path d="M20 4c-3-2-6-1-8 2-2-3-5-4-8-2-4 3-2 8 1 11l7 6 7-6c3-3 5-8 1-11Z" fill="currentColor" stroke="none"/><path d="m13.5 6-5 7h3.8l-1.4 5 5.3-7.4h-4.1z" fill="var(--bolt, white)" stroke="none"/>',
  gps: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  walk: '<circle cx="14" cy="4" r="2"/><path d="m11 10 3-3 2 5 3 2m-5-7-3 8-4 6m4-7 4 2 1 5M7 12l4-4"/>',
  cam: '<path d="M3 8V5h4m10 0h4v4m0 6v4h-4m-10 0H3v-4"/><circle cx="12" cy="12" r="4"/>',
  photo:
    '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="1.4"/><path d="m5 17 5-4 3 2 3-4 4 6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  check: '<path d="m4 13 5 5L20 6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
};
const svg = (name: keyof typeof icons, size = 19) =>
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="' +
  size +
  '" height="' +
  size +
  '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
  icons[name] +
  '</svg>';
const esc = (s: string | number | undefined) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
const latlng = (p: GeoPoint): L.LatLngTuple => [p.lat, p.lon];
const mapBounds: L.LatLngBoundsLiteral = [
  [52.2275, 21.0055],
  [52.236, 21.022],
];
const aedIcon = (selected = false) =>
  L.divIcon({
    className: 'am-icon',
    iconSize: selected ? [38, 46] : [29, 36],
    iconAnchor: selected ? [19, 45] : [14, 35],
    html:
      '<span class="am-pin ' +
      (selected ? 'am-selected' : '') +
      '">' +
      svg('heart', selected ? 24 : 18) +
      '</span>',
  });
const personIcon = L.divIcon({
  className: 'am-loc',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: '<span></span>',
});
const tooltip = (s: keyof typeof icons, txt: string) =>
  '<button type="button" class="am-mapbtn" data-act="' +
  s +
  '" title="' +
  txt +
  '" aria-label="' +
  txt +
  '">' +
  svg(s) +
  '</button>';

const accessTag = (t: AedTarget) =>
  '<span class="am-access ' +
  (['yes', 'permissive'].includes(t.access ?? '') ? 'am-public' : '') +
  '"><i></i>' +
  accessLabel(t) +
  '</span>';
export function mountAedMap(container: HTMLElement, options: MapOptions = {}): MapSession {
  let points: AedTarget[] = [DEMO_TARGET],
    position: GeoPoint = { ...DEMO_POSITION },
    mode: 'demo' | 'live' = 'demo',
    selected: AedTarget | null = null,
    filter = 'all',
    listLimit = 4,
    view = 'list';
  let route: RouteState | null = null,
    notice = '',
    waiting = '',
    watch: number | null = null,
    controller: AbortController | null = null,
    destroyed = false,
    usedFallback = false,
    photoIndex = 0;
  let routeLine: L.Polyline | null = null,
    lastRequest = 0,
    driftCount = 0,
    gpsTicket = 0,
    lastListAt: GeoPoint | null = null,
    arrived = false;
  let nearest = nearby(points, position, filter);
  container.innerHTML =
    '<section class="am-root"><div class="am-head"><button type="button" class="am-back" data-act="back" aria-label="Wstecz">' +
    svg('back') +
    '</button><h2>Znajdź AED</h2><span class="am-mode"></span></div><div class="am-mapwrap"><div class="am-map" role="region" aria-label="Mapa defibrylatorów"></div><div class="am-scale">' +
    tooltip('plus', 'Przybliż mapę') +
    tooltip('minus', 'Oddal mapę') +
    '</div><button type="button" class="am-gps" data-act="gps">' +
    svg('gps', 17) +
    '<span>Moja lokalizacja</span></button></div><p class="am-help">Jesteś jedynym świadkiem? Zostań przy poszkodowanym i zadzwoń pod <a href="tel:112">112</a>. Po AED wyślij drugą osobę.</p><div class="am-notice" role="status"></div><div class="am-panel"></div></section>';
  const $ = (s: string) => container.querySelector<HTMLElement>(s)!;
  const panel = $('.am-panel'),
    note = $('.am-notice'),
    mapEl = $('.am-map');
  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    minZoom: 4,
    maxZoom: 19,
    dragging: true,
  }).setView([52.23195, 21.0142], 16);
  L.control
    .attribution({ prefix: false, position: 'bottomleft' })
    .addTo(map)
    .addAttribution(
      '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
    );
  const localMap = L.imageOverlay(asset('map-assets/srodmiescie.svg'), mapBounds, {
    className: 'am-district',
  }).addTo(map);
  const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  const markerLayer = L.layerGroup().addTo(map);
  const userMarker = L.marker(latlng(position), {
    icon: personIcon,
    keyboard: false,
    zIndexOffset: 600,
    title: 'Pozycja startowa',
  }).addTo(map);
  const resize = new ResizeObserver(() => {
    if (mapEl.clientWidth > 0) map.invalidateSize({ pan: false });
  });
  resize.observe(mapEl);
  function chooseBase() {
    const showLocal = L.latLngBounds(mapBounds).contains(map.getBounds()) && map.getZoom() >= 15;
    if (showLocal) {
      if (!map.hasLayer(localMap)) localMap.addTo(map);
      if (map.hasLayer(tile)) map.removeLayer(tile);
    } else {
      if (!map.hasLayer(tile)) tile.addTo(map);
      if (map.hasLayer(localMap)) map.removeLayer(localMap);
    }
  }
  map.on('moveend', chooseBase);
  function updateMarkers() {
    markerLayer.clearLayers();
    for (const { target } of nearest) {
      const active = target.id === selected?.id;
      const marker = L.marker(latlng(target), {
        icon: aedIcon(active),
        title: target.name,
        alt: 'AED · ' + target.name,
        zIndexOffset: active ? 400 : 0,
      });
      marker.on('click', () => selectTarget(target, true)).addTo(markerLayer);
    }
    if (selected && !nearest.some((x) => x.target.id === selected?.id)) {
      L.marker(latlng(selected), { icon: aedIcon(true), title: selected.name }).addTo(markerLayer);
    }
    userMarker.setLatLng(latlng(position));
  }
  function status() {
    $('.am-mode').textContent = mode === 'demo' ? 'Warszawa · demo' : 'Pozycja GPS';
    const current = waiting || notice;
    note.textContent = current;
    note.hidden = !current;
  }
  function list() {
    const filters = [
      ['all', 'Wszystkie'],
      ['public', 'Publiczne'],
      ['always', 'Publiczne 24/7'],
    ];
    return (
      '<div class="am-panel-head"><div><div class="am-overline">W TWOJEJ OKOLICY</div><h3>Najbliższe AED</h3></div><span class="am-count">' +
      nearest.length +
      '</span></div>' +
      '<div class="am-filters" aria-label="Filtrowanie punktów">' +
      filters
        .map(
          ([id, label]) =>
            '<button type="button" data-act="filter" data-val="' +
            id +
            '" aria-pressed="' +
            (filter === id) +
            '">' +
            label +
            '</button>',
        )
        .join('') +
      '</div>' +
      '<div class="am-rows">' +
      nearest
        .slice(0, listLimit)
        .map(
          ({ target: t, meters: m }) =>
            '<button type="button" class="am-row" data-act="select" data-val="' +
            esc(t.id) +
            '"><span class="am-rowicon">' +
            svg('heart', 22) +
            '</span><span class="am-rowtxt"><strong>' +
            esc(t.name) +
            '</strong>' +
            accessTag(t) +
            '</span><span class="am-dist">' +
            meters(m) +
            '</span>' +
            svg('chevron', 15) +
            '</button>',
        )
        .join('') +
      '</div>' +
      (nearest.length > listLimit
        ? '<button type="button" class="am-text-btn" data-act="more">Pokaż więcej punktów ' +
          svg('chevron', 14) +
          '</button>'
        : '') +
      '<p class="am-foot">Odległości w linii prostej. ' +
      (mode === 'demo'
        ? 'Start pokazu przy ul. Widok.'
        : 'Kolejność według ostatniego odczytu GPS.') +
      '</p>' +
      (mode === 'live'
        ? '<button type="button" class="am-text-btn" data-act="demo">Pokaż trasę demonstracyjną</button>'
        : '')
    );
  }
  function targetPhoto() {
    const photos = routePhotos(selected!, position, position.heading);
    if (!photos.length) return '';
    const index = Math.min(photoIndex, photos.length - 1),
      p = photos[index]!;
    return (
      '<figure class="am-photo"><img src="' +
      esc(p.src) +
      '" alt="' +
      esc(p.label) +
      '" loading="lazy"><figcaption><span>' +
      svg('photo', 14) +
      esc(p.label) +
      '</span><small><a href="' +
      esc(p.url) +
      '" target="_blank" rel="noopener">' +
      esc(p.credit) +
      '</a></small></figcaption>' +
      (photos.length > 1
        ? '<button type="button" data-act="photo" class="am-next-photo" aria-label="Następne zdjęcie">' +
          (index + 1) +
          '/' +
          photos.length +
          ' ' +
          svg('chevron', 14) +
          '</button>'
        : '') +
      '</figure>'
    );
  }
  function details() {
    const t = selected!;
    return (
      '<button type="button" class="am-return" data-act="list">' +
      svg('back', 14) +
      ' Lista urządzeń</button><div class="am-panel-head"><div><div class="am-overline">WYBRANY DEFIBRYLATOR</div><h3>' +
      esc(t.name) +
      '</h3></div><span class="am-bigheart">' +
      svg('heart', 27) +
      '</span></div>' +
      '<div class="am-badges">' +
      accessTag(t) +
      '<span>' +
      meters(distance(position, t)) +
      ' w linii prostej</span></div>' +
      '<p class="am-description">' +
      esc(t.description) +
      '</p>' +
      (t.address ? '<p class="am-address">' + svg('pin', 15) + esc(t.address) + '</p>' : '') +
      (t.hours
        ? '<p class="am-foot">Godziny według źródła: ' + esc(t.hours) + '</p>'
        : '<p class="am-foot">Brak podanych godzin dostępu.</p>') +
      (t.access_note ? '<p class="am-foot">' + esc(t.access_note) + '</p>' : '') +
      (!['private', 'no'].includes(t.access ?? '')
        ? '<button type="button" class="am-primary" data-act="navigate">' +
          svg('walk', 19) +
          ' Wyznacz trasę pieszą ' +
          svg('arrow', 17) +
          '</button>'
        : '') +
      targetPhoto() +
      '<a class="am-source" target="_blank" rel="noopener" href="' +
      esc(t.source_url) +
      '">Rekord źródłowy ↗</a>'
    );
  }
  function navigation() {
    const progress = route && routeProgress(route, position);
    const step = progress && route?.steps[progress.index];
    const rem = progress?.remaining ?? 0;
    const summary = route
      ? meters(rem) +
        ' · ' +
        Math.max(1, Math.round((route.duration * rem) / Math.max(1, route.distance) / 60)) +
        ' min'
      : 'Bez wyznaczonej trasy';
    return (
      '<button type="button" class="am-return" data-act="detail">' +
      svg('back', 14) +
      ' Szczegóły punktu</button>' +
      '<div class="am-panel-head"><div><div class="am-overline">' +
      (arrived ? 'W POBLIŻU CELU' : 'TRASA PIESZA') +
      '</div><h3>' +
      esc(arrived ? 'Poszukaj znaku AED' : summary) +
      '</h3></div><span class="am-route-icon">' +
      svg(arrived ? 'check' : 'walk', 24) +
      '</span></div>' +
      '<div class="am-navstep">' +
      svg(arrived ? 'heart' : 'arrow', 22) +
      '<span><strong>' +
      esc(
        arrived
          ? selected!.description
          : route
            ? stepText(step)
            : 'Wyznaczenie trasy wymaga połączenia',
      ) +
      '</strong><small>' +
      esc(selected!.name) +
      '</small></span></div>' +
      '<div class="am-actions">' +
      (route
        ? '<button type="button" class="am-primary" data-act="ar">' +
          svg('cam', 18) +
          ' Prowadź w AR</button>'
        : '<button type="button" class="am-primary" data-act="navigate">Ponów trasę</button>') +
      (mode === 'demo' && route && !arrived
        ? '<button type="button" class="am-secondary" data-act="advance">Krok demo ' +
          svg('chevron', 15) +
          '</button>'
        : '') +
      '</div>' +
      '<button type="button" class="' +
      (arrived ? 'am-primary am-confirm' : 'am-text-btn') +
      '" data-act="arrive">' +
      svg('check', 16) +
      ' Mam AED · instrukcja</button>' +
      targetPhoto() +
      '<p class="am-foot">Trasa piesza © <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS / OSRM</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Popraw mapę</a></p>'
    );
  }
  function render() {
    status();
    panel.innerHTML = view === 'list' ? list() : view === 'detail' ? details() : navigation();
  }
  function clearRoute() {
    controller?.abort();
    controller = null;
    waiting = '';
    if (routeLine) routeLine.remove();
    routeLine = null;
    route = null;
    arrived = false;
    driftCount = 0;
    photoIndex = 0;
  }
  function selectTarget(target: AedTarget, pan: boolean) {
    clearRoute();
    selected = target;
    view = 'detail';
    notice = '';
    if (pan) map.panTo(latlng(target));
    updateMarkers();
    render();
  }
  function payload(target: AedTarget): NavigationPayload {
    return {
      target,
      position: { ...position },
      route,
      mode,
      path: route?.coordinates.map(([lon, lat]) => ({ lat, lon })) ?? [],
    };
  }
  async function navigate({ reroute = false } = {}) {
    if (!selected) return;
    if (controller) controller.abort();
    const req = new AbortController();
    controller = req;
    const timeout = setTimeout(() => req.abort(), 10000);
    const target = selected;
    waiting = 'Wyznaczanie trasy pieszej…';
    notice = '';
    status();
    lastRequest = Date.now();
    driftCount = 0;
    try {
      const calculated = await walkingRoute(position, target, req.signal);
      if (destroyed || controller !== req || selected !== target) return;
      route = calculated;
      view = 'nav';
      arrived = distance(position, target) < 20 && (position.accuracy ?? 0) <= 25;
      if (routeLine) routeLine.remove();
      routeLine = L.polyline(
        route.coordinates.map(([lon, lat]): L.LatLngTuple => [lat, lon]),
        { color: '#1764de', weight: 5, opacity: 0.95, lineCap: 'round' },
      ).addTo(map);
      if (!reroute)
        map.fitBounds(routeLine.getBounds(), { padding: [40, 35], maxZoom: 18, animate: false });
      options.onNavigate?.(payload(target));
      if (mode === 'live' && target.id !== DEMO_TARGET.id) {
        void loadApproachPhotos(target).then((photos) => {
          if (!destroyed && selected === target && photos.length) render();
        });
      }
    } catch {
      if (destroyed || controller !== req) return;
      if (routeLine) routeLine.remove();
      routeLine = null;
      route = null;
      view = 'nav';
      notice = 'Trasa piesza jest niedostępna. Możesz sprawdzić adres i ponowić próbę.';
    } finally {
      clearTimeout(timeout);
      if (!destroyed && controller === req) {
        waiting = '';
        controller = null;
        render();
      }
    }
  }
  function setPosition(next: GeoPoint, first = false) {
    position = next;
    if (view === 'list' && (!lastListAt || first || distance(lastListAt, position) > 10)) {
      nearest = nearby(points, position, filter);
      lastListAt = position;
      updateMarkers();
    } else userMarker.setLatLng(latlng(position));
    if (view === 'nav' && selected) {
      arrived = distance(position, selected) <= 20 && (position.accuracy ?? 0) <= 25;
      if (route && !arrived && mode === 'live') {
        const deviation = routeProgress(route, position).offRoute;
        driftCount = deviation > Math.max(45, position.accuracy || 0) ? driftCount + 1 : 0;
        if (driftCount >= 2 && !controller && Date.now() - lastRequest > 15000)
          void navigate({ reroute: true });
      }
    }
    if (first) map.setView(latlng(position), 16, { animate: false });
    render();
  }
  function gps() {
    if (!navigator.geolocation) {
      notice = 'Ta przeglądarka nie obsługuje lokalizacji.';
      status();
      return;
    }
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    const ticket = ++gpsTicket;
    waiting = 'Ustalanie Twojej lokalizacji…';
    notice = '';
    status();
    let first = true;
    watch = navigator.geolocation.watchPosition(
      (fix) => {
        if (destroyed || ticket !== gpsTicket) return;
        waiting = '';
        const next = {
          lat: fix.coords.latitude,
          lon: fix.coords.longitude,
          accuracy: fix.coords.accuracy,
          heading: fix.coords.heading,
        };
        if (first && mode === 'demo') {
          clearRoute();
          view = 'list';
          selected = null;
        }
        mode = 'live';
        notice =
          next.accuracy > 90
            ? 'Przybliżona lokalizacja GPS (± ' + meters(next.accuracy) + ').'
            : '';
        setPosition(next, first);
        first = false;
      },
      (err) => {
        if (destroyed || ticket !== gpsTicket) return;
        waiting = '';
        notice =
          (err.code === 1 ? 'Brak zgody na lokalizację.' : 'Nie udało się odczytać GPS.') +
          (mode === 'demo'
            ? ' Możesz kontynuować pokaz w Warszawie.'
            : ' Widoczna jest ostatnia odczytana pozycja.');
        status();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
    );
  }
  function demo() {
    gpsTicket++;
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    watch = null;
    mode = 'demo';
    position = { ...DEMO_POSITION };
    showList();
  }
  function advance() {
    if (mode !== 'demo' || !selected || !route) return;
    const current = routeProgress(route, position);
    const next = route.steps[current.index + 1];
    const [lon, lat] = next?.maneuver.location ?? [selected.lon, selected.lat];
    setPosition({ lon, lat });
    map.panTo(latlng(position));
  }
  function showList() {
    clearRoute();
    selected = null;
    view = 'list';
    notice = '';
    nearest = nearby(points, position, filter);
    lastListAt = position;
    map.setView(latlng(position), 16, { animate: false });
    updateMarkers();
    render();
  }
  const click = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const b = e.target.closest<HTMLElement>('[data-act]');
    if (!b || !container.contains(b)) return;
    const action = b.dataset['act'];
    if (action === 'back') {
      if (view === 'list') options.onBack?.();
      else if (view === 'nav') selectTarget(selected!, false);
      else showList();
    }
    if (action === 'list') showList();
    if (action === 'detail') selectTarget(selected!, false);
    if (action === 'gps') gps();
    if (action === 'demo') demo();
    if (action === 'plus') map.zoomIn();
    if (action === 'minus') map.zoomOut();
    if (action === 'select') {
      const t = nearest.find((a) => a.target.id === b.dataset['val'])?.target;
      if (t) selectTarget(t, true);
    }
    if (action === 'filter') {
      filter = b.dataset['val'] ?? 'all';
      listLimit = 4;
      nearest = nearby(points, position, filter);
      updateMarkers();
      render();
    }
    if (action === 'more') {
      listLimit += 12;
      render();
    }
    if (action === 'navigate' && !controller) void navigate();
    if (action === 'photo') {
      const n = routePhotos(selected!, position, position.heading).length;
      photoIndex = (photoIndex + 1) % n;
      render();
    }
    if (action === 'ar' && route) options.onOpenAR?.(payload(selected!));
    if (action === 'arrive' && selected) options.onArrive?.(payload(selected));
    if (action === 'advance') advance();
  };
  container.addEventListener('click', click);
  function load() {
    loadPoints()
      .then((all) => {
        if (destroyed) return;
        points = all;
        nearest = nearby(points, position, filter);
        updateMarkers();
        render();
      })
      .catch(() => {
        if (destroyed) return;
        usedFallback = true;
        notice = 'Nie udało się wczytać katalogu. Dostępny jest przykładowy punkt.';
        render();
      });
  }
  updateMarkers();
  render();
  load();
  if (options.initialMode === 'live') gps();
  else if (options.initialMode !== 'demo' && navigator.permissions) {
    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (!destroyed && permission.state === 'granted' && !gpsTicket) gps();
      })
      .catch(() => {
        /* A visible GPS button also works in browsers without permission queries. */
      });
  }
  return {
    getState: () => ({
      position: { ...position },
      target: selected,
      mode,
      route,
      path: route?.coordinates.map(([lon, lat]) => ({ lat, lon })) ?? [],
      view,
      nearest,
      usedFallback,
    }),
    destroy() {
      destroyed = true;
      gpsTicket++;
      controller?.abort();
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      container.removeEventListener('click', click);
      resize.disconnect();
      map.remove();
      container.replaceChildren();
    },
  };
}
