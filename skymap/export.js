// export.js - Lógica de Exportación e Imagen
import { state, $poster, renderPosterAndMap } from './app.js';

/**
 * Función principal para exportar
 * Nota: Para exportar el poster completo (Canvas + Texto HTML), 
 * lo ideal es usar una librería como 'html2canvas' o 'dom-to-image'.
 */
export async function downloadPoster() {
    console.log("Iniciando exportación en formato:", state.export.format);
    
    // Ejemplo rápido usando html2canvas (deberías incluir la librería en tu HTML)
    if (typeof html2canvas !== "undefined") {
        const canvas = await html2canvas($poster, {
            scale: 2, // Mejora la calidad (DPI)
            useCORS: true,
            backgroundColor: null
        });
        
        const link = document.createElement('a');
        link.download = `star-map-${Date.now()}.${state.export.format}`;
        link.href = canvas.toDataURL(`image/${state.export.format}`);
        link.click();
    } else {
        alert("Librería de exportación no detectada.");
    }
}

// Asignar el evento al botón de exportar si existe
const $btnExport = document.getElementById("btnExportar"); // Asegúrate de tener este ID en tu HTML
if ($btnExport) {
    $btnExport.addEventListener("click", downloadPoster);
}
