/* =========================
   Ledger: Laden, Suche, Pagination
   ========================= */

let allLedgerAssets = [];
let filteredLedgerAssets = [];
let currentLedgerPage = 1;
const ledgerItemsPerPage = 6;

async function loadGlobalLedger() {
    try {
        const response = await fetch("/api/wood", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error("Ledger konnte nicht geladen werden:", response.status);
            showError("Der Ledger konnte nicht geladen werden.", "Ledger-Fehler");
            return;
        }

        allLedgerAssets = await response.json();
        currentLedgerPage = 1;

        setupLedgerSearchAndPagination();
        applyLedgerSearch();

    } catch (error) {
        console.error("Fehler beim Laden des Ledgers:", error);
        showError("Beim Laden des Ledgers ist ein technischer Fehler aufgetreten.", "Ledger-Fehler");
    }
}

function setupLedgerSearchAndPagination() {
    const table = document.getElementById("assetTable");

    if (!table) {
        return;
    }

    const tableContainer = table.closest(".table-responsive");

    if (!tableContainer) {
        return;
    }

    let controls = document.getElementById("ledgerControls");

    if (!controls) {
        controls = document.createElement("div");
        controls.id = "ledgerControls";

        controls.innerHTML = `
            <div class="form-row" style="align-items: end;">
                <div class="form-group" style="flex: 1;">
                    <label>Ledger durchsuchen</label>
                    <input
                        type="text"
                        id="ledgerSearchInput"
                        placeholder="Suche nach ID, Holzart, Besitzer, Status oder Standort..."
                        oninput="applyLedgerSearch()"
                    >
                </div>
            </div>
        `;

        tableContainer.parentNode.insertBefore(controls, tableContainer);
    }

    let pagination = document.getElementById("ledgerPagination");

    if (!pagination) {
        pagination = document.createElement("div");
        pagination.id = "ledgerPagination";
        pagination.style.display = "flex";
        pagination.style.justifyContent = "space-between";
        pagination.style.alignItems = "center";
        pagination.style.gap = "10px";
        pagination.style.flexWrap = "wrap";

        tableContainer.parentNode.insertBefore(pagination, tableContainer.nextSibling);
    }
}

function applyLedgerSearch() {
    const searchInput = document.getElementById("ledgerSearchInput");
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (!searchTerm) {
        filteredLedgerAssets = [...allLedgerAssets];
    } else {
        filteredLedgerAssets = allLedgerAssets.filter(asset => {
            const searchableText = [
                asset.id,
                asset.treeType,
                asset.volumeM3,
                asset.owner,
                asset.status,
                asset.location,
                asset.origin,
                asset.harvestDate,
                asset.lastUpdate
            ]
                .filter(value => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchTerm);
        });
    }

    currentLedgerPage = 1;
    renderLedgerPage();
}

function renderLedgerPage() {
    const tbody = document.querySelector("#assetTable tbody");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (!filteredLedgerAssets || filteredLedgerAssets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Keine passenden Einträge gefunden.</td>
            </tr>
        `;

        renderLedgerPagination();
        return;
    }

    const totalPages = Math.ceil(filteredLedgerAssets.length / ledgerItemsPerPage);

    if (currentLedgerPage > totalPages) {
        currentLedgerPage = totalPages;
    }

    const startIndex = (currentLedgerPage - 1) * ledgerItemsPerPage;
    const endIndex = startIndex + ledgerItemsPerPage;

    const pageItems = filteredLedgerAssets.slice(startIndex, endIndex);

    pageItems.forEach(asset => {
        const row = document.createElement("tr");

        const statusClass = "status-" + String(asset.status || "").toLowerCase();
        const volumeText = asset.volumeM3 ? `${asset.volumeM3} m³` : "-";

        row.innerHTML = `
            <td><strong>${asset.id || "-"}</strong></td>
            <td>${asset.treeType || "-"}</td>
            <td>${volumeText}</td>
            <td>${asset.owner || "-"}</td>
            <td><span class="badge-status ${statusClass}">${asset.status || "-"}</span></td>
            <td><span class="hash-code">${formatTimestamp(asset.lastUpdate)}</span></td>
        `;

        tbody.appendChild(row);
    });

    renderLedgerPagination();
}

function renderLedgerPagination() {
    const pagination = document.getElementById("ledgerPagination");

    if (!pagination) {
        return;
    }

    const totalItems = filteredLedgerAssets.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ledgerItemsPerPage));

    const startItem = totalItems === 0
        ? 0
        : (currentLedgerPage - 1) * ledgerItemsPerPage + 1;

    const endItem = Math.min(currentLedgerPage * ledgerItemsPerPage, totalItems);

    pagination.innerHTML = `
        <div>
            <strong>${startItem}-${endItem}</strong> von <strong>${totalItems}</strong> Einträgen
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
            <button
                type="button"
                class="btn-action log-btn"
                onclick="goToPreviousLedgerPage()"
                ${currentLedgerPage <= 1 ? "disabled" : ""}
            >
                Zurück
            </button>

            <span>
                Seite <strong>${currentLedgerPage}</strong> von <strong>${totalPages}</strong>
            </span>

            <button
                type="button"
                class="btn-action log-btn"
                onclick="goToNextLedgerPage()"
                ${currentLedgerPage >= totalPages ? "disabled" : ""}
            >
                Weiter
            </button>
        </div>
    `;
}

function goToPreviousLedgerPage() {
    if (currentLedgerPage > 1) {
        currentLedgerPage--;
        renderLedgerPage();
    }
}

function goToNextLedgerPage() {
    const totalPages = Math.ceil(filteredLedgerAssets.length / ledgerItemsPerPage);

    if (currentLedgerPage < totalPages) {
        currentLedgerPage++;
        renderLedgerPage();
    }
}
