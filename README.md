# Just Breathe 🧘🌙

Aplicación móvil de bienestar y relajación desarrollada en **React Native (Expo)** con **TypeScript**.

## 📱 Módulos

### 🌙 Trackeo de Sueño (Sleep Tracker)
- **Tracker en Tiempo Real**: Registro de inicio de descanso al acostarse y temporizador en vivo.
- **Calificación al Despertar**: Modal con calificación de 1 a 5 estrellas, selección de factores (cafeína, pantallas, ejercicio, estrés, etc.) y notas.
- **Carga Manual**: Formulario para registrar noches anteriores con cálculo inteligente de duración horaria.
- **Resumen Semanal**: Métricas clave con promedio de horas dormidas y calidad promedio de los últimos 7 días.
- **Historial Completo**: Registro ordenado con opción de borrado.
- **Backup Local**: Exportación e importación segura en formato JSON utilizando `@react-native-async-storage/async-storage`, `expo-file-system`, `expo-sharing` y `expo-document-picker`.

---

## 🚀 Instalación y Ejecución

```bash
# Instalar dependencias
npx expo install @react-native-async-storage/async-storage expo-file-system expo-sharing expo-document-picker @expo/vector-icons

# Iniciar servidor de desarrollo
npx expo start
```

---

## 📄 Licencia

Este proyecto está bajo una licencia de software privativo. Todos los derechos están reservados a los autores originales. No está permitido el uso, distribución ni comercialización de este código sin autorización previa por escrito. Consulta el archivo [LICENSE](LICENSE) para más detalles.
