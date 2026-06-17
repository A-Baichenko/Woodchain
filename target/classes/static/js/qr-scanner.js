/* =========================
   QR-Code / Scan / Kamera
   ========================= */

function generateWoodId() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const random = Math.floor(Math.random() * 999999)
        .toString()
        .padStart(6, "0");

    return `WOOD-${year}${month}${day}-${random}`;
}

function fillGeneratedWoodId(inputId) {
    const input = document.getElementById(inputId);

    if (!input) {
        showError("ID-Feld wurde nicht gefunden.", "Formularfehler");
        return;
    }

    input.value = generateWoodId();

    showInfo("Eine neue Holz-ID wurde automatisch erstellt.", "ID erstellt");
}

function simulateQrScan() {
    const demoPayload = JSON.stringify({
        id: generateWoodId(),
        treeType: "Fichte",
        volumeM3: "12.5"
    });

    const scannedValue = prompt(
        "QR-Scan simulieren:\n\nDer QR-Code enthält ID, Holzart und Volumen.",
        demoPayload
    );

    if (!scannedValue) {
        return;
    }

    applyScannedWoodData(scannedValue.trim());

    showInfo("QR-Scan wurde simuliert und das Formular ausgefüllt.", "QR-Simulation");
}

function showQrCodeForInput(inputId) {
    const input = document.getElementById(inputId);
    const treeTypeInput = document.getElementById("woodType");
    const volumeInput = document.getElementById("volume");

    const qrBox = document.getElementById("woodQrCode");
    const previewBox = document.getElementById("qrPreviewBox");
    const text = document.getElementById("woodQrText");

    if (!input || !qrBox || !previewBox) {
        showError("QR-Code-Anzeige wurde nicht gefunden.", "QR-Fehler");
        return;
    }

    const id = input.value.trim();
    const treeType = treeTypeInput ? treeTypeInput.value.trim() : "";
    const volumeM3 = volumeInput ? volumeInput.value.trim() : "";

    if (!id) {
        showWarning("Bitte zuerst eine Holz-ID erzeugen oder eingeben.", "ID fehlt");
        return;
    }

    if (!treeType || !volumeM3) {
        showWarning("Bitte Holzart und Volumen eingeben, damit diese Daten im QR-Code gespeichert werden.", "Daten fehlen");
        return;
    }

    if (typeof QRCode === "undefined") {
        showError("QR-Code-Bibliothek wurde nicht geladen. Prüfe die Internetverbindung oder lade die Seite neu.", "QR-Bibliothek fehlt");
        return;
    }

    const qrPayload = JSON.stringify({
        id: id,
        treeType: treeType,
        volumeM3: volumeM3
    });

    qrBox.innerHTML = "";

    new QRCode(qrBox, {
        text: qrPayload,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    previewBox.style.display = "block";

    if (text) {
        text.innerText = "QR-Inhalt: ID=" + id + ", Holzart=" + treeType + ", Volumen=" + volumeM3 + " m³";
    }

    showSuccess("QR-Code wurde aus den Formularwerten erstellt.", "QR-Code bereit");
}

function applyScannedWoodData(scannedText) {
    let id = scannedText;
    let treeType = null;
    let volumeM3 = null;

    try {
        const parsed = JSON.parse(scannedText);

        if (parsed.id) {
            id = parsed.id;
        }

        if (parsed.treeType) {
            treeType = parsed.treeType;
        }

        if (parsed.volumeM3) {
            volumeM3 = parsed.volumeM3;
        }
    } catch (error) {
        // Kein JSON, sondern nur reine ID.
    }

    const idInput = document.getElementById("logId");
    const treeTypeInput = document.getElementById("woodType");
    const volumeInput = document.getElementById("volume");

    if (idInput) {
        idInput.value = id;
    }

    if (treeTypeInput && treeType) {
        treeTypeInput.value = treeType;
    }

    if (volumeInput && volumeM3) {
        volumeInput.value = volumeM3;
    }
}

function extractWoodIdFromQr(scannedText) {
    try {
        const parsed = JSON.parse(scannedText);

        if (parsed.id) {
            return parsed.id;
        }
    } catch (error) {
        // Kein JSON, sondern normale ID.
    }

    return scannedText;
}

/* Registrierungsscanner */
let qrScannerStream = null;
let qrScannerAnimationId = null;

async function startQrCameraScanner() {
    const video = document.getElementById("qrScannerVideo");
    const canvas = document.getElementById("qrScannerCanvas");
    const status = document.getElementById("qrScannerStatus");

    if (!video || !canvas) {
        showError("Scanner-Video oder Canvas wurde nicht gefunden.", "Scanner-Fehler");
        return;
    }

    if (typeof jsQR === "undefined") {
        showError("jsQR-Bibliothek wurde nicht geladen. Prüfe die Internetverbindung oder nutze die Simulation.", "Scanner-Bibliothek fehlt");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Dein Browser unterstützt keinen Kamerazugriff.", "Kamera nicht unterstützt");
        return;
    }

    try {
        await stopQrCameraScanner();

        if (status) {
            status.innerText = "Kamera wird gestartet...";
        }

        qrScannerStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = qrScannerStream;
        video.style.display = "block";

        await video.play();

        if (status) {
            status.innerText = "Scanner aktiv. Halte den QR-Code vor die Kamera.";
        }

        showInfo("Kamera-Scanner wurde gestartet.", "Scanner aktiv");

        const context = canvas.getContext("2d");

        function scanFrame() {
            if (!qrScannerStream) {
                return;
            }

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height,
                    {
                        inversionAttempts: "attemptBoth"
                    }
                );

                if (code && code.data) {
                    applyScannedWoodData(code.data);

                    if (status) {
                        status.innerText = "QR-Code erkannt und Formular automatisch ausgefüllt.";
                    }

                    showSuccess("QR-Code erkannt und Formular automatisch ausgefüllt.", "QR-Code erkannt");

                    stopQrCameraScanner();
                    return;
                }
            }

            qrScannerAnimationId = requestAnimationFrame(scanFrame);
        }

        scanFrame();

    } catch (error) {
        console.error("Kamera konnte nicht gestartet werden:", error);

        if (status) {
            status.innerText = "Kamera konnte nicht gestartet werden.";
        }

        showWarning(
            "Kamera konnte nicht gestartet werden. Prüfe Kamerazugriff, Browser-Rechte oder schließe Teams/Discord/OBS.",
            "Scanner nicht verfügbar"
        );
    }
}

async function stopQrCameraScanner() {
    const video = document.getElementById("qrScannerVideo");
    const status = document.getElementById("qrScannerStatus");

    if (qrScannerAnimationId) {
        cancelAnimationFrame(qrScannerAnimationId);
        qrScannerAnimationId = null;
    }

    if (qrScannerStream) {
        qrScannerStream.getTracks().forEach(track => track.stop());
        qrScannerStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
        video.style.display = "none";
    }

    if (status) {
        status.innerText = "Scanner gestoppt.";
    }
}

/* Rückverfolgungsscanner */
let traceQrScannerStream = null;
let traceQrScannerAnimationId = null;

async function startTraceQrCameraScanner() {
    const video = document.getElementById("traceQrScannerVideo");
    const canvas = document.getElementById("traceQrScannerCanvas");
    const status = document.getElementById("traceQrScannerStatus");
    const searchInput = document.getElementById("searchLogId");

    if (!video || !canvas || !searchInput) {
        showError("Rückverfolgungs-Scanner wurde nicht gefunden.", "Scanner-Fehler");
        return;
    }

    if (typeof jsQR === "undefined") {
        showError("jsQR-Bibliothek wurde nicht geladen. Bitte Seite mit Strg + F5 neu laden.", "Scanner-Bibliothek fehlt");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Dein Browser unterstützt keinen Kamerazugriff.", "Kamera nicht unterstützt");
        return;
    }

    try {
        await stopTraceQrCameraScanner();

        if (status) {
            status.innerText = "Kamera wird gestartet...";
        }

        traceQrScannerStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = traceQrScannerStream;
        video.style.display = "block";

        await video.play();

        if (status) {
            status.innerText = "Scanner aktiv. Halte den QR-Code vor die Kamera.";
        }

        showInfo("Rückverfolgungs-Scanner wurde gestartet.", "Scanner aktiv");

        const context = canvas.getContext("2d");

        function scanFrame() {
            if (!traceQrScannerStream) {
                return;
            }

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height,
                    {
                        inversionAttempts: "attemptBoth"
                    }
                );

                if (code && code.data) {
                    const woodId = extractWoodIdFromQr(code.data);

                    searchInput.value = woodId;

                    if (status) {
                        status.innerText = "QR-Code erkannt: " + woodId;
                    }

                    showSuccess("QR-Code erkannt: " + woodId, "Rückverfolgung");

                    stopTraceQrCameraScanner();
                    trackWoodHistory();

                    return;
                }
            }

            traceQrScannerAnimationId = requestAnimationFrame(scanFrame);
        }

        scanFrame();

    } catch (error) {
        console.error("Rückverfolgungs-Kamera konnte nicht gestartet werden:", error);

        if (status) {
            status.innerText = "Kamera konnte nicht gestartet werden.";
        }

        showWarning(
            "Kamera konnte nicht gestartet werden. Prüfe Kamerazugriff, Browser-Rechte oder schließe Teams/Discord/OBS.",
            "Scanner nicht verfügbar"
        );
    }
}

async function stopTraceQrCameraScanner() {
    const video = document.getElementById("traceQrScannerVideo");
    const status = document.getElementById("traceQrScannerStatus");

    if (traceQrScannerAnimationId) {
        cancelAnimationFrame(traceQrScannerAnimationId);
        traceQrScannerAnimationId = null;
    }

    if (traceQrScannerStream) {
        traceQrScannerStream.getTracks().forEach(track => track.stop());
        traceQrScannerStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
        video.style.display = "none";
    }

    if (status) {
        status.innerText = "Rückverfolgungs-Scanner gestoppt.";
    }
}

/* =========================
   Sägewerk: Versand-QR-Scanner
   ========================= */

let sawmillShippingQrStream = null;
let sawmillShippingQrAnimationId = null;

async function loadProcessedSawmillOrderByInput() {
    const input = document.getElementById("shippingLogId");

    if (!input || !input.value.trim()) {
        showWarning("Bitte eine Holz-ID eingeben oder per QR-Code scannen.", "ID fehlt");
        return null;
    }

    const id = input.value.trim();

    try {
        const response = await fetch(`/api/wood/${encodeURIComponent(id)}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            currentSawmillShippingWood = null;
            showWarning("Diese Holz-ID wurde nicht im Ledger gefunden.", "Nicht gefunden");
            return null;
        }

        const wood = await response.json();

        if (wood.status !== "PROCESSED") {
            showWarning(
                "Diese Holzcharge kann noch nicht versendet werden. Aktueller Status: " + wood.status,
                "Status nicht passend"
            );
            return null;
        }

        if (wood.logisticsToRetail || wood.retail) {
            showWarning(
                "Für diese Holzcharge wurde bereits ein Versand geplant.",
                "Versand bereits geplant"
            );
            return null;
        }

        const profile = await getCurrentUserProfile();

        if (!isCurrentSawmillPartner(wood.sawmill, profile)) {
            showWarning(
                "Diese Holzcharge ist für ein anderes Sägewerk geplant: " + (wood.sawmill || "-"),
                "Nicht zuständig"
            );
            return null;
        }

        currentSawmillShippingWood = wood;
        renderSawmillShippingPreview(wood);

        const select = document.getElementById("processedSawmillOrdersSelect");

        if (select) {
            select.value = wood.id;
        }

        showSuccess("Fertige Holzcharge wurde geladen. Du kannst jetzt die Versandplanung speichern.", "Holzcharge geladen");

        return wood;

    } catch (error) {
        console.error("Fehler beim Laden der fertigen Holzcharge:", error);
        showError("Technischer Fehler beim Laden der fertigen Holzcharge.", "Ladefehler");
        return null;
    }
}

async function startSawmillShippingQrScanner() {
    const video = document.getElementById("shippingQrScannerVideo");
    const canvas = document.getElementById("shippingQrScannerCanvas");
    const status = document.getElementById("shippingQrScannerStatus");
    const input = document.getElementById("shippingLogId");

    if (!video || !canvas || !input) {
        showError("Versand-Scanner wurde nicht gefunden.", "Scanner-Fehler");
        return;
    }

    if (typeof jsQR === "undefined") {
        showError("jsQR-Bibliothek wurde nicht geladen. Bitte Seite mit Strg + F5 neu laden.", "Scanner-Bibliothek fehlt");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Dein Browser unterstützt keinen Kamerazugriff.", "Kamera nicht unterstützt");
        return;
    }

    try {
        await stopSawmillShippingQrScanner();

        if (status) {
            status.innerText = "Versand-Scanner wird gestartet...";
        }

        sawmillShippingQrStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = sawmillShippingQrStream;
        video.style.display = "block";

        await video.play();

        if (status) {
            status.innerText = "Versand-Scanner aktiv. Halte den QR-Code vor die Kamera.";
        }

        showInfo("Versand-Scanner wurde gestartet.", "Scanner aktiv");

        const context = canvas.getContext("2d");

        function scanFrame() {
            if (!sawmillShippingQrStream) {
                return;
            }

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(
                    imageData.data,
                    imageData.width,
                    imageData.height,
                    {
                        inversionAttempts: "attemptBoth"
                    }
                );

                if (code && code.data) {
                    const woodId = extractWoodIdFromQr(code.data);

                    input.value = woodId;

                    if (status) {
                        status.innerText = "QR-Code erkannt: " + woodId;
                    }

                    showSuccess("QR-Code erkannt: " + woodId, "Versand-QR erkannt");

                    stopSawmillShippingQrScanner();
                    loadProcessedSawmillOrderByInput();

                    return;
                }
            }

            sawmillShippingQrAnimationId = requestAnimationFrame(scanFrame);
        }

        scanFrame();

    } catch (error) {
        console.error("Versand-Kamera konnte nicht gestartet werden:", error);

        if (status) {
            status.innerText = "Versand-Scanner konnte nicht gestartet werden.";
        }

        showWarning(
            "Kamera konnte nicht gestartet werden. Prüfe Browser-Rechte oder ob die Kamera bereits verwendet wird.",
            "Scanner nicht verfügbar"
        );
    }
}

async function stopSawmillShippingQrScanner() {
    const video = document.getElementById("shippingQrScannerVideo");
    const status = document.getElementById("shippingQrScannerStatus");

    if (sawmillShippingQrAnimationId) {
        cancelAnimationFrame(sawmillShippingQrAnimationId);
        sawmillShippingQrAnimationId = null;
    }

    if (sawmillShippingQrStream) {
        sawmillShippingQrStream.getTracks().forEach(track => track.stop());
        sawmillShippingQrStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
        video.style.display = "none";
    }

    if (status) {
        status.innerText = "Versand-Scanner gestoppt.";
    }
}
