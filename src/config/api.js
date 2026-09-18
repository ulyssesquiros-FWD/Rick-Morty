/**
 * Centralized API configuration for Rick and Morty API
 */
export const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RICK_MORTY_API_URL) ||
  'https://rickandmortyapi.com/api';

export const API_ENDPOINTS = {
  characters: `${API_URL}/character`,
  locations: `${API_URL}/location`,
  episodes: `${API_URL}/episode`
};
