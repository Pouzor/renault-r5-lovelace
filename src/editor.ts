import { LitElement, html, nothing } from 'lit'
import { CAR_COLORS, DEFAULT_COLOR } from './colors'
import { EDITOR_TYPE } from './const'
import { language, localize } from './localize'
import type { StringKey } from './localize'
import {
  BUTTON_ITEMS,
  BUTTONS_POSITIONS,
  DEFAULT_LOW_BATTERY_THRESHOLD,
  INFO_ITEMS,
} from './types'
import type { HomeAssistant, RenaultR5CardConfig } from './types'

const entity = (domain: string) => ({ entity: { domain } })

const ENTITIES = [
  { name: 'battery_entity', selector: entity('sensor') },
  { name: 'range_entity', selector: entity('sensor') },
  { name: 'mileage_entity', selector: entity('sensor') },
  { name: 'charging_entity', selector: entity('binary_sensor') },
  { name: 'plugged_entity', selector: entity('binary_sensor') },
  { name: 'charging_remaining_time_entity', selector: entity('sensor') },
  { name: 'hvac_entity', selector: entity('binary_sensor') },
  { name: 'last_update_entity', selector: { entity: { domain: 'sensor', device_class: 'timestamp' } } },
  { name: 'start_charge_entity', selector: entity('button') },
  { name: 'start_ac_entity', selector: entity('button') },
  { name: 'flash_lights_entity', selector: entity('button') },
  { name: 'horn_entity', selector: entity('button') },
]

export function buildSchema(hass?: HomeAssistant) {
  const options = (prefix: string, values: readonly string[]) =>
    values.map((value) => ({
      value,
      label: localize(hass, `${prefix}.${value}` as StringKey),
    }))

  return [
    { name: 'name', selector: { text: {} } },
    {
      name: 'color',
      selector: { select: { mode: 'dropdown', options: options('color', CAR_COLORS) } },
    },
    {
      name: 'show_info',
      selector: { select: { multiple: true, options: options('info', INFO_ITEMS) } },
    },
    {
      name: 'show_buttons',
      selector: { select: { multiple: true, options: options('button', BUTTON_ITEMS) } },
    },
    {
      name: 'buttons_position',
      selector: { select: { mode: 'dropdown', options: options('position', BUTTONS_POSITIONS) } },
    },
    {
      name: 'low_battery_threshold',
      selector: { number: { min: 0, max: 100, step: 1, mode: 'box', unit_of_measurement: '%' } },
    },
    {
      type: 'expandable',
      name: 'entities',
      title: localize(hass, 'editor.entities'),
      flatten: true,
      schema: ENTITIES,
    },
  ]
}

export class RenaultR5CardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  }

  declare hass?: HomeAssistant
  declare _config?: RenaultR5CardConfig

  // Rebuilt only when the language changes: ha-form re-renders (and collapses
  // the entities section) whenever it gets a new schema object.
  private _schema?: { language: string; schema: ReturnType<typeof buildSchema> }

  setConfig(config: RenaultR5CardConfig): void {
    this._config = config
  }

  private _getSchema() {
    const lang = language(this.hass)
    if (this._schema?.language !== lang) {
      this._schema = { language: lang, schema: buildSchema(this.hass) }
    }
    return this._schema.schema
  }

  private _valueChanged(ev: CustomEvent<{ value: RenaultR5CardConfig }>): void {
    ev.stopPropagation()
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: ev.detail.value },
        bubbles: true,
        composed: true,
      })
    )
  }

  protected render() {
    if (!this.hass || !this._config) return nothing
    // Unset options show their effective default in the form.
    const data = {
      color: DEFAULT_COLOR,
      show_info: [...INFO_ITEMS],
      show_buttons: [...BUTTON_ITEMS],
      buttons_position: BUTTONS_POSITIONS[0],
      low_battery_threshold: DEFAULT_LOW_BATTERY_THRESHOLD,
      ...this._config,
    }
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._getSchema()}
        .computeLabel=${(field: { name: string }) =>
          localize(this.hass, `editor.${field.name}` as StringKey) ?? field.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, RenaultR5CardEditor)
}
