import { LitElement, css, html, nothing } from 'lit'
import { CAR_IMAGES, DEFAULT_COLOR } from './colors'
import { CARD_NAME, CARD_TYPE, CARD_VERSION, EDITOR_TYPE } from './const'
import { detectEntities } from './detect'
import './editor'
import { language, localize } from './localize'
import {
  BUTTON_ITEMS,
  BUTTONS_POSITIONS,
  DEFAULT_LOW_BATTERY_THRESHOLD,
  INFO_ITEMS,
} from './types'
import type { ButtonItem, HomeAssistant, InfoItem, RenaultR5CardConfig } from './types'

const UNAVAILABLE = new Set(['unavailable', 'unknown'])

// The duration sensor can be displayed in any of these units.
const MINUTES_PER_UNIT: Record<string, number> = { s: 1 / 60, min: 1, h: 60, d: 1440 }

const BUTTONS: Record<ButtonItem, { option: keyof RenaultR5CardConfig; icon: string }> = {
  start_charge: { option: 'start_charge_entity', icon: 'mdi:ev-station' },
  start_ac: { option: 'start_ac_entity', icon: 'mdi:fan' },
  flash_lights: { option: 'flash_lights_entity', icon: 'mdi:car-light-high' },
  horn: { option: 'horn_entity', icon: 'mdi:bullhorn' },
}

// Entities whose updates tell when data last came in from the car.
const DATA_OPTIONS = [
  'battery_entity',
  'range_entity',
  'mileage_entity',
  'charging_entity',
  'plugged_entity',
  'charging_remaining_time_entity',
  'hvac_entity',
] as const

// Outcome of a button press, shown on the button itself.
type Feedback = 'pending' | 'done' | 'error'

const FEEDBACK_ICONS: Record<Feedback, string> = {
  pending: 'mdi:loading',
  done: 'mdi:check',
  error: 'mdi:alert-circle-outline',
}

// How long the outcome of a press stays on the button.
const FEEDBACK_MS = 2500

function fire(target: EventTarget, type: string, detail: unknown): void {
  target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }))
}

export class RenaultR5Card extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _feedback: { state: true },
  }

  declare hass?: HomeAssistant
  declare _config?: RenaultR5CardConfig
  declare _feedback: Partial<Record<ButtonItem, Feedback>>

  private _clock?: ReturnType<typeof setInterval>

  constructor() {
    super()
    this._feedback = {}
  }

  // Keeps "updated 5 minutes ago" moving while no entity changes.
  connectedCallback(): void {
    super.connectedCallback()
    this._clock = setInterval(() => this.requestUpdate(), 60_000)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    clearInterval(this._clock)
  }

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
            charging_remaining_time_entity: 'sensor.r5_charging_remaining_time',
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
    if (
      config.buttons_position !== undefined &&
      !BUTTONS_POSITIONS.includes(config.buttons_position)
    ) {
      throw new Error(`Unknown buttons_position "${config.buttons_position}"`)
    }
    const threshold = config.low_battery_threshold
    if (
      threshold !== undefined &&
      !(typeof threshold === 'number' && threshold >= 0 && threshold <= 100)
    ) {
      throw new Error('low_battery_threshold must be a number between 0 and 100')
    }
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

  // Remaining charge time as "1 h 25 min"; undefined when unknown or over.
  private _remaining(entityId?: string): string | undefined {
    const state = this._state(entityId)
    if (!entityId || state === undefined) return undefined
    const unit = this.hass?.states[entityId]?.attributes.unit_of_measurement
    const minutes = Math.round(Number(state) * (MINUTES_PER_UNIT[String(unit)] ?? 1))
    if (!Number.isFinite(minutes) || minutes <= 0) return undefined
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (!hours) return `${minutes} min`
    return rest ? `${hours} h ${rest} min` : `${hours} h`
  }

  private _shows(item: InfoItem): boolean {
    return (this._config?.show_info ?? INFO_ITEMS).includes(item)
  }

  private _moreInfo(entityId: string): void {
    fire(this, 'hass-more-info', { entityId })
  }

  private _moreInfoKey(ev: KeyboardEvent, entityId: string): void {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    ev.preventDefault()
    this._moreInfo(entityId)
  }

  private _setFeedback(item: ButtonItem, feedback?: Feedback): void {
    this._feedback = { ...this._feedback, [item]: feedback }
  }

  // The Renault API takes a while to answer: the button shows that the press
  // is on its way, then whether it went through.
  private async _press(item: ButtonItem, entityId: string): Promise<void> {
    if (!this.hass || this._feedback[item] === 'pending') return
    this._setFeedback(item, 'pending')
    let outcome: Feedback = 'done'
    try {
      await this.hass.callService('button', 'press', { entity_id: entityId })
    } catch (err) {
      outcome = 'error'
      const reason = (err as { message?: unknown } | null)?.message
      const message = localize(this.hass, 'error.action')
      fire(this, 'hass-notification', {
        message: typeof reason === 'string' && reason ? `${message}: ${reason}` : message,
      })
    }
    this._setFeedback(item, outcome)
    setTimeout(() => {
      if (this._feedback[item] === outcome) this._setFeedback(item)
    }, FEEDBACK_MS)
  }

  // When data last came in from the car: the dedicated timestamp sensor when
  // there is one, else the latest update among the available entities.
  private _lastUpdate(): number | undefined {
    const config = this._config!
    if (config.last_update_entity) {
      const time = Date.parse(this._state(config.last_update_entity) ?? '')
      return Number.isFinite(time) ? time : undefined
    }
    const times = DATA_OPTIONS.flatMap((option) => {
      const entityId = config[option]
      if (!entityId || this._state(entityId) === undefined) return []
      const time = Date.parse(this.hass?.states[entityId]?.last_updated ?? '')
      return Number.isFinite(time) ? [time] : []
    })
    return times.length ? Math.max(...times) : undefined
  }

  private _renderUpdated() {
    const time = this._lastUpdate()
    if (time === undefined) return nothing
    const lang = language(this.hass)
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000))
    const relative = new Intl.RelativeTimeFormat(lang)
    const ago =
      minutes < 1
        ? localize(this.hass, 'updated.now')
        : minutes < 60
          ? relative.format(-minutes, 'minute')
          : minutes < 2880
            ? relative.format(-Math.floor(minutes / 60), 'hour')
            : relative.format(-Math.floor(minutes / 1440), 'day')
    const text = localize(this.hass, 'updated.ago').replace('{time}', ago)
    const title = new Date(time).toLocaleString(lang)
    const entityId = this._config!.last_update_entity
    return entityId
      ? html`<span
          class="updated clickable"
          role="button"
          tabindex="0"
          title=${title}
          @click=${() => this._moreInfo(entityId)}
          @keydown=${(ev: KeyboardEvent) => this._moreInfoKey(ev, entityId)}
          >${text}</span
        >`
      : html`<span class="updated" title=${title}>${text}</span>`
  }

  private _renderStatus(charging: boolean) {
    const config = this._config!
    const plugged = this._state(config.plugged_entity)
    if (!charging && plugged === undefined && this._state(config.charging_entity) === undefined) {
      return nothing
    }
    const key = charging ? 'charging' : plugged === 'on' ? 'plugged' : 'unplugged'
    // The entity the chip gets its text from.
    const entityId = (
      charging || plugged === undefined ? config.charging_entity : config.plugged_entity
    )!
    const remainingId = config.charging_remaining_time_entity
    const remaining = charging ? this._remaining(remainingId) : undefined
    return html`<div class="chips">
      ${remaining && remainingId
        ? html`<span
            class="chip remaining clickable"
            role="button"
            tabindex="0"
            title=${localize(this.hass, 'status.remaining')}
            @click=${() => this._moreInfo(remainingId)}
            @keydown=${(ev: KeyboardEvent) => this._moreInfoKey(ev, remainingId)}
            ><ha-icon icon="mdi:timer-outline"></ha-icon>${remaining}</span
          >`
        : nothing}
      <span
        class="chip ${key} clickable"
        role="button"
        tabindex="0"
        @click=${() => this._moreInfo(entityId)}
        @keydown=${(ev: KeyboardEvent) => this._moreInfoKey(ev, entityId)}
        >${localize(this.hass, `status.${key}`)}</span
      >
    </div>`
  }

  private _renderTile(item: InfoItem, icon: string, value: string, entityId: string) {
    return html`<div
      class="tile clickable"
      data-info=${item}
      role="button"
      tabindex="0"
      @click=${() => this._moreInfo(entityId)}
      @keydown=${(ev: KeyboardEvent) => this._moreInfoKey(ev, entityId)}
    >
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
        this._renderTile(
          'range',
          'mdi:map-marker-distance',
          this._measure(config.range_entity, 'km'),
          config.range_entity
        )
      )
    }
    if (this._shows('hvac') && config.hvac_entity) {
      const hvac = this._state(config.hvac_entity)
      const value = hvac === undefined ? '—' : localize(this.hass, hvac === 'on' ? 'hvac.on' : 'hvac.off')
      tiles.push(this._renderTile('hvac', 'mdi:air-conditioner', value, config.hvac_entity))
    }
    if (this._shows('mileage') && config.mileage_entity) {
      tiles.push(
        this._renderTile(
          'mileage',
          'mdi:counter',
          this._measure(config.mileage_entity, 'km'),
          config.mileage_entity
        )
      )
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
      const feedback = this._feedback[item]
      return html`<button
        class=${feedback ?? ''}
        data-button=${item}
        title=${label}
        aria-busy=${feedback === 'pending'}
        ?disabled=${disabled || feedback === 'pending'}
        @click=${() => this._press(item, entityId)}
      >
        <ha-icon .icon=${feedback ? FEEDBACK_ICONS[feedback] : BUTTONS[item].icon}></ha-icon>
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
    const low = level <= (config.low_battery_threshold ?? DEFAULT_LOW_BATTERY_THRESHOLD)
    const charging = this._state(config.charging_entity) === 'on'
    const batteryId = config.battery_entity
    const showStatus = this._shows('status') && (config.charging_entity || config.plugged_entity)

    return html`
      <ha-card class=${config.buttons_position === 'right' ? 'buttons-right' : ''}>
        <div class="header">
          <div class="title">
            <span class="name">${name}</span>
            ${this._shows('updated') ? this._renderUpdated() : nothing}
          </div>
          ${showStatus ? this._renderStatus(charging) : nothing}
        </div>

        <div class="content">
          <div class="main">
            <img class="car" src=${CAR_IMAGES[config.color ?? DEFAULT_COLOR]} alt=${name} />

            ${this._shows('battery') && batteryId
              ? html`<div
                  class="battery-row clickable"
                  tabindex="0"
                  @click=${() => this._moreInfo(batteryId)}
                  @keydown=${(ev: KeyboardEvent) => this._moreInfoKey(ev, batteryId)}
                >
                  <span class="battery">${hasBattery ? `${Math.round(battery)}%` : '—'}</span>
                  <div
                    class="bar ${low ? 'low' : ''} ${charging ? 'charging' : ''}"
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
            ${this._renderTiles()}
          </div>
          ${this._renderButtons()}
        </div>
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
    .content,
    .main {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .buttons-right .content {
      flex-direction: row;
    }
    .buttons-right .actions {
      grid-auto-flow: row;
      grid-auto-rows: minmax(0, 1fr);
      min-width: 72px;
    }
    .buttons-right button {
      justify-content: center;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      font-size: 1.1rem;
      font-weight: 500;
    }
    .updated {
      font-size: 0.75rem;
      color: var(--secondary-text-color);
    }
    .clickable {
      cursor: pointer;
    }
    .clickable:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .chip {
      font-size: 0.8rem;
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--secondary-background-color);
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }
    .chip.remaining {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .chip.remaining ha-icon {
      --mdc-icon-size: 14px;
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
    button.pending ha-icon {
      animation: spin 1s linear infinite;
    }
    button.done ha-icon {
      color: var(--success-color, #43a047);
    }
    button.error ha-icon {
      color: var(--error-color, #db4437);
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button.pending ha-icon {
        animation: none;
      }
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
