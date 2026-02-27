export interface ModuleDef {
  module_key: string;
  module_name: string;
  description: string;
  icon: string;
  group: string;
  sort_order: number;
}

export interface ActionDef {
  action_key: string;
  action_name: string;
  description: string;
}
