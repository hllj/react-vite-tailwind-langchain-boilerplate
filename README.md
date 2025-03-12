# Agent Chat Application

A modern chat application built with React and FastAPI, featuring AI agents powered by LangChain and LangGraph.

## Tech Stack

### Frontend
- React with TypeScript
- Vite
- Tailwind CSS
- Heroicons

### Backend
- FastAPI
- LangChain
- LangGraph
- Google Gemini

## Setup

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your API key:
   ```
   GOOGLE_API_KEY=your_google_api_key
   ```

5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### GitHub Setup
1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com) and sign in
   - Click on "+" in the top right and select "New repository"
   - Enter repository name and description
   - Choose public or private
   - Click "Create repository"

2. Initialize git in your local project:
   ```bash
   git init
   ```

3. Create a `.gitignore` file in the root directory:
   ```bash
   # Python
   __pycache__/
   *.py[cod]
   *$py.class
   *.so
   .Python
   env/
   build/
   develop-eggs/
   dist/
   downloads/
   eggs/
   .eggs/
   lib/
   lib64/
   parts/
   sdist/
   var/
   *.egg-info/
   .installed.cfg
   *.egg
   venv/
   
   # Environment variables
   .env
   
   # Node
   node_modules/
   npm-debug.log
   yarn-error.log
   yarn-debug.log
   .pnpm-debug.log
   .npm/
   
   # Build output
   dist/
   dist-ssr/
   
   # Editor directories and files
   .idea/
   .vscode/
   *.suo
   *.ntvs*
   *.njsproj
   *.sln
   *.sw?
   .DS_Store
   ```

4. Add your files and make your first commit:
   ```bash
   git add .
   git commit -m "Initial commit"
   ```

5. Link your local repository to the GitHub repository:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```

6. Push your code to GitHub:
   ```bash
   git push -u origin main
   ```
   Note: If you're using an older version of Git, the default branch might be "master" instead of "main".

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Start chatting with the AI agent
3. The agent will respond using Google's Gemini model

## Features

- **Modern, responsive UI** with dark mode support that adapts to any device size
- **Real-time chat interface** with smooth animations and user-friendly design
- **Powered by Google's Gemini AI model** for high-quality, context-aware responses
- **Streaming responses** for more natural conversation experience
- **Conversation history** maintained throughout your session
- **Error handling and loading states** for robust user experience

## Project Structure

- `frontend/src/` - React application code
  - `components/` - Reusable UI components
  - `services/` - API communication layer
  - `hooks/` - Custom React hooks
  - `types/` - TypeScript type definitions
- `backend/app/` - FastAPI server code
  - `routers/` - API endpoint definitions
  - `agents/` - LangChain agent implementations
  - `models/` - Data models and schemas

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and organization
- Add tests for new functionality
- Update documentation for any changes
- Make sure all tests pass before submitting a PR

## Issues

Found a bug or have a feature request? Please open an issue:

1. Go to the [Issues](https://github.com/hllj/react-vite-tailwind-boilerplate/issues) tab
2. Click "New Issue"
3. Select the appropriate template
4. Provide as much detail as possible

## Roadmap

- [x] Implement streaming responses
- [x] Support for file uploads and multimodal inputs
- [ ] Add authentication and user accounts
- [ ] Multiple AI model selection
- [ ] Conversation history persistence
- [ ] Mobile app version

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.