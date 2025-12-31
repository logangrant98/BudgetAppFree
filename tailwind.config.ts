/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // Include all files in the app directory
    "./components/**/*.{js,ts,jsx,tsx}", // Include all files in components
    "./pages/**/*.{js,ts,jsx,tsx}", // If you have a pages folder
    "./styles/**/*.{css}" // Include any custom stylesheets
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
