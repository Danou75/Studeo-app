import { fr } from './fr';

export const en: typeof fr = {
    common: {
        back: "Back",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        settings: "Settings",
        help: "Help",
        home: "Home",
        appearance: "Appearance",
        light: "Light",
        dark: "Dark",
        auto: "Auto",
        actions: "Actions"
    },
    languages: {
        fr: "French",
        en: "English",
        es: "Spanish",
        it: "Italian",
        pt: "Portuguese",
        de: "German",
        pl: "Polish",
        ru: "Russian",
        tr: "Turkish",
        la: "Latin",
        front: "Front",
        back: "Back",
        question: "Question",
        answer: "Answer"
    },
    "video": {
        "title": "Video Learning Lab",
        "subtitle": "Transform any YouTube video into educational flashcards and interactive summaries.",
        "placeholder": "Paste YouTube URL here (e.g., https://www.youtube.com/watch?v=...)",
        "analyze": "Analyze Video",
        "processing": "The AI is watching the video and extracting essence...",
        "error": "Please provide a valid YouTube URL.",
        "analyzeError": "Video analysis failed. Check your connection and AI configuration.",
        "extractSummary": "Generate Summary",
        "extractQuiz": "Generate Quiz"
    },
    "knowledge": {
        "title": "Knowledge Map",
        "subtitle": "Visualize your connections and mastery levels",
        "stats": "Knowledge Density",
        "nodes": "Topic Nodes",
        "mastery": "Global Mastery",
        "noData": "Add more flashcards to see your knowledge map grow!",
        "refresh": "Refresh Map"
    },

    "library": {
        "title": "Community Library",
        "subtitle": "Discover and import study sets shared by the community.",
        "searchPlaceholder": "Search for a set (ex: Italian, Medicine...)",
        "importSuccess": "\"{name}\" imported successfully!",
        "cardsCount": "{count} cards",
        "noResults": "No results found...",
        "importAction": "Import Set"
    },
    home: {
        title: "STUDEO",
        subtitle: "The tool to learn everything",
        question: "What would you like to do today?",
        access: "Access",
        streakLabel: "Current Streak",
        totalCardsLabel: "Total Cards",
        dueCardsLabel: "Due for Review",
        footer: "Studeo v1.0 • Your complete learning assistant",
        quote: {
            text: "Learning is a treasure that will follow its owner everywhere.",
            author: "Chinese Proverb"
        },
        cardsToReview: "{count} cards to review",
        totalCards: "{count} cards in total",
        sections: {
            aiLab: "AI Lab & Assistants",
            library: "Library & Tracking",
            training: "Training Zone",
            analysis: "Analysis & Knowledge"
        },
        features: {
            chat: {
                title: "Chat with a Tutor",
                description: "Talk with your AI tutor"
            },

            aiGenerator: {
                title: "AI Generator",
                description: "Create educational content with artificial intelligence"
            },
            tutorsRoom: {
                title: "Teachers' Room",
                description: "Access specialized AI tutors in various fields"
            },
            languageLab: {
                title: "Language Lab",
                description: "Practice speaking with real-time feedback"
            },
            quiz: {
                title: "Multilingual Quiz",
                description: "Create and take custom quizzes in multiple languages"
            },
            conjugator: {
                title: "Conjugator & Translator",
                description: "Conjugate verbs and translate in multiple languages"
            },
            curriculum: {
                title: "My Curriculums",
                description: "Follow your study programs in a structured way"
            },
            srs: {
                title: "SRS Review",
                description: "Memorization through spaced repetition"
            },
            stats: {
                title: "Statistics",
                description: "Track your progress and mastery."
            },
            knowledgeMap: {
                title: "Knowledge Map",
                description: "Visualize your mental network."
            },
            videoLearning: {
                title: "Video Lab",
                description: "Learn from any YouTube video."
            },

            library: {
                title: "Library",
                description: "Discover shared card sets."
            }
        },
    },
    repetitor: {
        title: "Repetitor",
        level: "Level {level}",
        listen: "Listen",
        speak: "Speak",
        repeat: "Repeat",
        resultLabel: "Result:",
        excellent: "✅ EXCELLENT!",
        tryAgain: "❌ TRY AGAIN",
        bravo: "Well done!",
        score: "Score"
    },
    music: {
        title: "Music Challenge",
        keyboardHint: "Use the keyboard to validate the challenge! (Middle C = 8th white key)",
        midiError: "Unable to access MIDI.",
        midiNotSupported: "Browser not MIDI compatible.",
        missingApiKey: "Missing {provider} API key.",
        describeChallenge: "Please describe a challenge.",
        challengeCreated: "✨ Challenge created! Your turn.",
        aiError: "AI Error: {message}",
        newChallenges: "✨ New challenges generated by Melodia!",
        difficulty: {
            beginner: "Apprentice",
            intermediate: "Virtuoso",
            advanced: "Maestro"
        },
        notes: {
            do: "C",
            re: "D",
            mi: "E",
            fa: "F",
            sol: "G",
            la: "A",
            si: "B"
        },
        controls: {
            listen: "Listen to Melodia",
            check: "Check",
            reset: "Retry on keyboard",
            back: "Back",
            renew: "New challenges",
            submitPhoto: "Submit photo (AI Evaluation)",
            justPhoto: "Just a photo",
            generate: "Generate interactive challenge",
            creating: "Creating..."
        },
        labels: {
            instruction: "Instruction:",
            details: "Melodia's details:",
            generated: "🎵 Generated Challenge",
            free: "🎵 Free Challenge",
            placeholder: "Describe your exercise: e.g. 'D major scale', 'F minor chord', 'First 3 notes of Mary Had a Little Lamb'...",
            keyboardValidation: "Use the keyboard above to validate the exercise."
        },
        challenges: {
            pianoCollection: { title: "🎹 Keyboard Keys", challenge: "Find and play all occurrences of the requested note.", criteria: "Find the notes everywhere on the keyboard." },
            earNoteSimple: { title: "👂 Dictation: Single Note", challenge: "Listen to the note played by Melodia and find it on the keyboard.", criteria: "Press 'Listen' then find the note." },
            theoryKeySimple: { title: "🎼 Simple Key", challenge: "What is the key signature for the requested key?", criteria: "Find the corresponding sharp or flat." },
            rhythmSimple: { title: "🥁 Binary Rhythm", challenge: "Draw two measures of 4/4 with quarter notes and half notes.", criteria: "This challenge must be done on paper and submitted by photo." },
            earChordType: { title: "👂 Chord: Maj or min?", challenge: "Melodia plays a chord. Reproduce it on the keyboard.", criteria: "Listen to the chord color (Major or Minor)." },
            intervalsId: { title: "📏 Interval: Fifth", challenge: "Find the perfect fifth starting from the given note.", criteria: "Play the tonic then its fifth." },
            theoryRelative: { title: "🎼 Relative Scale", challenge: "Play the requested relative minor scale.", criteria: "Find the relative minor (3 semitones below the major)." },
            notationNuance: { title: "🎻 Nuances", challenge: "Draw the nuance symbols on paper.", criteria: "Challenge to be submitted by photo." },
            earMelody3: { title: "👂 Melodic Dictation", challenge: "Find the 3-note melody played by Melodia.", criteria: "Listen to the pattern and reproduce it." },
            advancedChord: { title: "🎹 7th Chord", challenge: "Play the requested dominant 7th chord.", criteria: "Tonic, Major 3rd, 5th, minor 7th." },
            theoryKeySig: { title: "🎼 Complex Key Signature", challenge: "Play the sharps/flats of the requested key signature.", criteria: "Respect the order of sharps/flats." }
        },
        titleMain: "Music Workshop",
        subtitleMain: "With Melodia",
        midiConnected: "MIDI Keyboard Connected",
        midiEnable: "Enable Master Keyboard (MIDI)",
        gameplay: {
            title: "How it works?",
            step1: "Some challenges can be validated directly **on the keyboard**.",
            step2: "For others, do the exercise on paper or tablet.",
            step3: "Submit a photo if the keyboard is not enough for the full evaluation."
        },
        feedback: {
            wellDone: "Well done!",
            validated: "Challenge validated! Excellent.",
            wrongKey: "Wrong, that's not the right key.",
            correctContinue: "Correct! Continue...",
            incorrect: "Oh no! That's wrong. Try again.",
            successMessage: "Congratulations! You have successfully completed the keyboard challenge!"
        },
        playableOnKeyboard: "⌨️ Playable on keyboard",
        renewTitle: "✨ Renew",
        renewDesc: "Ask Melodia for new challenges to vary your training.",
        freeChallengeTitle: "🎵 Free Challenge",
        freeChallengeDesc: "Create your own musical exercise.",
        customWarning: "Please enter a custom challenge"
    },
    ai: {
        title: "AI Generator",
        generate: "Generate",
        generating: "Generating...",
        topicLabel: "Topic or Theme",
        topicPlaceholder: "E.g. Italian irregular verbs, Photosynthesis, Capitals of Europe...",
        countLabel: "Number of items",
        difficultyLabel: "Difficulty level",
        contextLabel: "Additional context (optional)",
        contextPlaceholder: "E.g. Focus on formal vocabulary...",
        type: {
            quiz: "Quiz (Cards)",
            quizDesc: "Flashcards and MCQs",
            lesson: "Ask for a Lesson",
            lessonDesc: "Detailed explanations",
            curriculum: "Generate a Program",
            curriculumDesc: "Structured pathway",
            mixed: "Mixed Quiz",
            mixedDesc: "All question types",
            specializedCurriculum: "Generate a specialized program",
            specializedCurriculumDesc: "Complete programs"
        },
        input: {
            text: "Manual Topic",
            file: "From a File",
            image: "From PDF or Image",
            media: "From a Media",
            clickSelectFile: "Click to select a document",
            clickSelectImage: "Click to import a PDF or photo",
            clickSelectMedia: "Click to import an Audio/Video",
            fileLoaded: "File loaded",
            imageLoaded: "Image loaded",
            mediaLoaded: "Media loaded",
            urlPlaceholder: "Paste video or podcast URL...",
            urlHint: "AI will analyze public content accessible via this link.",
            fileHint: "Use the drop zone above to load your file.",
            mediaRadioUrl: "Link (YouTube)",
            mediaRadioFile: "File (MP3/MP4)",
            transcript: "From a Transcript",
            transcriptPlaceholder: "Paste your text or transcript here...",
            transcriptHint: "The AI will use this text as the sole source to generate content."
        },
        labels: {
            topicTitle: "Generated content title *",
            topicSubject: "Subject *",
            topicProgram: "Program focus *",
            topicLesson: "Lesson focus *",
            topicDefault: "Give this content a name...",
            setName: "Set name (Optional)",
            setNamePlaceholder: "Leave empty to add to current set",
            sourceLang: "Source language (Question)",
            targetLang: "Target language (Answer)",
            numCards: "Number of cards",
            difficulty: "Level",
            contextQuiz: "Additional context (optional)",
            contextLesson: "Specific instructions (optional)",
            contextPlaceholderLesson: "E.g. Explain like I'm 10, emphasize dates...",
            quizInfo: "Generated cards will be added to your current collection.",
            lessonInfo: "The lesson will be displayed once generated. You can save it afterwards."
        },
        actions: {
            selectFile: "Select a file",
            useTutor: "Use a specialized tutor",
            savedLessons: "Lesson history",
            chooseTutor: "Choose a teacher",
            defaultAssistant: "Intelligent Assistant",
            writeLesson: "Write lesson",
            creatingProgram: "Creating program...",
            writingLesson: "Writing course..."
        },
        header: {
            generateWithAI: "✨ Generate with AI",
            quizCreator: "🤖 Quiz creator",
            curriculumCreation: "🗺️ Program creation",
            aiAssistant: "🤖 AI Assistant"
        },
        config: {
            current: "Current AI Configuration",
            provider: "Provider:",
            model: "Model:",
            missingKey: "⚠️ API key not configured. Go to Settings to configure it.",
            geminiKey: "Gemini API key required",
            openaiKey: "OpenAI API key required",
            anthropicKey: "Anthropic API key required",
            mistralKey: "Mistral API key required",
            localUrl: "Local API URL required"
        },
        errors: {
            noTopic: "Please enter a topic or select a file.",
            noApiKey: "API key not configured for {provider}.",
            generationFailed: "Generation failed. Please try again.",
            imageRead: "Unable to read selected image.",
            mediaRead: "Unable to read media file.",
            desktopOnly: "File reading is only available in the desktop app.",
            noTutorLesson: "Please select a teacher to generate a lesson",
            lessonNotSupported: "Lesson generation is not yet supported here",
            noTutorCurriculum: "Please select a teacher to create a program",
            noTopicTitle: "Please enter a topic or name your file",
            invalidFile: "Please select a valid file",
            invalidImage: "Please select a valid image",
            invalidUrl: "Please enter a valid URL",
            invalidMedia: "Please select a valid media file",
            unknown: "Unknown error during generation",
            curriculumNotConnected: "Curriculum functionality not connected"
        },
        placeholders: {
            capitals: "E.g. World capitals, English vocabulary, Dinosaurs...",
            webDesigner: "E.g. Become a Web Designer in 3 months, Learn jazz guitar...",
            quantum: "E.g. Explain quantum physics, Summary of Homer's Odyssey...",
            cooking: "E.g. Cooking vocabulary, Present tense verbs, Basic expressions...",
            photosynthesis: "E.g. Photosynthesis, Cell division, Marine ecosystem...",
            newton: "E.g. Newton's laws, Electromagnetism, Thermodynamics...",
            periodic: "E.g. Periodic table, Chemical bonds, Redox reactions...",
            solar: "E.g. Solar system, Theory of relativity, Genetics...",
            scientific: "E.g. Scientific method, Nuclear energy, Human anatomy...",
            ww1: "E.g. World War I, Ancient Egypt, The Renaissance...",
            climates: "E.g. World climates, Megalopolises, Plate tectonics...",
            romanticism: "E.g. Romanticism, Analysis of Germinal, Figures of speech...",
            cave: "E.g. Allegory of the Cave, Existentialism, Kant's ethics...",
            impressionism: "E.g. Impressionism, Picasso's cubism, Gothic architecture...",
            cinema: "E.g. History of cinema, Great explorers, Greek mythology...",
            culture: "E.g. General knowledge, World news, History of arts...",
            scales: "E.g. Major scales, Clef reading, Intervals...",
            gambit: "E.g. Queen's Gambit, Pawn endings, Fork tactics...",
            perspective: "E.g. Parallel perspective, Color theory, Facial anatomy...",
            artHistory: "E.g. Art history, Painting techniques, Graphic design...",
            travel: "E.g. Travel vocabulary, Irregular verbs...",
            revolution: "E.g. French Revolution, Subjunctive, Impressionism..."
        }
    },
    dashboard: {
        title: "Dashboard",
        summary: {
            streak: "Current Streak",
            totalQuizzes: "Total Quizzes",
            studyTime: "Study Time",
            avgAccuracy: "Avg. Accuracy",
            days: "{count} days"
        },
        activity: {
            title: "Activity History"
        },
        nemesis: {
            title: "Nemesis Wall",
            subtitle: "These 5 cards are giving you a hard time. Defeat them!",
            emptyTitle: "🎉 No 'Nemesis' detected!",
            emptyText: "You have no problematic cards (more than 2 errors). Keep it up!",
            attackButton: "⚔️ Attack my weaknesses",
            errorsLabel: "{count} errors",
            accuracyLabel: "Accuracy: {accuracy}%"
        },
        skills: {
            title: "Skills per Language",
            masteredWords: "Words Mastered",
            accuracy: "Accuracy",
            noData: "No data by language"
        },
        achievements: {
            title: "Latest Achievements",
            emptyText: "No achievements unlocked yet. Keep studying!"
        }
    },
    tutors: {
        title: "Teachers' Lounge",
        subtitle: "Choose your expert to create custom quizzes and study programs. Practice in our interactive Lab.",
        info: "💡 Each teacher uses a system prompt optimized for their field of expertise",
        categories: {
            languages: "Languages",
            culture: "Culture & Humanities",
            sciences: "Sciences",
            arts: "Arts & Creation",
            practical: "Practical Skills",
            guest: "Guests"
        },
        guest: {
            title: "Invite a Teacher",
            subtitle: "Create a custom teacher for a specific need. They will disappear at the end of the session.",
            labelName: "Teacher Name",
            labelSubject: "Subject / Field of Expertise",
            labelStyle: "Teaching Style (Optional)",
            labelEmoji: "Emoji",
            placeholderName: "E.g. Sherlock Holmes, Marie Curie...",
            placeholderSubject: "E.g. Logical Deduction, Nuclear Physics...",
            placeholderStyle: "E.g. Mysterious, Strict but fair, Humorous...",
            createButton: "Create Teacher",
            dismissTitle: "Dismiss Teacher",
            dismissMessage: "Are you sure you want to dismiss this guest teacher?",
            dismissConfirm: "Dismiss",
            labelIsLanguageTutor: "Is this a language teacher?",
            badge: "Guest Teacher",
            systemPrompt: "You are {name}. You are a world expert in {subject}. Your teaching style is: {style}. You adapt your explanations to be clear and precise. Your goal is to help the student progress in the subject \"{subject}\". You must teach in a structured and engaging manner.",
            defaultStyle: "Benevolent, encouraging and socratic"
        },
        actions: {
            quiz: "Quiz",
            program: "Program",
            programShort: "Courses & Programs",
            lab: "Lab",
            challenge: "Challenge",
            tuto: "Tutor"
        },
        descriptions: {
            'maestro-italiano': "Italian expert: grammar, vocabulary, culture",
            'mister-english': "English expert: ESL, phrasal verbs, idioms",
            'maestro-espanol': "Spanish expert: ser/estar, subjunctive, Hispanic culture",
            'mestre-portugues': "Portuguese expert: contractions, nasals, Lusophone culture",
            'herr-deutsch': "German expert: declensions, genders, Germanic culture",
            'master-russe': "Russian expert: Cyrillic alphabet, cases, Slavic culture",
            'efendi-turco': "Turkish expert: vocal harmony, suffixes, Anatolian culture",
            'nauczyciel-polski': "Polish expert: declensions, verbal aspects, Slavic culture",
            'prof-curio': "General knowledge: arts, sciences, society, sports",
            'prof-chronos': "History: chronology, events, historical figures",
            'prof-atlas': "Geography: countries, capitals, geopolitics",
            'prof-plume': "Literature: authors, movements, stylistic devices",
            'prof-sofia': "Philosophy: authors, concepts, schools of thought",
            'prof-muse': "Art History: movements, artists, works",
            'prof-eureka': "Sciences: generalist, scientific curiosity",
            'prof-biotique': "Biology & Earth Sciences: life, nature, ecology",
            'prof-volt': "Physics: electricity, mechanics, forces",
            'prof-molecula': "Chemistry: molecules, reactions, periodic table",
            'prof-newton': "Mathematics: algebra, geometry, calculus",
            'prof-cosmos': "Astrophysics: universe, stars, cosmology",
            'maitre-leonard': "Drawing & Arts: perspective, anatomy, creativity (Practical)",
            'prof-melodia': "Music & Theory: solfege, harmony, musical culture",
            'gm-kaspar': "Chess & Strategy: openings, tactics, endings (Practical)",
            'maitre-lexis': "Legal Expert: civil, criminal, constitutional, administrative",
            'prof-brico': "DIY Expert: tools, techniques, renovation, repairs",
            'chef-gaston': "Cooking: recipes, culinary techniques, nutrition",
            'coach-vita': "Sport & Wellbeing: exercises, sports nutrition, recovery",
            'sommelier-bacchus': "Oenology: wines, grape varieties, tasting, food-wine pairings",
            'prof-turing': "Code & IT: Python, Web, Algorithms (Practical)",
            guest: "Guest expert in {subject}"
        }
    },
    quiz: {
        backToLesson: "Back to Lesson",
        arts: {
            title: "Creative Studio",
            placeholder: "Your drawing will appear here",
            evaluating: "{name} is analyzing your work...",
            submit: "Submit my drawing",
            hint: "Take a photo of your drawing or upload an image to receive advice from {name}.",
            success: "Magnificent! 🎨",
            tryAgain: "One more effort! 🖌️",
            expertTitle: "{name}'s feedback",
            expertRole: "Visual Arts Expert",
            next: "Next Exercise"
        },
        game: {
            timeLeft: "Time left: {time}s",
            lives: "Lives: {count}",
            streak: "Streak: {count} / 10",
            combo: "Combo!"
        },
        stats: {
            cardCount: "Card {current} / {total}"
        },
        placeholders: {
            cloze: "Complete the sentence...",
            answer: "Your answer..."
        },
        hints: {
            label: "Hint: {hint}",
            chars: "letters"
        },
        actions: {
            listen: "Listen",
            reveal: "Reveal answer",
            hint: "Hint",
            explain: {
                default: "Why?",
                thinking: "Thinking..."
            },
            mnemonic: {
                default: "Memory Trick",
                generating: "Generating..."
            },
            next: "Next card",
            quit: "Quit session"
        },
        srs: {
            title: "Rate the difficulty:",
            again: "To review",
            hard: "Hard",
            good: "Good",
            easy: "Easy"
        },
        feedback: {
            correct: "Correct!",
            incorrect: "Incorrect",
            expected: "Expected answer:",
            yours: "Your answer:",
            similarity: "Similarity score: {score}%",
            explains: "{name} explains:",
            mnemonicLabel: "Memory Trick:",
            nextHint: "to move to the next card"
        },
        quit: {
            title: "Quit quiz?",
            message: "Your progress will be saved, but you'll have to restart this session later.",
            confirm: "Yes, quit",
            cancel: "Continue studying"
        },
        voice: {
            settings: "Change voice",
            title: "Choose a voice ({lang})",
            noVoice: "No voice detected",
            test: "Voice test"
        },
        errors: {
            mic: "Mic error: {error}",
            reload: "Try reloading the page (F5).",
            explanation: "Sorry, I couldn't generate an explanation at the moment.",
            mnemonic: "Unable to generate a trick for now."
        }
    },
    completion: {
        title: "Quiz Results",
        achievements: "Achievements Unlocked!",
        quizLabel: "Quiz:",
        languagesLabel: "Languages:",
        scoreLabel: "Score",
        errorsLabel: "Mistakes",
        persistentErrorsLabel: "Persistent Cards",
        reviewCards: "Review Cards ({count})",
        hide: "Hide",
        show: "Show",
        reviewButton: "Review these cards",
        difficultProgress: "Progress - Difficult Cards ({count})",
        removeProgress: "Remove from progress",
        recentActivity: "Recent Activity",
        showLess: "Show less",
        showAll: "See all",
        removeHistory: "Remove from history",
        noHistory: "No history available",
        backToLesson: "Back to Lesson",
        bonusExercises: "Bonus Exercises",
        reviewErrors: "Review errors",
        restartQuiz: "Restart this quiz",
        backToSetup: "New Quiz"
    },
    review: {
        title: "List Review",
        errorTitle: "Error Review",
        fullList: "Full list of the {count} current cards.",
        errorList: "Here are the {count} cards you missed. You can review them or start a quiz with them.",
        type: "Type",
        question: "Question",
        answer: "Answer",
        noCards: "No cards to display.",
        restartWithError: "Restart with these {count} cards",
        congrats: "Congratulations! No errors to review.",
        solutions: "Solutions"
    },
    srs: {
        title: "SRS Review",
        dueToday: "{count} cards to review today",
        dueCards: "Due cards",
        learning: "Learning",
        mastered: "Mastered",
        intervals: {
            today: "Today",
            yesterday: "Yesterday",
            daysAgo: "{count} days ago",
            weeksAgo: "{count} weeks ago",
            monthsAgo: "{count} months ago",
            intervalDay: "1 day",
            intervalDays: "{count} days",
            intervalWeeks: "{count} weeks",
            intervalMonths: "{count} months",
            new: "New"
        },
        mastery: {
            new: "New",
            learning: "Learning",
            ongoing: "Ongoing",
            mastered: "Mastered"
        },
        labels: {
            interval: "Interval",
            lastReviewed: "Last reviewed",
            ease: "Ease"
        },
        actions: {
            start: "🚀 Start Review"
        },
        help: {
            title: "💡 How does SRS review work?",
            point1: "After each card, rate the perceived difficulty",
            point2: "Easy: Interval doubled (review much later)",
            point3: "Good: Standard interval (normal review)",
            point4: "Hard: Reduced interval (review sooner)",
            point5: "To review: Reset (review tomorrow)"
        }
    },
    setup: {
        title: "Multilingual Flashcard Quiz",
        subtitle: "Prepare your personalized training session",
        currentSet: "Current list",
        cardsInSet: "{count} cards",
        directionLabel: "Translation Direction",
        quizModeLabel: "Quiz Mode",
        manageSets: "Manage Lists",
        allSets: "All my cards",
        editCards: "Edit Cards",
        import: "Import",
        export: "Export",
        start: "Start Quiz",
        reviewDue: "Review ({count} due)",
        noCardsFound: "No valid cards found for this language pair.",
        noDueCards: "No cards to review for this pair. Come back later! 🎉",
        exportSuccess: "Export successful!",
        exportError: "Export failed: {error}",
        mode: {
            classic: "Classic",
            mcq: "MCQ",
            dictation: "Dictation",
            cloze: "Cloze",
            mixed: "Mixed"
        },
        gameMode: {
            label: "Game Mode",
            normal: "Normal",
            timed: "Time trial",
            survival: "Survival (3 ❤️)",
            sprint: "Sprint (10x)"
        },
        options: {
            shuffle: "Shuffle",
            autoVoice: "Auto Audio"
        },
        placeholders: {
            selectLang: "Please select languages.",
            questionLang: "Question Language",
            answerLang: "Answer Language",
            numCards: "Number of cards"
        },
        statsLabel: "STATS",
        footerTagline: "Studeo • Designed for Advanced Learning",
        readySubtitle: "Ready for your learning session?"
    },
    sets: {
        title: "Manage Lists",
        activeLabel: "Set as active",
        rename: "Rename",
        delete: "Delete",
        done: "Done",
        cardsCount: "{count} cards",
        deleteTitle: "Delete list",
        deleteConfirm: "Permanently delete list \"{name}\"?",
        deleteDone: "List \"{name}\" deleted.",
        errorLast: "At least one list must remain."
    },
    settings: {
        title: "Settings",
        backup: {
            title: "Backup & Restore",
            subtitle: "Manage your local data",
            export: "Export my data",
            exportDesc: "Create a backup file (.json)",
            import: "Restore a backup",
            importDesc: "Warning: Replaces current data",
            successExport: "Backup successful!",
            successDownload: "Backup downloaded!",
            errorExport: "Error during backup.",
            errorImport: "Error during restoration. Invalid file?",
            errorRead: "Error reading the backup.",
            confirmTitle: "Restore a backup",
            confirmMessage: "Warning: Restoring a backup will replace all your current data. Do you want to continue?",
            restoreDone: "Restoration successful! The app will restart...",
            formatError: "Invalid backup format"
        },
        ai: {
            title: "AI Configuration",
            subtitle: "Choose your digital brain 🧠",
            activeProvider: "Active Provider",
            apiKey: "{name} API Key",
            model: "Model",
            refresh: "Refresh list",
            localUrl: "Local API URL",
            localModelPlaceholder: "e.g. llama3, mistral, qwen2.5...",
            localDesc: "The exact name of the model installed locally",
            fetching: "Fetching models...",
            noApiKey: "Please enter your {name} API key first.",
            errorModels: "Error fetching models: {error}",
            noGptFound: "No GPT models found.",
            claudeRefresh: "Claude models list refreshed.",
            noMistralFound: "No Mistral models found.",
            noLocalUrl: "Please enter your local API URL first.",
            localCheckError: "Unable to fetch local models. Check if your server is running.",
            noLocalFound: "No models found.",
            adviceTitle: "💡 Advice",
            adviceText: "This configuration will be used for all AI features of the application: card generation, conjugation, and voice repetitor.",
            currentModel: "Current model"
        }
    },
    lessons: {
        title: "Lesson History",
        emptyText: "No lessons saved yet.",
        deleteConfirmTitle: "Delete",
        deleteConfirmMessage: "Delete this lesson from history?",
        deleteTooltip: "Delete",
        footer: "Generated lessons are kept locally (Max {count}).",
        exercisesCount: "{count} exercises"
    },
    conjugator: {
        title: "AI Conjugator",
        verbLabel: "Verb to conjugate",
        verbPlaceholder: "E.g. eat, be, have...",
        targetLang: "Target language",
        conjugate: "Conjugate",
        conjugating: "Conjugating...",
        voiceSettings: "Change voice",
        voiceTitle: "Choose a voice ({lang})",
        noVoice: "No voice detected for this language",
        voiceTest: "Voice test",
        createCards: "Create ({count})",
        createSuccess: "{count} cards created in the list \"{name}\"!",
        addSuccess: "{count} cards added successfully!",
        selectWarning: "Please select at least one conjugated form.",
        selectionInfo: "Select the rows to turn into flashcards for learning.",
        selectedCount: "{count} selected",
        setNameLabel: "Set name",
        setNamePlaceholder: "Name...",
        createButton: "Create",
        emptyState: "Enter a verb to start",
        exampleInfo: "Example: \"dormir\" (fr), \"speak\" (en), \"andare\" (it)",
        tenseHeader: "Tense",
        practiceRepetitor: "Practice this tense out loud (Repetitor)",
        listenTooltip: "Listen to pronunciation",
        correctionTooltip: "Click to correct",
        selectionTooltip: "Click to select all",
        exampleLabel: "E.g.:",
        exportMD: "Export MD",
        exportWord: "Export RTF",
        exportTooltip: "Export this conjugation (MD or RTF)",
        // Translation mode
        textToTranslate: "Text to translate",
        translatePlaceholder: "E.g. hello, thank you, how are you...",
        translate: "Translate",
        conjugateSubtitle: "Conjugate any verb instantly",
        translateSubtitle: "Translate words, phrases and expressions"
    },
    curriculum: {
        title: "Your Study Programs",
        subtitle: "Custom programs generated by your AI mentors",
        new: "New",
        backToList: "Back to programs",
        deleteTitle: "Delete program",
        deleteConfirm: "Do you really want to delete this program? This action is irreversible.",
        withTutor: "with {name}",
        progressLabel: "Progress",
        continue: "Continue",
        noPrograms: "No programs at the moment",
        noProgramsHelp: "Go to the Teachers' Lounge, choose a mentor and ask them to create a custom program for you!",
        moduleLocked: "🔒 This module is locked. Finish the previous one to unlock it!",
        generateTitle: "Generate content",
        generateConfirm: "Do you want to generate the content for \"{title}\"?",
        generateButton: "Generate",
        moduleLabel: "MODULE {index}",
        completed: "Completed",
        locked: "Locked",
        start: "Start",
        generateCourse: "Generate course",
        practice: "Practice",
        drawingChallenge: "Drawing Challenge",
        tutorial: "Step-by-step Tutorial",
        regenerateTitle: "Regenerate content",
        regenerateConfirm: "Do you want to regenerate the content of the module \"{title}\"?\n⚠️ The old content will be lost.",
        regenerateButton: "Regenerate",
        regenerateTooltip: "Regenerate course"
    },
    files: {
        text: "Text Documents",
        images: "Images",
        media: "Media (Audio/Video)"
    },
    lab: {
        title: "Language Lab",
        back: "Back",
        translate: "Translate",
        hide: "Hide",
        listen: "Listen",
        createFlashcard: "Turn into Flashcard",
        correction: "Correction",
        noTranslate: "(No translation)",
        addedToSet: "Card added to \"{name}\"!",
        tabs: {
            chat: "Chat",
            scenarios: "Roleplay",
            study: "Text Study"
        },
        chat: {
            placeholder: "Press microphone (or Space) to speak.",
            edit: "Edit text",
            processing: "Thinking...",
            errorConnection: "Sorry, I had a connection problem.",
            writeMessage: "Write your message..."
        },
        scenarios: {
            title: "Choose a scenario",
            create: "Create my own scenario",
            customDesc: "Describe any situation!",
            preparing: "Preparing the scene...",
            preparingDesc: "Our AI actors are rehearsing their lines.",
            finished: "🎉 Scenario Finished!",
            chooseAnother: "Choose another scenario",
            userGoal: "Your turn to say:",
            success: "Perfect!",
            retry: "Try pronunciation again",
            modal: {
                title: "✨ Create my scenario",
                desc: "Describe the situation you want to practice. Be specific!",
                placeholder: "E.g.: I need to explain to a police officer that I lost my passport...",
                cancel: "Cancel",
                start: "Start"
            },
            themes: {
                restaurant: "At the restaurant",
                coffee: "Ordering a coffee",
                hotel: "At the hotel",
                market: "At the market",
                direction: "Asking for directions",
                meet: "First meeting",
                prompts: {
                    restaurant: "Order a meal at the restaurant",
                    coffee: "Order a coffee at the bar",
                    hotel: "Check-in at the hotel reception",
                    market: "Buy fruits and vegetables at the market",
                    direction: "Ask for directions from a passerby",
                    meet: "Introduce yourself to a new person"
                }
            }
        },
        study: {
            import: "Import an audio file",
            formats: "MP3, WAV, MA4...",
            vitesse: "Speed:",
            change: "Change",
            shadowing: "Shadowing",
            shadowingDesc: "Record yourself and compare",
            stop: "Stop recording",
            record: "Record yourself (Shadowing)",
            script: "Script / Notes",
            aiAnalyse: "AI Analysis",
            analysing: "Analyzing...",
            placeholder: "Paste transcription, lyrics or take notes here...",
            noVocab: "AI couldn't find relevant vocabulary to extract.",
            analyseError: "An error occurred during script analysis.",
            analyseSuccess: "{count} vocabulary cards have been added to the list \"{name}\"!",
            analyseTopic: "Text analysis for {name}",
            vocabSet: "Lab Vocabulary ({lang})",
            selectTutorTitle: "Choose your Coach",
            selectTutorDesc: "Who do you want to practice with today?"
        },
        errors: {
            micDenied: "Microphone access denied. Check your permissions."
        }
    },
    helpCenter: {
        title: "Studeo Help Center",
        subtitle: "Everything you need to know to master the app",
        tipTitle: "Tip",
        tipContent: "You can configure multiple AIs and switch from one to another according to your needs (Gemini for speed, GPT-4 for precision).",
        footerButton: "Got it",
        backToOverview: "Back to overview",
        detailedGuide: "Detailed guide",
        adviceTitle: "Advice",
        experimentTip: "Feel free to experiment with this feature. Learning is more effective when you explore actively!",
        back: "Back",
        close: "Close help",
        welcome: {
            title: "🚀 Welcome to Studeo",
            content: "Studeo is your AI-augmented learning assistant. Transform any subject into interactive study material.",
            steps: [
                "Studeo combines artificial intelligence with proven learning methods.",
                "You can create educational content from any source: text, PDF, images, audio, or video.",
                "The app uses spaced repetition (SRS) to optimize your memorization.",
                "All your data is stored locally on your device to ensure your privacy."
            ]
        },
        aiConfig: {
            title: "⚙️ AI Configuration",
            content: "To get started, go to **Settings**. You'll need an API key (Google Gemini, OpenAI, etc.). Once configured, the app will be able to generate cards, lessons, and exercises for you.",
            steps: [
                "**Step 1**: Click the ⚙️ icon at the bottom left to access Settings.",
                "**Step 2**: In the 'AI Configuration' section, choose your provider (Google Gemini, OpenAI, etc.).",
                "**Step 3**: Enter my API key. You can get a free key from the provider's website.",
                "**Step 4**: Select the model to use (e.g., gemini-1.5-flash for Gemini, gpt-4o for OpenAI).",
                "**Tip**: You can configure multiple AIs and switch between them as needed."
            ]
        },
        cardCreation: {
            title: "🧠 Card Creation",
            content: "AI can generate cards from your documents (PDF, Images, Audio, Video). Use the **'Generate by AI'** button or the **Video Lab** to transform any content into study material.",
            steps: [
                "**Method 1 - Text**: Click '**Generate by AI**', enter a topic, and let the AI create cards.",
                "**Method 2 - Document**: Import a PDF, image, audio, or video. The AI will extract the content.",
                "**Method 3 - Video Lab**: Paste a YouTube link to transform any video into study material.",

                "The generated cards are organized into decks that you can review with the SRS system."
            ]
        },
        library: {
            title: "📚 Infinite Library",
            content: "Discover thematic collections or ask the AI to create one on any subject. You can renew the catalog for new inspiration every day.",
            steps: [
                "Access the **Library** from the main menu.",
                "Browse available thematic collections (Science, Languages, History, etc.).",
                "Click **'Import Set'** to add a collection to your personal library.",
                "Use the search bar to find specific sets.",
                "You can ask the AI to create a new collection on any topic."
            ]
        },
        conjugator: {
            title: "🇮🇹 Conjugator & Repetitor",
            content: "Master languages! The **Conjugator** gives you all the tenses of a verb. Click the microphone to launch the **Voice Repetitor**: the AI checks your pronunciation in real-time.",
            steps: [
                "**Conjugator**: Enter a verb in the language of your choice to see all their conjugations.",
                "Click on a tense to see conjugation details.",
                "**Voice Repetitor**: Click the microphone icon 🎤 to activate voice mode.",
                "The AI will give you a sentence to repeat and evaluate your pronunciation in real-time.",
                "Progress through different difficulty levels to improve your mastery."
            ]
        },
        tutors: {
            title: "👨‍🏫 Tutors' Room",
            content: "Choose a specialized tutor (Sciences, Languages, History). Ask them to create a personalized **Study Program** with progressive lessons and quizzes.",
            steps: [
                "Access the **Tutors' Room** from the main menu.",
                "Choose a specialized tutor based on your field of study (Science, Languages, History, etc.).",
                "Click on the tutor to open the AI generator with their profile activated.",
                "Ask them to create a complete **Study Program** with modules and progressive lessons.",
                "Tutors adapt their teaching style and examples to their specialty."
            ]
        },
        srs: {
            title: "📅 Spaced Repetition (SRS)",
            content: "The SRS algorithm calculates the ideal time to review each card before you forget it. Follow your daily reviews on the **Dashboard**.",
            steps: [
                "The SRS (Spaced Repetition System) automatically calculates when to review each card.",
                "Access your reviews via the **'SRS Review'** button on the dashboard.",
                "During review, rate your answer: Easy, Medium, Hard, or Again.",
                "The algorithm adjusts the review interval based on your performance.",
                "Check your statistics on the **Dashboard** to track your daily progress."
            ]
        },
        lab: {
            title: "🎮 Challenge Lab",
            content: "Learn while playing! Access **Music** (chords/notes), **Chess** (tactics), or **Drawing** (reproduction evaluated by AI) challenges.",
            steps: [
                "**Music Challenge**: Learn chords and notes by playing on the keyboard or MIDI.",
                "**Chess Challenge**: Solve tactical problems to improve your game.",
                "**Drawing Challenge**: Reproduce images and let the AI evaluate your precision.",
                "Each challenge can be personalized with AI to create exercises adapted to your level.",
                "Challenges are a great way to learn in a fun and interactive way."
            ]
        },
        backup: {
            title: "☁️ Sync & Cloud",
            content: "Automatically synchronize your data across all your devices via the Studeo Cloud (cloud icon). Manual backups remain available in settings.",
            steps: [
                "**Cloud Sync**: Click the **Cloud** icon at the top right to create an account and enable auto-sync.",
                "**Multi-device**: Your cards, programs, and progress follow you everywhere once logged in.",
                "**Manual Export**: Go to **Settings** > **Export Data** to create a backup file (.json).",
                "**Privacy**: Your AI API keys remain local and are never sent to the cloud.",
                "**Recovery**: If needed, use 'Force Cloud Recovery' in the cloud menu."
            ]
        },
        userGuide: {
            title: "Full User Guide",
            subtitle: "Complete documentation for all Studeo features",
            open: "Open",
            backToAide: "Back to Help Center",
            fullGuide: "Full User Guide",
            studeoDoc: "Complete Studeo documentation",
            back: "Back",
            close: "Close"
        }
    }
};
