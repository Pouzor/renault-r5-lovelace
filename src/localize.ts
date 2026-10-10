import type { HomeAssistant } from './types'

const en = {
  'status.charging': 'Charging',
  'status.plugged': 'Plugged in',
  'status.unplugged': 'Unplugged',
  'info.battery': 'Battery',
  'info.range': 'Range',
  'info.status': 'Charge status',
  'info.hvac': 'Climate',
  'info.mileage': 'Mileage',
  'hvac.on': 'On',
  'hvac.off': 'Off',
  'button.start_charge': 'Charge',
  'button.start_ac': 'Climate',
  'button.flash_lights': 'Lights',
  'button.horn': 'Horn',
  'color.pop_yellow': 'Pop yellow',
  'color.pop_yellow_black_roof': 'Pop yellow / black roof',
  'color.pop_green': 'Pop green',
  'color.pop_green_black_roof': 'Pop green / black roof',
  'color.pearl_white': 'Pearl white',
  'color.pearl_white_black_roof': 'Pearl white / black roof',
  'color.midnight_blue': 'Midnight blue',
  'color.midnight_blue_black_roof': 'Midnight blue / black roof',
  'color.slate_grey': 'Slate grey',
  'color.slate_grey_black_roof': 'Slate grey / black roof',
  'color.starry_black': 'Starry black',
  'editor.name': 'Name',
  'editor.color': 'Body colour',
  'editor.show_info': 'Information shown',
  'editor.show_buttons': 'Buttons shown',
  'editor.entities': 'Entities',
  'editor.battery_entity': 'Battery level',
  'editor.range_entity': 'Range',
  'editor.charging_entity': 'Charging',
  'editor.plugged_entity': 'Plugged in',
  'editor.hvac_entity': 'Climate (HVAC)',
  'editor.mileage_entity': 'Mileage',
  'editor.start_charge_entity': 'Start charge button',
  'editor.start_ac_entity': 'Start air conditioner button',
  'editor.flash_lights_entity': 'Flash lights button',
  'editor.horn_entity': 'Sound horn button',
}

export type StringKey = keyof typeof en

const fr: Record<StringKey, string> = {
  'status.charging': 'En charge',
  'status.plugged': 'Branchée',
  'status.unplugged': 'Débranchée',
  'info.battery': 'Batterie',
  'info.range': 'Autonomie',
  'info.status': 'État de charge',
  'info.hvac': 'Climatisation',
  'info.mileage': 'Kilométrage',
  'hvac.on': 'Active',
  'hvac.off': 'Arrêtée',
  'button.start_charge': 'Charge',
  'button.start_ac': 'Clim',
  'button.flash_lights': 'Phares',
  'button.horn': 'Klaxon',
  'color.pop_yellow': 'Jaune pop',
  'color.pop_yellow_black_roof': 'Jaune pop / toit noir',
  'color.pop_green': 'Vert pop',
  'color.pop_green_black_roof': 'Vert pop / toit noir',
  'color.pearl_white': 'Blanc nacré',
  'color.pearl_white_black_roof': 'Blanc nacré / toit noir',
  'color.midnight_blue': 'Bleu nocturne',
  'color.midnight_blue_black_roof': 'Bleu nocturne / toit noir',
  'color.slate_grey': 'Gris schiste',
  'color.slate_grey_black_roof': 'Gris schiste / toit noir',
  'color.starry_black': 'Noir étoilé',
  'editor.name': 'Nom',
  'editor.color': 'Couleur de la carrosserie',
  'editor.show_info': 'Informations affichées',
  'editor.show_buttons': 'Boutons affichés',
  'editor.entities': 'Entités',
  'editor.battery_entity': 'Niveau de batterie',
  'editor.range_entity': 'Autonomie',
  'editor.charging_entity': 'En charge',
  'editor.plugged_entity': 'Prise branchée',
  'editor.hvac_entity': 'Climatisation (CVC)',
  'editor.mileage_entity': 'Kilométrage',
  'editor.start_charge_entity': 'Bouton « Commencer la charge »',
  'editor.start_ac_entity': 'Bouton « Démarrer la climatisation »',
  'editor.flash_lights_entity': 'Bouton « Appel de phares »',
  'editor.horn_entity': 'Bouton « Klaxonner »',
}

const LANGUAGES: Record<string, Record<StringKey, string>> = { en, fr }

export function language(hass?: HomeAssistant): string {
  return hass?.locale?.language ?? hass?.language ?? 'en'
}

export function localize(hass: HomeAssistant | undefined, key: StringKey): string {
  const strings = LANGUAGES[language(hass).split('-')[0]] ?? en
  return strings[key]
}
