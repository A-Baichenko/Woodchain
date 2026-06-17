/* =========================
   Login / Logout / Zugriff
   ========================= */

async function performLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        showWarning("Bitte Benutzername und Passwort eingeben.", "Eingaben fehlen");
        return;
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            showError("Anmeldung fehlgeschlagen. Bitte prüfe Benutzername und Passwort.", "Login fehlgeschlagen");
            return;
        }

        const user = await response.json();

        localStorage.setItem("username", user.username);
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("displayName", user.displayName || "");
        localStorage.setItem("location", user.location || "");
        localStorage.setItem("address", user.address || "");
        localStorage.setItem("latitude", user.latitude || "");
        localStorage.setItem("longitude", user.longitude || "");
        localStorage.setItem("token", user.token);

        showSuccess("Du wurdest erfolgreich angemeldet.", "Willkommen");

        setTimeout(() => {
            switch (user.role) {
                case "ADMIN":
                    window.location.href = "admin.html";
                    break;
                case "FOERSTER":
                    window.location.href = "foerster.html";
                    break;
                case "LOGISTIK":
                    window.location.href = "logistik.html";
                    break;
                case "SAEGEWERK":
                    window.location.href = "saegewerk.html";
                    break;
                case "HANDEL":
                    window.location.href = "handel.html";
                    break;
                default:
                    showError("Unbekannte Rolle: " + user.role, "Rollenfehler");
                    logout();
            }
        }, 700);

    } catch (error) {
        console.error("Login-Fehler:", error);
        showError("Login konnte technisch nicht ausgeführt werden.", "Login-Fehler");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

async function checkAccess(allowedRole) {
    const token = localStorage.getItem("token");
    let currentRole = localStorage.getItem("userRole");

    if (!token) {
        window.location.href = "index.html";
        return false;
    }

    if (!currentRole) {
        try {
            const response = await fetch("/api/auth/me", {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const user = await response.json();

                localStorage.setItem("username", user.username || "");
                localStorage.setItem("userRole", user.role || "");
                localStorage.setItem("displayName", user.displayName || "");
                localStorage.setItem("location", user.location || "");
                localStorage.setItem("address", user.address || "");
                localStorage.setItem("latitude", user.latitude || "");
                localStorage.setItem("longitude", user.longitude || "");

                currentRole = user.role;
            }
        } catch (error) {
            console.error("Benutzer konnte nicht geladen werden:", error);
        }
    }

    currentRole = String(currentRole || "").trim().toUpperCase();
    allowedRole = String(allowedRole || "").trim().toUpperCase();

    if (!currentRole) {
        localStorage.clear();
        window.location.href = "index.html";
        return false;
    }

    if (currentRole === "ADMIN") {
        return true;
    }

    if (currentRole !== allowedRole) {
        showError(
            "Du hast keine Berechtigung für diese Seite. Deine Rolle ist: " + currentRole,
            "Zugriff verweigert"
        );

        setTimeout(() => {
            redirectByRole(currentRole);
        }, 1200);

        return false;
    }

    return true;
}

function redirectByRole(role) {
    role = String(role || "").trim().toUpperCase();

    if (role === "ADMIN") {
        window.location.href = "admin.html";
    } else if (role === "FOERSTER") {
        window.location.href = "foerster.html";
    } else if (role === "LOGISTIK") {
        window.location.href = "logistik.html";
    } else if (role === "SAEGEWERK") {
        window.location.href = "saegewerk.html";
    } else if (role === "HANDEL") {
        window.location.href = "handel.html";
    } else {
        window.location.href = "index.html";
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        return "-";
    }

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
        return timestamp;
    }

    return date.toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
