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
  charging_remaining_time_entity: 'sensor.r5_charging_remaining_time',
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
    expect(invalid({ buttons_position: 'left' })).toThrow(/buttons_position/)
    expect(invalid({ low_battery_threshold: 120 })).toThrow(/low_battery_threshold/)
    expect(invalid({ low_battery_threshold: '20' })).toThrow(/low_battery_threshold/)
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

  it('shows the remaining charge time next to the charging chip', async () => {
    const TIME = 'sensor.r5_charging_remaining_time'
    const remaining = async (states: Record<string, string>, unit?: string) => {
      const hass = makeHass({ ...STATES, ...states })
      if (unit) hass.states[TIME]!.attributes.unit_of_measurement = unit
      const root = (await mount(hass)).shadowRoot!
      return root.querySelector('.chips .chip.remaining')?.textContent
    }

    expect(await remaining({ [TIME]: '85' })).toBe('1 h 25 min')
    expect(await remaining({ [TIME]: '45' }, 'min')).toBe('45 min')
    expect(await remaining({ [TIME]: '2' }, 'h')).toBe('2 h')
    expect(await remaining({})).toBeUndefined()
    expect(await remaining({ [TIME]: 'unavailable' })).toBeUndefined()
    expect(await remaining({ [TIME]: '0' })).toBeUndefined()
    expect(await remaining({ [TIME]: '85', 'binary_sensor.r5_charging': 'off' })).toBeUndefined()
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

  it('puts the buttons beside the car when buttons_position is right', async () => {
    const layout = async (extra: Partial<RenaultR5CardConfig>) => {
      const root = (await mount(makeHass(STATES), { ...CONFIG, ...extra })).shadowRoot!
      return {
        right: root.querySelector('ha-card')!.classList.contains('buttons-right'),
        // The buttons sit next to the car block, not inside it.
        sibling: root.querySelector('.content > .main + .actions') !== null,
      }
    }

    expect(await layout({})).toEqual({ right: false, sibling: true })
    expect(await layout({ buttons_position: 'bottom' })).toEqual({ right: false, sibling: true })
    expect(await layout({ buttons_position: 'right' })).toEqual({ right: true, sibling: true })
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

  it('shows the press as pending, then as done', async () => {
    let resolve!: () => void
    const hass = makeHass(STATES, {
      callService: vi.fn(() => new Promise<void>((done) => (resolve = done))),
    })
    const card = await mount(hass)
    const button = card.shadowRoot!.querySelector<HTMLButtonElement>('[data-button="start_ac"]')!

    button.click()
    await card.updateComplete
    expect(button.classList.contains('pending')).toBe(true)
    expect(button.disabled).toBe(true)
    button.click()
    expect(hass.callService).toHaveBeenCalledTimes(1)

    resolve()
    await vi.waitFor(() => expect(button.classList.contains('done')).toBe(true))
    expect(button.disabled).toBe(false)
  })

  it('reports a failed press on the button and in a notification', async () => {
    const hass = makeHass(STATES, {
      callService: vi.fn().mockRejectedValue({ code: 'home_assistant_error', message: 'Timeout' }),
    })
    const card = await mount(hass)
    const notified = vi.fn()
    card.addEventListener('hass-notification', notified)
    const button = card.shadowRoot!.querySelector<HTMLButtonElement>('[data-button="horn"]')!

    button.click()
    await vi.waitFor(() => expect(button.classList.contains('error')).toBe(true))
    expect((notified.mock.calls[0][0] as CustomEvent).detail).toEqual({
      message: 'The action failed: Timeout',
    })
  })

  it('clears the outcome of a press after a while', async () => {
    vi.useFakeTimers()
    try {
      const card = await mount(makeHass(STATES))
      const button = card.shadowRoot!.querySelector<HTMLButtonElement>('[data-button="horn"]')!
      button.click()
      await vi.advanceTimersByTimeAsync(0)
      expect(button.className).toBe('done')
      await vi.advanceTimersByTimeAsync(3000)
      expect(button.className).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the more-info dialog of the entity that is tapped', async () => {
    const card = await mount(makeHass({ ...STATES, 'sensor.r5_charging_remaining_time': '85' }))
    const opened: string[] = []
    card.addEventListener('hass-more-info', (ev) =>
      opened.push((ev as CustomEvent<{ entityId: string }>).detail.entityId)
    )
    const root = card.shadowRoot!
    const tap = (selector: string) => root.querySelector<HTMLElement>(selector)!.click()

    tap('.battery-row')
    tap('[data-info="range"]')
    tap('[data-info="hvac"]')
    tap('[data-info="mileage"]')
    tap('.chip.charging')
    tap('.chip.remaining')
    root
      .querySelector('[data-info="range"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(opened).toEqual([
      'sensor.r5_battery',
      'sensor.r5_battery_autonomy',
      'binary_sensor.r5_hvac',
      'sensor.r5_mileage',
      'binary_sensor.r5_charging',
      'sensor.r5_charging_remaining_time',
      'sensor.r5_battery_autonomy',
    ])
  })

  it('opens the plug entity from the chip when the car is not charging', async () => {
    const card = await mount(makeHass({ ...STATES, 'binary_sensor.r5_charging': 'off' }))
    const opened = vi.fn()
    card.addEventListener('hass-more-info', opened)
    card.shadowRoot!.querySelector<HTMLElement>('.chip')!.click()
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual({
      entityId: 'binary_sensor.r5_plugged_in',
    })
  })

  it('tells how old the data is', async () => {
    const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
    const updated = async (
      hass: HomeAssistant,
      extra: Partial<RenaultR5CardConfig> = {}
    ): Promise<string | undefined> =>
      (await mount(hass, { ...CONFIG, ...extra })).shadowRoot!.querySelector('.updated')
        ?.textContent ?? undefined

    // Without a dedicated sensor: the latest update among the available entities.
    const hass = makeHass(STATES)
    hass.states['sensor.r5_battery']!.last_updated = ago(125)
    hass.states['sensor.r5_mileage']!.last_updated = ago(12)
    expect(await updated(hass)).toBe('Updated 12 minutes ago')
    expect(await updated(hass, { show_info: ['battery'] })).toBeUndefined()
    expect(await updated(makeHass(STATES))).toBeUndefined()

    // An entity that just went unavailable says nothing about the car.
    const stale = makeHass({ ...STATES, 'sensor.r5_mileage': 'unavailable' })
    stale.states['sensor.r5_battery']!.last_updated = ago(125)
    stale.states['sensor.r5_mileage']!.last_updated = ago(0)
    expect(await updated(stale)).toBe('Updated 2 hours ago')

    const LAST = 'sensor.r5_battery_last_activity'
    const sensor = (state: string, language = 'en') => {
      const withSensor = makeHass({ ...STATES, [LAST]: state }, { locale: { language } })
      withSensor.states['sensor.r5_battery']!.last_updated = ago(1)
      return updated(withSensor, { last_update_entity: LAST })
    }
    expect(await sensor(ago(0))).toBe('Updated just now')
    expect(await sensor(ago(3 * 1440))).toBe('Updated 3 days ago')
    expect(await sensor(ago(5), 'fr')).toBe('Mis à jour il y a 5 minutes')
    expect(await sensor('unavailable')).toBeUndefined()
  })

  it('opens the last update sensor when there is one', async () => {
    const LAST = 'sensor.r5_battery_last_activity'
    const card = await mount(makeHass({ ...STATES, [LAST]: new Date().toISOString() }), {
      ...CONFIG,
      last_update_entity: LAST,
    })
    const opened = vi.fn()
    card.addEventListener('hass-more-info', opened)
    card.shadowRoot!.querySelector<HTMLElement>('.updated')!.click()
    expect((opened.mock.calls[0][0] as CustomEvent).detail).toEqual({ entityId: LAST })
  })

  it('marks the battery as low at or below the threshold', async () => {
    const low = async (battery: string, extra: Partial<RenaultR5CardConfig> = {}) => {
      const hass = makeHass({ ...STATES, 'sensor.r5_battery': battery })
      const root = (await mount(hass, { ...CONFIG, ...extra })).shadowRoot!
      return root.querySelector('.bar')!.classList.contains('low')
    }

    expect(await low('20')).toBe(true)
    expect(await low('21')).toBe(false)
    expect(await low('30', { low_battery_threshold: 30 })).toBe(true)
    expect(await low('15', { low_battery_threshold: 10 })).toBe(false)
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
      ['sensor.hm494xm_temps_de_charge_restant', 'charging_remaining_time', 'duration'],
      ['number.hm494xm_niveau_de_charge_cible', 'charge_limit_target', 'battery'],
      ['binary_sensor.hm494xm_en_charge', null, 'battery_charging'],
      ['binary_sensor.hm494xm_prise', null, 'plug'],
      ['binary_sensor.hm494xm_cvc', 'hvac_status', undefined],
      ['sensor.hm494xm_derniere_activite', 'battery_last_activity', 'timestamp'],
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
      charging_remaining_time_entity: 'sensor.hm494xm_temps_de_charge_restant',
      hvac_entity: 'binary_sensor.hm494xm_cvc',
      last_update_entity: 'sensor.hm494xm_derniere_activite',
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
      'updated',
    ])
    expect(options('show_buttons').map((o) => o.value)).toEqual([
      'start_charge',
      'start_ac',
      'flash_lights',
      'horn',
    ])
    expect(options('buttons_position')).toEqual([
      { value: 'bottom', label: 'Sous la voiture' },
      { value: 'right', label: 'À droite' },
    ])
    expect(schema.find((field) => field.name === 'low_battery_threshold')).toMatchObject({
      selector: { number: { min: 0, max: 100 } },
    })
  })
})
