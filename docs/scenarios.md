# Scénarios de simulation

## Scénario 1 — Entrée valide

**Description** : Un visiteur présente le billet `TKT-2026-VALID-001`, valide et non utilisé. L'appareil passe par les états READING → PROCESSING → GRANTED, enregistre l'entrée et incrémente l'occupance.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant UC as ValidateTicketUseCase
  participant R as TicketRepository
  participant P as MqttPublisher

  S->>S: onTicketDetected() → READING
  S->>UC: execute("TKT-2026-VALID-001")
  UC->>R: findById(ticketId)
  R-->>UC: Ticket (VALID)
  UC-->>S: { isValid: true }
  S->>S: onReadSuccess() → PROCESSING
  S->>P: publish(ENTRY, ticketStatus=VALID)
  S->>S: onAccessGranted() → GRANTED
  Note over S: 3s → onReset() → IDLE
```

**Messages attendus** :
- Topic `festival/venue/venue-grand-palais/access`
- `eventType: "ENTRY"`, `ticketStatus: "VALID"`, `state: "GRANTED"`
- `currentOccupancy: +1`

---

## Scénario 2 — Billet invalide

**Description** : Un visiteur présente le billet `TKT-2026-FAKE-999` qui n'existe pas en base. L'accès est refusé immédiatement.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant UC as ValidateTicketUseCase
  participant R as TicketRepository
  participant P as MqttPublisher

  S->>S: onTicketDetected() → READING
  S->>UC: execute("TKT-2026-FAKE-999")
  UC->>R: findById(ticketId)
  R-->>UC: null (ticket inexistant)
  UC-->>S: { isValid: false, reason: INVALID }
  S->>S: onReadSuccess() → PROCESSING
  S->>P: publish(DENIED, ticketStatus=INVALID)
  S->>S: onAccessDenied() → DENIED
  Note over S: 3s → onReset() → IDLE
```

**Messages attendus** :
- `eventType: "DENIED"`, `ticketStatus: "INVALID"`, `state: "DENIED"`
- `currentOccupancy: inchangé`

---

## Scénario 3 — Billet déjà utilisé

**Description** : Le billet `TKT-2026-USED-042` a déjà été scanné. Le système détecte le statut `USED` et refuse l'entrée.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant UC as ValidateTicketUseCase
  participant R as TicketRepository
  participant P as MqttPublisher

  S->>S: onTicketDetected() → READING
  S->>UC: execute("TKT-2026-USED-042")
  UC->>R: findById(ticketId)
  R-->>UC: Ticket (status=USED)
  UC-->>S: { isValid: false, reason: USED }
  S->>S: onReadSuccess() → PROCESSING
  S->>P: publish(DENIED, ticketStatus=USED)
  S->>S: onAccessDenied() → DENIED
  Note over S: 3s → onReset() → IDLE
```

**Messages attendus** :
- `eventType: "DENIED"`, `ticketStatus: "USED"`, `state: "DENIED"`

---

## Scénario 4 — Erreur de lecture

**Description** : Le capteur tente de lire un ticket 3 fois et échoue à chaque fois (QR code illisible, bruit RFID). L'appareil passe en état ERROR, puis récupère automatiquement après 5 secondes.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant P as MqttPublisher

  S->>S: onTicketDetected() → READING
  S->>S: Tentative 1 → échec
  S->>S: Tentative 2 → échec
  S->>S: Tentative 3 → échec
  S->>S: onReadFailure() → ERROR
  S->>P: publish(ERROR, retryCount=3)
  Note over S: 5s → onRecovery() → IDLE
  S->>P: publish(status=IDLE)
```

**Messages attendus** :
- Topic `festival/device/GATE-EXPO-A1-001/error`
- `eventType: "ERROR"`, `state: "ERROR"`, `metadata.retryCount: 3`

---

## Scénario 5 — Dépassement de jauge

**Description** : L'occupance atteint 95% de la capacité (475/500), déclenchant un avertissement. Puis elle atteint 100% (500/500) et tout accès est refusé avec la raison `VENUE_FULL`.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant P as MqttPublisher

  Note over P: currentOccupancy = 475 (95%)
  P->>P: publish(CAPACITY_WARNING, occupancyRate=0.95)

  Note over P: currentOccupancy = 500 (100%)
  P->>P: publish(CAPACITY_EXCEEDED, occupancyRate=1.0)

  S->>S: onTicketDetected() → READING
  S->>S: onReadSuccess() → PROCESSING
  S->>P: publish(DENIED, reason=VENUE_FULL)
  S->>S: onAccessDenied() → DENIED
```

**Messages attendus** :
- Topic `festival/venue/venue-grand-palais/capacity`
- `eventType: "CAPACITY_WARNING"`, `occupancyRate: 0.95`
- `eventType: "CAPACITY_EXCEEDED"`, `occupancyRate: 1.0`
- Topic `festival/venue/venue-grand-palais/access`
- `eventType: "DENIED"` (billet valide mais lieu plein)

---

## Scénario 6 — Perte de message et retour stable

**Description** : Le dispositif perd sa connexion MQTT. 3 messages sont perdus pendant l'interruption. À la reconnexion, le device passe OFFLINE → IDLE et republié les messages en attente.

```mermaid
sequenceDiagram
  participant S as Capteur
  participant B as Broker MQTT
  participant P as MqttPublisher

  S->>S: onConnectionLost() → OFFLINE
  S->>P: publish(state=OFFLINE) sur /status
  Note over S,B: Connexion perdue — 3 messages en file

  loop 3 fois
    S->>S: Tentative envoi → timeout
    S->>S: retryCount++
  end

  S->>B: Reconnexion établie
  S->>S: onReconnected() → IDLE
  S->>P: publish(state=IDLE) sur /status

  loop Messages en attente
    S->>P: republier message (retryCount=3)
  end
```

**Messages attendus** :
- Topic `festival/device/GATE-EXPO-A1-001/status`
- `state: "OFFLINE"` puis `state: "IDLE"`
- Messages en attente republiés sur `festival/venue/venue-grand-palais/access`
- `metadata.retryCount: 3`
