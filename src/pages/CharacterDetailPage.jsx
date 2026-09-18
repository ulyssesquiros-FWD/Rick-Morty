import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCharacterById } from '../services/api/rickAndMortyApi';
import CharacterDetail from '../components/CharacterDetail';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

/**
 * CharacterDetailPage Component (/personajes/:id)
 * Fetches character data by ID from the API and renders full dossier.
 */
export default function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getCharacterById(id, { signal: controller.signal })
      .then((data) => {
        setCharacter(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;

        if (err.status === 404 || err.code === 'NOT_FOUND') {
          setError({
            title: 'ENTITY NOT FOUND',
            message: `Coordinates for Character #${id} do not correspond to any known entity in the current timeline.`
          });
        } else {
          setError({
            title: 'DIMENSIONAL TRANSMISSION FAILURE',
            message: err.message || 'Unable to decrypt entity profile from the Citadel datastream.'
          });
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleReturn = () => {
    navigate('/personajes');
  };

  return (
    <div className="character-detail-page">
      {loading && <Loader message={`RETRIEVING ENTITY #${id} DOSSIER...`} />}

      {!loading && error && (
        <ErrorMessage
          title={error.title}
          message={error.message}
          onRetry={handleRetry}
          secondaryAction={handleReturn}
          secondaryActionLabel="RETURN TO DATABASE"
        />
      )}

      {!loading && !error && character && (
        <CharacterDetail character={character} />
      )}
    </div>
  );
}
