CREATE TABLE prepared_qr_codes (
                                   id BIGINT AUTO_INCREMENT PRIMARY KEY,

                                   wood_id VARCHAR(100) NOT NULL,
                                   tree_type VARCHAR(100) NOT NULL,
                                   volume_m3 VARCHAR(50) NOT NULL,

                                   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                   user_id BIGINT NOT NULL,

                                   CONSTRAINT fk_prepared_qr_codes_user
                                       FOREIGN KEY (user_id)
                                           REFERENCES users(id)
                                           ON DELETE CASCADE
);