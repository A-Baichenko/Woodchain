/* =========================
   Admin: Geocoding / Accounts
   ========================= */

function buildAdminFullAddress() {
    const street = document.getElementById("newStreet")?.value.trim() || "";
    const postalCode = document.getElementById("newPostalCode")?.value.trim() || "";
    const city = document.getElementById("newCity")?.value.trim() || "";
    const country = document.getElementById("newCountry")?.value.trim() || "";

    const postalAndCity = [postalCode, city]
        .filter(value => value !== "")
        .join(" ");

    const fullAddress = [street, postalAndCity, country]
        .filter(value => value !== "")
        .join(", ");

    const preview = document.getElementById("fullAddressPreview");
    const countryPreview = document.getElementById("countryPreview");
    const hiddenLocation = document.getElementById("newLocation");
    const hiddenAddress = document.getElementById("newAddress");

    if (preview) {
        preview.innerText = fullAddress || "Noch keine Adresse eingegeben.";
    }

    if (countryPreview) {
        countryPreview.value = country || "";
    }

    if (hiddenLocation) {
        hiddenLocation.value = city;
    }

    if (hiddenAddress) {
        hiddenAddress.value = fullAddress;
    }

    return {
        street,
        postalCode,
        city,
        country,
        fullAddress
    };
}

function setupAdminAddressPreview() {
    const fields = [
        "newStreet",
        "newPostalCode",
        "newCity",
        "newCountry"
    ];

    fields.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener("input", buildAdminFullAddress);
        }
    });

    buildAdminFullAddress();
}

document.addEventListener("DOMContentLoaded", () => {
    setupAdminAddressPreview();
});

async function geocodeAddressForAdmin() {
    const latitudeInput = document.getElementById("newLatitude");
    const longitudeInput = document.getElementById("newLongitude");
    const statusElement = document.getElementById("geocodeStatus");

    const addressData = buildAdminFullAddress();

    if (!addressData.fullAddress) {
        showWarning("Bitte Straße, Ort und Land eingeben.", "Adresse fehlt");
        return null;
    }

    if (!addressData.city) {
        showWarning("Bitte einen Ort eingeben.", "Ort fehlt");
        return null;
    }

    if (!addressData.country) {
        showWarning("Bitte ein Land eingeben.", "Land fehlt");
        return null;
    }

    if (statusElement) {
        statusElement.innerText = "Adresse wird automatisch umgewandelt...";
    }

    try {
        const response = await fetch(
            "/api/locations/geocode?address=" + encodeURIComponent(addressData.fullAddress),
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error("Geocoding Fehler:", text);

            if (statusElement) {
                statusElement.innerText = "Adresse konnte nicht automatisch umgewandelt werden.";
            }

            showError("Adresse konnte nicht automatisch in Koordinaten umgewandelt werden.", "Geocoding fehlgeschlagen");
            return null;
        }

        const result = await response.json();

        if (latitudeInput) {
            latitudeInput.value = result.latitude;
        }

        if (longitudeInput) {
            longitudeInput.value = result.longitude;
        }

        const hiddenAddress = document.getElementById("newAddress");
        const hiddenLocation = document.getElementById("newLocation");

        if (hiddenAddress) {
            hiddenAddress.value = result.resolvedAddress || addressData.fullAddress;
        }

        if (hiddenLocation) {
            hiddenLocation.value = addressData.city;
        }

        if (statusElement) {
            statusElement.innerText = "Koordinaten erfolgreich geladen.";
        }

        showSuccess("Adresse wurde erfolgreich in Koordinaten umgewandelt.", "Koordinaten geladen");

        return {
            inputAddress: addressData.fullAddress,
            resolvedAddress: result.resolvedAddress || addressData.fullAddress,
            latitude: result.latitude,
            longitude: result.longitude,
            city: addressData.city,
            country: addressData.country
        };

    } catch (error) {
        console.error("Geocoding Fehler:", error);

        if (statusElement) {
            statusElement.innerText = "Technischer Fehler beim Umwandeln der Adresse.";
        }

        showError("Technischer Fehler beim Umwandeln der Adresse.", "Geocoding Fehler");
        return null;
    }
}

async function createAccountAsAdmin() {
    const displayName = document.getElementById("newDisplayName").value.trim();
    const username = document.getElementById("newUsername").value.trim();
    const role = document.getElementById("newRole").value;
    const password = document.getElementById("newPassword").value;
    const passwordRepeat = document.getElementById("newPasswordRepeat").value;

    const addressData = buildAdminFullAddress();

    const latitude = document.getElementById("newLatitude").value.trim();
    const longitude = document.getElementById("newLongitude").value.trim();

    if (!displayName || !username || !role || !password || !passwordRepeat) {
        showWarning("Bitte alle Benutzerfelder ausfüllen.", "Eingaben fehlen");
        return;
    }

    if (!addressData.street || !addressData.city || !addressData.country) {
        showWarning("Bitte Straße, Ort und Land ausfüllen.", "Adresse unvollständig");
        return;
    }

    if (password !== passwordRepeat) {
        showError("Die Passwörter stimmen nicht überein.", "Passwortfehler");
        return;
    }

    if (password.length < 4) {
        showWarning("Das Passwort muss mindestens 4 Zeichen lang sein.", "Passwort zu kurz");
        return;
    }

    let finalLatitude = latitude;
    let finalLongitude = longitude;
    let finalAddress = addressData.fullAddress;

    if (!finalLatitude || !finalLongitude) {
        const geocodeResult = await geocodeAddressForAdmin();

        if (!geocodeResult) {
            showError("Benutzer kann nicht erstellt werden, weil keine Koordinaten vorhanden sind.", "Koordinaten fehlen");
            return;
        }

        finalLatitude = geocodeResult.latitude;
        finalLongitude = geocodeResult.longitude;
        finalAddress = geocodeResult.resolvedAddress || addressData.fullAddress;
    }

    try {
        const response = await fetch("/api/auth/users", {
            method: "POST",
            headers: getJsonAuthHeaders(),
            body: JSON.stringify({
                username: username,
                password: password,
                role: role,
                displayName: displayName,
                location: addressData.city,
                address: finalAddress,
                latitude: Number(finalLatitude),
                longitude: Number(finalLongitude)
            })
        });

        if (!response.ok) {
            const text = await response.text();
            showError("Benutzer konnte nicht erstellt werden. " + text, "Fehler");
            return;
        }

        showSuccess("Benutzer wurde erfolgreich erstellt.", "Benutzer erstellt");

        document.getElementById("newDisplayName").value = "";
        document.getElementById("newUsername").value = "";
        document.getElementById("newRole").value = "FOERSTER";
        document.getElementById("newStreet").value = "";
        document.getElementById("newPostalCode").value = "";
        document.getElementById("newCity").value = "";
        document.getElementById("newCountry").value = "";
        document.getElementById("newLocation").value = "";
        document.getElementById("newAddress").value = "";
        document.getElementById("newLatitude").value = "";
        document.getElementById("newLongitude").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("newPasswordRepeat").value = "";

        const statusElement = document.getElementById("geocodeStatus");

        if (statusElement) {
            statusElement.innerText = "Noch keine Koordinaten geladen.";
        }

        buildAdminFullAddress();

    } catch (error) {
        console.error("Benutzer konnte nicht erstellt werden:", error);
        showError("Technischer Fehler beim Erstellen des Benutzers.", "Fehler");
    }
}
