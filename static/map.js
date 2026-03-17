var map = L.map('map').setView([17.385, 78.486], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

var socket = io();
var passengerLocationMarker = null;

var busIcon = L.icon({
  iconUrl: '/static/bus_icon.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

var busMarker = L.marker([17.385, 78.486], { icon: busIcon }).addTo(map);
var routeLine = L.polyline([], { color: 'blue' }).addTo(map);
var stopMarkers = [];
var heatLayers = [];

fetch('/state').then(r => r.json()).then(function (data) {
  if (data.route) routeLine.setLatLngs(data.route);
  if (data.stops) renderStops(data.stops);
  if (data.eta) renderEta(data.eta);
  if (data.traffic) renderHeatmap(data.traffic);
  if (data.bus_location) busMarker.setLatLng([data.bus_location.lat, data.bus_location.lon]);
  document.getElementById('count').innerHTML = data.passenger_count || 0;
});

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (pos) {
    passengerLocationMarker = L.circleMarker([pos.coords.latitude, pos.coords.longitude], { color: '#2e7d32', radius: 7 }).addTo(map).bindPopup('Your location');
  });
}

socket.on('passenger_update', function (data) {
  document.getElementById('count').innerHTML = data;
});

socket.on('occupancy_update', function (data) {
  document.getElementById('seats').innerHTML = data.seats_left;
  document.getElementById('occupancy').innerHTML = data.occupancy_pct + '%';
});

socket.on('route_update', function (data) { routeLine.setLatLngs(data || []); });
socket.on('stops_update', function (data) { renderStops(data || []); });
socket.on('eta_update', function (data) { renderEta(data || []); });
socket.on('traffic_heatmap', function (data) { renderHeatmap(data || []); });

socket.on('bus_location', function (data) {
  animateBus(data.lat, data.lon);
});

function renderStops(stops) {
  stopMarkers.forEach(m => map.removeLayer(m));
  stopMarkers = stops.map(s => L.marker([s.lat, s.lon]).addTo(map).bindPopup(s.name || 'Stop'));
}

function renderEta(items) {
  var html = '';
  items.forEach(function (item) {
    html += '<li>' + item.name + ': ETA ' + item.eta_min + ' min, wait ' + item.waiting_min + ' min</li>';
  });
  document.getElementById('etaList').innerHTML = html;
}

function renderHeatmap(points) {
  heatLayers.forEach(layer => map.removeLayer(layer));
  heatLayers = points.map(function (p) {
    var color = p.intensity > 0.6 ? '#e53935' : '#ffb300';
    return L.circle([p.lat, p.lon], {
      radius: 120,
      color: color,
      fillColor: color,
      fillOpacity: 0.2,
      weight: 1
    }).addTo(map);
  });
}

function animateBus(newLat, newLon) {
  var start = busMarker.getLatLng();
  var steps = 20;
  var latStep = (newLat - start.lat) / steps;
  var lonStep = (newLon - start.lng) / steps;
  var i = 0;

  var interval = setInterval(function () {
    var lat = start.lat + latStep * i;
    var lon = start.lng + lonStep * i;
    busMarker.setLatLng([lat, lon]);
    i++;
    if (i > steps) clearInterval(interval);
  }, 100);
}
