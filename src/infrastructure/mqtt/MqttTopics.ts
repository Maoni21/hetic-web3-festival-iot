export const MqttTopics = {
  venueAccess: (venueId: string): string =>
    `festival/venue/${venueId}/access`,

  venueCapacity: (venueId: string): string =>
    `festival/venue/${venueId}/capacity`,

  deviceStatus: (deviceId: string): string =>
    `festival/device/${deviceId}/status`,

  deviceError: (deviceId: string): string =>
    `festival/device/${deviceId}/error`,

  ALL_VENUE_EVENTS: 'festival/venue/+/access',
  ALL_CAPACITY_EVENTS: 'festival/venue/+/capacity',
  ALL_DEVICE_STATUS: 'festival/device/+/status',
  ALL_DEVICE_ERRORS: 'festival/device/+/error',
} as const;
