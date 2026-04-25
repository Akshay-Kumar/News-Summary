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

# 🐳 Docker Deployment

---

## **1. Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
```

---

## **2. Docker Compose**

```yaml
services:
  backend:
    build: .
    container_name: news-backend
    ports:
      - "8000:8000"
    environment:
      - NEWS_API_KEY=your_api_key
    restart: unless-stopped
```

---

## **3. Run Application**

```bash
docker compose up -d --build
```

---

## **4. Access API**

http://localhost:8000/docs

---

# 💻 **Local Development**

## **1. Clone Repository**
```bash
git clone https://github.com/Akshay-Kumar/News-Summary.git
cd News-Summary
```

## **2. Install Dependencies**
```bash
pip install -r requirements.txt
```

## **3. Run Server**
```bash
uvicorn main:app --reload
```

---

## 📡 **API Endpoints**

| Method | Endpoint | Description |
|--------|---------|------------|
| GET | `/news` | Fetch latest news |
| GET | `/news?category=technology` | Filter by category |
| GET | `/news?source=bbc-news` | Filter by source |

---

## ⚙️ **Environment Variables**

```
NEWS_API_KEY=your_api_key
```

---

## ⚠️ **Notes**

- Ensure backend is running before frontend
- Use a valid API key

---

## **Contributing**
Fork and submit PRs

---

## **License**
MIT License
