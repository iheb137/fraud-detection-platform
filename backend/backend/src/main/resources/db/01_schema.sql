-- =============================================
-- SCHEMA : Fraud Detection Platform
-- Tunisie Telecom — 2026
-- =============================================

-- Utilisateurs
CREATE TABLE IF NOT EXISTS users (
                                     id          BIGSERIAL PRIMARY KEY,
                                     email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    role        VARCHAR(50)  NOT NULL DEFAULT 'ANALYSTE',
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMP    DEFAULT NOW(),
    updated_at  TIMESTAMP    DEFAULT NOW()
    );

-- Lots d'import
CREATE TABLE IF NOT EXISTS import_batches (
                                              id           BIGSERIAL PRIMARY KEY,
                                              filename     VARCHAR(255),
    record_count INTEGER,
    imported_by  BIGINT REFERENCES users(id),
    imported_at  TIMESTAMP DEFAULT NOW(),
    status       VARCHAR(20) DEFAULT 'SUCCESS'
    );

-- CDR bruts
CREATE TABLE IF NOT EXISTS cdrs (
                                    id                  BIGSERIAL PRIMARY KEY,
                                    call_id             UUID        UNIQUE NOT NULL,
                                    calling_number      VARCHAR(20) NOT NULL,
    called_number       VARCHAR(20) NOT NULL,
    call_start_time     TIMESTAMP   NOT NULL,
    call_duration_sec   INTEGER     NOT NULL DEFAULT 0,
    call_type           VARCHAR(10) NOT NULL,
    destination_country VARCHAR(50),
    call_direction      VARCHAR(10),
    imei                VARCHAR(20),
    cell_id             VARCHAR(30),
    revenue             DECIMAL(10,4) DEFAULT 0,
    import_batch_id     BIGINT REFERENCES import_batches(id),
    created_at          TIMESTAMP DEFAULT NOW()
    );

-- Prédictions ML
CREATE TABLE IF NOT EXISTS predictions (
                                           id             BIGSERIAL PRIMARY KEY,
                                           cdr_id         BIGINT REFERENCES cdrs(id),
    fraud_score    DECIMAL(5,4) NOT NULL,
    is_fraud       BOOLEAN      NOT NULL,
    model_version  VARCHAR(50),
    predicted_at   TIMESTAMP DEFAULT NOW(),
    analyst_label  BOOLEAN,
    labeled_by     BIGINT REFERENCES users(id),
    labeled_at     TIMESTAMP
    );

-- Alertes
CREATE TABLE IF NOT EXISTS alerts (
                                      id              BIGSERIAL PRIMARY KEY,
                                      prediction_id   BIGINT REFERENCES predictions(id),
    cdr_id          BIGINT REFERENCES cdrs(id),
    severity        VARCHAR(10) NOT NULL,
    status          VARCHAR(20) DEFAULT 'OPEN',
    assigned_to     BIGINT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    resolution_note TEXT
    );

-- Configuration système
CREATE TABLE IF NOT EXISTS system_config (
                                             id           BIGSERIAL PRIMARY KEY,
                                             config_key   VARCHAR(100) UNIQUE NOT NULL,
    config_value VARCHAR(255) NOT NULL,
    description  VARCHAR(500),
    updated_by   BIGINT REFERENCES users(id),
    updated_at   TIMESTAMP DEFAULT NOW()
    );

-- Logs applicatifs
CREATE TABLE IF NOT EXISTS audit_logs (
                                          id         BIGSERIAL PRIMARY KEY,
                                          user_id    BIGINT REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    resource   VARCHAR(100),
    details    TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
    );