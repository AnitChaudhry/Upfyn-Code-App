import React, { createContext, useState, useContext, useCallback } from 'react';

interface ProjectContextType {
  activeProjectPath: string | null;
  setActiveProjectPath: (path: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProjectPath, setActiveProjectPathState] = useState<string | null>(null);

  const setActiveProjectPath = useCallback((path: string | null) => {
    setActiveProjectPathState(path);
  }, []);

  return (
    <ProjectContext.Provider value={{ activeProjectPath, setActiveProjectPath }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
