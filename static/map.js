var map = L.map('map').setView([17.385,78.486],13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

var socket = io();

var busIcon = L.icon({
iconUrl:'/static/bus_icon.png',
iconSize:[40,40],
iconAnchor:[20,20]
});

var busMarker = L.marker([17.385,78.486],{icon:busIcon}).addTo(map);

var routeLine = L.polyline([],{color:"blue"}).addTo(map);

socket.on("passenger_update",function(data){
document.getElementById("count").innerHTML=data;
});

socket.on("route_update",function(data){
routeLine.setLatLngs(data);
});

socket.on("bus_location",function(data){

animateBus(data.lat,data.lon);

});

function animateBus(newLat,newLon){

var start = busMarker.getLatLng();

var steps = 20;

var latStep = (newLat - start.lat)/steps;
var lonStep = (newLon - start.lng)/steps;

var i=0;

var interval = setInterval(function(){

var lat = start.lat + latStep*i;
var lon = start.lng + lonStep*i;

busMarker.setLatLng([lat,lon]);

i++;

if(i>steps){
clearInterval(interval);
}

},100);

}