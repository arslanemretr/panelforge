export interface Project {
  id: number;
  name: string;
  customer_name: string | null;
  panel_code: string | null;
  prepared_by: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Panel {
  id?: number;
  project_id?: number;
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  mounting_plate_width_mm?: number | null;
  mounting_plate_height_mm?: number | null;
  left_margin_mm: number;
  right_margin_mm: number;
  top_margin_mm: number;
  bottom_margin_mm: number;
  busbar_orientation?: string | null;
  phase_system?: string | null;
  busbar_rail_offset_mm?: number | null;
  busbar_end_setback_mm?: number | null;
}

export interface PanelType {
  id: number;
  name: string;
}

export interface PanelDefinition extends Panel {
  id: number;
  name: string;
  description?: string | null;
  panel_type_id?: number | null;
  panel_type?: PanelType | null;
  origin_x_mm?: number;
  origin_y_mm?: number;
  origin_z_mm?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPanel {
  id: number;
  project_id: number;
  panel_definition_id: number;
  label?: string | null;
  seq: number;
  quantity: number;
  panel_definition: PanelDefinition;
}

export interface BendParameter {
  id?: number;
  order_no: number;
  name: string;           // "A1", "B", "C"
  label: string;          // "Alt Ayak Uzunluğu"
  default_value: number;
  formula?: string | null; // hesaplananlar: "A1+A2"
  is_calculated: boolean;
}

export interface BendSegment {
  id?: number;
  order_no: number;
  label: string;           // "A1 Kolu", "Yatay B"
  length_expr: string;     // "A1", "A1+A2", "B+25"
  angle_from_prev: number; // 0=düz, +90=sola, -90=sağa
}

export interface BendType {
  id: number;
  name: string;
  description?: string | null;
  template_type: string;   // "Z"|"ZL"|"Tip-1"|"Tip-2"|"Özel"
  thickness_mm: number;
  parallel_count: number;  // 1-4
  start_direction: string; // "up"|"right"
  parameters: BendParameter[];
  segments: BendSegment[];
  bend_count?: number;     // liste endpoint'i için
  created_at?: string;
  updated_at?: string;
}

export interface TerminalDefinition {
  id: number;
  name: string;
  terminal_type: string;                     // "Ön Bakır Basmalı" | "Arka Yatay Taraklı" | "Yandan Taraklı"
  surface: string;                           // "front" | "back" | "left" | "right" | "top" | "bottom"
  bolt_type?: string | null;
  bolt_count?: number | null;
  bolt_center_distance_mm?: number | null;
  hole_diameter_mm?: number | null;
  terminal_width_mm?: number | null;
  terminal_height_mm?: number | null;
  terminal_depth_mm?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceTerminal {
  id?: number;
  device_id?: number;
  terminal_definition_id?: number | null;   // FK → terminal_definitions
  terminal_name: string;
  phase: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number;
  terminal_face?: string | null;            // "front" | "back" | "left" | "right" | "top" | "bottom"
  hole_diameter_mm?: number | null;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
  terminal_role?: string | null;            // "input" | "output"
  terminal_group?: string | null;           // "line" | "load" | "bus" | "branch"
  // Geriye dönük uyumluluk alanları
  terminal_type?: string | null;
  terminal_width_mm?: number | null;
  terminal_height_mm?: number | null;
  terminal_depth_mm?: number | null;
  bolt_type?: string | null;
  bolt_count?: number | null;
  bolt_center_distance_mm?: number | null;
}

export interface DeviceConnection {
  id: number;
  project_id: number;
  source_type: string;             // "busbar" | "device"
  source_device_id: number | null;
  source_terminal_id: number | null;
  target_device_id: number;
  target_terminal_id: number;
  phase: string;
  connection_type: string;         // "main_to_device" | "device_to_device"
}

export interface Device {
  id: number;
  brand: string;
  model: string;
  device_type: string;
  enclosure_type?: string | null;  // "Sabit" | "Çekme" | "Eklenti"
  poles: number;
  current_a?: number | null;
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  reference_origin?: string | null; // "Ön-Sol-Alt" | "Ön-Merkez-Alt" | "Arka-Merkez-Alt" | "Merkez Nokta"
  terminals: DeviceTerminal[];
  created_at?: string;
  updated_at?: string;
}

export interface DeviceImportError {
  sheet: string;
  row: number;
  message: string;
}

export interface DeviceImportPreviewRow {
  device_code: string;
  brand: string;
  model: string;
  device_type: string;
  poles: number;
  current_a?: number | null;
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  terminal_count: number;
}

export interface DeviceImportPreview {
  can_import: boolean;
  device_count: number;
  terminal_count: number;
  errors: DeviceImportError[];
  devices: DeviceImportPreviewRow[];
}

export interface DeviceImportResult {
  created_device_count: number;
  created_terminal_count: number;
}

export interface ProjectDevice {
  id: number;
  project_id: number;
  project_panel_id: number | null;
  device_id: number;
  label: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number;
  rotation_deg: number;        // = rotation_z_deg
  rotation_x_deg?: number;
  rotation_y_deg?: number;
  quantity: number;
  device: Device;
}

export interface CopperDefinition {
  id: number;
  name: string;
  copper_kind: string;
  description?: string | null;
  main_width_mm?: number | null;
  main_thickness_mm?: number | null;
  main_material: string;
  main_phase_spacing_mm?: number | null;
  branch_width_mm?: number | null;
  branch_thickness_mm?: number | null;
  branch_material: string;
  branch_phase_spacing_mm?: number | null;
  bend_inner_radius_mm?: number | null;
  k_factor?: number | null;
  min_hole_edge_distance_mm?: number | null;
  min_bend_hole_distance_mm?: number | null;
  default_hole_diameter_mm?: number | null;
  use_slot_holes: boolean;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
  density_g_cm3?: number | null;
  coating_type?: string | null;
  busbar_x_mm?: number | null;
  busbar_y_mm?: number | null;
  busbar_z_mm?: number | null;
  busbar_orientation?: string | null;
  busbar_length_mm?: number | null;
  // Elektriksel yerleşim
  phase_type?: string | null;
  bars_per_phase?: number | null;
  bar_gap_mm?: number | null;
  phase_center_mm?: number | null;
  layer_type?: string | null;
  neutral_bar_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface BranchConductor {
  id: number;
  name: string;
  description?: string | null;
  conductor_kind: "dahili" | "harici";

  copper_definition_id?: number | null;
  thickness_mm?: number | null;
  width_mm?: number | null;

  bend_type_id?: number | null;
  device_id?: number | null;
  terminal_label?: string | null;

  phase?: string | null;
  parallel_count: number;

  start_point?: string | null;
  end_point?: string | null;

  // nested (Read)
  copper_definition?: CopperDefinition | null;
  bend_type?: BendType | null;
  device?: Device | null;

  created_at?: string;
  updated_at?: string;
}

export interface ProjectCopper {
  id: number;
  project_id: number;
  copper_definition_id: number;
  length_mm: number;
  quantity: number;
  seq: number;
  copper_definition: CopperDefinition;
}

export interface CopperSettings {
  id?: number;
  project_id?: number;
  main_width_mm?: number | null;
  main_thickness_mm?: number | null;
  main_material: string;
  main_phase_spacing_mm?: number | null;
  branch_width_mm?: number | null;
  branch_thickness_mm?: number | null;
  branch_material: string;
  branch_phase_spacing_mm?: number | null;
  bend_inner_radius_mm?: number | null;
  k_factor?: number | null;
  min_hole_edge_distance_mm?: number | null;
  min_bend_hole_distance_mm?: number | null;
  default_hole_diameter_mm?: number | null;
  use_slot_holes: boolean;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
  // Ana bakır yerleşim
  busbar_x_mm?: number | null;
  busbar_y_mm?: number | null;
  busbar_z_mm?: number | null;
  busbar_orientation?: string | null;
  busbar_length_mm?: number | null;
  busbar_phase_count?: number | null;
  bars_per_phase?: number | null;     // Faz başına paralel bar sayısı (varsayılan 1)
  bar_gap_mm?: number | null;         // Aynı fazdaki barlar arası boşluk (mm)
  busbar_plane?: string | null;       // "XY" | "XZ"
  phase_stack_axis?: string | null;   // "Y" | "Z"
  main_density_g_cm3?: number | null;    // g/cm³ override; null → malzeme varsayılanı
  branch_density_g_cm3?: number | null;  // g/cm³ override; null → malzeme varsayılanı
  k_factor_edgewise?: number | null;         // edgewise büküm K faktörü (varsayılan 0.40)
  busbar_clearance_mm?: number | null;       // ana bara-bara arası min. hava boşluğu
  branch_clearance_mm?: number | null;       // tali bara-bara arası min. hava boşluğu
  min_hole_hole_distance_mm?: number | null; // delik merkezi-merkezi arası min. mesafe
  coating_type?: string | null;             // "Kaplamasız" | "Kalay Kaplı" | vb.
  main_phase_center_mm?: number | null;     // ana faz L1↔L2 merkez-merkez mesafesi
  branch_phase_center_mm?: number | null;   // tali faz merkez-merkez mesafesi
  main_copper_definition_id?: number | null;
  branch_copper_definition_id?: number | null;
}

export interface ValidationResult {
  can_calculate: boolean;
  missing_fields: string[];
  warnings: string[];
}

export interface BusbarSegment {
  seq: number;
  start_x_mm: number;
  start_y_mm: number;
  start_z_mm?: number;
  end_x_mm: number;
  end_y_mm: number;
  end_z_mm?: number;
}

export interface BusbarHole {
  hole_no: number;
  x_mm: number;
  y_mm: number;
  diameter_mm?: number | null;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
  face?: string | null;            // "front" | "back" | "left" | "right" | "top" | "bottom"
  description?: string | null;
}

export interface BusbarBend {
  bend_no: number;
  distance_from_start_mm: number;
  angle_deg: number;
  direction: string;
  inner_radius_mm: number;
  bend_axis?: string | null;       // "X" | "Y" | "Z"
  bend_type?: string | null;       // "flatwise" | "edgewise"
  bend_allowance_mm?: number | null;
  description?: string | null;
}

export interface Busbar {
  id: number;
  part_no: string;
  name: string;
  busbar_type: string;
  phase: string;
  connected_device_label?: string | null;
  width_mm: number;
  thickness_mm: number;
  material: string;
  quantity: number;
  cut_length_mm: number;
  segments: BusbarSegment[];
  holes: BusbarHole[];
  bends: BusbarBend[];
}

export interface CalculationSummary {
  main_busbar_count: number;
  branch_busbar_count: number;
  total_cut_length_mm: number;
  total_hole_count: number;
  total_bend_count: number;
  total_weight_kg: number;
}

export interface CalculationResults {
  summary: CalculationSummary;
  busbars: Busbar[];
  warnings: string[];
}
