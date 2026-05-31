# 🖋️ Joul — Daily Reflections Journal

<p align="center">
  <strong>A beautifully crafted, notebook-themed daily reflection journal designed for mindful writing.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tech--Stack-HTML5%20%7C%20CSS3%20%7C%20JS-blue?style=for-the-badge" alt="Tech Stack">
  <img src="https://img.shields.io/badge/Bundler-Vite--4-646CFF?style=for-the-badge&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local-success?style=for-the-badge" alt="Privacy First">
</p>

---

## ✨ Overview

**Joul** is a premium, distraction-free digital journal designed to mimic the cozy and immersive experience of a physical notebook. It helps you track your days, cultivate mindfulness, build habits, and capture structured reflections through an elegant, split-page binder layout. 

Unlike standard cloud-based note apps, **Joul prioritizes absolute privacy**. Your journals are stored entirely on your own computer, offline and secure.

---

## 🎨 Key Features

* **📖 Immersive Binder Layout**: A stunning dual-page notebook design resting on a dark desk mat.
* **✍️ Ink & Clean Typographies**: Instantly switch the entire interface between a cozy, handwriting-style font (**Ink**) and a sleek, modern sans-serif (**Clean**).
* **🌓 Seamless Dark Mode**: Toggle between a warm paper aesthetic and an eye-friendly, gorgeous dark theme.
* **⚡ Win-Fail-Next Framework**: Reflect deeply on your day using a structured three-column review system:
  * **Win**: Celebrate daily achievements and small milestones.
  * **Fail**: Log setbacks, lessons learned, and areas of growth.
  * **Next**: Define your immediate focus for tomorrow.
* **⏰ Wake/Sleep Logger**: Keep track of your circadian rhythms alongside your reflections.
* **📅 Interactive Journal Index**: Slide open the built-in *Journal Index* panel to browse past days, review historic logs, and search your entry archive.
* **✅ Custom Habit Tracker**: Track up to 5 custom daily habits. **Double-click** any habit name to rename it on the fly!
* **🔒 Secure Local Sync (Zero Servers)**: 
  * Automatically saves drafts as you type using local browser storage.
  * Allows you to set a local directory on your hard drive to sync entries directly as clean `.json` files.

---

## 🛠️ Tech Stack

* **Structure & Markup**: HTML5 (Semantic elements)
* **Styling & Aesthetics**: Vanilla CSS3 (Custom CSS variables, responsive desk-mat grid, micro-interactions, and glassmorphism)
* **Logic**: Vanilla ES6+ Javascript
* **Icons & Fonts**: FontAwesome 6 & Google Fonts (`Playfair Display`, `Outfit`, `Caveat`, `Architects Daughter`)
* **Dev Server**: Vite 4

---

## 🚀 Getting Started

### 1. Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Installation
Open your terminal in the project directory and install the necessary development dependencies:
```bash
npm install
```

### 3. Launching Joul

#### 💻 For Windows Users (One-Click Launch):
Simply double-click the **`run_journal.bat`** file in the root folder. It will:
1. Initialize the local development server in the background.
2. Automatically launch Joul in your default web browser at `http://localhost:5173/`.

#### 🐧 Other Operating Systems:
Start the development server manually:
```bash
npm run dev
```
Then, open your browser and navigate to the address shown in the terminal (usually `http://localhost:5173/`).

---

## 🛡️ Privacy & How Local Sync Works

Joul is completely offline-first. Your entries never touch a third-party server.

1. **Auto-Save**: As you write, Joul automatically updates your browser's local cache.
2. **Local Directory Sync**: Click the **Set Local Sync Folder** button at the top right. You can select a folder on your computer (like `JOUL DATA`). Joul will automatically read, write, and sync your entries straight to your local hard drive as `.json` files named by date (e.g., `2026-05-31.json`).

---

## 📄 License

This project is licensed under the ISC License. Feel free to customize and make it your own!

---
<p align="center">
  Made with ✒️ for mindful reflection.
</p>
