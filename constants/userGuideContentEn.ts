// User Guide Content (English)
export const USER_GUIDE_CONTENT_EN = `# 📔 Complete User Manual - Studeo

Welcome to the world of **Studeo**, your intelligent learning platform powered by Artificial Intelligence.

---

## 🧭 Quick Navigation

1. [Configuration & AI](#configuration-ai)
2. [Teachers' Lounge](#teachers-lounge)
3. [AI Content Generation](#ai-content-generation)
4. [Quiz Modes & Learning](#quiz-modes-learning)
5. [Review Algorithm (SRS)](#review-algorithm-srs)
6. [YouTube Video Lab](#youtube-video-lab)
7. [Interactive Lab & Challenges](#interactive-lab-challenges)
8. [Backup & Cloud Sync](#backup-cloud-sync)


---

## Configuration & AI

Studeo interfaces with the world's best AI models.

### 🤖 Available AI Providers

- **Google Gemini** ⭐: Recommended (free, fast, multimodal)
- **OpenAI (GPT-4o)**: Industry standard
- **Anthropic (Claude 3.5)**: Excellent for writing
- **Mistral AI**: European alternative
- **Local AI**: 100% private, offline

---

## Teachers' Lounge

**28 expert teachers** divided into 5 categories:

### 🌍 Languages (7 teachers)
Italian, English, Spanish, Portuguese, German, Russian, Turkish

### 🏛️ Culture & Humanities (7 teachers)
General Knowledge, History, Geography, Literature, Philosophy, Art, Law

### 🔬 Sciences (6 teachers)
General Science, Biology, Physics, Chemistry, Mathematics, Astrophysics

### 🎨 Arts & Creation (4 teachers)
Drawing, Music, Chess, Code

### 🛠️ Practical Skills (4 teachers)
- **Prof. Brico** 🛠️: DIY & Repairs
- **Chef Gaston** 👨‍🍳: Cooking
- **Coach Vita** 💪: Sports & Wellbeing
- **Sommelier Bacchus** 🍷: Oenology

### 🎯 3 Capacities per Teacher

1. **💬 Chat**: Real-time conversation
2. **⚡ Quiz**: Generation of specialized MCQs
3. **📚 Courses & Programs**: Complete learning pathways

---

## AI Content Generation

### 📝 Generation Vectors

#### **Manual Topic**
Simply type: "English irregular verbs"

#### **From a Text File**
Import your courses (\`.txt\`, \`.md\`)

#### **From a PDF/Image** 🖼️
**Multimodal AI Vision** (All providers):
- Upload PDFs, diagrams, textbook pages
- AI extracts concepts, definitions, formulas
- Formats: .pdf, .jpg, .png, .webp

#### **From Audio/Video** 🎤
**Multimedia Analysis** (All providers):
- Recorded lectures, conferences, podcasts
- Automatic transcription and analysis
- Formats: .mp3, .wav, .mp4, .webm

### 🎨 Content Types

- **Quiz (Cards)**: Flashcards, MCQ, Cloze, Open questions
- **Mixed Quiz**: All types combined
- **Courses (Lessons)**: Structured content in Markdown
- **Study Programs**: Complete track with progressive modules

---

## Quiz Modes & Learning

### 🎯 Quiz Modes

- **Classic**: Self-assessment
- **MCQ**: Multiple choice with distractors
- **Cloze**: Fill in the blanks
- **Dictation**: Write what is read

### 🎮 Game Modes

- **Normal**: Standard quiz
- **Time Trial**: Chronometer active
- **Survival**: Zero errors allowed

---

## Review Algorithm (SRS)

**Intelligent Spaced Repetition**:

- **Hard** → Review in 1 day
- **Medium** → Review in 3 days
- **Easy** → Review in 7+ days

### 📊 Tracking

- Cards due today
- Currently learning
- Mastered (interval > 21 days)

---

## 📺 YouTube Video Lab

Transform any YouTube video into educational content: comprehensive courses, review quizzes, and SRS cards.

### 🎯 Complete Workflow

#### 1️⃣ **Video Analysis**

**A. Paste YouTube URL**
- Go to **"📺 Video Lab"** tab
- Paste the full URL: \`https://www.youtube.com/watch?v=VIDEO_ID\`

**B. Click "Analyze"**
The app will:
- Extract the Video ID
- Retrieve metadata (title, author, duration)
- Attempt to extract the transcript automatically
- **Select a Tutor (New)**: You can now choose a specific teacher (e.g., Coach Vita for sports, Chef Gaston for cooking) to adapt the tone and expertise of the generated course. By default, the **Intelligent Assistant** is used.

**C. Analysis Result**

🟢 **Transcript Detected** (HD Mode)
- AI has access to full content
- High-quality generation guaranteed

🟠 **Transcript Unavailable** (Metadata Mode)
- Analysis based on title only
- "📋 Paste transcript manually" button available

#### 2️⃣ **Add Transcript Manually**

If transcript is not detected:

1. Click **"📋 Paste transcript manually"**
2. On YouTube: **"..."** → **"Show transcript"**
3. Copy all text (Ctrl+A then Ctrl+C)
4. Paste into the text field
5. Validate (minimum 50 characters)

✅ **Result**: High-fidelity mode activated!

#### 3️⃣ **Generate a Comprehensive Course**

**A. Name the Course**
- Custom title or video title

**B. Click "📚 Create a Lesson"**

**C. Generated Content**

**With Transcript (HD Mode):**
- Complete Markdown course (800+ words)
- Structure:
  - 📖 Introduction
  - 🎯 Detailed Key Points
  - 💡 Important Concepts
  - 📊 Examples and Applications
  - 🎓 Conclusion
  - 📚 Key Takeaways

**Without Transcript:**
- Course based on title and AI knowledge
- Lower quality, risk of approximations

#### 4️⃣ **Generate a Review Quiz**

**A. Name the Deck**
- Example: "AI 2025 - News"

**B. Click "🎓 Generate Quiz"**

**C. Question Types**
- **Classic**: Question/Answer
- **MCQ**: Multiple choice with distractors

**With transcript**: Questions based on actual content
**Without transcript**: Generic questions

#### 5️⃣ **Generate SRS Cards**

**A. Name the Deck**

**B. Click "🧠 Generate SRS"**

**C. Difference with Quiz**
- **Quiz**: One-time review
- **SRS**: Long-term memorization
  - Spaced repetition algorithm
  - Adaptive intervals
  - Progress tracking

### 🎨 Generation Modes

**High-Fidelity Mode (HD) 🟢**
- ✅ Transcript available
- ✅ Detailed courses (800+ words)
- ✅ Precise and contextual questions
- ✅ Examples from the video

**Metadata Mode ⚠️**
- ⚠️ No transcript
- ⚠️ Generic courses
- ⚠️ Risk of AI hallucinations

### 💡 Usage Tips

**For Best Results:**

1. **Prefer videos with subtitles**
2. **Use manual transcript** (30 seconds)
3. **Customize titles** for better organization
4. **Configure your AI** in ⚙️ Settings
5. **Verify generated content** (AI is not infallible)

### 🔄 Recommended Workflow

\`\`\`
📺 YouTube URL
  ↓
🔍 Analyze
  ↓
📋 Paste transcript (if needed)
  ↓
📚 Create Lesson
  ↓
🎓 Generate Quiz
  ↓
🧠 Generate SRS
  ↓
📖 Study + 📚 Review + 🧠 Practice
  ↓
🎯 Master the subject!
\`\`\`

### ❓ FAQ

**Q: Why isn't the transcript detected?**
- YouTube blocks automated requests
- The video has no subtitles
- **Solution**: Paste manually

**Q: How long does generation take?**
- Course: 30-60 seconds
- Quiz: 20-40 seconds
- SRS: 20-40 seconds

**Q: Can I use multiple AIs?**
- Yes! Configure in settings
- Test different providers

**Q: Are courses saved?**
- Yes, in "📖 My Courses"
- Cards in "📚 Library"

**Q: Can I edit the content?**
- Yes, courses are editable Markdown
- Cards individually editable

---

## Interactive Lab & Challenges

### 🎨 Step-by-Step with the Masters

Interactive tutorials generated by AI:

- **Master Leonardo** 🖌️: Step-by-step drawing
- **Melodia** 🎹: Music theory and chords
- **Grandmaster Kaspar** ♟️: Chess tactics
- **Prof. Turing** 💻: Programming

### 🎯 Interactive Challenges

- 🎹 **Music**: Identify and reproduce notes
- ♟️ **Chess**: Tactical problems
- 🎨 **Drawing**: Reproduction evaluated by AI
- 💻 **Code**: Programming exercises

---

## Backup & Cloud Sync

### ☁️ Cloud Sync ✨

Studeo now offers automatic synchronization via **Supabase** to sync your data across all your devices.

- **Activation**: Click the **Cloud** icon at the top right.
- **Multi-device**: Log in with the same account everywhere.
- **Secure**: Your data is private and encrypted.

### 🔒 Privacy

- Cloud data stored anonymously.
- AI API keys (Gemini/OpenAI) stored **locally** (never shared on the cloud).

### 💾 Manual Backup

**Export**: Generate a complete \`.json\` file.
**Import**: Full restoration from a file.

---

## 🎓 Usage Tips

### For Languages
✓ Daily vocal repetition
✓ Quizzes from native articles
✓ Progressive programs

### For Sciences
✓ PDF course upload
✓ MCQ mode for testing
✓ Concept simplification

### For Practical Skills
✓ Step-by-step guides
✓ Safety quizzes
✓ Personalized advice

---

## ❓ Troubleshooting

**AI not responding?**
→ Check API key and connection

**Cards not saved?**
→ Export regularly

**Voice recognition issues?**
→ Allow microphone in settings

---

**Need help?**
- Chat with a teacher
- Consult interactive tutorials
- Explore the Lab

**Happy learning with Studeo! 🚀📚**
`;
