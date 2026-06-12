// ---------------------------------------------------------------------------
// App root component — setup screen or game board.
// Task 10 — Routes between GameSetup and GameBoard based on game state.
// ---------------------------------------------------------------------------

import { useGamePersistence } from './hooks/useGamePersistence';
import GameSetup from './pages/GameSetup';
import GameBoard from './pages/GameBoard';

export default function App() {
  const { gameState, setGameState, clearGame } = useGamePersistence();

  if (!gameState) {
    return <GameSetup onGameStart={setGameState} />;
  }

  return (
    <GameBoard
      game={gameState}
      onGameStateChange={setGameState}
      onClearGame={clearGame}
    />
  );
}
