# Messages MQTT — Festival IoT

## Topics

| Topic | Usage |
|---|---|
| `festival/venue/{venueId}/access` | Événements d'accès (ENTRY, EXIT, DENIED) |
| `festival/venue/{venueId}/capacity` | Alertes de jauge (CAPACITY_WARNING, CAPACITY_EXCEEDED) |
| `festival/device/{deviceId}/status` | État du dispositif (OFFLINE → ONLINE) |
| `festival/device/{deviceId}/error` | Erreurs du dispositif (ERROR) |

## Structure JSON complète

Tous les champs sont obligatoires.

| Champ | Type | Description |
|---|---|---|
| `messageId` | string (UUID v4) | Identifiant unique du message |
| `deviceId` | string | Identifiant du capteur (ex: `GATE-EXPO-A1-001`) |
| `venueId` | string | Identifiant du lieu (ex: `venue-grand-palais`) |
| `exhibitionId` | string | Identifiant de l'exposition |
| `timestamp` | string (ISO 8601) | Horodatage de l'événement |
| `eventType` | enum | Type d'événement (voir ci-dessous) |
| `ticketId` | string \| null | Identifiant du billet scanné |
| `ticketStatus` | enum \| null | Statut du billet (VALID, INVALID, USED, EXPIRED) |
| `currentOccupancy` | number | Nombre de visiteurs actuellement dans le lieu |
| `maxCapacity` | number | Capacité maximale du lieu |
| `occupancyRate` | number | Taux d'occupation (0.0 à 1.0) |
| `state` | enum | État courant du dispositif |
| `metadata.firmwareVersion` | string | Version du firmware |
| `metadata.batteryLevel` | number | Niveau de batterie (0.0 à 1.0) |
| `metadata.signalStrength` | number | Force du signal en dBm |
| `metadata.retryCount` | number | Nombre de tentatives de lecture |

## Exemples par type d'événement

### ENTRY — Entrée valide

```json
{
  "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "deviceId": "GATE-EXPO-A1-001",
  "venueId": "venue-grand-palais",
  "exhibitionId": "expo-cartier-bresson-2026",
  "timestamp": "2026-07-04T14:32:05.123Z",
  "eventType": "ENTRY",
  "ticketId": "TKT-2026-VALID-001",
  "ticketStatus": "VALID",
  "currentOccupancy": 348,
  "maxCapacity": 500,
  "occupancyRate": 0.696,
  "state": "GRANTED",
  "metadata": {
    "firmwareVersion": "1.4.2",
    "batteryLevel": 0.87,
    "signalStrength": -65,
    "retryCount": 0
  }
}
```

### DENIED — Billet invalide

```json
{
  "messageId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "deviceId": "GATE-EXPO-A1-001",
  "venueId": "venue-grand-palais",
  "exhibitionId": "expo-cartier-bresson-2026",
  "timestamp": "2026-07-04T14:33:10.456Z",
  "eventType": "DENIED",
  "ticketId": "TKT-2026-FAKE-999",
  "ticketStatus": "INVALID",
  "currentOccupancy": 348,
  "maxCapacity": 500,
  "occupancyRate": 0.696,
  "state": "DENIED",
  "metadata": {
    "firmwareVersion": "1.4.2",
    "batteryLevel": 0.87,
    "signalStrength": -65,
    "retryCount": 0
  }
}
```

### DENIED — Billet déjà utilisé

```json
{
  "eventType": "DENIED",
  "ticketId": "TKT-2026-USED-042",
  "ticketStatus": "USED",
  "state": "DENIED"
}
```

### ERROR — Erreur de lecture (3 tentatives)

```json
{
  "messageId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "deviceId": "GATE-EXPO-A1-001",
  "venueId": "venue-grand-palais",
  "exhibitionId": "expo-cartier-bresson-2026",
  "timestamp": "2026-07-04T14:35:00.789Z",
  "eventType": "ERROR",
  "ticketId": null,
  "ticketStatus": null,
  "currentOccupancy": 348,
  "maxCapacity": 500,
  "occupancyRate": 0.696,
  "state": "ERROR",
  "metadata": {
    "firmwareVersion": "1.4.2",
    "batteryLevel": 0.87,
    "signalStrength": -65,
    "retryCount": 3
  }
}
```

### CAPACITY_WARNING — Alerte à 95%

```json
{
  "eventType": "CAPACITY_WARNING",
  "ticketId": null,
  "ticketStatus": null,
  "currentOccupancy": 475,
  "maxCapacity": 500,
  "occupancyRate": 0.95,
  "state": "IDLE"
}
```

### CAPACITY_EXCEEDED — Jauge dépassée

```json
{
  "eventType": "CAPACITY_EXCEEDED",
  "currentOccupancy": 500,
  "maxCapacity": 500,
  "occupancyRate": 1.0,
  "state": "IDLE"
}
```

### EXIT — Sortie

```json
{
  "eventType": "EXIT",
  "ticketId": null,
  "ticketStatus": null,
  "currentOccupancy": 347,
  "maxCapacity": 500,
  "occupancyRate": 0.694,
  "state": "IDLE"
}
```
