import { ActionDef } from '../types';

// ===== MÓDULO: Propiedad Horizontal =====
export const phActions: ActionDef[] = [
    { action_key: 'ph.view', action_name: 'Acceder a PH', description: 'Acceder al módulo de Propiedad Horizontal' },
    { action_key: 'ph.dashboard.view', action_name: 'Ver Dashboard PH', description: 'Ver dashboard de PH' },

    // Copropiedades
    { action_key: 'ph.condominiums.view', action_name: 'Ver Copropiedades', description: 'Ver copropiedades' },
    { action_key: 'ph.condominiums.create', action_name: 'Crear Copropiedad', description: 'Crear copropiedad' },
    { action_key: 'ph.condominiums.edit', action_name: 'Editar Copropiedad', description: 'Editar copropiedad' },
    { action_key: 'ph.condominiums.delete', action_name: 'Eliminar Copropiedad', description: 'Eliminar copropiedad' },

    // Torres
    { action_key: 'ph.towers.view', action_name: 'Ver Torres', description: 'Ver torres' },
    { action_key: 'ph.towers.create', action_name: 'Crear Torre', description: 'Crear torre' },
    { action_key: 'ph.towers.edit', action_name: 'Editar Torre', description: 'Editar torre' },
    { action_key: 'ph.towers.delete', action_name: 'Eliminar Torre', description: 'Eliminar torre' },

    // Unidades
    { action_key: 'ph.units.view', action_name: 'Ver Unidades', description: 'Ver unidades' },
    { action_key: 'ph.units.create', action_name: 'Crear Unidad', description: 'Crear unidad' },
    { action_key: 'ph.units.edit', action_name: 'Editar Unidad', description: 'Editar unidad' },
    { action_key: 'ph.units.delete', action_name: 'Eliminar Unidad', description: 'Eliminar unidad' },

    // Copropietarios / Residentes
    { action_key: 'ph.residents.view', action_name: 'Ver Copropietarios', description: 'Ver copropietarios y residentes' },
    { action_key: 'ph.residents.create', action_name: 'Crear Copropietario', description: 'Crear copropietario' },
    { action_key: 'ph.residents.edit', action_name: 'Editar Copropietario', description: 'Editar copropietario' },
    { action_key: 'ph.residents.delete', action_name: 'Eliminar Copropietario', description: 'Eliminar copropietario' },

    // Vehículos
    { action_key: 'ph.vehicles.view', action_name: 'Ver Vehículos', description: 'Ver vehículos' },
    { action_key: 'ph.vehicles.create', action_name: 'Crear Vehículo', description: 'Crear vehículo' },
    { action_key: 'ph.vehicles.edit', action_name: 'Editar Vehículo', description: 'Editar vehículo' },
    { action_key: 'ph.vehicles.delete', action_name: 'Eliminar Vehículo', description: 'Eliminar vehículo' },

    // Zonas Comunes
    { action_key: 'ph.common_areas.view', action_name: 'Ver Zonas Comunes', description: 'Ver zonas comunes' },
    { action_key: 'ph.common_areas.create', action_name: 'Crear Zona Común', description: 'Crear zona común' },
    { action_key: 'ph.common_areas.edit', action_name: 'Editar Zona Común', description: 'Editar zona común' },
    { action_key: 'ph.common_areas.delete', action_name: 'Eliminar Zona Común', description: 'Eliminar zona común' },

    // Reservas
    { action_key: 'ph.reservations.view', action_name: 'Ver Reservas', description: 'Ver reservas de zonas comunes' },
    { action_key: 'ph.reservations.create', action_name: 'Crear Reserva', description: 'Crear reserva' },
    { action_key: 'ph.reservations.edit', action_name: 'Editar Reserva', description: 'Editar reserva' },
    { action_key: 'ph.reservations.cancel', action_name: 'Cancelar Reserva', description: 'Cancelar reserva' },
    { action_key: 'ph.reservations.confirm', action_name: 'Confirmar Reserva', description: 'Confirmar reserva' },
    { action_key: 'ph.reservations.complete', action_name: 'Completar Reserva', description: 'Completar reserva' },

    // Conceptos de Cobro
    { action_key: 'ph.fee_concepts.view', action_name: 'Ver Conceptos de Cobro', description: 'Ver conceptos de cobro' },
    { action_key: 'ph.fee_concepts.create', action_name: 'Crear Concepto de Cobro', description: 'Crear concepto de cobro' },
    { action_key: 'ph.fee_concepts.edit', action_name: 'Editar Concepto de Cobro', description: 'Editar concepto de cobro' },
    { action_key: 'ph.fee_concepts.delete', action_name: 'Eliminar Concepto de Cobro', description: 'Eliminar concepto de cobro' },

    // Facturación (Periodos)
    { action_key: 'ph.billing.view', action_name: 'Ver Facturación', description: 'Ver periodos y cuotas' },
    { action_key: 'ph.billing.create_period', action_name: 'Crear Periodo', description: 'Crear periodo de facturación' },
    { action_key: 'ph.billing.edit_period', action_name: 'Editar Periodo', description: 'Editar periodo de facturación' },
    { action_key: 'ph.billing.delete_period', action_name: 'Eliminar Periodo', description: 'Eliminar periodo de facturación' },
    { action_key: 'ph.billing.close_period', action_name: 'Cerrar Periodo', description: 'Cerrar periodo de facturación' },
    { action_key: 'ph.billing.generate_fees', action_name: 'Generar Cuotas', description: 'Generar cuotas masivamente' },
    { action_key: 'ph.billing.edit_fee', action_name: 'Editar Cuota', description: 'Editar cuota individual' },
    { action_key: 'ph.billing.delete_fee', action_name: 'Eliminar Cuota', description: 'Eliminar cuota' },

    // Configuración de Facturación
    { action_key: 'ph.billing.create_config', action_name: 'Crear Config Facturación', description: 'Crear configuración de interés, descuento o recargo' },
    { action_key: 'ph.billing.edit_config', action_name: 'Editar Config Facturación', description: 'Editar configuración de interés, descuento o recargo' },
    { action_key: 'ph.billing.delete_config', action_name: 'Eliminar Config Facturación', description: 'Eliminar configuración de interés, descuento o recargo' },

    // Alquileres
    { action_key: 'ph.rentals.view', action_name: 'Ver Alquileres', description: 'Ver alquileres' },
    { action_key: 'ph.rentals.create', action_name: 'Crear Alquiler', description: 'Crear alquiler' },
    { action_key: 'ph.rentals.edit', action_name: 'Editar Alquiler', description: 'Editar alquiler' },
    { action_key: 'ph.rentals.delete', action_name: 'Eliminar Alquiler', description: 'Eliminar alquiler' },
    { action_key: 'ph.rentals.checkout', action_name: 'Checkout Alquiler', description: 'Finalizar alquiler' },

    // Asambleas
    { action_key: 'ph.assemblies.view', action_name: 'Ver Asambleas', description: 'Ver asambleas de copropietarios' },
    { action_key: 'ph.assemblies.create', action_name: 'Crear Asamblea', description: 'Crear asamblea' },
    { action_key: 'ph.assemblies.edit', action_name: 'Editar Asamblea', description: 'Editar asamblea' },
    { action_key: 'ph.assemblies.delete', action_name: 'Eliminar Asamblea', description: 'Eliminar asamblea' },
    { action_key: 'ph.assemblies.manage_attendance', action_name: 'Gestionar Asistencia', description: 'Registrar y eliminar asistencia' },
    { action_key: 'ph.assemblies.manage_votes', action_name: 'Gestionar Votaciones', description: 'Crear, abrir y cerrar votaciones' },
    { action_key: 'ph.assemblies.export', action_name: 'Exportar Asambleas', description: 'Exportar asistencia y votaciones a Excel' },

    // PQRS
    { action_key: 'ph.pqrs.view', action_name: 'Ver PQRS', description: 'Ver solicitudes PQRS' },
    { action_key: 'ph.pqrs.create', action_name: 'Crear PQRS', description: 'Registrar solicitud PQRS' },
    { action_key: 'ph.pqrs.edit', action_name: 'Editar PQRS', description: 'Editar solicitud PQRS' },
    { action_key: 'ph.pqrs.delete', action_name: 'Eliminar PQRS', description: 'Eliminar solicitud PQRS' },
    { action_key: 'ph.pqrs.respond', action_name: 'Responder PQRS', description: 'Responder a solicitudes PQRS' },
    { action_key: 'ph.pqrs.change_status', action_name: 'Cambiar Estado PQRS', description: 'Cambiar estado de solicitudes PQRS' },

    // Comunicados
    { action_key: 'ph.comunicados.view', action_name: 'Ver Comunicados', description: 'Ver comunicados enviados' },
    { action_key: 'ph.comunicados.create', action_name: 'Crear Comunicado', description: 'Crear y enviar comunicados' },
    { action_key: 'ph.comunicados.delete', action_name: 'Eliminar Comunicado', description: 'Eliminar comunicados' },

    // Portería
    { action_key: 'ph.porteria.view', action_name: 'Ver Portería', description: 'Ver módulo de portería' },
    { action_key: 'ph.porteria.manage_access', action_name: 'Gestionar Control de Acceso', description: 'Registrar entradas y salidas' },
    { action_key: 'ph.porteria.manage_packages', action_name: 'Gestionar Paquetería', description: 'Registrar y entregar paquetes' },
    { action_key: 'ph.porteria.manage_minuta', action_name: 'Gestionar Minuta', description: 'Registrar novedades en la minuta' },

    // Documentos (admin)
    { action_key: 'ph.documents.view', action_name: 'Ver Documentos PH', description: 'Ver espacio documental' },
    { action_key: 'ph.documents.manage', action_name: 'Gestionar Documentos PH', description: 'Crear, editar y eliminar documentos' },

    // Plan de Mantenimiento (admin)
    { action_key: 'ph.maintenance.view', action_name: 'Ver Plan de Mantenimiento', description: 'Ver planes de mantenimiento' },
    { action_key: 'ph.maintenance.manage', action_name: 'Gestionar Mantenimiento', description: 'Crear, editar y eliminar planes de mantenimiento' },

    // Pólizas (admin)
    { action_key: 'ph.policies.view', action_name: 'Ver Pólizas', description: 'Ver pólizas de seguros' },
    { action_key: 'ph.policies.manage', action_name: 'Gestionar Pólizas', description: 'Crear, editar y eliminar pólizas' },

    // Facturación - gestión (admin)
    { action_key: 'ph.billing.manage', action_name: 'Gestionar Facturación', description: 'Generar facturas, cerrar periodos, enviar masivamente' },

    // Configuración
    { action_key: 'ph.settings.view', action_name: 'Ver Configuración PH', description: 'Ver configuración de PH' },
    { action_key: 'ph.settings.edit', action_name: 'Editar Configuración PH', description: 'Editar configuración de PH' },
];
