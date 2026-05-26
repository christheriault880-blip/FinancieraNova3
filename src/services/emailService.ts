import emailjs from '@emailjs/browser';

export interface EmailParams {
  to_email: string;
  user_name: string;
  payment_title: string;
  payment_category: string;
  payment_amount: number;
  payment_due_date: string;
}

/**
 * Sends an email notification using EmailJS
 */
export async function sendPaymentReminderEmail(params: EmailParams): Promise<{ success: boolean; message: string }> {
  // Try retrieving credentials from Environment variables first, then fallback to LocalStorage
  const metaEnv = (import.meta as any).env || {};
  const serviceId = metaEnv.VITE_EMAILJS_SERVICE_ID || localStorage.getItem('nova_emailjs_service_id') || '';
  const templateId = metaEnv.VITE_EMAILJS_TEMPLATE_ID || localStorage.getItem('nova_emailjs_template_id') || '';
  const publicKey = metaEnv.VITE_EMAILJS_PUBLIC_KEY || localStorage.getItem('nova_emailjs_public_key') || '';

  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS keys are not configured. Falling back to console simulation.');
    return {
      success: false,
      message: 'Las claves de EmailJS no están configuradas en .env o en el panel superior. Se simuló el envío correctamente.'
    };
  }

  try {
    const templateParams = {
      to_email: params.to_email,
      to_name: params.user_name || 'Estimado Usuario',
      payment_title: params.payment_title,
      payment_category: params.payment_category.toUpperCase(),
      payment_amount: params.payment_amount.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' }),
      payment_due_date: new Date(params.payment_due_date + 'T00:00:00').toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      message: `Tu pago de ${params.payment_title} por un monto de RD$ ${params.payment_amount.toLocaleString()} vence el ${params.payment_due_date}. ¡Por favor regístralo a tiempo en Financiera Nova!`
    };

    const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
    
    if (response.status === 200) {
      return { success: true, message: 'La notificación de pago ha sido enviada con éxito a su correo electrónico.' };
    } else {
      return { success: false, message: `Error del servidor de correos: Código ${response.status}` };
    }
  } catch (error: any) {
    console.error('EmailJS error delivering reminder:', error);
    return {
      success: false,
      message: error?.text || error?.message || 'Error al intentar conectar con el servicio EmailJS.'
    };
  }
}

/**
 * Triggers a native system browser push notification if permitted
 */
export async function triggerBrowserNotification(title: string, body: string): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones de escritorio.');
    return false;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
    return true;
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
      return true;
    }
  }
  return false;
}
