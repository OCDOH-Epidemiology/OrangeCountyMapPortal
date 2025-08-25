document.addEventListener("DOMContentLoaded", function () {
    // Mapbox access token
    mapboxgl.accessToken =
        "pk.eyJ1IjoiZGNyYW5kZWxsIiwiYSI6ImNsdWs2bmF2ZTBuOWYycG51dzZuMTloNHkifQ.k9Jy_jqxEDlu0Um7_3YusA";

    // Initialize map
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [-74.3118, 41.3919],
        zoom: 10,
        scrollZoom: true,
    });

    // Add controls
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
        }),
        "top-left"
    );

    const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
    });
    map.addControl(geolocateControl);

    // Marker arrays
    const naloxMarkers = [];
    const opppMarkers = [];
    const ocLocationMarkers = [];

    // Popup content logic
    function createPopupHTML(feature) {
        const isOPPP = feature.properties.location_type === "OPPP";

        let html = `
            <div class="modern-popup">
                <div class="popup-header">
                    <div class="popup-icon">
                        <lord-icon src="https://cdn.lordicon.com/${isOPPP ? 'daeumrty' : 'bpmglzll'}.json" 
                                  trigger="loop" 
                                  colors="primary:${isOPPP ? '#f9c9c0' : '#e83a30'}"
                                  style="width:24px;height:24px"></lord-icon>
                    </div>
                    <div class="popup-title">
                        <h3>${feature.properties.name}</h3>
                        <span class="popup-type">${isOPPP ? 'OPPP Location' : 'Narcan Distribution'}</span>
                    </div>
                </div>
                
                <div class="popup-content">
                    <div class="info-section">
                        <div class="info-item">
                            <div class="info-icon">📍</div>
                            <div class="info-text">
                                <label>Address</label>
                                <p>${feature.properties.address}</p>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-icon">🕒</div>
                            <div class="info-text">
                                <label>Hours</label>
                                <p>${feature.properties.hours}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="popup-actions">
                        <button class="action-btn directions-btn" onclick="getDirections([${feature.geometry.coordinates}], '${feature.properties.address}')">
                            <span class="btn-icon">🚗</span>
                            <span class="btn-text">Get Directions</span>
                        </button>
                    </div>
        `;

        if (!isOPPP) {
            html += `
                    <div class="info-section">
                        <div class="info-item">
                            <div class="info-icon">💊</div>
                            <div class="info-text">
                                <label>Narcan Location</label>
                                <p>${feature.properties.narcanlocation}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="popup-actions">
                        <button class="action-btn restock-btn" onclick="reportOutOfStock('${feature.properties.name}')">
                            <span class="btn-icon">⚠️</span>
                            <span class="btn-text">Report Out of Stock</span>
                        </button>
                    </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Popup content for Orange County locations
    function createOCLocationPopupHTML(feature) {
        const locationType = feature.properties.location_type;
        let typeIcon, typeColor;
        
        switch(locationType) {
            case "Adult Care Facility":
                typeIcon = "🏥";
                typeColor = "#16c72e";
                break;
            case "Nursing Home":
                typeIcon = "🏠";
                typeColor = "#e83a30";
                break;
            case "Hospital":
                typeIcon = "🏨";
                typeColor = "#3080e8";
                break;
            default:
                typeIcon = "📍";
                typeColor = "#9E9E9E";
        }

        return `
            <div class="modern-popup">
                <div class="popup-header">
                    <div class="popup-icon" style="background-color: ${typeColor}20;">
                        <span class="type-icon">${typeIcon}</span>
                    </div>
                    <div class="popup-title">
                        <h3>${feature.properties.name}</h3>
                        <span class="popup-type" style="color: ${typeColor};">${locationType}</span>
                    </div>
                </div>
                
                <div class="popup-content">
                    <div class="info-section">
                        <div class="info-item">
                            <div class="info-icon">📍</div>
                            <div class="info-text">
                                <label>Address</label>
                                <p>${feature.properties.address}</p>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <div class="info-icon">🕒</div>
                            <div class="info-text">
                                <label>Hours</label>
                                <p>${feature.properties.hours || 'Contact facility for hours'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="popup-actions">
                        <button class="action-btn directions-btn" onclick="getDirections([${feature.geometry.coordinates}], '${feature.properties.address}')">
                            <span class="btn-icon">🚗</span>
                            <span class="btn-text">Get Directions</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Marker creation
    function createLordiconMarker(isOPPP) {
        const el = document.createElement("div");
        el.className = "marker";
        el.innerHTML = isOPPP
            ? `<lord-icon src="https://cdn.lordicon.com/daeumrty.json" trigger="hover"
                 state="hover-wave"
                 colors="primary:#f9c9c0,secondary:#ebe6ef,tertiary:#000000,quaternary:#b26836"
                 style="width:40px;height:40px"></lord-icon>`
            : `<lord-icon src="https://cdn.lordicon.com/bpmglzll.json" trigger="hover"
                 colors="primary:#e83a30"
                 style="width:40px;height:40px"></lord-icon>`;
        return el;
    }

    // Marker creation for Orange County locations
    function createOCLocationMarker(locationType) {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "30px";
        el.style.height = "30px";
        el.style.cursor = "pointer";
        
        let iconSrc, colors;
        switch(locationType) {
            case "Adult Care Facility":
                iconSrc = "https://cdn.lordicon.com/bpmglzll.json";
                colors = "primary:#16c72e";
                trigger="hover";
                state="hover-jump-roll";
                break;
            case "Nursing Home":
                iconSrc = "https://cdn.lordicon.com/bpmglzll.json";
                colors = "primary:#e83a30";
                trigger="hover";
                state="hover-jump-roll";
                break;
            case "Hospital":
                iconSrc = "https://cdn.lordicon.com/bpmglzll.json";
                colors = "primary:#3080e8";
                trigger="hover";
                state="hover-jump-roll";
                break;
            default:
                iconSrc = "https://cdn.lordicon.com/bpmglzll.json";
                colors = "primary:#9E9E9E";
                trigger="hover";
                state="hover-jump-roll";
        }
        
        // Create the Lordicon element with proper attributes
        el.innerHTML = `<lord-icon src="${iconSrc}" trigger="hover" colors="${colors}" style="width:30px;height:30px"></lord-icon>`;
        
        // Wait for Lordicon to load and ensure it's visible
        setTimeout(() => {
            const lordIcon = el.querySelector('lord-icon');
            if (lordIcon) {
                lordIcon.style.display = 'block';
                console.log(`Created marker for ${locationType} with icon: ${iconSrc}`);
            }
        }, 100);
        
        return el;
    }

    // Orange County Boundary
    map.on("load", () => {
        map.addSource("orange-county-border", {
            type: "geojson",
            data: "Orange_County_Border.geojson",
        });

        map.addLayer({
            id: "orange-county-border-layer",
            type: "line",
            source: "orange-county-border",
            paint: {
                "line-color": "#808080",
                "line-width": 2,
            },
        });

        map.addLayer({
            id: "orange-county-border-fill",
            type: "fill",
            source: "orange-county-border",
            paint: {
                "fill-color": "#FF0000",
                "fill-opacity": 0.05,
            },
        });

        // Load Orange County Locations GeoJSON after map is loaded
        console.log("Starting to load Orange County locations...");
        fetch("Orange_County_Locations.geojson")
            .then((res) => {
                console.log("Fetch response status:", res.status);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                console.log("GeoJSON data loaded:", data);
                console.log("Number of features:", data.features.length);
                
                data.features.forEach((feature, index) => {
                    console.log(`Processing feature ${index}:`, feature.properties.name, feature.geometry.coordinates);
                    
                    const marker = new mapboxgl.Marker(createOCLocationMarker(feature.properties.location_type))
                        .setLngLat(feature.geometry.coordinates)
                        .setPopup(new mapboxgl.Popup({ 
                            offset: 25, 
                            closeButton: false, 
                            maxWidth: "600px"
                        }).setHTML(createOCLocationPopupHTML(feature)))
                        .addTo(map);

                    ocLocationMarkers.push(marker);
                    console.log(`Marker ${index} added to map`);
                });
                
                console.log("Total markers created:", ocLocationMarkers.length);
                updateMarkers();
            })
            .catch(error => {
                console.error("Error loading Orange County locations:", error);
                alert("Error loading locations: " + error.message);
            });
    });

    // Marker visibility toggle function
    function updateMarkers() {
        const showOCLocations = document.getElementById("oc-locations-checkbox").checked;
        console.log("Updating markers visibility. Show locations:", showOCLocations);
        console.log("Total markers in array:", ocLocationMarkers.length);

        ocLocationMarkers.forEach((marker, index) => {
            const display = showOCLocations ? "block" : "none";
            marker.getElement().style.display = display;
            console.log(`Marker ${index} display set to:`, display);
        });
    }

    document.getElementById("oc-locations-checkbox").onchange = updateMarkers;

    // Global functions for directions and restock
    window.getDirections = function (destination, address) {
        geolocateControl.once("geolocate", (e) => {
            const startPoint = { lat: e.coords.latitude, lng: e.coords.longitude };
            const url = `https://www.google.com/maps/dir/?api=1&origin=${startPoint.lat},${startPoint.lng}&destination=${encodeURIComponent(address)}&travelmode=driving`;
            window.open(url, "_blank");
        });

        if (!geolocateControl.trigger()) {
            const fallback = { lat: 41.4026, lng: -74.3231 };
            const url = `https://www.google.com/maps/dir/?api=1&origin=${fallback.lat},${fallback.lng}&destination=${encodeURIComponent(address)}&travelmode=driving`;
            window.open(url, "_blank");
        }
    };

    window.reportOutOfStock = function (locationName) {
        alert(`Reported: ${locationName} is out of stock.`);
    };

    // Button toggles
    ["notes", "oopp", "additional-notes"].forEach(id => {
        const toggleBtn = document.getElementById(`toggle-${id}-button`);
        const box = document.getElementById(`${id}-box`);
        const closeBtn = document.getElementById(`close-${id}-button`);

        toggleBtn.onclick = () => {
            box.style.display = box.style.display === "none" ? "block" : "none";
        };

        closeBtn.onclick = () => box.style.display = "none";
    });
});