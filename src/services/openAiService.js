import OpenAI from "openai";
import config from "../config/env.js";

const client = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
});

const openAiService = async (message) => {
    const now = new Date().toISOString();
    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: 'system', content: `
                    Actúa como un asistente de reservas y extrae la fecha y hora de la reserva a partir del mensaje del cliente.
                    Formato de respuesta:

                    Devuelve la fecha en formato dd/mm/aaaa - HHhs (por ejemplo, "24/12/2025 - 19:00hs").
                    No incluyas ningún otro texto, solo la fecha en este formato.
                    Reglas de interpretación:

                    Hoy es ${now}, úsalo como referencia para interpretar fechas relativas como "mañana", "pasado mañana" o "este miércoles".
                    Si el cliente menciona solo la hora en un formato de 12 horas, convierte correctamente al formato de 24 horas (por ejemplo, "7" se interpreta como "19hs").
                    Si el cliente menciona un día de la semana sin fecha explícita, calcula la fecha exacta según el día actual.
                    Maneja correctamente términos ambiguos como "el próximo viernes" o "el sábado que viene".
                    Ejemplos:

                    Si hoy es 24/12/25 y el cliente dice "quiero una reserva para mañana a las 7", debes devolver:
                    24/12/2025 - 19:00
                    Si el cliente dice "quiero reservar para el miércoles 3 de marzo a las 10", debes devolver:
                    03/03/2025 - 10:00
                    Si el cliente dice "reserva para el próximo viernes a las 5 de la tarde", y hoy es lunes 10/03/2025, debes devolver:
                    14/03/2025 - 17:00
                    Si el cliente dice "3/3/25 / 17:00hs" debes devolver:
                    03/03/2025 - 17:00
                    Si el cliente dice "3/3/25 a las 17:00hs" debes devolver:
                    03/03/2025 - 17:00
                    Si el cliente dice "3/3/25 - 17:00hs" debes devolver:
                    03/03/2025 - 17:00
                    Devuelve únicamente la fecha en el formato especificado es decir: 03/03/2025 - 17:00hs, sin ningún otro texto.`
                },
                { role: 'user', content: message,}
            ],
            model: 'gpt-4o-mini',
        });
        // Extraer el contenido de la IA
        const responseText = response.choices[0].message.content;

        // Separar la fecha y la hora usando una expresión regular
        const match = responseText.match(/^(\d{2}\/\d{2}\/\d{4}) - (\d{2}:\d{2})hs$/);

        if (!match) throw new Error("Formato inesperado en la respuesta de la IA");
           
        const extractedDate = match[1];
        const extractedTime = match[2];
        return { date: extractedDate, time: extractedTime };
    } catch (error) {
        console.error(error);
    }
};

export default openAiService;