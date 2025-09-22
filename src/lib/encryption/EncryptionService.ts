/**
 * Service de chiffrement/déchiffrement pour les données sensibles
 * Utilise crypto-js avec AES-256-CBC
 */

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static readonly ALGORITHM = 'AES';
  private static readonly KEY_SIZE = 256;
  private static readonly MODE = CryptoJS.mode.CBC;
  private static readonly PADDING = CryptoJS.pad.Pkcs7;

  /**
   * Chiffre une chaîne de caractères
   */
  static encrypt(text: string): string {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    const secretKey = this.getSecretKey();
    
    const encrypted = CryptoJS.AES.encrypt(text, secretKey, {
      mode: this.MODE,
      padding: this.PADDING
    });

    // CryptoJS gère automatiquement l'IV et le combine avec le ciphertext
    return encrypted.toString();
  }

  /**
   * Déchiffre une chaîne de caractères
   */
  static decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new Error('Encrypted text cannot be empty');
    }

    try {
      const secretKey = this.getSecretKey();
      
      const decrypted = CryptoJS.AES.decrypt(encryptedText, secretKey, {
        mode: this.MODE,
        padding: this.PADDING
      });

      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur déchiffrement:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Récupère la clé secrète depuis les variables d'environnement
   */
  private static getSecretKey(): string {
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('ENCRYPTION_SECRET_KEY environment variable is not set');
    }

    if (secretKey.length < 32) {
      throw new Error('ENCRYPTION_SECRET_KEY must be at least 32 characters long');
    }

    return secretKey;
  }

  /**
   * Génère une clé secrète pour les tests/développement
   */
  static generateSecretKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  }

  /**
   * Teste le chiffrement/déchiffrement
   */
  static testEncryption(): boolean {
    try {
      const testData = 'test-api-key-12345';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      const success = testData === decrypted;
      console.log(`🧪 Test chiffrement: ${success ? '✅' : '❌'}`);
      
      return success;
    } catch (error) {
      console.error('❌ Test chiffrement échoué:', error);
      return false;
    }
  }
}