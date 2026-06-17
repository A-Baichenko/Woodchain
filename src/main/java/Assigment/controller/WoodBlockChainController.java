package Assigment.controller;

import Assigment.bitcoin.FabricGatewayService;
import Assigment.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wood")
public class WoodBlockChainController {

    private final FabricGatewayService fabricGatewayService;
    private final AuthService authService;

    public WoodBlockChainController(
            FabricGatewayService fabricGatewayService,
            AuthService authService
    ) {
        this.fabricGatewayService = fabricGatewayService;
        this.authService = authService;
    }

    /*
     * Lädt alle Holzchargen aus der Blockchain.
     *
     * Wird z.B. für das globale Ledger / die Übersichtstabelle genutzt.
     * Jeder angemeldete Benutzer darf die Blockchain-Daten lesen.
     */
    @GetMapping
    public String getAllWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) throws Exception {
        authService.requireLogin(authorizationHeader);
        return fabricGatewayService.getAllWood();
    }

    /*
     * Lädt eine einzelne Holzcharge anhand ihrer ID.
     *
     * Wird z.B. für Detailansichten oder QR-Code-Rückverfolgung genutzt.
     */
    @GetMapping("/{id}")
    public String readWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id
    ) throws Exception {
        authService.requireLogin(authorizationHeader);
        return fabricGatewayService.readWood(id);
    }

    /*
     * Alter Erstellungs-Endpunkt ohne geplante Lieferkette.
     *
     * Kann später gelöscht werden, wenn das Frontend nur noch /with-plan nutzt.
     */
    @Deprecated
    @PostMapping
    public String createWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam String id,
            @RequestParam String treeType,
            @RequestParam String volumeM3,
            @RequestParam String origin,
            @RequestParam String owner,
            @RequestParam String location
    ) throws Exception {
        authService.requireRole(authorizationHeader, "FOERSTER");

        return fabricGatewayService.createWood(
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location
        );
    }

    /*
     * Förster erstellt eine neue Holzcharge mit Lieferkettenplanung.
     *
     * Ablauf:
     * 1. Holzcharge wird in der Blockchain erstellt.
     * 2. Logistikbetrieb zum Sägewerk wird gespeichert.
     * 3. Ziel-Sägewerk wird gespeichert.
     */
    @PostMapping("/with-plan")
    public String createWoodWithPlan(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam String id,
            @RequestParam String treeType,
            @RequestParam String volumeM3,
            @RequestParam String origin,
            @RequestParam String owner,
            @RequestParam String location,
            @RequestParam String logisticsToSawmill,
            @RequestParam String sawmill
    ) throws Exception {
        authService.requireRole(authorizationHeader, "FOERSTER");

        return fabricGatewayService.createWoodWithPlan(
                id,
                treeType,
                volumeM3,
                origin,
                owner,
                location,
                logisticsToSawmill,
                sawmill
        );
    }

    /*
     * Alter allgemeiner Transport-Endpunkt.
     *
     * Kann später gelöscht werden, wenn das Frontend nur noch die konkreten
     * Transport-Endpunkte nutzt:
     * - /transport-to-sawmill
     * - /transport-to-retail
     */
    @Deprecated
    @PostMapping("/{id}/transport")
    public String transportWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String newOwner,
            @RequestParam String newLocation
    ) throws Exception {
        authService.requireRole(authorizationHeader, "LOGISTIK");

        return fabricGatewayService.transportWood(
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Logistik bestätigt den Transport vom Wald / Förster zum Sägewerk.
     *
     * Dadurch wechselt die Holzcharge in der Blockchain z.B. auf:
     * IN_TRANSPORT_TO_SAWMILL
     */
    @PostMapping("/{id}/transport-to-sawmill")
    public String transportToSawmill(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String logisticsOwner,
            @RequestParam String logisticsLocation
    ) throws Exception {
        authService.requireRole(authorizationHeader, "LOGISTIK");

        return fabricGatewayService.transportToSawmill(
                id,
                logisticsOwner,
                logisticsLocation
        );
    }

    /*
     * Sägewerk bestätigt den Wareneingang und verarbeitet die Holzcharge.
     *
     * Wichtig:
     * Diese Methode ist nicht unbedingt unnötig.
     * Dein aktueller Ablauf nutzt sie wahrscheinlich für:
     * IN_TRANSPORT_TO_SAWMILL -> PROCESSED
     */
    @PostMapping("/{id}/process")
    public String processWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String newOwner,
            @RequestParam String newLocation
    ) throws Exception {
        authService.requireRole(authorizationHeader, "SAEGEWERK");

        return fabricGatewayService.processWood(
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Sägewerk plant nach der Verarbeitung den Versand zum Händler.
     *
     * Dabei werden gespeichert:
     * - Sägewerk als aktueller Besitzer / Standort
     * - Logistikbetrieb zum Händler
     * - Ziel-Händler
     */
    @PostMapping("/{id}/process-with-retail-plan")
    public String processWoodWithRetailPlan(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String sawmillOwner,
            @RequestParam String sawmillLocation,
            @RequestParam String logisticsToRetail,
            @RequestParam String retail
    ) throws Exception {
        authService.requireRole(authorizationHeader, "SAEGEWERK");

        return fabricGatewayService.processWoodWithRetailPlan(
                id,
                sawmillOwner,
                sawmillLocation,
                logisticsToRetail,
                retail
        );
    }

    /*
     * Logistik bestätigt den Transport vom Sägewerk zum Händler.
     *
     * Dadurch wechselt die Holzcharge z.B. auf:
     * IN_TRANSPORT_TO_RETAIL
     */
    @PostMapping("/{id}/transport-to-retail")
    public String transportToRetail(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String logisticsOwner,
            @RequestParam String logisticsLocation
    ) throws Exception {
        authService.requireRole(authorizationHeader, "LOGISTIK");

        return fabricGatewayService.transportToRetail(
                id,
                logisticsOwner,
                logisticsLocation
        );
    }

    /*
     * Händler bestätigt den Wareneingang / Verkauf.
     *
     * Danach ist die Lieferkette abgeschlossen und der Status ist z.B. SOLD.
     */
    @PostMapping("/{id}/sell")
    public String sellWood(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id,
            @RequestParam String newOwner,
            @RequestParam String newLocation
    ) throws Exception {
        authService.requireRole(authorizationHeader, "HANDEL");

        return fabricGatewayService.sellWood(
                id,
                newOwner,
                newLocation
        );
    }

    /*
     * Lädt die komplette Blockchain-Historie einer Holzcharge.
     *
     * Wird für Rückverfolgung, QR-Code-Scan und Kartenansicht genutzt.
     */
    @GetMapping("/{id}/history")
    public String getWoodHistory(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable String id
    ) throws Exception {
        authService.requireLogin(authorizationHeader);
        return fabricGatewayService.getWoodHistory(id);
    }
}