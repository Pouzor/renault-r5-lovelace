# Renault R5 Card

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)

A Home Assistant Lovelace card for the electric Renault 5: battery level, range,
charge state and quick actions (start charge, pre-conditioning).

It reads the entities created by the core
[Renault integration](https://www.home-assistant.io/integrations/renault/) —
set that up first.

> Early bootstrap: the card is functional but minimal. Expect the config to
> evolve before 1.0.

## Installation

### HACS (recommended)

1. HACS → ⋮ → **Custom repositories**
2. Add `https://github.com/Pouzor/renault-r5-lovelace`, type **Dashboard**
3. Install **Renault R5 Card**, then reload the browser

### Manual

Download `renault-r5-card.js` from the
[latest release](https://github.com/Pouzor/renault-r5-lovelace/releases), copy it
to `config/www/`, and add it under Settings → Dashboards → Resources:

```yaml
url: /local/renault-r5-card.js
type: module
```

## Configuration

The card ships a visual editor. YAML equivalent:

```yaml
type: custom:renault-r5-card
name: Renault 5
battery_entity: sensor.r5_battery
range_entity: sensor.r5_battery_autonomy
charging_entity: binary_sensor.r5_charging
plugged_entity: binary_sensor.r5_plugged_in
start_charge_entity: button.r5_start_charge
start_ac_entity: button.r5_start_air_conditioner
```

| Option | Required | Description |
|---|---|---|
| `battery_entity` | yes | Battery level sensor (%) |
| `name` | no | Card title, defaults to "Renault 5" |
| `range_entity` | no | Remaining range sensor |
| `charging_entity` | no | Binary sensor, `on` while charging |
| `plugged_entity` | no | Binary sensor, `on` while plugged in |
| `start_charge_entity` | no | Button entity pressed by "Start charge" |
| `start_ac_entity` | no | Button entity pressed by "Pre-condition" |

## Development

```bash
npm install
npm run dev          # rebuild dist/renault-r5-card.js on save
npm run lint && npm run typecheck && npm test
```

A throwaway Home Assistant with HACS pre-installed and fake `sensor.r5_*`
entities:

```bash
./scripts/dev-ha.sh          # build + start, http://localhost:8124
./scripts/dev-ha.sh stop
```

On first start, go through HA onboarding, then add the card to a dashboard.
The fake entities are driven by the `input_number.r5_*` / `input_boolean.r5_*`
helpers (`dev/packages/renault_r5.yaml`).

## License

[MIT](LICENSE)
