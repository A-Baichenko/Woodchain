/* =========================
   Karte / Rückverfolgung aus Datenbank
   ========================= */

let woodTraceMap = null;
let woodTraceLayerGroup = null;

async function renderWoodTraceMap(wood) {
    const mapContainer = document.getElementById("mapContainer");
    const mapElement = document.getElementById("woodMap");

    if (!mapContainer || !mapElement) {
        console.warn("Karten-Container oder woodMap wurde nicht gefunden.");
        return;
    }

    if (typeof L === "undefined") {
        console.warn("Leaflet wurde nicht geladen.");
        showError("Leaflet wurde nicht geladen. Prüfe deine Internetverbindung.", "Kartenfehler");
        return;
    }

    try {
        const params = new URLSearchParams({
            status: wood.status || "",
            owner: wood.owner || ""
        });

        const response = await fetch("/api/locations/route?" + params.toString(), {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error("Route konnte nicht aus Datenbank geladen werden:", response.status);
            showError("Kartenroute konnte nicht aus der Datenbank geladen werden. Prüfe /api/locations/route.", "Kartenroute fehlt");
            return;
        }

        const route = await response.json();

        console.log("Geladene Route aus Datenbank:", route);

        if (!route || route.length === 0) {
            console.warn("Keine Standortdaten in der Datenbank gefunden.");
            showWarning("Keine Standortdaten in der Datenbank gefunden. Prüfe Adresse, Latitude und Longitude bei den Benutzern.", "Keine Standortdaten");
            return;
        }

        const validRoute = route.filter(point =>
            point.latitude !== null &&
            point.longitude !== null &&
            !isNaN(point.latitude) &&
            !isNaN(point.longitude)
        );

        if (validRoute.length === 0) {
            showWarning("Die Route enthält keine gültigen Koordinaten.", "Koordinaten fehlen");
            return;
        }

        mapContainer.style.display = "block";

        if (!woodTraceMap) {
            woodTraceMap = L.map("woodMap").setView(
                [validRoute[0].latitude, validRoute[0].longitude],
                9
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap"
            }).addTo(woodTraceMap);
        }

        if (woodTraceLayerGroup) {
            woodTraceLayerGroup.clearLayers();
        } else {
            woodTraceLayerGroup = L.layerGroup().addTo(woodTraceMap);
        }

        const latLngs = [];

        validRoute.forEach((point, index) => {
            const latLng = [point.latitude, point.longitude];
            latLngs.push(latLng);

            const marker = L.marker(latLng).addTo(woodTraceLayerGroup);

            marker.bindPopup(`
                <div class="map-location-popup">
                    <strong>${index + 1}. ${point.role || "-"}</strong><br>
                    <strong>Name:</strong> ${point.displayName || "-"}<br>
                    <strong>Ort:</strong> ${point.location || "-"}<br>
                    <strong>Adresse:</strong> ${point.address || "-"}<br><br>
                    <strong>Holz-ID:</strong> ${wood.id || "-"}<br>
                    <strong>Status:</strong> ${wood.status || "-"}<br>
                    <strong>Besitzer laut Blockchain:</strong> ${wood.owner || "-"}<br>
                    <strong>Standort laut Blockchain:</strong> ${wood.location || "-"}
                </div>
            `);
        });

        if (latLngs.length > 1) {
            L.polyline(latLngs, {
                weight: 4
            }).addTo(woodTraceLayerGroup);

            woodTraceMap.fitBounds(latLngs, {
                padding: [40, 40]
            });
        } else {
            woodTraceMap.setView(latLngs[0], 12);
        }

        setTimeout(() => {
            woodTraceMap.invalidateSize();
        }, 250);

    } catch (error) {
        console.error("Fehler beim Laden der Kartenroute:", error);
        showError("Fehler beim Laden der Kartenroute. Siehe Konsole.", "Kartenfehler");
    }
}

/* =========================
   Karte: echte Blockchain-Historie anzeigen
   ========================= */

async function loadAllMapUsers() {
    const roles = ["FOERSTER", "LOGISTIK", "SAEGEWERK", "HANDEL", "ADMIN"];
    const allUsers = [];

    for (const role of roles) {
        try {
            const response = await fetch(`/api/auth/users/by-role/${role}`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const users = await response.json();

                users.forEach(user => {
                    allUsers.push({
                        ...user,
                        role: role
                    });
                });
            }
        } catch (error) {
            console.warn("Benutzer konnten nicht geladen werden:", role, error);
        }
    }

    return allUsers;
}

function normalizeMapText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function findBestMapUserForWoodState(wood, users) {
    if (!wood || !users || users.length === 0) {
        return null;
    }

    const owner = normalizeMapText(wood.owner);
    const location = normalizeMapText(wood.location);

    let bestUser = null;
    let bestScore = 0;

    users.forEach(user => {
        const displayName = normalizeMapText(user.displayName);
        const username = normalizeMapText(user.username);
        const userLocation = normalizeMapText(user.location);
        const address = normalizeMapText(user.address);

        let score = 0;

        if (owner && displayName && owner.includes(displayName)) score += 120;
        if (owner && username && owner.includes(username)) score += 100;
        if (owner && displayName && owner === displayName) score += 150;
        if (owner && username && owner === username) score += 130;

        if (location && userLocation && location.includes(userLocation)) score += 60;
        if (location && address && address.includes(location)) score += 50;
        if (location && userLocation && location === userLocation) score += 80;

        if (score > bestScore) {
            bestScore = score;
            bestUser = user;
        }
    });

    if (!bestUser || bestScore === 0) {
        return null;
    }

    return bestUser;
}

function buildRoutePointsFromWoodHistory(historyRecords, users) {
    const points = [];

    historyRecords.forEach(record => {
        const wood = record.wood;

        if (!wood) {
            return;
        }

        const matchedUser = findBestMapUserForWoodState(wood, users);

        if (!matchedUser || matchedUser.latitude === null || matchedUser.longitude === null) {
            return;
        }

        const latitude = Number(matchedUser.latitude);
        const longitude = Number(matchedUser.longitude);

        if (isNaN(latitude) || isNaN(longitude)) {
            return;
        }

        const lastPoint = points.length > 0 ? points[points.length - 1] : null;

        const samePlaceAsLast =
            lastPoint &&
            Number(lastPoint.latitude).toFixed(6) === latitude.toFixed(6) &&
            Number(lastPoint.longitude).toFixed(6) === longitude.toFixed(6);

        if (samePlaceAsLast) {
            lastPoint.status = wood.status || lastPoint.status;
            lastPoint.owner = wood.owner || lastPoint.owner;
            lastPoint.location = wood.location || lastPoint.location;
            lastPoint.timestamp = record.timestamp || lastPoint.timestamp;
            return;
        }

        points.push({
            latitude: latitude,
            longitude: longitude,
            displayName: matchedUser.displayName || matchedUser.username || "-",
            username: matchedUser.username || "-",
            role: matchedUser.role || "-",
            address: matchedUser.address || "-",
            userLocation: matchedUser.location || "-",
            status: wood.status || "-",
            owner: wood.owner || "-",
            location: wood.location || "-",
            timestamp: record.timestamp || "-",
            txId: record.txId || "-"
        });
    });

    return points;
}

async function renderWoodTraceMap(wood) {
    const mapContainer = document.getElementById("mapContainer");
    const mapElement = document.getElementById("woodMap");

    if (!mapContainer || !mapElement) {
        return;
    }

    if (typeof L === "undefined") {
        showError("Leaflet wurde nicht geladen.", "Kartenfehler");
        return;
    }

    try {
        const historyResponse = await fetch(`/api/wood/${encodeURIComponent(wood.id)}/history`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!historyResponse.ok) {
            showError("Blockchain-Historie konnte nicht geladen werden.", "Historie fehlt");
            return;
        }

        const historyRecords = await historyResponse.json();
        const users = await loadAllMapUsers();

        const routePoints = buildRoutePointsFromWoodHistory(historyRecords, users);

        if (!routePoints || routePoints.length === 0) {
            showWarning(
                "Für diese Holzcharge konnten keine passenden Standortdaten gefunden werden.",
                "Keine Route"
            );
            return;
        }

        mapContainer.style.display = "block";

        if (!woodTraceMap) {
            woodTraceMap = L.map("woodMap").setView(
                [routePoints[0].latitude, routePoints[0].longitude],
                9
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap"
            }).addTo(woodTraceMap);
        }

        if (woodTraceLayerGroup) {
            woodTraceLayerGroup.clearLayers();
        } else {
            woodTraceLayerGroup = L.layerGroup().addTo(woodTraceMap);
        }

        const latLngs = [];

        routePoints.forEach((point, index) => {
            const latLng = [point.latitude, point.longitude];
            latLngs.push(latLng);

            const marker = L.marker(latLng).addTo(woodTraceLayerGroup);

            marker.bindPopup(`
                <div class="map-location-popup">
                    <strong>${index + 1}. Station: ${point.role}</strong><br>
                    <strong>Name:</strong> ${point.displayName}<br>
                    <strong>Adresse:</strong> ${point.address}<br><br>

                    <strong>Status dort:</strong> ${point.status}<br>
                    <strong>Besitzer laut Blockchain:</strong> ${point.owner}<br>
                    <strong>Standort laut Blockchain:</strong> ${point.location}<br>
                    <strong>Zeitpunkt:</strong> ${formatTimestamp(point.timestamp)}
                </div>
            `);
        });

        if (latLngs.length > 1) {
            L.polyline(latLngs, {
                weight: 5
            }).addTo(woodTraceLayerGroup);

            woodTraceMap.fitBounds(latLngs, {
                padding: [45, 45]
            });
        } else {
            woodTraceMap.setView(latLngs[0], 12);
        }

        setTimeout(() => {
            woodTraceMap.invalidateSize();
        }, 250);

    } catch (error) {
        console.error("Fehler beim Zeichnen der Blockchain-Route:", error);
        showError("Fehler beim Zeichnen der Blockchain-Route.", "Kartenfehler");
    }
}
