import whatsappService from "./whatsappService.js";
import { formatPhoneNumber } from "../utils/number.js";
import appendToSheet, { checkAvailability } from "./googleSheetsService.js";
import openAiService from "./openAiService.js";

class MessageHandler {
  constructor() {
    this.appointmentState = {};
    this.assistantState = {};
  }
  async handleIncomingMessage(message, senderInfo) {
    const fromNumber = formatPhoneNumber(message.from);
    const incomingMessage = message?.text?.body.toLowerCase().trim();
    console.log(
      "this.appointmentState[fromNumber] ",
      this.appointmentState[fromNumber]
    );
    if (message?.type === "text") {
      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(fromNumber, message.id, senderInfo);
        await this.sendWelcomeMenu(fromNumber);
      } else if (this.appointmentState[fromNumber]) {
        await this.handleAppointmentFlow(fromNumber, incomingMessage);
        await whatsappService.markAsRead(message.id);
      } else {
        const response = `Echo: ${message.text.body}`;
        await whatsappService.sendMessage(fromNumber, response, message.id);
      }
      await whatsappService.markAsRead(message.id);
    } else if (message?.type === "interactive") {
      const option = message?.interactive?.button_reply?.title
        .toLowerCase()
        .trim();
      let response = "";
      if (option == "si") {
        response = this.completeAppointment(fromNumber, message.id);
      } else if (option == "no") {
        response =
          "Tu reserva no fue confirmada, gracias por comunicarte con nosotros. Si deseas realizar otra reserva, vuelve a escribirnos.";
        await whatsappService.sendMessage(fromNumber, response, message.id);
      } else {
        await this.handleMenuOptions(fromNumber, option);
        await whatsappService.markAsRead(message.id);
      }
    }
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcomeMesagge = `Hola, ${name}! ¿En qué puedo ayudarte?`;
    await whatsappService.sendMessage(to, welcomeMesagge, messageId);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "Elije una opcion";
    const buttons = [
      {
        type: "reply",
        reply: { id: "option_1", title: "Reservar cancha" },
      },
      {
        type: "reply",
        reply: { id: "option_2", title: "Ubicacion" },
      },
      {
        type: "reply",
        reply: { id: "option_3", title: "Representante" },
      },
    ];

    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async sendConfirmMenu(to, title) {
    const titleMessages = title;
    const buttons = [
      {
        type: "reply",
        reply: { id: "option_1", title: "Si" },
      },
      {
        type: "reply",
        reply: { id: "option_2", title: "No" },
      }
    ];

    await whatsappService.sendInteractiveButtons(to, titleMessages, buttons);
  }

  async handleMenuOptions(to, option) {
    let response;
    switch (option) {
      case "reservar cancha":
        this.appointmentState[to] = { step: "start" };
        response = "Por favor ingrese a nombre de quien va a estar la reserva:";
        break;
      case "ubicacion":
        response = "Nos encontramos en 📍 Humahuaca 4556, C1192 Cdad. Autónoma de Buenos Aires";
        break;
      case "representante":
        response = "Numero de contacto para mas informacion: 1160940484";
        break;
      default:
        response = "Opcion no valida, por favor elija una opcion valida";
        break;
    }
    await whatsappService.sendMessage(to, response);
  }

  async handleAppointmentFlow(to, message) {
    const state = this.appointmentState[to];
    let response;
    switch (state.step) {
      case "start":
        state.name = message;
        state.step = "date";
        response =
          "Por favor ingrese la dia y horario de la reserva (dd/mm/aaaa - hh:mm)";
        break;
      case "date": {
        const available = await this.handleAssistantFlow(to, message);
        if (!available) {
          state.step = "reconfirmDate";
          await whatsappService.sendMessage(
            to,
            "Ingrese otro dia y horario de la reserva (dd/mm/aaaa - hh:mm)"
          );
        }
        return;
      }
      case "reconfirmDate": {
        const available = await this.handleAssistantFlow(to, message);
        if (!available) {
          state.step = "reconfirmDate";
          await whatsappService.sendMessage(
            to,
            "Ingrese otro dia y horario de la reserva (dd/mm/aaaa - hh:mm)"
          );
        }
        return;
      }
      default:
        response = "Opcion no valida, por favor elija una opcion valida";
        break;
    }
    if (response) await whatsappService.sendMessage(to, response);
  }

  async handleAssistantFlow(to, message) {
    const state = this.appointmentState[to];
    const response = await openAiService(message);
    delete this.assistantState[to];

    const isAvailability = await checkAvailability(
      response.date,
      response.time
    );

    if (!isAvailability) {
      await whatsappService.sendMessage(
        to,
        "No hay disponibilidad",
        message.id
      );
      return false;
    }

    await whatsappService.sendMessage(to, "Hay disponibilidad", message.id);
    state.date = response.date;
    state.time = response.time;

    await this.sendConfirmMenu(to, "Desea confirmar la reserva?");
    state.step = "confirm";

    return true;
  }

  async sendContact(to) {
    try {
      // Lógica para enviar contacto
      const response = await axios.post("URL_DEL_SERVICIO", {
        to: "NÚMERO_DESTINATARIO",
        type: "contacts",
        contacts: [
          {
            name: { first_name: "Veterinaria" },
            phones: [{ number: "123456789" }],
            emails: [{ address: "contacto@veterinaria.com" }],
          },
        ],
      });
      console.log(response.data);
    } catch (error) {
      console.error("Error al enviar contacto:", error);
    }
  }

  async completeAppointment(to, messageId) {
    const appointmentData = this.appointmentState[to];

    if (!appointmentData) {
      console.error(
        `Error: No se encontró información de la reserva para ${to}`
      );
      return "Error al completar la reserva. Por favor, intenta nuevamente.";
    }

    delete this.appointmentState[to];

    const userData = [
      to,
      appointmentData.name || "Desconocido",
      appointmentData.date || "Fecha no especificada",
      appointmentData.time || "Hora no especificada",
      appointmentData.confirm || false,
      new Date().toISOString(),
    ];

    const response = `Gracias por reservar, ${appointmentData.name}. Tu reserva está agendada para el ${userData[2]} a las ${userData[3]}.`;

    await whatsappService.sendMessage(to, response, messageId);

    //appendToSheet(userData);
  }

  isGreeting(message) {
    const greeting = [
      "hola",
      "buenas",
      "hola, como va?",
      "hola, como estas?",
      "hola, que tal?",
    ];
    return greeting.includes(message);
  }

  getSenderName(senderInfo) {
    return senderInfo?.profile?.name || senderInfo.wa_id || "";
  }
}

export default new MessageHandler();
