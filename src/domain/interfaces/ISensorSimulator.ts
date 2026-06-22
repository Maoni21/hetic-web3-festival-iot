export interface ScenarioResult {
  scenarioName: string;
  success: boolean;
  messagesPublished: number;
  durationMs: number;
  details: string;
}

export interface ISensorSimulator {
  runScenario(scenarioName: string): Promise<ScenarioResult>;
  runAllScenarios(): Promise<ScenarioResult[]>;
}
