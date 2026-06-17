CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       role VARCHAR(30) NOT NULL
);

-- Test-Nutzer für das Assignment
-- Passwörter sind hier absichtlich lesbar, damit die Demo einfach bleibt.
INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'ADMIN');
INSERT INTO users (username, password, role) VALUES ('foerster', 'wood123', 'FOERSTER');
INSERT INTO users (username, password, role) VALUES ('logistik', 'truck123', 'LOGISTIK');
INSERT INTO users (username, password, role) VALUES ('saegewerk', 'saw123', 'SAEGEWERK');
INSERT INTO users (username, password, role) VALUES ('handel', 'shop123', 'HANDEL');