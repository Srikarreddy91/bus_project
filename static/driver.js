var map = L.map('map').setView([17.385, 78.486], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

var socket = io();

var startMarker = L.circleMarker([17.385, 78.486], { color: 'blue', radius: 8 }).addTo(map);
var destMarker = null;
var routeLine = L.polyline([], { color: 'red' }).addTo(map);
var stopMarkers = [];
var stops = [];

fetch('/state').then(r => r.json()).then(initFromState);

function initFromState(data) {
  if (data.bus_location) {
    startMarker.setLatLng([data.bus_location.lat, data.bus_location.lon]);
  }
  if (data.destination) {
    setDestinationMarker(data.destination.lat, data.destination.lon);
  }
  if (data.route) {
    routeLine.setLatLngs(data.route);
  }
  if (data.stops) {
    renderStops(data.stops);
  }
}

function setGpsStatus(text) {
  document.getElementById('gpsStatus').innerText = 'GPS: ' + text;
}

function postGps(lat, lon, speed) {
  return fetch('/gps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: lat, lon: lon, speed: speed || 0 })
  });
}

function fallbackSyncFromMarker(reason, isManual) {
  var marker = startMarker.getLatLng();
  postGps(marker.lat, marker.lng, 0);
  if (isManual) {
    setGpsStatus('manual sync used map marker (' + reason + ')');
  } else {
    setGpsStatus('live sync fallback (' + reason + ')');
  }
}

function syncLocation(isManual) {
  if (!navigator.geolocation) {
    fallbackSyncFromMarker('geolocation not supported', isManual);
    return;
  }

  setGpsStatus('requesting location...');
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;

    startMarker.setLatLng([lat, lon]);
    map.setView([lat, lon], 15);

    postGps(lat, lon, pos.coords.speed);

    setGpsStatus(isManual ? 'manual sync complete' : 'live sync');
  }, function (err) {
    var reason = (err && err.message) ? err.message : 'location unavailable';
    fallbackSyncFromMarker(reason, isManual);
  }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 });
}

function searchStart() {
  var query = document.getElementById('startSearch').value;
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query))
    .then(res => res.json())
    .then(data => {
      if (!data.length) return;
      var lat = parseFloat(data[0].lat);
      var lon = parseFloat(data[0].lon);
      startMarker.setLatLng([lat, lon]);
      map.setView([lat, lon], 15);
    });
}

function setDestinationMarker(lat, lon) {
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.circleMarker([lat, lon], { color: 'red', radius: 8 }).addTo(map);
}

function searchDestination() {
  var query = document.getElementById('destSearch').value;
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query))
    .then(res => res.json())
    .then(data => {
      if (!data.length) return;
      var lat = parseFloat(data[0].lat);
      var lon = parseFloat(data[0].lon);
      setDestinationMarker(lat, lon);
      map.setView([lat, lon], 15);
    });
}

function startRoute() {
  if (!destMarker) return;
  var start = startMarker.getLatLng();
  var dest = destMarker.getLatLng();

  fetch('/set_destination', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_lat: start.lat,
      start_lon: start.lng,
      dest_lat: dest.lat,
      dest_lon: dest.lng
    })
  });
}

function recalculateRoute() {
  fetch('/recalculate_route', { method: 'POST' });
}

function renderStops(newStops) {
  stops = newStops;
  stopMarkers.forEach(m => map.removeLayer(m));
  stopMarkers = stops.map((s, idx) => {
    return L.marker([s.lat, s.lon]).addTo(map).bindPopup((s.name || 'Stop') + ' #' + (idx + 1));
  });
}

function pushStops() {
  fetch('/stops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stops: stops })
  });
}

map.on('click', function (e) {
  var stop = {
    lat: e.latlng.lat,
    lon: e.latlng.lng,
    name: 'Stop ' + (stops.length + 1)
  };
  stops.push(stop);
  renderStops(stops);
  pushStops();
});

socket.on('route_update', function (data) { routeLine.setLatLngs(data || []); });
socket.on('stops_update', function (data) { renderStops(data || []); });

setInterval(function () { syncLocation(false); }, 4000);
syncLocation(false);
