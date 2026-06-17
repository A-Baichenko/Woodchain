ALTER TABLE users
    ADD COLUMN display_name VARCHAR(100),
    ADD COLUMN location VARCHAR(100);

UPDATE users SET display_name = 'Administrator', location = 'Zentrale' WHERE username = 'admin';
UPDATE users SET display_name = 'Förster Demo', location = 'Homburg' WHERE username = 'foerster';
UPDATE users SET display_name = 'Logistik Demo', location = 'Saarbrücken' WHERE username = 'logistik';
UPDATE users SET display_name = 'Sägewerk Demo', location = 'Kaiserslautern' WHERE username = 'saegewerk';
UPDATE users SET display_name = 'Handel Demo', location = 'Mannheim' WHERE username = 'handel';