import { createContext, useContext } from 'react';

type ArtifactOpenFn = (artifact: {
  id: string;
  type: string;
  title: string;
  data: Record<string, any>;
}) => void;

const ArtifactContext = createContext<ArtifactOpenFn | null>(null);

export const ArtifactProvider = ArtifactContext.Provider;

export function useArtifactOpen(): ArtifactOpenFn | null {
  return useContext(ArtifactContext);
}
