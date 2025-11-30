/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/**/*.svelte',
    './src/app.html'
  ],
  theme: {
    extend: {
      colors: {
        // Add these if you want to use DaisyUI-like classes
        'info': '#3ABFF8',
        'info-content': '#003A4F',
        'success': '#36D399', 
        'success-content': '#003320',
        'warning': '#FBBD23',
        'warning-content': '#382800',
        'error': '#F87272',
        'error-content': '#470000'
      }
    },
  },
  plugins: [],
}