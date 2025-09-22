/**
 * Service d'envoi d'emails avec OAuth2 Google
 * Utilise les credentials Google Cloud et OAuth2
 */

import { google } from 'googleapis';
import nodemailer from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class OAuthEmailService {
  private static instance: OAuthEmailService;
  private oAuth2Client: any = null;
  private transporter: any = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): OAuthEmailService {
    if (!OAuthEmailService.instance) {
      OAuthEmailService.instance = new OAuthEmailService();
    }
    return OAuthEmailService.instance;
  }

  /**
   * Initialise le service email OAuth2
   */
  public async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      const email = process.env.GOOGLE_EMAIL;

      if (!clientId || !clientSecret || !refreshToken || !email) {
        return { 
          success: false, 
          message: 'Configuration OAuth2 incomplète. Vérifiez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_EMAIL' 
        };
      }

      // Initialiser OAuth2 client
      this.oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // Redirect URI pour desktop app
      );

      // Configurer les credentials
      this.oAuth2Client.setCredentials({ refresh_token: refreshToken });

      // Créer le transporter Nodemailer
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: email,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: refreshToken,
          accessToken: '', // Sera généré automatiquement
        },
      });

      // Test de connexion avec timeout
      try {
        await Promise.race([
          this.transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
      } catch (error) {
        console.warn('⚠️ Vérification transporter échouée, mais on continue:', error.message);
      }
      this.isInitialized = true;

      return { success: true, message: 'Service OAuth2 Google initialisé avec succès' };

    } catch (error) {
      return { success: false, message: `Erreur d'initialisation OAuth2: ${error.message}` };
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
      
      // Obtenir un nouvel access token
      const accessToken = await this.oAuth2Client.getAccessToken();
      
      // Mettre à jour le transporter avec le nouvel access token
      this.transporter.options.auth.accessToken = accessToken.token;

      const mailOptions = {
        from: `Luciform Research <${process.env.GOOGLE_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        message: `Email de vérification envoyé (ID: ${result.messageId})` 
      };

    } catch (error) {
      console.error('Erreur envoi email OAuth2:', error);
      return { success: false, message: `Erreur envoi email: ${error.message}` };
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  public async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      const template = this.getPasswordResetEmailTemplate(firstName, resetUrl);
      
      // Obtenir un nouvel access token
      const accessToken = await this.oAuth2Client.getAccessToken();
      
      // Mettre à jour le transporter avec le nouvel access token
      this.transporter.options.auth.accessToken = accessToken.token;

      const mailOptions = {
        from: `Luciform Research <${process.env.GOOGLE_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        message: `Email de réinitialisation envoyé (ID: ${result.messageId})` 
      };

    } catch (error) {
      console.error('Erreur envoi email OAuth2:', error);
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

  /**
   * Template email de réinitialisation de mot de passe
   */
  private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): EmailTemplate {
    return {
      subject: '🔑 Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">🔮 Luciform Research</h1>
            <p style="color: #6b7280; margin: 5px 0;">Assistant IA Intelligent</p>
          </div>
          
          <div style="background: #fef3c7; padding: 30px; border-radius: 10px; border-left: 4px solid #f59e0b;">
            <h2 style="color: #1f2937; margin-top: 0;">Réinitialisation de mot de passe 🔑</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Bonjour ${firstName},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe. 
              Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #f59e0b; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                🔄 Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              <a href="${resetUrl}" style="color: #f59e0b;">${resetUrl}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, 
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
        Bonjour ${firstName},
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        
        Cliquez sur ce lien pour créer un nouveau mot de passe :
        ${resetUrl}
        
        Ce lien expire dans 1 heure.
        
        Cordialement,
        L'équipe Luciform Research
      `
    };
  }

  /**
   * Teste l'envoi d'email
   */
  public async testEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const accessToken = await this.oAuth2Client.getAccessToken();
      this.transporter.options.auth.accessToken = accessToken.token;

      const mailOptions = {
        from: `Luciform Research <${process.env.GOOGLE_EMAIL}>`,
        to: toEmail,
        subject: '🧪 Test OAuth2 - Configuration réussie',
        html: '<h1>Test réussi !</h1><p>Le service email OAuth2 fonctionne correctement.</p>',
        text: 'Test réussi ! Le service email OAuth2 fonctionne correctement.'
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return { 
        success: true, 
        message: `Email de test envoyé avec succès (ID: ${result.messageId})` 
      };

    } catch (error) {
      return { success: false, message: `Erreur test email: ${error.message}` };
    }
  }
}

/**
 * Instance singleton du service email OAuth2
 */
export const oauthEmailService = OAuthEmailService.getInstance();