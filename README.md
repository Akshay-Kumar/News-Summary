# 📰 News-Summary Backend
🚀 A Node.js backend service that fetches and serves news articles.

---

## 🧠 Overview

- Fetches news from external APIs
- Provides REST endpoints
- Supports filtering by category and source

---

## ⚙️ Tech Stack

- Node.js
- Express.js
- Axios / Fetch

---

## 🚀 Features

✅ Fetch latest news  
✅ Filter by category  
✅ Filter by source  
✅ REST API

---

# ⚙️ Environment Setup

## **1. Create `.env` file**

Create a `.env` file in the root directory and add:

```env
# Database
MONGO_URI=mongodb://localhost:27017/newsdb
# OR use Mongo Atlas:
# MONGO_URI=<mongodb Atlas connection string>

# Security
JWT_SECRET=your_jwt_secret_key

# External APIs
WORLDNEWS_API_KEYS=your_newsapi_key1,your_newsapi_key2,your_newsapi_key3
HF_TOKEN=your_huggingface_api_key
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=5000

DOMAIN=yourdomain.com
EMAIL=your@email.com
```

---

## ⚠️ Notes

- If using Docker, replace Mongo URI with:
  ```
  mongodb://mongo:27017/newsdb
  ```
- Do NOT commit `.env` to GitHub
- Create `.env.example` instead for sharing

---

# 🐳 Docker Deployment

---

## **1. Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

---

## **2. Docker Compose**

```yaml
version: "3.9"

services:
  backend:
    build: .
    container_name: news-backend
    ports:
      - "5000:5000"
    env_file:
      - .env
    restart: unless-stopped
```

---

## **3. Run Application**

```bash
docker compose up -d --build
```

---

## **4. Access API**

http://localhost:5000

---

# 💻 Local Development

## **1. Clone Repository**
```bash
git clone https://github.com/Akshay-Kumar/News-Summary.git
cd News-Summary
```

---

## **2. Install Dependencies**
```bash
npm install
```

---

## **3. Run Server**
```bash
npm start
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|---------|------------|
| GET | `/news` | Fetch latest news |
| GET | `/news?category=technology` | Filter by category |
| GET | `/news?source=bbc-news` | Filter by source |

---

## ⚠️ Notes

- Ensure backend is running before frontend
- Make sure `PORT` in `.env` matches Docker / frontend config

---

## Contributing

Fork and submit PRs

---

## License

MIT License
