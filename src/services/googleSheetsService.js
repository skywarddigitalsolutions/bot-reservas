import path from 'path';
import { google } from 'googleapis';
import config from '../config/env.js';

const sheets = google.sheets('v4');

/* const addRowToSheet = async (auth, spreadsheetId, values) => {
const request = {
spreadsheetId,
range: 'reservas',
valueInputOption: 'RAW',
insertDataOption: 'INSERT_ROWS',
resource: {
    values: [values]
},
auth,
};
try {
const response = (await sheets.spreadsheets.values.append(request)).data;
return response;
} catch (error) {
console.error('Error adding row to sheet:', error);
}
} */

const appendToSheet = async (data) => {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), 'src/credentials', 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
  
      const authClient = await auth.getClient();
      const spreadsheetId = config.SPREADSHEET_ID;
  
      await updateReservationStatus(
        authClient,
        spreadsheetId,
        data[2], // fecha
        data[3], // hora
        data[0], // teléfono
        data[1], // nombre
        data[5]  // fecha creación
      );
    } catch (error) {
      console.log('error', error);
    }
};
  

const updateReservationStatus = async (auth, spreadsheetId, targetDate, targetTime, phone, name, creationDate) => {
    const sheetName = 'Hoja 1';
    const range = `${sheetName}!A2:B`; // Solo traemos fecha y hora (col A y B)
  
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        auth,
      });
  
      const rows = res.data.values;
      if (!rows || rows.length === 0) {
        console.log('No se encontraron datos.');
        return;
      }
  
      const rowIndex = rows.findIndex(
        row => row[0] === targetDate && row[1] === targetTime
      );
  
      if (rowIndex === -1) {
        console.log('Fecha y hora no encontradas.');
        return;
      }
  
      const realRowIndex = rowIndex + 2; // +2 porque empieza en A2
  
      // Armar la fila completa: Reservado, Whatsapp, Nombre, Fecha creación
      const updateRange = `${sheetName}!C${realRowIndex}:F${realRowIndex}`;
      const values = [['si', phone, name, creationDate]];
  
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
        auth,
      });
  
      console.log(`Reserva actualizada correctamente en fila ${realRowIndex}`);
    } catch (error) {
      console.error('Error actualizando reserva:', error);
    }
  };
  
  

export const checkAvailability = async (date,time) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(process.cwd(), 'src/credentials', 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const spreadsheetId = config.SPREADSHEET_ID;

        // Obtener los datos de la hoja
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'reservas',
        });

        const values = response.data.values;

        if (!values || values.length === 0) {
            return true;
        }

        // Normalizar y comparar las fechas
        const formattedDate = formatDate(date);
        const formattedTime = formatTime(time);
        const data = [formattedDate, formattedTime, 'si'];
        const validation = !values.some(row => JSON.stringify(row) === JSON.stringify(data));

        return validation;
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
};

// Función para formatear la hora correctamente
const formatTime = (time) => {
    return time.trim().padStart(5, '0');
};

const formatDate = (date) => {
    if (typeof date !== 'string') return '';
    return date.replace(/-/g, '/').replace(/\s+/g, '').trim();
};


export default appendToSheet;
