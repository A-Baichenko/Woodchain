package Assigment.repository;

import Assigment.model.PreparedQrCode;
import Assigment.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
 * Repository für vorbereitete QR-Codes.
 *
 * JpaRepository stellt grundlegende Datenbankoperationen wie
 * Speichern, Suchen und Löschen automatisch bereit.
 */
public interface PreparedQrCodeRepository
        extends JpaRepository<PreparedQrCode, Long> {

    /*
     * Gibt alle vorbereiteten QR-Codes eines Benutzers zurück.
     * Die neuesten QR-Codes stehen dabei zuerst in der Liste.
     */
    List<PreparedQrCode> findByUserOrderByCreatedAtDesc(User user);

    /*
     * Sucht einen QR-Code anhand seiner ID und seines Benutzers.
     * Dadurch kann ein Benutzer nur auf seine eigenen QR-Codes zugreifen.
     */
    Optional<PreparedQrCode> findByIdAndUser(Long id, User user);
}