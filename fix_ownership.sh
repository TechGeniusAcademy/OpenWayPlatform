#!/bin/bash
sudo -u postgres psql -d openway_platform << 'EOSQL'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO openway';
    END LOOP;
    
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' OWNER TO openway';
    END LOOP;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE openway_platform TO openway;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO openway;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO openway;
GRANT ALL ON SCHEMA public TO openway;
EOSQL
