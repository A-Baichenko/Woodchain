/* =========================
   Rückverfolgung
   ========================= */

async function trackWoodHistory() {
    const logId = document.getElementById("searchLogId").value.trim();

    if (!logId) {
        showWarning("Bitte eine ID eingeben.", "ID fehlt");
        return;
    }

    try {
        const response = await fetch(`/api/wood/${encodeURIComponent(logId)}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showWarning("Diese ID wurde nicht im Ledger gefunden.", "Nicht gefunden");
            return;
        }

        const wood = await response.json();

        const list = document.getElementById("timelineList");
        const container = document.getElementById("timelineContainer");

        if (!list || !container) {
            return;
        }

        list.innerHTML = "";
        container.style.display = "block";

        const li = document.createElement("li");
        li.style.marginBottom = "20px";
        li.style.position = "relative";
        li.style.paddingLeft = "15px";

        li.innerHTML = `
            <div style="font-weight: bold; color: #1b5e20;">
                Aktueller Blockchain-Zustand: ${wood.status || "-"}
            </div>
            <div style="font-size: 0.9rem; color: #555; margin-top: 2px;">
                <strong>ID:</strong> ${wood.id || "-"}<br>
                <strong>Holzart:</strong> ${wood.treeType || "-"}<br>
                <strong>Volumen:</strong> ${wood.volumeM3 || "-"} m³<br>
                <strong>Herkunft:</strong> ${wood.origin || "-"}<br>
                <strong>Besitzer:</strong> ${wood.owner || "-"}<br>
                <strong>Standort laut Blockchain:</strong> ${wood.location || "-"}<br>
                <strong>Erntezeit:</strong> ${formatTimestamp(wood.harvestDate)}<br>
                <strong>Letztes Update:</strong> ${formatTimestamp(wood.lastUpdate)}
            </div>
        `;

        list.appendChild(li);

        await renderWoodTraceMap(wood);

        showInfo("Blockchain-Zustand wurde erfolgreich geladen.", "Rückverfolgung aktualisiert");

    } catch (error) {
        console.error("Fehler beim Abruf der Historie:", error);
        showError("Fehler beim Abruf der Historie.", "Rückverfolgung fehlgeschlagen");
    }
}
