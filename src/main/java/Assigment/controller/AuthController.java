package Assigment.controller;

import Assigment.model.User;
import Assigment.repository.UserRepository;
import Assigment.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

/*
 * REST-Controller für Anmeldung, Benutzerinformationen
 * und die Verwaltung von Benutzerkonten.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String TOKEN_PREFIX = "demo-token-";

    // Rollen, die innerhalb von WoodChain verwendet werden dürfen.
    private static final Set<String> VALID_ROLES = Set.of(
            "ADMIN",
            "FOERSTER",
            "LOGISTIK",
            "SAEGEWERK",
            "HANDEL"
    );

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            UserRepository userRepository,
            AuthService authService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.passwordEncoder = passwordEncoder;
    }

    /*
     * Meldet einen Benutzer an.
     *
     * Unterstützt sowohl ältere Klartext-Passwörter aus Testdaten
     * als auch neue Passwörter, die mit BCrypt gespeichert wurden.
     */
    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        String username = requireText(
                request.username(),
                "Benutzername darf nicht leer sein"
        );

        String password = requireText(
                request.password(),
                "Passwort darf nicht leer sein"
        );

        User user = userRepository.findByUsername(username)
                .orElseThrow(this::unauthorizedLogin);

        if (!passwordMatches(password, user.getPassword())) {
            throw unauthorizedLogin();
        }

        return toLoginResponse(user);
    }

    /*
     * Gibt die Informationen des aktuell angemeldeten Benutzers zurück.
     */
    @GetMapping("/me")
    public LoginResponse me(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader
    ) {
        User user = authService.getUserFromAuthorizationHeader(
                authorizationHeader
        );

        return toLoginResponse(user);
    }

    /*
     * Erstellt einen neuen Benutzer.
     *
     * Diese Funktion darf nur von einem Administrator verwendet werden.
     * Neue Passwörter werden immer mit BCrypt verschlüsselt gespeichert.
     */
    @PostMapping("/users")
    public UserResponse createUser(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader,
            @RequestBody CreateUserRequest request
    ) {
        authService.requireRole(authorizationHeader, "ADMIN");

        String username = requireText(
                request.username(),
                "Benutzername darf nicht leer sein"
        );

        String password = requireText(
                request.password(),
                "Passwort darf nicht leer sein"
        );

        String role = normalizeRole(request.role());

        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Benutzername existiert bereits"
            );
        }

        if (!isValidRole(role)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ungültige Rolle: " + role
            );
        }

        User user = new User(
                username,
                passwordEncoder.encode(password),
                role,
                request.displayName(),
                request.location(),
                request.address(),
                request.latitude(),
                request.longitude()
        );

        return toUserResponse(userRepository.save(user));
    }

    /*
     * Gibt alle Benutzer mit einer bestimmten Rolle zurück.
     *
     * Der Endpunkt wird beispielsweise für die Auswahl von
     * Logistikunternehmen, Sägewerken und Händlern verwendet.
     */
    @GetMapping("/users/by-role/{role}")
    public List<UserResponse> getUsersByRole(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader,
            @PathVariable String role
    ) {
        authService.requireLogin(authorizationHeader);

        String normalizedRole = normalizeRole(role);

        if (!isValidRole(normalizedRole)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ungültige Rolle: " + normalizedRole
            );
        }

        return userRepository.findByRole(normalizedRole)
                .stream()
                .map(this::toUserResponse)
                .toList();
    }

    /*
     * Prüft das eingegebene Passwort.
     *
     * Mit "$2a$", "$2b$" oder "$2y$" beginnende Passwörter sind
     * BCrypt-Hashes. Ältere Testdaten können noch Klartext enthalten.
     */
    private boolean passwordMatches(
            String enteredPassword,
            String storedPassword
    ) {
        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }

        if (isBcryptPassword(storedPassword)) {
            return passwordEncoder.matches(
                    enteredPassword,
                    storedPassword
            );
        }

        // Kompatibilität mit bestehenden Klartext-Passwörtern.
        return enteredPassword.equals(storedPassword);
    }

    private boolean isBcryptPassword(String password) {
        return password.startsWith("$2a$")
                || password.startsWith("$2b$")
                || password.startsWith("$2y$");
    }

    private LoginResponse toLoginResponse(User user) {
        return new LoginResponse(
                user.getUsername(),
                user.getRole(),
                user.getDisplayName(),
                user.getLocation(),
                user.getAddress(),
                user.getLatitude(),
                user.getLongitude(),
                TOKEN_PREFIX + user.getUsername()
        );
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getDisplayName(),
                user.getLocation(),
                user.getAddress(),
                user.getLatitude(),
                user.getLongitude()
        );
    }

    /*
     * Prüft, ob ein Pflichttext vorhanden ist.
     */
    private String requireText(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    errorMessage
            );
        }

        return value.trim();
    }

    private String normalizeRole(String role) {
        return role == null
                ? ""
                : role.trim().toUpperCase();
    }

    private boolean isValidRole(String role) {
        return VALID_ROLES.contains(role);
    }

    private ResponseStatusException unauthorizedLogin() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Benutzername oder Passwort falsch"
        );
    }

    public record LoginRequest(
            String username,
            String password
    ) {
    }

    public record LoginResponse(
            String username,
            String role,
            String displayName,
            String location,
            String address,
            Double latitude,
            Double longitude,
            String token
    ) {
    }

    public record CreateUserRequest(
            String username,
            String password,
            String role,
            String displayName,
            String location,
            String address,
            Double latitude,
            Double longitude
    ) {
    }

    public record UserResponse(
            Long id,
            String username,
            String role,
            String displayName,
            String location,
            String address,
            Double latitude,
            Double longitude
    ) {
    }
}