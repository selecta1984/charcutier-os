import { useApp } from './store';
import { BackupScreen, ChangelogScreen, CountScreen, CureScreen, Home, InventoryScreen, RecipeScreen, RoundingScreen, WeightScreen } from './ui/screens';

export default function App() {
  const screen = useApp((s) => s.screen);
  switch (screen) {
    case 'weight': return <WeightScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'count': return <CountScreen />;
    case 'rounding': return <RoundingScreen />;
    case 'cure': return <CureScreen />;
    case 'recipe': return <RecipeScreen />;
    case 'backup': return <BackupScreen />;
    case 'changelog': return <ChangelogScreen />;
    default: return <Home />;
  }
}
