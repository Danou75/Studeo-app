/**
 * Service pour générer des suggestions de tutoriels intelligentes et progressives
 */

export type TutorType = 'chess' | 'music' | 'drawing' | 'coding';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface TutorialSuggestion {
    title: string;
    level: SkillLevel;
    category: string;
    description: string;
}

/**
 * Suggestions de tutoriels pour le code (Prof Turing)
 */
const codingSuggestions: Record<SkillLevel, TutorialSuggestion[]> = {
    beginner: [
        {
            title: "Hello World Python",
            level: 'beginner',
            category: 'Bases',
            description: "Votre premier programme"
        },
        {
            title: "Les variables",
            level: 'beginner',
            category: 'Syntaxe',
            description: "Stocker des données"
        },
        {
            title: "Les boucles For",
            level: 'beginner',
            category: 'Logique',
            description: "Répéter une action"
        },
        {
            title: "Si / Sinon",
            level: 'beginner',
            category: 'Logique',
            description: "Conditions simples"
        },
        {
            title: "Liste de courses",
            level: 'beginner',
            category: 'Structures de données',
            description: "Les tableaux simples"
        },
        {
            title: "Fonction addition",
            level: 'beginner',
            category: 'Fonctions',
            description: "Créer une fonction simple"
        }
    ],
    intermediate: [
        {
            title: "Calculatrice simple",
            level: 'intermediate',
            category: 'Projet',
            description: "Opérations et input"
        },
        {
            title: "Le jeu du pendu",
            level: 'intermediate',
            category: 'Jeu',
            description: "Logique et chaînes de caractères"
        },
        {
            title: "Classes et Objets",
            level: 'intermediate',
            category: 'POO',
            description: "Introduction aux classes"
        },
        {
            title: "Lire un fichier",
            level: 'intermediate',
            category: 'Entrée/Sortie',
            description: "Manipulation de fichiers"
        },
        {
            title: "Dictionnaire anglais-français",
            level: 'intermediate',
            category: 'Structures de données',
            description: "Les Maps/Dictionnaires"
        },
        {
            title: "Gestion d'erreurs",
            level: 'intermediate',
            category: 'Bonnes pratiques',
            description: "Try / Catch"
        }
    ],
    advanced: [
        {
            title: "Scraping web",
            level: 'advanced',
            category: 'Web',
            description: "Récupérer des données d'un site"
        },
        {
            title: "API REST simple",
            level: 'advanced',
            category: 'Backend',
            description: "Créer un serveur web"
        },
        {
            title: "Algorithme de tri",
            level: 'advanced',
            category: 'Algorithmique',
            description: "Tri rapide ou fusion"
        },
        {
            title: "Jeu de la vie",
            level: 'advanced',
            category: 'Simulation',
            description: "Automate cellulaire"
        },
        {
            title: "Base de données",
            level: 'advanced',
            category: 'Données',
            description: "Connexion SQL/NoSQL"
        }
    ]
};

/**
 * Suggestions de tutoriels pour les échecs (Grand Maître Kaspar)
 */
const chessSuggestions: Record<SkillLevel, TutorialSuggestion[]> = {
    beginner: [
        {
            title: "Le mat de l'escalier",
            level: 'beginner',
            category: 'Mats de base',
            description: "Apprendre à mater avec deux tours"
        },
        {
            title: "La fourchette du cavalier",
            level: 'beginner',
            category: 'Tactiques simples',
            description: "Attaquer deux pièces en même temps"
        },
        {
            title: "Le clouage avec le fou",
            level: 'beginner',
            category: 'Tactiques simples',
            description: "Immobiliser une pièce adverse"
        },
        {
            title: "Contrôler le centre",
            level: 'beginner',
            category: "Principes d'ouverture",
            description: "Les 4 cases centrales"
        },
        {
            title: "Développer les pièces",
            level: 'beginner',
            category: "Principes d'ouverture",
            description: "Sortir cavaliers et fous rapidement"
        },
        {
            title: "Le petit roque",
            level: 'beginner',
            category: 'Sécurité du roi',
            description: "Mettre le roi en sécurité"
        }
    ],
    intermediate: [
        {
            title: "L'enfilade",
            level: 'intermediate',
            category: 'Tactiques avancées',
            description: "Attaquer deux pièces alignées"
        },
        {
            title: "L'échec à la découverte",
            level: 'intermediate',
            category: 'Tactiques avancées',
            description: "Révéler une attaque en bougeant"
        },
        {
            title: "Le sacrifice de qualité",
            level: 'intermediate',
            category: 'Stratégie',
            description: "Échanger tour contre fou/cavalier"
        },
        {
            title: "La défense Française",
            level: 'intermediate',
            category: 'Ouvertures',
            description: "1.e4 e6 - Système solide"
        },
        {
            title: "Finale roi et pion",
            level: 'intermediate',
            category: 'Finales',
            description: "Promouvoir un pion"
        },
        {
            title: "L'opposition",
            level: 'intermediate',
            category: 'Finales',
            description: "Technique de roi contre roi"
        }
    ],
    advanced: [
        {
            title: "Le sacrifice de pièce",
            level: 'advanced',
            category: 'Attaque',
            description: "Sacrifier pour une attaque décisive"
        },
        {
            title: "La défense Sicilienne Najdorf",
            level: 'advanced',
            category: 'Ouvertures complexes',
            description: "Système très dynamique"
        },
        {
            title: "Finale de tours",
            level: 'advanced',
            category: 'Finales techniques',
            description: "Position de Lucena"
        },
        {
            title: "Le zugzwang",
            level: 'advanced',
            category: 'Concepts avancés',
            description: "Quand tout coup affaiblit"
        },
        {
            title: "L'attaque sur le roque",
            level: 'advanced',
            category: 'Attaque',
            description: "Briser la forteresse adverse"
        }
    ]
};

/**
 * Suggestions de tutoriels pour la musique (Prof Mélodia)
 */
const musicSuggestions: Record<SkillLevel, TutorialSuggestion[]> = {
    beginner: [
        {
            title: "Trouver le Do central",
            level: 'beginner',
            category: 'Bases du piano',
            description: "Repérer les notes sur le clavier"
        },
        {
            title: "L'accord de Do majeur",
            level: 'beginner',
            category: 'Premiers accords',
            description: "Do-Mi-Sol, l'accord le plus simple"
        },
        {
            title: "La gamme de Do majeur",
            level: 'beginner',
            category: 'Gammes',
            description: "Les 7 notes blanches"
        },
        {
            title: "Lire la clé de Sol",
            level: 'beginner',
            category: 'Solfège',
            description: "Comprendre la portée musicale"
        },
        {
            title: "Les valeurs de notes",
            level: 'beginner',
            category: 'Rythme',
            description: "Noire, blanche, ronde"
        },
        {
            title: "Placer ses doigts",
            level: 'beginner',
            category: 'Technique',
            description: "Position de base au piano"
        }
    ],
    intermediate: [
        {
            title: "Les accords mineurs",
            level: 'intermediate',
            category: 'Harmonie',
            description: "La, Ré, Mi mineur"
        },
        {
            title: "La gamme de Sol majeur",
            level: 'intermediate',
            category: 'Gammes',
            description: "Première gamme avec dièse"
        },
        {
            title: "Les arpèges",
            level: 'intermediate',
            category: 'Technique',
            description: "Jouer les notes l'une après l'autre"
        },
        {
            title: "Lire la clé de Fa",
            level: 'intermediate',
            category: 'Solfège',
            description: "Pour la main gauche"
        },
        {
            title: "Les accords de 7ème",
            level: 'intermediate',
            category: 'Harmonie avancée',
            description: "Ajouter une 4ème note"
        },
        {
            title: "Le rythme ternaire",
            level: 'intermediate',
            category: 'Rythme',
            description: "Diviser en 3 au lieu de 2"
        }
    ],
    advanced: [
        {
            title: "Les gammes mineures harmoniques",
            level: 'advanced',
            category: 'Gammes avancées',
            description: "Sonorité orientale"
        },
        {
            title: "La modulation",
            level: 'advanced',
            category: 'Composition',
            description: "Changer de tonalité"
        },
        {
            title: "Les accords diminués",
            level: 'advanced',
            category: 'Harmonie jazz',
            description: "Tensions harmoniques"
        },
        {
            title: "Le contrepoint",
            level: 'advanced',
            category: 'Composition',
            description: "Deux mélodies simultanées"
        },
        {
            title: "L'improvisation modale",
            level: 'advanced',
            category: 'Jazz',
            description: "Improviser sur les modes"
        }
    ]
};

/**
 * Suggestions de tutoriels pour le dessin (Maître Léonard)
 */
const drawingSuggestions: Record<SkillLevel, TutorialSuggestion[]> = {
    beginner: [
        {
            title: "Dessiner un cercle parfait",
            level: 'beginner',
            category: 'Formes de base',
            description: "Technique du poignet"
        },
        {
            title: "Tracer des lignes droites",
            level: 'beginner',
            category: 'Formes de base',
            description: "Contrôle du trait"
        },
        {
            title: "Un visage simple",
            level: 'beginner',
            category: 'Portrait',
            description: "Cercle + yeux + bouche"
        },
        {
            title: "Une maison en 3D",
            level: 'beginner',
            category: 'Perspective',
            description: "Cube + toit"
        },
        {
            title: "Un arbre stylisé",
            level: 'beginner',
            category: 'Nature',
            description: "Formes organiques simples"
        },
        {
            title: "Les ombres de base",
            level: 'beginner',
            category: 'Lumière',
            description: "Dégradé simple"
        }
    ],
    intermediate: [
        {
            title: "Les proportions du visage",
            level: 'intermediate',
            category: 'Portrait',
            description: "Règle des tiers"
        },
        {
            title: "Perspective à 1 point de fuite",
            level: 'intermediate',
            category: 'Perspective',
            description: "Rue en profondeur"
        },
        {
            title: "Dessiner une main",
            level: 'intermediate',
            category: 'Anatomie',
            description: "Formes géométriques simplifiées"
        },
        {
            title: "Textures réalistes",
            level: 'intermediate',
            category: 'Technique',
            description: "Bois, pierre, tissu"
        },
        {
            title: "Le clair-obscur",
            level: 'intermediate',
            category: 'Lumière',
            description: "Contraste fort"
        },
        {
            title: "Composition équilibrée",
            level: 'intermediate',
            category: 'Composition',
            description: "Règle des tiers"
        }
    ],
    advanced: [
        {
            title: "Portrait réaliste",
            level: 'advanced',
            category: 'Portrait avancé',
            description: "Détails et ressemblance"
        },
        {
            title: "Perspective à 3 points",
            level: 'advanced',
            category: 'Perspective complexe',
            description: "Vue plongeante/contre-plongée"
        },
        {
            title: "Anatomie dynamique",
            level: 'advanced',
            category: 'Corps en mouvement',
            description: "Poses et raccourcis"
        },
        {
            title: "Peinture numérique",
            level: 'advanced',
            category: 'Technique digitale',
            description: "Calques et brushes"
        },
        {
            title: "Composition narrative",
            level: 'advanced',
            category: 'Illustration',
            description: "Raconter une histoire"
        }
    ]
};

/**
 * Récupère les suggestions pour un tuteur et un niveau donnés
 */
export function getSuggestionsForLevel(
    tutorType: TutorType,
    level: SkillLevel
): TutorialSuggestion[] {
    switch (tutorType) {
        case 'chess':
            return chessSuggestions[level];
        case 'music':
            return musicSuggestions[level];
        case 'drawing':
            return drawingSuggestions[level];
        case 'coding':
            return codingSuggestions[level];
        default:
            return [];
    }
}

/**
 * Récupère toutes les suggestions pour un tuteur (tous niveaux)
 */
export function getAllSuggestions(tutorType: TutorType): TutorialSuggestion[] {
    const beginner = getSuggestionsForLevel(tutorType, 'beginner');
    const intermediate = getSuggestionsForLevel(tutorType, 'intermediate');
    const advanced = getSuggestionsForLevel(tutorType, 'advanced');
    return [...beginner, ...intermediate, ...advanced];
}

/**
 * Récupère des suggestions aléatoires pour un tuteur
 */
export function getRandomSuggestions(
    tutorType: TutorType,
    count: number = 6,
    preferredLevel?: SkillLevel
): TutorialSuggestion[] {
    let pool: TutorialSuggestion[];
    
    if (preferredLevel) {
        // Si un niveau est préféré, prendre 70% de ce niveau et 30% des autres
        const preferred = getSuggestionsForLevel(tutorType, preferredLevel);
        const others = getAllSuggestions(tutorType).filter(s => s.level !== preferredLevel);
        
        const preferredCount = Math.ceil(count * 0.7);
        const othersCount = count - preferredCount;
        
        pool = [
            ...shuffleArray(preferred).slice(0, preferredCount),
            ...shuffleArray(others).slice(0, othersCount)
        ];
    } else {
        // Sinon, mélanger toutes les suggestions
        pool = shuffleArray(getAllSuggestions(tutorType));
    }
    
    return pool.slice(0, count);
}

/**
 * Utilitaire pour mélanger un tableau
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Obtient le niveau suggéré basé sur l'historique de l'utilisateur
 * (Pour l'instant retourne 'beginner', à améliorer avec un vrai système de progression)
 */
export function getSuggestedLevel(_tutorType: TutorType): SkillLevel {
    // TODO: Implémenter un système de tracking de progression
    // Pour l'instant, on commence toujours par débutant
    return 'beginner';
}
