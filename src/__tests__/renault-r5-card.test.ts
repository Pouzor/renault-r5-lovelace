import { describe, expect, it, vi } from 'vitest'
import '../renault-r5-card'
import { CAR_COLORS, CAR_IMAGES } from '../colors'
import { buildSchema } from '../editor'
import { RenaultR5Card } from '../renault-r5-card'
import type { HomeAssistant, RenaultR5CardConfig } from '../types'

const TYPE = 'custom:renault-r5-card'

const CONFIG: RenaultR5CardConfig = {
  type: TYPE,
  battery_entity: 'sensor.r5_battery',
  range_entity: 'sensor.r5_battery_autonomy',
  mileage_entity: 'sensor.r5_mileage',
  charging_entity: 'binary_sensor.r5_charging',
  plugged_entity: 'binary_sensor.r5_plugged_in',
  hvac_entity: 'binary_sensor.r5_hvac',
  start_charge_entity: 'button.r5_start_charge',
  start_ac_entity: 'button.r5_start_air_conditioner',
  flash_lights_entity: 'button.r5_flash_lights',
  horn_entity: 'button.r5_sound_horn',
}

const STATES = {
  'sensor.r5_battery': '63',
  'sensor.r5_battery_autonomy': '248',
  'sensor.r5_mileage': '12345',
  'binary_sensor.r5_charging': 'on',
  'binary_sensor.r5_plugged_in': 'on',
  'binary_sensor.r5_hvac': 'off',
}

function makeHass(states: Record<string, string>, extra: Partial<HomeAssistant> = {}): HomeAssistant {
  return {
    states: Object.fromEntries(
      Object.entries(states).map(([entity_id, state]) => [
        entity_id,
        { entity_id, state, attributes: {} },
      ])
    ),
    callService: vi.fn().mockResolvedValue(undefined),
    ...extra,
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

const items = (card: RenaultR5Card, attribute: string) =>
  [...card.shadowRoot!.querySelectorAll<HTMLElement>(`[data-${attribute}]`)].map(
    (el) => el.dataset[attribute]
  )

describe('renault-r5-card', () => {
  it('registers the element and the card picker entry', () => {
    expect(customElements.get('renault-r5-card')).toBeDefined()
    expect(window.customCards?.some((c) => c.type === 'renault-r5-card')).toBe(true)
  })

  it('rejects an unknown color or display item', () => {
    const card = document.createElement('renault-r5-card') as RenaultR5Card
    const invalid = (extra: object) => () =>
      card.setConfig({ type: TYPE, ...extra } as RenaultR5CardConfig)
    expect(invalid({ color: 'pink' })).toThrow(/color/)
    expect(invalid({ show_info: ['speed'] })).toThrow(/show_info/)
    expect(invalid({ show_buttons: 'horn' })).toThrow(/show_buttons/)
  })

  it('renders battery level, range and charging state', async () => {
    const card = await mount(makeHass(STATES))
    const root = card.shadowRoot!
    expect(root.querySelector('.battery')?.textContent).toBe('63%')
    expect(root.querySelector('[data-info="range"] .value')?.textContent).toContain('248')
    expect(root.querySelector('.chip.charging')?.textContent).toBe('Charging')
    expect(root.querySelector<HTMLElement>('.fill')?.style.width).toBe('63%')
  })

  it('renders hvac state and mileage', async () => {
    const card = await mount(makeHass(STATES))
    const root = card.shadowRoot!
    expect(root.querySelector('[data-info="hvac"] .value')?.textContent).toBe('Off')
    expect(root.querySelector('[data-info="mileage"] .value')?.textContent).toBe('12,345 km')
  })

  it('shows the plug state when the car is not charging', async () => {
    const plugged = await mount(makeHass({ ...STATES, 'binary_sensor.r5_charging': 'off' }))
    expect(plugged.shadowRoot!.querySelector('.chip')?.textContent).toBe('Plugged in')

    const unplugged = await mount(
      makeHass({ 'binary_sensor.r5_charging': 'off', 'binary_sensor.r5_plugged_in': 'off' })
    )
    expect(unplugged.shadowRoot!.querySelector('.chip')?.textContent).toBe('Unplugged')
  })

  it('shows placeholders when entities are unavailable', async () => {
    const card = await mount(
      makeHass({
        'sensor.r5_battery': 'unavailable',
        'sensor.r5_mileage': 'unknown',
        'binary_sensor.r5_charging': 'unavailable',
        'button.r5_sound_horn': 'unavailable',
        'button.r5_flash_lights': 'unknown',
      })
    )
    const root = card.shadowRoot!
    expect(root.querySelector('.battery')?.textContent).toBe('—')
    expect(root.querySelector('[data-info="mileage"] .value')?.textContent).toBe('—')
    expect(root.querySelector('[data-info="hvac"] .value')?.textContent).toBe('—')
    expect(root.querySelector('.chip')).toBeNull()
    expect(root.querySelector<HTMLButtonElement>('[data-button="horn"]')?.disabled).toBe(true)
    expect(root.querySelector<HTMLButtonElement>('[data-button="flash_lights"]')?.disabled).toBe(
      false
    )
  })

  it('shows the car in the configured color', async () => {
    const src = (card: RenaultR5Card) => card.shadowRoot!.querySelector('img.car')?.getAttribute('src')
    expect(src(await mount(makeHass(STATES)))).toBe(CAR_IMAGES.pop_yellow)
    expect(src(await mount(makeHass(STATES), { ...CONFIG, color: 'midnight_blue_black_roof' }))).toBe(
      CAR_IMAGES.midnight_blue_black_roof
    )
    expect(new Set(Object.values(CAR_IMAGES)).size).toBe(CAR_COLORS.length)
  })

  it('shows every info item and button by default', async () => {
    const card = await mount(makeHass(STATES))
    expect(items(card, 'info')).toEqual(['range', 'hvac', 'mileage'])
    expect(items(card, 'button')).toEqual(['start_charge', 'start_ac', 'flash_lights', 'horn'])
    expect(card.shadowRoot!.querySelector('.battery-row')).not.toBeNull()
    expect(card.shadowRoot!.querySelector('.chip')).not.toBeNull()
  })

  it('only shows the selected info items and buttons', async () => {
    const card = await mount(makeHass(STATES), {
      ...CONFIG,
      show_info: ['mileage'],
      show_buttons: ['horn', 'start_ac'],
    })
    expect(items(card, 'info')).toEqual(['mileage'])
    expect(items(card, 'button')).toEqual(['horn', 'start_ac'])
    expect(card.shadowRoot!.querySelector('.battery-row')).toBeNull()
    expect(card.shadowRoot!.querySelector('.chip')).toBeNull()
  })

  it('hides items whose entity is not configured', async () => {
    const card = await mount(makeHass(STATES), {
      type: TYPE,
      battery_entity: 'sensor.r5_battery',
      horn_entity: 'button.r5_sound_horn',
    })
    expect(items(card, 'info')).toEqual([])
    expect(items(card, 'button')).toEqual(['horn'])
    expect(card.shadowRoot!.querySelector('.tiles')).toBeNull()
  })

  it.each([
    ['start_charge', 'button.r5_start_charge'],
    ['start_ac', 'button.r5_start_air_conditioner'],
    ['flash_lights', 'button.r5_flash_lights'],
    ['horn', 'button.r5_sound_horn'],
  ])('presses the %s button entity', async (button, entity_id) => {
    const hass = makeHass(STATES)
    const card = await mount(hass)
    card.shadowRoot!.querySelector<HTMLButtonElement>(`[data-button="${button}"]`)!.click()
    expect(hass.callService).toHaveBeenCalledWith('button', 'press', { entity_id })
  })

  it('follows the Home Assistant language', async () => {
    const card = await mount(makeHass(STATES, { locale: { language: 'fr' } }))
    const root = card.shadowRoot!
    expect(root.querySelector('.chip')?.textContent).toBe('En charge')
    expect(root.querySelector('[data-info="range"] .label')?.textContent).toBe('Autonomie')
    expect(root.querySelector('[data-button="horn"] span')?.textContent).toBe('Klaxon')
  })
})

describe('getStubConfig', () => {
  it('detects the entities of the renault integration whatever their ids', () => {
    const registry = [
      ['sensor.hm494xm_batterie', null, 'battery'],
      ['sensor.hm494xm_autonomie_de_la_batterie', 'battery_autonomy', 'distance'],
      ['sensor.hm494xm_kilometrage', 'mileage', 'distance'],
      ['number.hm494xm_niveau_de_charge_cible', 'charge_limit_target', 'battery'],
      ['binary_sensor.hm494xm_en_charge', null, 'battery_charging'],
      ['binary_sensor.hm494xm_prise', null, 'plug'],
      ['binary_sensor.hm494xm_cvc', 'hvac_status', undefined],
      ['button.hm494xm_commencer_la_charge', 'start_charge', undefined],
      ['button.hm494xm_demarrer_la_climatisation', 'start_air_conditioner', undefined],
      ['button.hm494xm_faire_un_appel_de_phares', 'flash_lights', undefined],
      ['button.hm494xm_klaxonner', 'sound_horn', undefined],
    ] as const
    const hass: HomeAssistant = {
      states: Object.fromEntries(
        registry.map(([entity_id, , device_class]) => [
          entity_id,
          { entity_id, state: '1', attributes: { device_class } },
        ])
      ),
      entities: {
        'sensor.other_battery': { entity_id: 'sensor.other_battery', platform: 'zha' },
        ...Object.fromEntries(
          registry.map(([entity_id, translation_key]) => [
            entity_id,
            { entity_id, translation_key, platform: 'renault', device_id: 'car' },
          ])
        ),
      },
      callService: vi.fn(),
    }

    expect(RenaultR5Card.getStubConfig(hass)).toEqual({
      name: 'Renault 5',
      color: 'pop_yellow',
      battery_entity: 'sensor.hm494xm_batterie',
      range_entity: 'sensor.hm494xm_autonomie_de_la_batterie',
      mileage_entity: 'sensor.hm494xm_kilometrage',
      charging_entity: 'binary_sensor.hm494xm_en_charge',
      plugged_entity: 'binary_sensor.hm494xm_prise',
      hvac_entity: 'binary_sensor.hm494xm_cvc',
      start_charge_entity: 'button.hm494xm_commencer_la_charge',
      start_ac_entity: 'button.hm494xm_demarrer_la_climatisation',
      flash_lights_entity: 'button.hm494xm_faire_un_appel_de_phares',
      horn_entity: 'button.hm494xm_klaxonner',
    })
  })

  it('falls back to the default ids without a renault vehicle', () => {
    expect(RenaultR5Card.getStubConfig(makeHass({})).battery_entity).toBe('sensor.r5_battery')
  })
})

describe('editor', () => {
  it('offers every color, info item and button', () => {
    const schema = buildSchema(makeHass({}, { locale: { language: 'fr' } }))
    const options = (name: string) =>
      (
        schema.find((field) => field.name === name) as {
          selector: { select: { options: Array<{ value: string; label: string }> } }
        }
      ).selector.select.options

    expect(options('color').map((o) => o.value)).toEqual(CAR_COLORS)
    expect(options('color')[0].label).toBe('Jaune pop')
    expect(options('show_info').map((o) => o.value)).toEqual([
      'battery',
      'range',
      'status',
      'hvac',
      'mileage',
    ])
    expect(options('show_buttons').map((o) => o.value)).toEqual([
      'start_charge',
      'start_ac',
      'flash_lights',
      'horn',
    ])
  })
})
