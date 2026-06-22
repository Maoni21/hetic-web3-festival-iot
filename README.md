# Festival IoT — Système de gestion d'accès

Simulation complète d'un système IoT pour le contrôle d'accès et le suivi d'affluence du **Festival International de Photographie de Paris** (Exposition Cartier-Bresson 2026).

## Installation

```bash
npm install
npm run dev
```

Puis ouvrir **http://localhost:3000** dans un navigateur.

## Lancer la simulation

```bash
# Tous les scénarios
npm run simulate

# Un scénario spécifique
npm run simulate:scenario ValidEntry
npm run simulate:scenario InvalidTicket
npm run simulate:scenario AlreadyUsedTicket
npm run simulate:scenario DeviceError
npm run simulate:scenario VenueAtCapacity
npm run simulate:scenario MessageLoss
```

## Dashboard

Accessible sur **http://localhost:3000** — affiche en temps réel :
- Jauge d'affluence (vert → orange → rouge)
- État du dispositif IoT (IDLE / READING / GRANTED / DENIED / ERROR / OFFLINE)
- Flux des derniers événements MQTT
- Compteurs d'entrées, sorties et refus
- Boutons pour déclencher chaque scénario manuellement

## API REST

```
POST /api/events/entry   { ticketId, deviceId, venueId, exhibitionId }
POST /api/events/exit    { venueId, deviceId, ticketId? }
GET  /api/venues/:venueId/stats
POST /api/simulate/:scenario
POST /api/simulate        (tous les scénarios)
```

## Documentation technique

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | Clean Architecture, couches, dépendances |
| [Messages MQTT](docs/mqtt-messages.md) | Format JSON, topics, exemples |
| [Machine à états](docs/state-machine.md) | États, transitions, diagramme |
| [Scénarios](docs/scenarios.md) | 6 scénarios avec diagrammes de séquence |
