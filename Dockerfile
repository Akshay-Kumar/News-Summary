# Use lightweight Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production

# Copy rest of the code
COPY . .

# Expose backend port
EXPOSE 8000

# Start server
CMD ["npm", "start"]