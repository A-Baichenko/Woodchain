package Assigment.bitcoin;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

public class FilesUtil {

    private FilesUtil() {
        // Utility-Klasse: soll nicht als Objekt erstellt werden.
    }

    /*
     * Gibt die erste Datei aus einem Ordner zurück.
     *
     * Wird z.B. für Hyperledger Fabric verwendet, weil Zertifikat- und Key-Ordner
     * automatisch generierte Dateinamen enthalten können.
     */
    public static Path getFirstFile(Path dir) throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
            return files
                    .filter(Files::isRegularFile)
                    .findFirst()
                    .orElseThrow(() -> new IOException("Keine Datei gefunden in: " + dir));
        }
    }
}