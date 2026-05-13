# Aether

Aether is a futuristic personal performance dashboard built as a multi-page web app. It combines habit tracking, biometric inputs, nutrition logging, gym performance, and a single "Peak Potential" score into one dark, neon command-center interface.

The project is designed for people who want to track daily self-improvement signals in one place: consistency, food intake, hydration, body profile, strength progress, and overall momentum.

## Live Concept

Aether treats personal growth like a system dashboard. Each section is presented as a sector:

- **Sector 01: Peak Potential Dashboard** - the main overview of total progress.
- **Sector 02: Neural Matrix** - habit consistency and streak tracking.
- **Sector 03: Bio-Tracker** - body profile, calories, macros, hydration, and TDEE.
- **Sector 04: Gravity Gym Log** - workout logging and strength estimation.

## Main Features

### Peak Potential Dashboard

The home page shows the user's current performance score and pulls together data from all other sectors.

It includes:

- A circular Chart.js gauge for the total potential score.
- Global rank and sync-level display cards.
- Habit streak summary.
- Daily sector completion status.
- Calories logged.
- Gym power tier and strength output.
- Live optimization feed.
- Sector alerts for hydration, habits, nutrition, and performance.

### Habit System

The habits page is built around a 30-day matrix and two habit categories.

It includes:

- A temporal matrix for daily habit completion.
- Custom habit sectors.
- Good habit tracking under **Ascension Protocols**.
- Bad habit tracking under **Decay Mitigation**.
- Streak controls for each habit.
- Add and remove actions for habits and sectors.
- Color-coded sector states.

### Bio-Tracker

The bio page tracks body and nutrition information.

It includes:

- Body type selection: ectomorph, mesomorph, and endomorph.
- Weight, height, age, hydration, and gender baseline inputs.
- TDEE calculation using body profile data.
- Food intake logging.
- Protein, carbs, and fat tracking.
- Macro pie chart powered by Chart.js.
- Current intake and calorie balance cards.
- Bio-terminal status messages.

### Gym Log

The gym page tracks workouts and strength output.

It includes:

- Month and year navigation.
- Daily workout log.
- Exercise arsenal with categories for push, pull, legs, and cardio.
- Manual exercise logging.
- Weight and rep input.
- Estimated one-rep max calculation.
- Daily sector power.
- Strength tier system: Novice, Intermediate, Advanced, and Elite.
- Gym terminal feed.

## Scoring Logic

Aether calculates a total potential score from three major areas:

- **Habits: 40%**
- **Nutrition: 30%**
- **Power / gym performance: 30%**

The score uses:

- Habit matrix completion.
- Today's completed sectors.
- Good-habit streaks.
- Bad-habit penalties.
- Calorie balance against TDEE.
- Macro distribution.
- Gym power output.

All scoring logic lives in `app.js`.

## Data Storage

Aether stores user data in the browser using `localStorage`.

The main storage key is:

```text
aether_state
```

This means:

- No backend is required.
- Data stays in the user's browser.
- Refreshing the page keeps saved habits, bio data, food logs, and gym logs.
- Clearing browser storage resets the app.

## Tech Stack

- **HTML5** for page structure.
- **CSS3** for custom styling, animations, glassmorphism, and responsive layout.
- **JavaScript** for state management, calculations, rendering, and interactivity.
- **Tailwind CSS CDN** for utility classes.
- **Chart.js CDN** for dashboard and macro charts.
- **Lucide Icons CDN** for UI icons.
- **Google Fonts** using Outfit, Poppins, and JetBrains Mono.

## Project Structure

```text
Aether/
├── index.html     # Peak Potential dashboard
├── habits.html    # Habit matrix and habit streak tracking
├── bio.html       # Biometrics, TDEE, food intake, and macros
├── gym.html       # Workout logging and strength tracking
├── app.js         # App state, calculations, rendering, and modals
├── style.css      # Visual design, layout, animations, and components
└── README.md      # Project documentation
```

## How To Run

Because Aether is a static website, it can run directly in the browser.

Open this file:

```text
index.html
```

For the best experience, use a local server or a code editor live preview extension.

## Pages

### `index.html`

Main dashboard page. Shows the potential score, live feed, alerts, habit summary, nutrition summary, and power tier.

### `habits.html`

Habit tracking page. Lets the user manage daily sectors, complete matrix cells, add good habits, add bad habits, and update streaks.

### `bio.html`

Nutrition and body profile page. Lets the user save body information, estimate TDEE, log food intake, and view macro balance.

### `gym.html`

Workout page. Lets the user select dates, browse exercise categories, log workouts, and calculate estimated power output.

### `app.js`

The main JavaScript file. It contains:

- App state defaults.
- Browser storage sync.
- Potential score calculations.
- TDEE and nutrition calculations.
- One-rep max and power tier calculations.
- Page detection.
- Render functions for each page.
- Modal logic.
- Habit, food, and gym actions.

### `style.css`

The main stylesheet. It contains:

- Dark neon visual theme.
- Glassmorphism panels.
- Reactive hover cards.
- Dashboard layout.
- Habit matrix styling.
- Bio-tracker components.
- Gym log components.
- Responsive rules.
- Animations and glowing effects.

## Design Style

Aether uses a high-contrast sci-fi interface:

- Obsidian black background.
- Cyan, violet, crimson, emerald, and gold accents.
- Glass panels with blur and transparent borders.
- Neon glow states.
- Uppercase labels and compact tracking text.
- Large, bold dashboard typography.
- Terminal-style feedback messages.

## Current Limitations

- Data is local to one browser.
- There is no account system or cloud sync.
- There is no backend database.
- Nutrition entries are manually entered.
- Workout entries are manually entered.
- The app depends on CDN links for Tailwind, Chart.js, Lucide, and Google Fonts.

## Future Improvements

- Add export/import for user data.
- Add weekly and monthly analytics.
- Add real progress charts for habits, calories, and gym performance.
- Add custom exercise creation.
- Add editable food and workout entries.
- Add mobile navigation.
- Add cloud sync and authentication.
- Add offline support with a service worker.
- Add goals for weight, calories, macros, and strength.

## Repository

GitHub repository:

```text
https://github.com/preetshah1412/Aether.git
```
