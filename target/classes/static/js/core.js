function getToken() {
    return localStorage.getItem("token");
}

function getAuthHeaders() {
    return {
        "Authorization": "Bearer " + getToken()
    };
}

function getJsonAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}

/* =========================
   Premium Toast Notifications
   ========================= */

function showToast(message, type = "success", title = "Erfolg", duration = 3500) {
    let container = document.getElementById("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    let icon = "✅";

    if (type === "error") icon = "❌";
    if (type === "info") icon = "ℹ️";
    if (type === "warning") icon = "⚠️";

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>

        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>

        <button class="toast-close" type="button" aria-label="Schließen">&times;</button>

        <div class="toast-progress">
            <span style="animation-duration: ${duration}ms;"></span>
        </div>
    `;

    container.appendChild(toast);

    const removeToast = () => {
        toast.classList.add("removing");

        setTimeout(() => {
            toast.remove();
        }, 280);
    };

    const closeBtn = toast.querySelector(".toast-close");

    if (closeBtn) {
        closeBtn.addEventListener("click", removeToast);
    }

    setTimeout(removeToast, duration);
}

function showSuccess(message, title = "Erfolgreich") {
    showToast(message, "success", title, 3200);
}

function showError(message, title = "Fehler") {
    showToast(message, "error", title, 4200);
}

function showInfo(message, title = "Information") {
    showToast(message, "info", title, 3200);
}

function showWarning(message, title = "Achtung") {
    showToast(message, "warning", title, 3800);
}

/* =========================
   Browser alert() ersetzen
   ========================= */

window.alert = function(message) {
    const text = String(message || "");

    const lowerText = text.toLowerCase();

    if (
        lowerText.includes("fehler") ||
        lowerText.includes("failed") ||
        lowerText.includes("nicht") ||
        lowerText.includes("konnte") ||
        lowerText.includes("verweigert")
    ) {
        showError(text, "Fehler");
        return;
    }

    if (
        lowerText.includes("achtung") ||
        lowerText.includes("prüfe") ||
        lowerText.includes("bitte") ||
        lowerText.includes("hinweis")
    ) {
        showWarning(text, "Hinweis");
        return;
    }

    showSuccess(text, "Erfolgreich");
};
