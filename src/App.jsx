import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';

/**
 * App Component
 * Core application wrapper with router, game state provider and layout shell.
 */
function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </GameProvider>
    </BrowserRouter>
  );
}

export default App;
