from flask import Flask, render_template, request
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt
import route_engine
import traffic_engine
import route_checker

app = Flask(__name__)
socketio = SocketIO(app)

passenger_count = 0
bus_location = {"lat":17.385,"lon":78.486}
destination = None
route = []

# MQTT connection
def on_connect(client, userdata, flags, rc):
    client.subscribe("bus/BUS001/passenger")

def on_message(client, userdata, msg):
    global passenger_count
    passenger_count = int(msg.payload.decode())
    socketio.emit("passenger_update", passenger_count)

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect("localhost",1883,60)
mqtt_client.loop_start()

@app.route("/")
def passenger_page():
    return render_template("passenger.html")

@app.route("/driver")
def driver_page():
    return render_template("driver.html")

@app.route("/gps",methods=["POST"])
def gps():

    global bus_location,route,destination

    data=request.json

    bus_location["lat"]=data["lat"]
    bus_location["lon"]=data["lon"]

    traffic_engine.update_speed(data)

    socketio.emit("bus_location",bus_location)

    # CHECK ROUTE DEVIATION
    if destination and route:

        off = route_checker.off_route(bus_location,route)

        if off:

            print("Bus deviated from route. Recalculating...")

            route = route_engine.get_route(
                bus_location["lat"],
                bus_location["lon"],
                destination["lat"],
                destination["lon"]
            )

            socketio.emit("route_update",route)

    return "ok"

@app.route("/set_destination",methods=["POST"])
def set_destination():

    global route,destination

    data=request.json

    start_lat=data["start_lat"]
    start_lon=data["start_lon"]

    dest_lat=data["dest_lat"]
    dest_lon=data["dest_lon"]

    destination={
        "lat":dest_lat,
        "lon":dest_lon
    }

    route = route_engine.get_route(
        start_lat,
        start_lon,
        dest_lat,
        dest_lon
    )

    socketio.emit("route_update",route)

    return "ok"

if __name__=="__main__":
    socketio.run(app,host="0.0.0.0",port=5000)