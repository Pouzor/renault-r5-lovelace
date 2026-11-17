import type { HomeAssistant, RenaultR5CardConfig } from './types'

type EntityOption = Extract<keyof RenaultR5CardConfig, `${string}_entity`>

// Entity ids are localised (`sensor.<car>_batterie` on a French instance), so
// the Renault entities are recognised by translation key or device class.
const BY_TRANSLATION_KEY: Record<string, EntityOption> = {
  battery_autonomy: 'range_entity',
  mileage: 'mileage_entity',
  charging_remaining_time: 'charging_remaining_time_entity',
  hvac_status: 'hvac_entity',
  battery_last_activity: 'last_update_entity',
  start_charge: 'start_charge_entity',
  start_air_conditioner: 'start_ac_entity',
  flash_lights: 'flash_lights_entity',
  sound_horn: 'horn_entity',
}

const BY_DEVICE_CLASS: Record<string, EntityOption> = {
  'sensor:battery': 'battery_entity',
  'binary_sensor:battery_charging': 'charging_entity',
  'binary_sensor:plug': 'plugged_entity',
}

// Sensors of the EV Charge Cost integration, also named in the user's language.
const CHARGE_BY_TRANSLATION_KEY: Record<string, EntityOption> = {
  session_cost: 'charge_session_cost_entity',
  last_session_cost: 'charge_last_cost_entity',
  last_session_energy: 'charge_last_energy_entity',
  last_session_distance: 'charge_last_distance_entity',
  last_session_cost_per_100km: 'charge_last_cost_per_100km_entity',
  last_session_consumption: 'charge_last_consumption_entity',
  total_cost: 'charge_total_cost_entity',
}

type Detected = Partial<Record<EntityOption, string>>

// Registry entries of the first device created by `platform`.
function firstDevice(hass: HomeAssistant | undefined, platform: string) {
  const entries = Object.values(hass?.entities ?? {}).filter(
    (entry) => entry?.platform === platform
  )
  const deviceId = entries[0]?.device_id
  return entries.filter((entry) => !!entry && entry.device_id === deviceId) as NonNullable<
    (typeof entries)[number]
  >[]
}

// Entities of the first vehicle created by the core `renault` integration.
export function detectEntities(hass?: HomeAssistant): Detected {
  const detected: Detected = {}
  for (const entry of firstDevice(hass, 'renault')) {
    const domain = entry.entity_id.split('.')[0]
    const deviceClass = hass?.states[entry.entity_id]?.attributes.device_class
    const option =
      (entry.translation_key ? BY_TRANSLATION_KEY[entry.translation_key] : undefined) ??
      BY_DEVICE_CLASS[`${domain}:${String(deviceClass)}`]
    if (option) detected[option] ??= entry.entity_id
  }
  return detected
}

// Sensors of the first charge point tracked by EV Charge Cost.
export function detectChargeEntities(hass?: HomeAssistant): Detected {
  const detected: Detected = {}
  for (const entry of firstDevice(hass, 'ev_charge_cost')) {
    const option = entry.translation_key
      ? CHARGE_BY_TRANSLATION_KEY[entry.translation_key]
      : undefined
    if (option) detected[option] ??= entry.entity_id
  }
  return detected
}
