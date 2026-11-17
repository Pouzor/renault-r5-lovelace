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
export const BUTTONS_POSITIONS = ['bottom', 'right', 'compact'] as const
// Figures from the EV Charge Cost integration (github.com/Pouzor/ev-charge-cost).
export const CHARGE_ITEMS = [
  'last_cost',
  'last_energy',
  'last_distance',
  'cost_per_100km',
  'consumption',
  'total_cost',
] as const
// `compact` packs the figures in one panel; `tiles` gives each figure a tile.
export const CHARGE_LAYOUTS = ['compact', 'tiles'] as const
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20

export type InfoItem = (typeof INFO_ITEMS)[number]
export type ButtonItem = (typeof BUTTON_ITEMS)[number]
export type ButtonsPosition = (typeof BUTTONS_POSITIONS)[number]
export type ChargeItem = (typeof CHARGE_ITEMS)[number]
export type ChargeLayout = (typeof CHARGE_LAYOUTS)[number]

export interface RenaultR5CardConfig {
  type: string
  name?: string
  color?: CarColor
  // Both default to every item; an item also needs its entity to be set.
  show_info?: InfoItem[]
  show_buttons?: ButtonItem[]
  show_charge?: ChargeItem[]
  charge_layout?: ChargeLayout
  // `right` stacks the buttons in a column beside the car, for wide cards;
  // `compact` puts small icon-only buttons right under the car.
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
  // EV Charge Cost sensors; the charge section only shows when one is set.
  charge_session_cost_entity?: string
  charge_last_cost_entity?: string
  charge_last_energy_entity?: string
  charge_last_distance_entity?: string
  charge_last_cost_per_100km_entity?: string
  charge_last_consumption_entity?: string
  charge_total_cost_entity?: string
}
