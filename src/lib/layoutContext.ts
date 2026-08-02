import type { TopBarAction, TopBarBack } from '../components/TopBar';

export interface LayoutContext {
  setTopRightActions: (actions: TopBarAction[]) => void;
  setTopLeftBack: (back: TopBarBack | null) => void;
  setTitle: (title: string | null) => void;
}
