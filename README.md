# 🍲 Food War — Multiplayer Ingredient Guessing Game

Food War is a fun, real-time, multiplayer web game where players race against each other to guess the ingredients of various dishes. Designed for friends, families, and food enthusiasts, the game combines knowledge, speed, and strategy into an exciting culinary challenge.

## 🎯 Features

- **Real-time Multiplayer:** Play live with friends or other players online.

- **Timed Rounds:** Each round challenges players to guess ingredients within a countdown timer.

- **Dynamic Scoring System:** Points are awarded based on speed and correctness. Early answers score higher.

- **Intelligent Spell Matching:** Accepts close or partial matches to account for minor spelling mistakes.

- **Progressive Rounds:** Move to the next round only after the current round ends.

- **Leaderboard:** See the top players after all rounds are complete.

- **Interactive UI/UX:** Animated pop-ups, scores, and alerts to make gameplay engaging and visually appealing.

## 🛠️ Tech Stack

- *Frontend:* React.js, CSS3, HTML5

- *Backend:* Node.js, Express.js

- *Database:* MongoDB

- *Real-time Communication:* Socket.io

- *Other Libraries:* string-similarity for fuzzy matching of ingredient names

## 🚀 How It Works

- **Join a Room** – Players enter a room with a unique ID and a name.

- **Start the Game** – The host initiates the first round.

- **Guess Ingredients** – Players type the ingredients they think belong to the dish.

- **Score Points** – Points are awarded based on speed and correctness. Partial matches are accepted.

- **Next Round** – After the round ends, the host moves to the next round.

- **Final Scoreboard** – After all rounds, the top scorers are displayed on a dynamic leaderboard.

## 🎨 UI/UX Highlights

- **Responsive Design:** Optimized for both desktop and mobile.

- **Right-side Pop-ups**: Immediate feedback on points and incorrect guesses.

- **Dish Images & Score Display:** Players can see the dish, their current score, and all participants’ scores in real time.

- **Fun Animations:** Points pop-ups and alerts make gameplay more lively and engaging.

## ⚡ Installation & Setup

*Clone the repository:*
- git clone https://github.com/yourusername/food-war.git
- cd food-war

*Install dependencies:*
- npm install

*Start the backend:*
- npm run dev

*Start the frontend:*
- npm start

## 💡 Why Food War?

Food War is not just a game—it’s a fun, interactive way to challenge your knowledge of ingredients, improve memory, and compete with friends in real-time. Perfect for food lovers, trivia enthusiasts, and casual gamers alike!

---

