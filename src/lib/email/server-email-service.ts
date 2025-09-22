/**
 * Service d'envoi d'emails côté serveur uniquement
 * Évite les problèmes de modules Node.js côté client
 */

import sgMail from '@sendgrid/mail';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class ServerEmailService {
  private static instance: ServerEmailService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ServerEmailService {
    if (!ServerEmailService.instance) {
      ServerEmailService.instance = new ServerEmailService();
    }
    return ServerEmailService.instance;
  }

  /**
   * Initialise le service email
   */
  public async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        return { success: false, message: 'SENDGRID_API_KEY non configurée' };
      }
      
      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      
      return { success: true, message: 'Service SendGrid initialisé' };
    } catch (error) {
      return { success: false, message: `Erreur d'initialisation email: ${error.message}` };
    }
  }

  /**
   * Envoie un email de confirmation d'inscription
   */
  public async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
      const template = this.getVerificationEmailTemplate(firstName, verificationUrl);
      
      const emailData = {
        to: email,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@luciformresearch.com',
          name: process.env.FROM_NAME || 'Luciform Research'
        },
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await sgMail.send(emailData);
      return { success: true, message: 'Email de vérification envoyé' };

    } catch (error) {
      console.error('Erreur envoi email:', error);
      return { success: false, message: `Erreur envoi email: ${error.message}` };
    }
  }

  /**
   * Template email de vérification
   */
  private getVerificationEmailTemplate(firstName: string, verificationUrl: string): EmailTemplate {
    return {
      subject: '🔐 Confirmez votre compte Luciform Research',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">🔮 Luciform Research</h1>
            <p style="color: #6b7280; margin: 5px 0;">Assistant IA Intelligent</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; border-left: 4px solid #7c3aed;">
            <h2 style="color: #1f2937; margin-top: 0;">Bonjour ${firstName} ! 👋</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Bienvenue chez <strong>Luciform Research</strong> ! Votre compte a été créé avec succès.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Pour activer votre compte et accéder à votre assistant IA personnel, 
              veuillez cliquer sur le bouton ci-dessous :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #7c3aed; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                ✅ Confirmer mon compte
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              <a href="${verificationUrl}" style="color: #7c3aed;">${verificationUrl}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, 
              ignorez cet email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; 
                      border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              © 2025 Luciform Research. Tous droits réservés.
            </p>
          </div>
        </div>
      `,
      text: `
        Bonjour ${firstName} !
        
        Bienvenue chez Luciform Research ! Votre compte a été créé avec succès.
        
        Pour activer votre compte, cliquez sur ce lien :
        ${verificationUrl}
        
        Ce lien expire dans 24 heures.
        
        Cordialement,
        L'équipe Luciform Research
      `
    };
  }
}

/**
 * Instance singleton du service email serveur
 */
export const serverEmailService = ServerEmailService.getInstance();