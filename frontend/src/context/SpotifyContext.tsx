import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SpotifyState {
  /** Spotify embed URL (already converted to embed format) */
  embedUrl: string | null;
  /** Original Spotify URL */
  originalUrl: string | null;
  /** Label shown in mini player */
  label: string;
  /** Is the player visible */
  visible: boolean;
  /** Is mini player expanded to full embed */
  expanded: boolean;
}

interface SpotifyContextType extends SpotifyState {
  play: (spotifyUrl: string, label?: string) => void;
  stop: () => void;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
}

const SpotifyContext = createContext<SpotifyContextType | null>(null);

/**
 * Converts a Spotify URL to its embed equivalent.
 * Supports: tracks, albums, playlists, episodes, shows, artists.
 *
 * Examples:
 *  https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *  https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
 *  spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 */
function toEmbedUrl(url: string): string | null {
  // Already an embed URL
  if (url.includes("open.spotify.com/embed/")) return url;

  // Spotify URI format (spotify:type:id)
  const uriMatch = url.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}?utm_source=generator&theme=0`;
  }

  // Web URL format (handles /intl-XX/ prefix like /intl-es/)
  const webMatch = url.match(
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/
  );
  if (webMatch) {
    return `https://open.spotify.com/embed/${webMatch[1]}/${webMatch[2]}?utm_source=generator&theme=0`;
  }

  return null;
}

function detectLabel(url: string): string {
  if (url.includes("/playlist/") || url.includes(":playlist:")) return "Spotify 歌单";
  if (url.includes("/album/") || url.includes(":album:")) return "Spotify 专辑";
  if (url.includes("/track/") || url.includes(":track:")) return "Spotify 歌曲";
  if (url.includes("/episode/") || url.includes(":episode:")) return "Spotify 单集";
  if (url.includes("/show/") || url.includes(":show:")) return "Spotify 播客";
  return "Spotify";
}

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpotifyState>({
    embedUrl: null,
    originalUrl: null,
    label: "",
    visible: false,
    expanded: false,
  });

  const play = useCallback((spotifyUrl: string, label?: string) => {
    const embed = toEmbedUrl(spotifyUrl.trim());
    if (!embed) return;
    setState({
      embedUrl: embed,
      originalUrl: spotifyUrl.trim(),
      label: label || detectLabel(spotifyUrl),
      visible: true,
      expanded: true,
    });
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({ ...s, embedUrl: null, originalUrl: null, visible: false, expanded: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((s) => ({ ...s, expanded: !s.expanded }));
  }, []);

  const setExpanded = useCallback((v: boolean) => {
    setState((s) => ({ ...s, expanded: v }));
  }, []);

  return (
    <SpotifyContext.Provider value={{ ...state, play, stop, toggle, setExpanded }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be inside SpotifyProvider");
  return ctx;
}
