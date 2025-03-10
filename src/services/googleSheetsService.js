import path from 'path';
import { google } from 'googleapis';
import config from '../config/env.js';

const sheets = google.sheets('v4');

 const addRowToSheet = async (auth, spreadsheetId, values) => {
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
}

const appendToSheet = async (data) => {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(process.cwd(), 'src/credentials', 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        const spreadsheetId = config.SPREADSHEET_ID;

        await addRowToSheet(authClient, spreadsheetId, data);

        return 'Datos correctamente agregados';
    } catch (error) {
        console.log('error', error);
    }
}

export const checkAvailability = async (date) => {
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
        const dateValues = values.flat().map(formatDate);

        return !dateValues.includes(formattedDate);
    } catch (error) {
        console.error('Error checking availability:', error);
        return false;
    }
};


const formatDate = (date) => {
    if (typeof date !== 'string') return '';
    return date.replace(/-/g, '/').replace(/\s+/g, '').trim();
};


export default appendToSheet;
