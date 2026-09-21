import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Levels from '../pages/Levels';
import Game from '../pages/Game';
import LeaderboardPage from '../pages/LeaderboardPage';
import NotFound from '../pages/NotFound';

/**
 * AppRoutes Component
 * Centralizes all React Router route definitions for Dimension Raid.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/niveles" element={<Levels />} />
      <Route path="/nivel/:num" element={<Game />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
