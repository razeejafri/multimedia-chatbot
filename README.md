# Multimedia Chatbot — AI‑Powered Conversational Platform

[![React](https://img.shields.io/badge/React-v18-blue)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-Node.js-green)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-UI-06B6D4)](https://tailwindcss.com/)

[Live Demo](#) • [Backend API](#) • [Issues](#)

---

## Project Overview
A full‑stack AI chatbot that supports text, image, and audio input using Google Gemini for multimodal understanding and generation. It provides secure REST APIs, conversation history, and media processing. The frontend uses a modular React architecture with reusable components (AudioRecorder, ChatInterface, MessageList) and a clean, responsive UI built with Tailwind CSS.

---

## Features
- Multimodal chat: send text, image, and audio messages to the AI.
- Google Gemini‑powered understanding and responses.
- Conversation history stored in MongoDB.
- Media processing and validation on the server.
- Clean, responsive chat UI with Tailwind CSS.
- Modular React components: AudioRecorder, ChatInterface, MessageList.

---

## Tech Stack
- Frontend: React.js, Tailwind CSS
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- AI: Google Gemini API
- Others: Axios/Fetch, CORS, Multer (or similar) for uploads

---

## Screenshots
![Chat Interface](screenshots/chat-interface.png)
![Image Message](screenshots/image-message.png)
![Audio Recorder](screenshots/audio-recorder.png)

Place images in a /screenshots folder at the repo root.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm (or pnpm/yarn)
- MongoDB (local or Atlas)
- Google Gemini API key

### Environment Variables

Create server/.env:
