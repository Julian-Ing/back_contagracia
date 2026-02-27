import { PrismaClient } from '@prisma/client-master';
import { modules } from './definitions';
import { moduleDependencies } from './dependencies';
import { actionsByModule, ALL_MODULE_KEYS } from './actions';

export { modules } from './definitions';
export { moduleDependencies } from './dependencies';
export { actionsByModule, ALL_MODULE_KEYS } from './actions';
export type { ModuleDef, ActionDef } from './types';

export async function seedModules(prisma: PrismaClient): Promise<Map<string, string>> {
  console.log('📦 Seeding Modules...');
  const moduleMap = new Map<string, string>();
  for (const mod of modules) {
    const created = await prisma.module.upsert({
      where: { module_key: mod.module_key },
      update: mod,
      create: mod,
    });
    moduleMap.set(mod.module_key, created.id);
  }
  console.log(`   ✅ ${modules.length} módulos creados
`);

  // Eliminar módulos obsoletos
  const obsoleteModules = ['radian'];
  const deletedModules = await prisma.module.deleteMany({
    where: { module_key: { in: obsoleteModules } }
  });
  if (deletedModules.count > 0) {
    console.log(`   🗑️ ${deletedModules.count} módulos obsoletos eliminados`);
  }

  console.log('⚡ Seeding System Actions...');

  // Recolectar todas las action_keys válidas
  const allActionKeys: string[] = [];
  let actionCount = 0;

  for (const [moduleKey, actions] of Object.entries(actionsByModule)) {
    const moduleId = moduleMap.get(moduleKey);
    if (!moduleId) {
      console.warn(`   ⚠️ Módulo "${moduleKey}" no encontrado, saltando...`);
      continue;
    }
    for (const action of actions) {
      allActionKeys.push(action.action_key);
      await prisma.systemAction.upsert({
        where: { action_key: action.action_key },
        update: { ...action, module_id: moduleId },
        create: { ...action, module_id: moduleId },
      });
      actionCount++;
    }
  }

  // Eliminar acciones huérfanas que ya no existen en el catálogo
  const deleted = await prisma.systemAction.deleteMany({
    where: { action_key: { notIn: allActionKeys } },
  });
  if (deleted.count > 0) {
    console.log(`   🗑️ ${deleted.count} acciones obsoletas eliminadas`);
  }

  console.log(`   ✅ ${actionCount} acciones creadas
`);

  // Seed module dependencies
  console.log('🔗 Seeding Module Dependencies...');
  let depCount = 0;
  for (const [moduleKey, dependsOnKeys] of Object.entries(moduleDependencies)) {
    const moduleId = moduleMap.get(moduleKey);
    if (!moduleId) continue;
    for (const depKey of dependsOnKeys) {
      const dependsOnId = moduleMap.get(depKey);
      if (!dependsOnId) continue;
      await prisma.moduleDependency.upsert({
        where: { module_id_depends_on_id: { module_id: moduleId, depends_on_id: dependsOnId } },
        update: {},
        create: { module_id: moduleId, depends_on_id: dependsOnId },
      });
      depCount++;
    }
  }
  console.log(`   ✅ ${depCount} dependencias creadas
`);

  return moduleMap;
}
