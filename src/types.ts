export interface HassEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
}

// Minimal slice of the `hass` object the card relies on.
export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>
  ): Promise<unknown>
}

export interface RenaultR5CardConfig {
  type: string
  name?: string
  battery_entity: string
  range_entity?: string
  charging_entity?: string
  plugged_entity?: string
  start_charge_entity?: string
  start_ac_entity?: string
}
