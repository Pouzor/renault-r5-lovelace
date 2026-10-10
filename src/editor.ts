import { LitElement, html, nothing } from 'lit'
import { EDITOR_TYPE } from './const'
import type { HomeAssistant, RenaultR5CardConfig } from './types'

const entity = (domain: string) => ({ entity: { domain } })

const SCHEMA = [
  { name: 'name', selector: { text: {} } },
  { name: 'battery_entity', required: true, selector: entity('sensor') },
  { name: 'range_entity', selector: entity('sensor') },
  { name: 'charging_entity', selector: entity('binary_sensor') },
  { name: 'plugged_entity', selector: entity('binary_sensor') },
  { name: 'start_charge_entity', selector: entity('button') },
  { name: 'start_ac_entity', selector: entity('button') },
]

const LABELS: Record<string, string> = {
  name: 'Name',
  battery_entity: 'Battery level',
  range_entity: 'Range',
  charging_entity: 'Charging',
  plugged_entity: 'Plugged in',
  start_charge_entity: 'Start charge button',
  start_ac_entity: 'Pre-conditioning button',
}

export class RenaultR5CardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  }

  declare hass?: HomeAssistant
  declare _config?: RenaultR5CardConfig

  setConfig(config: RenaultR5CardConfig): void {
    this._config = config
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
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${(field: { name: string }) => LABELS[field.name] ?? field.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, RenaultR5CardEditor)
}
