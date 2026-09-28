import axios from 'axios';

const BREVO_API = 'https://api.brevo.com';

export async function sendVerificationEmail(to: string, token: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const body = {
    sender: { name: 'Átria', email: 'no-reply@atria.example' },
    to: [{ email: to }],
    subject: 'Verifique seu e-mail',
    htmlContent: `<p>Use este código para verificar: <b>${token}</b></p>`
  };

  if (!apiKey) {
    // dev: log instead of sending
    console.log('[emailService] mock send', to, token);
    return;
  }

  await axios.post(`${BREVO_API}/v3/smtp/email`, body, {
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' }
  });
}

export async function sendRecoveryEmail(to: string, token: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const body = {
    sender: { name: 'Átria', email: 'no-reply@atria.example' },
    to: [{ email: to }],
    subject: 'Recuperação de acesso',
    htmlContent: `<p>Use este código para recuperar seu acesso: <b>${token}</b></p>`
  };
  if (!apiKey) {
    console.log('[emailService] mock recovery', to, token);
    return;
  }
  await axios.post(`${BREVO_API}/v3/smtp/email`, body, {
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' }
  });
}
