ALTER TABLE users
    ADD COLUMN address VARCHAR(255) NULL,
    ADD COLUMN latitude DOUBLE NULL,
    ADD COLUMN longitude DOUBLE NULL;

UPDATE users
SET address = 'Homburg, Germany',
    latitude = 49.3167,
    longitude = 7.3389
WHERE role = 'FOERSTER';

UPDATE users
SET address = 'Zweibrücken, Germany',
    latitude = 49.2469,
    longitude = 7.3698
WHERE role = 'LOGISTIK';

UPDATE users
SET address = 'Kaiserslautern, Germany',
    latitude = 49.4401,
    longitude = 7.7491
WHERE role = 'SAEGEWERK';

UPDATE users
SET address = 'Mannheim, Germany',
    latitude = 49.4875,
    longitude = 8.4660
WHERE role = 'HANDEL';

UPDATE users
SET address = 'Homburg, Germany',
    latitude = 49.3167,
    longitude = 7.3389
WHERE role = 'ADMIN';