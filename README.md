# Copypastor

Copypastor is a **Personal Universal Clipboard** and snippet manager designed to store, search, and organize your most frequently used code snippets, prompts, or text blocks.

## 🚀 Features

- **Search & Filter**: Quickly find snippets by title, content, category, or tags.
- **Pinning**: Keep your most important snippets at the top.
- **Categorization**: Organize snippets into custom categories.
- **Export**: Download all your snippets in a JSON format.
- **Docker Ready**: Easily deploy using Docker and Docker Compose.
- **Nginx Configured**: Includes configuration for proxying behind Nginx.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Frontend**: HTML5, JavaScript (Vanilla), CSS
- **Containerization**: Docker, Docker Compose

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) (Optional, for containerized deployment)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd prompt-gallery
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`.

### Using Docker

1. **Build and start the container**:
   ```bash
   docker-compose up -d
   ```
   *Note: Ensure you have an external network named `caddy_network` created (`docker network create caddy_network`) if you are using the default `docker-compose.yml`.*

## 📂 Project Structure

- `server.js`: Main Express application and API routes.
- `database.js`: Database initialization and migration logic.
- `public/`: Static files for the frontend.
  - `app.js`: Frontend logic and API interaction.
  - `index.html`: Main UI layout.
- `Dockerfile` & `docker-compose.yml`: Containerization configuration.
- `nginx.conf`: Sample Nginx configuration for proxying.

## 🔌 API Endpoints

- `GET /api/snippets`: Fetch snippets with optional queries (`search`, `category`, `tag`, `sort`).
- `POST /api/snippets`: Create a new snippet.
- `PUT /api/snippets/:id`: Update an existing snippet.
- `PUT /api/snippets/:id/pin`: Toggle the pinned status of a snippet.
- `GET /api/export`: Export all snippets as JSON.

## 📄 License

This project is licensed under the MIT License.
