import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIConfig } from "../contexts/AIConfigContext";

export interface TutorialStep {
    stepNumber: number;
    instruction: string;
    details: string;
    svgCode: string;
    fen?: string;
    arrows?: { from: string; to: string; color?: string }[];
    codeBlock?: { language: string; code: string }; // Nouveau champ pour le code (Prof Turing)
}

export interface DrawingTutorial {
    topic: string;
    steps: TutorialStep[];
    finalAdvice: string;
}

export const generateDrawingTutorial = async (
    topic: string, 
    config: AIConfig,
    tutorName: string = "Maître Léonard"
): Promise<DrawingTutorial> => {
    try {
        const isMusic = tutorName.toLowerCase().includes('mélodia');
        const isChess = tutorName.toLowerCase().includes('kaspar');
        const isCode = tutorName.toLowerCase().includes('turing');
        
        const domain = isMusic ? 'de la musique' : isChess ? 'des échecs' : isCode ? 'du code' : 'du dessin';

        const prompt = `
        Tu es ${tutorName}, un expert en pédagogie ${domain}.
        L'utilisateur veut apprendre : "${topic}".
        
        ${isCode ? `
        RÈGLES PÉDAGOGIQUES STRICTES POUR LE CODE (PYTHON / JS / INFO) :
        
        1. STRUCTURE DU TUTORIEL (4-6 étapes) :
           - Étape 1 : Concept de base ou Setup (ex: Déclarer une variable)
           - Étapes 2-4 : Ajout de la logique pas à pas (ex: Ajouter une boucle, une condition)
           - Étape finale : Le programme complet fonctionnel
           
        2. EXPLICATIONS CLAIRES :
           - Titre : Action concrète (ex: "Créer la boucle principale")
           - Details : Explique ce que fait cette ligne spécifique et pourquoi.
           - Code : Fournis UNIQUEMENT le code de l'étape, court et lisible.
           
        3. PROGRESSION :
           - Ne donne pas tout le code à la fois.
           - Construis le programme brique par brique.
        ` : isChess ? `
        RÈGLES PÉDAGOGIQUES STRICTES POUR LES ÉCHECS :
        
        1. STRUCTURE DU TUTORIEL (5-6 étapes) :
           - Étape 1 : Position de départ SIMPLE et CONCRÈTE (pas de concept abstrait)
           - Étapes 2-4 : Progression logique montrant UNE SEULE idée tactique à la fois
           - Étape finale : Résultat du plan tactique (mat, gain de matériel, etc.)
        
        2. CLARTÉ DES INSTRUCTIONS :
           - Titre : Court et descriptif (ex: "Le cavalier attaque la dame")
           - Details : Expliquer en 2-3 phrases SIMPLES :
             * CE QUI SE PASSE sur l'échiquier (ex: "Le cavalier blanc est en c3")
             * POURQUOI c'est important (ex: "Il peut sauter en e4 pour attaquer la dame noire")
             * QUEL EST L'OBJECTIF (ex: "Les noirs devront déplacer leur dame et perdre du temps")
           - Éviter le jargon technique sauf si expliqué
        
        3. POSITIONS RÉALISTES :
           - Utiliser des positions de MILIEU DE JEU ou FIN DE JEU simples
           - Montrer 6-12 pièces maximum (pas tout l'échiquier de départ)
           - Chaque position doit illustrer UN SEUL concept tactique
           - Les pièces doivent avoir un RÔLE CLAIR dans la tactique
        
        4. FLÈCHES PÉDAGOGIQUES :
           - Maximum 2-3 flèches par étape
           - Rouge : Le coup à jouer OU la menace principale
           - Vert : Un bon coup défensif OU une case contrôlée
           - Bleu : Une variante alternative
           - NE PAS mettre 8 flèches montrant tous les coups possibles d'une pièce !
        
        5. PROGRESSION NARRATIVE :
           - Raconter une "histoire tactique" cohérente
           - Chaque étape découle logiquement de la précédente
           - Montrer l'évolution de la position après chaque coup clé
        
        EXEMPLES DE BONS TITRES :
        ✅ "La fourchette : le cavalier attaque deux pièces"
        ✅ "Clouage : le fou immobilise le cavalier"
        ✅ "Échec à la découverte : la tour se libère"
        
        EXEMPLES DE MAUVAIS TITRES :
        ❌ "Comprendre les forces du cavalier" (trop abstrait)
        ❌ "Cavalier vs fou" (pas d'objectif clair)
        ❌ "Tactique avancée" (trop vague)
        
        ` : isMusic ? `
        RÈGLES PÉDAGOGIQUES STRICTES POUR LA MUSIQUE :
        
        ⚠️ INTERDICTIONS ABSOLUES :
        - NE JAMAIS montrer un clavier sans NOMMER les touches
        - NE JAMAIS utiliser des chiffres (1), (2), (3) sans expliquer ce qu'ils signifient
        - NE JAMAIS montrer plus de 3-4 notes à la fois
        - NE JAMAIS utiliser de jargon (intervalles, degrés) sans l'expliquer en français simple
        
        1. STRUCTURE DU TUTORIEL (5-6 étapes) :
           - Étape 1 : Identifier UNE SEULE note sur le clavier/la portée (ex: "Trouver le Do central")
           - Étape 2 : Ajouter UNE deuxième note (ex: "Ajouter le Mi")
           - Étape 3 : Ajouter UNE troisième note pour former l'accord complet
           - Étape 4 : Montrer le rythme ou la façon de jouer
           - Étape finale : Jouer l'accord/la mélodie complète
        
        2. CLARTÉ VISUELLE OBLIGATOIRE :
           Pour un CLAVIER DE PIANO :
           - Dessiner 7-10 touches maximum (pas tout le clavier)
           - ÉCRIRE le nom de CHAQUE touche importante (Do, Ré, Mi, etc.)
           - Utiliser des CERCLES de couleur sur les touches à jouer
           - Légende : "🔴 = Pouce (1er doigt)", "🔵 = Majeur (3e doigt)", "🟢 = Auriculaire (5e doigt)"
           
           SYSTÈME DE COORDONNÉES POUR CLAVIER (SVG 400x400) :
           - Touches BLANCHES (largeur 40px, hauteur 150px) :
             * Do : x=50, y=100
             * Ré : x=90, y=100
             * Mi : x=130, y=100
             * Fa : x=170, y=100
             * Sol : x=210, y=100
             * La : x=250, y=100
             * Si : x=290, y=100
           - Touches NOIRES (largeur 25px, hauteur 90px, y=100) :
             * Do# : x=77.5
             * Ré# : x=117.5
             * Fa# : x=197.5
             * Sol# : x=237.5
             * La# : x=277.5
           - CERCLES pour indiquer les notes : rayon 15px, centré sur la touche (y=175 pour blanches, y=145 pour noires)
           - TEXTE du nom de la note : y=270 (en dessous du clavier)
           
           Pour une PORTÉE MUSICALE :
           - Montrer la clé de Sol
           - Maximum 4 notes par portée
           - ÉCRIRE le nom de chaque note EN DESSOUS (Do, Ré, Mi, etc.)
           - Indiquer la durée (noire, blanche) avec un texte simple
        
        3. INSTRUCTIONS EN 3 PHRASES SIMPLES :
           - Phrase 1 : "Placez votre [doigt] sur la touche [nom]" OU "Cette note s'appelle [nom] et se trouve [position]"
           - Phrase 2 : "C'est la [position] note de l'accord de [nom]" OU "Elle sonne [grave/aiguë]"
           - Phrase 3 : "Jouez-la [doucement/fort] pendant [durée]" OU "Passez ensuite à la note suivante"
        
        4. PROGRESSION ULTRA-SIMPLE :
           Étape 1 : "Trouver le Do central"
           → Montrer UN SEUL Do sur le clavier avec son nom écrit
           
           Étape 2 : "Ajouter le Mi"
           → Montrer Do + Mi (2 notes seulement) avec noms écrits
           
           Étape 3 : "Compléter avec le Sol"
           → Montrer Do + Mi + Sol (accord complet) avec noms écrits
           
           Étape 4 : "Placer les doigts"
           → Même clavier avec numéros de doigts (1, 3, 5)
           
           Étape finale : "Jouer l'accord de Do majeur"
           → Tout ensemble avec indication "Jouez les 3 notes en même temps"
        
        5. VOCABULAIRE SIMPLE OBLIGATOIRE :
           ✅ Utiliser : "note grave", "note aiguë", "jouer ensemble", "l'une après l'autre"
           ❌ Éviter : "tierce majeure", "quinte juste", "arpège", "intervalle"
           
           Si un terme technique est nécessaire, l'expliquer :
           "Un accord (= plusieurs notes jouées ensemble)"
        
        EXEMPLE DE BON TUTORIEL (Accord de Do majeur) :
        
        Étape 1 : "Trouver le Do central"
        Details: "Le Do est la touche blanche juste à gauche des deux touches noires. C'est la note la plus importante de l'accord. Posez votre pouce dessus."
        SVG: <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <!-- Touches blanches -->
          <rect x="50" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="90" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="130" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="170" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="210" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="250" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <rect x="290" y="100" width="40" height="150" fill="white" stroke="black" stroke-width="2"/>
          <!-- Touches noires -->
          <rect x="77.5" y="100" width="25" height="90" fill="black"/>
          <rect x="117.5" y="100" width="25" height="90" fill="black"/>
          <rect x="197.5" y="100" width="25" height="90" fill="black"/>
          <rect x="237.5" y="100" width="25" height="90" fill="black"/>
          <rect x="277.5" y="100" width="25" height="90" fill="black"/>
          <!-- Cercle rouge sur Do -->
          <circle cx="70" cy="175" r="15" fill="red" opacity="0.8"/>
          <!-- Nom de la note -->
          <text x="70" y="270" text-anchor="middle" font-size="16" font-weight="bold">Do</text>
        </svg>
        
        Étape 2 : "Ajouter le Mi"
        Details: "Le Mi est deux touches blanches plus loin vers la droite. C'est la deuxième note de l'accord. Posez votre majeur dessus."
        SVG: (même clavier avec cercle rouge sur Do + cercle bleu sur Mi à x=150, textes "Do" et "Mi")
        
        Étape 3 : "Compléter avec le Sol"
        Details: "Le Sol est encore deux touches blanches plus loin. C'est la dernière note de l'accord. Posez votre auriculaire dessus."
        SVG: (clavier avec 3 cercles : rouge Do x=70, bleu Mi x=150, vert Sol x=230)
        
        Étape 4 : "Jouer l'accord de Do majeur"
        Details: "Appuyez sur les trois touches en même temps. Vous devez entendre un son harmonieux. C'est l'accord de Do majeur, le plus simple au piano."
        SVG: (même clavier avec flèche vers le bas et texte "Jouez ensemble ↓")
        
        EXEMPLES DE BONS TITRES :
        ✅ "Trouver le Do central sur le clavier"
        ✅ "Placer le pouce sur Do, le majeur sur Mi"
        ✅ "Jouer les trois notes ensemble"
        
        EXEMPLES DE MAUVAIS TITRES :
        ❌ "Mib (3)" (incompréhensible)
        ❌ "Comprendre l'harmonie" (trop abstrait)
        ❌ "Les intervalles" (trop technique)
        
        ` : `
        RÈGLES PÉDAGOGIQUES STRICTES POUR LE DESSIN :
        
        ⚠️ INTERDICTIONS ABSOLUES :
        - NE JAMAIS dessiner tout d'un coup (progression obligatoire)
        - NE JAMAIS oublier les traits de construction (ils doivent être visibles en gris)
        - NE JAMAIS utiliser des termes techniques (perspective, anatomie) sans explication simple
        - NE JAMAIS dessiner sans donner de repères de taille/position
        
        1. STRUCTURE DU TUTORIEL (5-6 étapes) :
           - Étape 1 : UNE SEULE forme géométrique de base (cercle OU ovale OU rectangle)
           - Étapes 2-3 : Ajouter les formes secondaires (UN élément à la fois)
           - Étape 4 : Ajouter les détails principaux
           - Étape finale : Traits finaux et finitions
        
        2. SYSTÈME DE COORDONNÉES (SVG 400x400) :
           - Centre du canvas : x=200, y=200
           - Zone de dessin recommandée : 100x100 à 300x300 (pour laisser de la marge)
           - Utiliser des repères visuels :
             * Ligne verticale centrale : x=200
             * Ligne horizontale centrale : y=200
             * Tiers supérieur : y=133
             * Tiers inférieur : y=267
        
        3. CLARTÉ VISUELLE OBLIGATOIRE :
           - Traits de CONSTRUCTION (étapes précédentes) :
             * stroke="gray"
             * stroke-width="1"
             * opacity="0.3"
             * stroke-dasharray="5,5" (pointillés)
           
           - NOUVEAUX traits (étape actuelle) :
             * stroke="black"
             * stroke-width="3"
             * class="new-lines"
           
           - ANNOTATIONS (texte explicatif) :
             * font-size="14"
             * fill="blue" (pour les repères)
             * Indiquer les distances : "← 50px →", "1/3", "centre"
        
        4. INSTRUCTIONS EN 3 PHRASES SIMPLES :
           - Phrase 1 : "Tracez [forme] [où]" (ex: "Tracez un cercle au centre")
           - Phrase 2 : "Il mesure environ [taille] et se trouve [position]" (ex: "Il mesure 100px de diamètre")
           - Phrase 3 : "Ce sera la base pour [élément final]" (ex: "Ce sera la tête du personnage")
        
        5. PROGRESSION ULTRA-SIMPLE :
           Exemple : Dessiner un visage simple
           
           Étape 1 : "Tracer le cercle de la tête"
           → UN cercle au centre (cx=200, cy=200, r=80)
           → Texte : "Tête"
           
           Étape 2 : "Ajouter la ligne des yeux"
           → Cercle précédent en gris pointillé
           → Ligne horizontale à y=200 (niveau des yeux)
           → Texte : "Ligne des yeux (au centre)"
           
           Étape 3 : "Dessiner les deux yeux"
           → Cercle + ligne en gris
           → 2 petits cercles (r=10) à x=180 et x=220, y=200
           → Texte : "Yeux"
           
           Étape 4 : "Ajouter le nez"
           → Tout précédent en gris
           → Petit triangle sous les yeux (y=220)
           → Texte : "Nez"
           
           Étape finale : "Dessiner la bouche et finaliser"
           → TOUT en noir (plus de gris)
           → Arc de cercle pour la bouche (y=240)
           → Dessin complet
        
        6. VOCABULAIRE SIMPLE OBLIGATOIRE :
           ✅ Utiliser : "au centre", "à mi-hauteur", "en haut/en bas", "à gauche/droite"
           ❌ Éviter : "axe de symétrie", "point de fuite", "canon de proportion"
           
           Si un terme est nécessaire, l'expliquer :
           "Symétrie (= les deux côtés sont identiques)"
        
        EXEMPLE DE BON TUTORIEL (Visage simple) :
        
        Étape 1 : "Tracer le cercle de la tête"
        Details: "Tracez un grand cercle au centre de votre feuille. Il mesure environ 160px de diamètre. Ce cercle sera la base de la tête."
        SVG: <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <!-- Repères (optionnels, en bleu clair) -->
          <line x1="200" y1="0" x2="200" y2="400" stroke="lightblue" stroke-width="1" opacity="0.3"/>
          <line x1="0" y1="200" x2="400" y2="200" stroke="lightblue" stroke-width="1" opacity="0.3"/>
          <!-- Cercle de la tête (nouveau) -->
          <circle cx="200" cy="200" r="80" fill="none" stroke="black" stroke-width="3" class="new-lines"/>
          <!-- Annotation -->
          <text x="200" y="300" text-anchor="middle" font-size="14" fill="gray">Tête (cercle de base)</text>
        </svg>
        
        Étape 2 : "Ajouter la ligne des yeux"
        Details: "Tracez une ligne horizontale qui passe par le centre du cercle. C'est là que seront placés les yeux. Cette ligne vous aide à placer les yeux au bon endroit."
        SVG: (cercle précédent en gris pointillé + ligne horizontale noire à y=200)
        
        Étape 3 : "Dessiner les deux yeux"
        Details: "Dessinez deux petits cercles sur la ligne des yeux, espacés régulièrement. Ils sont à égale distance du centre. Ce sont les yeux du personnage."
        SVG: (cercle + ligne en gris + 2 cercles noirs r=10 à x=180 et x=220)
        
        EXEMPLES DE BONS TITRES :
        ✅ "Tracer le cercle de base pour la tête"
        ✅ "Ajouter les yeux : deux cercles sur la ligne centrale"
        ✅ "Dessiner le nez : un petit triangle"
        
        EXEMPLES DE MAUVAIS TITRES :
        ❌ "Comprendre les proportions" (trop abstrait)
        ❌ "Anatomie du visage" (trop technique)
        ❌ "Étape 2" (pas descriptif)
        `}

        ${isCode ? `
        FORMAT DE RÉPONSE POUR LE CODE :
        
        1. "codeBlock": { "language": "python" (ou "javascript"), "code": "..." }
        2. "svgCode": "" (laisser vide)
        3. "instruction": Titre actionnable
        4. "details": Explication claire
        ` : isChess ? `
        FORMAT DE RÉPONSE POUR LES ÉCHECS :
        
        Pour chaque étape, tu DOIS fournir :
        1. "fen": Position FEN complète et VALIDE
        2. "arrows": Tableau de 1-3 flèches maximum, chacune avec:
           - "from": case de départ (ex: "e2")
           - "to": case d'arrivée (ex: "e4")
           - "color": "red" (menace/coup), "green" (défense), ou "blue" (variante)
        3. "svgCode": "" (laisser vide)
        4. "instruction": Titre court et descriptif (max 50 caractères)
        5. "details": Explication pédagogique en 2-4 phrases courtes et claires
        
        ` : `
        FORMAT DE RÉPONSE POUR ${isMusic ? 'LA MUSIQUE' : 'LE DESSIN'} :
        
        Pour chaque étape, tu DOIS fournir :
        1. "svgCode": Un SVG SIMPLE et CLAIR (viewbox="0 0 400 400")
           - Fond TRANSPARENT
           - ${isMusic ? 'Portée musicale avec notes claires, doigtés si nécessaire' : 'Traits de construction en gris (opacity="0.3"), nouveaux traits en noir'}
           - Taille de police lisible (minimum 14px pour le texte)
           - Annotations courtes et précises
        
        2. "instruction": Titre court et actionnable (max 50 caractères)
           - Commencer par un VERBE d'action (Tracer, Placer, Ajouter, Dessiner, Jouer)
           - Être SPÉCIFIQUE (pas "Étape 2" mais "Tracer le cercle de la tête")
        
        3. "details": Explication pédagogique en 2-4 phrases courtes
           - Phrase 1 : CE QU'ON FAIT (action concrète)
           - Phrase 2 : COMMENT le faire (technique/méthode)
           - Phrase 3 : POURQUOI c'est important (objectif pédagogique)
        
        STRUCTURE DU SVG :
        - Groupe 1 (gris, opacity 0.3) : Éléments des étapes précédentes
        - Groupe 2 (noir, class="new-lines") : NOUVEAUX éléments de cette étape
        - Dernière étape : TOUT en noir pour montrer le résultat final
        `}
        
        Ne mets pas de commentaires dans le JSON.

        Réponds UNIQUEMENT au format JSON strict suivant, sans markdown :
        {
            "topic": "${topic}",
            "steps": [
                {
                    "stepNumber": 1,
                    "instruction": "Titre court et descriptif",
                    "details": "Explication pédagogique claire en 2-4 phrases.",
                    ${isCode ? '"codeBlock": { "language": "python", "code": "..." }' : 
                      isChess ? '"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "arrows": [{"from": "e2", "to": "e4", "color": "red"}]' : 
                      '"svgCode": "<svg>...</svg>"'}
                }
            ],
            "finalAdvice": "Conseil pratique pour s'entraîner"
        }
        `;
        let rawResponse = "";

        if (config.provider === 'local') {
            const apiUrl = config.localApiUrl;
            if (!apiUrl) throw new Error("URL API locale manquante");
            
            // Normalisation intelligente de l'URL
            let endpoint = apiUrl.replace(/\/$/, '');
            if (!endpoint.includes('/chat/completions')) {
                if (endpoint.endsWith('/v1')) {
                    endpoint = `${endpoint}/chat/completions`;
                } else {
                    endpoint = `${endpoint}/v1/chat/completions`;
                }
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.localModelName || "local-model",
                    messages: [{ role: "user", content: `INSTRUCTION: Réponds UNIQUEMENT au format JSON strict.\n\n${prompt}` }],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur serveur Local (${response.status}): ${errorText.slice(0, 100)}`);
            }
            
            const data = await response.json();
            if (data.error) throw new Error(`L'IA Locale a renvoyé une erreur : ${JSON.stringify(data.error)}`);

            rawResponse = data.choices?.[0]?.message?.content || "";

        } else if (config.provider === 'mistral') {
            if (!config.mistralApiKey) throw new Error("Clé API Mistral manquante");

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.mistralApiKey}`
                },
                body: JSON.stringify({
                    model: config.mistralModel || "mistral-large-latest",
                    messages: [{ role: "user", content: `INSTRUCTION: Réponds UNIQUEMENT au format JSON strict.\n\n${prompt}` }],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur Mistral (${response.status}): ${errorText.slice(0, 100)}`);
            }

            const data = await response.json();
            rawResponse = data.choices?.[0]?.message?.content || "";

        } else if (config.provider === 'openai') {
            if (!config.openaiApiKey) throw new Error("Clé API OpenAI manquante");

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.openaiApiKey}`
                },
                body: JSON.stringify({
                    model: config.openaiModel || "gpt-4o",
                    messages: [{ role: "user", content: `INSTRUCTION: Réponds UNIQUEMENT au format JSON strict.\n\n${prompt}` }],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur OpenAI (${response.status}): ${errorText.slice(0, 100)}`);
            }

            const data = await response.json();
            rawResponse = data.choices?.[0]?.message?.content || "";

        } else if (config.provider === 'anthropic') {
            if (!config.anthropicApiKey) throw new Error("Clé API Anthropic manquante");

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.anthropicApiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.anthropicModel || "claude-3-5-sonnet-20240620",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 4000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur Anthropic (${response.status}): ${errorText.slice(0, 100)}`);
            }

            const data = await response.json();
            rawResponse = data.content?.[0]?.text || "";

        } else {
            // Gemini (Défaut)
            const genAI = new GoogleGenerativeAI(config.geminiApiKey);
            const model = genAI.getGenerativeModel({ model: config.geminiModel || "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            rawResponse = result.response.text();
        }

        if (!rawResponse || rawResponse.trim().length === 0) {
            throw new Error("L'IA a renvoyé une réponse vide.");
        }

        // Nettoyage et Extraction Robuste du JSON
        let jsonString = rawResponse;
        
        // Si la réponse contient des blocs de code Markdown, on extrait le contenu du premier bloc
        if (jsonString.includes('```')) {
            const matches = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (matches && matches[1]) {
                jsonString = matches[1].trim();
            }
        }
        
        // Si c'est toujours pas du JSON pur (ex: texte avant/après), on cherche les accolades
        if (!jsonString.trim().startsWith('{')) {
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonString = jsonString.substring(firstBrace, lastBrace + 1);
            }
        }

        try {
            return JSON.parse(jsonString) as DrawingTutorial;
        } catch (parseError) {
            console.error("Erreur de parsing JSON:", jsonString);
            throw new Error("La réponse de l'IA n'est pas un JSON valide. Essayez un sujet plus simple ou vérifiez votre modèle.");
        }

    } catch (error: any) {
        console.error("Erreur génération tutoriel:", error);
        throw error;
    }
};
