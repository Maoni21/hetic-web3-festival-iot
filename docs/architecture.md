# Architecture — Festival IoT

## Clean Architecture de Robert C. Martin

Le projet applique strictement les principes de la Clean Architecture. Les couches sont organisées de l'intérieur vers l'extérieur, et **les dépendances ne pointent que vers l'intérieur**.

```
┌─────────────────────────────────────────────┐
│         PRESENTATION (Dashboard, API)        │
│  ┌───────────────────────────────────────┐   │
│  │       APPLICATION (Use Cases)          │   │
│  │  ┌─────────────────────────────────┐  │   │
│  │  │       DOMAIN (Entities)          │  │   │
│  │  │  Visitor · Ticket · Venue        │  │   │
│  │  │  AccessEvent                     │  │   │
│  │  └─────────────────────────────────┘  │   │
│  └───────────────────────────────────────┘   │
│        INFRASTRUCTURE (MQTT, Simulation)      │
└─────────────────────────────────────────────┘
```

## Couche Domaine (`src/domain/`)

Le cœur du système. **Zéro dépendance externe** — pas de framework, pas d'I/O.

- **Entities** : `Visitor`, `Ticket`, `Venue`, `AccessEvent` — objets métier avec identité et comportements
- **Value Objects** : `TicketId`, `VenueId`, `DeviceId`, `Timestamp` — objets immuables sans identité
- **Enums** : `AccessEventType`, `TicketStatus`, `DeviceState`
- **Interfaces (Ports)** : `ITicketRepository`, `IVenueRepository`, `IEventPublisher`, `ISensorSimulator`, `IAccessLogger` — contrats que l'infrastructure doit implémenter
- **Errors** : hiérarchie d'erreurs métier typées (`DomainError` → `TicketAlreadyUsedError`, etc.)

## Couche Application (`src/application/`)

Orchestre les use cases via les interfaces du domaine. **Aucun import d'infrastructure.**

- **Use Cases** : `ValidateTicketUseCase`, `RecordEntryUseCase`, `RecordExitUseCase`, `CheckVenueCapacityUseCase`, `HandleDeviceErrorUseCase`
- **Services** : `AccessControlService` (orchestration entrée), `AttendanceTrackingService` (sorties + stats)
- **DTOs** : `AccessRequestDTO`, `AccessResponseDTO`, `MqttMessageDTO`

## Couche Infrastructure (`src/infrastructure/`)

Implémentations concrètes des interfaces du domaine.

- **MQTT** : `MqttBroker` (aedes), `MqttClient` (mqtt.js), `MqttEventPublisher` (implémente `IEventPublisher`), `MqttTopics`
- **Repositories** : `InMemoryTicketRepository`, `InMemoryVenueRepository`
- **Simulation** : `DeviceStateMachine`, `SensorSimulator` (implémente `ISensorSimulator`), 6 scénarios
- **Logger** : `ConsoleLogger` (implémente `IAccessLogger`)

## Couche Présentation (`src/presentation/`)

- **API REST** : serveur Express avec contrôleurs et routes (aucune logique métier)
- **WebSocket** : relais des messages MQTT vers le dashboard
- **Dashboard** : page HTML/CSS/JS statique, connexion WebSocket

## Justification des choix techniques

| Choix | Raison |
|---|---|
| TypeScript strict | Zéro `any`, erreurs détectées à la compilation |
| aedes | Broker MQTT léger sans dépendance réseau externe |
| Result types | Les erreurs sont des valeurs, pas des exceptions non contrôlées |
| In-memory repositories | Simulation sans base de données, remplaçables par des implémentations persistantes |
| Injection de dépendances | Testabilité et respect de la règle de dépendance |
