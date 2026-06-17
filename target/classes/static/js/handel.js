/* =========================
   Handel: Offene Lieferungen + Verkauf
   ========================= */

let currentRetailWood = null;
let allOpenRetailOrders = [];
let filteredOpenRetailOrders = [];

function isCurrentRetailPartner(expectedName, profile) {
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

async function loadOpenRetailOrders() {
    const statusElement = document.getElementById("openRetailOrdersStatus");
    const select = document.getElementById("openRetailOrdersSelect");

    if (statusElement) {
        statusElement.innerText = "Offene Lieferungen werden geladen...";
    }

    if (select) {
        select.innerHTML = `<option value="">Offene Lieferungen werden geladen...</option>`;
    }

    const profile = await getCurrentUserProfile();

    try {
        const response = await fetch("/api/wood", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showError("Offene Lieferungen konnten nicht geladen werden.", "Ladefehler");
            return;
        }

        const assets = await response.json();

        allOpenRetailOrders = assets.filter(wood => {
            if (wood.status !== "IN_TRANSPORT_TO_RETAIL") {
                return false;
            }

            return isCurrentRetailPartner(wood.retail, profile);
        });

        filteredOpenRetailOrders = [...allOpenRetailOrders];

        renderOpenRetailOrdersSelect();

        if (statusElement) {
            if (allOpenRetailOrders.length === 0) {
                statusElement.innerText = "Keine offenen Lieferungen für deinen Handels-Account gefunden.";
            } else {
                statusElement.innerText = `${allOpenRetailOrders.length} offene Lieferung(en) gefunden.`;
            }
        }

    } catch (error) {
        console.error("Fehler beim Laden offener Lieferungen:", error);
        showError("Technischer Fehler beim Laden offener Lieferungen.", "Ladefehler");
    }
}

function filterOpenRetailOrders() {
    const searchInput = document.getElementById("retailOrderSearch");
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!searchTerm) {
        filteredOpenRetailOrders = [...allOpenRetailOrders];
    } else {
        filteredOpenRetailOrders = allOpenRetailOrders.filter(wood => {
            const searchableText = [
                wood.id,
                wood.treeType,
                wood.volumeM3,
                wood.origin,
                wood.owner,
                wood.status,
                wood.location,
                wood.logisticsToRetail,
                wood.retail,
                wood.targetLocation
            ]
                .filter(value => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    renderOpenRetailOrdersSelect();
}

function renderOpenRetailOrdersSelect() {
    const select = document.getElementById("openRetailOrdersSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Lieferung auswählen...</option>`;

    if (!filteredOpenRetailOrders || filteredOpenRetailOrders.length === 0) {
        select.innerHTML = `<option value="">Keine passenden Lieferungen</option>`;
        return;
    }

    filteredOpenRetailOrders.forEach(wood => {
        const option = document.createElement("option");

        option.value = wood.id;

        option.textContent =
            `${wood.id} | ${wood.treeType || "-"} | ${wood.volumeM3 || "-"} m³ | von: ${wood.logisticsToRetail || wood.owner || "-"}`;

        select.appendChild(option);
    });
}

function selectOpenRetailOrder() {
    const select = document.getElementById("openRetailOrdersSelect");
    const input = document.getElementById("logId");

    if (!select || !input || !select.value) {
        return;
    }

    input.value = select.value;

    const selectedWood = allOpenRetailOrders.find(wood => wood.id === select.value);

    if (selectedWood) {
        currentRetailWood = selectedWood;
        renderRetailDeliveryPreview(selectedWood);
    } else {
        loadRetailDeliveryPreview();
    }
}

async function loadRetailDeliveryPreview() {
    const input = document.getElementById("logId");
    const previewBox = document.getElementById("retailPreviewBox");

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
            currentRetailWood = null;

            if (previewBox) {
                previewBox.style.display = "none";
            }

            showWarning("Diese Holz-ID wurde nicht im Ledger gefunden.", "Nicht gefunden");
            return null;
        }

        const wood = await response.json();

        currentRetailWood = wood;
        renderRetailDeliveryPreview(wood);

        return wood;

    } catch (error) {
        console.error("Lieferung konnte nicht geladen werden:", error);
        showError("Lieferung konnte technisch nicht geladen werden.", "Ladefehler");
        return null;
    }
}

function renderRetailDeliveryPreview(wood) {
    const previewBox = document.getElementById("retailPreviewBox");
    const subtitle = document.getElementById("retailPreviewSubtitle");
    const woodPreview = document.getElementById("retailWoodPreview");
    const statusPreview = document.getElementById("retailStatusPreview");
    const logisticsPreview = document.getElementById("retailLogisticsPreview");
    const targetPreview = document.getElementById("retailTargetPreview");

    if (!previewBox) {
        return;
    }

    let text = "Dieser Status kann vom Handel aktuell nicht verarbeitet werden.";

    if (wood.status === "IN_TRANSPORT_TO_RETAIL") {
        text = "Diese Holzcharge ist auf dem Weg zum Handel und kann angenommen werden.";
    } else if (wood.status === "PROCESSED") {
        text = "Die Versandplanung wurde gespeichert, aber die Logistik hat den Transport zum Handel noch nicht bestätigt.";
    } else if (wood.status === "SOLD") {
        text = "Diese Holzcharge wurde bereits verkauft beziehungsweise abgeschlossen.";
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
            <strong>Geplante Logistik:</strong> ${wood.logisticsToRetail || "-"}<br>
            <strong>Aktueller Besitzer:</strong> ${wood.owner || "-"}
        `;
    }

    if (targetPreview) {
        targetPreview.innerHTML = `
            <strong>Ziel-Händler:</strong> ${wood.retail || "-"}<br>
            <strong>Ziel laut Blockchain:</strong> ${wood.targetLocation || "-"}
        `;
    }

    previewBox.style.display = "block";
}

async function confirmRetailSale() {
    const input = document.getElementById("logId");

    if (!input || !input.value.trim()) {
        showWarning("Bitte zuerst eine Holz-ID eingeben oder auswählen.", "ID fehlt");
        return;
    }

    let wood = currentRetailWood;

    if (!wood || wood.id !== input.value.trim()) {
        wood = await loadRetailDeliveryPreview();

        if (!wood) {
            return;
        }
    }

    if (wood.status !== "IN_TRANSPORT_TO_RETAIL") {
        showWarning(
            "Der Handel kann die Lieferung nur abschließen, wenn der Status IN_TRANSPORT_TO_RETAIL ist. Aktuell: " + wood.status,
            "Status nicht passend"
        );
        return;
    }

    const profile = await getCurrentUserProfile();

    if (!isCurrentRetailPartner(wood.retail, profile)) {
        showWarning(
            "Diese Holzcharge ist für einen anderen Händler geplant: " + (wood.retail || "-"),
            "Nicht zuständig"
        );
        return;
    }

    const retailOwner =
        profile?.displayName ||
        localStorage.getItem("displayName") ||
        localStorage.getItem("username") ||
        "Unbekannter Handel";

    const retailLocation =
        profile?.location ||
        profile?.address ||
        localStorage.getItem("location") ||
        localStorage.getItem("address") ||
        "Unbekannter Standort";

    const params = new URLSearchParams({
        newOwner: retailOwner,
        newLocation: retailLocation
    });

    try {
        const response = await fetch(
            `/api/wood/${encodeURIComponent(wood.id)}/sell?` + params.toString(),
            {
                method: "POST",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const text = await response.text();
            showError("Lieferung konnte nicht abgeschlossen werden. " + text, "Speichern fehlgeschlagen");
            return;
        }

        showSuccess(
            "Die Lieferung wurde angenommen und die Holzcharge im Ledger abgeschlossen.",
            "Handel abgeschlossen"
        );

        input.value = "";
        currentRetailWood = null;

        const previewBox = document.getElementById("retailPreviewBox");

        if (previewBox) {
            previewBox.style.display = "none";
        }

        await loadGlobalLedger();
        await loadOpenRetailOrders();

    } catch (error) {
        console.error("Fehler beim Abschließen im Handel:", error);
        showError("Technischer Fehler beim Abschließen der Lieferung.", "Blockchain-Fehler");
    }
}
