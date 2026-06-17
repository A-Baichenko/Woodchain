package Assigment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "prepared_qr_codes")
public class PreparedQrCode {

    /*
     * Automatisch erzeugte Datenbank-ID.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * ID der späteren Holzcharge.
     * Diese ID wird auch in der Blockchain verwendet.
     */
    @Column(name = "wood_id", nullable = false, length = 100)
    private String woodId;

    /*
     * Holzart, beispielsweise Eiche, Buche oder Fichte.
     */
    @Column(name = "tree_type", nullable = false, length = 100)
    private String treeType;

    /*
     * Holzvolumen in Kubikmetern.
     *
     * Der Wert bleibt ein String, weil er so an den Chaincode
     * und das Frontend übergeben wird.
     */
    @Column(name = "volume_m3", nullable = false, length = 50)
    private String volumeM3;

    /*
     * Zeitpunkt, zu dem der vorbereitete QR-Code erstellt wurde.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /*
     * Benutzer, dem dieser QR-Code gehört.
     *
     * LAZY bedeutet, dass die Benutzerdaten erst geladen werden,
     * wenn sie wirklich benötigt werden.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /*
     * Geschützter leerer Konstruktor für JPA.
     * Er soll nicht direkt im normalen Programmcode verwendet werden.
     */
    protected PreparedQrCode() {
    }

    public PreparedQrCode(
            String woodId,
            String treeType,
            String volumeM3,
            User user
    ) {
        this.woodId = requireText(woodId, "woodId darf nicht leer sein");
        this.treeType = requireText(treeType, "treeType darf nicht leer sein");
        this.volumeM3 = requireText(volumeM3, "volumeM3 darf nicht leer sein");

        if (user == null) {
            throw new IllegalArgumentException("Benutzer darf nicht leer sein");
        }

        this.user = user;
    }

    /*
     * Wird automatisch direkt vor dem ersten Speichern aufgerufen.
     * Dadurch ist createdAt immer gesetzt.
     */
    @PrePersist
    protected void setCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    /*
     * Prüft Texteingaben und entfernt Leerzeichen
     * am Anfang und Ende.
     */
    private static String requireText(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(errorMessage);
        }

        return value.trim();
    }

    public Long getId() {
        return id;
    }

    public String getWoodId() {
        return woodId;
    }

    public String getTreeType() {
        return treeType;
    }

    public String getVolumeM3() {
        return volumeM3;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public User getUser() {
        return user;
    }
}