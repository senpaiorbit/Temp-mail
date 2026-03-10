# Use official Playwright image with browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --omit=dev

# Install only Chromium browser (smaller image)
RUN npx playwright install chromium --with-deps

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run as non-root user (already set in playwright base image)
USER pwuser

CMD ["node", "index.js"]
