// ─── Enums ───

export type ResidentType = 'owner' | 'tenant';
export type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'other';
export type CalculationType = 'fixed' | 'per_m2' | 'coefficient';
export type RentalFeeType = 'fixed' | 'per_hour' | 'per_day';
export type BillingPeriodStatus = 'draft' | 'generated' | 'closed';
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type FeeType = 'regular' | 'interest' | 'discount' | 'surcharge';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type RentalStatus = 'active' | 'completed' | 'cancelled';
export type BillingConfigType = 'interest' | 'discount' | 'surcharge';
export type ValueType = 'percentage' | 'fixed_amount';
export type CalculationPeriod = 'daily' | 'monthly' | 'annual';

// ─── Interfaces ───

export interface PhCondominium {
  id: string;
  company_id: string;
  name: string;
  nit?: string | null;
  address?: string | null;
  department_id?: string | null;
  municipality_id?: string | null;
  phone?: string | null;
  email?: string | null;
  admin_company_id?: string | null;
  total_units?: number | null;
  price_per_m2?: number | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  towers?: PhTower[];
  _count?: { towers?: number; units?: number };
}

export interface PhTower {
  id: string;
  condominium_id: string;
  name: string;
  code?: string | null;
  total_floors?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  condominium?: PhCondominium;
  _count?: { units?: number };
}

export interface PhUnitType {
  id: string;
  company_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  is_rentable: boolean;
  is_parking: boolean;
  free_minutes?: number | null;
  rental_fee?: number | null;
  rental_fee_type?: RentalFeeType | null;
  fee_concept_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhUnit {
  id: string;
  condominium_id: string;
  tower_id?: string | null;
  unit_type_id?: string | null;
  unit_number: string;
  floor?: number | null;
  area_m2?: number | null;
  coefficient?: number | null;
  parent_unit_id?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  condominium?: PhCondominium;
  tower?: PhTower | null;
  unit_type?: PhUnitType | null;
  parent_unit?: PhUnit | null;
  child_units?: PhUnit[];
  residents?: PhResident[];
  vehicles?: PhVehicle[];
  _count?: { residents?: number; vehicles?: number };
}

export interface PhResident {
  id: string;
  unit_id: string;
  tercero_id: string;
  resident_type: ResidentType;
  is_primary: boolean;
  move_in_date?: string | null;
  move_out_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  unit?: PhUnit;
  vehicles?: PhVehicle[];
}

export interface PhVehicle {
  id: string;
  unit_id: string;
  resident_id?: string | null;
  vehicle_type: VehicleType;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  plate?: string | null;
  sticker_number?: string | null;
  parking_space?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  unit?: PhUnit;
  resident?: PhResident | null;
}

export interface PhFeeConcept {
  id: string;
  company_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  default_amount?: number | null;
  is_recurring: boolean;
  calculation_type: CalculationType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhBillingPeriod {
  id: string;
  condominium_id: string;
  name: string;
  year: number;
  month: number;
  due_date?: string | null;
  notes?: string | null;
  status: BillingPeriodStatus;
  generated_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  condominium?: PhCondominium;
  _count?: { fees?: number };
}

export interface PhFee {
  id: string;
  billing_period_id: string;
  unit_id: string;
  fee_concept_id: string;
  resident_id?: string | null;
  amount: number;
  balance: number;
  status: FeeStatus;
  due_date?: string | null;
  paid_at?: string | null;
  fee_type: FeeType;
  parent_fee_id?: string | null;
  notes?: string | null;
  email_sent_at?: string | null;
  created_at: string;
  updated_at: string;
  billing_period?: PhBillingPeriod;
  unit?: PhUnit;
  fee_concept?: PhFeeConcept;
  resident?: PhResident | null;
}

export interface PhPayment {
  id: string;
  fee_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface PhCommonArea {
  id: string;
  condominium_id: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  rental_fee?: number | null;
  requires_deposit: boolean;
  deposit_amount?: number | null;
  requires_approval: boolean;
  min_hours?: number | null;
  max_hours?: number | null;
  available_from?: string | null;
  available_to?: string | null;
  available_days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  condominium?: PhCondominium;
  _count?: { reservations?: number };
}

export interface PhReservation {
  id: string;
  common_area_id: string;
  unit_id?: string | null;
  tercero_id?: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  total_fee?: number | null;
  deposit_paid: boolean;
  notes?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  common_area?: PhCommonArea;
  unit?: PhUnit | null;
}

export interface PhRental {
  id: string;
  unit_id: string;
  renter_unit_id: string;
  condominium_id: string;
  start_time: string;
  end_time?: string | null;
  total_minutes?: number | null;
  billable_minutes?: number | null;
  amount?: number | null;
  fee_id?: string | null;
  status: RentalStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  unit?: PhUnit;
  renter_unit?: PhUnit;
  condominium?: PhCondominium;
}

export interface PhBillingConfigConcept {
  id: string;
  billing_config_id: string;
  fee_concept_id: string;
  fee_concept?: PhFeeConcept;
}

export interface PhBillingConfig {
  id: string;
  condominium_id: string;
  config_type: BillingConfigType;
  name: string;
  description?: string | null;
  value_type: ValueType;
  value: number;
  calculation_period?: CalculationPeriod | null;
  grace_days: number;
  is_compound: boolean;
  max_percentage?: number | null;
  max_amount?: number | null;
  effective_from: string;
  effective_to?: string | null;
  applies_to_all_concepts: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  condominium?: PhCondominium;
  concept_associations?: PhBillingConfigConcept[];
}

// ─── Insurance Policies ───

export type InsurancePolicyStatus = 'active' | 'expired' | 'cancelled';
export type InsurancePolicyType =
  | 'todo_riesgo'
  | 'incendio'
  | 'terremoto'
  | 'responsabilidad_civil'
  | 'otro';

export interface PhInsuranceThirdParty {
  id: string;
  name: string;
  identification_number?: string | null;
}

export interface PhInsurancePolicyInsurer {
  id: string;
  policy_id: string;
  third_party_id: string;
  role: string;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  third_party?: PhInsuranceThirdParty;
}

export interface PhInsurancePolicy {
  id: string;
  condominium_id: string;
  insurance_third_party_id?: string | null;
  policy_number: string;
  insurance_company: string;
  policy_type: InsurancePolicyType;
  coverage_amount?: number | null;
  premium?: number | null;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  status: InsurancePolicyStatus;
  document_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  insurance_third_party?: PhInsuranceThirdParty | null;
  insurers?: PhInsurancePolicyInsurer[];
}

// ─── Planes de mantenimiento ───

export type MaintenanceCategory =
  | 'ascensores'
  | 'bombas'
  | 'tanques'
  | 'jardines'
  | 'electrico'
  | 'plomeria'
  | 'pintura'
  | 'impermeabilizacion'
  | 'fumigacion'
  | 'otro';

export type MaintenanceFrequency =
  | 'mensual'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'
  | 'unica';

export type MaintenancePlanStatus = 'active' | 'paused' | 'completed';

export interface PhMaintenancePlan {
  id: string;
  condominium_id: string;
  unit_id?: string | null;
  provider_third_party_id?: string | null;
  name: string;
  description?: string | null;
  category: MaintenanceCategory;
  frequency: MaintenanceFrequency;
  estimated_cost?: number | null;
  last_maintenance_date?: string | null;
  next_maintenance_date: string;
  status: MaintenancePlanStatus;
  document_url?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  unit?: { id: string; unit_number: string; condominium_id: string } | null;
  provider?: { id: string; name: string; identification_number?: string | null } | null;
  logs?: PhMaintenanceLog[];
  _count?: { logs?: number };
}

export interface PhMaintenanceLog {
  id: string;
  plan_id: string;
  unit_ids: string[];
  performed_date: string;
  performed_by?: string | null;
  provider_third_party_id?: string | null;
  actual_cost?: number | null;
  observations?: string | null;
  document_url?: string | null;
  created_by?: string | null;
  created_at: string;
  provider?: { id: string; name: string; identification_number?: string | null } | null;
}

// ─── Documentos ───

export type DocumentStatus = 'active' | 'archived';

export interface PhDocumentCategory {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  _count?: { documents?: number };
}

export interface PhDocument {
  id: string;
  condominium_id: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  notes?: string | null;
  status: DocumentStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  category?: { id: string; name: string; slug: string; color?: string | null; icon?: string | null } | null;
}

// ─── Asambleas ───

export type AssemblyStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AssemblyType = 'ordinary' | 'extraordinary';
export type VoteType = 'yes_no' | 'multiple_choice';
export type VoteStatus = 'pending' | 'open' | 'closed';

export interface PhAssembly {
  id: string;
  condominium_id: string;
  title: string;
  description?: string | null;
  assembly_date: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  assembly_type: AssemblyType;
  quorum_required?: number | null;
  quorum_reached: boolean;
  qr_code?: string | null;
  status: AssemblyStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  condominium?: { id: string; name: string };
  attendances?: PhAssemblyAttendance[];
  votes?: PhAssemblyVote[];
  _count?: { attendances?: number; votes?: number };
}

export interface PhAssemblyAttendance {
  id: string;
  assembly_id: string;
  unit_id?: string | null;
  tercero_id?: string | null;
  resident_name?: string | null;
  unit_label?: string | null;
  delegate_name?: string | null;
  method: string;
  checked_in_at: string;
  notes?: string | null;
  created_at: string;
}

export interface PhAssemblyVote {
  id: string;
  assembly_id: string;
  title: string;
  description?: string | null;
  vote_type: VoteType;
  options?: string | null;
  status: VoteStatus;
  opened_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  results?: PhAssemblyVoteResult[];
  _count?: { results?: number };
}

export interface PhAssemblyVoteResult {
  id: string;
  vote_id: string;
  tercero_id?: string | null;
  unit_id?: string | null;
  resident_name?: string | null;
  unit_label?: string | null;
  selected_option: string;
  voted_at: string;
}

export interface AttendanceStats {
  total_attendees: number;
  owner_attendees: number;
  total_owners: number;
  total_units: number;
  total_coefficient: number;
  present_coefficient: number;
  quorum_percent: number;
  quorum_required: number | null;
  quorum_reached: boolean;
  use_coefficients: boolean;
}

export interface VoteResults {
  vote: PhAssemblyVote;
  summary: Record<string, number>;
  total_votes: number;
}

// ─── Dashboard ───

export interface PhDashboardStats {
  condominiums: number;
  units: number;
  residents: number;
  vehicles: number;
  common_areas: number;
  fees_pending: number;
  fees_overdue: number;
  fees_pending_amount: number;
  active_rentals: number;
  pending_reservations: number;
}

// ─── Paginated Response ───

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
