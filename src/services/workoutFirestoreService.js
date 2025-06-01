import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

class WorkoutFirestoreService {
  constructor() {
    this.collectionName = 'generatedWorkoutPrograms';
  }

  /**
   * Sauvegarder les programmes générés pour un utilisateur
   */
  async saveGeneratedPrograms(userId, programs, userProfile) {
    try {
      console.log('💾 Sauvegarde des programmes dans Firestore...');
      
      // Supprimer les anciens programmes de cet utilisateur (garder seulement les plus récents)
      await this.cleanOldPrograms(userId);
      
      const programsData = {
        userId: userId,
        programs: programs,
        userProfile: userProfile,
        generatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 jours au lieu de 7
        totalPrograms: programs.length,
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, this.collectionName), programsData);
      console.log('✅ Programmes sauvegardés avec ID:', docRef.id);
      
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde programmes Firestore:', error);
      throw error;
    }
  }

  /**
   * Charger les programmes générés pour un utilisateur
   */
  async loadGeneratedPrograms(userId) {
    try {
      console.log('📚 Chargement des programmes depuis Firestore...');
      
      // Requête ultra-simple : seulement par userId
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('📭 Aucun programme trouvé');
        return null;
      }
      
      // Filtrer et trier côté client
      const now = new Date();
      const validDocs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt.toDate();
        
        // Vérifier si le programme n'est pas expiré
        if (expiresAt > now) {
          validDocs.push({
            id: doc.id,
            programs: data.programs,
            userProfile: data.userProfile,
            generatedAt: data.generatedAt.toDate(),
            expiresAt: expiresAt,
            totalPrograms: data.totalPrograms,
            ...data
          });
        }
      });
      
      if (validDocs.length === 0) {
        console.log('📭 Aucun programme valide trouvé (tous expirés)');
        return null;
      }
      
      // Trier par date de génération (plus récent en premier)
      validDocs.sort((a, b) => b.generatedAt - a.generatedAt);
      const latestDoc = validDocs[0];
      
      console.log(`✅ Programmes chargés: ${latestDoc.totalPrograms} programmes générés le ${latestDoc.generatedAt.toLocaleString()}`);
      
      return latestDoc;
      
    } catch (error) {
      console.error('❌ Erreur chargement programmes Firestore:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les anciens programmes d'un utilisateur
   */
  async cleanOldPrograms(userId, keepLast = 5) { // Garder les 5 derniers au lieu de 2
    try {
      console.log('🧹 Nettoyage des anciens programmes...');
      
      // Requête simplifiée sans orderBy
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Trier côté client par date de génération
      const docs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
        .sort((a, b) => b.generatedAt.toDate() - a.generatedAt.toDate());
      
      // Garder seulement les X derniers programmes
      if (docs.length > keepLast) {
        const docsToDelete = docs.slice(keepLast);
        
        for (const docToDelete of docsToDelete) {
          await deleteDoc(docToDelete.ref);
          console.log(`🗑️ Programme supprimé: ${docToDelete.id}`);
        }
        
        console.log(`✅ ${docsToDelete.length} anciens programmes supprimés`);
      }
      
    } catch (error) {
      console.error('❌ Erreur nettoyage programmes:', error);
      // Ne pas faire échouer l'opération principale si le nettoyage échoue
    }
  }

  /**
   * Nettoyer tous les programmes expirés (tâche de maintenance)
   */
  async cleanExpiredPrograms() {
    try {
      console.log('🧹 Nettoyage des programmes expirés...');
      
      // Requête simple sans condition sur expiresAt
      const q = query(collection(db, this.collectionName));
      
      const querySnapshot = await getDocs(q);
      const now = new Date();
      let deletedCount = 0;
      
      // Filtrer et supprimer côté client
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const expiresAt = data.expiresAt.toDate();
        
        if (expiresAt < now) {
          await deleteDoc(docSnapshot.ref);
          deletedCount++;
        }
      }
      
      console.log(`✅ ${deletedCount} programmes expirés supprimés`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Erreur nettoyage programmes expirés:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des programmes pour un utilisateur
   */
  async getUserProgramStats(userId) {
    try {
      // Requête simplifiée sans orderBy
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => doc.data());
      
      if (docs.length === 0) {
        return {
          totalGenerations: 0,
          lastGeneration: null,
          totalPrograms: 0
        };
      }
      
      // Calculs côté client
      const sortedDocs = docs.sort((a, b) => b.generatedAt.toDate() - a.generatedAt.toDate());
      const latestDoc = sortedDocs[0];
      const totalPrograms = docs.reduce((sum, doc) => sum + (doc.totalPrograms || 0), 0);
      
      return {
        totalGenerations: docs.length,
        lastGeneration: latestDoc.generatedAt.toDate(),
        totalPrograms: totalPrograms,
        expiresAt: latestDoc.expiresAt.toDate()
      };
      
    } catch (error) {
      console.error('❌ Erreur récupération stats programmes:', error);
      return {
        totalGenerations: 0,
        lastGeneration: null,
        totalPrograms: 0
      };
    }
  }

  /**
   * Vérifier si l'utilisateur peut générer de nouveaux programmes
   * GÉNÉRATION ILLIMITÉE - Toujours autorisée
   */
  async canGeneratePrograms(userId, maxPerDay = 999999) { // Limite très élevée = pratiquement illimitée
    try {
      console.log('📊 Vérification génération - MODE ILLIMITÉ ACTIVÉ');
      
      // Toujours autoriser la génération
      return {
        canGenerate: true,
        generationsToday: 0,
        maxPerDay: 999999,
        remainingGenerations: 999999
      };
      
    } catch (error) {
      console.error('❌ Erreur vérification limites génération:', error);
      // En cas d'erreur, autoriser la génération
      return {
        canGenerate: true,
        generationsToday: 0,
        maxPerDay: 999999,
        remainingGenerations: 999999
      };
    }
  }
}

export const workoutFirestoreService = new WorkoutFirestoreService();