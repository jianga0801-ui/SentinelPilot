FROM node:20-alpine

WORKDIR /app

ARG BACKEND_API_URL=http://backend:8000
ENV BACKEND_API_URL=${BACKEND_API_URL}

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
