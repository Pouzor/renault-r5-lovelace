import { LitElement, css, html, nothing } from 'lit'
import { CAR_IMAGES, DEFAULT_COLOR } from './colors'
import { CARD_NAME, CARD_TYPE, CARD_VERSION, EDITOR_TYPE } from './const'
import { detectEntities } from './detect'
import './editor'
import { language, localize } from './localize'
import { BUTTON_ITEMS, INFO_ITEMS } from './types'
import type { ButtonItem, HomeAssistant, InfoItem, RenaultR5CardConfig } from './types'

const UNAVAILABLE = new Set(['unavailable', 'unknown'])

const BUTTONS: Record<ButtonItem, { option: keyof RenaultR5CardConfig; icon: string }> = {
  start_charge: { option: 'start_charge_entity', icon: 'mdi:ev-station' },
  start_ac: { option: 'start_ac_entity', icon: 'mdi:fan' },
  flash_lights: { option: 'flash_lights_entity', icon: 'mdi:car-light-high' },
  horn: { option: 'horn_entity', icon: 'mdi:bullhorn' },
}

export class RenaultR5Card extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  }

  declare hass?: HomeAssistant
  declare _config?: RenaultR5CardConfig

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE)
  }

  // Picks up the vehicle of the core `renault` integration when there is one,
  // and otherwise falls back to the ids it creates for a vehicle named "R5".
  static getStubConfig(hass?: HomeAssistant): Omit<RenaultR5CardConfig, 'type'> {
    const detected = detectEntities(hass)
    return {
      name: 'Renault 5',
      color: DEFAULT_COLOR,
      ...(Object.keys(detected).length
        ? detected
        : {
            battery_entity: 'sensor.r5_battery',
            range_entity: 'sensor.r5_battery_autonomy',
            charging_entity: 'binary_sensor.r5_charging',
            plugged_entity: 'binary_sensor.r5_plugged_in',
          }),
    }
  }

  setConfig(config: RenaultR5CardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration')
    }
    if (config.color !== undefined && !(config.color in CAR_IMAGES)) {
      throw new Error(`Unknown color "${config.color}"`)
    }
    assertItems('show_info', config.show_info, INFO_ITEMS)
    assertItems('show_buttons', config.show_buttons, BUTTON_ITEMS)
    this._config = config
  }

  getCardSize(): number {
    return 6
  }

  getGridOptions() {
    return { columns: 6, rows: 'auto', min_columns: 6 }
  }

  private _state(entityId?: string): string | undefined {
    if (!entityId) return undefined
    const state = this.hass?.states[entityId]?.state
    return state === undefined || UNAVAILABLE.has(state) ? undefined : state
  }

  // Numeric state with its unit, formatted for the user's language.
  private _measure(entityId: string, fallbackUnit: string): string {
    const state = this._state(entityId)
    if (state === undefined) return '—'
    const unit = this.hass?.states[entityId]?.attributes.unit_of_measurement
    const value = Number(state)
    const text = Number.isFinite(value) ? value.toLocaleString(language(this.hass)) : state
    return `${text} ${typeof unit === 'string' ? unit : fallbackUnit}`
  }

  private _shows(item: InfoItem): boolean {
    return (this._config?.show_info ?? INFO_ITEMS).includes(item)
  }

  private _press(entityId: string): void {
    void this.hass?.callService('button', 'press', { entity_id: entityId })
  }

  private _renderStatus(charging: boolean) {
    const config = this._config!
    const plugged = this._state(config.plugged_entity)
    if (!charging && plugged === undefined && this._state(config.charging_entity) === undefined) {
      return nothing
    }
    const key = charging ? 'charging' : plugged === 'on' ? 'plugged' : 'unplugged'
    return html`<span class="chip ${key}">${localize(this.hass, `status.${key}`)}</span>`
  }

  private _renderTile(item: InfoItem, icon: string, value: string) {
    return html`<div class="tile" data-info=${item}>
      <ha-icon .icon=${icon}></ha-icon>
      <span class="label">${localize(this.hass, `info.${item}`)}</span>
      <span class="value">${value}</span>
    </div>`
  }

  private _renderTiles() {
    const config = this._config!
    const tiles = []
    if (this._shows('range') && config.range_entity) {
      tiles.push(
        this._renderTile('range', 'mdi:map-marker-distance', this._measure(config.range_entity, 'km'))
      )
    }
    if (this._shows('hvac') && config.hvac_entity) {
      const hvac = this._state(config.hvac_entity)
      const value = hvac === undefined ? '—' : localize(this.hass, hvac === 'on' ? 'hvac.on' : 'hvac.off')
      tiles.push(this._renderTile('hvac', 'mdi:air-conditioner', value))
    }
    if (this._shows('mileage') && config.mileage_entity) {
      tiles.push(this._renderTile('mileage', 'mdi:counter', this._measure(config.mileage_entity, 'km')))
    }
    return tiles.length ? html`<div class="tiles">${tiles}</div>` : nothing
  }

  private _renderButtons() {
    const config = this._config!
    const buttons = (config.show_buttons ?? BUTTON_ITEMS).flatMap((item) => {
      const entityId = config[BUTTONS[item].option] as string | undefined
      if (!entityId) return []
      const label = localize(this.hass, `button.${item}`)
      // A button entity that was never pressed reports `unknown`.
      const disabled = this.hass?.states[entityId]?.state === 'unavailable'
      return html`<button
        data-button=${item}
        title=${label}
        ?disabled=${disabled}
        @click=${() => this._press(entityId)}
      >
        <ha-icon .icon=${BUTTONS[item].icon}></ha-icon>
        <span>${label}</span>
      </button>`
    })
    return buttons.length ? html`<div class="actions">${buttons}</div>` : nothing
  }

  protected render() {
    const config = this._config
    if (!config || !this.hass) return nothing

    const name = config.name ?? 'Renault 5'
    const battery = Number(this._state(config.battery_entity))
    const hasBattery = Number.isFinite(battery)
    const level = hasBattery ? Math.min(100, Math.max(0, battery)) : 0
    const charging = this._state(config.charging_entity) === 'on'
    const showStatus = this._shows('status') && (config.charging_entity || config.plugged_entity)

    return html`
      <ha-card>
        <div class="header">
          <span class="name">${name}</span>
          ${showStatus ? this._renderStatus(charging) : nothing}
        </div>

        <img class="car" src=${CAR_IMAGES[config.color ?? DEFAULT_COLOR]} alt=${name} />

        ${this._shows('battery') && config.battery_entity
          ? html`<div class="battery-row">
              <span class="battery">${hasBattery ? `${Math.round(battery)}%` : '—'}</span>
              <div
                class="bar ${level <= 20 ? 'low' : ''} ${charging ? 'charging' : ''}"
                role="progressbar"
                aria-label=${localize(this.hass, 'info.battery')}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow=${level}
              >
                <div class="fill" style="width: ${level}%"></div>
              </div>
            </div>`
          : nothing}
        ${this._renderTiles()} ${this._renderButtons()}
      </ha-card>
    `
  }

  static styles = css`
    ha-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .name {
      font-size: 1.1rem;
      font-weight: 500;
    }
    .chip {
      font-size: 0.8rem;
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--secondary-background-color);
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .chip.charging {
      background: var(--success-color, #43a047);
      color: var(--text-primary-color, #fff);
    }
    .car {
      display: block;
      width: 100%;
      max-width: 420px;
      height: auto;
      aspect-ratio: 560 / 306;
      margin: 0 auto;
      object-fit: contain;
    }
    .battery-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .battery {
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1;
      min-width: 3ch;
    }
    .bar {
      flex: 1;
      height: 10px;
      border-radius: 999px;
      background: var(--secondary-background-color);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: inherit;
      background: var(--primary-color);
      transition: width 0.4s ease;
    }
    .bar.low .fill {
      background: var(--error-color, #db4437);
    }
    .bar.charging .fill {
      background: var(--success-color, #43a047);
    }
    .tiles,
    .actions {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      gap: 8px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 4px;
      border-radius: 12px;
      background: var(--secondary-background-color);
      text-align: center;
    }
    .tile ha-icon,
    .label {
      color: var(--secondary-text-color);
    }
    .label {
      font-size: 0.75rem;
    }
    .value {
      font-weight: 500;
    }
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 4px;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
    }
    button ha-icon {
      color: var(--primary-color);
    }
    button:hover:not(:disabled) {
      background: var(--secondary-background-color);
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `
}

function assertItems(option: string, items: unknown, allowed: readonly string[]): void {
  if (items === undefined) return
  if (!Array.isArray(items)) {
    throw new Error(`${option} must be a list`)
  }
  const unknown = items.find((item) => !allowed.includes(item))
  if (unknown !== undefined) {
    throw new Error(`Unknown ${option} item "${unknown}"`)
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RenaultR5Card)
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>
  }
}

window.customCards ??= []
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: CARD_NAME,
    description: 'Battery, range, charge state and controls for the electric Renault 5',
    preview: true,
    documentationURL: 'https://github.com/Pouzor/renault-r5-lovelace',
  })
}

console.info(`%c ${CARD_NAME} %c v${CARD_VERSION} `, 'background:#f5d000;color:#000', '')
