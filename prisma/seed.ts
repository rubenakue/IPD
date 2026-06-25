// Seed de demo (feature 002-core-schema, S07).
// Deja un estado demostrable de extremo a extremo: 5 usuarios (uno por rol),
// un proyecto demo con sus 4 fases fijas y 5 agentes. Idempotente (upsert por
// email / código / claves únicas). Contraseña de demo documentada en el README.
// Se ejecuta con: pnpm db:seed  (node --env-file=.env --experimental-strip-types).
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, AgentRole, PhaseName } from '../src/generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** Contraseña común de las cuentas de demo (no es un secreto real; está en el README). */
const DEMO_PASSWORD = 'ipd-demo-2026';

/** Las cuatro fases fijas del dominio, en orden (§9.2). */
const PHASES = [
  { name: PhaseName.VALIDATION, order: 0 },
  { name: PhaseName.PRE_CONSTRUCTION, order: 1 },
  { name: PhaseName.CONSTRUCTION, order: 2 },
  { name: PhaseName.CLOSURE, order: 3 },
] as const;

/** Una cuenta por rol del dominio, con sus condiciones FRC de demo (los % suman 100). */
const DEMO_AGENTS = [
  { email: 'promotor@ipd.demo', displayName: 'Promotora Levante', role: AgentRole.PROMOTER, sharePercent: 33, guaranteedFee: 0n, feeAtRisk: 0n },
  { email: 'constructor@ipd.demo', displayName: 'Construcciones Turia', role: AgentRole.CONSTRUCTOR, sharePercent: 58, guaranteedFee: 80_000_000n, feeAtRisk: 60_000_000n },
  { email: 'proyectista@ipd.demo', displayName: 'Estudio Albor', role: AgentRole.DESIGNER, sharePercent: 9, guaranteedFee: 18_000_000n, feeAtRisk: 10_000_000n },
  { email: 'pm@ipd.demo', displayName: 'Coordina PM', role: AgentRole.PROJECT_MANAGER, sharePercent: 0, guaranteedFee: 0n, feeAtRisk: 0n },
  { email: 'observador@ipd.demo', displayName: 'Observador Externo', role: AgentRole.OBSERVER, sharePercent: 0, guaranteedFee: 0n, feeAtRisk: 0n },
] as const;

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // Proyecto demo (upsert por código).
  const project = await prisma.project.upsert({
    where: { code: 'DEMO-001' },
    update: {},
    create: {
      name: 'Proyecto Demo IPD',
      description: 'Proyecto de demostración sembrado en S07.',
      code: 'DEMO-001',
      clientName: 'Promotora Levante',
    },
  });

  // Las 4 fases fijas; la fase activa es VALIDATION.
  let validationPhaseId: string | null = null;
  for (const phase of PHASES) {
    const row = await prisma.phase.upsert({
      where: { projectId_name: { projectId: project.id, name: phase.name } },
      update: { order: phase.order },
      create: { projectId: project.id, name: phase.name, order: phase.order },
    });
    if (phase.name === PhaseName.VALIDATION) validationPhaseId = row.id;
  }
  await prisma.project.update({
    where: { id: project.id },
    data: { activePhaseId: validationPhaseId },
  });

  // Costes privados de promoción del proyecto demo (solo Promotor/PM los ven; ver
  // RLS de `PromoterPrivateCost`). Idempotente: se siembran solo si no existen aún.
  // El seed corre como superuser, que omite la RLS, así que no necesita contexto.
  const existingPrivateCosts = await prisma.promoterPrivateCost.count({
    where: { projectId: project.id },
  });
  if (existingPrivateCosts === 0) {
    await prisma.promoterPrivateCost.createMany({
      data: [
        { projectId: project.id, label: 'Compra de suelo', amount: 1_200_000_00n },
        { projectId: project.id, label: 'Tasas e impuestos de promoción', amount: 85_000_00n },
        { projectId: project.id, label: 'Costes financieros', amount: 140_000_00n },
      ],
    });
  }

  // Una cuenta y un agente por rol (upsert por email y por (userId, projectId)).
  for (const agent of DEMO_AGENTS) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: { displayName: agent.displayName },
      create: { email: agent.email, displayName: agent.displayName, passwordHash },
    });
    await prisma.agent.upsert({
      where: { userId_projectId: { userId: user.id, projectId: project.id } },
      update: { role: agent.role, sharePercent: agent.sharePercent, guaranteedFee: agent.guaranteedFee, feeAtRisk: agent.feeAtRisk },
      create: {
        userId: user.id,
        projectId: project.id,
        role: agent.role,
        sharePercent: agent.sharePercent,
        guaranteedFee: agent.guaranteedFee,
        feeAtRisk: agent.feeAtRisk,
      },
    });
  }

  console.log(`Seed OK: ${DEMO_AGENTS.length} usuarios y agentes, proyecto ${project.code} con ${PHASES.length} fases (activa: VALIDATION).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    void prisma.$disconnect();
    process.exitCode = 1;
  });
