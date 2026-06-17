/* =========================
   Logistik: Transportphasen
   ========================= */

let currentLogisticsWood = null;

function normalizePartnerName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function isCurrentLogisticsPartner(expectedName, profile) {
    const expected = normalizePartnerName(expectedName);

    if (!expected) {
        return true;
    }

    const displayName = normalizePartnerName(profile?.displayName || localStorage.getItem("displayName"));
    const username = normalizePartnerName(profile?.username || localStorage.getItem("username"));

    return expected === displayName ||
        expected === username ||
        expected.includes(displayName) ||
        expected.includes(username) ||
        displayName.includes(expected) ||
        username.includes(expected);
}

async function loadLogisticsTransportPreview() {
    const input = document.getElementById("logId");
    const previewBox = document.getElementById("logisticsPreviewBox");

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
            currentLogisticsWood = null;

            if (previewBox) {
                previewBox.style.display = "none";
            }

            showWarning("Diese Holz-ID wurde nicht im Ledger gefunden.", "Nicht gefunden");
            return null;
        }

        const wood = await response.json();
        currentLogisticsWood = wood;

        renderLogisticsTransportPreview(wood);

        return wood;

    } catch (error) {
        console.error("Transportauftrag konnte nicht geladen werden:", error);
        currentLogisticsWood = null;
        showError("Transportauftrag konnte technisch nicht geladen werden.", "Ladefehler");
        return null;
    }
}

function renderLogisticsTransportPreview(wood) {
    const previewBox = document.getElementById("logisticsPreviewBox");
    const subtitle = document.getElementById("logisticsPreviewSubtitle");
    const woodPreview = document.getElementById("logisticsWoodPreview");
    const statusPreview = document.getElementById("logisticsStatusPreview");
    const plannedPreview = document.getElementById("logisticsPlannedPreview");
    const targetPreview = document.getElementById("logisticsTargetPreview");

    if (!previewBox) {
        return;
    }

    let phaseText = "Dieser Status kann von der Logistik aktuell nicht verarbeitet werden.";
    let plannedLogistics = "-";
    let target = "-";

    if (wood.status === "HARVESTED") {
        phaseText = "Transportphase 1: Wald / Förster → Sägewerk";
        plannedLogistics = wood.logisticsToSawmill || "-";
        target = wood.sawmill || wood.targetLocation || "-";
    } else if (wood.status === "PROCESSED") {
        phaseText = "Transportphase 2: Sägewerk → Handel";
        plannedLogistics = wood.logisticsToRetail || "-";
        target = wood.retail || wood.targetLocation || "-";
    } else if (wood.status === "IN_TRANSPORT_TO_SAWMILL") {
        phaseText = "Diese Holzcharge ist bereits auf dem Weg zum Sägewerk.";
        plannedLogistics = wood.logisticsToSawmill || "-";
        target = wood.sawmill || wood.targetLocation || "-";
    } else if (wood.status === "IN_TRANSPORT_TO_RETAIL") {
        phaseText = "Diese Holzcharge ist bereits auf dem Weg zum Handel.";
        plannedLogistics = wood.logisticsToRetail || "-";
        target = wood.retail || wood.targetLocation || "-";
    } else if (wood.status === "SOLD") {
        phaseText = "Diese Holzcharge wurde bereits verkauft.";
        plannedLogistics = "-";
        target = wood.location || "-";
    }

    if (subtitle) {
        subtitle.innerText = phaseText;
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

    if (plannedPreview) {
        plannedPreview.innerText = plannedLogistics;
    }

    if (targetPreview) {
        targetPreview.innerText = target;
    }

    previewBox.style.display = "block";
}

async function executeLogisticsTransport() {
    const input = document.getElementById("logId");

    if (!input) {
        showError("ID-Feld wurde nicht gefunden.", "Formularfehler");
        return;
    }

    const id = input.value.trim();

    if (!id) {
        showWarning("Bitte eine Holz-ID eingeben oder scannen.", "ID fehlt");
        return;
    }

    let wood = currentLogisticsWood;

    if (!wood || wood.id !== id) {
        wood = await loadLogisticsTransportPreview();

        if (!wood) {
            return;
        }
    }

    const profile = await getCurrentUserProfile();

    const logisticsName =
        profile?.displayName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("username") ||
        "Unbekannte Logistik";

    const logisticsLocation =
        profile?.location ||
        profile?.address ||
        localStorage.getItem("location") ||
        localStorage.getItem("address") ||
        "Unbekannter Standort";

    let endpoint = "";
    let expectedLogistics = "";
    let successMessage = "";

    if (wood.status === "HARVESTED") {
        endpoint = `/api/wood/${encodeURIComponent(id)}/transport-to-sawmill`;
        expectedLogistics = wood.logisticsToSawmill || "";
        successMessage = "Transport zum Sägewerk wurde in der Blockchain bestätigt.";
    } else if (wood.status === "PROCESSED") {
        endpoint = `/api/wood/${encodeURIComponent(id)}/transport-to-retail`;
        expectedLogistics = wood.logisticsToRetail || "";
        successMessage = "Transport zum Handel wurde in der Blockchain bestätigt.";
    } else if (wood.status === "IN_TRANSPORT_TO_SAWMILL") {
        showWarning("Diese Holzcharge ist bereits auf dem Weg zum Sägewerk.", "Schon im Transport");
        return;
    } else if (wood.status === "IN_TRANSPORT_TO_RETAIL") {
        showWarning("Diese Holzcharge ist bereits auf dem Weg zum Handel.", "Schon im Transport");
        return;
    } else if (wood.status === "SOLD") {
        showWarning("Diese Holzcharge wurde bereits verkauft.", "Bereits verkauft");
        return;
    } else {
        showWarning("Dieser Blockchain-Status kann von der Logistik nicht verarbeitet werden: " + wood.status, "Status nicht passend");
        return;
    }

    if (!isCurrentLogisticsPartner(expectedLogistics, profile)) {
        showWarning(
            "Diese Holzcharge ist für einen anderen Logistikbetrieb geplant: " + expectedLogistics,
            "Nicht zuständig"
        );
        return;
    }

    const params = new URLSearchParams({
        logisticsOwner: logisticsName,
        logisticsLocation: logisticsLocation
    });

    try {
        const response = await fetch(endpoint + "?" + params.toString(), {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const text = await response.text();
            showError("Transport konnte nicht gespeichert werden. " + text, "Speichern fehlgeschlagen");
            return;
        }

        showSuccess(successMessage, "Transport gespeichert");

        input.value = "";
        currentLogisticsWood = null;

        const previewBox = document.getElementById("logisticsPreviewBox");

        if (previewBox) {
            previewBox.style.display = "none";
        }

        await loadGlobalLedger();
        await loadOpenLogisticsOrders();

    } catch (error) {
        console.error("Fehler beim Transport:", error);
        showError("Technischer Fehler beim Speichern des Transports.", "Blockchain-Fehler");
    }
}

/* =========================
   Logistik: Offene Aufträge Dropdown + Suche
   ========================= */

let allOpenLogisticsOrders = [];
let filteredOpenLogisticsOrders = [];

async function loadOpenLogisticsOrders() {
    const statusElement = document.getElementById("openLogisticsOrdersStatus");
    const select = document.getElementById("openLogisticsOrdersSelect");

    if (statusElement) {
        statusElement.innerText = "Offene Aufträge werden geladen...";
    }

    if (select) {
        select.innerHTML = `<option value="">Offene Aufträge werden geladen...</option>`;
    }

    const profile = await getCurrentUserProfile();

    try {
        const response = await fetch("/api/wood", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Offene Logistik-Aufträge konnten nicht geladen werden:", text);
            showError("Offene Logistik-Aufträge konnten nicht geladen werden.", "Ladefehler");
            return;
        }

        const assets = await response.json();

        allOpenLogisticsOrders = assets.filter(wood => {
            if (wood.status === "HARVESTED") {
                return isCurrentLogisticsPartner(wood.logisticsToSawmill, profile);
            }

            if (wood.status === "PROCESSED") {
                return isCurrentLogisticsPartner(wood.logisticsToRetail, profile);
            }

            return false;
        });

        filteredOpenLogisticsOrders = [...allOpenLogisticsOrders];

        renderOpenLogisticsOrdersSelect();

        if (statusElement) {
            if (allOpenLogisticsOrders.length === 0) {
                statusElement.innerText = "Keine offenen Transportaufträge für deinen Logistik-Account gefunden.";
            } else {
                statusElement.innerText = `${allOpenLogisticsOrders.length} offene Transportaufträge gefunden.`;
            }
        }

    } catch (error) {
        console.error("Fehler beim Laden offener Transportaufträge:", error);
        showError("Technischer Fehler beim Laden offener Transportaufträge.", "Ladefehler");
    }
}

function filterOpenLogisticsOrders() {
    const searchInput = document.getElementById("logisticsOrderSearch");
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!searchTerm) {
        filteredOpenLogisticsOrders = [...allOpenLogisticsOrders];
    } else {
        filteredOpenLogisticsOrders = allOpenLogisticsOrders.filter(wood => {
            const phase =
                wood.status === "HARVESTED"
                    ? "transport zum sägewerk"
                    : "transport zum handel";

            const plannedLogistics =
                wood.status === "HARVESTED"
                    ? wood.logisticsToSawmill
                    : wood.logisticsToRetail;

            const target =
                wood.status === "HARVESTED"
                    ? wood.sawmill
                    : wood.retail;

            const searchableText = [
                wood.id,
                wood.treeType,
                wood.volumeM3,
                wood.origin,
                wood.owner,
                wood.status,
                wood.location,
                plannedLogistics,
                target,
                phase
            ]
                .filter(value => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    renderOpenLogisticsOrdersSelect();
}

function renderOpenLogisticsOrdersSelect() {
    const select = document.getElementById("openLogisticsOrdersSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Auftrag auswählen...</option>`;

    if (!filteredOpenLogisticsOrders || filteredOpenLogisticsOrders.length === 0) {
        select.innerHTML = `<option value="">Keine passenden offenen Aufträge</option>`;
        return;
    }

    filteredOpenLogisticsOrders.forEach(wood => {
        const option = document.createElement("option");

        const phase =
            wood.status === "HARVESTED"
                ? "Zum Sägewerk"
                : "Zum Handel";

        const target =
            wood.status === "HARVESTED"
                ? wood.sawmill || wood.targetLocation || "-"
                : wood.retail || wood.targetLocation || "-";

        option.value = wood.id;

        option.textContent =
            `${wood.id} | ${phase} | ${wood.treeType || "-"} | Ziel: ${target}`;

        select.appendChild(option);
    });
}

function selectOpenLogisticsOrder() {
    const select = document.getElementById("openLogisticsOrdersSelect");
    const input = document.getElementById("logId");

    if (!select || !input || !select.value) {
        return;
    }

    input.value = select.value;

    const selectedWood = allOpenLogisticsOrders.find(wood => wood.id === select.value);

    if (selectedWood) {
        currentLogisticsWood = selectedWood;
        renderLogisticsTransportPreview(selectedWood);
    } else {
        loadLogisticsTransportPreview();
    }
}
