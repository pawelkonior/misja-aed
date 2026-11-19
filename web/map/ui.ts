import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import {
  accessLabel,
  asset,
  distance,
  loadPoints,
  loadApproachPhotos,
  meters,
  nearby,
  routePhotos,
  routeProgress,
  searchStartLocations,
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
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
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
  let points: AedTarget[] = [];
  let nearest: ReturnType<typeof nearby> = [];
  let position: GeoPoint | null = null;
  let origin: NavigationPayload['mode'] = 'live';
  let selected: AedTarget | null = null;
  let route: RouteState | null = null;
  let view: 'list' | 'picker' | 'destination' | 'directions' = 'list';
  let active = options.active ?? true;
  let destroyed = false;
  let guiding = false;
  let gpsStatus: 'waiting' | 'ready' | 'error' = 'waiting';
  let locationNotice = '';
  let catalogueError = false;
  let loadingData = false;
  let routeError = false;
  let request: AbortController | null = null;
  let searchRequest: AbortController | null = null;
  let lastRequest = 0;
  let driftCount = 0;
  let arrived = false;
  let lastListAt: GeoPoint | null = null;
  let photoIndex = 0;
  let listLimit = 8;
  let watch: number | null = null;
  let gpsTicket = 0;
  let pickerConfirmed = false;
  let searchResults: Awaited<ReturnType<typeof searchStartLocations>> = [];
  let routeLine: L.Polyline | null = null;
  let userMarker: L.Marker | null = null;

  container.innerHTML =
    '<section class="am-root"><header class="am-head"><button type="button" class="am-back" data-act="back" aria-label="Wstecz">' +
    svg('back') +
    '</button><h1>Defibrylatory w pobliżu</h1></header><div class="am-mapwrap"><div class="am-map" role="region" aria-label="Mapa defibrylatorów"></div><div class="am-aim" hidden>' +
    svg('pin', 34) +
    '</div><div class="am-scale">' +
    tooltip('plus', 'Przybliż mapę') +
    tooltip('minus', 'Oddal mapę') +
    '</div><button type="button" class="am-gps" data-act="gps" aria-label="Moja lokalizacja" title="Moja lokalizacja">' +
    svg('gps', 21) +
    '</button></div><div class="am-panel"></div></section>';
  const $ = (s: string) => container.querySelector<HTMLElement>(s)!;
  const panel = $('.am-panel');
  const mapEl = $('.am-map');
  const map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    minZoom: 4,
    maxZoom: 19,
  }).setView([52.09, 19.37], 5);
  L.control
    .attribution({ prefix: false, position: 'bottomleft' })
    .addTo(map)
    .addAttribution(
      '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
    );
  const localMap = L.imageOverlay(asset('map-assets/srodmiescie.svg'), mapBounds, {
    className: 'am-district',
  });
  const tile = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  const markerLayer = L.layerGroup().addTo(map);
  const resize = new ResizeObserver(() => {
    if (mapEl.clientWidth > 0) map.invalidateSize({ pan: false });
  });
  resize.observe(mapEl);
  function chooseBase() {
    const local = L.latLngBounds(mapBounds).contains(map.getBounds()) && map.getZoom() >= 15;
    const visible = local ? localMap : tile;
    const hidden = local ? tile : localMap;
    if (!map.hasLayer(visible)) visible.addTo(map);
    if (map.hasLayer(hidden)) map.removeLayer(hidden);
  }
  map.on('moveend', chooseBase);
  chooseBase();

  function updateMarkers() {
    markerLayer.clearLayers();
    if (view !== 'picker') {
      for (const { target } of nearest) {
        const chosen = target.id === selected?.id;
        if (selected && !chosen) continue;
        L.marker(latlng(target), {
          icon: aedIcon(chosen),
          title: target.name,
          alt: 'AED · ' + target.name,
          zIndexOffset: chosen ? 400 : 0,
        })
          .on('click', () => selectTarget(target))
          .addTo(markerLayer);
      }
    }
    if (userMarker) userMarker.remove();
    userMarker = null;
    if (!position || view === 'picker') return;
    const title = origin === 'live' ? 'Twoja lokalizacja' : 'Wybrany punkt startowy';
    userMarker = L.marker(latlng(position), {
      icon:
        origin === 'live'
          ? personIcon
          : L.divIcon({
              className: 'am-start-pin',
              iconSize: [19, 19],
              iconAnchor: [9, 9],
              html: '<span></span>',
            }),
      title,
      alt: title,
      keyboard: false,
      zIndexOffset: 600,
    }).addTo(map);
  }
  const recordingLink = () =>
    options.onOpenRecording
      ? '<button type="button" class="am-text-btn am-film" data-act="recording">' +
        svg('play', 16) +
        ' <span>Obejrzyj nagranie przejścia<small>Warszawa, Chmielna 21</small></span></button>'
      : '';
  const locationButton = (label: string) =>
    '<button type="button" data-act="gps" class="am-primary">' +
    svg('gps', 18) +
    esc(label) +
    '</button>';
  function locationPanel() {
    const waiting = gpsStatus === 'waiting';
    return (
      '<div class="am-panel-head"><h2>' +
      (waiting ? 'Ustalam Twoją lokalizację' : 'Skąd wyruszasz?') +
      '</h2></div>' +
      '<p role="status" class="am-message">' +
      esc(locationNotice || 'Zezwól na dostęp do lokalizacji, aby zobaczyć najbliższe AED.') +
      '</p>' +
      (waiting ? '' : locationButton('Użyj mojej lokalizacji')) +
      '<button type="button" class="am-secondary am-full" data-act="picker">' +
      svg('pin', 18) +
      ' Wybierz punkt na mapie</button>' +
      recordingLink()
    );
  }
  function list() {
    if (!position) return locationPanel();
    const description =
      origin === 'manual'
        ? '<button type="button" data-act="picker" class="am-text-btn am-change">Zmień punkt startowy</button>'
        : '';
    if (!nearest.length) {
      return (
        '<h2>Najbliższe AED</h2><p class="am-message" role="status">' +
        (catalogueError ? 'Nie udało się pobrać listy AED.' : 'Wczytuję urządzenia w okolicy…') +
        '</p>' +
        (catalogueError
          ? '<button class="am-primary" data-act="catalog">Spróbuj ponownie</button>'
          : '') +
        description
      );
    }
    return (
      '<div class="am-panel-head"><h2>Najbliższe AED</h2>' +
      (origin === 'manual' ? '<span class="am-origin">Wskazany start</span>' : '') +
      '</div>' +
      (locationNotice
        ? '<p class="am-message" role="status">' + esc(locationNotice) + '</p>'
        : '') +
      '<div class="am-rows">' +
      nearest
        .slice(0, listLimit)
        .map(
          ({ target: t, meters: m }) =>
            '<button type="button" class="am-row" data-act="select" data-val="' +
            esc(t.id) +
            '"><span class="am-rowicon">' +
            svg('heart', 23) +
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
        ? '<button type="button" class="am-text-btn" data-act="more">Więcej urządzeń ' +
          svg('chevron', 14) +
          '</button>'
        : '') +
      description
    );
  }
  function targetPhoto() {
    if (!selected || !position) return '';
    const photos = routePhotos(selected, position, position.heading);
    if (!photos.length) return '';
    const index = Math.min(photoIndex, photos.length - 1);
    const p = photos[index]!;
    return (
      '<figure class="am-photo"><img src="' +
      esc(p.src) +
      '" alt="' +
      esc(p.label) +
      '" loading="lazy"><figcaption><span>' +
      esc(p.label) +
      '</span><small><a href="' +
      esc(p.url) +
      '" target="_blank" rel="noopener">' +
      esc(p.credit) +
      '</a></small></figcaption>' +
      (photos.length > 1
        ? '<button type="button" data-act="photo" class="am-next-photo" aria-label="Następne zdjęcie">' +
          (index + 1) +
          ' / ' +
          photos.length +
          ' ' +
          svg('chevron', 14) +
          '</button>'
        : '') +
      '</figure>'
    );
  }
  function routeActions() {
    if (arrived)
      return (
        '<button type="button" class="am-primary" data-act="arrive">' +
        svg('heart') +
        ' Instrukcja AED</button>'
      );
    if (!route) {
      return routeError
        ? '<p class="am-message" role="status">Nie udało się wyznaczyć trasy pieszej.</p><button type="button" class="am-secondary am-full" data-act="retry">Ponów wyznaczanie trasy</button>'
        : '<p class="am-message" role="status">Wyznaczam trasę pieszą…</p>';
    }
    const hintId = 'am-call-note';
    const arAction =
      '<button type="button" class="am-primary" data-act="ar"' +
      (guiding ? '' : ' aria-describedby="' + hintId + '"') +
      '>' +
      svg('cam', 18) +
      (guiding ? ' Tryb AR' : '<span>Tryb AR<small>z wezwaniem pomocy</small></span>') +
      '</button>';
    if (guiding && view === 'directions') return arAction;
    const walking = view === 'directions';
    const hint = guiding
      ? ''
      : '<p id="' +
        hintId +
        '" class="am-call-note">' +
        (walking ? 'Po wybraniu „Prowadź i wezwij pomoc”' : 'Po włączeniu trybu AR') +
        ' masz 10 sekund na anulowanie. Potem otworzy się telefon z numerem alarmowym.</p>';
    return (
      hint +
      (walking
        ? '<button type="button" class="am-primary" data-act="guide" aria-describedby="' +
          hintId +
          '">' +
          svg('walk', 19) +
          ' Prowadź i wezwij pomoc</button>'
        : '<div class="am-actions">' +
          arAction +
          '<button type="button" class="am-secondary" data-act="directions">' +
          svg('list', 18) +
          ' Wskazówki dojścia</button></div>')
    );
  }
  function details() {
    if (!selected || !position) return '';
    const progress = route && routeProgress(route, position);
    const remaining = progress?.remaining ?? 0;
    const minutes =
      route &&
      Math.max(1, Math.round((route.duration * remaining) / Math.max(1, route.distance) / 60));
    const heading = arrived ? 'Jesteś przy celu' : selected.name;
    const stepList =
      view === 'directions' && route && progress
        ? '<ol class="am-steps">' +
          route.steps
            .map(
              (step, index) =>
                '<li' +
                (index === progress.index ? ' aria-current="step"' : '') +
                '><span class="am-step-number">' +
                (index + 1) +
                '</span><span>' +
                esc(stepText(step)) +
                '</span>' +
                (step.distance > 0 ? '<small>' + meters(step.distance) + '</small>' : '') +
                '</li>',
            )
            .join('') +
          '</ol>'
        : '';
    return (
      '<div class="am-panel-head"><h2>' +
      esc(heading) +
      '</h2></div>' +
      (route && !arrived
        ? '<div class="am-duration">' +
          svg('walk', 17) +
          '<strong>' +
          esc(minutes ?? 1) +
          ' min</strong><i></i>' +
          meters(remaining) +
          '</div>'
        : '') +
      (selected.address
        ? '<p class="am-address">' + svg('pin', 14) + esc(selected.address) + '</p>'
        : '') +
      (selected.description && selected.description !== selected.address
        ? '<p class="am-description">' + esc(selected.description) + '</p>'
        : '') +
      '<div class="am-badges">' +
      accessTag(selected) +
      (selected.hours ? '<span>' + esc(selected.hours) + '</span>' : '') +
      '</div>' +
      (locationNotice
        ? '<p role="status" class="am-message">' + esc(locationNotice) + '</p>'
        : '') +
      routeActions() +
      stepList +
      targetPhoto() +
      (view === 'directions'
        ? recordingLink() +
          '<p class="am-credit">Trasa piesza · <a href="https://routing.openstreetmap.de/about.html" rel="noopener" target="_blank">FOSSGIS / OpenStreetMap</a></p>'
        : '')
    );
  }
  function picker() {
    return (
      '<div class="am-panel-head"><h2>Wybierz punkt startowy</h2></div>' +
      '<form class="am-search" role="search"><input name="place" aria-label="Miejscowość lub adres" placeholder="Miejscowość lub adres" autocomplete="off" required><button type="submit" aria-label="Szukaj">' +
      svg('search') +
      '</button></form><div class="am-results" aria-live="polite"></div><p class="am-message">Wskaż miejsce na mapie lub przesuń znacznik na środek wybranego miejsca.</p>' +
      '<button type="button" class="am-primary" data-act="set-origin"' +
      (pickerConfirmed ? '' : ' disabled') +
      '>Rozpocznij stąd ' +
      svg('arrow', 16) +
      '</button>'
    );
  }
  function render() {
    $('.am-head h1').textContent =
      view === 'picker'
        ? 'Punkt startowy'
        : view === 'directions'
          ? 'Wskazówki dojścia'
          : 'Defibrylatory w pobliżu';
    $('.am-aim').hidden = view !== 'picker';
    panel.innerHTML = view === 'list' ? list() : view === 'picker' ? picker() : details();
  }
  function endGuidance() {
    if (!guiding) return;
    guiding = false;
    options.onEndGuidance?.();
  }
  function clearRoute() {
    request?.abort();
    request = null;
    routeLine?.remove();
    routeLine = null;
    route = null;
    routeError = false;
    endGuidance();
    arrived = false;
    driftCount = 0;
    photoIndex = 0;
  }
  function selectTarget(target: AedTarget) {
    if (!position || selected?.id === target.id) return;
    clearRoute();
    selected = target;
    view = 'destination';
    arrived = atTarget();
    updateMarkers();
    render();
    container.scrollIntoView({ block: 'start' });
    void navigate();
    void loadApproachPhotos(target).then((photos) => {
      if (!destroyed && selected === target && photos.length) render();
    });
  }
  function payload(): NavigationPayload | null {
    if (!selected || !position) return null;
    return {
      target: selected,
      position: { ...position },
      route,
      mode: origin,
      path: route?.coordinates.map(([lon, lat]) => ({ lat, lon })) ?? [],
    };
  }
  function atTarget() {
    return !!(
      origin === 'live' &&
      gpsStatus === 'ready' &&
      position &&
      selected &&
      distance(position, selected) <= 20 &&
      (position.accuracy ?? Infinity) <= 25
    );
  }
  async function navigate(reroute = false) {
    if (!selected || !position) return;
    request?.abort();
    const req = new AbortController();
    request = req;
    const timeout = setTimeout(() => req.abort(), 12000);
    routeError = false;
    lastRequest = Date.now();
    driftCount = 0;
    const target = selected;
    if (!reroute) render();
    try {
      const calculated = await walkingRoute(position, target, req.signal);
      if (destroyed || request !== req || selected !== target) return;
      route = calculated;
      arrived = atTarget();
      routeLine?.remove();
      routeLine = L.polyline(
        calculated.coordinates.map(([lon, lat]): L.LatLngTuple => [lat, lon]),
        { color: '#065bba', weight: 5, opacity: 0.95, lineCap: 'round' },
      ).addTo(map);
      if (!reroute)
        map.fitBounds(routeLine.getBounds().extend(latlng(position)).extend(latlng(target)), {
          padding: [26, 32],
          maxZoom: 18,
          animate: false,
        });
      const state = payload();
      if (state) options.onNavigate?.(state);
    } catch {
      if (destroyed || request !== req) return;
      routeLine?.remove();
      routeLine = null;
      route = null;
      routeError = true;
    } finally {
      clearTimeout(timeout);
      if (!destroyed && request === req) {
        request = null;
        render();
      }
    }
  }
  function updateNearest() {
    nearest = position ? nearby(points, position, 'all') : [];
    lastListAt = position;
    updateMarkers();
  }
  function setPosition(next: GeoPoint, recenter: boolean) {
    position = next;
    if (view === 'picker') view = 'list';
    if (view === 'list' && (!lastListAt || recenter || distance(lastListAt, next) > 10))
      updateNearest();
    else if (userMarker) userMarker.setLatLng(latlng(next));
    if (selected) {
      arrived = atTarget();
      if (route && !arrived && origin === 'live') {
        const deviation = routeProgress(route, next).offRoute;
        driftCount = deviation > Math.max(45, next.accuracy || 0) ? driftCount + 1 : 0;
        if (driftCount >= 2 && !request && Date.now() - lastRequest > 15000) void navigate(true);
      }
    }
    if (recenter && (!selected || guiding)) map.setView(latlng(next), 16, { animate: false });
    if (guiding && view === 'directions') map.panTo(latlng(next), { animate: false });
    render();
  }
  function stopGps() {
    gpsTicket++;
    if (watch !== null) navigator.geolocation?.clearWatch(watch);
    watch = null;
  }
  function gps() {
    stopGps();
    const ticket = gpsTicket;
    gpsStatus = 'waiting';
    arrived = false;
    locationNotice = '';
    if (!navigator.geolocation) {
      gpsStatus = 'error';
      locationNotice = 'Przeglądarka nie obsługuje lokalizacji.';
      render();
      return;
    }
    if (view === 'picker') showList();
    render();
    let first = true;
    watch = navigator.geolocation.watchPosition(
      (fix) => {
        if (destroyed || ticket !== gpsTicket || !active) return;
        const switching = origin === 'manual';
        if (switching) {
          clearRoute();
          selected = null;
          view = 'list';
        }
        origin = 'live';
        gpsStatus = 'ready';
        locationNotice =
          fix.coords.accuracy > 90
            ? 'Przybliżona lokalizacja GPS (± ' + meters(fix.coords.accuracy) + ').'
            : '';
        setPosition(
          {
            lat: fix.coords.latitude,
            lon: fix.coords.longitude,
            accuracy: fix.coords.accuracy,
            heading: fix.coords.heading,
          },
          first,
        );
        first = false;
      },
      (err) => {
        if (destroyed || ticket !== gpsTicket || !active) return;
        gpsStatus = 'error';
        arrived = false;
        locationNotice =
          err.code === 1
            ? 'Zezwól na lokalizację w ustawieniach przeglądarki lub wybierz punkt na mapie.'
            : 'GPS jest niedostępny. Spróbuj ponownie lub wybierz punkt na mapie.';
        if (position && origin === 'live') locationNotice += ' Widać ostatni odczyt.';
        render();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
    );
  }
  function showList() {
    clearRoute();
    selected = null;
    view = 'list';
    listLimit = 8;
    updateNearest();
    if (position) map.setView(latlng(position), 16, { animate: false });
    render();
  }
  function openPicker() {
    stopGps();
    searchRequest?.abort();
    searchRequest = null;
    searchResults = [];
    locationNotice = '';
    view = 'picker';
    pickerConfirmed = position !== null;
    updateMarkers();
    render();
  }
  function markPicker() {
    if (view !== 'picker') return;
    pickerConfirmed = true;
    const confirm = panel.querySelector<HTMLButtonElement>('[data-act="set-origin"]');
    if (confirm) confirm.disabled = false;
  }
  map.on('dragend', markPicker);
  map.on('click', (event: L.LeafletMouseEvent) => {
    if (view !== 'picker') return;
    map.setView(event.latlng, Math.max(16, map.getZoom()), { animate: false });
    markPicker();
  });
  async function searchPlace(form: HTMLFormElement) {
    const input = form.elements.namedItem('place');
    if (!(input instanceof HTMLInputElement) || !input.value.trim()) return;
    searchRequest?.abort();
    const current = new AbortController();
    searchRequest = current;
    const results = $('.am-results');
    results.textContent = 'Szukam miejsca…';
    const timeout = setTimeout(() => current.abort(), 8000);
    try {
      const places = await searchStartLocations(input.value.trim(), current.signal);
      if (destroyed || searchRequest !== current || view !== 'picker') return;
      searchResults = places;
      results.innerHTML = places.length
        ? places
            .map(
              (p, i) =>
                '<button type="button" class="am-place" data-act="place" data-val="' +
                i +
                '"><strong>' +
                esc(p.name) +
                '</strong><small>' +
                esc(p.detail) +
                '</small></button>',
            )
            .join('') + '<small>Źródło: GUS, Portal Geostatystyczny</small>'
        : 'Brak wyników. Dodaj numer budynku lub wskaż miejsce na mapie.';
    } catch {
      if (!destroyed && searchRequest === current && view === 'picker')
        results.textContent = 'Wyszukiwanie jest niedostępne. Możesz wskazać miejsce na mapie.';
    } finally {
      clearTimeout(timeout);
      if (searchRequest === current) searchRequest = null;
    }
  }
  function startGuidance(ar: boolean) {
    const state = payload();
    if (!route || !state) return;
    if (!guiding) {
      guiding = true;
      options.onStartGuidance?.(state);
    }
    if (ar) options.onOpenAR?.(state);
    else if (position) map.setView(latlng(position), 17, { animate: false });
    render();
  }
  function back() {
    if (view === 'list') options.onBack?.();
    else if (view === 'directions') {
      endGuidance();
      view = 'destination';
      render();
    } else {
      const abandonedPicker = view === 'picker';
      searchRequest?.abort();
      showList();
      if (abandonedPicker && active && origin === 'live' && gpsStatus !== 'error') gps();
    }
  }
  const click = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const button = e.target.closest<HTMLElement>('[data-act]');
    if (!button || !container.contains(button)) return;
    switch (button.dataset['act']) {
      case 'back':
        back();
        break;
      case 'gps':
        gps();
        break;
      case 'plus':
        map.zoomIn();
        break;
      case 'minus':
        map.zoomOut();
        break;
      case 'select': {
        const target = nearest.find((entry) => entry.target.id === button.dataset['val'])?.target;
        if (target) selectTarget(target);
        break;
      }
      case 'picker':
        openPicker();
        break;
      case 'place': {
        const found = searchResults[Number(button.dataset['val'])];
        if (found) {
          map.setView(latlng(found), 16, { animate: false });
          markPicker();
          $('.am-results').textContent = found.name;
        }
        break;
      }
      case 'set-origin': {
        const center = map.getCenter();
        clearRoute();
        origin = 'manual';
        selected = null;
        locationNotice = '';
        setPosition({ lat: center.lat, lon: center.lng }, true);
        break;
      }
      case 'more':
        listLimit += 12;
        render();
        break;
      case 'directions':
        view = 'directions';
        render();
        break;
      case 'guide':
        startGuidance(false);
        break;
      case 'ar':
        startGuidance(true);
        break;
      case 'arrive': {
        const state = payload();
        if (arrived && state) options.onArrive?.(state);
        break;
      }
      case 'photo': {
        if (!selected || !position) break;
        const count = routePhotos(selected, position, position.heading).length;
        if (count) photoIndex = (photoIndex + 1) % count;
        render();
        break;
      }
      case 'recording':
        options.onOpenRecording?.();
        break;
      case 'retry':
        if (!request) void navigate();
        break;
      case 'catalog':
        void load();
        break;
    }
  };
  const submit = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    event.preventDefault();
    void searchPlace(event.target);
  };
  container.addEventListener('click', click);
  container.addEventListener('submit', submit);
  async function load() {
    if (loadingData) return;
    loadingData = true;
    catalogueError = false;
    try {
      const items = await loadPoints();
      if (destroyed) return;
      points = items;
      updateNearest();
    } catch {
      if (!destroyed) catalogueError = true;
    } finally {
      loadingData = false;
      if (!destroyed && view !== 'picker') render();
    }
  }
  render();
  void load();
  if (active) gps();
  return {
    getState: () => ({
      position: position ? { ...position } : null,
      target: selected,
      mode: origin,
      route,
      path: route?.coordinates.map(([lon, lat]) => ({ lat, lon })) ?? [],
      view,
      nearest,
      usedFallback: false,
    }),
    setActive(next) {
      if (active === next || destroyed) return;
      active = next;
      if (!next) {
        stopGps();
        return;
      }
      map.invalidateSize({ pan: false });
      if (origin === 'live' && view !== 'picker') gps();
    },
    destroy() {
      destroyed = true;
      endGuidance();
      stopGps();
      request?.abort();
      searchRequest?.abort();
      container.removeEventListener('click', click);
      container.removeEventListener('submit', submit);
      resize.disconnect();
      map.remove();
      container.replaceChildren();
    },
  };
}
