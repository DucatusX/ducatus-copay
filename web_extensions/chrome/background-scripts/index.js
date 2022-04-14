import EventController from './controllers/eventController.js';
import MessageController from './controllers/messageController.js';

function initialize() {
    const event =  new EventController();
    const message = new MessageController();
    
    event.start();
    message.start();
}

initialize();