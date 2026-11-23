import { useEffect, useMemo, useRef, useState } from "react";
import { CONTACT_COORDS, buildMapEmbedSrc, buildMapHref } from "../../pages/homePageUtils.js";
import "./PracticeMap.css";

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";
let yandexMapsLoadPromise;

function validCoordinates(latitude, longitude) {
  return latitude !== null && latitude !== undefined && latitude !== ""
    && longitude !== null && longitude !== undefined && longitude !== ""
    && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    && Number(latitude) >= -90 && Number(latitude) <= 90
    && Number(longitude) >= -180 && Number(longitude) <= 180;
}

function formatCoordinates(latitude, longitude) {
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

function escapeMapHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function practiceDetailHref(practice) {
  return `/praktiki/${encodeURIComponent(practice.slug || practice.id)}/`;
}

function getPracticeBalloonBody(practice) {
  const application = practice.application_data || {};
  const address = practice.address || [
    application.postal_code,
    application.street,
    application.house_number && `д. ${application.house_number}`,
    application.building && `корп. ${application.building}`,
  ].filter(Boolean).join(", ");
  const summary = String(practice.summary || "").trim();
  const briefSummary = summary.length > 200 ? `${summary.slice(0, 197).trimEnd()}…` : summary;
  const details = [
    practice.organization && `ОУ: ${practice.organization}`,
    address && `Адрес: ${address}`,
    practice.municipality && `Территория: ${practice.municipality}`,
    practice.topic && `Направление: ${practice.topic}`,
    practice.level && `Уровень: ${practice.level}`,
    briefSummary && `Описание: ${briefSummary}`,
  ].filter(Boolean).map(escapeMapHtml);
  const detailLink = `<a href="${escapeMapHtml(practiceDetailHref(practice))}">Подробнее о практике</a>`;
  return [...details, detailLink].join("<br />");
}

function getSearchHref(query, latitude, longitude) {
  if (validCoordinates(latitude, longitude)) return buildMapHref({ lat: Number(latitude), lon: Number(longitude) });
  const text = String(query || "Иркутск").trim();
  return `https://yandex.ru/maps/?text=${encodeURIComponent(text)}`;
}

function loadYandexMaps() {
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (!YANDEX_MAPS_API_KEY) return Promise.reject(new Error("YANDEX_MAPS_KEY_MISSING"));
  if (yandexMapsLoadPromise) return yandexMapsLoadPromise;

  yandexMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps ? resolve(window.ymaps) : reject(new Error("YANDEX_MAPS_UNAVAILABLE"));
    script.onerror = () => reject(new Error("YANDEX_MAPS_LOAD_FAILED"));
    document.head.appendChild(script);
  }).catch((error) => {
    yandexMapsLoadPromise = null;
    throw error;
  });

  return yandexMapsLoadPromise;
}

export function PracticeLocationPicker({ latitude, longitude, onChange, query = "", label = "Точка реализации" }) {
  const hasLocation = validCoordinates(latitude, longitude);
  const [latitudeInput, setLatitudeInput] = useState(hasLocation ? String(latitude) : "");
  const [longitudeInput, setLongitudeInput] = useState(hasLocation ? String(longitude) : "");
  const [mapStatus, setMapStatus] = useState(YANDEX_MAPS_API_KEY ? "loading" : "missing-key");
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const placemarkRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const mapSrc = buildMapEmbedSrc(hasLocation
    ? { lat: Number(latitude), lon: Number(longitude) }
    : CONTACT_COORDS);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) return undefined;
    let active = true;
    let map;

    loadYandexMaps()
      .then((ymaps) => new Promise((resolve) => ymaps.ready(() => resolve(ymaps))))
      .then((ymaps) => {
        if (!active || !mapElementRef.current) return;
        const initialCenter = hasLocation
          ? [Number(latitude), Number(longitude)]
          : [CONTACT_COORDS.lat, CONTACT_COORDS.lon];
        map = new ymaps.Map(mapElementRef.current, {
          center: initialCenter,
          zoom: hasLocation ? 15 : 11,
          controls: ["zoomControl", "fullscreenControl"],
        });
        mapRef.current = map;

        const publishCoordinates = (coordinates) => {
          const [nextLatitude, nextLongitude] = coordinates;
          onChangeRef.current?.({ latitude: nextLatitude, longitude: nextLongitude });
          setLatitudeInput(String(nextLatitude));
          setLongitudeInput(String(nextLongitude));
        };

        const setMarker = (coordinates, caption = "Практика") => {
          if (!placemarkRef.current) {
            placemarkRef.current = new ymaps.Placemark(coordinates, { iconCaption: caption }, {
              preset: "islands#blueDotIcon",
              draggable: true,
            });
            placemarkRef.current.events.add("dragend", (event) => {
              publishCoordinates(event.get("target").geometry.getCoordinates());
            });
            mapRef.current?.geoObjects.add(placemarkRef.current);
          } else {
            placemarkRef.current.geometry.setCoordinates(coordinates);
            placemarkRef.current.properties.set("iconCaption", caption);
          }
          mapRef.current?.setCenter(coordinates, 16, { checkZoomRange: true });
          publishCoordinates(coordinates);
        };

        if (hasLocation) setMarker(initialCenter);

        map.events.add("click", (event) => {
          setMarker(event.get("coords"));
        });

        setMapStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setMapStatus(error.message === "YANDEX_MAPS_KEY_MISSING" ? "missing-key" : "error");
      });

    return () => {
      active = false;
      map?.destroy?.();
      if (mapRef.current === map) mapRef.current = null;
      placemarkRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !hasLocation) return;
    const coordinates = [Number(latitude), Number(longitude)];
    if (placemarkRef.current) placemarkRef.current.geometry.setCoordinates(coordinates);
  }, [latitude, longitude, hasLocation]);

  function updateCoordinates(axis, value) {
    const nextLatitude = axis === "latitude" ? value : latitudeInput;
    const nextLongitude = axis === "longitude" ? value : longitudeInput;
    setLatitudeInput(nextLatitude);
    setLongitudeInput(nextLongitude);
    if (validCoordinates(nextLatitude, nextLongitude)) {
      onChange?.({ latitude: Number(nextLatitude), longitude: Number(nextLongitude) });
    } else if (!nextLatitude && !nextLongitude) {
      onChange?.({ latitude: null, longitude: null });
    }
  }

  return (
    <section className="practice-map-picker" aria-label={label}>
      <div className="practice-map-picker-heading">
        <strong>{label}</strong>
        <span>{hasLocation ? formatCoordinates(latitude, longitude) : "Место пока не указано"}</span>
      </div>
      {YANDEX_MAPS_API_KEY ? (
        <>
          <div className="practice-map-picker-hint" role="status">
            {mapStatus === "loading" && "Загружаем карту…"}
            {mapStatus === "error" && "Не удалось загрузить карту. Проверьте ключ Яндекс.Карт и разрешённые домены."}
            {mapStatus === "ready" && (hasLocation ? "Щёлкните по карте или передвиньте метку, чтобы уточнить место." : "Щёлкните по карте, чтобы поставить метку места проведения.")}
          </div>
          <div className="practice-map-frame practice-map-picker-frame">
            {mapStatus !== "error" && <div className="practice-map-interactive" ref={mapElementRef} aria-label="Интерактивная карта места проведения" />}
            {mapStatus === "error" && <iframe src={mapSrc} title="Яндекс.Карта места реализации практики" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
          </div>
          {hasLocation && <a className="practice-map-open-link" href={getSearchHref(query, latitude, longitude)} target="_blank" rel="noreferrer">Открыть выбранную точку в Яндекс.Картах</a>}
        </>
      ) : (
        <>
          <div className="practice-map-picker-hint" role="status">Интерактивная карта доступна после настройки ключа JavaScript API Яндекс.Карт. Пока можно указать координаты вручную.</div>
          <div className="practice-map-frame practice-map-picker-frame">
            <iframe src={mapSrc} title="Яндекс.Карта места реализации практики" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          <div className="practice-map-picker-actions">
            <a href={getSearchHref(query, latitude, longitude)} target="_blank" rel="noreferrer">Открыть в Яндекс.Картах</a>
            <span>Можно указать координаты вручную.</span>
          </div>
          <div className="practice-map-coordinates">
            <label>
              <span>Широта</span>
              <input type="number" min="-90" max="90" step="0.000001" value={latitudeInput} onChange={(event) => updateCoordinates("latitude", event.target.value)} placeholder="52.281732" />
            </label>
            <label>
              <span>Долгота</span>
              <input type="number" min="-180" max="180" step="0.000001" value={longitudeInput} onChange={(event) => updateCoordinates("longitude", event.target.value)} placeholder="104.280948" />
            </label>
          </div>
        </>
      )}
      {(latitudeInput || longitudeInput) && (
        <button className="practice-location-clear" type="button" onClick={() => {
          if (placemarkRef.current) mapRef.current?.geoObjects.remove(placemarkRef.current);
          placemarkRef.current = null;
          setLatitudeInput("");
          setLongitudeInput("");
          onChange?.({ latitude: null, longitude: null });
        }}>
          Очистить координаты
        </button>
      )}
    </section>
  );
}

export function PracticeLocationsMap({ items = [], compact = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mapStatus, setMapStatus] = useState(YANDEX_MAPS_API_KEY ? "loading" : "missing-key");
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());
  const locatedItems = useMemo(
    () => items.filter((item) => validCoordinates(item.latitude, item.longitude)),
    [items],
  );
  const selectedPractice = locatedItems.find((item) => String(item.id) === String(selectedId)) || locatedItems[0] || null;
  const center = selectedPractice
    ? { lat: Number(selectedPractice.latitude), lon: Number(selectedPractice.longitude) }
    : CONTACT_COORDS;
  const mapSrc = buildMapEmbedSrc(center);
  const mapHref = buildMapHref(center);

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY || !locatedItems.length) {
      setMapStatus(YANDEX_MAPS_API_KEY ? "empty" : "missing-key");
      return undefined;
    }

    let active = true;
    let map;
    let clusterer;

    loadYandexMaps()
      .then((ymaps) => new Promise((resolve) => ymaps.ready(() => resolve(ymaps))))
      .then((ymaps) => {
        if (!active || !mapElementRef.current) return;
        map = new ymaps.Map(mapElementRef.current, {
          center: center.lat && center.lon ? [center.lat, center.lon] : [CONTACT_COORDS.lat, CONTACT_COORDS.lon],
          zoom: locatedItems.length === 1 ? 13 : 5,
          controls: ["zoomControl", "fullscreenControl"],
        });
        mapRef.current = map;
        clusterer = new ymaps.Clusterer({ groupByCoordinates: false });
        const markers = locatedItems.map((practice) => {
          const coordinates = [Number(practice.latitude), Number(practice.longitude)];
          const placemark = new ymaps.Placemark(coordinates, {
            practiceId: String(practice.id),
            hintContent: escapeMapHtml(practice.title),
            balloonContentHeader: escapeMapHtml(practice.title),
            balloonContentBody: getPracticeBalloonBody(practice),
          }, {
            preset: String(practice.id) === String(selectedPractice?.id) ? "islands#redIcon" : "islands#blueIcon",
          });
          placemark.events.add("click", () => {
            setSelectedId(practice.id);
            map.setCenter(coordinates, 14, { checkZoomRange: true });
          });
          markerRefs.current.set(String(practice.id), placemark);
          return placemark;
        });
        clusterer.add(markers);
        map.geoObjects.add(clusterer);

        const points = locatedItems.map((practice) => [Number(practice.latitude), Number(practice.longitude)]);
        if (points.length > 1) {
          const latitudes = points.map(([lat]) => lat);
          const longitudes = points.map(([, lon]) => lon);
          const bounds = [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]];
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 36 });
        } else {
          map.setCenter(points[0], 13);
        }
        setMapStatus("ready");
      })
      .catch(() => {
        if (active) setMapStatus("error");
      });

    return () => {
      active = false;
      clusterer?.removeAll?.();
      map?.destroy?.();
      if (mapRef.current === map) mapRef.current = null;
      markerRefs.current.clear();
    };
  }, [locatedItems]);

  useEffect(() => {
    if (!selectedPractice) return;
    markerRefs.current.forEach((marker, id) => {
      marker.options.set("preset", id === String(selectedPractice.id) ? "islands#redIcon" : "islands#blueIcon");
    });
    if (mapRef.current && selectedId !== null) {
      mapRef.current.setCenter([Number(selectedPractice.latitude), Number(selectedPractice.longitude)], 14, { checkZoomRange: true });
    }
  }, [selectedId, selectedPractice]);

  return (
    <div className="practice-map-view">
      <div className={`practice-map-frame ${compact ? "practice-map-compact" : "practice-map-public"}`}>
        {YANDEX_MAPS_API_KEY && mapStatus !== "error" && locatedItems.length > 0 && (
          <div className="practice-map-interactive-container">
            <div className="practice-map-interactive" ref={mapElementRef} aria-label="Карта всех опубликованных практик" />
            {mapStatus === "loading" && <div className="practice-map-placeholder" role="status">Загружаем карту практик…</div>}
          </div>
        )}
        {mapStatus === "empty" && <div className="practice-map-placeholder" role="status">Для карты пока нет практик с координатами.</div>}
        {(mapStatus === "missing-key" || mapStatus === "error") && (
          <iframe src={mapSrc} title={selectedPractice ? `Яндекс.Карта: ${selectedPractice.title}` : "Яндекс.Карта практик"} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        )}
      </div>
      {mapStatus === "missing-key" && !compact && <p className="practice-map-notice">Чтобы показывать все маркеры, настройте `VITE_YANDEX_MAPS_API_KEY` для этой сборки сайта.</p>}
      {mapStatus === "error" && !compact && <p className="practice-map-notice" role="alert">Интерактивная карта не загрузилась. Проверьте ключ и разрешённые для него адреса сайта.</p>}
      {selectedPractice && <a className="practice-map-open-link" href={mapHref} target="_blank" rel="noreferrer">Открыть выбранную точку в Яндекс.Картах</a>}
      {!compact && locatedItems.length > 0 && (
        <div className="practice-map-locations" aria-label="Практики на карте">
          {locatedItems.map((practice) => (
            <button
              className={selectedPractice?.id === practice.id ? "is-selected" : ""}
              key={practice.id}
              onClick={() => {
                setSelectedId(practice.id);
                mapRef.current?.setCenter([Number(practice.latitude), Number(practice.longitude)], 14, { checkZoomRange: true });
              }}
              type="button"
            >
              <span><strong>{practice.title}</strong><span>{practice.municipality || practice.organization}</span></span>
              <small>{practice.topic}</small>
            </button>
          ))}
        </div>
      )}
      {compact && selectedPractice && <p className="practice-map-place-label">{selectedPractice.municipality || selectedPractice.organization}</p>}
    </div>
  );
}
