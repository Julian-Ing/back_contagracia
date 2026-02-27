/**
 * Script para agregar el módulo PH a la master DB
 *
 * Uso: npx ts-node prisma/scripts/seed-ph-module.ts
 */
import { PrismaClient } from '@prisma/client-master';

const prisma = new PrismaClient();

const phModule = {
  module_key: 'ph',
  module_name: 'Propiedad Horizontal',
  description: 'Gestión de copropiedades, unidades, residentes y facturación PH',
  icon: 'Building2',
  group: 'Propiedad Horizontal',
  sort_order: 95,
};

const phActions = [
  { action_key: 'ph.view', action_name: 'Acceder a PH', description: 'Acceder al módulo de Propiedad Horizontal' },
  { action_key: 'ph.dashboard.view', action_name: 'Ver Dashboard PH', description: 'Ver dashboard de PH' },
  { action_key: 'ph.condominiums.view', action_name: 'Ver Copropiedades', description: 'Ver copropiedades' },
  { action_key: 'ph.condominiums.create', action_name: 'Crear Copropiedad', description: 'Crear copropiedad' },
  { action_key: 'ph.condominiums.edit', action_name: 'Editar Copropiedad', description: 'Editar copropiedad' },
  { action_key: 'ph.condominiums.delete', action_name: 'Eliminar Copropiedad', description: 'Eliminar copropiedad' },
  { action_key: 'ph.towers.view', action_name: 'Ver Torres', description: 'Ver torres' },
  { action_key: 'ph.towers.create', action_name: 'Crear Torre', description: 'Crear torre' },
  { action_key: 'ph.towers.edit', action_name: 'Editar Torre', description: 'Editar torre' },
  { action_key: 'ph.towers.delete', action_name: 'Eliminar Torre', description: 'Eliminar torre' },
  { action_key: 'ph.units.view', action_name: 'Ver Unidades', description: 'Ver unidades' },
  { action_key: 'ph.units.create', action_name: 'Crear Unidad', description: 'Crear unidad' },
  { action_key: 'ph.units.edit', action_name: 'Editar Unidad', description: 'Editar unidad' },
  { action_key: 'ph.units.delete', action_name: 'Eliminar Unidad', description: 'Eliminar unidad' },
  { action_key: 'ph.residents.view', action_name: 'Ver Copropietarios', description: 'Ver copropietarios y residentes' },
  { action_key: 'ph.residents.create', action_name: 'Crear Copropietario', description: 'Crear copropietario' },
  { action_key: 'ph.residents.edit', action_name: 'Editar Copropietario', description: 'Editar copropietario' },
  { action_key: 'ph.residents.delete', action_name: 'Eliminar Copropietario', description: 'Eliminar copropietario' },
  { action_key: 'ph.vehicles.view', action_name: 'Ver Vehículos', description: 'Ver vehículos' },
  { action_key: 'ph.vehicles.create', action_name: 'Crear Vehículo', description: 'Crear vehículo' },
  { action_key: 'ph.vehicles.edit', action_name: 'Editar Vehículo', description: 'Editar vehículo' },
  { action_key: 'ph.vehicles.delete', action_name: 'Eliminar Vehículo', description: 'Eliminar vehículo' },
  { action_key: 'ph.common_areas.view', action_name: 'Ver Zonas Comunes', description: 'Ver zonas comunes' },
  { action_key: 'ph.common_areas.create', action_name: 'Crear Zona Común', description: 'Crear zona común' },
  { action_key: 'ph.common_areas.edit', action_name: 'Editar Zona Común', description: 'Editar zona común' },
  { action_key: 'ph.common_areas.delete', action_name: 'Eliminar Zona Común', description: 'Eliminar zona común' },
  { action_key: 'ph.reservations.view', action_name: 'Ver Reservas', description: 'Ver reservas de zonas comunes' },
  { action_key: 'ph.reservations.create', action_name: 'Crear Reserva', description: 'Crear reserva' },
  { action_key: 'ph.reservations.edit', action_name: 'Editar Reserva', description: 'Editar reserva' },
  { action_key: 'ph.reservations.cancel', action_name: 'Cancelar Reserva', description: 'Cancelar reserva' },
  { action_key: 'ph.reservations.confirm', action_name: 'Confirmar Reserva', description: 'Confirmar reserva' },
  { action_key: 'ph.reservations.complete', action_name: 'Completar Reserva', description: 'Completar reserva' },
  { action_key: 'ph.fee_concepts.view', action_name: 'Ver Conceptos de Cobro', description: 'Ver conceptos de cobro' },
  { action_key: 'ph.fee_concepts.create', action_name: 'Crear Concepto de Cobro', description: 'Crear concepto de cobro' },
  { action_key: 'ph.fee_concepts.edit', action_name: 'Editar Concepto de Cobro', description: 'Editar concepto de cobro' },
  { action_key: 'ph.fee_concepts.delete', action_name: 'Eliminar Concepto de Cobro', description: 'Eliminar concepto de cobro' },
  { action_key: 'ph.billing.view', action_name: 'Ver Facturación', description: 'Ver periodos y cuotas' },
  { action_key: 'ph.billing.create_period', action_name: 'Crear Periodo', description: 'Crear periodo de facturación' },
  { action_key: 'ph.billing.edit_period', action_name: 'Editar Periodo', description: 'Editar periodo de facturación' },
  { action_key: 'ph.billing.delete_period', action_name: 'Eliminar Periodo', description: 'Eliminar periodo de facturación' },
  { action_key: 'ph.billing.close_period', action_name: 'Cerrar Periodo', description: 'Cerrar periodo de facturación' },
  { action_key: 'ph.billing.generate_fees', action_name: 'Generar Cuotas', description: 'Generar cuotas masivamente' },
  { action_key: 'ph.billing.edit_fee', action_name: 'Editar Cuota', description: 'Editar cuota individual' },
  { action_key: 'ph.billing.delete_fee', action_name: 'Eliminar Cuota', description: 'Eliminar cuota' },
  { action_key: 'ph.rentals.view', action_name: 'Ver Alquileres', description: 'Ver alquileres' },
  { action_key: 'ph.rentals.create', action_name: 'Crear Alquiler', description: 'Crear alquiler' },
  { action_key: 'ph.rentals.edit', action_name: 'Editar Alquiler', description: 'Editar alquiler' },
  { action_key: 'ph.rentals.delete', action_name: 'Eliminar Alquiler', description: 'Eliminar alquiler' },
  { action_key: 'ph.rentals.checkout', action_name: 'Checkout Alquiler', description: 'Finalizar alquiler' },
  { action_key: 'ph.settings.view', action_name: 'Ver Configuración PH', description: 'Ver configuración de PH' },
  { action_key: 'ph.settings.edit', action_name: 'Editar Configuración PH', description: 'Editar configuración de PH' },
];

async function main() {
  console.log('🏢 Insertando módulo PH...\n');

  // 1. Crear/actualizar el módulo
  const mod = await prisma.module.upsert({
    where: { module_key: 'ph' },
    update: phModule,
    create: phModule,
  });
  console.log(`   ✅ Módulo PH creado (id: ${mod.id})`);

  // 2. Crear/actualizar las acciones
  let actionCount = 0;
  for (const action of phActions) {
    await prisma.systemAction.upsert({
      where: { action_key: action.action_key },
      update: { ...action, module_id: mod.id },
      create: { ...action, module_id: mod.id },
    });
    actionCount++;
  }
  console.log(`   ✅ ${actionCount} acciones PH creadas`);

  // 3. Vincular a TODOS los planes que existan
  const allPlans = await prisma.plan.findMany();
  for (const plan of allPlans) {
    const existing = await prisma.planModule.findFirst({
      where: { plan_id: plan.id, module_id: mod.id },
    });
    if (!existing) {
      await prisma.planModule.create({
        data: { plan_id: plan.id, module_id: mod.id },
      });
      console.log(`   ✅ Módulo PH vinculado al plan "${plan.name}"`);
    } else {
      console.log(`   ℹ️  Módulo PH ya estaba vinculado al plan "${plan.name}"`);
    }
  }

  console.log('\n✅ Módulo PH listo. Cierra sesión y vuelve a entrar para verlo en el sidebar.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
