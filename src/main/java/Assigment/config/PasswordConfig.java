package Assigment.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    /*
     * Stellt den PasswordEncoder für die ganze Anwendung bereit.
     *
     * BCrypt speichert Passwörter nicht im Klartext, sondern als sicheren Hash.
     * Dadurch können Login-Passwörter später geprüft werden, ohne das echte Passwort zu speichern.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}