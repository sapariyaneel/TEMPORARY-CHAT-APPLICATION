# Temporary Chat Application

A real-time chat application where messages automatically expire after 10 minutes. Built with React, Node.js, and Socket.IO.

## Features

- Real-time messaging
- Message expiration after 10 minutes
- User typing indicators
- Emoji support
- Username validation
- Dynamic countdown timer
- Modern UI with glassmorphism design

## Tech Stack

- **Frontend:**
  - React
  - Material-UI
  - Socket.IO Client
  - Emoji Picker React
  - Vite

- **Backend:**
  - Node.js
  - Express
  - Socket.IO
  - UUID

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [your-repo-name]
```

2. Install server dependencies:
```bash
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
```

4. Create a `.env` file in the root directory:
```bash
PORT=5000
```

### Running the Application

1. Start the server:
```bash
npm run dev
```

2. In a separate terminal, start the client:
```bash
cd client
npm run dev
```

3. Open http://localhost:3000 in your browser

## Usage

1. Create a new chat room
2. Enter your username
3. Share the room URL with others
4. Start chatting!

Note: Messages will automatically expire after 10 minutes.

## License

MIT 