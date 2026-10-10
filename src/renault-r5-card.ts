import { LitElement, css, html, nothing } from 'lit'
import { CARD_NAME, CARD_TYPE, CARD_VERSION, EDITOR_TYPE } from './const'
import './editor'
import type { HomeAssistant, RenaultR5CardConfig } from './types'

const UNAVAILABLE = new Set(['unavailable', 'unknown'])

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

  // Defaults follow the entity ids created by the core `renault` integration
  // for a vehicle named "R5".
  static getStubConfig(): Omit<RenaultR5CardConfig, 'type'> {
    return {
      name: 'Renault 5',
      battery_entity: 'sensor.r5_battery',
      range_entity: 'sensor.r5_battery_autonomy',
      charging_entity: 'binary_sensor.r5_charging',
      plugged_entity: 'binary_sensor.r5_plugged_in',
    }
  }

  setConfig(config: RenaultR5CardConfig): void {
    if (!config?.battery_entity) {
      throw new Error('battery_entity is required')
    }
    this._config = config
  }

  getCardSize(): number {
    return 3
  }

  getGridOptions() {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 }
  }

  private _state(entityId?: string): string | undefined {
    if (!entityId) return undefined
    const state = this.hass?.states[entityId]?.state
    return state === undefined || UNAVAILABLE.has(state) ? undefined : state
  }

  private _unit(entityId: string | undefined, fallback: string): string {
    const unit = entityId
      ? this.hass?.states[entityId]?.attributes.unit_of_measurement
      : undefined
    return typeof unit === 'string' ? unit : fallback
  }

  private _press(entityId: string): void {
    void this.hass?.callService('button', 'press', { entity_id: entityId })
  }

  protected render() {
    const config = this._config
    if (!config || !this.hass) return nothing

    const battery = Number(this._state(config.battery_entity))
    const hasBattery = Number.isFinite(battery)
    const level = hasBattery ? Math.min(100, Math.max(0, battery)) : 0
    const range = this._state(config.range_entity)
    const charging = this._state(config.charging_entity) === 'on'
    const plugged = this._state(config.plugged_entity) === 'on'

    return html`
      <ha-card>
        <div class="header">
          <span class="name">${config.name ?? 'Renault 5'}</span>
          <span class="status">
            ${charging
              ? html`<span class="chip charging">Charging</span>`
              : plugged
                ? html`<span class="chip">Plugged in</span>`
                : nothing}
          </span>
        </div>

        <div class="metrics">
          <span class="battery">${hasBattery ? `${Math.round(battery)}%` : '—'}</span>
          ${config.range_entity
            ? html`<span class="range">
                ${range ?? '—'} ${this._unit(config.range_entity, 'km')}
              </span>`
            : nothing}
        </div>

        <div
          class="bar ${level <= 20 ? 'low' : ''} ${charging ? 'charging' : ''}"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${level}
        >
          <div class="fill" style="width: ${level}%"></div>
        </div>

        ${config.start_charge_entity || config.start_ac_entity
          ? html`<div class="actions">
              ${config.start_charge_entity
                ? html`<button
                    @click=${() => this._press(config.start_charge_entity!)}
                  >
                    Start charge
                  </button>`
                : nothing}
              ${config.start_ac_entity
                ? html`<button @click=${() => this._press(config.start_ac_entity!)}>
                    Pre-condition
                  </button>`
                : nothing}
            </div>`
          : nothing}
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
    .header,
    .metrics {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
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
    }
    .chip.charging {
      background: var(--success-color, #43a047);
      color: var(--text-primary-color, #fff);
    }
    .battery {
      font-size: 2.2rem;
      font-weight: 600;
      line-height: 1;
    }
    .range {
      color: var(--secondary-text-color);
    }
    .bar {
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
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    button:hover {
      background: var(--secondary-background-color);
    }
  `
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
