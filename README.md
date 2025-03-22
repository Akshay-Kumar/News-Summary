### **News-Summary Backend**  
🚀 A Node.js-powered backend that fetches news articles from a news API and serves them to the client.

## **Features**  
✅ Fetches real-time news articles from a third-party API  
✅ Serves news data to the client via RESTful endpoints  
✅ Supports filtering and categorization of news articles  
✅ Lightweight and efficient  

## **Tech Stack**  
- **Node.js**  
- **Express.js**  
- **Axios** (for making API requests)  
- **Dotenv** (for managing API keys)  

## **Getting Started**  

### **1. Clone the Repository**  
```bash
git clone https://github.com/your-username/News-Summary.git
cd News-Summary
```

### **2. Install Dependencies**  
```bash
npm install
```

### **3. Set Up Environment Variables**  
Create a `.env` file in the root directory and add:  
```plaintext
NEWS_API_KEY=your_api_key_here
PORT=5000
```

### **4. Run the Server**  
```bash
npm start
```
or for development:
```bash
npm run dev
```

### **5. API Endpoints**  
| Method | Endpoint | Description |
|--------|---------|------------|
| GET    | `/news` | Fetch latest news articles |
| GET    | `/news?category=technology` | Fetch news by category |
| GET    | `/news?source=bbc-news` | Fetch news from a specific source |

## **Contributing**  
Feel free to fork this repository and submit a pull request if you have improvements!  

## **License**  
📝 MIT License

