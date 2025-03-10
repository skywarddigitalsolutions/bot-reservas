import whatsappService from './whatsappService.js';
import { formatPhoneNumber } from '../utils/number.js';
import appendToSheet, { checkAvailability } from './googleSheetsService.js';
import openAiService from './openAiService.js';

class MessageHandler {

  constructor(){
    this.appointmentState = {};
    this.assistantState = {};
  }
  async handleIncomingMessage(message, senderInfo) {
    const fromNumber = formatPhoneNumber(message.from);
    const incomingMessage = message?.text?.body.toLowerCase().trim();
    console.log("this.appointmentState[fromNumber] ", this.appointmentState[fromNumber]);
    if (message?.type === 'text') {
      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(fromNumber, message.id, senderInfo);
        await this.sendWelcomeMenu(fromNumber);
      } else if(this.appointmentState[fromNumber]){
        await this.handleAppointmentFlow(fromNumber, incomingMessage);
        await whatsappService.markAsRead(message.id);
      } else {
        const response = `Echo: ${message.text.body}`;
        await whatsappService.sendMessage(fromNumber, response, message.id);
      }
      await whatsappService.markAsRead(message.id);
    } else if (message?.type === 'interactive'){
      const option = message?.interactive?.button_reply?.title.toLowerCase().trim();
      await this.handleMenuOptions(fromNumber, option);
      await whatsappService.markAsRead(message.id);
    } 
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcomeMesagge = `Hola, ${name}! ¿En qué puedo ayudarte?`
    await whatsappService.sendMessage(to, welcomeMesagge, messageId);
  }

  async sendWelcomeMenu(to) {
    const menuMessage = "Elije una opcion";
    const buttons = [
      {
        type: "reply", reply: { id: 'option_1', title: 'Reservar cancha' }
      },
      {
        type: "reply", reply: { id: 'option_2', title: 'Ubicacion' }
      },
      {
        type: "reply", reply: { id: 'option_3', title: 'Representante' }
      }
    ]

    await whatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }

  async handleMenuOptions(to, option) {
    let response;
    switch (option) {
      case 'reservar cancha':
        this.appointmentState[to] = { step: 'start' }
        response = 'Por favor ingrese tu nombre:';
        break;
      case 'ubicacion':
        response = 'Brindar ubicacion'
        break;
      case 'representante':
        response = 'Hablar con un representante'
        break;
      default:
        response = 'Opcion no valida, por favor elija una opcion valida'
        break;
    }
    await whatsappService.sendMessage(to, response);
  }

  async handleAppointmentFlow(to, message){
    const state = this.appointmentState[to];
    let response;
    switch (state.step) {
      case 'start':
        state.name = message;
        state.step = 'date';
        response = 'Por favor ingrese la fecha de la reserva (dd/mm/aaaa)';
        break;
      case 'date':
        await this.handleAssistantFlow(to, message);
        state.step = 'confirm';
        response = 'Por favor ingrese la cantidad de horas de la reserva';
        break;
      case 'confirm':
        state.hour = message;
        state.confirm = true;
        response = this.completeAppointment(to);
        break;
      default:
        response = 'Opcion no valida, por favor elija una opcion valida';
        break;
    }

    await whatsappService.sendMessage(to,response);
  }

  async handleAssistantFlow(to, message){
    const state = this.appointmentState[to];
    console.log('state AI -->', state);
    let response; 

    if (state.step === 'date') response = await openAiService(message);

    console.log('response handleAssistantFlow --> ', response);
    
    delete this.assistantState[to];
    //TODO: MODIFICAR EL checkAvailability PARA QUE RECIBA LA FECHA Y LA HORA
    const isAvailability = checkAvailability(response);
    if(!isAvailability) await whatsappService.sendMessage(to, 'No hay disponibilidad')
    
    await whatsappService.sendMessage(to, 'Hay disponibilidad')
    //TODO: VERIFICAR EL HORARIO DISPONIBLE
    state.date = response;
    state.step = 'confirm';
    return;
  }

  completeAppointment(to){
    const appointmentData = this.appointmentState[to];
    delete this.appointmentState[to];

    const userData = [
      to,
      appointmentData.name,
      appointmentData.date, 
      appointmentData.hour,
      appointmentData.confirm,
      new Date().toISOString()
    ]

    appendToSheet(userData);
    //TODO: ACA se puede devolver un string con los datos de la reserva
    return 'Gracias por agendar tu reserva';
  }

  isGreeting(message) {
    const greeting = ["hola", "buenas", "hola, como va?", "hola, como estas?", "hola, que tal?"]
    return greeting.includes(message)
  }

  getSenderName(senderInfo) {
    return senderInfo?.profile?.name || senderInfo.wa_id || "";
  }
}

export default new MessageHandler();