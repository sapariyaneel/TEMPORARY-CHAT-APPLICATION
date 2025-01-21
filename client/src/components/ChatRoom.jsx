import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Container,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Popper,
  ClickAwayListener,
  Zoom,
  Fade,
  Grow,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { API_URL, SOCKET_URL } from '../config';

// Helper functions
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getProgressColor = (timeLeft) => {
  if (timeLeft > 300) return '#4CAF50';  // Bright green
  if (timeLeft > 120) return '#FFC107';  // Bright yellow
  return '#F44336';  // Bright red
};

// Updated CSS styles
const typingAnimationStyles = `
  @keyframes typingDot {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    width: fit-content;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: fadeIn 0.3s ease;
  }

  .typing-dot {
    width: 4px;
    height: 4px;
    background: #90caf9;
    border-radius: 50%;
    animation: typingDot 1s infinite;
  }

  .typing-dot:nth-child(1) { animation-delay: 0ms; }
  .typing-dot:nth-child(2) { animation-delay: 200ms; }
  .typing-dot:nth-child(3) { animation-delay: 400ms; }

  .EmojiPickerReact {
    background-color: rgba(30, 30, 30, 0.95) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
  }

  .EmojiPickerReact .epr-search-container input {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .EmojiPickerReact .epr-body::-webkit-scrollbar {
    width: 8px;
  }

  .EmojiPickerReact .epr-body::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .EmojiPickerReact .epr-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
`;

const customStyles = (theme) => {
  return {
    mainContainer: {
      animation: 'float 6s ease-in-out infinite',
    },
    chatContainer: {
      background: 'rgba(10, 25, 41, 0.9)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
      },
    },
    messageInput: {
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      borderRadius: '30px',
      transition: 'all 0.3s ease',
      '& .MuiOutlinedInput-root': {
        color: '#ffffff',
        '& fieldset': {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        },
        '&:hover fieldset': {
          borderColor: 'rgba(255, 255, 255, 0.5)',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#90caf9',
        },
      },
      '& .MuiInputBase-input::placeholder': {
        color: 'rgba(255, 255, 255, 0.7)',
      },
      '&:hover': {
        transform: 'scale(1.01)',
      },
    },
  };
};

const getSendButtonStyles = (theme, timeLeft) => {
  const color = getProgressColor(timeLeft);
  
  return {
    animation: 'pulse 2s infinite',
    borderRadius: '20px',
    minWidth: '120px',
    background: color,
    boxShadow: `0 4px 15px ${color}80`,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '10px 24px',
    border: `2px solid ${color}`,
    '&:hover': {
      background: 'transparent',
      color: color,
      boxShadow: `0 6px 20px ${color}80`,
    },
    '&.Mui-disabled': {
      background: theme.palette.mode === 'light'
        ? 'rgba(0, 0, 0, 0.12)'
        : 'rgba(255, 255, 255, 0.12)',
      color: theme.palette.mode === 'light'
        ? 'rgba(0, 0, 0, 0.26)'
        : 'rgba(255, 255, 255, 0.3)',
      border: 'none'
    }
  };
};

function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [roomCreatedAt, setRoomCreatedAt] = useState(null);
  const [cycleStartTime, setCycleStartTime] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef(null);
  const theme = useTheme();
  const styles = useMemo(() => customStyles(theme), [theme]);
  const sendButtonStyles = useMemo(() => getSendButtonStyles(theme, timeLeft), [theme, timeLeft]);

  // Add typing animation styles to document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = typingAnimationStyles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if room exists before connecting
  useEffect(() => {
    const validateRoom = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/rooms/${roomId}`);
        if (!response.ok) {
          throw new Error('Failed to validate room');
        }
        
        const data = await response.json();
        if (!data.exists && !data.room) {
          throw new Error('Room not found');
        }

        // Initialize socket connection after room validation
        const newSocket = io(SOCKET_URL, {
          withCredentials: true,
          transports: ['websocket'],
          path: '/socket.io'
        });

        setSocket(newSocket);
        setLoading(false);
      } catch (err) {
        console.error('Error validating room:', err);
        setError('Room not found or no longer available');
        setLoading(false);
      }
    };

    validateRoom();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Updated timer effect
  useEffect(() => {
    if (!cycleStartTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const nextCycleStart = cycleStartTime + 600000; // 10 minutes in ms
      const remaining = Math.max(0, Math.ceil((nextCycleStart - now) / 1000));
      
      setTimeLeft(remaining);

      // If time is up, clear messages and start new cycle
      if (remaining === 0) {
        setMessages([]);
        setCycleStartTime(nextCycleStart);
      }
    };

    // Update immediately and then every second
    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [cycleStartTime]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_joined', ({ messages, createdAt, cycleStartTime }) => {
      setMessages(messages);
      setRoomCreatedAt(createdAt);
      setCycleStartTime(cycleStartTime);
    });

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(message.username);
        return next;
      });
    });

    socket.on('messages_cleared', ({ cycleStartTime: newCycleStart }) => {
      setMessages([]);
      setCycleStartTime(newCycleStart);
    });

    socket.on('user_joined', ({ username: joinedUser, users: updatedUsers }) => {
      setUsers(updatedUsers);
    });

    socket.on('user_left', ({ username: leftUser, users: updatedUsers }) => {
      setUsers(updatedUsers);
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(leftUser);
        return next;
      });
    });

    socket.on('user_typing', ({ username: typingUser }) => {
      if (typingUser !== username) {
        setTypingUsers(prev => new Set(prev).add(typingUser));
      }
    });

    socket.on('user_stopped_typing', ({ username: stoppedUser }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(stoppedUser);
        return next;
      });
    });

    socket.on('username_checked', ({ isAvailable, error }) => {
      if (!isAvailable) {
        setUsernameError(error);
      } else {
        setUsernameError('');
        socket.emit('join_room', { roomId, username });
        setIsJoined(true);
      }
    });

    socket.on('error', (error) => {
      if (error.message === 'Username already taken') {
        setIsJoined(false);
        setUsernameError(error.message);
      } else {
        console.error('Socket error:', error);
        navigate('/');
      }
    });

    return () => {
      socket.off('room_joined');
      socket.off('receive_message');
      socket.off('messages_cleared');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('username_checked');
      socket.off('error');
    };
  }, [socket, navigate, username, roomId]);

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { roomId, username });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { roomId, username });
      }, 1000);
    }
  };

  const checkUsername = () => {
    if (username.trim() && socket) {
      socket.emit('check_username', { roomId, username });
    }
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    setUsernameError('');
  };

  const joinRoom = () => {
    if (username.trim() && socket) {
      checkUsername();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      socket.emit('send_message', { roomId, message });
      socket.emit('stop_typing', { roomId, username });
      setMessage('');
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Paper elevation={0} sx={{
            p: 4,
            textAlign: 'center',
            background: 'rgba(10, 25, 41, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            width: '100%'
          }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)',
                }
              }}
            >
              Return Home
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (!isJoined) {
    return (
      <Dialog 
        open={true}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: 300
        }}
        PaperProps={{
          sx: {
            background: theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.9)'
              : 'rgba(10, 25, 41, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            minWidth: '320px',
            border: `1px solid ${theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(255, 255, 255, 0.1)'}`,
          }
        }}
      >
        <Box>
          <DialogTitle sx={{ textAlign: 'center' }}>
            <Typography variant="h5" component="div" gutterBottom>
              Join Chat Room
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Display Name"
              fullWidth
              value={username}
              onChange={handleUsernameChange}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              error={!!usernameError}
              helperText={usernameError}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
            <Button 
              onClick={() => navigate('/')}
              variant="outlined"
              color="error"
              sx={{ borderRadius: 2, minWidth: '100px' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={joinRoom}
              disabled={!username.trim()}
              variant="contained"
              sx={sendButtonStyles}
            >
              Join Chat
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    );
  }

  return (
    <Container maxWidth="md" sx={styles.mainContainer}>
      <Box sx={{ height: '100vh', py: 3, position: 'relative' }}>
        <Paper
          elevation={0}
          sx={{
            ...styles.chatContainer,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: 2, 
            borderBottom: `1px solid ${theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.1)'
              : 'rgba(255, 255, 255, 0.1)'}`,
            background: theme.palette.mode === 'light'
              ? 'rgba(255, 255, 255, 0.8)'
              : 'rgba(0, 0, 0, 0.2)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: theme.palette.mode === 'light' 
                    ? 'rgba(0, 0, 0, 0.87)' 
                    : 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 600
                }}
              >
                Temporary Chat Room
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                background: theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                padding: '4px 12px',
                borderRadius: 2,
                border: `1px solid ${theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.1)'
                  : 'rgba(255, 255, 255, 0.1)'}`
              }}>
                <AccessTimeIcon sx={{ 
                  color: getProgressColor(timeLeft),
                  fontSize: '1.5rem',
                  filter: `drop-shadow(0 2px 8px ${getProgressColor(timeLeft)}80)`
                }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: getProgressColor(timeLeft),
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '0.5px',
                    filter: `drop-shadow(0 2px 8px ${getProgressColor(timeLeft)}80)`
                  }}
                >
                  {formatTime(timeLeft)}
                </Typography>
              </Box>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(timeLeft / 600) * 100}
              sx={{ 
                mb: 2, 
                height: 6, 
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  backgroundColor: getProgressColor(timeLeft),
                }
              }}
            />
            {timeLeft <= 60 && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  backgroundColor: 'rgba(237, 108, 2, 0.1)',
                  border: '1px solid rgba(237, 108, 2, 0.2)',
                  '& .MuiAlert-icon': {
                    color: getProgressColor(timeLeft)
                  }
                }}
              >
                Chat messages will be cleared in {timeLeft} seconds!
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {users.map((user) => (
                <Chip
                  key={user}
                  label={user}
                  size="small"
                  sx={{ 
                    borderRadius: 2,
                    background: `${getProgressColor(timeLeft)}20`,
                    border: `1px solid ${getProgressColor(timeLeft)}40`,
                    color: getProgressColor(timeLeft),
                    '&:hover': {
                      background: `${getProgressColor(timeLeft)}30`,
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          <List
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
              },
            }}
          >
            {messages.map((msg, index) => (
              <Grow in={true} key={msg.id || index} timeout={300 + index * 100}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: msg.username === username ? 'flex-end' : 'flex-start',
                    py: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-block',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      mb: 0.5,
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {msg.username}
                  </Box>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      background: msg.username === username 
                        ? 'rgba(0, 0, 0, 0.3)'
                        : 'rgba(0, 0, 0, 0.3)',
                      maxWidth: '70%',
                      borderRadius: msg.username === username ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <ListItemText 
                      primary={msg.message}
                      sx={{
                        '& .MuiTypography-root': {
                          wordBreak: 'break-word',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 500,
                          fontSize: '0.95rem'
                        }
                      }}
                    />
                  </Paper>
                </ListItem>
              </Grow>
            ))}
            {typingUsers.size > 0 && (
              <Grow in={true} timeout={300}>
                <Box sx={{ mt: 1, ml: 2 }}>
                  <div className="typing-indicator">
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        mr: 1,
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    >
                      {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
                    </Typography>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </Box>
              </Grow>
            )}
            <div ref={messagesEndRef} />
          </List>

          <Box
            component="form"
            onSubmit={sendMessage}
            sx={{
              p: 2,
              background: theme.palette.mode === 'light'
                ? 'rgba(255, 255, 255, 0.5)'
                : 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              borderTop: `1px solid ${theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.1)'}`,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ position: 'relative', flexGrow: 1 }}>
                <TextField
                  fullWidth
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  variant="outlined"
                  size="small"
                  sx={styles.messageInput}
                />
                <IconButton
                  ref={emojiButtonRef}
                  onClick={toggleEmojiPicker}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-50%) scale(1.1)',
                    },
                  }}
                >
                  <EmojiEmotionsIcon />
                </IconButton>
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={!message.trim()}
                endIcon={<SendIcon />}
                sx={sendButtonStyles}
              >
                Send
              </Button>
            </Box>
            <Popper
              open={showEmojiPicker}
              anchorEl={emojiButtonRef.current}
              placement="top-end"
              sx={{ zIndex: 1000 }}
            >
              <ClickAwayListener onClickAway={() => setShowEmojiPicker(false)}>
                <Box sx={{
                  transform: 'scale(0.95)',
                  transformOrigin: 'bottom right',
                  transition: 'all 0.3s ease',
                }}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    theme={theme.palette.mode}
                    width={320}
                    height={400}
                  />
                </Box>
              </ClickAwayListener>
            </Popper>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ChatRoom; 