import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

function Home() {
  const navigate = useNavigate();

  const createRoom = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
      });
      const data = await response.json();
      navigate(`/room/${data.roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          <ChatIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Temporary Chat
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create a private chat room that expires in 10 minutes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={createRoom}
            sx={{ mt: 2 }}
          >
            Create New Room
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default Home; 