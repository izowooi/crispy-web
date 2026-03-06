# 🎬 awesome-cut - AI Cinematic Sequence Generator

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-awesome--cut.pages.dev-6366f1?style=for-the-badge)](https://awesome-cut.pages.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare)](https://pages.cloudflare.com/)

**Generate 3×3 cinematic sequences from character sheets and storylines!** ✨

[🎯 Features](#-features) | [🎮 How to Use](#-how-to-use) | [💻 Run Locally](#-running-locally) | [🚀 Deploy](#-deployment)

> 🇰🇷 [한국어 README](./README.md)

</div>

---

## 🎯 About

**awesome-cut** is a web application that uses the **Nano Banana 2** AI model (Gemini 3.1 Flash Image) to automatically generate **3×3 cinematic sequence images** from character sheets and storylines.

Built for webtoon artists, film planners, game developers, and all creators who need storyboards! 🎥✨

### ✨ Features

- 🖼️ **Character Sheet Upload** - Up to 4 images via drag & drop
- 📝 **Storyline Prompt** - Describe your desired scene in up to 500 characters
- 🎨 **6 Cinematic Styles** - Realistic, Animation, Webtoon, Watercolor, 3D CGI + Custom
- 🚀 **4 Simultaneous Generations** - 1K resolution images, 4 at a time
- 📈 **2K Upscale** - Upgrade your favorite image to high resolution
- 📦 **ZIP Batch Download** - Save all generated images at once
- 🔐 **Password Protection** - Secure access control
- 🎦 **Lightbox Viewer** - Navigate conveniently with keyboard arrows

---

## 📸 Screenshots

<div align="center">

| Main Screen | Generation Results |
|:---:|:---:|
| ![Main Screen](./docs/screenshot_main.png) | ![Results](./docs/screenshot_result.png) |

<!-- Add screenshots to the docs/ folder if missing -->

</div>

---

## 🎮 How to Use

```mermaid
graph TD
    A[🏁 Visit Site] --> B[🔑 Enter Password]
    B --> C[🖼️ Upload Character Sheets<br/>1-4 images via drag & drop]
    C --> D[📝 Enter Storyline<br/>Up to 500 characters]
    D --> E[🎨 Select Cinematic Style]
    E --> F[✨ Click Generate]
    F --> G[⏳ AI Generating...<br/>Up to 2 minutes]
    G --> H[🎬 View Results<br/>2×2 Grid]
    H --> I{Next Step}
    I -->|Upscale| J[📈 Select Image<br/>2K Upgrade]
    I -->|Download| K[📦 ZIP Download<br/>Save All 4 Images]
    I -->|Regenerate| F
    J --> L[💾 Download 2K Image]

    style A fill:#6366f1,color:#fff
    style F fill:#10B981,color:#fff
    style H fill:#F59E0B,color:#fff
    style J fill:#8B5CF6,color:#fff
```

### 📝 Step-by-Step Guide

#### 1️⃣ Upload Character Sheets
| Item | Description |
|:---:|:---|
| 📁 Supported Formats | JPG, PNG, WebP |
| 📊 Max Images | 4 (at least 1 required) |
| 🖱️ Upload Method | Drag & drop or click |

#### 2️⃣ Enter Storyline
- Freely describe the scenes you want
- Example: *"A game designer protagonist and a police officer heroine get summoned to another world, sparking an exciting romance"*

#### 3️⃣ Select Style

| Style | Description |
|:---:|:---|
| 🎬 Realistic Cinematic | Movie-like realistic feel (default) |
| 🎨 Animated Cinematic | Animation movie style |
| 📖 Webtoon Style | Korean webtoon art style |
| 🌈 Watercolor Illustration | Artistic watercolor feel |
| 🎭 3D CGI Rendering | 3D graphics rendering style |
| ✨ Custom | Enter your own style description |

#### 4️⃣ View Results & Use
- 4 images at 1K resolution displayed in a 2×2 grid
- Click an image to view it in the **Lightbox**
- **Upscale** your favorite image to **2K**
- **ZIP download** to save all 4 images at once

---

## 🏗️ Tech Stack

<div align="center">

| Category | Technology | Purpose |
|:---:|:---:|:---|
| **Framework** | Next.js (App Router) | Full-stack web application |
| **Library** | React 19 | UI components |
| **Language** | TypeScript 5 | Type safety |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **AI Model** | Nano Banana 2 | Image generation via Gemini 3.1 Flash Image |
| **AI SDK** | @google/genai | Google AI model API client |
| **Compression** | JSZip | ZIP batch download |
| **Deployment** | Cloudflare Pages | Edge Runtime global deployment |

</div>

### 🎨 Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client"]
        A[React App] --> B[CharacterSlot<br/>Character Upload]
        A --> C[StorylineInput<br/>Story Input]
        A --> D[StyleSelector<br/>Style Selection]
        A --> E[ResultCard<br/>Results Display]
        A --> F[Lightbox<br/>Detail View]
    end

    subgraph Edge["⚡ Edge Runtime"]
        G["/api/auth<br/>Password Auth"]
        H["/api/generate<br/>Image Generation"]
        I["/api/upscale<br/>2K Upscale"]
    end

    subgraph AI["🤖 AI Service"]
        J[Google Gemini<br/>3.1 Flash Image]
        K[Nano Banana 2<br/>Image Gen Model]
    end

    A -->|Auth| G
    A -->|FormData| H
    A -->|Image| I
    H -->|Prompt + Images| J
    I -->|Upscale Request| J
    J --> K

    style Client fill:#e1f5fe
    style Edge fill:#fff3e0
    style AI fill:#f3e5f5
```

---

## 📁 Project Structure

```
awesome-cut/
├── 📂 src/
│   ├── 📂 app/                      # Next.js App Router
│   │   ├── 📄 layout.tsx            # 🏠 Root layout
│   │   ├── 📄 page.tsx              # 🎬 Main page (single-page app)
│   │   ├── 📄 globals.css           # 🎨 Global styles
│   │   └── 📂 api/                  # ⚡ API Routes (Edge)
│   │       ├── 📂 auth/             # 🔐 Password authentication
│   │       │   └── 📄 route.ts
│   │       ├── 📂 generate/         # 🚀 Image generation (4 parallel)
│   │       │   └── 📄 route.ts
│   │       └── 📂 upscale/          # 📈 2K upscale
│   │           └── 📄 route.ts
├── 📂 docs/
│   └── 📄 prd.md                    # 📋 Product requirements document
├── 📄 .env.local.example            # 🔧 Environment variable template
├── 📄 package.json
├── 📄 next.config.ts
├── 📄 tsconfig.json
└── 📄 postcss.config.mjs
```

---

## 🔄 Image Generation Workflow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 🖥️ Client
    participant A as ⚡ /api/generate
    participant G as 🤖 Gemini AI

    U->>C: 1. Input characters + story + style
    C->>C: 2. Build FormData
    C->>A: 3. POST /api/generate
    A->>A: 4. Validate inputs
    A->>A: 5. Compose final prompt

    par Generate 4 images simultaneously
        A->>G: Image 1 request
        A->>G: Image 2 request
        A->>G: Image 3 request
        A->>G: Image 4 request
    end

    G-->>A: 6. Return 4 Base64 images
    A-->>C: 7. JSON response { images: [...] }
    C-->>U: 8. Display results in 2×2 grid

    Note over U,C: Upscale (optional)
    U->>C: 9. Select 1 image
    C->>A: 10. POST /api/upscale
    A->>G: 11. 2K upscale request
    G-->>A: 12. High-resolution image
    A-->>C: 13. Upscale result
    C-->>U: 14. 2K download available
```

---

## 💻 Running Locally

### 📋 Prerequisites

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **Google AI Studio Account** - For API key
   - Get a free key at [Google AI Studio](https://aistudio.google.com/)

### 🔧 Environment Variables

Create a `.env.local` file:

```bash
# 🤖 Gemini AI (required)
GEMINI_API_KEY=your-api-key-here

# 🔐 App access password (required)
APP_PASSWORD=your-password-here
```

### 🚀 Getting Started

```bash
# 1️⃣ Clone the project
git clone https://github.com/izowooi/crispy-web.git
cd crispy-web/awesome-cut

# 2️⃣ Install dependencies
npm install

# 3️⃣ Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API key and password

# 4️⃣ Start dev server
npm run dev
```

Open http://localhost:3000 in your browser! 🎉

### ⚙️ Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | 🔧 Start development server (port 3000) |
| `npm run build` | 📦 Create production build |
| `npm run start` | ▶️ Run built app |
| `npm run lint` | 🔍 ESLint code check |

---

## 🚀 Deployment

### ☁️ Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. "Workers & Pages" → "Create Application" → "Pages"
3. Connect GitHub repository
4. Settings:
   - **Root directory**: `awesome-cut`
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
5. Set environment variables:
   - `GEMINI_API_KEY`: Google AI Studio API key
   - `APP_PASSWORD`: App access password
6. Click "Save and Deploy"!

---

## 💾 Prompt Composition

Internally, the final prompt is composed as follows:

```
Create a 3by3 {style} sequence image about "{storyline}".
Refer to the attached character sheets for character information.
Output the image in landscape mode.
```

### ⚠️ Constraints

| Item | Limit |
|:---:|:---:|
| 🖼️ Output Orientation | Landscape mode only |
| 📐 Default Resolution | 1K fixed |
| 📈 Upscale | 2K, limited to 1 image per session |
| 👥 Max Characters | 4 |
| 🎬 Sequence Layout | 3×3 fixed |
| 📝 Storyline | Max 500 characters |

---

## 🤝 Contributing

Bug reports and feature suggestions are always welcome!

1. Fork this repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
Feel free to use it freely.

---

## 👨‍💻 Creator

**izowooi**

Have questions or suggestions? Please open an Issue!

---

<div align="center">

**⭐ If you like this project, please give it a Star! ⭐**

Made with ❤️ using Next.js, Tailwind CSS & Gemini AI

[🎬 Try it now](https://awesome-cut.pages.dev/)

</div>
