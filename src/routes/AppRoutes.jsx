import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Characters from '../pages/Characters';
import CharacterDetailPage from '../pages/CharacterDetailPage';
import Favorites from '../pages/Favorites';
import NotFound from '../pages/NotFound';

/**
 * AppRoutes Component
 * Centralizes all application route definitions with React Router v6+.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/personajes" element={<Characters />} />
      <Route path="/personajes/:id" element={<CharacterDetailPage />} />
      <Route path="/favoritos" element={<Favorites />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
