/* =========================
   Sägewerk: 2 getrennte Schritte
   Schritt 1: Wareneingang bestätigen
   Schritt 2: Versandplanung speichern
   ========================= */

let currentSawmillIncomingWood = null;
let currentSawmillShippingWood = null;

let allProcessedSawmillOrders = [];
let filteredProcessedSawmillOrders = [];

function renderSawmillIncomingPreview(wood) {
    const box = document.getElementById("sawmillIncomingPreviewBox");
    const subtitle = document.getElementById("sawmillIncomingPreviewSubtitle");
    const woodPreview = document.getElementById("sawmillIncomingWoodPreview");
    const statusPreview = document.getElementById("sawmillIncomingStatusPreview");
    const logisticsPreview = document.getElementById("sawmillIncomingLogisticsPreview");
    const targetPreview = document.getElementById("sawmillIncomingTargetPreview");

    if (!box) {
        return;
    }

    let text = "Dieser Status kann vom Sägewerk aktuell nicht als Wareneingang bestätigt werden.";

    if (wood.status === "IN_TRANSPORT_TO_SAWMILL") {
        text = "Diese Holzcharge ist auf dem Weg zu deinem Sägewerk und kann als Wareneingang bestätigt werden.";
    } else if (wood.status === "PROCESSED") {
        text = "Diese Holzcharge wurde bereits angenommen/verarbeitet. Nutze unten die Versandplanung.";
    } else if (wood.status === "HARVESTED") {
        text = "Der Transport zum Sägewerk wurde noch nicht durch die Logistik bestätigt.";
    }

    if (subtitle) {
        subtitle.innerText = text;
    }

    if (woodPreview) {
        woodPreview.innerHTML = `
            <strong>ID:</strong> ${wood.id || "-"}<br>
            <strong>Holzart:</strong> ${wood.treeType || "-"}<br>
            <strong>Volumen:</strong> ${wood.volumeM3 || "-"} m³<br>
            <strong>Herkunft:</strong> ${wood.origin || "-"}
        `;
    }

    if (statusPreview) {
        statusPreview.innerHTML = `
            <strong>Status:</strong> ${wood.status || "-"}<br>
            <strong>Besitzer:</strong> ${wood.owner || "-"}<br>
            <strong>Standort:</strong> ${wood.location || "-"}
        `;
    }

    if (logisticsPreview) {
        logisticsPreview.innerHTML = `
            <strong>Geplante Logistik:</strong> ${wood.logisticsToSawmill || "-"}<br>
            <strong>Aktueller Besitzer:</strong> ${wood.owner || "-"}
        `;
    }

    if (targetPreview) {
        targetPreview.innerHTML = `
            <strong>Ziel-Sägewerk:</strong> ${wood.sawmill || "-"}<br>
            <strong>Ziel laut Blockchain:</strong> ${wood.targetLocation || "-"}
        `;
    }

    box.style.display = "block";
}

function selectOpenSawmillOrder() {
    const select = document.getElementById("openSawmillOrdersSelect");
    const input = document.getElementById("logId");

    if (!select || !input || !select.value) {
        return;
    }

    input.value = select.value;

    const selectedWood = allOpenSawmillOrders.find(wood => wood.id === select.value);

    if (selectedWood) {
        currentSawmillIncomingWood = selectedWood;
        renderSawmillIncomingPreview(selectedWood);
    }
}

async function loadSawmillIncomingPreview() {
    const input = document.getElementById("logId");
    const box = document.getElementById("sawmillIncomingPreviewBox");

    if (!input) {
        return null;
    }

    const id = input.value.trim();

    if (!id) {
        showWarning("Bitte eine Holz-ID eingeben oder scannen.", "ID fehlt");
        return null;
    }

    try {
        const response = await fetch(`/api/wood/${encodeURIComponent(id)}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            currentSawmillIncomingWood = null;

            if (box) {
                box.style.display = "none";
            }

            showWarning("Diese Holz-ID wurde nicht im Ledger gefunden.", "Nicht gefunden");
            return null;
        }

        const wood = await response.json();

        currentSawmillIncomingWood = wood;
        renderSawmillIncomingPreview(wood);

        return wood;

    } catch (error) {
        console.error("Wareneingang konnte nicht geladen werden:", error);
        showError("Wareneingang konnte technisch nicht geladen werden.", "Ladefehler");
        return null;
    }
}

async function confirmSawmillIncoming() {
    const input = document.getElementById("logId");

    if (!input || !input.value.trim()) {
        showWarning("Bitte zuerst eine Holz-ID eingeben oder auswählen.", "ID fehlt");
        return;
    }

    let wood = currentSawmillIncomingWood;

    if (!wood || wood.id !== input.value.trim()) {
        wood = await loadSawmillIncomingPreview();

        if (!wood) {
            return;
        }
    }

    if (wood.status !== "IN_TRANSPORT_TO_SAWMILL") {
        showWarning(
            "Der Wareneingang kann nur bestätigt werden, wenn der Status IN_TRANSPORT_TO_SAWMILL ist. Aktuell: " + wood.status,
            "Status nicht passend"
        );
        return;
    }

    const profile = await getCurrentUserProfile();

    if (!isCurrentSawmillPartner(wood.sawmill, profile)) {
        showWarning(
            "Diese Holzcharge ist für ein anderes Sägewerk geplant: " + (wood.sawmill || "-"),
            "Nicht zuständig"
        );
        return;
    }

    const sawmillOwner =
        profile?.displayName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("username") ||
        "Unbekanntes Sägewerk";

    const sawmillLocation =
        profile?.location ||
        profile?.address ||
        localStorage.getItem("location") ||
        localStorage.getItem("address") ||
        "Unbekannter Standort";

    const params = new URLSearchParams({
        newOwner: sawmillOwner,
        newLocation: sawmillLocation
    });

    try {
        const response = await fetch(
            `/api/wood/${encodeURIComponent(wood.id)}/process?` + params.toString(),
            {
                method: "POST",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const text = await response.text();
            showError("Wareneingang konnte nicht bestätigt werden. " + text, "Speichern fehlgeschlagen");
            return;
        }

        showSuccess("Wareneingang bestätigt. Die Holzcharge hat jetzt den Status PROCESSED.", "Wareneingang bestätigt");

        input.value = "";
        currentSawmillIncomingWood = null;

        const box = document.getElementById("sawmillIncomingPreviewBox");

        if (box) {
            box.style.display = "none";
        }

        await loadGlobalLedger();
        await loadOpenSawmillOrders();
        await loadProcessedSawmillOrders();

    } catch (error) {
        console.error("Fehler beim Bestätigen des Wareneingangs:", error);
        showError("Technischer Fehler beim Bestätigen des Wareneingangs.", "Blockchain-Fehler");
    }
}

async function loadProcessedSawmillOrders() {
    const statusElement = document.getElementById("processedSawmillOrdersStatus");
    const select = document.getElementById("processedSawmillOrdersSelect");

    if (statusElement) {
        statusElement.innerText = "Verarbeitete Holzchargen werden geladen...";
    }

    if (select) {
        select.innerHTML = `<option value="">Verarbeitete Holzchargen werden geladen...</option>`;
    }

    const profile = await getCurrentUserProfile();

    try {
        const response = await fetch("/api/wood", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showError("Verarbeitete Holzchargen konnten nicht geladen werden.", "Ladefehler");
            return;
        }

        const assets = await response.json();

        allProcessedSawmillOrders = assets.filter(wood => {
            if (wood.status !== "PROCESSED") {
                return false;
            }

            if (wood.logisticsToRetail || wood.retail) {
                return false;
            }

            return isCurrentSawmillPartner(wood.sawmill, profile);
        });

        filteredProcessedSawmillOrders = [...allProcessedSawmillOrders];

        renderProcessedSawmillOrdersSelect();

        if (statusElement) {
            if (allProcessedSawmillOrders.length === 0) {
                statusElement.innerText = "Keine verarbeiteten Holzchargen für die Versandplanung gefunden.";
            } else {
                statusElement.innerText = `${allProcessedSawmillOrders.length} verarbeitete Holzcharge(n) bereit für Versandplanung.`;
            }
        }

    } catch (error) {
        console.error("Fehler beim Laden verarbeiteter Holzchargen:", error);
        showError("Technischer Fehler beim Laden der Versandplanung.", "Ladefehler");
    }
}

function filterProcessedSawmillOrders() {
    const input = document.getElementById("processedSawmillOrderSearch");
    const search = input ? input.value.trim().toLowerCase() : "";

    if (!search) {
        filteredProcessedSawmillOrders = [...allProcessedSawmillOrders];
    } else {
        filteredProcessedSawmillOrders = allProcessedSawmillOrders.filter(wood => {
            const text = [
                wood.id,
                wood.treeType,
                wood.volumeM3,
                wood.origin,
                wood.owner,
                wood.status,
                wood.location,
                wood.sawmill
            ]
                .filter(value => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return text.includes(search);
        });
    }

    renderProcessedSawmillOrdersSelect();
}

function renderProcessedSawmillOrdersSelect() {
    const select = document.getElementById("processedSawmillOrdersSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Fertige Holzcharge auswählen...</option>`;

    if (!filteredProcessedSawmillOrders || filteredProcessedSawmillOrders.length === 0) {
        select.innerHTML = `<option value="">Keine passenden fertigen Holzchargen</option>`;
        return;
    }

    filteredProcessedSawmillOrders.forEach(wood => {
        const option = document.createElement("option");

        option.value = wood.id;
        option.textContent =
            `${wood.id} | ${wood.treeType || "-"} | ${wood.volumeM3 || "-"} m³ | Status: ${wood.status}`;

        select.appendChild(option);
    });
}

function selectProcessedSawmillOrder() {
    const select = document.getElementById("processedSawmillOrdersSelect");

    if (!select || !select.value) {
        return;
    }

    const selectedWood = allProcessedSawmillOrders.find(wood => wood.id === select.value);

    if (!selectedWood) {
        return;
    }

    currentSawmillShippingWood = selectedWood;
    renderSawmillShippingPreview(selectedWood);
}

function renderSawmillShippingPreview(wood) {
    const box = document.getElementById("sawmillShippingPreviewBox");
    const subtitle = document.getElementById("sawmillShippingPreviewSubtitle");
    const woodPreview = document.getElementById("sawmillShippingWoodPreview");
    const statusPreview = document.getElementById("sawmillShippingStatusPreview");

    if (!box) {
        return;
    }

    if (subtitle) {
        subtitle.innerText = "Diese Holzcharge ist verarbeitet und kann jetzt für den Versand zum Händler geplant werden.";
    }

    if (woodPreview) {
        woodPreview.innerHTML = `
            <strong>ID:</strong> ${wood.id || "-"}<br>
            <strong>Holzart:</strong> ${wood.treeType || "-"}<br>
            <strong>Volumen:</strong> ${wood.volumeM3 || "-"} m³<br>
            <strong>Herkunft:</strong> ${wood.origin || "-"}
        `;
    }

    if (statusPreview) {
        statusPreview.innerHTML = `
            <strong>Status:</strong> ${wood.status || "-"}<br>
            <strong>Besitzer:</strong> ${wood.owner || "-"}<br>
            <strong>Standort:</strong> ${wood.location || "-"}
        `;
    }

    box.style.display = "block";
}

async function saveSawmillShippingPlan() {
    if (!currentSawmillShippingWood) {
        const loadedWood = await loadProcessedSawmillOrderByInput();

        if (!loadedWood) {
            showWarning("Bitte zuerst eine verarbeitete Holzcharge auswählen oder scannen.", "Keine Holzcharge ausgewählt");
            return;
        }
    }

    const wood = currentSawmillShippingWood;

    if (wood.status !== "PROCESSED") {
        showWarning("Versandplanung ist nur bei Status PROCESSED möglich.", "Status nicht passend");
        return;
    }

    const profile = await getCurrentUserProfile();

    if (!isCurrentSawmillPartner(wood.sawmill, profile)) {
        showWarning(
            "Diese Holzcharge ist für ein anderes Sägewerk geplant: " + (wood.sawmill || "-"),
            "Nicht zuständig"
        );
        return;
    }

    const logisticsPartner = getSelectedPartner("logisticsToRetailSelect");
    const retailPartner = getSelectedPartner("retailSelect");

    if (!logisticsPartner) {
        showWarning("Bitte einen Logistikbetrieb für den Transport zum Händler auswählen.", "Logistik fehlt");
        return;
    }

    if (!retailPartner) {
        showWarning("Bitte einen Ziel-Händler auswählen.", "Händler fehlt");
        return;
    }

    const sawmillOwner =
        profile?.displayName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("username") ||
        "Unbekanntes Sägewerk";

    const sawmillLocation =
        profile?.location ||
        profile?.address ||
        localStorage.getItem("location") ||
        localStorage.getItem("address") ||
        "Unbekannter Standort";

    const logisticsToRetail =
        logisticsPartner.displayName ||
        logisticsPartner.username ||
        "Unbekannte Logistik";

    const retail =
        retailPartner.displayName ||
        retailPartner.username ||
        "Unbekannter Händler";

    const params = new URLSearchParams({
        sawmillOwner: sawmillOwner,
        sawmillLocation: sawmillLocation,
        logisticsToRetail: logisticsToRetail,
        retail: retail
    });

    try {
        const response = await fetch(
            `/api/wood/${encodeURIComponent(wood.id)}/process-with-retail-plan?` + params.toString(),
            {
                method: "POST",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const text = await response.text();
            showError("Versandplanung konnte nicht gespeichert werden. " + text, "Speichern fehlgeschlagen");
            return;
        }

        showSuccess(
            "Versandplanung gespeichert. Die Logistik sieht den Auftrag jetzt als offenen Transport zum Händler.",
            "Versand geplant"
        );

        currentSawmillShippingWood = null;

        const box = document.getElementById("sawmillShippingPreviewBox");

        if (box) {
            box.style.display = "none";
        }

        await loadGlobalLedger();
        await loadProcessedSawmillOrders();

    } catch (error) {
        console.error("Fehler bei der Versandplanung:", error);
        showError("Technischer Fehler beim Speichern der Versandplanung.", "Blockchain-Fehler");
    }
}

async function loadOpenSawmillOrders() {
    const statusElement = document.getElementById("openSawmillOrdersStatus");
    const select = document.getElementById("openSawmillOrdersSelect");

    if (statusElement) {
        statusElement.innerText = "Offene Wareneingänge werden geladen...";
    }

    if (select) {
        select.innerHTML = `<option value="">Offene Wareneingänge werden geladen...</option>`;
    }

    const profile = await getCurrentUserProfile();

    try {
        const response = await fetch("/api/wood", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showError("Offene Wareneingänge konnten nicht geladen werden.", "Ladefehler");
            return;
        }

        const assets = await response.json();

        allOpenSawmillOrders = assets.filter(wood => {
            if (wood.status !== "IN_TRANSPORT_TO_SAWMILL") {
                return false;
            }

            return isCurrentSawmillPartner(wood.sawmill, profile);
        });

        filteredOpenSawmillOrders = [...allOpenSawmillOrders];

        renderOpenSawmillOrdersSelect();

        if (statusElement) {
            if (allOpenSawmillOrders.length === 0) {
                statusElement.innerText = "Keine offenen Wareneingänge für dein Sägewerk gefunden.";
            } else {
                statusElement.innerText = `${allOpenSawmillOrders.length} offene Wareneingänge gefunden.`;
            }
        }

    } catch (error) {
        console.error("Fehler beim Laden offener Wareneingänge:", error);
        showError("Technischer Fehler beim Laden offener Wareneingänge.", "Ladefehler");
    }
}

function renderOpenSawmillOrdersSelect() {
    const select = document.getElementById("openSawmillOrdersSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Wareneingang auswählen...</option>`;

    if (!filteredOpenSawmillOrders || filteredOpenSawmillOrders.length === 0) {
        select.innerHTML = `<option value="">Keine passenden Wareneingänge</option>`;
        return;
    }

    filteredOpenSawmillOrders.forEach(wood => {
        const option = document.createElement("option");

        option.value = wood.id;

        option.textContent =
            `${wood.id} | ${wood.treeType || "-"} | ${wood.volumeM3 || "-"} m³ | von: ${wood.logisticsToSawmill || wood.owner || "-"}`;

        select.appendChild(option);
    });
}

function filterOpenSawmillOrders() {
    const searchInput = document.getElementById("sawmillOrderSearch");
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!searchTerm) {
        filteredOpenSawmillOrders = [...allOpenSawmillOrders];
    } else {
        filteredOpenSawmillOrders = allOpenSawmillOrders.filter(wood => {
            const searchableText = [
                wood.id,
                wood.treeType,
                wood.volumeM3,
                wood.origin,
                wood.owner,
                wood.status,
                wood.location,
                wood.logisticsToSawmill,
                wood.sawmill,
                wood.targetLocation
            ]
                .filter(value => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    renderOpenSawmillOrdersSelect();
}

/* =========================
   FIX: Sägewerk Partnerprüfung + offene Wareneingänge
   ========================= */

var allOpenSawmillOrders = window.allOpenSawmillOrders || [];
var filteredOpenSawmillOrders = window.filteredOpenSawmillOrders || [];

function isCurrentSawmillPartner(expectedName, profile) {
    const expected = normalizePartnerName(expectedName);

    if (!expected) {
        return true;
    }

    const displayName = normalizePartnerName(
        profile?.displayName ||
        localStorage.getItem("displayName")
    );

    const username = normalizePartnerName(
        profile?.username ||
        localStorage.getItem("username")
    );

    return expected === displayName ||
        expected === username ||
        expected.includes(displayName) ||
        expected.includes(username) ||
        displayName.includes(expected) ||
        username.includes(expected);
}
