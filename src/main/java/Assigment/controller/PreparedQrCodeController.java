package Assigment.controller;

import Assigment.model.PreparedQrCode;
import Assigment.model.User;
import Assigment.repository.PreparedQrCodeRepository;
import Assigment.repository.UserRepository;
import Assigment.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/qrcodes")
public class PreparedQrCodeController {

    private static final String TOKEN_PREFIX = "demo-token-";

    private final PreparedQrCodeRepository preparedQrCodeRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public PreparedQrCodeController(
            PreparedQrCodeRepository preparedQrCodeRepository,
            UserRepository userRepository,
            AuthService authService
    ) {
        this.preparedQrCodeRepository = preparedQrCodeRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    /*
     * Lädt alle vorbereiteten QR-Codes des aktuell angemeldeten Benutzers.
     *
     * Wichtig:
     * Jeder Benutzer sieht nur seine eigenen QR-Codes.
     * Sortierung: neueste QR-Codes zuerst.
     */
    @GetMapping
    public List<PreparedQrCodeResponse> getMyQrCodes(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        authService.requireLogin(authorizationHeader);

        User user = getUserFromAuthorizationHeader(authorizationHeader);

        return preparedQrCodeRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /*
     * Erstellt einen vorbereiteten QR-Code.
     *
     * Der QR-Code ist noch keine Blockchain-Holzcharge.
     * Er speichert nur vorbereitete Daten wie Holz-ID, Holzart und Volumen.
     * Später kann der Förster diese Daten scannen und daraus eine Holzcharge erstellen.
     */
    @PostMapping
    public PreparedQrCodeResponse createQrCode(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody CreatePreparedQrCodeRequest request
    ) {
        authService.requireLogin(authorizationHeader);

        User user = getUserFromAuthorizationHeader(authorizationHeader);

        String woodId = requireText(request.woodId(), "woodId darf nicht leer sein");
        String treeType = requireText(request.treeType(), "treeType darf nicht leer sein");
        String volumeM3 = requireText(request.volumeM3(), "volumeM3 darf nicht leer sein");

        PreparedQrCode qrCode = new PreparedQrCode(
                woodId,
                treeType,
                volumeM3,
                user
        );

        PreparedQrCode savedQrCode = preparedQrCodeRepository.save(qrCode);

        return toResponse(savedQrCode);
    }

    /*
     * Löscht einen vorbereiteten QR-Code.
     *
     * Aus Sicherheitsgründen wird nicht nur nach der ID gesucht,
     * sondern nach ID + Benutzer. Dadurch kann niemand fremde QR-Codes löschen.
     */
    @DeleteMapping("/{id}")
    public void deleteQrCode(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @PathVariable Long id
    ) {
        authService.requireLogin(authorizationHeader);

        User user = getUserFromAuthorizationHeader(authorizationHeader);

        PreparedQrCode qrCode = preparedQrCodeRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "QR-Code wurde nicht gefunden"
                ));

        preparedQrCodeRepository.delete(qrCode);
    }

    /*
     * Liest den Benutzer aus dem Authorization-Header.
     *
     * Erwartetes Format:
     * Authorization: Bearer demo-token-USERNAME
     */
    private User getUserFromAuthorizationHeader(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Nicht angemeldet"
            );
        }

        String token = authorizationHeader.substring("Bearer ".length());

        if (!token.startsWith(TOKEN_PREFIX)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Ungültiger Token"
            );
        }

        String username = token.substring(TOKEN_PREFIX.length());

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Benutzer wurde nicht gefunden"
                ));
    }

    /*
     * Wandelt die Datenbank-Entity in eine API-Antwort um.
     *
     * Dadurch geben wir nur die Daten zurück, die das Frontend wirklich braucht.
     */
    private PreparedQrCodeResponse toResponse(PreparedQrCode qrCode) {
        return new PreparedQrCodeResponse(
                qrCode.getId(),
                qrCode.getWoodId(),
                qrCode.getTreeType(),
                qrCode.getVolumeM3(),
                qrCode.getCreatedAt()
        );
    }

    private String requireText(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    errorMessage
            );
        }

        return value.trim();
    }

    public record CreatePreparedQrCodeRequest(
            String woodId,
            String treeType,
            String volumeM3
    ) {
    }

    public record PreparedQrCodeResponse(
            Long id,
            String woodId,
            String treeType,
            String volumeM3,
            LocalDateTime createdAt
    ) {
    }
}