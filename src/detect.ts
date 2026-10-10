import type { HomeAssistant, RenaultR5CardConfig } from './types'

type EntityOption = Extract<keyof RenaultR5CardConfig, `${string}_entity`>

// Entity ids are localised (`sensor.<car>_batterie` on a French instance), so
// the Renault entities are recognised by translation key or device class.
const BY_TRANSLATION_KEY: Record<string, EntityOption> = {
  battery_autonomy: 'range_entity',
  mileage: 'mileage_entity',
  charging_remaining_time: 'charging_remaining_time_entity',
  hvac_status: 'hvac_entity',
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

// Entities of the first vehicle created by the core `renault` integration.
export function detectEntities(hass?: HomeAssistant): Partial<Record<EntityOption, string>> {
  const renault = Object.values(hass?.entities ?? {}).filter(
    (entry) => entry?.platform === 'renault'
  )
  const deviceId = renault[0]?.device_id
  const detected: Partial<Record<EntityOption, string>> = {}

  for (const entry of renault) {
    if (!entry || entry.device_id !== deviceId) continue
    const domain = entry.entity_id.split('.')[0]
    const deviceClass = hass?.states[entry.entity_id]?.attributes.device_class
    const option =
      (entry.translation_key ? BY_TRANSLATION_KEY[entry.translation_key] : undefined) ??
      BY_DEVICE_CLASS[`${domain}:${String(deviceClass)}`]
    if (option) detected[option] ??= entry.entity_id
  }
  return detected
}
