var map = L.map('map').setView([17.385,78.486],13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

var socket = io();

var startMarker = L.marker([17.385,78.486],{draggable:true}).addTo(map);
var destMarker = null;

var routeLine = L.polyline([],{color:"red"}).addTo(map);

function syncLocation(){

navigator.geolocation.getCurrentPosition(function(pos){

var lat = pos.coords.latitude;
var lon = pos.coords.longitude;

startMarker.setLatLng([lat,lon]);

map.setView([lat,lon],15);

},{
enableHighAccuracy:true
});

}

function searchStart(){

var query=document.getElementById("startSearch").value;

fetch("https://nominatim.openstreetmap.org/search?format=json&q="+query)

.then(res=>res.json())

.then(data=>{

var lat=data[0].lat;
var lon=data[0].lon;

startMarker.setLatLng([lat,lon]);

map.setView([lat,lon],15);

});

}

function searchDestination(){

var query=document.getElementById("destSearch").value;

fetch("https://nominatim.openstreetmap.org/search?format=json&q="+query)

.then(res=>res.json())

.then(data=>{

var lat=data[0].lat;
var lon=data[0].lon;

if(destMarker){
map.removeLayer(destMarker);
}

destMarker=L.marker([lat,lon],{draggable:true}).addTo(map);

map.setView([lat,lon],15);

});

}

function startRoute(){

var start=startMarker.getLatLng();
var dest=destMarker.getLatLng();

fetch("/set_destination",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

start_lat:start.lat,
start_lon:start.lng,
dest_lat:dest.lat,
dest_lon:dest.lng

})

});

}

socket.on("route_update",function(data){

routeLine.setLatLngs(data);

});

setInterval(function(){

navigator.geolocation.getCurrentPosition(function(pos){

fetch("/gps",{

method:"POST",
headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

lat:pos.coords.latitude,
lon:pos.coords.longitude,
speed:pos.coords.speed || 0

})

});

});

},3000);
