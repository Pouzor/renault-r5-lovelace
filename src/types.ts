import type { CarColor } from './colors'

export interface HassEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_updated?: string
}

// Entry of the entity registry as exposed to the frontend.
export interface HassEntityRegistryEntry {
  entity_id: string
  device_id?: string | null
  platform?: string
  translation_key?: string | null
}

// Minimal slice of the `hass` object the card relies on.
export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>
  entities?: Record<string, HassEntityRegistryEntry | undefined>
  language?: string
  locale?: { language: string }
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>
  ): Promise<unknown>
}

export const INFO_ITEMS = ['battery', 'range', 'status', 'hvac', 'mileage', 'updated'] as const
export const BUTTON_ITEMS = ['start_charge', 'start_ac', 'flash_lights', 'horn'] as const
export const BUTTONS_POSITIONS = ['bottom', 'right'] as const
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20

export type InfoItem = (typeof INFO_ITEMS)[number]
export type ButtonItem = (typeof BUTTON_ITEMS)[number]
export type ButtonsPosition = (typeof BUTTONS_POSITIONS)[number]

export interface RenaultR5CardConfig {
  type: string
  name?: string
  color?: CarColor
  // Both default to every item; an item also needs its entity to be set.
  show_info?: InfoItem[]
  show_buttons?: ButtonItem[]
  // `right` stacks the buttons in a column beside the car, for wide cards.
  buttons_position?: ButtonsPosition
  // Battery level (%) at or below which the bar turns to the error colour.
  low_battery_threshold?: number
  battery_entity?: string
  range_entity?: string
  charging_entity?: string
  plugged_entity?: string
  charging_remaining_time_entity?: string
  hvac_entity?: string
  mileage_entity?: string
  // Timestamp of the last data sent by the car; without it the card falls back
  // to the latest update among the entities above.
  last_update_entity?: string
  start_charge_entity?: string
  start_ac_entity?: string
  flash_lights_entity?: string
  horn_entity?: string
}
