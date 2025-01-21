import React, { createContext, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Home from './components/Home';
import ChatRoom from './components/ChatRoom';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [mode, setMode] = useState('dark');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    []
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: {
                  main: '#2196f3',
                },
                background: {
                  default: '#f5f5f5',
                  paper: 'rgba(255, 255, 255, 0.9)',
                },
              }
            : {
                primary: {
                  main: '#90caf9',
                },
                background: {
                  default: '#0a1929',
                  paper: 'rgba(10, 25, 41, 0.9)',
                },
              }),
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                background: mode === 'light'
                  ? 'linear-gradient(45deg, #f3f4f6 0%, #fff 100%)'
                  : 'linear-gradient(45deg, #0a1929 0%, #1a365d 100%)',
                minHeight: '100vh',
                transition: 'all 0.3s ease',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(10px)',
                background: mode === 'light'
                  ? 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(10, 25, 41, 0.7)',
                borderRadius: 16,
                border: `1px solid ${mode === 'light'
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)'}`,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<ChatRoom />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
