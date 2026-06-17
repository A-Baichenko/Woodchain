package Assigment.service;

import Assigment.model.User;
import Assigment.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/*
 * Service für die Anmeldung und Rollenprüfung.
 *
 * Er liest den Benutzer aus dem Authorization Header und prüft,
 * ob dieser angemeldet ist und die erforderliche Rolle besitzt.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;

    /*
     * Übergibt das Repository für den Zugriff auf die Benutzerdaten.
     */
    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * Liest den Token aus dem Authorization Header und ermittelt
     * anschließend den zugehörigen Benutzer aus der Datenbank.
     */
    public User getUserFromAuthorizationHeader(String authorizationHeader) {
        String token = extractToken(authorizationHeader);

        // In diesem Projekt beginnen gültige Demo-Tokens mit "demo-token-".
        if (!token.startsWith("demo-token-")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Ungültiger Token"
            );
        }

        // Der Benutzername steht direkt hinter dem Token-Präfix.
        String username = token.replace("demo-token-", "");

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Benutzer zum Token nicht gefunden"
                ));
    }

    /*
     * Prüft, ob der angemeldete Benutzer die benötigte Rolle besitzt.
     *
     * Ein Administrator erhält unabhängig von der angegebenen Rolle Zugriff.
     */
    public void requireRole(String authorizationHeader, String requiredRole) {
        User user = getUserFromAuthorizationHeader(authorizationHeader);

        // Administratoren dürfen alle geschützten Funktionen verwenden.
        if ("ADMIN".equals(user.getRole())) {
            return;
        }

        if (!requiredRole.equals(user.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Zugriff verweigert. Benötigte Rolle: " + requiredRole
            );
        }
    }

    /*
     * Prüft, ob ein gültiger Benutzer angemeldet ist.
     * Eine bestimmte Rolle wird dabei nicht verlangt.
     */
    public void requireLogin(String authorizationHeader) {
        getUserFromAuthorizationHeader(authorizationHeader);
    }

    /*
     * Entfernt das Präfix "Bearer " aus dem Authorization Header
     * und gibt nur den eigentlichen Token zurück.
     */
    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authorization Header fehlt"
            );
        }

        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authorization Header muss mit Bearer beginnen"
            );
        }

        return authorizationHeader.substring("Bearer ".length());
    }
}