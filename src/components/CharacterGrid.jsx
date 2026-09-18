import CharacterCard from './CharacterCard';

/**
 * CharacterGrid Component
 * Renders a responsive CSS grid of CharacterCard components.
 */
export default function CharacterGrid({ characters = [] }) {
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <div className="character-grid" aria-label="Multiverse Character Grid">
      {characters.map((char) => (
        <CharacterCard key={char.id} character={char} />
      ))}
    </div>
  );
}
