package Assigment.controller;

import Assigment.model.User;
import Assigment.repository.UserRepository;
import Assigment.service.AuthService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/locations")
public class LocationController {

    private static final String NOMINATIM_BASE_URL =
            "https://nominatim.openstreetmap.org";

    private static final String USER_AGENT =
            "WoodChain-Student-Project/1.0";

    private final UserRepository userRepository;
    private final AuthService authService;

    /*
     * Werden direkt erstellt und müssen deshalb nicht von Spring
     * als Bean bereitgestellt werden.
     */
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LocationController(
            UserRepository userRepository,
            AuthService authService
    ) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    /*
     * Alte vereinfachte Kartenroute.
     *
     * Sie erstellt eine Route nur anhand von Benutzerrollen.
     * Die Blockchain-Historie liefert genauere Informationen.
     */
    @Deprecated
    @GetMapping("/route")
    public List<LocationPointResponse> getRouteForStatus(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader,
            @RequestParam String status,
            @RequestParam(required = false) String owner
    ) {
        authService.requireLogin(authorizationHeader);

        List<String> roles = getRolesForStatus(status);
        List<LocationPointResponse> route = new ArrayList<>();

        for (String role : roles) {
            Optional<User> selectedUser = role.equals("FOERSTER")
                    ? findBestUserForRoleAndOwner(role, owner)
                    : findFirstUserWithCoordinates(role);

            selectedUser.ifPresent(user ->
                    route.add(toLocationPointResponse(user))
            );
        }

        return route;
    }

    /*
     * Wandelt eine Adresse in geografische Koordinaten um.
     * Nur Administratoren dürfen diese Funktion verwenden.
     */
    @GetMapping("/geocode")
    public GeocodeResponse geocodeAddress(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader,
            @RequestParam String address
    ) {
        authService.requireRole(authorizationHeader, "ADMIN");

        String cleanAddress = requireText(
                address,
                "Adresse darf nicht leer sein"
        );

        try {
            String encodedAddress = URLEncoder.encode(
                    cleanAddress,
                    StandardCharsets.UTF_8
            );

            String url = NOMINATIM_BASE_URL
                    + "/search?format=jsonv2"
                    + "&limit=1"
                    + "&q=" + encodedAddress;

            JsonNode results = sendNominatimRequest(url);

            if (!results.isArray() || results.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Adresse wurde nicht gefunden"
                );
            }

            JsonNode firstResult = results.get(0);

            Double latitude = parseCoordinate(firstResult, "lat");
            Double longitude = parseCoordinate(firstResult, "lon");

            String resolvedAddress = firstResult
                    .path("display_name")
                    .asText(cleanAddress);

            return new GeocodeResponse(
                    cleanAddress,
                    resolvedAddress,
                    latitude,
                    longitude
            );

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Adresse konnte nicht in Koordinaten umgewandelt werden",
                    exception
            );
        }
    }

    /*
     * Ermittelt anhand von Koordinaten automatisch das Land.
     * Wird beim Erstellen einer Holzcharge verwendet.
     */
    @GetMapping("/reverse-country")
    public CountryResponse reverseCountry(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader,
            @RequestParam Double latitude,
            @RequestParam Double longitude
    ) {
        authService.requireLogin(authorizationHeader);
        validateCoordinates(latitude, longitude);

        try {
            String url = NOMINATIM_BASE_URL
                    + "/reverse?format=jsonv2"
                    + "&lat=" + latitude
                    + "&lon=" + longitude
                    + "&addressdetails=1";

            JsonNode root = sendNominatimRequest(url);
            JsonNode addressNode = root.path("address");

            String country = addressNode
                    .path("country")
                    .asText(null);

            String countryCode = addressNode
                    .path("country_code")
                    .asText(null);

            String displayName = root
                    .path("display_name")
                    .asText(null);

            if (country == null || country.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Land wurde nicht gefunden"
                );
            }

            return new CountryResponse(
                    country,
                    countryCode,
                    displayName
            );

        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Fehler beim automatischen Ermitteln des Landes",
                    exception
            );
        }
    }

    /*
     * Schickt eine Anfrage an OpenStreetMap Nominatim
     * und wandelt die Antwort in JSON um.
     */
    private JsonNode sendNominatimRequest(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Geocoding-Dienst konnte nicht erreicht werden"
            );
        }

        return objectMapper.readTree(response.body());
    }

    /*
     * Sucht den Förster, dessen Name zum Besitzer
     * der Holzcharge passt.
     */
    private Optional<User> findBestUserForRoleAndOwner(
            String role,
            String owner
    ) {
        List<User> users = userRepository.findByRole(role)
                .stream()
                .filter(this::hasCoordinates)
                .toList();

        if (users.isEmpty()) {
            return Optional.empty();
        }

        if (owner == null || owner.isBlank()) {
            return Optional.of(users.get(0));
        }

        String normalizedOwner = owner.toLowerCase();

        Optional<User> displayNameMatch = users.stream()
                .filter(user ->
                        user.getDisplayName() != null
                                && normalizedOwner.contains(
                                user.getDisplayName().toLowerCase()
                        )
                )
                .findFirst();

        if (displayNameMatch.isPresent()) {
            return displayNameMatch;
        }

        Optional<User> usernameMatch = users.stream()
                .filter(user ->
                        user.getUsername() != null
                                && normalizedOwner.contains(
                                user.getUsername().toLowerCase()
                        )
                )
                .findFirst();

        return usernameMatch.or(() -> Optional.of(users.get(0)));
    }

    private Optional<User> findFirstUserWithCoordinates(String role) {
        return userRepository.findByRole(role)
                .stream()
                .filter(this::hasCoordinates)
                .findFirst();
    }

    private boolean hasCoordinates(User user) {
        return user.getLatitude() != null
                && user.getLongitude() != null;
    }

    /*
     * Legt fest, welche Rollen bei einem Status
     */
    private List<String> getRolesForStatus(String status) {
        String normalizedStatus = status == null
                ? ""
                : status.trim().toUpperCase();

        return switch (normalizedStatus) {
            case "HARVESTED" ->
                    List.of("FOERSTER");

            case "IN_TRANSPORT",
                 "IN_TRANSIT",
                 "IN_TRANSPORT_TO_SAWMILL" ->
                    List.of("FOERSTER", "LOGISTIK");

            case "PROCESSED" ->
                    List.of("FOERSTER", "LOGISTIK", "SAEGEWERK");

            case "RETAIL_READY",
                 "IN_TRANSPORT_TO_RETAIL",
                 "SOLD" ->
                    List.of(
                            "FOERSTER",
                            "LOGISTIK",
                            "SAEGEWERK",
                            "HANDEL"
                    );

            default ->
                    List.of("FOERSTER");
        };
    }

    private LocationPointResponse toLocationPointResponse(User user) {
        return new LocationPointResponse(
                user.getRole(),
                user.getDisplayName(),
                user.getLocation(),
                user.getAddress(),
                user.getLatitude(),
                user.getLongitude()
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

    private void validateCoordinates(
            Double latitude,
            Double longitude
    ) {
        if (latitude == null || longitude == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Koordinaten dürfen nicht leer sein"
            );
        }

        if (latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Koordinaten sind ungültig"
            );
        }
    }

    private Double parseCoordinate(
            JsonNode node,
            String fieldName
    ) {
        String value = node.path(fieldName).asText(null);

        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Geocoding-Dienst hat keine gültigen Koordinaten geliefert"
            );
        }

        return Double.valueOf(value);
    }

    public record LocationPointResponse(
            String role,
            String displayName,
            String location,
            String address,
            Double latitude,
            Double longitude
    ) {
    }

    public record GeocodeResponse(
            String inputAddress,
            String resolvedAddress,
            Double latitude,
            Double longitude
    ) {
    }

    public record CountryResponse(
            String country,
            String countryCode,
            String displayName
    ) {
    }
}