package Assigment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    /*
     * Automatisch erzeugte Datenbank-ID des Benutzers.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Eindeutiger Benutzername für die Anmeldung.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /*
     * Enthält nicht das Klartext-Passwort,
     * sondern den durch BCrypt erzeugten Passwort-Hash.
     */
    @Column(nullable = false, length = 255)
    private String password;

    /*
     * Rolle des Benutzers:
     * ADMIN, FOERSTER, LOGISTIK, SAEGEWERK oder HANDEL.
     */
    @Column(nullable = false, length = 30)
    private String role;

    /*
     * Anzeigename des Betriebs oder Benutzers.
     */
    @Column(name = "display_name", length = 100)
    private String displayName;

    /*
     * Kurze Standortbezeichnung, beispielsweise Berlin.
     */
    @Column(length = 100)
    private String location;

    /*
     * Vollständige Adresse für Geocoding und Kartenansicht.
     */
    @Column(length = 255)
    private String address;

    /*
     * Geografische Koordinaten des Standorts.
     */
    private Double latitude;
    private Double longitude;

    /*
     * Geschützter leerer Konstruktor für JPA.
     */
    protected User() {
    }

    public User(
            String username,
            String password,
            String role,
            String displayName,
            String location,
            String address,
            Double latitude,
            Double longitude
    ) {
        this.username = requireText(
                username,
                "Benutzername darf nicht leer sein"
        );

        this.password = requireText(
                password,
                "Passwort-Hash darf nicht leer sein"
        );

        this.role = requireText(
                role,
                "Rolle darf nicht leer sein"
        ).toUpperCase();

        validateCoordinates(latitude, longitude);

        this.displayName = cleanOptionalText(displayName);
        this.location = cleanOptionalText(location);
        this.address = cleanOptionalText(address);
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /*
     * Prüft Pflichtfelder und entfernt überflüssige Leerzeichen.
     */
    private static String requireText(
            String value,
            String errorMessage
    ) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(errorMessage);
        }

        return value.trim();
    }

    /*
     * Entfernt Leerzeichen aus optionalen Textfeldern.
     * Leere Werte werden als null gespeichert.
     */
    private static String cleanOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    /*
     * Prüft, ob die Koordinaten vollständig und gültig sind.
     */
    private static void validateCoordinates(
            Double latitude,
            Double longitude
    ) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException(
                    "Breiten- und Längengrad müssen gemeinsam angegeben werden"
            );
        }

        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException(
                    "Breitengrad muss zwischen -90 und 90 liegen"
            );
        }

        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException(
                    "Längengrad muss zwischen -180 und 180 liegen"
            );
        }
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() {
        return role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getLocation() {
        return location;
    }

    public String getAddress() {
        return address;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }
}