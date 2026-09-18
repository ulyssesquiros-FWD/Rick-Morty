import { BrowserRouter } from 'react-router-dom';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';

/**
 * App Component
 * Core application wrapper with router, state providers and global layout shell.
 */
function App() {
  return (
    <BrowserRouter>
      <FavoritesProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </FavoritesProvider>
    </BrowserRouter>
  );
}

export default App;
