/* =========================
   User-Profil / Holz erstellen
   ========================= */

async function getCurrentUserProfile() {
    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            return null;
        }

        const user = await response.json();

        localStorage.setItem("username", user.username || "");
        localStorage.setItem("userRole", user.role || "");
        localStorage.setItem("displayName", user.displayName || "");
        localStorage.setItem("location", user.location || "");
        localStorage.setItem("address", user.address || "");
        localStorage.setItem("latitude", user.latitude || "");
        localStorage.setItem("longitude", user.longitude || "");

        return user;

    } catch (error) {
        console.error("Benutzerprofil konnte nicht geladen werden:", error);
        return null;
    }
}

async function getOriginCountryAutomatically(profile) {
    let latitude = profile?.latitude || localStorage.getItem("latitude");
    let longitude = profile?.longitude || localStorage.getItem("longitude");

    if (!latitude || !longitude) {
        showWarning(
            "Für deinen Account sind keine Koordinaten gespeichert. Das Land kann nicht automatisch ermittelt werden.",
            "Koordinaten fehlen"
        );

        return "Unknown";
    }

    try {
        const response = await fetch(
            `/api/locations/reverse-country?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error("Land konnte nicht automatisch ermittelt werden:", text);
            return "Unknown";
        }

        const result = await response.json();

        if (!result.country || result.country.trim() === "") {
            return "Unknown";
        }

        return result.country;

    } catch (error) {
        console.error("Fehler beim automatischen Ermitteln des Landes:", error);
        return "Unknown";
    }
}

async function createWoodFromForm(formIds) {
    const id = document.getElementById(formIds.id).value.trim();
    const treeType = document.getElementById(formIds.treeType).value.trim();

    let volumeM3 = "0";

    if (formIds.volumeM3 && document.getElementById(formIds.volumeM3)) {
        volumeM3 = document.getElementById(formIds.volumeM3).value.trim();
    }

    if (!id || !treeType || !volumeM3) {
        showWarning("Bitte ID, Holzart und Volumen ausfüllen.", "Eingaben fehlen");
        return false;
    }

    let displayName = localStorage.getItem("displayName");
    let username = localStorage.getItem("username");
    let userLocation = localStorage.getItem("location");
    let userAddress = localStorage.getItem("address");

    const profile = await getCurrentUserProfile();

    if (profile) {
        displayName = profile.displayName || displayName;
        username = profile.username || username;
        userLocation = profile.location || userLocation;
        userAddress = profile.address || userAddress;
    }

    let origin = formIds.origin || "Unknown";

    if (origin === "AUTO_FROM_ACCOUNT") {
        origin = await getOriginCountryAutomatically(profile);
    }

    const owner =
        formIds.owner ||
        "Forstamt " + (
            displayName ||
            username ||
            "Unbekannt"
        );

    const location =
        formIds.location ||
        userLocation ||
        userAddress ||
        "Unbekannter Standort";

    const params = new URLSearchParams({
        id: id,
        treeType: treeType,
        volumeM3: volumeM3,
        origin: origin,
        owner: owner,
        location: location
    });

    try {
        const response = await fetch("/api/wood?" + params.toString(), {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showSuccess("Die Holzcharge wurde erfolgreich in Hyperledger Fabric gespeichert.", "Holz gespeichert");
            await loadGlobalLedger();
            return true;
        }

        const text = await response.text();
        showError("Die Holzcharge konnte nicht gespeichert werden. " + text, "Speichern fehlgeschlagen");
        return false;

    } catch (error) {
        console.error("Fehler beim Registrieren:", error);
        showError("Es gab ein technisches Problem beim Speichern.", "Blockchain-Fehler");
        return false;
    }
}

/* =========================
   Partner-Auswahl / Rollen-Dropdowns
   ========================= */

async function loadUsersByRole(role) {
    try {
        const response = await fetch(`/api/auth/users/by-role/${encodeURIComponent(role)}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Benutzer nach Rolle konnten nicht geladen werden:", text);
            showError("Benutzer für Rolle " + role + " konnten nicht geladen werden.", "Partnerfehler");
            return [];
        }

        return await response.json();

    } catch (error) {
        console.error("Fehler beim Laden der Benutzer nach Rolle:", error);
        showError("Technischer Fehler beim Laden der Partner.", "Partnerfehler");
        return [];
    }
}

async function loadUsersByRoleIntoSelect(role, selectId, placeholderText) {
    const select = document.getElementById(selectId);

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">${placeholderText}</option>`;

    const users = await loadUsersByRole(role);

    if (!users || users.length === 0) {
        select.innerHTML = `<option value="">Keine Benutzer gefunden</option>`;
        return;
    }

    users.forEach(user => {
        const option = document.createElement("option");

        option.value = user.id;
        option.dataset.username = user.username || "";
        option.dataset.displayName = user.displayName || user.username || "";
        option.dataset.role = user.role || "";
        option.dataset.location = user.location || "";
        option.dataset.address = user.address || "";
        option.dataset.latitude = user.latitude || "";
        option.dataset.longitude = user.longitude || "";

        const name = user.displayName || user.username || "Unbekannt";
        const location = user.location || user.address || "kein Standort";

        option.textContent = `${name} - ${location}`;

        select.appendChild(option);
    });
}

function getSelectedPartner(selectId) {
    const select = document.getElementById(selectId);

    if (!select || !select.value) {
        return null;
    }

    const option = select.options[select.selectedIndex];

    return {
        id: option.value,
        username: option.dataset.username || "",
        displayName: option.dataset.displayName || "",
        role: option.dataset.role || "",
        location: option.dataset.location || "",
        address: option.dataset.address || "",
        latitude: option.dataset.latitude || "",
        longitude: option.dataset.longitude || ""
    };
}

function setupPartnerPreview(selectId, previewId) {
    const select = document.getElementById(selectId);
    const preview = document.getElementById(previewId);

    if (!select || !preview) {
        return;
    }

    const updatePreview = () => {
        const partner = getSelectedPartner(selectId);

        if (!partner) {
            preview.innerText = "Noch nicht ausgewählt.";
            return;
        }

        preview.innerText =
            `${partner.displayName || partner.username} | Standort: ${partner.location || "-"} | Adresse: ${partner.address || "-"}`;
    };

    select.removeEventListener("change", updatePreview);
    select.addEventListener("change", updatePreview);

    updatePreview();
}

async function createWoodWithPlanFromForm(formIds) {
    const id = document.getElementById(formIds.id).value.trim();
    const treeType = document.getElementById(formIds.treeType).value.trim();

    let volumeM3 = "0";

    if (formIds.volumeM3 && document.getElementById(formIds.volumeM3)) {
        volumeM3 = document.getElementById(formIds.volumeM3).value.trim();
    }

    if (!id || !treeType || !volumeM3) {
        showWarning("Bitte ID, Holzart und Volumen ausfüllen.", "Eingaben fehlen");
        return false;
    }

    const logisticsPartner = getSelectedPartner(formIds.logisticsSelectId);
    const sawmillPartner = getSelectedPartner(formIds.sawmillSelectId);

    if (!logisticsPartner) {
        showWarning("Bitte einen Logistikbetrieb auswählen.", "Logistik fehlt");
        return false;
    }

    if (!sawmillPartner) {
        showWarning("Bitte ein Ziel-Sägewerk auswählen.", "Sägewerk fehlt");
        return false;
    }

    let displayName = localStorage.getItem("displayName");
    let username = localStorage.getItem("username");
    let userLocation = localStorage.getItem("location");
    let userAddress = localStorage.getItem("address");

    const profile = await getCurrentUserProfile();

    if (profile) {
        displayName = profile.displayName || displayName;
        username = profile.username || username;
        userLocation = profile.location || userLocation;
        userAddress = profile.address || userAddress;
    }

    let origin = formIds.origin || "Unknown";

    if (origin === "AUTO_FROM_ACCOUNT") {
        origin = await getOriginCountryAutomatically(profile);
    }

    const owner =
        "Forstamt " + (
            displayName ||
            username ||
            "Unbekannt"
        );

    const location =
        userLocation ||
        userAddress ||
        "Unbekannter Standort";

    const logisticsName =
        logisticsPartner.displayName ||
        logisticsPartner.username ||
        "Unbekannte Logistik";

    const sawmillName =
        sawmillPartner.displayName ||
        sawmillPartner.username ||
        "Unbekanntes Sägewerk";

    const params = new URLSearchParams({
        id: id,
        treeType: treeType,
        volumeM3: volumeM3,
        origin: origin,
        owner: owner,
        location: location,
        logisticsToSawmill: logisticsName,
        sawmill: sawmillName
    });

    try {
        const response = await fetch("/api/wood/with-plan?" + params.toString(), {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showSuccess(
                "Holzcharge wurde mit Logistik- und Sägewerk-Planung in der Blockchain gespeichert.",
                "Holz gespeichert"
            );

            await loadGlobalLedger();
            return true;
        }

        const text = await response.text();
        showError("Die Holzcharge konnte nicht gespeichert werden. " + text, "Speichern fehlgeschlagen");
        return false;

    } catch (error) {
        console.error("Fehler beim Registrieren mit Planung:", error);
        showError("Es gab ein technisches Problem beim Speichern.", "Blockchain-Fehler");
        return false;
    }
}
