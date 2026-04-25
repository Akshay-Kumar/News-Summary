# 📰 News-Summary Backend
🚀 FastAPI backend for fetching and serving news articles.

---

## 🧠 **Overview**
- Fetches news from external APIs
- Provides REST endpoints
- Supports filtering by category and source

---

## ⚙️ **Tech Stack**
- Python 3.11
- FastAPI
- Uvicorn

---

# 🐳 **Docker Deployment**

---

## **1. Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
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
      - "8000:8000"
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
