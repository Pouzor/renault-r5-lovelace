import { describe, expect, it, vi } from 'vitest'
import '../renault-r5-card'
import type { RenaultR5Card } from '../renault-r5-card'
import type { HomeAssistant, RenaultR5CardConfig } from '../types'

const CONFIG: RenaultR5CardConfig = {
  type: 'custom:renault-r5-card',
  battery_entity: 'sensor.r5_battery',
  range_entity: 'sensor.r5_battery_autonomy',
  charging_entity: 'binary_sensor.r5_charging',
  start_charge_entity: 'button.r5_start_charge',
}

function makeHass(states: Record<string, string>): HomeAssistant {
  return {
    states: Object.fromEntries(
      Object.entries(states).map(([entity_id, state]) => [
        entity_id,
        { entity_id, state, attributes: {} },
      ])
    ),
    callService: vi.fn().mockResolvedValue(undefined),
  }
}

async function mount(hass: HomeAssistant, config = CONFIG): Promise<RenaultR5Card> {
  const card = document.createElement('renault-r5-card') as RenaultR5Card
  card.setConfig(config)
  card.hass = hass
  document.body.appendChild(card)
  await card.updateComplete
  return card
}

describe('renault-r5-card', () => {
  it('registers the element and the card picker entry', () => {
    expect(customElements.get('renault-r5-card')).toBeDefined()
    expect(window.customCards?.some((c) => c.type === 'renault-r5-card')).toBe(true)
  })

  it('rejects a config without battery_entity', () => {
    const card = document.createElement('renault-r5-card') as RenaultR5Card
    expect(() => card.setConfig({ type: 'custom:renault-r5-card' } as RenaultR5CardConfig)).toThrow(
      /battery_entity/
    )
  })

  it('renders battery level, range and charging state', async () => {
    const card = await mount(
      makeHass({
        'sensor.r5_battery': '63',
        'sensor.r5_battery_autonomy': '248',
        'binary_sensor.r5_charging': 'on',
      })
    )
    const root = card.shadowRoot!
    expect(root.querySelector('.battery')?.textContent).toBe('63%')
    expect(root.querySelector('.range')?.textContent).toContain('248')
    expect(root.querySelector('.chip.charging')).not.toBeNull()
    expect(root.querySelector<HTMLElement>('.fill')?.style.width).toBe('63%')
  })

  it('shows a placeholder when the battery entity is unavailable', async () => {
    const card = await mount(makeHass({ 'sensor.r5_battery': 'unavailable' }))
    expect(card.shadowRoot!.querySelector('.battery')?.textContent).toBe('—')
  })

  it('presses the start charge button entity', async () => {
    const hass = makeHass({ 'sensor.r5_battery': '40' })
    const card = await mount(hass)
    card.shadowRoot!.querySelector('button')!.click()
    expect(hass.callService).toHaveBeenCalledWith('button', 'press', {
      entity_id: 'button.r5_start_charge',
    })
  })
})
