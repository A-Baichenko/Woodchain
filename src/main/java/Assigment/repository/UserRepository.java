package Assigment.repository;

import Assigment.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
 * Repository für Benutzer.
 *
 * JpaRepository stellt grundlegende Datenbankoperationen wie
 * Speichern, Suchen, Aktualisieren und Löschen bereit.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /*
     * Sucht einen Benutzer anhand seines eindeutigen Benutzernamens.
     */
    Optional<User> findByUsername(String username);

    /*
     * Gibt alle Benutzer mit der angegebenen Rolle zurück,
     * beispielsweise FOERSTER, SAEGEWERK, HANDEL oder ADMIN.
     */
    List<User> findByRole(String role);
}