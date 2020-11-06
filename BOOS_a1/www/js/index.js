var app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },

    // Bind Event Listeners
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    onDeviceReady: function () {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {

        //define the available base map tiles
        var lightbm = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }),
            darkbm = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            });

        // add geoJSON layer (restaurants from OSM) to map
        var restaurantIcon = L.icon({
            iconUrl: 'img/gastro.png',
            iconSize: [30, 30],
        });

        // set the initial map centre to Zurich near HB and define zoom level (=14)
        var map = L.map('map', {
            center: [47.377, 8.542],
            zoom: 14,
            layers: [lightbm]
        });


        // get popup (show restaurant's name) for each feature of geojson layer
        function onEachFeature(feature, layer) {
            // does this feature have a property named popupContent?
            if (feature.properties && feature.properties.name) {
                layer.bindPopup(feature.properties.name);
            }
        }

        // cluster the markers of the restaurant layer
        var markers = new L.markerClusterGroup({
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true
        });

        // create variable for restaurants and define custom marker
        var myrestaurants = L.geoJson(rest, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, {
                    icon: restaurantIcon
                });
            },
            onEachFeature: onEachFeature
        });

        // add markers to map
        markers.addLayer(myrestaurants);
        map.addLayer(markers);
        map.fitBounds(markers.getBounds());

        // define custom icon for current location of user
        var worldIcon = L.icon({
            iconUrl: 'img/world.png',
            iconSize: [30, 30], // size of the icon
            iconAnchor: [15, 15],
            popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

        // define variable for marker for user's location
        var marker = L.marker([47.377, 8.542], {
            icon: worldIcon
        }, {
            rotationAngle: 315.96
        });

        // define variable for circle with radius 100 below marker
        var circle = L.circle([47.377, 8.542], {
            radius: 100
        });


        // create basemap variable to store all the available basemaps
        var baseMaps = {
            "Day": lightbm,
            "Night": darkbm
        };

        // define layers on map
        var overlayMaps = {
            "Your Location": marker,
            "Circle": circle,
            "Restaurant": markers,
        }

        // add button to change the basemap and to turn off/ on layers
        L.control.layers(baseMaps, overlayMaps).addTo(map);


        // add custom marker and circle to map
        marker.addTo(map).bindPopup('You are here');
        circle.addTo(map);

        // add map scale to map
        var scale = L.control.scale();
        scale.addTo(map);


        // add legend to map
        var legend = L.control({
            position: 'topleft'
        });
        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend'),
                grades = [" Your Location", " Restaurant"],
                labels = ["img/world.png", "img/gastro.png"];

            div.innerHTML += "<h4>Legend</h4>";

            for (var i = 0; i < grades.length; i++) {
                div.innerHTML += (" <img src=" + labels[i] + " height='15' width='15'>") + grades[i] + '<br>';
            }


            return div;
        };

        legend.addTo(map);


        // onSuccess Callback: contains current GPS coordinates
        function onSuccess(position) {
            //get the current location
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            var accuracy = position.coords.accuracy;
            var curlatlng = L.latLng(lat, lon);

            // set map centre and marker to current location & add a circle to represent location accuracy
            map.panTo(curlatlng); // get current location
            marker.setLatLng(curlatlng); // sets map centre to current location
            marker.getPopup().setContent('You are here!').openPopup();
            circle.setRadius(accuracy).setLatLng(curlatlng);

            // if the current locaton is within 100 meters of Y25, vibrate the device
            var distance = curlatlng.distanceTo(markers); //gets distance from current location to entrance
            if (distance < 100) { //if distance is less than 100m, vibrate
                navigator.vibrate(1000); // vibrate for 1 second
            }
        }

        // onError Callback receives a PositionError object
        function onError(error) {
            //alert('code: '    + error.code    + '\n' + 'message: ' + error.message + '\n');
        }

        // getCurrentPosition will only get the positon once. watchPosition will run constantly to get the position if the device retrieves a new location
        /*
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          maximumAge: 3000, timeout: 30000, enableHighAccuracy: true }); //if true, mobile phone will give most accurate location. if false, GPS will not be used at all (only uses IP adress)
        */
        var watchID = navigator.geolocation.watchPosition(onSuccess, onError, {
            maximumAge: 6000,
            timeout: 30000,
            enableHighAccuracy: true
        }); //watch position: continuously tells me where I am

        // use compass to get orientation of device
        function onSuccessCompass(heading) { // identify orientation & rotate marker according to orientation
            marker.setRotationAngle(heading.magneticHeading);
        }

        function onErrorCompass(error) { //if not successful calling this function wait for 3s
            //alert('CompassError: ' + error.code);
        }

        // get the orientation of the device, in every 3s
        navigator.compass.watchHeading(onSuccessCompass, onErrorCompass, {
            frequency: 3000
        });


        // Add "Take a picture" button in the map view
        var pictureControl = L.Control.extend({
            options: {
                position: 'bottomright'
            },

            onAdd: function (map) {
                var container = L.DomUtil.create('button');
                container.style.backgroundColor = 'white';
                container.style.width = '120px';
                container.style.height = '30px';
                container.textContent = "Take a picture";

                container.onclick = function () { //onclick: when people click this button
                    if (!navigator.camera) {
                        alert("Camera API not supported", "Error");
                        return;
                    }
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: 1, // source =  camera
                        encodingType: 0 // 0=JPG
                    };

                    navigator.camera.getPicture( // mobile phone opens camera
                        function (imgData) {
                            var popup = L.popup(); // show the image as popup
                            popup.setLatLng(map.getCenter())
                                .setContent('<img id="capturepicture" height="200" width="200">')
                                .openOn(map);
                            document.getElementById("capturepicture").setAttribute("src", "data:image/jpeg;base64," + imgData);
                        },
                        function () {
                            alert('Error taking picture', 'Error');
                        },
                        options
                    );
                };

                return container;
            }
        });
        map.addControl(new pictureControl());

    }
};
