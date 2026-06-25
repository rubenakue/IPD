-- Costes privados del promotor: capa RLS para que solo Promotor y PM puedan leerlos.
DO $$
BEGIN
    CREATE ROLE ipd_app NOLOGIN NOBYPASSRLS;
EXCEPTION
    WHEN duplicate_object THEN
        ALTER ROLE ipd_app NOBYPASSRLS;
END
$$;

CREATE TABLE "PromoterPrivateCost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "incurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoterPrivateCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromoterPrivateCost_projectId_idx" ON "PromoterPrivateCost"("projectId");

ALTER TABLE "PromoterPrivateCost" ADD CONSTRAINT "PromoterPrivateCost_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromoterPrivateCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromoterPrivateCost" FORCE ROW LEVEL SECURITY;

CREATE POLICY "PromoterPrivateCost_select_by_project_role"
ON "PromoterPrivateCost"
FOR SELECT
USING (
    "projectId" = current_setting('ipd.current_project_id', true)
    AND EXISTS (
        SELECT 1
        FROM "Agent"
        WHERE "Agent"."projectId" = "PromoterPrivateCost"."projectId"
          AND "Agent"."userId" = current_setting('ipd.current_user_id', true)
          AND "Agent"."status" = 'ACTIVE'
          AND "Agent"."role" IN ('PROMOTER', 'PROJECT_MANAGER')
    )
);

CREATE POLICY "PromoterPrivateCost_insert_by_project_role"
ON "PromoterPrivateCost"
FOR INSERT
WITH CHECK (
    "projectId" = current_setting('ipd.current_project_id', true)
    AND EXISTS (
        SELECT 1
        FROM "Agent"
        WHERE "Agent"."projectId" = "PromoterPrivateCost"."projectId"
          AND "Agent"."userId" = current_setting('ipd.current_user_id', true)
          AND "Agent"."status" = 'ACTIVE'
          AND "Agent"."role" IN ('PROMOTER', 'PROJECT_MANAGER')
    )
);

GRANT USAGE ON SCHEMA public TO ipd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ipd_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ipd_app;
