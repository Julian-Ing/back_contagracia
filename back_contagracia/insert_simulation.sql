BEGIN;

-- ══════════════════════════════════════════════════════
-- ASIENTO 1: Saldo inicial activos + capital + anticipos
-- ══════════════════════════════════════════════════════
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at)
VALUES ('ae000001-0000-0000-0000-000000000001', 'SI-2026-001', '2026-01-01',
        'Saldo inicial - activos fijos y capital', 'opening_balance', now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description)
VALUES
  (gen_random_uuid(), 'ae000001-0000-0000-0000-000000000001', '152005', 'DEBIT',  18000000, 'Maquinaria y equipo de oficina'),
  (gen_random_uuid(), 'ae000001-0000-0000-0000-000000000001', '310505', 'CREDIT', 14500000, 'Capital suscrito y pagado'),
  (gen_random_uuid(), 'ae000001-0000-0000-0000-000000000001', '28050501', 'CREDIT', 3500000, 'Anticipos de clientes recibidos');

-- ── ENERO ──────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000001','NOM-2026-001','2026-01-31','Nomina enero 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000001','PAR-2026-001','2026-01-31','Parafiscales enero 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000001','DEP-2026-001','2026-01-31','Depreciacion enero 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000001','ING-2026-001','2026-01-31','Reconocimiento ingresos enero 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000001','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000001','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000001','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000001','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000001','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000001','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000001','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000001','516005','DEBIT', 300000,'Depreciacion maquinaria enero'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000001','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000001','28050501','DEBIT', 583333,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000001','413505','CREDIT', 583333,'Ingresos por servicios enero');

-- ── FEBRERO ────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000002','NOM-2026-002','2026-02-28','Nomina febrero 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000002','PAR-2026-002','2026-02-28','Parafiscales febrero 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000002','DEP-2026-002','2026-02-28','Depreciacion febrero 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000002','ING-2026-002','2026-02-28','Reconocimiento ingresos febrero 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000002','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000002','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000002','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000002','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000002','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000002','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000002','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000002','516005','DEBIT', 300000,'Depreciacion maquinaria febrero'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000002','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000002','28050501','DEBIT', 583333,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000002','413505','CREDIT', 583333,'Ingresos por servicios febrero');

-- ── MARZO ──────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000003','NOM-2026-003','2026-03-31','Nomina marzo 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000003','PAR-2026-003','2026-03-31','Parafiscales marzo 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000003','DEP-2026-003','2026-03-31','Depreciacion marzo 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000003','ING-2026-003','2026-03-31','Reconocimiento ingresos marzo 2026','manual',now()),
  ('ae000006-0000-0000-0000-000000000003','GST-2026-001','2026-03-31','Gastos generales Q1 2026','manual',now()),
  ('ae000007-0000-0000-0000-000000000003','CTO-2026-001','2026-03-31','Costo de ventas Q1 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000003','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000003','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000003','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000003','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000003','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000003','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000003','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000003','516005','DEBIT', 300000,'Depreciacion maquinaria marzo'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000003','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000003','28050501','DEBIT', 583334,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000003','413505','CREDIT', 583334,'Ingresos por servicios marzo'),
  (gen_random_uuid(),'ae000006-0000-0000-0000-000000000003','52959505','DEBIT', 850000,'Gastos diversos Q1'),
  (gen_random_uuid(),'ae000006-0000-0000-0000-000000000003','238099','CREDIT',  850000,'Otras deducciones por pagar'),
  (gen_random_uuid(),'ae000007-0000-0000-0000-000000000003','613505','DEBIT', 2200000,'Costo de ventas Q1'),
  (gen_random_uuid(),'ae000007-0000-0000-0000-000000000003','279999','CREDIT',2200000,'Provision costos Q1');

-- ── ABRIL ──────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000004','NOM-2026-004','2026-04-30','Nomina abril 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000004','PAR-2026-004','2026-04-30','Parafiscales abril 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000004','DEP-2026-004','2026-04-30','Depreciacion abril 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000004','ING-2026-004','2026-04-30','Reconocimiento ingresos abril 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000004','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000004','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000004','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000004','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000004','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000004','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000004','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000004','516005','DEBIT', 300000,'Depreciacion maquinaria abril'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000004','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000004','28050501','DEBIT', 583333,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000004','413505','CREDIT', 583333,'Ingresos por servicios abril');

-- ── MAYO ───────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000005','NOM-2026-005','2026-05-31','Nomina mayo 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000005','PAR-2026-005','2026-05-31','Parafiscales mayo 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000005','DEP-2026-005','2026-05-31','Depreciacion mayo 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000005','ING-2026-005','2026-05-31','Reconocimiento ingresos mayo 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000005','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000005','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000005','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000005','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000005','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000005','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000005','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000005','516005','DEBIT', 300000,'Depreciacion maquinaria mayo'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000005','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000005','28050501','DEBIT', 583333,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000005','413505','CREDIT', 583333,'Ingresos por servicios mayo');

-- ── JUNIO ──────────────────────────────────────────────
INSERT INTO journal_entries (id, consecutive, date, description, type_key, created_at) VALUES
  ('ae000002-0000-0000-0000-000000000006','NOM-2026-006','2026-06-30','Nomina junio 2026','manual',now()),
  ('ae000003-0000-0000-0000-000000000006','PAR-2026-006','2026-06-30','Parafiscales junio 2026','manual',now()),
  ('ae000004-0000-0000-0000-000000000006','DEP-2026-006','2026-06-30','Depreciacion junio 2026','manual',now()),
  ('ae000005-0000-0000-0000-000000000006','ING-2026-006','2026-06-30','Reconocimiento ingresos junio 2026','manual',now()),
  ('ae000006-0000-0000-0000-000000000006','GST-2026-002','2026-06-30','Gastos generales Q2 2026','manual',now()),
  ('ae000007-0000-0000-0000-000000000006','CTO-2026-002','2026-06-30','Costo de ventas Q2 2026','manual',now());

INSERT INTO journal_entry_items (id, journal_entry_id, account_code, type, amount, description) VALUES
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000006','510505','DEBIT', 2800000,'Gastos de personal'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000006','513065','DEBIT',  117172,'Auxilio de transporte'),
  (gen_random_uuid(),'ae000002-0000-0000-0000-000000000006','250505','CREDIT',2917172,'Salarios por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000006','512560','DEBIT', 238000,'Aporte salud empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000006','512580','DEBIT', 336000,'Aporte pension empleador'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000006','237035','CREDIT',238000,'Salud por pagar'),
  (gen_random_uuid(),'ae000003-0000-0000-0000-000000000006','237040','CREDIT',336000,'Pension por pagar'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000006','516005','DEBIT', 300000,'Depreciacion maquinaria junio'),
  (gen_random_uuid(),'ae000004-0000-0000-0000-000000000006','159205','CREDIT',300000,'Depreciacion acumulada'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000006','28050501','DEBIT', 583334,'Reconocimiento anticipo clientes'),
  (gen_random_uuid(),'ae000005-0000-0000-0000-000000000006','413505','CREDIT', 583334,'Ingresos por servicios junio'),
  (gen_random_uuid(),'ae000006-0000-0000-0000-000000000006','52959505','DEBIT', 920000,'Gastos diversos Q2'),
  (gen_random_uuid(),'ae000006-0000-0000-0000-000000000006','238099','CREDIT',  920000,'Otras deducciones por pagar'),
  (gen_random_uuid(),'ae000007-0000-0000-0000-000000000006','613505','DEBIT', 2350000,'Costo de ventas Q2'),
  (gen_random_uuid(),'ae000007-0000-0000-0000-000000000006','279999','CREDIT',2350000,'Provision costos Q2');

COMMIT;
