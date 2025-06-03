# MetaSync

<!-- filepath: c:\Users\Kian Winwood\Desktop\Websites\Custom Code\metasync\README.md -->

**Streamline Your GitHub Workflow**

MetaSync provides an intuitive interface for managing your GitHub repositories, editing content, and collaborating with your team. Powerful repository management made simple.

## ✨ Features

- 🔗 **GitHub Integration** - Seamless connection with your GitHub repositories
- 📝 **Content Management** - Edit and manage repository content directly
- 👥 **Team Collaboration** - Enhanced collaboration tools for development teams
- 🎨 **Modern UI** - Clean, responsive interface built with Next.js and Tailwind CSS
- 📱 **Mobile Responsive** - Full functionality across all devices
- 🚀 **Static Site Generator Support** - Works with all popular static site generators

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Authentication**: GitHub OAuth
- **Deployment**: Ready for Vercel/Netlify

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kiaann1/metasync.git
cd metasync
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your GitHub OAuth credentials to `.env.local`:
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

1. **Sign in with GitHub** - Connect your GitHub account to access repositories
2. **Browse Repositories** - View and manage your GitHub repositories
3. **Edit Content** - Make changes to files directly through the web interface
4. **Collaborate** - Work with team members on shared repositories
5. **Deploy** - Push changes back to GitHub for automatic deployment

## 🔧 Configuration

### SEO Customization

Create a `seo.json` file in the root directory to customize meta tags:

```json
{
  "meta_title": "Your Custom Title",
  "meta_description": "Your custom description",
  "meta_keywords": "your, custom, keywords",
  "h1": "Your Main Heading",
  "h2": "Your Subheading",
  "content-main": "Your main content description"
}
```

## 📁 Project Structure

```
metasync/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Homepage
│   ├── signin/            # Authentication pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
├── lib/                   # Utility functions
├── public/               # Static assets
├── styles/               # Global styles
└── README.md             # Project documentation
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://metasynccms.vercel.app)
- [GitHub Repository](https://github.com/kiaann1/metasync)
- [Issues](https://github.com/kiaann1/metasync/issues)


Built with ❤️ using Next.js and GitHub API
