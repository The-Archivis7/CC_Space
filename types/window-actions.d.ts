/**
 * Global menu actions exposed to inline HTML onclick handlers (see wizard.html).
 */
interface Window {
  setProfile(name: string): void;
  startGame(): void;
  nextLevel(): void;
  retryLevel(): void;
  showMenu(): void;
  // IRON MAW FORGE (mech2.html) inline handlers
  switchTab(tabName: string): void;
  selectPartCategory(cat: string): void;
  setArena(arenaId: string): void;
  setGameMode(mode: string): void;
  startCombatDeployment(): void;
  abortMission(): void;
  closePostBattleModal(): void;
  audioUnlock(): void;
  toggleMute(): void;
}
