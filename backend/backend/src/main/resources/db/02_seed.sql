-- Admin par défaut (mot de passe : Admin@2025)
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES (
           'admin@tunisietelecom.tn',
           '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY.5AXd8jHcVuyu',
           'Admin',
           'Système',
           'ADMIN',
           true
       ) ON CONFLICT (email) DO NOTHING;

-- Configuration par défaut
INSERT INTO system_config (config_key, config_value, description)
VALUES
    ('fraud_score_threshold', '0.75', 'Seuil de score de fraude pour générer une alerte'),
    ('batch_size_limit', '10000', 'Nombre maximum de CDR par import')
    ON CONFLICT (config_key) DO NOTHING;