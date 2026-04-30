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

export interface PanelDefinition extends Panel {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPanel {
  id: number;
  project_id: number;
  panel_definition_id: number;
  label?: string | null;
  seq: number;
  panel_definition: PanelDefinition;
}

export interface DeviceTerminal {
  id?: number;
  device_id?: number;
  terminal_name: string;
  phase: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number;
  terminal_face?: string | null;   // "front" | "back" | "left" | "right" | "top" | "bottom"
  hole_diameter_mm?: number | null;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
}

export interface Device {
  id: number;
  brand: string;
  model: string;
  device_type: string;
  poles: number;
  current_a?: number | null;
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  terminals: DeviceTerminal[];
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
  created_at: string;
  updated_at: string;
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
