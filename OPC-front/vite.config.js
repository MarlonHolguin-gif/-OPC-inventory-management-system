import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Habilita la reactividad de @preact/signals-react en componentes función:
    // el transform detecta la lectura de `signal.value` en el render y envuelve
    // el componente con `useSignals()` para suscribirlo. @vitejs/plugin-react 6
    // usa oxc (ya no expone opción `babel`), así que el transform se corre con
    // este plugin aparte.
    babel({
      plugins: [['module:@preact/signals-react-transform']],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
