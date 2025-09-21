
# Smart Expense Splitter 💰

A modern React application for splitting expenses among friends and family with real-time collaboration and smart expense tracking features.

## ✨ Features

- 🔐 **User Authentication** - Secure login and registration with Supabase
- 👥 **Group Management** - Create and manage expense groups
- 💸 **Expense Tracking** - Add, edit, and categorize expenses
- 🤖 **AI Chatbot** - Get smart suggestions for expense management
- 👨‍👩‍👧‍👦 **Parental Controls** - Monitor family expenses and set limits
- 🔔 **Real-time Notifications** - Stay updated on group activities
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📊 **Visual Analytics** - Charts and graphs for expense insights

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI Components
- **Backend:** Supabase (Authentication, Database, Real-time)
- **Routing:** React Router DOM
- **Charts:** Recharts
- **Forms:** React Hook Form
- **State Management:** React Context API
- **Notifications:** Sonner

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "Smart Expense Splitter Design"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in terminal)

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Lint code with TypeScript
- `npm run clean` - Clean build cache and dependencies
- `npm run start` - Start development server with network access
- `npm run build:prod` - Build for production with optimizations

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   ├── pages/           # Page components
│   └── Layout.tsx       # Main layout component
├── utils/               # Utility functions
│   └── supabase/        # Supabase configuration
├── styles/              # Global styles
├── App.tsx              # Main app component
├── main.tsx             # Application entry point
└── index.css            # Global CSS with Tailwind
```

## 🔧 Configuration

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Set up your database tables (users, groups, expenses, etc.)
4. Configure authentication providers if needed

### Tailwind CSS

The project uses Tailwind CSS with a custom configuration. The main configuration is in:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `src/index.css` - Global styles and CSS variables

## 🎨 UI Components

This project uses a combination of:
- **Radix UI** - Headless, accessible components
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Components** - Built on top of Radix UI primitives

Key UI components include:
- Buttons, Inputs, Cards
- Modals, Dropdowns, Tooltips  
- Data tables and charts
- Navigation and layout components

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Deploy to Netlify

1. Build the project: `npm run build`
2. Upload the `dist/` folder to Netlify
3. Configure environment variables

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - The dev server will automatically try different ports (3001, 3002, etc.)

2. **TypeScript errors**
   - Run `npm run type-check` to see detailed errors
   - Ensure all dependencies are properly installed

3. **Tailwind CSS not working**
   - Check that `tailwind.config.js` is properly configured
   - Verify `@tailwind` directives are in `src/index.css`

4. **Supabase connection issues**
   - Verify your environment variables are correct
   - Check Supabase project settings and API keys

### PostCSS Warning

You may see a PostCSS warning about the `from` option. This is a known issue with some Tailwind/PostCSS versions and doesn't affect functionality.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) - For excellent headless components
- [Tailwind CSS](https://tailwindcss.com/) - For the utility-first CSS framework
- [Supabase](https://supabase.com/) - For the backend infrastructure
- [Vite](https://vitejs.dev/) - For the fast development experience

## 📞 Support

If you have any questions or issues, please:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

---

**Original Design:** The Figma design is available at https://www.figma.com/design/vMMW7b7W3hshl1DIRS8Ekx/Smart-Expense-Splitter-Design

**Happy expense splitting! 🎉**  